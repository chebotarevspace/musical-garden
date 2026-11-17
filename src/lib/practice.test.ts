import { describe, expect, it } from 'vitest';
import { chordSymbol } from './chords';
import { detectChords, spellHeld } from './chordDetect';
import { EAR_LEVELS, makeQuestion } from './ear';
import { MAJOR_KEYS, MINOR_KEYS, PROGRESSIONS, findKey, findProgression, parseNumeral, progressionChords, scaleOf, voiceLead } from './progressions';

const symbols = (progId: string, keyId: string) => {
  const p = findProgression(progId);
  return progressionChords(p, findKey(keyId, p.minor)).map(chordSymbol);
};

describe('progressions', () => {
  it('parses Roman numerals', () => {
    expect(parseNumeral('V7')).toMatchObject({ degree: 5, quality: 'dom7' });
    expect(parseNumeral('ii7')).toMatchObject({ degree: 2, quality: 'min7' });
    expect(parseNumeral('Imaj7')).toMatchObject({ degree: 1, quality: 'maj7' });
    expect(parseNumeral('vii°')).toMatchObject({ degree: 7, quality: 'dim' });
    expect(parseNumeral('vi')).toMatchObject({ degree: 6, quality: 'min' });
  });

  it('spells scales with each letter once', () => {
    expect(scaleOf(findKey('D', false).tonic, false).map((n) => n.letter + (n.alter > 0 ? '#' : n.alter < 0 ? 'b' : ''))).toEqual(['D', 'E', 'F#', 'G', 'A', 'B', 'C#']);
    expect(scaleOf(findKey('Bb', false).tonic, false).map((n) => n.letter + (n.alter < 0 ? 'b' : ''))).toEqual(['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']);
  });

  it('realises progressions in any key', () => {
    expect(symbols('pop', 'C')).toEqual(['C', 'G', 'Am', 'F']);
    expect(symbols('pop', 'G')).toEqual(['G', 'D', 'Em', 'C']);
    expect(symbols('andalusian', 'Am')).toEqual(['Am', 'G', 'F', 'E']);
    expect(symbols('ii-v-i', 'F')).toEqual(['Gm7', 'C7', 'Fmaj7', 'Fmaj7']);
    expect(symbols('blues', 'Bb').slice(0, 5)).toEqual(['B♭7', 'B♭7', 'B♭7', 'B♭7', 'E♭7']);
    expect(symbols('minor-axis', 'Em')).toEqual(['Em', 'C', 'G', 'D']);
  });

  it('every progression works in every key of its mode', () => {
    for (const p of PROGRESSIONS) for (const k of p.minor ? MINOR_KEYS : MAJOR_KEYS) {
      for (const c of progressionChords(p, k)) expect(Math.abs(c.root.alter)).toBeLessThanOrEqual(1);
    }
  });

  it('voice leading keeps the hand in place', () => {
    const p = findProgression('pop');
    const v = voiceLead(progressionChords(p, findKey('C', false)));
    expect(v[0]).toEqual([60, 64, 67]);
    for (let i = 1; i < v.length; i++) {
      const move = v[i].reduce((s, m, j) => s + Math.abs(m - v[i - 1][j]), 0);
      expect(move).toBeLessThanOrEqual(5);
      expect(v[i][0]).toBeGreaterThanOrEqual(52);
    }
  });
});

describe('chord detection', () => {
  const first = (held: number[]) => (detectChords(held)[0] ? chordSymbol(detectChords(held)[0].chord) : null);
  it('names chords and inversions', () => {
    expect(first([60, 64, 67])).toBe('C');
    expect(first([52, 60, 67])).toBe('C/E');
    expect(first([57, 60, 64])).toBe('Am');
    expect(first([55, 59, 62, 65])).toBe('G7');
    expect(first([62, 65, 69, 72])).toBe('Dm7');
    expect(first([61, 65, 68])).toBe('D♭');
    expect(first([66, 69, 73])).toBe('F♯m');
    expect(first([60, 62, 67])).toBe('Csus2');
  });
  it('lists alternative names for ambiguous sets', () => {
    const names = detectChords([57, 60, 64, 67]).map((d) => chordSymbol(d.chord));
    expect(names[0]).toBe('Am7');
    expect(names).toContain('C6/A');
  });
  it('returns nothing for fewer than three different notes', () => {
    expect(detectChords([60, 64])).toEqual([]);
    expect(detectChords([60, 72, 84])).toEqual([]);
  });
  it('spells held notes by the chord', () => {
    const d = detectChords([63, 67, 70])[0];
    expect(spellHeld([63, 67, 70], d.chord).map((x) => x.name)).toEqual(['E♭', 'G', 'B♭']);
  });
});

describe('ear training', () => {
  it('questions match their answers', () => {
    // Melody levels are played back on the keyboard, not asked as a question.
    for (const level of EAR_LEVELS.filter((l) => l.mode !== 'melody')) {
      let prev = null;
      for (let i = 0; i < 30; i++) {
        const q = makeQuestion(level, prev, 'up');
        expect(level.items).toContain(q.answer);
        expect(q.steps.length).toBeGreaterThan(0);
        if (level.mode === 'intervals') expect(q.notes[1] - q.notes[0]).toBeGreaterThan(0);
        if (level.mode === 'notes') expect(q.notes[0]).toBe(Number(q.answer));
        prev = q;
      }
    }
  });
});
