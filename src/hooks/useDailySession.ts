import { KEYS } from '../lib/storageKeys';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type PlanStep, findSession } from '../lib/course';
import { dayKey, progress } from '../lib/progress';
import { ALL_LESSONS } from '../learn/lessons';
import { canWrite } from '../lib/tabGuard';
import { goalBase, goalFor, goalProgress } from '../lib/stepGoals';

const KEY = KEYS.session;
/** A session left open longer than this starts over next time. */
const STALE_MS = 24 * 60 * 60 * 1000;

export interface DailySession {
  /** Course session id (s01…). */
  courseId: string;
  steps: PlanStep[];
  index: number;
  /** Wall-clock start of the current step (ms). */
  stepStartedAt: number;
  /** Today's active ms and plant count when the session began — for the summary. */
  activeAtStart: number;
  plantsAtStart: number;
  startedAt: number;
  /** The stopwatch is on pause since… (ms), or running. */
  pausedAt: number | null;
  /** Total time spent on pause. */
  pausedMs: number;
  finished: boolean;
  /** On the summary: stopwatch time of the session. */
  elapsedMs?: number;
  /** Set on the summary: the session was completed (all steps). */
  completed?: boolean;
  /** Counter value each step is measured from (taken when the step is first opened). */
  bases: Record<number, number>;
  /** Steps whose task is done (latched — they stay done). */
  done: boolean[];
}

function load(): DailySession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as DailySession;
    if (!s || !Array.isArray(s.steps) || s.finished || Date.now() - s.startedAt > STALE_MS) return null;
    return { ...s, pausedAt: s.pausedAt ?? null, pausedMs: s.pausedMs ?? 0, bases: s.bases ?? {}, done: s.done ?? [] };
  } catch {
    return null;
  }
}

function save(s: DailySession | null) {
  if (!canWrite()) return;
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — the session just won't survive a reload */
  }
}

/** Stopwatch time of a session: from the start, without pauses. */
export function sessionElapsed(s: Pick<DailySession, 'startedAt' | 'pausedAt' | 'pausedMs'>, now = Date.now()): number {
  return Math.max(0, (s.pausedAt ?? now) - s.startedAt - s.pausedMs);
}

/** Steps of a course session, with lesson titles filled in. */
export function sessionSteps(courseId: string): PlanStep[] {
  return findSession(courseId).steps.map((st) =>
    st.kind === 'theory' ? { ...st, title: `Урок: ${ALL_LESSONS.find((l) => l.id === st.patch.lessonId)?.title ?? ''}` } : st,
  );
}

/** The running course session with its stopwatch (survives reloads). */
/** The step's starting point: counters now (only the first time the step is opened). */
const withBase = (s: DailySession, index: number): DailySession =>
  index in s.bases ? s : { ...s, bases: { ...s.bases, [index]: goalBase(goalFor(s.steps[index]), progress.get()) } };

export function useDailySession(apply: (step: PlanStep) => void, onStepDone?: (step: PlanStep) => void) {
  const [session, setSession] = useState<DailySession | null>(load);
  const [summary, setSummary] = useState<DailySession | null>(null);

  useEffect(() => save(session), [session]);

  const start = useCallback(
    (courseId: string) => {
      const p = progress.get();
      const steps = sessionSteps(courseId);
      const now = Date.now();
      const s: DailySession = {
        courseId,
        steps,
        index: 0,
        stepStartedAt: now,
        activeAtStart: p.days[dayKey(now)]?.activeMs ?? 0,
        plantsAtStart: p.plants.length,
        startedAt: now,
        pausedAt: null,
        pausedMs: 0,
        finished: false,
        bases: {},
        done: [],
      };
      setSession(withBase(s, 0));
      apply(steps[0]);
    },
    [apply],
  );

  const goTo = useCallback(
    (index: number) => {
      if (!session || index < 0 || index >= session.steps.length) return;
      apply(session.steps[index]);
      setSession(withBase({ ...session, index, stepStartedAt: Date.now() }, index));
    },
    [session, apply],
  );

  // Auto-check: whenever progress changes, see if the current step's task is done.
  const doneRef = useRef(onStepDone);
  doneRef.current = onStepDone;
  useEffect(() => {
    if (!session) return;
    const check = () => {
      const i = session.index;
      if (session.done[i]) return;
      const goal = goalFor(session.steps[i]);
      if (!goal || !goalProgress(goal, progress.get(), session.bases[i] ?? 0).done) return;
      const done = [...session.done];
      done[i] = true;
      setSession((cur) => (cur && cur.startedAt === session.startedAt ? { ...cur, done } : cur));
      doneRef.current?.(session.steps[i]);
    };
    check();
    return progress.subscribe(check);
  }, [session]);

  /** Pause / resume the stopwatch. */
  const pause = useCallback(() => {
    if (!session || session.pausedAt !== null) return;
    setSession({ ...session, pausedAt: Date.now() });
  }, [session]);
  const resume = useCallback(() => {
    if (!session || session.pausedAt === null) return;
    setSession({ ...session, pausedMs: session.pausedMs + (Date.now() - session.pausedAt), pausedAt: null });
  }, [session]);

  /** End the session: its time goes to the statistics; `completed` marks it done in the course. */
  const finish = useCallback(
    (completed = false) => {
      if (!session) return;
      const elapsedMs = sessionElapsed(session);
      progress.addSessionTime(elapsedMs);
      if (completed) progress.sessionDone(session.courseId);
      setSummary({ ...session, finished: true, completed, elapsedMs });
      setSession(null);
    },
    [session],
  );

  const next = useCallback(() => {
    if (!session) return;
    if (session.index >= session.steps.length - 1) finish(true);
    else goTo(session.index + 1);
  }, [session, finish, goTo]);

  /** From the summary: count an unfinished session as done anyway. */
  const markDone = useCallback(() => {
    if (!summary) return;
    progress.sessionDone(summary.courseId);
    setSummary({ ...summary, completed: true });
  }, [summary]);

  const cancel = useCallback(() => setSession(null), []);
  const closeSummary = useCallback(() => setSummary(null), []);

  return { session, summary, start, goTo, next, finish, pause, resume, markDone, cancel, closeSummary };
}
