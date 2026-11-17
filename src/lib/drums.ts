/** Drum patterns for the Jam: one bar each, 16 steps in 4/4 (12 in 3/4); x = loud, o = soft. */
import type { DrumKind } from './audio';

export interface DrumStyle {
  id: string;
  title: string;
  meter: 3 | 4;
  /** 0.5 = straight eighths; ~0.66 = swing / shuffle. */
  swing: number;
  parts: Partial<Record<DrumKind, string>>;
}

export const DRUMS: DrumStyle[] = [
  { id: 'rock', title: 'Рок', meter: 4, swing: 0.5, parts: { kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' } },
  { id: 'pop', title: 'Поп', meter: 4, swing: 0.5, parts: { kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'xoxoxoxoxoxoxoxo' } },
  { id: 'shuffle', title: 'Шаффл (блюз)', meter: 4, swing: 0.66, parts: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.o.x.o.x.o.x.o.' } },
  { id: 'funk', title: 'Фанк', meter: 4, swing: 0.5, parts: { kick: 'x..x..x...x.....', snare: '....x..o.o..x..o', hat: 'xoxoxoxoxoxoxoxo' } },
  { id: 'bossa', title: 'Босса-нова', meter: 4, swing: 0.5, parts: { kick: 'x..xx..xx..xx..x', rim: 'x..x..x...x..x..', hat: 'oooooooooooooooo' } },
  { id: 'lofi', title: 'Лоу-фай', meter: 4, swing: 0.6, parts: { kick: 'x......x..x.....', snare: '....x.......x...', hat: 'o.o.o.o.o.o.o.o.' } },
  { id: 'ballad', title: 'Баллада', meter: 4, swing: 0.5, parts: { kick: 'x.......o.......', snare: '........x.......', hat: 'o.o.o.o.o.o.o.o.' } },
  { id: 'waltz', title: 'Вальс', meter: 3, swing: 0.5, parts: { kick: 'x...........', snare: '....o...o...', hat: 'o.o.o.o.o.o.' } },
];

export const findDrums = (id: string) => DRUMS.find((d) => d.id === id);

/** Default drums for a harmony: blues → shuffle, 3/4 → waltz… */
export function drumsFor(meter: 3 | 4, hint: string): string {
  if (meter === 3) return 'waltz';
  if (/blues|блюз/i.test(hint)) return 'shuffle';
  if (/dream|lofi|мечт/i.test(hint)) return 'lofi';
  if (/ballad|баллад|epic|эпич/i.test(hint)) return 'rock';
  return 'pop';
}

export interface DrumHit {
  kind: DrumKind;
  /** Position in beats from the bar start. */
  at: number;
  vel: number;
}

/** Hits of one bar (style meter adapts: a 4/4 style in a 3/4 song drops its last beat). */
export function barHits(style: DrumStyle, meter: 3 | 4): DrumHit[] {
  const out: DrumHit[] = [];
  const steps = meter * 4;
  for (const [kind, pat] of Object.entries(style.parts) as [DrumKind, string][]) {
    for (let i = 0; i < Math.min(steps, pat.length); i++) {
      const ch = pat[i];
      if (ch === '.') continue;
      // Swing pushes the off-beat eighth (steps 2, 6, 10…) later.
      const beat = Math.floor(i / 4);
      const sub = i % 4;
      const at = beat + (sub === 2 ? style.swing : sub / 4);
      out.push({ kind, at, vel: ch === 'x' ? 1 : 0.5 });
    }
  }
  return out;
}
