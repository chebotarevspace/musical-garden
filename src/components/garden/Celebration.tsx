import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { LEVELS } from '../../lib/chords';
import { EAR_LEVELS } from '../../lib/ear';
import { type Milestone, progress } from '../../lib/progress';
import { LESSONS } from '../../learn/lessons';
import s from './Celebration.module.css';

const COLORS = ['#f6a9c8', '#e57aa5', '#ffde59', '#8bd16a', '#e8833a', '#6b95ef', '#fffbe0'];

function message(m: Milestone): { title: string; sub: string } {
  switch (m.kind) {
    case 'lesson':
      return { title: 'Урок пройден!', sub: LESSONS.find((l) => l.id === m.id)?.title ?? '' };
    case 'chordLevel':
      return { title: 'Уровень аккордов пройден!', sub: `${LEVELS.find((l) => l.id === m.id)?.title ?? ''} · следующее растение будет редким` };
    case 'earLevel':
      return { title: 'Уровень слуха пройден!', sub: `${EAR_LEVELS.find((l) => l.id === m.id)?.title ?? ''} · следующее растение будет редким` };
    case 'part':
      return { title: 'Часть курса пройдена!', sub: 'В саду вырастет золотое дерево' };
    case 'streak':
      return { title: 'Неделя подряд!', sub: 'Следующим в саду вырастет роза' };
  }
}

/** Petals falling over the screen + a short banner for milestones. */
export function Celebration() {
  const [m, setM] = useState<(Milestone & { at: number }) | null>(null);
  useEffect(() => progress.onMilestone((x) => setM({ ...x, at: Date.now() })), []);
  useEffect(() => {
    if (!m) return;
    const t = window.setTimeout(() => setM(null), 3200);
    return () => window.clearTimeout(t);
  }, [m]);
  if (!m) return null;
  const { title, sub } = message(m);
  return (
    <div className={s.layer} key={m.at} aria-live="polite">
      {Array.from({ length: 36 }, (_, i) => (
        <i
          key={i}
          className={s.petal}
          style={
            {
              left: `${(i * 37) % 100}%`,
              background: COLORS[i % COLORS.length],
              '--delay': `${(i % 9) * 0.12}s`,
              '--dur': `${2.2 + (i % 5) * 0.25}s`,
              '--drift': `${((i % 7) - 3) * 22}px`,
              '--size': `${6 + (i % 3) * 3}px`,
            } as CSSProperties
          }
        />
      ))}
      <div className={s.banner} role="status">
        <strong>{title}</strong>
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}
