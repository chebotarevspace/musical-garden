import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StaffLine } from '../components/StaffLine';
import { ActionButton, Divider, Field, InlineSwitch, PlayIcon, Slider, StopIcon } from '../components/ui/Controls';
import { useHotkeys } from '../hooks/useHotkeys';
import { noteStart, noteStop, playClick, primeAudio } from '../lib/audio';
import { mySongs } from '../lib/mySongs';
import { midiToCode } from '../lib/notes';
import { progress as learning } from '../lib/progress';
import { inputNow } from '../lib/inputClock';
import { type Take, type TakeNote, analyse, deviation, harmonize, loadTakes, quantize, saveTakes, takeToSong, timingOf } from '../lib/studio';
import { takeToMelody } from '../lib/melodyLinks';
import { myMelodies } from '../lib/myMelodies';
import { TheoryLink } from './TheoryLink';
import type { SectionProps } from './types';
import s from './Section.module.css';
import st from './StudioSection.module.css';

const MAX_MS = 120_000;
const COUNT_IN = 4;

const fmtTime = (ms: number) => {
  const sec = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};
const fmtDate = (t: number) => new Date(t).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Piano roll of a take: time → right, pitch → up; colours show timing against the beat. */
function Roll({ take, playhead }: { take: Take; playhead: number | null }) {
  const W = 1000;
  const H = 200;
  const end = Math.max(...take.notes.map((n) => n.off), 1000);
  const lo = Math.min(...take.notes.map((n) => n.midi)) - 2;
  const hi = Math.max(...take.notes.map((n) => n.midi)) + 2;
  const rowH = H / (hi - lo + 1);
  const x = (ms: number) => (ms / end) * W;
  const beat = 60000 / take.tempo;
  return (
    <svg className={st.roll} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Запись по времени">
      {take.click &&
        Array.from({ length: Math.floor(end / beat) + 1 }, (_, i) => (
          <line key={i} x1={x(i * beat)} x2={x(i * beat)} y1={0} y2={H} className={i % 4 === 0 ? st.barLine : st.beatLine} />
        ))}
      {take.notes.map((n, i) => {
        const t = take.click ? timingOf(deviation(n.on, take.tempo)) : 'free';
        return (
          <rect
            key={i}
            x={x(n.on)}
            y={(hi - n.midi) * rowH + 1}
            width={Math.max(4, x(n.off) - x(n.on))}
            height={Math.max(3, rowH - 2)}
            rx={2}
            className={st.note}
            data-timing={t}
          >
            <title>
              {midiToCode(n.midi)}
              {take.click ? ` · ${Math.round(deviation(n.on, take.tempo))} мс` : ''}
            </title>
          </rect>
        );
      })}
      {playhead !== null && <line x1={x(playhead)} x2={x(playhead)} y1={0} y2={H} className={st.playhead} />}
    </svg>
  );
}

/** «Студия»: record yourself, see the rhythm, compare takes, turn a melody into a song. */
export function StudioSection({ settings, update, inputRef, store, mascot, say, setKeyboardRange }: SectionProps) {
  const [takes, setTakes] = useState<Take[]>(loadTakes);
  const [current, setCurrent] = useState<Take | null>(() => takes[0] ?? null);
  const [rec, setRec] = useState<{ startAt: number; countIn: number } | null>(null);
  const [now, setNow] = useState(0);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [compose, setCompose] = useState(false);
  const [title, setTitle] = useState('Моя мелодия');
  const recRef = useRef<{ t0: number | null; notes: TakeNote[]; open: Map<number, TakeNote>; tempo: number; click: boolean } | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => setKeyboardRange({ from: 3, to: 5 }), [setKeyboardRange]);
  useEffect(() => saveTakes(takes), [takes]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // ---- recording ----
  const stopRec = useCallback(() => {
    const r = recRef.current;
    clearTimers();
    setRec(null);
    recRef.current = null;
    if (!r || r.t0 === null) return;
    const end = performance.now() - r.t0;
    r.open.forEach((n) => (n.off = end));
    const notes = r.notes.filter((n) => n.on >= -200).map((n) => ({ ...n, on: Math.max(0, n.on), off: Math.max(n.off, n.on + 60) }));
    if (!notes.length) return;
    const take: Take = { id: `t${Date.now().toString(36)}`, at: Date.now(), tempo: r.tempo, click: r.click, notes };
    setTakes((list) => [take, ...list]);
    setCurrent(take);
    setCompose(false);
    learning.count('studio:take');
    const a = analyse(take);
    if (take.click && a.onTime >= 0.85) mascot.react('celebrate', 0);
    else mascot.react('happy');
  }, [mascot]);

  const startRec = useCallback(() => {
    primeAudio();
    stopPlay();
    clearTimers();
    const tempo = settings.studioTempo;
    const click = settings.studioClick;
    const beat = 60000 / tempo;
    const startAt = performance.now();
    recRef.current = { t0: click ? startAt + COUNT_IN * beat : null, notes: [], open: new Map(), tempo, click };
    setRec({ startAt, countIn: click ? COUNT_IN : 0 });
    if (click) {
      const beats = Math.ceil(MAX_MS / beat) + COUNT_IN;
      for (let b = 0; b < beats; b++) {
        timers.current.push(
          window.setTimeout(() => {
            playClick(b % 4 === 0);
            if (b < COUNT_IN) setRec((r) => (r ? { ...r, countIn: COUNT_IN - b - 1 } : r));
          }, b * beat),
        );
      }
    }
    timers.current.push(window.setTimeout(() => stopRec(), MAX_MS + (click ? COUNT_IN * beat : 0)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.studioTempo, settings.studioClick, stopRec]);

  // Recording clock.
  useEffect(() => {
    if (!rec) return;
    const id = window.setInterval(() => setNow(performance.now()), 200);
    return () => window.clearInterval(id);
  }, [rec]);

  // ---- playback ----
  const stopPlay = useCallback(() => {
    clearTimers();
    setPlayhead(null);
    store.clearMarks(['demo']);
    for (let m = 21; m <= 108; m++) noteStop(m, 0.1);
  }, [store]);

  const play = useCallback(
    (take: Take) => {
      primeAudio();
      stopPlay();
      const t0 = performance.now();
      for (const n of take.notes) {
        timers.current.push(
          window.setTimeout(() => {
            noteStart(n.midi, 80);
            store.setMark(n.midi, { kind: 'demo' });
          }, n.on),
        );
        timers.current.push(
          window.setTimeout(() => {
            noteStop(n.midi, 0.15);
            store.setMark(n.midi, null);
          }, n.off),
        );
      }
      const end = Math.max(...take.notes.map((n) => n.off));
      const tick = () => {
        const p = performance.now() - t0;
        if (p > end + 200) return setPlayhead(null);
        setPlayhead(p);
        timers.current.push(window.setTimeout(tick, 50));
      };
      tick();
    },
    [store, stopPlay],
  );

  useEffect(
    () => () => {
      clearTimers();
      store.clearMarks();
    },
    [store],
  );

  // ---- input: everything is recorded, nothing is judged ----
  useLayoutEffect(() => {
    inputRef.current = {
      noteOn(midi) {
        const r = recRef.current;
        if (!r) return 'ignored';
        const t = inputNow();
        if (r.t0 === null) r.t0 = t; // free recording starts with the first note
        const n: TakeNote = { midi, on: t - r.t0, off: t - r.t0 };
        r.notes.push(n);
        r.open.set(midi, n);
        return 'ignored';
      },
      noteOff(midi) {
        const r = recRef.current;
        if (!r || r.t0 === null) return;
        const n = r.open.get(midi);
        if (n) {
          n.off = performance.now() - r.t0;
          r.open.delete(midi);
        }
      },
      releaseAll() {},
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef]);

  useHotkeys({
    KeyR: () => (recRef.current ? stopRec() : startRec()),
    Space: () => (recRef.current ? stopRec() : playhead !== null ? stopPlay() : current && play(current)),
    KeyP: () => current && (playhead !== null ? stopPlay() : play(current)),
  });

  const analysis = current ? analyse(current) : null;
  const bars = useMemo(() => (current && compose ? quantize(current) : []), [current, compose]);
  const harmony = useMemo(() => (bars.length ? harmonize(bars) : null), [bars]);

  const saveSong = () => {
    if (!current) return;
    const song = takeToSong(title.trim() || 'Моя мелодия', current);
    if (!song) return;
    mySongs.save(song);
    learning.plantComposition();
    setCompose(false);
    say('Мелодия в «Моих песнях», а в саду вырос ирис!');
    mascot.react('celebrate', 0);
  };

  const recElapsed = rec && recRef.current?.t0 ? now - recRef.current.t0 : 0;
  const best = takes.length ? Math.max(...takes.filter((t) => t.click).map((t) => analyse(t).onTime), 0) : 0;

  return (
    <>
      <div className={s.controls}>
        <Field label="Метроном">
          <InlineSwitch label="Щелчки" checked={settings.studioClick} onChange={(studioClick) => update({ studioClick })} />
        </Field>
        <Field label="Темп" value={`${settings.studioTempo} bpm`}>
          <Slider value={settings.studioTempo} min={50} max={140} step={2} onChange={(studioTempo) => update({ studioTempo })} ariaLabel="Темп" width={130} />
        </Field>
        <Divider />
        <span className={s.spacer} />
        <Field label=" ">
          <div className={st.buttons}>
            <ActionButton onClick={() => current && (playhead !== null ? stopPlay() : play(current))} kbd="P">
              {playhead !== null ? <StopIcon /> : <PlayIcon />} Прослушать
            </ActionButton>
            <ActionButton primary onClick={rec ? stopRec : startRec} kbd="R">
              {rec ? (
                <>
                  <StopIcon /> Стоп
                </>
              ) : (
                <>
                  <span className={st.recDot} /> Запись
                </>
              )}
            </ActionButton>
          </div>
        </Field>
      </div>

      <main className={`${s.stage} ${st.stage}`}>
        <TheoryLink settings={settings} update={update} />
        <div className={s.eyebrow}>Студия · запишите себя и послушайте со стороны</div>

        {rec ? (
          <div className={st.recording}>
            <span className={st.bigDot} />
            {rec.countIn > 0 ? <b>Вступление: {rec.countIn}…</b> : <b>Идёт запись · {fmtTime(recElapsed)}</b>}
            <span>{settings.studioClick ? 'Играйте вместе со щелчками метронома' : 'Запись начнётся с первой ноты'}. R — стоп.</span>
          </div>
        ) : current ? (
          <div className={st.panel}>
            <Roll take={current} playhead={playhead} />
            <div className={st.row}>
              {current.click && analysis ? (
                <>
                  <div className={st.stat}>
                    <b>{Math.round(analysis.onTime * 100)}%</b>
                    <span>нот точно в долю</span>
                  </div>
                  <div className={st.stat}>
                    <b>{Math.round(analysis.meanAbs)} мс</b>
                    <span>среднее отклонение</span>
                  </div>
                  <div className={st.stat}>
                    <b>{analysis.meanSigned < -25 ? 'спешите' : analysis.meanSigned > 25 ? 'отстаёте' : 'ровно'}</b>
                    <span>{analysis.count} нот</span>
                  </div>
                  <p className={st.verdict}>{analysis.verdict}</p>
                </>
              ) : (
                <p className={st.verdict}>Свободная запись без метронома: ритм не оценивается. Включите щелчки, чтобы увидеть, где вы спешите или отстаёте.</p>
              )}
              <span className={s.spacer} />
              <button
                type="button"
                className={st.compose}
                title="Сохранить запись как мелодию и разучить её по фразам в «Нотах → Песня»"
                onClick={() => {
                  const m = { ...takeToMelody(current, `Запись ${fmtDate(current.at)}`), id: `mel-${Date.now().toString(36)}`, stars: [], createdAt: Date.now() };
                  if (m.notes.length < 3) return say('Слишком мало нот для мелодии.');
                  myMelodies.save(m);
                  update({ section: 'notes', noteSource: 'tune', melodyId: m.id, melodyStep: 'listen', lastTrainer: 'notes' });
                }}
              >
                🎼 Учить как мелодию
              </button>
              {current.click && (
                <button type="button" className={st.compose} onClick={() => setCompose((c) => !c)}>
                  ✨ {compose ? 'Скрыть ноты' : 'Превратить в ноты'}
                </button>
              )}
            </div>
            {compose && bars.length > 0 && harmony && (
              <div className={st.composeBox}>
                <div className={st.staff}>
                  <StaffLine notes={bars.flat().slice(0, 32).map((m) => ({ code: midiToCode(m) }))} clef={Math.min(...bars.flat()) < 55 ? 'grand' : 'treble'} noteWidth={34} />
                </div>
                <div className={st.chordRow}>
                  Тональность {harmony.keyId} · аккорды по тактам: {harmony.chords.join(' | ')}
                </div>
                <div className={st.saveRow}>
                  <input className={st.title} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Название" maxLength={60} />
                  <button type="button" className={st.save} onClick={saveSong}>
                    Сохранить в «Мои песни»
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={st.empty}>
            <h1>Запишите, как вы играете</h1>
            <p>
              Нажмите «Запись» (R) и сыграйте что угодно: упражнение, песню или свою мелодию. Потом посмотрите на ленту — зелёные
              ноты точно в долю, жёлтые чуть мимо, оранжевые заметно спешат или опаздывают. Мелодию можно превратить в ноты и
              сохранить как свою песню.
            </p>
          </div>
        )}

        {takes.length > 0 && !rec && (
          <div className={st.takes}>
            <span className={st.takesTitle}>Дубли{best ? ` · лучший ${Math.round(best * 100)}%` : ''}</span>
            {takes.map((t) => {
              const a = analyse(t);
              return (
                <span key={t.id} className={st.take} data-on={t.id === current?.id || undefined}>
                  <button type="button" onClick={() => (setCurrent(t), setCompose(false))} title="Открыть дубль">
                    {fmtDate(t.at)} · {t.click ? `${Math.round(a.onTime * 100)}%` : 'свободно'}
                  </button>
                  <button
                    type="button"
                    className={st.del}
                    aria-label="Удалить дубль"
                    onClick={() => {
                      setTakes((list) => list.filter((x) => x.id !== t.id));
                      if (current?.id === t.id) setCurrent(null);
                    }}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
