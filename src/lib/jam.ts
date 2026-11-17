/** «Джем»: grooves to improvise over — a looping accompaniment plus the notes that sound good. */
import { type Chord, chordPcs, pcOf } from './chords';
import { MAJOR_KEYS, MINOR_KEYS, type KeyOption, parseNumeral, progressionChords, voiceLead } from './progressions';

export interface Groove {
  id: string;
  title: string;
  hint: string;
  minor: boolean;
  numerals: string;
  /** Beats per chord. */
  beats: number;
  meter: 3 | 4;
  pattern: string;
  /** Scale to improvise with, in semitones from the tonic. */
  scale: number[];
  scaleName: string;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_PENT = [0, 2, 4, 7, 9];
const MINOR_PENT = [0, 3, 5, 7, 10];
const BLUES = [0, 3, 5, 6, 7, 10];

export const GROOVES: Groove[] = [
  {
    id: 'blues',
    title: 'Блюз',
    hint: '12 тактов блюза. Играйте блюзовую гамму — любая нота из неё звучит «по-блюзовому».',
    minor: false,
    numerals: 'I7 I7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7',
    beats: 4,
    meter: 4,
    pattern: 'quarters',
    scale: BLUES,
    scaleName: 'блюзовая гамма',
  },
  {
    id: 'pop',
    title: 'Поп',
    hint: 'I–V–vi–IV. Мажорная пентатоника — пять нот, которые всегда звучат.',
    minor: false,
    numerals: 'I V vi IV',
    beats: 4,
    meter: 4,
    pattern: 'broken',
    scale: MAJOR_PENT,
    scaleName: 'мажорная пентатоника',
  },
  {
    id: 'epic',
    title: 'Эпичный минор',
    hint: 'i–VI–III–VII. Минорная пентатоника: грустно, но мощно.',
    minor: true,
    numerals: 'i VI III VII',
    beats: 4,
    meter: 4,
    pattern: 'ballad',
    scale: MINOR_PENT,
    scaleName: 'минорная пентатоника',
  },
  {
    id: 'dream',
    title: 'Мечтательный',
    hint: 'Imaj7–IVmaj7 — мягкое покачивание. Все белые ноты мажора звучат.',
    minor: false,
    numerals: 'Imaj7 IVmaj7',
    beats: 8,
    meter: 4,
    pattern: 'arpeggio',
    scale: MAJOR,
    scaleName: 'мажорная гамма',
  },
  {
    id: 'waltz',
    title: 'Вальс',
    hint: 'Раз-два-три: I–IV–V–I на три четверти.',
    minor: false,
    numerals: 'I IV V I',
    beats: 6,
    meter: 3,
    pattern: 'waltz',
    scale: MAJOR,
    scaleName: 'мажорная гамма',
  },
];

export const findGroove = (id: string) => GROOVES.find((g) => g.id === id) ?? GROOVES[0];

export const jamKeys = (g: Groove): KeyOption[] => (g.minor ? MINOR_KEYS : MAJOR_KEYS);
export const findJamKey = (g: Groove, id: string) => jamKeys(g).find((k) => k.id === id) ?? jamKeys(g)[0];

export interface JamPlan {
  chords: Chord[];
  voicings: number[][];
  scalePcs: Set<number>;
}

export function planJam(g: Groove, k: KeyOption): JamPlan {
  const chords = progressionChords(
    { id: g.id, group: '', title: g.title, minor: g.minor, description: '', chords: g.numerals.split(' ').map(parseNumeral) },
    k,
  );
  // Backing an octave lower than usual: the right hand is free for the melody.
  const voicings = voiceLead(chords).map((v) => v.map((m) => m - 12));
  const tonic = pcOf(k.tonic);
  return { chords, voicings, scalePcs: new Set(g.scale.map((s) => (tonic + s) % 12)) };
}

export type NoteColour = 'chord' | 'scale' | 'spice';

/** How a played note fits: a chord tone, in the scale, or a bold "spice" note — never "wrong". */
export function colourOf(midi: number, chord: Chord, scalePcs: Set<number>): NoteColour {
  const pc = ((midi % 12) + 12) % 12;
  if (chordPcs(chord).map((x) => x % 12).includes(pc)) return 'chord';
  return scalePcs.has(pc) ? 'scale' : 'spice';
}

/* ================================================================== */
/* Harmony from anywhere: a groove, a song from the library, a progression */
/* ================================================================== */

export interface JamHarmony {
  title: string;
  chords: Chord[];
  /** Beats of each chord. */
  beats: number[];
  voicings: number[][];
  scalePcs: Set<number>;
  /** Five-note scale for «Пентатоника» tasks and the call phrases. */
  pentaPcs: Set<number>;
  tonicPc: number;
  minor: boolean;
  meter: 3 | 4;
  pattern: string;
  /** Default drum style id. */
  drums: string;
  blues: boolean;
  /** Key and the highlighted scale's name — for degrees and the «what is lit» line. */
  key: KeyOption;
  scaleName: string;
}

const pcsFrom = (tonic: number, steps: number[]) => new Set(steps.map((s) => (tonic + s) % 12));
const lowered = (chords: Chord[]) => voiceLead(chords).map((v) => v.map((m) => m - 12));

export function harmonyFromGroove(g: Groove, k: KeyOption): JamHarmony {
  const plan = planJam(g, k);
  const tonic = pcOf(k.tonic);
  return {
    title: g.title,
    chords: plan.chords,
    beats: plan.chords.map(() => g.beats),
    voicings: plan.voicings,
    scalePcs: plan.scalePcs,
    pentaPcs: pcsFrom(tonic, g.minor || g.id === 'blues' ? MINOR_PENT : MAJOR_PENT),
    tonicPc: tonic,
    minor: g.minor,
    meter: g.meter,
    pattern: g.pattern,
    drums: g.id === 'blues' ? 'shuffle' : g.id === 'dream' ? 'lofi' : g.id === 'waltz' ? 'waltz' : g.id === 'epic' ? 'rock' : 'pop',
    blues: g.id === 'blues',
    key: k,
    scaleName: g.scaleName,
  };
}

/** Chord slots of any song (its own key) or progression, with the key's scale. */
export function harmonyFromChords(title: string, slots: { chord: Chord; beats: number }[], k: KeyOption, meter: 3 | 4, blues = false): JamHarmony {
  const tonic = pcOf(k.tonic);
  const minor = k.minor;
  return {
    title,
    chords: slots.map((s) => s.chord),
    beats: slots.map((s) => s.beats),
    voicings: lowered(slots.map((s) => s.chord)),
    scalePcs: pcsFrom(tonic, blues ? BLUES : minor ? [0, 2, 3, 5, 7, 8, 10] : MAJOR),
    pentaPcs: pcsFrom(tonic, minor || blues ? MINOR_PENT : MAJOR_PENT),
    tonicPc: tonic,
    minor,
    meter,
    pattern: meter === 3 ? 'waltz' : 'quarters',
    drums: meter === 3 ? 'waltz' : blues ? 'shuffle' : 'pop',
    blues,
    key: k,
    scaleName: blues ? 'блюзовая гамма' : minor ? 'натуральный минор' : 'мажорная гамма',
  };
}

export const cycleBeats = (h: JamHarmony) => h.beats.reduce((a, b) => a + b, 0);

/** Which chord sounds at a beat of the cycle. */
export function chordIndexAt(h: JamHarmony, beatInCycle: number): number {
  let acc = 0;
  for (let i = 0; i < h.beats.length; i++) {
    acc += h.beats[i];
    if (beatInCycle < acc - 1e-6) return i;
  }
  return h.beats.length - 1;
}

/** Cycle beat where chord i starts. */
export const chordStart = (h: JamHarmony, i: number) => h.beats.slice(0, i).reduce((a, b) => a + b, 0);

/* ---------------- «Вопрос — ответ» ---------------- */

export interface CallNote {
  midi: number;
  /** Beats from the bar start. */
  at: number;
  dur: number;
}

const RHYTHMS: Record<3 | 4, number[][]> = {
  4: [
    [0, 1, 2],
    [0, 0.5, 1, 2],
    [0, 1, 1.5, 2, 3],
    [0, 0.5, 1, 1.5, 2],
    [0, 2, 2.5, 3],
    [0, 1, 2, 2.5, 3],
  ],
  3: [
    [0, 1, 2],
    [0, 0.5, 1, 2],
    [0, 1, 1.5],
  ],
};

/** A short phrase in the key's pentatonic that ends on a chord tone — the gardener's «question». */
export function makeCall(h: JamHarmony, chord: Chord, rng: () => number = Math.random): CallNote[] {
  const rhythm = RHYTHMS[h.meter][Math.floor(rng() * RHYTHMS[h.meter].length)];
  const pool: number[] = [];
  for (let m = 64; m <= 79; m++) if (h.pentaPcs.has(m % 12)) pool.push(m);
  let i = Math.floor(pool.length / 2 + (rng() - 0.5) * 3);
  const chordSet = new Set(chordPcs(chord).map((x) => x % 12));
  const out: CallNote[] = rhythm.map((at, k) => {
    if (k > 0) i = Math.max(0, Math.min(pool.length - 1, i + (rng() < 0.5 ? -1 : 1) * (1 + Math.floor(rng() * 2))));
    const next = rhythm[k + 1] ?? h.meter;
    return { midi: pool[i], at, dur: Math.min(1, next - at) };
  });
  // End on the nearest chord tone: the phrase sounds finished.
  const last = out[out.length - 1];
  let best = last.midi;
  for (let d = 0; d <= 6; d++) {
    if (chordSet.has((last.midi + d) % 12)) {
      best = last.midi + d;
      break;
    }
    if (chordSet.has((last.midi - d + 12) % 12)) {
      best = last.midi - d;
      break;
    }
  }
  last.midi = best;
  return out;
}

export interface AnswerScore {
  stars: number;
  rhythm: number;
  inScale: number;
  endsOnChord: boolean;
  text: string;
}

/** How well an answer echoes the call: rhythm, staying in the scale, landing on a chord tone. */
export function scoreAnswer(call: CallNote[], answer: { midi: number; at: number }[], chord: Chord, scalePcs: Set<number>): AnswerScore {
  if (answer.length < 2) return { stars: 0, rhythm: 0, inScale: 0, endsOnChord: false, text: answer.length ? 'Ответ короче вопроса — сыграйте фразу подлиннее.' : 'Ваша очередь — ответьте Доминику!' };
  const matched = call.filter((c) => answer.some((a) => Math.abs(a.at - c.at) <= 0.3)).length;
  const rhythm = matched / call.length;
  const inScale = answer.filter((a) => scalePcs.has(((a.midi % 12) + 12) % 12)).length / answer.length;
  const pcs = new Set(chordPcs(chord).map((x) => x % 12));
  const endsOnChord = pcs.has(((answer[answer.length - 1].midi % 12) + 12) % 12);
  const stars = (rhythm >= 0.6 ? 1 : 0) + (inScale >= 0.8 ? 1 : 0) + (endsOnChord ? 1 : 0);
  const text =
    stars === 3
      ? 'Отличный ответ: в ритм, в гамму и точка на ноте аккорда!'
      : rhythm < 0.6
        ? 'Попробуйте повторить ритм вопроса — те же доли, свои ноты.'
        : inScale < 0.8
          ? 'Ритм похож! Теперь держитесь подсвеченных нот гаммы.'
          : 'Почти! Закончите фразу на ноте аккорда — она звучит как точка.';
  return { stars, rhythm, inScale, endsOnChord, text };
}

/* ---------------- names for the chart ---------------- */

const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

/** Notes of a set of pitch classes, starting from the tonic, spelled the way the key prefers. */
export function scaleNoteNames(h: JamHarmony, pcs: Set<number>): string[] {
  const flats = h.blues || h.minor || h.key.tonic.alter < 0 || h.key.tonic.letter === 'F';
  return [...pcs]
    .map((pc) => (pc - h.tonicPc + 12) % 12)
    .sort((a, b) => a - b)
    .map((step) => {
      const pc = (h.tonicPc + step) % 12;
      // The blue note reads best as a raised fourth (F♯ in C).
      if (h.blues && step === 6) return SHARP_NAMES[pc];
      return (flats ? FLAT_NAMES : SHARP_NAMES)[pc];
    });
}

/** Free-mode ideas: one per loop, so there is always something to try. */
export const JAM_IDEAS = [
  'Сыграйте фразу из трёх нот — и помолчите целый такт.',
  'Повторите один и тот же мотив на каждом аккорде.',
  'Начинайте каждую фразу с ноты аккорда — она подсвечена ярче.',
  'Играйте только на сильные доли: «раз» и «три».',
  'Двигайтесь только соседними нотами — вверх и вниз, как по лестнице.',
  'Сыграйте одну долгую ноту, а потом быструю пробежку.',
  'Отвечайте сами себе: фраза-вопрос высоко, фраза-ответ ниже.',
  'Используйте только две ноты, но меняйте ритм.',
  'Закончите круг на тонике — «дома».',
  'Сыграйте мелодию, которую можно напеть, а не просто набор нот.',
];
