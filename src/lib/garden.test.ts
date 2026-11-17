import { describe, expect, it } from 'vitest';
import { GROW_MS, growthStage, seasonOf, speciesFor } from './garden';
import { SPRITES } from '../components/garden/sprites';
import { emptyProgress, progress } from './progress';

describe('garden', () => {
  it('every sprite is 12×16', () => {
    for (const [name, rows] of Object.entries(SPRITES)) {
      expect(rows, name).toHaveLength(16);
      for (const r of rows) expect(r.length, `${name}: ${r}`).toBeLessThanOrEqual(12);
    }
  });

  it('species follows what was practised most', () => {
    expect(speciesFor({ startedAt: 0, activeMs: 1, bySection: { notes: 5, ear: 9 } }).species).toBe('sunflower');
    expect(speciesFor({ startedAt: 0, activeMs: 1, bySection: { chords: 9 }, chordMode: 'progressions' }).species).toBe('maple');
    expect(speciesFor({ startedAt: 0, activeMs: 1, bySection: { songs: 9 }, rare: 'level' }).species).toBe('lotus');
  });

  it('growth, seasons and weather', () => {
    expect([0, 0.2, 0.6, 1].map(growthStage)).toEqual([0, 1, 2, 3]);
    expect([0, 3, 6, 9, 11].map(seasonOf)).toEqual(['winter', 'spring', 'summer', 'autumn', 'winter']);
  });

  it('active play grows a plant after GROW_MS', () => {
    progress.replace(emptyProgress());
    let t = Date.now();
    progress.recordActivity('fluency', t);
    // keys every 10 s (counted), until the plant is grown
    for (let i = 0; i < GROW_MS / 10_000 + 1; i++) {
      t += 10_000;
      progress.recordActivity('fluency', t);
    }
    const p = progress.get();
    expect(p.plants).toHaveLength(1);
    expect(p.plants[0].species).toBe('bamboo');
    expect(p.sprout === null || p.sprout.activeMs < GROW_MS).toBe(true);
  });

  it('a completed level makes the next plant rare', () => {
    progress.replace(emptyProgress());
    for (let i = 0; i < 10; i++) progress.bumpLevel('chordLevels', 'maj-cfg');
    expect(progress.get().sprout?.rare).toBe('level');
  });
});
