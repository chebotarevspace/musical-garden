import type { Visit } from '../../hooks/useGardenerVisits';
import { GardenerSvg } from './GardenerArt';
import s from './GardenerVisit.module.css';

/** The gardener peeks in from the edge of the screen with a tiny task. */
export function GardenerVisit({ visit, outfit, onClose }: { visit: Visit; outfit: string | null; onClose(): void }) {
  return (
    <div className={s.visit} key={visit.id} data-state={visit.state} role="status">
      <div className={s.art}>
        <GardenerSvg size={74} outfit={outfit} pose={visit.state === 'done' ? 'dance' : visit.state === 'missed' ? 'idle' : 'wave'} />
      </div>
      <div className={s.text}>
        {visit.state === 'ask' && (
          <>
            <strong>Доминик заглянул!</strong>
            <span>{visit.task.text}</span>
            <i className={s.timer} aria-hidden="true" />
          </>
        )}
        {visit.state === 'done' && (
          <>
            <strong>Спасибо! 💧</strong>
            <span>Полил росток — он подрос на минуту.</span>
          </>
        )}
        {visit.state === 'missed' && (
          <>
            <strong>Не беда!</strong>
            <span>Загляну в другой раз.</span>
          </>
        )}
      </div>
      {visit.state === 'ask' && (
        <button type="button" className={s.close} onClick={onClose} aria-label="Не сейчас" title="Не сейчас">
          ×
        </button>
      )}
    </div>
  );
}
