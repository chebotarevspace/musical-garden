import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActionButton, Divider, Field, InlineSwitch, PlayIcon, StopIcon } from '../components/ui/Controls';
import { Picker } from '../components/ui/Picker';
import { useHotkeys } from '../hooks/useHotkeys';
import { useProgress } from '../hooks/useProgress';
import { playClick, primeAudio } from '../lib/audio';
import { DROPS_LEVELS, type DropsLevel, HIT_MS, type Judge, findDropsLevel, judge, makeDrops, pointsFor, stars } from '../lib/drops';
import { useMyMelodies } from '../hooks/useMyMelodies';
import { allMelodies } from '../lib/melodyModel';
import { melodyDrops } from '../lib/melodyLinks';
import { isBlack, midiToCode } from '../lib/notes';
import { progress as learning } from '../lib/progress';
import { inputNow } from '../lib/inputClock';
import { isLight } from '../lib/theme';
import { TheoryLink } from './TheoryLink';
import type { SectionProps } from './types';
import s from './Section.module.css';
import d from './DropsSection.module.css';

interface Drop {
  midi: number;
  at: number; // performance.now() when it lands
  state: 'fall' | Judge;
  judgedAt?: number;
}

interface Splash {
  x: number;
  at: number;
  kind: Judge;
}

interface Result {
  score: number;
  perfect: number;
  good: number;
  miss: number;
  maxCombo: number;
}

const COUNT_IN = 4;

/** «Капли»: a rhythm game — catch the falling notes on their keys, right on the beat. */
export function DropsSection({ settings, update, inputRef, mascot, setKeyboardRange }: SectionProps) {
  const melodies = allMelodies(useMyMelodies());
  const myMel = settings.dropsLevel.startsWith('my:') ? melodies.find((m) => `my:${m.id}` === settings.dropsLevel) : undefined;
  const level: DropsLevel = myMel
    ? { id: `my:${myMel.id}`, title: myMel.title, hint: 'Ваша мелодия — капли падают в её настоящем ритме.', tempo: Math.round(myMel.tempo * 0.85), count: myMel.notes.length }
    : findDropsLevel(settings.dropsLevel);
  const best = useProgress().exercises[`drops:${level.id}`]?.best;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef({
    drops: [] as Drop[],
    splashes: [] as Splash[],
    combo: 0,
    maxCombo: 0,
    score: 0,
    running: false,
    startAt: 0,
    fallMs: 2200,
    keyX: new Map<number, { x: number; w: number }>(),
  });
  const [running, setRunning] = useState(false);
  const [hud, setHud] = useState({ score: 0, combo: 0 });
  const [result, setResult] = useState<Result | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => setKeyboardRange({ from: 4, to: 4 }), [setKeyboardRange]);

  // Where each key is, relative to the canvas.
  const measure = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    const map = new Map<number, { x: number; w: number }>();
    document.querySelectorAll<HTMLElement>('[data-midi]').forEach((el) => {
      const k = el.getBoundingClientRect();
      if (k.width > 0) map.set(Number(el.dataset.midi), { x: k.left + k.width / 2 - r.left, w: k.width });
    });
    game.current.keyX = map;
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (canvasRef.current) ro.observe(canvasRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const finish = useCallback(() => {
    const g = game.current;
    g.running = false;
    setRunning(false);
    timers.current.forEach((t) => window.clearTimeout(t));
    const perfect = g.drops.filter((x) => x.state === 'perfect').length;
    const good = g.drops.filter((x) => x.state === 'good').length;
    const miss = g.drops.length - perfect - good;
    const res = { score: g.score, perfect, good, miss, maxCombo: g.maxCombo };
    setResult(res);
    learning.recordRun('exercises', `drops:${level.id}`, g.score, false);
    learning.count('drops:round');
    if (g.maxCombo >= 10) learning.count('drops:combo10');
    const acc = g.drops.length ? (perfect + good) / g.drops.length : 0;
    mascot.react(acc >= 0.8 ? 'celebrate' : 'happy', g.maxCombo);
  }, [level.id, mascot]);

  // ---- drawing loop ----
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const c = canvasRef.current;
      const g = game.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const W = c.width / dpr;
      const H = c.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const now = performance.now();

      // Rainbow over a long combo.
      if (g.combo >= 10) {
        const a = Math.min(0.55, (g.combo - 9) * 0.06);
        const cols = ['#e5574c', '#e8833a', '#f4c430', '#47c98a', '#6b95ef', '#9a6bef'];
        cols.forEach((col, i) => {
          ctx.beginPath();
          ctx.strokeStyle = col;
          ctx.globalAlpha = a;
          ctx.lineWidth = 6;
          ctx.arc(W / 2, H * 1.25, W * 0.42 - i * 7, Math.PI * 1.08, Math.PI * 1.92);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }

      // Ground line (the key tops).
      ctx.fillStyle = 'rgba(111, 195, 223, 0.25)';
      ctx.fillRect(0, H - 3, W, 3);

      if (g.running) {
        for (const drop of g.drops) {
          const k = g.keyX.get(drop.midi);
          if (!k) continue;
          if (drop.state === 'fall') {
            if (now - drop.at > HIT_MS) {
              drop.state = 'miss';
              drop.judgedAt = now;
              g.combo = 0;
              setHud({ score: g.score, combo: 0 });
              continue;
            }
            const y = (1 - (drop.at - now) / g.fallMs) * (H - 10);
            if (y < -20) continue;
            const r = Math.max(7, Math.min(13, k.w * 0.42));
            const black = isBlack(drop.midi);
            const grad = ctx.createRadialGradient(k.x - r * 0.3, y - r * 0.3, 1, k.x, y, r);
            grad.addColorStop(0, black ? '#c9b8ff' : '#d8f3ff');
            grad.addColorStop(1, black ? '#7d5fe0' : '#4aa3c4');
            ctx.fillStyle = grad;
            ctx.beginPath();
            // a raindrop: round bottom, pointy top
            ctx.moveTo(k.x, y - r * 1.8);
            ctx.quadraticCurveTo(k.x + r, y - r * 0.4, k.x + r, y);
            ctx.arc(k.x, y, r, 0, Math.PI);
            ctx.quadraticCurveTo(k.x - r, y - r * 0.4, k.x, y - r * 1.8);
            ctx.fill();
            if (r >= 9) {
              ctx.fillStyle = 'rgba(11, 30, 40, 0.75)';
              ctx.font = `700 ${Math.round(r * 0.75)}px Inter, sans-serif`;
              ctx.textAlign = 'center';
              ctx.fillText(midiToCode(drop.midi).replace(/\d/, ''), k.x, y + r * 0.3);
            }
          }
        }
        // All judged → done.
        if (g.drops.length && g.drops.every((x) => x.state !== 'fall')) {
          window.setTimeout(finish, 400);
          g.running = false;
        }
      }

      // Splashes.
      g.splashes = g.splashes.filter((sp) => now - sp.at < 500);
      for (const sp of g.splashes) {
        const t = (now - sp.at) / 500;
        ctx.globalAlpha = 1 - t;
        const light = isLight();
        ctx.strokeStyle = sp.kind === 'perfect' ? (light ? '#2f9e62' : '#8fe0b6') : sp.kind === 'good' ? (light ? '#4a86d8' : '#cfe9ff') : '#e5574c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(sp.x, H - 4, 8 + t * 26, 3 + t * 6, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 5; i++) {
          const ang = Math.PI * (1.1 + i * 0.2);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fillRect(sp.x + Math.cos(ang) * t * 30, H - 6 + Math.sin(ang) * t * 26, 3, 3);
        }
        ctx.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [finish]);

  const stop = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    game.current.running = false;
    game.current.drops = [];
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    primeAudio();
    measure();
    stop();
    setResult(null);
    const lvl = level;
    const notes = myMel ? melodyDrops(myMel) : makeDrops(lvl.id);
    const beatMs = 60000 / lvl.tempo;
    const g = game.current;
    const t0 = performance.now() + COUNT_IN * beatMs;
    g.drops = notes.map((n) => ({ midi: n.midi, at: t0 + n.beat * beatMs, state: 'fall' }));
    g.fallMs = Math.max(1500, beatMs * 3);
    g.combo = 0;
    g.maxCombo = 0;
    g.score = 0;
    g.splashes = [];
    g.running = true;
    setHud({ score: 0, combo: 0 });
    setRunning(true);
    if (settings.dropsClick) {
      const beats = COUNT_IN + Math.ceil(notes[notes.length - 1].beat) + 1;
      for (let b = 0; b < beats; b++) timers.current.push(window.setTimeout(() => game.current.running && playClick(b % 4 === 0), b * beatMs));
    }
  }, [level, myMel, settings.dropsClick, measure, stop]);

  useEffect(() => stop, [stop]);
  useEffect(() => {
    stop();
    setResult(null);
  }, [level.id, stop]);

  useLayoutEffect(() => {
    inputRef.current = {
      noteOn(midi) {
        const g = game.current;
        if (!g.running) return 'ignored';
        const now = inputNow();
        let bestDrop: Drop | null = null;
        for (const drop of g.drops) {
          if (drop.state !== 'fall' || drop.midi !== midi) continue;
          if (Math.abs(now - drop.at) <= HIT_MS && (!bestDrop || Math.abs(now - drop.at) < Math.abs(now - bestDrop.at))) bestDrop = drop;
        }
        const k = g.keyX.get(midi);
        if (!bestDrop) {
          // A key with no drop near it: the rain goes on, but the combo breaks.
          const near = g.drops.some((x) => x.state === 'fall' && Math.abs(now - x.at) <= HIT_MS);
          if (near) {
            g.combo = 0;
            setHud({ score: g.score, combo: 0 });
            if (k) g.splashes.push({ x: k.x, at: now, kind: 'miss' });
            return 'wrong';
          }
          return 'ignored';
        }
        const j = judge(now - bestDrop.at);
        bestDrop.state = j;
        bestDrop.judgedAt = now;
        g.combo += 1;
        g.maxCombo = Math.max(g.maxCombo, g.combo);
        g.score += pointsFor(j, g.combo);
        if (k) g.splashes.push({ x: k.x, at: now, kind: j });
        setHud({ score: g.score, combo: g.combo });
        if (g.combo === 10) mascot.react('celebrate', 10);
        return 'correct';
      },
      noteOff() {},
      releaseAll() {},
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef, mascot]);

  useHotkeys({ Space: () => (game.current.running ? stop() : start()) });

  const total = result ? result.perfect + result.good + result.miss : 0;
  const acc = result && total ? (result.perfect + result.good) / total : 0;

  return (
    <>
      <div className={s.controls}>
        <Field label="Уровень">
          <Picker
            ariaLabel="Уровень"
            value={level.id}
            width={230}
            onChange={(dropsLevel) => update({ dropsLevel })}
            items={[...DROPS_LEVELS.map((l) => ({ id: l.id, group: 'Капли', title: l.title })), ...melodies.map((m) => ({ id: `my:${m.id}`, group: 'Мои мелодии', title: m.title }))]}
          />
        </Field>
        <Field label="Звук">
          <InlineSwitch label="Метроном" checked={settings.dropsClick} onChange={(dropsClick) => update({ dropsClick })} />
        </Field>
        <Field label="Рекорд" value={best !== undefined ? String(best) : '—'}>
          <span />
        </Field>
        <Divider />
        <span className={s.spacer} />
        <Field label=" ">
          <ActionButton primary onClick={running ? stop : start} kbd="Space">
            {running ? (
              <>
                <StopIcon /> Стоп
              </>
            ) : (
              <>
                <PlayIcon /> Начать
              </>
            )}
          </ActionButton>
        </Field>
      </div>

      <main className={`${s.stage} ${d.stage}`}>
        <TheoryLink settings={settings} update={update} />
        <canvas ref={canvasRef} className={d.canvas} aria-hidden="true" />
        <div className={d.hud}>
          <div className={s.eyebrow}>Капли · {level.title}</div>
          {running ? (
            <div className={d.score}>
              <b>{hud.score}</b>
              {hud.combo >= 2 && <span className={d.combo} key={hud.combo}>комбо ×{hud.combo}</span>}
            </div>
          ) : result ? (
            <div className={d.result}>
              <div className={d.stars} aria-label={`${stars(acc)} из 3`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} data-on={i < stars(acc) || undefined}>
                    ★
                  </span>
                ))}
              </div>
              <div className={d.big}>{result.score} очков</div>
              <div className={d.line}>
                Точно: {result.perfect} · хорошо: {result.good} · мимо: {result.miss} · лучшее комбо: {result.maxCombo}
                {best !== undefined && result.score >= best ? ' · новый рекорд!' : ''}
              </div>
              <div className={d.line}>Пробел — ещё раз</div>
            </div>
          ) : (
            <div className={d.intro}>
              <h1>Ловите капли!</h1>
              <p>{level.hint} Нажмите клавишу, когда капля коснётся её. Чем дольше без промахов — тем больше комбо, а после десяти над садом встаёт радуга.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
