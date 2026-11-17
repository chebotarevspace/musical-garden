import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SongEditor } from '../components/SongEditor';
import { Spelled } from '../components/Spelled';
import { ActionButton, Divider, Field, InlineSwitch, PlayIcon, Slider, StopIcon } from '../components/ui/Controls';
import { Picker } from '../components/ui/Picker';
import { Segmented } from '../components/ui/Segmented';
import { useHotkeys } from '../hooks/useHotkeys';
import { useMySongs } from '../hooks/useMySongs';
import { mySongs as mySongsStore } from '../lib/mySongs';
import { playAccompaniment, stopAccompaniment } from '../lib/accompany';
import { chordSymbol } from '../lib/chords';
import { findPattern } from '../lib/patterns';
import { voiceLead } from '../lib/progressions';
import { SONGS, chordNumeral, findSong, keyById, keysFor, planSong } from '../lib/songs';
import { BeatDots, KeyCircleButton, PatternField } from './PlayAlongBits';
import { progress as learning } from '../lib/progress';
import { playSequence, stopSequence } from '../lib/player';
import { TheoryLink } from './TheoryLink';
import type { SectionProps } from './types';
import { useMelodyAlong } from './useMelodyAlong';
import { useLeadSheet } from './useLeadSheet';
import { noteStart, noteStop } from '../lib/audio';
import type { LineNote } from '../components/StaffLine';
import { type Result, usePlayAlong } from './usePlayAlong';
import { StaffLine } from '../components/StaffLine';
import s from './Section.module.css';
import g from './SongsSection.module.css';

/** Play along with songs: chords over lyrics, any key, any accompaniment pattern. */
export function SongsSection({ store, settings, update, inputRef, mascot, setKeyboardRange }: SectionProps) {
  const custom = useMySongs();
  const song = findSong(settings.songId, custom);
  const [editor, setEditor] = useState<'new' | 'edit' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const keyId = settings.songKeys[song.id] ?? song.key;
  const key = keyById(keyId);
  const tempo = settings.songTempos[song.id] ?? song.tempo;
  const plan = useMemo(() => planSong(song, keyId), [song, keyId]);
  const voicings = useMemo(() => voiceLead(plan.slots.map((x) => x.chord)), [plan]);
  const pattern = findPattern(settings.pattern);
  const melodyMode = settings.songPart === 'melody' && plan.melody.length > 0;
  const leadMode = settings.songPart === 'lead' && plan.melody.length > 0;
  const tempoMode = settings.songPlay === 'tempo' && !melodyMode && !leadMode;
  const [listening, setListening] = useState<number | null>(null);

  const play = usePlayAlong({
    slots: plan.slots,
    voicings,
    meter: song.meter,
    mode: settings.songPlay,
    tempo,
    bass: settings.songBass,
    showKeys: settings.songShowKeys,
    loop: false,
    paused: listening !== null,
    active: !melodyMode && !leadMode,
    store,
    inputRef,
    mascot,
    passLabel: () => 'Песня',
    onPass: (hits, total) => learning.recordRun('songs', song.id, hits / total, false),
  });
  const { index, results, running, countIn, beat, summary, start, stop, reset } = play;

  // Melody part: the first chord of each bar accompanies you.
  const barChords = useMemo(() => plan.bars.map((_, b) => voicings[plan.barOfSlot.indexOf(b)] ?? []), [plan, voicings]);
  const mel = useMelodyAlong({
    notes: plan.melody,
    barChords,
    active: melodyMode,
    accompany: settings.songBass,
    showKeys: settings.songShowKeys,
    store,
    inputRef,
    mascot,
    onFinish: (mistakes) => learning.recordRun('songs', `${song.id}:melody`, mistakes, true),
  });

  // Lead sheet: melody in the right hand, chords in the left.
  const lead = useLeadSheet({
    plan,
    voicings,
    active: leadMode,
    left: settings.leadLeft,
    showKeys: settings.songShowKeys,
    store,
    inputRef,
    mascot,
    onFinish: (mistakes) => learning.recordRun('songs', `${song.id}:lead`, mistakes, true),
  });

  useEffect(() => setKeyboardRange({ from: 2, to: 5 }), [setKeyboardRange]);

  // «Песня целиком»: while you play the chords, the melody of each bar sounds along.
  const partner = settings.songPartner && !melodyMode && !leadMode && plan.melody.length > 0;
  const playBarMelody = useCallback(
    (bar: number) => {
      const notes = plan.melody.filter((n) => n.bar === bar);
      if (!notes.length) return;
      const step = (song.meter * 60000) / tempo / notes.length;
      playSequence(notes.map((n) => [n.midi]), 60000 / step, undefined, 0.92);
    },
    [plan, song.meter, tempo],
  );
  const prevIndex = useRef(index);
  useEffect(() => {
    const prev = prevIndex.current;
    prevIndex.current = index;
    if (!partner) return;
    const firstOfBar = (i: number) => i >= 0 && plan.barOfSlot.indexOf(plan.barOfSlot[i]) === i;
    if (tempoMode) {
      // In time: each bar's melody starts with its first chord.
      if (running && !countIn && firstOfBar(index)) playBarMelody(plan.barOfSlot[index]);
    } else if (index === prev + 1 && firstOfBar(prev)) {
      // Waiting for you: the bar sings once you've played its first chord.
      playBarMelody(plan.barOfSlot[prev]);
    }
  }, [index, partner, tempoMode, running, countIn, plan, playBarMelody]);
  useEffect(() => () => stopSequence(), []);

  const melodyTimers = useRef<number[]>([]);
  const stopListening = useCallback(() => {
    melodyTimers.current.forEach((x) => window.clearTimeout(x));
    melodyTimers.current = [];
    stopAccompaniment();
    setListening(null);
    store.clearMarks(['demo']);
  }, [store]);

  useEffect(() => {
    reset();
    stopListening();
  }, [plan, settings.songPlay, reset, stopListening]);
  useEffect(() => stopListening, [stopListening]);

  const listen = useCallback(() => {
    if (listening !== null) return stopListening();
    stop();
    playAccompaniment(plan.slots, voicings, pattern, song.meter, tempo, {
      onSlot: (i) => setListening(i),
      onNote: (m, on) => store.setMark(m, on ? { kind: 'demo' } : null),
    });
    // «Обе руки»: the melody sings on top of the chords.
    if (leadMode) {
      const beatMs = 60000 / tempo;
      for (const n of plan.melody) {
        melodyTimers.current.push(window.setTimeout(() => noteStart(n.midi, 96), n.beat * beatMs));
        melodyTimers.current.push(window.setTimeout(() => noteStop(n.midi, 0.12), (n.beat + n.dur * 0.92) * beatMs));
      }
    }
  }, [listening, stopListening, stop, plan, voicings, pattern, song.meter, tempo, store, leadMode]);

  useHotkeys({
    Space: () => (leadMode ? lead.reset() : melodyMode ? mel.reset() : tempoMode ? (running ? stop() : start()) : reset()),
    KeyP: listen,
    KeyK: () => update({ songShowKeys: !settings.songShowKeys }),
  });

  // ---- state per bar ----
  const activeSlot = listening ?? index;
  const melodyBar = plan.melody[Math.min(mel.index, plan.melody.length - 1)]?.bar ?? 0;
  const leadBar = lead.step ? Math.min(plan.bars.length - 1, Math.floor(lead.step.beat / song.meter + 1e-6)) : 0;
  const activeBar = leadMode && listening === null ? leadBar : melodyMode && listening === null ? melodyBar : plan.barOfSlot[activeSlot] ?? 0;
  const barState = (b: number): 'current' | 'hit' | 'miss' | undefined => {
    if (leadMode && listening === null) {
      if (lead.done) return 'hit';
      return b === leadBar ? 'current' : b < leadBar ? 'hit' : undefined;
    }
    if (melodyMode && listening === null) {
      if (mel.done) return 'hit';
      return b === melodyBar ? 'current' : b < melodyBar ? 'hit' : undefined;
    }
    if (b === activeBar && (listening !== null || !summary || running)) return 'current';
    const rs: Result[] = plan.barOfSlot.map((bar, i) => (bar === b ? results[i] : null)).filter((x) => x !== null) as Result[];
    if (rs.some((r) => r === 'miss')) return 'miss';
    if (rs.length && rs.every((r) => r === 'hit')) return 'hit';
    return undefined;
  };

  // Keep the current bar in view.
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    sheetRef.current?.querySelector<HTMLElement>(`[data-bar="${activeBar}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeBar]);

  // Chords the song uses, with degrees in the chosen key.
  const used = useMemo(() => {
    const seen = new Map<string, string>();
    for (const sl of plan.slots) {
      const sym = chordSymbol(sl.chord);
      if (!seen.has(sym)) seen.set(sym, chordNumeral(sl.chord, key));
    }
    return [...seen];
  }, [plan, key]);

  const lines = [...new Set(plan.bars.map((b) => b.line))];

  // The lead sheet of the current line: melody with its rhythm, chord symbols above.
  const leadLine = useMemo((): LineNote[] => {
    if (!leadMode) return [];
    const line = plan.bars[leadBar]?.line;
    const starts: number[] = [];
    let at = 0;
    for (const sl of plan.slots) {
      starts.push(at);
      at += sl.beats;
    }
    const symbolsIn = (from: number, to: number) =>
      plan.slots
        // Like on a printed lead sheet, a chord is written only where it changes (and at the line start).
        .map((sl, i) =>
          starts[i] >= from - 1e-6 && starts[i] < to - 1e-6 && (i === 0 || plan.barOfSlot[i] === firstBar || chordSymbol(plan.slots[i - 1].chord) !== chordSymbol(sl.chord))
            ? chordSymbol(sl.chord)
            : null,
        )
        .filter(Boolean)
        .join(' ');
    const curNote = lead.done ? plan.melody.length : lead.step && lead.step.note >= 0 && !lead.noteDone ? lead.step.note : plan.melody.findIndex((n) => n.beat > (lead.step?.beat ?? 0) + 1e-6);
    const out: LineNote[] = [];
    const firstBar = plan.bars.findIndex((x) => x.line === line);
    plan.bars.forEach((bar, b) => {
      if (bar.line !== line) return;
      const from = b * song.meter;
      const to = from + song.meter;
      const idx = plan.melody.map((n, i) => (n.bar === b ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) {
        out.push({ code: 'C4', rest: true, dur: song.meter, barBefore: true, above: symbolsIn(from, to) || undefined, state: lead.done || b < leadBar ? 'done' : b === leadBar ? 'current' : 'todo' });
        return;
      }
      idx.forEach((i, k) => {
        const n = plan.melody[i];
        const end = k === 0 ? Math.min(n.beat + n.dur, to) : n.beat + n.dur;
        out.push({
          code: n.code,
          dur: n.dur,
          barBefore: k === 0,
          above: symbolsIn(k === 0 ? from : n.beat, end) || undefined,
          state: curNote < 0 || i < curNote ? 'done' : i === curNote ? (lead.wrong === 'right' ? 'wrong' : 'current') : 'todo',
        });
      });
    });
    return out;
  }, [leadMode, plan, leadBar, lead.step, lead.noteDone, lead.done, lead.wrong, song.meter]);
  const hits = results.filter((x) => x === 'hit').length;
  const currentChord = plan.slots[index]?.chord;

  return (
    <>
      <div className={s.controls}>
        <Field label="Песня">
          <Picker
            ariaLabel="Песня"
            value={song.id}
            width={270}
            onChange={(songId) => update({ songId })}
            items={[...custom, ...SONGS].map((x) => ({ id: x.id, group: x.group, title: x.title, badge: x.melody?.some((b) => b.trim()) ? '♪ ноты' : undefined }))}
          />
          <ActionButton onClick={() => setEditor('new')} title="Добавить свою песню: вставьте текст с аккордами">
            ＋ Своя
          </ActionButton>
        </Field>
        <Field label="Тональность">
          <Picker
            ariaLabel="Тональность"
            value={keyId}
            width={130}
            onChange={(id) => update({ songKeys: { ...settings.songKeys, [song.id]: id } })}
            items={keysFor(song).map((k) => ({ id: k.id, group: k.minor ? 'Минор' : 'Мажор', title: k.label, badge: k.id === song.key ? 'ориг.' : undefined }))}
          />
          <KeyCircleButton value={keyId} minor={key.minor} onChange={(id) => update({ songKeys: { ...settings.songKeys, [song.id]: id } })} />
        </Field>
        <Divider />
        {plan.melody.length > 0 && (
          <Field label="Партия">
            <Segmented<'chords' | 'melody' | 'lead'>
              ariaLabel="Что играть"
              value={settings.songPart}
              onChange={(songPart) => update({ songPart })}
              options={[
                { value: 'chords', label: 'Аккорды', title: 'Аккомпанемент по аккордам над текстом' },
                { value: 'melody', label: 'Мелодия', title: 'Мелодия правой рукой, аккорды играет приложение' },
                { value: 'lead', label: 'Обе руки', title: 'Ведущий лист: мелодия правой, аккорды левой' },
              ]}
            />
          </Field>
        )}
        {!leadMode && !melodyMode && (
        <Field label="Игра">
          <Segmented<'wait' | 'tempo'>
            ariaLabel="Как играть"
            value={settings.songPlay}
            onChange={(songPlay) => update({ songPlay })}
            options={[
              { value: 'wait', label: 'Ждать меня' },
              { value: 'tempo', label: 'Под метроном' },
            ]}
          />
        </Field>
        )}
        <Field label="Темп" value={`${tempo} bpm`}>
          <Slider ariaLabel="Темп" width={100} min={40} max={160} step={2} value={tempo} onChange={(v) => update({ songTempos: { ...settings.songTempos, [song.id]: v } })} />
        </Field>
        <PatternField settings={settings} update={update} />
        <Field label="Подсказки">
          <div className={g.switches}>
            <InlineSwitch label="Клавиши" title="Удобное обращение на клавиатуре (K)" checked={settings.songShowKeys} onChange={(songShowKeys) => update({ songShowKeys })} />
            {leadMode ? (
              <InlineSwitch
                label="Левая — бас"
                title="Левой рукой — только основной звук аккорда (проще для начала)"
                checked={settings.leadLeft === 'root'}
                onChange={(on) => update({ leadLeft: on ? 'root' : 'chord' })}
              />
            ) : (
              <InlineSwitch label="Бас" title="Приложение играет бас за вас" checked={settings.songBass} onChange={(songBass) => update({ songBass })} />
            )}
            {!melodyMode && !leadMode && plan.melody.length > 0 && (
              <InlineSwitch
                label="Мелодия"
                title="Песня целиком: пока вы играете аккорды, мелодия звучит сама"
                checked={settings.songPartner}
                onChange={(songPartner) => update({ songPartner })}
              />
            )}
          </div>
        </Field>
        <span className={s.spacer} />
        <Field label=" ">
          <div className={g.buttons}>
            <ActionButton onClick={listen} kbd="P" active={listening !== null}>
              {listening !== null ? <StopIcon /> : <PlayIcon />} Послушать
            </ActionButton>
            {tempoMode ? (
              <ActionButton primary onClick={running ? stop : start} kbd="Space">
                {running ? <StopIcon /> : <PlayIcon />}
                {running ? 'Стоп' : 'Играть'}
              </ActionButton>
            ) : (
              <ActionButton primary onClick={leadMode ? lead.reset : melodyMode ? mel.reset : reset} kbd="Space">
                Сначала
              </ActionButton>
            )}
          </div>
        </Field>
      </div>

      <main className={`${s.stage} ${g.stage}`}>
        <TheoryLink settings={settings} update={update} />
        <header className={g.head}>
          <div>
            <h1 className={g.title}>{song.title}</h1>
            <div className={g.origin}>
              {song.origin} · {song.meter}/4 · тональность <Spelled text={key.label} />
              {song.custom && (
                <>
                  {' · '}
                  <button type="button" className={g.linkBtn} onClick={() => setEditor('edit')}>
                    изменить
                  </button>
                  {' · '}
                  <button
                    type="button"
                    className={g.linkBtn}
                    data-danger
                    onClick={() => {
                      if (!confirmDelete) return setConfirmDelete(true);
                      mySongsStore.remove(song.id);
                      setConfirmDelete(false);
                      update({ songId: 'saints' });
                    }}
                    onBlur={() => setConfirmDelete(false)}
                  >
                    {confirmDelete ? 'точно удалить?' : 'удалить'}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className={g.used} aria-label="Аккорды песни">
            {used.map(([sym, num]) => (
              <span key={sym} className={g.usedChip}>
                <Spelled text={sym} className={g.usedSym} />
                <span className={g.usedNum}>{num}</span>
              </span>
            ))}
          </div>
        </header>

        {leadMode && (
          <div className={g.lead}>
            <div className={g.melody}>
              <StaffLine clef="treble" noteWidth={44} notes={leadLine} />
            </div>
            <div className={g.hands}>
              <span className={g.hand} data-ok={lead.done || (lead.noteDone || !lead.nextNote) ? '' : undefined} data-wrong={lead.wrong === 'right' || undefined}>
                <b>Правая</b> {lead.done ? '✓' : lead.nextNote ? <Spelled text={lead.nextNote.code} /> : '✓ держите'}
              </span>
              <span className={g.hand} data-ok={lead.done || lead.chordOk ? '' : undefined} data-wrong={lead.wrong === 'left' || undefined}>
                <b>Левая</b> {lead.chord ? <Spelled text={settings.leadLeft === 'root' ? chordSymbol(lead.chord).replace(/(^[A-G][#b♯♭]?).*/, '$1') : chordSymbol(lead.chord)} /> : '—'}
                {lead.chordOk ? ' ✓' : ''}
              </span>
            </div>
          </div>
        )}
        {melodyMode && (
          <div className={g.melody}>
            <StaffLine
              clef="treble"
              noteWidth={40}
              notes={plan.melody
                .map((n, i) => ({ n, i }))
                .filter(({ n }) => plan.bars[n.bar]?.line === plan.bars[melodyBar]?.line)
                .map(({ n, i }) => ({ code: n.code, state: i < mel.index ? 'done' : i === mel.index ? (mel.wrong ? 'wrong' : 'current') : 'todo' }))}
            />
          </div>
        )}
        <div className={g.sheet} ref={sheetRef}>
          {lines.map((li) => (
            <div key={li} className={g.line} style={{ gridTemplateColumns: `repeat(${plan.bars.filter((b) => b.line === li).length}, 1fr)` }}>
              {plan.bars.map((bar, b) =>
                bar.line !== li ? null : (
                  <div key={b} className={g.bar} data-bar={b} data-state={barState(b)}>
                    <div className={g.chords}>
                      {bar.chords.map((c, ci) => (
                        <span key={ci} className={g.chord}>
                          <Spelled text={chordSymbol(c)} />
                        </span>
                      ))}
                    </div>
                    <div className={g.lyric}>{bar.text || ' '}</div>
                  </div>
                ),
              )}
            </div>
          ))}
        </div>

        {tempoMode && running && <BeatDots meter={song.meter} countIn={countIn} beat={beat} />}

        <p className={g.status}>
          {listening !== null ? (
            `Слушайте: фактура «${pattern.title}». ${song.meter === 3 && pattern.id !== 'waltz' ? 'Для песни на 3/4 хорошо подходит «Вальс».' : ''}`
          ) : leadMode ? (
            lead.done ? (
              <span className={g.summary}>Обе руки — песня сыграна{lead.mistakes ? `, ошибок: ${lead.mistakes}` : ' без ошибок'}! Space — сыграть снова.</span>
            ) : lead.wrong === 'left' ? (
              'Левая рука: эта нота не из аккорда. Подсветка на клавиатуре подскажет.'
            ) : lead.wrong === 'right' ? (
              'Правая рука: не та нота мелодии — посмотрите на стан.'
            ) : (
              <>
                Правая рука ведёт мелодию по нотам, левая держит аккорд, написанный над нотами. Песня ждёт, пока обе руки сыграют свою часть.
                {settings.leadLeft === 'chord' ? ' Трудно? Включите «Левая — бас».' : ''}
              </>
            )
          ) : melodyMode ? (
            mel.done ? (
              <span className={g.summary}>Мелодия сыграна{mel.mistakes ? `, ошибок: ${mel.mistakes}` : ' без ошибок'}! Space — сыграть снова.</span>
            ) : mel.wrong ? (
              'Не та нота — посмотрите на стан ещё раз.'
            ) : (
              'Играйте мелодию по нотам правой рукой. На каждом новом такте приложение сыграет аккорд.'
            )
          ) : summary && !running ? (
            <span className={g.summary}>{summary}</span>
          ) : tempoMode ? (
            running ? (
              countIn > 0 ? 'Приготовьтесь: отсчёт…' : `Вовремя ${hits} из ${results.length}`
            ) : (
              'Нажмите «Играть»: отсчёт, затем аккорды сменяются по тактам. Пойте и играйте вместе!'
            )
          ) : currentChord ? (
            <>
              Сыграйте <Spelled text={chordSymbol(currentChord)} /> — тактом в любой фактуре. Песня подождёт вас.
            </>
          ) : null}
        </p>
      </main>
      {editor && (
        <SongEditor
          initial={editor === 'edit' && song.custom ? song : undefined}
          onClose={() => setEditor(null)}
          onSave={(saved) => {
            mySongsStore.save(saved);
            update({ songId: saved.id, songKeys: { ...settings.songKeys, [saved.id]: saved.key } });
            setEditor(null);
          }}
        />
      )}
    </>
  );
}
