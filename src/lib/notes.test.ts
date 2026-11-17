import { describe, expect, it } from 'vitest';
import {
  MIDI_MAX,
  MIDI_MIN,
  candidateMidis,
  codeToMidi,
  isBlack,
  midiToCode,
  midiToNote,
  pickTarget,
  rangeToMidiBounds,
} from './notes';
import { KEYBOARD_LAYOUT, buildKeyboardLayout, keyboardRows } from './keyboardLayout';

/** Deterministic PRNG for repeatable sampling. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('codeToMidi', () => {
  it('handles reference notes', () => {
    expect(codeToMidi('C4')).toBe(60);
    expect(codeToMidi('A4')).toBe(69);
    expect(codeToMidi('A0')).toBe(MIDI_MIN);
    expect(codeToMidi('C8')).toBe(MIDI_MAX);
  });

  it('maps enharmonic spellings to the same key', () => {
    expect(codeToMidi('C♯4')).toBe(61);
    expect(codeToMidi('D♭4')).toBe(61);
    expect(codeToMidi('A♯2')).toBe(codeToMidi('B♭2'));
    expect(codeToMidi('F♯5')).toBe(codeToMidi('G♭5'));
  });

  it('places B♭3 at 58 (octave follows the key itself)', () => {
    expect(codeToMidi('B♭3')).toBe(58);
    expect(codeToMidi('A♯3')).toBe(58);
  });

  it('accepts ASCII # and b', () => {
    expect(codeToMidi('C#4')).toBe(61);
    expect(codeToMidi('Db4')).toBe(61);
    expect(codeToMidi('bb3')).toBe(58);
  });

  it('applies the Yamaha offset (middle C = C3)', () => {
    expect(codeToMidi('C3', -1)).toBe(60);
    expect(codeToMidi('A-1', -1)).toBe(21);
  });

  it('rejects garbage', () => {
    expect(codeToMidi('H4')).toBeNull();
    expect(codeToMidi('C')).toBeNull();
    expect(codeToMidi('')).toBeNull();
  });
});

describe('midiToNote / midiToCode', () => {
  it('formats with Unicode accidentals', () => {
    expect(midiToCode(60)).toBe('C4');
    expect(midiToCode(61, 'sharp')).toBe('C♯4');
    expect(midiToCode(61, 'flat')).toBe('D♭4');
    expect(midiToCode(58, 'flat')).toBe('B♭3');
    expect(midiToCode(21)).toBe('A0');
    expect(midiToCode(108)).toBe('C8');
  });

  it('never produces exotic enharmonics', () => {
    for (let m = MIDI_MIN; m <= MIDI_MAX; m++) {
      for (const sp of ['sharp', 'flat'] as const) {
        const code = midiToCode(m, sp);
        expect(code).not.toMatch(/^(E♯|B♯|F♭|C♭)/);
      }
    }
  });

  it('round-trips every key in both spellings', () => {
    for (let m = MIDI_MIN; m <= MIDI_MAX; m++) {
      expect(codeToMidi(midiToCode(m, 'sharp'))).toBe(m);
      expect(codeToMidi(midiToCode(m, 'flat'))).toBe(m);
      expect(codeToMidi(midiToCode(m, 'flat', -1), -1)).toBe(m);
    }
  });

  it('shifts octave with offset', () => {
    expect(midiToNote(60, 'sharp', -1).octave).toBe(3);
  });
});

describe('isBlack', () => {
  it('classifies keys', () => {
    expect(isBlack(60)).toBe(false);
    expect(isBlack(61)).toBe(true);
    expect(isBlack(58)).toBe(true);
    expect(isBlack(21)).toBe(false);
    expect(isBlack(22)).toBe(true);
    expect(isBlack(108)).toBe(false);
  });
});

describe('ranges and targets', () => {
  it('clips octave bounds to A0–C8', () => {
    expect(rangeToMidiBounds({ from: 0, to: 0 })).toEqual([21, 23]);
    expect(rangeToMidiBounds({ from: 8, to: 8 })).toEqual([108, 108]);
    expect(rangeToMidiBounds({ from: 3, to: 5 })).toEqual([48, 83]);
    expect(rangeToMidiBounds({ from: 5, to: 3 })).toEqual([48, 83]);
  });

  it('naturals mode yields only white keys', () => {
    const list = candidateMidis({ from: 3, to: 5 }, 'naturals');
    expect(list).toHaveLength(21);
    expect(list.every((m) => !isBlack(m))).toBe(true);
  });

  it('accidentals mode yields all 12 per octave', () => {
    expect(candidateMidis({ from: 4, to: 4 }, 'accidentals')).toHaveLength(12);
  });

  it('respects the range, never repeats, and uses both spellings', () => {
    const rng = seeded(42);
    let prev: number | null = null;
    const spellings = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const t = pickTarget({ from: 2, to: 4 }, 'accidentals', prev, rng);
      expect(t.midi).toBeGreaterThanOrEqual(36);
      expect(t.midi).toBeLessThanOrEqual(71);
      expect(t.midi).not.toBe(prev);
      if (isBlack(t.midi)) {
        expect(t.spelling).not.toBeNull();
        spellings.add(t.spelling!);
      } else {
        expect(t.spelling).toBeNull();
      }
      prev = t.midi;
    }
    expect(spellings).toEqual(new Set(['sharp', 'flat']));
  });

  it('naturals targets are always white', () => {
    const rng = seeded(7);
    for (let i = 0; i < 500; i++) {
      expect(isBlack(pickTarget({ from: 0, to: 8 }, 'naturals', null, rng).midi)).toBe(false);
    }
  });

  it('allows a repeat only when there is a single candidate', () => {
    expect(pickTarget({ from: 8, to: 8 }, 'naturals', 108).midi).toBe(108);
  });
});

describe('keyboard layout', () => {
  it('has 88 keys: 52 white and 36 black', () => {
    expect(KEYBOARD_LAYOUT).toHaveLength(88);
    expect(KEYBOARD_LAYOUT.filter((k) => !k.black)).toHaveLength(52);
    expect(KEYBOARD_LAYOUT.filter((k) => k.black)).toHaveLength(36);
  });

  it('fills exactly 100% width and keeps black keys inside', () => {
    const last = KEYBOARD_LAYOUT[KEYBOARD_LAYOUT.length - 1];
    expect(last.left + last.width).toBeCloseTo(100, 6);
    for (const k of KEYBOARD_LAYOUT) {
      expect(k.left).toBeGreaterThanOrEqual(0);
      expect(k.left + k.width).toBeLessThanOrEqual(100);
    }
  });

  it('range layout shows only the training octaves', () => {
    const [row] = keyboardRows({ from: 3, to: 5 }, 'range');
    expect(row).toMatchObject({ lo: 48, hi: 83, slots: 21, offset: 0 });
    const keys = buildKeyboardLayout(row);
    expect(keys).toHaveLength(36);
    expect(keys[keys.length - 1].left + keys[keys.length - 1].width).toBeCloseTo(100, 6);
  });

  it('stacked layout: one octave per row up to 3 octaves, then two', () => {
    expect(keyboardRows({ from: 3, to: 5 }, 'stacked').map((r) => [r.lo, r.hi, r.slots])).toEqual([
      [48, 59, 7],
      [60, 71, 7],
      [72, 83, 7],
    ]);
    const wide = keyboardRows({ from: 0, to: 8 }, 'stacked');
    expect(wide).toHaveLength(5);
    expect(wide[0]).toMatchObject({ lo: 21, offset: 5, slots: 14 }); // A0 sits where A belongs in the octave
    expect(wide[4]).toMatchObject({ lo: 108, hi: 108 });
  });

  it('full layout is the whole piano', () => {
    expect(keyboardRows({ from: 3, to: 5 }, 'full')).toEqual([{ lo: 21, hi: 108, slots: 52, offset: 0 }]);
  });
});
