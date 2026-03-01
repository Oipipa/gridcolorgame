export const USERNAME_STORAGE_KEY = "gridcolorgame.username";
export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 20;

export const sanitizeUsername = (rawValue: string): string => {
  return rawValue.replace(/\s+/g, " ").trim().slice(0, USERNAME_MAX_LENGTH);
};

export const isValidUsername = (username: string): boolean => {
  return username.length >= USERNAME_MIN_LENGTH && username.length <= USERNAME_MAX_LENGTH;
};

export const normalizeScore = (score: number): number => {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.floor(score));
};
