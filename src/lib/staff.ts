/**
 * Placement of notes on the staff.
 * "Step" = position relative to the bottom staff line: 0 = bottom line, 1 = first space,
 * 2 = second line … 8 = top line. Negative / >8 need ledger lines.
 */
import type { Letter, NoteName } from './notes';

export type Clef = 'treble' | 'bass';
/** What the user picks: one clef, or the grand staff (clef chosen per note). */
export type ClefChoice = 'treble' | 'bass' | 'grand';

const LETTER_INDEX: Record<Letter, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

/** Diatonic index of the bottom line: E4 for treble, G2 for bass. */
const BOTTOM_LINE: Record<Clef, number> = { treble: 4 * 7 + 2, bass: 2 * 7 + 4 };

/**
 * MIDI bounds of notes drawn for each choice — staff plus up to two ledger lines
 * (treble A3–C6, bass C2–E4).
 */
export const CLEF_BOUNDS: Record<ClefChoice, [number, number]> = {
  treble: [57, 84],
  bass: [36, 64],
  grand: [36, 84],
};

/** Uses the spelled letter, so D♭4 sits on D and C♯4 on C. */
export function diatonicIndex(note: NoteName): number {
  return note.octave * 7 + LETTER_INDEX[note.letter];
}

export function clefFor(choice: ClefChoice, midi: number): Clef {
  if (choice !== 'grand') return choice;
  return midi >= 60 ? 'treble' : 'bass';
}

/** `note` must use scientific octaves (no Yamaha offset). */
export function staffStep(note: NoteName, clef: Clef): number {
  return diatonicIndex(note) - BOTTOM_LINE[clef];
}

/** Steps where ledger lines are needed for a note at `step`. */
export function ledgerSteps(step: number): number[] {
  const out: number[] = [];
  for (let k = -2; k >= step; k -= 2) out.push(k);
  for (let k = 10; k <= step; k += 2) out.push(k);
  return out;
}
