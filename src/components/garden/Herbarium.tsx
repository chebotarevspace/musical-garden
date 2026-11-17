import { COMMON_SPECIES, RARE_SPECIES, SEASONAL_SPECIES, SPECIES_INFO, type Species } from '../../lib/garden';
import type { Plant } from '../../lib/garden';
import { Modal } from '../ui/Modal';
import { Sprite } from './GardenScene';
import s from './Herbarium.module.css';

const HOW: Partial<Record<Species, string>> = {
  rose: 'Занимайтесь 7 дней подряд',
  lotus: 'Пройдите любой уровень аккордов или слуха',
  golden: 'Пройдите целую часть курса',
  iris: 'Сочините мелодию в «Студии»',
  magic: 'Пройдите главу «Ученика садовника»',
  lily: 'Выучите мелодию целиком в «Нотах → Песня»',
  spruce: 'Задание недели зимой',
  tulip: 'Задание недели весной',
  chamomile: 'Задание недели летом',
  pumpkin: 'Задание недели осенью',
};

const GROUPS: { title: string; list: Species[] }[] = [
  { title: 'Растут от занятий', list: COMMON_SPECIES },
  { title: 'Редкие', list: RARE_SPECIES },
  { title: 'Сезонные', list: [SEASONAL_SPECIES.winter, SEASONAL_SPECIES.spring, SEASONAL_SPECIES.summer, SEASONAL_SPECIES.autumn] },
];

/** Collection of every species: grown ones in colour, the rest as silhouettes with a clue. */
export function Herbarium({ plants, onClose }: { plants: Plant[]; onClose(): void }) {
  const count = (sp: Species) => plants.filter((p) => p.species === sp).length;
  const all = GROUPS.flatMap((g) => g.list);
  const found = all.filter((sp) => count(sp) > 0).length;
  return (
    <Modal title={`Гербарий · ${found} из ${all.length}`} onClose={onClose} width={720}>
      {GROUPS.map((g) => (
        <section key={g.title} className={s.group}>
          <h3>{g.title}</h3>
          <div className={s.grid}>
            {g.list.map((sp) => {
              const n = count(sp);
              const info = SPECIES_INFO[sp];
              return (
                <div key={sp} className={s.card} data-found={n > 0 || undefined}>
                  <svg viewBox="0 0 40 52" width="48" height="62" aria-hidden="true">
                    <Sprite species={sp} x={20} y={50} silhouette={n ? undefined : '#3b3640'} />
                  </svg>
                  <div className={s.name}>{n ? info.name : '???'}</div>
                  <div className={s.meta}>{n ? `× ${n}` : HOW[sp] ?? info.hint.replace(/^вырос(ла)? /, 'Растёт ')}</div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </Modal>
  );
}
