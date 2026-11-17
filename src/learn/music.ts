/** Small helpers so lesson content can be written with plain codes ("C4", "B♭3") and chord symbols ("Am7", "C/E"). */
import { chordVoicing } from '../lib/chords';
import { parseChord } from '../lib/chordSymbols';
import { type Letter, type NoteName, codeToMidi, scientificOctave } from '../lib/notes';

export function noteFromCode(code: string): NoteName {
  const midi = codeToMidi(code);
  if (midi === null) throw new Error(`Bad note code: ${code}`);
  const letter = code[0].toUpperCase() as Letter;
  const acc = code.includes('♯') || code.includes('#') ? 'sharp' : /^[A-Ga-g](♭|b)/.test(code) ? 'flat' : 'natural';
  // Octave of the written letter (B♯/C♭ never appear in lessons, so it matches the key).
  return { midi, letter, accidental: acc, octave: scientificOctave(midi) };
}

export const midiOf = (code: string | number) => (typeof code === 'number' ? code : codeToMidi(code)!);

export { parseChord } from '../lib/chordSymbols';

/** Comfortable voicing (MIDI numbers) for a chord symbol. */
export const voicingOf = (symbol: string) => chordVoicing(parseChord(symbol));
