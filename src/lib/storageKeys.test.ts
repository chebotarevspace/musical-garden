import { describe, expect, it } from 'vitest';
import { KEYS, renameOldKeys } from './storageKeys';

class Mem implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

describe('storage keys', () => {
  it('old names move to the new ones once, without overwriting newer data', () => {
    const s = new Mem();
    s.setItem('notny-sad:progress:v1', 'old-progress');
    s.setItem('najdi-notu:settings:v1', 'old-settings');
    s.setItem(KEYS.songs, 'new-songs');
    s.setItem('notny-sad:songs:v1', 'old-songs');
    s.setItem('najdi-notu:stats:v1', 'ancient');
    renameOldKeys(s);
    expect(s.getItem(KEYS.progress)).toBe('old-progress');
    expect(s.getItem(KEYS.settings)).toBe('old-settings');
    expect(s.getItem(KEYS.songs)).toBe('new-songs');
    for (let i = 0; i < s.length; i++) expect(s.key(i)).toMatch(/^musical-garden:/);
  });
});
