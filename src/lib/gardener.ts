/**
 * The gardener: outfits to unlock, things he says, and his surprise visits with a tiny task.
 */
import type { Progress } from './progress';
import { summarize } from './progress';

/* ---------------- outfits ---------------- */

export interface Outfit {
  id: string;
  name: string;
  how: string;
  unlocked(p: Progress): boolean;
}

const minutesIn = (p: Progress, section: string) =>
  Object.values(p.days).reduce((a, d) => a + ((d.bySection as Record<string, number>)[section] ?? 0), 0) / 60000;

export const OUTFITS: Outfit[] = [
  { id: 'straw', name: 'Соломенная шляпа', how: 'Вырастите первое растение', unlocked: (p) => p.plants.length >= 1 },
  { id: 'flower', name: 'Цветок за ухом', how: 'Пройдите 3 урока', unlocked: (p) => p.lessonsDone.length >= 3 },
  { id: 'scarf', name: 'Тёплый шарф', how: 'Занимайтесь 3 дня подряд', unlocked: (p) => summarize(p).streak >= 3 },
  { id: 'cap', name: 'Кепка садовника', how: 'Вырастите 5 растений', unlocked: (p) => p.plants.length >= 5 },
  { id: 'headphones', name: 'Наушники', how: '10 минут в «Джеме»', unlocked: (p) => minutesIn(p, 'jam') >= 10 },
  { id: 'beret', name: 'Берет художника', how: 'Помогите Доминику 3 раза', unlocked: (p) => p.visits >= 3 },
  { id: 'crown', name: 'Венок из листьев', how: 'Вырастите золотое дерево', unlocked: (p) => p.plants.some((x) => x.species === 'golden') },
];

/* ---------------- lines ---------------- */

const TIPS = [
  'Играйте медленно и ровно — скорость придёт сама.',
  'Пять минут каждый день полезнее, чем час раз в неделю.',
  'Ошибка — это нота, которая ещё ищет своё место.',
  'Спойте мелодию про себя — пальцы найдут её быстрее.',
  'Рука округлая, будто держите яблоко!',
  'Не смотрите на руки слишком часто — доверяйте пальцам.',
  'Сыграйте что-нибудь прямо здесь, в саду, — растения затанцуют!',
];

const FACTS = [
  'У рояля 88 клавиш: 52 белые и 36 чёрных.',
  'Ноту ля первой октавы обычно настраивают на 440 герц.',
  'Названия до, ре, ми пришли из старинного латинского гимна — это первые слоги его строк.',
  'Слово «пианино» по-итальянски значит «маленькое фортепиано».',
  'Бамбук может вырасти почти на метр за день. А ваши пальцы — на одну гамму!',
  'Подсолнухи поворачиваются к солнцу. А я — к музыке.',
];

const JOKES = [
  'Поливаю росток ровно в темпе 60: по капле в секунду.',
  'Диезы колючие, как кактусы. Но я их всё равно люблю.',
  'Мой любимый аккорд — до мажор. Простой и хрустящий, как огурец.',
  'Говорят, если сыграть гамму задом наперёд, сад растёт обратно. Шучу!',
  'Я бы сыграл сам, но у меня всего две лапки.',
  'Меня зовут Доминик — как доминанта: я тоже всегда тяну вас обратно к музыке.',
  'До-ми-ник: до, ми — и немножко ник. Почти мажорное трезвучие!',
];

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

export function randomLine(): string {
  const r = Math.random();
  return pick(r < 0.4 ? TIPS : r < 0.75 ? FACTS : JOKES);
}

export const TICKLE = ['Щекотно!', 'Эй, я работаю!', 'Хи-хи!', 'Осторожно, лейка!', 'Ну всё, танцую!'];

/** What the gardener says when you open the garden. */
export function greetingLine(p: Progress, hour: number, sproutFrac: number, questReady: boolean): string {
  const { streak } = summarize(p);
  if (hour >= 23 || hour < 6) return 'Тсс… сад спит. Но для музыки никогда не поздно.';
  if (questReady) return 'Задание недели выполнено! Пора сажать сезонное растение.';
  if (p.plants.length === 0 && sproutFrac === 0) return 'Привет! Я Доминик, садовник. Поиграйте — и я посажу первое семечко.';
  if (sproutFrac >= 0.8) return 'Росток почти вырос — ещё пара минут игры!';
  if (streak >= 3) return `${streak} дня подряд! Солнышко так и светит.`;
  if (hour < 12) return 'Доброе утро! Полить росток музыкой?';
  return randomLine();
}

export const isNight = (hour: number) => hour >= 23 || hour < 6;

/* ---------------- surprise visits ---------------- */

const NOTE_NAMES = ['до', 'до-диез', 'ре', 'ми-бемоль', 'ми', 'фа', 'фа-диез', 'соль', 'ля-бемоль', 'ля', 'си-бемоль', 'си'];

export interface VisitTask {
  text: string;
  /** Pitch classes that must sound together (one for a note). */
  pcs: number[];
}

const CHORDS: { name: string; pcs: number[] }[] = [
  { name: 'до мажор (C)', pcs: [0, 4, 7] },
  { name: 'фа мажор (F)', pcs: [5, 9, 0] },
  { name: 'соль мажор (G)', pcs: [7, 11, 2] },
  { name: 'ля минор (Am)', pcs: [9, 0, 4] },
  { name: 'ре минор (Dm)', pcs: [2, 5, 9] },
  { name: 'ми минор (Em)', pcs: [4, 7, 11] },
];

const OPENERS = ['Псст! Нашёл в грядке', 'Ой, из земли выглянула', 'Смотрите, на листке написана', 'Мне приснилась'];

export function makeVisitTask(level: Progress['level'], rng: () => number = Math.random): VisitTask {
  const opener = OPENERS[Math.floor(rng() * OPENERS.length)];
  const chord = level !== 'beginner' && rng() < 0.5;
  if (chord) {
    const c = CHORDS[Math.floor(rng() * CHORDS.length)];
    return { text: `${opener} аккорд ${c.name}. Сыграйте его — и я полью росток!`, pcs: c.pcs };
  }
  const whites = [0, 2, 4, 5, 7, 9, 11];
  const pc = level === 'beginner' || rng() < 0.7 ? whites[Math.floor(rng() * whites.length)] : Math.floor(rng() * 12);
  return { text: `${opener} нота ${NOTE_NAMES[pc]}. Сыграйте её в любой октаве — и я полью росток!`, pcs: [pc] };
}

/** Twinkle, Twinkle: C C G G A A G — intervals between the seven notes, any key. */
export const SECRET_TUNE = [0, 7, 0, 2, 0, -2];

export type SecretFx = 'dance' | 'fireworks' | 'cake' | 'snow';

/** Hidden tunes: play one (in any key, anywhere in the app) and something happens. */
export interface SecretTune {
  id: string;
  title: string;
  /** Steps in semitones between consecutive notes. */
  intervals: number[];
  riddle: string;
  line: string;
  fx: SecretFx;
}

export const SECRETS: SecretTune[] = [
  {
    id: 'twinkle',
    title: 'Twinkle, Twinkle',
    intervals: SECRET_TUNE,
    riddle: 'Колыбельная про маленькую звёздочку. Начинается с двух одинаковых нот.',
    line: 'Это же «Twinkle, Twinkle»! Мой любимый мотив! 💃',
    fx: 'dance',
  },
  {
    id: 'ode',
    title: 'Ода к радости',
    intervals: [0, 1, 2, 0, -2, -1, -2],
    riddle: 'Самая знаменитая мелодия Бетховена: две одинаковые ноты и шаги вверх по белым.',
    line: 'Ода к радости! Бетховен аплодирует вам прямо из XIX века. 🎆',
    fx: 'fireworks',
  },
  {
    id: 'birthday',
    title: 'Happy Birthday',
    intervals: [0, 2, -2, 5, -1],
    riddle: 'Песня, которую раз в году поют каждому из нас.',
    line: 'С днём рождения! Не знаю, у кого он сегодня, но торт уже здесь. 🎂',
    fx: 'cake',
  },
  {
    id: 'jingle',
    title: 'Jingle Bells',
    intervals: [0, 0, 0, 0, 0, 3, -7, 2, 2],
    riddle: 'Бубенцы звенят: три одинаковые ноты, ещё три — и вниз к началу гаммы.',
    line: 'Jingle Bells! Даже в саду пошёл снег. ❄️',
    fx: 'snow',
  },
];

/** Which secret the last notes complete, if any. */
export function matchSecret(notes: number[]): SecretTune | null {
  for (const s of SECRETS) {
    const n = s.intervals.length + 1;
    if (notes.length < n) continue;
    const tail = notes.slice(-n);
    if (s.intervals.every((d, i) => tail[i + 1] - tail[i] === d)) return s;
  }
  return null;
}

/** The garden cat. */
export const CAT_NAME = 'Бемоль';
export const CAT_LINES = [
  'Мрр… Бемоль одобряет вашу гамму.',
  'Бемоль считает, что вы играете очень мурлыкательно.',
  'Бемоль понижает настроение на полтона? Нет — повышает!',
  'Мяу! В переводе с кошачьего: «ещё одну песенку».',
  'Бемоль спал на басовых клавишах. Говорит, там теплее.',
  'Бемоль ловил скрипичный ключ. Не поймал, но старался.',
  'Мурр. Если гладить кота после гаммы, она запоминается лучше. Научный факт (почти).',
];

/** «Печенье с предсказанием»: one a day. */
export const FORTUNES = [
  'Сегодня ваша левая рука удивит правую.',
  'Через 21 день занятий аккорды начнут находиться сами — пальцы запомнят дорогу.',
  'Ошибка — это просто нота, которая пришла раньше времени.',
  'Слово «до-ре-ми» придумал монах Гвидо Аретинский почти тысячу лет назад — из первых слогов гимна.',
  'У рояля около 230 струн: на одну клавишу в середине натянуто сразу три.',
  'Медленно — это тоже быстро, если без остановок.',
  'Самая короткая дорога к беглости — пять минут, но каждый день.',
  'Моцарт сочинял пьесы уже в пять лет. Но и вы когда-то начали — это главное.',
  'Сегодня хорошо получатся мажорные аккорды. А завтра — минорные, для равновесия.',
  'Пианино в XVIII веке называли «пиано-форте»: оно умело играть и тихо, и громко.',
  'Если мелодия не выходит — спойте её. Голос подскажет пальцам.',
  'Сегодняшнее упражнение — завтрашняя лёгкость.',
  'Чёрные клавиши группами по две и по три — это ваши маяки на клавиатуре.',
  'Блюз родился из пения: «блюзовая нота» — это вздох между мажором и минором.',
  'Хорошая новость: метроном никогда не обижается, если вы сбились.',
  'Вам выпала ре-диез. Она же ми-бемоль. Удача в двойном размере!',
  'Сыграйте сегодня любимую песню — просто так, для души.',
  'Пауза в музыке звучит так же важно, как нота. Отдыхать тоже можно.',
  'Квинта — самый «прозрачный» интервал. С неё начинается круг квинт.',
  'Сегодня вы на одну песню ближе к тому, чтобы играть с друзьями.',
  'Бетховен почти не слышал, когда писал Девятую симфонию. Музыка живёт внутри.',
  'Самая первая нота — самая смелая. Остальные пойдут за ней.',
  'Звёзды говорят: сегодня отлично пойдёт ритм-игра «Капли».',
  'Любой аккорд можно сыграть тремя способами. Выберите самый удобный.',
  'Доминик просил передать: росток гордится вами.',
  'Кот Бемоль советует растягивать пальцы перед игрой. И спину. И хвост.',
  'Чтобы мелодия запомнилась, сыграйте её трижды: глазами, руками и по памяти.',
  'Сегодня день мажора. Улыбнитесь клавиатуре — она ответит.',
];

/** The cookie of the day: the same all day, a new one tomorrow. */
export function fortuneFor(day: string): string {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FORTUNES[h % FORTUNES.length];
}
