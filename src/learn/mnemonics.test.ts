import { describe, expect, it } from 'vitest';
import { MNEMONICS } from './mnemonics';
import { LESSONS } from './lessons';

describe('mnemonics', () => {
  it('every lesson has at least one, ids are unique and point to real lessons', () => {
    const ids = new Set(LESSONS.map((l) => l.id));
    for (const m of MNEMONICS) expect(ids.has(m.lesson), m.id).toBe(true);
    for (const l of LESSONS) expect(MNEMONICS.some((m) => m.lesson === l.id), l.id).toBe(true);
    expect(new Set(MNEMONICS.map((m) => m.id)).size).toBe(MNEMONICS.length);
  });

  it('bold markers are balanced', () => {
    for (const m of MNEMONICS) expect(m.text.split('**').length % 2, m.id).toBe(1);
  });
});
