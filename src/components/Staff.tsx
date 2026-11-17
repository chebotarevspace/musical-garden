import { memo, useEffect, useId, useRef } from 'react';
import type { NoteName } from '../lib/notes';
import { type Clef, type ClefChoice, clefFor, ledgerSteps, staffStep } from '../lib/staff';
import { AccidentalGlyph } from './AccidentalGlyph';
import s from './Staff.module.css';

interface Props {
  /** Note in scientific octaves (C4 = middle C). */
  note: NoteName;
  clef: ClefChoice;
  targetId: number;
  shakeId: number;
  solved: boolean;
  /** Text shown under the staff once the note is found, e.g. "E4". */
  reveal: string | null;
}

const GAP = 12; // distance between staff lines
const HALF = GAP / 2;
const LEFT = 16;
const RIGHT = 284;
const NOTE_X = 186;

/** Bottom-line y of each staff for single / grand layouts. */
const LAYOUT = {
  single: { height: 196, bottom: { treble: 122, bass: 122 } as Record<Clef, number> },
  grand: { height: 290, bottom: { treble: 106, bass: 222 } as Record<Clef, number> },
};

const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-10px)' },
  { transform: 'translateX(8px)' },
  { transform: 'translateX(-5px)' },
  { transform: 'translateX(3px)' },
  { transform: 'translateX(0)' },
];

function StaffLines({ bottom }: { bottom: number }) {
  return (
    <g className={s.lines}>
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={LEFT} x2={RIGHT} y1={bottom - i * GAP} y2={bottom - i * GAP} />
      ))}
    </g>
  );
}

function ClefGlyph({ clef, bottom }: { clef: Clef; bottom: number }) {
  // Glyphs from Noto Music: 𝄞 curls around the G line, 𝄢 dots straddle the F line.
  return clef === 'treble' ? (
    <text className={s.clef} x={LEFT + 5} y={bottom + 1.3} fontSize={GAP * 4.33}>
      𝄞
    </text>
  ) : (
    <text className={s.clef} x={LEFT + 5} y={bottom - 4.7} fontSize={GAP * 4.05}>
      𝄢
    </text>
  );
}

export const Staff = memo(function Staff({ note, clef: choice, targetId, shakeId, solved, reveal }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const maskId = useId();
  const grand = choice === 'grand';
  const layout = grand ? LAYOUT.grand : LAYOUT.single;
  const clef = clefFor(choice, note.midi);
  const bottom = layout.bottom[clef];
  const step = staffStep(note, clef);
  const y = bottom - step * HALF;
  const accidental = note.accidental === 'natural' ? null : note.accidental;

  useEffect(() => {
    const el = cardRef.current;
    if (!shakeId || !el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.animate(reduce ? [{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }] : SHAKE, { duration: 340, easing: 'cubic-bezier(.36,.07,.19,.97)' });
  }, [shakeId]);

  return (
    <div className={s.wrap}>
      <div className={s.card} ref={cardRef} data-solved={solved || undefined} data-grand={grand || undefined}>
        <svg className={s.svg} viewBox={`0 0 300 ${layout.height}`} role="img" aria-label="Нота на нотном стане">
          <defs>
            <mask id={maskId} maskContentUnits="userSpaceOnUse">
              <rect x="-20" y="-20" width="40" height="40" fill="white" />
              <ellipse rx="4.1" ry="4.6" transform="rotate(-38)" fill="black" />
            </mask>
          </defs>

          {grand ? (
            <>
              <StaffLines bottom={layout.bottom.treble} />
              <StaffLines bottom={layout.bottom.bass} />
              <ClefGlyph clef="treble" bottom={layout.bottom.treble} />
              <ClefGlyph clef="bass" bottom={layout.bottom.bass} />
              <line className={s.bar} x1={LEFT} x2={LEFT} y1={layout.bottom.treble - 4 * GAP} y2={layout.bottom.bass} />

            </>
          ) : (
            <>
              <StaffLines bottom={bottom} />
              <ClefGlyph clef={clef} bottom={bottom} />
            </>
          )}
          <line className={s.bar} x1={RIGHT} x2={RIGHT} y1={grand ? layout.bottom.treble - 4 * GAP : bottom - 4 * GAP} y2={grand ? layout.bottom.bass : bottom} />

          <g key={targetId} className={s.note}>
            <g className={s.lines}>
              {ledgerSteps(step).map((k) => (
                <line key={k} className={s.ledger} x1={NOTE_X - 15} x2={NOTE_X + 15} y1={bottom - k * HALF} y2={bottom - k * HALF} />
              ))}
            </g>
            {accidental && (
              <AccidentalGlyph
                kind={accidental}
                className={s.acc}
                x={NOTE_X - 34}
                y={accidental === 'sharp' ? y - 15 : y - 21}
                width={accidental === 'sharp' ? 18 : 16.5}
                height={30}
              />
            )}
            <g transform={`translate(${NOTE_X} ${y})`}>
              <ellipse className={s.head} rx="8.6" ry="6.1" mask={`url(#${maskId})`} />
            </g>
          </g>
        </svg>
      </div>
      <div className={s.reveal} aria-live="polite">
        {reveal ?? ' '}
      </div>
    </div>
  );
});
