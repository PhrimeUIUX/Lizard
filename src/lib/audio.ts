import { MutableRefObject } from 'react';

export function playLizardSfx(audioCtxRef: MutableRefObject<AudioContext | null>): void {
  const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  if (!audioCtxRef.current) {
    audioCtxRef.current = new AudioCtx();
  }

  const ctx = audioCtxRef.current;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(460, now);
  osc.frequency.exponentialRampToValueAtTime(760, now + 0.06);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.16);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.24);
}
