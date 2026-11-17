import { memo } from 'react';
import s from './SoundToggle.module.css';

interface Props {
  on: boolean;
  onChange(on: boolean): void;
}

/** Turns on-screen playback of pressed notes on/off (off = hear only the MIDI keyboard itself). */
export const SoundToggle = memo(function SoundToggle({ on, onChange }: Props) {
  return (
    <button
      type="button"
      className={s.root}
      aria-pressed={on}
      onClick={() => onChange(!on)}
      title={on ? 'Звук нот включён — выключите, если звучит сама MIDI-клавиатура (S)' : 'Включить звук нажатых нот (S)'}
    >
      <svg className={s.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" strokeLinejoin="round" />
        <g className={s.waves} strokeLinecap="round">
          <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
          <path d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8" />
        </g>
        <g className={s.mute} strokeLinecap="round">
          <path d="M16 9.5l5 5M21 9.5l-5 5" />
        </g>
      </svg>
      <span className={s.label}>Звук нот</span>
      <span className={s.track} aria-hidden="true">
        <span className={s.knob} />
      </span>
    </button>
  );
});
