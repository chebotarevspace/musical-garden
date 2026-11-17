import { useSyncExternalStore } from 'react';
import { tabGuard, takeOver } from '../lib/tabGuard';
import s from './TabTakenOver.module.css';

/** Shown in a window that another window of the app took over: it no longer saves anything. */
export function TabTakenOver() {
  const writable = useSyncExternalStore(tabGuard.subscribe, tabGuard.get, tabGuard.get);
  if (writable) return null;
  return (
    <div className={s.backdrop} role="dialog" aria-modal="true" aria-label="Приложение открыто в другом окне">
      <div className={s.card}>
        <div className={s.icon} aria-hidden="true">
          🪟
        </div>
        <h2>Музыкальный сад открыт в другом окне</h2>
        <p>
          Чтобы прогресс не перезаписывался, заниматься можно в одном окне. Всё, что вы сделали здесь, уже сохранено — там вы увидите
          свежие данные.
        </p>
        <button type="button" className={s.btn} onClick={takeOver}>
          Продолжить здесь
        </button>
      </div>
    </div>
  );
}
