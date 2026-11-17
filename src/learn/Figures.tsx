import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { AccidentalGlyph } from '../components/AccidentalGlyph';
import { Spelled } from '../components/Spelled';
import { noteStart, noteStop, primeAudio } from '../lib/audio';
import { playSequence, stopSequence } from '../lib/player';
import { buildKeyboardLayout, countWhite } from '../lib/keyboardLayout';
import { isBlack, midiToCode, pitchClass } from '../lib/notes';
import { type Clef, ledgerSteps, staffStep } from '../lib/staff';
import type { Settings } from '../lib/storage';
import { playAccompaniment, stopAccompaniment } from '../lib/accompany';
import { parseChord } from '../lib/chordSymbols';
import { type Role, findPattern } from '../lib/patterns';
import { voiceLead } from '../lib/progressions';
import { CircleOfFifths } from '../components/CircleOfFifths';
import { chordSymbol } from '../lib/chords';
import { diatonicChords, findCircleKey, signature } from '../lib/circle';
import { useLearn } from './context';
import { midiOf, noteFromCode, voicingOf } from './music';
import f from './Figures.module.css';

export type Tone = 'accent' | 'blue' | 'green' | 'gold' | 'muted';

/* ------------------------------------------------------------------ */
/* Playback helpers                                                     */
/* ------------------------------------------------------------------ */

export { playSequence };

function usePlayer() {
  const [step, setStep] = useState<number | null>(null);
  useEffect(() => () => stopSequence(), []);
  const play = (steps: number[][], bpm?: number, hold?: number) => {
    if (step !== null) {
      stopSequence();
      setStep(null);
      return;
    }
    playSequence(steps, bpm, setStep, hold);
  };
  return { step, play, playing: step !== null };
}

export function PlayButton({ onClick, playing, children = 'Послушать' }: { onClick(): void; playing?: boolean; children?: ReactNode }) {
  return (
    <button type="button" className={f.play} data-playing={playing || undefined} onClick={onClick}>
      {playing ? (
        <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
          <rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
          <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
        </svg>
      )}
      {playing ? 'Стоп' : children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Figure frame                                                         */
/* ------------------------------------------------------------------ */

type Steps = (string | number)[][];
const toMidis = (steps: Steps) => steps.map((s) => s.map(midiOf));

export function Figure({
  children,
  caption,
  play,
  bpm,
  hold,
  playLabel,
  wide,
}: {
  children: ReactNode;
  caption?: ReactNode;
  play?: Steps;
  bpm?: number;
  hold?: number;
  playLabel?: string;
  wide?: boolean;
}) {
  const player = usePlayer();
  return (
    <figure className={f.figure} data-wide={wide || undefined}>
      {play && (
        <div className={f.figureBar}>
          <PlayButton playing={player.playing} onClick={() => player.play(toMidis(play), bpm, hold)}>
            {playLabel ?? 'Послушать'}
          </PlayButton>
        </div>
      )}
      <div className={f.figureBody}>{children}</div>
      {caption && <figcaption className={f.caption}>{caption}</figcaption>}
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Keyboard diagram                                                     */
/* ------------------------------------------------------------------ */

export interface KeyMark {
  label?: string;
  tone?: Tone;
}

const RU = ['до', '', 'ре', '', 'ми', 'фа', '', 'соль', '', 'ля', '', 'си'];
const EN = ['C', '', 'D', '', 'E', 'F', '', 'G', '', 'A', '', 'B'];

export function Keys({
  from,
  to,
  marks = {},
  names = 'none',
  keyWidth = 26,
  maxWidth,
}: {
  from: string | number;
  to: string | number;
  marks?: Record<string | number, KeyMark>;
  /** Labels on white keys. */
  names?: 'none' | 'ru' | 'en' | 'both' | 'c';
  keyWidth?: number;
  maxWidth?: number;
}) {
  let lo = midiOf(from);
  let hi = midiOf(to);
  if (isBlack(lo)) lo--;
  if (isBlack(hi)) hi++;
  const whites = countWhite(lo, hi);
  const keys = buildKeyboardLayout({ lo, hi, slots: whites, offset: 0 });
  const W = whites * keyWidth;
  const H = keyWidth * 4.3;
  const BH = H * 0.62;
  const byMidi = new Map<number, KeyMark>();
  for (const [k, v] of Object.entries(marks)) byMidi.set(midiOf(/^\d+$/.test(k) ? Number(k) : k), v);
  const [down, setDown] = useState<number | null>(null);

  const press = (m: number) => {
    primeAudio();
    setDown(m);
    noteStart(m, 80);
  };
  const release = () => {
    if (down !== null) noteStop(down, 0.3);
    setDown(null);
  };

  const keyEl = (k: (typeof keys)[number]) => {
    const x = (k.left / 100) * W;
    const w = (k.width / 100) * W;
    const mark = byMidi.get(k.midi);
    const pc = pitchClass(k.midi);
    let name: string | null = null;
    if (!k.black) {
      if (names === 'ru') name = RU[pc];
      else if (names === 'en') name = EN[pc];
      else if (names === 'both') name = `${EN[pc]}`;
      else if (names === 'c' && pc === 0) name = midiToCode(k.midi);
    }
    return (
      <g
        key={k.midi}
        className={f.key}
        data-black={k.black || undefined}
        data-tone={mark?.tone ?? (mark ? 'accent' : undefined)}
        data-down={down === k.midi || undefined}
        onPointerDown={(e) => {
          e.preventDefault();
          press(k.midi);
        }}
        onPointerUp={release}
        onPointerLeave={release}
      >
        <rect x={x + (k.black ? 0 : 0.5)} y={0} width={w - (k.black ? 0 : 1)} height={k.black ? BH : H} rx={k.black ? 2.5 : 4} />
        {mark?.label && (
          <g className={f.badge}>
            <circle cx={x + w / 2} cy={(k.black ? BH : H) - (k.black ? 12 : 30)} r={k.black ? 8.5 : 10} />
            <text x={x + w / 2} y={(k.black ? BH : H) - (k.black ? 12 : 30)}>
              {mark.label}
            </text>
          </g>
        )}
        {name && (
          <text className={f.keyName} x={x + w / 2} y={H - 9}>
            {name}
          </text>
        )}
        {names === 'both' && !k.black && (
          <text className={f.keyNameRu} x={x + w / 2} y={H + 14}>
            {RU[pc]}
          </text>
        )}
      </g>
    );
  };

  return (
    <svg
      className={f.keys}
      viewBox={`-1 -1 ${W + 2} ${H + (names === 'both' ? 20 : 2)}`}
      style={{ maxWidth: maxWidth ?? W * 1.15 }}
      role="img"
      aria-label="Клавиатура"
    >
      {keys.filter((k) => !k.black).map(keyEl)}
      {keys.filter((k) => k.black).map(keyEl)}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Staff diagram                                                        */
/* ------------------------------------------------------------------ */

export interface StaffItem {
  notes: string[];
  label?: string;
  tone?: Tone;
}

const GAP = 10;
const K = GAP / 12;

function clefText(clef: Clef, bottom: number, x: number) {
  return clef === 'treble' ? (
    <text className={f.clef} x={x} y={bottom + 1.3 * K} fontSize={GAP * 4.33}>
      𝄞
    </text>
  ) : (
    <text className={f.clef} x={x} y={bottom - 4.7 * K} fontSize={GAP * 4.05}>
      𝄢
    </text>
  );
}

export function StaffFig({
  clef,
  items,
  highlight,
  itemWidth = 46,
}: {
  clef: 'treble' | 'bass' | 'grand';
  items: StaffItem[];
  highlight?: 'lines' | 'spaces';
  itemWidth?: number;
}) {
  const maskId = useId();
  const grand = clef === 'grand';
  const bottoms: Record<Clef, number> = grand ? { treble: 80, bass: 180 } : { treble: 90, bass: 90 };
  const staves: Clef[] = grand ? ['treble', 'bass'] : [clef as Clef];
  const startX = 62;
  const W = startX + items.length * itemWidth + 14;
  const lastBottom = grand ? bottoms.bass : bottoms[clef as Clef];
  const labelY = lastBottom + 44;
  const H = labelY + 10;
  const [active, setActive] = useState<number | null>(null);

  const playItem = (i: number) => {
    primeAudio();
    setActive(i);
    playSequence([items[i].notes.map(midiOf)], 90, (s) => s === null && setActive(null), 1.1);
  };

  return (
    <svg className={f.staff} viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W * 1.6 }} role="img" aria-label="Нотный стан">
      <defs>
        <mask id={maskId} maskContentUnits="userSpaceOnUse">
          <rect x="-20" y="-20" width="40" height="40" fill="white" />
          <ellipse rx={3.5} ry={3.9} transform="rotate(-38)" fill="black" />
        </mask>
      </defs>
      {staves.map((c) => {
        const b = bottoms[c];
        return (
          <g key={c}>
            {highlight === 'spaces' &&
              [0, 1, 2, 3].map((i) => <rect key={i} className={f.spaceHi} x={8} y={b - (i + 1) * GAP} width={W - 16} height={GAP} />)}
            {[0, 1, 2, 3, 4].map((i) => (
              <line key={i} className={highlight === 'lines' ? f.lineHi : f.line} x1={8} x2={W - 8} y1={b - i * GAP} y2={b - i * GAP} />
            ))}
            {clefText(c, b, 13)}
          </g>
        );
      })}
      {grand && <line className={f.line} x1={8} x2={8} y1={bottoms.treble - 4 * GAP} y2={bottoms.bass} />}

      {items.map((it, i) => {
        const x = startX + i * itemWidth + itemWidth / 2;
        const notes = it.notes.map(noteFromCode);
        const placed = notes
          .map((n) => {
            const c: Clef = grand ? (n.midi >= 60 ? 'treble' : 'bass') : (clef as Clef);
            const step = staffStep(n, c);
            return { n, c, step, y: bottoms[c] - step * (GAP / 2) };
          })
          .sort((a, b) => b.y - a.y);
        // Neighbouring notes (a second apart) sit side by side.
        const shifted = placed.map((p, j) => j > 0 && placed[j - 1].c === p.c && p.step - placed[j - 1].step === 1);
        return (
          <g key={i} className={f.staffItem} data-tone={it.tone} data-active={active === i || undefined} onClick={() => playItem(i)}>
            <rect className={f.hit} x={x - itemWidth / 2} y={0} width={itemWidth} height={labelY - 14} />
            {placed.map((p, j) =>
              ledgerSteps(p.step).map((k) => (
                <line key={`${j}-${k}`} className={f.ledger} x1={x - 11} x2={x + 11 + (shifted[j] ? 12 : 0)} y1={bottoms[p.c] - k * (GAP / 2)} y2={bottoms[p.c] - k * (GAP / 2)} />
              )),
            )}
            {placed.map((p, j) => {
              const hx = x + (shifted[j] ? 12 : 0);
              return (
                <g key={j}>
                  {p.n.accidental !== 'natural' && (
                    <AccidentalGlyph
                      kind={p.n.accidental}
                      className={f.acc}
                      x={x - 26 - j * 0}
                      y={p.n.accidental === 'sharp' ? p.y - 12 : p.y - 17}
                      width={p.n.accidental === 'sharp' ? 14.5 : 13.5}
                      height={24}
                    />
                  )}
                  <ellipse className={f.head} cx={0} cy={0} rx={7.2} ry={5.1} transform={`translate(${hx} ${p.y})`} mask={`url(#${maskId})`} />
                </g>
              );
            })}
            {it.label && (
              <text className={f.staffLabel} x={x} y={labelY}>
                {it.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Rhythm: note durations                                               */
/* ------------------------------------------------------------------ */

function NoteGlyph({ kind }: { kind: 'whole' | 'half' | 'quarter' | 'eighth' }) {
  const filled = kind === 'quarter' || kind === 'eighth';
  return (
    <svg viewBox="0 0 30 48" width="22" height="36" aria-hidden="true" className={f.glyph}>
      <ellipse cx="11" cy="38" rx="8" ry="5.6" transform="rotate(-22 11 38)" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 2.4} />
      {kind !== 'whole' && <line x1="18.2" y1="36" x2="18.2" y2="6" stroke="currentColor" strokeWidth="2" />}
      {kind === 'eighth' && <path d="M18.2 6c2 6 9 8 8 18-1-5-4-8-8-9z" fill="currentColor" />}
    </svg>
  );
}

export function Durations() {
  const rows = [
    { kind: 'whole' as const, name: 'Целая', beats: 4, count: 'раз-и-два-и-три-и-четыре-и' },
    { kind: 'half' as const, name: 'Половинная', beats: 2, count: 'раз-и-два-и' },
    { kind: 'quarter' as const, name: 'Четвертная', beats: 1, count: 'раз' },
    { kind: 'eighth' as const, name: 'Восьмая', beats: 0.5, count: '«раз» или «и»' },
  ];
  return (
    <div className={f.durations}>
      <div className={f.durHead}>
        <span />
        <span />
        {[1, 2, 3, 4].map((b) => (
          <span key={b} className={f.durBeat}>
            {b}
          </span>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.kind} className={f.durRow}>
          <NoteGlyph kind={r.kind} />
          <span className={f.durName}>
            {r.name}
            <small>{r.beats >= 1 ? `${r.beats} ${r.beats === 1 ? 'доля' : 'доли'}` : '½ доли'}</small>
          </span>
          <div className={f.durTrack}>
            {Array.from({ length: Math.round(4 / r.beats) }, (_, i) => (
              <span key={i} className={f.durBar} style={{ gridColumn: `span ${r.beats * 2}` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scale steps (Т/П formula on the keyboard)                            */
/* ------------------------------------------------------------------ */

export function ScaleSteps({ root, pattern, from, to, names = 'en' }: { root: string; pattern: string; from?: string; to?: string; names?: 'en' | 'ru' | 'none' }) {
  const start = midiOf(root);
  const notes = [start];
  for (const ch of pattern) notes.push(notes[notes.length - 1] + (ch === 'Т' ? 2 : 1));
  const marks: Record<number, KeyMark> = {};
  notes.forEach((m, i) => (marks[m] = { label: String(i + 1), tone: i === 0 || i === notes.length - 1 ? 'accent' : 'blue' }));
  const player = usePlayer();
  return (
    <figure className={f.figure}>
      <div className={f.figureBar}>
        <PlayButton playing={player.playing} onClick={() => player.play(notes.map((m) => [m]), 150, 0.85)} />
      </div>
      <div className={f.figureBody}>
        <Keys from={from ?? notes[0]} to={to ?? notes[notes.length - 1]} marks={marks} names={names} />
        <div className={f.stepsRow}>
          {pattern.split('').map((ch, i) => (
            <span key={i} className={f.stepChip} data-semi={ch === 'П' || undefined}>
              {ch === 'Т' ? 'тон' : 'полутон'}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Chords                                                                */
/* ------------------------------------------------------------------ */

/** Row of chord cards (symbol + mini keyboard); plays as a progression. */
export function ChordRow({ chords, bpm = 52, caption, numerals, smooth }: { chords: string[]; bpm?: number; caption?: ReactNode; numerals?: string[]; /** Voice-led: the nearest inversion each time. */ smooth?: boolean }) {
  const player = usePlayer();
  const voicings = smooth ? voiceLead(chords.map(parseChord)) : chords.map(voicingOf);
  const lo = Math.min(...voicings.flat());
  const hi = Math.max(...voicings.flat());
  const from = lo - (pitchClass(lo) === 0 ? 0 : pitchClass(lo) <= 4 ? pitchClass(lo) : pitchClass(lo) - 5);
  return (
    <figure className={f.figure} data-wide>
      <div className={f.figureBar}>
        <PlayButton playing={player.playing} onClick={() => player.play(voicings, bpm, 0.92)}>
          Сыграть последовательность
        </PlayButton>
      </div>
      <div className={f.chordRow}>
        {chords.map((c, i) => (
          <button
            key={i}
            type="button"
            className={f.chordCard}
            data-active={player.step === i || undefined}
            onClick={() => playSequence([voicings[i]], 60, undefined, 1.2)}
          >
            {numerals && <span className={f.numeral}>{numerals[i]}</span>}
            <Spelled text={c} className={f.chordSym} />
            <Keys
              from={from}
              to={Math.max(hi, from + 11)}
              keyWidth={11}
              maxWidth={140}
              marks={Object.fromEntries(voicings[i].map((m) => [m, { tone: 'accent' as Tone }]))}
            />
          </button>
        ))}
      </div>
      {caption && <figcaption className={f.caption}>{caption}</figcaption>}
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Callouts, practice links, misc                                       */
/* ------------------------------------------------------------------ */

const CALLOUT: Record<string, { icon: string; title: string }> = {
  remember: { icon: '★', title: 'Запомните' },
  tip: { icon: '💡', title: 'Подсказка' },
  try: { icon: '♪', title: 'Попробуйте' },
  warn: { icon: '!', title: 'Частая ошибка' },
};

export function Callout({ kind, title, children }: { kind: keyof typeof CALLOUT; title?: string; children: ReactNode }) {
  return (
    <aside className={f.callout} data-kind={kind}>
      <span className={f.calloutIcon} aria-hidden="true">
        {CALLOUT[kind].icon}
      </span>
      <div>
        <div className={f.calloutTitle}>{title ?? CALLOUT[kind].title}</div>
        <div className={f.calloutBody}>{children}</div>
      </div>
    </aside>
  );
}

const SECTION_NAME: Record<string, string> = { notes: 'Ноты', fluency: 'Беглость', chords: 'Аккорды', ear: 'Слух', songs: 'Песни' };

export function Practice({ to, title, children }: { to: Partial<Settings>; title: string; children?: ReactNode }) {
  const { openPractice } = useLearn();
  return (
    <div className={f.practice}>
      <div className={f.practiceIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <rect x="2" y="6" width="20" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M7 6v8M12 6v8M17 6v8" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      </div>
      <div className={f.practiceText}>
        <div className={f.practiceEyebrow}>Практика в тренажёре · {SECTION_NAME[to.section ?? 'notes']}</div>
        <div className={f.practiceTitle}>{title}</div>
        {children && <div className={f.practiceBody}>{children}</div>}
      </div>
      <button type="button" className={f.practiceBtn} onClick={() => openPractice(to)}>
        Открыть →
      </button>
    </div>
  );
}

/** Inline note name with real ♯/♭ glyphs. */
export const N = ({ children }: { children: string }) => <Spelled text={children} className={f.inlineNote} />;

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={f.kbd}>{children}</kbd>;
}

/** Simple timeline for practice plans. */
export function Timeline({ items }: { items: { minutes: number; title: string; text: string }[] }) {
  const total = items.reduce((a, b) => a + b.minutes, 0);
  return (
    <div className={f.timeline}>
      <div className={f.timelineBar}>
        {items.map((it, i) => (
          <span key={i} style={{ flexGrow: it.minutes }} data-i={i % 4}>
            {it.minutes} мин
          </span>
        ))}
      </div>
      <ol className={f.timelineList}>
        {items.map((it, i) => (
          <li key={i} data-i={i % 4}>
            <strong>{it.title}</strong> — {it.text}
          </li>
        ))}
      </ol>
      <div className={f.timelineTotal}>Итого: {total} минут</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accompaniment pattern: rhythm grid + keyboard + playback             */
/* ------------------------------------------------------------------ */

const ROLE_LABEL: Record<Role, string> = { B: 'Б', B5: '5', B8: '8', C: 'аккорд', T0: '1', T1: '3', T2: '5', T3: '7' };

export function PatternFig({ id, chords, meter = 4, bpm = 80, caption }: { id: string; chords: string[]; meter?: 3 | 4; bpm?: number; caption?: ReactNode }) {
  const pattern = findPattern(id);
  const parsed = chords.map(parseChord);
  const voicings = voiceLead(parsed);
  const [lit, setLit] = useState<Set<number>>(new Set());
  const [slot, setSlot] = useState<number | null>(null);
  useEffect(() => () => stopAccompaniment(), []);
  const play = () => {
    if (slot !== null) {
      stopAccompaniment();
      setSlot(null);
      setLit(new Set());
      return;
    }
    playAccompaniment(
      parsed.map((chord) => ({ chord, beats: meter })),
      voicings,
      pattern,
      meter,
      bpm,
      {
        onSlot: (i) => {
          setSlot(i);
          if (i === null) setLit(new Set());
        },
        onNote: (m, on) =>
          setLit((cur) => {
            const next = new Set(cur);
            if (on) next.add(m);
            else next.delete(m);
            return next;
          }),
      },
    );
  };
  const events = meter === 3 ? pattern.bar3 : pattern.bar4;
  const cells = meter * 2;
  const row = (left: boolean) =>
    events
      .map((e) => ({ ...e, roles: e.roles.filter((r) => r.startsWith('B') === left) }))
      .filter((e) => e.roles.length);
  return (
    <figure className={f.figure} data-wide>
      <div className={f.figureBar}>
        <PlayButton playing={slot !== null} onClick={play}>
          Послушать «{pattern.title}»
        </PlayButton>
      </div>
      <div className={f.figureBody}>
        <div className={f.patternGrid} style={{ gridTemplateColumns: `56px repeat(${cells}, 1fr)` }}>
          <span />
          {Array.from({ length: cells }, (_, i) => (
            <span key={i} className={f.patternBeat} data-beat={i % 2 === 0 || undefined}>
              {i % 2 === 0 ? i / 2 + 1 : 'и'}
            </span>
          ))}
          {(['R', 'L'] as const).map((hand) => (
            <div key={hand} className={f.patternRow} style={{ gridColumn: `1 / span ${cells + 1}`, gridTemplateColumns: `56px repeat(${cells}, 1fr)` }}>
              <span className={f.patternHand}>{hand === 'R' ? 'Правая' : 'Левая'}</span>
              {row(hand === 'L').map((e, i) => (
                <span key={i} className={f.patternCell} data-hand={hand} style={{ gridColumn: `${e.at + 2} / span ${e.len}` }}>
                  {e.roles.map((r) => ROLE_LABEL[r]).join(' ')}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className={f.patternChords}>
          {chords.map((c, i) => (
            <span key={i} className={f.patternChord} data-active={slot === i || undefined}>
              <Spelled text={c} />
            </span>
          ))}
        </div>
        <Keys
          from={36}
          to={Math.max(...voicings.flat()) + 2}
          keyWidth={14}
          maxWidth={720}
          names="c"
          marks={Object.fromEntries([...lit].map((m) => [m, { tone: (m < 52 ? 'green' : 'accent') as Tone }]))}
        />
      </div>
      <figcaption className={f.caption}>{caption ?? pattern.description}</figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Circle of fifths (light) with the selected key's main chords          */
/* ------------------------------------------------------------------ */

export function CircleFig({ start = 'C', caption }: { start?: string; caption?: ReactNode }) {
  const [keyId, setKeyId] = useState(start);
  const k = findCircleKey(keyId);
  const chords = diatonicChords(k.major);
  const sig = signature(k);
  return (
    <figure className={f.figure} data-wide>
      <div className={f.circleFig}>
        <CircleOfFifths value={keyId} onSelect={setKeyId} theme="light" size={320} />
        <div className={f.circleInfo}>
          <div className={f.circleKey}>
            <Spelled text={k.major.label} /> мажор · <Spelled text={k.minor.label} />
          </div>
          <div className={f.circleSig}>{sig.length ? <Spelled text={`${sig.length} ${k.accidentals > 0 ? '♯' : '♭'}: ${sig.join(' ')}`} /> : 'без знаков'}</div>
          <ChordRow chords={[0, 3, 4, 5].map((i) => chordSymbol(chords[i]))} numerals={['I', 'IV', 'V', 'vi']} bpm={52} />
        </div>
      </div>
      <figcaption className={f.caption}>{caption ?? 'Нажимайте на тональности: меняются знаки при ключе и главные аккорды.'}</figcaption>
    </figure>
  );
}
