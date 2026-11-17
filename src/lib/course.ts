/**
 * The course: one path, sessions in order (no time limit — a stopwatch counts the time).
 *
 * Stage 1 builds the base — keyboard, hands, notes, rhythm, the staff, two hands, scales.
 * Stage 2 brings chords and songs. Stage 3 opens improvisation.
 * Each session has a goal and steps: a lesson (theory), then trainers with a clear task.
 */
import type { SectionKey, Settings } from './storage';

export type StepKind = 'warmup' | 'theory' | 'practice' | 'music';

export interface PlanStep {
  id: string;
  kind: StepKind;
  section: SectionKey;
  /** Settings to apply when the step starts (sub-mode, level, exercise…). */
  patch: Partial<Settings>;
  title: string;
  hint: string;
  /** Rough share of the session (not shown, no limit). */
  minutes: number;
}

export interface CourseSession {
  id: string;
  stage: string;
  title: string;
  /** What you can do after this session. */
  goal: string;
  steps: PlanStep[];
}

export const STAGES = ['Фундамент', 'Аккорды и песни', 'Импровизация'] as const;

const lesson = (lessonId: string, minutes: number, hint = 'Прочитайте урок, послушайте примеры и нажмите «Урок пройден».'): Omit<PlanStep, 'id'> => ({
  kind: 'theory',
  section: 'learn',
  patch: { lessonId },
  title: '',
  hint,
  minutes,
});
const step = (kind: StepKind, title: string, section: SectionKey, patch: Partial<Settings>, minutes: number, hint: string): Omit<PlanStep, 'id'> => ({
  kind,
  section,
  patch,
  title,
  hint,
  minutes,
});

// Frequently used steps.
const five = (hand: 'right' | 'left' | 'both', minutes: number, exerciseId = 'five-c', tempo = 60) =>
  step('warmup', `Пальцы: ${exerciseId === 'five-g' ? 'позиция соль' : exerciseId === 'five-c-thirds' ? 'через ноту' : 'пять пальцев'}, ${hand === 'right' ? 'правая' : hand === 'left' ? 'левая' : 'обе руки'}`, 'fluency', { exerciseId, hand, tempo, showFingers: true, fluencySub: 1 }, minutes, 'Медленно и ровно, рука мягкая. Сначала посмотрите показ, потом играйте сами под метроном.');
const changes = (set: string, label: string, minutes: number) =>
  step('warmup', `Смены ${label}`, 'chords', { chordMode: 'changes', changesSet: set, changesSecs: 60, changesKeys: true }, minutes, 'Две-три попытки по минуте: сколько чистых смен успеете? Держите общие ноты на месте.');
const songChords = (songId: string, title: string, minutes: number, extra: Partial<Settings> = {}, hint = 'Режим «Ждать меня»: играйте аккорды по схеме, подсказки клавиш включены. Потом включите «Мелодия».') =>
  step('music', `Песня: ${title}`, 'songs', { songId, songPart: 'chords', songPlay: 'wait', songShowKeys: true, ...extra }, minutes, hint);
const inC = (id: string) => ({ songKeys: { [id]: 'C' } });

const S = (id: string, stage: (typeof STAGES)[number], title: string, goal: string, steps: Omit<PlanStep, 'id'>[]): CourseSession => ({
  id,
  stage,
  title,
  goal,
  steps: steps.map((x, i) => ({ ...x, id: `${id}-${i}` })),
});

export const SESSIONS: CourseSession[] = [
  // ---------------- 1. Фундамент ----------------
  S('s01', 'Фундамент', 'Клавиатура и пальцы', 'Находить любую белую клавишу за секунду и ставить руку в позицию «пять пальцев».', [
    lesson('keyboard', 10),
    lesson('fingers', 10),
    step('practice', 'Ноты: белые клавиши', 'notes', { noteSource: 'code', mode: 'naturals', range: { from: 4, to: 4 } }, 12, 'Тренажёр называет ноту — найдите её. Ориентируйтесь по группам чёрных клавиш.'),
    five('right', 10),
    five('left', 10),
    step('music', 'Капли: пять нот', 'drops', { dropsLevel: 'five' }, 8, 'Ритм-игра: ловите капли пальцами 1–5. Для удовольствия и точности.'),
  ]),
  S('s02', 'Фундамент', 'Октавы и пульс', 'Знать, где C4 и октавы; держать ровный пульс под метроном.', [
    five('both', 8),
    lesson('octaves', 8),
    lesson('rhythm', 10),
    step('practice', 'Ноты: три октавы', 'notes', { noteSource: 'code', mode: 'naturals', range: { from: 3, to: 5 } }, 12, 'Теперь важна и октава: C3, C4 и C5 — разные клавиши.'),
    step('music', 'Капли: октава', 'drops', { dropsLevel: 'octave' }, 10, 'Капли падают в ритме — нажимайте точно в момент касания.'),
    five('right', 12, 'five-g'),
  ]),
  S('s03', 'Фундамент', 'Чёрные клавиши', 'Называть чёрные клавиши: диезы и бемоли, тон и полутон.', [
    five('both', 8),
    lesson('accidentals', 10),
    step('practice', 'Ноты: с ♯ и ♭', 'notes', { noteSource: 'code', mode: 'accidentals', range: { from: 4, to: 4 } }, 15, 'У одной чёрной клавиши два имени: C♯ = D♭.'),
    step('practice', 'Слух: найди звук от до', 'ear', { earMode: 'notes', earLevel: { notes: 'n-c-major' } }, 10, 'Прозвучит до, потом другая нота — найдите её на слух.'),
    step('music', 'Капли: чёрные клавиши', 'drops', { dropsLevel: 'sharps' }, 10, 'Капли падают и на чёрные клавиши.'),
    five('both', 7, 'five-g'),
  ]),
  S('s04', 'Фундамент', 'Скрипичный ключ', 'Читать ноты правой руки на нотном стане.', [
    five('both', 7, 'five-g'),
    lesson('treble', 12),
    step('practice', 'Ноты: скрипичный ключ', 'notes', { noteSource: 'staff', clef: 'treble', mode: 'naturals' }, 15, 'Линия или промежуток? Считайте от знакомых нот: соль на второй линии, до на добавочной.'),
    step('practice', 'Мелодия с листа', 'notes', { noteSource: 'melody', clef: 'treble', mode: 'naturals', melodyLength: 4 }, 12, 'Играйте фразу слева направо. Смотрите на расстояние между нотами — вверх или вниз, шаг или скачок.'),
    step('practice', 'Слух: три ноты', 'ear', { earMode: 'melody', earLevel: { melody: 'm-3step' } }, 7, 'Повторите короткую мелодию на слух.'),
    step('music', 'Капли: пять нот', 'drops', { dropsLevel: 'five' }, 7, 'Побейте свой рекорд.'),
  ]),
  S('s05', 'Фундамент', 'Басовый ключ', 'Читать ноты левой руки и понимать большой нотный стан.', [
    five('left', 7),
    lesson('bass', 12),
    step('practice', 'Ноты: басовый ключ', 'notes', { noteSource: 'staff', clef: 'bass', mode: 'naturals' }, 12, 'В басовом ключе фа — на четвёртой линии, между точками ключа.'),
    step('practice', 'Ноты: оба ключа', 'notes', { noteSource: 'staff', clef: 'grand', mode: 'naturals' }, 10, 'Сначала посмотрите, в каком стане нота — это подскажет октаву.'),
    step('practice', 'Мелодия в басовом ключе', 'notes', { noteSource: 'melody', clef: 'bass', mode: 'naturals', melodyLength: 4 }, 12, 'Левой рукой или правой — как удобнее; главное — читать.'),
    step('practice', 'Слух: четыре ноты', 'ear', { earMode: 'melody', earLevel: { melody: 'm-4step' } }, 7, 'Мелодия идёт по соседним клавишам: вверх или вниз?'),
  ]),
  S('s06', 'Фундамент', 'Ритм в мелодии', 'Играть мелодию по нотам в ритме: четверти, половинные, восьмые, паузы.', [
    five('both', 7, 'five-c', 72),
    lesson('melody-rhythm', 10),
    lesson('learn-melody', 8),
    step('practice', 'Учим «Оду к радости»', 'notes', { noteSource: 'tune', melodyId: 'ex-ode', melodyStep: 'listen' }, 20, 'Фраза за фразой: «Послушай» → «С подсказками» → «По нотам» → «По памяти» → «В ритме». Звёзды — за каждую фразу.'),
    step('music', 'Капли: восьмые', 'drops', { dropsLevel: 'eighths' }, 8, 'Восьмые — две капли на долю.'),
    step('practice', 'Слух: со скачками', 'ear', { earMode: 'melody', earLevel: { melody: 'm-4skip' } }, 7, 'Скачки через клавишу — как в аккорде.'),
  ]),
  S('s07', 'Фундамент', 'Две руки', 'Читать большой нотный стан и играть двумя руками простые упражнения.', [
    five('both', 7),
    lesson('grand-staff', 10),
    step('practice', 'Две руки: по очереди', 'notes', { noteSource: 'hands', handsLevel: 'h-alt', handsPlay: 'wait', mode: 'naturals', handsBars: 2 }, 15, 'Верхний стан — правая, нижний — левая. Пять чистых упражнений проходят уровень.'),
    step('practice', 'Две руки: бас держит', 'notes', { noteSource: 'hands', handsLevel: 'h-drone', handsPlay: 'wait', mode: 'naturals', handsBars: 2 }, 13, 'Левая держит долгую ноту, правая играет четверти.'),
    step('practice', 'Учим «Twinkle, Twinkle»', 'notes', { noteSource: 'tune', melodyId: 'ex-twinkle', melodyStep: 'hints' }, 10, 'Ещё одна мелодия по фразам.'),
    step('music', 'Джем: просто поиграть', 'jam', { jamMode: 'free', jamSource: 'groove', jamGroove: 'pop', jamKey: 'C', jamMarks: 'all' }, 5, 'Играйте любые подсвеченные ноты под барабаны и аккорды — ошибок здесь нет.'),
  ]),
  S('s08', 'Фундамент', 'Интервалы и слух', 'Слышать и строить терции, квинты и октавы — кирпичики аккордов.', [
    five('right', 8, 'five-c-thirds'),
    lesson('intervals', 10),
    lesson('ear', 8),
    step('practice', 'Слух: терции', 'ear', { earMode: 'intervals', earLevel: { intervals: 'int-thirds' } }, 12, 'Большая терция — светлая, малая — грустная.'),
    step('practice', 'Слух: терция, квинта, октава', 'ear', { earMode: 'intervals', earLevel: { intervals: 'int-basic' } }, 8, 'Пойте интервал про себя перед ответом.'),
    step('practice', 'Две руки: бас на раз и три', 'notes', { noteSource: 'hands', handsLevel: 'h-bass', handsPlay: 'wait', mode: 'naturals', handsBars: 2 }, 14, 'Левая — половинными, правая — четвертями.'),
  ]),
  S('s09', 'Фундамент', 'Мажорная гамма', 'Играть гамму до мажор каждой рукой с подменой пальцев; понимать формулу мажора.', [
    lesson('major', 12),
    step('practice', 'Гамма до мажор, правая', 'fluency', { exerciseId: 'scale-c', hand: 'right', tempo: 60, showFingers: true, fluencySub: 1 }, 12, 'Подмена: большой палец подкладывается под 3-й на фа.'),
    step('practice', 'Гамма до мажор, левая', 'fluency', { exerciseId: 'scale-c', hand: 'left', tempo: 60, showFingers: true, fluencySub: 1 }, 10, 'Левая: 3-й палец перекладывается через большой на ля.'),
    step('practice', 'Гамма соль мажор', 'fluency', { exerciseId: 'scale-g', hand: 'right', tempo: 60, showFingers: true, fluencySub: 1 }, 8, 'Та же аппликатура, плюс фа-диез.'),
    step('practice', 'Две руки: вместе', 'notes', { noteSource: 'hands', handsLevel: 'h-together', handsPlay: 'wait', mode: 'naturals', handsBars: 2 }, 12, 'Обе руки на каждую долю — параллельно или в зеркале.'),
    step('music', 'Капли: восьмые', 'drops', { dropsLevel: 'eighths' }, 6, 'Для удовольствия.'),
  ]),
  S('s10', 'Фундамент', 'Минор и тональность', 'Слышать мажор и минор, играть гамму и арпеджио ля минор.', [
    step('warmup', 'Гамма до мажор, обе руки', 'fluency', { exerciseId: 'scale-c', hand: 'both', tempo: 56, showFingers: true, fluencySub: 1 }, 8, 'Медленно, руки вместе.'),
    lesson('minor', 10),
    step('practice', 'Гамма ля минор', 'fluency', { exerciseId: 'scale-am', hand: 'right', tempo: 60, showFingers: true, fluencySub: 1 }, 10, 'Те же белые клавиши, что в до мажоре, но от ля.'),
    step('practice', 'Арпеджио ля минор', 'fluency', { exerciseId: 'arp-am', hand: 'right', tempo: 60, showFingers: true, fluencySub: 1 }, 8, 'Ля-до-ми вверх и вниз — это уже аккорд, сыгранный по звуку.'),
    step('practice', 'Учим «Jingle Bells»', 'notes', { noteSource: 'tune', melodyId: 'ex-jingle', melodyStep: 'read' }, 12, 'Мелодия по нотам — уже без подсказок.'),
    step('practice', 'Две руки: ритм', 'notes', { noteSource: 'hands', handsLevel: 'h-rhythm', handsPlay: 'wait', mode: 'naturals', handsBars: 2 }, 12, 'Восьмые и точки в правой, бас в левой. Конец фундамента — вы читаете ноты двумя руками!'),
  ]),

  // ---------------- 2. Аккорды и песни ----------------
  S('s11', 'Аккорды и песни', 'Первые аккорды', 'Брать аккорды C, F, G, Am, Dm, Em формой «через клавишу» и понимать, как устроено трезвучие.', [
    step('warmup', 'Гамма до мажор, обе руки', 'fluency', { exerciseId: 'scale-c', hand: 'both', tempo: 60, showFingers: true, fluencySub: 1 }, 6, 'Разогрев пальцев.'),
    lesson('qs-first-chord', 8),
    lesson('triads', 12),
    step('practice', 'Аккорды: C, F, G', 'chords', { chordMode: 'build', chordLevel: 'maj-cfg', showChordKeys: true }, 10, 'Десять верных аккордов проходят уровень. Потом выключите подсказку клавишей K.'),
    step('practice', 'Аккорды: Am, Dm, Em', 'chords', { chordMode: 'build', chordLevel: 'min-adem', showChordKeys: true }, 8, 'Минор — та же форма от ля, ре, ми.'),
    changes('c-g', 'C ↔ G', 8),
    step('practice', 'Слух: мажор или минор', 'ear', { earMode: 'chords', earLevel: { chords: 'q-majmin' } }, 8, 'Светло или грустно?'),
  ]),
  S('s12', 'Аккорды и песни', 'Первые песни', 'Играть песню по аккордовой схеме от начала до конца.', [
    changes('c-f', 'C ↔ F', 6),
    lesson('qs-first-song', 8),
    songChords('twinkle', 'Twinkle, Twinkle', 12, { pattern: 'block' }),
    songChords('la-bamba', 'La Bamba', 10, inC('la-bamba')),
    songChords('love-me-do', 'Love Me Do', 10, inC('love-me-do')),
    step('practice', 'Аккорды от белых клавиш', 'chords', { chordMode: 'build', chordLevel: 'maj-white', showChordKeys: false }, 8, 'Мажорные аккорды от любой белой клавиши — без подсказки.'),
    step('practice', 'Слух: мажор или минор', 'ear', { earMode: 'chords', earLevel: { chords: 'q-majmin' } }, 6, 'Закрепляем.'),
  ]),
  S('s13', 'Аккорды и песни', 'Аккорды без прыжков', 'Менять C → F → G, почти не двигая рукой (обращения).', [
    changes('c-f-g', 'C → F → G', 6),
    lesson('qs-smooth', 8),
    lesson('inversions', 10),
    step('practice', 'Цепочка C – F – G – C', 'chords', { chordMode: 'progressions', progressionId: 'i-iv-v', progKey: 'C', progPlay: 'free', progShowKeys: true }, 10, 'По подсветке: общая нота остаётся на месте.'),
    step('practice', 'Аккорды: обращения', 'chords', { chordMode: 'build', chordLevel: 'inv-maj', showChordKeys: true }, 12, 'Здесь просят конкретное положение аккорда.'),
    songChords('amazing-grace', 'Amazing Grace', 8, { ...inC('amazing-grace'), pattern: 'waltz' }),
    step('practice', 'Слух: все трезвучия', 'ear', { earMode: 'chords', earLevel: { chords: 'q-triads' } }, 6, 'Мажор, минор, уменьшённый, увеличенный.'),
  ]),
  S('s14', 'Аккорды и песни', 'Четыре аккорда', 'Играть C – G – Am – F и песни на них; понимать аккорды тональности и римские цифры.', [
    changes('c-am', 'C ↔ Am', 6),
    lesson('qs-four-chords', 8),
    lesson('diatonic', 12),
    step('practice', 'Цепочка C – G – Am – F', 'chords', { chordMode: 'progressions', progressionId: 'pop', progKey: 'C', progPlay: 'free', progShowKeys: true }, 8, 'Цель — менять аккорды без остановок.'),
    changes('pop', 'C → G → Am → F', 6),
    songChords('let-it-be', 'Let It Be', 10),
    songChords('stand-by-me', 'Stand By Me', 10, inC('stand-by-me')),
  ]),
  S('s15', 'Аккорды и песни', 'Левая рука: бас', 'Играть бас левой и аккорд правой — полноценный аккомпанемент двумя руками.', [
    changes('pop', 'C → G → Am → F', 6),
    lesson('qs-left-hand', 8),
    step('practice', 'Ритм: бас — аккорд', 'chords', { chordMode: 'rhythm', pattern: 'march', progressionId: 'pop', progKey: 'C', rhythmTempo: 66, rhythmKeys: true, rhythmDrums: true }, 12, 'Каждый удар оценивается. Цель — 80 % и выше; темп можно снизить.'),
    songChords('country-roads', 'Country Roads', 10, { ...inC('country-roads'), songBass: false, pattern: 'march' }, 'Бас левой рукой играете вы: «Бас» выключен.'),
    step('music', 'Обе руки: Twinkle', 'songs', { songId: 'twinkle', songPart: 'lead', leadLeft: 'root', songShowKeys: true }, 12, 'Левая — бас, правая — мелодия. Песня ждёт обе руки.'),
    step('practice', 'Аккорды: минор от белых', 'chords', { chordMode: 'build', chordLevel: 'min-white', showChordKeys: false }, 6, 'Минорные аккорды от любой белой клавиши.'),
    five('both', 6, 'five-g', 72),
  ]),
  S('s16', 'Аккорды и песни', 'Ритм и фактуры', 'Оживлять аккорды ритмом: четверти, баллада, вальс.', [
    changes('am-f', 'Am ↔ F', 5),
    lesson('qs-rhythm', 8),
    lesson('patterns', 12),
    step('practice', 'Ритм: четверти', 'chords', { chordMode: 'rhythm', pattern: 'quarters', progressionId: 'pop', progKey: 'C', rhythmTempo: 72, rhythmKeys: true, rhythmDrums: true }, 10, 'Аккорд на каждую долю, бас на «раз».'),
    step('practice', 'Ритм: баллада', 'chords', { chordMode: 'rhythm', pattern: 'ballad', progressionId: 'pop', progKey: 'C', rhythmTempo: 60, rhythmKeys: true, rhythmDrums: true }, 10, 'Левая перебирает бас — квинта — октава, правая держит аккорд.'),
    step('practice', 'Ритм: вальс', 'chords', { chordMode: 'rhythm', pattern: 'waltz', progressionId: 'i-iv-v', progKey: 'C', rhythmTempo: 84, rhythmKeys: true, rhythmDrums: true }, 8, 'Раз — два — три.'),
    songChords('let-it-be', 'Let It Be балладой', 7, { pattern: 'ballad' }, 'Та же песня, но новой фактурой.'),
  ]),
  S('s17', 'Аккорды и песни', 'Цепочки и блюз', 'Знать главные последовательности аккордов, играть их под метроном, 12-тактовый блюз.', [
    changes('fifties', 'C → Am → F → G', 5),
    lesson('progressions', 12),
    step('practice', 'Цепочка под метроном', 'chords', { chordMode: 'progressions', progressionId: 'pop', progKey: 'C', progPlay: 'tempo', progTempo: 60, progShowKeys: true }, 10, 'Аккорды меняются сами — успевайте без остановок.'),
    step('practice', 'Минорная цепочка', 'chords', { chordMode: 'progressions', progressionId: 'minor-basic', progMinorKey: 'A', progPlay: 'free', progShowKeys: true }, 8, 'Am – Dm – Em – Am.'),
    step('practice', '12-тактовый блюз', 'chords', { chordMode: 'progressions', progressionId: 'blues', progKey: 'C', progPlay: 'tempo', progTempo: 72, progShowKeys: true }, 10, 'Три аккорда, 12 тактов. Считайте такты!'),
    step('practice', 'Ритм: андалузская', 'chords', { chordMode: 'rhythm', pattern: 'march', progressionId: 'andalusian', progMinorKey: 'A', rhythmTempo: 66, rhythmKeys: true, rhythmDrums: true }, 8, 'Am – G – F – E: испанский колорит.'),
    songChords('zvezda-solnce', 'Звезда по имени Солнце', 7, {}, 'Am, C, Dm, G — песня группы «Кино».'),
  ]),
  S('s18', 'Аккорды и песни', 'Первый концерт', 'Сыграть песню целиком под метроном, записать себя, поиграть «с группой».', [
    changes('pop', 'C → G → Am → F', 5),
    lesson('qs-concert', 6),
    step('music', 'Let It Be под метроном', 'songs', { songId: 'let-it-be', songPart: 'chords', songPlay: 'tempo', songPartner: true, pattern: 'ballad', songTempos: { 'let-it-be': 60 } }, 15, 'Без остановок от начала до конца. Мелодия звучит сама.'),
    step('music', 'Песня на выбор', 'songs', { songPart: 'chords', songPlay: 'wait', songShowKeys: true }, 12, 'Выберите любую песню с C, G, Am, F (или с пометкой «♪ ноты») и сыграйте её целиком.'),
    step('music', 'Студия: запишите себя', 'studio', {}, 10, 'Запишите песню и послушайте со стороны — очень полезно.'),
    step('music', 'Джем: Stand By Me', 'jam', { jamMode: 'free', jamSource: 'song', jamSongId: 'stand-by-me', jamDrums: 'auto' }, 12, 'Играйте аккорды или любые подсвеченные ноты под барабаны.'),
  ]),
  S('s19', 'Аккорды и песни', 'Септаккорды', 'Строить и слышать 7, maj7 и m7; играть ii – V – I.', [
    changes('minor', 'Am → Dm → E', 6),
    lesson('sevenths', 12),
    step('practice', 'Аккорды: доминантсептаккорд', 'chords', { chordMode: 'build', chordLevel: 'dom7', showChordKeys: true }, 10, 'Мажор + малая септима: C7 = до-ми-соль-си♭.'),
    step('practice', 'Аккорды: maj7 и m7', 'chords', { chordMode: 'build', chordLevel: 'maj7', showChordKeys: true }, 8, 'Потом переключите уровень на «Малый минорный (m7)».'),
    step('practice', 'Цепочка ii – V – I', 'chords', { chordMode: 'progressions', progressionId: 'ii-v-i', progKey: 'C', progPlay: 'free', progShowKeys: true }, 10, 'Dm7 – G7 – Cmaj7: главная джазовая цепочка.'),
    step('practice', 'Слух: септаккорды', 'ear', { earMode: 'chords', earLevel: { chords: 'q-sevenths' } }, 8, 'Мягкий maj7, напряжённый 7, задумчивый m7.'),
    songChords('here-comes-the-sun', 'Here Comes the Sun', 6, inC('here-comes-the-sun')),
  ]),
  S('s20', 'Аккорды и песни', 'Тональности', 'Ориентироваться в квинтовом круге, играть аккорды и песни в соль и фа мажоре.', [
    step('warmup', 'Гамма соль мажор, обе руки', 'fluency', { exerciseId: 'scale-g', hand: 'both', tempo: 56, showFingers: true, fluencySub: 1 }, 6, 'Не забудьте фа-диез.'),
    lesson('circle', 12),
    step('practice', 'Аккорды во всех тональностях', 'chords', { chordMode: 'build', chordLevel: 'majmin-all', showChordKeys: false }, 12, '24 аккорда, включая чёрные клавиши.'),
    changes('g-key', 'G → D → Em → C', 6),
    step('practice', 'Цепочка в соль мажоре', 'chords', { chordMode: 'progressions', progressionId: 'i-iv-v', progKey: 'G', progPlay: 'free', progShowKeys: true }, 8, 'G – C – D – G.'),
    step('practice', 'Ритм в соль мажоре', 'chords', { chordMode: 'rhythm', pattern: 'quarters', progressionId: 'pop', progKey: 'G', rhythmTempo: 72, rhythmKeys: true, rhythmDrums: true }, 8, 'G – D – Em – C четвертями.'),
    songChords('perfect', 'Perfect (в оригинале)', 8, { songKeys: { perfect: 'G' } }, 'Песня в своей тональности — соль мажор.'),
  ]),
  S('s21', 'Аккорды и песни', 'Ведущий лист', 'Играть мелодию правой рукой и аккорды левой по ведущему листу.', [
    five('both', 5),
    lesson('lead-sheet', 8),
    step('music', 'Обе руки: Twinkle с аккордами', 'songs', { songId: 'twinkle', songPart: 'lead', leadLeft: 'chord', songShowKeys: true }, 12, 'Левая — аккорд целиком, правая — мелодия.'),
    step('music', 'Обе руки: When the Saints', 'songs', { songId: 'saints', songPart: 'lead', leadLeft: 'root', songShowKeys: true }, 12, 'Сначала с басом, потом включите аккорды (выключите «Левая — бас»).'),
    step('music', 'Обе руки: Ода к радости', 'songs', { songId: 'ode-to-joy', songPart: 'lead', leadLeft: 'chord', songShowKeys: true }, 8, 'Знакомая мелодия — теперь с аккордами.'),
    step('practice', 'Две руки: аккорды в левой', 'notes', { noteSource: 'hands', handsLevel: 'h-chords', handsPlay: 'wait', mode: 'naturals', handsBars: 4 }, 10, 'Чтение с листа: аккорд в левой, мелодия в правой.'),
    step('practice', 'Две руки: в темпе', 'notes', { noteSource: 'hands', handsLevel: 'h-chords', handsPlay: 'tempo', handsTempo: 60, mode: 'naturals', handsBars: 2 }, 5, 'То же, но под метроном.'),
  ]),
  S('s22', 'Аккорды и песни', 'Подбор и красочные аккорды', 'Подбирать аккорды к песне на слух; sus и add9; добавлять свои песни.', [
    changes('f-key', 'F → B♭ → C', 5),
    lesson('by-ear', 10),
    lesson('color', 8),
    step('practice', 'Что я играю?', 'chords', { chordMode: 'detect' }, 7, 'Зажимайте разные сочетания — тренажёр назовёт аккорд.'),
    step('practice', 'Аккорды: sus2 и sus4', 'chords', { chordMode: 'build', chordLevel: 'sus', showChordKeys: true }, 8, 'Подвешенные аккорды — без терции.'),
    step('practice', 'Слух: все трезвучия', 'ear', { earMode: 'chords', earLevel: { chords: 'q-triads' } }, 8, 'Это основа подбора.'),
    step('music', 'Своя песня', 'songs', { songPart: 'chords' }, 14, 'Нажмите «＋ Своя» и вставьте текст любимой песни с аккордами — или подберите аккорды сами.'),
  ]),

  // ---------------- 3. Импровизация ----------------
  S('s23', 'Импровизация', 'Пентатоника и диалог', 'Импровизировать пятью нотами пентатоники и отвечать на музыкальные фразы.', [
    changes('pop', 'C → G → Am → F', 5),
    lesson('pentatonic', 8),
    lesson('call-response', 7),
    step('music', 'Джем: задание «Пентатоника»', 'jam', { jamMode: 'tasks', jamTask: 'pentatonic', jamSource: 'groove', jamGroove: 'pop', jamKey: 'C' }, 12, 'Только пять подсвеченных нот — они звучат на любом аккорде.'),
    step('music', 'Джем: диалог', 'jam', { jamMode: 'call', jamSource: 'groove', jamGroove: 'pop', jamKey: 'C', jamTempo: 84 }, 15, 'Доминик спрашивает — вы отвечаете в следующем такте.'),
    step('music', 'Джем: над Let It Be', 'jam', { jamMode: 'free', jamSource: 'song', jamSongId: 'let-it-be', jamDrums: 'auto' }, 13, 'Свободная импровизация над гармонией песни.'),
  ]),
  S('s24', 'Импровизация', 'Целевые ноты и блюз', 'Попадать в ноты аккорда на смене, играть блюз и строить свой аккомпанемент лупером.', [
    step('warmup', 'Гамма ля минор, обе руки', 'fluency', { exerciseId: 'scale-am', hand: 'both', tempo: 60, showFingers: true, fluencySub: 1 }, 5, 'Разогрев.'),
    lesson('target-notes', 8),
    lesson('blues', 10),
    step('music', 'Джем: попади в терцию', 'jam', { jamMode: 'tasks', jamTask: 'target-third', jamSource: 'prog', jamProgId: 'i-iv-v', jamKey: 'C' }, 10, 'Терция следующего аккорда подсвечивается за долю до смены.'),
    step('music', 'Джем: блюзовая нота', 'jam', { jamMode: 'tasks', jamTask: 'blue-note', jamSource: 'groove', jamGroove: 'blues', jamKey: 'C', jamDrums: 'shuffle' }, 10, 'Шаффл и «стонущая» нота.'),
    step('music', 'Лупер: свой блюз', 'jam', { jamMode: 'loop', jamSource: 'groove', jamGroove: 'blues', jamKey: 'C', jamLoopBars: 4 }, 12, 'Запишите бас, потом аккорды — и импровизируйте поверх своего аккомпанемента.'),
    step('practice', 'Блюз под метроном', 'chords', { chordMode: 'progressions', progressionId: 'blues', progKey: 'C', progPlay: 'tempo', progTempo: 80, progShowKeys: false }, 5, 'Без подсказок — вы это умеете!'),
  ]),
];

export const findSession = (id: string) => SESSIONS.find((s) => s.id === id) ?? SESSIONS[0];
export const sessionNumber = (id: string) => SESSIONS.findIndex((s) => s.id === id) + 1;
export const sessionMinutes = (s: CourseSession) => s.steps.reduce((a, x) => a + x.minutes, 0);

/** The session to do next: the first one not done yet. */
export const currentSession = (done: string[]) => SESSIONS.find((s) => !done.includes(s.id)) ?? SESSIONS[SESSIONS.length - 1];

/** Lessons in course order, with the session they belong to. */
export function courseLessons(): { lessonId: string; session: CourseSession }[] {
  const out: { lessonId: string; session: CourseSession }[] = [];
  for (const s of SESSIONS) for (const st of s.steps) if (st.kind === 'theory' && st.patch.lessonId) out.push({ lessonId: st.patch.lessonId, session: s });
  return out;
}
