import { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { CircleOfFifths } from '../components/CircleOfFifths';
import { Spelled } from '../components/Spelled';
import { ActionButton, Field, PlayIcon } from '../components/ui/Controls';
import { useHotkeys } from '../hooks/useHotkeys';
import { chordSymbol, chordVoicing, pcOf, ruNoteName, noteText } from '../lib/chords';
import { DIATONIC_NUMERALS, diatonicChords, findCircleKey, neighbours, signature } from '../lib/circle';
import type { Mark } from '../lib/keyStore';
import { playSequence } from '../lib/player';
import { scaleOf } from '../lib/progressions';
import { ChordModeSwitch } from './ChordModeSwitch';
import { TheoryLink } from './TheoryLink';
import type { SectionProps } from './types';
import s from './Section.module.css';
import c from './ChordCircle.module.css';

const pc = (m: number) => ((m % 12) + 12) % 12;
const DEGREES = ['1', '2', '3', '4', '5', '6', '7'];

/** Circle of fifths as a tool: keys, signatures, the seven chords of each key. */
export function ChordCircle({ store, settings, update, inputRef, mascot, setKeyboardRange }: SectionProps) {
  const key = findCircleKey(settings.circleKey);
  const scale = useMemo(() => scaleOf(key.major.tonic, false), [key]);
  const chords = useMemo(() => diatonicChords(key.major), [key]);
  const { iv, v } = neighbours(key.major.id);
  const sig = signature(key);
  const scalePcs = scale.map(pcOf);
  const tonicMidi = 60 + scalePcs[0] - (scalePcs[0] > 6 ? 12 : 0);
  // Ascending scale from the tonic around middle C.
  const scaleMidis = scalePcs.map((p) => tonicMidi + ((p - scalePcs[0] + 12) % 12));

  useEffect(() => setKeyboardRange({ from: 3, to: 5 }), [setKeyboardRange]);

  // Scale tones on the keyboard, labelled with their degree.
  useEffect(() => {
    const marks = new Map<number, Mark>();
    scaleMidis.forEach((m, i) => marks.set(m, { kind: 'next', label: DEGREES[i] }));
    store.replaceMarks(marks, ['next']);
  }, [scaleMidis.join(','), store]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => store.clearMarks(), [store]);

  // Keys inside the key light up green, outside — red: you hear and see what "belongs".
  useLayoutEffect(() => {
    inputRef.current = {
      noteOn(midi) {
        mascot.markActive();
        return scalePcs.includes(pc(midi)) ? 'correct' : 'wrong';
      },
      noteOff() {},
      releaseAll() {},
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef, mascot, scalePcs.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (midis: number[]) => {
    store.clearMarks(['demo']);
    midis.forEach((m) => store.setMark(m, { kind: 'demo' }));
    window.setTimeout(() => midis.forEach((m) => store.setMark(m, null)), 1100);
  };

  const playScale = useCallback(() => {
    const notes = [...scaleMidis, scaleMidis[0] + 12];
    playSequence(
      notes.map((m) => [m]),
      180,
      (i) => {
        store.clearMarks(['demo']);
        if (i !== null) store.setMark(notes[i], { kind: 'demo' });
      },
      0.85,
    );
  }, [scaleMidis, store]);

  const playChord = (i: number) => {
    const vce = chordVoicing(chords[i]);
    playSequence([vce], 50, undefined, 1.1);
    flash(vce);
  };

  useHotkeys({ KeyP: playScale });

  const sigText =
    sig.length === 0 ? 'без знаков при ключе' : `${sig.length} ${key.accidentals > 0 ? (sig.length === 1 ? 'диез' : sig.length < 5 ? 'диеза' : 'диезов') : sig.length === 1 ? 'бемоль' : sig.length < 5 ? 'бемоля' : 'бемолей'}`;

  return (
    <>
      <div className={s.controls}>
        <ChordModeSwitch settings={settings} update={update} />
        <span className={s.spacer} />
        <Field label=" ">
          <div className={c.buttons}>
            <ActionButton onClick={playScale} kbd="P">
              <PlayIcon /> Гамма
            </ActionButton>
            <ActionButton
              primary
              onClick={() => update({ chordMode: 'progressions', progressionId: 'i-iv-v', progKey: key.major.id })}
              title="Открыть последовательность I–IV–V–I в этой тональности"
            >
              I–IV–V–I в <Spelled text={key.major.label} />
            </ActionButton>
          </div>
        </Field>
      </div>

      <main className={`${s.stage} ${c.stage}`}>
        <TheoryLink settings={settings} update={update} />
        <div className={c.layout}>
          <CircleOfFifths value={key.major.id} onSelect={(circleKey) => update({ circleKey })} size={360} />
          <div className={c.info}>
            <div className={s.eyebrow}>Тональность</div>
            <h1 className={c.title}>
              {ruNoteName(key.major.tonic)} мажор <span className={c.sym}>· <Spelled text={key.major.label} /></span>
            </h1>
            <p className={c.sub}>
              {sigText}
              {sig.length > 0 && (
                <>
                  : <Spelled text={sig.join(' ')} />
                </>
              )}{' '}
              · параллельный минор — <Spelled text={key.minor.label} />
            </p>

            <div className={c.label}>Гамма</div>
            <div className={c.scale}>
              {scale.map((n, i) => (
                <span key={i} className={c.note} data-acc={n.alter !== 0 || undefined}>
                  <small>{DEGREES[i]}</small>
                  <Spelled text={noteText(n)} />
                </span>
              ))}
            </div>

            <div className={c.label}>Аккорды тональности</div>
            <div className={c.chords}>
              {chords.map((ch, i) => (
                <button key={i} type="button" className={c.chord} data-main={[0, 3, 4].includes(i) || undefined} onClick={() => playChord(i)}>
                  <small>{DIATONIC_NUMERALS[i]}</small>
                  <Spelled text={chordSymbol(ch)} />
                </button>
              ))}
            </div>
            <p className={c.tip}>
              Главные аккорды — <b>I, IV и V</b> — соседи по кругу: <Spelled text={iv.major.label} /> слева и <Spelled text={v.major.label} /> справа
              от <Spelled text={key.major.label} />. Шаг по часовой стрелке — квинта вверх и на один диез больше.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
