import { useEffect, useRef } from 'react';

/** Keyboard shortcuts by `KeyboardEvent.code` (layout-independent: works with Russian layout too). */
export function useHotkeys(map: Record<string, () => void>) {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      // A dialog is open: shortcuts must not drive the screen behind it.
      if (document.querySelector('[aria-modal="true"]')) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'text'))) return;
      const fn = ref.current[e.code];
      if (!fn) return;
      if (e.code === 'Space') e.preventDefault();
      fn();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
