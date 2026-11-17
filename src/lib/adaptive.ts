/**
 * Adaptive practice: items you miss more often come up more often.
 *
 * Pure pickers (notes, chords, ear) ask `itemWeight(key)`; the app plugs in a weight source
 * from the progress store when adaptive practice is on. With no source, everything weighs 1
 * and picking is exactly uniform (same index for the same rng value).
 */
export interface ItemCounts {
  seen: number;
  misses: number;
}

/** 1 for unknown / easy items, up to 4 for items missed most of the time. */
export function missWeight(it: ItemCounts | undefined): number {
  if (!it) return 1;
  const total = it.seen + it.misses;
  if (total === 0) return 1;
  const rate = it.misses / total;
  const confidence = Math.min(1, total / 5);
  return 1 + 3 * rate * confidence;
}

let source: ((key: string) => number) | null = null;

export function setItemWeights(fn: ((key: string) => number) | null) {
  source = fn;
}

export const itemWeight = (key: string): number => (source ? source(key) : 1);

/** Weighted index; equal weights give floor(rng · n), like a plain uniform pick. */
export function weightedIndex(weights: number[], r: number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return Math.min(weights.length - 1, Math.floor(r * weights.length));
  let x = r * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return i;
  }
  return weights.length - 1;
}

export function weightedPick<T>(list: T[], keyOf: (x: T) => string | string[], rng: () => number): T {
  if (!source || list.length < 2) return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  const w = list.map((x) => {
    const k = keyOf(x);
    return Array.isArray(k) ? Math.max(...k.map(itemWeight)) : itemWeight(k);
  });
  return list[weightedIndex(w, rng())];
}
