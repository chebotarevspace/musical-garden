import type { CSSProperties } from 'react';
import { Segmented } from '../components/ui/Segmented';
import { chordSymbol } from '../lib/chords';
import type { JamHarmony } from '../lib/jam';
import { LOOP_BARS, type LoopBars, type LoopLayer, type LoopNote, guideSegments, layerRange } from '../lib/looper';
import l from './LooperPanel.module.css';

interface Props {
  h: JamHarmony;
  bars: LoopBars;
  onBars(bars: LoopBars): void;
  snap: boolean;
  onSnap(on: boolean): void;
  running: boolean;
  /** Beats since the loop first started (negative during the count-in). */
  beat: number;
  loopLen: number;
  layers: LoopLayer[];
  rec: { from: number; notes: LoopNote[] } | null;
  maxLayers: number;
  onRecord(): void;
  onToggle(id: number): void;
  onRemove(id: number): void;
  onClear(): void;
  drumsOff: boolean;
}

const barsWord = (n: number) => (n === 1 ? 'такт' : n < 5 ? 'такта' : 'тактов');
const beatsWord = (n: number) => (n === 1 ? 'долю' : n < 5 ? 'доли' : 'долей');

function Lane({ notes, loopLen }: { notes: LoopNote[]; loopLen: number }) {
  const [lo, hi] = layerRange(notes);
  const span = Math.max(hi - lo, 5);
  const mid = (lo + hi) / 2;
  return (
    <>
      {notes.map((n, i) => (
        <i
          key={i}
          className={l.note}
          style={{
            left: `${(n.on / loopLen) * 100}%`,
            width: `${Math.max(0.6, ((n.off - n.on) / loopLen) * 100)}%`,
            top: `${50 - ((n.midi - mid) / span) * 76}%`,
          }}
        />
      ))}
    </>
  );
}

/** The looper: one loop of N bars, recorded layer by layer, with a chord guide and a playhead. */
export function LooperPanel(p: Props) {
  const { h, loopLen, beat, rec, layers } = p;
  const inLoop = ((beat % loopLen) + loopLen) % loopLen;
  const countIn = p.running && beat < 0;
  const waiting = !!rec && p.running && beat < rec.from;
  const recording = !!rec && p.running && beat >= rec.from;
  const barNow = Math.floor(inLoop / h.meter);
  const segments = guideSegments(h, loopLen);
  const full = layers.length >= p.maxLayers;

  let title: string;
  let sub: string;
  if (countIn) {
    title = `Отсчёт… ${Math.ceil(-beat)}`;
    sub = 'Запись начнётся с первого такта — приготовьтесь.';
  } else if (waiting) {
    const left = Math.ceil(rec!.from - beat);
    title = `Запись через ${left} ${beatsWord(left)}`;
    sub = 'Ждём начала круга: слой всегда записывается с первого такта и ровно на один круг.';
  } else if (recording) {
    title = `● Запись слоя ${layers.length + 1}`;
    sub = `Такт ${barNow + 1} из ${p.bars} — играйте! Потом слой сам зазвучит по кругу.`;
  } else if (!layers.length) {
    title = `Лупер · ${p.bars} ${barsWord(p.bars)}`;
    sub = 'Запишите бас или аккорды на один круг — они закольцуются, и вы сыграете поверх.';
  } else if (p.running) {
    title = `Слоёв: ${layers.length}`;
    sub = full ? 'Слоёв достаточно — импровизируйте поверх.' : 'Аккомпанемент звучит по кругу. Импровизируйте поверх или запишите ещё слой.';
  } else {
    title = `Слоёв: ${layers.length}`;
    sub = 'Нажмите «Играть», чтобы услышать круг, или запишите ещё слой.';
  }

  const changeBars = (v: string) => {
    const bars = Number(v) as LoopBars;
    if (bars === p.bars) return;
    if (layers.length && !window.confirm('Длина круга изменится, а записанные слои удалятся. Продолжить?')) return;
    p.onBars(bars);
  };

  return (
    <div className={l.root} data-state={recording ? 'rec' : countIn || waiting ? 'wait' : undefined}>
      <div className={l.status}>
        <div className={l.title}>{title}</div>
        <p className={l.sub}>{sub}</p>
      </div>

      <div className={l.controls}>
        <Segmented<string>
          ariaLabel="Длина круга"
          value={String(p.bars)}
          onChange={changeBars}
          options={LOOP_BARS.map((b) => ({ value: String(b), label: `${b} ${barsWord(b)}`, title: `Круг из ${b} ${b === 1 ? 'такта' : 'тактов'}` }))}
        />
        <button type="button" className={l.rec} data-on={rec ? '' : undefined} onClick={p.onRecord} disabled={!rec && full} title={rec ? 'Отменить запись' : 'Записать слой: ровно один круг с первого такта'}>
          <span className={l.dot} aria-hidden="true" /> {rec ? 'Отменить' : layers.length ? 'Записать ещё слой' : 'Записать слой'} <kbd>L</kbd>
        </button>
        <button type="button" className={l.pill} onClick={() => p.onRemove(layers[layers.length - 1].id)} disabled={!layers.length} title="Удалить последний слой">
          ↶ Отменить слой <kbd>U</kbd>
        </button>
        <button type="button" className={l.pill} onClick={p.onClear} disabled={!layers.length}>
          Очистить
        </button>
        <label className={l.snap} title="Сдвигать ноты к ближайшей восьмой — запись звучит ровнее">
          <input type="checkbox" checked={p.snap} onChange={(e) => p.onSnap(e.target.checked)} /> Выравнивать по сетке
        </label>
      </div>

      <div className={l.timeline} style={{ '--bars': p.bars, '--beats': loopLen } as CSSProperties}>
        <div className={l.label}>Такты</div>
        <div className={l.barNums}>
          {Array.from({ length: p.bars }, (_, i) => (
            <span key={i} data-on={p.running && !countIn && i === barNow ? '' : undefined}>
              {i + 1}
            </span>
          ))}
        </div>

        <div className={l.label} title={`Аккорды «${h.title}» — что можно записать`}>
          Подсказка
        </div>
        <div className={l.guide}>
          {segments.map((sg, i) => (
            <span key={i} style={{ left: `${(sg.from / loopLen) * 100}%`, width: `${((sg.to - sg.from) / loopLen) * 100}%` }} data-on={p.running && !countIn && inLoop >= sg.from && inLoop < sg.to ? '' : undefined}>
              {chordSymbol(sg.chord)}
            </span>
          ))}
        </div>

        {layers.map((layer, i) => (
          <div key={layer.id} className={l.row} data-muted={layer.muted || undefined} style={{ '--hue': (i * 57 + 150) % 360 } as CSSProperties}>
            <div className={l.label}>
              <button type="button" className={l.mute} aria-pressed={!layer.muted} onClick={() => p.onToggle(layer.id)} title={layer.muted ? 'Включить слой' : 'Заглушить слой'}>
                {layer.muted ? '🔇' : '🔊'}
              </button>
              <span>Слой {i + 1}</span>
              <button type="button" className={l.del} onClick={() => p.onRemove(layer.id)} aria-label={`Удалить слой ${i + 1}`} title="Удалить слой">
                ×
              </button>
            </div>
            <div className={l.lane}>
              <Lane notes={layer.notes} loopLen={loopLen} />
            </div>
          </div>
        ))}

        {rec && (
          <div className={l.row} data-rec="">
            <div className={l.label}>
              <span className={l.dot} aria-hidden="true" /> {recording ? 'Запись' : 'Ждём'}
            </div>
            <div className={l.lane}>
              {recording && <i className={l.recFill} style={{ width: `${(inLoop / loopLen) * 100}%` }} />}
              <Lane notes={rec.notes} loopLen={loopLen} />
            </div>
          </div>
        )}

        {!layers.length && !rec && (
          <ol className={l.steps}>
            <li>Выберите длину круга и гармонию-подсказку (сверху, «Гармония»).</li>
            <li>
              Нажмите <b>«Записать слой»</b> — после отсчёта сыграйте один круг, например бас по подсказке.
            </li>
            <li>Слой зазвучит по кругу. Добавьте аккорды, потом мелодию — или просто импровизируйте поверх.</li>
          </ol>
        )}

        {p.running && !countIn && <i className={l.playhead} style={{ left: `calc(var(--label) + (100% - 28px - var(--label)) * ${inLoop / loopLen})` }} aria-hidden="true" />}
      </div>

      {p.drumsOff && <p className={l.note2}>Барабаны выключены — ритм держите сами, без них проще сбиться. Включите их в поле «Барабаны».</p>}
    </div>
  );
}
