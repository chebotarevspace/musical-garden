import { describe, expect, it } from 'vitest';
import { missWeight, setItemWeights, weightedIndex } from './adaptive';
import { pickTargetInBounds } from './notes';

describe('adaptive practice', () => {
  it('weights grow with the miss rate and confidence', () => {
    expect(missWeight(undefined)).toBe(1);
    expect(missWeight({ seen: 10, misses: 0 })).toBe(1);
    expect(missWeight({ seen: 0, misses: 10 })).toBe(4);
    expect(missWeight({ seen: 0, misses: 1 })).toBeLessThan(missWeight({ seen: 0, misses: 5 }));
  });

  it('equal weights pick like a uniform pick', () => {
    for (const r of [0, 0.1, 0.5, 0.99]) expect(weightedIndex([1, 1, 1, 1], r)).toBe(Math.floor(r * 4));
    expect(weightedIndex([1, 3], 0.3)).toBe(1);
  });

  it('a note you keep missing comes up more often', () => {
    setItemWeights((k) => (k === 'note:code:60' ? 4 : 1));
    let hits = 0;
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2000; i++) if (pickTargetInBounds([60, 71], 'naturals', null, rng).midi === 60) hits++;
    setItemWeights(null);
    // 7 white keys: uniform ≈ 14 %, weighted 4/10 = 40 %
    expect(hits / 2000).toBeGreaterThan(0.3);
  });
});
