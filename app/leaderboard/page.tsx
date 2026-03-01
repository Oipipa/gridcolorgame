import { TopNav } from "@/components/TopNav";
import { getLeaderboard } from "@/lib/db";
import styles from "@/app/leaderboard/leaderboard.module.css";

export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  const leaderboard = getLeaderboard();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <TopNav />
      </header>

      <section className={styles.panel}>
        <h1 className={styles.title}>Leaderboard</h1>

        {leaderboard.length === 0 ? (
          <p className={styles.empty}>No scores yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Player</th>
                  <th scope="col">High Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.username}>
                    <td>#{entry.rank}</td>
                    <td>{entry.username}</td>
                    <td>{entry.highScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
