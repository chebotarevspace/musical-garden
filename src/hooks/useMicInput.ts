import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext, outputLevel, sinceAppSound } from '../lib/audio';
import { createTracker } from '../lib/noteTracker';
import { detectPitch, nearestKey } from '../lib/pitch';

export type MicStatus = 'off' | 'starting' | 'on' | 'denied' | 'unsupported';

/** Typical delay from striking a key to recognising it (buffer + stability frames). */
export const MIC_LATENCY_MS = 70;

interface Options {
  enabled: boolean;
  /** 0…1: higher hears quieter playing (and more room noise). */
  sensitivity: number;
  /** Headphones: the app's own sound can't reach the microphone, so never pause listening. */
  headphones: boolean;
  onNoteOn(midi: number, velocity: number): void;
  onNoteOff(midi: number): void;
}

const gateFor = (sens: number) => 0.004 + (1 - Math.max(0, Math.min(1, sens))) * 0.04;

/**
 * Listens to an acoustic piano through the microphone and reports single notes as key presses.
 * While the app itself is playing (and no headphones), listening pauses so it doesn't hear itself.
 */
export function useMicInput({ enabled, sensitivity, headphones, onNoteOn, onNoteOff }: Options) {
  const [status, setStatus] = useState<MicStatus>(() =>
    typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'off' : 'unsupported',
  );
  const [meter, setMeter] = useState({ level: 0, note: null as number | null, cents: 0, muted: false });
  const handlers = useRef({ onNoteOn, onNoteOff, headphones });
  handlers.current = { onNoteOn, onNoteOff, headphones };
  const tracker = useRef(createTracker({ gate: gateFor(sensitivity), stable: 2 }));

  useEffect(() => tracker.current.setGate(gateFor(sensitivity)), [sensitivity]);

  const stopRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    for (const e of tracker.current.flush()) if (e.type === 'off') handlers.current.onNoteOff(e.midi);
  }, []);

  useEffect(() => {
    if (!enabled || status === 'unsupported') {
      stop();
      if (status === 'on' || status === 'starting') setStatus('off');
      return;
    }
    let cancelled = false;
    setStatus('starting');
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      .then((stream) => {
        const ctx = getAudioContext();
        if (cancelled || !ctx) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser();
        an.fftSize = 2048;
        src.connect(an);
        const buf = new Float32Array(an.fftSize);
        let lastUi = 0;
        const id = window.setInterval(() => {
          an.getFloatTimeDomainData(buf);
          const r = detectPitch(buf, ctx.sampleRate);
          // The app is sounding (or just stopped): pause unless the user wears headphones.
          const out = outputLevel();
          const muted = !handlers.current.headphones && (out > 0.004 || sinceAppSound() < 120);
          const key = r.freq > 0 && r.clarity > 0.85 ? nearestKey(r.freq) : null;
          const events = muted ? tracker.current.flush() : tracker.current.push({ midi: key?.midi ?? null, rms: r.rms });
          for (const e of events) {
            if (e.type === 'on') handlers.current.onNoteOn(e.midi, e.velocity);
            else handlers.current.onNoteOff(e.midi);
          }
          const now = performance.now();
          if (now - lastUi > 90) {
            lastUi = now;
            setMeter({ level: Math.min(1, r.rms * 12), note: key?.midi ?? null, cents: key?.cents ?? 0, muted });
          }
        }, 20);
        stopRef.current = () => {
          window.clearInterval(id);
          src.disconnect();
          stream.getTracks().forEach((t) => t.stop());
        };
        setStatus('on');
      })
      .catch(() => {
        if (!cancelled) setStatus('denied');
      });
    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { status, meter };
}
