import { MIDI_MAX, MIDI_MIN, type OctaveRange, isBlack, isWhite, normalizeRange, pitchClass } from './notes';

export interface KeyGeometry {
  midi: number;
  black: boolean;
  /** Left edge, % of the row width. */
  left: number;
  /** Width, % of the row width. */
  width: number;
}

/** One horizontal strip of keys. */
export interface KeyRow {
  lo: number;
  hi: number;
  /** Row width measured in white keys (may exceed the keys present, e.g. a short last octave). */
  slots: number;
  /** Empty white-key slots before the first key (keeps octaves aligned across rows). */
  offset: number;
}

export const WHITE_KEY_COUNT = 52;
export const BLACK_WIDTH_RATIO = 0.58; // real piano: ~13.7 mm vs 23.5 mm
export const BLACK_HEIGHT_RATIO = 0.63;

/**
 * Offset of a black key's centre from the boundary between the two white keys
 * it sits between, in white-key widths. Mirrors a real keyboard: the C–E group
 * splits into 5 equal lanes, the F–B group into 7, so C♯/F♯ lean left and D♯/A♯ lean right.
 */
const BLACK_CENTER_OFFSET: Record<number, number> = {
  1: -0.1, // C♯
  3: 0.1, // D♯
  6: -1 / 7, // F♯
  8: 0, // G♯
  10: 1 / 7, // A♯
};

const WHITE_INDEX_IN_OCTAVE: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };

export function countWhite(lo: number, hi: number): number {
  let n = 0;
  for (let m = lo; m <= hi; m++) if (isWhite(m)) n++;
  return n;
}

export function buildKeyboardLayout(row: KeyRow = FULL_ROW): KeyGeometry[] {
  const whiteWidth = 100 / row.slots;
  const blackWidth = whiteWidth * BLACK_WIDTH_RATIO;
  const keys: KeyGeometry[] = [];
  let whiteIndex = row.offset;
  for (let midi = row.lo; midi <= row.hi; midi++) {
    if (isBlack(midi)) {
      const boundary = whiteIndex * whiteWidth;
      const center = boundary + BLACK_CENTER_OFFSET[pitchClass(midi)] * whiteWidth;
      keys.push({ midi, black: true, left: center - blackWidth / 2, width: blackWidth });
    } else {
      keys.push({ midi, black: false, left: whiteIndex * whiteWidth, width: whiteWidth });
      whiteIndex++;
    }
  }
  return keys;
}

export const FULL_ROW: KeyRow = { lo: MIDI_MIN, hi: MIDI_MAX, slots: WHITE_KEY_COUNT, offset: 0 };

const octaveBounds = (from: number, to: number): [number, number] => [
  Math.max(MIDI_MIN, (from + 1) * 12),
  Math.min(MIDI_MAX, (to + 1) * 12 + 11),
];

/**
 * Rows to draw.
 * - 'full': the whole 88-key piano (desktop).
 * - 'range': only the training octaves in one row (tablets, phones in landscape).
 * - 'stacked': the training octaves split into rows (phones held upright).
 */
export function keyboardRows(range: OctaveRange, layout: 'full' | 'range' | 'stacked'): KeyRow[] {
  if (layout === 'full') return [FULL_ROW];
  const { from, to } = normalizeRange(range);
  if (layout === 'range') {
    const [lo, hi] = octaveBounds(from, to);
    return [{ lo, hi, slots: countWhite(lo, hi), offset: 0 }];
  }
  const octaves = to - from + 1;
  const perRow = octaves <= 3 ? 1 : 2;
  const rows: KeyRow[] = [];
  for (let o = from; o <= to; o += perRow) {
    const [lo, hi] = octaveBounds(o, Math.min(to, o + perRow - 1));
    rows.push({ lo, hi, slots: 7 * perRow, offset: WHITE_INDEX_IN_OCTAVE[pitchClass(lo)] });
  }
  return rows;
}

export const KEYBOARD_LAYOUT: readonly KeyGeometry[] = buildKeyboardLayout();
