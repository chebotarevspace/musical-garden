/**
 * Install as an app and work offline: the service worker, the install prompt, updates, online state.
 * A tiny store for React (useSyncExternalStore).
 */

import { KEYS } from './storageKeys';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  /** The browser offers installation (Chrome, Edge). */
  canInstall: boolean;
  /** Running as an installed app. */
  standalone: boolean;
  /** A new version is downloaded and waits to be switched on. */
  updateReady: boolean;
  /** The app was just cached for offline use for the first time. */
  offlineReady: boolean;
  online: boolean;
  /** Service workers work here (https or localhost, a modern browser). */
  supported: boolean;
}

let state: PwaState = {
  canInstall: false,
  standalone: false,
  updateReady: false,
  offlineReady: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
};
const listeners = new Set<() => void>();
const set = (patch: Partial<PwaState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const pwa = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

let deferred: InstallPromptEvent | null = null;
let waiting: ServiceWorker | null = null;
const OFFLINE_FLAG = KEYS.offlineReady;

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: window-controls-overlay)').matches || (navigator as { standalone?: boolean }).standalone === true;

/** Call once at startup. Registers the service worker only in production builds. */
export function initPwa() {
  set({ standalone: isStandalone() });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    set({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    set({ canInstall: false, standalone: true });
  });
  window.addEventListener('online', () => set({ online: true }));
  window.addEventListener('offline', () => set({ online: false }));

  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const track = (w: ServiceWorker | null) => {
        if (!w) return;
        w.addEventListener('statechange', () => {
          if (w.state !== 'installed') return;
          if (navigator.serviceWorker.controller) {
            // An older version runs this page: offer the new one.
            waiting = w;
            set({ updateReady: true });
          } else markOfflineReady();
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) {
        waiting = reg.waiting;
        set({ updateReady: true });
      }
      track(reg.installing);
      reg.addEventListener('updatefound', () => track(reg.installing));
      // Long sessions: look for a new version every hour.
      window.setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    } catch {
      /* no offline mode — the app still works online */
    }
  });
}

function markOfflineReady() {
  try {
    if (localStorage.getItem(OFFLINE_FLAG)) return;
    localStorage.setItem(OFFLINE_FLAG, '1');
  } catch {
    /* private mode */
  }
  set({ offlineReady: true });
}

export function dismissOfflineReady() {
  set({ offlineReady: false });
}

/** Show the browser's install dialog. */
export async function installApp(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  set({ canInstall: false });
  return outcome === 'accepted';
}

/** Switch to the downloaded version: the page reloads once the new worker takes over. */
export function applyUpdate() {
  if (!waiting) return window.location.reload();
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  waiting.postMessage('skip-waiting');
}
