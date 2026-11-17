import { useId } from 'react';
import { noteFromCode } from '../learn/music';
import type { HandEvent } from '../lib/handsReading';
import { type Clef, ledgerSteps, staffStep } from '../lib/staff';
import { AccidentalGlyph } from './AccidentalGlyph';
import type { LineNoteState } from './StaffLine';
import s from './StaffLine.module.css';

const GAP = 12;
const HALF = GAP / 2;
const BOTTOM: Record<Clef, number> = { treble: 100, bass: 208 };
const START_X = 92;

const REST_GLYPH = (d: number) => (d >= 4 ? '𝄻' : d >= 2 ? '𝄼' : d >= 1 ? '𝄽' : d >= 0.5 ? '𝄾' : '𝄿');
const dotted = (d: number) => [0.75, 1.5, 3].some((x) => Math.abs(d - x) < 0.01);

interface Props {
  events: HandEvent[];
  bars: number;
  meter?: number;
  /** State of each event (same order as `events`). */
  states?: LineNoteState[];
  /** Note names under the notes (for beginners). */
  labels?: boolean;
  /** Where the play cursor is, in beats (tempo mode). */
  cursor?: number | null;
  theme?: 'dark' | 'light';
}

/** Horizontal positions: wider gaps for longer notes, a little air after each bar line. */
function layout(events: HandEvent[], bars: number, meter: number) {
  const beats = [...new Set([...events.map((e) => Math.round(e.beat * 1000) / 1000), ...Array.from({ length: bars }, (_, b) => b * meter)])].sort((a, b) => a - b);
  const xs = new Map<number, number>();
  const barX: number[] = [];
  let x = START_X;
  beats.forEach((b, i) => {
    if (i > 0) x += 18 + 30 * Math.sqrt(b - beats[i - 1]);
    if (Math.abs(b % meter) < 1e-6) {
      if (b > 0) {
        barX.push(x - 2);
        x += 16;
      } else x += 4;
    }
    xs.set(b, x);
  });
  const end = x + 18 + 30 * Math.sqrt(meter - (beats[beats.length - 1] % meter || meter) + 1e-9) + 6;
  return { xs, barX, end };
}

/** The grand staff for two hands: the right hand on the treble staff, the left on the bass staff. */
export function GrandStaff({ events, bars, meter = 4, states, labels, cursor = null, theme = 'dark' }: Props) {
  const maskId = useId();
  const { xs, barX, end } = layout(events, bars, meter);
  const W = end + 8;
  const H = BOTTOM.bass + 44;
  const xOf = (beat: number) => xs.get(Math.round(beat * 1000) / 1000) ?? START_X;
  // The cursor sits between known positions in tempo mode.
  const cursorX = (() => {
    if (cursor === null) return null;
    const keys = [...xs.keys()];
    let i = keys.findIndex((k) => k > cursor) - 1;
    if (i < -1) i = keys.length - 1;
    if (i < 0) return xs.get(keys[0])!;
    const a = keys[i];
    const b = keys[i + 1];
    if (b === undefined) return xs.get(a)! + Math.min(1, cursor - a) * 40;
    return xs.get(a)! + ((cursor - a) / (b - a)) * (xs.get(b)! - xs.get(a)!);
  })();

  return (
    <svg className={s.root} data-theme={theme} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Упражнение для двух рук на большом нотном стане">
      <defs>
        <mask id={maskId} maskContentUnits="userSpaceOnUse">
          <rect x="-20" y="-20" width="40" height="40" fill="white" />
          <ellipse rx={4.1} ry={4.6} transform="rotate(-38)" fill="black" />
        </mask>
      </defs>

      {(['treble', 'bass'] as const).map((c) => (
        <g key={c}>
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} className={s.line} x1={14} x2={W - 4} y1={BOTTOM[c] - i * GAP} y2={BOTTOM[c] - i * GAP} />
          ))}
          {c === 'treble' ? (
            <text className={s.clef} x={20} y={BOTTOM.treble + 1.3} fontSize={GAP * 4.33}>
              𝄞
            </text>
          ) : (
            <text className={s.clef} x={20} y={BOTTOM.bass - 4.7} fontSize={GAP * 4.05}>
              𝄢
            </text>
          )}
          <text className={s.clef} x={62} y={BOTTOM[c] - 2 * GAP - 2} fontSize={25} textAnchor="middle" fontWeight={700}>
            {meter}
          </text>
          <text className={s.clef} x={62} y={BOTTOM[c] + 1} fontSize={25} textAnchor="middle" fontWeight={700}>
            4
          </text>
        </g>
      ))}
      {/* the brace line and bar lines through both staves */}
      <line className={s.bar} x1={14} x2={14} y1={BOTTOM.treble - 4 * GAP} y2={BOTTOM.bass} style={{ opacity: 0.9 }} />
      <path d={`M10 ${BOTTOM.treble - 4 * GAP} q -7 ${(BOTTOM.bass - BOTTOM.treble + 4 * GAP) / 4} 0 ${(BOTTOM.bass - BOTTOM.treble + 4 * GAP) / 2} q 7 ${(BOTTOM.bass - BOTTOM.treble + 4 * GAP) / 4} 0 ${(BOTTOM.bass - BOTTOM.treble + 4 * GAP) / 2}`} fill="none" className={s.flag} />
      {barX.map((x, i) => (
        <line key={i} className={s.bar} x1={x} x2={x} y1={BOTTOM.treble - 4 * GAP} y2={BOTTOM.bass} />
      ))}
      <line className={s.bar} x1={W - 10} x2={W - 10} y1={BOTTOM.treble - 4 * GAP} y2={BOTTOM.bass} />
      <line className={s.bar} x1={W - 5} x2={W - 5} y1={BOTTOM.treble - 4 * GAP} y2={BOTTOM.bass} style={{ strokeWidth: 3.5, opacity: 0.8 }} />

      {cursorX !== null && <rect className={s.cursor} x={cursorX - 15} y={BOTTOM.treble - 4 * GAP - 26} width={30} height={BOTTOM.bass - BOTTOM.treble + 4 * GAP + 52} rx={10} />}

      {events.map((e, i) => {
        const clef: Clef = e.hand === 'R' ? 'treble' : 'bass';
        const bottom = BOTTOM[clef];
        const x = xOf(e.beat);
        const state = states?.[i] ?? 'todo';
        if (!e.midis.length) {
          // Whole rest hangs from the 4th line, half rest sits on the 3rd.
          return (
            <g key={i} className={s.note} data-state={state === 'current' ? 'todo' : state}>
              <text className={s.rest} x={x} y={bottom - 2 * GAP + 9} textAnchor="middle">
                {REST_GLYPH(e.dur)}
              </text>
            </g>
          );
        }
        const notes = e.codes.map((code) => {
          const n = noteFromCode(code);
          const step = staffStep(n, clef);
          return { n, step, y: bottom - step * HALF };
        });
        const steps = notes.map((q) => q.step);
        const lo = Math.min(...steps);
        const hi = Math.max(...steps);
        const up = (lo + hi) / 2 < 4;
        const sx = up ? x + 7 : x - 7;
        const fromY = up ? bottom - lo * HALF : bottom - hi * HALF;
        const toY = up ? bottom - hi * HALF - 34 : bottom - lo * HALF + 34;
        const flags = e.dur <= 0.25 + 0.01 ? 2 : e.dur <= 0.5 + 0.01 ? 1 : 0;
        const ledgers = [...new Set(notes.flatMap((q) => ledgerSteps(q.step)))];
        return (
          <g key={i} className={s.note} data-state={state}>
            {ledgers.map((k) => (
              <line key={k} className={s.ledger} x1={x - 13} x2={x + 13} y1={bottom - k * HALF} y2={bottom - k * HALF} />
            ))}
            {notes.map((q, k) => (
              <g key={k}>
                {q.n.accidental !== 'natural' && (
                  <AccidentalGlyph
                    kind={q.n.accidental}
                    className={s.acc}
                    x={x - 30}
                    y={q.n.accidental === 'sharp' ? q.y - 14 : q.y - 19}
                    width={q.n.accidental === 'sharp' ? 16 : 15}
                    height={27}
                  />
                )}
                {e.dur >= 2 ? (
                  <ellipse className={s.head} rx={8.2} ry={5.8} transform={`translate(${x} ${q.y})`} mask={`url(#${maskId})`} />
                ) : (
                  <ellipse className={s.head} rx={7.4} ry={5.4} transform={`translate(${x} ${q.y}) rotate(-22)`} />
                )}
                {dotted(e.dur) && <circle className={s.head} cx={x + 13} cy={q.step % 2 === 0 ? q.y - HALF : q.y} r={2.2} />}
              </g>
            ))}
            {e.dur < 4 && <line className={s.stem} x1={sx} x2={sx} y1={fromY} y2={toY} />}
            {Array.from({ length: flags }, (_, k) => {
              const fy = toY + (up ? k * 8 : -k * 8);
              return <path key={k} className={s.flag} d={up ? `M${sx} ${fy} q 10 6 8 18` : `M${sx} ${fy} q 10 -6 8 -18`} />;
            })}
            {labels && (
              <text className={s.label} x={x} y={clef === 'treble' ? BOTTOM.treble + 26 + (lo < -3 ? 10 : 0) : BOTTOM.bass + 30 + (lo < -3 ? 10 : 0)}>
                {e.codes.map((c) => c.replace(/\d+$/, '').replace('b', '♭').replace('#', '♯')).join(' ')}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
