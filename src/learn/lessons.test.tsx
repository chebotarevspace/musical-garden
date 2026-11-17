import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LESSONS, lessonFor } from './lessons';
import { LEVELS } from '../lib/chords';
import { EXERCISES } from '../lib/exercises';

describe('lessons', () => {
  it('every lesson renders (all note codes and chord symbols parse)', () => {
    for (const lesson of LESSONS) {
      const html = renderToString(<lesson.Body />);
      expect(html.length, lesson.id).toBeGreaterThan(500);
    }
  });

  it('ids are unique', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });

  it('every trainer mode links to an existing lesson', () => {
    const ids = new Set(LESSONS.map((l) => l.id));
    for (const level of LEVELS) expect(ids.has(lessonFor('chords', { chordLevel: level.id }))).toBe(true);
    for (const ex of EXERCISES) expect(ids.has(lessonFor('fluency', { exerciseId: ex.id }))).toBe(true);
    for (const noteSource of ['code', 'staff']) for (const clef of ['treble', 'bass', 'grand']) for (const mode of ['naturals', 'accidentals'])
      expect(ids.has(lessonFor('notes', { noteSource, clef, mode }))).toBe(true);
    for (const chordMode of ['build', 'progressions', 'detect', 'circle']) expect(ids.has(lessonFor('chords', { chordMode, chordLevel: 'maj-cfg' }))).toBe(true);
    expect(ids.has(lessonFor('ear', {}))).toBe(true);
    expect(ids.has(lessonFor('songs', {}))).toBe(true);
  });
});
