import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import s from './Modal.module.css';

/** Centered dialog over a dimmed backdrop. Esc or a click outside closes it. */
export function Modal({ title, onClose, children, width = 620 }: { title: string; onClose(): void; children: ReactNode; width?: number }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    panel.current?.focus();
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return createPortal(
    <div className={s.backdrop} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={s.panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panel} style={{ width }}>
        <header className={s.head}>
          <h2>{title}</h2>
          <button type="button" className={s.close} onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </header>
        <div className={s.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
