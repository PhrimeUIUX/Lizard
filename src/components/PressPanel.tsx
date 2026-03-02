import { useMemo, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { playLizardSfx } from '../lib/audio';
import { PressResponse } from '../types';

interface PressPanelProps {
  session: Session | null;
  guestId: string;
  publicTotal: number;
  myScore: number;
  onPublicTotalChange: (value: number) => void;
  onMyScoreChange: (value: number) => void;
  onStatusChange: (value: string) => void;
  onRefreshLeaderboard: () => Promise<void>;
  onSuccessfulPress: () => void;
}

const LIZARD_IMAGE_SRC = '/images/lizard-button.png';
const LIZARD_SFX_SRC = '/sfx/lizard-press.mp3';

export function PressPanel({
  session,
  guestId,
  publicTotal,
  myScore,
  onPublicTotalChange,
  onMyScoreChange,
  onStatusChange,
  onRefreshLeaderboard,
  onSuccessfulPress
}: PressPanelProps) {
  const [loadingPress, setLoadingPress] = useState(false);
  const [imageMissing, setImageMissing] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pressAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastPressRef = useRef(0);

  const isAuthed = useMemo(() => Boolean(session?.user?.id), [session?.user?.id]);

  function playPressAudio() {
    if (!pressAudioRef.current) {
      pressAudioRef.current = new Audio(LIZARD_SFX_SRC);
      pressAudioRef.current.preload = 'auto';
      pressAudioRef.current.volume = 0.9;
    }

    const node = pressAudioRef.current.cloneNode(true) as HTMLAudioElement;
    node.play().catch(() => {
      playLizardSfx(audioCtxRef);
    });
  }

  async function handlePress() {
    if (loadingPress) {
      return;
    }

    const now = Date.now();
    if (now - lastPressRef.current < 300) {
      onStatusChange('Too fast. Wait 0.3s between presses.');
      return;
    }
    lastPressRef.current = now;

    setLoadingPress(true);

    const identifier = isAuthed ? `user:${session?.user.id}` : `guest:${guestId}`;
    const { data, error } = await supabase.rpc('press_lizard', {
      p_identifier: identifier
    });

    if (error) {
      setLoadingPress(false);
      onStatusChange(error.message.includes('0.3') ? error.message : `Press error: ${error.message}`);
      return;
    }

    const pressData = data as PressResponse;
    if (!pressData?.ok) {
      setLoadingPress(false);
      onStatusChange(pressData?.error || 'Too fast. Wait 0.3s.');
      return;
    }

    playPressAudio();

    onPublicTotalChange(Number(pressData.public_total || 0));
    if (isAuthed) {
      onMyScoreChange(Number(pressData.user_total || 0));
    }

    onStatusChange('Lizard pressed. +1');
    onSuccessfulPress();
    setLoadingPress(false);
    await onRefreshLeaderboard();
  }

  return (
    <section className="press-wrap">
      <button
        className={`lizard-btn ${loadingPress ? 'is-loading' : ''}`}
        onClick={handlePress}
        disabled={loadingPress}
        aria-label="Press lizard"
      >
        {imageMissing ? (
          <span className="lizard-fallback" role="img" aria-hidden="true">🦎</span>
        ) : (
          <img
            src={LIZARD_IMAGE_SRC}
            alt="Lizard button"
            className="lizard-img"
            onError={() => setImageMissing(true)}
          />
        )}
      </button>

      <div className="stats-row">
        <article className="stat-chip">
          <span>Public total</span>
          <strong>{publicTotal.toLocaleString()}</strong>
        </article>
        <article className="stat-chip">
          <span>Your score</span>
          <strong>{myScore.toLocaleString()}</strong>
        </article>
      </div>
    </section>
  );
}
