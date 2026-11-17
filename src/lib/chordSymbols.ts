/** Chord symbols ("C", "Am7", "F/C", "B♭maj7") ↔ Chord objects. */
import { type Chord, type QualityId, chordPcs } from './chords';
import { type Letter, codeToMidi } from './notes';

const SUFFIX: Record<string, QualityId> = {
  '': 'maj', m: 'min', dim: 'dim', '°': 'dim', aug: 'aug', '+': 'aug',
  maj7: 'maj7', '7': 'dom7', m7: 'min7', 'm7♭5': 'm7b5', m7b5: 'm7b5', dim7: 'dim7', '°7': 'dim7',
  sus2: 'sus2', sus4: 'sus4', add9: 'add9', '6': 'six', m6: 'm6',
};

/** "C", "Am7", "F/C", "B♭maj7" → Chord (bass inversion from the slash part). */
export function parseChord(symbol: string): Chord {
  const m = /^([A-G])([♯♭#b]?)(.*?)(?:\/([A-G][♯♭#b]?))?$/.exec(symbol);
  if (!m) throw new Error(`Bad chord: ${symbol}`);
  const alter = m[2] === '♯' || m[2] === '#' ? 1 : m[2] ? -1 : 0;
  const quality = SUFFIX[m[3]];
  if (!quality) throw new Error(`Unknown chord suffix: ${symbol}`);
  const chord: Chord = { root: { letter: m[1] as Letter, alter }, quality, inversion: 0, bassRequired: false };
  if (m[4]) {
    const bassMidi = codeToMidi(`${m[4]}4`)!;
    const idx = chordPcs(chord).indexOf(((bassMidi % 12) + 12) % 12);
    if (idx > 0) chord.inversion = idx;
  }
  return chord;
}

