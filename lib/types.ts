export type GameStatus = "idle" | "playing" | "gameover";

export type DifficultyLayer = "easy" | "medium" | "hard" | "veryHard";

export type ClickOutcome = "correct" | "wrong" | null;

export interface RoundConfig {
  gridSize: number;
  oddIndex: number;
  difficultyLayer: DifficultyLayer;
  baseColor: string;
  oddColor: string;
  timeLimit: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  highScore: number;
  updatedAt: string;
}
