import { useRef, useState } from 'react';
import { useProgress } from '../hooks/useProgress';
import { downloadText, makeBackup, readBackup } from '../lib/backup';
import { mySongs } from '../lib/mySongs';
import { loadTakes, saveTakes } from '../lib/studio';
import { myMelodies } from '../lib/myMelodies';
import { RESET_SCOPES, type ResetScope, dayKey, formatDuration, progress, sessionTime, summarize } from '../lib/progress';
import { SESSIONS } from '../lib/course';
import type { Settings as SettingsData } from '../lib/storage';
import { LESSONS } from '../learn/lessons';
import { Modal } from './ui/Modal';
import { usePwa } from '../hooks/usePwa';
import { useSyncExternalStore } from 'react';
import { lastBackup, markBackup, storageGuard } from '../lib/dataSafety';
import { isAppleMobile } from '../hooks/useMediaQuery';
import { installApp } from '../lib/pwa';
import { Segmented } from './ui/Segmented';
import s from './Settings.module.css';

type Toggleable = 'yamaha' | 'sound' | 'mascot' | 'adaptive' | 'realPiano';
type AnyToggle = Toggleable | 'noteSound';
type Tab = 'general' | 'data' | 'keys';

interface Props {
  settings: SettingsData;
  onToggle(key: AnyToggle, value: boolean): void;
  onTheme(light: boolean): void;
  /** Replace all settings (import / reset to defaults). */
  onReplaceSettings(settings: SettingsData | null): void;
}

const ROWS: { key: AnyToggle; title: string; hint: string }[] = [
  { key: 'noteSound', title: 'Звук нажатых нот', hint: 'Каждая нажатая клавиша звучит. Выключите, если MIDI-клавиатура звучит сама' },
  { key: 'realPiano', title: 'Звук настоящего рояля', hint: 'Записи рояля Salamander Grand Piano (Alexander Holm, CC BY 3.0). Выключите — будет лёгкий синтезатор' },
  { key: 'sound', title: 'Сигналы', hint: 'Короткий тон при верном нажатии, тихий «тук» при ошибке' },
  { key: 'mascot', title: 'Маскот', hint: 'Пиксельный помощник на крышке пианино' },
  { key: 'adaptive', title: 'Адаптивная практика', hint: 'Ноты, аккорды и интервалы, в которых вы чаще ошибаетесь, выпадают чаще' },
  { key: 'yamaha', title: 'Средняя C = C3', hint: 'Конвенция Yamaha: октавы в подписях сдвигаются на −1' },
];

export const HOTKEYS: [string, string][] = [
  ['1 · 2 · 7', 'Сад · Уроки · Песни'],
  ['3–6 · 8 · 9 · 0', 'Тренажёры: ноты, беглость, аккорды, слух · джем · капли · студия'],
  ['R', 'Студия: запись / стоп'],
  ['?', 'Справка и экскурсия по приложению'],
  ['F', 'Полноэкранный режим'],
  ['S', 'Звук нажатых нот'],
  ['T', 'Светлая / тёмная тема'],
  ['🎤 в шапке', 'Обычное пианино через микрофон'],
  ['Space', 'Следующее задание / заново / старт'],
  ['P', 'Показать / послушать'],
  ['H', 'Подсказка (ноты) / показать ответ (слух)'],
  ['M', 'Ноты: только белые / с ♯ и ♭'],
  ['N', 'Ноты: код / нотный стан'],
  ['K', 'Аккорды, песни: показывать клавиши'],
  ['L', 'Джем: записать слой · Две руки: названия нот'],
  ['U', 'Джем: отменить последний слой'],
];

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

function DataTab({ settings, onReplaceSettings }: Pick<Props, 'settings' | 'onReplaceSettings'>) {
  const p = useProgress();
  const sum = summarize(p);
  const [scopes, setScopes] = useState<ResetScope[]>([]);
  const [confirm, setConfirm] = useState<'reset' | 'settings' | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof readBackup> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tiles = [
    { value: sum.practiceDays, label: plural(sum.practiceDays, 'день занятий', 'дня занятий', 'дней занятий') },
    { value: formatDuration(sessionTime(p).total), label: 'на занятиях (секундомер)' },
    { value: `${p.sessionsDone.length}/${SESSIONS.length}`, label: 'занятий курса пройдено' },
    { value: sum.totalMinutes, label: plural(sum.totalMinutes, 'минута игры', 'минуты игры', 'минут игры') },
    { value: sum.streak, label: plural(sum.streak, 'день подряд', 'дня подряд', 'дней подряд') },
    { value: `${sum.lessons}/${LESSONS.length}`, label: 'уроков пройдено' },
    { value: sum.chordLevels, label: plural(sum.chordLevels, 'уровень аккордов', 'уровня аккордов', 'уровней аккордов') },
    { value: sum.earLevels, label: plural(sum.earLevels, 'уровень слуха', 'уровня слуха', 'уровней слуха') },
    { value: sum.songsPlayed, label: plural(sum.songsPlayed, 'песня сыграна', 'песни сыграны', 'песен сыграно') },
    { value: p.plants.length, label: plural(p.plants.length, 'растение в саду', 'растения в саду', 'растений в саду') },
  ];

  const [backupAt, setBackupAt] = useState(lastBackup);
  const persisted = useSyncExternalStore(storageGuard.subscribe, storageGuard.get, storageGuard.get);

  const exportData = () => {
    downloadText(`musical-garden-${dayKey()}.json`, makeBackup(settings, p, mySongs.get(), loadTakes(), myMelodies.get()));
    markBackup();
    setBackupAt(Date.now());
    setMessage({ text: 'Файл с резервной копией сохранён.' });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPendingImport(readBackup(await file.text()));
      setMessage(null);
    } catch (e) {
      setMessage({ text: (e as Error).message, error: true });
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const applyImport = () => {
    if (!pendingImport) return;
    progress.replace(pendingImport.progress);
    mySongs.replace(pendingImport.songs);
    if (pendingImport.takes.length) saveTakes(pendingImport.takes);
    if (pendingImport.melodies.length) myMelodies.replace(pendingImport.melodies);
    onReplaceSettings(pendingImport.settings);
    setPendingImport(null);
    setMessage({ text: 'Данные восстановлены из файла.' });
  };

  const doReset = () => {
    if (confirm !== 'reset') return setConfirm('reset');
    progress.reset(scopes);
    setScopes([]);
    setConfirm(null);
    setMessage({ text: 'Выбранный прогресс сброшен.' });
  };

  const toggleScope = (id: ResetScope) => {
    setConfirm(null);
    setScopes((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  return (
    <div className={s.data}>
      <p className={s.note}>
        Прогресс хранится только в этом браузере. Чтобы не потерять его или перенести на другой компьютер, сохраните
        резервную копию в файл.
      </p>
      <div className={s.tiles}>
        {tiles.map((t) => (
          <div key={t.label} className={s.tile}>
            <span className={s.tileValue}>{t.value}</span>
            <span className={s.tileLabel}>{t.label}</span>
          </div>
        ))}
      </div>

      <div className={s.heading}>Резервная копия</div>
      <div className={s.actions}>
        <button type="button" className={s.btn} onClick={exportData}>
          Сохранить в файл
        </button>
        <button type="button" className={s.btn} onClick={() => fileRef.current?.click()}>
          Восстановить из файла…
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      <p className={s.safety}>
        {backupAt ? `Последняя копия: ${new Date(backupAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}.` : 'Резервной копии ещё не было.'}{' '}
        {persisted === true
          ? 'Браузер обещал не удалять данные Музыкального сада сам.'
          : persisted === false
            ? 'Браузер может очистить данные при нехватке места — сохраняйте копию раз в неделю (приложение напомнит).'
            : 'Данные хранятся только в этом браузере — сохраняйте копию раз в неделю (приложение напомнит).'}
      </p>
      {pendingImport && (
        <div className={s.confirmBox}>
          <span>
            Заменить текущие настройки, прогресс и свои песни данными из файла
            {pendingImport.exportedAt ? ` от ${new Date(pendingImport.exportedAt).toLocaleDateString('ru-RU')}` : ''}?
          </span>
          <div className={s.actions}>
            <button type="button" className={`${s.btn} ${s.danger}`} onClick={applyImport}>
              Заменить
            </button>
            <button type="button" className={s.btn} onClick={() => setPendingImport(null)}>
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className={s.heading}>Сбросить прогресс</div>
      <div className={s.scopes}>
        {RESET_SCOPES.map((sc) => (
          <label key={sc.id} className={s.scope}>
            <input type="checkbox" checked={scopes.includes(sc.id)} onChange={() => toggleScope(sc.id)} />
            <span>{sc.title}</span>
          </label>
        ))}
      </div>
      <div className={s.actions}>
        <button
          type="button"
          className={s.linkBtn}
          onClick={() => {
            setConfirm(null);
            setScopes(scopes.length === RESET_SCOPES.length ? [] : RESET_SCOPES.map((x) => x.id));
          }}
        >
          {scopes.length === RESET_SCOPES.length ? 'Снять все' : 'Выбрать все'}
        </button>
        <span className={s.spacer} />
        <button type="button" className={`${s.btn} ${s.danger}`} disabled={!scopes.length} onClick={doReset}>
          {confirm === 'reset' ? 'Точно сбросить? Нажмите ещё раз' : 'Сбросить выбранное'}
        </button>
      </div>

      <div className={s.heading}>Настройки</div>
      <div className={s.actions}>
        <button
          type="button"
          className={s.btn}
          onClick={() => {
            if (confirm !== 'settings') return setConfirm('settings');
            onReplaceSettings(null);
            setConfirm(null);
            setMessage({ text: 'Настройки возвращены по умолчанию. Прогресс не тронут.' });
          }}
        >
          {confirm === 'settings' ? 'Точно? Нажмите ещё раз' : 'Вернуть настройки по умолчанию'}
        </button>
      </div>

      {message && (
        <p className={s.message} data-error={message.error || undefined} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}

/** Install as an app / offline status. */
function AppRow() {
  const p = usePwa();
  const offline = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller;
  const hint = p.standalone
    ? 'Музыкальный сад установлен и открыт как приложение.'
    : p.canInstall
      ? 'Отдельное окно и значок на рабочем столе. Работает и без интернета.'
      : isAppleMobile()
        ? 'В Safari: «Поделиться» → «На экран „Домой“».'
        : 'В Chrome или Edge: значок установки в адресной строке или меню → «Установить приложение».';
  return (
    <div className={s.row}>
      <span className={s.rowText}>
        <span className={s.rowTitle}>Приложение{offline ? ' · работает офлайн ✓' : ''}</span>
        <span className={s.rowHint}>{hint}</span>
      </span>
      {p.canInstall && !p.standalone && (
        <button type="button" className={s.btn} onClick={() => installApp()}>
          Установить
        </button>
      )}
    </div>
  );
}

export function Settings({ settings, onToggle, onTheme, onReplaceSettings }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('general');

  return (
    <>
      <button type="button" className={s.trigger} aria-haspopup="dialog" aria-label="Настройки" title="Настройки и мои данные" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" strokeLinecap="round" />
          <circle cx="16" cy="7" r="2.2" />
          <circle cx="10" cy="17" r="2.2" />
        </svg>
      </button>
      {open && (
        <Modal title="Настройки" onClose={() => setOpen(false)}>
          <div className={s.tabs}>
            <Segmented<Tab>
              ariaLabel="Раздел настроек"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'general', label: 'Основное' },
                { value: 'data', label: 'Мои данные' },
                { value: 'keys', label: 'Горячие клавиши' },
              ]}
            />
          </div>
          {tab === 'general' && <AppRow />}
          {tab === 'general' && (
            <label className={s.row}>
              <span className={s.rowText}>
                <span className={s.rowTitle}>Светлая тема</span>
                <span className={s.rowHint}>Включена по умолчанию; выключите для тёмной темы — удобнее вечером (T)</span>
              </span>
              <input type="checkbox" role="switch" className={s.switch} checked={settings.theme === 'light'} onChange={(e) => onTheme(e.target.checked)} />
            </label>
          )}
          {tab === 'general' &&
            ROWS.map((row) => (
              <label key={row.key} className={s.row}>
                <span className={s.rowText}>
                  <span className={s.rowTitle}>{row.title}</span>
                  <span className={s.rowHint}>{row.hint}</span>
                </span>
                <input type="checkbox" role="switch" className={s.switch} checked={settings[row.key]} onChange={(e) => onToggle(row.key, e.target.checked)} />
              </label>
            ))}
          {tab === 'data' && <DataTab settings={settings} onReplaceSettings={onReplaceSettings} />}
          {tab === 'keys' && (
            <HotkeysList />
          )}
        </Modal>
      )}
    </>
  );
}

export function HotkeysList() {
  return (
    <ul className={s.hotkeys}>
      {HOTKEYS.map(([k, v]) => (
        <li key={k + v}>
          <kbd>{k}</kbd>
          <span>{v}</span>
        </li>
      ))}
    </ul>
  );
}
