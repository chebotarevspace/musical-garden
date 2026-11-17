/**
 * Tiny per-key external store. MIDI handlers write here directly and each
 * <Key> subscribes only to its own MIDI number, so a note-on re-renders exactly
 * one key and never the whole keyboard.
 *
 * A key shows its press state (correct / wrong) while held; otherwise an optional
 * mark: `hint` (the answer), `next` (what to play next), `demo` (played by a demonstration).
 * Marks may carry a short label — a finger number or a chord degree.
 */

export type PressState = 'correct' | 'wrong';
export type MarkKind = 'hint' | 'next' | 'demo';
export type KeyVisual = 'idle' | PressState | MarkKind;

export interface Mark {
  kind: MarkKind;
  label?: string;
}

type Listener = () => void;

export interface KeyStore {
  /** Snapshot string "visual|label" (stable primitive for useSyncExternalStore). */
  snapshot(midi: number): string;
  isPressed(midi: number): boolean;
  pressed(): number[];
  press(midi: number, state: PressState): void;
  release(midi: number): void;
  releaseAll(): void;
  setMark(midi: number, mark: Mark | null): void;
  /** Replaces all marks of the given kinds (others stay). */
  replaceMarks(marks: Map<number, Mark>, kinds?: MarkKind[]): void;
  clearMarks(kinds?: MarkKind[]): void;
  subscribe(midi: number, listener: Listener): () => void;
}

export function parseSnapshot(snap: string): { visual: KeyVisual; label: string } {
  const i = snap.indexOf('|');
  return { visual: snap.slice(0, i) as KeyVisual, label: snap.slice(i + 1) };
}

const ALL_KINDS: MarkKind[] = ['hint', 'next', 'demo'];

export function createKeyStore(): KeyStore {
  const pressedMap = new Map<number, PressState>();
  const marks = new Map<number, Mark>();
  const listeners = new Map<number, Set<Listener>>();

  const notify = (midi: number) => listeners.get(midi)?.forEach((l) => l());

  const store: KeyStore = {
    snapshot(midi) {
      const mark = marks.get(midi);
      return `${pressedMap.get(midi) ?? mark?.kind ?? 'idle'}|${mark?.label ?? ''}`;
    },
    isPressed: (midi) => pressedMap.has(midi),
    pressed: () => [...pressedMap.keys()],
    press(midi, state) {
      // Colour is fixed at the moment of press and kept until release.
      pressedMap.set(midi, state);
      notify(midi);
    },
    release(midi) {
      if (pressedMap.delete(midi)) notify(midi);
    },
    releaseAll() {
      const keys = [...pressedMap.keys()];
      pressedMap.clear();
      keys.forEach(notify);
    },
    setMark(midi, mark) {
      const cur = marks.get(midi);
      if (!mark && !cur) return;
      if (mark && cur && cur.kind === mark.kind && cur.label === mark.label) return;
      if (mark) marks.set(midi, mark);
      else marks.delete(midi);
      notify(midi);
    },
    replaceMarks(next, kinds = ALL_KINDS) {
      for (const [midi, mark] of [...marks]) {
        if (kinds.includes(mark.kind) && !next.has(midi)) store.setMark(midi, null);
      }
      next.forEach((mark, midi) => store.setMark(midi, mark));
    },
    clearMarks(kinds = ALL_KINDS) {
      store.replaceMarks(new Map(), kinds);
    },
    subscribe(midi, listener) {
      let set = listeners.get(midi);
      if (!set) listeners.set(midi, (set = new Set()));
      set.add(listener);
      return () => {
        set!.delete(listener);
      };
    },
  };
  return store;
}
