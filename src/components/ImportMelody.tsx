import { useMemo, useState } from 'react';
import { noteStart, noteStop, primeAudio } from '../lib/audio';
import { type MelNote, type Melody, barsIn, melodyFromTrack, melodyTracks, parseMelodyText, phrasesOf, sliceBars, staffItems } from '../lib/melodyModel';
import { type MidiSong, parseMidi } from '../lib/midiFile';
import { myMelodies } from '../lib/myMelodies';
import { midiToCode } from '../lib/notes';
import { StaffLine } from './StaffLine';
import { Modal } from './ui/Modal';
import { Segmented } from './ui/Segmented';
import s from './ImportMelody.module.css';

type Tab = 'midi' | 'text';

const noteWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'нота' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'ноты' : 'нот');

const SAMPLE = 'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:1.5 D4:0.5 D4:2';

function preview(notes: MelNote[], tempo: number) {
  primeAudio();
  const beatMs = 60000 / tempo;
  notes.slice(0, 24).forEach((n) => {
    window.setTimeout(() => noteStart(n.midi, 80), n.beat * beatMs);
    window.setTimeout(() => noteStop(n.midi, 0.12), (n.beat + n.dur * 0.9) * beatMs);
  });
}

/** Load a melody to learn: from a MIDI file or typed as note codes. */
export function ImportMelody({ onClose, onSaved }: { onClose(): void; onSaved(m: Melody): void }) {
  const [tab, setTab] = useState<Tab>('midi');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  // MIDI
  const [song, setSong] = useState<MidiSong | null>(null);
  const [trackIdx, setTrackIdx] = useState(0);
  const [fromBar, setFromBar] = useState(1);
  const [toBar, setToBar] = useState(9);
  const tracks = useMemo(() => (song ? melodyTracks(song) : []), [song]);
  const full = useMemo(() => (song && tracks[trackIdx] ? melodyFromTrack(tracks[trackIdx], song, title) : null), [song, tracks, trackIdx, title]);
  const totalBars = full ? barsIn(full.notes, full.meter) : 0;

  // Text
  const [text, setText] = useState('');
  const [meter, setMeter] = useState<3 | 4>(4);
  const [tempo, setTempo] = useState(90);

  let notes: MelNote[] = [];
  let parseError: string | null = null;
  if (tab === 'midi' && full) notes = sliceBars(full.notes, full.meter, fromBar, Math.max(fromBar + 1, toBar));
  if (tab === 'text' && text.trim()) {
    try {
      notes = parseMelodyText(text);
    } catch (e) {
      parseError = (e as Error).message;
    }
  }
  const melMeter = tab === 'midi' ? full?.meter ?? 4 : meter;
  const melTempo = tab === 'midi' ? full?.tempo ?? 100 : tempo;
  const items = notes.length ? staffItems(notes, melMeter, 0, Math.min(notes.length, 16)) : [];
  const low = notes.length ? Math.min(...notes.map((n) => n.midi)) : 60;
  const high = notes.length ? Math.max(...notes.map((n) => n.midi)) : 72;
  const clef = low < 55 && high < 64 ? 'bass' : low < 55 ? 'grand' : 'treble';

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const parsed = parseMidi(await file.arrayBuffer());
      if (!melodyTracks(parsed).length) throw new Error('В файле не нашлось подходящей мелодической дорожки.');
      setSong(parsed);
      setTrackIdx(0);
      setFromBar(1);
      setToBar(9);
      setTitle(file.name.replace(/\.(mid|midi)$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 60));
    } catch (e) {
      setSong(null);
      setError((e as Error).message);
    }
  };

  const save = () => {
    if (notes.length < 3) return setError('Нужно хотя бы три ноты.');
    const m: Melody = {
      id: `mel-${Date.now().toString(36)}`,
      title: title.trim() || 'Моя мелодия',
      source: tab === 'midi' ? 'midi' : 'manual',
      meter: melMeter,
      tempo: melTempo,
      notes,
      stars: [],
      createdAt: Date.now(),
    };
    myMelodies.save(m);
    onSaved(m);
  };

  return (
    <Modal title="Новая мелодия" onClose={onClose} width={720}>
      <div className={s.wrap}>
        <Segmented<Tab>
          ariaLabel="Как добавить"
          value={tab}
          onChange={(t) => {
            setTab(t);
            setError(null);
          }}
          options={[
            { value: 'midi', label: 'MIDI-файл' },
            { value: 'text', label: 'Ввести ноты' },
          ]}
        />

        {tab === 'midi' ? (
          <>
            <p className={s.hint}>
              Откройте файл <b>.mid</b> с мелодией песни — его можно найти в интернете или сохранить из нотного редактора. Приложение
              возьмёт одну дорожку, уберёт аккорды (оставит верхний голос) и выровняет ритм. Файл никуда не отправляется.
            </p>
            <label className={s.file}>
              <input type="file" accept=".mid,.midi,audio/midi,audio/x-midi" onChange={(e) => onFile(e.target.files?.[0])} />
              <span>{song ? 'Выбрать другой файл…' : 'Выбрать MIDI-файл…'}</span>
            </label>
            {song && tracks.length > 0 && (
              <div className={s.grid}>
                <label>
                  <span>Дорожка</span>
                  <select value={trackIdx} onChange={(e) => setTrackIdx(Number(e.target.value))}>
                    {tracks.map((t, i) => (
                      <option key={i} value={i}>
                        {(t.name || `Дорожка ${i + 1}`) + ` · ${t.notes.length} ${noteWord(t.notes.length)} · ${midiToCode(Math.min(...t.notes.map((n) => n.midi)))}–${midiToCode(Math.max(...t.notes.map((n) => n.midi)))}`}
                        {i === 0 ? ' · похоже на мелодию' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Такты: с</span>
                  <input type="number" min={1} max={totalBars} value={fromBar} onChange={(e) => setFromBar(Math.max(1, Math.min(totalBars, Number(e.target.value) || 1)))} />
                </label>
                <label>
                  <span>по</span>
                  <input type="number" min={fromBar} max={totalBars} value={Math.min(toBar - 1, totalBars)} onChange={(e) => setToBar(Math.max(fromBar, Math.min(totalBars, Number(e.target.value) || fromBar)) + 1)} />
                </label>
                <span className={s.meta}>
                  всего тактов: {totalBars} · {full?.meter}/4 · {full?.tempo} bpm
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <p className={s.hint}>
              Ноты через пробел: <code>C4 D4 E4</code>. Длительность после двоеточия в долях: <code>E4:2</code> — половинная,{' '}
              <code>E4:0.5</code> — восьмая, <code>R</code> — пауза. Черта <code>|</code> — для удобства, её можно не ставить.
            </p>
            <textarea className={s.text} rows={4} value={text} placeholder={SAMPLE} onChange={(e) => setText(e.target.value)} spellCheck={false} />
            <div className={s.grid}>
              <label>
                <span>Размер</span>
                <select value={meter} onChange={(e) => setMeter(e.target.value === '3' ? 3 : 4)}>
                  <option value={4}>4/4</option>
                  <option value={3}>3/4</option>
                </select>
              </label>
              <label>
                <span>Темп, bpm</span>
                <input type="number" min={40} max={180} value={tempo} onChange={(e) => setTempo(Math.max(40, Math.min(180, Number(e.target.value) || 90)))} />
              </label>
              <button type="button" className={s.sample} onClick={() => setText(SAMPLE)}>
                Пример
              </button>
            </div>
          </>
        )}

        {(error || parseError) && <p className={s.error}>{error ?? parseError}</p>}

        {notes.length > 0 && (
          <div className={s.preview}>
            <div className={s.previewHead}>
              <span>
                {notes.length} {noteWord(notes.length)} · фраз: {phrasesOf({ notes, meter: melMeter }).length}
                {notes.length > 16 ? ' · показано начало' : ''}
              </span>
              <button type="button" className={s.sample} onClick={() => preview(notes, melTempo)}>
                ▶ Послушать начало
              </button>
            </div>
            <div className={s.staff}>
              <StaffLine notes={items.map((it) => ({ code: it.code, dur: it.dur, rest: it.rest, barBefore: it.barBefore }))} clef={clef} noteWidth={38} />
            </div>
          </div>
        )}

        <div className={s.saveRow}>
          <input className={s.title} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название мелодии" maxLength={60} aria-label="Название" />
          <button type="button" className={s.save} disabled={notes.length < 3} onClick={save}>
            Сохранить и учить
          </button>
        </div>
      </div>
    </Modal>
  );
}
