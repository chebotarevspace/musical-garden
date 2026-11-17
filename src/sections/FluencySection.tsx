import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Spelled } from '../components/Spelled';
import { ActionButton, Divider, Field, InlineSwitch, PlayIcon, Slider, StopIcon } from '../components/ui/Controls';
import { Picker } from '../components/ui/Picker';
import { Segmented } from '../components/ui/Segmented';
import { useHotkeys } from '../hooks/useHotkeys';
import { noteStart, noteStop, playClick } from '../lib/audio';
import { EXERCISES, type FluencyState, type Hand, exerciseSteps, findExercise, fluencyPress, startFluency } from '../lib/exercises';
import type { Mark } from '../lib/keyStore';
import { scientificOctave } from '../lib/notes';
import { progress as learning } from '../lib/progress';
import { inputNow } from '../lib/inputClock';
import { type Onset, type TimingSummary, gradeOnset, summarizeTiming } from '../lib/timing';
import { BeatDots } from './PlayAlongBits';
import { TheoryLink } from './TheoryLink';
import type { SectionProps } from './types';
import s from './Section.module.css';
import f from './FluencySection.module.css';

const HAND_LABEL: Record<Hand, string> = { right: 'Правая', left: 'Левая', both: 'Обе' };

function formatTime(ms: number) {
  const sec = ms / 1000;
  return sec < 60 ? `${sec.toFixed(1).replace('.', ',')} с` : `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
}

/** Finger fluency: scales, five-finger patterns, Hanon, arpeggios — with a demonstration. */
export function FluencySection({ store, settings, update, inputRef, mascot, setKeyboardRange }: SectionProps) {
  const exercise = findExercise(settings.exerciseId);
  const steps = useMemo(() => exerciseSteps(exercise, settings.hand), [exercise, settings.hand]);
  const [run, setRun] = useState<FluencyState>(() => startFluency(steps));
  const runRef = useRef(run);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const commit = useCallback((next: FluencyState) => {
    runRef.current = next;
    setRun(next);
  }, []);

  // ---- metronome ----
  const metroMode = settings.fluencyPlay === 'metro';
  /** count: 1–4 during the count-in, then 0; beat: position in the bar. */
  const [metro, setMetro] = useState<{ running: boolean; count: number; beat: number }>({ running: false, count: 0, beat: -1 });
  const [timings, setTimings] = useState<(Onset | undefined)[]>([]);
  const [timingResult, setTimingResult] = useState<TimingSummary | null>(null);
  const clock = useRef({ running: false, start: 0, t0: 0, beatMs: 500, interval: 500, ticks: 0, timer: 0 as number | undefined });
  const timingsRef = useRef<(Onset | undefined)[]>([]);

  const stopMetro = useCallback(() => {
    window.clearTimeout(clock.current.timer);
    clock.current.running = false;
    setMetro({ running: false, count: 0, beat: -1 });
  }, []);

  const tickMetro = useCallback(() => {
    const c = clock.current;
    if (!c.running) return;
    const k = c.ticks;
    playClick(k < 4 ? k === 0 : (k - 4) % 4 === 0);
    setMetro({ running: true, count: k < 4 ? k + 1 : 0, beat: k < 4 ? -1 : (k - 4) % 4 });
    c.ticks += 1;
    // Schedule from the start time to avoid drift.
    const due = c.start + c.ticks * c.beatMs;
    c.timer = window.setTimeout(tickMetro, Math.max(0, due - performance.now()));
  }, []);

  const [demoIndex, setDemoIndex] = useState<number | null>(null);
  const demoTimers = useRef<number[]>([]);
  const demoing = demoIndex !== null;

  // New exercise / hand → fresh run.
  useEffect(() => {
    commit(startFluency(steps));
    stopMetro();
    setTimings([]);
    timingsRef.current = [];
    setTimingResult(null);
  }, [steps, settings.fluencyPlay, commit, stopMetro]);
  useEffect(() => stopMetro, [stopMetro]);

  useEffect(() => {
    const all = steps.flatMap((st) => st.notes.map((n) => n.midi));
    setKeyboardRange({ from: scientificOctave(Math.min(...all)), to: scientificOctave(Math.max(...all)) });
  }, [steps, setKeyboardRange]);

  // ---- demonstration ----
  const stopDemo = useCallback(() => {
    demoTimers.current.forEach((t) => window.clearTimeout(t));
    demoTimers.current = [];
    steps.forEach((st) => st.notes.forEach((n) => noteStop(n.midi)));
    store.clearMarks(['demo']);
    setDemoIndex(null);
  }, [steps, store]);

  const playDemo = useCallback(() => {
    stopDemo();
    stopMetro();
    commit(startFluency(steps));
    store.clearMarks(['next']);
    const beat = 60000 / settings.tempo;
    const timers: number[] = [];
    steps.forEach((st, i) => {
      timers.push(
        window.setTimeout(() => {
          setDemoIndex(i);
          st.notes.forEach((n) => {
            store.setMark(n.midi, { kind: 'demo', label: settings.showFingers ? String(n.finger) : undefined });
            noteStart(n.midi, 80);
          });
        }, i * beat),
      );
      timers.push(
        window.setTimeout(() => {
          st.notes.forEach((n) => {
            store.setMark(n.midi, null);
            noteStop(n.midi);
          });
        }, i * beat + beat * 0.82),
      );
    });
    timers.push(window.setTimeout(() => setDemoIndex(null), steps.length * beat + 60));
    demoTimers.current = timers;
  }, [steps, settings.tempo, settings.showFingers, store, stopDemo, stopMetro, commit]);

  useEffect(() => stopDemo, [stopDemo]);

  // ---- "play next" marks with finger numbers ----
  useEffect(() => {
    if (demoing) return;
    const marks = new Map<number, Mark>();
    if (run.finishedAt === null) {
      const step = run.steps[run.index];
      step?.notes.forEach((n) => {
        if (run.remaining.includes(n.midi)) {
          marks.set(n.midi, { kind: 'next', label: settings.showFingers ? String(n.finger) : undefined });
        }
      });
    }
    store.replaceMarks(marks, ['next']);
  }, [run, demoing, settings.showFingers, store]);

  useEffect(() => () => store.clearMarks(), [store]);

  // ---- keyboard input ----
  useLayoutEffect(() => {
    inputRef.current = {
      noteOn(midi) {
        if (demoTimers.current.length) stopDemo();
        const prev = runRef.current;
        const now = inputNow();
        const { state, result } = fluencyPress(prev, midi, now);
        commit(state);
        const c = clock.current;
        const stepDone = result === 'correct' && (state.index > prev.index || (state.finishedAt !== null && prev.finishedAt === null));
        // Under the metronome: grade when each step is completed (from the first beat after the count-in).
        if (stepDone && c.running && now >= c.t0 - c.interval / 2) {
          timingsRef.current[prev.index] = gradeOnset(now, c.t0, c.interval);
          setTimings([...timingsRef.current]);
        }
        if (result === 'wrong') mascot.react('oops');
        else if (state.finishedAt !== null && prev.finishedAt === null) {
          const sett = settingsRef.current;
          const id = `${sett.exerciseId}:${sett.hand}`;
          if (c.running) {
            stopMetro();
            const summary = summarizeTiming(timingsRef.current.filter((x): x is Onset => !!x), c.interval, state.mistakes);
            setTimingResult(summary);
            learning.recordRun('exercises', `${id}:metro`, summary.evenness, false);
            mascot.react(summary.evenness >= 80 ? 'celebrate' : 'happy', 10);
          } else {
            mascot.react('celebrate', 10);
            learning.recordRun('exercises', id, state.finishedAt - (state.startedAt ?? state.finishedAt));
          }
        } else mascot.markActive();
        return result;
      },
      noteOff() {},
      releaseAll() {},
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef, commit, mascot, stopDemo, stopMetro]);

  const restart = useCallback(() => {
    stopDemo();
    stopMetro();
    commit(startFluency(steps));
    timingsRef.current = [];
    setTimings([]);
    setTimingResult(null);
  }, [stopDemo, stopMetro, commit, steps]);

  const startMetro = useCallback(() => {
    restart();
    const beatMs = 60000 / settingsRef.current.tempo;
    const now = performance.now();
    clock.current = { running: true, start: now, t0: now + 4 * beatMs, beatMs, interval: beatMs / settingsRef.current.fluencySub, ticks: 0, timer: undefined };
    tickMetro();
  }, [restart, tickMetro]);

  const changeTempo = (delta: number) => update({ tempo: Math.min(160, Math.max(40, settings.tempo + delta)) });

  useHotkeys({
    KeyP: () => (demoTimers.current.length ? stopDemo() : playDemo()),
    Space: () => (metroMode ? (metro.running ? stopMetro() : startMetro()) : restart()),
  });

  const current = demoing ? demoIndex : run.index;

  // Keep the current step centred in the tape.
  const tapeRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const tape = tapeRef.current;
    const el = tape?.children[Math.min(current ?? 0, steps.length - 1)] as HTMLElement | undefined;
    if (!tape || !el) return;
    const left = el.offsetLeft - tape.clientWidth / 2 + el.offsetWidth / 2;
    tape.scrollTo({ left, behavior: 'smooth' });
  }, [current, steps]);
  const finished = run.finishedAt !== null && !demoing;
  const elapsed = run.finishedAt !== null && run.startedAt !== null ? run.finishedAt - run.startedAt : 0;
  const both = settings.hand === 'both';

  return (
    <>
      <div className={s.controls}>
        <Field label="Упражнение">
          <Picker
            ariaLabel="Упражнение"
            value={exercise.id}
            width={240}
            onChange={(exerciseId) => update({ exerciseId })}
            items={EXERCISES.map((e) => ({ id: e.id, group: e.group, title: e.title }))}
          />
        </Field>
        <Field label="Рука">
          <Segmented<Hand>
            ariaLabel="Рука"
            value={settings.hand}
            onChange={(hand) => update({ hand })}
            options={(['right', 'left', 'both'] as const).map((h) => ({ value: h, label: HAND_LABEL[h] }))}
          />
        </Field>
        <Divider />
        <Field label="Игра">
          <Segmented<'free' | 'metro'>
            ariaLabel="Как играть"
            value={settings.fluencyPlay}
            onChange={(fluencyPlay) => update({ fluencyPlay })}
            options={[
              { value: 'free', label: 'Свой темп' },
              { value: 'metro', label: 'Под метроном' },
            ]}
          />
        </Field>
        <Field label="Темп" value={`${settings.tempo} bpm`}>
          <Slider ariaLabel="Темп" width={110} min={40} max={160} step={4} value={settings.tempo} onChange={(tempo) => update({ tempo })} />
        </Field>
        {metroMode && (
          <Field label="На удар">
            <Segmented<'1' | '2'>
              ariaLabel="Нот на удар метронома"
              value={String(settings.fluencySub) as '1' | '2'}
              onChange={(v) => update({ fluencySub: v === '2' ? 2 : 1 })}
              options={[
                { value: '1', label: '1 нота', title: 'Четвертями: одна нота на удар' },
                { value: '2', label: '2 ноты', title: 'Восьмыми: две ноты на удар' },
              ]}
            />
          </Field>
        )}
        <Field label="Подсказки">
          <InlineSwitch label="Пальцы" title="Номера пальцев на клавишах" checked={settings.showFingers} onChange={(showFingers) => update({ showFingers })} />
        </Field>
        <span className={s.spacer} />
        <Field label=" ">
          <div className={f.buttons}>
            <ActionButton primary={!metroMode} active={demoing && metroMode} onClick={demoing ? stopDemo : playDemo} kbd="P">
              {demoing ? <StopIcon /> : <PlayIcon />}
              {demoing ? 'Стоп' : 'Показать'}
            </ActionButton>
            {metroMode && (
              <ActionButton primary onClick={metro.running ? stopMetro : startMetro} kbd="Space">
                {metro.running ? <StopIcon /> : <PlayIcon />}
                {metro.running ? 'Стоп' : 'Старт'}
              </ActionButton>
            )}
          </div>
        </Field>
      </div>

      <main className={s.stage}>
        <TheoryLink settings={settings} update={update} />
        <div className={s.eyebrow}>
          {exercise.group} · {HAND_LABEL[settings.hand].toLowerCase()} {both ? 'руки' : 'рука'}
        </div>
        <h1 className={f.title}>{exercise.title}</h1>
        <p className={f.description}>{exercise.description}</p>

        <ol ref={tapeRef} className={f.strip} data-both={both || undefined} aria-label="Последовательность нот">
          {steps.map((st, i) => {
            const state = finished || i < (current ?? 0) ? 'done' : i === current ? 'current' : 'todo';
            return (
              <li key={i} className={f.step} data-state={state} data-timing={metroMode ? timings[i]?.grade : undefined} style={{ '--i': i } as CSSProperties}>
                {st.notes
                  .slice()
                  .reverse()
                  .map((n) => (
                    <span key={n.hand} className={f.note} data-hand={n.hand}>
                      {settings.showFingers && <span className={f.finger}>{n.finger}</span>}
                      <Spelled text={n.code} className={f.code} />
                    </span>
                  ))}
              </li>
            );
          })}
        </ol>

        {metro.running &&
          (metro.count > 0 ? (
            <div className={f.count} key={metro.count}>
              {metro.count}
            </div>
          ) : (
            <BeatDots meter={4} countIn={0} beat={metro.beat} />
          ))}

        {finished && timingResult ? (
          <div className={s.success}>
            <span>
              <strong>Ровность {timingResult.evenness}%</strong>
              {timingResult.tendency === 'rush'
                ? ` · чуть спешите (${timingResult.meanMs} мс)`
                : timingResult.tendency === 'drag'
                  ? ` · чуть опаздываете (+${timingResult.meanMs} мс)`
                  : ' · ровно по метроному'}
              {run.mistakes === 0 ? ' · без ошибок' : ` · ошибок: ${run.mistakes}`}
              <br />
              <span className={f.advice}>
                {timingResult.advice === 'faster'
                  ? 'Отлично! Можно поднять темп.'
                  : timingResult.advice === 'slower'
                    ? 'Сбавьте темп — ровность важнее скорости.'
                    : 'Повторите в этом темпе, пока не станет 85% и выше.'}
              </span>
            </span>
            {timingResult.advice === 'faster' && <ActionButton onClick={() => changeTempo(8)}>Темп +8</ActionButton>}
            {timingResult.advice === 'slower' && <ActionButton onClick={() => changeTempo(-8)}>Темп −8</ActionButton>}
            <ActionButton onClick={startMetro} kbd="Space">
              Ещё раз
            </ActionButton>
          </div>
        ) : finished ? (
          <div className={s.success}>
            <span>
              <strong>Готово!</strong> {formatTime(elapsed)}
              {run.mistakes === 0 ? ', без ошибок' : `, ошибок: ${run.mistakes}`}
            </span>
            <ActionButton onClick={restart} kbd="Space">
              Ещё раз
            </ActionButton>
          </div>
        ) : (
          <p className={s.subtitle}>
            {demoing
              ? 'Смотрите и слушайте: клавиши подсвечиваются по очереди'
              : metroMode && !metro.running
                ? 'Нажмите «Старт»: четыре удара отсчёта, затем играйте по одной ноте (или по две) на каждый удар.'
                : metro.running && metro.count > 0
                  ? 'Приготовьтесь…'
                  : run.index === 0 && run.remaining.length === steps[0]?.notes.length
                ? 'Сыграйте подсвеченные клавиши по порядку. Нажмите «Показать», чтобы сначала посмотреть'
                : `Шаг ${run.index + 1} из ${steps.length}`}
          </p>
        )}
      </main>
    </>
  );
}
