import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GardenScene, Sprite } from '../components/garden/GardenScene';
import { Herbarium } from '../components/garden/Herbarium';
import { Wardrobe } from '../components/garden/Wardrobe';
import { StoryCard } from '../components/garden/StoryCard';
import { useDaylight, useShootingStars } from '../hooks/useDaylight';
import { PHASE_NAME } from '../lib/daylight';
import { CHAPTERS } from '../lib/story';
import { MonthCard } from '../components/garden/MonthCard';
import type { GardenerPose } from '../components/garden/GardenerArt';
import { CAT_LINES, SECRETS, TICKLE, fortuneFor, greetingLine, isNight, randomLine } from '../lib/gardener';
import { playMeow, playPurr, primeAudio } from '../lib/audio';
import type { DailySession } from '../hooks/useDailySession';
import { useMySongs } from '../hooks/useMySongs';
import { useProgress } from '../hooks/useProgress';
import { LESSONS, nextLesson as nextLessonOf } from '../learn/lessons';
import { LEVELS } from '../lib/chords';
import { SESSIONS, STAGES, currentSession, sessionNumber } from '../lib/course';
import { sessionSteps } from '../hooks/useDailySession';
import { Modal } from '../components/ui/Modal';
import { EAR_GOAL, findEarLevel } from '../lib/ear';
import { DECOR, GROW_MS, SEASONAL_SPECIES, SEASON_NAME, SPECIES_INFO, seasonOf, speciesFor } from '../lib/garden';
import { dayKey, formatDuration, progress as learning, sessionTime, summarize } from '../lib/progress';
import { questFor, weekOf } from '../lib/quests';
import { findSong } from '../lib/songs';
import type { SectionKey, Settings } from '../lib/storage';
import type { SectionProps } from './types';
import h from './HomeSection.module.css';

interface Props extends SectionProps {
  session: DailySession | null;
  onStartSession(courseId: string): void;
  onResumeSession(): void;
  open(section: SectionKey, patch?: Partial<Settings>): void;
}

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};

function greeting(hour: number) {
  if (hour < 5) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

/** «Сад»: the home screen — today's session, the garden, and where to continue. */
export function HomeSection({ settings, inputRef, session, onStartSession, onResumeSession, open }: Props) {
  const p = useProgress();
  const mySongs = useMySongs();
  const [herbarium, setHerbarium] = useState(false);
  const [wardrobe, setWardrobe] = useState(false);
  const [monthCard, setMonthCard] = useState(false);

  // Play in the garden: plants near the note's spot sway and a note floats up.
  const [pulses, setPulses] = useState<{ id: number; x: number }[]>([]);
  const pulseId = useRef(0);
  useLayoutEffect(() => {
    inputRef.current = {
      noteOn: (midi) => {
        const id = ++pulseId.current;
        setPulses((list) => [...list.slice(-12), { id, x: Math.max(0.04, Math.min(0.96, (midi - 36) / 60)) }]);
        window.setTimeout(() => setPulses((list) => list.filter((p) => p.id !== id)), 1500);
        return 'ignored';
      },
      noteOff() {},
      releaseAll() {},
    };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef]);

  const sum = useMemo(() => summarize(p), [p]);
  const now = new Date();
  const season = seasonOf(now.getMonth());
  const sproutMs = p.sprout?.activeMs ?? 0;
  const sproutPct = Math.round((sproutMs / GROW_MS) * 100);
  const sproutLeft = Math.max(1, Math.ceil((GROW_MS - sproutMs) / 60000));
  const sproutKind = p.sprout && sproutMs > 0 ? SPECIES_INFO[speciesFor(p.sprout).species].name.toLowerCase() : null;

  const nextLesson = nextLessonOf(p.lessonsDone);
  const course = currentSession(p.sessionsDone);
  const time = sessionTime(p);
  const courseNo = sessionNumber(course.id);
  const [allSessions, setAllSessions] = useState(false);
  const chordLevel = LEVELS.find((l) => l.id === settings.chordLevel) ?? LEVELS[0];
  const earLevel = findEarLevel(settings.earLevel[settings.earMode] ?? '', settings.earMode);
  const lastSongId = Object.entries(p.songs).sort((a, b) => b[1].last - a[1].last)[0]?.[0] ?? settings.songId;
  const song = findSong(lastSongId, mySongs);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const t = Date.now() - (6 - i) * 86_400_000;
    const d = p.days[dayKey(t)];
    return { key: dayKey(t), label: WEEKDAYS[new Date(t).getDay()], min: d ? Math.round(d.activeMs / 60000) : 0, active: !!d && (d.activeMs > 0 || d.actions > 0), today: i === 6 };
  });

  const doneToday = !!p.days[dayKey()]?.activeMs;
  const week = useMemo(() => weekOf(), []);
  const quest = questFor(week);
  const questValue = Math.min(quest.goal, quest.measure(p, week));
  const questClaimed = p.questsDone.includes(week.key);
  const questReady = questValue >= quest.goal && !questClaimed;
  const seasonal = SEASONAL_SPECIES[season];
  const nextDecor = DECOR.find((d) => d.at > p.plants.length);

  // ---- the gardener: greets you, waters the sprout, sleeps at night, dances when tickled
  // The garden's light follows the clock on this computer.
  const { hour, phase } = useDaylight();
  const [line, setLine] = useState<{ text: string; id: number } | null>(null);
  const [dance, setDance] = useState(false);
  const pokes = useRef<number[]>([]);
  const lineTimer = useRef<number>();
  const sayLine = useCallback((text: string, ms = 6000) => {
    setLine({ text, id: Date.now() });
    window.clearTimeout(lineTimer.current);
    lineTimer.current = window.setTimeout(() => setLine(null), ms);
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => sayLine(greetingLine(p, hour, sproutMs / GROW_MS, questReady), 7000), 900);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(lineTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const poke = useCallback(() => {
    const t = Date.now();
    pokes.current = [...pokes.current.filter((x) => t - x < 2500), t];
    if (pokes.current.length >= 5) {
      pokes.current = [];
      setDance(true);
      sayLine(TICKLE[Math.floor(Math.random() * TICKLE.length)], 3000);
      window.setTimeout(() => setDance(false), 3000);
    } else sayLine(randomLine());
  }, [sayLine]);
  const pose: GardenerPose = dance ? 'dance' : line && !isNight(hour) ? 'wave' : isNight(hour) ? 'sleep' : sproutMs > 0 ? 'water' : 'idle';
  const gardener = useMemo(
    () => ({ pose, outfit: p.outfit, line: line?.text ?? null, lineId: line?.id ?? 0, onPoke: poke }),
    [pose, p.outfit, line, poke],
  );

  // ---- кот Бемоль: moves in after three days of practice; purrs when petted -------------
  const practiceDays = Object.keys(p.days).length;
  const pets = p.counters['cat:pets'] ?? 0;
  const [petId, setPetId] = useState(0);
  const catSleeping = isNight(hour);
  const petCat = useCallback(() => {
    primeAudio();
    playPurr();
    const n = (learning.get().counters['cat:pets'] ?? 0) + 1;
    learning.count('cat:pets');
    setPetId((x) => x + 1);
    if (catSleeping) return sayLine('Тсс… Бемоль спит и мурлычет во сне.', 3500);
    if (n === 1 || n % 4 === 0) window.setTimeout(playMeow, 350);
    sayLine(n === 20 ? 'Бемоль так вас полюбил, что надел бантик! 🎀' : CAT_LINES[Math.floor(Math.random() * CAT_LINES.length)], 4500);
  }, [catSleeping, sayLine]);
  const cat = useMemo(
    () => (practiceDays >= 3 ? { sleeping: catSleeping, bow: pets >= 20, onPet: petCat, petId } : undefined),
    [practiceDays, catSleeping, pets, petCat, petId],
  );
  // ---- at night: shooting stars to make a wish on ----
  const stars = useShootingStars(phase === 'night', sayLine);
  const sky = useMemo(() => ({ phase, star: stars.star, onStar: stars.onStar }), [phase, stars.star, stars.onStar]);
  const festive = (now.getMonth() === 11 && now.getDate() >= 15) || (now.getMonth() === 0 && now.getDate() <= 14);

  // ---- secret tunes and the cookie of the day ----------------------------------------------
  const foundSecrets = SECRETS.filter((x) => (p.counters[`secret:${x.id}`] ?? 0) > 0);
  const secretHint = () => {
    const next = SECRETS.find((x) => !foundSecrets.includes(x));
    sayLine(
      next
        ? `Тайная мелодия: ${next.riddle} Сыграйте её где угодно в приложении, в любой тональности.`
        : 'Все тайные мелодии найдены! Вы настоящий кладоискатель. 🗝',
      8000,
    );
  };
  const [cookie, setCookie] = useState(false);

  return (
    <main className={h.root}>
      <div className={h.inner}>
        <div className={h.top}>
        <section className={h.garden} data-tour="garden">
          <GardenScene
            plants={p.plants}
            sprout={p.sprout}
            showSprout
            season={season}
            gardener={gardener}
            total={p.plants.length}
            pulses={pulses}
            cat={cat}
            festive={festive}
            sky={sky}
          />
          <div className={h.gardenBar}>
            <div className={h.sprout}>
              <span className={h.sproutLabel}>
                {sproutMs > 0 ? `Растёт ${sproutKind} — ещё ~${sproutLeft} мин игры` : 'Семечко ждёт: начните играть, и оно прорастёт'}
              </span>
              <span className={h.meter} aria-hidden="true">
                <i style={{ width: `${Math.min(100, sproutPct)}%` }} />
              </span>
            </div>
            <button type="button" className={h.herbBtn} onClick={() => setMonthCard(true)}>
              🖼 Карточка месяца
            </button>
            <button type="button" className={h.herbBtn} onClick={() => setWardrobe(true)}>
              🎩 Гардероб
            </button>
            <button type="button" className={h.herbBtn} data-plain onClick={() => setHerbarium(true)}>
              🌼 Гербарий
            </button>
            <button type="button" className={h.herbBtn} data-plain onClick={() => setCookie((x) => !x)} aria-expanded={cookie} title="Каждый день — новое">
              🥠 Печенье дня
            </button>
            <button type="button" className={h.herbBtn} data-plain onClick={secretHint} title="Мелодии-пасхалки: сыграйте их где угодно">
              🗝 Тайные мелодии {foundSecrets.length}/{SECRETS.length}
            </button>
            {nextDecor && (
              <span className={h.season} title="Сад растёт — появляются новые уголки">
                {nextDecor.at - p.plants.length} до: {nextDecor.name}
              </span>
            )}
            <span className={h.season}>
              {SEASON_NAME[season]} · {PHASE_NAME[phase]}
            </span>
          </div>
        </section>
        <aside className={h.side}>
          <div className={h.heroText}>
            <h1 className={h.title}>{greeting(now.getHours())}!</h1>
            <p className={h.sub}>
              {p.plants.length === 0
                ? 'Каждые 10 минут игры за клавишами выращивают в саду растение. Начнём первое?'
                : `В вашем саду ${p.plants.length} ${plural(p.plants.length, 'растение', 'растения', 'растений')}. ${sum.streak > 1 ? `Вы занимаетесь ${sum.streak} ${plural(sum.streak, 'день', 'дня', 'дней')} подряд — так держать!` : doneToday ? 'Сегодня вы уже позанимались — так держать.' : 'Сыграем немного сегодня?'}`}
            </p>
          </div>

          <div className={h.cta} data-tour="daily">
            {session ? (
              <>
                <div className={h.ctaTitle}>Занятие идёт</div>
                <div className={h.ctaHint}>
                  Шаг {session.index + 1} из {session.steps.length}: {session.steps[session.index].title}
                </div>
                <button type="button" className={h.start} onClick={onResumeSession}>
                  Продолжить занятие
                </button>
              </>
            ) : (
              <>
                <div className={h.ctaEyebrow}>
                  Занятие {courseNo} из {SESSIONS.length} · этап {STAGES.indexOf(course.stage as (typeof STAGES)[number]) + 1} «{course.stage}»
                </div>
                <div className={h.ctaTitle}>{course.title}</div>
                <div className={h.ctaHint}>{course.goal}</div>
                <ol className={h.ctaSteps}>
                  {sessionSteps(course.id).map((st) => (
                    <li key={st.id} data-kind={st.kind}>
                      <span>{st.title}</span>
                    </li>
                  ))}
                </ol>
                <div className={h.timeStats} title="Время по секундомеру занятий (без пауз)">
                  ⏱ Сегодня {formatDuration(time.today)} · за неделю {formatDuration(time.week)} · всего {formatDuration(time.total)}
                  {time.sessions > 0 ? ` · занятий: ${time.sessions}` : ''}
                </div>
                <div className={h.ctaRow}>
                  <button type="button" className={h.start} onClick={() => onStartSession(course.id)}>
                    ▶ Начать занятие
                  </button>
                  <button type="button" className={h.allBtn} onClick={() => setAllSessions(true)}>
                    Все занятия · {p.sessionsDone.length}/{SESSIONS.length}
                  </button>
                </div>
              </>
            )}
          </div>
      <div className={h.continue}>
        <h2 className={h.h2}>Продолжить</h2>
        <div className={h.cards}>
          <button type="button" className={h.card} onClick={() => open('learn', nextLesson ? { lessonId: nextLesson.id } : {})}>
            <span className={h.cardKind}>Урок</span>
            <span className={h.cardTitle}>{nextLesson ? nextLesson.title : 'Курс пройден 🎉'}</span>
            <span className={h.cardMeta}>
              {p.lessonsDone.length} из {LESSONS.length}
            </span>
          </button>
          <button type="button" className={h.card} onClick={() => open('chords', { chordMode: 'build' })}>
            <span className={h.cardKind}>Аккорды</span>
            <span className={h.cardTitle}>{chordLevel.title}</span>
            <span className={h.cardMeta}>{Math.min(10, p.chordLevels[chordLevel.id] ?? 0)} / 10</span>
          </button>
          <button type="button" className={h.card} onClick={() => open('ear')}>
            <span className={h.cardKind}>Слух</span>
            <span className={h.cardTitle}>{earLevel.title}</span>
            <span className={h.cardMeta}>
              {Math.min(EAR_GOAL, p.earLevels[earLevel.id] ?? 0)} / {EAR_GOAL}
            </span>
          </button>
          <button type="button" className={h.card} onClick={() => open('songs', { songId: song.id })}>
            <span className={h.cardKind}>Песня</span>
            <span className={h.cardTitle}>{song.title}</span>
            <span className={h.cardMeta}>{p.songs[song.id] ? `сыграна ${p.songs[song.id].runs} р.` : 'ещё не играли'}</span>
          </button>
        </div>
      </div>
        </aside>
        </div>

        {cookie && (
          <div className={h.cookie} role="note">
            <span className={h.cookieIcon} aria-hidden="true">
              🥠
            </span>
            <span>
              <b>Предсказание на сегодня.</b> {fortuneFor(dayKey())}
            </span>
            <button type="button" className={h.cookieClose} onClick={() => setCookie(false)} aria-label="Закрыть">
              ×
            </button>
          </div>
        )}

        {allSessions && (
          <Modal title="Курс: все занятия" onClose={() => setAllSessions(false)} width={620}>
            <div className={h.courseList}>
              {STAGES.map((stage, si) => (
                <div key={stage}>
                  <div className={h.courseStage}>
                    {si + 1}. {stage}
                  </div>
                  {SESSIONS.filter((x) => x.stage === stage).map((x) => {
                    const done = p.sessionsDone.includes(x.id);
                    return (
                      <button
                        key={x.id}
                        type="button"
                        className={h.courseItem}
                        data-done={done || undefined}
                        data-current={x.id === course.id || undefined}
                        onClick={() => {
                          setAllSessions(false);
                          onStartSession(x.id);
                        }}
                        title={x.goal}
                      >
                        <span className={h.courseNo}>{done ? '✓' : sessionNumber(x.id)}</span>
                        <span>
                          <b>{x.title}</b>
                          <small>{x.goal}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
              <p className={h.courseNote}>Нажмите на занятие, чтобы начать его (или повторить). Засчитывается занятие, дошедшее до последнего шага.</p>
            </div>
          </Modal>
        )}

        <section className={h.games}>
          <div className={h.gamesHead}>
            <h2 className={h.gamesTitle}>Мини-игры</h2>
            <p className={h.gamesSub}>
              Необязательные игры параллельно курсу: задания в них засчитываются сами, когда вы занимаетесь в любых разделах, а
              награда — особые растения в саду.
            </p>
          </div>
        </section>
        <section className={h.cols}>
          <div className={h.gameCol}>
            <div className={h.gameAbout}>
              <b>📖 Ученик садовника</b> — сюжет из {CHAPTERS.length} глав. В каждой главе три задания в разных тренажёрах; пройдите их — и
              вырастет волшебный цветок. Новая глава открывается раз в неделю.
            </div>
            <StoryCard p={p} open={open} />
          </div>

          <div className={h.panel}>
            <h2 className={h.h2}>Задание недели</h2>
            <p className={h.gameAboutPlain}>
              🗓 Одна цель на неделю (с понедельника по воскресенье). Выполните её — и посадите сезонное растение: ёлочку зимой, тюльпан
              весной, ромашку летом, тыкву осенью.
            </p>
            <div className={h.quest} data-tour="quest" data-state={questClaimed ? 'claimed' : questReady ? 'ready' : undefined}>
              <svg className={h.questArt} viewBox="0 0 40 52" width="44" height="57" aria-hidden="true">
                <Sprite species={seasonal} x={20} y={50} silhouette={questClaimed || questReady ? undefined : '#4a4550'} />
              </svg>
              <div className={h.questBody}>
                <div className={h.questTitle}>{quest.title}</div>
                <div className={h.questHint}>
                  {questClaimed ? `${SPECIES_INFO[seasonal].name} уже растёт в саду. Новое задание — в понедельник.` : quest.hint}
                </div>
                {!questClaimed && (
                  <div className={h.questRow}>
                    <span className={h.meter} aria-hidden="true">
                      <i style={{ width: `${(questValue / quest.goal) * 100}%` }} />
                    </span>
                    <span className={h.questCount}>
                      {questValue} / {quest.goal} {quest.unit}
                    </span>
                  </div>
                )}
              </div>
              {questReady ? (
                <button type="button" className={h.claim} onClick={() => learning.claimQuest(week.key, quest.section)}>
                  Посадить {SPECIES_INFO[seasonal].name.toLowerCase()}
                </button>
              ) : (
                !questClaimed && (
                  <button type="button" className={h.questGo} onClick={() => open(quest.section, quest.patch)}>
                    Вперёд →
                  </button>
                )
              )}
            </div>

            <h2 className={h.h2}>Неделя</h2>
            <div className={h.week}>
              {weekDays.map((d) => (
                <div key={d.key} className={h.day} data-active={d.active || undefined} data-today={d.today || undefined} title={d.active ? `${d.min} мин` : 'без занятий'}>
                  <span className={h.dayDot}>{d.active ? (d.min > 0 ? d.min : '✓') : ''}</span>
                  <span className={h.dayLabel}>{d.label}</span>
                </div>
              ))}
            </div>
            <dl className={h.stats}>
              <div>
                <dt>Дней подряд</dt>
                <dd>{sum.streak}</dd>
              </div>
              <div>
                <dt>Минут всего</dt>
                <dd>{sum.totalMinutes}</dd>
              </div>
              <div>
                <dt>Растений</dt>
                <dd>{p.plants.length}</dd>
              </div>
            </dl>
            <p className={h.note}>Пропуск дня не страшен: росток не завянет, он подождёт.</p>
          </div>
        </section>
      </div>
      {herbarium && <Herbarium plants={p.plants} onClose={() => setHerbarium(false)} />}
      {wardrobe && <Wardrobe p={p} onClose={() => setWardrobe(false)} />}
      {monthCard && <MonthCard p={p} onClose={() => setMonthCard(false)} />}
    </main>
  );
}
