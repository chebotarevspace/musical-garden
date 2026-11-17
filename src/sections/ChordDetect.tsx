import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Spelled } from '../components/Spelled';
import { ActionButton, Field, PlayIcon } from '../components/ui/Controls';
import { useHotkeys } from '../hooks/useHotkeys';
import { INVERSION_NAMES, QUALITIES, chordFormula, chordRuName, chordSymbol } from '../lib/chords';
import { detectChords, intervalBySemitones, spellHeld } from '../lib/chordDetect';
import { playSequence } from '../lib/player';
import { ChordModeSwitch } from './ChordModeSwitch';
import { TheoryLink } from './TheoryLink';
import type { SectionProps } from './types';
import s from './Section.module.css';
import d from './ChordDetect.module.css';

const SHARP = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const RU = ['до', 'до-диез', 'ре', 'ми-бемоль', 'ми', 'фа', 'фа-диез', 'соль', 'ля-бемоль', 'ля', 'си-бемоль', 'си'];
const pc = (m: number) => ((m % 12) + 12) % 12;

/** "What am I playing?" — names any chord, interval or note you hold. */
export function ChordDetect({ settings, update, inputRef, mascot, setKeyboardRange }: SectionProps) {
  const held = useRef(new Set<number>());
  /** What is shown: the last non-empty set of keys (stays after you let go, so you can read it). */
  const [shown, setShown] = useState<number[]>([]);
  const [live, setLive] = useState(false);
  const peak = useRef<number[]>([]);

  useEffect(() => setKeyboardRange({ from: 2, to: 5 }), [setKeyboardRange]);

  const refresh = useCallback(() => {
    const now = [...held.current].sort((x, y) => x - y);
    setLive(now.length > 0);
    if (now.length === 0) {
      // Everything released: keep showing the fullest chord so it can be read.
      setShown(peak.current);
      peak.current = [];
      return;
    }
    if (now.length >= peak.current.length) peak.current = now;
    setShown(peak.current.length > now.length ? peak.current : now);
  }, []);

  useLayoutEffect(() => {
    inputRef.current = {
      noteOn(midi) {
        held.current.add(midi);
        refresh();
        mascot.markActive();
        return 'correct';
      },
      noteOff(midi) {
        held.current.delete(midi);
        refresh();
      },
      releaseAll() {
        held.current.clear();
        refresh();
      },
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef, refresh, mascot]);

  const matches = detectChords(shown);
  const best = matches[0]?.chord ?? null;
  const notes = spellHeld(shown, best);
  const distinct = [...new Set(shown.map(pc))];
  const replay = () => shown.length && playSequence([shown], 50, undefined, 1);

  useHotkeys({ KeyP: replay });

  let content: JSX.Element;
  if (shown.length === 0) {
    content = (
      <div className={d.empty}>
        <div className={d.emptyIcon} aria-hidden="true">
          <svg viewBox="0 0 48 48" width="48" height="48">
            <rect x="4" y="14" width="40" height="24" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M12 14v14M20 14v14M28 14v14M36 14v14" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        <h1 className={d.title}>Сыграйте что-нибудь</h1>
        <p className={s.subtitle}>
          Зажмите несколько клавиш — тренажёр назовёт аккорд, его обращение и ступени. Подходит, чтобы подбирать песни и
          проверять себя.
        </p>
      </div>
    );
  } else if (best) {
    content = (
      <>
        <div className={d.symbol} data-live={live || undefined}>
          <Spelled text={chordSymbol(best)} />
        </div>
        <div className={d.name}>
          {chordRuName(best)}
          {best.inversion > 0 && <span className={d.inv}> · {INVERSION_NAMES[best.inversion]}</span>}
        </div>
        <div className={d.notes}>
          {notes.map((n) => (
            <div key={n.midi} className={d.note} data-bass={n.midi === shown[0] || undefined}>
              <span className={d.degree}>{n.degree ?? '—'}</span>
              <Spelled text={n.name} className={d.noteName} />
            </div>
          ))}
          <div className={d.formula}>
            <span className={d.degree}>интервалы</span>
            <span>{chordFormula(best.quality)} полутона</span>
          </div>
        </div>
        {matches.length > 1 && (
          <p className={d.alt}>
            Эти же звуки можно назвать иначе:{' '}
            {matches.slice(1, 4).map((m, i) => (
              <span key={i}>
                {i > 0 && ', '}
                <Spelled text={chordSymbol(m.chord)} />
              </span>
            ))}
          </p>
        )}
        <p className={s.subtitle}>
          {QUALITIES[best.quality].degrees.length > 3 ? 'Септаккорд или аккорд с добавленной нотой.' : 'Трезвучие.'}{' '}
          {best.inversion > 0 ? `Внизу ${notes[0]?.name} — поэтому это обращение.` : 'Внизу основной тон — основной вид.'}
        </p>
      </>
    );
  } else if (distinct.length === 2) {
    const lo = shown[0];
    const hi = shown[shown.length - 1];
    const semis = hi - lo;
    const iv = intervalBySemitones(semis > 12 ? ((semis - 1) % 12) + 1 : semis);
    content = (
      <>
        <div className={d.symbol} data-live={live || undefined}>
          <Spelled text={`${SHARP[pc(lo)]}–${SHARP[pc(hi)]}`} />
        </div>
        <div className={d.name}>{iv ? `${iv.name[0].toUpperCase()}${iv.name.slice(1)} · ${semis} полутон${semis === 1 ? '' : semis < 5 ? 'а' : 'ов'}` : `${semis} полутонов`}</div>
        <p className={s.subtitle}>Это интервал — две ноты. Добавьте третью, чтобы получился аккорд.</p>
      </>
    );
  } else if (distinct.length === 1) {
    content = (
      <>
        <div className={d.symbol} data-live={live || undefined}>
          <Spelled text={SHARP[pc(shown[0])]} />
        </div>
        <div className={d.name}>
          Нота {RU[pc(shown[0])]}
          {shown.length > 1 ? ' в нескольких октавах' : ''}
        </div>
        <p className={s.subtitle}>Добавьте ещё ноты, чтобы получился аккорд.</p>
      </>
    );
  } else {
    content = (
      <>
        <div className={d.symbol} data-unknown>
          ?
        </div>
        <div className={d.name}>Такого аккорда нет в справочнике</div>
        <div className={d.notes}>
          {notes.map((n) => (
            <div key={n.midi} className={d.note}>
              <span className={d.degree}>нота</span>
              <Spelled text={n.name} className={d.noteName} />
            </div>
          ))}
        </div>
        <p className={s.subtitle}>Попробуйте убрать лишнюю ноту — возможно, получится знакомый аккорд.</p>
      </>
    );
  }

  return (
    <>
      <div className={s.controls}>
        <ChordModeSwitch settings={settings} update={update} />
        <span className={s.spacer} />
        <Field label=" ">
          <ActionButton onClick={replay} kbd="P">
            <PlayIcon /> Повторить звучание
          </ActionButton>
        </Field>
      </div>
      <main className={s.stage}>
        <TheoryLink settings={settings} update={update} />
        <div className={s.eyebrow}>Что я играю?</div>
        {content}
      </main>
    </>
  );
}
