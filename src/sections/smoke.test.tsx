import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { ComponentType } from 'react';
import { createKeyStore } from '../lib/keyStore';
import { DEFAULT_SETTINGS, type Settings } from '../lib/storage';
import type { SectionProps } from './types';
import { ChordsSection } from './ChordsSection';
import { DropsSection } from './DropsSection';
import { EarSection } from './EarSection';
import { FluencySection } from './FluencySection';
import { HomeSection } from './HomeSection';
import { JamSection } from './JamSection';
import { LearnSection } from './LearnSection';
import { NotesSection } from './NotesSection';
import { SongsSection } from './SongsSection';
import { StudioSection } from './StudioSection';

const props = (patch: Partial<Settings>): SectionProps => ({
  store: createKeyStore(),
  settings: { ...DEFAULT_SETTINGS, ...patch },
  update: () => {},
  inputRef: { current: null },
  mascot: { react: () => {}, markActive: () => {} },
  say: () => {},
  octaveOffset: 0,
  midiConnected: false,
  setKeyboardRange: () => {},
});

const render = (C: ComponentType<SectionProps>, patch: Partial<Settings> = {}) => renderToString(<C {...props(patch)} />);

// Every screen and every mode renders without throwing — catches broken screens before the browser does.
describe('every screen renders', () => {
  const cases: [string, ComponentType<SectionProps>, Partial<Settings>][] = [
    ['notes · code', NotesSection, { noteSource: 'code' }],
    ['notes · staff', NotesSection, { noteSource: 'staff', clef: 'grand' }],
    ['notes · melody', NotesSection, { noteSource: 'melody' }],
    ['notes · two hands', NotesSection, { noteSource: 'hands', handsLevel: 'h-chords' }],
    ['notes · tune', NotesSection, { noteSource: 'tune', melodyId: 'ex-ode' }],
    ['fluency', FluencySection, {}],
    ['fluency · scale', FluencySection, { exerciseId: 'scale-c', hand: 'both' }],
    ...(['build', 'changes', 'progressions', 'rhythm', 'detect', 'circle'] as const).map((m): [string, ComponentType<SectionProps>, Partial<Settings>] => [`chords · ${m}`, ChordsSection, { chordMode: m }]),
    ...(['intervals', 'chords', 'notes', 'melody'] as const).map((m): [string, ComponentType<SectionProps>, Partial<Settings>] => [`ear · ${m}`, EarSection, { earMode: m }]),
    ['songs · chords', SongsSection, { songId: 'let-it-be', songPart: 'chords' }],
    ['songs · melody', SongsSection, { songId: 'twinkle', songPart: 'melody' }],
    ['songs · both hands', SongsSection, { songId: 'saints', songPart: 'lead' }],
    ...(['free', 'call', 'tasks', 'loop'] as const).map((m): [string, ComponentType<SectionProps>, Partial<Settings>] => [`jam · ${m}`, JamSection, { jamMode: m }]),
    ['drops', DropsSection, {}],
    ['studio', StudioSection, {}],
    ['learn', LearnSection, { lessonId: 'triads' }],
    ['learn · memos', LearnSection, { lessonId: 'memos' }],
  ];
  for (const [name, C, patch] of cases)
    it(name, () => {
      expect(render(C, patch).length).toBeGreaterThan(100);
    });

  it('home', () => {
    const html = renderToString(<HomeSection {...props({ section: 'home' })} session={null} onStartSession={() => {}} onResumeSession={() => {}} open={() => {}} />);
    expect(html.replace(/<!-- -->/g, '')).toContain('Занятие 1 из');
  });
});
