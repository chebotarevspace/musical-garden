import { describe, expect, it } from 'vitest';
import { chordSymbol } from './chords';
import { parseChord } from './chordSymbols';
import { PATTERNS, realize } from './patterns';
import { voiceLead } from './progressions';
import { SONGS, chordNumeral, findSong, keyById, keysFor, planSong, transposeChord } from './songs';

describe('patterns', () => {
  const c = parseChord('C');
  const v = [60, 64, 67];
  it('every pattern produces notes inside its bar, for both meters', () => {
    for (const p of PATTERNS) for (const meter of [3, 4] as const) {
      const ev = realize(p, meter, c, v, meter * 2);
      expect(ev.length, p.id).toBeGreaterThan(0);
      for (const e of ev) {
        expect(e.at + e.len).toBeLessThanOrEqual(meter * 2);
        for (const m of e.midis) expect([36, 43, 48, 60, 64, 67]).toContain(m);
      }
    }
  });
  it('broken chord walks 1-3-5-3 with the bass underneath', () => {
    const ev = realize(PATTERNS.find((p) => p.id === 'broken')!, 4, c, v, 8);
    expect(ev.filter((e) => e.hand === 'R').map((e) => e.midis[0])).toEqual([60, 64, 67, 64, 60, 64, 67, 64]);
    expect(ev.find((e) => e.hand === 'L')?.midis).toEqual([36]);
  });
  it('half-bar slots get only the first half of the pattern', () => {
    const ev = realize(PATTERNS.find((p) => p.id === 'quarters')!, 4, c, v, 4);
    expect(Math.max(...ev.map((e) => e.at + e.len))).toBe(4);
  });
});

describe('songs', () => {
  it('every song parses and fills whole bars', () => {
    for (const s of SONGS) {
      const plan = planSong(s, s.key);
      expect(plan.bars.length, s.id).toBeGreaterThan(3);
      for (const bar of plan.bars) expect(bar.chords.length).toBeGreaterThan(0);
      expect(plan.slots.reduce((a, x) => a + x.beats, 0)).toBe(plan.bars.length * s.meter);
      expect(keysFor(s).some((k) => k.id === s.key)).toBe(true);
      expect(voiceLead(plan.slots.map((x) => x.chord)).length).toBe(plan.slots.length);
    }
  });

  it('chord charts: many genres, harmony only for copyrighted songs', async () => {
    const { CHARTS } = await import('./songCharts');
    const groups = new Set(CHARTS.map((c) => c.group));
    expect(groups.size).toBeGreaterThanOrEqual(8);
    expect(new Set(SONGS.map((s) => s.id)).size).toBe(SONGS.length);
    for (const c of CHARTS) {
      const s = findSong(c.id);
      expect(s.id).toBe(c.id);
      for (const sec of c.sections) {
        for (const sym of sec.bars.split(/\s+/)) expect(() => parseChord(sym), `${c.id}: ${sym}`).not.toThrow();
        if (sec.words) expect(sec.words.length, c.id).toBe(sec.bars.split(/\s+/).length);
      }
      // Melodies only where the song is in the public domain (they carry the year).
      if (c.melody) expect(c.origin, c.id).toMatch(/1[0-9]{3}|народн/);
      if (c.melody) expect(planSong(s, s.key).melody.length).toBeGreaterThan(0);
    }
  });

  it('transposes with correct spelling', () => {
    const t = (sym: string, from: string, to: string) => chordSymbol(transposeChord(parseChord(sym), keyById(from), keyById(to)));
    expect(t('G7', 'C', 'F')).toBe('C7');
    expect(t('F', 'C', 'D')).toBe('G');
    expect(t('C7', 'C', 'Bb')).toBe('B♭7');
    expect(t('E', 'Am', 'Em')).toBe('B');
    expect(t('D', 'Am', 'Dm')).toBe('G');
    expect(t('Dm', 'Am', 'F#m')).toBe('Bm');
  });

  it('Saints in G uses G, C, D7', () => {
    const plan = planSong(findSong('saints'), 'G');
    const used = new Set(plan.slots.map((x) => chordSymbol(x.chord)));
    expect([...used].sort()).toEqual(['C', 'D7', 'G', 'G7']);
  });

  it('names chords with Roman numerals', () => {
    const C = keyById('C');
    expect(chordNumeral(parseChord('G7'), C)).toBe('V7');
    expect(chordNumeral(parseChord('Am'), C)).toBe('vi');
    expect(chordNumeral(parseChord('F'), C)).toBe('IV');
    const Am = keyById('Am');
    expect(chordNumeral(parseChord('E'), Am)).toBe('V');
    expect(chordNumeral(parseChord('D'), Am)).toBe('IV');
    expect(chordNumeral(parseChord('F'), Am)).toBe('VI');
  });
});

describe('song melodies', () => {
  it('Twinkle melody follows the bars and stays on the staff when transposed', () => {
    const c = planSong(findSong('twinkle'), 'C');
    expect(c.melody.slice(0, 4).map((n) => n.code)).toEqual(['C4', 'C4', 'G4', 'G4']);
    expect(Math.max(...c.melody.map((n) => n.bar))).toBe(c.bars.length - 1);
    for (const k of ['G', 'F', 'D', 'Bb', 'E']) {
      const m = planSong(findSong('twinkle'), k).melody.map((n) => n.midi);
      expect(Math.min(...m), k).toBeGreaterThanOrEqual(57);
      expect(Math.max(...m), k).toBeLessThanOrEqual(84);
    }
    expect(planSong(findSong('twinkle'), 'F').melody[0].code).toBe('F4');
    expect(planSong(findSong('ode-to-joy'), 'Bb').melody[0].code).toBe('D5');
  });
});
