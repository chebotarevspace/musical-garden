import { KEYS } from './storageKeys';
import { canWrite } from './tabGuard';
import type { Mode, OctaveRange } from './notes';
import type { ClefChoice } from './staff';
import type { Hand } from './exercises';

export type SectionKey = 'home' | 'learn' | 'notes' | 'fluency' | 'chords' | 'ear' | 'songs' | 'jam' | 'drops' | 'studio';
export type ChordMode = 'build' | 'progressions' | 'detect' | 'circle' | 'changes' | 'rhythm';
export type EarModeKey = 'intervals' | 'chords' | 'notes' | 'melody';
export type NoteSource = 'code' | 'staff' | 'melody' | 'hands' | 'tune';
import { normalizeRange } from './notes';

export interface Settings {
  /** Active training section. */
  section: SectionKey;
  /* --- Notes --- */
  /** What the task shows: the note code or the note on a staff. */
  noteSource: NoteSource;
  /** Two-hand sight-reading. */
  handsLevel: string;
  handsBars: 2 | 4;
  handsPlay: 'wait' | 'tempo';
  handsTempo: number;
  handsLabels: boolean;
  /** «Песня»: the melody being learned, current step and tempo (% of the original). */
  melodyId: string;
  melodyStep: 'listen' | 'hints' | 'read' | 'memory' | 'rhythm';
  melodyTempoPct: number;
  clef: ClefChoice;
  /** Notes per sight-reading phrase. */
  melodyLength: 4 | 6 | 8;
  mode: Mode;
  range: OctaveRange;
  /** Yamaha convention: middle C = C3. */
  yamaha: boolean;
  /** Right/wrong cue sounds. */
  sound: boolean;
  /** Play the pitch of every pressed key (off when the MIDI keyboard makes its own sound). */
  noteSound: boolean;
  mascot: boolean;
  /** The "no Web MIDI here" banner was dismissed on this device. */
  midiBannerDismissed: boolean;
  /** «Установите как приложение» was closed. */
  installDismissed: boolean;
  /** The mascot already announced the ♯/♭ mode. */
  introSeen: boolean;
  /** Missed items come up more often. */
  adaptive: boolean;
  /** Sound of notes: the recorded grand piano (or the light synth). */
  realPiano: boolean;
  /** Acoustic piano through the microphone. */
  micOn: boolean;
  micSensitivity: number;
  micHeadphones: boolean;
  /** Colour theme: light (default) or dark. */
  theme: 'dark' | 'light';
  /** The user picked the theme themselves (otherwise the default applies). */
  themePicked: boolean;
  /** The trainer opened last (for the «Тренажёры» tab). */
  lastTrainer: 'notes' | 'fluency' | 'chords' | 'ear' | 'jam' | 'drops' | 'studio';
  dropsLevel: string;
  dropsClick: boolean;
  studioTempo: number;
  studioClick: boolean;
  /** Jam: groove, key id, tempo, what to highlight. */
  jamGroove: string;
  jamKey: string;
  jamTempo: number;
  jamMarks: 'all' | 'chord' | 'none';
  /** Jam: where the chords come from, drums, mode, current task, looper length. */
  jamSource: 'groove' | 'song' | 'prog';
  jamSongId: string;
  jamProgId: string;
  jamDrums: string;
  jamMode: 'free' | 'call' | 'tasks' | 'loop';
  jamTask: string;
  jamLoopBars: 1 | 2 | 4 | 8;
  /** Looper: snap recorded notes to eighths. */
  jamLoopSnap: boolean;
  /* --- Fluency --- */
  exerciseId: string;
  hand: Hand;
  /** Demonstration tempo, BPM. */
  tempo: number;
  showFingers: boolean;
  /** 'free' — at your own pace; 'metro' — with a metronome and timing feedback. */
  fluencyPlay: 'free' | 'metro';
  /** Notes per metronome beat: 1 = quarters, 2 = eighths. */
  fluencySub: 1 | 2;
  /* --- Chords --- */
  chordLevel: string;
  showChordKeys: boolean;
  chordMode: ChordMode;
  /** «Смены»: chord set, length of a run, key hints. */
  changesSet: string;
  changesSecs: 30 | 60;
  changesKeys: boolean;
  /** «Ритм»: tempo, drums, key hints (progression, key and pattern are shared with «Последовательности»). */
  rhythmTempo: number;
  rhythmDrums: boolean;
  rhythmKeys: boolean;
  /** Selected key on the circle of fifths (major key id). */
  circleKey: string;
  /* --- Progressions --- */
  progressionId: string;
  progKey: string;
  progMinorKey: string;
  progTempo: number;
  /** 'free' — next chord when you play the current one; 'tempo' — one chord per bar with a metronome. */
  progPlay: 'free' | 'tempo';
  progShowKeys: boolean;
  progBass: boolean;
  /** Accompaniment pattern used for demos in progressions and songs. */
  pattern: string;
  /* --- Songs --- */
  songId: string;
  /** Chosen key per song. */
  songKeys: Record<string, string>;
  /** Chosen tempo per song. */
  songTempos: Record<string, number>;
  songPlay: 'wait' | 'tempo';
  /** What you play in songs: chords or the melody (when the song has one). */
  /** Chords, the melody, or both hands from a lead sheet. */
  songPart: 'chords' | 'melody' | 'lead';
  /** Lead sheet: the left hand plays the whole chord or just its root. */
  leadLeft: 'chord' | 'root';
  songShowKeys: boolean;
  songBass: boolean;
  /** Chords part: the melody plays along (the gardener sings). */
  songPartner: boolean;
  /* --- Ear training --- */
  earMode: EarModeKey;
  /** Selected level per ear mode. */
  earLevel: Record<string, string>;
  earDirection: 'up' | 'down' | 'harmonic';
  /* --- Lessons --- */
  lessonId: string;
}

export const DEFAULT_SETTINGS: Settings = {
  section: 'home',
  noteSource: 'code',
  handsLevel: 'h-alt',
  handsBars: 2,
  handsPlay: 'wait',
  handsTempo: 70,
  handsLabels: false,
  melodyId: 'ex-ode',
  melodyStep: 'listen',
  melodyTempoPct: 80,
  clef: 'treble',
  melodyLength: 6,
  mode: 'naturals',
  range: { from: 3, to: 5 },
  yamaha: false,
  sound: false,
  noteSound: true,
  mascot: true,
  midiBannerDismissed: false,
  installDismissed: false,
  introSeen: false,
  adaptive: true,
  realPiano: true,
  micOn: false,
  micSensitivity: 0.6,
  micHeadphones: false,
  theme: 'light',
  themePicked: false,
  lastTrainer: 'notes',
  dropsLevel: 'five',
  dropsClick: true,
  studioTempo: 80,
  studioClick: true,
  jamGroove: 'blues',
  jamKey: 'C',
  jamTempo: 92,
  jamMarks: 'all',
  jamSource: 'groove',
  jamSongId: 'saints',
  jamProgId: 'pop',
  jamDrums: 'auto',
  jamMode: 'free',
  jamTask: 'one-note',
  jamLoopBars: 4,
  jamLoopSnap: true,
  exerciseId: 'five-c',
  hand: 'right',
  tempo: 80,
  showFingers: true,
  fluencyPlay: 'free',
  fluencySub: 1,
  chordLevel: 'maj-cfg',
  showChordKeys: true,
  chordMode: 'build',
  changesSet: 'c-g',
  changesSecs: 60,
  changesKeys: true,
  rhythmTempo: 72,
  rhythmDrums: true,
  rhythmKeys: true,
  circleKey: 'C',
  progressionId: 'i-iv-v',
  progKey: 'C',
  progMinorKey: 'Am',
  progTempo: 70,
  progPlay: 'free',
  progShowKeys: true,
  progBass: true,
  pattern: 'block',
  songId: 'saints',
  songKeys: {},
  songTempos: {},
  songPlay: 'wait',
  songPart: 'chords',
  leadLeft: 'chord',
  songShowKeys: true,
  songBass: true,
  songPartner: true,
  earMode: 'intervals',
  earLevel: {},
  earDirection: 'up',
  lessonId: 'qs-first-chord',
};

const SETTINGS_KEY = KEYS.settings;

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  if (!canWrite()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode, quota) — run without persistence */
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
const str = (v: unknown, d: string) => (typeof v === 'string' && v ? v : d);
const strMap = (v: unknown): Record<string, string> =>
  isObj(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string')) : {};
const numMap = (v: unknown): Record<string, number> =>
  isObj(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] >= 0)) : {};

export const loadSettings = (): Settings => parseSettings(read(SETTINGS_KEY));

/** Validates stored or imported settings, filling gaps with defaults. */
export function parseSettings(v: unknown): Settings {
  if (!isObj(v)) return { ...DEFAULT_SETTINGS };
  const range = isObj(v.range) && typeof v.range.from === 'number' && typeof v.range.to === 'number'
    ? normalizeRange({ from: v.range.from, to: v.range.to })
    : DEFAULT_SETTINGS.range;
  return {
    section: oneOf(v.section, ['home', 'learn', 'notes', 'fluency', 'chords', 'ear', 'songs', 'jam', 'drops', 'studio'] as const, DEFAULT_SETTINGS.section),
    pattern: str(v.pattern, DEFAULT_SETTINGS.pattern),
    songId: str(v.songId, DEFAULT_SETTINGS.songId),
    songKeys: strMap(v.songKeys),
    songTempos: numMap(v.songTempos),
    songPlay: oneOf(v.songPlay, ['wait', 'tempo'] as const, DEFAULT_SETTINGS.songPlay),
    songPart: oneOf(v.songPart, ['chords', 'melody', 'lead'] as const, DEFAULT_SETTINGS.songPart),
    leadLeft: oneOf(v.leadLeft, ['chord', 'root'] as const, DEFAULT_SETTINGS.leadLeft),
    songShowKeys: bool(v.songShowKeys, DEFAULT_SETTINGS.songShowKeys),
    songBass: bool(v.songBass, DEFAULT_SETTINGS.songBass),
    songPartner: bool(v.songPartner, DEFAULT_SETTINGS.songPartner),
    chordMode: oneOf(v.chordMode, ['build', 'progressions', 'detect', 'circle', 'changes', 'rhythm'] as const, DEFAULT_SETTINGS.chordMode),
    changesSet: typeof v.changesSet === 'string' ? v.changesSet : DEFAULT_SETTINGS.changesSet,
    changesSecs: v.changesSecs === 30 ? 30 : 60,
    changesKeys: bool(v.changesKeys, DEFAULT_SETTINGS.changesKeys),
    rhythmTempo: typeof v.rhythmTempo === 'number' && v.rhythmTempo >= 40 && v.rhythmTempo <= 140 ? v.rhythmTempo : DEFAULT_SETTINGS.rhythmTempo,
    rhythmDrums: bool(v.rhythmDrums, DEFAULT_SETTINGS.rhythmDrums),
    rhythmKeys: bool(v.rhythmKeys, DEFAULT_SETTINGS.rhythmKeys),
    circleKey: str(v.circleKey, DEFAULT_SETTINGS.circleKey),
    progressionId: str(v.progressionId, DEFAULT_SETTINGS.progressionId),
    progKey: str(v.progKey, DEFAULT_SETTINGS.progKey),
    progMinorKey: str(v.progMinorKey, DEFAULT_SETTINGS.progMinorKey),
    progTempo: typeof v.progTempo === 'number' ? Math.min(160, Math.max(40, v.progTempo)) : DEFAULT_SETTINGS.progTempo,
    progPlay: oneOf(v.progPlay, ['free', 'tempo'] as const, DEFAULT_SETTINGS.progPlay),
    progShowKeys: bool(v.progShowKeys, DEFAULT_SETTINGS.progShowKeys),
    progBass: bool(v.progBass, DEFAULT_SETTINGS.progBass),
    earMode: oneOf(v.earMode, ['intervals', 'chords', 'notes', 'melody'] as const, DEFAULT_SETTINGS.earMode),
    earLevel: strMap(v.earLevel),
    earDirection: oneOf(v.earDirection, ['up', 'down', 'harmonic'] as const, DEFAULT_SETTINGS.earDirection),
    lessonId: str(v.lessonId, DEFAULT_SETTINGS.lessonId),
    noteSource: oneOf(v.noteSource, ['code', 'staff', 'melody', 'hands', 'tune'] as const, DEFAULT_SETTINGS.noteSource),
    handsLevel: typeof v.handsLevel === 'string' ? v.handsLevel : DEFAULT_SETTINGS.handsLevel,
    handsBars: v.handsBars === 4 ? 4 : 2,
    handsPlay: oneOf(v.handsPlay, ['wait', 'tempo'] as const, DEFAULT_SETTINGS.handsPlay),
    handsTempo: typeof v.handsTempo === 'number' && v.handsTempo >= 40 && v.handsTempo <= 120 ? v.handsTempo : DEFAULT_SETTINGS.handsTempo,
    handsLabels: bool(v.handsLabels, DEFAULT_SETTINGS.handsLabels),
    melodyId: str(v.melodyId, DEFAULT_SETTINGS.melodyId),
    melodyStep: oneOf(v.melodyStep, ['listen', 'hints', 'read', 'memory', 'rhythm'] as const, DEFAULT_SETTINGS.melodyStep),
    melodyTempoPct: typeof v.melodyTempoPct === 'number' && v.melodyTempoPct >= 40 && v.melodyTempoPct <= 120 ? Math.round(v.melodyTempoPct) : DEFAULT_SETTINGS.melodyTempoPct,
    melodyLength: v.melodyLength === 4 || v.melodyLength === 8 ? v.melodyLength : 6,
    clef: oneOf(v.clef, ['treble', 'bass', 'grand'] as const, DEFAULT_SETTINGS.clef),
    exerciseId: str(v.exerciseId, DEFAULT_SETTINGS.exerciseId),
    hand: oneOf(v.hand, ['right', 'left', 'both'] as const, DEFAULT_SETTINGS.hand),
    tempo: typeof v.tempo === 'number' ? Math.min(160, Math.max(40, v.tempo)) : DEFAULT_SETTINGS.tempo,
    showFingers: bool(v.showFingers, DEFAULT_SETTINGS.showFingers),
    fluencyPlay: oneOf(v.fluencyPlay, ['free', 'metro'] as const, DEFAULT_SETTINGS.fluencyPlay),
    fluencySub: v.fluencySub === 2 ? 2 : 1,
    chordLevel: str(v.chordLevel, DEFAULT_SETTINGS.chordLevel),
    showChordKeys: bool(v.showChordKeys, DEFAULT_SETTINGS.showChordKeys),
    mode: v.mode === 'accidentals' ? 'accidentals' : 'naturals',
    range,
    yamaha: bool(v.yamaha, DEFAULT_SETTINGS.yamaha),
    sound: bool(v.sound, DEFAULT_SETTINGS.sound),
    noteSound: bool(v.noteSound, DEFAULT_SETTINGS.noteSound),
    mascot: bool(v.mascot, DEFAULT_SETTINGS.mascot),
    midiBannerDismissed: bool(v.midiBannerDismissed, DEFAULT_SETTINGS.midiBannerDismissed),
    installDismissed: bool(v.installDismissed, DEFAULT_SETTINGS.installDismissed),
    introSeen: bool(v.introSeen, DEFAULT_SETTINGS.introSeen),
    adaptive: bool(v.adaptive, DEFAULT_SETTINGS.adaptive),
    realPiano: bool(v.realPiano, DEFAULT_SETTINGS.realPiano),
    micOn: bool(v.micOn, DEFAULT_SETTINGS.micOn),
    micSensitivity: typeof v.micSensitivity === 'number' && v.micSensitivity >= 0 && v.micSensitivity <= 1 ? v.micSensitivity : DEFAULT_SETTINGS.micSensitivity,
    micHeadphones: bool(v.micHeadphones, DEFAULT_SETTINGS.micHeadphones),
    // Light is the default; a saved «dark» counts only if the user chose it themselves
    // (before this version dark was the default and got saved without a choice).
    theme: v.themePicked === true && v.theme === 'dark' ? 'dark' : 'light',
    themePicked: v.themePicked === true,
    lastTrainer: oneOf(v.lastTrainer, ['notes', 'fluency', 'chords', 'ear', 'jam', 'drops', 'studio'] as const, DEFAULT_SETTINGS.lastTrainer),
    dropsLevel: str(v.dropsLevel, DEFAULT_SETTINGS.dropsLevel),
    dropsClick: bool(v.dropsClick, DEFAULT_SETTINGS.dropsClick),
    studioTempo: typeof v.studioTempo === 'number' && v.studioTempo >= 40 && v.studioTempo <= 180 ? Math.round(v.studioTempo) : DEFAULT_SETTINGS.studioTempo,
    studioClick: bool(v.studioClick, DEFAULT_SETTINGS.studioClick),
    jamGroove: str(v.jamGroove, DEFAULT_SETTINGS.jamGroove),
    jamKey: str(v.jamKey, DEFAULT_SETTINGS.jamKey),
    jamTempo: typeof v.jamTempo === 'number' && v.jamTempo >= 50 && v.jamTempo <= 160 ? Math.round(v.jamTempo) : DEFAULT_SETTINGS.jamTempo,
    jamMarks: oneOf(v.jamMarks, ['all', 'chord', 'none'] as const, DEFAULT_SETTINGS.jamMarks),
    jamSource: oneOf(v.jamSource, ['groove', 'song', 'prog'] as const, DEFAULT_SETTINGS.jamSource),
    jamSongId: str(v.jamSongId, DEFAULT_SETTINGS.jamSongId),
    jamProgId: str(v.jamProgId, DEFAULT_SETTINGS.jamProgId),
    jamDrums: str(v.jamDrums, DEFAULT_SETTINGS.jamDrums),
    jamMode: oneOf(v.jamMode, ['free', 'call', 'tasks', 'loop'] as const, DEFAULT_SETTINGS.jamMode),
    jamTask: str(v.jamTask, DEFAULT_SETTINGS.jamTask),
    jamLoopBars: v.jamLoopBars === 1 || v.jamLoopBars === 2 || v.jamLoopBars === 8 ? v.jamLoopBars : 4,
    jamLoopSnap: bool(v.jamLoopSnap, true),
  };
}

export const saveSettings = (s: Settings) => write(SETTINGS_KEY, s);

export const resetSettings = (): Settings => {
  const fresh = { ...DEFAULT_SETTINGS };
  saveSettings(fresh);
  return fresh;
};
