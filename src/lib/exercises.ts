/**
 * Finger-fluency exercises. Right hand starts around C4, left hand an octave lower.
 * Fingers: 1 = thumb … 5 = little finger.
 */
import { codeToMidi } from './notes';

export type Hand = 'right' | 'left' | 'both';

interface Line {
  notes: string[];
  fingers: number[];
}

export interface Exercise {
  id: string;
  group: string;
  title: string;
  description: string;
  right: Line;
  left: Line;
}

export interface StepNote {
  midi: number;
  code: string;
  finger: number;
  hand: 'R' | 'L';
}

export interface Step {
  notes: StepNote[];
}

const line = (notes: string, fingers: string): Line => ({
  notes: notes.split(' '),
  fingers: fingers.split(' ').map(Number),
});

/** Same notes an octave lower (for the left hand). */
const octaveDown = (codes: string[]) => codes.map((c) => c.replace(/(-?\d+)$/, (o) => String(Number(o) - 1)));

const mirrorFingers = (f: number[]) => f.map((x) => 6 - x);

/** Hanon No. 1 pattern over one octave, starting on each white key from `from`. */
function hanon(fromOctave: number, fingers: number[], lastFinger: number): Line {
  const whites = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const notes: string[] = [];
  const fs: number[] = [];
  const pattern = [0, 2, 3, 4, 5, 4, 3, 2];
  for (let start = 0; start < 7; start++) {
    pattern.forEach((p, i) => {
      const idx = start + p;
      notes.push(`${whites[idx % 7]}${fromOctave + Math.floor(idx / 7)}`);
      fs.push(fingers[i]);
    });
  }
  notes.push(`C${fromOctave + 1}`);
  fs.push(lastFinger);
  return { notes, fingers: fs };
}
const HANON_RH = [1, 2, 3, 4, 5, 4, 3, 2];
const HANON_LH = [5, 4, 3, 2, 1, 2, 3, 4];

function fivePosition(id: string, title: string, description: string, rhNotes: string, rhFingers: string): Exercise {
  const right = line(rhNotes, rhFingers);
  return {
    id,
    group: 'Пятипальцевая позиция',
    title,
    description,
    right,
    left: { notes: octaveDown(right.notes), fingers: mirrorFingers(right.fingers) },
  };
}

const SCALE_RH_C = '1 2 3 1 2 3 4 5 4 3 2 1 3 2 1';
const SCALE_LH_C = '5 4 3 2 1 3 2 1 2 3 1 2 3 4 5';

function scale(id: string, title: string, rh: string, rhFingers: string, lhFingers: string, description: string): Exercise {
  const right = line(rh, rhFingers);
  return {
    id,
    group: 'Гаммы',
    title,
    description,
    right,
    left: { notes: octaveDown(right.notes), fingers: lhFingers.split(' ').map(Number) },
  };
}

export const EXERCISES: Exercise[] = [
  fivePosition(
    'five-c',
    'Пять пальцев: до — соль',
    'Каждый палец на своей клавише: вверх и обратно. Следите, чтобы пальцы оставались округлыми.',
    'C4 D4 E4 F4 G4 F4 E4 D4 C4',
    '1 2 3 4 5 4 3 2 1',
  ),
  fivePosition(
    'five-c-thirds',
    'Пять пальцев: через ноту',
    'Ломаные терции в позиции до: развивает независимость пальцев.',
    'C4 E4 D4 F4 E4 G4 F4 D4 C4',
    '1 3 2 4 3 5 4 2 1',
  ),
  fivePosition(
    'five-g',
    'Пять пальцев: соль — ре',
    'Та же позиция от соль. Привыкаем ставить руку от разных нот.',
    'G4 A4 B4 C5 D5 C5 B4 A4 G4',
    '1 2 3 4 5 4 3 2 1',
  ),
  fivePosition(
    'five-d',
    'Пять пальцев: ре мажор',
    'Позиция ре мажор: третий палец на чёрной клавише фа-диез.',
    'D4 E4 F♯4 G4 A4 G4 F♯4 E4 D4',
    '1 2 3 4 5 4 3 2 1',
  ),
  {
    id: 'hanon-1',
    group: 'Ганон',
    title: 'Ганон №1',
    description: 'Классическое упражнение на беглость: фигура из восьми нот поднимается на ступень.',
    right: hanon(4, HANON_RH, 1),
    left: hanon(3, HANON_LH, 5),
  },
  scale('scale-c', 'Гамма до мажор', 'C4 D4 E4 F4 G4 A4 B4 C5 B4 A4 G4 F4 E4 D4 C4', SCALE_RH_C, SCALE_LH_C,
    'Подкладывание первого пальца после «ми» (правая рука) и перекладывание третьего — главное движение гамм.'),
  scale('scale-g', 'Гамма соль мажор', 'G4 A4 B4 C5 D5 E5 F♯5 G5 F♯5 E5 D5 C5 B4 A4 G4', SCALE_RH_C, SCALE_LH_C,
    'Один диез — фа-диез. Аппликатура та же, что в до мажоре.'),
  scale('scale-f', 'Гамма фа мажор', 'F4 G4 A4 B♭4 C5 D5 E5 F5 E5 D5 C5 B♭4 A4 G4 F4', '1 2 3 4 1 2 3 4 3 2 1 4 3 2 1', SCALE_LH_C,
    'Один бемоль — си-бемоль. Правая рука подкладывает первый палец после си-бемоль.'),
  scale('scale-am', 'Гамма ля минор', 'A4 B4 C5 D5 E5 F5 G5 A5 G5 F5 E5 D5 C5 B4 A4', SCALE_RH_C, SCALE_LH_C,
    'Натуральный минор: только белые клавиши, аппликатура как в до мажоре.'),
  {
    id: 'arp-c',
    group: 'Арпеджио',
    title: 'Арпеджио до мажор',
    description: 'Звуки аккорда до мажор по очереди: до — ми — соль — до. Рука раскрывается шире позиции.',
    right: line('C4 E4 G4 C5 G4 E4 C4', '1 2 3 5 3 2 1'),
    left: line('C3 E3 G3 C4 G3 E3 C3', '5 4 2 1 2 4 5'),
  },
  {
    id: 'arp-am',
    group: 'Арпеджио',
    title: 'Арпеджио ля минор',
    description: 'Звуки аккорда ля минор: ля — до — ми — ля.',
    right: line('A3 C4 E4 A4 E4 C4 A3', '1 2 3 5 3 2 1'),
    left: line('A2 C3 E3 A3 E3 C3 A2', '5 4 2 1 2 4 5'),
  },
];

export const EXERCISE_GROUPS = [...new Set(EXERCISES.map((e) => e.group))];

export const findExercise = (id: string) => EXERCISES.find((e) => e.id === id) ?? EXERCISES[0];

function lineSteps(l: Line, hand: 'R' | 'L'): StepNote[] {
  return l.notes.map((code, i) => ({ code, midi: codeToMidi(code)!, finger: l.fingers[i], hand }));
}

export function exerciseSteps(ex: Exercise, hand: Hand): Step[] {
  const r = lineSteps(ex.right, 'R');
  const l = lineSteps(ex.left, 'L');
  if (hand === 'right') return r.map((n) => ({ notes: [n] }));
  if (hand === 'left') return l.map((n) => ({ notes: [n] }));
  return r.map((n, i) => ({ notes: [l[i], n] }));
}

/* ---- practice state (pure) ---- */

export interface FluencyState {
  steps: Step[];
  index: number;
  /** MIDI numbers of the current step not yet played. */
  remaining: number[];
  mistakes: number;
  startedAt: number | null;
  finishedAt: number | null;
}

export function startFluency(steps: Step[]): FluencyState {
  return {
    steps,
    index: 0,
    remaining: steps[0]?.notes.map((n) => n.midi) ?? [],
    mistakes: 0,
    startedAt: null,
    finishedAt: null,
  };
}

export function fluencyPress(
  s: FluencyState,
  midi: number,
  now: number,
): { state: FluencyState; result: 'correct' | 'wrong' } {
  // Finished: playing the first note again starts a new run.
  if (s.finishedAt !== null) {
    if (s.steps[0]?.notes.some((n) => n.midi === midi)) return fluencyPress(startFluency(s.steps), midi, now);
    return { state: s, result: 'wrong' };
  }
  if (!s.remaining.includes(midi)) {
    return { state: { ...s, mistakes: s.mistakes + 1 }, result: 'wrong' };
  }
  const startedAt = s.startedAt ?? now;
  const remaining = s.remaining.filter((m) => m !== midi);
  if (remaining.length > 0) return { state: { ...s, startedAt, remaining }, result: 'correct' };
  const index = s.index + 1;
  if (index >= s.steps.length) {
    return { state: { ...s, startedAt, remaining: [], index, finishedAt: now }, result: 'correct' };
  }
  return {
    state: { ...s, startedAt, index, remaining: s.steps[index].notes.map((n) => n.midi) },
    result: 'correct',
  };
}
