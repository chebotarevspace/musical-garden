import { describe, expect, it } from 'vitest';
import { detectKey, normalizeChord, parseChordSheet } from './songImport';
import { parseChord } from './chordSymbols';

describe('chord sheet import', () => {
  it('normalises chord spellings', () => {
    expect(normalizeChord('Am')?.symbol).toBe('Am');
    expect(normalizeChord('F#m7')?.symbol).toBe('F#m7');
    expect(normalizeChord('Bbmaj7')?.symbol).toBe('Bbmaj7');
    expect(normalizeChord('Cmaj9')).toEqual({ symbol: 'Cmaj7', warning: 'Cmaj9 упрощён до maj7' });
    expect(normalizeChord('G/B')?.symbol).toBe('G/B');
    expect(normalizeChord('Dsus')?.symbol).toBe('Dsus4');
    expect(normalizeChord('H7', true)?.symbol).toBe('B7');
    expect(normalizeChord('B', true)?.symbol).toBe('Bb');
    expect(normalizeChord('Hello')).toBeNull();
    expect(normalizeChord('the')).toBeNull();
  });

  it('parses chords over lyrics, splitting words by chord position', () => {
    const r = parseChordSheet(
      ['Куплет 1:', 'C              G', 'Oh, when the saints go marching', 'Am         F', 'In the morning light', '', 'Припев:', 'C   G   C'].join('\n'),
    );
    expect(r.lines).toHaveLength(3);
    expect(r.lines[0]).toEqual([
      { chords: ['C'], text: 'Oh, when the' },
      { chords: ['G'], text: 'saints go marching' },
    ]);
    expect(r.lines[1].map((b) => b.chords[0])).toEqual(['Am', 'F']);
    expect(r.lines[2].map((b) => b.chords[0])).toEqual(['C', 'G', 'C']);
    expect(r.lines[2].every((b) => b.text === '')).toBe(true);
    expect(r.keyId).toBe('C');
  });

  it('parses inline ChordPro', () => {
    const r = parseChordSheet('[Am]There is a [C]house in [D]New Or[F]leans');
    expect(r.bars.map((b) => b.chords[0])).toEqual(['Am', 'C', 'D', 'F']);
    expect(r.bars[0].text).toBe('There is a');
    expect(r.bars[3].text).toBe('leans');
  });

  it('groups two chords per bar on request', () => {
    const r = parseChordSheet('C G Am F', { chordsPerBar: 2 });
    expect(r.bars.map((b) => b.chords)).toEqual([['C', 'G'], ['Am', 'F']]);
  });

  it('understands Russian H/B naming', () => {
    const r = parseChordSheet('Em  H7  Em\nТекст песни тут');
    expect(r.bars.map((b) => b.chords[0])).toEqual(['Em', 'B7', 'Em']);
    expect(r.keyId).toBe('Em');
  });

  it('detects major and minor keys', () => {
    const k = (s: string) => detectKey(s.split(' ').map((x) => parseChord(x)));
    expect(k('G D Em C G')).toBe('G');
    expect(k('Am F C G Am')).toBe('Am');
    expect(k('F Bb C7 F')).toBe('F');
    expect(k('D A Bm G')).toBe('D');
  });
});
