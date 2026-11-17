/**
 * Задание недели: one gentle goal per week; finishing it plants a seasonal flower
 * (ёлочка зимой, тюльпан весной, ромашка летом, тыква осенью).
 */
import type { Progress, SectionKey } from './progress';
import { dayKey } from './progress';
import type { Settings } from './storage';

export interface Quest {
  id: string;
  title: string;
  hint: string;
  goal: number;
  unit: string;
  /** Where to go to work on it. */
  section: SectionKey;
  patch?: Partial<Settings>;
  measure(p: Progress, week: WeekInfo): number;
}

export interface WeekInfo {
  key: string;
  /** Day keys Monday…Sunday. */
  days: string[];
  start: number;
}

/** Monday-based week: key = day key of its Monday. */
export function weekOf(t = Date.now()): WeekInfo {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const shift = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - shift);
  const start = d.getTime();
  const days = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(x.getDate() + i);
    return dayKey(x.getTime());
  });
  return { key: days[0], days, start };
}

const minutesIn = (p: Progress, w: WeekInfo, section?: SectionKey) =>
  Math.floor(
    w.days.reduce((a, k) => {
      const d = p.days[k];
      if (!d) return a;
      return a + (section ? d.bySection[section] ?? 0 : d.activeMs);
    }, 0) / 60000,
  );

// «Капли» are stored with exercises (for the record) but are not finger exercises.
const runsSince = (runs: Record<string, { last: number }>, since: number) =>
  Object.entries(runs).filter(([id, r]) => !id.startsWith('drops:') && r.last >= since).length;

export const QUESTS: Quest[] = [
  {
    id: 'days4',
    title: 'Четыре дня с музыкой',
    hint: 'Позанимайтесь хотя бы немного в четыре разных дня этой недели.',
    goal: 4,
    unit: 'дн.',
    section: 'notes',
    measure: (p, w) => w.days.filter((k) => (p.days[k]?.activeMs ?? 0) > 0).length,
  },
  {
    id: 'chords20',
    title: 'Аккордовая неделя',
    hint: '20 минут игры в разделе «Аккорды».',
    goal: 20,
    unit: 'мин',
    section: 'chords',
    measure: (p, w) => minutesIn(p, w, 'chords'),
  },
  {
    id: 'ear15',
    title: 'Чуткие уши',
    hint: '15 минут тренировки слуха — интервалы, аккорды или мелодии.',
    goal: 15,
    unit: 'мин',
    section: 'ear',
    measure: (p, w) => minutesIn(p, w, 'ear'),
  },
  {
    id: 'notes20',
    title: 'Ноты наизусть',
    hint: '20 минут в разделе «Ноты».',
    goal: 20,
    unit: 'мин',
    section: 'notes',
    measure: (p, w) => minutesIn(p, w, 'notes'),
  },
  {
    id: 'jam10',
    title: 'Свободная игра',
    hint: '10 минут импровизации в «Джеме».',
    goal: 10,
    unit: 'мин',
    section: 'jam',
    measure: (p, w) => minutesIn(p, w, 'jam'),
  },
  {
    id: 'songs3',
    title: 'Три песни',
    hint: 'Сыграйте до конца три разные песни.',
    goal: 3,
    unit: 'песни',
    section: 'songs',
    measure: (p, w) => runsSince(p.songs, w.start),
  },
  {
    id: 'fluency3',
    title: 'Ловкие пальцы',
    hint: 'Пройдите три разных упражнения в «Беглости».',
    goal: 3,
    unit: 'упр.',
    section: 'fluency',
    measure: (p, w) => runsSince(p.exercises, w.start),
  },
  {
    id: 'memo10',
    title: 'Садовая память',
    hint: 'Повторите 10 карточек-запоминалок.',
    goal: 10,
    unit: 'карт.',
    section: 'learn',
    patch: { lessonId: 'memos' },
    measure: (p, w) => Object.entries(p.items).filter(([k, v]) => k.startsWith('memo:') && v.last >= w.start).length,
  },
  {
    id: 'minutes60',
    title: 'Час музыки',
    hint: '60 минут игры за неделю в любых разделах.',
    goal: 60,
    unit: 'мин',
    section: 'notes',
    measure: (p, w) => minutesIn(p, w),
  },
];

/** The same quest for everyone in a given week, rotating through the list. */
export function questFor(week: WeekInfo): Quest {
  const n = Math.round(week.start / (7 * 86_400_000));
  return QUESTS[((n % QUESTS.length) + QUESTS.length) % QUESTS.length];
}
