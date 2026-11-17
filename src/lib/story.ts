/**
 * «Ученик садовника»: short story chapters. Each has 3 small tasks across the app;
 * finishing a chapter grows a magic flower. A new chapter opens every week.
 */
import type { Progress, SectionKey } from './progress';
import type { Settings } from './storage';

export interface StoryTask {
  text: string;
  /** Counter key (see progress.counters) and how much it must grow during the chapter. */
  counter: string;
  goal: number;
  /** Shown as "x / goal" in these units (ms counters are shown in minutes). */
  unit: string;
  section: SectionKey;
  patch?: Partial<Settings>;
}

export interface Chapter {
  id: string;
  title: string;
  intro: string;
  ending: string;
  tasks: StoryTask[];
}

const MIN = 60_000;

export const CHAPTERS: Chapter[] = [
  {
    id: 'crow',
    title: 'Ворона-воровка',
    intro: 'Ночью в сад прилетела ворона и растащила ноты по всем грядкам! Без нот колокольчики не звенят. Поможете их собрать?',
    ending: 'Ворона смутилась и вернула последнюю ноту сама. Колокольчики снова звенят — а на грядке распустился волшебный цветок.',
    tasks: [
      { text: 'Найдите на клавиатуре 20 нот', counter: 'ok:note', goal: 20, unit: 'нот', section: 'notes' },
      { text: 'Повторите по слуху 3 мелодии, которые насвистывала ворона', counter: 'ok:ear:melody', goal: 3, unit: 'мелодии', section: 'ear', patch: { earMode: 'melody' } },
      { text: 'Вспомните 3 запоминалки', counter: 'ok:memo', goal: 3, unit: 'карточки', section: 'learn', patch: { lessonId: 'memos' } },
    ],
  },
  {
    id: 'drought',
    title: 'Засуха',
    intro: 'Уже неделю нет дождя, и листья поникли. Доминик слышал: если сыграть музыку капель, небо откликнется.',
    ending: 'Небо нахмурилось — и пошёл тёплый дождь! Сад умылся, а над прудом встала радуга.',
    tasks: [
      { text: 'Сыграйте 2 раунда «Капель»', counter: 'drops:round', goal: 2, unit: 'раунда', section: 'drops' },
      { text: 'Соберите комбо из 10 капель подряд', counter: 'drops:combo10', goal: 1, unit: 'раз', section: 'drops' },
      { text: 'Поиграйте 5 минут в «Джеме» — пусть облака потанцуют', counter: 'ms:jam', goal: 5 * MIN, unit: 'мин', section: 'jam' },
    ],
  },
  {
    id: 'fireflies',
    title: 'Концерт для светлячков',
    intro: 'Светлячки просят концерт: тогда они осветят сад на всё лето. Нужны аккорды, песня — и запись, чтобы слушать её по вечерам.',
    ending: 'Светлячки зажглись под вашу музыку и кружат над садом до утра.',
    tasks: [
      { text: 'Соберите 10 аккордов', counter: 'ok:chord', goal: 10, unit: 'аккордов', section: 'chords', patch: { chordMode: 'build' } },
      { text: 'Сыграйте песню до конца', counter: 'run:songs', goal: 1, unit: 'песня', section: 'songs' },
      { text: 'Запишите дубль в «Студии»', counter: 'studio:take', goal: 1, unit: 'дубль', section: 'studio' },
    ],
  },
  {
    id: 'bees',
    title: 'Пчёлы-музыканты',
    intro: 'В улье переполох: пчёлы разучивают гимн, но путают интервалы. Доминик просит вас стать их учителем.',
    ending: 'Пчёлы жужжат точно в терцию! В благодарность они опылили весь сад.',
    tasks: [
      { text: 'Узнайте на слух 15 интервалов', counter: 'ok:ear:intervals', goal: 15, unit: 'интервалов', section: 'ear', patch: { earMode: 'intervals' } },
      { text: 'Пройдите упражнение на беглость', counter: 'run:exercises', goal: 1, unit: 'упражнение', section: 'fluency' },
      { text: 'Узнайте 5 аккордов на слух', counter: 'ok:ear:chords', goal: 5, unit: 'аккордов', section: 'ear', patch: { earMode: 'chords' } },
    ],
  },
  {
    id: 'fair',
    title: 'Песня для ярмарки',
    intro: 'В деревне ярмарка, и Доминик хочет прийти со своей песней. Слов он не знает — а вот мелодию можно сочинить вместе.',
    ending: 'Ваша мелодия звучала на всей ярмарке! Доминик вернулся с полной корзиной семян.',
    tasks: [
      { text: 'Поимпровизируйте 5 минут в «Джеме»', counter: 'ms:jam', goal: 5 * MIN, unit: 'мин', section: 'jam' },
      { text: 'Сочините мелодию и сохраните её в «Студии»', counter: 'studio:song', goal: 1, unit: 'мелодия', section: 'studio' },
      { text: 'Сыграйте последовательность аккордов', counter: 'run:progressions', goal: 1, unit: 'раз', section: 'chords', patch: { chordMode: 'progressions' } },
    ],
  },
  {
    id: 'harvest',
    title: 'Праздник урожая',
    intro: 'Осень, урожай собран, и весь сад готовится к празднику. Нужна музыка на весь вечер — от вальса до песен.',
    ending: 'Праздник удался! Доминик говорит, что теперь вы не ученик, а настоящий музыкальный садовник.',
    tasks: [
      { text: 'Сыграйте 2 песни до конца', counter: 'run:songs', goal: 2, unit: 'песни', section: 'songs' },
      { text: 'Поиграйте 15 минут где угодно', counter: 'ms:*', goal: 15 * MIN, unit: 'мин', section: 'notes' },
      { text: 'Повторите 5 запоминалок', counter: 'ok:memo', goal: 5, unit: 'карточек', section: 'learn', patch: { lessonId: 'memos' } },
    ],
  },
];

// `ms:*` — practice time in any section.
const ANY_SECTIONS = ['learn', 'notes', 'fluency', 'chords', 'ear', 'songs', 'jam', 'drops', 'studio'];

const WEEK = 7 * 86_400_000;

function counterValue(c: Record<string, number>, key: string): number {
  if (key === 'ms:*') return ANY_SECTIONS.reduce((a, s) => a + (c[`ms:${s}`] ?? 0), 0);
  return c[key] ?? 0;
}

export function taskProgress(p: Progress, task: StoryTask): number {
  const v = counterValue(p.counters, task.counter) - counterValue(p.story.base, task.counter);
  return Math.max(0, Math.min(task.goal, v));
}

export const shown = (task: StoryTask, v: number) => (task.counter.startsWith('ms:') ? Math.floor(v / MIN) : v);
export const shownGoal = (task: StoryTask) => (task.counter.startsWith('ms:') ? Math.round(task.goal / MIN) : task.goal);

export type StoryState =
  | { kind: 'active'; chapter: Chapter; index: number; done: boolean[] }
  | { kind: 'ready'; chapter: Chapter; index: number }
  | { kind: 'wait'; chapter: Chapter; index: number; days: number }
  | { kind: 'finished' };

/** Where the story is: the chapter in progress, the next one ready to start, or waiting for next week. */
export function storyState(p: Progress, now = Date.now()): StoryState {
  const cur = CHAPTERS.findIndex((c) => c.id === p.story.current);
  if (cur >= 0) {
    const chapter = CHAPTERS[cur];
    return { kind: 'active', chapter, index: cur, done: chapter.tasks.map((t) => taskProgress(p, t) >= t.goal) };
  }
  const index = CHAPTERS.findIndex((c) => !p.story.done.includes(c.id));
  if (index < 0) return { kind: 'finished' };
  const opensAt = p.createdAt + index * WEEK;
  if (now < opensAt) return { kind: 'wait', chapter: CHAPTERS[index], index, days: Math.ceil((opensAt - now) / 86_400_000) };
  return { kind: 'ready', chapter: CHAPTERS[index], index };
}
