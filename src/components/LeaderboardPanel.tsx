import { LeaderboardEntry } from '../types';

interface LeaderboardPanelProps {
  leaderboard: LeaderboardEntry[];
  onOpenTopHundred: () => void;
}

function rankBadge(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export function LeaderboardPanel({ leaderboard, onOpenTopHundred }: LeaderboardPanelProps) {
  const topFive = leaderboard.slice(0, 5);

  return (
    <section className="leaderboard-panel compact">
      <div className="panel-head">
        <h2>Top Lizard</h2>
        <button className="brand-btn small" onClick={onOpenTopHundred}>See Top 100</button>
      </div>

      <div className="rank-list-card">
        {topFive.length === 0 ? (
          <p className="muted">No ranked lizards yet.</p>
        ) : (
          <ol className="rank-list-compact" start={1}>
            {topFive.map((entry, index) => {
              const rank = index + 1;
              return (
                <li key={entry.user_id} className={`rank-row ${rank <= 3 ? `place-${rank}` : ''}`}>
                  <span className="rank-left">
                    <span className="rank-badge">{rankBadge(rank)}</span>
                    <span className="name">{entry.username}</span>
                  </span>
                  <strong>{entry.presses.toLocaleString()}</strong>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
