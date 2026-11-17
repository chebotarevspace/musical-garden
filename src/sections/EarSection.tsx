import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActionButton, Divider, Field } from '../components/ui/Controls';
import { Picker } from '../components/ui/Picker';
import { Segmented } from '../components/ui/Segmented';
import { useHotkeys } from '../hooks/useHotkeys';
import { INTERVALS } from '../lib/chordDetect';
import { type QualityId, QUALITIES } from '../lib/chords';
import { EAR_GOAL, type EarQuestion, type IntervalDirection, QUALITY_LABEL, findEarLevel, levelsFor, makeQuestion } from '../lib/ear';
import { playSequence, stopSequence } from '../lib/player';
import { useProgress } from '../hooks/useProgress';
import { progress as learning } from '../lib/progress';
import { EAR_MODE_TITLE, EarMelody, EarModeField } from './EarMelody';
import { TheoryLink } from './TheoryLink';
import type { SectionProps } from './types';
import s from './Section.module.css';
import e from './EarSection.module.css';

const SHARP = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const nameOf = (m: number) => `${SHARP[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
const MODE_TITLE = EAR_MODE_TITLE;

export function EarSection(props: SectionProps) {
  return props.settings.earMode === 'melody' ? <EarMelody {...props} /> : <EarQuiz {...props} />;
}

/** Ear training: name intervals and chord qualities, or find a note by ear. */
function EarQuiz({ store, settings, update, inputRef, mascot, say, setKeyboardRange }: SectionProps) {
  const mode = settings.earMode;
  const level = findEarLevel(settings.earLevel[mode] ?? '', mode);
  const direction = settings.earDirection;
  const [q, setQ] = useState<EarQuestion>(() => makeQuestion(level, null, direction));
  const [solved, setSolved] = useState<'correct' | 'revealed' | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [playing, setPlaying] = useState(false);
  const qRef = useRef(q);
  qRef.current = q;
  const solvedRef = useRef(solved);
  solvedRef.current = solved;
  const nextTimer = useRef<number>();
  const levels = useProgress().earLevels;

  const progress = Math.min(EAR_GOAL, levels[level.id] ?? 0);

  useEffect(() => setKeyboardRange({ from: 3, to: 5 }), [setKeyboardRange]);

  const play = useCallback((question: EarQuestion) => {
    const chord = question.steps.length > 2;
    setPlaying(true);
    playSequence(question.steps, chord ? 130 : 66, (i) => i === null && setPlaying(false), chord ? 0.95 : 0.9);
  }, []);

  const next = useCallback(() => {
    window.clearTimeout(nextTimer.current);
    store.clearMarks(['demo']);
    const nq = makeQuestion(level, qRef.current, direction);
    setQ(nq);
    setSolved(null);
    setWrong([]);
  }, [level, direction, store]);

  // New level / mode / direction → new question.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id, direction]);

  // Every new question plays by itself.
  useEffect(() => {
    const t = window.setTimeout(() => play(q), 350);
    return () => window.clearTimeout(t);
  }, [q, play]);

  useEffect(
    () => () => {
      window.clearTimeout(nextTimer.current);
      stopSequence();
      store.clearMarks();
    },
    [store],
  );

  const reveal = useCallback(
    (question: EarQuestion) => {
      const labels =
        level.mode === 'chords'
          ? QUALITIES[question.answer as QualityId].degrees
          : question.notes.map(nameOf);
      store.clearMarks(['demo']);
      question.notes.forEach((m, i) => store.setMark(m, { kind: 'demo', label: labels[i] }));
    },
    [level.mode, store],
  );

  const answer = useCallback(
    (choice: string) => {
      if (solvedRef.current) return;
      const question = qRef.current;
      learning.recordActivity('ear');
      if (choice !== question.answer) {
        setWrong((w) => (w.includes(choice) ? w : [...w, choice]));
        learning.recordItem(`ear:${level.mode}:${question.answer}`, false);
        mascot.react('oops');
        return;
      }
      setSolved('correct');
      solvedRef.current = 'correct';
      reveal(question);
      learning.recordItem(`ear:${level.mode}:${question.answer}`, true);
      const before = learning.bumpLevel('earLevels', level.id) - 1;
      if (before < EAR_GOAL && before + 1 >= EAR_GOAL) {
        mascot.react('celebrate', EAR_GOAL);
        say('Уровень пройден!');
      } else mascot.react('happy');
      nextTimer.current = window.setTimeout(next, 1800);
    },
    [level.id, level.mode, mascot, next, reveal, say],
  );

  const showAnswer = useCallback(() => {
    if (solvedRef.current) return;
    setSolved('revealed');
    solvedRef.current = 'revealed';
    reveal(qRef.current);
    play(qRef.current);
    learning.recordItem(`ear:${level.mode}:${qRef.current.answer}`, false);
    mascot.react('thinking');
  }, [reveal, play, mascot, level.mode]);

  // Notes mode: answer on the keyboard. Other modes: keys just sound (try to find it by ear).
  useLayoutEffect(() => {
    inputRef.current = {
      noteOn(midi) {
        if (level.mode !== 'notes' || solvedRef.current) return 'ignored';
        const ok = String(midi) === qRef.current.answer;
        if (ok) answer(qRef.current.answer);
        else {
          setWrong((w) => [...w, String(midi)]);
          learning.recordItem(`ear:notes:${qRef.current.answer}`, false);
          mascot.react('oops');
        }
        return ok ? 'correct' : 'wrong';
      },
      noteOff() {},
      releaseAll() {},
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef, level.mode, answer, mascot]);

  useHotkeys({
    KeyP: () => play(qRef.current),
    KeyH: showAnswer,
    Space: next,
  });

  const options =
    level.mode === 'intervals'
      ? level.items.map((id) => {
          const iv = INTERVALS.find((i) => i.id === id)!;
          return { id, short: iv.short, name: iv.name, sub: `${iv.semitones} пт.` };
        })
      : level.mode === 'chords'
        ? level.items.map((id) => ({ id, short: QUALITY_LABEL[id].short, name: QUALITY_LABEL[id].name, sub: '' }))
        : [];

  const answerText = () => {
    if (level.mode === 'intervals') {
      const iv = INTERVALS.find((i) => i.id === q.answer)!;
      return `${iv.name[0].toUpperCase()}${iv.name.slice(1)} — ${iv.semitones} полутон${iv.semitones === 1 ? '' : iv.semitones < 5 ? 'а' : 'ов'}: ${nameOf(q.notes[0])} → ${nameOf(q.notes[1])}`;
    }
    if (level.mode === 'chords') return `${QUALITY_LABEL[q.answer].name[0].toUpperCase()}${QUALITY_LABEL[q.answer].name.slice(1)}`;
    return `Это ${nameOf(Number(q.answer))}`;
  };

  const prompt =
    level.mode === 'intervals' ? 'Какой интервал вы слышите?' : level.mode === 'chords' ? 'Какой это аккорд?' : 'Найдите этот звук на клавиатуре';

  return (
    <>
      <div className={s.controls}>
        <EarModeField mode={mode} onChange={(earMode) => update({ earMode })} />
        <Field label="Уровень">
          <Picker
            ariaLabel="Уровень"
            value={level.id}
            width={250}
            onChange={(id) => update({ earLevel: { ...settings.earLevel, [mode]: id } })}
            items={levelsFor(mode).map((l) => {
              const pr = Math.min(EAR_GOAL, levels[l.id] ?? 0);
              return { id: l.id, group: MODE_TITLE[mode], title: l.title, done: pr >= EAR_GOAL, badge: pr >= EAR_GOAL ? '✓' : pr > 0 ? `${pr}/${EAR_GOAL}` : undefined };
            })}
          />
        </Field>
        {mode === 'intervals' && (
          <Field label="Звучание">
            <Segmented<IntervalDirection>
              ariaLabel="Как звучит интервал"
              value={direction}
              onChange={(earDirection) => update({ earDirection })}
              options={[
                { value: 'up', label: 'Вверх' },
                { value: 'down', label: 'Вниз' },
                { value: 'harmonic', label: 'Вместе' },
              ]}
            />
          </Field>
        )}
        <Field label="Прогресс" value={`${progress} / ${EAR_GOAL}`}>
          <div className={s.progress}>
            <div className={s.progressBar}>
              <span style={{ transform: `scaleX(${progress / EAR_GOAL})` }} />
            </div>
          </div>
        </Field>
        <Divider />
        <span className={s.spacer} />
        <Field label=" ">
          <div className={e.buttons}>
            <ActionButton onClick={showAnswer} kbd="H">
              Показать ответ
            </ActionButton>
            <ActionButton primary onClick={next} kbd="Space">
              Дальше
            </ActionButton>
          </div>
        </Field>
      </div>

      <main className={s.stage}>
        <TheoryLink settings={settings} update={update} />
        <div className={s.eyebrow}>
          {MODE_TITLE[mode]} · {level.title}
        </div>

        <button type="button" className={e.listen} data-playing={playing || undefined} onClick={() => play(q)} aria-label="Послушать ещё раз">
          <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
            <path d="M10 19h7l9-7v24l-9-7h-7z" fill="currentColor" />
            <path className={e.wave1} d="M31 18a8 8 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path className={e.wave2} d="M35.5 13.5a14.5 14.5 0 0 1 0 21" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>
        <div className={e.listenHint}>
          Послушать ещё раз <kbd>P</kbd>
        </div>

        <h1 className={e.prompt}>{prompt}</h1>

        {options.length > 0 && (
          <div className={e.options} data-count={options.length}>
            {options.map((o) => {
              const state = solved && o.id === q.answer ? 'correct' : wrong.includes(o.id) ? 'wrong' : undefined;
              return (
                <button key={o.id} type="button" className={e.option} data-state={state} disabled={!!solved && o.id !== q.answer} onClick={() => answer(o.id)}>
                  <span className={e.optShort}>{o.short}</span>
                  <span className={e.optName}>{o.name}</span>
                </button>
              );
            })}
          </div>
        )}

        <p className={e.feedback} data-state={solved ?? (wrong.length ? 'wrong' : undefined)}>
          {solved === 'correct'
            ? `Верно! ${answerText()}`
            : solved === 'revealed'
              ? `${answerText()}. Послушайте ещё раз и запомните звучание.`
              : wrong.length
                ? level.mode === 'notes'
                  ? 'Не то — послушайте ещё раз: выше или ниже ориентира C4?'
                  : 'Не совсем — послушайте ещё раз.'
                : level.hint}
        </p>
      </main>
    </>
  );
}
