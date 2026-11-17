import { describe, expect, it } from 'vitest';
import { SAMPLE_NAMES, nearestSample, sampleMidi } from './pianoSamples';

describe('piano samples', () => {
  it('names map to MIDI notes a minor third apart', () => {
    expect(sampleMidi('A0')).toBe(21);
    expect(sampleMidi('C4')).toBe(60);
    expect(sampleMidi('Ds4')).toBe(63);
    expect(sampleMidi('C8')).toBe(108);
    const all = SAMPLE_NAMES.map(sampleMidi);
    all.slice(1).forEach((m, i) => expect(m - all[i]).toBe(3));
  });

  it('every key of the piano has a sample within a semitone and a half', () => {
    const all = SAMPLE_NAMES.map(sampleMidi);
    for (let m = 21; m <= 108; m++) expect(Math.abs(nearestSample(m, all)! - m)).toBeLessThanOrEqual(1);
    expect(nearestSample(60, [])).toBeNull();
  });
});
