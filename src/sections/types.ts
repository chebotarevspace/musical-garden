import type { MutableRefObject } from 'react';
import type { MascotApi } from '../hooks/useMascotMood';
import type { KeyStore } from '../lib/keyStore';
import type { OctaveRange } from '../lib/notes';
import type { Settings } from '../lib/storage';

export type SectionId = 'home' | 'jam' | 'drops' | 'studio' | 'learn' | 'notes' | 'fluency' | 'chords' | 'ear' | 'songs';

/** How a section judged a key press. 'ignored' = not judged, no colour. */
export type PressResult = 'correct' | 'wrong' | 'ignored';

/** Keyboard input routed from App (MIDI + mouse/touch) to the active section. */
export interface SectionInput {
  noteOn(midi: number): PressResult;
  noteOff(midi: number): void;
  releaseAll(): void;
}

/** What every section receives from the app shell. */
export interface SectionProps {
  store: KeyStore;
  settings: Settings;
  update(patch: Partial<Settings>): void;
  inputRef: MutableRefObject<SectionInput | null>;
  mascot: MascotApi;
  say(text: string): void;
  octaveOffset: number;
  midiConnected: boolean;
  /** Octaves the small-screen keyboard should show for this section. */
  setKeyboardRange(range: OctaveRange): void;
}
