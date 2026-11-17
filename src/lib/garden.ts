/**
 * The garden: practice grows plants.
 *
 * - While you play, the current sprout collects *active* practice time (pauses don't count).
 * - After GROW_MS of active play it becomes a full plant in the garden.
 * - The species depends on what you practised most while it grew; milestones give rare plants.
 * - An unfinished sprout never dies — it waits for the next session.
 */
import type { SectionKey } from './progress';

export const GROW_MS = 10 * 60 * 1000; // 10 minutes of active play per plant

export type Species =
  | 'bell' // ноты — колокольчики
  | 'bamboo' // беглость
  | 'birch' // аккорды: построение
  | 'maple' // аккорды: последовательности
  | 'oak' // аккорды: круг, «что я играю»
  | 'sunflower' // слух
  | 'sakura' // песни
  | 'fern' // уроки
  | 'poppy' // джем
  | 'spruce' // сезонное: зима
  | 'tulip' // сезонное: весна
  | 'chamomile' // сезонное: лето
  | 'pumpkin' // сезонное: осень
  | 'iris' // своя мелодия
  | 'magic' // глава истории
  | 'lily' // выученная мелодия
  | 'rose' // редкое: неделя подряд
  | 'lotus' // редкое: пройден уровень
  | 'golden'; // редкое: пройдена часть курса

export type Rare = 'streak' | 'level' | 'course';

export interface Sprout {
  startedAt: number;
  activeMs: number;
  bySection: Partial<Record<SectionKey, number>>;
  /** The chords sub-mode that dominated (for the tree kind). */
  chordMode?: string;
  /** A milestone reached while growing → the plant will be rare. */
  rare?: Rare;
}

export interface Plant {
  id: string;
  species: Species;
  /** Day key (YYYY-MM-DD) when it finished growing. */
  day: string;
  grownAt: number;
  minutes: number;
  rare?: boolean;
  /** What it grew from, for the tooltip. */
  from: SectionKey;
}

export const SPECIES_INFO: Record<Species, { name: string; hint: string }> = {
  bell: { name: 'Колокольчик', hint: 'вырос на нотах' },
  bamboo: { name: 'Бамбук', hint: 'вырос на беглости — быстро, как пальцы' },
  birch: { name: 'Берёза', hint: 'выросла на построении аккордов' },
  maple: { name: 'Клён', hint: 'вырос на последовательностях аккордов' },
  oak: { name: 'Дуб', hint: 'вырос на квинтовом круге и подборе аккордов' },
  sunflower: { name: 'Подсолнух', hint: 'вырос на тренировке слуха' },
  sakura: { name: 'Сакура', hint: 'выросла на песнях' },
  fern: { name: 'Папоротник', hint: 'вырос на уроках' },
  poppy: { name: 'Мак', hint: 'вырос на импровизации' },
  spruce: { name: 'Ёлочка', hint: 'сезонная: зимнее задание недели' },
  tulip: { name: 'Тюльпан', hint: 'сезонный: весеннее задание недели' },
  chamomile: { name: 'Ромашка', hint: 'сезонная: летнее задание недели' },
  pumpkin: { name: 'Тыква', hint: 'сезонная: осеннее задание недели' },
  iris: { name: 'Ирис', hint: 'вырос из вашей собственной мелодии' },
  magic: { name: 'Волшебный цветок', hint: 'награда за главу истории «Ученик садовника»' },
  lily: { name: 'Ландыш', hint: 'вырос из выученной мелодии' },
  rose: { name: 'Роза', hint: 'редкая: неделя занятий подряд' },
  lotus: { name: 'Лотос', hint: 'редкий: пройден уровень' },
  golden: { name: 'Золотое дерево', hint: 'редкое: пройдена часть курса' },
};

const SECTION_SPECIES: Record<SectionKey, Species> = {
  notes: 'bell',
  fluency: 'bamboo',
  chords: 'birch',
  ear: 'sunflower',
  songs: 'sakura',
  learn: 'fern',
  jam: 'poppy',
  drops: 'bamboo',
  studio: 'poppy',
};

/** Species grown from practice (one per section), in herbarium order. */
export const COMMON_SPECIES: Species[] = ['bell', 'bamboo', 'birch', 'maple', 'oak', 'sunflower', 'sakura', 'fern', 'poppy'];
export const RARE_SPECIES: Species[] = ['rose', 'lotus', 'golden', 'iris', 'magic', 'lily'];
export const SEASONAL_SPECIES: Record<Season, Species> = { winter: 'spruce', spring: 'tulip', summer: 'chamomile', autumn: 'pumpkin' };

export function speciesFor(sprout: Sprout): { species: Species; from: SectionKey } {
  const entries = Object.entries(sprout.bySection) as [SectionKey, number][];
  const from = entries.length ? entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0] : 'notes';
  if (sprout.rare) return { species: sprout.rare === 'streak' ? 'rose' : sprout.rare === 'level' ? 'lotus' : 'golden', from };
  if (from === 'chords') {
    const m = sprout.chordMode;
    return { species: m === 'progressions' ? 'maple' : m === 'circle' || m === 'detect' ? 'oak' : 'birch', from };
  }
  return { species: SECTION_SPECIES[from], from };
}

/** 0 seed · 1 sprout · 2 young · 3 grown. */
export const growthStage = (fraction: number) => (fraction <= 0.02 ? 0 : fraction < 0.35 ? 1 : fraction < 1 ? 2 : 3);

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';
export function seasonOf(month: number): Season {
  if (month === 11 || month <= 1) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'autumn';
}

export const SEASON_NAME: Record<Season, string> = { winter: 'зима', spring: 'весна', summer: 'лето', autumn: 'осень' };


/** Garden decorations that appear as the garden grows. */
export const DECOR: { id: 'pond' | 'bench' | 'gazebo' | 'windmill'; name: string; at: number }[] = [
  { id: 'pond', name: 'пруд с кувшинкой', at: 10 },
  { id: 'bench', name: 'скамейка', at: 20 },
  { id: 'gazebo', name: 'беседка', at: 35 },
  { id: 'windmill', name: 'мельница', at: 50 },
];
