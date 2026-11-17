import { useState } from 'react';
import { type Progress, progress } from '../../lib/progress';
import type { SectionKey, Settings } from '../../lib/storage';
import { CHAPTERS, shown, shownGoal, storyState, taskProgress } from '../../lib/story';
import { GardenerSvg } from './GardenerArt';
import { Sprite } from './GardenScene';
import s from './StoryCard.module.css';

/** «Ученик садовника»: the current story chapter with its tasks. */
export function StoryCard({ p, open }: { p: Progress; open(section: SectionKey, patch?: Partial<Settings>): void }) {
  const st = storyState(p);
  const [ending, setEnding] = useState<string | null>(null);

  if (ending) {
    return (
      <section className={s.card} data-kind="ending">
        <svg className={s.art} viewBox="0 0 40 52" width="56" height="73" aria-hidden="true">
          <Sprite species="magic" x={20} y={50} />
        </svg>
        <div className={s.body}>
          <div className={s.eyebrow}>Ученик садовника · глава пройдена</div>
          <p className={s.text}>{ending}</p>
        </div>
        <button type="button" className={s.btn} onClick={() => setEnding(null)}>
          Дальше
        </button>
      </section>
    );
  }

  if (st.kind === 'finished') {
    return (
      <section className={s.card}>
        <GardenerSvg size={64} pose="dance" outfit={p.outfit} />
        <div className={s.body}>
          <div className={s.eyebrow}>Ученик садовника</div>
          <p className={s.text}>Все {CHAPTERS.length} глав пройдены — вы настоящий музыкальный садовник! 🌼</p>
        </div>
      </section>
    );
  }

  const n = st.index + 1;
  return (
    <section className={s.card} data-kind={st.kind} data-tour="story">
      <GardenerSvg size={64} pose={st.kind === 'active' ? 'idle' : 'wave'} outfit={p.outfit} />
      <div className={s.body}>
        <div className={s.eyebrow}>
          Ученик садовника · глава {n} из {CHAPTERS.length}
        </div>
        <div className={s.title}>{st.chapter.title}</div>
        {st.kind === 'wait' ? (
          <p className={s.text}>Следующая глава откроется через {st.days} дн. А пока сад ждёт ваших занятий.</p>
        ) : (
          <p className={s.text}>{st.chapter.intro}</p>
        )}
        {st.kind === 'active' && (
          <ul className={s.tasks}>
            {st.chapter.tasks.map((t, i) => {
              const v = taskProgress(p, t);
              const ok = st.done[i];
              return (
                <li key={i} data-done={ok || undefined}>
                  <span className={s.check}>{ok ? '✓' : i + 1}</span>
                  <span className={s.taskText}>{t.text}</span>
                  <span className={s.count}>
                    {shown(t, v)} / {shownGoal(t)}
                  </span>
                  {!ok && (
                    <button type="button" className={s.go} onClick={() => open(t.section, t.patch)}>
                      →
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {st.kind === 'ready' && (
        <button type="button" className={s.btn} onClick={() => progress.startChapter(st.chapter.id)}>
          Начать главу
        </button>
      )}
      {st.kind === 'active' && st.done.every(Boolean) && (
        <button
          type="button"
          className={s.btn}
          onClick={() => {
            setEnding(st.chapter.ending);
            progress.finishChapter(st.chapter.id);
          }}
        >
          Завершить главу
        </button>
      )}
    </section>
  );
}
