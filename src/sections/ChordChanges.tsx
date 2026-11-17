import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Spelled } from '../components/Spelled';
import { ActionButton, Divider, Field, InlineSwitch, PlayIcon, StopIcon } from '../components/ui/Controls';
import { Picker } from '../components/ui/Picker';
import { Segmented } from '../components/ui/Segmented';
import { useHotkeys } from '../hooks/useHotkeys';
import { useProgress } from '../hooks/useProgress';
import { playClick, primeAudio } from '../lib/audio';
import { CHANGE_SETS, changeChords, changeStars, findChangeSet, holdsChord } from '../lib/changes';
import { chordPcs, chordSymbol } from '../lib/chords';
import type { Mark } from '../lib/keyStore';
import { progress as learning } from '../lib/progress';
import { voiceLead } from '../lib/progressions';
import { ChordModeSwitch } from './ChordModeSwitch';
import { TheoryLink } from './TheoryLink';
import type { SectionProps } from './types';
import s from './Section.module.css';
import cc from './ChordChanges.module.css';

type Phase = 'ready' | 'run' | 'done';

/** «Смены»: as many clean chord changes as you can in 30 or 60 seconds. */
export function ChordChanges({ store, settings, update, inputRef, mascot, say, setKeyboardRange }: SectionProps) {
  const set = findChangeSet(settings.changesSet);
  const chords = useMemo(() => changeChords(set), [set]);
  // Smooth hand positions for the hints: voice-led around the loop.
  const voicings = useMemo(() => voiceLead([...chords, ...chords]).slice(chords.length), [chords]);
  const seconds = settings.changesSecs;
  const counters = useProgress().counters;
  const bestKey = `changes:best:${set.id}:${seconds}`;
  const best = counters[bestKey] ?? 0;

  const [phase, setPhase] = useState<Phase>('ready');
  const [target, setTarget] = useState(0);
  const [count, setCount] = useState(0);
  const [left, setLeft] = useState<number>(seconds);
  const [slips, setSlips] = useState(0);
  const [result, setResult] = useState<{ count: number; record: boolean; prevBest: number } | null>(null);
  const [lastRun, setLastRun] = useState<number | null>(null);

  const st = useRef({ phase: 'ready' as Phase, target: 0, count: 0, slips: 0, held: new Set<number>(), endAt: 0, timer: 0 });

  const reset = useCallback(() => {
    const S = st.current;
    window.clearInterval(S.timer);
    S.phase = 'ready';
    S.target = 0;
    S.count = 0;
    S.slips = 0;
    setPhase('ready');
    setTarget(0);
    setCount(0);
    setSlips(0);
    setLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    reset();
    setResult(null);
    setLastRun(null);
  }, [set.id, seconds, reset]);
  useEffect(() => setKeyboardRange({ from: 3, to: 5 }), [setKeyboardRange]);
  useEffect(
    () => () => {
      window.clearInterval(st.current.timer);
      store.clearMarks();
    },
    [store],
  );

  const finish = useCallback(() => {
    const S = st.current;
    window.clearInterval(S.timer);
    S.phase = 'done';
    setPhase('done');
    setLeft(0);
    playClick(true);
    const prevBest = learning.get().counters[bestKey] ?? 0;
    const record = S.count > prevBest;
    if (record) learning.count(bestKey, S.count - prevBest);
    learning.count('changes:runs');
    learning.count('changes:total', S.count);
    setResult({ count: S.count, record, prevBest });
    setLastRun(S.count);
    if (record && prevBest > 0) {
      mascot.react('celebrate', 10);
      say(`Новый рекорд: ${S.count} смен! Было ${prevBest}.`);
    } else mascot.react('happy');
  }, [bestKey, mascot, say]);

  const begin = useCallback(() => {
    primeAudio();
    const S = st.current;
    S.phase = 'run';
    S.count = 0;
    S.slips = 0;
    S.endAt = performance.now() + seconds * 1000;
    setPhase('run');
    setCount(0);
    setSlips(0);
    setResult(null);
    playClick(true);
    window.clearInterval(S.timer);
    S.timer = window.setInterval(() => {
      const ms = S.endAt - performance.now();
      setLeft(Math.max(0, Math.ceil(ms / 1000)));
      if (ms <= 0) finish();
    }, 100);
  }, [seconds, finish]);

  // Your notes: the timer starts with the first chord; each next chord in the loop is a change.
  useLayoutEffect(() => {
    inputRef.current = {
      noteOn(midi) {
        const S = st.current;
        S.held.add(midi);
        if (S.phase === 'done') return 'ignored';
        const want = chords[S.target];
        const prev = chords[(S.target - 1 + chords.length) % chords.length];
        const pc = ((midi % 12) + 12) % 12;
        // A note of neither the target nor the chord you're leaving — a slip (not a penalty).
        if (!chordPcs(want).includes(pc) && !(S.phase === 'run' && chordPcs(prev).includes(pc))) {
          S.slips += 1;
          setSlips(S.slips);
          return 'wrong';
        }
        if (!holdsChord(S.held, want)) return 'ignored';
        if (S.phase === 'ready') begin();
        else {
          S.count += 1;
          setCount(S.count);
          mascot.markActive();
        }
        S.target = (S.target + 1) % chords.length;
        setTarget(S.target);
        return 'correct';
      },
      noteOff(midi) {
        st.current.held.delete(midi);
      },
      releaseAll() {
        st.current.held.clear();
      },
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef, chords, begin, mascot]);

  // Hints: where to put the hand for the next chord.
  useEffect(() => {
    const marks = new Map<number, Mark>();
    if (settings.changesKeys && phase !== 'done') for (const m of voicings[target] ?? []) marks.set(m, { kind: 'next' });
    store.replaceMarks(marks, ['next']);
  }, [settings.changesKeys, phase, target, voicings, store]);

  useHotkeys({
    Space: () => (reset(), setResult(null)),
    KeyK: () => update({ changesKeys: !settings.changesKeys }),
  });

  const nextChord = chords[(target + 1) % chords.length];
  const frac = phase === 'run' ? left / seconds : 1;
  const stars = result ? changeStars(result.count, seconds) : 0;

  return (
    <>
      <div className={s.controls}>
        <ChordModeSwitch settings={settings} update={update} />
        <Field label="Аккорды">
          <Picker
            ariaLabel="Аккорды"
            value={set.id}
            width={200}
            onChange={(changesSet) => update({ changesSet })}
            items={CHANGE_SETS.map((x) => {
              const b = counters[`changes:best:${x.id}:${seconds}`];
              return { id: x.id, group: x.group, title: x.title, badge: b ? `★ ${b}` : undefined };
            })}
          />
        </Field>
        <Divider />
        <Field label="Время">
          <Segmented<'30' | '60'>
            ariaLabel="Время"
            value={String(seconds) as '30' | '60'}
            onChange={(v) => update({ changesSecs: v === '30' ? 30 : 60 })}
            options={[
              { value: '30', label: '30 с' },
              { value: '60', label: '1 мин' },
            ]}
          />
        </Field>
        <Field label="Подсказки">
          <InlineSwitch label="Клавиши" title="Подсветить удобное положение следующего аккорда (K)" checked={settings.changesKeys} onChange={(changesKeys) => update({ changesKeys })} />
        </Field>
        <span className={s.spacer} />
        <Field label=" ">
          <ActionButton primary onClick={() => (reset(), setResult(null))} kbd="Space" title={phase === 'run' ? 'Прервать — без результата' : undefined}>
            {phase === 'run' ? <StopIcon /> : <PlayIcon />} {phase === 'run' ? 'Прервать' : phase === 'done' ? 'Ещё раз' : 'Сначала'}
          </ActionButton>
        </Field>
      </div>

      <main className={`${s.stage} ${cc.stage}`}>
        <TheoryLink settings={settings} update={update} />
        <div className={s.eyebrow}>Смены аккордов · {set.title}</div>

        <div className={cc.board} data-phase={phase}>
          <div className={cc.timer} style={{ '--frac': frac } as CSSProperties}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className={cc.track} cx="60" cy="60" r="52" />
              <circle className={cc.ring} cx="60" cy="60" r="52" pathLength={1} strokeDasharray={`${frac} 1`} />
            </svg>
            <div className={cc.count}>
              <b>{count}</b>
              <span>{phase === 'run' ? `${left} с` : phase === 'done' ? 'смен' : `за ${seconds === 60 ? 'минуту' : '30 секунд'}`}</span>
            </div>
          </div>

          <div className={cc.chords}>
            {phase === 'done' && result ? (
              <div className={cc.result}>
                <div className={cc.stars} aria-label={`${stars} из 3`}>
                  {'★'.repeat(stars)}
                  <i>{'★'.repeat(3 - stars)}</i>
                </div>
                <div className={cc.resultTitle}>
                  {result.record && result.prevBest > 0 ? `Рекорд! ${result.count} смен` : result.record ? `Первый результат: ${result.count}` : `${result.count} смен`}
                </div>
                <p className={cc.resultHint}>
                  {stars === 3
                    ? 'Руки переставляются сами. Попробуйте цепочку посложнее.'
                    : stars === 2
                      ? 'Уверенно! Ещё немного — и третья звезда (50 смен в минуту).'
                      : stars === 1
                        ? 'Хорошее начало. Держите общие ноты на месте — так быстрее.'
                        : 'Не спешите: сначала ровно и чисто, скорость придёт за несколько дней.'}
                  {!result.record && result.prevBest > 0 ? ` Рекорд — ${result.prevBest}.` : ''}
                </p>
              </div>
            ) : (
              <>
                <div className={cc.now} key={target}>
                  <Spelled text={chordSymbol(chords[target])} />
                </div>
                <div className={cc.next}>
                  дальше <Spelled text={chordSymbol(nextChord)} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className={cc.loop} aria-label="Аккорды по кругу">
          {chords.map((ch, i) => (
            <span key={i} data-on={phase !== 'done' && i === target ? '' : undefined}>
              <Spelled text={chordSymbol(ch)} />
            </span>
          ))}
        </div>

        <p className={s.subtitle}>
          {phase === 'ready'
            ? 'Сыграйте первый аккорд — время пойдёт. Дальше меняйте аккорды по кругу: каждая чистая смена — очко. Аккорд засчитывается в любом обращении, без лишних нот.'
            : phase === 'run'
              ? slips > 0
                ? `Мимо: ${slips}. Не страшно — главное, не останавливаться.`
                : 'Быстро, но чисто: аккорд засчитывается, только когда звучат все его ноты.'
              : `Рекорд для «${set.title}» (${seconds === 60 ? 'минута' : '30 секунд'}): ${Math.max(best, lastRun ?? 0)}. Space — ещё раз.`}
        </p>
      </main>
    </>
  );
}
