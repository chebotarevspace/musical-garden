import { describe, expect, it } from 'vitest';
import { parseChord } from './chordSymbols';
import { findPattern } from './patterns';
import { fitsHit, hitComplete, rhythmHits, rhythmScore, timingTip } from './rhythmGrade';

const C = parseChord('C');
const G = parseChord('G');

describe('accompaniment rhythm', () => {
  it('bass — chord: bass, chord, fifth, chord', () => {
    const hits = rhythmHits(findPattern('march'), [C]);
    expect(hits.map((h) => h.beat)).toEqual([0, 1, 2, 3]);
    expect(hits[0].need).toEqual([0]);
    expect(hits[1].need.sort()).toEqual([0, 4, 7]);
    expect(hits[2].need).toEqual([7]);
  });

  it('block chord merges bass and chord; passes repeat the progression', () => {
    const hits = rhythmHits(findPattern('block'), [C, G], 2);
    expect(hits.length).toBe(4);
    expect(hits[3].beat).toBe(12);
    expect(hits[1].need.sort((a, b) => a - b)).toEqual([2, 7, 11]);
  });

  it('waltz is in 3/4, broken chords accept any chord tone', () => {
    const w = rhythmHits(findPattern('waltz'), [C, G]);
    expect(w.map((h) => h.beat)).toEqual([0, 1, 2, 3, 4, 5]);
    const b = rhythmHits(findPattern('broken'), [C]);
    const tone = b.find((h) => h.eighth === 1)!;
    expect(tone.anyTone).toBe(true);
    expect(fitsHit(tone, 64)).toBe(true);
    expect(fitsHit(tone, 62)).toBe(false);
    expect(hitComplete(tone, new Set([76]))).toBe(true);
  });

  it('a chord hit needs all its notes, in any octave', () => {
    const h = rhythmHits(findPattern('quarters'), [C])[1];
    expect(hitComplete(h, new Set([60, 64]))).toBe(false);
    expect(hitComplete(h, new Set([52, 60, 67]))).toBe(true);
  });

  it('score and timing tip', () => {
    expect(rhythmScore(['hit', 'partial', 'miss', 'hit'])).toBe(63);
    expect(timingTip([-60, -50, -40, -55])).toMatch(/спешите/);
    expect(timingTip([5, -5, 10, 0])).toMatch(/Точно/);
  });
});
