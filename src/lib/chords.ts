/**
 * Chord theory for the chord trainer: qualities, correct spelling of chord tones,
 * a graded curriculum of levels, and matching held keys against a chord.
 */
import { weightedPick } from './adaptive';
import type { Letter } from './notes';

export type QualityId =
  | 'maj' | 'min' | 'dim' | 'aug'
  | 'maj7' | 'dom7' | 'min7' | 'm7b5' | 'dim7'
  | 'sus2' | 'sus4' | 'add9' | 'six' | 'm6';

export interface Quality {
  id: QualityId;
  /** Symbol suffix after the root, e.g. "m7". `b` stands for ♭ (rendered as a glyph). */
  suffix: string;
  /** Semitones above the root. */
  intervals: number[];
  /** Letter steps above the root (for spelling): third = 2, fifth = 4… */
  letters: number[];
  degrees: string[];
  name: string;
}

export const QUALITIES: Record<QualityId, Quality> = {
  maj: { id: 'maj', suffix: '', intervals: [0, 4, 7], letters: [0, 2, 4], degrees: ['1', '3', '5'], name: 'мажор' },
  min: { id: 'min', suffix: 'm', intervals: [0, 3, 7], letters: [0, 2, 4], degrees: ['1', '♭3', '5'], name: 'минор' },
  dim: { id: 'dim', suffix: 'dim', intervals: [0, 3, 6], letters: [0, 2, 4], degrees: ['1', '♭3', '♭5'], name: 'уменьшённое трезвучие' },
  aug: { id: 'aug', suffix: 'aug', intervals: [0, 4, 8], letters: [0, 2, 4], degrees: ['1', '3', '♯5'], name: 'увеличенное трезвучие' },
  maj7: { id: 'maj7', suffix: 'maj7', intervals: [0, 4, 7, 11], letters: [0, 2, 4, 6], degrees: ['1', '3', '5', '7'], name: 'большой мажорный септаккорд' },
  dom7: { id: 'dom7', suffix: '7', intervals: [0, 4, 7, 10], letters: [0, 2, 4, 6], degrees: ['1', '3', '5', '♭7'], name: 'доминантсептаккорд' },
  min7: { id: 'min7', suffix: 'm7', intervals: [0, 3, 7, 10], letters: [0, 2, 4, 6], degrees: ['1', '♭3', '5', '♭7'], name: 'малый минорный септаккорд' },
  m7b5: { id: 'm7b5', suffix: 'm7b5', intervals: [0, 3, 6, 10], letters: [0, 2, 4, 6], degrees: ['1', '♭3', '♭5', '♭7'], name: 'полууменьшённый септаккорд' },
  dim7: { id: 'dim7', suffix: 'dim7', intervals: [0, 3, 6, 9], letters: [0, 2, 4, 6], degrees: ['1', '♭3', '♭5', '𝄫7'], name: 'уменьшённый септаккорд' },
  sus2: { id: 'sus2', suffix: 'sus2', intervals: [0, 2, 7], letters: [0, 1, 4], degrees: ['1', '2', '5'], name: 'sus2 (секунда вместо терции)' },
  sus4: { id: 'sus4', suffix: 'sus4', intervals: [0, 5, 7], letters: [0, 3, 4], degrees: ['1', '4', '5'], name: 'sus4 (кварта вместо терции)' },
  add9: { id: 'add9', suffix: 'add9', intervals: [0, 4, 7, 14], letters: [0, 2, 4, 1], degrees: ['1', '3', '5', '9'], name: 'мажор с добавленной ноной' },
  six: { id: 'six', suffix: '6', intervals: [0, 4, 7, 9], letters: [0, 2, 4, 5], degrees: ['1', '3', '5', '6'], name: 'мажор с секстой' },
  m6: { id: 'm6', suffix: 'm6', intervals: [0, 3, 7, 9], letters: [0, 2, 4, 5], degrees: ['1', '♭3', '5', '6'], name: 'минор с секстой' },
};

export interface SpelledNote {
  letter: Letter;
  /** −2 … +2 */
  alter: number;
}

const LETTERS: Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const RU_LETTER: Record<Letter, string> = { C: 'До', D: 'Ре', E: 'Ми', F: 'Фа', G: 'Соль', A: 'Ля', B: 'Си' };

const sp = (code: string): SpelledNote => ({
  letter: code[0] as Letter,
  alter: code.length > 1 ? (code[1] === '#' ? 1 : -1) : 0,
});

export const pcOf = (n: SpelledNote) => (LETTER_PC[n.letter] + n.alter + 12) % 12;

export const ROOTS = {
  cfg: ['C', 'F', 'G'].map(sp),
  adem: ['A', 'D', 'E'].map(sp),
  white: ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(sp),
  /** Spellings musicians actually use for major-type chords. */
  allMajor: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map(sp),
  /** …and for minor-type chords. */
  allMinor: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'].map(sp),
};

const MINORISH: QualityId[] = ['min', 'min7', 'm7b5', 'dim', 'dim7', 'm6'];

export interface ChordLevel {
  id: string;
  group: string;
  title: string;
  hint: string;
  qualities: QualityId[];
  roots: 'cfg' | 'adem' | 'white' | 'all';
  inversions: boolean;
}

export const LEVELS: ChordLevel[] = [
  { id: 'maj-cfg', group: 'Трезвучия', title: 'Мажор: C, F, G', hint: 'Три главных аккорда. Мажор = 4 + 3 полутона.', qualities: ['maj'], roots: 'cfg', inversions: false },
  { id: 'maj-white', group: 'Трезвучия', title: 'Мажор от белых клавиш', hint: 'Все мажорные трезвучия от белых клавиш.', qualities: ['maj'], roots: 'white', inversions: false },
  { id: 'min-adem', group: 'Трезвучия', title: 'Минор: Am, Dm, Em', hint: 'Минор = 3 + 4 полутона: терция ниже на полутон.', qualities: ['min'], roots: 'adem', inversions: false },
  { id: 'min-white', group: 'Трезвучия', title: 'Минор от белых клавиш', hint: 'Все минорные трезвучия от белых клавиш.', qualities: ['min'], roots: 'white', inversions: false },
  { id: 'majmin-all', group: 'Трезвучия', title: 'Мажор и минор во всех тональностях', hint: 'Все 24 трезвучия, включая аккорды от чёрных клавиш.', qualities: ['maj', 'min'], roots: 'all', inversions: false },
  { id: 'dim-aug', group: 'Трезвучия', title: 'Уменьшённые и увеличенные', hint: 'dim = 3 + 3, aug = 4 + 4 полутона.', qualities: ['dim', 'aug'], roots: 'white', inversions: false },
  { id: 'inv-maj', group: 'Обращения', title: 'Обращения мажорных', hint: 'Нижняя нота (бас) важна: основной вид, первое и второе обращение.', qualities: ['maj'], roots: 'white', inversions: true },
  { id: 'inv-min', group: 'Обращения', title: 'Обращения минорных', hint: 'То же для минора: следите за нижней нотой.', qualities: ['min'], roots: 'white', inversions: true },
  { id: 'inv-majmin', group: 'Обращения', title: 'Обращения: мажор и минор', hint: 'Смешанные обращения во всех тональностях.', qualities: ['maj', 'min'], roots: 'all', inversions: true },
  { id: 'maj7', group: 'Септаккорды', title: 'Большой мажорный (maj7)', hint: 'Мажор + большая септима (на полутон ниже октавы).', qualities: ['maj7'], roots: 'white', inversions: false },
  { id: 'dom7', group: 'Септаккорды', title: 'Доминантсептаккорд (7)', hint: 'Мажор + малая септима (на тон ниже октавы).', qualities: ['dom7'], roots: 'white', inversions: false },
  { id: 'min7', group: 'Септаккорды', title: 'Малый минорный (m7)', hint: 'Минор + малая септима.', qualities: ['min7'], roots: 'white', inversions: false },
  { id: 'half-dim', group: 'Септаккорды', title: 'm7♭5 и dim7', hint: 'Полууменьшённый и уменьшённый: терции 3 + 3 + 4 и 3 + 3 + 3.', qualities: ['m7b5', 'dim7'], roots: 'white', inversions: false },
  { id: 'sevenths-all', group: 'Септаккорды', title: 'Все септаккорды', hint: 'maj7, 7, m7 во всех тональностях.', qualities: ['maj7', 'dom7', 'min7'], roots: 'all', inversions: false },
  { id: 'sus', group: 'Красочные', title: 'sus2 и sus4', hint: 'Вместо терции — секунда или кварта: звучит «подвешенно».', qualities: ['sus2', 'sus4'], roots: 'white', inversions: false },
  { id: 'add', group: 'Красочные', title: 'add9, 6 и m6', hint: 'Добавленные ступени: нона (= секунда) или секста.', qualities: ['add9', 'six', 'm6'], roots: 'white', inversions: false },
];

export const LEVEL_GROUPS = [...new Set(LEVELS.map((l) => l.group))];
export const findLevel = (id: string) => LEVELS.find((l) => l.id === id) ?? LEVELS[0];
/** Correct chords needed to complete a level. */
export const LEVEL_GOAL = 10;

export interface Chord {
  root: SpelledNote;
  quality: QualityId;
  /** 0 = root position, 1 = first inversion … */
  inversion: number;
  /** Bass must be the inverted tone (inversion levels only). */
  bassRequired: boolean;
}

export function chordTones(chord: Chord): SpelledNote[] {
  const q = QUALITIES[chord.quality];
  const rootLetter = LETTERS.indexOf(chord.root.letter);
  const rootPc = pcOf(chord.root);
  return q.intervals.map((iv, i) => {
    const letter = LETTERS[(rootLetter + q.letters[i]) % 7];
    const target = (rootPc + iv) % 12;
    const alter = ((target - LETTER_PC[letter] + 18) % 12) - 6;
    return { letter, alter };
  });
}

export const chordPcs = (chord: Chord) => chordTones(chord).map(pcOf);

export const bassTone = (chord: Chord) => chordTones(chord)[chord.inversion];

export function noteText(n: SpelledNote): string {
  const acc = n.alter === 2 ? '𝄪' : n.alter === 1 ? '♯' : n.alter === -1 ? '♭' : n.alter === -2 ? '𝄫' : '';
  return n.letter + acc;
}

export function chordSymbol(chord: Chord): string {
  const base = noteText(chord.root) + QUALITIES[chord.quality].suffix.replace('b', '♭');
  return chord.inversion > 0 ? `${base}/${noteText(bassTone(chord))}` : base;
}

export function ruNoteName(n: SpelledNote): string {
  const acc = n.alter === 1 ? '-диез' : n.alter === -1 ? '-бемоль' : n.alter === 2 ? '-дубль-диез' : n.alter === -2 ? '-дубль-бемоль' : '';
  return RU_LETTER[n.letter] + acc;
}

export const INVERSION_NAMES = ['основной вид', 'первое обращение', 'второе обращение', 'третье обращение'];

export function chordRuName(chord: Chord): string {
  return `${ruNoteName(chord.root)} ${QUALITIES[chord.quality].name}`;
}

/** Semitone gaps between stacked tones, e.g. "4 + 3". */
export function chordFormula(q: QualityId): string {
  const iv = QUALITIES[q].intervals.slice().sort((a, b) => a - b);
  return iv.slice(1).map((x, i) => x - iv[i]).join(' + ');
}

function rootsFor(level: ChordLevel, quality: QualityId): SpelledNote[] {
  if (level.roots === 'all') return MINORISH.includes(quality) ? ROOTS.allMinor : ROOTS.allMajor;
  return ROOTS[level.roots];
}

const sameChord = (a: Chord | null, b: Chord) =>
  !!a && a.quality === b.quality && pcOf(a.root) === pcOf(b.root) && a.inversion === b.inversion;

export function pickChord(level: ChordLevel, prev: Chord | null, rng: () => number = Math.random): Chord {
  const pick = <T,>(list: T[]) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  for (let attempt = 0; attempt < 20; attempt++) {
    const quality = pick(level.qualities);
    // Adaptive: roots you miss more often in this quality come up more often.
    const root = weightedPick(rootsFor(level, quality), (r) => `chord:${chordSymbol({ root: r, quality, inversion: 0, bassRequired: false })}`, rng);
    const inversion = level.inversions ? Math.floor(rng() * QUALITIES[quality].intervals.length) : 0;
    const chord: Chord = { root, quality, inversion, bassRequired: level.inversions };
    if (!sameChord(prev, chord)) return chord;
  }
  return { root: ROOTS.white[0], quality: level.qualities[0], inversion: 0, bassRequired: level.inversions };
}

export interface ChordMatch {
  /** Held keys whose pitch class is not in the chord. */
  wrong: number[];
  complete: boolean;
  /** All tones present but the wrong note is in the bass. */
  wrongBass: boolean;
}

export function matchChord(chord: Chord, held: number[]): ChordMatch {
  const pcs = new Set(chordPcs(chord));
  const wrong = held.filter((m) => !pcs.has(((m % 12) + 12) % 12));
  const heldPcs = new Set(held.map((m) => ((m % 12) + 12) % 12));
  const allPresent = [...pcs].every((pc) => heldPcs.has(pc));
  let bassOk = true;
  if (chord.bassRequired && held.length > 0) {
    const lowest = Math.min(...held);
    bassOk = ((lowest % 12) + 12) % 12 === pcOf(bassTone(chord));
  }
  return { wrong, complete: wrong.length === 0 && allPresent && bassOk, wrongBass: wrong.length === 0 && allPresent && !bassOk };
}

/** A comfortable demo voicing around middle C, bass first. */
export function chordVoicing(chord: Chord): number[] {
  const tones = chordTones(chord).map(pcOf);
  const ordered = [...tones.slice(chord.inversion), ...tones.slice(0, chord.inversion)];
  const bass = ordered[0];
  let current = (bass >= 5 ? 48 : 60) + bass;
  const out = [current];
  for (const pc of ordered.slice(1)) {
    let m = current + ((pc - (current % 12) + 12) % 12 || 12);
    if (m <= current) m += 12;
    out.push(m);
    current = m;
  }
  return out;
}

export function degreeForMidi(chord: Chord, midi: number): string | null {
  const pcs = chordPcs(chord);
  const i = pcs.indexOf(((midi % 12) + 12) % 12);
  return i >= 0 ? QUALITIES[chord.quality].degrees[i] : null;
}

