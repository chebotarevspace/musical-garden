import { memo, useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { type KeyRow, FULL_ROW, buildKeyboardLayout } from '../lib/keyboardLayout';
import { type KeyStore, parseSnapshot } from '../lib/keyStore';
import { midiToCode, pitchClass } from '../lib/notes';
import s from './PianoKeyboard.module.css';

interface KeyProps {
  midi: number;
  black: boolean;
  left: number;
  width: number;
  label: string | null;
  store: KeyStore;
}

const Key = memo(function Key({ midi, black, left, width, label, store }: KeyProps) {
  const subscribe = useCallback((cb: () => void) => store.subscribe(midi, cb), [store, midi]);
  const getSnapshot = useCallback(() => store.snapshot(midi), [store, midi]);
  const { visual: state, label: mark } = parseSnapshot(useSyncExternalStore(subscribe, getSnapshot));

  return (
    <div
      data-midi={midi}
      data-state={state}
      className={black ? s.black : s.white}
      style={{ left: `${left}%`, width: `${width}%` }}
    >
      <span className={`${s.fx} ${s.fxCorrect}`} />
      <span className={`${s.fx} ${s.fxWrong}`} />
      <span className={`${s.fx} ${s.fxHint}`} />
      <span className={`${s.fx} ${s.fxNext}`} />
      {mark && <span className={s.mark}>{mark}</span>}
      {label && <span className={s.label}>{label}</span>}
    </div>
  );
});

interface Props {
  store: KeyStore;
  octaveOffset: number;
  /** Rows of keys to draw; defaults to the full 88-key piano in one row. */
  rows?: KeyRow[];
  onPress(midi: number): void;
  onRelease(midi: number): void;
}

function midiFromTarget(target: EventTarget | null): number | null {
  const el = target instanceof Element ? target.closest('[data-midi]') : null;
  return el ? Number(el.getAttribute('data-midi')) : null;
}

const DEFAULT_ROWS = [FULL_ROW];

/** Piano keyboard. Pointer input (mouse, touch, multi-touch) is the fallback when no MIDI device is available. */
export const PianoKeyboard = memo(function PianoKeyboard({
  store,
  octaveOffset,
  rows = DEFAULT_ROWS,
  onPress,
  onRelease,
}: Props) {
  /** pointerId → key it is holding (each finger holds its own key). */
  const held = useRef(new Map<number, number>());
  const cb = useRef({ onPress, onRelease });
  cb.current = { onPress, onRelease };

  const releasePointer = (pointerId: number) => {
    const midi = held.current.get(pointerId);
    if (midi === undefined) return;
    held.current.delete(pointerId);
    if (![...held.current.values()].includes(midi)) cb.current.onRelease(midi);
  };

  useEffect(() => {
    const onUp = (e: PointerEvent) => releasePointer(e.pointerId);
    const releaseAll = () => {
      const keys = new Set(held.current.values());
      held.current.clear();
      keys.forEach((m) => cb.current.onRelease(m));
    };
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', releaseAll);
    };
     
  }, []);

  const handleDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const midi = midiFromTarget(e.target);
    if (midi === null) return;
    e.preventDefault();
    // Touch pointers are captured implicitly; release so sliding off a key counts as letting go.
    const el = e.target as Element;
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    releasePointer(e.pointerId);
    held.current.set(e.pointerId, midi);
    cb.current.onPress(midi);
  };

  // pointer leaves its key = note-off (delegated over all keys)
  const handleOut = (e: ReactPointerEvent) => {
    const from = midiFromTarget(e.target);
    if (from !== null && held.current.get(e.pointerId) === from && from !== midiFromTarget(e.relatedTarget)) {
      releasePointer(e.pointerId);
    }
  };

  const layouts = useMemo(() => rows.map((row) => ({ row, keys: buildKeyboardLayout(row) })), [rows]);

  return (
    <div className={s.keyboard} data-rows={rows.length}>
      <div className={s.lid} aria-hidden="true" />
      <div
        className={s.rows}
        onPointerDown={handleDown}
        onPointerOut={handleOut}
        onContextMenu={(e) => e.preventDefault()}
        role="group"
        aria-label="Клавиатура фортепиано"
      >
        {layouts.map(({ row, keys }) => (
          <div key={`${row.lo}-${row.hi}`} className={s.keys}>
            {keys.map((k) => (
              <Key
                key={k.midi}
                midi={k.midi}
                black={k.black}
                left={k.left}
                width={k.width}
                label={pitchClass(k.midi) === 0 ? midiToCode(k.midi, 'sharp', octaveOffset).replace('-', '−') : null}
                store={store}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});
