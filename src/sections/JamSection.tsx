import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActionButton, Field, PlayIcon, Slider, StopIcon } from '../components/ui/Controls';
import { Picker } from '../components/ui/Picker';
import { Segmented } from '../components/ui/Segmented';
import { useHotkeys } from '../hooks/useHotkeys';
import { useMySongs } from '../hooks/useMySongs';
import { useProgress } from '../hooks/useProgress';
import { playAccompaniment, stopAccompaniment } from '../lib/accompany';
import { audioNow, canRecordAudio, noteStart, noteStop, playDrum, primeAudio, startAudioRecording } from '../lib/audio';
import { chordPcs, chordSymbol } from '../lib/chords';
import { chordNumeral } from '../lib/songs';
import { DRUMS, barHits, findDrums } from '../lib/drums';
import {
  type AnswerScore,
  type CallNote,
  GROOVES,
  JAM_IDEAS,
  type JamHarmony,
  type NoteColour,
  chordIndexAt,
  chordStart,
  colourOf,
  cycleBeats,
  findGroove,
  findJamKey,
  harmonyFromChords,
  harmonyFromGroove,
  jamKeys,
  makeCall,
  scaleNoteNames,
  scoreAnswer,
} from '../lib/jam';
import { JAM_TASKS, type JamEvent, findJamTask } from '../lib/jamTasks';
import { findPattern } from '../lib/patterns';
import { PROGRESSIONS, findProgression, progressionChords } from '../lib/progressions';
import { progress as learning } from '../lib/progress';
import { inputNow } from '../lib/inputClock';
import { type LoopLayer, type LoopNote, finishLayer, guideIndex, nextPassStart, placeNote, snapLength } from '../lib/looper';
import { LooperPanel } from './LooperPanel';
import { SONGS, findSong, keyById, planSong } from '../lib/songs';
import type { Settings } from '../lib/storage';
import { TheoryLink } from './TheoryLink';
import type { SectionProps } from './types';
import s from './Section.module.css';
import j from './JamSection.module.css';

interface Bubble {
  id: number;
  x: number;
  colour: NoteColour;
}

type Mode = Settings['jamMode'];

const MAX_LAYERS = 6;
const LO = 36;
const HI = 96;
const MODE_TITLE: Record<Mode, string> = { free: 'Свободно', call: 'Диалог', tasks: 'Задания', loop: 'Лупер' };
const MODE_HINT: Record<Mode, string> = {
  free: 'Свободная импровизация с идеями на каждый круг',
  call: 'Вопрос — ответ: Доминик играет фразу, вы отвечаете',
  tasks: 'Задания-ступени: пентатоника, ноты аккорда, терции, блюз',
  loop: 'Запишите свой аккомпанемент по слоям и играйте поверх',
};

/** Harmony for the current settings: a groove, a song from the library or a progression. */
function useHarmony(settings: Settings): { h: JamHarmony; keyLabel: string; keyChoice: boolean } {
  const mine = useMySongs();
  return useMemo(() => {
    if (settings.jamSource === 'song') {
      const song = findSong(settings.jamSongId, mine);
      const plan = planSong(song, song.key);
      const key = keyById(song.key);
      const blues = /блюз|blues/i.test(song.title + song.id);
      return { h: harmonyFromChords(song.title, plan.slots, key, song.meter, blues), keyLabel: key.label, keyChoice: false };
    }
    if (settings.jamSource === 'prog') {
      const prog = findProgression(settings.jamProgId);
      const key = findJamKey({ minor: prog.minor } as never, settings.jamKey);
      const chords = progressionChords(prog, key);
      const blues = prog.id === 'blues';
      return { h: harmonyFromChords(prog.title, chords.map((chord) => ({ chord, beats: 4 })), key, 4, blues), keyLabel: key.label, keyChoice: true };
    }
    const g = findGroove(settings.jamGroove);
    const key = findJamKey(g, settings.jamKey);
    return { h: harmonyFromGroove(g, key), keyLabel: key.label, keyChoice: true };
  }, [settings.jamSource, settings.jamSongId, settings.jamProgId, settings.jamGroove, settings.jamKey, mine]);
}

/** «Джем»: improvise over drums and chords — freely, in a musical dialogue, with goals, or over your own loop. */
export function JamSection({ store, settings, update, inputRef, mascot, say, setKeyboardRange }: SectionProps) {
  const { h, keyLabel, keyChoice } = useHarmony(settings);
  const mine = useMySongs();
  const counters = useProgress().counters;
  const mode = settings.jamMode;
  const task = findJamTask(settings.jamTask);
  const drumId = settings.jamDrums === 'auto' ? h.drums : settings.jamDrums;
  const drums = findDrums(drumId);
  const loopBeats = settings.jamLoopBars * h.meter;
  const cycleLen = mode === 'loop' ? loopBeats : cycleBeats(h);

  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [stats, setStats] = useState({ notes: 0, chord: 0, scale: 0 });
  const [answer, setAnswer] = useState<AnswerScore | null>(null);
  const [goodAnswers, setGoodAnswers] = useState(0);
  const [taskValue, setTaskValue] = useState(0);
  const [layers, setLayers] = useState<LoopLayer[]>([]);
  /** The pass being recorded (or waiting for its loop start). */
  const [recUi, setRecUi] = useState<{ from: number; notes: LoopNote[] } | null>(null);
  const layerId = useRef(0);
  const [audioRec, setAudioRec] = useState<ReturnType<typeof startAudioRecording>>(null);
  const [summary, setSummary] = useState<{ notes: number; chord: number; scale: number; minutes: number } | null>(null);
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const st = useRef({
    t0: 0,
    beatMs: 600,
    cycle: 0,
    timers: [] as number[],
    calls: new Map<number, CallNote[]>(),
    answers: new Map<number, { midi: number; at: number }[]>(),
    events: [] as JamEvent[],
    lastBar: -1,
    rec: null as { from: number; notes: LoopNote[]; open: Map<number, { n: LoopNote; abs: number }> } | null,
    /** Pending timers of each looper layer, so muting or deleting it silences it at once. */
    layerTimers: new Map<number, number[]>(),
    taskDone: false,
  });
  const live = useRef({ h, mode, task, drums, layers, cycleLen, tempo: settings.jamTempo, running, snap: settings.jamLoopSnap });
  live.current = { h, mode, task, drums, layers, cycleLen, tempo: settings.jamTempo, running, snap: settings.jamLoopSnap };
  const bubbleId = useRef(0);

  useEffect(() => setKeyboardRange({ from: 3, to: 5 }), [setKeyboardRange]);

  const inCycle = ((beat % cycleLen) + cycleLen) % cycleLen;
  // In the looper the harmony is only a suggestion of what to record, bar by bar.
  const slot = mode === 'loop' ? guideIndex(h, inCycle) : chordIndexAt(h, inCycle);
  const bar = Math.floor(beat / h.meter);

  // ---- key highlights: scale softly, current chord brighter ----
  useEffect(() => {
    store.clearMarks(['hint', 'next']);
    if (settings.jamMarks === 'none') return;
    const chordPcs = new Set(h.voicings[slot].map((m) => m % 12));
    const scale = mode === 'tasks' && task.id === 'pentatonic' ? h.pentaPcs : h.scalePcs;
    for (let m = LO; m <= HI; m++) {
      const pc = m % 12;
      if (chordPcs.has(pc)) store.setMark(m, { kind: 'next' });
      else if (settings.jamMarks === 'all' && scale.has(pc)) store.setMark(m, { kind: 'hint' });
    }
  }, [h, slot, settings.jamMarks, mode, task.id, store]);

  // ---- the clock ----
  const beatNow = () => (performance.now() - st.current.t0) / st.current.beatMs;

  /** Play a looper layer within the loop that starts at `startPerf`, from beat `fromBeat` on. */
  const scheduleLayer = (layer: LoopLayer, startPerf: number, fromBeat: number) => {
    const S = st.current;
    const list = (S.layerTimers.get(layer.id) ?? []).slice(-400);
    for (const nt of layer.notes) {
      if (nt.on < fromBeat) continue;
      const at = startPerf + nt.on * S.beatMs - performance.now();
      const end = startPerf + nt.off * S.beatMs - performance.now();
      list.push(window.setTimeout(() => noteStart(nt.midi, 72), Math.max(0, at)));
      list.push(window.setTimeout(() => noteStop(nt.midi, 0.15), Math.max(0, end)));
    }
    S.layerTimers.set(layer.id, list);
    S.timers.push(...list.slice(-layer.notes.length * 2));
  };
  const silenceLayer = (layer: LoopLayer) => {
    const S = st.current;
    (S.layerTimers.get(layer.id) ?? []).forEach((x) => window.clearTimeout(x));
    S.layerTimers.delete(layer.id);
    for (const nt of layer.notes) noteStop(nt.midi, 0.1);
  };

  const scheduleCycle = useCallback((n: number) => {
    const S = st.current;
    const L = live.current;
    const beatMs = S.beatMs;
    const startPerf = S.t0 + n * L.cycleLen * beatMs;
    const delay = Math.max(0, startPerf - performance.now());
    const audioStart = audioNow() + delay / 1000;
    const bars = L.cycleLen / L.h.meter;

    // Chords (not in the looper: there you build your own accompaniment).
    if (L.mode !== 'loop') {
      S.timers.push(
        window.setTimeout(() => {
          playAccompaniment(
            L.h.chords.map((chord, i) => ({ chord, beats: L.h.beats[i] })),
            L.h.voicings,
            findPattern(L.h.pattern),
            L.h.meter,
            L.tempo,
          );
        }, delay),
      );
    }
    // Drums, sample-accurate on the audio clock.
    if (L.drums) {
      const hits = barHits(L.drums, L.h.meter);
      for (let b = 0; b < bars; b++) for (const hit of hits) playDrum(hit.kind, audioStart + ((b * L.h.meter + hit.at) * beatMs) / 1000, hit.vel);
    }
    // Looper: a pass that just ended becomes a layer, then every audible layer plays this loop.
    if (L.mode === 'loop') {
      const passEnd = S.rec ? S.rec.from + L.cycleLen : Infinity;
      if (S.rec && passEnd <= n * L.cycleLen + 1e-6) {
        const notes = finishLayer(S.rec.notes, L.cycleLen);
        S.rec = null;
        setRecUi(null);
        if (notes.length) {
          const layer: LoopLayer = { id: ++layerId.current, notes, muted: false };
          live.current.layers = [...L.layers, layer];
          setLayers(live.current.layers);
          learning.count('jam:loop');
          say(live.current.layers.length === 1 ? 'Первый слой готов — он звучит по кругу. Играйте поверх или запишите ещё слой.' : `Слой ${live.current.layers.length} добавлен.`);
        } else say('В проходе не оказалось нот — нажмите «Записать слой» ещё раз.');
      }
      for (const layer of live.current.layers) if (!layer.muted) scheduleLayer(layer, startPerf, 0);
    }
    // Call and response: the gardener «asks» on every other bar.
    if (L.mode === 'call') {
      for (let b = 0; b < bars; b++) {
        const globalBar = Math.round(n * bars + b);
        if (globalBar % 2) continue;
        const chord = L.h.chords[chordIndexAt(L.h, b * L.h.meter)];
        const call = makeCall(L.h, chord);
        S.calls.set(globalBar, call);
        for (const c of call) {
          const at = delay + (b * L.h.meter + c.at) * beatMs;
          S.timers.push(
            window.setTimeout(() => {
              noteStart(c.midi, 92);
              store.setMark(c.midi, { kind: 'demo' });
            }, at),
          );
          S.timers.push(
            window.setTimeout(() => {
              noteStop(c.midi, 0.1);
              store.setMark(c.midi, null);
            }, at + c.dur * beatMs * 0.85),
          );
        }
      }
    }
    S.timers.push(window.setTimeout(() => live.current.running && scheduleCycle(n + 1), delay + L.cycleLen * beatMs - 30));
     
  }, [store, say]);

  const stop = useCallback(() => {
    const S = st.current;
    // A short wrap-up of what you played (only after a real session).
    if (live.current.running && statsRef.current.notes >= 8) {
      const x = statsRef.current;
      setSummary({ notes: x.notes, chord: x.chord, scale: x.scale, minutes: Math.max(1, Math.round((performance.now() - S.t0) / 60000)) });
    }
    S.timers.forEach((t) => window.clearTimeout(t));
    S.timers = [];
    stopAccompaniment();
    for (let m = 21; m <= 108; m++) noteStop(m, 0.1);
    store.clearMarks(['demo']);
    setRunning(false);
    live.current.running = false;
    setBeat(0);
    setRecUi(null);
    S.rec = null;
    S.layerTimers.clear();
  }, [store]);

  const start = useCallback((countIn = false) => {
    primeAudio();
    stop();
    const S = st.current;
    S.beatMs = 60000 / live.current.tempo;
    // A one-bar count-in (before recording a loop from silence): beats run negative until the loop starts.
    const lead = countIn ? live.current.h.meter : 0;
    S.t0 = performance.now() + 120 + lead * S.beatMs;
    for (let i = 0; i < lead; i++) playDrum('rim', audioNow() + (120 + i * S.beatMs) / 1000, i === 0 ? 1 : 0.6);
    S.calls.clear();
    S.answers.clear();
    S.events = [];
    S.lastBar = -1;
    S.taskDone = false;
    setStats({ notes: 0, chord: 0, scale: 0 });
    setSummary(null);
    setAnswer(null);
    setGoodAnswers(0);
    setTaskValue(0);
    setRunning(true);
    live.current.running = true;
    scheduleCycle(0);
    mascot.react('happy');
  }, [scheduleCycle, stop, mascot]);

  // Any change of harmony, mode, drums or tempo restarts the groove from the top.
  useEffect(() => {
    if (live.current.running) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h, mode, drumId, settings.jamTempo, settings.jamLoopBars]);
  // Layers are measured in beats of a loop of this length — a new length starts from scratch.
  useEffect(() => {
    setLayers([]);
  }, [settings.jamLoopBars]);

  useEffect(() => () => {
    const S = st.current;
    S.timers.forEach((t) => window.clearTimeout(t));
    stopAccompaniment();
    store.clearMarks();
  }, [store]);

  // ---- the beat ticker: UI position, scoring answers, target-note hints, loop recording ----
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const S = st.current;
      const L = live.current;
      const b = beatNow();
      setBeat(b);
      mascot.markActive();
      const barNow = Math.floor(b / L.h.meter);
      if (barNow !== S.lastBar) {
        // An answer bar just ended → score it.
        if (L.mode === 'call' && S.lastBar >= 0 && S.lastBar % 2 === 1) {
          const call = S.calls.get(S.lastBar - 1);
          if (call) {
            const chord = L.h.chords[chordIndexAt(L.h, ((S.lastBar * L.h.meter) % L.cycleLen + L.cycleLen) % L.cycleLen)];
            const sc = scoreAnswer(call, S.answers.get(S.lastBar) ?? [], chord, L.h.scalePcs);
            setAnswer(sc);
            if (sc.stars >= 2) {
              setGoodAnswers((x) => x + 1);
              learning.count('jam:answer');
              if (sc.stars === 3) mascot.react('celebrate', 0);
            }
          }
        }
        S.lastBar = barNow;
      }
      // «Попади в терцию»: light up the 3rd of the next chord one beat early.
      if (L.mode === 'tasks' && L.task.id === 'target-third') {
        const inC = ((b % L.cycleLen) + L.cycleLen) % L.cycleLen;
        const i = chordIndexAt(L.h, inC);
        const nextStart = chordStart(L.h, i) + L.h.beats[i];
        const ni = (i + 1) % L.h.chords.length;
        store.clearMarks(['demo']);
        if (nextStart - inC <= 1.05) {
          const tonesPcs = chordPcs(L.h.chords[ni]).map((x) => x % 12);
          for (let m = 60; m <= 84; m++) if (m % 12 === tonesPcs[1]) store.setMark(m, { kind: 'demo', label: '3' });
        }
      }
    }, 60);
    return () => window.clearInterval(id);
  }, [running, mascot, say, store]);

  // ---- your notes ----
  useLayoutEffect(() => {
    inputRef.current = {
      noteOn(midi) {
        const S = st.current;
        const L = live.current;
        if (!L.running) return 'ignored';
        const b = (inputNow() - S.t0) / S.beatMs;
        const inC = ((b % L.cycleLen) + L.cycleLen) % L.cycleLen;
        const i = L.mode === 'loop' ? guideIndex(L.h, inC) : chordIndexAt(L.h, inC);
        const chord = L.h.chords[i];
        const colour = colourOf(midi, chord, L.h.scalePcs);
        const id = ++bubbleId.current;
        const x = Math.max(2, Math.min(98, ((midi - LO) / (HI - LO)) * 100));
        setBubbles((bb) => [...bb.slice(-40), { id, x, colour }]);
        window.setTimeout(() => setBubbles((bb) => bb.filter((q) => q.id !== id)), 1800);
        setStats((x2) => ({ notes: x2.notes + 1, chord: x2.chord + (colour === 'chord' ? 1 : 0), scale: x2.scale + (colour === 'scale' ? 1 : 0) }));

        if (L.mode === 'call') {
          const barNow = Math.floor(b / L.h.meter);
          if (barNow % 2 === 1) {
            const list = S.answers.get(barNow) ?? [];
            list.push({ midi, at: b - barNow * L.h.meter });
            S.answers.set(barNow, list);
          }
        }
        if (L.mode === 'tasks') {
          const cs = b - inC + chordStart(L.h, i);
          S.events.push({ midi, beat: b, chordStart: cs, chord });
          const v = L.task.measure(S.events, L.h);
          setTaskValue(Math.min(L.task.goal, v));
          if (!S.taskDone && v >= L.task.goal) {
            S.taskDone = true;
            learning.count(`jam:task:${L.task.id}`);
            learning.count('jam:task');
            mascot.react('celebrate', 0);
            say(`Задание «${L.task.title}» выполнено!`);
          }
        }
        const at = S.rec ? placeNote(b, S.rec.from, L.cycleLen, L.snap) : null;
        if (S.rec && at !== null) {
          const n: LoopNote = { midi, on: at, off: Math.min(L.cycleLen, at + 0.5) };
          S.rec.notes.push(n);
          S.rec.open.set(midi, { n, abs: b });
          setRecUi({ from: S.rec.from, notes: [...S.rec.notes] });
        }
        return 'ignored';
      },
      noteOff(midi) {
        const S = st.current;
        if (!S.rec) return;
        const o = S.rec.open.get(midi);
        if (o) {
          o.n.off = Math.min(live.current.cycleLen, o.n.on + snapLength((inputNow() - S.t0) / S.beatMs - o.abs, live.current.snap));
          S.rec.open.delete(midi);
          setRecUi({ from: S.rec.from, notes: [...S.rec.notes] });
        }
      },
      releaseAll() {},
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef, mascot, say]);

  // ---- looper controls ----
  // A pass always covers exactly one loop from its first beat: from silence after a one-bar
  // count-in, during playback from the next loop start. Pressing again cancels it.
  const recordLayer = () => {
    const S = st.current;
    if (S.rec) {
      S.rec = null;
      setRecUi(null);
      return;
    }
    if (live.current.layers.length >= MAX_LAYERS) return;
    if (!live.current.running) start(true);
    const from = nextPassStart(beatNow(), live.current.cycleLen);
    S.rec = { from, notes: [], open: new Map() };
    setRecUi({ from, notes: [] });
  };
  const toggleLayer = (id: number) => {
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    const next = { ...layer, muted: !layer.muted };
    if (next.muted) silenceLayer(layer);
    else if (running) {
      // Unmuted mid-loop: play the rest of this loop right away.
      const S = st.current;
      const b = beatNow();
      const n = Math.floor(b / cycleLen);
      if (b >= 0) scheduleLayer(next, S.t0 + n * cycleLen * S.beatMs, b - n * cycleLen + 0.05);
    }
    const ls = layers.map((l) => (l.id === id ? next : l));
    live.current.layers = ls;
    setLayers(ls);
  };
  const removeLayer = (id: number) => {
    const layer = layers.find((l) => l.id === id);
    if (layer) silenceLayer(layer);
    const ls = layers.filter((l) => l.id !== id);
    live.current.layers = ls;
    setLayers(ls);
  };
  const clearLayers = () => {
    layers.forEach(silenceLayer);
    live.current.layers = [];
    setLayers([]);
  };

  // ---- audio recording ----
  const toggleAudio = async () => {
    if (audioRec) {
      const blob = await audioRec.stop();
      setAudioRec(null);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dzhem-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      say('Запись сохранена в загрузки.');
      return;
    }
    primeAudio();
    const r = startAudioRecording();
    if (r) {
      setAudioRec(r);
      if (!running) start();
    }
  };

  useHotkeys({
    Space: () => (live.current.running ? stop() : start()),
    KeyL: () => mode === 'loop' && recordLayer(),
    KeyU: () => mode === 'loop' && layers.length > 0 && removeLayer(layers[layers.length - 1].id),
  });

  const rows = useMemo(() => {
    const out: number[][] = [[]];
    let acc = 0;
    h.beats.forEach((b, i) => {
      if (acc + b > h.meter * 4 + 1e-6 && out[out.length - 1].length) {
        out.push([]);
        acc = 0;
      }
      out[out.length - 1].push(i);
      acc += b;
    });
    return out;
  }, [h]);
  const chordProgress = running && mode !== 'loop' ? Math.min(1, Math.max(0, (inCycle - chordStart(h, slot)) / h.beats[slot])) : 0;
  const barsInCycle = Math.round(cycleLen / h.meter);
  const barInCycle = Math.floor(inCycle / h.meter) + 1;
  const loopNo = Math.floor(beat / cycleLen);
  const scaleShown = mode === 'tasks' && task.id === 'pentatonic' ? h.pentaPcs : h.scalePcs;
  const chord = h.chords[slot];
  const nextChord = h.chords[(slot + 1) % h.chords.length];
  const pct = (n: number) => (stats.notes ? Math.round((n / stats.notes) * 100) : 0);
  const callPhase = mode === 'call' && running ? (bar % 2 === 0 ? 'ask' : 'answer') : null;
  const beatInBar = Math.floor(beat - bar * h.meter);

  const sourceValue = settings.jamSource === 'song' ? `song:${settings.jamSongId}` : settings.jamSource === 'prog' ? `prog:${settings.jamProgId}` : `groove:${settings.jamGroove}`;
  const songsForJam = [...mine, ...SONGS];

  return (
    <>
      <div className={s.controls}>
        <Field label="Режим">
          <Segmented<Mode> ariaLabel="Режим" value={mode} onChange={(jamMode) => update({ jamMode })} options={(['free', 'call', 'tasks', 'loop'] as const).map((m) => ({ value: m, label: MODE_TITLE[m], title: MODE_HINT[m] }))} />
        </Field>
        <Field label="Гармония">
          <Picker
            ariaLabel="Гармония"
            value={sourceValue}
            width={180}
            onChange={(v) => {
              const [kind, id] = [v.slice(0, v.indexOf(':')), v.slice(v.indexOf(':') + 1)];
              if (kind === 'song') update({ jamSource: 'song', jamSongId: id });
              else if (kind === 'prog') update({ jamSource: 'prog', jamProgId: id, jamKey: findJamKey({ minor: findProgression(id).minor } as never, settings.jamKey).id });
              else update({ jamSource: 'groove', jamGroove: id, jamKey: findJamKey(findGroove(id), settings.jamKey).id });
            }}
            items={[
              ...GROOVES.map((g) => ({ id: `groove:${g.id}`, group: 'Грувы', title: g.title })),
              ...PROGRESSIONS.map((p) => ({ id: `prog:${p.id}`, group: 'Последовательности', title: p.title })),
              ...songsForJam.map((sg) => ({ id: `song:${sg.id}`, group: `Песни · ${sg.group}`, title: sg.title })),
            ]}
          />
        </Field>
        {keyChoice && (
          <Field label="Тональность">
            <Picker
              ariaLabel="Тональность"
              value={settings.jamKey}
              width={100}
              onChange={(jamKey) => update({ jamKey })}
              items={jamKeys(settings.jamSource === 'prog' ? ({ minor: findProgression(settings.jamProgId).minor } as never) : findGroove(settings.jamGroove)).map((k) => ({
                id: k.id,
                group: k.minor ? 'Минор' : 'Мажор',
                title: k.label,
              }))}
            />
          </Field>
        )}
        <Field label="Темп" value={`${settings.jamTempo} bpm`}>
          <Slider value={settings.jamTempo} min={60} max={140} step={2} onChange={(jamTempo) => update({ jamTempo })} ariaLabel="Темп" width={90} />
        </Field>
        <Field label="Барабаны">
          <Picker
            ariaLabel="Барабаны"
            value={settings.jamDrums}
            width={130}
            onChange={(jamDrums) => update({ jamDrums })}
            items={[
              { id: 'auto', group: 'Ударные', title: `Авто (${findDrums(h.drums)?.title ?? '—'})` },
              { id: 'off', group: 'Ударные', title: 'Без барабанов' },
              ...DRUMS.map((d) => ({ id: d.id, group: 'Стили', title: d.title })),
            ]}
          />
        </Field>
        <span className={s.spacer} />
        <Field label=" ">
          <div className={j.buttons}>
            {canRecordAudio() && (
              <ActionButton onClick={toggleAudio} active={!!audioRec}>
                <span className={j.recDot} data-on={audioRec ? '' : undefined} /> {audioRec ? 'Сохранить' : 'Запись'}
              </ActionButton>
            )}
            <ActionButton primary onClick={running ? stop : () => start()} kbd="Space">
              {running ? (
                <>
                  <StopIcon /> Стоп
                </>
              ) : (
                <>
                  <PlayIcon /> Играть
                </>
              )}
            </ActionButton>
          </div>
        </Field>
      </div>

      <main className={`${s.stage} ${j.stage}`}>
        <TheoryLink settings={settings} update={update} />
        <div className={s.eyebrow}>
          Джем · {h.title} · {keyLabel} · {MODE_TITLE[mode]}
        </div>
        {settings.micOn && !settings.micHeadphones && (
          <p className={j.micWarn}>
            🎤 Микрофон слышит и барабаны с аккордами, поэтому пока они звучат — он на паузе. Наденьте наушники и отметьте
            «Я в наушниках» в меню микрофона.
          </p>
        )}

        {mode === 'loop' ? (
          <LooperPanel
            h={h}
            bars={settings.jamLoopBars}
            onBars={(jamLoopBars) => update({ jamLoopBars })}
            snap={settings.jamLoopSnap}
            onSnap={(jamLoopSnap) => update({ jamLoopSnap })}
            running={running}
            beat={beat}
            loopLen={cycleLen}
            layers={layers}
            rec={recUi}
            maxLayers={MAX_LAYERS}
            onRecord={recordLayer}
            onToggle={toggleLayer}
            onRemove={removeLayer}
            onClear={clearLayers}
            drumsOff={!drums}
          />
        ) : (
          <div className={j.chords} data-compact={mode !== 'free' || undefined}>
            <div className={j.head}>
              <div className={j.now} data-running={running || undefined} key={running ? slot : 'idle'}>
                {chordSymbol(chord)}
              </div>
              <div className={j.headSide}>
                <div className={j.next}>{running ? <>дальше <b>{chordSymbol(nextChord)}</b></> : 'нажмите «Играть» или пробел'}</div>
                <div className={j.counter}>
                  <span>
                    такт {running ? barInCycle : 1} из {barsInCycle}
                  </span>
                  <span className={j.beats}>
                    {Array.from({ length: h.meter }, (_, i) => (
                      <i key={i} data-on={running && i === beatInBar ? '' : undefined} data-one={i === 0 || undefined} />
                    ))}
                  </span>
                </div>
              </div>
            </div>

            <div className={j.chart} aria-label="Аккорды по порядку">
              {rows.map((row, r) => (
                <div key={r} className={j.chartRow}>
                  {row.map((i) => (
                    <div
                      key={i}
                      className={j.cell}
                      data-state={running && i === slot ? 'now' : running && i === (slot + 1) % h.chords.length ? 'next' : undefined}
                      style={{ flexGrow: h.beats[i], flexBasis: 0 }}
                      title={`${chordSymbol(h.chords[i])} · ${h.beats[i]} ${h.beats[i] === 1 ? 'доля' : h.beats[i] < 5 ? 'доли' : 'долей'}`}
                    >
                      {running && i === slot && <i className={j.fill} style={{ width: `${chordProgress * 100}%` }} />}
                      <b>{chordSymbol(h.chords[i])}</b>
                      <small>{chordNumeral(h.chords[i], h.key)}</small>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {(mode !== 'loop' || layers.length > 0 || recUi) && (
          <p className={j.scaleLine}>
            Подсвечено: <b>{mode === 'tasks' && task.id === 'pentatonic' ? (h.minor || h.blues ? 'минорная пентатоника' : 'мажорная пентатоника') : h.scaleName}</b>{' '}
            {scaleNoteNames(h, scaleShown).join(' · ')}
            <span className={j.sep}>|</span>
            ярче — {mode === 'loop' ? 'подсказка такта' : 'ноты аккорда'} <b>{chordSymbol(chord)}</b>
            <span className={j.marks} role="group" aria-label="Подсветка клавиш">
              {(
                [
                  ['all', 'гамма'],
                  ['chord', 'аккорд'],
                  ['none', 'выкл'],
                ] as const
              ).map(([v, label]) => (
                <button key={v} type="button" aria-pressed={settings.jamMarks === v} onClick={() => update({ jamMarks: v })}>
                  {label}
                </button>
              ))}
            </span>
          </p>
        )}

        {mode === 'call' && (
          <div className={j.call} data-phase={callPhase ?? undefined}>
            <div className={j.callTitle}>{callPhase === 'ask' ? '🌱 Доминик спрашивает…' : callPhase === 'answer' ? '🎹 Ваш ответ!' : 'Музыкальный разговор'}</div>
            <div className={j.beats}>
              {Array.from({ length: h.meter }, (_, i) => (
                <i key={i} data-on={running && i === beatInBar ? '' : undefined} />
              ))}
            </div>
            <p className={j.hint}>
              {answer
                ? `${'★'.repeat(answer.stars)}${'☆'.repeat(3 - answer.stars)} ${answer.text}`
                : 'Доминик играет короткую фразу, а вы отвечаете в следующем такте: повторите её ритм своими нотами и закончите на ноте аккорда.'}
            </p>
            {goodAnswers > 0 && <div className={j.count}>удачных ответов: {goodAnswers}</div>}
          </div>
        )}

        {mode === 'tasks' && (
          <div className={j.tasks}>
            <div className={j.taskChips}>
              {JAM_TASKS.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  className={j.taskChip}
                  aria-pressed={t.id === task.id}
                  onClick={() => update({ jamTask: t.id, ...(t.groove ? { jamSource: 'groove' as const, jamGroove: t.groove } : {}) })}
                >
                  {(counters[`jam:task:${t.id}`] ?? 0) > 0 ? '✓' : i + 1}. {t.title}
                </button>
              ))}
            </div>
            <p className={j.hint}>{task.hint}</p>
            <div className={j.taskBar}>
              <span>
                <i style={{ width: `${(taskValue / task.goal) * 100}%` }} />
              </span>
              <b>
                {taskValue} / {task.goal} {task.unit}
              </b>
            </div>
          </div>
        )}

        {mode === 'free' && !summary && (
          <p className={j.idea}>
            {running ? (
              <>
                💡 <b>Идея на этот круг:</b> {JAM_IDEAS[loopNo % JAM_IDEAS.length]}
              </>
            ) : (
              'Здесь нет ошибок — экспериментируйте. Каждый круг — новая идея, что попробовать.'
            )}
          </p>
        )}

        {summary && !running && (
          <div className={j.summary}>
            <div className={j.summaryTitle}>Джем окончен · {summary.minutes} мин</div>
            <div className={j.summaryStats}>
              <span>
                <b>{summary.notes}</b> нот
              </span>
              <span data-colour="chord">
                <b>{Math.round((summary.chord / summary.notes) * 100)}%</b> в аккорд
              </span>
              <span data-colour="scale">
                <b>{Math.round((summary.scale / summary.notes) * 100)}%</b> из гаммы
              </span>
              <span data-colour="spice">
                <b>{Math.round(((summary.notes - summary.chord - summary.scale) / summary.notes) * 100)}%</b> острых
              </span>
            </div>
            {(() => {
              const chordShare = summary.chord / summary.notes;
              const spice = (summary.notes - summary.chord - summary.scale) / summary.notes;
              const tip =
                spice > 0.35
                  ? { text: 'Много «острых» нот — держитесь подсвеченных, и звучание станет увереннее.', label: 'Задание «Пентатоника»', patch: { jamMode: 'tasks' as const, jamTask: 'pentatonic' } }
                  : chordShare < 0.3
                    ? { text: 'Попробуйте чаще опираться на ноты аккорда — мелодия начнёт «следовать» за гармонией.', label: 'Задание «Ноты аккорда»', patch: { jamMode: 'tasks' as const, jamTask: 'chord-tones' } }
                    : { text: 'Хороший баланс! Следующий шаг — музыкальный разговор с Домиником.', label: 'Режим «Диалог»', patch: { jamMode: 'call' as const } };
              return (
                <p className={j.summaryTip}>
                  {tip.text}{' '}
                  <button type="button" className={j.tipBtn} onClick={() => update(tip.patch)}>
                    {tip.label} →
                  </button>
                </p>
              );
            })()}
          </div>
        )}

        <div className={j.waves} aria-hidden="true">
          {bubbles.map((b) => (
            <span key={b.id} className={j.bubble} data-colour={b.colour} style={{ left: `${b.x}%` }} />
          ))}
        </div>

        <div className={j.legend} data-hidden={mode === 'call' || mode === 'tasks' || undefined}>
          <span data-colour="chord">в аккорд {stats.notes ? `${pct(stats.chord)}%` : ''}</span>
          <span data-colour="scale">из гаммы {stats.notes ? `${pct(stats.scale)}%` : ''}</span>
          <span data-colour="spice">острые ноты {stats.notes ? `${pct(stats.notes - stats.chord - stats.scale)}%` : ''}</span>
        </div>
      </main>
    </>
  );
}
