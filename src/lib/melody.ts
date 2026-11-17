/** Short melodic phrases for sight-reading practice: mostly steps, sometimes small leaps. */
import { type Mode, isBlack, midiToCode } from './notes';
import type { ClefChoice } from './staff';

/** White-key range for each clef choice (comfortable, at most one ledger line). */
const RANGE: Record<ClefChoice, [number, number]> = {
  treble: [60, 79], // C4–G5
  bass: [43, 60], // G2–C4
  grand: [48, 72], // C3–C5
};

const STEPS: [number, number][] = [
  [-1, 3],
  [1, 3],
  [-2, 2],
  [2, 2],
  [-3, 1],
  [3, 1],
  [0, 0.6],
];

type Rng = () => number;

function weighted(rng: Rng): number {
  const total = STEPS.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [step, w] of STEPS) {
    if ((r -= w) <= 0) return step;
  }
  return 1;
}

/** Note codes of a phrase, e.g. ["E4", "F4", "G4", "E4", …]. */
export function makePhrase(clef: ClefChoice, mode: Mode, length: number, rng: Rng = Math.random): string[] {
  const [lo, hi] = RANGE[clef];
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
  let i = Math.floor(whites.length / 3 + rng() * (whites.length / 3));
  const out: string[] = [];
  for (let n = 0; n < length; n++) {
    if (n > 0) {
      let next = i + weighted(rng);
      if (next < 0 || next >= whites.length) next = i - (next - i); // bounce off the edges
      i = Math.max(0, Math.min(whites.length - 1, next));
    }
    let midi = whites[i];
    let spelling: 'sharp' | 'flat' = 'sharp';
    // Accidentals mode: some notes move to a neighbouring black key.
    if (mode === 'accidentals' && rng() < 0.3) {
      if (rng() < 0.5 && isBlack(midi + 1) && midi + 1 <= hi) {
        midi += 1;
        spelling = 'sharp';
      } else if (isBlack(midi - 1) && midi - 1 >= lo) {
        midi -= 1;
        spelling = 'flat';
      }
    }
    out.push(midiToCode(midi, spelling));
  }
  return out;
}
