import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccidentalGlyph } from '../components/AccidentalGlyph';
import { StaffLine } from '../components/StaffLine';
import { ActionButton, Divider, Field } from '../components/ui/Controls';
import { Segmented } from '../components/ui/Segmented';
import { useHotkeys } from '../hooks/useHotkeys';
import { midiOf } from '../learn/music';
import { makePhrase } from '../lib/melody';
import { type Mode, midiToCode } from '../lib/notes';
import { playSequence } from '../lib/player';
import { progress as learning } from '../lib/progress';
import type { ClefChoice } from '../lib/staff';
import type { NoteSource } from '../lib/storage';
import { TheoryLink } from './TheoryLink';
import { NOTE_SOURCES } from './NotesHands';
import type { SectionProps } from './types';
import s from './Section.module.css';
import m from './NotesMelody.module.css';

const HINT_MS = 1000;

/** Sight-reading: play a short phrase from the staff, note by note. */
export function NotesMelody({ store, settings, update, inputRef, mascot, octaveOffset, setKeyboardRange }: SectionProps) {
  const make = useCallback(() => makePhrase(settings.clef, settings.mode, settings.melodyLength), [settings.clef, settings.mode, settings.melodyLength]);
  const [phrase, setPhrase] = useState<string[]>(make);
  const [index, setIndex] = useState(0);
  const [wrongAt, setWrongAt] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const st = useRef({ phrase, index, done: false });
  st.current = { phrase, index, done: index >= phrase.length };
  const nextTimer = useRef<number>();
  const hintTimer = useRef<number>();

  const newPhrase = useCallback(() => {
    window.clearTimeout(nextTimer.current);
    store.clearMarks(['hint']);
    setPhrase(make());
    setIndex(0);
    setMistakes(0);
    setWrongAt(null);
  }, [make, store]);

  // New settings → new phrase.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    newPhrase();
  }, [newPhrase]);

  useEffect(() => {
    const lo = settings.clef === 'bass' ? 2 : 3;
    const hi = settings.clef === 'bass' ? 4 : 5;
    setKeyboardRange({ from: lo, to: hi });
  }, [settings.clef, setKeyboardRange]);

  useEffect(
    () => () => {
      window.clearTimeout(nextTimer.current);
      window.clearTimeout(hintTimer.current);
      store.clearMarks();
    },
    [store],
  );

  useLayoutEffect(() => {
    inputRef.current = {
      noteOn(midi) {
        const { phrase: ph, index: i, done } = st.current;
        if (done) return 'ignored';
        const target = midiOf(ph[i]);
        const ok = midi === target;
        learning.recordItem(`note:melody:${target}`, ok);
        if (!ok) {
          setWrongAt(i);
          setMistakes((n) => n + 1);
          mascot.react('oops');
          return 'wrong';
        }
        store.clearMarks(['hint']);
        setWrongAt(null);
        const next = i + 1;
        setIndex(next);
        if (next >= ph.length) {
          mascot.react('happy');
          nextTimer.current = window.setTimeout(newPhrase, 2200);
        } else mascot.markActive();
        return 'correct';
      },
      noteOff() {},
      releaseAll() {},
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef, mascot, store, newPhrase]);

  const showHint = useCallback(() => {
    const { phrase: ph, index: i, done } = st.current;
    if (done) return;
    const target = midiOf(ph[i]);
    learning.recordItem(`note:melody:${target}`, false);
    store.setMark(target, { kind: 'hint' });
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => store.setMark(target, null), HINT_MS);
  }, [store]);

  const listen = () => playSequence(phrase.map((c) => [midiOf(c)]), 110, undefined, 0.85);

  useHotkeys({
    Space: newPhrase,
    KeyH: showHint,
    KeyP: listen,
    KeyN: () => update({ noteSource: 'code' }),
    KeyM: () => update({ mode: settings.mode === 'naturals' ? 'accidentals' : 'naturals' }),
  });

  const done = index >= phrase.length;
  const name = (c: string) => midiToCode(midiOf(c), /♭|b\d/.test(c) ? 'flat' : 'sharp', octaveOffset);

  return (
    <>
      <div className={s.controls}>
        <Field label="Задание">
          <Segmented<NoteSource>
            ariaLabel="Что показывать"
            title="Переключить: N"
            value="melody"
            onChange={(noteSource) => update({ noteSource })}
            options={NOTE_SOURCES}
          />
        </Field>
        <Field label="Клавиши">
          <Segmented<Mode>
            ariaLabel="Какие ноты"
            title="Переключить: M"
            value={settings.mode}
            onChange={(mode) => update({ mode })}
            options={[
              { value: 'naturals', label: 'Чистые ноты' },
              {
                value: 'accidentals',
                title: 'С ♯ и ♭',
                label: (
                  <>
                    С <AccidentalGlyph kind="sharp" className="glyph-inline" /> и <AccidentalGlyph kind="flat" className="glyph-inline" />
                  </>
                ),
              },
            ]}
          />
        </Field>
        <Divider />
        <Field label="Ключ">
          <Segmented<ClefChoice>
            ariaLabel="Ключ"
            value={settings.clef}
            onChange={(clef) => update({ clef })}
            options={[
              { value: 'treble', label: 'Скрипичный' },
              { value: 'bass', label: 'Басовый' },
              { value: 'grand', label: 'Оба' },
            ]}
          />
        </Field>
        <Field label="Нот во фразе">
          <Segmented<'4' | '6' | '8'>
            ariaLabel="Длина фразы"
            value={String(settings.melodyLength) as '4' | '6' | '8'}
            onChange={(v) => update({ melodyLength: Number(v) as 4 | 6 | 8 })}
            options={[
              { value: '4', label: '4' },
              { value: '6', label: '6' },
              { value: '8', label: '8' },
            ]}
          />
        </Field>
      </div>

      <main className={s.stage}>
        <TheoryLink settings={{ ...settings, noteSource: 'staff' }} update={update} />
        <div className={s.eyebrow}>Чтение с листа</div>
        <div className={m.card} data-done={done || undefined}>
          <StaffLine
            clef={settings.clef}
            notes={phrase.map((code, i) => ({
              code,
              state: i < index ? 'done' : i === index ? (wrongAt === i ? 'wrong' : 'current') : 'todo',
              label: done ? name(code) : undefined,
            }))}
          />
        </div>
        <p className={s.subtitle}>
          {done
            ? mistakes === 0
              ? 'Чисто! Следующая фраза сейчас появится.'
              : `Фраза сыграна, ошибок: ${mistakes}. Следующая — через пару секунд.`
            : wrongAt !== null
              ? 'Не та нота — посмотрите ещё раз: линия или промежуток? Вверх или вниз от предыдущей?'
              : 'Сыграйте ноты по порядку слева направо. Смотрите на расстояние между соседними нотами — так читать быстрее.'}
        </p>
        <div className={s.actions}>
          <ActionButton onClick={showHint} kbd="H">
            Подсказка
          </ActionButton>
          <ActionButton onClick={listen} kbd="P">
            Послушать
          </ActionButton>
          <ActionButton onClick={newPhrase} kbd="Space">
            Другая фраза
          </ActionButton>
        </div>
      </main>
    </>
  );
}

