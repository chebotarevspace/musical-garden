import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import type { CSSProperties } from 'react';
import { DECOR, type Plant, type Season, type Species, GROW_MS, SPECIES_INFO, growthStage, speciesFor } from '../../lib/garden';
import type { Sprout } from '../../lib/garden';
import { GardenerG, type GardenerPose } from './GardenerArt';
import { SPRITES, spriteRects } from './sprites';
import type { DayPhase } from '../../lib/daylight';
import s from './GardenScene.module.css';

const W = 640;
const H = 320;
const COLS = 10;
const ROWS = 4;
const PX = 3; // one sprite pixel = 3 svg units
const ROW_Y = [196, 232, 268, 304]; // baselines, back to front

/** Clear sky per season (the light of the hour is painted on top). */
const SKY: Record<Season, [string, string]> = {
  winter: ['#9cc8ef', '#e3f0fb'],
  spring: ['#8cc8f2', '#e6f6ff'],
  summer: ['#6fb8f0', '#d9f0ff'],
  autumn: ['#f2b98a', '#fde9d2'],
};
/** Ground per season: [near the horizon, at the front, hills, grass tufts]. */
const GROUND: Record<Season, [string, string, string, string]> = {
  winter: ['#eef4f8', '#d3e1eb', '#c3d6e4', '#c4d5e2'],
  spring: ['#a2d983', '#72bd59', '#86c86a', '#5fa847'],
  summer: ['#90cf6c', '#61aa48', '#74ba57', '#4f9a3c'],
  autumn: ['#b2c784', '#7f9f57', '#cf9a63', '#6e8f4a'],
};

/** Fixed spots for little grass tufts (same every render). */
const TUFTS = Array.from({ length: 34 }, (_, i) => ({ x: (i * 157 + 23) % 630, y: 176 + ((i * 53) % 140) }));

const Sprite = memo(function Sprite({ species, x, y, scale = 1, silhouette }: { species: Species | 'seed' | 'sprout'; x: number; y: number; scale?: number; silhouette?: string }) {
  const rects = useMemo(() => spriteRects(SPRITES[species]), [species]);
  // (x, y) = bottom-centre of the sprite
  return (
    <g transform={`translate(${x - 6 * PX * scale} ${y - 16 * PX * scale}) scale(${PX * scale})`} shapeRendering="crispEdges">
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={silhouette ?? r.fill} />
      ))}
    </g>
  );
});

const CAT_COLORS: Record<string, string> = { o: '#e8913a', d: '#b8642a', w: '#fff4e6', k: '#2b211b', p: '#f6a9c8', r: '#e5574c' };
const CAT_AWAKE = [
  '..........o..o',
  '..........oooo',
  'o.........okok',
  'o..oooooooowpw',
  '.ooooooooooooo',
  '..oooodooodoo.',
  '..oooooooooo..',
  '..o.o....o.o..',
];
const CAT_SLEEP = [
  '....o..o......',
  '....oooo......',
  '...oddoo.oooo.',
  '..owpwooooooo.',
  '.ooooooooooooo',
  '.oooodooodoooo',
];

/** Pixel cat Бемоль: walks along the fence, naps at night, purrs when petted. */
function Cat({ sleeping, bow, onPet, petId }: NonNullable<Props['cat']>) {
  const rows = sleeping ? CAT_SLEEP : CAT_AWAKE;
  const cells: { x: number; y: number; c: string }[] = [];
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && cells.push({ x, y, c: CAT_COLORS[ch] })));
  if (bow) cells.push(...(sleeping ? [{ x: 7, y: 3, c: CAT_COLORS.r }, { x: 8, y: 3, c: CAT_COLORS.r }] : [{ x: 9, y: 4, c: CAT_COLORS.r }, { x: 10, y: 4, c: CAT_COLORS.r }]));
  const h = rows.length * PX;
  return (
    <g transform={`translate(${sleeping ? 270 : 150} ${178 - h})`}>
      <g className={sleeping ? undefined : s.catWalk}>
        <g className={s.catHit} onClick={onPet} role="button" aria-label="Кот Бемоль — погладить">
          <title>Кот Бемоль. Погладьте его!</title>
          <rect x={-4} y={-6} width={14 * PX + 8} height={h + 10} fill="transparent" />
          <g shapeRendering="crispEdges">
            {cells.map((q, i) => (
              <rect key={i} x={q.x * PX} y={q.y * PX} width={PX} height={PX} fill={q.c} />
            ))}
          </g>
        </g>
      </g>
      {sleeping && (
        <text className={s.zzz} x={14 * PX - 4} y={-2}>
          z
        </text>
      )}
      {petId > 0 && (
        <g key={petId}>
          {[0, 1, 2].map((i) => (
            <text key={i} className={s.heart} x={(sleeping ? 18 : 30) + i * 9 - 9} y={-4} style={{ '--delay': `${i * 0.18}s` } as CSSProperties}>
              ♥
            </text>
          ))}
        </g>
      )}
    </g>
  );
}

/** The light of the hour and, at night, a shooting star now and then. */
export interface SkyState {
  phase: DayPhase;
  /** Id of a shooting star flying now. */
  star: number | null;
  onStar(): void;
}

/** New Year lights across the sky. */
function Garland() {
  const colors = ['#e5574c', '#ffde59', '#6b95ef', '#8bd16a', '#f6a9c8'];
  return (
    <g>
      <path d="M0 10 Q160 54 320 10 Q480 54 640 10" fill="none" stroke="#3f5d3a" strokeWidth="1.5" />
      {Array.from({ length: 22 }, (_, i) => {
        const x = 14 + i * 29;
        const u = (x % 320) / 320;
        const y = 10 + 22 * 4 * u * (1 - u);
        return <rect key={i} className={s.bulb} x={x - 2.5} y={y} width={5} height={7} rx={2} fill={colors[i % colors.length]} style={{ '--delay': `${(i % 5) * 0.3}s` } as CSSProperties} />;
      })}
    </g>
  );
}

function Cloud({ x, y, k = 1 }: { x: number; y: number; k?: number }) {
  return (
    <g className={s.cloud} style={{ '--d': `${18 + k * 7}s` } as CSSProperties} transform={`translate(${x} ${y}) scale(${k})`}>
      <rect x="0" y="6" width="48" height="10" rx="5" fill="#fff" opacity="0.92" />
      <rect x="10" y="0" width="24" height="12" rx="6" fill="#fff" opacity="0.92" />
    </g>
  );
}

interface Props {
  plants: Plant[];
  sprout: Sprout | null;
  season: Season;
  /** Show the growing sprout in the next free plot. */
  showSprout?: boolean;
  gardener?: { pose: GardenerPose; outfit: string | null; line: string | null; lineId: number; onPoke(): void };
  /** Total plants ever grown (decorations unlock by it). */
  total?: number;
  /** Notes you just played: plants near that spot sway and a note floats up. */
  pulses?: { id: number; x: number }[];
  /** The garden cat (comes after a few days of practice). */
  cat?: { sleeping: boolean; bow: boolean; onPet(): void; petId: number };
  /** New Year lights. */
  festive?: boolean;
  sky?: SkyState;
}

const fmtDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

/** Pixel garden: one plot per grown plant, plus the sprout that is growing now. */
export const GardenScene = memo(function GardenScene({ plants, sprout, season, showSprout = true, gardener, total = 0, pulses = [], cat, festive, sky }: Props) {
  const phase = sky?.phase ?? 'day';
  const night = phase === 'night';
  const visible = plants;
  const [g1, g2, g3, tuft] = GROUND[season];
  const [sky1, sky2] = SKY[season];
  const PER_BED = COLS * ROWS;
  // The garden grows sideways: every 40 plants a new bed of plots opens on the right.
  const slot = (i: number) => {
    const bed = Math.floor(i / PER_BED);
    const j = i % PER_BED;
    // Fill the back row first so new plants appear towards the front.
    const row = Math.floor(j / COLS);
    const col = j % COLS;
    const offset = row % 2 ? 28 : 0;
    return { x: bed * W + 34 + col * 60 + offset, y: ROW_Y[row] };
  };
  const sproutIndex = visible.length;
  const beds = Math.floor(sproutIndex / PER_BED) + 1;
  const worldW = beds * W;
  const sproutBed = Math.floor(sproutIndex / PER_BED);

  // ---- the camera: drag to move, buttons / pinch to zoom ----
  const [cam, setCam] = useState<{ x: number; zoom: number } | null>(null);
  const zoom = cam?.zoom ?? 1;
  const vw = W / zoom;
  const vh = H / zoom;
  const clampX = (x: number) => (vw >= worldW ? (worldW - vw) / 2 : Math.max(0, Math.min(worldW - vw, x)));
  // Until you move it, the camera shows the bed where the sprout grows.
  const vx = clampX(cam?.x ?? sproutBed * W);
  const vy = H - vh;
  const MIN_ZOOM = 0.75;
  const MAX_ZOOM = 1.8;
  /** Jump to a bed (a stretch of 40 plots). */
  const goBed = (b: number) => setCam({ x: b * W - (W / zoom - W) / 2, zoom });
  const zoomBy = (f: number) => {
    const cx = vx + vw / 2;
    const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * f));
    setCam({ x: cx - W / z / 2, zoom: z });
  };
  const drag = useRef<{ x0: number; vx0: number; moved: boolean; id: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x0: e.clientX, vx0: vx, moved: false, id: e.pointerId };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !svgRef.current) return;
    const dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(dx) < 5) return;
    if (!d.moved) {
      d.moved = true;
      svgRef.current.setPointerCapture(d.id);
    }
    const pxPerUnit = svgRef.current.clientWidth / vw;
    setCam({ x: d.vx0 - dx / Math.max(0.01, pxPerUnit), zoom });
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    // A drag isn't a click on the gardener or the cat.
    if (d?.moved) {
      const stop = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener('click', stop, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0);
    }
  };
  // Trackpad pinch (ctrl+wheel) zooms the garden, not the page; a sideways swipe moves; plain scrolling scrolls the page.
  const wheel = useRef<(e: WheelEvent) => void>(() => {});
  wheel.current = (e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && worldW > vw) {
      e.preventDefault();
      setCam({ x: vx + e.deltaX / zoom, zoom });
    }
  };
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const h = (e: WheelEvent) => wheel.current(e);
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, []);
  const sproutFrac = sprout ? sprout.activeMs / GROW_MS : 0;
  const stage = growthStage(sproutFrac);
  const sproutSpecies = sprout ? speciesFor(sprout).species : null;
  const has = (id: (typeof DECOR)[number]['id']) => total >= DECOR.find((d) => d.id === id)!.at;
  const lastPulse = pulses[pulses.length - 1];
  const near = (x: number) => !!lastPulse && Math.abs(vx + lastPulse.x * vw - x) < 70;

  // The gardener stands next to the growing sprout (or at the front when the garden is full).
  const gk = 2.6;
  const gAt = slot(sproutIndex);
  const gx = Math.min(worldW - 70, gAt.x + 22);
  const gy = Math.min(H - 4, gAt.y + 6);

  // His speech bubble is HTML over the scene: a steady font size, always inside the visible part
  // (the scene is scaled to fill and cropped at the top on wide screens).
  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const bubbleStyle = ((): CSSProperties | null => {
    if (!gardener?.line || !box.w) return null;
    const k = Math.max(box.w / vw, box.h / vh);
    const toX = (x: number) => (box.w - vw * k) / 2 + (x - vx) * k;
    const toY = (y: number) => box.h - vh * k + (y - vy) * k;
    const cx = toX(gx + 9 * gk);
    if (cx < 0 || cx > box.w) return null; // the gardener is off screen
    const head = toY(gy - 14 * gk);
    const feet = toY(gy);
    const maxW = Math.min(300, box.w - 16);
    const left = Math.max(8 + maxW / 2, Math.min(box.w - 8 - maxW / 2, cx));
    // Room above his head? Otherwise speak from below the hat line, next to him.
    const above = head > 96;
    return {
      left,
      maxWidth: maxW,
      ...(above ? { bottom: box.h - head + 6 } : { top: Math.min(box.h - 60, Math.max(8, feet + 6)) }),
    };
  })();

  return (
    <div className={s.wrap} ref={wrap}>
    <svg
      ref={svgRef}
      className={s.scene}
      data-draggable={worldW > vw || zoom !== 1 || undefined}
      viewBox={`${vx} ${vy} ${vw} ${vh}`}
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label={`Сад: ${plants.length} растений`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <defs>
        <linearGradient id="ground" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={g1} />
          <stop offset="1" stopColor={g2} />
        </linearGradient>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={sky1} />
          <stop offset="1" stopColor={sky2} />
        </linearGradient>
      </defs>
      <rect x={-W} y={-4 * H} width={worldW + 2 * W} height={4 * H} fill={sky1} />
      <rect x={-W} width={worldW + 2 * W} height={H} fill="url(#sky)" />

      {/* the sky follows the camera */}
      <g transform={`translate(${vx} ${vy}) scale(${1 / zoom})`}>
      {/* light of the hour: morning glow, the day sun, an evening sunset, the night with the moon */}
      {phase === 'dawn' && <rect x={0} y={0} width={W} height={H} fill="#ff9e7a" opacity={0.2} />}
      {phase === 'dusk' && <rect x={0} y={0} width={W} height={H} fill="#b4507a" opacity={0.24} />}
      {night && <rect x={0} y={0} width={W} height={H} fill="#16203f" opacity={0.62} />}
      {night &&
        Array.from({ length: 28 }, (_, i) => (
          <rect key={i} className={s.star} x={(i * 151) % W} y={8 + ((i * 37) % 110)} width={2} height={2} fill="#fffbe0" style={{ '--delay': `${(i % 7) * 0.4}s` } as CSSProperties} />
        ))}
      {night && (
        <g>
          <circle cx={560} cy={50} r={20} fill="#f6f1d8" />
          <circle cx={570} cy={44} r={18} fill="#16203f" opacity={0.55} />
        </g>
      )}
      {phase === 'day' && (
        <g className={s.sun}>
          <circle cx={560} cy={52} r={26} fill="#ffe27a" />
          <circle cx={560} cy={52} r={36} fill="#ffe27a" opacity="0.25" />
        </g>
      )}
      {phase === 'dawn' && (
        <g className={s.sun}>
          <circle cx={90} cy={122} r={24} fill="#ffcf73" />
          <circle cx={90} cy={122} r={34} fill="#ffcf73" opacity="0.3" />
        </g>
      )}
      {phase === 'dusk' && (
        <g className={s.sun}>
          <circle cx={560} cy={124} r={26} fill="#ff9a5a" />
          <circle cx={560} cy={124} r={38} fill="#ff9a5a" opacity="0.3" />
        </g>
      )}
      {!night && <Cloud x={70} y={34} k={1} />}
      {!night && <Cloud x={300} y={22} k={1.1} />}
      {festive && <Garland />}
      </g>

      {/* hills, ground and grass — one stretch per bed */}
      {Array.from({ length: beds + 2 }, (_, b) => b - 1).map((b) => (
        <g key={b} transform={`translate(${b * W} 0)`}>
          <path d={`M0 150 Q120 110 240 140 T480 132 T640 128 V200 H0 Z`} fill={g3} opacity="0.55" />
          <rect y={164} width={W + 1} height={H - 164} fill="url(#ground)" />
          <rect y={H} width={W + 1} height={3 * H} fill={g2} />
          <rect y={164} width={W + 1} height={4} fill={g2} opacity="0.35" />
          {TUFTS.map((t, i) => (
            <g key={i} fill={tuft} opacity={season === 'winter' ? 0.5 : 0.7} shapeRendering="crispEdges">
              <rect x={t.x} y={t.y} width={2} height={4} />
              <rect x={t.x + 3} y={t.y - 2} width={2} height={6} />
              <rect x={t.x + 6} y={t.y + 1} width={2} height={3} />
            </g>
          ))}
        </g>
      ))}

      {/* decorations that come with a bigger garden */}
      {has('windmill') && (
        <g transform="translate(470 92)">
          <rect x={-5} y={14} width={10} height={44} fill="#e9ddc8" />
          <path d="M-7 14 L0 4 L7 14 Z" fill="#a8492a" />
          <g className={s.blades}>
            <rect x={-1} y={-20} width={2} height={40} fill="#7a6d60" />
            <rect x={-20} y={-1} width={40} height={2} fill="#7a6d60" />
            <rect x={1} y={-20} width={5} height={14} fill="#f4efe6" />
            <rect x={-6} y={6} width={5} height={14} fill="#f4efe6" />
            <rect x={-20} y={-6} width={14} height={5} fill="#f4efe6" />
            <rect x={6} y={1} width={14} height={5} fill="#f4efe6" />
          </g>
        </g>
      )}
      {has('pond') && (
        <g>
          <ellipse cx={92} cy={180} rx={58} ry={11} fill={season === 'winter' ? '#cfe3f0' : '#6fc3df'} />
          <ellipse cx={92} cy={178} rx={50} ry={7} fill={season === 'winter' ? '#e6f1f8' : '#8fd4ea'} opacity="0.7" />
          {season !== 'winter' && <ellipse cx={74} cy={179} rx={8} ry={3} fill="#4caf50" />}
          {season !== 'winter' && <circle cx={76} cy={177} r={2} fill="#f6a9c8" />}
        </g>
      )}
      {has('bench') && (
        <g transform="translate(300 172)">
          <rect x={-22} y={0} width={44} height={4} fill="#8d5a3b" />
          <rect x={-22} y={-8} width={44} height={3} fill="#8d5a3b" />
          <rect x={-19} y={4} width={3} height={8} fill="#6b4226" />
          <rect x={16} y={4} width={3} height={8} fill="#6b4226" />
        </g>
      )}
      {has('gazebo') && (
        <g transform="translate(578 186)">
          <path d="M-30 -42 L0 -62 L30 -42 Z" fill="#a8492a" />
          <rect x={-26} y={-42} width={4} height={42} fill="#f4efe6" />
          <rect x={22} y={-42} width={4} height={42} fill="#f4efe6" />
          <rect x={-26} y={-16} width={52} height={3} fill="#e9ddc8" />
        </g>
      )}

      {cat && (
        <g transform={`translate(${sproutBed * W} 0)`}>
          <Cat {...cat} />
        </g>
      )}

      {/* plots: all beds, the ones still waiting are paler */}
      {Array.from({ length: beds * PER_BED }, (_, i) => {
        const { x, y } = slot(i);
        return <ellipse key={i} cx={x} cy={y - 2} rx={20} ry={5} fill={season === 'winter' ? '#8a9fb0' : '#6b4428'} opacity={i < visible.length + 1 ? 0.45 : 0.15} />;
      })}

      {/* plants, back rows first */}
      {visible.map((p, i) => {
        const { x, y } = slot(i);
        const info = SPECIES_INFO[p.species];
        return (
          <g key={p.id} className={s.plant} style={{ '--i': i % PER_BED } as CSSProperties}>
            <g key={near(x) ? `n${lastPulse!.id}` : 'still'} className={near(x) ? s.dance : undefined}>
            <title>
              {info.name} — {info.hint}. {fmtDay(p.day)}, {p.minutes} мин
            </title>
            <Sprite species={p.species} x={x} y={y} />
            {p.rare && <path className={s.sparkle} d={`M${x + 16} ${y - 44} l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z`} fill="#fffbe0" />}
            </g>
          </g>
        );
      })}

      {showSprout && sprout && (
        <g className={s.sprout}>
          <title>
            Растёт: {Math.round(sproutFrac * 100)}% · ещё {Math.max(1, Math.ceil((GROW_MS - sprout.activeMs) / 60000))} мин активной игры
          </title>
          <Sprite
            species={stage === 0 ? 'seed' : stage === 1 ? 'sprout' : sproutSpecies ?? 'sprout'}
            x={slot(sproutIndex).x}
            y={slot(sproutIndex).y}
            scale={stage === 2 ? 0.55 + sproutFrac * 0.4 : 1}
          />
        </g>
      )}

      {gardener && (
        <g
          className={s.gardenerHit}
          transform={`translate(${gx} ${gy - 14 * gk}) scale(${gk})`}
          onClick={gardener.onPoke}
          role="button"
          aria-label="Доминик, садовник"
        >
          <rect x={-2} y={-1} width={22} height={16} fill="transparent" />
          <GardenerG pose={gardener.pose} outfit={gardener.outfit} />
        </g>
      )}

      {pulses.map((p) => (
        <text key={p.id} className={s.floatNote} x={vx + p.x * vw} y={250} textAnchor="middle">
          ♪
        </text>
      ))}

      <g transform={`translate(${vx} ${vy}) scale(${1 / zoom})`}>
      {night && <rect x={0} y={150} width={W} height={H} fill="#0e1430" opacity={0.3} pointerEvents="none" />}
      {phase === 'dusk' && <rect x={0} y={150} width={W} height={H} fill="#3a1f3d" opacity={0.12} pointerEvents="none" />}
      {night &&
        Array.from({ length: 12 }, (_, i) => (
          <circle key={i} className={s.firefly} cx={30 + ((i * 113) % 580)} cy={190 + ((i * 47) % 110)} r={1.8} fill="#f8ff9a" style={{ '--delay': `${(i % 6) * 0.5}s`, '--d': `${3 + (i % 4)}s` } as CSSProperties} />
        ))}
      {night && sky && sky.star !== null && (
        <g key={sky.star} className={s.shooting} onClick={sky.onStar} role="button" aria-label="Падающая звезда — загадать желание">
          <title>Падающая звезда! Кликните и загадайте желание.</title>
          <line x1={0} y1={0} x2={-26} y2={-10} stroke="#fffbe0" strokeWidth={2} strokeLinecap="round" />
          <circle r={2.5} fill="#ffffff" />
          <rect x={-30} y={-14} width={36} height={20} fill="transparent" />
        </g>
      )}
      {phase === 'day' && season !== 'winter' && (
        <g className={s.butterflies}>
          <g className={s.butterfly} style={{ '--d': '9s' } as CSSProperties}>
            <rect x={0} y={0} width={4} height={4} fill="#f6a9c8" />
            <rect x={5} y={0} width={4} height={4} fill="#f6a9c8" />
          </g>
          <g className={s.butterfly} style={{ '--d': '12s', '--delay': '-4s' } as CSSProperties}>
            <rect x={0} y={0} width={4} height={4} fill="#ffde59" />
            <rect x={5} y={0} width={4} height={4} fill="#ffde59" />
          </g>
        </g>
      )}
      </g>
    </svg>
      <div className={s.camera}>
        {beds > 1 && <span className={s.cameraHint}>Тяните сад мышью</span>}
        <button type="button" onClick={() => zoomBy(1 / 1.25)} aria-label="Отдалить" title="Отдалить">
          −
        </button>
        <button type="button" onClick={() => zoomBy(1.25)} aria-label="Приблизить" title="Приблизить">
          +
        </button>
        {beds > 1 &&
          Array.from({ length: beds }, (_, b) => (
            <button
              key={b}
              type="button"
              data-on={Math.round((vx + vw / 2 - W / 2) / W) === b || undefined}
              onClick={() => goBed(b)}
              aria-label={`Грядка ${b + 1}`}
              title={`Грядка ${b + 1}: растения ${b * PER_BED + 1}–${Math.min(visible.length, (b + 1) * PER_BED)}`}
            >
              {b + 1}
            </button>
          ))}
        <button type="button" onClick={() => setCam(null)} aria-label="К ростку" title="К ростку и садовнику">
          🌱
        </button>
      </div>
      {gardener?.line && bubbleStyle && (
        <div key={gardener.lineId} className={s.bubble} style={bubbleStyle} role="status">
          {gardener.line}
        </div>
      )}
    </div>
  );
});

export { Sprite };
