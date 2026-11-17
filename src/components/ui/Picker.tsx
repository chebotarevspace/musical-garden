import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import s from './Picker.module.css';

export interface PickerItem {
  id: string;
  group: string;
  title: string;
  /** Small right-aligned badge, e.g. "✓" or "4/10". */
  badge?: ReactNode;
  done?: boolean;
}

interface Props {
  value: string;
  items: PickerItem[];
  onChange(id: string): void;
  ariaLabel: string;
  width?: number;
}

/** Lower case, ё → е: «Ёлочка» is found by «елоч». */
const norm = (x: string) => x.toLowerCase().replace(/ё/g, 'е');

/** Long lists get a search field. */
const SEARCH_FROM = 12;

/** Dropdown with grouped items, styled like the settings popover. */
export function Picker({ value, items, onChange, ariaLabel, width = 300 }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const current = items.find((i) => i.id === value) ?? items[0];
  const searchable = items.length >= SEARCH_FROM;
  const q = norm(query.trim());
  const shown = q ? items.filter((i) => norm(`${i.title} ${i.group}`).includes(q)) : items;
  const groups = [...new Set(shown.map((i) => i.group))];
  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    rootRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={s.root} ref={rootRef} style={{ width }}>
      <button
        type="button"
        className={s.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${current.title}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={s.triggerText}>
          <span className={s.triggerGroup}>{current.group}</span>
          <span className={s.triggerTitle}>{current.title}</span>
        </span>
        <svg className={s.chevron} viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className={s.panel} role="listbox" aria-label={ariaLabel}>
          {searchable && (
            <input
              type="text"
              className={s.search}
              placeholder="Поиск…"
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && shown[0]) pick(shown[0].id);
              }}
              aria-label={`Поиск: ${ariaLabel}`}
            />
          )}
          {searchable && !shown.length && <div className={s.empty}>Ничего не нашлось</div>}
          {groups.map((g) => (
            <div key={g} className={s.group}>
              <div className={s.groupTitle}>{g}</div>
              {shown
                .filter((i) => i.group === g)
                .map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    role="option"
                    aria-selected={i.id === value}
                    className={s.item}
                    data-done={i.done || undefined}
                    onClick={() => pick(i.id)}
                  >
                    <span>{i.title}</span>
                    {i.badge !== undefined && <span className={s.badge}>{i.badge}</span>}
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
