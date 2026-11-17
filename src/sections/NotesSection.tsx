import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { AccidentalGlyph } from '../components/AccidentalGlyph';
import { NoteDisplay } from '../components/NoteDisplay';
import { PHRASES } from '../components/mascotPhrases';
import { RangeSelector } from '../components/RangeSelector';
import { Staff } from '../components/Staff';
import { ActionButton, Divider, Field } from '../components/ui/Controls';
import { Segmented } from '../components/ui/Segmented';
import { useHotkeys } from '../hooks/useHotkeys';
import { useTrainer } from '../hooks/useTrainer';
import { type Mode, formatNote, scientificOctave, targetToNote } from '../lib/notes';
import { CLEF_BOUNDS, type ClefChoice } from '../lib/staff';
import { progress } from '../lib/progress';
import type { NoteSource } from '../lib/storage';
import { TheoryLink } from './TheoryLink';
import { NOTE_SOURCES, NotesHands } from './NotesHands';
import { NotesMelody } from './NotesMelody';
import { MelodyLearn } from './MelodyLearn';
import type { SectionProps } from './types';
import s from './Section.module.css';

const HINT_MS = 1000;
const fmtOct = (n: number) => String(n).replace('-', '−');

/** Find a note shown as a code (C4, F♯5) or on the staff. */
/** Notes: find a note by its code or on the staff, or read a whole melody. */
export function NotesSection(props: SectionProps) {
  if (props.settings.noteSource === 'tune') return <MelodyLearn key="tune" {...props} />;
  if (props.settings.noteSource === 'hands') return <NotesHands key="hands" {...props} />;
  return props.settings.noteSource === 'melody' ? <NotesMelody key="melody" {...props} /> : <NotesTrainer key="trainer" {...props} />;
}

function NotesTrainer({ store, settings, update, inputRef, mascot, say, octaveOffset, midiConnected, setKeyboardRange }: SectionProps) {
  const staff = settings.noteSource === 'staff';
  const bounds: [number, number] | null = staff ? CLEF_BOUNDS[settings.clef] : null;
  const initialStats = useMemo(() => progress.get().notesStats, []);
  const trainer = useTrainer({
    initialMode: settings.mode,
    initialRange: settings.range,
    initialStats,
    initialBounds: bounds,
  });
  const { state, press, release, setMode: trainerSetMode, setRange, setBounds, hint, skip: trainerSkip, getState } = trainer;

  // Settings are the source of truth; the trainer follows them.
  useEffect(() => trainerSetMode(settings.mode), [trainerSetMode, settings.mode]);
  useEffect(() => setRange(settings.range), [setRange, settings.range]);
  const b0 = bounds?.[0];
  const b1 = bounds?.[1];
  useEffect(() => setBounds(b0 === undefined || b1 === undefined ? null : [b0, b1]), [setBounds, b0, b1]);

  // Small-screen keyboard shows exactly the notes that can be asked.
  useEffect(() => {
    if (b0 !== undefined && b1 !== undefined) setKeyboardRange({ from: scientificOctave(b0), to: scientificOctave(b1) });
    else setKeyboardRange(settings.range);
  }, [b0, b1, settings.range, setKeyboardRange]);

  // Mascot reacts to every judged press.
  useEffect(() => {
    const r = state.reaction;
    if (r) mascot.react(r.mood, r.streak);
  }, [state.reaction, mascot]);

  // ---- keyboard input ----
  useLayoutEffect(() => {
    inputRef.current = {
      noteOn(midi) {
        const st = getState();
        const target = st.target.midi;
        const result = press(midi);
        if (result === 'correct') store.clearMarks(['hint']);
        // Remember which notes are hard (per task type) for adaptive practice.
        if (result !== 'ignored') progress.recordItem(`note:${st.bounds ? 'staff' : 'code'}:${target}`, result === 'correct');
        return result;
      },
      noteOff: (midi) => release(midi),
      releaseAll: () => release(null),
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef, press, release, store, getState]);

  useEffect(() => () => store.clearMarks(), [store]);

  // ---- actions ----
  const hintTimer = useRef<number>();
  const showHint = useCallback(() => {
    const target = hint();
    if (target === null) return;
    progress.recordItem(`note:${getState().bounds ? 'staff' : 'code'}:${target}`, false);
    store.clearMarks(['hint']);
    store.setMark(target, { kind: 'hint' });
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => store.setMark(target, null), HINT_MS);
  }, [hint, store, getState]);
  useEffect(() => () => window.clearTimeout(hintTimer.current), []);

  const skip = useCallback(() => {
    store.clearMarks(['hint']);
    trainerSkip();
  }, [trainerSkip, store]);

  const setMode = useCallback(
    (mode: Mode) => {
      if (mode === settings.mode) return;
      if (mode === 'accidentals' && !settings.introSeen) {
        say(PHRASES.accidentalsIntro);
        update({ mode, introSeen: true });
      } else update({ mode });
    },
    [settings.mode, settings.introSeen, update, say],
  );

  useHotkeys({
    Space: skip,
    KeyH: showHint,
    KeyM: () => setMode(settings.mode === 'naturals' ? 'accidentals' : 'naturals'),
    KeyN: () => update({ noteSource: staff ? 'melody' : 'staff' }),
  });

  const codeNote = targetToNote(state.target, octaveOffset);
  const sciNote = targetToNote(state.target, 0);
  const { from, to } = settings.range;

  return (
    <>
      <div className={s.controls}>
        <Field label="Задание">
          <Segmented<NoteSource>
            ariaLabel="Что показывать"
            title="Переключить: N"
            value={settings.noteSource}
            onChange={(noteSource) => update({ noteSource })}
            options={NOTE_SOURCES}
          />
        </Field>
        <Field label="Клавиши">
          <Segmented<Mode>
            ariaLabel="Какие ноты загадывать"
            title="Переключить: M"
            value={settings.mode}
            onChange={setMode}
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
        {staff ? (
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
        ) : (
          <Field label="Октавы" value={from === to ? fmtOct(from + octaveOffset) : `${fmtOct(from + octaveOffset)}–${fmtOct(to + octaveOffset)}`}>
            <RangeSelector bare range={settings.range} octaveOffset={octaveOffset} onChange={(range) => update({ range })} />
          </Field>
        )}
      </div>

      <main className={s.stage}>
        <TheoryLink settings={settings} update={update} />
        {staff ? (
          <Staff
            note={sciNote}
            clef={settings.clef}
            targetId={state.targetId}
            shakeId={state.shakeId}
            solved={state.solved}
            reveal={state.solved ? formatNote(codeNote) : null}
          />
        ) : (
          <NoteDisplay note={codeNote} targetId={state.targetId} shakeId={state.shakeId} solved={state.solved} />
        )}
        <p className={s.subtitle}>
          {staff
            ? 'Найдите на клавиатуре ноту с нотного стана'
            : midiConnected
              ? 'Нажмите клавишу на MIDI-клавиатуре'
              : settings.micOn ? 'Сыграйте эту ноту на пианино' : 'Нажмите клавишу на MIDI-клавиатуре или кликните по экранной'}
        </p>
        <div className={s.actions}>
          <ActionButton onClick={showHint} kbd="H">
            Подсказка
          </ActionButton>
          <ActionButton onClick={skip} kbd="Space">
            Пропустить
          </ActionButton>
        </div>
      </main>
    </>
  );
}
