/** Shared playback of note sequences (demos, lesson figures, ear training). Independent of the "note sound" toggle. */
import { noteStart, noteStop, primeAudio } from './audio';

const playing = new Set<number>();
let timers: number[] = [];

export function stopSequence() {
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
  playing.forEach((m) => noteStop(m));
  playing.clear();
}

/**
 * Plays steps one after another; each step is a set of notes sounding together.
 * `hold` = fraction of the beat a step sounds. `onStep(null)` fires when done.
 */
export function playSequence(steps: number[][], bpm = 90, onStep?: (i: number | null) => void, hold = 0.9) {
  primeAudio();
  stopSequence();
  const beat = 60000 / bpm;
  steps.forEach((notes, i) => {
    timers.push(
      window.setTimeout(() => {
        onStep?.(i);
        notes.forEach((m) => {
          noteStart(m, 78);
          playing.add(m);
        });
      }, i * beat),
    );
    timers.push(
      window.setTimeout(() => {
        notes.forEach((m) => {
          noteStop(m, 0.25);
          playing.delete(m);
        });
      }, i * beat + beat * hold),
    );
  });
  timers.push(window.setTimeout(() => onStep?.(null), steps.length * beat + 50));
}
