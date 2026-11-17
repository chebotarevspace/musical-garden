/**
 * Sight-reading for two hands on the grand staff.
 *
 * An exercise is a few bars of 4/4: the right hand on the treble staff, the left on the bass
 * staff, both in a five-finger position. Levels go from «hands take turns» to a melody over
 * left-hand chords with mixed rhythm.
 */
import { type Mode, midiToCode } from './notes';

export type Hand = 'R' | 'L';

export interface HandEvent {
  hand: Hand;
  beat: number;
  dur: number;
  /** Empty for a rest. */
  midis: number[];
  codes: string[];
}

export interface HandsExercise {
  level: string;
  position: Position;
  bars: number;
  meter: 4;
  events: HandEvent[];
}

/** What to play together at one moment. */
export interface HandsStep {
  beat: number;
  midis: number[];
  /** Indexes into exercise.events. */
  events: number[];
}

export interface Position {
  id: string;
  title: string;
  /** Five right-hand notes, thumb to little finger. */
  rh: number[];
  /** Five left-hand notes, little finger to thumb. */
  lh: number[];
  flat: boolean;
  /** Pitch class of the tonic. */
  tonic: number;
}

const five = (root: number, minor = false) => [0, 2, minor ? 3 : 4, 5, 7].map((x) => root + x);

export const POSITIONS: Position[] = [
  { id: 'C', title: 'до мажор', rh: five(60), lh: five(48), flat: false, tonic: 0 },
  { id: 'G', title: 'соль мажор', rh: five(67), lh: five(43), flat: false, tonic: 7 },
  { id: 'Am', title: 'ля минор', rh: five(69, true), lh: five(45, true), flat: false, tonic: 9 },
  { id: 'F', title: 'фа мажор', rh: five(65), lh: five(41), flat: true, tonic: 5 },
  { id: 'D', title: 'ре мажор', rh: five(62), lh: five(50), flat: false, tonic: 2 },
];

export interface HandsLevel {
  id: string;
  title: string;
  hint: string;
}

export const HANDS_LEVELS: HandsLevel[] = [
  { id: 'h-alt', title: 'Руки по очереди', hint: 'Играет то правая, то левая. Где у руки пауза — она отдыхает.' },
  { id: 'h-drone', title: 'Бас держит', hint: 'Левая берёт одну долгую ноту на весь такт, правая играет четверти.' },
  { id: 'h-bass', title: 'Бас на раз и три', hint: 'Левая — половинные ноты, правая — четверти. Нажимайте вместе на сильных долях.' },
  { id: 'h-together', title: 'Обе руки вместе', hint: 'Каждую долю играют обе руки: параллельно или «в зеркале».' },
  { id: 'h-chords', title: 'Аккорды в левой', hint: 'Левая держит аккорд на весь такт, правая ведёт мелодию.' },
  { id: 'h-rhythm', title: 'Ритм', hint: 'Восьмые, половинные и точки в правой, бас половинными в левой.' },
];

export const findHandsLevel = (id: string) => HANDS_LEVELS.find((l) => l.id === id) ?? HANDS_LEVELS[0];

type Rng = () => number;
const pick = <T,>(xs: T[], rng: Rng) => xs[Math.floor(rng() * xs.length)];

/** Positions available in a mode: only white keys, or with sharps and flats. */
export function positionsFor(mode: Mode, level: string): Position[] {
  const easy = level === 'h-alt' || level === 'h-drone';
  const whites = POSITIONS.filter((p) => !p.flat && p.id !== 'D');
  // In G major the V chord (D) needs F♯ — chords on white keys only in C major and A minor.
  if (mode === 'naturals') return easy ? [POSITIONS[0]] : level === 'h-chords' ? whites.filter((p) => p.id !== 'G') : whites;
  return easy ? [POSITIONS[0], POSITIONS[3]] : POSITIONS;
}

/** A melodic walk over the five fingers: mostly steps, sometimes a skip of a third. */
function walk(n: number, start: number, rng: Rng, end?: number): number[] {
  const out = [start];
  for (let i = 1; i < n; i++) {
    const prev = out[i - 1];
    const step = pick([-1, -1, 1, 1, 1, -2, 2, 0], rng);
    let next = prev + step;
    if (next < 0 || next > 4) next = prev - step;
    out.push(Math.max(0, Math.min(4, next)));
  }
  if (end !== undefined && n > 1) {
    out[n - 1] = end;
    // Approach the last note by step.
    if (Math.abs(out[n - 2] - end) > 1) out[n - 2] = Math.max(0, Math.min(4, end + (out[n - 2] > end ? 1 : -1)));
    if (out[n - 2] === end) out[n - 2] = end + 1;
  }
  return out;
}

const RHYTHMS: number[][] = [
  [1, 1, 1, 1],
  [2, 1, 1],
  [1, 1, 2],
  [0.5, 0.5, 1, 2],
  [1, 0.5, 0.5, 1, 1],
  [1.5, 0.5, 2],
  [1, 1, 0.5, 0.5, 1],
];

/** Close triad voicings for the left hand: I, IV, V around the position. */
function lhChord(pos: Position, degree: 'I' | 'IV' | 'V'): number[] {
  const root = pos.lh[0];
  const minor = pos.rh[2] - pos.rh[0] === 3;
  const shapes: Record<string, number[]> = minor
    ? { I: [0, 3, 7], IV: [0, 5, 8], V: [-2, 2, 7] }
    : { I: [0, 4, 7], IV: [0, 5, 9], V: [-1, 2, 7] };
  return shapes[degree].map((x) => root + x);
}

/** Chord tones in the right hand's five fingers (indexes), for a strong beat over the chord. */
const RH_TONES: Record<'I' | 'IV' | 'V', number[]> = { I: [0, 2, 4], IV: [3, 0], V: [1, 4] };

export function makeHandsExercise(levelId: string, mode: Mode, bars: number, rng: Rng = Math.random): HandsExercise {
  const level = findHandsLevel(levelId).id;
  const pos = pick(positionsFor(mode, level), rng);
  const code = (m: number) => midiToCode(m, pos.flat ? 'flat' : 'sharp');
  const events: HandEvent[] = [];
  const note = (hand: Hand, beat: number, dur: number, midis: number[]) => events.push({ hand, beat, dur, midis, codes: midis.map(code) });
  const rest = (hand: Hand, beat: number, dur: number) => events.push({ hand, beat, dur, midis: [], codes: [] });
  const R = (i: number) => pos.rh[i];
  const L = (i: number) => pos.lh[i];
  const last = (b: number) => b === bars - 1;

  if (level === 'h-alt') {
    // Who plays on each beat; each hand walks on its own.
    const patterns = ['RRLL', 'LLRR', 'RLRL', 'RRRL', 'LRRR', 'RLLR'];
    let ri = pick([0, 2, 4], rng);
    let li = pick([0, 4], rng);
    for (let b = 0; b < bars; b++) {
      const pat = last(b) ? 'RLRL' : pick(patterns, rng);
      [...pat].forEach((h, k) => {
        const beat = b * 4 + k;
        const end = last(b) && k >= 2;
        if (h === 'R') {
          ri = end ? 0 : Math.max(0, Math.min(4, ri + pick([-1, 1, 1, -2, 2], rng)));
          note('R', beat, 1, [R(ri)]);
          rest('L', beat, 1);
        } else {
          li = end ? 0 : Math.max(0, Math.min(4, li + pick([-1, 1, -1, 2, -2], rng)));
          note('L', beat, 1, [L(li)]);
          rest('R', beat, 1);
        }
      });
    }
  } else if (level === 'h-drone' || level === 'h-bass' || level === 'h-rhythm') {
    let ri = pick([0, 2, 4], rng);
    for (let b = 0; b < bars; b++) {
      // Left hand: tonic / dominant (whole notes or halves).
      const bassIdx = last(b) ? 0 : b % 2 === 0 ? 0 : 4;
      if (level === 'h-drone') note('L', b * 4, 4, [L(bassIdx)]);
      else if (last(b)) note('L', b * 4, 4, [L(0)]);
      else {
        note('L', b * 4, 2, [L(bassIdx)]);
        note('L', b * 4 + 2, 2, [L(pick(bassIdx === 0 ? [4, 2] : [0, 3], rng))]);
      }
      // Right hand.
      const rhythm = last(b) ? (level === 'h-rhythm' ? [1, 1, 2] : [1, 1, 2]) : level === 'h-rhythm' ? pick(RHYTHMS, rng) : [1, 1, 1, 1];
      const idx = walk(rhythm.length, b === 0 ? ri : ri, rng, last(b) ? 0 : undefined);
      // Strong beat over the bass: a note that sounds well with it.
      if (!last(b) && bassIdx === 4 && ![1, 4].includes(idx[0])) idx[0] = pick([1, 4], rng);
      let at = b * 4;
      rhythm.forEach((d, k) => {
        note('R', at, d, [R(idx[k])]);
        at += d;
      });
      ri = idx[idx.length - 1];
    }
  } else if (level === 'h-together') {
    const mirror = rng() < 0.5;
    let ri = pick([0, 2], rng);
    for (let b = 0; b < bars; b++) {
      const rhythm = last(b) ? [1, 1, 2] : [1, 1, 1, 1];
      const idx = walk(rhythm.length, ri, rng, last(b) ? 0 : undefined);
      let at = b * 4;
      rhythm.forEach((d, k) => {
        note('R', at, d, [R(idx[k])]);
        // Mirror: the same finger in both hands (thumbs together) — the left goes the other way.
        note('L', at, d, [L(mirror ? 4 - idx[k] : idx[k])]);
        at += d;
      });
      ri = idx[idx.length - 1];
    }
  } else {
    // h-chords: I – IV – V – I over the bars.
    const prog: ('I' | 'IV' | 'V')[] = bars === 2 ? ['I', 'V'] : ['I', 'IV', 'V', 'I'];
    let ri = 0;
    for (let b = 0; b < bars; b++) {
      const deg = last(b) && bars === 2 ? 'I' : prog[b % prog.length];
      if (last(b) && bars === 2) {
        note('L', b * 4, 2, [...lhChord(pos, 'V')]);
        note('L', b * 4 + 2, 2, [...lhChord(pos, 'I')]);
      } else note('L', b * 4, 4, lhChord(pos, deg));
      const rhythm = last(b) ? [1, 1, 2] : [1, 1, 1, 1];
      const startIdx = last(b) && bars === 2 ? pick(RH_TONES.V, rng) : pick(RH_TONES[deg], rng);
      const idx = walk(rhythm.length, startIdx, rng, last(b) ? 0 : undefined);
      let at = b * 4;
      rhythm.forEach((d, k) => {
        note('R', at, d, [R(idx[k])]);
        at += d;
      });
      ri = idx[idx.length - 1];
    }
    void ri;
  }

  events.sort((a, b) => a.beat - b.beat || (a.hand === 'R' ? -1 : 1));
  return { level, position: pos, bars, meter: 4, events };
}

/** Moments to play, in order: every beat where a note starts in either hand. */
export function handsSteps(ex: HandsExercise): HandsStep[] {
  const map = new Map<number, HandsStep>();
  ex.events.forEach((e, i) => {
    if (!e.midis.length) return;
    const key = Math.round(e.beat * 1000) / 1000;
    const st = map.get(key) ?? { beat: key, midis: [], events: [] };
    st.midis.push(...e.midis);
    st.events.push(i);
    map.set(key, st);
  });
  return [...map.values()].sort((a, b) => a.beat - b.beat);
}
