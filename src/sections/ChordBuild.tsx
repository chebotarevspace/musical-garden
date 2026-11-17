import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Spelled } from '../components/Spelled';
import { ActionButton, Divider, Field, InlineSwitch, PlayIcon } from '../components/ui/Controls';
import { Picker } from '../components/ui/Picker';
import { useHotkeys } from '../hooks/useHotkeys';
import { noteStart, noteStop } from '../lib/audio';
import {
  type Chord,
  INVERSION_NAMES,
  LEVELS,
  LEVEL_GOAL,
  QUALITIES,
  bassTone,
  chordFormula,
  chordPcs,
  chordRuName,
  chordSymbol,
  chordTones,
  chordVoicing,
  findLevel,
  matchChord,
  noteText,
  pickChord,
  ruNoteName,
} from '../lib/chords';
import type { Mark } from '../lib/keyStore';
import { ChordModeSwitch } from './ChordModeSwitch';
import { useProgress } from '../hooks/useProgress';
import { progress as learning } from '../lib/progress';
import { TheoryLink } from './TheoryLink';
import type { SectionProps } from './types';
import s from './Section.module.css';
import c from './ChordsSection.module.css';

const pc = (m: number) => ((m % 12) + 12) % 12;

/** Chord building: graded levels from C/F/G major triads to sevenths and colour chords. */
export function ChordBuild({ store, settings, update, inputRef, mascot, say, setKeyboardRange }: SectionProps) {
  const level = findLevel(settings.chordLevel);
  const [chord, setChord] = useState<Chord>(() => pickChord(level, null));
  const [solved, setSolved] = useState(false);
  const [shakeId, setShakeId] = useState(0);
  const [wrongBass, setWrongBass] = useState(false);
  const [listening, setListening] = useState(false);

  const chordRef = useRef(chord);
  chordRef.current = chord;
  const solvedRef = useRef(solved);
  solvedRef.current = solved;
  const held = useRef(new Set<number>());
  const levels = useProgress().chordLevels;
  const levelRef = useRef(level);
  levelRef.current = level;
  const listenTimers = useRef<number[]>([]);

  const progress = Math.min(LEVEL_GOAL, levels[level.id] ?? 0);
  const levelDone = progress >= LEVEL_GOAL;
  const nextLevel = LEVELS[LEVELS.findIndex((l) => l.id === level.id) + 1];

  useEffect(() => setKeyboardRange({ from: 3, to: 5 }), [setKeyboardRange]);

  const nextChord = useCallback(() => {
    const next = pickChord(levelRef.current, chordRef.current);
    chordRef.current = next;
    setChord(next);
    solvedRef.current = false;
    setSolved(false);
    setWrongBass(false);
  }, []);

  // New level → new chord.
  const firstLevel = useRef(true);
  useEffect(() => {
    if (firstLevel.current) {
      firstLevel.current = false;
      return;
    }
    nextChord();
  }, [level.id, nextChord]);

  // ---- listen ----
  const stopListening = useCallback(() => {
    listenTimers.current.forEach((t) => window.clearTimeout(t));
    listenTimers.current = [];
    chordVoicing(chordRef.current).forEach((m) => noteStop(m));
    store.clearMarks(['demo']);
    setListening(false);
  }, [store]);

  const listen = useCallback(() => {
    stopListening();
    const voicing = chordVoicing(chordRef.current);
    const timers: number[] = [];
    setListening(true);
    voicing.forEach((m, i) => {
      timers.push(
        window.setTimeout(() => {
          store.setMark(m, { kind: 'demo' });
          noteStart(m, 75);
        }, i * 260),
      );
      timers.push(window.setTimeout(() => noteStop(m, 0.2), i * 260 + 240));
    });
    const chordAt = voicing.length * 260 + 120;
    timers.push(window.setTimeout(() => voicing.forEach((m) => noteStart(m, 70)), chordAt));
    timers.push(
      window.setTimeout(() => {
        voicing.forEach((m) => noteStop(m, 0.4));
        store.clearMarks(['demo']);
        setListening(false);
      }, chordAt + 1300),
    );
    listenTimers.current = timers;
  }, [store, stopListening]);

  useEffect(() => stopListening, [stopListening]);

  // ---- keys to play (learning mode) ----
  useEffect(() => {
    const marks = new Map<number, Mark>();
    if (settings.showChordKeys && !solved && !listening) {
      const degrees = QUALITIES[chord.quality].degrees;
      const tones = chordPcs(chord);
      for (const m of chordVoicing(chord)) marks.set(m, { kind: 'next', label: degrees[tones.indexOf(pc(m))] });
    }
    store.replaceMarks(marks, ['next']);
  }, [chord, solved, listening, settings.showChordKeys, store]);

  useEffect(() => () => store.clearMarks(), [store]);

  // ---- judging ----
  const check = useCallback(() => {
    if (solvedRef.current) return;
    const res = matchChord(chordRef.current, [...held.current]);
    setWrongBass(res.wrongBass);
    if (!res.complete) return;
    solvedRef.current = true;
    setSolved(true);
    const lv = levelRef.current;
    const after = learning.bumpLevel('chordLevels', lv.id);
    const before = after - 1;
    learning.recordItem(`chord:${chordSymbol(chordRef.current)}`, true);
    if (before < LEVEL_GOAL && after >= LEVEL_GOAL) {
      mascot.react('celebrate', after);
      say('Уровень пройден!');
    } else mascot.react('happy');
  }, [mascot, say]);

  useLayoutEffect(() => {
    inputRef.current = {
      noteOn(midi) {
        held.current.add(midi);
        if (listenTimers.current.length) stopListening();
        if (solvedRef.current) return 'ignored';
        const inChord = chordPcs(chordRef.current).includes(pc(midi));
        if (!inChord) {
          learning.recordItem(`chord:${chordSymbol(chordRef.current)}`, false);
          setShakeId((n) => n + 1);
          mascot.react('oops');
        }
        check();
        return inChord ? 'correct' : 'wrong';
      },
      noteOff(midi) {
        held.current.delete(midi);
        if (solvedRef.current) {
          if (held.current.size === 0) nextChord();
        } else check();
      },
      releaseAll() {
        held.current.clear();
        if (solvedRef.current) nextChord();
      },
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef, check, nextChord, mascot, stopListening]);

  // Shake the symbol on a wrong key.
  const symbolRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!shakeId || !symbolRef.current) return;
    symbolRef.current.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }],
      { duration: 320, easing: 'cubic-bezier(.36,.07,.19,.97)' },
    );
  }, [shakeId]);

  useHotkeys({
    Space: nextChord,
    KeyP: () => (listenTimers.current.length ? stopListening() : listen()),
    KeyK: () => update({ showChordKeys: !settings.showChordKeys }),
  });

  const tones = chordTones(chord);
  const q = QUALITIES[chord.quality];
  const reveal = settings.showChordKeys || solved;
  const symbol = chordSymbol(chord);
  const slash = symbol.indexOf('/');

  return (
    <>
      <div className={s.controls}>
        <ChordModeSwitch settings={settings} update={update} />
        <Field label="Уровень">
          <Picker
            ariaLabel="Уровень"
            value={level.id}
            width={280}
            onChange={(chordLevel) => update({ chordLevel })}
            items={LEVELS.map((l) => {
              const p = Math.min(LEVEL_GOAL, levels[l.id] ?? 0);
              return { id: l.id, group: l.group, title: l.title, done: p >= LEVEL_GOAL, badge: p >= LEVEL_GOAL ? '✓' : p > 0 ? `${p}/${LEVEL_GOAL}` : undefined };
            })}
          />
        </Field>
        <Field label="Прогресс" value={`${progress} / ${LEVEL_GOAL}`}>
          <div className={s.progress}>
            <div className={s.progressBar}>
              <span style={{ transform: `scaleX(${progress / LEVEL_GOAL})` }} />
            </div>
          </div>
        </Field>
        <Divider />
        <Field label="Подсказки">
          <InlineSwitch
            label="Клавиши"
            title="Показывать клавиши аккорда на клавиатуре (K)"
            checked={settings.showChordKeys}
            onChange={(showChordKeys) => update({ showChordKeys })}
          />
        </Field>
        <span className={s.spacer} />
        <Field label=" ">
          <div className={c.buttons}>
            <ActionButton onClick={listen} kbd="P" active={listening}>
              <PlayIcon /> Послушать
            </ActionButton>
            <ActionButton primary onClick={nextChord} kbd="Space">
              Следующий
            </ActionButton>
          </div>
        </Field>
      </div>

      <main className={s.stage}>
        <TheoryLink settings={settings} update={update} />
        <div className={s.eyebrow}>
          {level.group} · {level.title}
        </div>
        <div ref={symbolRef} className={c.symbolWrap}>
          <div key={symbol} className={c.symbol} data-solved={solved || undefined}>
            <Spelled text={slash >= 0 ? symbol.slice(0, slash) : symbol} />
            {slash >= 0 && (
              <span className={c.slash}>
                /<Spelled text={symbol.slice(slash + 1)} />
              </span>
            )}
          </div>
        </div>
        <div className={c.name}>
          {chordRuName(chord)}
          {chord.bassRequired && <span className={c.inversion}> · {INVERSION_NAMES[chord.inversion]}</span>}
        </div>

        <div className={c.tones} data-reveal={reveal || undefined}>
          {tones.map((t, i) => (
            <div key={i} className={c.tone} data-bass={chord.bassRequired && i === chord.inversion ? true : undefined}>
              <span className={c.degree}>{q.degrees[i]}</span>
              <span className={c.toneName}>{reveal ? <Spelled text={noteText(t)} /> : '?'}</span>
            </div>
          ))}
          <div className={c.formula}>
            <span className={c.degree}>интервалы</span>
            <span>{chordFormula(chord.quality)} полутона</span>
          </div>
        </div>

        {solved ? (
          levelDone && nextLevel && progress === LEVEL_GOAL && (levels[level.id] ?? 0) === LEVEL_GOAL ? (
            <div className={s.success}>
              <span>
                <strong>Уровень пройден!</strong> Дальше: {nextLevel.title}
              </span>
              <ActionButton onClick={() => update({ chordLevel: nextLevel.id })}>Следующий уровень →</ActionButton>
            </div>
          ) : (
            <p className={s.subtitle}>Отлично! Отпустите клавиши — будет следующий аккорд</p>
          )
        ) : (
          <p className={s.subtitle}>
            {wrongBass ? (
              <span className={c.warn}>
                Все звуки на месте, но внизу должна быть нота {ruNoteName(bassTone(chord)).toLowerCase()} (<Spelled text={noteText(bassTone(chord))} />)
              </span>
            ) : chord.bassRequired ? (
              <>
                Самой нижней сыграйте ноту <Spelled text={noteText(bassTone(chord))} />, остальные — выше. {level.hint}
              </>
            ) : (
              <>Сыграйте все звуки аккорда в любой октаве и любом порядке. {level.hint}</>
            )}
          </p>
        )}
      </main>
    </>
  );
}
