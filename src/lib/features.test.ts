import { describe, expect, it } from 'vitest';
import { makeEarPhrase } from './earMelody';
import { levelsFor } from './ear';
import { GROOVES, colourOf, findJamKey, planJam } from './jam';
import { QUESTS, questFor, weekOf } from './quests';
import { emptyProgress, progress } from './progress';
import { OUTFITS, SECRET_TUNE, makeVisitTask } from './gardener';
import { SPRITES } from '../components/garden/sprites';
import { COMMON_SPECIES, RARE_SPECIES, SEASONAL_SPECIES, SPECIES_INFO } from './garden';

const rng = (seed = 7) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe('repeat the melody', () => {
  it('phrases have the level length, stay on white keys and in range', () => {
    const r = rng();
    for (const l of levelsFor('melody').filter((x) => x.id !== 'm-songs' && x.id !== 'm-mine')) {
      for (let i = 0; i < 30; i++) {
        const p = makeEarPhrase(l.id, null, r);
        expect(p.length).toBe({ 'm-3step': 3, 'm-4step': 4, 'm-4skip': 4, 'm-5skip': 5, 'm-6': 6 }[l.id]);
        expect(p.every((m) => ![1, 3, 6, 8, 10].includes(m % 12))).toBe(true);
      }
    }
    expect(makeEarPhrase('m-3step', null, r)[0]).toBe(60);
  });

  it('step levels move by neighbouring white keys only', () => {
    const r = rng(3);
    for (let i = 0; i < 30; i++) {
      const p = makeEarPhrase('m-4step', null, r);
      for (let k = 1; k < p.length; k++) expect(Math.abs(p[k] - p[k - 1])).toBeLessThanOrEqual(2);
    }
  });

  it('song phrases come from the library', () => {
    const p = makeEarPhrase('m-songs', null, rng(5));
    expect(p.length).toBeGreaterThanOrEqual(4);
  });
});

describe('jam', () => {
  it('every groove plans chords and voicings in every key', () => {
    for (const g of GROOVES) {
      const plan = planJam(g, findJamKey(g, ''));
      expect(plan.chords.length).toBe(g.numerals.split(' ').length);
      expect(plan.voicings.length).toBe(plan.chords.length);
    }
  });

  it('notes get colours: chord tone, scale, spice', () => {
    const g = GROOVES.find((x) => x.id === 'pop')!;
    const plan = planJam(g, findJamKey(g, 'C'));
    expect(colourOf(64, plan.chords[0], plan.scalePcs)).toBe('chord'); // E in C
    expect(colourOf(62, plan.chords[0], plan.scalePcs)).toBe('scale'); // D, pentatonic
    expect(colourOf(66, plan.chords[0], plan.scalePcs)).toBe('spice'); // F#
  });
});

describe('weekly quests', () => {
  it('weeks start on Monday and quests rotate', () => {
    const w = weekOf(new Date('2026-11-18T12:00:00').getTime()); // Wednesday
    expect(w.key).toBe('2026-11-16');
    expect(w.days).toHaveLength(7);
    const next = weekOf(new Date('2026-11-25T12:00:00').getTime());
    expect(questFor(next).id).not.toBe(questFor(w).id);
  });

  it('measures count this week only', () => {
    const w = weekOf(new Date('2026-11-18T12:00:00').getTime());
    const p = { ...emptyProgress(), days: { '2026-11-16': { activeMs: 600000, bySection: { chords: 600000 }, actions: 5 }, '2026-11-09': { activeMs: 9e6, bySection: { chords: 9e6 }, actions: 5 } } };
    expect(QUESTS.find((q) => q.id === 'chords20')!.measure(p, w)).toBe(10);
    expect(QUESTS.find((q) => q.id === 'days4')!.measure(p, w)).toBe(1);
  });

  it('claiming plants a seasonal flower once', () => {
    progress.replace(emptyProgress());
    progress.claimQuest('2026-11-16', 'chords');
    progress.claimQuest('2026-11-16', 'chords');
    const p = progress.get();
    expect(p.plants).toHaveLength(1);
    expect(Object.values(SEASONAL_SPECIES)).toContain(p.plants[0].species);
  });
});

describe('gardener', () => {
  it('every species has a sprite and info', () => {
    for (const sp of [...COMMON_SPECIES, ...RARE_SPECIES, ...Object.values(SEASONAL_SPECIES)]) {
      expect(SPRITES[sp], sp).toHaveLength(16);
      expect(SPECIES_INFO[sp].name).toBeTruthy();
    }
  });

  it('outfits unlock with progress', () => {
    const p = emptyProgress();
    expect(OUTFITS.filter((o) => o.unlocked(p))).toHaveLength(0);
    const grown = { ...p, plants: Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, species: 'bell' as const, day: '2026-11-16', grownAt: 0, minutes: 10, from: 'notes' as const })) };
    expect(OUTFITS.filter((o) => o.unlocked(grown)).map((o) => o.id)).toEqual(expect.arrayContaining(['straw', 'cap']));
  });

  it('visit tasks: beginners get single white notes', () => {
    const r = rng(11);
    for (let i = 0; i < 20; i++) {
      const t = makeVisitTask('beginner', r);
      expect(t.pcs).toHaveLength(1);
      expect([0, 2, 4, 5, 7, 9, 11]).toContain(t.pcs[0]);
    }
  });

  it('secret tune is Twinkle, Twinkle', () => {
    const c = [60, 60, 67, 67, 69, 69, 67];
    expect(c.slice(1).map((m, i) => m - c[i])).toEqual(SECRET_TUNE);
  });
});
