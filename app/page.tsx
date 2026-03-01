"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { GameInfoBar } from "@/components/GameInfoBar";
import { Grid } from "@/components/Grid";
import { RestartButton } from "@/components/RestartButton";
import { TopNav } from "@/components/TopNav";
import { TopScorers } from "@/components/TopScorers";
import { UsernameBar } from "@/components/UsernameBar";
import { UsernamePrompt } from "@/components/UsernamePrompt";
import { generateRound, getTimeLimitForLevel } from "@/lib/game";
import {
  isValidUsername,
  sanitizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_STORAGE_KEY,
} from "@/lib/scores";
import {
  ClickOutcome,
  DifficultyLayer,
  GameStatus,
  LeaderboardEntry,
  RoundConfig,
} from "@/lib/types";
import styles from "@/app/page.module.css";

const MAX_HEARTS = 3;
const FEEDBACK_DELAY_MS = 190;
const TOP_SCORERS_LIMIT = 3;

const INITIAL_ROUND: RoundConfig = {
  gridSize: 2,
  oddIndex: 0,
  difficultyLayer: "easy",
  baseColor: "hsl(132 52% 44%)",
  oddColor: "hsl(132 52% 50%)",
  timeLimit: 10,
};

const createOrderedTiles = (total: number): number[] => {
  return Array.from({ length: total }, (_, index) => index);
};

const getDifficultyLabel = (difficultyLayer: DifficultyLayer): string => {
  switch (difficultyLayer) {
    case "easy":
      return "Easy";
    case "medium":
      return "Medium";
    case "hard":
      return "Hard";
    case "veryHard":
      return "Very Hard";
    default:
      return "Unknown";
  }
};

const isLeaderboardPayload = (value: unknown): value is { leaderboard: LeaderboardEntry[] } => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { leaderboard?: unknown };
  return Array.isArray(candidate.leaderboard);
};

interface PersistScoreOptions {
  refreshLeaderboard?: boolean;
  preferBeacon?: boolean;
  previousUsername?: string;
}

export default function HomePage() {
  const [level, setLevel] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [timeRemaining, setTimeRemaining] = useState(INITIAL_ROUND.timeLimit);
  const [gridSize, setGridSize] = useState(INITIAL_ROUND.gridSize);
  const [gameStatus, setGameStatus] = useState<GameStatus>("idle");
  const [oddIndex, setOddIndex] = useState(INITIAL_ROUND.oddIndex);
  const [difficultyLayer, setDifficultyLayer] = useState<DifficultyLayer>(INITIAL_ROUND.difficultyLayer);
  const [baseColor, setBaseColor] = useState(INITIAL_ROUND.baseColor);
  const [oddColor, setOddColor] = useState(INITIAL_ROUND.oddColor);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [clickOutcome, setClickOutcome] = useState<ClickOutcome>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isGridWobbling, setIsGridWobbling] = useState(false);
  const [isLevelTransitioning, setIsLevelTransitioning] = useState(false);
  const [tileOrder, setTileOrder] = useState<number[]>(createOrderedTiles(INITIAL_ROUND.gridSize ** 2));

  const [username, setUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isUsernamePromptOpen, setIsUsernamePromptOpen] = useState(false);
  const [isUsernameResolved, setIsUsernameResolved] = useState(false);

  const [topScorers, setTopScorers] = useState<LeaderboardEntry[]>([]);
  const [isTopScorersLoading, setIsTopScorersLoading] = useState(true);

  const timerDeadlineRef = useRef<number | null>(null);
  const resolutionTimeoutRef = useRef<number | null>(null);
  const wobbleTimeoutRef = useRef<number | null>(null);
  const wobbleFrameRef = useRef<number | null>(null);
  const levelTransitionTimeoutRef = useRef<number | null>(null);
  const levelTransitionFrameRef = useRef<number | null>(null);

  const levelRef = useRef(level);
  const heartsRef = useRef(hearts);
  const statusRef = useRef(gameStatus);
  const usernameRef = useRef(username);
  const timeRemainingRef = useRef(timeRemaining);
  const isTimerPausedByUsernamePromptRef = useRef(false);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    heartsRef.current = hearts;
  }, [hearts]);

  useEffect(() => {
    statusRef.current = gameStatus;
  }, [gameStatus]);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  const applyRound = useCallback((round: RoundConfig, nextStatus: GameStatus) => {
    setGridSize(round.gridSize);
    setOddIndex(round.oddIndex);
    setDifficultyLayer(round.difficultyLayer);
    setBaseColor(round.baseColor);
    setOddColor(round.oddColor);
    setTimeRemaining(round.timeLimit);
    setTileOrder(createOrderedTiles(round.gridSize * round.gridSize));

    if (nextStatus === "playing") {
      timerDeadlineRef.current = Date.now() + round.timeLimit * 1000;
      return;
    }

    timerDeadlineRef.current = null;
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      applyRound(generateRound(0), "idle");
      const storedUsername = sanitizeUsername(window.localStorage.getItem(USERNAME_STORAGE_KEY) ?? "");

      if (isValidUsername(storedUsername)) {
        setUsername(storedUsername);
        usernameRef.current = storedUsername;
        setUsernameInput(storedUsername);
        setIsUsernamePromptOpen(false);
        setIsUsernameResolved(true);
        return;
      }

      setUsername("");
      usernameRef.current = "";
      setUsernameInput("");
      setIsUsernamePromptOpen(true);
      setIsUsernameResolved(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [applyRound]);

  const loadTopScorers = useCallback(async () => {
    setIsTopScorersLoading(true);

    try {
      const response = await fetch(`/api/scores?limit=${TOP_SCORERS_LIMIT}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load top scorers");
      }

      const payload: unknown = await response.json();

      if (!isLeaderboardPayload(payload)) {
        throw new Error("Unexpected leaderboard payload");
      }

      setTopScorers(payload.leaderboard);
    } catch {
      setTopScorers([]);
    } finally {
      setIsTopScorersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTopScorers();
  }, [loadTopScorers]);

  const persistScore = useCallback(
    async (playerName: string, score: number, options?: PersistScoreOptions) => {
      const shouldRefreshLeaderboard = options?.refreshLeaderboard ?? false;
      const shouldPreferBeacon = options?.preferBeacon ?? false;
      const previousUsername = options?.previousUsername;
      const payload = JSON.stringify({
        username: playerName,
        score,
        previousUsername: previousUsername && previousUsername.length > 0 ? previousUsername : undefined,
      });

      try {
        if (shouldPreferBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          const blob = new Blob([payload], { type: "application/json" });
          const sent = navigator.sendBeacon("/api/scores", blob);

          if (sent) {
            return;
          }
        }

        await fetch("/api/scores", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: payload,
          keepalive: shouldPreferBeacon,
        });
      } catch {
        // Keep gameplay uninterrupted if persistence fails.
      } finally {
        if (shouldRefreshLeaderboard) {
          void loadTopScorers();
        }
      }
    },
    [loadTopScorers],
  );

  const clearFeedback = useCallback(() => {
    setClickedIndex(null);
    setClickOutcome(null);
  }, []);

  const resetTimerForLevel = useCallback((targetLevel: number) => {
    const nextLimit = getTimeLimitForLevel(targetLevel);
    setTimeRemaining(nextLimit);
    timerDeadlineRef.current = Date.now() + nextLimit * 1000;
  }, []);

  const triggerGridWobble = useCallback(() => {
    if (wobbleTimeoutRef.current) {
      window.clearTimeout(wobbleTimeoutRef.current);
      wobbleTimeoutRef.current = null;
    }

    if (wobbleFrameRef.current) {
      window.cancelAnimationFrame(wobbleFrameRef.current);
      wobbleFrameRef.current = null;
    }

    setIsGridWobbling(false);

    wobbleFrameRef.current = window.requestAnimationFrame(() => {
      wobbleFrameRef.current = null;
      setIsGridWobbling(true);
    });

    wobbleTimeoutRef.current = window.setTimeout(() => {
      wobbleTimeoutRef.current = null;
      setIsGridWobbling(false);
    }, 320);
  }, []);

  const triggerLevelTransition = useCallback(() => {
    if (levelTransitionTimeoutRef.current) {
      window.clearTimeout(levelTransitionTimeoutRef.current);
      levelTransitionTimeoutRef.current = null;
    }

    if (levelTransitionFrameRef.current) {
      window.cancelAnimationFrame(levelTransitionFrameRef.current);
      levelTransitionFrameRef.current = null;
    }

    setIsLevelTransitioning(false);

    levelTransitionFrameRef.current = window.requestAnimationFrame(() => {
      levelTransitionFrameRef.current = null;
      setIsLevelTransitioning(true);
    });

    levelTransitionTimeoutRef.current = window.setTimeout(() => {
      levelTransitionTimeoutRef.current = null;
      setIsLevelTransitioning(false);
    }, 420);
  }, []);

  const triggerGameOver = useCallback(
    (finalScore: number) => {
      setGameStatus("gameover");
      statusRef.current = "gameover";
      timerDeadlineRef.current = null;
      isTimerPausedByUsernamePromptRef.current = false;
      setIsResolving(false);
      clearFeedback();

      const activeUsername = usernameRef.current;
      if (activeUsername) {
        void persistScore(activeUsername, finalScore, { refreshLeaderboard: true });
      }
    },
    [clearFeedback, persistScore],
  );

  const refreshAfterMistake = useCallback(() => {
    triggerGridWobble();
    const nextHearts = heartsRef.current - 1;

    if (nextHearts <= 0) {
      setHearts(0);
      heartsRef.current = 0;
      triggerGameOver(levelRef.current);
      return;
    }

    setHearts(nextHearts);
    heartsRef.current = nextHearts;

    setGameStatus("playing");
    statusRef.current = "playing";
    resetTimerForLevel(levelRef.current);
  }, [resetTimerForLevel, triggerGameOver, triggerGridWobble]);

  const handleCorrectSelection = useCallback(() => {
    const nextLevel = levelRef.current + 1;

    setLevel(nextLevel);
    levelRef.current = nextLevel;

    const nextRound = generateRound(nextLevel);
    applyRound(nextRound, "playing");
    triggerLevelTransition();

    setGameStatus("playing");
    statusRef.current = "playing";
  }, [applyRound, triggerLevelTransition]);

  const handleTimeout = useCallback(() => {
    if (statusRef.current !== "playing") {
      return;
    }

    setIsResolving(false);
    clearFeedback();
    refreshAfterMistake();
  }, [clearFeedback, refreshAfterMistake]);

  useEffect(() => {
    if (gameStatus !== "playing") {
      return;
    }

    const intervalId = window.setInterval(() => {
      const deadline = timerDeadlineRef.current;

      if (!deadline) {
        return;
      }

      const remaining = Math.max((deadline - Date.now()) / 1000, 0);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        timerDeadlineRef.current = null;
        handleTimeout();
      }
    }, 90);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [gameStatus, handleTimeout]);

  useEffect(() => {
    if (!isUsernameResolved) {
      return;
    }

    const flushCurrentScore = () => {
      const activeUsername = usernameRef.current;

      if (!activeUsername) {
        return;
      }

      void persistScore(activeUsername, levelRef.current, { preferBeacon: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushCurrentScore();
      }
    };

    window.addEventListener("pagehide", flushCurrentScore);
    window.addEventListener("beforeunload", flushCurrentScore);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushCurrentScore);
      window.removeEventListener("beforeunload", flushCurrentScore);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isUsernameResolved, persistScore]);

  useEffect(() => {
    return () => {
      isTimerPausedByUsernamePromptRef.current = false;

      if (resolutionTimeoutRef.current) {
        window.clearTimeout(resolutionTimeoutRef.current);
      }

      if (wobbleTimeoutRef.current) {
        window.clearTimeout(wobbleTimeoutRef.current);
      }

      if (wobbleFrameRef.current) {
        window.cancelAnimationFrame(wobbleFrameRef.current);
      }

      if (levelTransitionTimeoutRef.current) {
        window.clearTimeout(levelTransitionTimeoutRef.current);
      }

      if (levelTransitionFrameRef.current) {
        window.cancelAnimationFrame(levelTransitionFrameRef.current);
      }
    };
  }, []);

  const handleSquareClick = useCallback(
    (index: number) => {
      if (statusRef.current === "gameover" || isResolving || isUsernamePromptOpen) {
        return;
      }

      const startsNow = statusRef.current === "idle";
      if (startsNow) {
        setGameStatus("playing");
        statusRef.current = "playing";
        resetTimerForLevel(levelRef.current);
      }

      if (timerDeadlineRef.current) {
        timerDeadlineRef.current += FEEDBACK_DELAY_MS;
      }

      const isCorrect = tileOrder[index] === oddIndex;
      setClickedIndex(index);
      setClickOutcome(isCorrect ? "correct" : "wrong");
      setIsResolving(true);

      resolutionTimeoutRef.current = window.setTimeout(() => {
        resolutionTimeoutRef.current = null;
        setIsResolving(false);
        clearFeedback();

        if (isCorrect) {
          handleCorrectSelection();
          return;
        }

        refreshAfterMistake();
      }, FEEDBACK_DELAY_MS);
    },
    [
      oddIndex,
      tileOrder,
      isResolving,
      isUsernamePromptOpen,
      resetTimerForLevel,
      clearFeedback,
      handleCorrectSelection,
      refreshAfterMistake,
    ],
  );

  const handleShuffle = useCallback(() => {
    if (
      statusRef.current === "gameover" ||
      isResolving ||
      isUsernamePromptOpen ||
      !isUsernameResolved
    ) {
      return;
    }

    clearFeedback();
    setTileOrder((previousOrder) => {
      if (previousOrder.length <= 1) {
        return previousOrder;
      }

      const shuffled = [...previousOrder];

      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        const temp = shuffled[index];
        shuffled[index] = shuffled[randomIndex];
        shuffled[randomIndex] = temp;
      }

      return shuffled;
    });
  }, [
    clearFeedback,
    isResolving,
    isUsernamePromptOpen,
    isUsernameResolved,
  ]);

  const handleOpenUsernamePrompt = useCallback(() => {
    if (!isUsernameResolved) {
      return;
    }

    const activeUsername = usernameRef.current;
    setUsernameInput(activeUsername);
    setUsernameError("");

    if (statusRef.current === "playing" && timerDeadlineRef.current) {
      const remaining = Math.max((timerDeadlineRef.current - Date.now()) / 1000, 0);
      timerDeadlineRef.current = null;
      setTimeRemaining(remaining);
      isTimerPausedByUsernamePromptRef.current = true;
    } else {
      isTimerPausedByUsernamePromptRef.current = false;
    }

    setIsUsernamePromptOpen(true);
  }, [isUsernameResolved]);

  const handleRestart = useCallback(() => {
    if (resolutionTimeoutRef.current) {
      window.clearTimeout(resolutionTimeoutRef.current);
      resolutionTimeoutRef.current = null;
    }

    const freshRound = generateRound(0);

    setLevel(0);
    levelRef.current = 0;

    setHearts(MAX_HEARTS);
    heartsRef.current = MAX_HEARTS;

    setGameStatus("idle");
    statusRef.current = "idle";

    setIsResolving(false);
    clearFeedback();

    applyRound(freshRound, "idle");
  }, [applyRound, clearFeedback]);

  const handleUsernameSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const normalized = sanitizeUsername(usernameInput);

      if (!isValidUsername(normalized)) {
        setUsernameError(
          `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters.`,
        );
        return;
      }

      const previousUsername = usernameRef.current;

      setUsername(normalized);
      usernameRef.current = normalized;
      setUsernameInput(normalized);
      setUsernameError("");
      setIsUsernamePromptOpen(false);
      setIsUsernameResolved(true);
      window.localStorage.setItem(USERNAME_STORAGE_KEY, normalized);

      if (previousUsername && previousUsername.toLowerCase() !== normalized.toLowerCase()) {
        void persistScore(normalized, levelRef.current, {
          previousUsername,
          refreshLeaderboard: true,
        });
      }

      if (isTimerPausedByUsernamePromptRef.current && statusRef.current === "playing") {
        timerDeadlineRef.current = Date.now() + timeRemainingRef.current * 1000;
        isTimerPausedByUsernamePromptRef.current = false;
      }
    },
    [persistScore, usernameInput],
  );

  const handleUsernameChange = useCallback((nextValue: string) => {
    setUsernameInput(nextValue);
    setUsernameError("");
  }, []);

  const gridDisabled =
    gameStatus === "gameover" || isResolving || !isUsernameResolved || isUsernamePromptOpen;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <TopNav />
      </header>

      <section className={styles.usernameSection}>
        <UsernameBar
          username={username}
          onClick={handleOpenUsernamePrompt}
          disabled={!isUsernameResolved}
        />
      </section>

      <section className={styles.centerSection}>
        <div className={styles.gameStack}>
          <Grid
            size={gridSize}
            tileOrder={tileOrder}
            baseColor={baseColor}
            oddColor={oddColor}
            oddIndex={oddIndex}
            gameStatus={gameStatus}
            clickedIndex={clickedIndex}
            clickOutcome={clickOutcome}
            disabled={gridDisabled}
            isWobbling={isGridWobbling}
            isLevelTransitioning={isLevelTransitioning}
            onSquareClick={handleSquareClick}
          />
          <GameInfoBar
            hearts={hearts}
            level={level}
            timeRemaining={timeRemaining}
            gameStatus={gameStatus}
            onShuffle={handleShuffle}
            isShuffleDisabled={
              gameStatus === "gameover" || isResolving || !isUsernameResolved || isUsernamePromptOpen
            }
          />
        </div>
      </section>

      <section className={styles.bottomSection}>
        <div className={styles.restartSlot}>
          {gameStatus === "gameover" ? <RestartButton onRestart={handleRestart} /> : null}
        </div>

        <div className={styles.topScorersSlot}>
          <TopScorers leaderboard={topScorers} isLoading={isTopScorersLoading} />
        </div>
      </section>

      <footer className={styles.footer} aria-hidden="true">
        <span className={styles.srOnly}>{getDifficultyLabel(difficultyLayer)}</span>
      </footer>

      {isUsernameResolved && isUsernamePromptOpen ? (
        <UsernamePrompt
          value={usernameInput}
          errorMessage={usernameError}
          minLength={USERNAME_MIN_LENGTH}
          maxLength={USERNAME_MAX_LENGTH}
          onChange={handleUsernameChange}
          onSubmit={handleUsernameSubmit}
        />
      ) : null}
    </main>
  );
}
