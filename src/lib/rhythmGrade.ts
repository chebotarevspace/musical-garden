/**
 * «Ритм аккомпанемента»: an accompaniment pattern over a chord progression becomes a list of hits —
 * moments where the left hand (bass) and/or the right hand (chord, chord tones) must sound.
 * Each hit is graded by what you play within a small window around it.
 */
import { type Chord, chordPcs } from './chords';
import type { Pattern, Role } from './patterns';

export interface RhythmHit {
  /** Beat from the start of the exercise. */
  beat: number;
  slot: number;
  /** Eighth within the bar (for drawing the grid). */
  eighth: number;
  /** Pitch classes that must all sound. */
  need: number[];
  /** At least one chord tone (single right-hand notes of broken chords, arpeggios). */
  anyTone: boolean;
  left: Role[];
  right: Role[];
  chord: Chord;
}

export type HitResult = 'hit' | 'partial' | 'miss';

/** Half-width of the window around a hit, in beats (less than half an eighth). */
export const RHYTHM_WINDOW = 0.22;

const pc = (m: number) => ((m % 12) + 12) % 12;

export function patternMeter(p: Pattern): 3 | 4 {
  return p.id === 'waltz' ? 3 : 4;
}

/** All hits for `passes` rounds of the progression, one chord per bar. */
export function rhythmHits(pattern: Pattern, chords: Chord[], passes = 1): RhythmHit[] {
  const meter = patternMeter(pattern);
  const events = meter === 3 ? pattern.bar3 : pattern.bar4;
  const out: RhythmHit[] = [];
  for (let p = 0; p < passes; p++)
    chords.forEach((chord, i) => {
      const slot = p * chords.length + i;
      const pcs = chordPcs(chord);
      const root = pcs[0];
      // A seventh chord may drop its fifth in the right hand.
      const chordNeed = pcs.length >= 4 ? pcs.filter((_, k) => k !== 2) : pcs;
      const byAt = new Map<number, Role[]>();
      for (const e of events) byAt.set(e.at, [...(byAt.get(e.at) ?? []), ...e.roles]);
      for (const [at, roles] of [...byAt].sort((a, b) => a[0] - b[0])) {
        const need = new Set<number>();
        let anyTone = false;
        for (const r of roles) {
          if (r === 'B' || r === 'B8') need.add(root);
          else if (r === 'B5') need.add(pc(root + 7));
          else if (r === 'C') chordNeed.forEach((x) => need.add(x));
          else anyTone = true;
        }
        out.push({
          beat: slot * meter + at / 2,
          slot,
          eighth: at,
          need: [...need],
          anyTone: anyTone && need.size === 0,
          left: roles.filter((r) => r.startsWith('B')),
          right: roles.filter((r) => !r.startsWith('B')),
          chord,
        });
      }
    });
  return out;
}

/** Does this note belong to the hit (a needed note, or any chord tone where that's enough)? */
export function fitsHit(h: RhythmHit, midi: number): boolean {
  const x = pc(midi);
  return h.need.includes(x) || ((h.anyTone || h.right.length > 0) && chordPcs(h.chord).includes(x));
}

/** Is the hit complete with these notes? */
export function hitComplete(h: RhythmHit, got: Set<number>): boolean {
  if (h.anyTone) return [...got].some((m) => chordPcs(h.chord).includes(pc(m)));
  const have = new Set([...got].map(pc));
  return h.need.every((x) => have.has(x));
}

/** Score 0…100: a full hit counts 1, a partial one ½. */
export function rhythmScore(results: (HitResult | null)[]): number {
  if (!results.length) return 0;
  const pts = results.reduce((a, r) => a + (r === 'hit' ? 1 : r === 'partial' ? 0.5 : 0), 0);
  return Math.round((pts / results.length) * 100);
}

/** A tip from the timing: average offset of your first note per hit, in milliseconds. */
export function timingTip(offsetsMs: number[]): string | null {
  if (offsetsMs.length < 4) return null;
  const avg = offsetsMs.reduce((a, b) => a + b, 0) / offsetsMs.length;
  if (avg < -35) return `Вы чуть спешите — в среднем на ${Math.round(-avg)} мс раньше доли.`;
  if (avg > 35) return `Вы чуть опаздываете — в среднем на ${Math.round(avg)} мс после доли.`;
  return 'Точно в долю — так держать!';
}
