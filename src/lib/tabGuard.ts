/**
 * One active window at a time. Every copy of the app keeps its progress in memory and writes it to
 * localStorage; two open windows (the installed app and a browser tab) would overwrite each other.
 *
 * The newest window takes over: it tells the others, they save what they have and turn read-only
 * (with a «Продолжить здесь» button), then the new one reloads the freshest data.
 */

type Msg = { type: 'claim' | 'released'; id: string };

const CHANNEL = 'musical-garden:tabs';
const id = Math.random().toString(36).slice(2);
let writable = true;
let channel: BroadcastChannel | null = null;
const flushers = new Set<() => void>();
const reloaders = new Set<() => void>();
const listeners = new Set<() => void>();

/** May this window write to storage? */
export const canWrite = () => writable;

export const tabGuard = {
  get: () => writable,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  /** Save pending data right now (before another window takes over). */
  onFlush(f: () => void) {
    flushers.add(f);
    return () => {
      flushers.delete(f);
    };
  },
  /** Re-read data from storage (after another window has saved). */
  onReload(f: () => void) {
    reloaders.add(f);
    return () => {
      reloaders.delete(f);
    };
  },
};

function release() {
  flushers.forEach((f) => {
    try {
      f();
    } catch {
      /* keep going */
    }
  });
  writable = false;
  listeners.forEach((l) => l());
  channel?.postMessage({ type: 'released', id } satisfies Msg);
}

/** Call once at startup: claim the active role. */
export function initTabGuard() {
  if (typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (e: MessageEvent<Msg>) => {
    const m = e.data;
    if (!m || m.id === id) return;
    if (m.type === 'claim' && writable) release();
    else if (m.type === 'released' && writable) reloaders.forEach((r) => r());
  };
  channel.postMessage({ type: 'claim', id } satisfies Msg);
}

/** «Продолжить здесь»: the simplest correct takeover is a fresh start of this window. */
export function takeOver() {
  window.location.reload();
}
