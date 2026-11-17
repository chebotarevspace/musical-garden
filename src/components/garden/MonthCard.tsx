import { useMemo, useRef, useState } from 'react';
import { SPECIES_INFO, seasonOf } from '../../lib/garden';
import type { Progress } from '../../lib/progress';
import { Modal } from '../ui/Modal';
import { GardenerG } from './GardenerArt';
import { Sprite } from './GardenScene';
import s from './MonthCard.module.css';

const W = 1080;
const H = 1350;
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const SKY: Record<string, [string, string, string]> = {
  winter: ['#9cc8ef', '#e3f0fb', '#e3edf4'],
  spring: ['#8cc8f2', '#e6f6ff', '#90cf6c'],
  summer: ['#6fb8f0', '#d9f0ff', '#7cc45a'],
  autumn: ['#f2b98a', '#fde9d2', '#a3bd76'],
};
const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

const plural = (n: number, one: string, few: string, many: string) => {
  const a = n % 10;
  const b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
};

interface MonthStats {
  key: string;
  year: number;
  month: number;
  minutes: number;
  days: number;
  plants: Progress['plants'];
}

function monthsWithData(p: Progress): MonthStats[] {
  const map = new Map<string, MonthStats>();
  const get = (day: string) => {
    const key = day.slice(0, 7);
    if (!map.has(key)) map.set(key, { key, year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) - 1, minutes: 0, days: 0, plants: [] });
    return map.get(key)!;
  };
  for (const [day, d] of Object.entries(p.days)) {
    if (!(d.activeMs > 0 || d.actions > 0)) continue;
    const m = get(day);
    m.minutes += d.activeMs / 60000;
    m.days += 1;
  }
  for (const pl of p.plants) get(pl.day).plants.push(pl);
  const now = new Date();
  const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (!map.has(curKey)) map.set(curKey, { key: curKey, year: now.getFullYear(), month: now.getMonth(), minutes: 0, days: 0, plants: [] });
  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
}

/** «Мой сад за месяц»: a picture to keep or share, drawn right in the browser. */
export function MonthCard({ p, onClose }: { p: Progress; onClose(): void }) {
  const months = useMemo(() => monthsWithData(p), [p]);
  const [i, setI] = useState(0);
  const [msg, setMsg] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const m = months[i];
  const season = seasonOf(m.month);
  const [sky1, sky2, ground] = SKY[season];

  // Up to 24 plants in 3 rows.
  const shownPlants = m.plants.slice(-24);
  const perRow = 8;
  const scale = 2.6;
  const top = 560;

  const render = async (): Promise<Blob | null> => {
    const svg = svgRef.current;
    if (!svg) return null;
    const xml = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const img = new Image();
      img.decoding = 'async';
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('render'));
        img.src = url;
      });
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, W, H);
      return await new Promise((res) => c.toBlob(res, 'image/png'));
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const download = async () => {
    const blob = await render();
    if (!blob) return setMsg('Не получилось нарисовать картинку.');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `musical-garden-${m.key}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg('Картинка сохранена.');
  };

  const copy = async () => {
    try {
      const blob = await render();
      if (!blob || !('ClipboardItem' in window)) throw new Error('clipboard');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setMsg('Скопировано — вставьте в сообщение.');
    } catch {
      setMsg('Браузер не дал скопировать картинку — используйте «Скачать».');
    }
  };

  const stats: [string, string][] = [
    [String(Math.round(m.minutes)), plural(Math.round(m.minutes), 'минута музыки', 'минуты музыки', 'минут музыки')],
    [String(m.days), plural(m.days, 'день с музыкой', 'дня с музыкой', 'дней с музыкой')],
    [String(m.plants.length), plural(m.plants.length, 'растение выросло', 'растения выросло', 'растений выросло')],
    [String(p.lessonsDone.length), `${plural(p.lessonsDone.length, 'урок пройден', 'урока пройдено', 'уроков пройдено')} всего`],
  ];
  const rare = m.plants.filter((x) => x.rare).map((x) => SPECIES_INFO[x.species].name);

  return (
    <Modal title="Карточка месяца" onClose={onClose} width={560}>
      <div className={s.wrap}>
        <div className={s.pager}>
          <button type="button" disabled={i >= months.length - 1} onClick={() => setI(i + 1)} aria-label="Предыдущий месяц">
            ←
          </button>
          <span>
            {MONTHS[m.month]} {m.year}
          </span>
          <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} aria-label="Следующий месяц">
            →
          </button>
        </div>

        <svg ref={svgRef} className={s.card} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} shapeRendering="crispEdges">
          <defs>
            <linearGradient id="mc-sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={sky1} />
              <stop offset="1" stopColor={sky2} />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#mc-sky)" />
          <circle cx={900} cy={170} r={70} fill="#ffe27a" />
          <rect y={520} width={W} height={H - 520} fill={ground} />
          <rect y={520} width={W} height={10} fill="#000" opacity="0.06" />

          <text x={80} y={140} fontFamily={FONT} fontSize={40} fontWeight={600} fill="#3a322a" opacity="0.7">
            Музыкальный сад
          </text>
          <text x={80} y={230} fontFamily={FONT} fontSize={84} fontWeight={800} fill="#231d17">
            Мой сад
          </text>
          <text x={80} y={320} fontFamily={FONT} fontSize={64} fontWeight={700} fill="#231d17">
            {MONTHS[m.month]} {m.year}
          </text>

          {shownPlants.map((pl, k) => {
            const row = Math.floor(k / perRow);
            const col = k % perRow;
            const x = 130 + col * 118 + (row % 2) * 40;
            const y = top + 150 + row * 150;
            return (
              <g key={pl.id}>
                <ellipse cx={x} cy={y - 2} rx={44} ry={10} fill="#6b4428" opacity="0.45" />
                <Sprite species={pl.species} x={x} y={y} scale={scale} />
              </g>
            );
          })}
          {shownPlants.length === 0 && (
            <text x={W / 2} y={top + 200} textAnchor="middle" fontFamily={FONT} fontSize={36} fill="#3a322a">
              В этом месяце сад только готовится расти
            </text>
          )}
          <g transform={`translate(${W - 300} ${520 - 14 * 9}) scale(9)`}>
            <GardenerG pose="wave" outfit={p.outfit} />
          </g>

          <rect x={60} y={1030} width={W - 120} height={270} rx={36} fill="#fffaf0" opacity="0.94" />
          {stats.map(([n, label], k) => {
            const x = 100 + (k % 2) * 470;
            const y = 1110 + Math.floor(k / 2) * 120;
            return (
              <g key={label}>
                <text x={x} y={y} fontFamily={FONT} fontSize={64} fontWeight={800} fill="#2f7d3a">
                  {n}
                </text>
                <text x={x} y={y + 40} fontFamily={FONT} fontSize={28} fill="#5a4e43">
                  {label}
                </text>
              </g>
            );
          })}
          {rare.length > 0 && (
            <text x={80} y={1000} fontFamily={FONT} fontSize={32} fontWeight={600} fill="#231d17">
              ✨ Редкие: {[...new Set(rare)].join(', ')}
            </text>
          )}
        </svg>

        <div className={s.actions}>
          <button type="button" className={s.primary} onClick={download}>
            Скачать PNG
          </button>
          <button type="button" className={s.secondary} onClick={copy}>
            Скопировать
          </button>
        </div>
        {msg && <p className={s.msg}>{msg}</p>}
      </div>
    </Modal>
  );
}
