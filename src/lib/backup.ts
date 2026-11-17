/** Export / import of all user data as a JSON file. */
import { parseSongs } from './mySongs';
import { type Progress, parseProgress } from './progress';
import type { Song } from './songs';
import { type Settings, parseSettings } from './storage';
import type { Take } from './studio';
import type { Melody } from './melodyModel';
import { parseMelodies } from './myMelodies';

const APP_ID = 'musical-garden';
/** Backups saved under the app's earlier name are read too. */
const OLD_APP_IDS = ['notny-sad'];

export interface Backup {
  settings: Settings;
  progress: Progress;
  songs: Song[];
  /** Studio recordings. */
  takes: Take[];
  /** Melodies loaded to learn. */
  melodies: Melody[];
  exportedAt: number;
}

export function makeBackup(settings: Settings, progress: Progress, songs: Song[] = [], takes: Take[] = [], melodies: Melody[] = []): string {
  return JSON.stringify({ app: APP_ID, version: 1, exportedAt: Date.now(), settings, progress, songs, takes, melodies });
}

/** Throws a readable error when the file is not a backup of this app. */
export function readBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Файл не похож на резервную копию: это не JSON.');
  }
  if (typeof raw !== 'object' || raw === null || (raw as { app?: unknown }).app !== APP_ID && !OLD_APP_IDS.includes(String((raw as { app?: unknown }).app))) {
    throw new Error('Это не резервная копия «Музыкального сада».');
  }
  const r = raw as { settings?: unknown; progress?: unknown; songs?: unknown; takes?: unknown; melodies?: unknown; exportedAt?: unknown };
  return {
    settings: parseSettings(r.settings),
    progress: parseProgress(r.progress),
    songs: parseSongs(r.songs),
    melodies: parseMelodies(r.melodies),
    takes: Array.isArray(r.takes) ? (r.takes.filter((x) => x && typeof x === 'object' && Array.isArray((x as Take).notes)) as Take[]) : [],
    exportedAt: typeof r.exportedAt === 'number' ? r.exportedAt : 0,
  };
}

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
