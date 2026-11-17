import { type Mode, type OctaveRange, type Target, normalizeRange, pickTargetInBounds, rangeToMidiBounds } from './notes';

export interface Stats {
  correct: number;
  wrong: number;
  streak: number;
  best: number;
  reactionTotal: number;
  reactionCount: number;
}

export type StatsByMode = Record<Mode, Stats>;

export type ReactionMood = 'happy' | 'oops' | 'celebrate' | 'thinking';

export interface Reaction {
  mood: ReactionMood;
  id: number;
  streak: number;
}

export interface TrainerState {
  mode: Mode;
  range: OctaveRange;
  /** Explicit MIDI bounds (e.g. the notes a clef can show); overrides `range` when set. */
  bounds: [number, number] | null;
  target: Target;
  /** Increments every time a new target is shown (drives the enter animation). */
  targetId: number;
  /** performance.now() when the current target appeared. */
  shownAt: number;
  /**
   * The target was hit and its key is still held: the code stays on screen
   * and the next one appears only when that key is released.
   */
  solved: boolean;
  stats: StatsByMode;
  /** Increments on every miss (drives the shake animation). */
  shakeId: number;
  /** Last event the mascot should react to. */
  reaction: Reaction | null;
  seq: number;
}

/** Reactions slower than this (user walked away) are not averaged. */
export const MAX_COUNTED_REACTION_MS = 20_000;

export const emptyStats = (): Stats => ({
  correct: 0,
  wrong: 0,
  streak: 0,
  best: 0,
  reactionTotal: 0,
  reactionCount: 0,
});

export const emptyStatsByMode = (): StatsByMode => ({ naturals: emptyStats(), accidentals: emptyStats() });

export function averageReactionMs(stats: Stats): number | null {
  return stats.reactionCount > 0 ? stats.reactionTotal / stats.reactionCount : null;
}

export function isCelebrationStreak(streak: number): boolean {
  return streak === 10 || streak === 25 || streak === 50 || (streak > 50 && streak % 50 === 0);
}

type Rng = () => number;

export function createTrainerState(
  mode: Mode,
  range: OctaveRange,
  stats: StatsByMode,
  now: number,
  rng: Rng = Math.random,
  bounds: [number, number] | null = null,
): TrainerState {
  const r = normalizeRange(range);
  return {
    mode,
    range: r,
    bounds,
    target: pickTargetInBounds(bounds ?? rangeToMidiBounds(r), mode, null, rng),
    targetId: 1,
    shownAt: now,
    solved: false,
    stats,
    shakeId: 0,
    reaction: null,
    seq: 0,
  };
}

function withNewTarget(s: TrainerState, now: number, rng: Rng): TrainerState {
  return {
    ...s,
    target: pickTargetInBounds(s.bounds ?? rangeToMidiBounds(s.range), s.mode, s.target.midi, rng),
    targetId: s.targetId + 1,
    shownAt: now,
    solved: false,
  };
}

function updateStats(s: TrainerState, patch: (st: Stats) => Stats): StatsByMode {
  return { ...s.stats, [s.mode]: patch(s.stats[s.mode]) };
}

function registerMiss(s: TrainerState, mood: ReactionMood): TrainerState {
  const seq = s.seq + 1;
  return {
    ...s,
    stats: updateStats(s, (st) => ({ ...st, wrong: st.wrong + 1, streak: 0 })),
    reaction: { mood, id: seq, streak: 0 },
    seq,
  };
}

export type PressResult = 'correct' | 'wrong' | 'ignored';

/**
 * Judges a key press by MIDI number (so C♯4 and D♭4 are the same key).
 * A correct press is scored immediately, but the next target is shown only
 * after the key is released (see applyRelease). Presses made while the solved
 * key is still held are ignored.
 */
export function applyPress(s: TrainerState, midi: number, now: number): { state: TrainerState; result: PressResult } {
  if (s.solved) return { state: s, result: 'ignored' };
  if (midi !== s.target.midi) {
    const missed = registerMiss(s, 'oops');
    return { state: { ...missed, shakeId: s.shakeId + 1 }, result: 'wrong' };
  }
  const reaction = Math.max(0, now - s.shownAt);
  const counted = reaction <= MAX_COUNTED_REACTION_MS;
  const streak = s.stats[s.mode].streak + 1;
  const seq = s.seq + 1;
  const next: TrainerState = {
    ...s,
    stats: updateStats(s, (st) => ({
      ...st,
      correct: st.correct + 1,
      streak,
      best: Math.max(st.best, streak),
      reactionTotal: st.reactionTotal + (counted ? reaction : 0),
      reactionCount: st.reactionCount + (counted ? 1 : 0),
    })),
    reaction: { mood: isCelebrationStreak(streak) ? 'celebrate' : 'happy', id: seq, streak },
    seq,
    solved: true,
  };
  return { state: next, result: 'correct' };
}

/** Releasing the solved key reveals the next target. Pass `null` to release everything. */
export function applyRelease(s: TrainerState, midi: number | null, now: number, rng: Rng = Math.random): TrainerState {
  if (!s.solved || (midi !== null && midi !== s.target.midi)) return s;
  return withNewTarget(s, now, rng);
}

export function applySkip(s: TrainerState, now: number, rng: Rng = Math.random): TrainerState {
  return withNewTarget(s, now, rng);
}

export function applyMode(s: TrainerState, mode: Mode, now: number, rng: Rng = Math.random): TrainerState {
  if (mode === s.mode) return s;
  return withNewTarget({ ...s, mode }, now, rng);
}

export function applyRange(s: TrainerState, range: OctaveRange, now: number, rng: Rng = Math.random): TrainerState {
  const r = normalizeRange(range);
  if (r.from === s.range.from && r.to === s.range.to) return s;
  return withNewTarget({ ...s, range: r }, now, rng);
}

export function applyBounds(
  s: TrainerState,
  bounds: [number, number] | null,
  now: number,
  rng: Rng = Math.random,
): TrainerState {
  if (bounds?.[0] === s.bounds?.[0] && bounds?.[1] === s.bounds?.[1]) return s;
  return withNewTarget({ ...s, bounds }, now, rng);
}

/** Hint counts as a miss; the caller highlights the returned key briefly. */
export function applyHint(s: TrainerState): TrainerState {
  if (s.solved) return s;
  return registerMiss(s, 'thinking');
}

export function applyResetStats(s: TrainerState): TrainerState {
  return { ...s, stats: { ...s.stats, [s.mode]: emptyStats() } };
}
