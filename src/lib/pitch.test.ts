import { describe, expect, it } from 'vitest';
import { detectPitch, nearestKey } from './pitch';

const SR = 44100;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** A piano-like tone: fundamental plus decaying harmonics, slightly inharmonic, with a little noise. */
function tone(midi: number, n = 2048, noise = 0.02): Float32Array {
  const f = hz(midi);
  const out = new Float32Array(n);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (let k = 1; k <= 6; k++) v += Math.sin(2 * Math.PI * f * k * (1 + 0.0004 * k * k) * t) / k ** 1.2;
    out[i] = 0.3 * v + noise * rnd();
  }
  return out;
}

describe('pitch detection', () => {
  it('finds the fundamental of piano-like tones across the keyboard', () => {
    for (const midi of [43, 48, 55, 60, 64, 67, 69, 72, 76, 81, 84, 88]) {
      const r = detectPitch(tone(midi, midi < 50 ? 4096 : 2048), SR);
      expect(r.freq, `midi ${midi}`).toBeGreaterThan(0);
      expect(nearestKey(r.freq).midi, `midi ${midi}`).toBe(midi);
      expect(r.clarity).toBeGreaterThan(0.8);
    }
  });

  it('silence and noise give no pitch', () => {
    expect(detectPitch(new Float32Array(2048), SR).freq).toBe(0);
    let seed = 3;
    const noise = new Float32Array(2048).map(() => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1);
    expect(detectPitch(noise, SR).freq).toBe(0);
  });

  it('cents show how far a note is from the key', () => {
    expect(nearestKey(440)).toEqual({ midi: 69, cents: 0 });
    expect(nearestKey(446).cents).toBeGreaterThan(20);
  });
});
