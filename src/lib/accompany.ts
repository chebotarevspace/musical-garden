/** Plays chord slots in an accompaniment pattern (demo / "listen"). One playback at a time. */
import { noteStart, noteStop, primeAudio } from './audio';
import type { Chord } from './chords';
import { type Pattern, realize } from './patterns';

export interface Slot {
  chord: Chord;
  /** Length in quarter-note beats. */
  beats: number;
}

let timers: number[] = [];
let sounding = new Map<number, number>(); // midi → how many events hold it
let notify: ((midi: number, on: boolean) => void) | undefined;

export function stopAccompaniment() {
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
  sounding.forEach((_, m) => {
    noteStop(m, 0.15);
    notify?.(m, false);
  });
  sounding = new Map();
}

export function playAccompaniment(
  slots: Slot[],
  voicings: number[][],
  pattern: Pattern,
  meter: 3 | 4,
  bpm: number,
  hooks: { onSlot?(i: number | null): void; onNote?(midi: number, on: boolean): void } = {},
) {
  primeAudio();
  stopAccompaniment();
  notify = hooks.onNote;
  const eighth = 30000 / bpm;
  let start = 0; // in eighths
  slots.forEach((slot, i) => {
    const len = slot.beats * 2;
    const slotStart = start;
    timers.push(window.setTimeout(() => hooks.onSlot?.(i), slotStart * eighth));
    for (const e of realize(pattern, meter, slot.chord, voicings[i], len)) {
      const on = (slotStart + e.at) * eighth;
      const off = on + e.len * eighth * 0.94;
      timers.push(
        window.setTimeout(() => {
          for (const m of e.midis) {
            noteStart(m, e.hand === 'L' ? 72 : 64);
            sounding.set(m, (sounding.get(m) ?? 0) + 1);
            hooks.onNote?.(m, true);
          }
        }, on),
      );
      timers.push(
        window.setTimeout(() => {
          for (const m of e.midis) {
            const left = (sounding.get(m) ?? 1) - 1;
            if (left <= 0) {
              sounding.delete(m);
              noteStop(m, 0.18);
              hooks.onNote?.(m, false);
            } else sounding.set(m, left);
          }
        }, off),
      );
    }
    start += len;
  });
  timers.push(window.setTimeout(() => hooks.onSlot?.(null), start * eighth + 80));
}
