/** Bridges between melodies and the rest of the app: songs, the Studio, Drops, ear training. */
import { type Melody, monophonic, phrasesOf, quantizeNotes } from './melodyModel';
import { midiToCode } from './notes';
import type { Song } from './songs';
import { harmonize, type Take } from './studio';

/** A song for the Songs section: the melody bar by bar, with chords picked to fit it. */
export function melodyToSong(m: Melody): Song {
  const barCount = Math.max(1, Math.ceil((m.notes[m.notes.length - 1].beat + m.notes[m.notes.length - 1].dur) / m.meter - 1e-6));
  const bars: number[][] = Array.from({ length: barCount }, () => []);
  for (const n of m.notes) bars[Math.min(barCount - 1, Math.floor(n.beat / m.meter + 1e-6))].push(n.midi);
  // Empty bars (long rests) borrow the previous bar's notes for harmony.
  const forHarmony = bars.map((b, i) => (b.length ? b : bars.slice(0, i).reverse().find((x) => x.length) ?? [m.notes[0].midi]));
  const { keyId, chords } = harmonize(forHarmony);
  const lines = [];
  for (let i = 0; i < barCount; i += 4) lines.push(chords.slice(i, i + 4).map((c) => ({ chords: [c], text: '' })));
  return {
    id: `my-mel-${m.id}`,
    title: m.title,
    origin: 'моя мелодия · аккорды подобраны автоматически',
    group: 'Мои песни',
    key: keyId,
    meter: m.meter,
    tempo: m.tempo,
    lines,
    ...melodyBars(m, barCount),
    custom: true,
    source: '',
    chordsPerBar: 1,
  };
}

/** The melody bar by bar with its rhythm: rests fill the gaps, notes are cut at the bar line. */
function melodyBars(m: Melody, barCount: number): { melody: string[]; rhythm: string[] } {
  const melody: string[] = [];
  const rhythm: string[] = [];
  const r = (x: number) => String(Math.round(x * 1000) / 1000);
  for (let b = 0; b < barCount; b++) {
    const start = b * m.meter;
    const end = start + m.meter;
    const codes: string[] = [];
    const durs: string[] = [];
    let at = start;
    for (const n of m.notes) {
      if (n.beat < start - 1e-6 || n.beat >= end - 1e-6) continue;
      if (n.beat > at + 1e-3) {
        codes.push('R');
        durs.push(r(n.beat - at));
      }
      const len = Math.min(n.dur, end - n.beat);
      codes.push(midiToCode(n.midi));
      durs.push(r(len));
      at = n.beat + len;
    }
    if (at < end - 1e-3) {
      codes.push('R');
      durs.push(r(end - at));
    }
    melody.push(codes.join(' '));
    rhythm.push(durs.join(' '));
  }
  return { melody, rhythm };
}

/** A Studio recording → a melody to learn (beats from the take's tempo, snapped to 16ths). */
export function takeToMelody(take: Take, title: string): Omit<Melody, 'id' | 'createdAt' | 'stars'> {
  const beatMs = 60000 / take.tempo;
  const notes = quantizeNotes(
    monophonic(take.notes.map((n) => ({ midi: n.midi, beat: n.on / beatMs, dur: Math.max(0.25, (n.off - n.on) / beatMs) }))),
    4,
  );
  return { title, source: 'studio', meter: 4, tempo: take.tempo, notes };
}

/** Drops: the melody's notes falling in its own rhythm. */
export const melodyDrops = (m: Melody) => m.notes.map((n) => ({ midi: n.midi, beat: n.beat }));

/** Ear training: a random phrase (max 7 notes) from the user's melodies. */
export function melodyPhraseForEar(list: Melody[], rng: () => number = Math.random): number[] | null {
  const pool = list.flatMap((m) => phrasesOf(m).map((p) => m.notes.slice(p.from, Math.min(p.to, p.from + 7)).map((n) => n.midi)));
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}
