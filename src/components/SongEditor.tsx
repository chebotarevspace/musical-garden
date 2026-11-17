import { useMemo, useState } from 'react';
import { chordSymbol } from '../lib/chords';
import { parseChord } from '../lib/chordSymbols';
import { keyById, chordNumeral, type Song } from '../lib/songs';
import { parseChordSheet } from '../lib/songImport';
import { Spelled } from './Spelled';
import { Modal } from './ui/Modal';
import { Segmented } from './ui/Segmented';
import s from './SongEditor.module.css';

const EXAMPLE = `Куплет:
C                 G
Вставьте сюда текст песни,
Am                F
аккорды — над словами.

Или так: [C]аккорды [G]прямо в [Am]тексте.`;

interface Props {
  initial?: Song;
  onSave(song: Song): void;
  onClose(): void;
}

/** Paste a chord sheet → preview → save as your own song. */
export function SongEditor({ initial, onSave, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [text, setText] = useState(initial?.source ?? '');
  const [meter, setMeter] = useState<3 | 4>(initial?.meter ?? 4);
  const [per, setPer] = useState<1 | 2>(initial?.chordsPerBar ?? 1);
  const [tempo, setTempo] = useState(initial?.tempo ?? 90);

  const parsed = useMemo(() => (text.trim() ? parseChordSheet(text, { chordsPerBar: per }) : null), [text, per]);
  const key = parsed ? keyById(parsed.keyId) : null;
  const used = useMemo(() => {
    if (!parsed || !key) return [];
    const seen = new Map<string, string>();
    for (const b of parsed.bars) for (const c of b.chords) if (!seen.has(c)) seen.set(c, chordNumeral(parseChord(c), key));
    return [...seen];
  }, [parsed, key]);
  const canSave = !!parsed && parsed.bars.length > 0 && title.trim().length > 0 && !(meter === 3 && per === 2);

  const save = () => {
    if (!parsed || !canSave) return;
    onSave({
      id: initial?.id ?? `my-${Date.now().toString(36)}`,
      title: title.trim(),
      origin: 'моя песня',
      group: 'Мои песни',
      key: parsed.keyId,
      meter,
      tempo,
      lines: parsed.lines,
      custom: true,
      source: text,
      chordsPerBar: per,
    });
  };

  return (
    <Modal title={initial ? 'Изменить песню' : 'Своя песня'} onClose={onClose} width={1000}>
      <div className={s.layout}>
        <div className={s.form}>
          <label className={s.field}>
            <span>Название</span>
            <input className={s.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Моя любимая песня" maxLength={80} autoFocus />
          </label>
          <div className={s.row}>
            <div className={s.field}>
              <span>Размер</span>
              <Segmented<'4' | '3'> ariaLabel="Размер" value={String(meter) as '4' | '3'} onChange={(v) => setMeter(v === '3' ? 3 : 4)} options={[{ value: '4', label: '4/4' }, { value: '3', label: '3/4' }]} />
            </div>
            <div className={s.field}>
              <span>Аккордов в такте</span>
              <Segmented<'1' | '2'> ariaLabel="Аккордов в такте" value={String(per) as '1' | '2'} onChange={(v) => setPer(v === '2' ? 2 : 1)} options={[{ value: '1', label: '1' }, { value: '2', label: '2' }]} />
            </div>
            <label className={s.field}>
              <span>Темп: {tempo} bpm</span>
              <input type="range" className={s.range} min={40} max={160} step={2} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} />
            </label>
          </div>
          <label className={s.field}>
            <span>Текст с аккордами</span>
            <textarea className={s.textarea} value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} spellCheck={false} />
          </label>
          <p className={s.help}>
            Скопируйте песню с любого сайта с аккордами: строка аккордов над строкой слов. Подойдёт и запись вида [C]слова. Каждый аккорд станет
            тактом (или половиной такта, если выбрать 2 аккорда в такте). Песня хранится только в этом браузере.
          </p>
        </div>

        <div className={s.preview}>
          <div className={s.previewHead}>
            <span className={s.label}>Предпросмотр</span>
            {key && (
              <span className={s.key}>
                тональность <Spelled text={key.label} />
              </span>
            )}
          </div>
          {parsed && parsed.bars.length > 0 ? (
            <>
              <div className={s.used}>
                {used.map(([sym, num]) => (
                  <span key={sym} className={s.chip}>
                    <Spelled text={chordSymbol(parseChord(sym))} /> <small>{num}</small>
                  </span>
                ))}
              </div>
              <div className={s.sheet}>
                {parsed.lines.map((line, li) => (
                  <div key={li} className={s.line}>
                    {line.map((bar, bi) => (
                      <div key={bi} className={s.bar}>
                        <span className={s.chords}>
                          {bar.chords.map((c, ci) => (
                            <Spelled key={ci} text={chordSymbol(parseChord(c))} />
                          ))}
                        </span>
                        <span className={s.words}>{bar.text || ' '}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {parsed.warnings.length > 0 && (
                <ul className={s.warnings}>
                  {parsed.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
              <p className={s.count}>
                {parsed.bars.length} тактов · {used.length} разных аккордов
              </p>
            </>
          ) : (
            <p className={s.empty}>Здесь появятся такты с аккордами, как только вы вставите текст.</p>
          )}
          {meter === 3 && per === 2 && <p className={s.warn}>В размере 3/4 по два аккорда в такте не поместится — выберите 1.</p>}
        </div>
      </div>
      <div className={s.footer}>
        <button type="button" className={s.cancel} onClick={onClose}>
          Отмена
        </button>
        <button type="button" className={s.save} onClick={save} disabled={!canSave}>
          {initial ? 'Сохранить изменения' : 'Добавить песню'}
        </button>
      </div>
    </Modal>
  );
}
