/** «Капли»: notes fall like raindrops onto the keys — catch each one in time. */
import { codeToMidi, isBlack } from './notes';
import { SONGS, melodyTimeline } from './songs';

export interface DropsLevel {
  id: string;
  title: string;
  hint: string;
  tempo: number;
  count: number;
}

export const DROPS_LEVELS: DropsLevel[] = [
  { id: 'five', title: 'Пять капель: C–G', hint: 'Пять белых клавиш от до первой октавы, по одной на долю.', tempo: 66, count: 20 },
  { id: 'octave', title: 'Октава C4–C5', hint: 'Все белые клавиши одной октавы.', tempo: 76, count: 28 },
  { id: 'leaps', title: 'Скачки', hint: 'Капли прыгают через клавишу и дальше.', tempo: 80, count: 28 },
  { id: 'eighths', title: 'Восьмые', hint: 'Иногда капли падают парами — по две на долю.', tempo: 72, count: 32 },
  { id: 'sharps', title: 'С чёрными клавишами', hint: 'Добавляются диезы и бемоли в октаве C4–C5.', tempo: 72, count: 28 },
  { id: 'songs', title: 'Ливень из песен', hint: 'Мелодии из раздела «Песни», нота за нотой.', tempo: 84, count: 0 },
];

export const findDropsLevel = (id: string) => DROPS_LEVELS.find((l) => l.id === id) ?? DROPS_LEVELS[0];

/** A drop lands on `beat` (in quarter beats from the start). */
export interface DropNote {
  midi: number;
  beat: number;
}

type Rng = () => number;

const range = (lo: number, hi: number, black: boolean) => {
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) if (black || !isBlack(m)) out.push(m);
  return out;
};

export function makeDrops(levelId: string, rng: Rng = Math.random): DropNote[] {
  if (levelId === 'songs') {
    const withMelody = SONGS.filter((s) => s.melody?.length);
    const song = withMelody[Math.floor(rng() * withMelody.length)];
    // The song's own rhythm, at least an eighth apart.
    return melodyTimeline(song).map((n) => ({ midi: codeToMidi(n.code)!, beat: n.beat }));
  }
  const level = findDropsLevel(levelId);
  const pool =
    levelId === 'five' ? range(60, 67, false) : levelId === 'sharps' ? range(60, 72, true) : range(60, 72, false);
  const maxLeap = levelId === 'leaps' ? 4 : 2;
  const out: DropNote[] = [];
  let i = Math.floor(pool.length / 2);
  let beat = 0;
  while (out.length < level.count) {
    const step = 1 + Math.floor(rng() * maxLeap);
    const dir = rng() < 0.5 ? -1 : 1;
    let next = i + dir * step;
    if (next < 0 || next >= pool.length) next = i - dir * step;
    i = Math.max(0, Math.min(pool.length - 1, next));
    out.push({ midi: pool[i], beat });
    // Eighths level: sometimes a pair of drops in one beat.
    beat += levelId === 'eighths' && rng() < 0.35 ? 0.5 : 1;
  }
  return out;
}

export const HIT_MS = 170;
export const PERFECT_MS = 70;

export type Judge = 'perfect' | 'good' | 'miss';

export function judge(deltaMs: number): Judge {
  const d = Math.abs(deltaMs);
  return d <= PERFECT_MS ? 'perfect' : d <= HIT_MS ? 'good' : 'miss';
}

/** Score: perfect 100, good 60, ×(1 + combo/10) — rewards keeping the rain going. */
export const pointsFor = (j: Judge, combo: number) => (j === 'miss' ? 0 : Math.round((j === 'perfect' ? 100 : 60) * (1 + Math.min(combo, 30) / 10)));

export function stars(accuracy: number): number {
  return accuracy >= 0.95 ? 3 : accuracy >= 0.8 ? 2 : accuracy >= 0.6 ? 1 : 0;
}
