import { CIRCLE, findCircleKey, neighbours } from '../lib/circle';
import s from './CircleOfFifths.module.css';

interface Props {
  /** Selected major key id ("C", "F#", "Bb"…). */
  value: string;
  onSelect(majorId: string): void;
  theme?: 'dark' | 'light';
  size?: number;
}

const C = 170; // centre
const R_OUT = 150;
const R_MID = 106;
const R_IN = 66;

const polar = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};

function sector(r1: number, r2: number, a1: number, a2: number) {
  const [x1, y1] = polar(r2, a1);
  const [x2, y2] = polar(r2, a2);
  const [x3, y3] = polar(r1, a2);
  const [x4, y4] = polar(r1, a1);
  return `M${x1} ${y1} A${r2} ${r2} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 0 0 ${x4} ${y4} Z`;
}

const accLabel = (n: number) => (n === 0 ? '' : n > 0 ? `${n}♯` : `${-n}♭`);

/** Interactive circle of fifths: major keys outside, relative minors inside. */
export function CircleOfFifths({ value, onSelect, theme = 'dark', size = 340 }: Props) {
  const sel = findCircleKey(value);
  const { iv, v } = neighbours(value);
  return (
    <svg className={s.root} data-theme={theme} viewBox="0 0 340 340" width={size} height={size} role="group" aria-label="Квинтовый круг">
      {CIRCLE.map((k, i) => {
        const a1 = i * 30 - 15;
        const a2 = i * 30 + 15;
        const role = k === sel ? 'selected' : k === iv ? 'iv' : k === v ? 'v' : undefined;
        const [lx, ly] = polar((R_OUT + R_MID) / 2, i * 30);
        const [mx, my] = polar((R_MID + R_IN) / 2, i * 30);
        const [ax, ay] = polar(R_OUT + 11, i * 30);
        return (
          <g key={k.major.id} className={s.slice} data-role={role} onClick={() => onSelect(k.major.id)}>
            <title>
              {k.major.label} / {k.minor.label}
              {k.accidentals ? ` — ${accLabel(k.accidentals)}` : ' — без знаков'}
            </title>
            <path className={s.major} d={sector(R_MID, R_OUT, a1, a2)} />
            <path className={s.minor} d={sector(R_IN, R_MID, a1, a2)} />
            <text className={s.majorLabel} x={lx} y={ly}>
              {k.major.label}
            </text>
            <text className={s.minorLabel} x={mx} y={my}>
              {k.minor.label}
            </text>
            <text className={s.acc} x={ax} y={ay}>
              {accLabel(k.accidentals)}
            </text>
          </g>
        );
      })}
      <circle className={s.centre} cx={C} cy={C} r={R_IN - 4} />
      <text className={s.centreKey} x={C} y={C - 6}>
        {sel.major.label}
      </text>
      <text className={s.centreSub} x={C} y={C + 18}>
        {sel.accidentals === 0 ? 'без знаков' : accLabel(sel.accidentals)} · {sel.minor.label}
      </text>
    </svg>
  );
}
