/**
 * «Смены»: how many clean chord changes in a minute (the «one-minute changes» drill).
 * A chord counts when exactly its notes sound — any inversion, any octave.
 */
import { type Chord, chordPcs } from './chords';
import { parseChord } from './chordSymbols';

export interface ChangeSet {
  id: string;
  group: string;
  title: string;
  chords: string[];
}

export const CHANGE_SETS: ChangeSet[] = [
  { id: 'c-g', group: 'Пара аккордов', title: 'C ↔ G', chords: ['C', 'G'] },
  { id: 'c-f', group: 'Пара аккордов', title: 'C ↔ F', chords: ['C', 'F'] },
  { id: 'c-am', group: 'Пара аккордов', title: 'C ↔ Am', chords: ['C', 'Am'] },
  { id: 'f-g', group: 'Пара аккордов', title: 'F ↔ G', chords: ['F', 'G'] },
  { id: 'am-f', group: 'Пара аккордов', title: 'Am ↔ F', chords: ['Am', 'F'] },
  { id: 'g-am', group: 'Пара аккордов', title: 'G ↔ Am', chords: ['G', 'Am'] },
  { id: 'am-e', group: 'Пара аккордов', title: 'Am ↔ E', chords: ['Am', 'E'] },
  { id: 'c-f-g', group: 'Цепочки', title: 'C → F → G', chords: ['C', 'F', 'G'] },
  { id: 'pop', group: 'Цепочки', title: 'C → G → Am → F', chords: ['C', 'G', 'Am', 'F'] },
  { id: 'fifties', group: 'Цепочки', title: 'C → Am → F → G', chords: ['C', 'Am', 'F', 'G'] },
  { id: 'minor', group: 'Цепочки', title: 'Am → Dm → E → Am', chords: ['Am', 'Dm', 'E', 'Am'] },
  { id: 'axis', group: 'Цепочки', title: 'Am → F → C → G', chords: ['Am', 'F', 'C', 'G'] },
  { id: 'g-key', group: 'С чёрными клавишами', title: 'G → D → Em → C', chords: ['G', 'D', 'Em', 'C'] },
  { id: 'd-key', group: 'С чёрными клавишами', title: 'D → A → Bm → G', chords: ['D', 'A', 'Bm', 'G'] },
  { id: 'f-key', group: 'С чёрными клавишами', title: 'F → B♭ → C → F', chords: ['F', 'Bb', 'C', 'F'] },
  { id: 'jazz', group: 'С чёрными клавишами', title: 'Dm7 → G7 → Cmaj7', chords: ['Dm7', 'G7', 'Cmaj7'] },
];

export const findChangeSet = (id: string) => CHANGE_SETS.find((s) => s.id === id) ?? CHANGE_SETS[0];

/** The chords to cycle through: a set that ends where it starts (Am…Am) drops the repeat. */
export function changeChords(set: ChangeSet): Chord[] {
  const list = set.chords.length > 2 && set.chords[0] === set.chords[set.chords.length - 1] ? set.chords.slice(0, -1) : set.chords;
  return list.map(parseChord);
}

const pcsOf = (held: Iterable<number>) => new Set([...held].map((m) => ((m % 12) + 12) % 12));

/** Exactly this chord is sounding: all its notes, nothing else (octaves don't matter). */
export function holdsChord(held: Iterable<number>, chord: Chord): boolean {
  const have = pcsOf(held);
  const need = new Set(chordPcs(chord));
  if (have.size !== need.size) return false;
  for (const x of need) if (!have.has(x)) return false;
  return true;
}

/** Changes per minute → stars: ★ 20, ★★ 35, ★★★ 50 (scaled for half a minute). */
export function changeStars(count: number, seconds: number): number {
  const perMin = (count * 60) / seconds;
  return perMin >= 50 ? 3 : perMin >= 35 ? 2 : perMin >= 20 ? 1 : 0;
}
