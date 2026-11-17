import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccidentalGlyph } from '../components/AccidentalGlyph';
import { GrandStaff } from '../components/GrandStaff';
import type { LineNoteState } from '../components/StaffLine';
import { ActionButton, Field, InlineSwitch, PlayIcon, Slider, StopIcon } from '../components/ui/Controls';
import { Picker } from '../components/ui/Picker';
import { Segmented } from '../components/ui/Segmented';
import { useHotkeys } from '../hooks/useHotkeys';
import { useProgress } from '../hooks/useProgress';
import { audioNow, noteStart, noteStop, playDrum, primeAudio } from '../lib/audio';
import { HANDS_LEVELS, type HandsExercise, findHandsLevel, handsSteps, makeHandsExercise } from '../lib/handsReading';
import { inputNow } from '../lib/inputClock';
import type { Mode } from '../lib/notes';
import { progress as learning } from '../lib/progress';
import type { NoteSource } from '../lib/storage';
import { TheoryLink } from './TheoryLink';
import type { SectionProps } from './types';
import s from './Section.module.css';
import m from './NotesMelody.module.css';
import hs from './NotesHands.module.css';

/** Clean exercises to pass a level. */
export const HANDS_GOAL = 5;
const WINDOW = 0.42; // beats either side of the note in tempo mode

type Phase = 'idle' | 'countin' | 'play' | 'listen';

/** Sight-reading for two hands: the grand staff, the right hand on top, the left below. */
export function NotesHands({ store, settings, update, inputRef, mascot, say, setKeyboardRange }: SectionProps) {
  const counters = useProgress().counters;
  const level = findHandsLevel(settings.handsLevel);
  const tempoMode = settings.handsPlay === 'tempo';
  const make = useCallback(() => makeHandsExercise(level.id, settings.mode, settings.handsBars), [level.id, settings.mode, settings.handsBars]);
  const [ex, setEx] = useState<HandsExercise>(make);
  const steps = useMemo(() => handsSteps(ex), [ex]);
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [beat, setBeat] = useState<number | null>(null);
  const [results, setResults] = useState<('hit' | 'miss' | null)[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  const st = useRef({ ex, steps, i: 0, pressed: new Set<number>(), mistakes: 0, done: false, t0: 0, beatMs: 857, results: [] as ('hit' | 'miss' | null)[], hits: new Map<number, Set<number>>(), phase: 'idle' as Phase, hinted: false });
  st.current.ex = ex;
  st.current.steps = steps;
  const timers = useRef<number[]>([]);
  const tempoModeRef = useRef(tempoMode);
  tempoModeRef.current = tempoMode;
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const setPhaseBoth = (p: Phase) => {
    st.current.phase = p;
    setPhase(p);
  };

  const stopAll = useCallback(() => {
    clearTimers();
    for (const e of st.current.ex.events) e.midis.forEach((x) => noteStop(x, 0.1));
    store.clearMarks(['demo', 'hint']);
    setBeat(null);
    setPhaseBoth('idle');
  }, [store]);

  const fresh = useCallback(
    (next?: HandsExercise) => {
      stopAll();
      const e = next ?? make();
      const S = st.current;
      S.i = 0;
      S.pressed.clear();
      S.mistakes = 0;
      S.done = false;
      S.hinted = false;
      S.results = [];
      S.hits.clear();
      setEx(e);
      setIndex(0);
      setMistakes(0);
      setWrong(false);
      setResults([]);
      setSummary(null);
    },
    [make, stopAll],
  );

  // New settings → a new exercise.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    fresh();
  }, [fresh, settings.handsPlay]);

  useEffect(() => setKeyboardRange({ from: 2, to: 5 }), [setKeyboardRange]);
  useEffect(
    () => () => {
      clearTimers();
      store.clearMarks();
    },
    [store],
  );

  /** A clean exercise counts towards the level. */
  const finish = useCallback(
    (clean: boolean, text: string) => {
      setSummary(text);
      if (!clean) {
        mascot.react('happy');
        return;
      }
      const key = `hands:${st.current.ex.level}`;
      const before = learning.get().counters[key] ?? 0;
      learning.count(key);
      learning.count('hands:clean');
      if (before + 1 === HANDS_GOAL) {
        mascot.react('celebrate', 10);
        const lv = HANDS_LEVELS.findIndex((l) => l.id === st.current.ex.level);
        const next = HANDS_LEVELS[lv + 1];
        say(next ? `Уровень «${HANDS_LEVELS[lv].title}» пройден! Дальше — «${next.title}».` : 'Все уровни двух рук пройдены! Вы читаете большой нотный стан. 🎹');
      } else mascot.react('happy');
    },
    [mascot, say],
  );

  // ---- tempo mode ----
  const startTempo = useCallback(() => {
    primeAudio();
    stopAll();
    const S = st.current;
    S.i = 0;
    S.pressed.clear();
    S.mistakes = 0;
    S.done = false;
    S.results = S.steps.map(() => null);
    S.hits.clear();
    setResults(S.results);
    setMistakes(0);
    setSummary(null);
    S.beatMs = 60000 / settings.handsTempo;
    const lead = 4;
    S.t0 = performance.now() + 150 + lead * S.beatMs;
    const total = S.ex.bars * 4;
    const a0 = audioNow() + 0.15;
    for (let b = 0; b < lead + total; b++) playDrum('rim', a0 + (b * S.beatMs) / 1000, b % 4 === 0 ? 1 : 0.55);
    setPhaseBoth('countin');
    timers.current.push(window.setTimeout(() => setPhaseBoth('play'), 150 + lead * S.beatMs));
    timers.current.push(
      window.setTimeout(() => {
        const hits = S.results.filter((r) => r === 'hit').length;
        S.done = true;
        setBeat(null);
        setPhaseBoth('idle');
        finish(hits === S.steps.length && S.mistakes === 0, hits === S.steps.length ? (S.mistakes ? `Все ноты вовремя, лишних нажатий: ${S.mistakes}.` : 'Чисто и ровно — все ноты вовремя!') : `Вовремя ${hits} из ${S.steps.length}. Попробуйте медленнее или в режиме «Ждать меня».`);
      }, 150 + (lead + total + 0.6) * S.beatMs),
    );
  }, [settings.handsTempo, stopAll, finish]);

  // Cursor and missed notes while playing in tempo.
  useEffect(() => {
    if (phase !== 'play' && phase !== 'countin' && phase !== 'listen') return;
    const id = window.setInterval(() => {
      const S = st.current;
      const b = (performance.now() - S.t0) / S.beatMs;
      setBeat(b);
      if (S.phase !== 'play') return;
      let changed = false;
      S.steps.forEach((step, k) => {
        if (S.results[k] === null && b > step.beat + WINDOW) {
          S.results[k] = 'miss';
          changed = true;
        }
      });
      if (changed) setResults([...S.results]);
    }, 30);
    return () => window.clearInterval(id);
  }, [phase]);

  // ---- listen: both hands at the chosen tempo, with the cursor ----
  const listen = useCallback(() => {
    if (st.current.phase === 'listen') return stopAll();
    primeAudio();
    stopAll();
    const S = st.current;
    S.beatMs = 60000 / settings.handsTempo;
    S.t0 = performance.now() + 100;
    setPhaseBoth('listen');
    for (const e of S.ex.events) {
      if (!e.midis.length) continue;
      const on = 100 + e.beat * S.beatMs;
      const off = 100 + (e.beat + e.dur * 0.95) * S.beatMs;
      timers.current.push(window.setTimeout(() => e.midis.forEach((x) => (noteStart(x, e.hand === 'R' ? 92 : 70), store.setMark(x, { kind: 'demo' }))), on));
      timers.current.push(window.setTimeout(() => e.midis.forEach((x) => (noteStop(x, 0.12), store.setMark(x, null))), off));
    }
    timers.current.push(window.setTimeout(() => stopAll(), 100 + (S.ex.bars * 4 + 0.3) * S.beatMs));
  }, [settings.handsTempo, stopAll, store]);

  // ---- your notes ----
  useLayoutEffect(() => {
    inputRef.current = {
      noteOn(midi) {
        const S = st.current;
        if (S.phase === 'listen') return 'ignored';
        if (S.phase === 'play' || S.phase === 'countin') {
          const b = (inputNow() - S.t0) / S.beatMs;
          const k = S.steps.findIndex((step, j) => S.results[j] === null && Math.abs(b - step.beat) <= WINDOW && step.midis.includes(midi));
          if (k < 0) {
            S.mistakes += 1;
            setMistakes(S.mistakes);
            return 'wrong';
          }
          const got = S.hits.get(k) ?? new Set<number>();
          got.add(midi);
          S.hits.set(k, got);
          if (S.steps[k].midis.every((x) => got.has(x))) {
            S.results[k] = 'hit';
            setResults([...S.results]);
          }
          return 'correct';
        }
        if (tempoModeRef.current || S.done) return 'ignored';
        const step = S.steps[S.i];
        if (!step) return 'ignored';
        if (!step.midis.includes(midi)) {
          S.mistakes += 1;
          setMistakes(S.mistakes);
          setWrong(true);
          mascot.react('oops');
          return 'wrong';
        }
        S.pressed.add(midi);
        setWrong(false);
        store.clearMarks(['hint']);
        if (step.midis.every((x) => S.pressed.has(x))) {
          S.i += 1;
          S.pressed.clear();
          setIndex(S.i);
          if (S.i >= S.steps.length) {
            S.done = true;
            if (S.hinted) finish(false, `Сыграно с подсказкой${S.mistakes ? `, ошибок: ${S.mistakes}` : ''}. В уровень засчитываются упражнения без подсказок.`);
            else finish(S.mistakes <= 1, S.mistakes === 0 ? 'Чисто! Обе руки без ошибок.' : S.mistakes === 1 ? 'Одна ошибка — засчитано!' : `Сыграно, ошибок: ${S.mistakes}. Попробуйте ещё раз — или следующее.`);
            timers.current.push(window.setTimeout(() => st.current.done && fresh(), 2600));
          } else mascot.markActive();
        }
        return 'correct';
      },
      noteOff(midi) {
        st.current.pressed.delete(midi);
      },
      releaseAll() {
        st.current.pressed.clear();
      },
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef, mascot, store, finish, fresh]);
  const showHint = useCallback(() => {
    const S = st.current;
    const step = S.steps[S.i];
    if (!step || S.done || tempoModeRef.current) return;
    S.hinted = true;
    for (const x of step.midis) if (!S.pressed.has(x)) store.setMark(x, { kind: 'hint' });
    timers.current.push(window.setTimeout(() => store.clearMarks(['hint']), 1400));
  }, [store]);

  useHotkeys({
    Space: () => (tempoModeRef.current ? (st.current.phase === 'idle' ? startTempo() : stopAll()) : fresh()),
    KeyH: showHint,
    KeyP: listen,
    KeyL: () => update({ handsLabels: !settings.handsLabels }),
    KeyN: () => update({ noteSource: 'code' }),
  });

  // ---- what to colour ----
  const stepOfEvent = useMemo(() => {
    const out = new Map<number, number>();
    steps.forEach((step, k) => step.events.forEach((e) => out.set(e, k)));
    return out;
  }, [steps]);
  const states: LineNoteState[] = ex.events.map((e, i) => {
    const k = stepOfEvent.get(i);
    if (tempoMode) {
      if (k === undefined) return beat !== null && beat >= e.beat ? 'done' : 'todo';
      return results[k] === 'hit' ? 'done' : results[k] === 'miss' ? 'wrong' : 'todo';
    }
    if (k === undefined) {
      const cur = steps[index]?.beat ?? Infinity;
      return e.beat < cur ? 'done' : 'todo';
    }
    return k < index ? 'done' : k === index ? (wrong ? 'wrong' : 'current') : 'todo';
  });

  const passed = (id: string) => (counters[`hands:${id}`] ?? 0) >= HANDS_GOAL;
  const count = counters[`hands:${level.id}`] ?? 0;
  const busy = phase !== 'idle';
  const done = !tempoMode && index >= steps.length;
  const countIn = phase === 'countin' && beat !== null ? Math.max(1, Math.ceil(-beat)) : null;

  return (
    <>
      <div className={s.controls}>
        <Field label="Задание">
          <Segmented<NoteSource>
            ariaLabel="Что показывать"
            title="Переключить: N"
            value="hands"
            onChange={(noteSource) => update({ noteSource })}
            options={NOTE_SOURCES}
          />
        </Field>
        <Field label="Уровень">
          <Picker
            ariaLabel="Уровень"
            value={level.id}
            width={210}
            onChange={(handsLevel) => update({ handsLevel })}
            items={HANDS_LEVELS.map((l, i) => ({
              id: l.id,
              group: 'Две руки',
              title: `${i + 1}. ${l.title}`,
              badge: passed(l.id) ? '✓' : `${Math.min(HANDS_GOAL, counters[`hands:${l.id}`] ?? 0)}/${HANDS_GOAL}`,
            }))}
          />
        </Field>
        <Field label="Игра">
          <Segmented<'wait' | 'tempo'>
            ariaLabel="Как играть"
            value={settings.handsPlay}
            onChange={(handsPlay) => update({ handsPlay })}
            options={[
              { value: 'wait', label: 'Ждать меня' },
              { value: 'tempo', label: 'В темпе' },
            ]}
          />
        </Field>
        <Field label="Темп" value={`${settings.handsTempo} bpm`}>
          <Slider ariaLabel="Темп" width={90} min={40} max={120} step={2} value={settings.handsTempo} onChange={(handsTempo) => update({ handsTempo })} />
        </Field>
        <Field label="Клавиши">
          <Segmented<Mode>
            ariaLabel="Какие позиции"
            value={settings.mode}
            onChange={(mode) => update({ mode })}
            options={[
              { value: 'naturals', label: 'Белые', title: 'Позиции до мажор, соль мажор, ля минор' },
              {
                value: 'accidentals',
                title: 'Добавляются фа мажор (си-бемоль) и ре мажор (фа-диез)',
                label: (
                  <>
                    С <AccidentalGlyph kind="sharp" className="glyph-inline" /> и <AccidentalGlyph kind="flat" className="glyph-inline" />
                  </>
                ),
              },
            ]}
          />
        </Field>
        <Field label="Тактов">
          <Segmented<'2' | '4'>
            ariaLabel="Длина"
            value={String(settings.handsBars) as '2' | '4'}
            onChange={(v) => update({ handsBars: v === '4' ? 4 : 2 })}
            options={[
              { value: '2', label: '2' },
              { value: '4', label: '4' },
            ]}
          />
        </Field>
        <Field label="Подсказки">
          <InlineSwitch label="Названия" title="Названия нот под нотами (L)" checked={settings.handsLabels} onChange={(handsLabels) => update({ handsLabels })} />
        </Field>
      </div>

      <main className={s.stage}>
        <TheoryLink settings={settings} update={update} />
        <div className={s.eyebrow}>
          Две руки · {level.title} · позиция {ex.position.title}
          {!passed(level.id) && ` · ${count}/${HANDS_GOAL}`}
          {mistakes > 0 && !summary && ` · ошибок: ${mistakes}`}
        </div>
        <div className={`${m.card} ${hs.card}`} data-done={done || undefined}>
          <span className={hs.hand} data-hand="R">
            правая
          </span>
          <span className={hs.hand} data-hand="L">
            левая
          </span>
          <GrandStaff
            events={ex.events}
            bars={ex.bars}
            states={states}
            labels={settings.handsLabels}
            cursor={tempoMode || phase === 'listen' ? (beat !== null && beat >= 0 ? beat : null) : done ? null : steps[index]?.beat ?? null}
          />
        </div>
        <p className={s.subtitle}>
          {countIn !== null
            ? `Отсчёт… ${countIn}`
            : phase === 'listen'
              ? 'Слушайте и следите за бегунком: верхний стан — правая рука, нижний — левая.'
              : summary
                ? summary
                : tempoMode
                  ? phase === 'play'
                    ? 'Играйте вместе с бегунком — ноты одной доли нажимайте одновременно.'
                    : `Нажмите «Играть»: такт отсчёта, потом бегунок пойдёт по нотам. ${level.hint}`
                  : wrong
                    ? 'Не та нота. Проверьте, в каком стане нота: верхний — правая рука, нижний — левая.'
                    : `${level.hint} Ноты, стоящие друг над другом, нажимайте вместе.`}
        </p>
        <div className={s.actions}>
          {!tempoMode && (
            <ActionButton onClick={showHint} kbd="H">
              Подсказка
            </ActionButton>
          )}
          <ActionButton onClick={listen} kbd="P" active={phase === 'listen'}>
            {phase === 'listen' ? <StopIcon /> : <PlayIcon />} Послушать
          </ActionButton>
          {tempoMode ? (
            <>
              <ActionButton primary onClick={busy ? stopAll : startTempo} kbd="Space">
                {busy ? <StopIcon /> : <PlayIcon />} {busy ? 'Стоп' : 'Играть'}
              </ActionButton>
              {!busy && <ActionButton onClick={() => fresh()}>Другое</ActionButton>}
            </>
          ) : (
            <ActionButton primary onClick={() => fresh()} kbd="Space">
              Другое упражнение
            </ActionButton>
          )}
        </div>
      </main>
    </>
  );
}

export const NOTE_SOURCES: { value: NoteSource; label: string; title?: string }[] = [
  { value: 'code', label: 'Код ноты' },
  { value: 'staff', label: 'Нотный стан' },
  { value: 'melody', label: 'Мелодия' },
  { value: 'hands', label: 'Две руки', title: 'Чтение с листа обеими руками на большом нотном стане' },
  { value: 'tune', label: 'Песня' },
];
