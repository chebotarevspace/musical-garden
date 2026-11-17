import { findLesson, lessonFor, lessonNumber } from '../learn/lessons';
import type { Settings } from '../lib/storage';
import s from './Section.module.css';

/** "📖 Урок 9 · Мажорная гамма" — jumps from the trainer to the lesson explaining it. */
export function TheoryLink({ settings, update }: { settings: Settings; update(patch: Partial<Settings>): void }) {
  const id = lessonFor(settings.section, settings);
  const lesson = findLesson(id);
  return (
    <button type="button" className={s.theory} onClick={() => update({ section: 'learn', lessonId: id })} title="Открыть урок">
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
        <path d="M8 4.2C6.6 3 4.6 2.6 2 2.8v9.4c2.6-.2 4.6.2 6 1.4 1.4-1.2 3.4-1.6 6-1.4V2.8c-2.6-.2-4.6.2-6 1.4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      Теория: урок {lessonNumber(id)} · {lesson.title}
    </button>
  );
}
