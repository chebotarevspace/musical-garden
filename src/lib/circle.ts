/**
 * Circle of fifths: 12 major keys clockwise (each step = a fifth up = one more sharp / one fewer flat),
 * their relative minors, key signatures and diatonic chords.
 */
import { type Chord, type QualityId, type SpelledNote } from './chords';
import { type KeyOption, MAJOR_KEYS, MINOR_KEYS, scaleOf } from './progressions';

export interface CircleKey {
  major: KeyOption;
  minor: KeyOption;
  /** Positive = number of sharps, negative = number of flats. */
  accidentals: number;
}

const ACCIDENTALS = [0, 1, 2, 3, 4, 5, 6, -5, -4, -3, -2, -1];

/** Clockwise from C at the top. */
export const CIRCLE: CircleKey[] = MAJOR_KEYS.map((major, i) => ({ major, minor: MINOR_KEYS[i], accidentals: ACCIDENTALS[i] }));

export const findCircleKey = (majorId: string) => CIRCLE.find((k) => k.major.id === majorId) ?? CIRCLE[0];

/** Order in which sharps / flats appear in key signatures. */
export const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

export function signature(k: CircleKey): string[] {
  return k.accidentals >= 0
    ? SHARP_ORDER.slice(0, k.accidentals).map((l) => `${l}♯`)
    : FLAT_ORDER.slice(0, -k.accidentals).map((l) => `${l}♭`);
}

const MAJOR_QUALITIES: QualityId[] = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];
export const DIATONIC_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

/** The seven triads of a major key, I–vii°. */
export function diatonicChords(k: KeyOption): Chord[] {
  return scaleOf(k.tonic, false).map((root: SpelledNote, i) => ({ root, quality: MAJOR_QUALITIES[i], inversion: 0, bassRequired: false }));
}

/** Neighbours on the circle: IV (one step counter-clockwise) and V (one step clockwise). */
export function neighbours(majorId: string): { iv: CircleKey; v: CircleKey } {
  const i = CIRCLE.findIndex((k) => k.major.id === majorId);
  return { iv: CIRCLE[(i + 11) % 12], v: CIRCLE[(i + 1) % 12] };
}
