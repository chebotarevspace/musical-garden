/**
 * «Ведущий лист» (lead sheet): the melody in the right hand, the chords in the left.
 *
 * The song becomes a list of steps — every moment where a melody note starts or the chord
 * changes. A step is done when its melody note is played and the left hand holds its chord.
 */
import { type Chord, chordPcs } from './chords';
import type { SongPlan, MelodyNote } from './songs';

export interface LeadStep {
  beat: number;
  /** The melody note that starts here (index into plan.melody), or -1. */
  note: number;
  /** The chord slot that starts here, or -1. */
  slot: number;
  /** The chord that sounds at this moment. */
  chordSlot: number;
}

export type LeftHand = 'chord' | 'root';

/** Beat where each chord slot starts. */
export function slotStarts(plan: SongPlan): number[] {
  const out: number[] = [];
  let at = 0;
  for (const s of plan.slots) {
    out.push(at);
    at += s.beats;
  }
  return out;
}

export function leadSteps(plan: SongPlan): LeadStep[] {
  const starts = slotStarts(plan);
  const times = new Set<number>();
  plan.melody.forEach((n) => times.add(round(n.beat)));
  starts.forEach((b) => times.add(round(b)));
  const sorted = [...times].sort((a, b) => a - b);
  return sorted.map((beat) => {
    const note = plan.melody.findIndex((n) => round(n.beat) === beat);
    const slot = starts.findIndex((b) => round(b) === beat);
    let chordSlot = 0;
    for (let i = 0; i < starts.length; i++) if (starts[i] <= beat + 1e-6) chordSlot = i;
    return { beat, note, slot, chordSlot };
  });
}

const round = (x: number) => Math.round(x * 1000) / 1000;

/** Notes below this key belong to the left hand. */
export function splitPoint(melody: MelodyNote[]): number {
  if (!melody.length) return 60;
  return Math.min(60, Math.min(...melody.map((n) => n.midi)));
}

/** Pitch classes the left hand must hold: the root alone, or the chord (a 7th chord may drop its 5th). */
export function requiredPcs(chord: Chord, left: LeftHand): number[] {
  const pcs = chordPcs(chord);
  if (left === 'root') return [pcs[0]];
  return pcs.length >= 4 ? pcs.filter((_, i) => i !== 2) : pcs;
}

export function chordHeld(held: Iterable<number>, chord: Chord, left: LeftHand): boolean {
  const have = new Set([...held].map((m) => ((m % 12) + 12) % 12));
  return requiredPcs(chord, left).every((pc) => have.has(pc));
}

/** A left-hand voicing below the split point (the voice-led one, moved down by octaves). */
export function leftVoicing(voicing: number[], split: number, left: LeftHand): number[] {
  let v = left === 'root' ? [Math.min(...voicing)] : [...voicing];
  if (!v.length) return v;
  while (Math.max(...v) >= split) v = v.map((m) => m - 12);
  while (Math.min(...v) < 36) v = v.map((m) => m + 12);
  return v;
}
