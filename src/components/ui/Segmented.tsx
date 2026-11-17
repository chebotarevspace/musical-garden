import type { CSSProperties, ReactNode } from 'react';
import s from './Segmented.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible / tooltip text when the label is not plain text. */
  title?: string;
}

interface Props<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange(value: T): void;
  ariaLabel: string;
  size?: 'md' | 'lg';
  title?: string;
}

/** Pill-shaped segmented control with a sliding thumb (the app's main switch style). */
export function Segmented<T extends string>({ value, options, onChange, ariaLabel, size = 'md', title }: Props<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      className={s.root}
      data-size={size}
      role="radiogroup"
      aria-label={ariaLabel}
      title={title}
      style={{ '--count': options.length, '--index': index } as CSSProperties}
    >
      <span className={s.thumb} aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          aria-label={o.title}
          title={o.title}
          className={s.option}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
