/** Songs the user added (chords pasted from anywhere). Stored only in this browser. */
import { KEYS } from './storageKeys';
import { canWrite, tabGuard } from './tabGuard';
import type { Song, SongBar } from './songs';

const KEY = KEYS.songs;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function parseBar(v: unknown): SongBar | null {
  if (!isObj(v) || !Array.isArray(v.chords)) return null;
  const chords = v.chords.filter((c): c is string => typeof c === 'string');
  return chords.length ? { chords, text: typeof v.text === 'string' ? v.text : '' } : null;
}

/** Validates stored / imported songs. */
export function parseSongs(v: unknown): Song[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((s): Song[] => {
    if (!isObj(s) || typeof s.id !== 'string' || typeof s.title !== 'string' || !Array.isArray(s.lines)) return [];
    const lines = s.lines.map((l) => (Array.isArray(l) ? l.map(parseBar).filter((b): b is SongBar => !!b) : [])).filter((l) => l.length);
    if (!lines.length) return [];
    return [
      {
        id: s.id,
        title: s.title,
        origin: typeof s.origin === 'string' ? s.origin : 'моя песня',
        group: 'Мои песни',
        key: typeof s.key === 'string' ? s.key : 'C',
        meter: s.meter === 3 ? 3 : 4,
        tempo: typeof s.tempo === 'number' ? Math.min(160, Math.max(40, s.tempo)) : 90,
        lines,
        custom: true,
        source: typeof s.source === 'string' ? s.source : '',
        chordsPerBar: s.chordsPerBar === 2 ? 2 : 1,
        melody: Array.isArray(s.melody) ? s.melody.filter((b): b is string => typeof b === 'string') : undefined,
        rhythm: Array.isArray(s.rhythm) ? s.rhythm.filter((b): b is string => typeof b === 'string') : undefined,
      },
    ];
  });
}

function load(): Song[] {
  try {
    return parseSongs(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return [];
  }
}

function createStore() {
  let songs: Song[] = typeof window === 'undefined' ? [] : load();
  const listeners = new Set<() => void>();
  const set = (next: Song[]) => {
    songs = next;
    if (canWrite()) {
      try {
        localStorage.setItem(KEY, JSON.stringify(songs));
      } catch {
        /* storage unavailable */
      }
    }
    listeners.forEach((l) => l());
  };
  if (typeof window !== 'undefined')
    tabGuard.onReload(() => {
      songs = load();
      listeners.forEach((l) => l());
    });
  return {
    get: () => songs,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    save(song: Song) {
      const exists = songs.some((s) => s.id === song.id);
      set(exists ? songs.map((s) => (s.id === song.id ? song : s)) : [song, ...songs]);
    },
    remove(id: string) {
      set(songs.filter((s) => s.id !== id));
    },
    replace(next: Song[]) {
      set(parseSongs(next));
    },
  };
}

export const mySongs = createStore();
