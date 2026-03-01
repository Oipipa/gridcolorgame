import { DifficultyLayer, RoundConfig } from "@/lib/types";

const MAX_GRID_SIZE = 6;
const MIN_GRID_SIZE = 2;

const DELTA_BY_DIFFICULTY: Record<DifficultyLayer, number> = {
  easy: 17,
  medium: 11,
  hard: 7,
  veryHard: 4.2,
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const toHsl = (hue: number, saturation: number, lightness: number): string => {
  return `hsl(${Math.round(hue)} ${Math.round(saturation)}% ${Math.round(lightness)}%)`;
};

export const getGridSizeForLevel = (level: number): number => {
  if (level <= 2) {
    return 2;
  }

  if (level <= 4) {
    return 3;
  }

  if (level <= 6) {
    return 4;
  }

  if (level <= 8) {
    return 5;
  }

  return MAX_GRID_SIZE;
};

export const selectDifficultyLayer = (level: number): DifficultyLayer => {
  if (level <= 2) {
    return "easy";
  }

  if (level <= 5) {
    return "medium";
  }

  if (level <= 8) {
    return "hard";
  }

  const lateGameLayers: DifficultyLayer[] = ["medium", "hard", "veryHard"];
  const randomIndex = Math.floor(Math.random() * lateGameLayers.length);

  return lateGameLayers[randomIndex];
};

export const getTimeLimitForLevel = (level: number): number => {
  const normalizedLevel = Math.max(level, 0);
  const tier = Math.floor(normalizedLevel / 10);

  return 10 + tier * 10;
};

const getDeltaForRound = (difficultyLayer: DifficultyLayer, gridSize: number): number => {
  const baseDelta = DELTA_BY_DIFFICULTY[difficultyLayer];
  const densityPenalty = (gridSize - MIN_GRID_SIZE) * 0.45;

  return Math.max(baseDelta - densityPenalty, 2.2);
};

export const generateRound = (level: number): RoundConfig => {
  const gridSize = getGridSizeForLevel(level);
  const difficultyLayer = selectDifficultyLayer(level);
  const timeLimit = getTimeLimitForLevel(level);

  const totalCells = gridSize * gridSize;
  const oddIndex = Math.floor(Math.random() * totalCells);

  const hue = Math.random() * 360;
  const saturation = 58 + Math.random() * 24;
  const lightness = 40 + Math.random() * 24;

  const delta = getDeltaForRound(difficultyLayer, gridSize);
  const direction = Math.random() > 0.5 ? 1 : -1;

  const oddLightness = clamp(lightness + direction * delta, 20, 82);
  const oddSaturation = clamp(saturation + direction * delta * 0.5, 34, 92);
  const oddHue = (hue + (Math.random() * 6 - 3) + 360) % 360;

  return {
    gridSize,
    oddIndex,
    difficultyLayer,
    baseColor: toHsl(hue, saturation, lightness),
    oddColor: toHsl(oddHue, oddSaturation, oddLightness),
    timeLimit,
  };
};

export const formatTimeRemaining = (timeRemaining: number): string => {
  return `${Math.max(timeRemaining, 0).toFixed(1)}s`;
};
