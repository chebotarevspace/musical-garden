import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { hashList, serviceWorkerSource } from './sw.config';
import { SAMPLE_NAMES, sampleUrl } from './src/lib/pianoSamples';

/**
 * Emits /sw.js with the list of every built file, so the whole app is cached for offline use.
 * The version is a hash of that list: any change in the build is a new version.
 */
function serviceWorker(): Plugin {
  return {
    name: 'musical-garden-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const extra = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/apple-touch-icon.png', ...SAMPLE_NAMES.map(sampleUrl)];
      const list = [...new Set([...extra, ...files.filter((f) => f !== 'index.html').map((f) => `/${f}`)])];
      const source = serviceWorkerSource(hashList(list), list);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  server: { port: 5173, host: 'localhost' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
