import { describe, expect, it } from 'vitest';
import { HANDS_LEVELS, handsSteps, makeHandsExercise } from './handsReading';
import { isBlack } from './notes';

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('two-hand sight-reading', () => {
  it('every level fills each bar in both hands and keeps the hands on their staves', () => {
    for (const level of HANDS_LEVELS)
      for (const bars of [2, 4])
        for (let s = 1; s < 40; s++) {
          const ex = makeHandsExercise(level.id, s % 2 ? 'naturals' : 'accidentals', bars, seeded(s));
          for (const hand of ['R', 'L'] as const)
            for (let b = 0; b < bars; b++) {
              const sum = ex.events.filter((e) => e.hand === hand && e.beat >= b * 4 && e.beat < b * 4 + 4).reduce((a, e) => a + e.dur, 0);
              expect([level.id, hand, b, sum]).toEqual([level.id, hand, b, 4]);
            }
          for (const e of ex.events) {
            if (e.hand === 'R') e.midis.forEach((m) => expect(m).toBeGreaterThanOrEqual(60));
            else e.midis.forEach((m) => expect(m).toBeLessThan(60));
          }
          expect(handsSteps(ex).length).toBeGreaterThan(bars);
        }
  });

  it('white keys only in the naturals mode, and the last note is the tonic', () => {
    for (const level of HANDS_LEVELS)
      for (let s = 1; s < 120; s++) {
        const ex = makeHandsExercise(level.id, 'naturals', s % 2 ? 2 : 4, seeded(s));
        ex.events.forEach((e) => e.midis.forEach((m) => expect(isBlack(m)).toBe(false)));
        const lastR = ex.events.filter((e) => e.hand === 'R' && e.midis.length).pop()!;
        expect(lastR.midis[0] % 12).toBe(ex.position.tonic);
      }
  });

  it('steps group notes that start together', () => {
    const ex = makeHandsExercise('h-together', 'naturals', 2, seeded(3));
    const steps = handsSteps(ex);
    expect(steps[0].midis.length).toBe(2);
    expect(steps[0].beat).toBe(0);
  });
});
