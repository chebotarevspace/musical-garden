import { KEYS } from './storageKeys';
/**
 * Keeping the progress safe: ask the browser not to evict our storage, and remind about a backup file.
 */
const BACKUP_KEY = KEYS.backup;
const WEEK = 7 * 86_400_000;

let persisted: boolean | null = null;
const listeners = new Set<() => void>();

export const storageGuard = {
  /** true — the browser promised to keep the data; false — it may clear it; null — unknown. */
  get: () => persisted,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

/** Ask for persistent storage (Chrome grants it to installed / engaged sites, Firefox may ask). */
export async function requestPersistence(): Promise<boolean | null> {
  try {
    const s = navigator.storage;
    if (!s?.persist) return null;
    persisted = (await s.persisted()) || (await s.persist());
  } catch {
    persisted = null;
  }
  listeners.forEach((l) => l());
  return persisted;
}

interface BackupInfo {
  last: number;
  snoozeUntil: number;
}

function read(): BackupInfo {
  try {
    const v = JSON.parse(localStorage.getItem(BACKUP_KEY) ?? '{}');
    return { last: Number(v.last) || 0, snoozeUntil: Number(v.snoozeUntil) || 0 };
  } catch {
    return { last: 0, snoozeUntil: 0 };
  }
}

function write(v: BackupInfo) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

export const lastBackup = () => read().last;

/** A backup file was just saved. */
export function markBackup(now = Date.now()) {
  write({ last: now, snoozeUntil: 0 });
}

/** «Позже»: ask again in a few days. */
export function snoozeBackup(days = 3, now = Date.now()) {
  write({ ...read(), snoozeUntil: now + days * 86_400_000 });
}

/** Time to remind: you've practised on a couple of days and the last backup is over a week old. */
export function backupDue(practiceDays: number, now = Date.now(), info: BackupInfo = read()): boolean {
  if (practiceDays < 2) return false;
  if (now < info.snoozeUntil) return false;
  return now - info.last > WEEK;
}
