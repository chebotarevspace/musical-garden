import { useCallback, useEffect, useState } from 'react';

/** Browser fullscreen for the whole app (Esc exits — handled by the browser). */
export function useFullscreen() {
  const [on, setOn] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  const supported = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen && document.fullscreenEnabled !== false;

  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggle = useCallback(() => {
    if (!supported) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else
      void document.documentElement.requestFullscreen().catch((e: unknown) => {
        // Some embedded browsers forbid fullscreen; the app keeps working as usual.
        console.warn('Fullscreen request was rejected:', e instanceof Error ? e.message : e);
      });
  }, [supported]);

  return { on, toggle, supported };
}
