import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ImportMelody } from '../components/ImportMelody';
import { StaffLine } from '../components/StaffLine';
import { ActionButton, Divider, Field, PlayIcon, Slider, StopIcon } from '../components/ui/Controls';
import { Picker } from '../components/ui/Picker';
import { Segmented } from '../components/ui/Segmented';
import { useHotkeys } from '../hooks/useHotkeys';
import { useMyMelodies } from '../hooks/useMyMelodies';
import { noteStart, noteStop, playClick, primeAudio } from '../lib/audio';
import { type Phrase, allMelodies, STEPS, STEP_TITLE, type Step, phrasesOf, spanOf, staffItems } from '../lib/melodyModel';
import { melodyToSong } from '../lib/melodyLinks';
import { myMelodies } from '../lib/myMelodies';
import { mySongs } from '../lib/mySongs';
import { midiToCode } from '../lib/notes';
import { progress as learning } from '../lib/progress';
import { inputNow } from '../lib/inputClock';
import { TheoryLink } from './TheoryLink';
import { NOTE_SOURCES } from './NotesHands';
import type { SectionProps } from './types';
import s from './Section.module.css';
import ml from './MelodyLearn.module.css';

type Result = 'hit' | 'off' | 'miss';
type Sel = number | 'all';

const STEP_HINT: Record<Step, string> = {
  listen: 'Послушайте фразу и проследите глазами за нотами. Можно подыгрывать.',
  hints: 'Нужная клавиша подсвечена — играйте ноты по порядку.',
  read: 'Только ноты на стане: найдите каждую сами.',
  memory: 'Ноты спрятаны — сыграйте по памяти. Первая нота подсвечена.',
  rhythm: 'Метроном отсчитает такт — играйте в ритме, как написано.',
};


/** «Песня»: learn a melody phrase by phrase — listen, with hints, from the staff, by heart, in rhythm. */
export function MelodyLearn({ store, settings, update, inputRef, mascot, say, setKeyboardRange }: SectionProps) {
  const mine = useMyMelodies();
  const list = useMemo(() => allMelodies(mine), [mine]);
  const melody = list.find((m) => m.id === settings.melodyId) ?? list[0];
  const phrases = useMemo(() => phrasesOf(melody), [melody]);
  const step = settings.melodyStep;
  const stars = (i: number) => melody.stars[i] ?? 0;
  const [sel, setSel] = useState<Sel>(() => Math.max(0, phrases.findIndex((_, i) => stars(i) < 4)));
  const range: Phrase = sel === 'all' ? { from: 0, to: melody.notes.length } : phrases[Math.min(sel, phrases.length - 1)];
  const [pos, setPos] = useState(range.from);
  const [wrongAt, setWrongAt] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [results, setResults] = useState<Record<number, Result>>({});
  const [state, setState] = useState<'idle' | 'demo' | 'countin' | 'running' | 'done'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const timers = useRef<number[]>([]);
  const clock = useRef({ t0: 0, beatMs: 600 });
  const ref = useRef({ pos, range, step, state, mistakes, melody, sel });
  ref.current = { pos, range, step, state, mistakes, melody, sel };

  const beatMs = 60000 / (melody.tempo * (settings.melodyTempoPct / 100));
  const lowest = Math.min(...melody.notes.map((n) => n.midi));
  const highest = Math.max(...melody.notes.map((n) => n.midi));
  const clef = lowest < 55 && highest < 64 ? 'bass' : lowest < 55 ? 'grand' : 'treble';

  useEffect(() => {
    setKeyboardRange({ from: Math.max(1, Math.floor(lowest / 12) - 1), to: Math.min(7, Math.floor(highest / 12) - 1) });
  }, [lowest, highest, setKeyboardRange]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const markNext = useCallback(
    (p: number, st: Step) => {
      store.clearMarks(['hint', 'next']);
      const { range: r, melody: m } = ref.current;
      if (p >= r.to) return;
      const n = m.notes[p];
      if (st === 'hints') store.setMark(n.midi, { kind: 'next', label: midiToCode(n.midi).replace(/\d/, '') });
      if (st === 'memory' && p === r.from) store.setMark(n.midi, { kind: 'hint', label: 'старт' });
    },
    [store],
  );

  const reset = useCallback(() => {
    clearTimers();
    for (let k = 21; k <= 108; k++) noteStop(k, 0.08);
    store.clearMarks();
    setPos(ref.current.range.from);
    ref.current.pos = ref.current.range.from;
    setWrongAt(null);
    setMistakes(0);
    setResults({});
    setState('idle');
    setMessage(null);
    markNext(ref.current.range.from, ref.current.step);
  }, [store, markNext]);

  // New melody / phrase / step → start over.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [melody.id, sel, step]);
  useEffect(() => () => {
    clearTimers();
    store.clearMarks();
  }, [store]);

  /** Save the best step reached for this phrase (examples are copied into «my melodies» on first progress). */
  const award = useCallback(
    (level: number) => {
      const { melody: m, sel: sl } = ref.current;
      if (sl === 'all') return;
      if ((m.stars[sl] ?? 0) >= level) return;
      const next = [...m.stars];
      next[sl] = level;
      myMelodies.save({ ...m, stars: next });
      learning.count('melody:phrase');
    },
    [],
  );

  const finish = useCallback(
    (res: Record<number, Result>) => {
      const { step: st, mistakes: miss, range: r, melody: m, sel: sl } = ref.current;
      const len = r.to - r.from;
      const allowed = Math.max(1, Math.round(len * 0.15));
      setState('done');
      store.clearMarks(['hint', 'next']);
      if (st === 'hints') {
        award(2);
        setMessage('Отлично! Теперь попробуйте «По нотам» — без подсветки.');
        mascot.react('happy');
        return;
      }
      if (st === 'read' || st === 'memory') {
        if (miss <= allowed) {
          award(st === 'read' ? 3 : 4);
          setMessage(st === 'read' ? 'Прочитано! Следующий шаг — по памяти.' : 'По памяти — браво! Осталось сыграть в ритме.');
          mascot.react('celebrate', 0);
        } else {
          setMessage(`Ошибок: ${miss}. Ещё разок — пробел.`);
          mascot.react('thinking');
        }
        return;
      }
      // rhythm
      const hits = Object.values(res).filter((x) => x === 'hit').length;
      const share = hits / len;
      if (share >= 0.7 && miss <= allowed) {
        award(5);
        if (sl === 'all' && !m.learned) {
          myMelodies.save({ ...(myMelodies.get().find((x) => x.id === m.id) ?? m), learned: true });
          learning.plantLearnedMelody();
          say(`«${m.title}» выучена! В саду распустился ландыш.`);
        } else setMessage(`В ритме: ${Math.round(share * 100)}% нот точно в долю. Отлично!`);
        mascot.react('celebrate', 0);
      } else {
        setMessage(`В долю ${Math.round(share * 100)}% нот${miss ? `, мимо нот: ${miss}` : ''}. Попробуйте медленнее — ползунок «Темп».`);
        mascot.react('thinking');
      }
    },
    [award, mascot, say, store],
  );

  // ---- listening ----
  const listen = useCallback(() => {
    primeAudio();
    reset();
    const { range: r, melody: m } = ref.current;
    const start = m.notes[r.from].beat;
    setState('demo');
    for (let i = r.from; i < r.to; i++) {
      const n = m.notes[i];
      const at = (n.beat - start) * beatMs;
      timers.current.push(
        window.setTimeout(() => {
          noteStart(n.midi, 82);
          store.setMark(n.midi, { kind: 'demo' });
          setPos(i);
        }, at),
      );
      timers.current.push(
        window.setTimeout(() => {
          noteStop(n.midi, 0.12);
          store.setMark(n.midi, null);
        }, at + n.dur * beatMs * 0.92),
      );
    }
    const end = (m.notes[r.to - 1].beat + m.notes[r.to - 1].dur - start) * beatMs;
    timers.current.push(
      window.setTimeout(() => {
        setPos(r.from);
        setState('idle');
        if (ref.current.step === 'listen') {
          award(1);
          setMessage('Послушали? Переходите к шагу «С подсказками».');
        }
        markNext(r.from, ref.current.step);
      }, end + 200),
    );
  }, [beatMs, reset, store, award, markNext]);

  // ---- rhythm: count-in, clicks, and misses when time passes ----
  const startRhythm = useCallback(() => {
    primeAudio();
    reset();
    const { range: r, melody: m } = ref.current;
    const { start, end } = spanOf(m.notes, r);
    const countIn = m.meter;
    const now = performance.now();
    clock.current = { t0: now + countIn * beatMs, beatMs };
    setState('countin');
    const beats = countIn + Math.ceil(end - start) + 1;
    for (let b = 0; b < beats; b++) {
      timers.current.push(window.setTimeout(() => playClick(b % m.meter === 0), b * beatMs));
    }
    timers.current.push(window.setTimeout(() => setState((st) => (st === 'countin' ? 'running' : st)), countIn * beatMs));
    const window_ = Math.max(140, beatMs * 0.3);
    const tick = () => {
      const { pos: p, range: rr, melody: mm, state: st } = ref.current;
      if (st !== 'running' && st !== 'countin') return;
      const t = performance.now();
      let q = p;
      const add: Record<number, Result> = {};
      while (q < rr.to && t > clock.current.t0 + (mm.notes[q].beat - start) * beatMs + window_) {
        add[q] = 'miss';
        q++;
      }
      if (q !== p) {
        setResults((old) => {
          const res = { ...old, ...add };
          if (q >= rr.to) window.setTimeout(() => finish(res), 0);
          return res;
        });
        setPos(q);
        ref.current.pos = q;
      }
      if (q < rr.to) timers.current.push(window.setTimeout(tick, 40));
    };
    timers.current.push(window.setTimeout(tick, countIn * beatMs));
  }, [beatMs, reset, finish]);

  // ---- playing ----
  useLayoutEffect(() => {
    inputRef.current = {
      noteOn(midi) {
        const { pos: p, range: r, step: st, state: state_, melody: m } = ref.current;
        if (st === 'listen') return 'ignored';
        if (state_ === 'done' || state_ === 'demo' || p >= r.to) return 'ignored';
        if (st === 'rhythm' && state_ !== 'running' && state_ !== 'countin') return 'ignored';
        const target = m.notes[p];
        const ok = midi === target.midi;
        learning.recordItem(`note:tune:${target.midi}`, ok);
        if (!ok) {
          setWrongAt(p);
          setMistakes((x) => x + 1);
          ref.current.mistakes += 1;
          mascot.react('oops');
          return 'wrong';
        }
        setWrongAt(null);
        const np = p + 1;
        setPos(np);
        ref.current.pos = np;
        if (st === 'rhythm') {
          const start = m.notes[r.from].beat;
          const dev = inputNow() - (clock.current.t0 + (target.beat - start) * clock.current.beatMs);
          const grade: Result = Math.abs(dev) <= Math.max(140, clock.current.beatMs * 0.3) ? 'hit' : 'off';
          setResults((old) => {
            const res = { ...old, [p]: grade };
            if (np >= r.to) window.setTimeout(() => finish(res), 0);
            return res;
          });
        } else {
          markNext(np, st);
          if (np >= r.to) finish({});
        }
        return 'correct';
      },
      noteOff() {},
      releaseAll() {},
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef, mascot, markNext, finish]);

  const go = () => (step === 'listen' ? listen() : step === 'rhythm' ? startRhythm() : reset());
  useHotkeys({
    KeyP: listen,
    Space: go,
    ArrowRight: () => typeof sel === 'number' && sel < phrases.length - 1 && setSel(sel + 1),
    ArrowLeft: () => typeof sel === 'number' && sel > 0 && setSel(sel - 1),
  });

  // ---- staff ----
  const items = staffItems(melody.notes, melody.meter, range.from, range.to);
  const shown = step === 'memory' && state !== 'done' ? items.filter((it) => it.index >= 0 && it.index < pos) : items;
  const lineNotes = shown.map((it) => ({
    code: it.code,
    dur: it.dur,
    rest: it.rest,
    barBefore: it.barBefore,
    state:
      it.index < 0
        ? undefined
        : results[it.index] === 'miss' || results[it.index] === 'off'
          ? ('wrong' as const)
          : it.index < pos && step !== 'listen'
            ? ('done' as const)
            : it.index === wrongAt
              ? ('wrong' as const)
              : it.index === pos && state !== 'done'
                ? ('current' as const)
                : undefined,
  }));

  const learnedPhrases = phrases.filter((_, i) => stars(i) >= 4).length;

  const toSongs = (part: 'melody' | 'lead' = 'melody') => {
    const song = melodyToSong(melody);
    mySongs.save(song);
    update({ section: 'songs', songId: song.id, songPart: part, lastTrainer: 'notes' });
  };

  return (
    <>
      <div className={s.controls}>
        <Field label="Задание">
          <Segmented
            ariaLabel="Задание"
            value={settings.noteSource}
            onChange={(noteSource) => update({ noteSource })}
            options={NOTE_SOURCES}
          />
        </Field>
        <Field label="Мелодия">
          <div className={ml.pick}>
            <Picker
              ariaLabel="Мелодия"
              value={melody.id}
              width={230}
              onChange={(melodyId) => {
                update({ melodyId });
                setSel(0);
              }}
              items={list.map((m) => ({
                id: m.id,
                group: m.source === 'example' ? 'Примеры' : 'Мои мелодии',
                title: m.title,
                done: m.learned,
                badge: m.learned ? '✓' : undefined,
              }))}
            />
            <button type="button" className={ml.add} onClick={() => setImportOpen(true)} title="Загрузить MIDI-файл или ввести ноты">
              ＋ Загрузить
            </button>
          </div>
        </Field>
        <Field label="Шаг">
          <Segmented<Step> ariaLabel="Шаг" value={step} onChange={(melodyStep) => update({ melodyStep })} options={STEPS.map((x) => ({ value: x, label: STEP_TITLE[x] }))} />
        </Field>
        <Field label="Темп" value={`${settings.melodyTempoPct}%`}>
          <Slider value={settings.melodyTempoPct} min={40} max={120} step={5} onChange={(melodyTempoPct) => update({ melodyTempoPct })} ariaLabel="Темп" width={110} />
        </Field>
        <Divider />
        <span className={s.spacer} />
        <Field label=" ">
          <div className={ml.buttons}>
            <ActionButton onClick={state === 'demo' ? reset : listen} kbd="P">
              {state === 'demo' ? <StopIcon /> : <PlayIcon />} Послушать
            </ActionButton>
            <ActionButton primary onClick={go} kbd="Space">
              {step === 'rhythm' ? 'Старт' : 'Заново'}
            </ActionButton>
          </div>
        </Field>
      </div>

      <main className={`${s.stage} ${ml.stage}`}>
        <TheoryLink settings={settings} update={update} />
        <div className={s.eyebrow}>
          {melody.title} · {melody.meter}/4 · {melody.tempo} bpm · выучено фраз {learnedPhrases} из {phrases.length}
        </div>

        <div className={ml.phrases} role="tablist" aria-label="Фразы">
          {phrases.map((_, i) => (
            <button key={i} type="button" role="tab" aria-selected={sel === i} className={ml.chip} onClick={() => setSel(i)}>
              <span>Фраза {i + 1}</span>
              <span className={ml.stars} aria-label={`${stars(i)} из 5`}>
                {[1, 2, 3, 4, 5].map((k) => (
                  <i key={k} data-on={stars(i) >= k || undefined} />
                ))}
              </span>
            </button>
          ))}
          <button type="button" role="tab" aria-selected={sel === 'all'} className={ml.chip} data-all onClick={() => setSel('all')}>
            {melody.learned ? '✓ Вся мелодия' : 'Вся мелодия'}
          </button>
        </div>

        <div className={ml.staff}>
          {lineNotes.length ? (
            <StaffLine notes={lineNotes} clef={clef} noteWidth={sel === 'all' ? 38 : 44} />
          ) : (
            <div className={ml.hidden}>♪ × {range.to - range.from} — играйте по памяти</div>
          )}
        </div>

        <p className={ml.feedback} data-state={state === 'done' ? 'done' : wrongAt !== null ? 'wrong' : undefined}>
          {state === 'countin' ? 'Раз, два, три…' : message ?? STEP_HINT[step]}
        </p>

        <div className={ml.footer}>
          <button type="button" className={ml.link} onClick={() => toSongs()} title="Добавить в «Мои песни» с подобранными аккордами и играть с аккомпанементом">
            🎹 Сыграть с аккомпанементом
          </button>
          <button type="button" className={ml.link} onClick={() => toSongs('lead')} title="Ведущий лист: мелодия правой рукой, подобранные аккорды — левой">
            🙌 Обе руки
          </button>
          {melody.source !== 'example' && (
            <button
              type="button"
              className={ml.link}
              data-danger
              onClick={() => {
                if (window.confirm(`Удалить мелодию «${melody.title}»?`)) {
                  myMelodies.remove(melody.id);
                  update({ melodyId: 'ex-ode' });
                }
              }}
            >
              Удалить
            </button>
          )}
        </div>
      </main>

      {importOpen && (
        <ImportMelody
          onClose={() => setImportOpen(false)}
          onSaved={(m) => {
            setImportOpen(false);
            update({ melodyId: m.id, melodyStep: 'listen' });
            setSel(0);
            say(`«${m.title}»: фраз — ${phrasesOf(m).length}. Начнём с первой!`);
          }}
        />
      )}
    </>
  );
}
