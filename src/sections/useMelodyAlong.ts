/**
 * Melody play-along: play the song's melody note by note (at your own pace);
 * when you reach a new bar, the app plays that bar's chord as accompaniment.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { MascotApi } from '../hooks/useMascotMood';
import { noteStart, noteStop } from '../lib/audio';
import type { KeyStore, Mark } from '../lib/keyStore';
import { progress as learning } from '../lib/progress';
import type { MelodyNote } from '../lib/songs';
import type { SectionInput } from './types';

interface Options {
  notes: MelodyNote[];
  /** Voicing to accompany each bar with. */
  barChords: number[][];
  active: boolean;
  accompany: boolean;
  showKeys: boolean;
  store: KeyStore;
  inputRef: MutableRefObject<SectionInput | null>;
  mascot: MascotApi;
  onFinish(mistakes: number): void;
}

export function useMelodyAlong(o: Options) {
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const opts = useRef(o);
  opts.current = o;
  const st = useRef({ index: 0, mistakes: 0, sounding: [] as number[] });

  const stopAccomp = () => {
    st.current.sounding.forEach((m) => noteStop(m, 0.4));
    st.current.sounding = [];
  };
  const accompany = (bar: number) => {
    if (!opts.current.accompany) return;
    stopAccomp();
    const v = opts.current.barChords[bar] ?? [];
    v.forEach((m) => noteStart(m, 46));
    st.current.sounding = v;
  };

  const reset = useCallback(() => {
    stopAccomp();
    st.current.index = 0;
    st.current.mistakes = 0;
    setIndex(0);
    setMistakes(0);
    setWrong(false);
  }, []);

  useEffect(() => {
    reset();
  }, [o.notes, reset]);

  useLayoutEffect(() => {
    if (!o.active) return;
    o.inputRef.current = {
      noteOn(midi) {
        const s = st.current;
        const notes = opts.current.notes;
        if (s.index >= notes.length) return 'ignored';
        const target = notes[s.index];
        const ok = midi === target.midi;
        learning.recordItem(`note:melody:${target.midi}`, ok);
        if (!ok) {
          s.mistakes += 1;
          setMistakes(s.mistakes);
          setWrong(true);
          opts.current.mascot.react('oops');
          return 'wrong';
        }
        setWrong(false);
        const prevBar = s.index === 0 ? -1 : notes[s.index - 1].bar;
        if (target.bar !== prevBar) accompany(target.bar);
        s.index += 1;
        setIndex(s.index);
        if (s.index >= notes.length) {
          window.setTimeout(stopAccomp, 1200);
          opts.current.onFinish(s.mistakes);
          opts.current.mascot.react('celebrate', 10);
        } else opts.current.mascot.markActive();
        return 'correct';
      },
      noteOff() {},
      releaseAll() {},
    };
    return () => {
      o.inputRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.active, o.inputRef]);

  // Next melody note on the keyboard.
  const { store, active, showKeys, notes } = o;
  useEffect(() => {
    if (!active) return;
    const marks = new Map<number, Mark>();
    if (showKeys && notes[index]) marks.set(notes[index].midi, { kind: 'next' });
    store.replaceMarks(marks, ['next']);
  }, [active, showKeys, notes, index, store]);

  useEffect(() => stopAccomp, []);

  return { index, wrong, mistakes, done: index >= o.notes.length, reset };
}
