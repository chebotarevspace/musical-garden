import { describe, expect, it } from 'vitest';
import { ALL_LESSONS, LESSONS } from '../learn/lessons';
import { SESSIONS, STAGES, currentSession } from './course';
import { CHANGE_SETS } from './changes';
import { LEVELS } from './chords';
import { HANDS_LEVELS } from './handsReading';
import { EXERCISES } from './exercises';
import { SONGS } from './songs';
import { PATTERNS } from './patterns';
import { PROGRESSIONS } from './progressions';

describe('the course', () => {
  it('every lesson is used exactly once, in session order', () => {
    const used = SESSIONS.flatMap((s) => s.steps.filter((x) => x.kind === 'theory').map((x) => x.patch.lessonId!));
    expect(new Set(used).size).toBe(used.length);
    expect(used.sort()).toEqual(ALL_LESSONS.map((l) => l.id).sort());
    expect(LESSONS.length).toBe(ALL_LESSONS.length);
  });

  it('sessions have unique ids, known stages and a few steps each', () => {
    expect(new Set(SESSIONS.map((s) => s.id)).size).toBe(SESSIONS.length);
    for (const s of SESSIONS) {
      expect(s.steps.length).toBeGreaterThanOrEqual(4);
      expect(STAGES).toContain(s.stage);
      expect(s.goal.length).toBeGreaterThan(10);
    }
  });

  it('every practice step points to something that exists', () => {
    for (const s of SESSIONS)
      for (const x of s.steps) {
        const p = x.patch;
        const where = `${s.id} ${x.title}`;
        if (p.chordLevel) expect(LEVELS.map((l) => l.id), where).toContain(p.chordLevel);
        if (p.changesSet) expect(CHANGE_SETS.map((c) => c.id), where).toContain(p.changesSet);
        if (p.handsLevel) expect(HANDS_LEVELS.map((l) => l.id), where).toContain(p.handsLevel);
        if (p.exerciseId) expect(EXERCISES.map((e) => e.id), where).toContain(p.exerciseId);
        if (p.songId) expect(SONGS.map((e) => e.id), where).toContain(p.songId);
        if (p.jamSongId) expect(SONGS.map((e) => e.id), where).toContain(p.jamSongId);
        if (p.pattern) expect(PATTERNS.map((e) => e.id), where).toContain(p.pattern);
        if (p.progressionId) expect(PROGRESSIONS.map((e) => e.id), where).toContain(p.progressionId);
        if (p.songPart === 'lead') expect(SONGS.find((e) => e.id === p.songId)?.melody?.length, where).toBeGreaterThan(0);
      }
  });

  it('the base comes before chords', () => {
    const first = (pred: (id: string) => boolean) => SESSIONS.findIndex((s) => s.steps.some((x) => x.patch.lessonId && pred(x.patch.lessonId)));
    expect(first((id) => id === 'treble')).toBeLessThan(first((id) => id === 'triads'));
    expect(first((id) => id === 'grand-staff')).toBeLessThan(first((id) => id === 'triads'));
    expect(currentSession([]).id).toBe('s01');
    expect(currentSession(['s01', 's02']).id).toBe('s03');
  });
});
