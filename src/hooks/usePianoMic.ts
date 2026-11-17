import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { primeAudio, stopAllNotes } from '../lib/audio';
import { withInputLag } from '../lib/inputClock';
import type { Settings } from '../lib/storage';
import { MIC_LATENCY_MS, useMicInput } from './useMicInput';

interface Options {
  settings: Settings;
  settingsRef: MutableRefObject<Settings>;
  update(patch: Partial<Settings>): void;
  noteOn(midi: number, velocity?: number): void;
  noteOff(midi: number): void;
}

/** Hold notes this long after the last new one — enough to spread a chord as an arpeggio. */
const LATCH_MS = 1200;

/**
 * An acoustic piano through the microphone, wired into the app's note input.
 * The mic hears one note at a time, so in chord-based sections notes stay «held»
 * until a moment after the last new note — a chord can be played as a quick arpeggio.
 */
export function usePianoMic({ settings, settingsRef, update, noteOn, noteOff }: Options) {
  const latch = useRef<{ held: Set<number>; timer: number }>({ held: new Set(), timer: 0 });

  const releaseLatch = useCallback(() => {
    const L = latch.current;
    window.clearTimeout(L.timer);
    const held = [...L.held];
    L.held.clear();
    for (const m of held) noteOff(m);
  }, [noteOff]);

  const micNoteOn = useCallback(
    (m: number, v: number) => {
      const L = latch.current;
      if (L.held.size) {
        window.clearTimeout(L.timer);
        L.timer = window.setTimeout(releaseLatch, LATCH_MS);
        if (L.held.has(m)) return; // still held from the arpeggio
      }
      withInputLag(MIC_LATENCY_MS, () => noteOn(m, v));
    },
    [noteOn, releaseLatch],
  );

  const micNoteOff = useCallback(
    (m: number) => {
      const sec = settingsRef.current.section;
      if (sec === 'chords' || sec === 'songs') {
        const L = latch.current;
        L.held.add(m);
        window.clearTimeout(L.timer);
        L.timer = window.setTimeout(releaseLatch, LATCH_MS);
        return;
      }
      noteOff(m);
    },
    [noteOff, releaseLatch, settingsRef],
  );

  const mic = useMicInput({
    enabled: settings.micOn,
    sensitivity: settings.micSensitivity,
    headphones: settings.micHeadphones,
    onNoteOn: micNoteOn,
    onNoteOff: micNoteOff,
  });

  /** Turn the mic on/off. A real piano sounds by itself: the app's echo of every key would confuse the mic. */
  const setMic = useCallback(
    (on: boolean) => {
      if (on) primeAudio();
      else releaseLatch();
      update(on ? { micOn: true, noteSound: false } : { micOn: false });
      if (on) stopAllNotes();
    },
    [update, releaseLatch],
  );

  return { mic, setMic };
}
