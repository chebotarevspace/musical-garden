import { describe, expect, it } from 'vitest';
import { makeBackup, readBackup } from './backup';
import { dayKey, emptyProgress, parseProgress, progress, summarize, weakItems } from './progress';
import { DEFAULT_SETTINGS } from './storage';

describe('progress', () => {
  it('parsing drops garbage but keeps valid data', () => {
    const p = parseProgress({ lessonsDone: ['a', 3, null], chordLevels: { x: 2, y: 'no' }, items: { 'note:code:60': { seen: 2, misses: 1, last: 0 }, bad: 5 } });
    expect(p.lessonsDone).toEqual(['a']);
    expect(p.chordLevels).toEqual({ x: 2 });
    expect(Object.keys(p.items)).toEqual(['note:code:60']);
  });

  it('summarizes practice days and the current streak', () => {
    const p = emptyProgress();
    const day = 86_400_000;
    for (const back of [0, 1, 2, 5]) p.days[dayKey(Date.now() - back * day)] = { activeMs: 60_000, bySection: {}, actions: 10 };
    p.lessonsDone = ['keyboard'];
    p.chordLevels = { a: 10, b: 4 };
    const s = summarize(p);
    expect(s.practiceDays).toBe(4);
    expect(s.streak).toBe(3);
    expect(s.totalMinutes).toBe(4);
    expect(s.chordLevels).toBe(1);
  });

  it('finds weak items by miss rate', () => {
    const p = emptyProgress();
    p.items = {
      'note:code:61': { seen: 1, misses: 4, last: 0 },
      'note:code:60': { seen: 9, misses: 1, last: 0 },
      'note:code:62': { seen: 1, misses: 0, last: 0 },
      'chord:F#m': { seen: 0, misses: 5, last: 0 },
    };
    expect(weakItems(p, 'note:').map((w) => w.key)).toEqual(['note:code:61', 'note:code:60']);
  });

  it('records activity and resets by scope', () => {
    const t = Date.now();
    progress.replace(emptyProgress());
    progress.recordActivity('notes', t);
    progress.recordActivity('notes', t + 5000);
    progress.recordActivity('notes', t + 60_000); // long pause — not counted
    expect(progress.get().days[dayKey(t)].activeMs).toBe(5000);
    progress.recordItem('chord:C', false);
    progress.recordItem('note:code:60', true);
    progress.lessonDone('keyboard');
    progress.reset(['chords']);
    expect(Object.keys(progress.get().items)).toEqual(['note:code:60']);
    expect(progress.get().lessonsDone).toEqual(['keyboard']);
    progress.reset(['lessons', 'history']);
    expect(progress.get().lessonsDone).toEqual([]);
    expect(progress.get().days).toEqual({});
  });
});

describe('backup', () => {
  it('round-trips settings and progress', () => {
    const p = emptyProgress();
    p.lessonsDone = ['keyboard'];
    const b = readBackup(makeBackup({ ...DEFAULT_SETTINGS, tempo: 100 }, p));
    expect(b.settings.tempo).toBe(100);
    expect(b.progress.lessonsDone).toEqual(['keyboard']);
  });
  it('keeps the garden, story, own melodies and studio takes', () => {
    const p = { ...emptyProgress(), outfit: 'straw', counters: { 'ok:note': 5 }, story: { done: ['crow'], current: null, base: {} } };
    const song = { id: 'my-1', title: 'Т', origin: '', group: 'Мои песни', key: 'C', meter: 4 as const, tempo: 90, lines: [[{ chords: ['C'], text: '' }]], melody: ['C4 E4'], custom: true };
    const take = { id: 't1', at: 1, tempo: 80, click: true, notes: [{ midi: 60, on: 0, off: 300 }] };
    const b = readBackup(makeBackup(DEFAULT_SETTINGS, p, [song], [take]));
    expect(b.progress.outfit).toBe('straw');
    expect(b.progress.counters['ok:note']).toBe(5);
    expect(b.progress.story.done).toEqual(['crow']);
    expect(b.songs[0].melody).toEqual(['C4 E4']);
    expect(b.takes).toHaveLength(1);
  });
  it('remembers that the guided tour was shown', () => {
    expect(readBackup(makeBackup(DEFAULT_SETTINGS, { ...emptyProgress(), tourDone: true })).progress.tourDone).toBe(true);
    expect(emptyProgress().tourDone).toBe(false);
  });
  it('theme: light by default; dark only when the user picked it', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('light');
    const read = (s: object) => readBackup(makeBackup({ ...DEFAULT_SETTINGS, ...s }, emptyProgress())).settings.theme;
    expect(read({ theme: 'dark', themePicked: true })).toBe('dark');
    expect(read({ theme: 'dark', themePicked: false })).toBe('light'); // old saved default
    expect(read({ theme: 'neon', themePicked: true })).toBe('light');
  });
  it('rejects foreign files', () => {
    expect(() => readBackup('not json')).toThrow();
    expect(() => readBackup('{"app":"other"}')).toThrow(/Музыкального сада/);
  });
});
