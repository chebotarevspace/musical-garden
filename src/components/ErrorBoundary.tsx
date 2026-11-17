import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { downloadText, makeBackup } from '../lib/backup';
import { markBackup } from '../lib/dataSafety';
import { myMelodies } from '../lib/myMelodies';
import { mySongs } from '../lib/mySongs';
import { dayKey, progress } from '../lib/progress';
import { loadSettings } from '../lib/storage';
import { loadTakes } from '../lib/studio';
import s from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback(error: Error, reset: () => void): ReactNode;
  /** A new key (e.g. another section) clears the error. */
  resetKey?: string;
}

/** Catches a crash below it, so one broken screen doesn't take the whole app down. */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Музыкальный сад: ошибка в интерфейсе', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  reset = () => this.setState({ error: null });

  render() {
    return this.state.error ? this.props.fallback(this.state.error, this.reset) : this.props.children;
  }
}

/** Save everything to a file — offered when something broke. */
export function saveBackupNow() {
  downloadText(`musical-garden-${dayKey()}.json`, makeBackup(loadSettings(), progress.get(), mySongs.get(), loadTakes(), myMelodies.get()));
  markBackup();
}

/** In place of a crashed section: the rest of the app keeps working. */
export function SectionCrash({ error, onRetry, onHome }: { error: Error; onRetry(): void; onHome(): void }) {
  return (
    <div className={s.section} role="alert">
      <div className={s.card}>
        <div className={s.icon} aria-hidden="true">
          🥀
        </div>
        <h2>В этом разделе что-то сломалось</h2>
        <p>Прогресс в безопасности — он сохранён. Можно попробовать ещё раз или вернуться в сад.</p>
        <div className={s.row}>
          <button type="button" className={s.primary} onClick={onRetry}>
            Попробовать снова
          </button>
          <button type="button" className={s.secondary} onClick={onHome}>
            В сад
          </button>
        </div>
        <details className={s.details}>
          <summary>Подробности для разработчика</summary>
          <code>{error.message}</code>
        </details>
      </div>
    </div>
  );
}

/** The whole app failed to render: save the data, then reload. */
export function AppCrash({ error }: { error: Error }) {
  return (
    <div className={s.app} role="alert">
      <div className={s.card}>
        <div className={s.icon} aria-hidden="true">
          🥀
        </div>
        <h2>Музыкальный сад не смог открыться</h2>
        <p>Ваши данные на месте. На всякий случай сохраните резервную копию, а потом перезагрузите страницу.</p>
        <div className={s.row}>
          <button type="button" className={s.secondary} onClick={saveBackupNow}>
            💾 Сохранить копию
          </button>
          <button type="button" className={s.primary} onClick={() => window.location.reload()}>
            Перезагрузить
          </button>
        </div>
        <details className={s.details}>
          <summary>Подробности для разработчика</summary>
          <code>{error.message}</code>
        </details>
      </div>
    </div>
  );
}
