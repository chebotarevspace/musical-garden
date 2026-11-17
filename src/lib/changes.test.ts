import { describe, expect, it } from 'vitest';
import { CHANGE_SETS, changeChords, changeStars, findChangeSet, holdsChord } from './changes';
import { parseChord } from './chordSymbols';
import { chordSymbol } from './chords';

describe('chord changes', () => {
  it('every set parses and its neighbours differ', () => {
    for (const s of CHANGE_SETS) {
      const list = changeChords(s);
      expect(list.length).toBeGreaterThanOrEqual(2);
      list.forEach((c, i) => expect(chordSymbol(list[(i + 1) % list.length])).not.toBe(chordSymbol(c)));
    }
    expect(changeChords(findChangeSet('minor')).length).toBe(3);
  });

  it('a chord counts in any inversion, but not with extra notes', () => {
    const c = parseChord('C');
    expect(holdsChord([60, 64, 67], c)).toBe(true);
    expect(holdsChord([52, 55, 60, 72], c)).toBe(true);
    expect(holdsChord([60, 64], c)).toBe(false);
    expect(holdsChord([60, 64, 67, 69], c)).toBe(false);
  });

  it('stars by changes per minute', () => {
    expect(changeStars(10, 60)).toBe(0);
    expect(changeStars(20, 60)).toBe(1);
    expect(changeStars(18, 30)).toBe(2);
    expect(changeStars(50, 60)).toBe(3);
  });
});
