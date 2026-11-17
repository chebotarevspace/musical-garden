/**
 * Chord progressions written in Roman numerals and realised in any key,
 * plus voice leading: each chord is voiced as close as possible to the previous one.
 */
import { type Chord, type QualityId, type SpelledNote, QUALITIES, chordPcs, pcOf } from './chords';
import type { Letter } from './notes';

export interface ProgChord {
  degree: number; // 1–7
  quality: QualityId;
  numeral: string;
}

export interface Progression {
  id: string;
  group: string;
  title: string;
  minor: boolean;
  chords: ProgChord[];
  description: string;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** "V7" → degree 5, dom7; "ii7" → min7; "vii°" → dim; "iiø7" → m7b5; "Imaj7" → maj7. */
export function parseNumeral(numeral: string): ProgChord {
  const m = /^(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(°|ø)?(maj7|7)?$/.exec(numeral);
  if (!m) throw new Error(`Bad numeral: ${numeral}`);
  const upper = m[1] === m[1].toUpperCase();
  const degree = ROMAN.indexOf(m[1].toUpperCase()) + 1;
  let quality: QualityId;
  if (m[2] === 'ø') quality = 'm7b5';
  else if (m[2] === '°') quality = m[3] ? 'dim7' : 'dim';
  else if (m[3] === 'maj7') quality = 'maj7';
  else if (m[3] === '7') quality = upper ? 'dom7' : 'min7';
  else quality = upper ? 'maj' : 'min';
  return { degree, quality, numeral };
}

const prog = (id: string, group: string, title: string, minor: boolean, numerals: string, description: string): Progression => ({
  id,
  group,
  title,
  minor,
  chords: numerals.split(' ').map(parseNumeral),
  description,
});

export const PROGRESSIONS: Progression[] = [
  prog('i-iv-v', 'Мажор', 'Три главных аккорда', false, 'I IV V I', 'Тоника, субдоминанта, доминанта — основа тысяч песен.'),
  prog('i-iv-i-v', 'Мажор', 'Тоника и доминанта', false, 'I IV I V', 'Простая цепочка с возвратом к тонике в середине.'),
  prog('pop', 'Мажор', 'Поп: I–V–vi–IV', false, 'I V vi IV', '«Четыре аккорда поп-музыки».'),
  prog('fifties', 'Мажор', 'Пятидесятые: I–vi–IV–V', false, 'I vi IV V', 'Звучание рок-н-ролла и баллад 1950-х.'),
  prog('canon', 'Мажор', 'Канон: I–V–vi–iii–IV–I–IV–V', false, 'I V vi iii IV I IV V', 'Знаменитая последовательность из Канона Пахельбеля.'),
  prog('sad-pop', 'Минор', 'Задумчивая: vi–IV–I–V', false, 'vi IV I V', 'Те же аккорды, что в поп-цепочке, но начинаются с минорного.'),
  prog('minor-basic', 'Минор', 'Минорная: i–iv–v–i', true, 'i iv v i', 'Главные аккорды натурального минора.'),
  prog('minor-axis', 'Минор', 'Минорная поп: i–VI–III–VII', true, 'i VI III VII', 'Am — F — C — G в ля миноре: эпично и грустно.'),
  prog('andalusian', 'Минор', 'Андалузская: i–VII–VI–V', true, 'i VII VI V', 'Спускающийся бас, испанский колорит. V — мажорный.'),
  prog('ii-v-i', 'Джаз и блюз', 'Джаз: ii7–V7–Imaj7', false, 'ii7 V7 Imaj7 Imaj7', 'Главный оборот джаза на септаккордах.'),
  prog('blues', 'Джаз и блюз', '12-тактовый блюз', false, 'I7 I7 I7 I7 IV7 IV7 I7 I7 V7 IV7 I7 V7', 'Блюзовая форма на доминантсептаккордах.'),
];

export const PROGRESSION_GROUPS = [...new Set(PROGRESSIONS.map((p) => p.group))];
export const findProgression = (id: string) => PROGRESSIONS.find((p) => p.id === id) ?? PROGRESSIONS[0];

const sp = (code: string): SpelledNote => ({ letter: code[0] as Letter, alter: code.length > 1 ? (code[1] === '#' ? 1 : -1) : 0 });

export interface KeyOption {
  id: string;
  label: string;
  tonic: SpelledNote;
  minor: boolean;
}

const key = (code: string, minor: boolean): KeyOption => ({
  id: code + (minor ? 'm' : ''),
  label: code.replace('#', '♯').replace(/^([A-G])b/, '$1♭') + (minor ? 'm' : ''),
  tonic: sp(code),
  minor,
});

/** All 12 keys in circle-of-fifths order (sharps clockwise, then flats). */
export const MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'].map((c) => key(c, false));
export const MINOR_KEYS = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'Eb', 'Bb', 'F', 'C', 'G', 'D'].map((c) => key(c, true));
export { key as makeKey };
export const findKey = (id: string, minor: boolean) => (minor ? MINOR_KEYS : MAJOR_KEYS).find((k) => k.id === id) ?? (minor ? MINOR_KEYS[0] : MAJOR_KEYS[0]);

const LETTERS: Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

/** Correctly spelled 7-note scale (each letter once). */
export function scaleOf(tonic: SpelledNote, minor: boolean): SpelledNote[] {
  const start = LETTERS.indexOf(tonic.letter);
  const tpc = pcOf(tonic);
  return (minor ? MINOR_STEPS : MAJOR_STEPS).map((step, i) => {
    const letter = LETTERS[(start + i) % 7];
    const alter = ((((tpc + step) % 12) - LETTER_PC[letter] + 18) % 12) - 6;
    return { letter, alter };
  });
}

export function progressionChords(p: Progression, k: KeyOption): Chord[] {
  const scale = scaleOf(k.tonic, k.minor);
  return p.chords.map((c) => ({ root: scale[c.degree - 1], quality: c.quality, inversion: 0, bassRequired: false }));
}

/** Root-position voicing around middle C (first chord of a progression). */
function rootVoicing(chord: Chord): number[] {
  const pcs = chordPcs(chord);
  const root = pcs[0];
  const base = (root >= 7 ? 48 : 60) + root;
  return QUALITIES[chord.quality].intervals.map((iv) => base + iv);
}

/** All close-position voicings (every inversion, several octaves) in a comfortable range. */
function candidates(chord: Chord): number[][] {
  const pcs = chordPcs(chord).map((pc) => pc % 12);
  const n = pcs.length;
  const out: number[][] = [];
  for (let inv = 0; inv < n; inv++) {
    const order = [...pcs.slice(inv), ...pcs.slice(0, inv)];
    for (let oct = 3; oct <= 5; oct++) {
      let cur = (oct + 1) * 12 + order[0];
      const v = [cur];
      for (const pc of order.slice(1)) {
        cur = cur + (((pc - (cur % 12)) + 12) % 12 || 12);
        v.push(cur);
      }
      if (v[0] >= 52 && v[v.length - 1] <= 81) out.push(v);
    }
  }
  return out;
}

/** Total finger movement between two voicings (matched lowest-to-highest). */
function movement(a: number[], b: number[]): number {
  const n = Math.max(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs((a[Math.min(i, a.length - 1)] ?? 0) - (b[Math.min(i, b.length - 1)] ?? 0));
  return sum;
}

/** Voicings for a whole progression with smooth voice leading. */
export function voiceLead(chords: Chord[]): number[][] {
  const out: number[][] = [];
  chords.forEach((c, i) => {
    if (i === 0) {
      out.push(rootVoicing(c));
      return;
    }
    const prev = out[i - 1];
    const best = candidates(c).reduce((a, b) => (movement(b, prev) < movement(a, prev) ? b : a));
    out.push(best);
  });
  return out;
}

/** Bass note for the left hand (octave 2). */
export const bassOf = (chord: Chord) => 36 + chordPcs(chord)[0];
