/**
 * When a key press arrives late (the microphone needs ~70 ms to recognise a note), timing-sensitive
 * trainers ask `inputNow()` instead of `performance.now()` — it moves the press back to when it sounded.
 */
let lag = 0;

export const inputNow = () => performance.now() - lag;

/** Runs `fn` (the note dispatch) with the given input latency applied. */
export function withInputLag<T>(ms: number, fn: () => T): T {
  lag = ms;
  try {
    return fn();
  } finally {
    lag = 0;
  }
}
