import { describe, expect, it } from 'vitest';
import { gradeOnset, summarizeTiming } from './timing';

describe('timing', () => {
  const t0 = 1000;
  const iv = 500; // 120 bpm

  it('grades by distance to the nearest beat', () => {
    expect(gradeOnset(t0 + 500, t0, iv).grade).toBe('good');
    expect(gradeOnset(t0 + 530, t0, iv).grade).toBe('good'); // 6%
    expect(gradeOnset(t0 + 600, t0, iv).grade).toBe('ok'); // 20%
    expect(gradeOnset(t0 + 700, t0, iv).grade).toBe('off'); // 40%
    expect(gradeOnset(t0 + 1460, t0, iv).dev).toBeCloseTo(-0.08); // slightly early for beat 3
  });

  it('being a whole beat late does not matter, evenness does', () => {
    const onsets = [1, 2, 3, 4, 5].map((b) => gradeOnset(t0 + (b + 1) * iv + 10, t0, iv));
    const s = summarizeTiming(onsets, iv, 0);
    expect(s.evenness).toBe(100);
    expect(s.tendency).toBe('steady');
    expect(s.advice).toBe('faster');
  });

  it('detects rushing and suggests slowing down when uneven', () => {
    const rushing = [1, 2, 3, 4].map((b) => gradeOnset(t0 + b * iv - 60, t0, iv));
    expect(summarizeTiming(rushing, iv, 0).tendency).toBe('rush');
    const messy = [0.3, 1.4, 2.35, 3.6].map((b) => gradeOnset(t0 + b * iv, t0, iv));
    expect(summarizeTiming(messy, iv, 0).advice).toBe('slower');
  });
});
