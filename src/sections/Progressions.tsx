import { useCallback, useEffect, useMemo, useState } from 'react';
import { Spelled } from '../components/Spelled';
import { ActionButton, Divider, Field, InlineSwitch, PlayIcon, Slider, StopIcon } from '../components/ui/Controls';
import { Picker } from '../components/ui/Picker';
import { Segmented } from '../components/ui/Segmented';
import { useHotkeys } from '../hooks/useHotkeys';
import { playAccompaniment, stopAccompaniment } from '../lib/accompany';
import { chordSymbol } from '../lib/chords';
import { findPattern } from '../lib/patterns';
import { MAJOR_KEYS, MINOR_KEYS, PROGRESSIONS, findKey, findProgression, progressionChords, voiceLead } from '../lib/progressions';
import { ChordModeSwitch } from './ChordModeSwitch';
import { BeatDots, KeyCircleButton, PatternField } from './PlayAlongBits';
import { progress as learning } from '../lib/progress';
import { TheoryLink } from './TheoryLink';
import type { SectionProps } from './types';
import { usePlayAlong } from './usePlayAlong';
import s from './Section.module.css';
import p from './Progressions.module.css';

/** Play chord progressions in any key — at your own pace or one chord per bar with a metronome. */
export function Progressions({ store, settings, update, inputRef, mascot, setKeyboardRange }: SectionProps) {
  const prog = findProgression(settings.progressionId);
  const keyOpt = findKey(prog.minor ? settings.progMinorKey : settings.progKey, prog.minor);
  const chords = useMemo(() => progressionChords(prog, keyOpt), [prog, keyOpt]);
  const slots = useMemo(() => chords.map((chord) => ({ chord, beats: 4 })), [chords]);
  const voicings = useMemo(() => voiceLead(chords), [chords]);
  const pattern = findPattern(settings.pattern);
  const tempoMode = settings.progPlay === 'tempo';
  const [listening, setListening] = useState<number | null>(null);

  const play = usePlayAlong({
    slots,
    voicings,
    meter: 4,
    mode: tempoMode ? 'tempo' : 'wait',
    tempo: settings.progTempo,
    bass: settings.progBass,
    showKeys: settings.progShowKeys,
    loop: true,
    paused: listening !== null,
    store,
    inputRef,
    mascot,
    passLabel: (n) => `Круг ${n}`,
    onPass: (hits, total) => learning.recordRun('progressions', `${prog.id}:${keyOpt.id}`, hits / total, false),
  });
  const { index, results, pass, running, countIn, beat, summary, start, stop, reset } = play;

  useEffect(() => setKeyboardRange({ from: 2, to: 5 }), [setKeyboardRange]);

  const stopListening = useCallback(() => {
    stopAccompaniment();
    setListening(null);
    store.clearMarks(['demo']);
  }, [store]);

  // New exercise → start over.
  useEffect(() => {
    reset();
    stopListening();
  }, [slots, settings.progPlay, reset, stopListening]);
  useEffect(() => stopListening, [stopListening]);

  const listen = useCallback(() => {
    if (listening !== null) return stopListening();
    stop();
    playAccompaniment(slots, voicings, pattern, 4, Math.min(settings.progTempo, 100), {
      onSlot: (i) => setListening(i),
      onNote: (m, on) => store.setMark(m, on ? { kind: 'demo' } : null),
    });
  }, [listening, stopListening, stop, slots, voicings, pattern, settings.progTempo, store]);

  useHotkeys({
    Space: () => (tempoMode ? (running ? stop() : start()) : reset()),
    KeyP: listen,
    KeyK: () => update({ progShowKeys: !settings.progShowKeys }),
  });

  const keys = prog.minor ? MINOR_KEYS : MAJOR_KEYS;
  const hits = results.filter((x) => x === 'hit').length;
  const n = chords.length;

  return (
    <>
      <div className={s.controls}>
        <ChordModeSwitch settings={settings} update={update} />
        <Field label="Последовательность">
          <Picker
            ariaLabel="Последовательность"
            value={prog.id}
            width={250}
            onChange={(progressionId) => update({ progressionId })}
            items={PROGRESSIONS.map((x) => ({ id: x.id, group: x.group, title: x.title }))}
          />
        </Field>
        <Field label="Тональность">
          <Picker
            ariaLabel="Тональность"
            value={keyOpt.id}
            width={120}
            onChange={(id) => update(prog.minor ? { progMinorKey: id } : { progKey: id })}
            items={keys.map((k) => ({ id: k.id, group: k.minor ? 'Минор' : 'Мажор', title: k.label }))}
          />
          <KeyCircleButton value={keyOpt.id} minor={prog.minor} onChange={(id) => update(prog.minor ? { progMinorKey: id } : { progKey: id })} />
        </Field>
        <PatternField settings={settings} update={update} />
        <Divider />
        <Field label="Игра">
          <Segmented<'free' | 'tempo'>
            ariaLabel="Как играть"
            value={settings.progPlay}
            onChange={(progPlay) => update({ progPlay })}
            options={[
              { value: 'free', label: 'Ждать меня' },
              { value: 'tempo', label: 'Под метроном' },
            ]}
          />
        </Field>
        {tempoMode && (
          <Field label="Темп" value={`${settings.progTempo} bpm`}>
            <Slider ariaLabel="Темп" width={110} min={40} max={140} step={2} value={settings.progTempo} onChange={(progTempo) => update({ progTempo })} />
          </Field>
        )}
        <Field label="Подсказки">
          <div className={p.switches}>
            <InlineSwitch label="Клавиши" title="Удобное обращение на клавиатуре (K)" checked={settings.progShowKeys} onChange={(progShowKeys) => update({ progShowKeys })} />
            <InlineSwitch label="Бас" title="Приложение играет бас (основной тон) за вас" checked={settings.progBass} onChange={(progBass) => update({ progBass })} />
          </div>
        </Field>
        <span className={s.spacer} />
        <Field label=" ">
          <div className={p.buttons}>
            <ActionButton onClick={listen} kbd="P" active={listening !== null}>
              {listening !== null ? <StopIcon /> : <PlayIcon />} Послушать
            </ActionButton>
            {tempoMode ? (
              <ActionButton primary onClick={running ? stop : start} kbd="Space">
                {running ? <StopIcon /> : <PlayIcon />}
                {running ? 'Стоп' : 'Старт'}
              </ActionButton>
            ) : (
              <ActionButton primary onClick={reset} kbd="Space">
                Заново
              </ActionButton>
            )}
          </div>
        </Field>
      </div>

      <main className={s.stage}>
        <TheoryLink settings={settings} update={update} />
        <div className={s.eyebrow}>
          {prog.group} · тональность <Spelled text={keyOpt.label} /> · фактура «{pattern.title.toLowerCase()}»
        </div>
        <h1 className={p.title}>{prog.title}</h1>
        <p className={p.description}>{prog.description}</p>

        <ol className={p.cards} data-many={n > 8 || undefined}>
          {chords.map((c, i) => {
            const state = listening !== null ? (i === listening ? 'current' : 'todo') : results[i] ?? (i === index ? 'current' : 'todo');
            return (
              <li key={i} className={p.card} data-state={state}>
                <span className={p.numeral}>{prog.chords[i].numeral}</span>
                <Spelled text={chordSymbol(c)} className={p.symbol} />
                {state === 'hit' && <span className={p.mark}>✓</span>}
                {state === 'miss' && <span className={p.mark}>✗</span>}
                {state === 'current' && tempoMode && running && countIn === 0 && beat >= 0 && listening === null && (
                  <span className={p.bar}>
                    <span style={{ transform: `scaleX(${(beat + 1) / 4})` }} />
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {tempoMode && running && <BeatDots meter={4} countIn={countIn} beat={beat} />}

        <p className={s.subtitle}>
          {listening !== null ? (
            `Слушайте фактуру «${pattern.title}»: ${pattern.description}`
          ) : summary && (!running || !tempoMode) ? (
            <span className={p.summary}>{summary}</span>
          ) : tempoMode ? (
            running ? (
              countIn > 0 ? 'Приготовьтесь: отсчёт…' : `Круг ${pass}${results.length ? ` · вовремя ${hits} из ${results.length}` : ''}${summary ? ` · прошлый ${summary.toLowerCase()}` : ''}`
            ) : (
              'Нажмите «Старт»: отсчёт, затем по одному аккорду на такт. Аккорд засчитывается, если за такт прозвучали все его звуки — вместе или по очереди.'
            )
          ) : (
            <>
              Сыграйте <Spelled text={chordSymbol(chords[index])} /> — целиком или по звукам, в любой октаве. Следующий аккорд появится сам.
              {settings.progShowKeys ? ' Синим подсвечено удобное обращение.' : ''}
            </>
          )}
        </p>
      </main>
    </>
  );
}
