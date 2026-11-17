import { memo, useEffect, useRef } from 'react';
import { type NoteName, formatNote } from '../lib/notes';
import { AccidentalGlyph } from './AccidentalGlyph';
import s from './NoteDisplay.module.css';

interface Props {
  note: NoteName;
  targetId: number;
  shakeId: number;
  /** Found and still held: shown in green until the key is released. */
  solved?: boolean;
}

const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-12px)' },
  { transform: 'translateX(10px)' },
  { transform: 'translateX(-7px)' },
  { transform: 'translateX(4px)' },
  { transform: 'translateX(0)' },
];

export const NoteDisplay = memo(function NoteDisplay({ note, targetId, shakeId, solved = false }: Props) {
  const shakerRef = useRef<HTMLDivElement>(null);

  // Web Animations API: restarts on every miss without remounting the code.
  useEffect(() => {
    const el = shakerRef.current;
    if (!shakeId || !el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.animate(reduce ? [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }] : SHAKE, {
      duration: reduce ? 260 : 340,
      easing: 'cubic-bezier(.36,.07,.19,.97)',
    });
  }, [shakeId]);

  const octave = String(note.octave).replace('-', '−');

  return (
    <div className={s.shaker} ref={shakerRef}>
      <div key={targetId} className={solved ? `${s.code} ${s.solved}` : s.code} role="status" aria-live="polite" aria-label={formatNote(note)}>
        <span className={s.letter}>{note.letter}</span>
        {note.accidental !== 'natural' && (
          <AccidentalGlyph kind={note.accidental} className={note.accidental === 'sharp' ? s.sharp : s.flat} />
        )}
        <span className={s.octave}>{octave}</span>
      </div>
    </div>
  );
});
