import { describe, expect, it } from 'vitest';
import { DROPS_LEVELS, judge, makeDrops, pointsFor, stars } from './drops';
import { type Take, analyse, deviation, harmonize, quantize, takeToSong } from './studio';
import { CHAPTERS, storyState, taskProgress } from './story';
import { emptyProgress, progress } from './progress';
import { planSong } from './songs';
import { SPRITES } from '../components/garden/sprites';

const rng = (seed = 9) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe('drops', () => {
  it('every level makes notes on a rising beat grid', () => {
    for (const l of DROPS_LEVELS) {
      const d = makeDrops(l.id, rng());
      expect(d.length).toBeGreaterThan(5);
      for (let i = 1; i < d.length; i++) expect(d[i].beat).toBeGreaterThan(d[i - 1].beat);
      expect(d.every((x) => x.midi >= 55 && x.midi <= 84)).toBe(true);
    }
  });

  it('judging and scoring', () => {
    expect(judge(30)).toBe('perfect');
    expect(judge(-120)).toBe('good');
    expect(judge(400)).toBe('miss');
    expect(pointsFor('perfect', 10)).toBe(200);
    expect(pointsFor('miss', 10)).toBe(0);
    expect([0.99, 0.85, 0.65, 0.3].map(stars)).toEqual([3, 2, 1, 0]);
  });
});

const take = (notes: [number, number][], tempo = 120): Take => ({
  id: 't',
  at: 0,
  tempo,
  click: true,
  notes: notes.map(([midi, on]) => ({ midi, on, off: on + 200 })),
});

describe('studio', () => {
  it('deviation is measured to the nearest eighth', () => {
    expect(deviation(260, 120)).toBe(10); // eighth = 250 ms
    expect(deviation(230, 120)).toBe(-20);
  });

  it('analysis tells rushing from dragging', () => {
    const early = take([[60, 0], [62, 440], [64, 940], [65, 1440]]);
    expect(analyse(early).meanSigned).toBeLessThan(0);
    expect(analyse(take([[60, 0], [62, 500], [64, 1000]])).onTime).toBe(1);
  });

  it('quantises a C-major tune into bars and harmonises it', () => {
    // 120 bpm: a bar = 2000 ms. C D E F | G A G E | C
    const t = take([[60, 0], [62, 500], [64, 1000], [65, 1500], [67, 2000], [69, 2500], [67, 3000], [64, 3500], [60, 4000]]);
    const bars = quantize(t);
    expect(bars).toEqual([[60, 62, 64, 65], [67, 69, 67, 64], [60]]);
    const h = harmonize(bars);
    expect(h.keyId).toBe('C');
    expect(h.chords[0]).toBe('C');
    expect(h.chords[2]).toBe('C');
    const song = takeToSong('Тест', t)!;
    const plan = planSong(song, song.key);
    expect(plan.melody.map((n) => n.midi)).toEqual([60, 62, 64, 65, 67, 69, 67, 64, 60]);
  });
});

describe('story', () => {
  it('chapters progress by counters since the chapter began', () => {
    progress.replace(emptyProgress());
    const st = storyState(progress.get());
    expect(st.kind).toBe('ready');
    progress.recordItem('note:code:60', true); // before the chapter — doesn't count
    progress.startChapter('crow');
    for (let i = 0; i < 5; i++) progress.recordItem('note:code:60', true);
    const task = CHAPTERS[0].tasks[0];
    expect(taskProgress(progress.get(), task)).toBe(5);
    const s2 = storyState(progress.get());
    expect(s2.kind === 'active' && s2.done[0]).toBe(false);
  });

  it('finishing a chapter grows a magic flower; the next waits a week', () => {
    progress.replace(emptyProgress());
    progress.startChapter('crow');
    progress.finishChapter('crow');
    const p = progress.get();
    expect(p.plants.map((x) => x.species)).toEqual(['magic']);
    expect(storyState(p).kind).toBe('wait');
  });

  it('new sprites exist', () => {
    for (const sp of ['iris', 'magic'] as const) expect(SPRITES[sp]).toHaveLength(16);
  });
});
