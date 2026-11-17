import { describe, expect, it } from 'vitest';
import { hashList, serviceWorkerSource } from '../../sw.config';

describe('service worker', () => {
  it('generates valid JavaScript with the file list', () => {
    const src = serviceWorkerSource('abc123', ['/', '/assets/a.js']);
    expect(() => new Function(src)).not.toThrow();
    expect(src).toContain('"/assets/a.js"');
    expect(src).toContain("const VERSION = 'abc123'");
  });

  it('versions change with the build', () => {
    expect(hashList(['/a.js'])).not.toBe(hashList(['/b.js']));
    expect(hashList(['/a.js'])).toBe(hashList(['/a.js']));
  });
});
