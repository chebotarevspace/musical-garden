/**
 * Learning progress — everything the app remembers about *you*, kept apart from settings.
 *
 * - course: lessons done; levels in chords and ear training;
 * - practice: exercise runs, songs and progressions played;
 * - days: active practice time per day and section (this grows the garden);
 * - items: per-note / per-chord / per-interval hits and misses (for adaptive practice).
 *
 * Stored in localStorage under a versioned key.
 */
import { KEYS } from './storageKeys';
import { canWrite, tabGuard } from './tabGuard';
import { GROW_MS, type Plant, type Rare, SEASONAL_SPECIES, type Sprout, seasonOf, speciesFor } from './garden';
import { type StatsByMode, emptyStatsByMode } from './trainer';

export const PROGRESS_VERSION = 1;
const KEY = KEYS.progress;

/** Something worth celebrating. */
export interface Milestone {
  kind: 'lesson' | 'chordLevel' | 'earLevel' | 'part' | 'streak';
  id: string;
}

export type SectionKey = 'learn' | 'notes' | 'fluency' | 'chords' | 'ear' | 'songs' | 'jam' | 'drops' | 'studio';

export interface DayLog {
  /** Active practice time in ms (only while keys are being played). */
  activeMs: number;
  bySection: Partial<Record<SectionKey, number>>;
  /** Judged key presses / answers. */
  actions: number;
  /** Time on the session stopwatch (course sessions, pauses excluded). */
  sessionMs?: number;
}

export interface ItemStat {
  seen: number;
  misses: number;
  last: number;
}

export interface RunStat {
  runs: number;
  best?: number;
  last: number;
}

export interface Progress {
  version: number;
  createdAt: number;
  lessonsDone: string[];
  /** Course sessions finished (hour-long lessons of the course). */
  sessionsDone: string[];
  chordLevels: Record<string, number>;
  earLevels: Record<string, number>;
  notesStats: StatsByMode;
  exercises: Record<string, RunStat>;
  songs: Record<string, RunStat>;
  progressions: Record<string, RunStat>;
  days: Record<string, DayLog>;
  items: Record<string, ItemStat>;
  /** The garden: grown plants and the one growing now. */
  plants: Plant[];
  sprout: Sprout | null;
  /** First-run introduction finished, and the chosen starting level. */
  onboarded: boolean;
  level: 'beginner' | 'notes' | 'chords' | null;
  /** Day key of the last 7-day-streak reward (so it is given once per streak). */
  streakRewardDay: string | null;
  /** Week keys whose quest reward was collected. */
  questsDone: string[];
  /** Gardener: outfit chosen and surprise visits answered. */
  outfit: string | null;
  visits: number;
  /** The guided tour of the app was shown. */
  tourDone: boolean;
  /** Running totals of events (for story chapters): `ok:note`, `run:songs`, `ms:jam`, `drops:round`… */
  counters: Record<string, number>;
  /** «Ученик садовника»: finished chapters and the counters when the current one began. */
  story: { done: string[]; current: string | null; base: Record<string, number> };
}

export const emptyProgress = (): Progress => ({
  version: PROGRESS_VERSION,
  createdAt: Date.now(),
  lessonsDone: [],
  sessionsDone: [],
  chordLevels: {},
  earLevels: {},
  notesStats: emptyStatsByMode(),
  exercises: {},
  songs: {},
  progressions: {},
  days: {},
  items: {},
  plants: [],
  sprout: null,
  onboarded: false,
  level: null,
  streakRewardDay: null,
  questsDone: [],
  outfit: null,
  visits: 0,
  tourDone: false,
  counters: {},
  story: { done: [], current: null, base: {} },
});

/* ---------------- parsing / migration ---------------- */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const numMap = (v: unknown): Record<string, number> =>
  isObj(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] >= 0)) : {};
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const objMap = <T,>(v: unknown, ok: (x: unknown) => x is T): Record<string, T> =>
  isObj(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, T] => ok(e[1]))) : {};
const isRun = (x: unknown): x is RunStat => isObj(x) && typeof x.runs === 'number';
const isItem = (x: unknown): x is ItemStat => isObj(x) && typeof x.seen === 'number' && typeof x.misses === 'number';
const isDay = (x: unknown): x is DayLog => isObj(x) && typeof x.activeMs === 'number';
const isPlant = (x: unknown): x is Plant => isObj(x) && typeof x.id === 'string' && typeof x.species === 'string' && typeof x.day === 'string';
function parseSprout(v: unknown): Sprout | null {
  if (!isObj(v) || typeof v.activeMs !== 'number') return null;
  return {
    startedAt: typeof v.startedAt === 'number' ? v.startedAt : Date.now(),
    activeMs: v.activeMs,
    bySection: numMap(v.bySection),
    chordMode: typeof v.chordMode === 'string' ? v.chordMode : undefined,
    rare: v.rare === 'streak' || v.rare === 'level' || v.rare === 'course' ? v.rare : undefined,
  };
}

function parseStats(v: unknown): StatsByMode {
  const base = emptyStatsByMode();
  if (!isObj(v)) return base;
  for (const mode of ['naturals', 'accidentals'] as const) {
    const m = v[mode];
    if (isObj(m)) base[mode] = { ...base[mode], ...numMap(m) } as StatsByMode[typeof mode];
  }
  return base;
}

/** Validates anything (stored JSON or an imported file) into a Progress object. */
export function parseProgress(v: unknown): Progress {
  const p = emptyProgress();
  if (!isObj(v)) return p;
  return {
    ...p,
    createdAt: typeof v.createdAt === 'number' ? v.createdAt : p.createdAt,
    lessonsDone: strList(v.lessonsDone),
    sessionsDone: strList(v.sessionsDone),
    chordLevels: numMap(v.chordLevels),
    earLevels: numMap(v.earLevels),
    notesStats: parseStats(v.notesStats),
    exercises: objMap(v.exercises, isRun),
    songs: objMap(v.songs, isRun),
    progressions: objMap(v.progressions, isRun),
    days: objMap(v.days, isDay),
    items: objMap(v.items, isItem),
    plants: Array.isArray(v.plants) ? v.plants.filter(isPlant) : [],
    sprout: parseSprout(v.sprout),
    onboarded: v.onboarded === true,
    level: v.level === 'beginner' || v.level === 'notes' || v.level === 'chords' ? v.level : null,
    streakRewardDay: typeof v.streakRewardDay === 'string' ? v.streakRewardDay : null,
    questsDone: strList(v.questsDone),
    outfit: typeof v.outfit === 'string' ? v.outfit : null,
    visits: typeof v.visits === 'number' && v.visits >= 0 ? v.visits : 0,
    tourDone: v.tourDone === true,
    counters: numMap(v.counters),
    story: isObj(v.story)
      ? { done: strList(v.story.done), current: typeof v.story.current === 'string' ? v.story.current : null, base: numMap(v.story.base) }
      : { done: [], current: null, base: {} },
  };
}

function readJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function load(): Progress {
  const stored = readJSON(KEY);
  return stored ? parseProgress(stored) : emptyProgress();
}

/* ---------------- store ---------------- */

export const dayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A gap longer than this between key presses is not counted as practice time. */
const ACTIVE_GAP_MS = 15_000;

export type ResetScope = 'lessons' | 'notes' | 'fluency' | 'chords' | 'ear' | 'songs' | 'history' | 'garden';

export const RESET_SCOPES: { id: ResetScope; title: string }[] = [
  { id: 'lessons', title: 'Пройденные уроки' },
  { id: 'notes', title: 'Ноты: статистика и трудные ноты' },
  { id: 'fluency', title: 'Беглость: результаты упражнений' },
  { id: 'chords', title: 'Аккорды: уровни, последовательности, трудные аккорды' },
  { id: 'ear', title: 'Слух: уровни и трудные интервалы' },
  { id: 'songs', title: 'Песни: сыгранные песни' },
  { id: 'history', title: 'История занятий по дням' },
  { id: 'garden', title: 'Сад: все растения и росток' },
];

const bump = (c: Record<string, number>, key: string, n: number) => ({ ...c, [key]: (c[key] ?? 0) + n });

function createProgressStore() {
  let state: Progress = typeof window === 'undefined' ? emptyProgress() : load();
  const listeners = new Set<() => void>();
  const growListeners = new Set<(p: Plant) => void>();
  const milestoneListeners = new Set<(m: Milestone) => void>();
  const milestone = (m: Milestone) => {
    if (typeof window !== 'undefined') window.setTimeout(() => milestoneListeners.forEach((l) => l(m)), 0);
  };
  let saveTimer: number | undefined;
  let lastActive = 0;

  const persist = () => {
    if (!canWrite()) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  };
  const schedule = (immediate = false) => {
    if (typeof window === 'undefined') return;
    window.clearTimeout(saveTimer);
    if (immediate) persist();
    else saveTimer = window.setTimeout(persist, 1500);
  };
  const set = (next: Progress, immediate = false) => {
    state = next;
    listeners.forEach((l) => l());
    schedule(immediate);
  };
  const today = (): DayLog => state.days[dayKey()] ?? { activeMs: 0, bySection: {}, actions: 0 };

  const newSprout = (now: number): Sprout => ({ startedAt: now, activeMs: 0, bySection: {} });

  /** Adds active time to the sprout; a fully grown sprout becomes a plant. */
  const grow = (p: Progress, section: SectionKey, add: number, now: number, chordMode?: string): Progress => {
    if (add <= 0) return p;
    const sp = p.sprout ?? newSprout(now);
    const bySection = { ...sp.bySection, [section]: (sp.bySection[section] ?? 0) + add };
    const sprout: Sprout = { ...sp, activeMs: sp.activeMs + add, bySection, chordMode: section === 'chords' && chordMode ? chordMode : sp.chordMode };
    if (sprout.activeMs < GROW_MS) return { ...p, sprout };
    const { species, from } = speciesFor(sprout);
    const plant: Plant = {
      id: `p${now.toString(36)}`,
      species,
      day: dayKey(now),
      grownAt: now,
      minutes: Math.round(sprout.activeMs / 60000),
      rare: !!sprout.rare || undefined,
      from,
    };
    if (typeof window !== 'undefined') window.setTimeout(() => growListeners.forEach((l) => l(plant)), 0);
    return { ...p, plants: [...p.plants, plant], sprout: null };
  };

  if (typeof window !== 'undefined') {
    // First run: create the record.
    if (!readJSON(KEY)) persist();
    window.addEventListener('beforeunload', persist);
    // Another window takes over: save now; it saved — read its data.
    tabGuard.onFlush(() => {
      window.clearTimeout(saveTimer);
      persist();
    });
    tabGuard.onReload(() => {
      state = load();
      listeners.forEach((l) => l());
    });
  }

  return {
    get: () => state,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },

    /** Called on every key press / answer: accumulates active time for today and grows the sprout. */
    recordActivity(section: SectionKey, now = Date.now(), chordMode?: string) {
      const gap = now - lastActive;
      lastActive = now;
      const d = today();
      const add = gap > 0 && gap < ACTIVE_GAP_MS ? gap : 0;
      const day: DayLog = {
        activeMs: d.activeMs + add,
        bySection: { ...d.bySection, [section]: (d.bySection[section] ?? 0) + add },
        actions: d.actions + 1,
      };
      let next: Progress = { ...state, days: { ...state.days, [dayKey(now)]: day } };
      // A 7-day streak makes the current plant a rose (once per streak).
      if (day.actions === 1 && summarize(next).streak >= 7 && next.streakRewardDay !== dayKey(now)) {
        const prevReward = next.streakRewardDay ? Date.parse(next.streakRewardDay) : 0;
        if (now - prevReward > 6 * 86_400_000) {
          next = { ...next, streakRewardDay: dayKey(now), sprout: { ...(next.sprout ?? newSprout(now)), rare: 'streak' } };
          milestone({ kind: 'streak', id: '' });
        }
      }
      if (add > 0) next = { ...next, counters: bump(next.counters, `ms:${section}`, add) };
      set(grow(next, section, add, now, chordMode));
    },

    /** Count a custom event (`drops:round`, `studio:take`…). */
    count(key: string, n = 1) {
      set({ ...state, counters: bump(state.counters, key, n) }, true);
    },

    startChapter(id: string) {
      set({ ...state, story: { ...state.story, current: id, base: { ...state.counters } } }, true);
    },

    /** Chapter finished: a magic flower appears in the garden. */
    finishChapter(id: string) {
      if (state.story.done.includes(id)) return;
      const now = Date.now();
      const plant: Plant = { id: `s${now.toString(36)}`, species: 'magic', day: dayKey(now), grownAt: now, minutes: 0, rare: true, from: 'learn' };
      set({ ...state, story: { done: [...state.story.done, id], current: null, base: {} }, plants: [...state.plants, plant] }, true);
      if (typeof window !== 'undefined') window.setTimeout(() => growListeners.forEach((l) => l(plant)), 0);
    },

    /** A whole melody played in rhythm: a lily of the valley grows. */
    plantLearnedMelody() {
      const now = Date.now();
      const plant: Plant = { id: `l${now.toString(36)}`, species: 'lily', day: dayKey(now), grownAt: now, minutes: 0, rare: true, from: 'notes' };
      set({ ...state, plants: [...state.plants, plant], counters: bump(state.counters, 'melody:learned', 1) }, true);
      if (typeof window !== 'undefined') window.setTimeout(() => growListeners.forEach((l) => l(plant)), 0);
    },

    /** A melody of your own was saved: an iris grows. */
    plantComposition() {
      const now = Date.now();
      const plant: Plant = { id: `c${now.toString(36)}`, species: 'iris', day: dayKey(now), grownAt: now, minutes: 0, from: 'learn' };
      set({ ...state, plants: [...state.plants, plant], counters: bump(state.counters, 'studio:song', 1) }, true);
      if (typeof window !== 'undefined') window.setTimeout(() => growListeners.forEach((l) => l(plant)), 0);
    },

    /** Reading a lesson grows the garden a little too. */
    creditLearning(ms: number) {
      set(grow(state, 'learn', ms, Date.now()), true);
    },

    /** A milestone (level, part of the course) makes the growing plant rare. */
    markRare(kind: Rare) {
      set({ ...state, sprout: { ...(state.sprout ?? newSprout(Date.now())), rare: kind } }, true);
      if (kind === 'course') milestone({ kind: 'part', id: '' });
      if (kind === 'streak') milestone({ kind: 'streak', id: '' });
    },

    onMilestone(cb: (m: Milestone) => void) {
      milestoneListeners.add(cb);
      return () => {
        milestoneListeners.delete(cb);
      };
    },

    onGrow(cb: (p: Plant) => void) {
      growListeners.add(cb);
      return () => {
        growListeners.delete(cb);
      };
    },

    /** Weekly quest done: a seasonal plant appears in the garden right away. */
    claimQuest(week: string, from: SectionKey) {
      if (state.questsDone.includes(week)) return;
      const now = Date.now();
      const plant: Plant = { id: `q${now.toString(36)}`, species: SEASONAL_SPECIES[seasonOf(new Date(now).getMonth())], day: dayKey(now), grownAt: now, minutes: 0, rare: true, from };
      set({ ...state, questsDone: [...state.questsDone, week], plants: [...state.plants, plant] }, true);
      if (typeof window !== 'undefined') window.setTimeout(() => growListeners.forEach((l) => l(plant)), 0);
    },

    setTourDone() {
      set({ ...state, tourDone: true }, true);
    },

    setOutfit(id: string | null) {
      set({ ...state, outfit: id }, true);
    },

    /** The gardener's surprise task was solved: a little extra growth. */
    visitDone() {
      set({ ...state, visits: state.visits + 1 }, true);
    },

    setOnboarded(level: Progress['level']) {
      set({ ...state, onboarded: true, level }, true);
    },

    /** Hit (`ok`) or miss for a note / chord / interval, for adaptive practice. */
    recordItem(key: string, ok: boolean) {
      const it = state.items[key] ?? { seen: 0, misses: 0, last: 0 };
      const parts = key.split(':');
      const cat = parts[0] === 'ear' ? `${parts[0]}:${parts[1]}` : parts[0];
      set({
        ...state,
        items: { ...state.items, [key]: { seen: it.seen + (ok ? 1 : 0), misses: it.misses + (ok ? 0 : 1), last: Date.now() } },
        counters: ok ? bump(state.counters, `ok:${cat}`, 1) : state.counters,
      });
    },

    /** Add stopwatch time of a session to the day it ended. */
    addSessionTime(ms: number, now = Date.now()) {
      if (!(ms > 0)) return;
      const key = dayKey(now);
      const day = state.days[key] ?? { activeMs: 0, bySection: {}, actions: 0 };
      set({ ...state, days: { ...state.days, [key]: { ...day, sessionMs: (day.sessionMs ?? 0) + ms } }, counters: bump(state.counters, 'sessions:count', 1) }, true);
    },

    /** A course session finished: marks it and celebrates. */
    sessionDone(id: string) {
      if (state.sessionsDone.includes(id)) return;
      set({ ...state, sessionsDone: [...state.sessionsDone, id] }, true);
    },

    lessonDone(id: string) {
      if (state.lessonsDone.includes(id)) return;
      set({ ...state, lessonsDone: [...state.lessonsDone, id] }, true);
      milestone({ kind: 'lesson', id });
    },

    /** +1 correct answer on a level; returns the new count. */
    bumpLevel(kind: 'chordLevels' | 'earLevels', id: string): number {
      const n = (state[kind][id] ?? 0) + 1;
      let next: Progress = { ...state, [kind]: { ...state[kind], [id]: n } };
      if (n === 10) next = { ...next, sprout: { ...(next.sprout ?? newSprout(Date.now())), rare: 'level' } };
      set(next, true);
      if (n === 10) milestone({ kind: kind === 'chordLevels' ? 'chordLevel' : 'earLevel', id });
      return n;
    },

    setNotesStats(stats: StatsByMode) {
      set({ ...state, notesStats: stats });
    },

    /** A finished run of an exercise / song / progression. `score` is kept as best when lower is better (time). */
    recordRun(kind: 'exercises' | 'songs' | 'progressions', id: string, score?: number, lowerIsBetter = true) {
      const r = state[kind][id] ?? { runs: 0, last: 0 };
      let best = r.best;
      if (score !== undefined) best = best === undefined ? score : lowerIsBetter ? Math.min(best, score) : Math.max(best, score);
      set({ ...state, [kind]: { ...state[kind], [id]: { runs: r.runs + 1, best, last: Date.now() } }, counters: bump(state.counters, id.startsWith('drops:') ? 'run:drops' : `run:${kind}`, 1) }, true);
    },

    reset(scopes: ResetScope[]) {
      const next = { ...state };
      const dropItems = (prefix: string) => {
        next.items = Object.fromEntries(Object.entries(next.items).filter(([k]) => !k.startsWith(prefix)));
      };
      for (const s of scopes) {
        if (s === 'lessons') {
          next.lessonsDone = [];
          next.sessionsDone = [];
        }
        if (s === 'notes') {
          next.notesStats = emptyStatsByMode();
          dropItems('note:');
        }
        if (s === 'fluency') next.exercises = {};
        if (s === 'chords') {
          next.chordLevels = {};
          next.progressions = {};
          dropItems('chord:');
        }
        if (s === 'ear') {
          next.earLevels = {};
          dropItems('ear:');
        }
        if (s === 'songs') next.songs = {};
        if (s === 'history') next.days = {};
        if (s === 'garden') {
          next.plants = [];
          next.sprout = null;
          next.questsDone = [];
        }
      }
      set(next, true);
    },

    replace(next: Progress) {
      set(parseProgress(next), true);
    },
  };
}

export const progress = createProgressStore();
export type ProgressStore = typeof progress;

/* ---------------- summaries ---------------- */

export function summarize(p: Progress) {
  const days = Object.entries(p.days).filter(([, d]) => d.activeMs > 0 || d.actions > 0);
  const totalMs = days.reduce((a, [, d]) => a + d.activeMs, 0);
  let streak = 0;
  for (let t = Date.now(); ; t -= 86_400_000) {
    const d = p.days[dayKey(t)];
    if (d && (d.activeMs > 0 || d.actions > 0)) streak++;
    else if (dayKey(t) !== dayKey()) break; // today may still be empty
    else continue;
  }
  return {
    practiceDays: days.length,
    totalMinutes: Math.round(totalMs / 60000),
    streak,
    lessons: p.lessonsDone.length,
    chordLevels: Object.values(p.chordLevels).filter((n) => n >= 10).length,
    earLevels: Object.values(p.earLevels).filter((n) => n >= 10).length,
    songsPlayed: Object.keys(p.songs).length,
  };
}

/** Stopwatch time of course sessions: today, the last 7 days, all time (ms). */
export function sessionTime(p: Progress, now = Date.now()) {
  const day = (t: number) => p.days[dayKey(t)]?.sessionMs ?? 0;
  let week = 0;
  for (let i = 0; i < 7; i++) week += day(now - i * 86_400_000);
  const total = Object.values(p.days).reduce((a, d) => a + (d.sessionMs ?? 0), 0);
  return { today: day(now), week, total, sessions: p.counters['sessions:count'] ?? 0 };
}

/** «1 ч 25 мин», «40 мин», «0 мин». */
export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  const h = Math.floor(min / 60);
  return h ? `${h} ч ${min % 60} мин` : `${min} мин`;
}

/** The items with the worst miss rate (at least a few attempts) — fodder for adaptive practice. */
export function weakItems(p: Progress, prefix: string, limit = 5): { key: string; rate: number }[] {
  return Object.entries(p.items)
    .filter(([k, v]) => k.startsWith(prefix) && v.seen + v.misses >= 3)
    .map(([key, v]) => ({ key, rate: v.misses / (v.seen + v.misses) }))
    .filter((x) => x.rate > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, limit);
}
