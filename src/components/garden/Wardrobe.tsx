import { OUTFITS } from '../../lib/gardener';
import { type Progress, progress } from '../../lib/progress';
import { Modal } from '../ui/Modal';
import { GardenerSvg } from './GardenerArt';
import s from './Herbarium.module.css';

/** The gardener's wardrobe: outfits unlock with your milestones. */
export function Wardrobe({ p, onClose }: { p: Progress; onClose(): void }) {
  const open = OUTFITS.filter((o) => o.unlocked(p)).length;
  return (
    <Modal title={`Гардероб Доминика · ${open} из ${OUTFITS.length}`} onClose={onClose} width={640}>
      <div className={s.grid}>
        <button type="button" className={s.card} data-found data-on={!p.outfit || undefined} onClick={() => progress.setOutfit(null)}>
          <GardenerSvg size={72} />
          <div className={s.name}>Как есть</div>
          <div className={s.meta}>{!p.outfit ? 'надето' : 'без наряда'}</div>
        </button>
        {OUTFITS.map((o) => {
          const ok = o.unlocked(p);
          return (
            <button
              key={o.id}
              type="button"
              className={s.card}
              data-found={ok || undefined}
              data-on={p.outfit === o.id || undefined}
              disabled={!ok}
              onClick={() => progress.setOutfit(o.id)}
              title={ok ? 'Надеть' : o.how}
            >
              <span style={{ opacity: ok ? 1 : 0.35, filter: ok ? undefined : 'grayscale(1)' }}>
                <GardenerSvg size={72} outfit={o.id} />
              </span>
              <div className={s.name}>{ok ? o.name : '???'}</div>
              <div className={s.meta}>{p.outfit === o.id ? 'надето' : ok ? 'надеть' : o.how}</div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
