/**
 * MIDI ↔ note-code conversions.
 * Scientific pitch notation: C4 = MIDI 60, A0 = 21, C8 = 108.
 * `octaveOffset` shifts displayed octaves (Yamaha convention "middle C = C3" → offset −1).
 */
import { weightedPick } from './adaptive';

export type Mode = 'naturals' | 'accidentals';
export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Accidental = 'natural' | 'sharp' | 'flat';
export type Spelling = 'sharp' | 'flat';

export interface NoteName {
  midi: number;
  letter: Letter;
  accidental: Accidental;
  octave: number;
}

export interface OctaveRange {
  from: number;
  to: number;
}

/** A note to find. `spelling` is set only for black keys. */
export interface Target {
  midi: number;
  spelling: Spelling | null;
}

export const MIDI_MIN = 21; // A0
export const MIDI_MAX = 108; // C8
export const OCTAVE_MIN = 0;
export const OCTAVE_MAX = 8;
export const MIDDLE_C = 60;

export const ACCIDENTAL_SYMBOL: Record<Accidental, string> = {
  natural: '',
  sharp: '♯',
  flat: '♭',
};

const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const SHARP_NAMES: ReadonlyArray<readonly [Letter, Accidental]> = [
  ['C', 'natural'], ['C', 'sharp'], ['D', 'natural'], ['D', 'sharp'], ['E', 'natural'], ['F', 'natural'],
  ['F', 'sharp'], ['G', 'natural'], ['G', 'sharp'], ['A', 'natural'], ['A', 'sharp'], ['B', 'natural'],
];

// Flats only on black keys: no C♭ / F♭, so the octave number is always the key's own octave.
const FLAT_NAMES: ReadonlyArray<readonly [Letter, Accidental]> = [
  ['C', 'natural'], ['D', 'flat'], ['D', 'natural'], ['E', 'flat'], ['E', 'natural'], ['F', 'natural'],
  ['G', 'flat'], ['G', 'natural'], ['A', 'flat'], ['A', 'natural'], ['B', 'flat'], ['B', 'natural'],
];

const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

export const pitchClass = (midi: number): number => ((midi % 12) + 12) % 12;
export const isBlack = (midi: number): boolean => BLACK_PCS.has(pitchClass(midi));
export const isWhite = (midi: number): boolean => !isBlack(midi);
export const scientificOctave = (midi: number): number => Math.floor(midi / 12) - 1;
export const isOnPiano = (midi: number): boolean => midi >= MIDI_MIN && midi <= MIDI_MAX;

export function midiToNote(midi: number, spelling: Spelling = 'sharp', octaveOffset = 0): NoteName {
  const [letter, accidental] = (spelling === 'flat' ? FLAT_NAMES : SHARP_NAMES)[pitchClass(midi)];
  return { midi, letter, accidental, octave: scientificOctave(midi) + octaveOffset };
}

export function formatNote(note: NoteName): string {
  return `${note.letter}${ACCIDENTAL_SYMBOL[note.accidental]}${note.octave}`;
}

export function midiToCode(midi: number, spelling: Spelling = 'sharp', octaveOffset = 0): string {
  return formatNote(midiToNote(midi, spelling, octaveOffset));
}

const CODE_RE = /^([A-Ga-g])(♯|#|♭|b)?(-?\d{1,2})$/;

/** Parses "C4", "F♯5", "Bb2", "D#3" → MIDI number. Returns null on bad input. */
export function codeToMidi(code: string, octaveOffset = 0): number | null {
  const match = CODE_RE.exec(code.replace(/\s+/g, '').replace('−', '-'));
  if (!match) return null;
  const letter = match[1].toUpperCase() as Letter;
  const sign = match[2];
  const alter = sign === '♯' || sign === '#' ? 1 : sign ? -1 : 0;
  const octave = Number(match[3]) - octaveOffset;
  return (octave + 1) * 12 + LETTER_PC[letter] + alter;
}

export function targetToNote(target: Target, octaveOffset = 0): NoteName {
  return midiToNote(target.midi, target.spelling ?? 'sharp', octaveOffset);
}

const clampOctave = (n: number) => Math.min(OCTAVE_MAX, Math.max(OCTAVE_MIN, Math.round(n)));

export function normalizeRange(range: OctaveRange): OctaveRange {
  const a = clampOctave(range.from);
  const b = clampOctave(range.to);
  return { from: Math.min(a, b), to: Math.max(a, b) };
}

/** Inclusive MIDI bounds of an octave range, clipped to the physical piano. */
export function rangeToMidiBounds(range: OctaveRange): [number, number] {
  const { from, to } = normalizeRange(range);
  return [Math.max(MIDI_MIN, (from + 1) * 12), Math.min(MIDI_MAX, (to + 1) * 12 + 11)];
}

export function candidatesInBounds(lo: number, hi: number, mode: Mode): number[] {
  const result: number[] = [];
  for (let m = Math.max(MIDI_MIN, lo); m <= Math.min(MIDI_MAX, hi); m++) {
    if (mode === 'accidentals' || isWhite(m)) result.push(m);
  }
  return result;
}

export function candidateMidis(range: OctaveRange, mode: Mode): number[] {
  const [lo, hi] = rangeToMidiBounds(range);
  return candidatesInBounds(lo, hi, mode);
}

/**
 * Picks a random target within MIDI bounds and mode, never repeating `previousMidi`
 * unless it is the only candidate. Black keys get a random ♯/♭ spelling.
 */
export function pickTargetInBounds(
  bounds: [number, number],
  mode: Mode,
  previousMidi: number | null = null,
  rng: () => number = Math.random,
): Target {
  let pool = candidatesInBounds(bounds[0], bounds[1], mode);
  if (pool.length === 0) pool = candidatesInBounds(MIDI_MIN, MIDI_MAX, mode);
  if (pool.length > 1 && previousMidi !== null) pool = pool.filter((m) => m !== previousMidi);
  const midi = weightedPick(pool, (m) => [`note:code:${m}`, `note:staff:${m}`], rng);
  const spelling: Spelling | null = isBlack(midi) ? (rng() < 0.5 ? 'sharp' : 'flat') : null;
  return { midi, spelling };
}

/** Same as pickTargetInBounds, for an octave range. */
export function pickTarget(
  range: OctaveRange,
  mode: Mode,
  previousMidi: number | null = null,
  rng: () => number = Math.random,
): Target {
  return pickTargetInBounds(rangeToMidiBounds(range), mode, previousMidi, rng);
}
