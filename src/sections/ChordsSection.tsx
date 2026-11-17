import { ChordBuild } from './ChordBuild';
import { ChordChanges } from './ChordChanges';
import { ChordRhythm } from './ChordRhythm';
import { ChordCircle } from './ChordCircle';
import { ChordDetect } from './ChordDetect';
import { Progressions } from './Progressions';
import type { SectionProps } from './types';

/** Chords: build chords by level, play progressions, or name what you play. */
export function ChordsSection(props: SectionProps) {
  const mode = props.settings.chordMode;
  if (mode === 'progressions') return <Progressions key="progressions" {...props} />;
  if (mode === 'detect') return <ChordDetect key="detect" {...props} />;
  if (mode === 'circle') return <ChordCircle key="circle" {...props} />;
  if (mode === 'changes') return <ChordChanges key="changes" {...props} />;
  if (mode === 'rhythm') return <ChordRhythm key="rhythm" {...props} />;
  return <ChordBuild key="build" {...props} />;
}
