/**
 * Recorded grand piano: Salamander Grand Piano by Alexander Holm (CC BY 3.0),
 * one sample every minor third from A0 to C8 — the notes in between are pitched from the nearest.
 */
export const SAMPLE_NAMES = ['A0', 'C1', 'Ds1', 'Fs1', 'A1', 'C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6', 'Fs6', 'A6', 'C7', 'Ds7', 'Fs7', 'A7', 'C8'];

const PC: Record<string, number> = { C: 0, Ds: 3, Fs: 6, A: 9 };

/** «Ds4» → 63. */
export function sampleMidi(name: string): number {
  const m = /^([A-G]s?)(\d)$/.exec(name)!;
  return (Number(m[2]) + 1) * 12 + PC[m[1]];
}

export const sampleUrl = (name: string) => `/samples/piano/${name}.mp3`;

/** The sample to pitch a note from: the nearest one (at most a semitone and a half away). */
export function nearestSample(midi: number, available: number[]): number | null {
  let best: number | null = null;
  for (const s of available) if (best === null || Math.abs(s - midi) < Math.abs(best - midi)) best = s;
  return best !== null && Math.abs(best - midi) <= 2 ? best : null;
}
