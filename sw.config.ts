/**
 * Source of the service worker (/sw.js), filled in at build time by the Vite plugin.
 * Kept as a string so the build needs no Node APIs.
 */
export function serviceWorkerSource(version: string, precache: string[]): string {
  return `/* Музыкальный сад — service worker: the whole app works offline after the first visit. */
const VERSION = '${version}';
const PRECACHE = ${JSON.stringify(precache)};
const APP = \`musical-garden-app-\${VERSION}\`;
const FONTS = 'musical-garden-fonts-v1';
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Noto+Music&display=swap';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP);
      await cache.addAll(PRECACHE);
      // Fonts too, so the staff glyphs and the type look right offline.
      try {
        const fonts = await caches.open(FONTS);
        if (!(await fonts.match(FONT_CSS))) {
          const res = await fetch(FONT_CSS, { mode: 'cors' });
          if (res.ok) {
            const css = await res.clone().text();
            await fonts.put(FONT_CSS, res);
            const urls = [...css.matchAll(/url\\((https:\\/\\/fonts\\.gstatic\\.com[^)]+)\\)/g)].map((m) => m[1]);
            await Promise.all(urls.map((u) => fetch(u, { mode: 'cors' }).then((r) => r.ok && fonts.put(u, r)).catch(() => {})));
          }
        }
      } catch {
        /* offline during install: fonts come later */
      }
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Older versions of the app (and its caches under earlier names) go away.
      for (const key of await caches.keys()) if (key !== APP && key !== FONTS) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// The page asks to switch to a new version right away.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Pages: the network first (fresh deploys), the cached app when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(APP);
        const cached = async () => (await cache.match('/index.html', { ignoreVary: true })) ?? (await cache.match('/', { ignoreVary: true })) ?? Response.error();
        // A slow network shouldn't keep the app from opening: after 3 s, open the cached one.
        const net = fetch(req).then((res) => {
          if (res.ok) cache.put('/index.html', res.clone());
          return res;
        });
        const slow = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
        try {
          const first = await Promise.race([net, slow]);
          if (first) return first;
          const hit = await cache.match('/index.html', { ignoreVary: true });
          return hit ?? (await net);
        } catch {
          return cached();
        }
      })(),
    );
    return;
  }

  // Google Fonts: from the cache, refreshed in the background.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(FONTS);
        const hit = await cache.match(req, { ignoreVary: true });
        const net = fetch(req)
          .then((res) => {
            if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit ?? net;
      })(),
    );
    return;
  }

  // Our own files: hashed assets never change — the cache first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(APP);
        const hit = await cache.match(req, { ignoreVary: true, ignoreSearch: url.pathname === '/' });
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok && url.pathname.startsWith('/assets/')) cache.put(req, res.clone());
          return res;
        } catch {
          return Response.error();
        }
      })(),
    );
  }
});
`;
}

/** A short stable hash (FNV-1a) of the build's file list: the cache version. */
export function hashList(list: string[]): string {
  let h = 0x811c9dc5;
  for (const ch of list.join('\n')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
