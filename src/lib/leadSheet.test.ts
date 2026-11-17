import { describe, expect, it } from 'vitest';
import { parseChord } from './chordSymbols';
import { chordHeld, leadSteps, leftVoicing, requiredPcs, splitPoint } from './leadSheet';
import { SONGS, barDurations, planSong } from './songs';

describe('lead sheet', () => {
  it('splits bars evenly when no rhythm is given', () => {
    expect(barDurations(3, 4)).toEqual([1, 1, 2]);
    expect(barDurations(2, 3)).toEqual([1, 2]);
    expect(barDurations(1, 4)).toEqual([4]);
    expect(barDurations(3, 4, '1.5 0.5 2')).toEqual([1.5, 0.5, 2]);
  });

  it('builds steps from melody notes and chord changes', () => {
    const song = SONGS.find((s) => s.id === 'twinkle')!;
    const plan = planSong(song, 'C');
    const steps = leadSteps(plan);
    expect(steps[0]).toMatchObject({ beat: 0, note: 0, slot: 0 });
    // Bar 2 "F C: little star": F at beat 4, C at beat 6 together with the G of "star".
    const at6 = steps.find((s) => s.beat === 6)!;
    expect(at6.note).toBeGreaterThan(0);
    expect(at6.slot).toBeGreaterThan(0);
    expect(plan.melody.every((n) => n.midi >= splitPoint(plan.melody))).toBe(true);
  });

  it('checks the left hand', () => {
    const c7 = parseChord('C7');
    expect(requiredPcs(c7, 'chord')).toEqual([0, 4, 10]);
    expect(chordHeld([48, 52, 58], c7, 'chord')).toBe(true);
    expect(chordHeld([48, 52], c7, 'chord')).toBe(false);
    expect(chordHeld([36], c7, 'root')).toBe(true);
    expect(leftVoicing([60, 64, 67], 60, 'chord')).toEqual([48, 52, 55]);
    expect(leftVoicing([60, 64, 67], 60, 'root')).toEqual([48]);
  });

  it('every song melody fills its bars', () => {
    for (const s of SONGS.filter((x) => x.melody && x.rhythm)) {
      s.rhythm!.forEach((r, b) => {
        const sum = r.split(/\s+/).filter(Boolean).map(Number).reduce((a, x) => a + x, 0);
        if (s.melody![b].trim()) expect([s.id, b, sum]).toEqual([s.id, b, s.meter]);
        expect(r.split(/\s+/).filter(Boolean).length).toBe(s.melody![b].split(/\s+/).filter(Boolean).length);
      });
    }
  });
});
