import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { PHRASES, pick, streakPhrase } from './mascotPhrases';
import { Hat } from './garden/GardenerArt';
import { TICKLE, randomLine } from '../lib/gardener';
import s from './Mascot.module.css';

export type MascotMood = 'idle' | 'happy' | 'oops' | 'celebrate' | 'sleepy' | 'thinking';

interface Props {
  mood: MascotMood;
  /** Changes on every reaction so the same mood can replay its animation. */
  moodId: number;
  streak: number;
  /** A line that must be said now (e.g. first switch to ♯/♭ mode). */
  speech?: { text: string; id: number } | null;
  /** The gardener's outfit (unlocked in the garden). */
  outfit?: string | null;
}

const SPEECH_COOLDOWN_MS = 15_000;
const SPEECH_VISIBLE_MS = 2_000;

const C = {
  body: '#D97757',
  light: '#EB9877',
  shade: '#B35A3D',
  eye: '#24140E',
  blush: '#F4A58C',
};

/** Pixel rectangle helper (1 unit = 1 "pixel" on the 16-grid). */
const P = ({ x, y, w = 1, h = 1, fill }: { x: number; y: number; w?: number; h?: number; fill: string }) => (
  <rect x={x} y={y} width={w} height={h} fill={fill} />
);

function Face({ mood, blink }: { mood: MascotMood; blink: boolean }) {
  const e = C.eye;
  switch (mood) {
    case 'happy':
    case 'celebrate':
      return (
        <g>
          {/* ^ ^ */}
          <P x={4} y={8} fill={e} /><P x={5} y={7} fill={e} /><P x={6} y={8} fill={e} />
          <P x={9} y={8} fill={e} /><P x={10} y={7} fill={e} /><P x={11} y={8} fill={e} />
          <P x={3} y={9} fill={C.blush} /><P x={12} y={9} fill={C.blush} />
          {mood === 'celebrate' && <P x={7} y={9} w={2} fill={e} />}
        </g>
      );
    case 'oops':
      return (
        <g>
          {/* > < */}
          <P x={4} y={7} fill={e} /><P x={5} y={8} fill={e} /><P x={4} y={9} fill={e} />
          <P x={11} y={7} fill={e} /><P x={10} y={8} fill={e} /><P x={11} y={9} fill={e} />
          <P x={7} y={10} w={2} fill={e} />
        </g>
      );
    case 'sleepy':
      return (
        <g>
          <P x={4} y={9} w={2} fill={e} />
          <P x={10} y={9} w={2} fill={e} />
        </g>
      );
    case 'thinking':
      return (
        <g>
          <P x={5} y={6} h={2} fill={e} />
          <P x={10} y={6} h={2} fill={e} />
          <P x={8} y={10} w={2} fill={e} />
        </g>
      );
    default:
      return (
        <g className={blink ? `${s.eyes} ${s.blink}` : s.eyes}>
          <P x={5} y={7} h={2} fill={e} />
          <P x={10} y={7} h={2} fill={e} />
        </g>
      );
  }
}

const CONFETTI_COLORS = ['#D97757', '#4fcf90', '#79a8f5', '#f2c14e', '#ef6a5f', '#f4efe6'];
const CONFETTI = Array.from({ length: 14 }, (_, i) => {
  const angle = (-170 + (160 / 13) * i) * (Math.PI / 180);
  const dist = 34 + ((i * 37) % 22);
  return {
    dx: Math.cos(angle) * dist,
    dy: Math.sin(angle) * dist - 6,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: (i % 4) * 25,
  };
});

export const Mascot = memo(function Mascot({ mood, moodId, streak, speech, outfit }: Props) {
  const [bubble, setBubble] = useState<{ text: string; id: number } | null>(null);
  const [blink, setBlink] = useState(false);
  const lastSpokeAt = useRef(-Infinity);
  const hideTimer = useRef<number>();
  const bubbleSeq = useRef(0);

  const say = useCallback((text: string, force = false) => {
    const now = Date.now();
    if (!force && now - lastSpokeAt.current < SPEECH_COOLDOWN_MS) return;
    lastSpokeAt.current = now;
    setBubble({ text, id: ++bubbleSeq.current });
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setBubble(null), SPEECH_VISIBLE_MS + Math.max(0, text.length - 30) * 45);
  }, []);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  // Poke him: a hop and a line; five quick pokes — a spin.
  const [poke, setPoke] = useState<{ id: number; spin: boolean } | null>(null);
  const pokes = useRef<number[]>([]);
  const onPoke = () => {
    const t = Date.now();
    pokes.current = [...pokes.current.filter((x) => t - x < 2500), t];
    const spin = pokes.current.length >= 5;
    if (spin) pokes.current = [];
    setPoke({ id: t, spin });
    say(spin ? pick(TICKLE) : randomLine(), true);
  };

  // Occasional lines in reaction to what happens.
  useEffect(() => {
    const r = Math.random();
    if (mood === 'celebrate') say(r < 0.5 ? streakPhrase(streak) : pick(PHRASES.celebrate));
    else if (mood === 'oops' && r < 0.3) say(pick(PHRASES.encourage));
    else if (mood === 'happy' && r < 0.06) say(pick(PHRASES.praise));
    else if (mood === 'thinking' && r < 0.4) say(pick(PHRASES.thinking));
    else if (mood === 'sleepy' && r < 0.5) say(pick(PHRASES.sleepy));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moodId, mood]);

  useEffect(() => {
    if (speech) say(speech.text, true);
  }, [speech, say]);

  // Blink every 3–5 s (random) while idle.
  useEffect(() => {
    if (mood !== 'idle') return;
    let t: number;
    const schedule = () => {
      t = window.setTimeout(() => {
        setBlink(true);
        t = window.setTimeout(() => {
          setBlink(false);
          schedule();
        }, 140);
      }, 3000 + Math.random() * 2000);
    };
    schedule();
    return () => {
      window.clearTimeout(t);
      setBlink(false);
    };
  }, [mood]);

  return (
    <div className={s.root} data-mood={mood} aria-hidden="true">
      <div className={s.glow} />
      {bubble && (
        <div key={`b${bubble.id}`} className={s.bubble}>
          {bubble.text}
        </div>
      )}
      {mood === 'sleepy' && (
        <div className={s.zzz}>
          {[0, 1, 2].map((i) => (
            <svg key={i} className={s.z} viewBox="0 0 3 3" shapeRendering="crispEdges" style={{ '--i': i } as CSSProperties}>
              <rect x="0" y="0" width="3" height="1" fill="currentColor" />
              <rect x="1" y="1" width="1" height="1" fill="currentColor" />
              <rect x="0" y="2" width="3" height="1" fill="currentColor" />
            </svg>
          ))}
        </div>
      )}
      <button type="button" className={s.poke} onClick={onPoke} aria-label="Доминик" tabIndex={-1} />
      <div key={`m${moodId}`} className={s.motion}>
        <div className={s.ambient}>
          <div key={poke?.id ?? 0} className={poke ? (poke.spin ? s.spin : s.hop) : undefined}>
          <svg className={s.sprite} viewBox="0 3 16 11" shapeRendering="crispEdges">
            {/* legs */}
            <P x={3} y={12} h={2} fill={C.shade} />
            <P x={5} y={12} h={2} fill={C.shade} />
            <P x={10} y={12} h={2} fill={C.shade} />
            <P x={12} y={12} h={2} fill={C.shade} />
            {/* body */}
            <P x={2} y={5} w={12} h={7} fill={C.body} />
            <P x={3} y={5} w={10} fill={C.light} />
            <P x={2} y={11} w={12} fill={C.shade} />
            {/* left paw */}
            <P x={0} y={7} w={2} h={2} fill={C.body} />
            {/* right paw — raised to scratch the head while thinking */}
            {mood === 'thinking' ? (
              <g className={s.scratch}>
                <P x={14} y={5} h={3} fill={C.body} />
                <P x={12} y={4} w={3} fill={C.body} />
              </g>
            ) : (
              <P x={14} y={7} w={2} h={2} fill={C.body} />
            )}
            <Face mood={mood} blink={blink} />
            <Hat outfit={outfit} />
          </svg>
          </div>
        </div>
      </div>
      {mood === 'celebrate' && (
        <div key={`c${moodId}`} className={s.confetti}>
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              style={
                {
                  '--dx': `${c.dx}px`,
                  '--dy': `${c.dy}px`,
                  '--delay': `${c.delay}ms`,
                  background: c.color,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
    </div>
  );
});
