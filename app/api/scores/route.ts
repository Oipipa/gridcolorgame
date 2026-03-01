import { NextRequest, NextResponse } from "next/server";
import {
  claimUsername,
  getLeaderboard,
  transferAndUpsertHighScore,
  USERNAME_TAKEN_ERROR_CODE,
  upsertHighScore,
} from "@/lib/db";
import { isValidUsername, normalizeScore, sanitizeUsername } from "@/lib/scores";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");

  let limit: number | undefined;

  if (limitParam) {
    const parsedLimit = Number.parseInt(limitParam, 10);

    if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, 100);
    }
  }

  const leaderboard = await getLeaderboard(limit);

  return NextResponse.json({ leaderboard });
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);

  if (
    !payload ||
    typeof payload.username !== "string" ||
    typeof payload.score !== "number" ||
    (payload.previousUsername !== undefined && typeof payload.previousUsername !== "string") ||
    (payload.claimOnly !== undefined && typeof payload.claimOnly !== "boolean")
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const username = sanitizeUsername(payload.username);

  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const previousUsername =
    payload.previousUsername !== undefined ? sanitizeUsername(payload.previousUsername) : undefined;
  const claimOnly = payload.claimOnly === true;

  if (
    claimOnly &&
    previousUsername !== undefined &&
    previousUsername.length > 0 &&
    !isValidUsername(previousUsername)
  ) {
    return NextResponse.json({ error: "Invalid previous username" }, { status: 400 });
  }

  const score = normalizeScore(payload.score);

  try {
    if (claimOnly) {
      await claimUsername(username, score, previousUsername);
    } else if (previousUsername && previousUsername.length > 0) {
      await transferAndUpsertHighScore(username, score, previousUsername);
    } else {
      await upsertHighScore(username, score);
    }
  } catch (error) {
    if (error instanceof Error && error.message === USERNAME_TAKEN_ERROR_CODE) {
      return NextResponse.json(
        {
          error: "Username is already taken. Pick a different username.",
          code: USERNAME_TAKEN_ERROR_CODE,
        },
        { status: 409 },
      );
    }

    throw error;
  }

  return NextResponse.json({ ok: true });
}
