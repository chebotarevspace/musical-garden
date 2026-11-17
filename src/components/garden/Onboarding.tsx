import { useState } from 'react';
import type { Progress } from '../../lib/progress';
import type { MidiStatus } from '../../hooks/useMidi';
import type { MicStatus } from '../../hooks/useMicInput';
import { Sprite } from './GardenScene';
import { GardenerG } from './GardenerArt';
import s from './Onboarding.module.css';

type Level = NonNullable<Progress['level']>;

interface Props {
  midiStatus: MidiStatus;
  /** Increments on every key press (MIDI or screen), so the check step can react. */
  pressCount: number;
  onDone(level: Level): void;
  micOn: boolean;
  micStatus: MicStatus;
  onMic(on: boolean): void;
}

/** First launch: the idea of the garden and a keyboard check — then the course starts at session 1. */
export function Onboarding({ midiStatus, pressCount, onDone, micOn, micStatus, onMic }: Props) {
  const [step, setStep] = useState(0);
  const [startCount] = useState(pressCount);
  const pressed = pressCount > startCount;

  return (
    <div className={s.backdrop}>
      <div className={s.panel} role="dialog" aria-modal="true" aria-label="Добро пожаловать">
        <div className={s.dots} aria-hidden="true">
          {[0, 1].map((i) => (
            <i key={i} data-on={i <= step || undefined} />
          ))}
        </div>

        {step === 0 && (
          <div className={s.page}>
            <div className={s.scene} aria-hidden="true">
              <svg viewBox="0 0 160 56" width="320" height="112" overflow="visible">
                <g transform="translate(2 33) scale(1.5)">
                  <GardenerG pose="wave" />
                </g>
                <Sprite species="sprout" x={58} y={54} />
                <Sprite species="bell" x={96} y={54} />
                <Sprite species="sakura" x={136} y={54} />
              </svg>
            </div>
            <h1 className={s.title}>Музыкальный сад</h1>
            <p className={s.text}>
              Привет! Я Доминик, садовник. Здесь музыка растёт, как сад. Каждые <b>10 минут игры</b> за клавишами превращают семечко в растение: на нотах
              вырастают колокольчики, на аккордах — деревья, на песнях — сакура.
            </p>
            <p className={s.text}>
              Курс — это <b>24 занятия</b> в своём темпе: сначала фундамент (клавиатура, пальцы, ноты, ритм, две руки), потом аккорды и песни, потом
              импровизация. Пропустили день — ничего страшного: росток не завянет, он подождёт.
            </p>
            <button type="button" className={s.primary} onClick={() => setStep(1)}>
              Дальше
            </button>
          </div>
        )}

        {step === 1 && (
          <div className={s.page}>
            <div className={s.keys} data-pressed={pressed || undefined} aria-hidden="true">
              {Array.from({ length: 7 }, (_, i) => (
                <i key={i} />
              ))}
            </div>
            <h1 className={s.title}>{pressed ? 'Слышу! 🎹' : 'Проверим клавиатуру'}</h1>
            <p className={s.text}>
              {pressed
                ? micOn
                  ? 'Пианино слышно через микрофон.'
                  : 'Клавиатура подключена и работает.'
                : micOn
                  ? micStatus === 'denied'
                    ? 'Браузер не дал доступ к микрофону. Разрешите его в настройках сайта — или играйте мышью.'
                    : 'Сыграйте на пианино одну ноту — громко и отчётливо.'
                  : midiStatus === 'ready'
                    ? 'Нажмите любую клавишу на MIDI-клавиатуре.'
                    : 'Подключите MIDI-клавиатуру по USB и нажмите любую клавишу. Нет клавиатуры — можно играть мышью по экранной.'}
            </p>
            <div className={s.row}>
              {!pressed && !micOn && micStatus !== 'unsupported' && (
                <button type="button" className={s.ghost} onClick={() => onMic(true)}>
                  🎤 У меня обычное пианино
                </button>
              )}
              <button type="button" className={pressed ? s.primary : s.ghost} onClick={() => onDone('beginner')}>
                {pressed ? 'Посадить первое семечко' : 'Играю мышью'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
