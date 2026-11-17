/** Names whatever is held on the keyboard: a chord (with inversion), an interval, or a single note. */
import { type Chord, type QualityId, type SpelledNote, QUALITIES, ROOTS, chordPcs, chordTones, pcOf } from './chords';

const pc = (m: number) => ((m % 12) + 12) % 12;

export interface Interval {
  id: string;
  semitones: number;
  short: string;
  name: string;
}

export const INTERVALS: Interval[] = [
  { id: 'm2', semitones: 1, short: 'м2', name: 'малая секунда' },
  { id: 'M2', semitones: 2, short: 'б2', name: 'большая секунда' },
  { id: 'm3', semitones: 3, short: 'м3', name: 'малая терция' },
  { id: 'M3', semitones: 4, short: 'б3', name: 'большая терция' },
  { id: 'P4', semitones: 5, short: 'ч4', name: 'чистая кварта' },
  { id: 'TT', semitones: 6, short: 'тритон', name: 'тритон' },
  { id: 'P5', semitones: 7, short: 'ч5', name: 'чистая квинта' },
  { id: 'm6', semitones: 8, short: 'м6', name: 'малая секста' },
  { id: 'M6', semitones: 9, short: 'б6', name: 'большая секста' },
  { id: 'm7', semitones: 10, short: 'м7', name: 'малая септима' },
  { id: 'M7', semitones: 11, short: 'б7', name: 'большая септима' },
  { id: 'P8', semitones: 12, short: 'ч8', name: 'октава' },
];

export const intervalBySemitones = (n: number) => INTERVALS.find((i) => i.semitones === n);

/** Preference when several names fit the same notes (simpler first). */
const QUALITY_ORDER: QualityId[] = ['maj', 'min', 'dom7', 'min7', 'maj7', 'dim', 'aug', 'sus4', 'sus2', 'm7b5', 'dim7', 'six', 'm6', 'add9'];
const MINORISH: QualityId[] = ['min', 'min7', 'm7b5', 'dim', 'dim7', 'm6'];

function rootSpelling(rootPc: number, quality: QualityId): SpelledNote {
  const list = MINORISH.includes(quality) ? ROOTS.allMinor : ROOTS.allMajor;
  return list.find((r) => pcOf(r) === rootPc)!;
}

export interface DetectedChord {
  chord: Chord;
  /** Number of the held keys that are the bass (lowest). */
  bass: number;
}

/** All chord names that exactly match the held pitch classes, best first. */
export function detectChords(held: number[]): DetectedChord[] {
  if (held.length < 3) return [];
  const pcs = [...new Set(held.map(pc))];
  if (pcs.length < 3) return [];
  const bass = Math.min(...held);
  const bassPc = pc(bass);
  const found: { chord: Chord; score: number }[] = [];
  for (const rootPc of pcs) {
    for (const q of QUALITY_ORDER) {
      const set = QUALITIES[q].intervals.map((iv) => (rootPc + iv) % 12);
      if (set.length !== pcs.length || !set.every((x) => pcs.includes(x))) continue;
      const chord: Chord = { root: rootSpelling(rootPc, q), quality: q, inversion: 0, bassRequired: false };
      chord.inversion = Math.max(0, chordPcs(chord).indexOf(bassPc));
      // Root in the bass beats everything; then simpler qualities.
      const score = (chord.inversion === 0 ? 0 : 100) + QUALITY_ORDER.indexOf(q);
      found.push({ chord, score });
    }
  }
  return found.sort((a, b) => a.score - b.score).map((f) => ({ chord: f.chord, bass }));
}

/** Spelled names of the held keys, using the chord's spelling when it is known. */
export function spellHeld(held: number[], chord: Chord | null): { midi: number; name: string; degree?: string }[] {
  const sorted = [...held].sort((a, b) => a - b);
  const SHARP = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  if (!chord) return sorted.map((m) => ({ midi: m, name: SHARP[pc(m)] }));
  const tones = chordTones(chord);
  const pcs = chordPcs(chord);
  const degrees = QUALITIES[chord.quality].degrees;
  const acc = (a: number) => (a === 2 ? '𝄪' : a === 1 ? '♯' : a === -1 ? '♭' : a === -2 ? '𝄫' : '');
  return sorted.map((m) => {
    const i = pcs.indexOf(pc(m));
    return i >= 0 ? { midi: m, name: tones[i].letter + acc(tones[i].alter), degree: degrees[i] } : { midi: m, name: SHARP[pc(m)] };
  });
}
