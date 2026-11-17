import { describe, expect, it } from 'vitest';
import { codeToMidi, midiToNote } from './notes';
import { CLEF_BOUNDS, clefFor, ledgerSteps, staffStep } from './staff';
import { EXERCISES, exerciseSteps, fluencyPress, startFluency } from './exercises';
import {
  LEVELS,
  QUALITIES,
  ROOTS,
  chordSymbol,
  chordTones,
  chordVoicing,
  matchChord,
  noteText,
  pickChord,
  type Chord,
} from './chords';

const n = (code: string, spelling: 'sharp' | 'flat' = 'sharp') => midiToNote(codeToMidi(code)!, spelling);
const root = (code: string) => ({ letter: code[0] as 'C', alter: code[1] === '#' ? 1 : code[1] === 'b' ? -1 : 0 });
const chord = (r: string, quality: Chord['quality'], inversion = 0, bassRequired = false): Chord => ({
  root: root(r),
  quality,
  inversion,
  bassRequired,
});

describe('staff', () => {
  it('places reference notes', () => {
    expect(staffStep(n('E4'), 'treble')).toBe(0);
    expect(staffStep(n('F5'), 'treble')).toBe(8);
    expect(staffStep(n('C4'), 'treble')).toBe(-2);
    expect(staffStep(n('G2'), 'bass')).toBe(0);
    expect(staffStep(n('A3'), 'bass')).toBe(8);
    expect(staffStep(n('C4'), 'bass')).toBe(10);
  });

  it('uses the spelled letter for accidentals', () => {
    expect(staffStep(n('C#4', 'sharp'), 'treble')).toBe(-2);
    expect(staffStep(midiToNote(61, 'flat'), 'treble')).toBe(-1); // D♭4
  });

  it('draws ledger lines only outside the staff', () => {
    expect(ledgerSteps(4)).toEqual([]);
    expect(ledgerSteps(-2)).toEqual([-2]);
    expect(ledgerSteps(-3)).toEqual([-2]);
    expect(ledgerSteps(-4)).toEqual([-2, -4]);
    expect(ledgerSteps(12)).toEqual([10, 12]);
  });

  it('keeps every drawable note within two ledger lines', () => {
    for (const choice of ['treble', 'bass', 'grand'] as const) {
      const [lo, hi] = CLEF_BOUNDS[choice];
      for (let m = lo; m <= hi; m++) {
        for (const sp of ['sharp', 'flat'] as const) {
          const step = staffStep(midiToNote(m, sp), clefFor(choice, m));
          expect(step).toBeGreaterThanOrEqual(-4);
          expect(step).toBeLessThanOrEqual(12);
        }
      }
    }
  });
});

describe('exercises', () => {
  it('every exercise parses and both hands line up', () => {
    for (const ex of EXERCISES) {
      expect(ex.right.notes.length).toBe(ex.right.fingers.length);
      expect(ex.left.notes.length).toBe(ex.left.fingers.length);
      expect(ex.right.notes.length).toBe(ex.left.notes.length);
      for (const s of exerciseSteps(ex, 'both')) {
        expect(s.notes).toHaveLength(2);
        for (const note of s.notes) {
          expect(note.midi).toBeGreaterThanOrEqual(21);
          expect(note.finger).toBeGreaterThanOrEqual(1);
          expect(note.finger).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it('C major scale: right hand passes the thumb under after E', () => {
    const steps = exerciseSteps(EXERCISES.find((e) => e.id === 'scale-c')!, 'right');
    expect(steps.slice(0, 8).map((s) => s.notes[0].finger)).toEqual([1, 2, 3, 1, 2, 3, 4, 5]);
    expect(steps[0].notes[0].midi).toBe(60);
  });

  it('practice: right notes advance, wrong ones count mistakes, finishing restarts on the first note', () => {
    const steps = exerciseSteps(EXERCISES[0], 'right');
    let s = startFluency(steps);
    let r = fluencyPress(s, 62, 0);
    expect(r.result).toBe('wrong');
    expect(r.state.mistakes).toBe(1);
    s = r.state;
    for (const step of steps) s = fluencyPress(s, step.notes[0].midi, 10).state;
    expect(s.finishedAt).not.toBeNull();
    r = fluencyPress(s, steps[0].notes[0].midi, 20);
    expect(r.result).toBe('correct');
    expect(r.state.index).toBe(1);
    expect(r.state.mistakes).toBe(0);
  });

  it('both hands: a step completes only when both notes are played', () => {
    const steps = exerciseSteps(EXERCISES[0], 'both');
    let s = startFluency(steps);
    s = fluencyPress(s, 60, 0).state;
    expect(s.index).toBe(0);
    s = fluencyPress(s, 48, 0).state;
    expect(s.index).toBe(1);
  });
});

describe('chords', () => {
  it('spells chord tones correctly', () => {
    expect(chordTones(chord('C', 'maj')).map(noteText)).toEqual(['C', 'E', 'G']);
    expect(chordTones(chord('A', 'min')).map(noteText)).toEqual(['A', 'C', 'E']);
    expect(chordTones(chord('Eb', 'maj')).map(noteText)).toEqual(['E♭', 'G', 'B♭']);
    expect(chordTones(chord('F#', 'min')).map(noteText)).toEqual(['F♯', 'A', 'C♯']);
    expect(chordTones(chord('B', 'm7b5')).map(noteText)).toEqual(['B', 'D', 'F', 'A']);
    expect(chordTones(chord('C', 'dim7')).map(noteText)).toEqual(['C', 'E♭', 'G♭', 'B𝄫']);
    expect(chordTones(chord('G', 'dom7')).map(noteText)).toEqual(['G', 'B', 'D', 'F']);
    expect(chordTones(chord('C', 'add9')).map(noteText)).toEqual(['C', 'E', 'G', 'D']);
  });

  it('formats symbols with inversions', () => {
    expect(chordSymbol(chord('C', 'maj'))).toBe('C');
    expect(chordSymbol(chord('A', 'min7'))).toBe('Am7');
    expect(chordSymbol(chord('B', 'm7b5'))).toBe('Bm7♭5');
    expect(chordSymbol(chord('C', 'maj', 1, true))).toBe('C/E');
  });

  it('accepts any voicing and octave', () => {
    const c = chord('C', 'maj');
    expect(matchChord(c, [60, 64, 67]).complete).toBe(true);
    expect(matchChord(c, [52, 60, 67, 72]).complete).toBe(true); // E3 C4 G4 C5
    expect(matchChord(c, [60, 64]).complete).toBe(false);
    const wrongKey = matchChord(c, [60, 63, 67]);
    expect(wrongKey.complete).toBe(false);
    expect(wrongKey.wrong).toEqual([63]);
  });

  it('inversion levels require the right bass', () => {
    const c1 = chord('C', 'maj', 1, true); // C/E
    expect(matchChord(c1, [64, 67, 72]).complete).toBe(true);
    const rootPos = matchChord(c1, [60, 64, 67]);
    expect(rootPos.complete).toBe(false);
    expect(rootPos.wrongBass).toBe(true);
  });

  it('demo voicing stacks upward from the bass', () => {
    expect(chordVoicing(chord('C', 'maj'))).toEqual([60, 64, 67]);
    expect(chordVoicing(chord('C', 'maj', 2))).toEqual([55, 60, 64]); // G3 C4 E4
    const v = chordVoicing(chord('A', 'min7'));
    expect(v[0]).toBe(57);
    expect(v).toEqual([...v].sort((a, b) => a - b));
  });

  it('every level produces valid, non-repeating chords', () => {
    for (const level of LEVELS) {
      let prev: Chord | null = null;
      for (let i = 0; i < 40; i++) {
        const c = pickChord(level, prev);
        expect(level.qualities).toContain(c.quality);
        expect(c.inversion).toBeLessThan(QUALITIES[c.quality].intervals.length);
        if (!level.inversions) expect(c.inversion).toBe(0);
        for (const t of chordTones(c)) expect(Math.abs(t.alter)).toBeLessThanOrEqual(2);
        if (prev) expect(chordSymbol(c) === chordSymbol(prev) && c.inversion === prev.inversion).toBe(false);
        prev = c;
      }
    }
    expect(ROOTS.allMajor).toHaveLength(12);
  });
});
