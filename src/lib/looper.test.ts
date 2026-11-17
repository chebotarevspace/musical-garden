import { describe, expect, it } from 'vitest';
import { finishLayer, guideSegments, nextPassStart, placeNote, snapLength } from './looper';
import { GROOVES, harmonyFromGroove, jamKeys } from './jam';

describe('looper', () => {
  it('places notes inside one pass and snaps to eighths', () => {
    expect(placeNote(16.2, 16, 16, true)).toBe(0);
    expect(placeNote(17.3, 16, 16, true)).toBe(1.5);
    expect(placeNote(17.3, 16, 16, false)).toBeCloseTo(1.3);
    expect(placeNote(15.8, 16, 16, true)).toBe(0); // a touch early
    expect(placeNote(15, 16, 16, true)).toBeNull();
    expect(placeNote(31.9, 16, 16, true)).toBe(0); // snaps onto the next downbeat
    expect(placeNote(32, 16, 16, true)).toBeNull();
  });

  it('rounds lengths and closes held notes at the loop end', () => {
    expect(snapLength(0.2, true)).toBe(0.5);
    expect(snapLength(1.3, true)).toBe(1.5);
    const done = finishLayer([{ midi: 60, on: 14, off: 99 }, { midi: 64, on: 0, off: 1 }], 16);
    expect(done).toEqual([{ midi: 64, on: 0, off: 1 }, { midi: 60, on: 14, off: 16 }]);
  });

  it('waits for the next loop start', () => {
    expect(nextPassStart(0, 16)).toBe(0);
    expect(nextPassStart(3, 16)).toBe(16);
    expect(nextPassStart(16.1, 16)).toBe(16);
    expect(nextPassStart(-2, 16)).toBe(0);
  });

  it('spreads the harmony over the loop', () => {
    const h = harmonyFromGroove(GROOVES[0], jamKeys(GROOVES[0])[0]);
    const seg = guideSegments(h, 4 * h.meter);
    expect(seg[0].from).toBe(0);
    expect(seg[seg.length - 1].to).toBe(4 * h.meter);
  });
});
