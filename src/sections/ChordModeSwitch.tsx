import { Field } from '../components/ui/Controls';
import { Segmented } from '../components/ui/Segmented';
import type { ChordMode, Settings } from '../lib/storage';

/** First field of every Chords mode: switch between building, progressions and the detector. */
export function ChordModeSwitch({ settings, update }: { settings: Settings; update(p: Partial<Settings>): void }) {
  return (
    <Field label="Режим">
      <Segmented<ChordMode>
        ariaLabel="Режим аккордов"
        value={settings.chordMode}
        onChange={(chordMode) => update({ chordMode })}
        options={[
          { value: 'build', label: 'Построение', title: 'Соберите аккорд по названию' },
          { value: 'changes', label: 'Смены', title: 'Сколько смен аккордов за минуту' },
          { value: 'progressions', label: 'Цепочки', title: 'Последовательности аккордов в любой тональности' },
          { value: 'rhythm', label: 'Ритм', title: 'Аккомпанемент с ритмическим рисунком под барабаны' },
          { value: 'detect', label: 'Что я играю?', title: 'Назовёт аккорд, который вы держите' },
          { value: 'circle', label: 'Круг', title: 'Квинтовый круг' },
        ]}
      />
    </Field>
  );
}
