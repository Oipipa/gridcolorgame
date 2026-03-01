import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { LeaderboardEntry } from "@/lib/types";

const DATABASE_DIR = path.join(process.cwd(), "data");
const DATABASE_PATH = path.join(DATABASE_DIR, "gridcolorgame.sqlite");

interface ScoreRow {
  username: string;
  high_score: number;
  updated_at: string;
}

interface ScoreOnlyRow {
  high_score: number;
}

const mapRowsToLeaderboard = (rows: ScoreRow[]): LeaderboardEntry[] => {
  return rows.map((row, index) => ({
    rank: index + 1,
    username: row.username,
    highScore: row.high_score,
    updatedAt: row.updated_at,
  }));
};

const initializeDatabase = (db: Database.Database): void => {
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      high_score INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_scores_high_score
      ON scores (high_score DESC, updated_at ASC, username ASC);
  `);
};

const createConnection = (): Database.Database => {
  fs.mkdirSync(DATABASE_DIR, { recursive: true });

  const db = new Database(DATABASE_PATH);
  initializeDatabase(db);

  return db;
};

declare global {
  var gridColorGameDatabase: Database.Database | undefined;
}

const db = globalThis.gridColorGameDatabase ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalThis.gridColorGameDatabase = db;
}

export const getLeaderboard = (limit?: number): LeaderboardEntry[] => {
  const hasLimit = Number.isInteger(limit) && limit !== undefined && limit > 0;

  if (hasLimit) {
    const rows = db
      .prepare(
        `
          SELECT username, high_score, updated_at
          FROM scores
          ORDER BY high_score DESC, updated_at ASC, username ASC
          LIMIT ?
        `,
      )
      .all(limit ?? 0) as ScoreRow[];

    return mapRowsToLeaderboard(rows);
  }

  const rows = db
    .prepare(
      `
        SELECT username, high_score, updated_at
        FROM scores
        ORDER BY high_score DESC, updated_at ASC, username ASC
      `,
    )
    .all() as ScoreRow[];

  return mapRowsToLeaderboard(rows);
};

export const upsertHighScore = (username: string, score: number): void => {
  db.prepare(
    `
      INSERT INTO scores (username, high_score, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(username) DO UPDATE SET
        high_score = CASE
          WHEN excluded.high_score > scores.high_score THEN excluded.high_score
          ELSE scores.high_score
        END,
        updated_at = CASE
          WHEN excluded.high_score > scores.high_score THEN CURRENT_TIMESTAMP
          ELSE scores.updated_at
        END
    `,
  ).run(username, score);
};

export const transferAndUpsertHighScore = (
  username: string,
  score: number,
  previousUsername?: string,
): void => {
  const normalizedPrevious = previousUsername?.trim();

  if (!normalizedPrevious || normalizedPrevious.toLowerCase() === username.toLowerCase()) {
    upsertHighScore(username, score);
    return;
  }

  const transaction = db.transaction((nextUsername: string, prevUsername: string, incomingScore: number) => {
    const getScoreStatement = db.prepare(
      `
        SELECT high_score
        FROM scores
        WHERE username = ?
        LIMIT 1
      `,
    );

    const previousRow = getScoreStatement.get(prevUsername) as ScoreOnlyRow | undefined;
    const nextRow = getScoreStatement.get(nextUsername) as ScoreOnlyRow | undefined;

    const mergedScore = Math.max(
      incomingScore,
      previousRow?.high_score ?? 0,
      nextRow?.high_score ?? 0,
    );

    if (previousRow) {
      db.prepare(
        `
          DELETE FROM scores
          WHERE username = ?
        `,
      ).run(prevUsername);
    }

    upsertHighScore(nextUsername, mergedScore);
  });

  transaction(username, normalizedPrevious, score);
};
