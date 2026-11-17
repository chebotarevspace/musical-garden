import { useSyncExternalStore } from 'react';
import { type Progress, progress } from '../lib/progress';

/** Current learning progress (re-renders when it changes — on every key press while playing). */
export function useProgress(): Progress {
  return useSyncExternalStore(progress.subscribe, progress.get, progress.get);
}

/** One primitive piece of progress: re-renders only when that value changes. */
export function useProgressValue<T extends string | number | boolean | null>(select: (p: Progress) => T): T {
  const get = () => select(progress.get());
  return useSyncExternalStore(progress.subscribe, get, get);
}
