import { describe, expect, it } from 'vitest';
import { createTracker } from './noteTracker';

const run = (frames: [number | null, number][]) => {
  const t = createTracker({ gate: 0.01, stable: 2 });
  return frames.flatMap(([midi, rms]) => t.push({ midi, rms })).map((e) => `${e.type}${e.midi}`);
};

describe('note tracker', () => {
  it('a struck note: on after it is stable, off when it decays', () => {
    expect(run([[60, 0.2], [60, 0.18], [60, 0.12], [60, 0.05], [60, 0.008], [null, 0.002]])).toEqual(['on60', 'off60']);
  });

  it('noise and single glitches do not make notes', () => {
    expect(run([[64, 0.005], [64, 0.004], [null, 0.2], [61, 0.2], [null, 0.2]])).toEqual([]);
  });

  it('legato to a new key and a repeated key', () => {
    expect(run([[60, 0.2], [60, 0.18], [62, 0.15], [62, 0.15], [62, 0.14], [62, 0.06], [62, 0.2], [62, 0.18]])).toEqual(['on60', 'off60', 'on62', 'off62', 'on62']);
  });
});
