import { useState } from 'react';
import { usePwa } from '../hooks/usePwa';
import { isAppleMobile } from '../hooks/useMediaQuery';
import { applyUpdate, dismissOfflineReady, installApp } from '../lib/pwa';
import s from './PwaPrompts.module.css';

interface Props {
  /** Offer installation (home screen, not dismissed before). */
  offerInstall: boolean;
  onDismissInstall(): void;
  /** A weekly backup is due (home screen). */
  backupDue?: boolean;
  onBackup?(): void;
  onSnoozeBackup?(): void;
}

/** Toasts at the bottom: a new version, «ready offline», and the install offer. */
export function PwaPrompts({ offerInstall, onDismissInstall, backupDue, onBackup, onSnoozeBackup }: Props) {
  const p = usePwa();
  const [updating, setUpdating] = useState(false);
  const iosHint = offerInstall && !p.standalone && !p.canInstall && isAppleMobile();

  return (
    <div className={s.stack} aria-live="polite">
      {p.updateReady && (
        <div className={s.toast}>
          <span className={s.icon} aria-hidden="true">
            🌱
          </span>
          <span className={s.text}>
            <b>Есть новая версия Музыкального сада.</b> Обновите — прогресс сохранится.
          </span>
          <button
            type="button"
            className={s.primary}
            disabled={updating}
            onClick={() => {
              setUpdating(true);
              applyUpdate();
            }}
          >
            {updating ? 'Обновляю…' : 'Обновить'}
          </button>
        </div>
      )}
      {p.offlineReady && !p.updateReady && (
        <div className={s.toast}>
          <span className={s.icon} aria-hidden="true">
            ✓
          </span>
          <span className={s.text}>
            <b>Готово к работе без интернета.</b> Весь сад, уроки и тренажёры доступны офлайн.
          </span>
          <button type="button" className={s.ghost} onClick={dismissOfflineReady} aria-label="Закрыть">
            ×
          </button>
        </div>
      )}
      {backupDue && !p.updateReady && (
        <div className={s.toast}>
          <span className={s.icon} aria-hidden="true">
            💾
          </span>
          <span className={s.text}>
            <b>Сохраним резервную копию?</b> Прогресс хранится только в этом браузере. Файл займёт секунду — и сад не пропадёт.
          </span>
          <button type="button" className={s.primary} onClick={onBackup}>
            Сохранить
          </button>
          <button type="button" className={s.ghost} onClick={onSnoozeBackup} aria-label="Позже" title="Напомнить через три дня">
            ×
          </button>
        </div>
      )}
      {offerInstall && !p.standalone && (p.canInstall || iosHint) && !p.updateReady && (
        <div className={s.toast} data-kind="install">
          <img className={s.appIcon} src="/icons/icon-192.png" alt="" width={40} height={40} />
          <span className={s.text}>
            <b>Установите Музыкальный сад как приложение</b>
            {p.canInstall ? (
              <> — отдельное окно, значок на рабочем столе, работает без интернета.</>
            ) : (
              <>
                {' '}
                — нажмите «Поделиться» <span aria-hidden="true">⎋</span> в Safari, затем «На экран „Домой“».
              </>
            )}
          </span>
          {p.canInstall && (
            <button type="button" className={s.primary} onClick={() => installApp().then((ok) => ok && onDismissInstall())}>
              Установить
            </button>
          )}
          <button type="button" className={s.ghost} onClick={onDismissInstall} aria-label="Не сейчас" title="Не сейчас — кнопка останется в настройках">
            ×
          </button>
        </div>
      )}
    </div>
  );
}

/** A small «Офлайн» chip for the header. */
export function OfflineChip() {
  const p = usePwa();
  if (p.online) return null;
  return (
    <span className={s.chip} title="Нет интернета — всё работает: прогресс сохраняется на этом устройстве">
      <span className={s.dot} aria-hidden="true" /> Офлайн
    </span>
  );
}
