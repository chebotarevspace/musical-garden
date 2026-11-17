import { useCallback, useEffect, useRef, useState } from 'react';
import { type SecretTune, type VisitTask, makeVisitTask, matchSecret } from '../lib/gardener';
import { progress } from '../lib/progress';
import type { SectionKey } from '../lib/storage';

/** Sections where a short surprise doesn't get in the way (no metronome, no play-along). */
const VISIT_SECTIONS: SectionKey[] = ['notes', 'chords', 'ear', 'jam'];
const MIN_GAP_MS = 5 * 60_000;
const MIN_PRESSES = 60;
const MAX_PER_DAY = 3;
const TIMEOUT_MS = 25_000;

export interface Visit {
  id: number;
  task: VisitTask;
  state: 'ask' | 'done' | 'missed';
}

/**
 * The gardener drops by now and then with a tiny task («сыграйте ноту ми-бемоль»);
 * solving it gives the sprout a minute of growth. Also listens for a secret tune.
 */
export function useGardenerVisits(onSecret: (secret: SecretTune) => void) {
  const [visit, setVisit] = useState<Visit | null>(null);
  const visitRef = useRef<Visit | null>(null);
  visitRef.current = visit;
  const held = useRef(new Set<number>());
  const presses = useRef(0);
  const lastVisit = useRef(Date.now());
  const today = useRef({ day: new Date().toDateString(), count: 0 });
  const timers = useRef<number[]>([]);
  const tune = useRef<{ m: number; t: number }[]>([]);
  const secretAt = useRef(new Map<string, number>());

  const close = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setVisit(null);
  }, []);

  const finish = useCallback(
    (state: 'done' | 'missed') => {
      setVisit((v) => (v ? { ...v, state } : v));
      if (state === 'done') {
        progress.creditLearning(60_000);
        progress.visitDone();
      }
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [window.setTimeout(() => setVisit(null), state === 'done' ? 3500 : 2500)];
    },
    [],
  );

  const onNoteOn = useCallback(
    (midi: number, section: SectionKey) => {
      held.current.add(midi);
      const now = Date.now();

      // Secret tunes (any key): something nice happens.
      tune.current = [...tune.current.filter((x) => now - x.t < 8000), { m: midi, t: now }].slice(-12);
      const secret = matchSecret(tune.current.map((x) => x.m));
      if (secret && now - (secretAt.current.get(secret.id) ?? 0) > 60_000) {
        secretAt.current.set(secret.id, now);
        tune.current = [];
        onSecret(secret);
      }

      const v = visitRef.current;
      if (v && v.state === 'ask') {
        const pcs = new Set([...held.current].map((m) => m % 12));
        if (v.task.pcs.every((pc) => pcs.has(pc))) finish('done');
        return;
      }
      if (v || !VISIT_SECTIONS.includes(section)) return;

      presses.current++;
      const day = new Date().toDateString();
      if (today.current.day !== day) today.current = { day, count: 0 };
      if (presses.current < MIN_PRESSES || now - lastVisit.current < MIN_GAP_MS || today.current.count >= MAX_PER_DAY) return;
      if (Math.random() > 0.03) return;

      presses.current = 0;
      lastVisit.current = now;
      today.current.count++;
      const nv: Visit = { id: now, task: makeVisitTask(progress.get().level), state: 'ask' };
      setVisit(nv);
      timers.current = [window.setTimeout(() => visitRef.current?.state === 'ask' && finish('missed'), TIMEOUT_MS)];
    },
    [finish, onSecret],
  );

  const onNoteOff = useCallback((midi: number) => {
    held.current.delete(midi);
  }, []);

  const releaseAll = useCallback(() => held.current.clear(), []);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  return { visit, onNoteOn, onNoteOff, releaseAll, close };
}
