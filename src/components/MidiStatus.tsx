import { memo, useEffect, useRef, useState } from 'react';
import { ALL_DEVICES, type MidiDevice, type MidiStatus as Status } from '../hooks/useMidi';
import s from './MidiStatus.module.css';

interface Props {
  status: Status;
  devices: MidiDevice[];
  selectedId: string;
  onSelect(id: string): void;
  /** iPhone / iPad: Web MIDI isn't available there at all. */
  appleMobile?: boolean;
  /** Offer the microphone (an acoustic piano) when MIDI isn't there. */
  onMic?(): void;
}

/** MIDI status in the header; when there's no keyboard, a click explains what to do. */
export const MidiStatus = memo(function MidiStatus({ status, devices, selectedId, onSelect, appleMobile, onMic }: Props) {
  const connected = status === 'ready' && devices.length > 0;
  const tone = connected ? 'on' : status === 'pending' || status === 'ready' ? 'idle' : 'off';
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  let text: string;
  if (status === 'pending') text = 'Запрос доступа к MIDI…';
  else if (status === 'denied') text = 'MIDI: доступ отклонён';
  else if (status === 'unsupported' || status === 'insecure') text = 'MIDI недоступен';
  else if (devices.length === 0) text = 'MIDI: нет устройств';
  else text = devices.length === 1 ? devices[0].name : '';

  const help =
    status === 'denied'
      ? { title: 'Доступ к MIDI отклонён', body: 'Разрешите его в настройках сайта (значок слева от адреса) и перезагрузите страницу.' }
      : status === 'insecure'
        ? { title: 'Web MIDI работает только по HTTPS', body: 'Откройте приложение по адресу https:// или на localhost.' }
        : status === 'unsupported'
          ? appleMobile
            ? { title: 'На iPhone и iPad нет Web MIDI', body: 'MIDI-клавиатуру здесь не подключить. С MIDI приложение работает в Chrome или Edge на компьютере.' }
            : { title: 'Браузер не поддерживает Web MIDI', body: 'Откройте приложение в Chrome или Edge, чтобы подключить MIDI-клавиатуру.' }
          : { title: 'MIDI-клавиатура не найдена', body: 'Подключите её по USB (или включите Bluetooth MIDI) — приложение увидит её сразу, без перезагрузки.' };

  return (
    <div className={s.wrap} ref={root}>
      {connected && devices.length > 1 ? (
        <div className={s.root} data-tone={tone} title="MIDI подключено">
          <span className={s.dot} aria-hidden="true" />
          <select className={s.select} value={selectedId} onChange={(e) => onSelect(e.target.value)} aria-label="MIDI-устройство">
            <option value={ALL_DEVICES}>Все устройства ({devices.length})</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <button
          type="button"
          className={s.root}
          data-tone={tone}
          aria-expanded={connected ? undefined : open}
          onClick={() => !connected && setOpen((o) => !o)}
          title={connected ? 'MIDI подключено' : 'MIDI не подключено — что делать?'}
        >
          <span className={s.dot} aria-hidden="true" />
          <span className="sr-only">{connected ? 'MIDI подключено:' : 'MIDI не подключено.'}</span>
          <span className={s.text}>{text}</span>
        </button>
      )}
      {open && !connected && (
        <div className={s.panel} role="dialog" aria-label="MIDI">
          <b>{help.title}</b>
          <p>{help.body}</p>
          <p className={s.alt}>Без MIDI тоже можно заниматься:</p>
          <ul>
            <li>играть мышью или касаниями по экранной клавиатуре;</li>
            <li>играть на обычном пианино — приложение услышит его через микрофон.</li>
          </ul>
          {onMic && (
            <button
              type="button"
              className={s.mic}
              onClick={() => {
                setOpen(false);
                onMic();
              }}
            >
              🎤 Включить микрофон
            </button>
          )}
        </div>
      )}
    </div>
  );
});
