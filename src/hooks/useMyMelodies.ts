import { useSyncExternalStore } from 'react';
import type { Melody } from '../lib/melodyModel';
import { myMelodies } from '../lib/myMelodies';

export function useMyMelodies(): Melody[] {
  return useSyncExternalStore(myMelodies.subscribe, myMelodies.get, myMelodies.get);
}
