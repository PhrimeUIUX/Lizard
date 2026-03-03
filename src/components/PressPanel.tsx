import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { playLizardSfx } from '../lib/audio';
import { PressResponse } from '../types';

interface PressPanelProps {
  session: Session | null;
  guestId: string;
  publicTotal: number;
  myScore: number;
  onPublicTotalChange: Dispatch<SetStateAction<number>>;
  onMyScoreChange: Dispatch<SetStateAction<number>>;
  onStatusChange: (value: string) => void;
  onRefreshLeaderboard: () => Promise<void>;
  onSuccessfulPress: () => void;
}

const LIZARD_IMAGE_SRC = '/images/lizard-button.png';
const LIZARD_SFX_SRC = '/sfx/lizard-press.mp3';
const TAP_EMOJIS = ['🔥', '🦎', '⚡', '💥', '✨', '🌟', '🚀', '💚', '🎉'];

interface TapEmoji {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [imageMissing, setImageMissing] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pressAudioRef = useRef<HTMLAudioElement | null>(null);
  const bufferRef = useRef<Record<string, number>>({});
  const flushTimerRef = useRef<number | null>(null);
  const isFlushingRef = useRef(false);
  const lizardButtonRef = useRef<HTMLButtonElement | null>(null);
  const emojiIdRef = useRef(0);
  const [tapEmojis, setTapEmojis] = useState<TapEmoji[]>([]);

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

  function getIdentifier() {
    return isAuthed ? `user:${session?.user.id}` : `guest:${guestId}`;
  }

  function scheduleFlush(delayMs = 1000) {
    if (flushTimerRef.current) {
      window.clearTimeout(flushTimerRef.current);
    }
    flushTimerRef.current = window.setTimeout(() => {
      void flushBuffered();
    }, delayMs);
  }

  function restoreBuffered(identifier: string, count: number) {
    bufferRef.current[identifier] = (bufferRef.current[identifier] || 0) + count;
  }

  async function flushBuffered() {
    if (isFlushingRef.current) {
      return;
    }
    isFlushingRef.current = true;
    setIsSyncing(true);

    try {
      while (true) {
        const nextEntry = Object.entries(bufferRef.current)[0];
        if (!nextEntry) {
          break;
        }

        const [identifier, count] = nextEntry;
        delete bufferRef.current[identifier];

        let remaining = count;
        while (remaining > 0) {
          const chunk = Math.min(remaining, 50);
          const { data, error } = await supabase.rpc('press_lizard_batch', {
            p_identifier: identifier,
            p_count: chunk
          });

          if (error) {
            restoreBuffered(identifier, remaining);
            onStatusChange(`Sync error: ${error.message}. Retrying...`);
            scheduleFlush(1500);
            remaining = 0;
            break;
          }

          const pressData = data as PressResponse;
          if (!pressData?.ok) {
            restoreBuffered(identifier, remaining);
            onStatusChange(pressData?.error || 'Sync error. Retrying...');
            scheduleFlush(1500);
            remaining = 0;
            break;
          }

          onPublicTotalChange(Number(pressData.public_total || 0));
          if (identifier.startsWith('user:')) {
            onMyScoreChange(Number(pressData.user_total || 0));
          }

          remaining -= chunk;
        }
      }
    } finally {
      isFlushingRef.current = false;
      setIsSyncing(false);
      if (Object.keys(bufferRef.current).length > 0) {
        scheduleFlush(1200);
      } else {
        onStatusChange('Synced.');
        void onRefreshLeaderboard();
      }
    }
  }

  useEffect(() => {
    function flushOnHidden() {
      if (document.visibilityState === 'hidden') {
        void flushBuffered();
      }
    }

    document.addEventListener('visibilitychange', flushOnHidden);
    window.addEventListener('beforeunload', flushOnHidden);

    return () => {
      document.removeEventListener('visibilitychange', flushOnHidden);
      window.removeEventListener('beforeunload', flushOnHidden);
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
      }
      void flushBuffered();
    };
  }, []);

  function spawnTapEmoji(clientX?: number, clientY?: number) {
    const button = lizardButtonRef.current;
    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const x = clientX ? clientX - rect.left : rect.width / 2;
    const y = clientY ? clientY - rect.top : rect.height / 2;
    const id = ++emojiIdRef.current;
    const emoji = TAP_EMOJIS[Math.floor(Math.random() * TAP_EMOJIS.length)];

    setTapEmojis((prev) => [...prev, { id, emoji, x, y }]);
    window.setTimeout(() => {
      setTapEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 900);
  }

  function handlePress(clientX?: number, clientY?: number) {
    playPressAudio();
    spawnTapEmoji(clientX, clientY);
    const identifier = getIdentifier();
    bufferRef.current[identifier] = (bufferRef.current[identifier] || 0) + 1;

    onPublicTotalChange((prev) => prev + 1);
    if (isAuthed) {
      onMyScoreChange((prev) => prev + 1);
    }
    onStatusChange('Lizard pressed. +1 (pending sync)');
    onSuccessfulPress();
    scheduleFlush(1000);
  }

  return (
    <section className="press-wrap">
      <button
        ref={lizardButtonRef}
        className={`lizard-btn ${isSyncing ? 'is-loading' : ''}`}
        onPointerDown={(event) => {
          handlePress(event.clientX, event.clientY);
        }}
        onClick={(event) => {
          if (event.detail === 0) {
            handlePress();
          }
        }}
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
        <div className="tap-emoji-layer" aria-hidden="true">
          {tapEmojis.map((item) => (
            <span
              key={item.id}
              className="tap-emoji"
              style={{
                left: `${item.x}px`,
                top: `${item.y}px`
              }}
            >
              {item.emoji}
            </span>
          ))}
        </div>
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
