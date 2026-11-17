/**
 * All localStorage keys of «Музыкальный сад» in one place, plus a one-time rename of the keys
 * the app used under its earlier names (najdi-notu, notny-sad). Imported first in main.tsx,
 * so the stores already find their data under the new names.
 */
const P = 'musical-garden';

export const KEYS = {
  settings: `${P}:settings:v1`,
  progress: `${P}:progress:v1`,
  songs: `${P}:songs:v1`,
  melodies: `${P}:melodies:v1`,
  takes: `${P}:takes:v1`,
  session: `${P}:session:v2`,
  backup: `${P}:backup:v1`,
  offlineReady: `${P}:offline-ready`,
} as const;

/** Old name → new name. */
const RENAMES: [string, string][] = [
  ['najdi-notu:settings:v1', KEYS.settings],
  ['notny-sad:progress:v1', KEYS.progress],
  ['notny-sad:songs:v1', KEYS.songs],
  ['notny-sad:melodies:v1', KEYS.melodies],
  ['notny-sad:takes:v1', KEYS.takes],
  ['notny-sad:session:v2', KEYS.session],
  ['notny-sad:backup:v1', KEYS.backup],
  ['notny-sad:offline-ready', KEYS.offlineReady],
];
/** Keys of very old versions that are no longer read. */
const DROP = ['najdi-notu:stats:v1', 'notny-sad:session:v1'];

export function renameOldKeys(storage: Storage) {
  for (const [from, to] of RENAMES) {
    const v = storage.getItem(from);
    if (v === null) continue;
    if (storage.getItem(to) === null) storage.setItem(to, v);
    storage.removeItem(from);
  }
  for (const k of DROP) storage.removeItem(k);
}

if (typeof window !== 'undefined') {
  try {
    renameOldKeys(window.localStorage);
  } catch {
    /* storage unavailable */
  }
}
