import { Fragment, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useProgress } from '../hooks/useProgress';
import { progress } from '../lib/progress';
import { type Mnemonic, MNEMONICS, mnemonicsFor } from './mnemonics';
import { LESSONS, LESSON_PARTS, lessonNumber } from './lessons';
import m from './Memo.module.css';

/** "**bold**" → <b>bold</b>. */
export function rich(text: string): ReactNode {
  return text.split('**').map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <Fragment key={i}>{part}</Fragment>));
}

type MemoState = 'new' | 'known' | 'again';
function memoState(items: Record<string, { seen: number; misses: number; last: number }>, id: string): MemoState {
  const it = items[`memo:${id}`];
  if (!it) return 'new';
  // Remembered at least as often as forgotten → known.
  return it.seen > 0 && it.seen >= it.misses ? 'known' : 'again';
}

/** One memory card with a «проверь себя» flip. */
export function MemoCard({ memo }: { memo: Mnemonic }) {
  const { items } = useProgress();
  const [open, setOpen] = useState(false);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const state = memoState(items, memo.id);
  const answer = (ok: boolean) => {
    progress.recordItem(`memo:${memo.id}`, ok);
    setAnswered(ok);
  };
  return (
    <div className={m.card} data-state={state}>
      <div className={m.icon} aria-hidden="true">
        {memo.icon}
      </div>
      <div className={m.body}>
        <div className={m.title}>
          {memo.title}
          {state === 'known' && <span className={m.badge}>помню</span>}
        </div>
        <p className={m.text}>{rich(memo.text)}</p>
        <div className={m.check}>
          {!open ? (
            <button type="button" className={m.checkBtn} onClick={() => setOpen(true)}>
              Проверь себя: {memo.q}
            </button>
          ) : (
            <div className={m.qa}>
              <div className={m.q}>{memo.q}</div>
              <div className={m.a}>{memo.a}</div>
              {answered === null ? (
                <div className={m.row}>
                  <button type="button" className={m.yes} onClick={() => answer(true)}>
                    Знал(а)
                  </button>
                  <button type="button" className={m.no} onClick={() => answer(false)}>
                    Повторю
                  </button>
                </div>
              ) : (
                <div className={m.thanks}>{answered ? 'Отлично! Карточка в копилке.' : 'Ничего — она попадётся в «Запоминалках» ещё раз.'}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** The lesson's memory cards, shown at the end of the lesson. */
export function MemoBlock({ lesson, onOpenDeck }: { lesson: string; onOpenDeck(): void }) {
  const list = mnemonicsFor(lesson);
  if (!list.length) return null;
  return (
    <section className={m.block} aria-label="Запоминалки">
      <div className={m.blockHead}>
        <h2>🧠 Запоминалки</h2>
        <button type="button" className={m.link} onClick={onOpenDeck}>
          Все карточки →
        </button>
      </div>
      {list.map((x) => (
        <MemoCard key={x.id} memo={x} />
      ))}
    </section>
  );
}

/* ---------------- deck: all cards + flashcard drill ---------------- */

function drillQueue(items: Record<string, { seen: number; misses: number; last: number }>, only: Set<string> | null): Mnemonic[] {
  const pool = MNEMONICS.filter((x) => !only || only.has(x.lesson));
  // Missed first, then new, then known (oldest first) — short sessions of 10.
  const rank = (x: Mnemonic) => {
    const s = memoState(items, x.id);
    return s === 'again' ? 0 : s === 'new' ? 1 : 2;
  };
  return [...pool]
    .sort((a, b) => rank(a) - rank(b) || (items[`memo:${a.id}`]?.last ?? 0) - (items[`memo:${b.id}`]?.last ?? 0) || Math.random() - 0.5)
    .slice(0, 10);
}

export function MemoDeck({ lessonsDone, onOpenLesson }: { lessonsDone: string[]; onOpenLesson(id: string): void }) {
  const { items } = useProgress();
  const [drill, setDrill] = useState<{ queue: Mnemonic[]; i: number; open: boolean; ok: number } | null>(null);
  const [scope, setScope] = useState<'done' | 'all'>(lessonsDone.length ? 'done' : 'all');
  const counts = useMemo(() => {
    const c = { known: 0, again: 0, new: 0 };
    for (const x of MNEMONICS) c[memoState(items, x.id)]++;
    return c;
  }, [items]);

  const start = () => {
    const only = scope === 'done' && lessonsDone.length ? new Set(lessonsDone) : null;
    setDrill({ queue: drillQueue(items, only), i: 0, open: false, ok: 0 });
  };

  if (drill) {
    const card = drill.queue[drill.i];
    if (!card) {
      return (
        <div className={m.deck}>
          <div className={m.flash} data-done>
            <div className={m.flashIcon}>🌱</div>
            <div className={m.flashQ}>
              Готово: {drill.ok} из {drill.queue.length}
            </div>
            <p className={m.flashA}>
              {drill.ok === drill.queue.length ? 'Всё помните — отличная память!' : 'Карточки «повторю» в следующий раз будут первыми.'}
            </p>
            <div className={m.row}>
              <button type="button" className={m.yes} onClick={start}>
                Ещё 10
              </button>
              <button type="button" className={m.no} onClick={() => setDrill(null)}>
                Ко всем карточкам
              </button>
            </div>
          </div>
        </div>
      );
    }
    const answer = (ok: boolean) => {
      progress.recordItem(`memo:${card.id}`, ok);
      setDrill({ ...drill, i: drill.i + 1, open: false, ok: drill.ok + (ok ? 1 : 0) });
    };
    return (
      <div className={m.deck}>
        <div className={m.drillTop}>
          <span>
            Карточка {drill.i + 1} из {drill.queue.length}
          </span>
          <button type="button" className={m.link} onClick={() => setDrill(null)}>
            Закончить
          </button>
        </div>
        <div className={m.flash} key={card.id}>
          <div className={m.flashIcon}>{card.icon}</div>
          <div className={m.flashQ}>{card.q}</div>
          {!drill.open ? (
            <button type="button" className={m.yes} onClick={() => setDrill({ ...drill, open: true })}>
              Показать ответ
            </button>
          ) : (
            <>
              <div className={m.flashA}>{card.a}</div>
              <p className={m.flashHint}>
                <b>{card.title}.</b> {rich(card.text)}
              </p>
              <div className={m.row}>
                <button type="button" className={m.yes} onClick={() => answer(true)}>
                  Знал(а)
                </button>
                <button type="button" className={m.no} onClick={() => answer(false)}>
                  Повторю
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={m.deck}>
      <p className="lead">
        Короткие ассоциации ко всем урокам: картинка, фраза или стишок, которые помогают вспомнить правило за секунду.
        Проверяйте себя карточками — те, что забылись, попадутся первыми.
      </p>
      <div className={m.deckStats}>
        <span data-k="known">Помню: {counts.known}</span>
        <span data-k="again">Повторить: {counts.again}</span>
        <span data-k="new">Новые: {counts.new}</span>
      </div>
      <div className={m.drillStart}>
        <button type="button" className={m.yes} onClick={start}>
          Проверить себя · 10 карточек
        </button>
        {lessonsDone.length > 0 && (
          <label className={m.scope}>
            <input type="checkbox" checked={scope === 'done'} onChange={(e) => setScope(e.target.checked ? 'done' : 'all')} />
            только пройденные уроки
          </label>
        )}
      </div>
      {LESSON_PARTS.map((part) => (
        <div key={part}>
          <h2>{part}</h2>
          {LESSONS.filter((l) => l.part === part).map((l) => {
            const list = mnemonicsFor(l.id);
            if (!list.length) return null;
            return (
              <div key={l.id} className={m.lessonGroup}>
                <button type="button" className={m.lessonLink} onClick={() => onOpenLesson(l.id)}>
                  Урок {lessonNumber(l.id)} · {l.title}
                </button>
                {list.map((x) => (
                  <MemoCard key={x.id} memo={x} />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
