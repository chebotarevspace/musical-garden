/** Ear-training levels and question generation. */
import { weightedPick } from './adaptive';
import { type QualityId, QUALITIES, ROOTS, chordVoicing, pcOf } from './chords';
import { INTERVALS } from './chordDetect';

export type EarMode = 'intervals' | 'chords' | 'notes' | 'melody';
export type IntervalDirection = 'up' | 'down' | 'harmonic';

export interface EarLevel {
  id: string;
  mode: EarMode;
  title: string;
  hint: string;
  /** Interval ids, chord quality ids, or MIDI numbers (notes mode). */
  items: string[];
}

export const EAR_GOAL = 10;

const whites = (lo: number, hi: number) => {
  const out: string[] = [];
  for (let m = lo; m <= hi; m++) if (![1, 3, 6, 8, 10].includes(m % 12)) out.push(String(m));
  return out;
};
const all = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i));

export const EAR_LEVELS: EarLevel[] = [
  { id: 'int-thirds', mode: 'intervals', title: 'Большая и малая терция', hint: 'Светлая (4 полутона) или грустная (3 полутона)?', items: ['m3', 'M3'] },
  { id: 'int-basic', mode: 'intervals', title: 'Терции, квинта, октава', hint: 'Квинта звучит «пусто» и устойчиво, октава — как та же нота выше.', items: ['m3', 'M3', 'P5', 'P8'] },
  { id: 'int-plus', mode: 'intervals', title: '+ секунды и кварта', hint: 'Секунды — соседние ноты, кварта — «призыв».', items: ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'P8'] },
  { id: 'int-all', mode: 'intervals', title: 'Все интервалы в октаве', hint: 'Добавляются тритон, сексты и септимы.', items: INTERVALS.map((i) => i.id) },
  { id: 'q-majmin', mode: 'chords', title: 'Мажор или минор', hint: 'Мажор — светлый, минор — грустный.', items: ['maj', 'min'] },
  { id: 'q-triads', mode: 'chords', title: 'Все трезвучия', hint: 'Уменьшённое — напряжённое, увеличенное — «зависшее».', items: ['maj', 'min', 'dim', 'aug'] },
  { id: 'q-sevenths', mode: 'chords', title: 'Септаккорды', hint: 'maj7 — мечтательный, 7 — тянет к разрешению, m7 — мягкий.', items: ['maj7', 'dom7', 'min7'] },
  { id: 'q-all', mode: 'chords', title: 'Трезвучия и септаккорды', hint: 'Восемь видов аккордов вперемешку.', items: ['maj', 'min', 'dim', 'aug', 'maj7', 'dom7', 'min7', 'm7b5'] },
  { id: 'n-c-major', mode: 'notes', title: 'Белые клавиши от C4', hint: 'Сначала звучит C4 для ориентира, потом загаданная нота.', items: whites(61, 72) },
  { id: 'n-chromatic', mode: 'notes', title: 'Все клавиши от C4', hint: 'Включая чёрные клавиши в октаве C4–C5.', items: all(61, 72) },
  { id: 'm-3step', mode: 'melody', title: 'Три ноты по соседству', hint: 'Мелодия идёт по соседним белым клавишам. Первая нота подсвечена.', items: [] },
  { id: 'm-4step', mode: 'melody', title: 'Четыре ноты по соседству', hint: 'Вверх или вниз — слушайте, куда идёт мелодия.', items: [] },
  { id: 'm-4skip', mode: 'melody', title: 'Четыре ноты со скачками', hint: 'Появляются скачки через клавишу — как в аккорде.', items: [] },
  { id: 'm-5skip', mode: 'melody', title: 'Пять нот, скачки шире', hint: 'Скачки до квинты. Сначала спойте фразу про себя.', items: [] },
  { id: 'm-6', mode: 'melody', title: 'Шесть нот', hint: 'Длинная фраза: запоминайте её как слова.', items: [] },
  { id: 'm-songs', mode: 'melody', title: 'Фразы из песен', hint: 'Кусочки мелодий из раздела «Песни».', items: [] },
  { id: 'm-mine', mode: 'melody', title: 'Фразы из моих мелодий', hint: 'Кусочки мелодий, которые вы учите в «Нотах → Песня».', items: [] },
  { id: 'n-two-octaves', mode: 'notes', title: 'Две октавы', hint: 'Белые клавиши от C3 до C5. Ориентир — C4.', items: whites(48, 72).filter((m) => m !== '60') },
];

export const levelsFor = (mode: EarMode) => EAR_LEVELS.filter((l) => l.mode === mode);
export const findEarLevel = (id: string, mode: EarMode) => EAR_LEVELS.find((l) => l.id === id && l.mode === mode) ?? levelsFor(mode)[0];

export interface EarQuestion {
  /** The correct answer: interval id, quality id, or MIDI number as string. */
  answer: string;
  /** Steps to play (each step = notes together). */
  steps: number[][];
  /** Keys to show after answering. */
  notes: number[];
  /** Root spelling for chord questions (for display). */
  rootPc?: number;
}

type Rng = () => number;
const pick = <T,>(list: T[], rng: Rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

export function makeQuestion(level: EarLevel, prev: EarQuestion | null, direction: IntervalDirection, rng: Rng = Math.random): EarQuestion {
  // Avoid asking the very same thing twice in a row when there is a choice.
  const key = (x: string) => `ear:${level.mode}:${x}`;
  let answer = weightedPick(level.items, key, rng);
  if (prev && level.items.length > 1 && answer === prev.answer) answer = weightedPick(level.items.filter((x) => x !== answer), key, rng);

  if (level.mode === 'intervals') {
    const semi = INTERVALS.find((i) => i.id === answer)!.semitones;
    const low = 52 + Math.floor(rng() * 14); // E3…F4
    const notes = [low, low + semi];
    const steps = direction === 'harmonic' ? [notes] : direction === 'down' ? [[notes[1]], [notes[0]]] : [[notes[0]], [notes[1]]];
    return { answer, steps, notes };
  }
  if (level.mode === 'chords') {
    const root = pick(ROOTS.allMajor, rng);
    const voicing = chordVoicing({ root, quality: answer as QualityId, inversion: 0, bassRequired: false });
    // Arpeggio first, then the chord together — easier to hear the quality.
    return { answer, steps: [...voicing.map((m) => [m]), voicing], notes: voicing, rootPc: pcOf(root) };
  }
  const target = Number(answer);
  return { answer, steps: [[60], [target]], notes: [target] };
}

export const QUALITY_LABEL: Record<string, { short: string; name: string }> = Object.fromEntries(
  (Object.keys(QUALITIES) as QualityId[]).map((q) => [
    q,
    {
      short: q === 'maj' ? 'мажор' : q === 'min' ? 'минор' : q === 'dim' ? 'dim' : q === 'aug' ? 'aug' : QUALITIES[q].suffix.replace('b', '♭'),
      name: q === 'maj' ? 'мажорное трезвучие' : q === 'min' ? 'минорное трезвучие' : QUALITIES[q].name,
    },
  ]),
);
