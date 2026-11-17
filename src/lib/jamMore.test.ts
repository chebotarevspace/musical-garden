import { describe, expect, it } from 'vitest';
import { DRUMS, barHits } from './drums';
import { GROOVES, chordIndexAt, cycleBeats, findJamKey, harmonyFromChords, harmonyFromGroove, makeCall, scoreAnswer } from './jam';
import { JAM_TASKS, type JamEvent } from './jamTasks';
import { chordPcs } from './chords';
import { findSong, keyById, planSong } from './songs';
import { lessonFor } from '../learn/lessons';

const rng = (seed = 3) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const blues = harmonyFromGroove(GROOVES[0], findJamKey(GROOVES[0], 'C'));

describe('drums', () => {
  it('every style fills a bar; swing pushes off-beats', () => {
    for (const d of DRUMS) {
      const hits = barHits(d, d.meter);
      expect(hits.length, d.id).toBeGreaterThan(3);
      expect(hits.every((h) => h.at >= 0 && h.at < d.meter)).toBe(true);
    }
    const shuffle = barHits(DRUMS.find((d) => d.id === 'shuffle')!, 4);
    expect(shuffle.some((h) => Math.abs(h.at - 0.66) < 0.01)).toBe(true);
  });
});

describe('jam harmony', () => {
  it('any song from the library becomes a jam', () => {
    const song = findSong('hotel-california');
    const h = harmonyFromChords(song.title, planSong(song, song.key).slots, keyById(song.key), song.meter);
    expect(h.chords.length).toBeGreaterThan(4);
    expect(cycleBeats(h)).toBe(h.beats.reduce((a, b) => a + b, 0));
    expect(chordIndexAt(h, 0)).toBe(0);
    expect(chordIndexAt(h, cycleBeats(h) - 0.1)).toBe(h.chords.length - 1);
    expect(h.minor).toBe(true);
  });

  it('the gardener’s call stays in the pentatonic and ends on a chord tone', () => {
    const r = rng();
    for (let i = 0; i < 30; i++) {
      const chord = blues.chords[i % blues.chords.length];
      const call = makeCall(blues, chord, r);
      expect(call.length).toBeGreaterThanOrEqual(3);
      const last = call[call.length - 1];
      expect(chordPcs(chord).map((x) => x % 12)).toContain(last.midi % 12);
      expect(call.every((n) => n.at < blues.meter)).toBe(true);
    }
  });

  it('answers: rhythm, scale and the final chord tone each earn a star', () => {
    const chord = blues.chords[0]; // C7
    const call = [
      { midi: 67, at: 0, dur: 1 },
      { midi: 70, at: 1, dur: 1 },
      { midi: 72, at: 2, dur: 1 },
    ];
    expect(scoreAnswer(call, [{ midi: 60, at: 0.05 }, { midi: 63, at: 1 }, { midi: 67, at: 2.1 }], chord, blues.scalePcs).stars).toBe(3);
    expect(scoreAnswer(call, [{ midi: 61, at: 0.5 }, { midi: 62, at: 3.5 }], chord, blues.scalePcs).stars).toBe(0);
    expect(scoreAnswer(call, [], chord, blues.scalePcs).stars).toBe(0);
  });
});

describe('jam tasks', () => {
  const ev = (midi: number, beat: number, i = 0): JamEvent => ({ midi, beat, chordStart: Math.floor(beat / 4) * 4, chord: blues.chords[i] });

  it('one note in many rhythms', () => {
    const t = JAM_TASKS.find((x) => x.id === 'one-note')!;
    const same = Array.from({ length: 16 }, (_, i) => ev(60, i * 4)); // always on beat 1
    expect(t.measure(same, blues)).toBe(12);
    const varied = Array.from({ length: 16 }, (_, i) => ev(60, i * 0.5));
    expect(t.measure(varied, blues)).toBe(16);
  });

  it('target the third on the chord change, the blue note resolves', () => {
    const third = JAM_TASKS.find((x) => x.id === 'target-third')!;
    expect(third.measure([ev(64, 0), ev(64, 4.2), ev(65, 8)], blues)).toBe(2); // E is the 3rd of C7
    const blue = JAM_TASKS.find((x) => x.id === 'blue-note')!;
    expect(blue.measure([ev(66, 1), ev(67, 1.5), ev(66, 3), ev(62, 3.5)], blues)).toBe(1); // F# → G (chord tone)
  });

  it('theory links for the jam modes', () => {
    expect(lessonFor('jam', { jamMode: 'call' })).toBe('call-response');
    expect(lessonFor('jam', { jamMode: 'tasks', jamTask: 'blue-note' })).toBe('blues');
    expect(lessonFor('jam', { jamMode: 'tasks', jamTask: 'target-third' })).toBe('target-notes');
    expect(lessonFor('jam', { jamMode: 'free', jamGroove: 'pop' })).toBe('pentatonic');
  });
});

import { JAM_IDEAS, scaleNoteNames } from './jam';

describe('jam chart text', () => {
  it('scale notes are spelled from the tonic, the blue note as a raised fourth', () => {
    expect(scaleNoteNames(blues, blues.scalePcs)).toEqual(['C', 'E♭', 'F', 'F♯', 'G', 'B♭']);
    const pop = harmonyFromGroove(GROOVES[1], findJamKey(GROOVES[1], 'G'));
    expect(scaleNoteNames(pop, pop.scalePcs)).toEqual(['G', 'A', 'B', 'D', 'E']);
    expect(blues.key.id).toBe('C');
    expect(JAM_IDEAS.length).toBeGreaterThanOrEqual(8);
  });
});
