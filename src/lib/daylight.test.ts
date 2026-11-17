import { describe, expect, it } from 'vitest';
import { dayPhase } from './daylight';

describe('daylight', () => {
  it('follows the clock', () => {
    expect([4, 5, 7, 8, 12, 17, 18, 20, 21, 23].map(dayPhase)).toEqual(['night', 'dawn', 'dawn', 'day', 'day', 'day', 'dusk', 'dusk', 'night', 'night']);
  });
});
