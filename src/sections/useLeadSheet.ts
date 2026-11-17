/**
 * Lead-sheet play-along: the right hand plays the melody, the left holds the chords.
 * At your own pace — the song waits until both hands have played their part of each step.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { MascotApi } from '../hooks/useMascotMood';
import { chordPcs } from '../lib/chords';
import type { KeyStore, Mark } from '../lib/keyStore';
import { type LeftHand, chordHeld, leadSteps, leftVoicing, splitPoint } from '../lib/leadSheet';
import { progress as learning } from '../lib/progress';
import type { SongPlan } from '../lib/songs';
import type { SectionInput } from './types';

interface Options {
  plan: SongPlan;
  voicings: number[][];
  active: boolean;
  left: LeftHand;
  showKeys: boolean;
  store: KeyStore;
  inputRef: MutableRefObject<SectionInput | null>;
  mascot: MascotApi;
  onFinish(mistakes: number): void;
}

export function useLeadSheet(o: Options) {
  const steps = useMemo(() => leadSteps(o.plan), [o.plan]);
  const split = useMemo(() => splitPoint(o.plan.melody), [o.plan]);
  const [index, setIndex] = useState(0);
  const [noteDone, setNoteDone] = useState(false);
  const [held, setHeld] = useState<number[]>([]);
  const [wrong, setWrong] = useState<'right' | 'left' | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const opts = useRef({ ...o, steps, split });
  opts.current = { ...o, steps, split };
  const st = useRef({ i: 0, noteDone: false, held: new Set<number>(), mistakes: 0 });

  const sync = () => {
    const s = st.current;
    setIndex(s.i);
    setNoteDone(s.noteDone);
    setHeld([...s.held]);
  };

  const reset = useCallback(() => {
    const s = st.current;
    s.i = 0;
    s.noteDone = false;
    s.held.clear();
    s.mistakes = 0;
    setMistakes(0);
    setWrong(null);
    sync();
  }, []);

  useEffect(() => {
    reset();
  }, [o.plan, o.left, reset]);

  /** Move on past every step both hands have already satisfied. */
  const advance = () => {
    const s = st.current;
    const { steps: list, plan, left } = opts.current;
    const before = s.i;
    while (s.i < list.length) {
      const step = list[s.i];
      const needNote = step.note >= 0 && !s.noteDone;
      const needChord = step.slot >= 0 && !chordHeld(s.held, plan.slots[step.slot].chord, left);
      if (needNote || needChord) break;
      s.i += 1;
      s.noteDone = false;
    }
    if (s.i >= list.length && before < list.length) {
      opts.current.onFinish(s.mistakes);
      learning.count('lead:songs');
      opts.current.mascot.react('celebrate', 10);
    } else if (s.i > before) opts.current.mascot.markActive();
  };

  useLayoutEffect(() => {
    if (!o.active) return;
    o.inputRef.current = {
      noteOn(midi) {
        const s = st.current;
        const { steps: list, plan, split: sp } = opts.current;
        if (s.i >= list.length) return 'ignored';
        const step = list[s.i];
        if (midi < sp) {
          // Left hand: a tone of this step's chord — or of the next chord change, played a touch early.
          const next = list.slice(s.i + 1).find((x) => x.slot >= 0);
          const ok = [step.chordSlot, next?.slot ?? -1].some((k) => k >= 0 && chordPcs(plan.slots[k].chord).includes(((midi % 12) + 12) % 12));
          if (!ok) {
            s.mistakes += 1;
            setMistakes(s.mistakes);
            setWrong('left');
            opts.current.mascot.react('oops');
            return 'wrong';
          }
          s.held.add(midi);
          setWrong(null);
          advance();
          sync();
          return 'correct';
        }
        const target = step.note >= 0 && !s.noteDone ? plan.melody[step.note] : null;
        if (target) learning.recordItem(`note:melody:${target.midi}`, midi === target.midi);
        if (!target || midi !== target.midi) {
          s.mistakes += 1;
          setMistakes(s.mistakes);
          setWrong('right');
          opts.current.mascot.react('oops');
          return 'wrong';
        }
        s.noteDone = true;
        setWrong(null);
        advance();
        sync();
        return 'correct';
      },
      noteOff(midi) {
        const s = st.current;
        if (s.held.delete(midi)) setHeld([...s.held]);
      },
      releaseAll() {
        st.current.held.clear();
        setHeld([]);
      },
    };
    return () => {
      o.inputRef.current = null;
    };
     
  }, [o.active, o.inputRef]);

  const step = steps[Math.min(index, steps.length - 1)];
  const done = index >= steps.length;
  const chord = step ? o.plan.slots[step.chordSlot].chord : null;
  const leftKeys = useMemo(
    () => (step ? leftVoicing(o.voicings[step.chordSlot] ?? [], split, o.left) : []),
    [step, o.voicings, split, o.left],
  );
  const chordOk = !!chord && chordHeld(held, chord, o.left);
  const nextNote = done ? null : step.note >= 0 && !noteDone ? o.plan.melody[step.note] : null;

  // Hints on the keyboard: the next melody note, and where the left hand can take the chord.
  const { store, active, showKeys } = o;
  useEffect(() => {
    if (!active) return;
    const marks = new Map<number, Mark>();
    if (showKeys && !done) {
      if (!chordOk) for (const m of leftKeys) marks.set(m, { kind: 'hint' });
      if (nextNote) marks.set(nextNote.midi, { kind: 'next' });
    }
    store.replaceMarks(marks, ['next', 'hint']);
  }, [active, showKeys, done, chordOk, leftKeys, nextNote, store]);

  return { steps, index, step, done, noteDone, chord, chordOk, leftKeys, nextNote, split, wrong, mistakes, reset };
}
