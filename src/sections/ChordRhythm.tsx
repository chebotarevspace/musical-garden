import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Spelled } from '../components/Spelled';
import { ActionButton, Divider, Field, InlineSwitch, PlayIcon, Slider, StopIcon } from '../components/ui/Controls';
import { Picker } from '../components/ui/Picker';
import { useHotkeys } from '../hooks/useHotkeys';
import { useProgress } from '../hooks/useProgress';
import { playAccompaniment, stopAccompaniment } from '../lib/accompany';
import { audioNow, playDrum, primeAudio } from '../lib/audio';
import { chordSymbol } from '../lib/chords';
import { barHits, findDrums } from '../lib/drums';
import { inputNow } from '../lib/inputClock';
import type { Mark } from '../lib/keyStore';
import { PATTERNS, findPattern, realize } from '../lib/patterns';
import { progress as learning } from '../lib/progress';
import { MAJOR_KEYS, MINOR_KEYS, PROGRESSIONS, findKey, findProgression, progressionChords, voiceLead } from '../lib/progressions';
import { type HitResult, RHYTHM_WINDOW, fitsHit, hitComplete, patternMeter, rhythmHits, rhythmScore, timingTip } from '../lib/rhythmGrade';
import { ChordModeSwitch } from './ChordModeSwitch';
import { TheoryLink } from './TheoryLink';
import type { SectionProps } from './types';
import s from './Section.module.css';
import r from './ChordRhythm.module.css';

const PASSES = 2;
type Phase = 'idle' | 'countin' | 'play' | 'listen' | 'done';

const ROLE_LABEL: Record<string, string> = { B: 'бас', B5: '5', B8: '8', C: 'аккорд', T0: '1', T1: '3', T2: '5', T3: '7' };
const DRUMS_FOR: Record<string, string> = { waltz: 'waltz', ballad: 'ballad', broken: 'lofi', arpeggio: 'lofi', march: 'rock' };

/** «Ритм»: play an accompaniment pattern over a progression with the drums — every hit is graded. */
export function ChordRhythm({ store, settings, update, inputRef, mascot, say, setKeyboardRange }: SectionProps) {
  const prog = findProgression(settings.progressionId);
  const keyOpt = findKey(prog.minor ? settings.progMinorKey : settings.progKey, prog.minor);
  const chords = useMemo(() => progressionChords(prog, keyOpt), [prog, keyOpt]);
  const voicings = useMemo(() => voiceLead(chords), [chords]);
  const pattern = findPattern(settings.pattern);
  const meter = patternMeter(pattern);
  const hits = useMemo(() => rhythmHits(pattern, chords, PASSES), [pattern, chords]);
  const totalBeats = chords.length * PASSES * meter;
  const tempo = settings.rhythmTempo;
  const counters = useProgress().counters;
  const bestKey = `rhythm:best:${pattern.id}:${prog.id}`;

  const [phase, setPhase] = useState<Phase>('idle');
  const [beat, setBeat] = useState<number | null>(null);
  const [results, setResults] = useState<(HitResult | null)[]>([]);
  const [extra, setExtra] = useState(0);
  const [summary, setSummary] = useState<{ score: number; tip: string | null; record: boolean } | null>(null);

  const st = useRef({ phase: 'idle' as Phase, t0: 0, beatMs: 1000, results: [] as (HitResult | null)[], got: new Map<number, Set<number>>(), first: new Map<number, number>(), extra: 0, timers: [] as number[] });
  const clearTimers = () => {
    st.current.timers.forEach((t) => window.clearTimeout(t));
    st.current.timers = [];
  };
  const setPhaseBoth = (p: Phase) => {
    st.current.phase = p;
    setPhase(p);
  };

  const stopAll = useCallback(() => {
    clearTimers();
    stopAccompaniment();
    store.clearMarks(['demo']);
    setBeat(null);
    setPhaseBoth('idle');
  }, [store]);

  useEffect(() => {
    stopAll();
    setResults([]);
    setSummary(null);
  }, [hits, tempo, stopAll]);
  useEffect(() => setKeyboardRange({ from: 2, to: 5 }), [setKeyboardRange]);
  useEffect(
    () => () => {
      clearTimers();
      stopAccompaniment();
      store.clearMarks();
    },
    [store],
  );

  const finish = useCallback(() => {
    const S = st.current;
    const res = S.results.map((x) => x ?? 'miss');
    S.results = res;
    setResults(res);
    const score = rhythmScore(res);
    const offsets = [...S.first.values()];
    const prev = learning.get().counters[bestKey] ?? 0;
    const record = score > prev;
    if (record) learning.count(bestKey, score - prev);
    learning.count('rhythm:runs');
    if (score >= 80) learning.count('rhythm:good');
    learning.recordRun('progressions', `rhythm:${pattern.id}:${prog.id}`, score / 100, false);
    setSummary({ score, tip: timingTip(offsets), record: record && prev > 0 });
    setBeat(null);
    setPhaseBoth('done');
    if (score >= 90) {
      mascot.react('celebrate', 10);
      if (record && prev > 0) say(`Рекорд ритма: ${score}%!`);
    } else mascot.react('happy');
  }, [bestKey, pattern.id, prog.id, mascot, say]);

  const start = useCallback(() => {
    primeAudio();
    stopAll();
    const S = st.current;
    S.beatMs = 60000 / tempo;
    S.results = hits.map(() => null);
    S.got.clear();
    S.first.clear();
    S.extra = 0;
    setResults(S.results);
    setExtra(0);
    setSummary(null);
    const lead = meter;
    S.t0 = performance.now() + 150 + lead * S.beatMs;
    const a0 = audioNow() + 0.15;
    // Count-in clicks, then the drums (or a click on every beat).
    for (let b = 0; b < lead; b++) playDrum('rim', a0 + (b * S.beatMs) / 1000, b === 0 ? 1 : 0.6);
    const drums = findDrums(DRUMS_FOR[pattern.id] ?? 'pop');
    const startA = a0 + (lead * S.beatMs) / 1000;
    for (let bar = 0; bar < chords.length * PASSES; bar++) {
      if (settings.rhythmDrums && drums && drums.meter === meter) {
        for (const h of barHits(drums, meter)) playDrum(h.kind, startA + ((bar * meter + h.at) * S.beatMs) / 1000, h.vel * 0.8);
      } else for (let b = 0; b < meter; b++) playDrum('rim', startA + ((bar * meter + b) * S.beatMs) / 1000, b === 0 ? 0.9 : 0.5);
    }
    setPhaseBoth('countin');
    S.timers.push(window.setTimeout(() => setPhaseBoth('play'), 150 + lead * S.beatMs - 200));
    S.timers.push(window.setTimeout(() => finish(), 150 + (lead + totalBeats + RHYTHM_WINDOW + 0.1) * S.beatMs));
  }, [tempo, hits, meter, pattern.id, chords.length, settings.rhythmDrums, totalBeats, stopAll, finish]);

  const listen = useCallback(() => {
    if (st.current.phase === 'listen') return stopAll();
    stopAll();
    const S = st.current;
    S.beatMs = 60000 / tempo;
    S.t0 = performance.now() + 60;
    setPhaseBoth('listen');
    playAccompaniment(
      chords.map((chord) => ({ chord, beats: meter })),
      voicings,
      pattern,
      meter,
      tempo,
      { onNote: (m, on) => store.setMark(m, on ? { kind: 'demo' } : null) },
    );
    S.timers.push(window.setTimeout(() => stopAll(), (chords.length * meter + 0.5) * S.beatMs));
  }, [tempo, chords, voicings, pattern, meter, store, stopAll]);

  // The cursor and missed hits.
  useEffect(() => {
    if (phase !== 'countin' && phase !== 'play' && phase !== 'listen') return;
    const id = window.setInterval(() => {
      const S = st.current;
      const b = (performance.now() - S.t0) / S.beatMs;
      setBeat(b);
      if (S.phase !== 'play') return;
      let changed = false;
      hits.forEach((h, i) => {
        if (S.results[i] === null && b > h.beat + RHYTHM_WINDOW) {
          S.results[i] = (S.got.get(i)?.size ?? 0) > 0 ? 'partial' : 'miss';
          changed = true;
        }
      });
      if (changed) setResults([...S.results]);
    }, 30);
    return () => window.clearInterval(id);
  }, [phase, hits]);

  // Your notes: each one goes to the nearest open hit it fits.
  useLayoutEffect(() => {
    inputRef.current = {
      noteOn(midi) {
        const S = st.current;
        if (S.phase !== 'play' && S.phase !== 'countin') return 'ignored';
        const b = (inputNow() - S.t0) / S.beatMs;
        let best = -1;
        hits.forEach((h, i) => {
          if (S.results[i] !== null || Math.abs(b - h.beat) > RHYTHM_WINDOW || !fitsHit(h, midi)) return;
          if (best < 0 || Math.abs(b - h.beat) < Math.abs(b - hits[best].beat)) best = i;
        });
        if (best < 0) {
          S.extra += 1;
          setExtra(S.extra);
          return 'wrong';
        }
        const got = S.got.get(best) ?? new Set<number>();
        got.add(midi);
        S.got.set(best, got);
        if (!S.first.has(best)) S.first.set(best, (b - hits[best].beat) * S.beatMs);
        if (hitComplete(hits[best], got)) {
          S.results[best] = 'hit';
          setResults([...S.results]);
        }
        return 'correct';
      },
      noteOff() {},
      releaseAll() {},
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef, hits]);

  // ---- where we are ----
  const playing = phase === 'play' || phase === 'countin' || phase === 'listen';
  const posBeat = beat !== null && beat >= 0 ? beat : null;
  const slotNow = posBeat !== null ? Math.min(chords.length * PASSES - 1, Math.floor(posBeat / meter)) : 0;
  const chordIdx = slotNow % chords.length;
  const inBar = posBeat !== null ? (posBeat - slotNow * meter) / meter : null;
  const barHitsNow = hits.map((h, i) => ({ h, i })).filter(({ h }) => h.slot === (phase === 'listen' ? chordIdx : slotNow));
  const eighths = meter * 2;

  // Hints: the bass and the chord for the bar now (or the next one, a beat before it).
  const hintIdx = (chordIdx + (inBar !== null && inBar > (meter - 1) / meter ? 1 : 0)) % chords.length;
  useEffect(() => {
    const marks = new Map<number, Mark>();
    if (settings.rhythmKeys && phase !== 'listen')
      for (const e of realize(pattern, meter, chords[hintIdx], voicings[hintIdx], eighths)) for (const m of e.midis) marks.set(m, { kind: e.hand === 'L' ? 'hint' : 'next' });
    store.replaceMarks(marks, ['next', 'hint']);
  }, [settings.rhythmKeys, phase, hintIdx, pattern, meter, chords, voicings, eighths, store]);

  useHotkeys({
    Space: () => (playing ? stopAll() : start()),
    KeyP: listen,
    KeyK: () => update({ rhythmKeys: !settings.rhythmKeys }),
  });

  const keys = prog.minor ? MINOR_KEYS : MAJOR_KEYS;
  const best = counters[bestKey] ?? 0;
  const countIn = phase === 'countin' && beat !== null ? Math.max(1, Math.ceil(-beat)) : null;

  return (
    <>
      <div className={s.controls}>
        <ChordModeSwitch settings={settings} update={update} />
        <Field label="Фактура">
          <Picker
            ariaLabel="Фактура"
            value={pattern.id}
            width={170}
            onChange={(p) => update({ pattern: p })}
            items={PATTERNS.map((x) => {
              const b = counters[`rhythm:best:${x.id}:${prog.id}`];
              return { id: x.id, group: 'Ритмический рисунок', title: x.title, badge: b ? `${b}%` : undefined };
            })}
          />
        </Field>
        <Field label="Цепочка">
          <Picker
            ariaLabel="Цепочка аккордов"
            value={prog.id}
            width={200}
            onChange={(progressionId) => update({ progressionId })}
            items={PROGRESSIONS.map((x) => ({ id: x.id, group: x.group, title: x.title }))}
          />
        </Field>
        <Field label="Тональность">
          <Picker
            ariaLabel="Тональность"
            value={keyOpt.id}
            width={90}
            onChange={(id) => update(prog.minor ? { progMinorKey: id } : { progKey: id })}
            items={keys.map((k) => ({ id: k.id, group: k.minor ? 'Минор' : 'Мажор', title: k.label }))}
          />
        </Field>
        <Divider />
        <Field label="Темп" value={`${tempo} bpm`}>
          <Slider ariaLabel="Темп" width={90} min={50} max={130} step={2} value={tempo} onChange={(rhythmTempo) => update({ rhythmTempo })} />
        </Field>
        <Field label="Подсказки">
          <div className={r.switches}>
            <InlineSwitch label="Барабаны" checked={settings.rhythmDrums} onChange={(rhythmDrums) => update({ rhythmDrums })} />
            <InlineSwitch label="Клавиши" title="Бас (зелёным) и аккорд текущего такта (K)" checked={settings.rhythmKeys} onChange={(rhythmKeys) => update({ rhythmKeys })} />
          </div>
        </Field>
        <span className={s.spacer} />
        <Field label=" ">
          <div className={r.buttons}>
            <ActionButton onClick={listen} kbd="P" active={phase === 'listen'}>
              {phase === 'listen' ? <StopIcon /> : <PlayIcon />} Послушать
            </ActionButton>
            <ActionButton primary onClick={playing && phase !== 'listen' ? stopAll : start} kbd="Space">
              {playing && phase !== 'listen' ? <StopIcon /> : <PlayIcon />} {playing && phase !== 'listen' ? 'Стоп' : 'Играть'}
            </ActionButton>
          </div>
        </Field>
      </div>

      <main className={`${s.stage} ${r.stage}`}>
        <TheoryLink settings={settings} update={update} />
        <div className={s.eyebrow}>
          Ритм аккомпанемента · {pattern.title} · {meter}/4{best ? ` · рекорд ${best}%` : ''}
        </div>

        <div className={r.chart}>
          {chords.map((ch, i) => (
            <span key={i} className={r.chip} data-on={playing && i === chordIdx ? '' : undefined}>
              <Spelled text={chordSymbol(ch)} />
            </span>
          ))}
          {phase !== 'listen' && phase !== 'idle' && phase !== 'done' && <span className={r.pass}>круг {Math.floor(slotNow / chords.length) + 1} из {PASSES}</span>}
        </div>

        <div className={r.grid} style={{ '--cols': eighths } as CSSProperties} aria-label="Ритмический рисунок такта">
          <div className={r.beatsRow}>
            {Array.from({ length: eighths }, (_, k) => (
              <span key={k} data-strong={k % 2 === 0 || undefined}>
                {k % 2 === 0 ? k / 2 + 1 : 'и'}
              </span>
            ))}
          </div>
          {(['right', 'left'] as const).map((lane) => (
            <div key={lane} className={r.lane}>
              <span className={r.laneName}>{lane === 'right' ? 'правая' : 'левая'}</span>
              <div className={r.cells}>
                {barHitsNow
                  .filter(({ h }) => h[lane].length > 0)
                  .map(({ h, i }) => (
                    <span
                      key={i}
                      className={r.hit}
                      data-res={phase === 'listen' ? undefined : results[i] ?? undefined}
                      style={{ gridColumn: `${h.eighth + 1} / span 1` }}
                    >
                      {h[lane].map((x) => ROLE_LABEL[x]).join('+')}
                    </span>
                  ))}
              </div>
            </div>
          ))}
          {inBar !== null && <i className={r.playhead} style={{ left: `calc(var(--label) + (100% - var(--label)) * ${inBar})` }} aria-hidden="true" />}
        </div>

        {phase === 'done' && summary ? (
          <div className={r.summary}>
            <div className={r.score} data-good={summary.score >= 80 || undefined}>
              {summary.score}%
            </div>
            <div>
              <b>{summary.record ? 'Новый рекорд! ' : ''}{summary.score >= 90 ? 'Ровно и чисто.' : summary.score >= 70 ? 'Хорошо держите ритм.' : 'Попробуйте медленнее.'}</b>
              <p>
                {summary.tip ?? ''} {extra > 0 ? `Лишних нот: ${extra}.` : ''}
              </p>
              <div className={r.overview} aria-label="Все удары">
                {results.map((x, i) => (
                  <i key={i} data-res={x ?? 'miss'} data-bar={hits[i].eighth === 0 || undefined} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className={s.subtitle}>
            {countIn !== null
              ? `Отсчёт… ${countIn}`
              : phase === 'listen'
                ? 'Слушайте рисунок: левая рука — бас, правая — аккорд или его звуки.'
                : phase === 'play'
                  ? 'Играйте по сетке: зелёное — вовремя и всеми нотами, жёлтое — не все ноты, красное — мимо.'
                  : `${pattern.description} Сначала «Послушать», потом «Играть»: такт отсчёта и ${PASSES} круга цепочки под барабаны.`}
          </p>
        )}
      </main>
    </>
  );
}
