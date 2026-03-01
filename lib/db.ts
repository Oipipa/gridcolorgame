import "server-only";

import { ClientSession, Collection, MongoClient, MongoServerError } from "mongodb";
import { LeaderboardEntry } from "@/lib/types";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME ?? "gridcolorgame";
const SCORES_COLLECTION = "scores";

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is required.");
}

interface ScoreDocument {
  username: string;
  usernameKey: string;
  highScore: number;
  updatedAt: Date;
}

const formatTimestamp = (value: Date): string => {
  return value.toISOString().slice(0, 19).replace("T", " ");
};

const mapRowsToLeaderboard = (rows: ScoreDocument[]): LeaderboardEntry[] => {
  return rows.map((row, index) => ({
    rank: index + 1,
    username: row.username,
    highScore: row.highScore,
    updatedAt: formatTimestamp(row.updatedAt),
  }));
};

const toUsernameKey = (username: string): string => {
  return username.replace(/[A-Z]/g, (char) => char.toLowerCase());
};

declare global {
  var gridColorGameMongoClientPromise: Promise<MongoClient> | undefined;
  var gridColorGameScoresCollectionPromise: Promise<Collection<ScoreDocument>> | undefined;
}

const createClientPromise = (): Promise<MongoClient> => {
  const client = new MongoClient(MONGODB_URI);
  return client.connect();
};

const clientPromise = globalThis.gridColorGameMongoClientPromise ?? createClientPromise();

if (process.env.NODE_ENV !== "production") {
  globalThis.gridColorGameMongoClientPromise = clientPromise;
}

const createScoresCollectionPromise = async (): Promise<Collection<ScoreDocument>> => {
  const client = await clientPromise;
  const collection = client.db(MONGODB_DB_NAME).collection<ScoreDocument>(SCORES_COLLECTION);

  await collection.createIndexes([
    { key: { usernameKey: 1 }, name: "idx_scores_username_key", unique: true },
    { key: { highScore: -1, updatedAt: 1, usernameKey: 1 }, name: "idx_scores_rank" },
  ]);

  return collection;
};

const scoresCollectionPromise =
  globalThis.gridColorGameScoresCollectionPromise ?? createScoresCollectionPromise();

if (process.env.NODE_ENV !== "production") {
  globalThis.gridColorGameScoresCollectionPromise = scoresCollectionPromise;
}

const getScoresCollection = async (): Promise<Collection<ScoreDocument>> => {
  return scoresCollectionPromise;
};

export const getLeaderboard = async (limit?: number): Promise<LeaderboardEntry[]> => {
  const hasLimit = Number.isInteger(limit) && limit !== undefined && limit > 0;
  const scores = await getScoresCollection();
  const findQuery = scores
    .find(
      {},
      {
        projection: {
          _id: 0,
          username: 1,
          usernameKey: 1,
          highScore: 1,
          updatedAt: 1,
        },
      },
    )
    .sort({ highScore: -1, updatedAt: 1, usernameKey: 1 });

  if (hasLimit) {
    const rows = await findQuery.limit(limit ?? 0).toArray();
    return mapRowsToLeaderboard(rows);
  }

  const rows = await findQuery.toArray();
  return mapRowsToLeaderboard(rows);
};

const conditionalUpsert = async (
  scores: Collection<ScoreDocument>,
  username: string,
  score: number,
  session?: ClientSession,
): Promise<void> => {
  const usernameKey = toUsernameKey(username);

  await scores.updateOne(
    { usernameKey },
    [
      {
        $set: {
          usernameKey,
          username: { $ifNull: ["$username", username] },
          highScore: {
            $cond: [{ $gt: [score, { $ifNull: ["$highScore", -1] }] }, score, "$highScore"],
          },
          updatedAt: {
            $cond: [
              { $gt: [score, { $ifNull: ["$highScore", -1] }] },
              "$$NOW",
              { $ifNull: ["$updatedAt", "$$NOW"] },
            ],
          },
        },
      },
    ],
    { session, upsert: true },
  );
};

export const upsertHighScore = async (username: string, score: number): Promise<void> => {
  const scores = await getScoresCollection();
  await conditionalUpsert(scores, username, score);
};

const transferAndUpsert = async (
  scores: Collection<ScoreDocument>,
  username: string,
  score: number,
  previousUsername: string,
  session?: ClientSession,
): Promise<void> => {
  const previousUsernameKey = toUsernameKey(previousUsername);
  const usernameKey = toUsernameKey(username);
  const previousRow = await scores.findOne(
    { usernameKey: previousUsernameKey },
    { projection: { _id: 0, highScore: 1 }, session },
  );
  const nextRow = await scores.findOne({ usernameKey }, { projection: { _id: 0, highScore: 1 }, session });
  const mergedScore = Math.max(score, previousRow?.highScore ?? 0, nextRow?.highScore ?? 0);

  if (previousRow) {
    await scores.deleteOne({ usernameKey: previousUsernameKey }, { session });
  }

  await conditionalUpsert(scores, username, mergedScore, session);
};

let hasTransactionSupport: boolean | undefined;

const isUnsupportedTransactionError = (error: unknown): boolean => {
  if (!(error instanceof MongoServerError)) {
    return false;
  }

  if (error.code === 20 || error.codeName === "IllegalOperation") {
    return true;
  }

  return /Transaction numbers are only allowed on a replica set member or mongos/i.test(error.message);
};

export const transferAndUpsertHighScore = (
  username: string,
  score: number,
  previousUsername?: string,
): Promise<void> => {
  return (async () => {
    const normalizedPrevious = previousUsername?.trim();

    if (!normalizedPrevious || normalizedPrevious.toLowerCase() === username.toLowerCase()) {
      await upsertHighScore(username, score);
      return;
    }

    const scores = await getScoresCollection();

    if (hasTransactionSupport === false) {
      await transferAndUpsert(scores, username, score, normalizedPrevious);
      return;
    }

    const client = await clientPromise;
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        await transferAndUpsert(scores, username, score, normalizedPrevious, session);
      });
      hasTransactionSupport = true;
    } catch (error) {
      if (!isUnsupportedTransactionError(error)) {
        throw error;
      }

      hasTransactionSupport = false;
      await transferAndUpsert(scores, username, score, normalizedPrevious);
    } finally {
      await session.endSession();
    }
  })();
};
