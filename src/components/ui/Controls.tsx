import type { ReactNode } from 'react';
import s from './Controls.module.css';

/** Labelled group inside the options bar. */
export function Field({ label, children, value }: { label: string; children: ReactNode; value?: ReactNode }) {
  return (
    <div className={s.field}>
      <div className={s.fieldLabel}>
        {label}
        {value !== undefined && <span className={s.fieldValue}>{value}</span>}
      </div>
      <div className={s.fieldBody}>{children}</div>
    </div>
  );
}

export const Divider = () => <span className={s.divider} aria-hidden="true" />;

/** Compact on/off switch with a label (same look as the switches in Settings). */
export function InlineSwitch({ label, checked, onChange, title }: { label: string; checked: boolean; onChange(v: boolean): void; title?: string }) {
  return (
    <label className={s.inlineSwitch} title={title}>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/** Secondary action button for the options bar / stage. */
export function ActionButton({
  children,
  onClick,
  kbd,
  primary,
  active,
  title,
}: {
  children: ReactNode;
  onClick(): void;
  kbd?: string;
  primary?: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={s.action}
      data-primary={primary || undefined}
      data-active={active || undefined}
      onClick={onClick}
      title={title}
    >
      {children}
      {kbd && <kbd>{kbd}</kbd>}
    </button>
  );
}

/** Single-thumb slider (tempo etc.). */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  ariaLabel,
  width = 150,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange(v: number): void;
  ariaLabel: string;
  width?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      className={s.slider}
      style={{ width, ['--pct' as string]: `${pct}%` }}
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export const PlayIcon = () => (
  <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
    <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
  </svg>
);

export const StopIcon = () => (
  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
    <rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor" />
  </svg>
);
