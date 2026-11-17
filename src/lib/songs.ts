/**
 * Song library for play-along (public-domain folk songs and traditional tunes only)
 * plus transposition and Roman-numeral analysis.
 *
 * A line is written as bars separated by "|": "C G7: words in this bar". Two chords
 * in one bar split it in half.
 */
import type { Slot } from './accompany';
import { type Chord, type QualityId, type SpelledNote, pcOf } from './chords';
import { parseChord } from './chordSymbols';
import { type Letter, codeToMidi, midiToCode } from './notes';
import { type KeyOption, MAJOR_KEYS, MINOR_KEYS, scaleOf } from './progressions';
import { type Chart, CHARTS } from './songCharts';

export interface SongBar {
  chords: string[];
  text: string;
}

export interface Song {
  id: string;
  title: string;
  origin: string;
  group: string;
  /** Original key id, e.g. "C", "G", "Am". */
  key: string;
  meter: 3 | 4;
  tempo: number;
  lines: SongBar[][];
  /** Melody notes per bar (codes like "E4", "R" = rest), one string per bar; absent when unknown. */
  melody?: string[];
  /** Note lengths in beats per bar, parallel to `melody`; without it the bar is split evenly. */
  rhythm?: string[];
  /** User-added song (stored locally). */
  custom?: boolean;
  /** Original pasted text and parse options, to edit it again. */
  source?: string;
  chordsPerBar?: 1 | 2;
}

function parseLine(line: string): SongBar[] {
  return line.split('|').map((bar) => {
    const i = bar.indexOf(':');
    const chords = bar.slice(0, i).trim().split(/\s+/);
    return { chords, text: bar.slice(i + 1).trim() };
  });
}

const song = (s: Omit<Song, 'lines' | 'melody'> & { lines: string[]; melody?: string[]; rhythm?: string[] }): Song => ({ ...s, lines: s.lines.map(parseLine) });

/** A chord chart → a song: four bars per line, the section label under its first bar. */
function fromChart(c: Chart): Song {
  const bars: SongBar[] = c.sections.flatMap((sec) =>
    sec.bars.split(/\s+/).map((chord, i) => ({ chords: [chord], text: sec.words?.[i] ?? (i === 0 ? sec.label : '') })),
  );
  const lines: SongBar[][] = [];
  for (const sec of c.sections) {
    const own = bars.splice(0, sec.bars.split(/\s+/).length);
    for (let i = 0; i < own.length; i += 4) lines.push(own.slice(i, i + 4));
  }
  return { id: c.id, title: c.title, origin: c.origin, group: c.group, key: c.key, meter: c.meter, tempo: c.tempo, lines, melody: c.melody, rhythm: c.rhythm };
}

const BASE_SONGS: Song[] = [
  song({
    id: 'saints',
    title: 'When the Saints Go Marching In',
    origin: 'американский спиричуэл',
    group: 'Три аккорда',
    key: 'C',
    meter: 4,
    tempo: 100,
    lines: [
      'C: Oh, when the saints | C: go marching | C: in, | C:',
      'C: Oh, when the saints | C: go marching | G7: in, | G7:',
      'C: Oh Lord, I | C7: want to be | F: in that | F: number,',
      'C: when the saints | G7: go marching | C: in! | C:',
    ],
    melody: [
      'C4 E4 F4 G4', 'C4 E4 F4', 'G4', '',
      'C4 E4 F4 G4', 'E4 C4 E4', 'D4', '',
      'E4 E4 D4', 'C4 C4 E4', 'G4 G4', 'F4',
      'E4 F4 G4', 'E4 C4 D4', 'C4', '',
    ],
    rhythm: [
      '1 1 1 1', '1 1 2', '4', '',
      '1 1 1 1', '1 2 1', '4', '',
      '1 1 2', '2 1 1', '2 2', '4',
      '1 1 2', '1 1 2', '4', '',
    ],
  }),
  song({
    id: 'susanna',
    title: 'Oh! Susanna',
    origin: 'Стивен Фостер, 1848',
    group: 'Три аккорда',
    key: 'C',
    meter: 4,
    tempo: 110,
    lines: [
      'C: I come from Al- | C: abama with my | C: banjo on my | G7: knee,',
      'C: I’m going to Lou- | C: isiana, my | C G7: true love for to | C: see.',
      'F: Oh, Su- | F: sanna, oh | C: don’t you cry for | G7: me,',
      'C: for I come from Al- | C: abama with my | C G7: banjo on my | C: knee.',
    ],
  }),
  song({
    id: 'twinkle',
    title: 'Twinkle, Twinkle, Little Star',
    origin: 'английская колыбельная, стихи Джейн Тейлор, 1806',
    group: 'Три аккорда',
    key: 'C',
    meter: 4,
    tempo: 90,
    lines: [
      'C: Twinkle, twinkle, | F C: little star, | G C: how I wonder | G C: what you are!',
      'C G: Up above the | C G: world so high, | C G: like a diamond | C G: in the sky.',
      'C: Twinkle, twinkle, | F C: little star, | G C: how I wonder | G C: what you are!',
    ],
    melody: [
      'C4 C4 G4 G4', 'A4 A4 G4', 'F4 F4 E4 E4', 'D4 D4 C4',
      'G4 G4 F4 F4', 'E4 E4 D4', 'G4 G4 F4 F4', 'E4 E4 D4',
      'C4 C4 G4 G4', 'A4 A4 G4', 'F4 F4 E4 E4', 'D4 D4 C4',
    ],
    rhythm: ['1 1 1 1', '1 1 2', '1 1 1 1', '1 1 2', '1 1 1 1', '1 1 2', '1 1 1 1', '1 1 2', '1 1 1 1', '1 1 2', '1 1 1 1', '1 1 2'],
  }),
  song({
    id: 'ode-to-joy',
    title: 'Ода к радости (без слов)',
    origin: 'Л. ван Бетховен, Девятая симфония',
    group: 'Без слов',
    key: 'C',
    meter: 4,
    tempo: 100,
    lines: ['C: | G: | C: | G:', 'C: | G: | C: | G C:'],
    melody: ['E4 E4 F4 G4', 'G4 F4 E4 D4', 'C4 C4 D4 E4', 'E4 D4 D4', 'E4 E4 F4 G4', 'G4 F4 E4 D4', 'C4 C4 D4 E4', 'D4 C4 C4'],
    rhythm: ['1 1 1 1', '1 1 1 1', '1 1 1 1', '1.5 0.5 2', '1 1 1 1', '1 1 1 1', '1 1 1 1', '1.5 0.5 2'],
  }),
  song({
    id: 'kalinka',
    title: 'Калинка (припев)',
    origin: 'русская песня, И. Ларионов, 1860',
    group: 'Три аккорда',
    key: 'C',
    meter: 4,
    tempo: 104,
    lines: [
      'C: Калинка, калинка, | G7: калинка моя! | G7: В саду ягода ма- | C: линка, малинка моя!',
      'C: Калинка, калинка, | G7: калинка моя! | G7: В саду ягода ма- | C: линка, малинка моя!',
    ],
  }),
  song({
    id: 'amazing-grace',
    title: 'Amazing Grace',
    origin: 'гимн, стихи Джона Ньютона, 1779',
    group: 'На три четверти',
    key: 'G',
    meter: 3,
    tempo: 84,
    lines: [
      'G: A-maz- | G: ing grace, how | C: sweet the | G: sound',
      'G: that saved a | G: wretch like | D: me. | D:',
      'G: I once was | G: lost, but | C: now am | G: found,',
      'G: was blind, but | D: now I | G: see. | G:',
    ],
    melody: [
      'D4 G4', 'B4 G4 B4 A4', 'G4 E4', 'D4',
      'D4 G4 B4 G4', 'B4 A4', 'D5', '',
      'B4 D5 B4', 'G4 D4', 'E4 G4', 'D4',
      'D4 G4 B4 G4', 'B4 A4', 'G4', '',
    ],
    rhythm: [
      '1 2', '0.5 0.5 1 1', '2 1', '3',
      '1 1 0.5 0.5', '2 1', '3', '',
      '1 1.5 0.5', '2 1', '2 1', '3',
      '1 1 0.5 0.5', '2 1', '3', '',
    ],
  }),
  song({
    id: 'rising-sun',
    title: 'House of the Rising Sun',
    origin: 'американская народная песня',
    group: 'Минор',
    key: 'Am',
    meter: 3,
    tempo: 120,
    lines: [
      'Am: There | C: is a | D: house in | F: New Or-',
      'Am: leans they | C: call the | E: Rising | E: Sun,',
      'Am: and it’s | C: been the | D: ruin of | F: many a poor',
      'Am: boy, and | E: God, I | Am: know I’m | E: one.',
    ],
  }),
  song({
    id: 'beryoza',
    title: 'Во поле берёза стояла',
    origin: 'русская народная песня',
    group: 'Минор',
    key: 'Am',
    meter: 4,
    tempo: 96,
    lines: [
      'Am: Во поле берёза сто- | Dm: яла, во поле куд- | Am: рявая сто- | E Am: яла.',
      'Am: Люли, люли, сто- | Dm: яла, люли, люли, | Am: стоя- | E Am: ла.',
    ],
  }),
  song({
    id: 'korobushka',
    title: 'Коробушка',
    origin: 'стихи Н. Некрасова, 1861; народная мелодия',
    group: 'Минор',
    key: 'Am',
    meter: 4,
    tempo: 100,
    lines: [
      'Am: Ой, полным-полна моя ко- | E7: робушка, есть и | E7: ситцы и пар- | Am: ча.',
      'Am: Пожалей, моя за- | Dm: знобушка, моло- | E7: децкого пле- | Am: ча!',
    ],
  }),
  song({
    id: 'yolochka',
    title: 'В лесу родилась ёлочка (мелодия)',
    origin: 'музыка Л. Бекмана, 1903 · без слов',
    group: 'Без слов',
    key: 'F',
    meter: 4,
    tempo: 120,
    lines: ['F: Запев | F: | F: | C:', 'Bb: | C7: | F C7: | F:'],
    melody: ['C4 A4 A4 G4', 'A4 F4 C4 C4', 'C4 A4 A4 A#4', 'G4 C5', 'C5 D5 D5 A#4', 'A#4 A4 G4 F4', 'F4 A4 A4 G4', 'A4 F4'],
    rhythm: ['1 1 1 1', '1 1 1 1', '1 1 1 1', '1 3', '1 1 1 1', '1 1 1 1', '1 1 1 1', '1 3'],
  }),
  song({
    id: 'blues-c',
    title: 'Блюз (без слов)',
    origin: 'традиционная 12-тактовая форма',
    group: 'Без слов',
    key: 'C',
    meter: 4,
    tempo: 92,
    lines: ['C7: | C7: | C7: | C7:', 'F7: | F7: | C7: | C7:', 'G7: | F7: | C7: | G7:'],
  }),
];

export const SONGS: Song[] = [...BASE_SONGS, ...CHARTS.map(fromChart)];

export const SONG_GROUPS = [...new Set(SONGS.map((s) => s.group))];
export const findSong = (id: string, extra: Song[] = []) => extra.find((s) => s.id === id) ?? SONGS.find((s) => s.id === id) ?? SONGS[0];

export const isMinorKey = (id: string) => id.endsWith('m');
export const keysFor = (song: Song): KeyOption[] => (isMinorKey(song.key) ? MINOR_KEYS : MAJOR_KEYS);
export const keyById = (id: string): KeyOption =>
  [...MAJOR_KEYS, ...MINOR_KEYS].find((k) => k.id === id) ?? MAJOR_KEYS[0];

const LETTERS: Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Moves a chord from one key to another keeping its scale degree (so spelling stays correct). */
export function transposeChord(chord: Chord, from: KeyOption, to: KeyOption): Chord {
  const shift = (n: SpelledNote): SpelledNote => {
    const deg = (LETTERS.indexOf(n.letter) - LETTERS.indexOf(from.tonic.letter) + 7) % 7;
    const semis = (pcOf(n) - pcOf(from.tonic) + 12) % 12;
    const letter = LETTERS[(LETTERS.indexOf(to.tonic.letter) + deg) % 7];
    const alter = ((((pcOf(to.tonic) + semis) % 12) - LETTER_PC[letter] + 18) % 12) - 6;
    return { letter, alter };
  };
  return { ...chord, root: shift(chord.root) };
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const MINORISH: QualityId[] = ['min', 'min7', 'm6', 'dim', 'm7b5', 'dim7'];
const NUM_SUFFIX: Partial<Record<QualityId, string>> = {
  dom7: '7', maj7: 'maj7', min7: '7', dim: '°', m7b5: 'ø7', dim7: '°7', aug: '+', six: '6', m6: '6', sus2: 'sus2', sus4: 'sus4', add9: 'add9',
};

/** Roman numeral of a chord in a key: "V7", "vi", "♭VII". */
export function chordNumeral(chord: Chord, key: KeyOption): string {
  const scale = scaleOf(key.tonic, key.minor);
  const deg = (LETTERS.indexOf(chord.root.letter) - LETTERS.indexOf(key.tonic.letter) + 7) % 7;
  const diff = chord.root.alter - scale[deg].alter;
  const roman = MINORISH.includes(chord.quality) ? ROMAN[deg].toLowerCase() : ROMAN[deg];
  return `${diff < 0 ? '♭' : diff > 0 ? '♯' : ''}${roman}${NUM_SUFFIX[chord.quality] ?? ''}`;
}

export interface MelodyNote {
  midi: number;
  code: string;
  bar: number;
  /** Start and length in beats from the song start. */
  beat: number;
  dur: number;
}

/** Note lengths of a bar: from `rhythm` when it fits, else evenly in the largest note value that fits. */
export function barDurations(count: number, meter: number, rhythm?: string): number[] {
  if (!count) return [];
  const given = rhythm?.split(/\s+/).filter(Boolean).map(Number);
  if (given && given.length === count && given.every((x) => x > 0)) return given;
  const unit = [4, 3, 2, 1, 0.5, 0.25].find((u) => u * count <= meter + 1e-6) ?? 0.25;
  const out = Array.from({ length: count }, () => unit);
  out[count - 1] += Math.max(0, meter - unit * count);
  return out;
}

/** The song's melody in time (untransposed): rests are skipped, but they take their time. */
export function melodyTimeline(s: Song): { code: string; bar: number; beat: number; dur: number }[] {
  const out: { code: string; bar: number; beat: number; dur: number }[] = [];
  (s.melody ?? []).forEach((barNotes, b) => {
    const codes = barNotes.split(/\s+/).filter(Boolean);
    const durs = barDurations(codes.length, s.meter, s.rhythm?.[b]);
    let at = b * s.meter;
    codes.forEach((code, i) => {
      if (code !== 'R' && codeToMidi(code) !== null) out.push({ code, bar: b, beat: at, dur: durs[i] });
      at += durs[i];
    });
  });
  return out;
}

export interface SongPlan {
  /** Melody notes (transposed), when the song has a melody. */
  melody: MelodyNote[];
  /** Chords per bar (transposed). */
  bars: { chords: Chord[]; text: string; line: number }[];
  /** Flat list of chord slots for the play-along engine. */
  slots: Slot[];
  /** Which bar each slot belongs to. */
  barOfSlot: number[];
}

export function planSong(s: Song, keyId: string): SongPlan {
  const from = keyById(s.key);
  const to = keyById(keyId);
  const bars: SongPlan['bars'] = [];
  const slots: Slot[] = [];
  const barOfSlot: number[] = [];
  s.lines.forEach((line, li) =>
    line.forEach((bar) => {
      const chords = bar.chords.map((c) => transposeChord(parseChord(c), from, to));
      const b = bars.length;
      bars.push({ chords, text: bar.text, line: li });
      chords.forEach((c) => {
        slots.push({ chord: c, beats: s.meter / chords.length });
        barOfSlot.push(b);
      });
    }),
  );
  // Melody: shift by the key change, spelled with flats in flat keys.
  const melody: MelodyNote[] = [];
  if (s.melody) {
    const base = (pcOf(to.tonic) - pcOf(from.tonic) + 12) % 12;
    const flat = to.tonic.alter < 0 || ['F', 'Dm', 'Gm', 'Cm', 'Fm'].includes(to.id);
    const timeline = melodyTimeline(s);
    const raw = timeline.map((n) => codeToMidi(n.code)!);
    // Choose the octave that keeps the melody on the treble staff (centred around A4).
    const centre = (raw.length ? (Math.min(...raw) + Math.max(...raw)) / 2 : 69);
    const shift = [base, base - 12].reduce((a, b) => (Math.abs(centre + b - 69) < Math.abs(centre + a - 69) ? b : a));
    for (const n of timeline) {
      const midi = codeToMidi(n.code)! + shift;
      melody.push({ midi, code: midiToCode(midi, flat ? 'flat' : 'sharp'), bar: n.bar, beat: n.beat, dur: n.dur });
    }
  }
  return { bars, slots, barOfSlot, melody };
}
