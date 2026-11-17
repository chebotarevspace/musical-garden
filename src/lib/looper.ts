/**
 * The Jam looper, like a looper pedal: a loop of N bars plays round and round; each recording
 * pass captures exactly one loop from its first beat and becomes a new layer on top.
 */
import { type Chord, chordSymbol } from './chords';
import { type JamHarmony, chordIndexAt, cycleBeats } from './jam';

export interface LoopNote {
  midi: number;
  /** Beats from the loop start. */
  on: number;
  off: number;
}

export interface LoopLayer {
  id: number;
  notes: LoopNote[];
  muted: boolean;
}

export const LOOP_BARS = [1, 2, 4, 8] as const;
export type LoopBars = (typeof LOOP_BARS)[number];

/** Notes this close before the loop start still count (a slightly early first note). */
export const EARLY = 0.3;
const GRID = 0.5; // eighth notes

/**
 * Where a note played at absolute beat `b` lands in a layer recorded from `from`, or null when it
 * falls outside the pass. With `snap`, the start moves to the nearest eighth note.
 */
export function placeNote(b: number, from: number, loopLen: number, snap: boolean): number | null {
  const rel = b - from;
  if (rel < -EARLY || rel >= loopLen) return null;
  let at = Math.max(0, rel);
  if (snap) at = Math.round(at / GRID) * GRID;
  // Snapped onto the very end → it's the downbeat of the loop.
  if (at >= loopLen - 1e-6) at = 0;
  return at;
}

/** The note length with `snap`: at least an eighth, rounded to eighths. */
export function snapLength(len: number, snap: boolean): number {
  if (!snap) return Math.max(0.1, len);
  return Math.max(GRID, Math.round(len / GRID) * GRID);
}

/** Close a finished pass: held notes end at the loop end, nothing spills over it. */
export function finishLayer(notes: LoopNote[], loopLen: number): LoopNote[] {
  return notes
    .map((n) => ({ ...n, off: Math.min(loopLen, Math.max(n.off, n.on + 0.1)) }))
    .filter((n) => n.off > n.on)
    .sort((a, b) => a.on - b.on || a.midi - b.midi);
}

/** The harmony's chord under a loop position (the harmony repeats if it's shorter than the loop). */
export function guideIndex(h: JamHarmony, beatInLoop: number): number {
  const cyc = cycleBeats(h);
  return chordIndexAt(h, ((beatInLoop % cyc) + cyc) % cyc);
}

/** Chord suggestions across the loop: what to record, bar by bar. */
export function guideSegments(h: JamHarmony, loopLen: number): { chord: Chord; from: number; to: number }[] {
  const out: { chord: Chord; from: number; to: number }[] = [];
  let at = 0;
  let i = 0;
  while (at < loopLen - 1e-6 && out.length < 64) {
    const to = Math.min(loopLen, at + h.beats[i]);
    const prev = out[out.length - 1];
    // The same chord bar after bar reads as one long chord.
    if (prev && chordSymbol(prev.chord) === chordSymbol(h.chords[i])) prev.to = to;
    else out.push({ chord: h.chords[i], from: at, to });
    at = to;
    i = (i + 1) % h.chords.length;
  }
  return out;
}

/** The lowest and highest notes of a layer (for drawing it). */
export function layerRange(notes: LoopNote[]): [number, number] {
  if (!notes.length) return [60, 72];
  let lo = 127;
  let hi = 0;
  for (const n of notes) {
    lo = Math.min(lo, n.midi);
    hi = Math.max(hi, n.midi);
  }
  return [lo, hi];
}

/** First beat of the pass when «record» is pressed at beat `b`: the next loop start (or this one, if just begun). */
export function nextPassStart(b: number, loopLen: number): number {
  const inLoop = ((b % loopLen) + loopLen) % loopLen;
  if (inLoop < 0.25) return b - inLoop;
  return b - inLoop + loopLen;
}
