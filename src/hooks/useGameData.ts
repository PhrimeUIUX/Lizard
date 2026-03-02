import { useCallback, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { LeaderboardEntry } from '../types';

interface CounterRow {
  value: number | string;
}

interface ScoreRow {
  presses: number | string;
}

export function useGameData() {
  const [session, setSession] = useState<Session | null>(null);
  const [publicTotal, setPublicTotal] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const loadPublicTotal = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_counters')
      .select('value')
      .eq('key', 'public_total')
      .maybeSingle<CounterRow>();

    if (!error && data) {
      setPublicTotal(Number(data.value || 0));
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: 10 });
    if (!error && data) {
      const typed = (data as LeaderboardEntry[]).map((entry) => ({
        ...entry,
        presses: Number(entry.presses)
      }));
      setLeaderboard(typed);
    }
  }, []);

  const loadMyScore = useCallback(async (userId?: string) => {
    if (!userId) {
      setMyScore(0);
      return;
    }

    const { data, error } = await supabase
      .from('user_scores')
      .select('presses')
      .eq('user_id', userId)
      .maybeSingle<ScoreRow>();

    if (!error && data) {
      setMyScore(Number(data.presses || 0));
      return;
    }

    if (!data) {
      setMyScore(0);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) {
        return;
      }

      setSession(data.session);
      await Promise.all([
        loadPublicTotal(),
        loadLeaderboard(),
        loadMyScore(data.session?.user?.id)
      ]);
    }

    boot();

    const authListener = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadMyScore(nextSession?.user?.id);
      void loadLeaderboard();
    });

    const poll = setInterval(() => {
      void loadPublicTotal();
      void loadLeaderboard();
    }, 8000);

    return () => {
      mounted = false;
      authListener.data.subscription.unsubscribe();
      clearInterval(poll);
    };
  }, [loadLeaderboard, loadMyScore, loadPublicTotal]);

  return {
    session,
    publicTotal,
    myScore,
    leaderboard,
    setPublicTotal,
    setMyScore,
    loadLeaderboard
  };
}
