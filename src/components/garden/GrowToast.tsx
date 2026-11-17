import { useEffect, useState } from 'react';
import { type Plant, SPECIES_INFO } from '../../lib/garden';
import { progress } from '../../lib/progress';
import { playCorrect } from '../../lib/audio';
import { Sprite } from './GardenScene';
import s from './GrowToast.module.css';

/** A small celebration whenever a plant finishes growing. */
export function GrowToast({ sound, onOpenGarden }: { sound: boolean; onOpenGarden(): void }) {
  const [plant, setPlant] = useState<Plant | null>(null);

  useEffect(
    () =>
      progress.onGrow((p) => {
        setPlant(p);
        if (sound) [72, 76, 79, 84].forEach((m, i) => window.setTimeout(() => playCorrect(m), i * 110));
      }),
    [sound],
  );

  useEffect(() => {
    if (!plant) return;
    const t = window.setTimeout(() => setPlant(null), 6500);
    return () => window.clearTimeout(t);
  }, [plant]);

  if (!plant) return null;
  const info = SPECIES_INFO[plant.species];
  return (
    <div className={s.toast} role="status" key={plant.id}>
      <svg className={s.art} viewBox="0 0 40 52" width="52" height="68" aria-hidden="true">
        <Sprite species={plant.species} x={20} y={50} />
      </svg>
      <div className={s.text}>
        <strong>{plant.rare ? 'Редкое растение! ' : 'В саду новое растение! '}</strong>
        <span>
          {info.name} — {info.hint}.
        </span>
      </div>
      <button
        type="button"
        className={s.btn}
        onClick={() => {
          setPlant(null);
          onOpenGarden();
        }}
      >
        В сад
      </button>
      <button type="button" className={s.close} onClick={() => setPlant(null)} aria-label="Закрыть">
        ×
      </button>
    </div>
  );
}
