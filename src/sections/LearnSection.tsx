import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { LearnContext } from '../learn/context';
import { LESSONS, LESSON_PARTS, LESSON_SESSION, findLesson, lessonNumber } from '../learn/lessons';
import { sessionNumber } from '../lib/course';
import { MemoBlock, MemoDeck } from '../learn/Memo';
import { MNEMONICS } from '../learn/mnemonics';
import { useProgress } from '../hooks/useProgress';
import { progress as learning } from '../lib/progress';
import type { SectionProps } from './types';
import l from './LearnSection.module.css';

const cardsWord = (n: number) => {
  const a = n % 10;
  const b = n % 100;
  return a === 1 && b !== 11 ? 'карточка' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'карточки' : 'карточек';
};

/** Course of lessons on light "paper" pages, linked to the trainer sections. */
export function LearnSection({ settings, update, inputRef }: SectionProps) {
  const memos = settings.lessonId === 'memos';
  const lesson = findLesson(settings.lessonId);
  const index = LESSONS.indexOf(lesson);
  const prev = LESSONS[index - 1];
  const next = LESSONS[index + 1];
  const { lessonsDone } = useProgress();
  const done = useMemo(() => new Set(lessonsDone), [lessonsDone]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keys you press while reading just sound (App plays them); nothing is judged.
  useLayoutEffect(() => {
    inputRef.current = { noteOn: () => 'ignored', noteOff() {}, releaseAll() {} };
    return () => {
      inputRef.current = null;
    };
  }, [inputRef]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [lesson.id, memos]);

  const mapsRef = useRef(settings);
  mapsRef.current = settings;
  const api = useMemo(
    () => ({
      // Per-mode ear levels and per-song keys/tempos are merged, not replaced.
      openPractice: (patch: Parameters<typeof update>[0]) => {
        const cur = mapsRef.current;
        update({
          ...patch,
          ...(patch.earLevel ? { earLevel: { ...cur.earLevel, ...patch.earLevel } } : {}),
          ...(patch.songKeys ? { songKeys: { ...cur.songKeys, ...patch.songKeys } } : {}),
          ...(patch.songTempos ? { songTempos: { ...cur.songTempos, ...patch.songTempos } } : {}),
        });
      },
      openLesson: (id: string) => update({ lessonId: id }),
    }),
    [update],
  );

  const complete = useCallback(() => {
    if (!done.has(lesson.id)) {
      learning.lessonDone(lesson.id);
      learning.creditLearning(90_000);
      // Whole part of the course finished → a rare plant.
      const partLessons = LESSONS.filter((x) => x.part === lesson.part).map((x) => x.id);
      if (partLessons.every((id) => id === lesson.id || done.has(id))) learning.markRare('course');
    }
    update({ lessonId: next ? next.id : lesson.id });
  }, [lesson.id, lesson.part, next, update, done]);

  const Body = lesson.Body;
  const progress = Math.round((done.size / LESSONS.length) * 100);

  return (
    <LearnContext.Provider value={api}>
      <div className={l.root}>
        <aside className={l.sidebar}>
          <div className={l.course}>
            <div className={l.courseEyebrow}>Курс</div>
            <div className={l.courseTitle}>Пианино с нуля: фундамент, аккорды и песни, импровизация</div>
            <div className={l.courseProgress}>
              <div className={l.bar}>
                <span style={{ transform: `scaleX(${done.size / LESSONS.length})` }} />
              </div>
              <span>
                {done.size} из {LESSONS.length} · {progress}%
              </span>
            </div>
          </div>
          <button type="button" className={l.memoLink} aria-current={memos ? 'page' : undefined} onClick={() => update({ lessonId: 'memos' })}>
            <span aria-hidden="true">🧠</span>
            <span>
              Запоминалки
              <small>{MNEMONICS.length} {cardsWord(MNEMONICS.length)} ко всем урокам</small>
            </span>
          </button>
          <nav className={l.toc} aria-label="Уроки">
            {LESSON_PARTS.map((part) => (
              <div key={part} className={l.part}>
                <div className={l.partTitle}>{part}</div>
                {LESSONS.filter((x) => x.part === part).map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    className={l.tocItem}
                    aria-current={!memos && x.id === lesson.id ? 'page' : undefined}
                    data-done={done.has(x.id) || undefined}
                    onClick={() => update({ lessonId: x.id })}
                  >
                    <span className={l.tocNum}>{done.has(x.id) ? '✓' : lessonNumber(x.id)}</span>
                    <span className={l.tocText}>{x.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <div className={l.scroll} ref={scrollRef}>
          {memos ? (
            <article key="memos" className={l.article}>
              <header className={l.head}>
                <div className={l.eyebrow}>Курс · повторение</div>
                <h1>Запоминалки</h1>
              </header>
              <MemoDeck lessonsDone={lessonsDone} onOpenLesson={(id) => update({ lessonId: id })} />
            </article>
          ) : (
          <article key={lesson.id} className={l.article}>
            <header className={l.head}>
              <div className={l.eyebrow}>
                Урок {index + 1} из {LESSONS.length} · {LESSON_SESSION.get(lesson.id) ? `занятие ${sessionNumber(LESSON_SESSION.get(lesson.id)!.id)} · ` : ''}
                {lesson.part} · {lesson.minutes} мин
              </div>
              <h1>{lesson.title}</h1>
            </header>
            <Body />
            <MemoBlock lesson={lesson.id} onOpenDeck={() => update({ lessonId: 'memos' })} />
            <footer className={l.footer}>
              <button type="button" className={l.complete} data-done={done.has(lesson.id) || undefined} onClick={complete}>
                {done.has(lesson.id) ? '✓ Урок пройден' : 'Урок пройден'}
                {next && <span> · дальше: {next.title}</span>}
              </button>
              <div className={l.pager}>
                {prev ? (
                  <button type="button" className={l.pageBtn} onClick={() => update({ lessonId: prev.id })}>
                    <small>← Назад</small>
                    {prev.title}
                  </button>
                ) : (
                  <span />
                )}
                {next && (
                  <button type="button" className={l.pageBtn} data-next onClick={() => update({ lessonId: next.id })}>
                    <small>Вперёд →</small>
                    {next.title}
                  </button>
                )}
              </div>
            </footer>
          </article>
          )}
        </div>
      </div>
    </LearnContext.Provider>
  );
}
