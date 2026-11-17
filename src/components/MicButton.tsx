import { useEffect, useRef, useState } from 'react';
import type { MicStatus } from '../hooks/useMicInput';
import { midiToCode } from '../lib/notes';
import s from './MicButton.module.css';

interface Props {
  on: boolean;
  status: MicStatus;
  meter: { level: number; note: number | null; cents: number; muted: boolean };
  sensitivity: number;
  headphones: boolean;
  /** «Звук нот» is on — the app would answer every key, which a real piano doesn't need. */
  noteSound: boolean;
  onToggle(on: boolean): void;
  onSensitivity(v: number): void;
  onHeadphones(v: boolean): void;
  onNoteSoundOff(): void;
}

const STATUS_TEXT: Record<MicStatus, string> = {
  off: 'Выключен',
  starting: 'Запрашиваю доступ…',
  on: 'Слушаю',
  denied: 'Доступ к микрофону запрещён',
  unsupported: 'Этот браузер не даёт доступ к микрофону',
};

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </svg>
  );
}

/** Header button: play an ordinary (acoustic) piano — the app hears it through the microphone. */
export function MicButton(p: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const live = p.on && p.status === 'on';
  const tone = live ? 'on' : p.on && p.status === 'starting' ? 'idle' : p.on ? 'off' : 'none';
  const { meter } = p;

  return (
    <div className={s.root} ref={root}>
      <button
        type="button"
        className={s.trigger}
        data-tone={tone}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={live ? 'Микрофон включён — настройки' : 'Обычное пианино через микрофон'}
        title={live ? 'Микрофон слушает пианино' : 'Играть на обычном пианино через микрофон'}
        onClick={() => setOpen((o) => !o)}
      >
        <MicIcon />
        {live && <span className={s.level} style={{ transform: `scaleY(${Math.max(0.08, meter.muted ? 0 : meter.level)})` }} aria-hidden="true" />}
      </button>
      {open && (
        <div className={s.panel} role="dialog" aria-label="Микрофон">
          <div className={s.head}>
            <div>
              <div className={s.title}>Обычное пианино</div>
              <div className={s.sub}>Приложение слышит ваши ноты через микрофон</div>
            </div>
            <label className={s.switch}>
              <input
                type="checkbox"
                checked={p.on}
                disabled={p.status === 'unsupported'}
                onChange={(e) => p.onToggle(e.target.checked)}
                aria-label="Слушать через микрофон"
              />
              <span aria-hidden="true" />
            </label>
          </div>

          <div className={s.status} data-tone={tone}>
            <span className={s.dot} aria-hidden="true" />
            {p.on ? STATUS_TEXT[p.status] : STATUS_TEXT.off}
            {live && meter.muted && <span className={s.muted}> · пауза, пока звучит приложение</span>}
          </div>

          {p.status === 'denied' && (
            <p className={s.note}>Разрешите микрофон в настройках сайта (значок слева от адреса) и включите снова.</p>
          )}

          {live && (
            <div className={s.meterBox}>
              <div className={s.meter} aria-hidden="true">
                <span style={{ width: `${Math.round((meter.muted ? 0 : meter.level) * 100)}%` }} />
              </div>
              <div className={s.heard} aria-live="polite">
                {meter.note !== null && !meter.muted ? (
                  <>
                    <b>{midiToCode(meter.note)}</b>
                    <span className={s.cents} data-off={Math.abs(meter.cents) > 20}>
                      {meter.cents > 0 ? '+' : ''}
                      {meter.cents}¢
                    </span>
                  </>
                ) : (
                  <span className={s.hint}>Сыграйте ноту…</span>
                )}
              </div>
            </div>
          )}

          <label className={s.row}>
            <span>Чувствительность</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={p.sensitivity}
              onChange={(e) => p.onSensitivity(Number(e.target.value))}
              aria-label="Чувствительность микрофона"
            />
          </label>
          <label className={s.check}>
            <input type="checkbox" checked={p.headphones} onChange={(e) => p.onHeadphones(e.target.checked)} />
            <span>
              Я в наушниках
              <small>Тогда приложение слушает всегда — даже когда играет само (джем, аккомпанемент)</small>
            </span>
          </label>

          {p.on && p.noteSound && (
            <button type="button" className={s.fix} onClick={p.onNoteSoundOff}>
              Выключить «Звук нот» — пианино звучит само
            </button>
          )}

          <ul className={s.tips}>
            <li>Играйте по одной ноте, отчётливо. Аккорды — разложите снизу вверх: ноты «держатся» ещё секунду.</li>
            <li>Положите телефон или ноутбук рядом с пианино, подальше от шума.</li>
            <li>Задержка — около 0,1 с; для ритм-игр и джема лучше MIDI или наушники.</li>
            <li>Если ноты «скачут» — убавьте чувствительность; если не слышно тихие — прибавьте.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
