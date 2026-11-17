/**
 * Melodies to learn: from a MIDI file, typed by hand, or recorded in the Studio.
 * A melody is a list of notes on a beat grid; it is split into short phrases to learn one by one.
 */
import type { MidiSong, MidiTrack } from './midiFile';
import { codeToMidi, midiToCode } from './notes';

export interface MelNote {
  midi: number;
  /** Start and length in quarter-note beats, from the first bar line. */
  beat: number;
  dur: number;
}

/** Learning steps for a phrase (and the whole melody). */
export const STEPS = ['listen', 'hints', 'read', 'memory', 'rhythm'] as const;
export type Step = (typeof STEPS)[number];
export const STEP_TITLE: Record<Step, string> = {
  listen: 'Послушай',
  hints: 'С подсказками',
  read: 'По нотам',
  memory: 'По памяти',
  rhythm: 'В ритме',
};

export interface Melody {
  id: string;
  title: string;
  source: 'midi' | 'manual' | 'studio' | 'example';
  meter: 3 | 4;
  tempo: number;
  notes: MelNote[];
  /** Best step reached per phrase: 0 = nothing yet, 1…5 = STEPS index + 1. */
  stars: number[];
  /** Played the whole melody in rhythm at least once. */
  learned?: boolean;
  createdAt: number;
}

export interface Phrase {
  from: number; // index of the first note
  to: number; // exclusive
}

/** Split into phrases: at rests of a beat or longer, or every 2 bars, keeping 3–10 notes. */
export function phrasesOf(m: Pick<Melody, 'notes' | 'meter'>): Phrase[] {
  const out: Phrase[] = [];
  const barBeats = m.meter;
  let from = 0;
  for (let i = 1; i <= m.notes.length; i++) {
    const count = i - from;
    if (i === m.notes.length) {
      if (count < 3 && out.length) out[out.length - 1].to = i;
      else out.push({ from, to: i });
      break;
    }
    const prev = m.notes[i - 1];
    const gap = m.notes[i].beat - (prev.beat + prev.dur);
    const startBar = Math.floor(m.notes[from].beat / barBeats);
    const bar = Math.floor(m.notes[i].beat / barBeats);
    const breakHere = (count >= 3 && (gap >= 1 || bar - startBar >= 2)) || count >= 10;
    if (breakHere) {
      out.push({ from, to: i });
      from = i;
    }
  }
  return out;
}

/** Durations snapped to musical values (16th grid), the first note moved to the start of its bar. */
export function quantizeNotes(notes: MelNote[], meter: number, grid = 0.25): MelNote[] {
  if (!notes.length) return [];
  const q = (x: number) => Math.round(x / grid) * grid;
  const firstBar = Math.floor(q(notes[0].beat) / meter) * meter;
  const out: MelNote[] = [];
  for (const n of notes) {
    const beat = q(n.beat) - firstBar;
    const last = out[out.length - 1];
    if (last && beat <= last.beat) {
      // Same slot: keep the higher note (the melody is usually on top).
      if (n.midi > last.midi) last.midi = n.midi;
      continue;
    }
    if (last && last.beat + last.dur > beat) last.dur = beat - last.beat;
    out.push({ midi: n.midi, beat, dur: Math.max(grid, q(n.dur)) });
  }
  return out;
}

/** «Skyline»: one note at a time — the highest of overlapping notes. */
export function monophonic(notes: MelNote[]): MelNote[] {
  const sorted = [...notes].sort((a, b) => a.beat - b.beat || b.midi - a.midi);
  const out: MelNote[] = [];
  for (const n of sorted) {
    const last = out[out.length - 1];
    if (last && Math.abs(n.beat - last.beat) < 0.05) continue;
    if (last && last.beat + last.dur > n.beat) last.dur = n.beat - last.beat;
    out.push({ ...n });
  }
  return out;
}

/** Tracks worth offering, best guess for the melody first (many notes, high pitch, not drums). */
export function melodyTracks(song: MidiSong): (MidiTrack & { score: number })[] {
  return song.tracks
    .map((t) => {
      const notes = t.notes.filter((n) => n.channel !== 9);
      const avg = notes.reduce((a, n) => a + n.midi, 0) / Math.max(1, notes.length);
      return { ...t, notes, score: notes.length ? avg + Math.min(notes.length, 200) / 10 : -1 };
    })
    .filter((t) => t.notes.length >= 4)
    .sort((a, b) => b.score - a.score);
}

export const MAX_NOTES = 400;

export function melodyFromTrack(track: MidiTrack, song: MidiSong, title: string): Omit<Melody, 'id' | 'createdAt' | 'stars'> {
  const meter = song.meter === 3 ? 3 : 4;
  const mono = monophonic(track.notes.map((n) => ({ midi: n.midi, beat: n.start, dur: n.dur })));
  const notes = quantizeNotes(mono, meter).slice(0, MAX_NOTES);
  return { title, source: 'midi', meter, tempo: Math.min(160, Math.max(40, song.bpm)), notes };
}

/** Keep only bars [fromBar, toBar) — to learn a part of a long song. Bars count from 1. */
export function sliceBars(notes: MelNote[], meter: number, fromBar: number, toBar: number): MelNote[] {
  const a = (fromBar - 1) * meter;
  const b = (toBar - 1) * meter;
  return notes.filter((n) => n.beat >= a && n.beat < b).map((n) => ({ ...n, beat: n.beat - a }));
}

export const barsIn = (notes: MelNote[], meter: number) => (notes.length ? Math.ceil((notes[notes.length - 1].beat + notes[notes.length - 1].dur) / meter) : 0);

/* ---------------- typing a melody by hand ---------------- */

/**
 * «E4 E4 F4 G4 | G4:2 F4 E4» — note codes; «:2» = two beats, «:0.5» = an eighth, «R» or «-» = a rest.
 * Bar lines «|» are optional and ignored. Throws a readable error.
 */
export function parseMelodyText(text: string): MelNote[] {
  const out: MelNote[] = [];
  let beat = 0;
  const tokens = text
    .replace(/[|,;]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  for (const tok of tokens) {
    const [code, durStr] = tok.split(/[:/]/);
    const dur = durStr ? Number(durStr.replace(',', '.')) : 1;
    if (!(dur > 0 && dur <= 8)) throw new Error(`Не понял длительность в «${tok}»: напишите, например, E4:2 или E4:0.5.`);
    if (/^(r|-|п)$/i.test(code)) {
      beat += dur;
      continue;
    }
    const midi = codeToMidi(code);
    if (midi === null) throw new Error(`Не понял ноту «${code}»: пишите как C4, F#4, Bb3.`);
    out.push({ midi, beat, dur });
    beat += dur;
  }
  if (out.length < 2) throw new Error('Нужно хотя бы две ноты.');
  return out;
}

export function melodyToText(notes: MelNote[]): string {
  let beat = 0;
  const out: string[] = [];
  for (const n of notes) {
    if (n.beat > beat + 0.01) out.push(`R:${+(n.beat - beat).toFixed(2)}`);
    out.push(n.dur === 1 ? midiToCode(n.midi) : `${midiToCode(n.midi)}:${+n.dur.toFixed(2)}`);
    beat = n.beat + n.dur;
  }
  return out.join(' ').replace(/♯/g, '#').replace(/♭/g, 'b');
}

/* ---------------- examples (public domain) ---------------- */

const ex = (id: string, title: string, meter: 3 | 4, tempo: number, text: string): Melody => ({
  id,
  title,
  source: 'example',
  meter,
  tempo,
  notes: parseMelodyText(text),
  stars: [],
  createdAt: 0,
});

export const EXAMPLES: Melody[] = [
  ex('ex-ode', 'Ода к радости (Бетховен)', 4, 100, 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2'),
  ex('ex-twinkle', 'Twinkle, Twinkle, Little Star', 4, 96, 'C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 G4 G4 F4 F4 E4 E4 D4:2 G4 G4 F4 F4 E4 E4 D4:2'),
  ex('ex-jingle', 'Jingle Bells (припев)', 4, 120, 'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:0.5 E4:4 F4 F4 F4:1.5 F4:0.5 F4 E4 E4 E4:0.5 E4:0.5 E4 D4 D4 E4 D4:2 G4:2'),
];

export const isMelodyLearned = (m: Melody) => !!m.learned;

/** Notes (and rests between them) for the staff, with bar lines; `index` points back into melody.notes. */
export interface StaffItem {
  code: string;
  dur: number;
  rest?: boolean;
  barBefore?: boolean;
  index: number;
}

export function staffItems(notes: MelNote[], meter: number, from = 0, to = notes.length): StaffItem[] {
  const out: StaffItem[] = [];
  let lastBar = notes[from] ? Math.floor(notes[from].beat / meter) : 0;
  for (let i = from; i < to; i++) {
    const n = notes[i];
    if (i > from) {
      const prev = notes[i - 1];
      const gap = n.beat - (prev.beat + prev.dur);
      if (gap >= 0.25) out.push({ code: '', dur: gap, rest: true, index: -1 });
    }
    const bar = Math.floor(n.beat / meter + 1e-6);
    out.push({ code: midiToCode(n.midi), dur: n.dur, barBefore: i > from && bar > lastBar, index: i });
    lastBar = bar;
  }
  return out;
}

/** The phrase's playing span in beats (for count-ins and timing). */
export const spanOf = (notes: MelNote[], p: Phrase) => ({ start: notes[p.from].beat, end: notes[p.to - 1].beat + notes[p.to - 1].dur });

/** The user's melodies first, then the built-in examples they haven't touched. */
export const allMelodies = (mine: Melody[]) => [...mine, ...EXAMPLES.filter((e) => !mine.some((m) => m.id === e.id))];
