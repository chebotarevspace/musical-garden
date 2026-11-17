/**
 * Turns a pasted chord sheet into a song.
 *
 * Supported input:
 *  - "chords over lyrics" (as on most chord websites): a line of chords above a line of words;
 *  - inline ChordPro: "[C]Oh, when the [G7]saints".
 * Section labels ("Куплет 1:", "[Chorus]") are skipped. Rare chords are simplified (Cmaj9 → Cmaj7)
 * with a warning. Russian-style names (H = B, B = B♭) are recognised.
 */
import { type Chord, type QualityId, chordPcs } from './chords';
import { parseChord } from './chordSymbols';
import { diatonicChords } from './circle';
import { MAJOR_KEYS, MINOR_KEYS } from './progressions';
import type { SongBar } from './songs';

const SUFFIXES: [RegExp, string, string?][] = [
  [/^(maj|M|Δ|ma)$/, ''],
  [/^(maj7|M7|Δ7|ma7|7M|j7)$/, 'maj7'],
  [/^(maj9|M9|Δ9|maj11|maj13)$/, 'maj7', 'упрощён до maj7'],
  [/^(m|min|mi|-)$/, 'm'],
  [/^(m7|min7|mi7|-7)$/, 'm7'],
  [/^(m9|m11|min9|-9)$/, 'm7', 'упрощён до m7'],
  [/^(m6|min6)$/, 'm6'],
  [/^(m7b5|m7♭5|ø|ø7|m7\(b5\)|m7-5|-7b5)$/, 'm7b5'],
  [/^(dim|o|°)$/, 'dim'],
  [/^(dim7|o7|°7)$/, 'dim7'],
  [/^(aug|\+|\+5|#5)$/, 'aug'],
  [/^(7|dom7)$/, '7'],
  [/^(9|11|13|7b9|7#9|7b5|7#5|7\+|9sus4)$/, '7', 'упрощён до 7'],
  [/^(sus|sus4)$/, 'sus4'],
  [/^(7sus4|7sus)$/, 'sus4', 'упрощён до sus4'],
  [/^(sus2|2)$/, 'sus2'],
  [/^(add9|add2|\(add9\))$/, 'add9'],
  [/^(6|6\/9|69)$/, '6'],
  [/^(5)$/, '', 'квинтаккорд сыгран как мажор'],
  [/^$/, ''],
];

export interface ParsedToken {
  symbol: string;
  warning?: string;
}

/** Normalises one chord token; returns null when it is not a chord. */
export function normalizeChord(raw: string, russianB = false): ParsedToken | null {
  const token = raw.replace(/[()*,.]+$/g, '').replace(/♯/g, '#').replace(/♭/g, 'b');
  const m = /^([A-H])([#b]?)([^/]*)(?:\/([A-H][#b]?))?$/.exec(token);
  if (!m) return null;
  const fix = (letter: string, acc: string) => {
    if (russianB && letter === 'H') return { l: 'B', a: acc };
    if (russianB && letter === 'B' && acc === '') return { l: 'B', a: 'b' };
    if (letter === 'H') return { l: 'B', a: acc };
    return { l: letter, a: acc };
  };
  const root = fix(m[1], m[2]);
  const rule = SUFFIXES.find(([re]) => re.test(m[3]));
  if (!rule) return null;
  let symbol = `${root.l}${root.a}${rule[1]}`;
  if (m[4]) {
    const b = fix(m[4][0], m[4].slice(1));
    symbol += `/${b.l}${b.a}`;
  }
  try {
    parseChord(symbol);
  } catch {
    try {
      parseChord(symbol.split('/')[0]);
      symbol = symbol.split('/')[0];
    } catch {
      return null;
    }
  }
  return { symbol, warning: rule[2] ? `${raw} ${rule[2]}` : undefined };
}

const NOISE = /^(\||\|\||-+|\/|%|x\d+|\(x\d+\)|\d+x|:)$/i;

function chordTokens(line: string, russianB: boolean): { col: number; token: ParsedToken }[] | null {
  const out: { col: number; token: ParsedToken }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (NOISE.test(m[0])) continue;
    const t = normalizeChord(m[0], russianB);
    if (!t) return null;
    out.push({ col: m.index, token: t });
  }
  return out.length ? out : null;
}

const isLabel = (line: string) => /^\s*(\[[^\]]*\]|[^\s[][^:]{0,24}:)\s*$/.test(line) && !/\[[A-H]/.test(line.replace(/^\s*\[/, '[X'));

export interface ImportResult {
  bars: SongBar[];
  /** Bars grouped into display lines (one per source line). */
  lines: SongBar[][];
  warnings: string[];
  chords: Chord[];
  keyId: string;
}

export function parseChordSheet(text: string, opts: { chordsPerBar?: 1 | 2 } = {}): ImportResult {
  const per = opts.chordsPerBar ?? 1;
  const raw = text.replace(/\r/g, '').replace(/\t/g, '    ').split('\n');
  // Russian sheets write H for B and B for B♭.
  const russianB = raw.some((l) => /(^|\s)H(m|7|\s|$)/.test(l));
  const warnings = new Set<string>();
  const lines: { chord: string; text: string }[][] = [];

  const pushLine = (items: { chord: string; text: string }[]) => {
    if (items.length) lines.push(items);
  };

  for (let i = 0; i < raw.length; i++) {
    const line = raw[i];
    if (!line.trim() || isLabel(line)) continue;

    // Inline ChordPro.
    if (/\[[A-H][^\]]*\]/.test(line)) {
      const parts = line.split(/\[([^\]]+)\]/);
      const items: { chord: string; text: string }[] = [];
      let lead = parts[0];
      for (let j = 1; j < parts.length; j += 2) {
        const t = normalizeChord(parts[j].trim(), russianB);
        if (!t) {
          lead += parts[j + 1] ?? '';
          continue;
        }
        if (t.warning) warnings.add(t.warning);
        items.push({ chord: t.symbol, text: (items.length === 0 ? lead : '') + (parts[j + 1] ?? '') });
      }
      pushLine(items.map((x) => ({ ...x, text: x.text.trim() })));
      continue;
    }

    const tokens = chordTokens(line, russianB);
    if (tokens) {
      tokens.forEach((t) => t.token.warning && warnings.add(t.token.warning));
      const next = raw[i + 1];
      const lyric = next !== undefined && next.trim() && !chordTokens(next, russianB) && !isLabel(next) && !/\[[A-H]/.test(next) ? next : null;
      if (lyric !== null) i++;
      // A chord usually sits over a syllable; cut the words at the start of that word for readability.
      const wordStart = (col: number) => {
        if (!lyric) return col;
        let c = Math.min(col, lyric.length);
        while (c > 0 && lyric[c - 1] !== ' ') c--;
        return c;
      };
      const items = tokens.map((t, k) => {
        const from = k === 0 ? 0 : wordStart(t.col);
        const to = k + 1 < tokens.length ? wordStart(tokens[k + 1].col) : undefined;
        return { chord: t.token.symbol, text: lyric ? lyric.slice(from, to).trim() : '' };
      });
      pushLine(items);
      continue;
    }

    // Words without chords above: keep them with the last chord.
    const last = lines[lines.length - 1]?.slice(-1)[0];
    if (last) pushLine([{ chord: last.chord, text: line.trim() }]);
  }

  // Group chords into bars.
  const barLines: SongBar[][] = lines.map((items) => {
    const bars: SongBar[] = [];
    for (let k = 0; k < items.length; k += per) {
      const group = items.slice(k, k + per);
      bars.push({ chords: group.map((g) => g.chord), text: group.map((g) => g.text).filter(Boolean).join(' ') });
    }
    return bars;
  });
  const bars = barLines.flat();
  const chords = bars.flatMap((b) => b.chords.map((c) => parseChord(c)));
  return { bars, lines: barLines, warnings: [...warnings], chords, keyId: detectKey(chords) };
}

const FAMILY: Record<QualityId, 'maj' | 'min' | 'dim'> = {
  maj: 'maj', dom7: 'maj', maj7: 'maj', six: 'maj', sus2: 'maj', sus4: 'maj', add9: 'maj', aug: 'maj',
  min: 'min', min7: 'min', m6: 'min', dim: 'dim', m7b5: 'dim', dim7: 'dim',
};

/** Picks the key whose diatonic chords explain the song best (first/last chord as the tonic breaks ties). */
export function detectKey(chords: Chord[]): string {
  if (!chords.length) return 'C';
  const sig = (c: Chord) => `${chordPcs(c)[0]}:${FAMILY[c.quality]}`;
  const first = sig(chords[0]);
  const last = sig(chords[chords.length - 1]);
  let best = { id: 'C', score: -1 };
  MAJOR_KEYS.forEach((k, idx) => {
    const set = diatonicChords(k).map(sig);
    let score = chords.reduce((a, c) => a + (set.includes(sig(c)) ? 1 : 0), 0) / chords.length;
    if (first === set[0] || last === set[0]) score += 0.3;
    if (first === set[5] || last === set[5]) score += 0.25;
    if (score > best.score) best = { id: k.id, score };
    // Relative minor wins when the song starts or ends on the vi chord rather than I.
    const minorTonic = set[5];
    if ((first === minorTonic || last === minorTonic) && first !== set[0] && last !== set[0] && score >= best.score) {
      best = { id: MINOR_KEYS[idx].id, score: score + 0.01 };
    }
  });
  return best.id;
}
