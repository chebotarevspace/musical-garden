import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SectionKey } from '../lib/storage';
import { GardenerSvg } from './garden/GardenerArt';
import s from './GuideTour.module.css';

interface Step {
  title: string;
  text: string;
  /** What to point at; none → a card in the middle of the screen. */
  target?: () => Element | null;
  /** Open this section first. */
  section?: SectionKey;
}

const byTour = (id: string) => () => document.querySelector(`[data-tour="${id}"]`);
const tab = (label: string) => () =>
  [...document.querySelectorAll('nav[aria-label="Разделы"] [role="radio"]')].find((el) => el.textContent?.trim() === label) ?? null;

export const TOUR: Step[] = [
  {
    title: 'Экскурсия по Музыкальному саду',
    text: 'За минуту покажу, где что находится. Листайте стрелками ← → или кнопками внизу. Esc — закончить в любой момент.',
  },
  { title: 'Логотип — дорога домой', text: 'Нажмите на логотип или название — и вы снова в Саду, откуда бы ни начали.', target: byTour('brand'), section: 'home' },
  { title: 'Сад — главная', text: 'Здесь ваш сад, следующее занятие курса, задания и прогресс за неделю.', target: tab('Сад'), section: 'home' },
  {
    title: 'Занятие курса',
    text: 'Курс — 24 занятия: фундамент, аккорды и песни, импровизация. Нажмите «Начать занятие» — приложение проведёт по шагам: урок, упражнения, музыка. Секундомер считает время занятий, его можно ставить на паузу.',
    target: byTour('daily'),
    section: 'home',
  },
  {
    title: 'Ваш сад',
    text: 'Каждые 10 минут игры вырастает растение — вид зависит от того, чем вы занимались. Садовник Доминик поливает росток: нажмите на него — он что-нибудь расскажет. Под садом — гардероб, гербарий и карточка месяца.',
    target: byTour('garden'),
    section: 'home',
  },
  {
    title: 'Ученик садовника',
    text: 'Сюжетные главы — по одной в неделю, по три задания в каждой. А рядом — задание недели, за которое вырастает сезонное растение.',
    target: byTour('story'),
    section: 'home',
  },
  {
    title: 'Уроки',
    text: 'Короткие уроки — от клавиатуры до аккордов и мелодий. В конце каждого — «запоминалки» и кнопка «Практика», которая открывает нужный тренажёр.',
    target: tab('Уроки'),
    section: 'learn',
  },
  { title: 'Тренажёры', text: 'Все упражнения собраны здесь.', target: tab('Тренажёры'), section: 'notes' },
  {
    title: 'Семь тренажёров',
    text: 'Ноты — найти и прочитать ноту. Беглость — упражнения для пальцев. Аккорды — построение, цепочки, подбор. Слух — интервалы, аккорды, мелодии. Джем — импровизация. Капли — ритм-игра. Студия — запись и разбор.',
    target: () => document.querySelector('nav[aria-label="Тренажёры"] > *'),
    section: 'notes',
  },
  {
    title: 'Панель режима',
    text: 'У каждого тренажёра свои настройки: уровень, режим, подсказки. Главные кнопки — справа на панели или под заданием; буква на кнопке — её горячая клавиша.',
    target: () => document.querySelector('main')?.previousElementSibling ?? null,
    section: 'notes',
  },
  {
    title: 'Клавиатура',
    text: 'Играйте на MIDI-клавиатуре, на обычном пианино (через микрофон) или мышью по экранной. Подсветка — подсказки, зелёный — верно, красный — мимо.',
    target: byTour('keyboard'),
    section: 'notes',
  },
  {
    title: 'Доминик',
    text: 'Он радуется вашим успехам и иногда заглядывает с маленьким заданием — за него росток подрастает. Попробуйте на него нажать!',
    target: byTour('mascot'),
    section: 'notes',
  },
  {
    title: 'Песни',
    text: 'Играйте аккорды или мелодию песен в любой тональности и темпе. Можно добавить свою песню — просто вставьте текст с аккордами.',
    target: tab('Песни'),
    section: 'songs',
  },
  { title: 'Росток', text: 'Сколько осталось до нового растения. Нажмите — и вы в саду.', target: byTour('sprout'), section: 'songs' },
  {
    title: 'Звук и MIDI',
    text: 'Звук нот — включите, если клавиатура не звучит сама (S). Рядом — подключение MIDI: нажмите, чтобы выбрать устройство. Кнопка со стрелками — на весь экран (F).',
    target: byTour('sound'),
    section: 'songs',
  },
  {
    title: 'Обычное пианино',
    text: 'Нет MIDI? Включите микрофон — приложение услышит ноты акустического пианино. Играйте по одной ноте, аккорды раскладывайте снизу вверх.',
    target: byTour('mic'),
    section: 'songs',
  },
  { title: 'Светлая и тёмная тема', text: 'Луна и солнце переключают тему: светлая удобнее днём, тёмная — вечером (T).', target: byTour('theme') },
  { title: 'Справка', text: 'Все горячие клавиши и повтор этой экскурсии — здесь, или клавишей «?».', target: byTour('help') },
  { title: 'Настройки и данные', text: 'Звуки, Доминик, адаптивная практика, а во вкладке «Мои данные» — резервная копия прогресса.', target: byTour('settings') },
  { title: 'Готово!', text: 'Начните с занятия дня или с первого урока. Хорошей музыки — и пусть сад цветёт!', section: 'home' },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;
const TIP_W = 340;

/** Guided tour: dims the screen, highlights one element at a time and explains it. */
export function GuideTour({ onClose, go, current }: { onClose(): void; go(section: SectionKey): void; current: SectionKey }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const dir = useRef(1);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipH, setTipH] = useState(180);
  const step = TOUR[i];
  const last = i === TOUR.length - 1;

  const move = useCallback(
    (d: number) => {
      dir.current = d;
      setReady(false);
      setI((x) => Math.max(0, Math.min(TOUR.length - 1, x + d)));
    },
    [],
  );

  // Open the step's section, then find its element (skip steps whose element is missing).
  useEffect(() => {
    if (step.section && step.section !== current) {
      go(step.section);
      return; // re-runs when `current` changes
    }
    const t = window.setTimeout(() => {
      const el = step.target?.() ?? null;
      if (step.target && !el) {
        if ((dir.current > 0 && !last) || (dir.current < 0 && i > 0)) setI((x) => x + dir.current);
        else setRect(null);
        return;
      }
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'instant' as ScrollBehavior });
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else setRect(null);
      setReady(true);
    }, 280);
    return () => window.clearTimeout(t);
  }, [i, step, current, go, last]);

  // Follow layout changes (fonts, animations, resize).
  useEffect(() => {
    if (!ready || !step.target) return;
    const id = window.setInterval(() => {
      const el = step.target?.();
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect((old) =>
        old && Math.abs(old.top - r.top) < 1 && Math.abs(old.left - r.left) < 1 && Math.abs(old.width - r.width) < 1 && Math.abs(old.height - r.height) < 1
          ? old
          : { top: r.top, left: r.left, width: r.width, height: r.height },
      );
    }, 300);
    return () => window.clearInterval(id);
  }, [ready, step]);

  useLayoutEffect(() => {
    if (tipRef.current) setTipH(tipRef.current.offsetHeight);
  }, [i, ready, rect]);

  // Keyboard: ← → Enter Esc. Captured so the app's own shortcuts stay quiet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (last) onClose();
        else move(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        move(-1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [last, move, onClose]);

  // Tooltip position: below the element if it fits, otherwise above, otherwise centred.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let tip: { top: number; left: number } | null = null;
  if (rect) {
    const left = Math.max(12, Math.min(vw - TIP_W - 12, rect.left + rect.width / 2 - TIP_W / 2));
    const below = rect.top + rect.height + PAD + 12;
    const above = rect.top - PAD - 12 - tipH;
    if (below + tipH < vh - 8) tip = { top: below, left };
    else if (above > 8) tip = { top: above, left };
    else tip = { top: Math.max(12, vh / 2 - tipH / 2), left: Math.max(12, Math.min(vw - TIP_W - 12, rect.left + rect.width + 16)) };
  }

  return createPortal(
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label={`Экскурсия: ${step.title}`}>
      {rect ? (
        <div
          className={s.spot}
          data-ready={ready || undefined}
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      ) : (
        <div className={s.dim} />
      )}
      <div
        ref={tipRef}
        key={i}
        className={s.tip}
        data-center={!rect || undefined}
        style={tip ? { top: tip.top, left: tip.left, width: TIP_W } : { width: TIP_W + 40 }}
      >
        {!rect && (
          <div className={s.art}>
            <GardenerSvg size={86} pose={last ? 'dance' : 'wave'} />
          </div>
        )}
        <div className={s.count}>
          {i + 1} / {TOUR.length}
        </div>
        <div className={s.title}>{step.title}</div>
        <p className={s.text}>{step.text}</p>
        <div className={s.dots} aria-hidden="true">
          {TOUR.map((_, k) => (
            <i key={k} data-on={k === i || undefined} data-past={k < i || undefined} />
          ))}
        </div>
        <div className={s.row}>
          {!last && (
            <button type="button" className={s.skip} onClick={onClose}>
              Пропустить
            </button>
          )}
          <span className={s.spacer} />
          {i > 0 && (
            <button type="button" className={s.back} onClick={() => move(-1)} aria-label="Назад">
              ←
            </button>
          )}
          <button type="button" className={s.next} onClick={() => (last ? onClose() : move(1))} autoFocus>
            {i === 0 ? 'Начнём' : last ? 'Начать заниматься' : 'Дальше →'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
