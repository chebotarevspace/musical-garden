import { useId } from 'react';
import { noteFromCode } from '../learn/music';
import { type Clef, type ClefChoice, ledgerSteps, staffStep } from '../lib/staff';
import { AccidentalGlyph } from './AccidentalGlyph';
import s from './StaffLine.module.css';

export type LineNoteState = 'todo' | 'current' | 'done' | 'wrong';

export interface LineNote {
  code: string;
  state?: LineNoteState;
  /** Shown under the staff (e.g. the note name after the phrase is played). */
  label?: string;
  /** Length in quarter-note beats — draws stems, flags, dots. Without it: a plain notehead. */
  dur?: number;
  /** A rest of `dur` beats instead of a note (`code` is ignored). */
  rest?: boolean;
  /** Draw a bar line before this note. */
  barBefore?: boolean;
  /** A chord symbol above the staff (lead sheets). */
  above?: string;
}

const REST_GLYPH = (d: number) => (d >= 4 ? '𝄻' : d >= 2 ? '𝄼' : d >= 1 ? '𝄽' : d >= 0.5 ? '𝄾' : '𝄿');
const dotted = (d: number) => [0.75, 1.5, 3].some((x) => Math.abs(d - x) < 0.01);

const GAP = 12;
const HALF = GAP / 2;

function ClefGlyph({ clef, bottom }: { clef: Clef; bottom: number }) {
  return clef === 'treble' ? (
    <text className={s.clef} x={8} y={bottom + 1.3} fontSize={GAP * 4.33}>
      𝄞
    </text>
  ) : (
    <text className={s.clef} x={8} y={bottom - 4.7} fontSize={GAP * 4.05}>
      𝄢
    </text>
  );
}

/** A row of notes on one staff (or the grand staff): used for melodies and sight-reading. */
export function StaffLine({ notes, clef, theme = 'dark', noteWidth = 46 }: { notes: LineNote[]; clef: ClefChoice; theme?: 'dark' | 'light'; noteWidth?: number }) {
  const maskId = useId();
  const grand = clef === 'grand';
  const bottoms: Record<Clef, number> = grand ? { treble: 96, bass: 204 } : { treble: 110, bass: 110 };
  const staves: Clef[] = grand ? ['treble', 'bass'] : [clef as Clef];
  const startX = 64;
  const W = startX + notes.length * noteWidth + 16;
  const last = grand ? bottoms.bass : bottoms[clef as Clef];
  const aboveY = 20;
  const labelY = last + 46;
  const H = labelY + 8;

  return (
    <svg className={s.root} data-theme={theme} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Мелодия на нотном стане">
      <defs>
        <mask id={maskId} maskContentUnits="userSpaceOnUse">
          <rect x="-20" y="-20" width="40" height="40" fill="white" />
          <ellipse rx={4.1} ry={4.6} transform="rotate(-38)" fill="black" />
        </mask>
      </defs>
      {staves.map((c) => (
        <g key={c}>
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} className={s.line} x1={4} x2={W - 4} y1={bottoms[c] - i * GAP} y2={bottoms[c] - i * GAP} />
          ))}
          <ClefGlyph clef={c} bottom={bottoms[c]} />
        </g>
      ))}
      {grand && <line className={s.line} x1={4} x2={4} y1={bottoms.treble - 4 * GAP} y2={bottoms.bass} />}

      {notes.map((n, i) => {
        const x0 = startX + i * noteWidth + noteWidth / 2;
        const bar = n.barBefore ? <line className={s.bar} x1={x0 - noteWidth / 2} x2={x0 - noteWidth / 2} y1={bottoms[grand ? 'treble' : (clef as Clef)] - 4 * GAP} y2={last} /> : null;
        if (n.rest) {
          const c: Clef = grand ? 'treble' : (clef as Clef);
          return (
            <g key={i} className={s.note} data-state={n.state ?? 'todo'}>
              {bar}
              {n.above && (
                <text className={s.above} x={x0 - 6} y={aboveY}>
                  {n.above}
                </text>
              )}
              {n.state === 'current' && <rect className={s.cursor} x={x0 - noteWidth / 2 + 4} y={8} width={noteWidth - 8} height={last + 18} rx={10} />}
              <text className={s.rest} x={x0} y={bottoms[c] - 2 * GAP + 9} textAnchor="middle">
                {REST_GLYPH(n.dur ?? 1)}
              </text>
            </g>
          );
        }
        const note = noteFromCode(n.code);
        const c: Clef = grand ? (note.midi >= 60 ? 'treble' : 'bass') : (clef as Clef);
        const step = staffStep(note, c);
        const y = bottoms[c] - step * HALF;
        const x = startX + i * noteWidth + noteWidth / 2;
        return (
          <g key={i} className={s.note} data-state={n.state ?? 'todo'}>
            {bar}
            {n.above && (
              <text className={s.above} x={x - 6} y={aboveY}>
                {n.above}
              </text>
            )}
            {n.state === 'current' && <rect className={s.cursor} x={x - noteWidth / 2 + 4} y={8} width={noteWidth - 8} height={last + 18} rx={10} />}
            {ledgerSteps(step).map((k) => (
              <line key={k} className={s.ledger} x1={x - 13} x2={x + 13} y1={bottoms[c] - k * HALF} y2={bottoms[c] - k * HALF} />
            ))}
            {note.accidental !== 'natural' && (
              <AccidentalGlyph
                kind={note.accidental}
                className={s.acc}
                x={x - 30}
                y={note.accidental === 'sharp' ? y - 14 : y - 19}
                width={note.accidental === 'sharp' ? 16 : 15}
                height={27}
              />
            )}
            {n.dur === undefined || n.dur >= 2 ? (
              <ellipse className={s.head} rx={8.2} ry={5.8} transform={`translate(${x} ${y})`} mask={`url(#${maskId})`} />
            ) : (
              <ellipse className={s.head} rx={7.4} ry={5.4} transform={`translate(${x} ${y}) rotate(-22)`} />
            )}
            {n.dur !== undefined && n.dur < 4 && (() => {
              // Stem up for notes below the middle line, down otherwise; flags for eighths and 16ths.
              const up = step < 4;
              const sx = up ? x + 7 : x - 7;
              const sy = up ? y - 34 : y + 34;
              const flags = n.dur <= 0.25 + 0.01 ? 2 : n.dur <= 0.5 + 0.01 ? 1 : 0;
              return (
                <g>
                  <line className={s.stem} x1={sx} x2={sx} y1={y} y2={sy} />
                  {Array.from({ length: flags }, (_, k) => {
                    const fy = sy + (up ? k * 8 : -k * 8);
                    return <path key={k} className={s.flag} d={up ? `M${sx} ${fy} q 10 6 8 18` : `M${sx} ${fy} q 10 -6 8 -18`} />;
                  })}
                </g>
              );
            })()}
            {n.dur !== undefined && dotted(n.dur) && <circle className={s.head} cx={x + 13} cy={step % 2 === 0 ? y - HALF : y} r={2.2} />}
            {n.label && (
              <text className={s.label} x={x} y={labelY}>
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
