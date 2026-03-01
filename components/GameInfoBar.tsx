import { formatTimeRemaining } from "@/lib/game";
import { GameStatus } from "@/lib/types";
import styles from "@/components/GameInfoBar.module.css";

interface GameInfoBarProps {
  hearts: number;
  level: number;
  timeRemaining: number;
  gameStatus: GameStatus;
  onShuffle: () => void;
  isShuffleDisabled: boolean;
}

const HEART_SLOTS = 3;

export function GameInfoBar({
  hearts,
  level,
  timeRemaining,
  gameStatus,
  onShuffle,
  isShuffleDisabled,
}: GameInfoBarProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.bar}>
        <div className={styles.card}>
          <p className={styles.label}>Time Remaining</p>
          <p className={styles.value}>{formatTimeRemaining(timeRemaining)}</p>
        </div>

        <div className={styles.card}>
          <p className={styles.label}>Level</p>
          <p className={styles.value}>{level}</p>
        </div>

        <div className={styles.card}>
          <p className={styles.label} aria-hidden="true">
            ♥
          </p>
          <div className={styles.heartsRow} aria-label={`${hearts} lives remaining`}>
            {Array.from({ length: HEART_SLOTS }).map((_, index) => {
              const filled = index < hearts;

              return (
                <span key={index} className={filled ? styles.heartFilled : styles.heartEmpty}>
                  ♥
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        {gameStatus === "idle" ? <p className={styles.hint}>Click any square to start the timer.</p> : <span />}
        <button className={styles.shuffleButton} type="button" onClick={onShuffle} disabled={isShuffleDisabled}>
          Shuffle
        </button>
      </div>
    </div>
  );
}
