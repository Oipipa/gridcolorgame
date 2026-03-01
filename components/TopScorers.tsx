import { LeaderboardEntry } from "@/lib/types";
import styles from "@/components/TopScorers.module.css";

interface TopScorersProps {
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
}

export function TopScorers({ leaderboard, isLoading }: TopScorersProps) {
  return (
    <aside className={styles.card} aria-label="Top scorers">
      <p className={styles.title}>Top 3</p>

      {isLoading ? <p className={styles.status}>Loading...</p> : null}

      {!isLoading && leaderboard.length === 0 ? <p className={styles.status}>No scores yet</p> : null}

      {!isLoading && leaderboard.length > 0 ? (
        <ol className={styles.list}>
          {leaderboard.map((entry) => (
            <li key={entry.username} className={styles.item}>
              <span className={styles.player}>{entry.username}</span>
              <span className={styles.score}>{entry.highScore}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </aside>
  );
}
