import { useCallback, useEffect, useRef, useState } from 'react';
import type { Mode, OctaveRange } from '../lib/notes';
import {
  type PressResult,
  type StatsByMode,
  type TrainerState,
  applyBounds,
  applyHint,
  applyMode,
  applyPress,
  applyRange,
  applyRelease,
  applySkip,
  createTrainerState,
} from '../lib/trainer';
import { progress } from '../lib/progress';

interface Options {
  initialMode: Mode;
  initialRange: OctaveRange;
  initialStats: StatsByMode;
  initialBounds: [number, number] | null;
}

/** "Find the note" game state for the Notes section. */
export function useTrainer({ initialMode, initialRange, initialStats, initialBounds }: Options) {
  const [state, setState] = useState<TrainerState>(() =>
    createTrainerState(initialMode, initialRange, initialStats, performance.now(), Math.random, initialBounds),
  );
  // The ref is the source of truth for event handlers: two MIDI events in the same
  // tick are judged against the up-to-date target, not a stale render.
  const ref = useRef(state);
  const commit = useCallback((next: TrainerState) => {
    if (next === ref.current) return;
    ref.current = next;
    setState(next);
  }, []);

  /** Returns how the press was judged (used to colour the key synchronously). */
  const press = useCallback(
    (midi: number): PressResult => {
      const { state: next, result } = applyPress(ref.current, midi, performance.now());
      commit(next);
      return result;
    },
    [commit],
  );

  /** Key released (`null` = everything released): reveals the next target after a hit. */
  const release = useCallback(
    (midi: number | null) => commit(applyRelease(ref.current, midi, performance.now())),
    [commit],
  );

  const skip = useCallback(() => commit(applySkip(ref.current, performance.now())), [commit]);
  const setMode = useCallback((mode: Mode) => commit(applyMode(ref.current, mode, performance.now())), [commit]);
  const setRange = useCallback((range: OctaveRange) => commit(applyRange(ref.current, range, performance.now())), [commit]);
  const setBounds = useCallback(
    (bounds: [number, number] | null) => commit(applyBounds(ref.current, bounds, performance.now())),
    [commit],
  );

  /** Returns the MIDI number to highlight (null when the note is already solved). */
  const hint = useCallback((): number | null => {
    if (ref.current.solved) return null;
    const next = applyHint(ref.current);
    commit(next);
    return next.target.midi;
  }, [commit]);

  const getState = useCallback(() => ref.current, []);

  useEffect(() => progress.setNotesStats(state.stats), [state.stats]);

  return { state, press, release, skip, setMode, setRange, setBounds, hint, getState };
}
