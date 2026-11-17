import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActionButton, Divider, Field } from '../components/ui/Controls';
import { Picker } from '../components/ui/Picker';
import { Segmented } from '../components/ui/Segmented';
import { useHotkeys } from '../hooks/useHotkeys';
import { useProgress } from '../hooks/useProgress';
import { EAR_GOAL, findEarLevel, levelsFor } from '../lib/ear';
import { makeEarPhrase as makeBase } from '../lib/earMelody';
import { melodyPhraseForEar } from '../lib/melodyLinks';
import { allMelodies } from '../lib/melodyModel';
import { myMelodies } from '../lib/myMelodies';

/** «Фразы из моих мелодий» take phrases from the melodies being learned; other levels are generated. */
const makeEarPhrase = (levelId: string, prev: number[] | null = null) =>
  (levelId === 'm-mine' ? melodyPhraseForEar(allMelodies(myMelodies.get())) : null) ?? makeBase(levelId === 'm-mine' ? 'm-songs' : levelId, prev);
import { midiToCode } from '../lib/notes';
import { playSequence, stopSequence } from '../lib/player';
import { progress as learning } from '../lib/progress';
import type { EarModeKey } from '../lib/storage';
import { TheoryLink } from './TheoryLink';
import type { SectionProps } from './types';
import s from './Section.module.css';
import e from './EarSection.module.css';

export const EAR_MODE_TITLE: Record<EarModeKey, string> = { intervals: 'Интервалы', chords: 'Аккорды', notes: 'Ноты', melody: 'Мелодии' };

export function EarModeField({ mode, onChange }: { mode: EarModeKey; onChange(m: EarModeKey): void }) {
  return (
    <Field label="Что слушаем">
      <Segmented<EarModeKey>
        ariaLabel="Что слушаем"
        value={mode}
        onChange={onChange}
        options={(['intervals', 'chords', 'notes', 'melody'] as const).map((m) => ({ value: m, label: EAR_MODE_TITLE[m] }))}
      />
    </Field>
  );
}

const name = (m: number) => midiToCode(m, 'sharp');

/** «Повтори мелодию»: listen to a short phrase and play it back. */
export function EarMelody({ store, settings, update, inputRef, mascot, say, setKeyboardRange }: SectionProps) {
  const level = findEarLevel(settings.earLevel.melody ?? '', 'melody');
  const levels = useProgress().earLevels;
  const done = Math.min(EAR_GOAL, levels[level.id] ?? 0);

  const [phrase, setPhrase] = useState<number[]>(() => makeEarPhrase(level.id));
  const [pos, setPos] = useState(0);
  const [misses, setMisses] = useState(0);
  const [state, setState] = useState<'listen' | 'play' | 'solved' | 'shown'>('listen');
  const [playing, setPlaying] = useState(-1);
  const ref = useRef({ phrase, pos, misses, state });
  ref.current = { phrase, pos, misses, state };
  const nextTimer = useRef<number>();

  useEffect(() => setKeyboardRange({ from: 3, to: 5 }), [setKeyboardRange]);

  const markStart = useCallback(
    (p: number[]) => {
      store.clearMarks();
      store.setMark(p[0], { kind: 'hint', label: 'старт' });
    },
    [store],
  );

  const play = useCallback(
    (p: number[]) => {
      const bpm = p.length > 5 ? 120 : 100;
      playSequence(
        p.map((m) => [m]),
        bpm,
        (i) => {
          setPlaying(i ?? -1);
          if (i === null && ref.current.state === 'listen') setState('play');
        },
        0.85,
      );
    },
    [],
  );

  const next = useCallback(() => {
    window.clearTimeout(nextTimer.current);
    const p = makeEarPhrase(level.id, ref.current.phrase);
    setPhrase(p);
    setPos(0);
    setMisses(0);
    setState('listen');
  }, [level.id]);

  // New level → new phrase.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    next();
  }, [level.id, next]);

  // Each new phrase: show the starting key and play it.
  useEffect(() => {
    markStart(phrase);
    const t = window.setTimeout(() => play(phrase), 400);
    return () => window.clearTimeout(t);
  }, [phrase, play, markStart]);

  useEffect(
    () => () => {
      window.clearTimeout(nextTimer.current);
      stopSequence();
      store.clearMarks();
    },
    [store],
  );

  const show = useCallback(() => {
    const { phrase: p, state: st } = ref.current;
    if (st === 'solved') return;
    store.clearMarks();
    // A key that repeats gets all its numbers: «1·3».
    const labels = new Map<number, string[]>();
    p.forEach((m, i) => labels.set(m, [...(labels.get(m) ?? []), String(i + 1)]));
    labels.forEach((l, m) => store.setMark(m, { kind: 'demo', label: l.join('·') }));
    setState('shown');
    learning.recordItem(`ear:melody:${level.id}`, false);
    play(p);
    mascot.react('thinking');
  }, [store, play, level.id, mascot]);

  useLayoutEffect(() => {
    inputRef.current = {
      noteOn(midi) {
        const { phrase: p, pos: i, state: st, misses: miss } = ref.current;
        if (st === 'solved') return 'ignored';
        stopSequence();
        if (st === 'listen') {
          setState('play');
          ref.current.state = 'play';
        }
        if (midi === p[i]) {
          const ni = i + 1;
          setPos(ni);
          ref.current.pos = ni;
          if (i === 0) store.clearMarks(['hint']);
          if (ni === p.length) {
            setState('solved');
            ref.current.state = 'solved';
            const clean = st !== 'shown' && miss === 0;
            learning.recordItem(`ear:melody:${level.id}`, clean);
            if (st !== 'shown') {
              const n = learning.bumpLevel('earLevels', level.id);
              if (n === EAR_GOAL) say('Уровень пройден!');
              mascot.react(n === EAR_GOAL ? 'celebrate' : 'happy', n);
            }
            store.clearMarks();
            p.forEach((m) => store.setMark(m, { kind: 'demo', label: name(m).replace(/\d/, '') }));
            nextTimer.current = window.setTimeout(next, 2200);
          }
          return 'correct';
        }
        // Wrong note: start the phrase again.
        setPos(0);
        ref.current.pos = 0;
        setMisses((x) => x + 1);
        mascot.react('oops');
        if (st !== 'shown') markStart(p);
        return 'wrong';
      },
      noteOff() {},
      releaseAll() {},
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef, level.id, mascot, say, store, next, markStart]);

  useHotkeys({
    KeyP: () => play(ref.current.phrase),
    KeyH: show,
    Space: next,
  });

  const prompt =
    state === 'solved' ? 'Получилось!' : state === 'listen' ? 'Слушайте…' : misses > 0 && pos === 0 ? 'Ещё раз с первой ноты' : 'Сыграйте мелодию';

  return (
    <>
      <div className={s.controls}>
        <EarModeField mode="melody" onChange={(earMode) => update({ earMode })} />
        <Field label="Уровень">
          <Picker
            ariaLabel="Уровень"
            value={level.id}
            width={250}
            onChange={(id) => update({ earLevel: { ...settings.earLevel, melody: id } })}
            items={levelsFor('melody').map((l) => {
              const pr = Math.min(EAR_GOAL, levels[l.id] ?? 0);
              return { id: l.id, group: 'Мелодии', title: l.title, done: pr >= EAR_GOAL, badge: pr >= EAR_GOAL ? '✓' : pr > 0 ? `${pr}/${EAR_GOAL}` : undefined };
            })}
          />
        </Field>
        <Field label="Прогресс" value={`${done} / ${EAR_GOAL}`}>
          <div className={s.progress}>
            <div className={s.progressBar}>
              <span style={{ transform: `scaleX(${done / EAR_GOAL})` }} />
            </div>
          </div>
        </Field>
        <Divider />
        <span className={s.spacer} />
        <Field label=" ">
          <div className={e.buttons}>
            <ActionButton onClick={show} kbd="H">
              Показать
            </ActionButton>
            <ActionButton primary onClick={next} kbd="Space">
              Дальше
            </ActionButton>
          </div>
        </Field>
      </div>

      <main className={s.stage}>
        <TheoryLink settings={settings} update={update} />
        <div className={s.eyebrow}>Мелодии · {level.title}</div>

        <button type="button" className={e.listen} data-playing={playing >= 0 || undefined} onClick={() => play(phrase)} aria-label="Послушать ещё раз">
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

        <div className={e.slots} aria-label={`Сыграно ${pos} из ${phrase.length}`}>
          {phrase.map((m, i) => (
            <span
              key={i}
              className={e.slot}
              data-state={state === 'solved' || i < pos ? 'done' : i === pos && state !== 'listen' ? 'now' : playing === i ? 'sound' : undefined}
            >
              {state === 'solved' || state === 'shown' || i < pos ? name(m) : i === 0 ? name(m) : '?'}
            </span>
          ))}
        </div>

        <p className={e.feedback} data-state={state === 'solved' ? 'correct' : misses && pos === 0 ? 'wrong' : undefined}>
          {state === 'solved'
            ? misses === 0
              ? 'С первого раза — отличный слух!'
              : `Готово, ошибок по дороге: ${misses}.`
            : state === 'shown'
              ? 'Клавиши подписаны по порядку — сыграйте и запомните, как звучит.'
              : misses >= 3
                ? 'Трудно? Послушайте ещё раз (P) или подсмотрите (H).'
                : level.hint}
        </p>
      </main>
    </>
  );
}
