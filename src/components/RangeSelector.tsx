import { memo } from 'react';
import type { CSSProperties } from 'react';
import { OCTAVE_MAX, OCTAVE_MIN, type OctaveRange } from '../lib/notes';
import s from './RangeSelector.module.css';

interface Props {
  range: OctaveRange;
  octaveOffset: number;
  onChange(range: OctaveRange): void;
  /** Hide the built-in "Октавы 3–5" caption (when wrapped in a labelled field). */
  bare?: boolean;
}

const OCTAVES = Array.from({ length: OCTAVE_MAX - OCTAVE_MIN + 1 }, (_, i) => OCTAVE_MIN + i);
const fmt = (n: number) => String(n).replace('-', '−');

/** Dual-thumb slider over octaves 0–8 (labels follow the chosen notation). */
export const RangeSelector = memo(function RangeSelector({ range, octaveOffset, onChange, bare = false }: Props) {
  const { from, to } = range;
  // When both thumbs overlap at the right end, the "from" thumb must be on top to be draggable.
  const fromOnTop = from === to && from >= (OCTAVE_MIN + OCTAVE_MAX) / 2;

  const pickTick = (o: number) => {
    if (o < from) onChange({ from: o, to });
    else if (o > to) onChange({ from, to: o });
    else if (o - from <= to - o) onChange({ from: o, to });
    else onChange({ from, to: o });
  };

  return (
    <div className={s.root}>
      {!bare && <div className={s.caption}>
        <span className={s.captionLabel}>Октавы</span>
        <span className={s.captionValue}>
          {from === to ? fmt(from + octaveOffset) : `${fmt(from + octaveOffset)}–${fmt(to + octaveOffset)}`}
        </span>
      </div>}
      <div
        className={s.slider}
        style={{ '--from': from, '--to': to, '--max': OCTAVE_MAX } as CSSProperties}
      >
        <div className={s.track} />
        <div className={s.fill} />
        <input
          type="range"
          className={s.input}
          style={{ zIndex: fromOnTop ? 4 : 3 }}
          min={OCTAVE_MIN}
          max={OCTAVE_MAX}
          step={1}
          value={from}
          aria-label="Нижняя октава"
          aria-valuetext={`октава ${fmt(from + octaveOffset)}`}
          onChange={(e) => onChange({ from: Math.min(Number(e.target.value), to), to })}
        />
        <input
          type="range"
          className={s.input}
          min={OCTAVE_MIN}
          max={OCTAVE_MAX}
          step={1}
          value={to}
          aria-label="Верхняя октава"
          aria-valuetext={`октава ${fmt(to + octaveOffset)}`}
          onChange={(e) => onChange({ from, to: Math.max(Number(e.target.value), from) })}
        />
        <div className={s.ticks}>
          {OCTAVES.map((o) => (
            <button
              key={o}
              type="button"
              tabIndex={-1}
              className={s.tick}
              data-active={o >= from && o <= to}
              style={{ '--i': o } as CSSProperties}
              onClick={() => pickTick(o)}
            >
              {fmt(o + octaveOffset)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
