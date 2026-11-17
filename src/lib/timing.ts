/**
 * Timing evaluation against a metronome grid.
 * Each onset is compared with the nearest grid point, so being one beat late
 * overall does not ruin the score — only the evenness counts.
 */

export type TimingGrade = 'good' | 'ok' | 'off';

export interface Onset {
  /** Signed deviation from the nearest grid point, as a fraction of the grid interval (−0.5…0.5). */
  dev: number;
  grade: TimingGrade;
}

/** ±12% of the interval counts as on time, ±25% as close. */
export const GOOD = 0.12;
export const OK = 0.25;

export function gradeOnset(time: number, t0: number, interval: number): Onset {
  const pos = (time - t0) / interval;
  const dev = pos - Math.round(pos);
  const a = Math.abs(dev);
  return { dev, grade: a <= GOOD ? 'good' : a <= OK ? 'ok' : 'off' };
}

export interface TimingSummary {
  /** Share of notes on time, 0–100. */
  evenness: number;
  /** Mean signed deviation in ms (negative = rushing, positive = dragging). */
  meanMs: number;
  /** What to do next. */
  advice: 'faster' | 'keep' | 'slower';
  tendency: 'rush' | 'drag' | 'steady';
}

export function summarizeTiming(onsets: Onset[], interval: number, mistakes: number): TimingSummary {
  if (onsets.length === 0) return { evenness: 0, meanMs: 0, advice: 'keep', tendency: 'steady' };
  const good = onsets.filter((o) => o.grade === 'good').length;
  const close = onsets.filter((o) => o.grade === 'ok').length;
  const evenness = Math.round(((good + close * 0.5) / onsets.length) * 100);
  const meanMs = Math.round((onsets.reduce((a, o) => a + o.dev, 0) / onsets.length) * interval);
  const tendency = meanMs < -interval * 0.06 ? 'rush' : meanMs > interval * 0.06 ? 'drag' : 'steady';
  const advice = evenness >= 85 && mistakes === 0 ? 'faster' : evenness < 55 || mistakes > 3 ? 'slower' : 'keep';
  return { evenness, meanMs, advice, tendency };
}
