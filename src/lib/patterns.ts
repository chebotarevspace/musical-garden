/**
 * Accompaniment patterns ("фактуры"): how a chord is played in time.
 * Events are measured in eighth notes from the start of a chord slot.
 *
 * Roles: B = bass (root, octave 2), B5 = fifth above the bass, B8 = bass an octave up,
 * C = the whole right-hand chord, T0…T3 = single right-hand chord tones from the bottom.
 */
import type { Chord } from './chords';
import { bassOf } from './progressions';

export type Role = 'B' | 'B5' | 'B8' | 'C' | 'T0' | 'T1' | 'T2' | 'T3';

export interface PatternEvent {
  at: number;
  len: number;
  roles: Role[];
}

export interface Pattern {
  id: string;
  title: string;
  description: string;
  /** Events for a 4/4 bar (8 eighths) and a 3/4 bar (6 eighths). */
  bar4: PatternEvent[];
  bar3: PatternEvent[];
}

const ev = (at: number, len: number, ...roles: Role[]): PatternEvent => ({ at, len, roles });

export const PATTERNS: Pattern[] = [
  {
    id: 'block',
    title: 'Аккорд целиком',
    description: 'Бас и аккорд вместе, звучат весь такт. Самый простой способ — с него начинают.',
    bar4: [ev(0, 8, 'B', 'C')],
    bar3: [ev(0, 6, 'B', 'C')],
  },
  {
    id: 'quarters',
    title: 'Четвертями',
    description: 'Аккорд повторяется на каждую долю, бас — на первую. Даёт ровный пульс.',
    bar4: [ev(0, 8, 'B'), ev(0, 2, 'C'), ev(2, 2, 'C'), ev(4, 2, 'C'), ev(6, 2, 'C')],
    bar3: [ev(0, 6, 'B'), ev(0, 2, 'C'), ev(2, 2, 'C'), ev(4, 2, 'C')],
  },
  {
    id: 'march',
    title: 'Бас — аккорд',
    description: 'Левая рука на сильные доли (бас, затем квинта), правая — аккорд на слабые. Марш, кантри, полька.',
    bar4: [ev(0, 2, 'B'), ev(2, 2, 'C'), ev(4, 2, 'B5'), ev(6, 2, 'C')],
    bar3: [ev(0, 2, 'B'), ev(2, 2, 'C'), ev(4, 2, 'C')],
  },
  {
    id: 'waltz',
    title: 'Вальс',
    description: '«Раз — два — три»: бас на первую долю, аккорд на вторую и третью. Для песен на 3/4.',
    bar4: [ev(0, 2, 'B'), ev(2, 2, 'C'), ev(4, 2, 'C'), ev(6, 2, 'C')],
    bar3: [ev(0, 2, 'B'), ev(2, 2, 'C'), ev(4, 2, 'C')],
  },
  {
    id: 'broken',
    title: 'Ломаный аккорд',
    description: 'Правая рука играет звуки аккорда по очереди восьмыми: 1 — 3 — 5 — 3. Мягко и подвижно.',
    bar4: [ev(0, 8, 'B'), ev(0, 1, 'T0'), ev(1, 1, 'T1'), ev(2, 1, 'T2'), ev(3, 1, 'T1'), ev(4, 1, 'T0'), ev(5, 1, 'T1'), ev(6, 1, 'T2'), ev(7, 1, 'T1')],
    bar3: [ev(0, 6, 'B'), ev(0, 1, 'T0'), ev(1, 1, 'T1'), ev(2, 1, 'T2'), ev(3, 1, 'T1'), ev(4, 1, 'T2'), ev(5, 1, 'T1')],
  },
  {
    id: 'arpeggio',
    title: 'Арпеджио',
    description: 'Звуки идут волной снизу вверх: левая рука — бас, квинта, октава, правая продолжает аккордом.',
    bar4: [ev(0, 1, 'B'), ev(1, 1, 'B5'), ev(2, 1, 'B8'), ev(3, 1, 'T0'), ev(4, 1, 'T1'), ev(5, 1, 'T2'), ev(6, 1, 'T1'), ev(7, 1, 'T0')],
    bar3: [ev(0, 1, 'B'), ev(1, 1, 'B5'), ev(2, 1, 'B8'), ev(3, 1, 'T0'), ev(4, 1, 'T1'), ev(5, 1, 'T2')],
  },
  {
    id: 'ballad',
    title: 'Баллада',
    description: 'Левая рука перебирает бас — квинта — октава — квинта, правая держит аккорд. Звучит как в поп-балладах.',
    bar4: [ev(0, 4, 'C'), ev(0, 1, 'B'), ev(1, 1, 'B5'), ev(2, 1, 'B8'), ev(3, 1, 'B5'), ev(4, 4, 'C'), ev(4, 1, 'B'), ev(5, 1, 'B5'), ev(6, 1, 'B8'), ev(7, 1, 'B5')],
    bar3: [ev(0, 6, 'C'), ev(0, 1, 'B'), ev(1, 1, 'B5'), ev(2, 1, 'B8'), ev(3, 1, 'B5'), ev(4, 1, 'B8'), ev(5, 1, 'B5')],
  },
];

export const findPattern = (id: string) => PATTERNS.find((p) => p.id === id) ?? PATTERNS[0];

export interface NoteEvent {
  /** Eighths from the start of the slot. */
  at: number;
  len: number;
  midis: number[];
  hand: 'L' | 'R';
}

/** Concrete notes for one chord slot (`eighths` long) in a pattern. */
export function realize(pattern: Pattern, meter: 3 | 4, chord: Chord, voicing: number[], eighths: number): NoteEvent[] {
  const bass = bassOf(chord);
  const v = [...voicing].sort((a, b) => a - b);
  const role = (r: Role): number[] => {
    switch (r) {
      case 'B': return [bass];
      case 'B5': return [bass + 7];
      case 'B8': return [bass + 12];
      case 'C': return v;
      default: return [v[Math.min(Number(r[1]), v.length - 1)]];
    }
  };
  const events = meter === 3 ? pattern.bar3 : pattern.bar4;
  return events
    .filter((e) => e.at < eighths)
    .flatMap((e) => {
      const left = e.roles.filter((r) => r.startsWith('B'));
      const right = e.roles.filter((r) => !r.startsWith('B'));
      const len = Math.min(e.len, eighths - e.at);
      const out: NoteEvent[] = [];
      if (left.length) out.push({ at: e.at, len, midis: left.flatMap(role), hand: 'L' });
      if (right.length) out.push({ at: e.at, len, midis: right.flatMap(role), hand: 'R' });
      return out;
    });
}
