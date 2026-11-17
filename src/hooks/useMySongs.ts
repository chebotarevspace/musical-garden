import { useSyncExternalStore } from 'react';
import { mySongs } from '../lib/mySongs';
import type { Song } from '../lib/songs';

export function useMySongs(): Song[] {
  return useSyncExternalStore(mySongs.subscribe, mySongs.get, mySongs.get);
}
