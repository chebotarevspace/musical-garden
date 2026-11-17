import { PART0 } from './part0';
import { PART1 } from './part1';
import { PART2 } from './part2';
import { PART3 } from './part3';
import { PART4 } from './part4';
import type { Lesson } from './types';

export type { Lesson };

import { STAGES, type CourseSession, courseLessons } from '../../lib/course';

/** Every lesson written, in any order. */
export const ALL_LESSONS: Lesson[] = [...PART0, ...PART1, ...PART2, ...PART3, ...PART4];

const ORDER = courseLessons();
/** Lesson id → the course session it belongs to. */
export const LESSON_SESSION = new Map<string, CourseSession>(ORDER.map((x) => [x.lessonId, x.session]));

/** Lessons in course order; the part is the stage of the course. */
export const LESSONS: Lesson[] = [
  ...ORDER.map(({ lessonId, session }) => ({ ...ALL_LESSONS.find((l) => l.id === lessonId)!, part: `${STAGES.indexOf(session.stage as (typeof STAGES)[number]) + 1}. ${session.stage}` })),
  ...ALL_LESSONS.filter((l) => !LESSON_SESSION.has(l.id)),
];
export const LESSON_PARTS = [...new Set(LESSONS.map((l) => l.part))];
export const findLesson = (id: string) => LESSONS.find((l) => l.id === id) ?? LESSONS[0];
export const lessonNumber = (id: string) => LESSONS.findIndex((l) => l.id === id) + 1;

/** The next lesson of the course not read yet. */
export const nextLesson = (done: string[]): Lesson | undefined => LESSONS.find((l) => !done.includes(l.id));

/** Which lesson explains what the trainer is currently practising. */
export function lessonFor(
  section: string,
  opts: { noteSource?: string; clef?: string; mode?: string; exerciseId?: string; chordLevel?: string; chordMode?: string; melodyStep?: string; jamMode?: string; jamTask?: string; jamGroove?: string; jamSource?: string; songPart?: string },
): string {
  if (section === 'ear') return 'ear';
  if (section === 'songs') return opts.songPart === 'lead' ? 'lead-sheet' : 'patterns';
  if (section === 'jam') {
    if (opts.jamMode === 'call') return 'call-response';
    if (opts.jamMode === 'tasks') return opts.jamTask === 'blue-note' ? 'blues' : opts.jamTask === 'target-third' ? 'target-notes' : 'pentatonic';
    return opts.jamGroove === 'blues' && opts.jamSource !== 'song' && opts.jamSource !== 'prog' ? 'blues' : 'pentatonic';
  }
  if (section === 'drops') return 'rhythm';
  if (section === 'studio') return 'rhythm';
  if (section === 'chords' && opts.chordMode === 'progressions') return 'progressions';
  if (section === 'chords' && opts.chordMode === 'detect') return 'by-ear';
  if (section === 'chords' && opts.chordMode === 'circle') return 'circle';
  if (section === 'chords' && opts.chordMode === 'changes') return 'qs-smooth';
  if (section === 'chords' && opts.chordMode === 'rhythm') return 'qs-rhythm';
  if (section === 'notes' && opts.noteSource === 'hands') return 'grand-staff';
  if (section === 'notes' && opts.noteSource === 'tune') return opts.melodyStep === 'rhythm' ? 'melody-rhythm' : 'learn-melody';
  if (section === 'notes') {
    if (opts.noteSource === 'staff') return opts.clef === 'treble' ? 'treble' : 'bass';
    return opts.mode === 'accidentals' ? 'accidentals' : 'octaves';
  }
  if (section === 'fluency') {
    const id = opts.exerciseId ?? '';
    if (id === 'five-c-thirds') return 'intervals';
    if (id === 'scale-am' || id === 'arp-am') return 'minor';
    if (id.startsWith('scale')) return 'major';
    if (id.startsWith('arp')) return 'triads';
    return 'fingers';
  }
  const level = opts.chordLevel ?? '';
  if (level.startsWith('inv')) return 'inversions';
  if (['maj7', 'dom7', 'min7', 'half-dim', 'sevenths-all'].includes(level)) return 'sevenths';
  if (level === 'sus' || level === 'add') return 'color';
  if (level === 'dim-aug' || level.endsWith('white')) return 'diatonic';
  return 'triads';
}
