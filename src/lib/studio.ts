/**
 * «Студия»: a recorded take — timing analysis against the metronome, and turning
 * a melody into notes and chords so it can be saved as your own song.
 */
import { KEYS } from './storageKeys';
import { canWrite } from './tabGuard';
import { MAJOR_KEYS, scaleOf } from './progressions';
import { pcOf } from './chords';
import { midiToCode } from './notes';
import type { Song } from './songs';

export interface TakeNote {
  midi: number;
  /** ms from the first beat. */
  on: number;
  off: number;
}

export interface Take {
  id: string;
  at: number;
  tempo: number;
  /** Recorded against the metronome (timing can be analysed). */
  click: boolean;
  notes: TakeNote[];
}

export const ON_TIME_MS = 60;
export const LATE_MS = 120;

export type Timing = 'ok' | 'near' | 'off';

/** Distance to the nearest eighth note, signed: negative = early (rushing), positive = late. */
export function deviation(onMs: number, tempo: number): number {
  const grid = 30000 / tempo;
  return onMs - Math.round(onMs / grid) * grid;
}

export const timingOf = (dev: number): Timing => (Math.abs(dev) <= ON_TIME_MS ? 'ok' : Math.abs(dev) <= LATE_MS ? 'near' : 'off');

export interface Analysis {
  count: number;
  onTime: number;
  meanAbs: number;
  meanSigned: number;
  verdict: string;
}

export function analyse(take: Take): Analysis {
  const devs = take.notes.map((n) => deviation(n.on, take.tempo));
  const count = devs.length;
  if (!count) return { count, onTime: 0, meanAbs: 0, meanSigned: 0, verdict: 'Ничего не записано.' };
  const meanAbs = devs.reduce((a, d) => a + Math.abs(d), 0) / count;
  const meanSigned = devs.reduce((a, d) => a + d, 0) / count;
  const onTime = devs.filter((d) => timingOf(d) === 'ok').length / count;
  const verdict =
    onTime >= 0.85
      ? 'Очень ровно — вы в темпе!'
      : meanSigned < -25
        ? 'Вы немного спешите: ждите щелчка метронома.'
        : meanSigned > 25
          ? 'Вы чуть отстаёте: играйте вместе со щелчком, а не после него.'
          : 'Ритм гуляет в обе стороны — попробуйте медленнее.';
  return { count, onTime, meanAbs, meanSigned, verdict };
}

/** Melody per bar (4/4, eighth-note grid): simultaneous notes keep only the highest. */
export function quantize(take: Take): number[][] {
  const eighth = 30000 / take.tempo;
  const slots = new Map<number, number>();
  for (const n of take.notes) {
    const i = Math.max(0, Math.round(n.on / eighth));
    slots.set(i, Math.max(slots.get(i) ?? 0, n.midi));
  }
  const bars: number[][] = [];
  [...slots.keys()]
    .sort((a, b) => a - b)
    .forEach((i) => {
      const b = Math.floor(i / 8);
      (bars[b] ??= []).push(slots.get(i)!);
    });
  // Empty bars (long pauses) are dropped.
  return bars.filter((b) => b && b.length);
}

const TRIADS: { degree: number; minor: boolean }[] = [
  { degree: 1, minor: false },
  { degree: 4, minor: false },
  { degree: 5, minor: false },
  { degree: 6, minor: true },
  { degree: 2, minor: true },
  { degree: 3, minor: true },
];

const ascii = (n: { letter: string; alter: number }) => n.letter + (n.alter === 1 ? '#' : n.alter === -1 ? 'b' : '');

/** A major key and one chord per bar that fit the melody. */
export function harmonize(bars: number[][]): { keyId: string; chords: string[] } {
  const all = bars.flat();
  let best = { key: MAJOR_KEYS[0], score: -Infinity };
  for (const k of MAJOR_KEYS) {
    const scale = new Set(scaleOf(k.tonic, false).map(pcOf));
    const tonic = pcOf(k.tonic);
    let score = all.filter((m) => scale.has(m % 12)).length * 10;
    if (all.length && all[all.length - 1] % 12 === tonic) score += 6;
    if (all.length && all[0] % 12 === tonic) score += 3;
    // Prefer simple keys a little.
    score -= Math.abs(k.tonic.alter) * 2;
    if (score > best.score) best = { key: k, score };
  }
  const scale = scaleOf(best.key.tonic, false);
  const chords = bars.map((bar, bi) => {
    let pick = TRIADS[0];
    let top = -Infinity;
    for (const t of TRIADS) {
      const root = pcOf(scale[t.degree - 1]);
      const pcs = new Set([root, (root + (t.minor ? 3 : 4)) % 12, (root + 7) % 12]);
      let s = bar.reduce((a, m, i) => a + (pcs.has(m % 12) ? (i === 0 ? 3 : 2) : -1), 0);
      if (t.degree === 1 && (bi === 0 || bi === bars.length - 1)) s += 3;
      if (s > top) {
        top = s;
        pick = t;
      }
    }
    return ascii(scale[pick.degree - 1]) + (pick.minor ? 'm' : '');
  });
  return { keyId: best.key.id, chords };
}

export function takeToSong(title: string, take: Take): Song | null {
  const bars = quantize(take);
  if (!bars.length) return null;
  const { keyId, chords } = harmonize(bars);
  const lines = [];
  for (let i = 0; i < bars.length; i += 4) lines.push(chords.slice(i, i + 4).map((c) => ({ chords: [c], text: '' })));
  return {
    id: `my-${Date.now().toString(36)}`,
    title,
    origin: 'моя мелодия',
    group: 'Мои песни',
    key: keyId,
    meter: 4,
    tempo: take.tempo,
    lines,
    melody: bars.map((b) => b.map((m) => midiToCode(m)).join(' ')),
    custom: true,
    source: '',
    chordsPerBar: 1,
  };
}

/* ---------------- takes in this browser ---------------- */

const KEY = KEYS.takes;
const MAX = 12;

export function loadTakes(): Take[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((t) => t && Array.isArray(t.notes)) : [];
  } catch {
    return [];
  }
}

export function saveTakes(list: Take[]) {
  if (!canWrite()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* storage full or unavailable */
  }
}
