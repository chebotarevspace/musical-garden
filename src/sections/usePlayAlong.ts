/**
 * Play-along engine shared by Progressions and Songs.
 *
 * A chord slot counts as played when every chord tone has sounded since the slot began —
 * together, broken or as an arpeggio — so any accompaniment pattern works.
 * Modes: 'wait' (the next chord comes when you play the current one) and
 * 'tempo' (count-in, then one slot per bar/half-bar with a metronome; each slot ✓ or ✗).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { MascotApi } from '../hooks/useMascotMood';
import type { Slot } from '../lib/accompany';
import { noteStart, noteStop, playClick } from '../lib/audio';
import { QUALITIES, chordPcs } from '../lib/chords';
import type { KeyStore, Mark } from '../lib/keyStore';
import { bassOf } from '../lib/progressions';
import type { SectionInput } from './types';

export type Result = 'hit' | 'miss' | undefined;
const pc = (m: number) => ((m % 12) + 12) % 12;

interface Options {
  slots: Slot[];
  voicings: number[][];
  meter: 3 | 4;
  mode: 'wait' | 'tempo';
  tempo: number;
  bass: boolean;
  showKeys: boolean;
  /** Start over automatically at the end (progressions) or stop (songs). */
  loop: boolean;
  /** Hide keyboard hints (e.g. while a demo is playing). */
  paused: boolean;
  store: KeyStore;
  inputRef: MutableRefObject<SectionInput | null>;
  mascot: MascotApi;
  /** Text for a finished pass, e.g. "Круг 1" or "Песня". */
  passLabel(pass: number): string;
  /** When false, the engine neither listens to the keyboard nor marks keys (another mode is active). */
  active?: boolean;
  /** Called when the whole sequence has been played through once. */
  onPass?(hits: number, total: number, mode: 'wait' | 'tempo'): void;
}

export function usePlayAlong(o: Options) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [pass, setPass] = useState(1);
  const [running, setRunning] = useState(false);
  const [countIn, setCountIn] = useState(0);
  const [beat, setBeat] = useState(-1);
  const [summary, setSummary] = useState<string | null>(null);

  const opts = useRef(o);
  opts.current = o;
  const st = useRef({
    index: 0,
    results: [] as Result[],
    pass: 1,
    running: false,
    started: false,
    countIn: 0,
    beatInSlot: 0,
    globalBeat: 0,
    hit: false,
    acc: new Set<number>(),
    nextAcc: new Set<number>(),
    bass: null as number | null,
  });
  const held = useRef(new Set<number>());
  const timer = useRef<number>();

  const sync = () => {
    const s = st.current;
    setIndex(s.index);
    setResults([...s.results]);
    setPass(s.pass);
    setCountIn(s.countIn);
    setBeat(s.started ? s.beatInSlot : -1);
  };

  const stopBass = () => {
    if (st.current.bass !== null) noteStop(st.current.bass, 0.3);
    st.current.bass = null;
  };
  const playBass = (slotIndex: number, ms?: number) => {
    if (!opts.current.bass) return;
    stopBass();
    const m = bassOf(opts.current.slots[slotIndex].chord);
    noteStart(m, 70);
    st.current.bass = m;
    if (ms) window.setTimeout(() => st.current.bass === m && stopBass(), ms);
  };

  const heldPcs = () => new Set([...held.current].map(pc));
  const complete = (set: Set<number>, slotIndex: number) => chordPcs(opts.current.slots[slotIndex].chord).every((p) => set.has(p));

  const stop = useCallback(() => {
    window.clearTimeout(timer.current);
    stopBass();
    Object.assign(st.current, { running: false, countIn: 0, started: false });
    setRunning(false);
    setCountIn(0);
    setBeat(-1);
  }, []);

  const reset = useCallback(() => {
    stop();
    Object.assign(st.current, { index: 0, results: [], pass: 1, hit: false, acc: new Set(), nextAcc: new Set(), beatInSlot: 0, globalBeat: 0 });
    setSummary(null);
    sync();
  }, [stop]);

  /** End of the whole sequence. Returns true when playback continues (loop). */
  const finishPass = () => {
    const s = st.current;
    const o = opts.current;
    const total = o.slots.length;
    const hits = s.results.filter((x) => x === 'hit').length;
    setSummary(o.mode === 'tempo' ? `${o.passLabel(s.pass)}: вовремя ${hits} из ${total}` : `${o.passLabel(s.pass)} — сыграно!`);
    if (o.mode === 'wait' || hits === total) o.mascot.react('celebrate', 10);
    o.onPass?.(o.mode === 'wait' ? total : hits, total, o.mode);
    s.index = 0;
    s.pass += 1;
    s.results = [];
    return o.loop;
  };

  // ---- wait mode ----
  const advanceWait = () => {
    const s = st.current;
    s.results[s.index] = 'hit';
    playBass(s.index, 1400);
    s.index += 1;
    if (s.index >= opts.current.slots.length) finishPass();
    else opts.current.mascot.markActive();
    // Each chord has to be played anew (otherwise repeated chords like C C C C would be skipped).
    s.acc = new Set();
    sync();
  };

  // ---- tempo mode ----
  const startSlot = (i: number) => {
    const s = st.current;
    s.index = i;
    s.beatInSlot = 0;
    s.acc = new Set([...s.nextAcc, ...heldPcs()]);
    s.nextAcc = new Set();
    s.hit = complete(s.acc, i);
    playBass(i);
  };

  const tick = useCallback(() => {
    const s = st.current;
    const o = opts.current;
    if (!s.running) return;
    const beatMs = 60000 / o.tempo;
    if (s.countIn > 0) {
      playClick(s.countIn === o.meter);
      s.countIn -= 1;
    } else {
      if (!s.started) {
        s.started = true;
        startSlot(0);
      } else {
        s.beatInSlot += 1;
        if (s.beatInSlot >= o.slots[s.index].beats) {
          s.results[s.index] = s.hit ? 'hit' : 'miss';
          if (s.index + 1 >= o.slots.length) {
            if (!finishPass()) {
              sync();
              stop();
              return;
            }
            startSlot(0);
          } else startSlot(s.index + 1);
        }
      }
      playClick(s.globalBeat % o.meter === 0);
      s.globalBeat += 1;
    }
    sync();
    timer.current = window.setTimeout(tick, beatMs);
  }, [stop]);

  const start = useCallback(() => {
    reset();
    Object.assign(st.current, { running: true, countIn: opts.current.meter, started: false, globalBeat: 0 });
    setRunning(true);
    sync();
    tick();
  }, [reset, tick]);

  // ---- input ----
  const active = o.active ?? true;
  useLayoutEffect(() => {
    if (!active) return;
    o.inputRef.current = {
      noteOn(midi) {
        held.current.add(midi);
        const s = st.current;
        const op = opts.current;
        const p = pc(midi);
        const n = op.slots.length;
        const cur = op.slots[s.index].chord;
        const lastBeat = s.running && s.started && s.beatInSlot >= op.slots[s.index].beats - 1;
        let ok = chordPcs(cur).includes(p);
        if (op.mode === 'wait') {
          s.acc.add(p);
          if (complete(s.acc, s.index)) advanceWait();
        } else if (s.running) {
          if (!s.started) {
            // Count-in: notes count towards the first chord.
            s.nextAcc.add(p);
            ok = chordPcs(op.slots[0].chord).includes(p);
          } else {
            s.acc.add(p);
            if (!s.hit && complete(s.acc, s.index)) {
              s.hit = true;
              op.mascot.markActive();
            }
            if (lastBeat) {
              s.nextAcc.add(p);
              if (!ok) ok = chordPcs(op.slots[(s.index + 1) % n].chord).includes(p);
            }
          }
        }
        return ok ? 'correct' : 'wrong';
      },
      noteOff(midi) {
        held.current.delete(midi);
      },
      releaseAll() {
        held.current.clear();
      },
    };
    return () => {
      o.inputRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.inputRef, active]);

  // ---- hints on the keys ----
  const { store, showKeys, paused, slots, voicings } = o;
  useEffect(() => {
    if (!active) return;
    const marks = new Map<number, Mark>();
    if (showKeys && !paused && slots[index]) {
      const chord = slots[index].chord;
      const degrees = QUALITIES[chord.quality].degrees;
      const pcs = chordPcs(chord);
      for (const m of voicings[index]) marks.set(m, { kind: 'next', label: degrees[pcs.indexOf(pc(m))] });
    }
    store.replaceMarks(marks, ['next']);
  }, [index, slots, voicings, showKeys, paused, store, active]);

  useEffect(
    () => () => {
      stop();
      store.clearMarks();
    },
    [stop, store],
  );

  return { index, results, pass, running, countIn, beat, summary, start, stop, reset };
}
