/**
 * Pitch detection for a single note from the microphone (YIN, de Cheveigné & Kawahara 2002).
 * Works on a block of audio samples and returns the fundamental frequency with a confidence.
 */

export interface PitchResult {
  /** Hz, or 0 when no clear pitch. */
  freq: number;
  /** 0…1 — how periodic the block is (1 = a pure tone). */
  clarity: number;
  /** Root-mean-square level of the block. */
  rms: number;
}

const MIN_HZ = 50; // below G1
const MAX_HZ = 2200; // above C7

export function rms(buf: Float32Array): number {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

/**
 * YIN pitch estimate. `threshold` (0.1–0.2) trades sensitivity for reliability.
 * Piano tones are rich in harmonics; YIN's cumulative-mean normalisation keeps it on the fundamental.
 */
export function detectPitch(buf: Float32Array, sampleRate: number, threshold = 0.15): PitchResult {
  const level = rms(buf);
  const half = Math.floor(buf.length / 2);
  const maxTau = Math.min(half, Math.floor(sampleRate / MIN_HZ));
  const minTau = Math.max(2, Math.floor(sampleRate / MAX_HZ));
  if (level < 1e-4 || maxTau <= minTau) return { freq: 0, clarity: 0, rms: level };

  // Difference function d(tau) and its cumulative mean normalised form d'(tau).
  const d = new Float32Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i < half; i++) {
      const diff = buf[i] - buf[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }
  const cmnd = new Float32Array(maxTau + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += d[tau];
    cmnd[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }

  // First dip below the threshold, then walk to its local minimum.
  let tau = -1;
  for (let t = minTau; t <= maxTau; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 <= maxTau && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) {
    // No dip under the threshold: take the global minimum but report low clarity.
    let best = minTau;
    for (let t = minTau; t <= maxTau; t++) if (cmnd[t] < cmnd[best]) best = t;
    return { freq: 0, clarity: Math.max(0, 1 - cmnd[best]), rms: level };
  }

  // Parabolic interpolation for a sub-sample period.
  const a = cmnd[tau - 1] ?? cmnd[tau];
  const b = cmnd[tau];
  const c = cmnd[tau + 1] ?? cmnd[tau];
  const denom = a + c - 2 * b;
  const better = denom !== 0 ? tau + (a - c) / (2 * denom) : tau;
  return { freq: sampleRate / better, clarity: Math.max(0, Math.min(1, 1 - b)), rms: level };
}

export const freqToMidi = (f: number) => 69 + 12 * Math.log2(f / 440);

/** The nearest key and how far off it is, in cents. */
export function nearestKey(f: number): { midi: number; cents: number } {
  const m = freqToMidi(f);
  const midi = Math.round(m);
  return { midi, cents: Math.round((m - midi) * 100) };
}
