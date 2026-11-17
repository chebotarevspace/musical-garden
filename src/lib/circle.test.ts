import { describe, expect, it } from 'vitest';
import { chordSymbol, noteText } from './chords';
import { CIRCLE, diatonicChords, findCircleKey, neighbours, signature } from './circle';
import { scaleOf } from './progressions';

describe('circle of fifths', () => {
  it('has 12 keys with matching relative minors', () => {
    expect(CIRCLE).toHaveLength(12);
    expect(CIRCLE.map((k) => k.major.label)).toEqual(['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'D♭', 'A♭', 'E♭', 'B♭', 'F']);
    expect(CIRCLE.map((k) => k.minor.label)).toEqual(['Am', 'Em', 'Bm', 'F♯m', 'C♯m', 'G♯m', 'E♭m', 'B♭m', 'Fm', 'Cm', 'Gm', 'Dm']);
  });

  it('key signatures follow the order of sharps and flats', () => {
    expect(signature(findCircleKey('D'))).toEqual(['F♯', 'C♯']);
    expect(signature(findCircleKey('Eb'))).toEqual(['B♭', 'E♭', 'A♭']);
    expect(signature(findCircleKey('C'))).toEqual([]);
  });

  it('signature matches the accidentals actually in the scale', () => {
    for (const k of CIRCLE) {
      const acc = scaleOf(k.major.tonic, false).filter((n) => n.alter !== 0).map(noteText).sort();
      expect(acc, k.major.id).toEqual([...signature(k)].sort());
    }
  });

  it('diatonic chords and neighbours', () => {
    expect(diatonicChords(findCircleKey('G').major).map(chordSymbol)).toEqual(['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F♯dim']);
    const n = neighbours('C');
    expect([n.iv.major.id, n.v.major.id]).toEqual(['F', 'G']);
  });
});
