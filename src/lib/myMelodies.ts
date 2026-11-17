/** Melodies the user loaded to learn. Stored only in this browser (and in the backup file). */
import { KEYS } from './storageKeys';
import { canWrite, tabGuard } from './tabGuard';
import type { Melody, MelNote } from './melodyModel';

const KEY = KEYS.melodies;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function parseMelodies(v: unknown): Melody[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((m): Melody[] => {
    if (!isObj(m) || typeof m.id !== 'string' || typeof m.title !== 'string' || !Array.isArray(m.notes)) return [];
    const notes = (m.notes as unknown[]).filter(
      (n): n is MelNote => isObj(n) && typeof n.midi === 'number' && typeof n.beat === 'number' && typeof n.dur === 'number' && n.dur > 0,
    );
    if (notes.length < 2) return [];
    return [
      {
        id: m.id,
        title: m.title.slice(0, 80),
        source: m.source === 'midi' || m.source === 'studio' || m.source === 'example' ? m.source : 'manual',
        meter: m.meter === 3 ? 3 : 4,
        tempo: typeof m.tempo === 'number' ? Math.min(180, Math.max(40, m.tempo)) : 90,
        notes,
        stars: Array.isArray(m.stars) ? (m.stars as unknown[]).map((x) => (typeof x === 'number' ? x : 0)) : [],
        learned: m.learned === true,
        createdAt: typeof m.createdAt === 'number' ? m.createdAt : 0,
      },
    ];
  });
}

function load(): Melody[] {
  try {
    return parseMelodies(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return [];
  }
}

function createStore() {
  let list: Melody[] = typeof window === 'undefined' ? [] : load();
  const listeners = new Set<() => void>();
  const set = (next: Melody[]) => {
    list = next;
    if (canWrite()) {
      try {
        localStorage.setItem(KEY, JSON.stringify(list));
      } catch {
        /* storage full or unavailable */
      }
    }
    listeners.forEach((l) => l());
  };
  if (typeof window !== 'undefined')
    tabGuard.onReload(() => {
      list = load();
      listeners.forEach((l) => l());
    });
  return {
    get: () => list,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    save(m: Melody) {
      set(list.some((x) => x.id === m.id) ? list.map((x) => (x.id === m.id ? m : x)) : [m, ...list]);
    },
    remove(id: string) {
      set(list.filter((x) => x.id !== id));
    },
    replace(next: Melody[]) {
      set(parseMelodies(next));
    },
  };
}

export const myMelodies = createStore();
