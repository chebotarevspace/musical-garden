import { Callout, ChordRow, Figure, Keys, PatternFig, Practice, Timeline } from '../Figures';
import { voicingOf } from '../music';
import type { Lesson } from './types';

/**
 * Hands-on chord lessons of stage 2 (chords and songs): music first, theory just in time —
 * the first chord in five minutes, the first song on day one, a whole song by the end of the week.
 */
const PART = 'Аккорды и песни';

const marks = (notes: (string | number)[], labels: string[] = [], tone: 'accent' | 'blue' | 'green' | 'gold' = 'accent') =>
  Object.fromEntries(notes.map((n, i) => [n, { label: labels[i], tone }]));

export const PART0: Lesson[] = [
  {
    id: 'qs-first-chord',
    part: PART,
    title: 'Первый аккорд за пять минут',
    summary: 'Одна форма руки — три аккорда, на которых держатся сотни песен.',
    minutes: 5,
    Body: () => (
      <>
        <p className="lead">
          Фундамент позади — пора аккордов! Нажмите «Послушать»: эти четыре аккорда — основа множества песен, от рок-н-ролла до
          колыбельных. Через пять минут вы сыграете их сами.
        </p>
        <ChordRow chords={['C', 'F', 'G', 'C']} bpm={56} caption="C — F — G — C. Нажимайте на карточки: каждый аккорд звучит отдельно." />

        <h2>Найдите «до»</h2>
        <p>
          Посмотрите на чёрные клавиши: они идут группами по <b>две</b> и по <b>три</b>. Белая клавиша <b>слева от двух
          чёрных</b> — это нота <b>до</b> (по-латински C). Возьмите ту, что ближе к середине клавиатуры.
        </p>
        <Figure caption="«До» — слева от пары чёрных клавиш. Нажимайте клавиши: они звучат.">
          <Keys from="C4" to="B4" names="both" marks={marks(['C4'], ['до'])} />
        </Figure>

        <h2>Форма «через клавишу»</h2>
        <p>
          Поставьте правую руку так: <b>большой палец</b> (1-й) на до, <b>средний</b> (3-й) — через одну белую клавишу, на
          ми, <b>мизинец</b> (5-й) — ещё через одну, на соль. Нажмите все три вместе. Это аккорд <b>C</b> — до мажор.
        </p>
        <Figure caption="C (до мажор): до — ми — соль. Пальцы 1, 3, 5." play={[voicingOf('C')]} bpm={40} hold={1.2}>
          <Keys from="C4" to="B4" names="en" marks={marks(['C4', 'E4', 'G4'], ['1', '3', '5'])} />
        </Figure>
        <p>
          Теперь главный секрет: эта форма <b>переносится</b>. Сдвиньте руку так, чтобы большой палец встал на <b>фа</b> — и
          получится аккорд <b>F</b>. Поставьте большой палец на <b>соль</b> — это <b>G</b>. Рука та же, меняется только место.
        </p>
        <Figure caption="F (фа — ля — до) и G (соль — си — ре): та же форма «через клавишу»." play={[voicingOf('F'), voicingOf('G')]} bpm={40} hold={1.2}>
          <Keys from="F4" to="D5" names="en" marks={{ ...marks(['F4', 'A4', 'C5'], ['F', '', ''], 'blue'), ...marks(['G4', 'B4', 'D5'], ['G', '', ''], 'green') }} />
        </Figure>

        <Callout kind="try">
          Сыграйте медленно: <b>C</b> — четыре счёта, <b>F</b> — четыре, <b>G</b> — четыре, снова <b>C</b>. Считайте вслух
          «раз-два-три-четыре». Неважно, если рука переезжает не сразу — скорость придёт через пару дней.
        </Callout>

        <Practice title="Аккорды · Мажор: C, F, G" to={{ section: 'chords', chordMode: 'build', chordLevel: 'maj-cfg', showChordKeys: true }}>
          Тренажёр называет аккорд, клавиши подсвечены. Когда руки запомнят, выключите подсказку (клавиша K).
        </Practice>
      </>
    ),
  },

  {
    id: 'qs-first-song',
    part: PART,
    title: 'Первая песня на трёх аккордах',
    summary: 'Как читать песню по буквам аккордов — и сыграть её сегодня же, в своём темпе.',
    minutes: 6,
    Body: () => (
      <>
        <p className="lead">
          Чтобы аккомпанировать песне, ноты не нужны. Музыканты играют по <b>аккордовой схеме</b>: над словами написаны буквы
          аккордов, а вы просто меняете аккорд там, где появилась новая буква.
        </p>

        <h2>Как читать схему</h2>
        <p>
          Песня делится на <b>такты</b> — отрезки по четыре счёта. В каждом такте один аккорд (иногда два — тогда каждый на два счёта). Играйте аккорд на
          «раз» и держите до следующего такта. Вот начало «Twinkle, Twinkle»:
        </p>
        <ChordRow chords={['C', 'F', 'C', 'G', 'C', 'G', 'C']} bpm={64} caption="«Twinkle, twinkle» — C · «little star» — F, потом C · «how I wonder» — G, C · «what you are» — G, C." />

        <Callout kind="tip" title="Песня подождёт">
          В разделе «Песни» есть режим <b>«Ждать меня»</b>: следующий аккорд загорается, только когда вы сыграли текущий. Ни
          метронома, ни спешки — можно искать каждый аккорд сколько угодно.
        </Callout>

        <h2>Песни, которые уже можно играть</h2>
        <p>
          На C, F и G держатся целые песни. Тональность в тренажёре можно менять — мы откроем их сразу в до мажоре, где все
          три аккорда на белых клавишах:
        </p>
        <ul>
          <li>
            <b>Twinkle, Twinkle</b> — самая простая, медленная.
          </li>
          <li>
            <b>La Bamba</b> и <b>Twist and Shout</b> — те же три аккорда по кругу, весело и быстро.
          </li>
          <li>
            <b>Love Me Do</b> (The Beatles) — первый хит «битлов», на трёх аккордах.
          </li>
          <li>
            <b>Amazing Grace</b> — на три счёта, как вальс.
          </li>
        </ul>

        <Practice title="Песни · Twinkle, Twinkle · ждать меня" to={{ section: 'songs', songId: 'twinkle', songPart: 'chords', songPlay: 'wait', songShowKeys: true, pattern: 'block' }}>
          Подсказки клавиш включены. Включите «Мелодия» — пока вы играете аккорды, мелодия будет звучать сама, и получится
          песня целиком.
        </Practice>
        <Practice title="Песни · La Bamba · в до мажоре" to={{ section: 'songs', songId: 'la-bamba', songPart: 'chords', songPlay: 'wait', songShowKeys: true, songKeys: { 'la-bamba': 'C' } }} />
        <Practice title="Песни · Love Me Do · в до мажоре" to={{ section: 'songs', songId: 'love-me-do', songPart: 'chords', songPlay: 'wait', songShowKeys: true, songKeys: { 'love-me-do': 'C' } }} />
      </>
    ),
  },

  {
    id: 'qs-smooth',
    part: PART,
    title: 'Аккорды без прыжков',
    summary: 'Как переходить C → F → G, почти не двигая рукой. Секрет всех пианистов — «обращения».',
    minutes: 6,
    Body: () => (
      <>
        <p className="lead">
          Прыгать рукой от аккорда к аккорду тяжело и звучит рвано. Пианисты делают иначе: берут те же ноты аккорда, но в
          другом порядке — так, чтобы пальцы почти не двигались.
        </p>
        <ChordRow chords={['C', 'F', 'G', 'C']} smooth bpm={56} caption="C — F — G — C «по-пианистски»: рука стоит на месте, двигаются один-два пальца." />

        <h2>Общая нота остаётся на месте</h2>
        <p>
          В аккордах C (до-ми-соль) и F (фа-ля-до) есть <b>общая нота — до</b>. Оставьте её под пальцем, а остальные два
          пальца сдвиньте вверх: <b>до-фа-ля</b>. Это тот же аккорд F, просто «перевёрнутый» — <b>обращение</b>.
        </p>
        <Figure caption="C (до-ми-соль) → F в обращении (до-фа-ля): до остаётся, ми→фа, соль→ля." play={[voicingOf('C'), [60, 65, 69]]} bpm={40} hold={1.2}>
          <Keys from="C4" to="B4" names="en" marks={{ ...marks(['C4'], ['1'], 'gold'), ...marks(['F4', 'A4'], ['3', '5'], 'blue') }} />
        </Figure>
        <p>
          Для <b>G</b> (соль-си-ре) удобнее спуститься: <b>си-ре-соль</b>. Рука снова почти не двигается: мизинец остаётся на
          соль, а большой и указательный пальцы сползают на си и ре.
        </p>
        <Figure caption="G в обращении: си — ре — соль, прямо под рукой." play={[voicingOf('C'), [59, 62, 67], voicingOf('C')]} bpm={44} hold={1.1}>
          <Keys from="A3" to="A4" names="en" marks={marks(['B3', 'D4', 'G4'], ['1', '2', '5'], 'green')} />
        </Figure>

        <Callout kind="remember" title="Правило ближайшего аккорда">
          Выбирайте то положение аккорда, которое <b>ближе к предыдущему</b>. Общие ноты держите, остальные пальцы двигайте на
          соседние клавиши. Тренажёр подсвечивает именно такие положения — следуйте подсветке.
        </Callout>

        <Practice title="Последовательности · C–F–G–C с подсказкой" to={{ section: 'chords', chordMode: 'progressions', progressionId: 'i-iv-v', progKey: 'C', progPlay: 'free', progShowKeys: true }}>
          Сыграйте цепочку несколько раз по подсветке. Заметьте, как мало двигается рука.
        </Practice>
        <Practice title="Аккорды · Смены C → F → G за минуту" to={{ section: 'chords', chordMode: 'changes', changesSet: 'c-f-g', changesSecs: 60, changesKeys: true }}>
          Разминка с секундомером: сколько чистых смен успеете за минуту? Подсветка показывает положение «без прыжков». Рекорд
          сохраняется — возвращайтесь каждый день и следите, как он растёт.
        </Practice>
        <Practice title="Аккорды · Обращения мажорных" to={{ section: 'chords', chordMode: 'build', chordLevel: 'inv-maj', showChordKeys: true }}>
          Здесь просят конкретное положение аккорда — хорошая зарядка для пальцев.
        </Practice>
      </>
    ),
  },

  {
    id: 'qs-four-chords',
    part: PART,
    title: 'Четыре аккорда — сотня песен',
    summary: 'Добавляем минорный Am — и открываем «волшебную» цепочку C–G–Am–F из десятков хитов.',
    minutes: 7,
    Body: () => (
      <>
        <p className="lead">
          Послушайте эту цепочку. Узнаёте? На ней построены Let It Be, Stand By Me, Hallelujah, Country Roads, «Это всё» ДДТ и
          ещё десятки песен.
        </p>
        <ChordRow chords={['C', 'G', 'Am', 'F']} smooth bpm={60} caption="C — G — Am — F: четыре аккорда популярной музыки." />

        <h2>Новый аккорд: Am — ля минор</h2>
        <p>
          Форма та же — «через клавишу», только от <b>ля</b>: ля-до-ми. На всех белых клавишах. Звучит мягче и грустнее —
          это <b>минор</b>, его обозначают маленькой буквой <b>m</b>: Am, Dm, Em.
        </p>
        <Figure caption="Am (ля минор): ля — до — ми. Сравните с C: две ноты общие!" play={[voicingOf('C'), voicingOf('Am')]} bpm={40} hold={1.2}>
          <Keys from="F4" to="E5" names="en" marks={marks(['A4', 'C5', 'E5'], ['1', '3', '5'], 'blue')} />
        </Figure>
        <Callout kind="tip" title="Мажор — светло, минор — грустно">
          Это упрощение, но для начала отличный ориентир. Попробуйте сыграть C, а потом Am: слышите, как «пасмурнеет»?
        </Callout>

        <h2>Одна цепочка — много песен</h2>
        <p>
          Песни отличаются ритмом, темпом и порядком аккордов, но набор тот же. Выучив эти четыре аккорда, вы можете
          аккомпанировать большой части поп-музыки. Мы откроем песни сразу в до мажоре:
        </p>
        <ul>
          <li>
            <b>Let It Be</b> — медленно и торжественно, по аккорду на такт.
          </li>
          <li>
            <b>Stand By Me</b> — C, Am, F, G: тот же набор в другом порядке.
          </li>
          <li>
            <b>Country Roads</b>, <b>Three Little Birds</b>, <b>«Это всё»</b> — для разнообразия.
          </li>
        </ul>

        <Practice title="Последовательности · C–G–Am–F" to={{ section: 'chords', chordMode: 'progressions', progressionId: 'pop', progKey: 'C', progPlay: 'free', progShowKeys: true }}>
          Сначала по подсветке, потом без неё. Цель — менять аккорды, не останавливаясь.
        </Practice>
        <Practice title="Аккорды · Смены C → G → Am → F" to={{ section: 'chords', chordMode: 'changes', changesSet: 'pop', changesSecs: 60, changesKeys: true }}>
          Минута на смены четырёх аккордов. Цель для начала — 20 смен, для уверенной игры — 35.
        </Practice>
        <Practice title="Песни · Let It Be" to={{ section: 'songs', songId: 'let-it-be', songPart: 'chords', songPlay: 'wait', songShowKeys: true }} />
        <Practice title="Песни · Stand By Me · в до мажоре" to={{ section: 'songs', songId: 'stand-by-me', songPart: 'chords', songPlay: 'wait', songShowKeys: true, songKeys: { 'stand-by-me': 'C' } }} />
        <Practice title="Песни · Country Roads · в до мажоре" to={{ section: 'songs', songId: 'country-roads', songPart: 'chords', songPlay: 'wait', songShowKeys: true, songKeys: { 'country-roads': 'C' } }} />
      </>
    ),
  },

  {
    id: 'qs-left-hand',
    part: PART,
    title: 'Левая рука: бас',
    summary: 'Одна нота левой — и аккомпанемент звучит полно, как у пианиста. Бас на «раз» и бас–аккорд.',
    minutes: 6,
    Body: () => (
      <>
        <p className="lead">
          До сих пор аккорды играла одна правая рука. Добавим левую — всего одну ноту, и звучание станет глубоким и «взрослым».
        </p>
        <PatternFig id="march" chords={['C', 'G', 'Am', 'F']} bpm={88} caption="Бас левой рукой на «раз», аккорд правой — так звучит большинство поп-аккомпанементов." />

        <h2>Какую ноту играть левой</h2>
        <p>
          Название аккорда и есть нота баса: для <b>C</b> — до, для <b>G</b> — соль, для <b>Am</b> — ля, для <b>F</b> — фа.
          Играйте её левой рукой на октаву ниже, в районе малой октавы — слева от середины клавиатуры.
        </p>
        <Figure caption="Левая берёт бас (до малой октавы), правая — аккорд C." play={[[48, 60, 64, 67]]} bpm={40} hold={1.4}>
          <Keys from="C3" to="B4" names="c" marks={{ ...marks(['C3'], ['бас'], 'gold'), ...marks(['C4', 'E4', 'G4'], ['', '', ''], 'accent') }} />
        </Figure>

        <h2>Три ступени</h2>
        <Timeline
          items={[
            { minutes: 2, title: 'Вместе', text: 'бас и аккорд одновременно на «раз»' },
            { minutes: 2, title: 'Бас — аккорд', text: 'бас на «раз», аккорд на «два», «три», «четыре»' },
            { minutes: 2, title: 'Октава', text: 'левая берёт бас двумя пальцами через октаву' },
          ]}
        />
        <Callout kind="tip" title="Сначала пусть бас играет приложение">
          В «Песнях» есть переключатель <b>«Бас»</b>: приложение подыгрывает бас за вас. Когда аккорды правой пойдут уверенно,
          выключите его и возьмите бас сами.
        </Callout>

        <Practice title="Последовательности · C–G–Am–F, бас — аккорд" to={{ section: 'chords', chordMode: 'progressions', progressionId: 'pop', progKey: 'C', progPlay: 'free', progShowKeys: true, pattern: 'march', progBass: false }}>
          Играйте левой бас, правой аккорд. Аккорд засчитывается по звукам, поэтому бас можно добавить в любой момент такта.
        </Practice>
        <Practice title="Аккорды · Ритм «Бас — аккорд» под барабаны" to={{ section: 'chords', chordMode: 'rhythm', pattern: 'march', progressionId: 'pop', progKey: 'C', rhythmTempo: 66, rhythmKeys: true }}>
          Тренажёр проверит каждый удар: бас левой на «раз» и «три», аккорд правой на «два» и «четыре».
        </Practice>
        <Practice title="Песни · Twinkle · обе руки (левая — бас)" to={{ section: 'songs', songId: 'twinkle', songPart: 'lead', leadLeft: 'root', songShowKeys: true }}>
          Бонус: левая играет бас, а правая — мелодию. Это уже настоящая фортепианная игра двумя руками.
        </Practice>
      </>
    ),
  },

  {
    id: 'qs-rhythm',
    part: PART,
    title: 'Ритм: как оживить аккорды',
    summary: 'Четверти, баллада, вальс и ломаный аккорд — четыре рисунка, чтобы песня зазвучала.',
    minutes: 7,
    Body: () => (
      <>
        <p className="lead">
          Одни и те же аккорды можно сыграть по-разному — и песня меняет характер. Послушайте четыре рисунка на одной цепочке и
          выберите любимый.
        </p>

        <h2>Четверти — пульс поп-песни</h2>
        <p>Аккорд на каждый счёт: раз, два, три, четыре. Просто и бодро — подходит почти к любой песне.</p>
        <PatternFig id="quarters" chords={['C', 'G', 'Am', 'F']} bpm={88} />

        <h2>Баллада — мягко и красиво</h2>
        <p>Бас, а потом ноты аккорда по одной. Так звучат Let It Be и Hallelujah.</p>
        <PatternFig id="ballad" chords={['C', 'G', 'Am', 'F']} bpm={66} />

        <h2>Вальс — на три счёта</h2>
        <p>Бас на «раз», аккорд на «два» и «три». Для песен на 3/4: Amazing Grace, Hallelujah.</p>
        <PatternFig id="waltz" chords={['C', 'F', 'G', 'C']} meter={3} bpm={96} />

        <h2>Ломаный аккорд</h2>
        <p>Ноты аккорда по очереди вверх-вниз — нежно, как перебор на гитаре.</p>
        <PatternFig id="broken" chords={['C', 'Am', 'F', 'G']} bpm={76} />

        <Callout kind="remember" title="Считайте вслух">
          Ритм держится на счёте. Говорите «раз-два-три-четыре» и не останавливайтесь на смене аккорда: лучше сыграть не ту
          ноту вовремя, чем ту — с паузой.
        </Callout>

        <Practice title="Песни · Amazing Grace · вальс, в до мажоре" to={{ section: 'songs', songId: 'amazing-grace', songPart: 'chords', pattern: 'waltz', songPlay: 'wait', songShowKeys: true, songKeys: { 'amazing-grace': 'C' } }}>
          Нажмите «Послушать», чтобы услышать фактуру, затем играйте сами.
        </Practice>
        <Practice title="Аккорды · Ритм: четверти под барабаны" to={{ section: 'chords', chordMode: 'rhythm', pattern: 'quarters', progressionId: 'pop', progKey: 'C', rhythmTempo: 72, rhythmKeys: true }}>
          Каждый удар оценивается: зелёный — вовремя и всеми нотами. Потом попробуйте «Балладу» и «Вальс» — у каждой фактуры свой
          рекорд.
        </Practice>
        <Practice title="Последовательности · C–G–Am–F · под метроном, 70" to={{ section: 'chords', chordMode: 'progressions', progressionId: 'pop', progKey: 'C', progPlay: 'tempo', progTempo: 70, progShowKeys: true, pattern: 'quarters' }}>
          Первый раз — в темпе: аккорды сменяются сами, ваша задача — успевать.
        </Practice>
      </>
    ),
  },

  {
    id: 'qs-concert',
    part: PART,
    title: 'Первый концерт: песня целиком',
    summary: 'Как довести песню до конца без остановок, сыграть «с группой» и что учить дальше.',
    minutes: 6,
    Body: () => (
      <>
        <p className="lead">
          У вас есть всё для первого концерта: аккорды, плавные переходы, бас, ритм и песни. Осталось сыграть одну песню от начала до
          конца — без остановок.
        </p>

        <h2>План на песню</h2>
        <Timeline
          items={[
            { minutes: 1, title: 'Послушать', text: 'кнопка «Послушать» — как она звучит' },
            { minutes: 3, title: 'Ждать меня', text: 'все аккорды по порядку, в своём темпе' },
            { minutes: 3, title: 'Под метроном', text: 'медленно, но без остановок' },
            { minutes: 2, title: 'С мелодией', text: 'включите «Мелодия» — песня целиком' },
          ]}
        />
        <Callout kind="tip" title="Медленно — это нормально">
          Уменьшите темп так, чтобы успевать без остановок. Ровная медленная песня звучит куда лучше быстрой со сбоями. Темп
          поднимете потом, по 5–10 ударов за раз.
        </Callout>

        <h2>Сыграйте с группой</h2>
        <p>
          В «Джеме» можно выбрать гармонию <b>любой песни</b>: барабаны и аккорды зазвучат по кругу, а вы подыгрываете или
          импровизируете поверх. А в «Студии» можно записать себя и послушать со стороны.
        </p>

        <h2>Что дальше в курсе</h2>
        <ul>
          <li>
            <b>Септаккорды и тональности</b> — звучание джаза и поп-музыки, игра в соль и фа мажоре.
          </li>
          <li>
            <b>Ведущий лист</b> — мелодия правой, аккорды левой: так играют песни пианисты.
          </li>
          <li>
            <b>Подбор по слуху</b> и свои песни через «＋ Своя».
          </li>
          <li>
            <b>Импровизация</b> — пентатоника, диалог, блюз и лупер в «Джеме».
          </li>
        </ul>

        <Practice title="Песни · Let It Be · под метроном, с мелодией" to={{ section: 'songs', songId: 'let-it-be', songPart: 'chords', songPlay: 'tempo', songPartner: true, pattern: 'ballad', songTempos: { 'let-it-be': 60 } }}>
          Ваш первый концерт: аккорды под метроном, а мелодия звучит сама.
        </Practice>
        <Practice title="Джем · гармония Stand By Me, с барабанами" to={{ section: 'jam', jamMode: 'free', jamSource: 'song', jamSongId: 'stand-by-me', jamDrums: 'auto' }}>
          Играйте аккорды или любые ноты из подсвеченных — барабаны держат ритм.
        </Practice>
      </>
    ),
  },
];
