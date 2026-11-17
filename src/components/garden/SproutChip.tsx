import { GROW_MS, growthStage } from '../../lib/garden';
import { useProgressValue } from '../../hooks/useProgress';
import { Sprite } from './GardenScene';
import s from './SproutChip.module.css';

/** Header chip: the sprout growing right now — a constant, gentle reminder of the garden. */
export function SproutChip({ onOpen }: { onOpen(): void }) {
  // Rounded to whole percents so the header doesn't redraw on every key press.
  const pct = useProgressValue((p) => Math.floor(((p.sprout?.activeMs ?? 0) / GROW_MS) * 100));
  const count = useProgressValue((p) => p.plants.length);
  const ms = (pct / 100) * GROW_MS;
  const frac = Math.min(1, ms / GROW_MS);
  const stage = growthStage(frac);
  const left = Math.max(1, Math.ceil((GROW_MS - ms) / 60000));
  return (
    <button
      type="button"
      className={s.chip}
      onClick={onOpen}
      title={ms > 0 ? `Росток: ${Math.round(frac * 100)}% · ещё ~${left} мин игры до нового растения` : 'Начните играть — и семечко прорастёт'}
      aria-label={`Росток ${Math.round(frac * 100)}%, открыть сад`}
    >
      <svg viewBox="7 14 22 16" width="26" height="19" aria-hidden="true">
        <Sprite species={stage === 0 ? 'seed' : 'sprout'} x={18} y={30} scale={0.62} />
      </svg>
      <span className={s.meter}>
        <i style={{ width: `${frac * 100}%` }} />
      </span>
      <span className={s.count}>{count}</span>
    </button>
  );
}
