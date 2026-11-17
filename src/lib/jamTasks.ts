/** «Задания» in the Jam: a ladder of small improvisation goals, each measured from what you play. */
import { type Chord, chordPcs } from './chords';
import type { JamHarmony } from './jam';

export interface JamEvent {
  midi: number;
  /** Global beat since the jam started. */
  beat: number;
  /** Global beat where the current chord started. */
  chordStart: number;
  chord: Chord;
}

export interface JamTask {
  id: string;
  title: string;
  hint: string;
  goal: number;
  unit: string;
  /** Suggested groove for this task. */
  groove?: string;
  measure(events: JamEvent[], h: JamHarmony): number;
}

const pc = (m: number) => ((m % 12) + 12) % 12;
const tones = (c: Chord) => chordPcs(c).map((x) => x % 12);

export const JAM_TASKS: JamTask[] = [
  {
    id: 'one-note',
    title: 'Одна нота — много ритмов',
    hint: 'Играйте только тонику (любую октаву), но в разных местах такта: на доле, между долями, сериями. Ритм — половина музыки.',
    goal: 16,
    unit: 'нот',
    measure(ev, h) {
      const tonic = ev.filter((e) => pc(e.midi) === h.tonicPc);
      const places = new Set(tonic.map((e) => Math.round(e.beat * 2) % (h.meter * 2)));
      return places.size >= 4 ? tonic.length : Math.min(tonic.length, 12);
    },
  },
  {
    id: 'chord-tones',
    title: 'Только ноты аккорда',
    hint: 'Играйте ноты звучащего аккорда (они подсвечены ярче). Меняется аккорд — меняются и ваши ноты.',
    goal: 20,
    unit: 'нот',
    measure: (ev) => ev.filter((e) => tones(e.chord).includes(pc(e.midi))).length,
  },
  {
    id: 'pentatonic',
    title: 'Пентатоника',
    hint: 'Пять нот, которые звучат на любом аккорде. Используйте хотя бы четыре разные ноты пентатоники.',
    goal: 30,
    unit: 'нот',
    measure(ev, h) {
      const ok = ev.filter((e) => h.pentaPcs.has(pc(e.midi)));
      const distinct = new Set(ok.map((e) => pc(e.midi))).size;
      return distinct >= 4 ? ok.length : Math.min(ok.length, 25);
    },
  },
  {
    id: 'target-third',
    title: 'Попади в терцию',
    hint: 'На первую долю нового аккорда сыграйте его терцию — она подсвечена заранее. Так импровизация «следует» за гармонией.',
    goal: 6,
    unit: 'попаданий',
    measure(ev) {
      const hit = new Set<number>();
      for (const e of ev) if (Math.abs(e.beat - e.chordStart) <= 0.5 && pc(e.midi) === tones(e.chord)[1]) hit.add(e.chordStart);
      return hit.size;
    },
  },
  {
    id: 'blue-note',
    title: 'Блюзовая нота',
    hint: 'Сыграйте «блюзовую» ноту (пониженную пятую ступень) и сразу уйдите на ноту аккорда. Получится тот самый блюзовый «стон».',
    goal: 5,
    unit: 'раз',
    groove: 'blues',
    measure(ev, h) {
      const blue = (h.tonicPc + 6) % 12;
      let n = 0;
      for (let i = 0; i < ev.length - 1; i++) {
        if (pc(ev[i].midi) !== blue) continue;
        const next = ev[i + 1];
        if (next.beat - ev[i].beat <= 1.01 && tones(next.chord).includes(pc(next.midi))) n++;
      }
      return n;
    },
  },
];

export const findJamTask = (id: string) => JAM_TASKS.find((t) => t.id === id) ?? JAM_TASKS[0];
