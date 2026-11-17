import { describe, expect, it } from 'vitest';
import { parseMidi } from './midiFile';
import { EXAMPLES, melodyFromTrack, melodyToText, melodyTracks, monophonic, parseMelodyText, phrasesOf, quantizeNotes, sliceBars } from './melodyModel';
import { parseMelodies } from './myMelodies';

/** Builds a tiny SMF: format 1, track 0 tempo + 3/4, track 1 a melody, track 2 chords. */
function smf(): Uint8Array {
  const vlq = (n: number) => {
    const out = [n & 0x7f];
    while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
    return out;
  };
  const track = (events: number[]) => {
    const body = [...events, 0x00, 0xff, 0x2f, 0x00];
    const len = body.length;
    return [0x4d, 0x54, 0x72, 0x6b, (len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255, ...body];
  };
  const ppq = 96;
  const t0 = track([0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20, 0x00, 0xff, 0x58, 0x04, 0x03, 0x02, 0x18, 0x08]); // 120 bpm, 3/4
  const name = [...new TextEncoder().encode('Мелодия')];
  const mel: number[] = [0x00, 0xff, 0x03, name.length, ...name];
  for (const [i, note] of [64, 65, 67, 69].entries()) {
    mel.push(...vlq(i === 0 ? 0 : 0), 0x90, note, 100, ...vlq(ppq), 0x80, note, 0); // quarter notes back to back
  }
  const chords: number[] = [];
  for (const n of [48, 52, 55]) chords.push(0x00, 0x91, n, 80);
  chords.push(...vlq(ppq * 3), 0x81, 48, 0, 0x00, 0x81, 52, 0, 0x00, 0x81, 55, 0);
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, 3, 0, ppq];
  return new Uint8Array([...head, ...t0, ...track(mel), ...track(chords)]);
}

describe('MIDI file', () => {
  it('reads tempo, meter, tracks and notes in beats', () => {
    const song = parseMidi(smf());
    expect(song.bpm).toBe(120);
    expect(song.meter).toBe(3);
    expect(song.tracks).toHaveLength(2);
    const mel = song.tracks.find((t) => t.name === 'Мелодия')!;
    expect(mel.notes.map((n) => [n.midi, n.start, n.dur])).toEqual([[64, 0, 1], [65, 1, 1], [67, 2, 1], [69, 3, 1]]);
  });

  it('suggests the melody track first and turns it into a melody', () => {
    const song = parseMidi(smf());
    const tracks = melodyTracks(song);
    expect(tracks[0].name).toBe('Мелодия');
    const m = melodyFromTrack(tracks[0], song, 'Тест');
    expect(m.meter).toBe(3);
    expect(m.tempo).toBe(120);
    expect(m.notes.map((n) => n.midi)).toEqual([64, 65, 67, 69]);
  });

  it('rejects files that are not MIDI', () => {
    expect(() => parseMidi(new TextEncoder().encode('hello world, not midi'))).toThrow(/не MIDI/);
  });
});

describe('melody model', () => {
  it('chords become one line (highest note), timing snaps to a 16th grid', () => {
    const mono = monophonic([
      { midi: 60, beat: 0, dur: 1 },
      { midi: 64, beat: 0, dur: 1 },
      { midi: 62, beat: 1.02, dur: 0.97 },
    ]);
    expect(mono.map((n) => n.midi)).toEqual([64, 62]);
    expect(quantizeNotes(mono, 4).map((n) => [n.beat, n.dur])).toEqual([[0, 1], [1, 1]]);
  });

  it('typed melodies: durations, rests, sharps and flats; round trip to text', () => {
    const notes = parseMelodyText('C4 D4:0.5 E4:0.5 | R:1 F#4:2 Bb3');
    expect(notes.map((n) => [n.midi, n.beat, n.dur])).toEqual([[60, 0, 1], [62, 1, 0.5], [64, 1.5, 0.5], [66, 3, 2], [58, 5, 1]]);
    expect(parseMelodyText(melodyToText(notes))).toEqual(notes);
    expect(() => parseMelodyText('C4 X9')).toThrow(/X9/);
  });

  it('phrases: split at rests or every two bars, 3–10 notes each', () => {
    for (const ex of EXAMPLES) {
      const ph = phrasesOf(ex);
      expect(ph.length, ex.id).toBeGreaterThanOrEqual(2);
      expect(ph[0].from).toBe(0);
      expect(ph[ph.length - 1].to).toBe(ex.notes.length);
      for (const p of ph) expect(p.to - p.from).toBeGreaterThanOrEqual(3);
    }
  });

  it('a part of a song by bars', () => {
    const notes = parseMelodyText('C4 D4 E4 F4 G4 A4 B4 C5');
    expect(sliceBars(notes, 4, 2, 3).map((n) => [n.midi, n.beat])).toEqual([[67, 0], [69, 1], [71, 2], [72, 3]]);
  });

  it('stored melodies are validated', () => {
    expect(parseMelodies([{ id: 'a', title: 'x', notes: [{ midi: 60, beat: 0, dur: 1 }, { midi: 62, beat: 1, dur: 1 }] }, { bad: 1 }])).toHaveLength(1);
  });
});

import { melodyToSong, melodyPhraseForEar } from './melodyLinks';
import { planSong } from './songs';
import { lessonFor } from '../learn/lessons';

describe('melody links', () => {
  const mine = { ...EXAMPLES[0], id: 'mel-1', source: 'midi' as const, stars: [5, 2] };

  it('a melody becomes a playable song with chords', () => {
    const song = melodyToSong(mine);
    const plan = planSong(song, song.key);
    expect(plan.melody.map((n) => n.midi)).toEqual(mine.notes.map((n) => n.midi));
    expect(plan.slots.length).toBe(plan.bars.length);
  });

  it('ear training takes phrases from my melodies', () => {
    const p = melodyPhraseForEar([mine], () => 0);
    expect(p).toEqual(mine.notes.slice(0, 7).map((n) => n.midi).slice(0, p!.length));
    expect(melodyPhraseForEar([])).toBeNull();
  });

  it('the theory link points to the new lessons', () => {
    expect(lessonFor('notes', { noteSource: 'tune', melodyStep: 'listen' })).toBe('learn-melody');
    expect(lessonFor('notes', { noteSource: 'tune', melodyStep: 'rhythm' })).toBe('melody-rhythm');
  });
});
