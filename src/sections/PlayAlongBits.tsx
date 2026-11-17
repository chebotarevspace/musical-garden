import { useState } from 'react';
import { CircleOfFifths } from '../components/CircleOfFifths';
import { Field } from '../components/ui/Controls';
import { Modal } from '../components/ui/Modal';
import { CIRCLE, findCircleKey } from '../lib/circle';
import { Picker } from '../components/ui/Picker';
import { PATTERNS } from '../lib/patterns';
import type { Settings } from '../lib/storage';
import p from './Progressions.module.css';

/** "Фактура" picker shared by progressions and songs. */
export function PatternField({ settings, update }: { settings: Settings; update(patch: Partial<Settings>): void }) {
  return (
    <Field label="Фактура">
      <Picker
        ariaLabel="Фактура аккомпанемента"
        value={settings.pattern}
        width={180}
        onChange={(pattern) => update({ pattern })}
        items={PATTERNS.map((x) => ({ id: x.id, group: 'Как играть аккорды', title: x.title }))}
      />
    </Field>
  );
}

/** Metronome beat indicator with count-in. */
export function BeatDots({ meter, countIn, beat }: { meter: 3 | 4; countIn: number; beat: number }) {
  return (
    <div className={p.beats} aria-hidden="true">
      {countIn > 0 ? (
        <span key={countIn} className={p.countIn}>
          {meter - countIn}
        </span>
      ) : (
        Array.from({ length: meter }, (_, b) => <span key={b} className={p.dot} data-on={b === beat % meter || undefined} data-strong={b === 0 || undefined} />)
      )}
    </div>
  );
}

/** Small round button next to a key picker: choose the key on the circle of fifths. */
export function KeyCircleButton({ value, minor, onChange }: { value: string; minor: boolean; onChange(keyId: string): void }) {
  const [open, setOpen] = useState(false);
  const majorId = minor ? (CIRCLE.find((k) => k.minor.id === value) ?? CIRCLE[0]).major.id : value;
  return (
    <>
      <button type="button" className={p.circleBtn} onClick={() => setOpen(true)} title="Выбрать тональность на квинтовом круге" aria-label="Квинтовый круг">
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" />
          <circle cx="10" cy="10" r="3.5" />
          <path d="M10 2.5v4M10 13.5v4M2.5 10h4M13.5 10h4" />
        </svg>
      </button>
      {open && (
        <Modal title="Тональность на квинтовом круге" onClose={() => setOpen(false)} width={460}>
          <div className={p.circleModal}>
            <CircleOfFifths
              value={majorId}
              onSelect={(id) => {
                const k = findCircleKey(id);
                onChange(minor ? k.minor.id : k.major.id);
                setOpen(false);
              }}
              size={380}
            />
            <p>{minor ? 'Нажмите на тональность — выберется её параллельный минор (внутреннее кольцо).' : 'Нажмите на тональность. Соседи по кругу — аккорды IV и V.'}</p>
          </div>
        </Modal>
      )}
    </>
  );
}
