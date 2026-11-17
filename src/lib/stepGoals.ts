/**
 * A clear task for every step of a course session — and an automatic check.
 *
 * The task is derived from what the step opens (a lesson, a trainer with its mode) and measured
 * with counters the trainers already keep, counting from the moment the step started.
 */
import type { PlanStep } from './course';
import type { Progress } from './progress';

export type StepGoal =
  | { kind: 'lesson'; lessonId: string; label: string }
  | { kind: 'count'; key: string; n: number; label: string; /** Counter in ms, shown as minutes. */ minutes?: boolean };

const count = (key: string, n: number, label: string): StepGoal => ({ kind: 'count', key, n, label });
const minutes = (section: string, n: number, label: string): StepGoal => ({ kind: 'count', key: `ms:${section}`, n: n * 60_000, label, minutes: true });

export function goalFor(step: PlanStep): StepGoal | null {
  const p = step.patch;
  switch (step.section) {
    case 'learn':
      return p.lessonId ? { kind: 'lesson', lessonId: p.lessonId, label: 'Прочитать урок и нажать «Урок пройден»' } : null;
    case 'notes':
      if (p.noteSource === 'hands') return p.handsPlay === 'tempo' ? count('hands:clean', 1, 'Одно упражнение — все ноты вовремя') : count('hands:clean', 2, 'Два чистых упражнения двумя руками');
      if (p.noteSource === 'tune') return count('melody:phrase', 2, 'Два новых шага по фразам (звёзды)');
      if (p.noteSource === 'melody') return count('ok:note', 20, 'Сыграть 20 нот с листа');
      if (p.noteSource === 'staff') return count('ok:note', 15, 'Прочитать на стане 15 нот');
      return count('ok:note', 15, 'Найти 15 нот');
    case 'fluency':
      return count('run:exercises', 2, 'Сыграть упражнение до конца 2 раза');
    case 'drops':
      return count('drops:round', 2, 'Сыграть 2 раунда');
    case 'ear': {
      const mode = p.earMode ?? 'intervals';
      if (mode === 'melody') return count('ok:ear:melody', 3, 'Повторить на слух 3 мелодии');
      const what = mode === 'chords' ? 'аккордов' : mode === 'notes' ? 'звуков' : 'интервалов';
      return count(`ok:ear:${mode}`, 10, `Узнать на слух 10 ${what}`);
    }
    case 'chords':
      switch (p.chordMode) {
        case 'changes':
          return count('changes:runs', 2, 'Две попытки по минуте');
        case 'rhythm':
          return count('rhythm:runs', 2, 'Сыграть рисунок 2 раза (цель — 80 %)');
        case 'progressions':
          return count('run:progressions', 2, 'Сыграть цепочку 2 круга');
        case 'detect':
          return minutes('chords', 3, 'Поиграть 3 минуты');
        default:
          return count('ok:chord', 10, 'Собрать 10 аккордов');
      }
    case 'songs':
      return count('run:songs', 1, 'Сыграть песню до конца');
    case 'jam':
      if (p.jamMode === 'tasks') return count('jam:task', 1, 'Выполнить задание Джема');
      if (p.jamMode === 'call') return count('jam:answer', 3, 'Три удачных ответа Доминику');
      if (p.jamMode === 'loop') return count('jam:loop', 2, 'Записать 2 слоя');
      return minutes('jam', 4, 'Поиграть 4 минуты');
    case 'studio':
      return count('studio:take', 1, 'Записать дубль');
    default:
      return null;
  }
}

/** Counter value to measure the step from (taken when the step starts). */
export function goalBase(goal: StepGoal | null, p: Progress): number {
  return goal?.kind === 'count' ? p.counters[goal.key] ?? 0 : 0;
}

export interface GoalProgress {
  value: number;
  target: number;
  done: boolean;
  /** «7/15», «2/4 мин». */
  text: string;
}

export function goalProgress(goal: StepGoal, p: Progress, base: number): GoalProgress {
  if (goal.kind === 'lesson') {
    const done = p.lessonsDone.includes(goal.lessonId);
    return { value: done ? 1 : 0, target: 1, done, text: done ? 'урок пройден' : 'урок не отмечен' };
  }
  const raw = Math.max(0, (p.counters[goal.key] ?? 0) - base);
  const value = Math.min(goal.n, raw);
  const done = raw >= goal.n;
  const text = goal.minutes ? `${Math.floor(value / 60_000)}/${goal.n / 60_000} мин` : `${value}/${goal.n}`;
  return { value, target: goal.n, done, text };
}
