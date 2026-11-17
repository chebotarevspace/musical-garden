import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Which keyboard to draw for the current viewport. */
export function useKeyboardLayout(): 'full' | 'range' | 'stacked' {
  const stacked = useMediaQuery('(max-width: 600px) and (orientation: portrait)');
  const narrow = useMediaQuery('(max-width: 1023px)');
  return stacked ? 'stacked' : narrow ? 'range' : 'full';
}

export const useIsTouch = () => useMediaQuery('(hover: none) and (pointer: coarse)');

export const isAppleMobile = () =>
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
