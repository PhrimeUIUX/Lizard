import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LeaderboardEntry } from '../types';

interface TopHundredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TopHundredModal({ isOpen, onClose }: TopHundredModalProps) {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    async function loadTopHundred() {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_leaderboard', { p_limit: 100 });
      setLoading(false);

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      const typed = (data as LeaderboardEntry[]).map((item) => ({
        ...item,
        presses: Number(item.presses)
      }));

      setRows(typed);
    }

    void loadTopHundred();
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="modal-card top100-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Top 100 Lizard leaderboard"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Top 100 Lizards</h2>
          <button className="ghost" onClick={onClose}>Close</button>
        </div>

        {loading && <p className="muted">Loading leaderboard...</p>}
        {error && <p className="notice error">Failed to load: {error}</p>}

        {!loading && !error && (
          <ol className="top100-list" start={1}>
            {rows.map((entry, index) => (
              <li key={entry.user_id}>
                <span>#{index + 1} {entry.username}</span>
                <strong>{entry.presses.toLocaleString()}</strong>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
