import { useEffect, useState } from 'react';
import type { DailySession } from '../../hooks/useDailySession';
import { GROW_MS, SPECIES_INFO } from '../../lib/garden';
import { SESSIONS, findSession, sessionNumber } from '../../lib/course';
import { sessionElapsed } from '../../hooks/useDailySession';
import { formatDuration } from '../../lib/progress';
import { goalFor, goalProgress } from '../../lib/stepGoals';
import { dayKey, summarize } from '../../lib/progress';
import { useProgress } from '../../hooks/useProgress';
import { Modal } from '../ui/Modal';
import { Sprite } from './GardenScene';
import { GardenerSvg } from './GardenerArt';
import s from './SessionBar.module.css';

const fmt = (ms: number) => {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600);
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(h ? 2 : 1, '0');
  return `${h ? `${h}:` : ''}${mm}:${String(sec % 60).padStart(2, '0')}`;
};

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

interface BarProps {
  session: DailySession;
  onGo(index: number): void;
  onNext(): void;
  /** Stop now (counted as done only from the last step). */
  onFinish(): void;
  onPause(): void;
  onResume(): void;
}

/** A course session in progress: steps, a stopwatch with pause, next / stop. No time limits. */
export function SessionBar({ session, onGo, onNext, onFinish, onPause, onResume }: BarProps) {
  const now = useNow();
  const step = session.steps[session.index];
  const paused = session.pausedAt !== null;
  const total = sessionElapsed(session, now);
  const last = session.index === session.steps.length - 1;
  const progressNow = useProgress();
  const goal = goalFor(step);
  const gp = goal ? goalProgress(goal, progressNow, session.bases[session.index] ?? 0) : null;
  const stepDone = !!session.done[session.index] || !!gp?.done;
  return (
    <div className={s.bar} role="region" aria-label="Занятие" data-paused={paused || undefined}>
      <span className={s.label} title={findSession(session.courseId).title}>
        <span className={s.seedIcon} aria-hidden="true">🌱</span> Занятие {sessionNumber(session.courseId)}
      </span>
      <ol className={s.steps}>
        {session.steps.map((x, i) => (
          <li key={x.id}>
            <button
              type="button"
              className={s.step}
              data-state={i === session.index ? 'now' : session.done[i] ? 'done' : i < session.index ? 'skipped' : 'next'}
              onClick={() => onGo(i)}
              title={x.title}
              aria-current={i === session.index ? 'step' : undefined}
            >
              <span className={s.dot}>{session.done[i] ? '✓' : i + 1}</span>
              <span className={s.stepTitle}>{x.title}</span>
            </button>
          </li>
        ))}
      </ol>
      <span className={s.task} data-done={stepDone || undefined} title={step.hint}>
        <span className={s.taskText}>
          {stepDone ? '✓ ' : '🎯 '}
          {goal ? goal.label : step.hint}
        </span>
        {gp && (
          <span className={s.taskMeter} aria-label={gp.text}>
            <i style={{ width: `${Math.round((gp.value / gp.target) * 100)}%` }} />
          </span>
        )}
        {gp && goal?.kind === 'count' && <span className={s.taskCount}>{gp.text}</span>}
      </span>
      <span className={s.timer} data-total data-paused={paused || undefined} title="Время занятия (без пауз) — идёт в статистику">
        ⏱ {fmt(total)}
      </span>
      <button
        type="button"
        className={s.pause}
        onClick={paused ? onResume : onPause}
        aria-label={paused ? 'Продолжить' : 'Пауза'}
        title={paused ? 'Продолжить занятие' : 'Пауза — время не идёт'}
      >
        {paused ? '▶' : '⏸'}
      </button>
      <button type="button" className={s.next} data-due={stepDone || undefined} onClick={onNext} disabled={paused} title={stepDone ? 'Задача выполнена' : 'Можно перейти дальше и без выполненной задачи'}>
        {last ? 'Завершить' : 'Дальше →'}
      </button>
      <button type="button" className={s.stop} onClick={onFinish} aria-label="Остановить занятие" title="Остановить занятие: время сохранится, а занятие можно будет засчитать или продолжить в другой раз">
        ■
      </button>
      {paused && (
        <div className={s.pauseOverlay} role="dialog" aria-label="Пауза">
          <div className={s.pauseCard}>
            <div className={s.pauseTime}>{fmt(total)}</div>
            <div>Пауза — секундомер остановлен</div>
            <button type="button" className={s.next} onClick={onResume}>
              ▶ Продолжить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** End-of-session card: what you did and how the garden grew. */
export function SessionSummary({ session, onClose, onMarkDone, onStartNext }: { session: DailySession; onClose(): void; onMarkDone(): void; onStartNext(id: string): void }) {
  const course = findSession(session.courseId);
  const n = sessionNumber(session.courseId);
  const nextCourse = SESSIONS[n] ?? null;
  const progress = useProgress();
  const today = progress.days[dayKey()]?.activeMs ?? 0;
  const activeMin = Math.max(0, Math.round((today - session.activeAtStart) / 60000));
  const wallMin = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
  const grown = progress.plants.slice(session.plantsAtStart);
  const sproutPct = progress.sprout ? Math.round((progress.sprout.activeMs / GROW_MS) * 100) : 0;
  const { streak } = summarize(progress);
  return (
    <Modal title={session.completed ? `Занятие ${n} пройдено` : `Занятие ${n} остановлено`} onClose={onClose} width={520}>
      <div className={s.summary}>
        <p className={s.lead}>
          <b>«{course.title}».</b> {session.completed ? `Теперь вы умеете: ${course.goal.charAt(0).toLowerCase()}${course.goal.slice(1)}` : 'Время записано в статистику. Занятие можно пройти до конца в следующий раз — или засчитать, если всё получилось.'}
        </p>
        <div className={s.plants}>
          <GardenerSvg size={84} pose="dance" outfit={progress.outfit} />
          {grown.length ? (
            grown.map((p) => (
              <svg key={p.id} viewBox="0 0 48 52" width="72" height="78" aria-label={SPECIES_INFO[p.species].name}>
                <Sprite species={p.species} x={24} y={50} />
              </svg>
            ))
          ) : (
            <svg viewBox="0 0 48 52" width="72" height="78" aria-label="Росток">
              <Sprite species={sproutPct > 2 ? 'sprout' : 'seed'} x={24} y={50} />
            </svg>
          )}
        </div>
        <p className={s.lead}>
          {grown.length
            ? `В саду ${grown.length === 1 ? `вырос${grown[0].species === 'birch' || grown[0].species === 'sakura' ? 'ла' : ''} ${SPECIES_INFO[grown[0].species].name.toLowerCase()}` : `выросло растений: ${grown.length}`}!`
            : `Росток подрос: ${sproutPct}% — ещё немного, и он станет растением.`}
        </p>
        <dl className={s.stats}>
          <div>
            <dt>Задач выполнено</dt>
            <dd>
              {session.done.filter(Boolean).length} из {session.steps.length}
            </dd>
          </div>
          <div>
            <dt>Игры за клавишами</dt>
            <dd>{activeMin} мин</dd>
          </div>
          <div>
            <dt>Время занятия</dt>
            <dd>{formatDuration(session.elapsedMs ?? wallMin * 60000)}</dd>
          </div>
          <div>
            <dt>Дней подряд</dt>
            <dd>{streak}</dd>
          </div>
        </dl>
        <div className={s.actions}>
          {!session.completed && (
            <button type="button" className={s.secondary} onClick={onMarkDone}>
              Засчитать занятие
            </button>
          )}
          {session.completed && nextCourse && (
            <button type="button" className={s.secondary} onClick={() => onStartNext(nextCourse.id)} title={nextCourse.goal}>
              Дальше: занятие {n + 1} — {nextCourse.title}
            </button>
          )}
          <button type="button" className={s.done} onClick={onClose}>
            В сад
          </button>
        </div>
      </div>
    </Modal>
  );
}
