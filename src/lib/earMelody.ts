/** «Повтори мелодию»: short phrases to play back by ear. */
import { codeToMidi, isBlack } from './notes';
import { SONGS } from './songs';

type Rng = () => number;

interface Spec {
  length: number;
  /** Largest leap in white-key steps. */
  leap: number;
  range: [number, number];
  /** Fixed first note (beginners start from C4). */
  start?: number;
}

const SPECS: Record<string, Spec> = {
  'm-3step': { length: 3, leap: 1, range: [60, 67], start: 60 },
  'm-4step': { length: 4, leap: 1, range: [60, 72] },
  'm-4skip': { length: 4, leap: 2, range: [60, 72] },
  'm-5skip': { length: 5, leap: 4, range: [57, 76] },
  'm-6': { length: 6, leap: 4, range: [55, 79] },
};

const whitesIn = ([lo, hi]: [number, number]) => {
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) if (!isBlack(m)) out.push(m);
  return out;
};

/** Phrases from the song library that have a melody: one or two bars. */
function songPhrase(rng: Rng): number[] {
  const withMelody = SONGS.filter((s) => s.melody?.length);
  const song = withMelody[Math.floor(rng() * withMelody.length)];
  const bars = song.melody!.map((b) => b.split(/\s+/).filter((c) => c && c !== 'R').map((c) => codeToMidi(c)!)).filter((b) => b.length);
  for (let tries = 0; tries < 10; tries++) {
    const b = Math.floor(rng() * bars.length);
    const notes = [...bars[b], ...(bars[b + 1] ?? [])].slice(0, 7);
    if (notes.length >= 4) return notes;
  }
  return bars.flat().slice(0, 6);
}

export function makeEarPhrase(levelId: string, prev: number[] | null = null, rng: Rng = Math.random): number[] {
  if (levelId === 'm-songs') return songPhrase(rng);
  const spec = SPECS[levelId] ?? SPECS['m-4step'];
  const whites = whitesIn(spec.range);
  for (let attempt = 0; attempt < 8; attempt++) {
    let i = spec.start !== undefined ? whites.indexOf(spec.start) : Math.floor(whites.length * (0.25 + rng() * 0.5));
    const out = [whites[i]];
    while (out.length < spec.length) {
      const size = 1 + Math.floor(rng() * spec.leap);
      let dir = rng() < 0.5 ? -1 : 1;
      if (i + dir * size < 0 || i + dir * size >= whites.length) dir = -dir;
      i = Math.max(0, Math.min(whites.length - 1, i + dir * size));
      out.push(whites[i]);
    }
    if (!prev || out.join() !== prev.join()) return out;
  }
  return [60, 62, 64].slice(0, spec.length);
}
