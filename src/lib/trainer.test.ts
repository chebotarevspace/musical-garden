import { describe, expect, it } from 'vitest';
import { isBlack } from './notes';
import {
  applyHint,
  applyMode,
  applyPress,
  applyRange,
  applyRelease,
  applyResetStats,
  applySkip,
  createTrainerState,
  emptyStatsByMode,
} from './trainer';

/** Correct press followed by release of the same key. */
const hit = (s: ReturnType<typeof fresh>, now: number) => applyRelease(applyPress(s, s.target.midi, now).state, s.target.midi, now);

const fresh = () => createTrainerState('naturals', { from: 3, to: 5 }, emptyStatsByMode(), 0);

describe('trainer', () => {
  it('correct press scores immediately but keeps the target until release', () => {
    const s = fresh();
    const { state, result } = applyPress(s, s.target.midi, 800);
    expect(result).toBe('correct');
    expect(state.stats.naturals).toMatchObject({ correct: 1, streak: 1, best: 1, reactionTotal: 800, reactionCount: 1 });
    expect(state.reaction?.mood).toBe('happy');
    expect(state.solved).toBe(true);
    expect(state.target).toEqual(s.target);
    expect(state.targetId).toBe(s.targetId);

    // other presses while the key is held are ignored
    const other = applyPress(state, s.target.midi === 60 ? 62 : 60, 900);
    expect(other.result).toBe('ignored');
    expect(other.state).toBe(state);

    // releasing a different key changes nothing
    expect(applyRelease(state, s.target.midi + 2, 950)).toBe(state);

    // releasing the found key reveals the next note
    const next = applyRelease(state, s.target.midi, 1000);
    expect(next.solved).toBe(false);
    expect(next.target.midi).not.toBe(s.target.midi);
    expect(next.targetId).toBe(s.targetId + 1);
    expect(next.shownAt).toBe(1000);
  });

  it('release-all (null) also reveals the next note', () => {
    const s = fresh();
    const pressed = applyPress(s, s.target.midi, 10).state;
    expect(applyRelease(pressed, null, 20).solved).toBe(false);
    expect(applyRelease(s, null, 20)).toBe(s);
  });

  it('wrong press keeps the target, resets streak and shakes', () => {
    let s = fresh();
    s = hit(s, 100);
    const wrongKey = s.target.midi === 60 ? 62 : 60;
    const { state, result } = applyPress(s, wrongKey, 200);
    expect(result).toBe('wrong');
    expect(state.target).toEqual(s.target);
    expect(state.stats.naturals).toMatchObject({ wrong: 1, streak: 0, best: 1 });
    expect(state.shakeId).toBe(s.shakeId + 1);
    expect(state.reaction?.mood).toBe('oops');
  });

  it('celebrates on streak 10', () => {
    let s = fresh();
    for (let i = 0; i < 9; i++) s = hit(s, i * 10);
    s = applyPress(s, s.target.midi, 100).state;
    expect(s.stats.naturals.streak).toBe(10);
    expect(s.reaction?.mood).toBe('celebrate');
  });

  it('keeps stats per mode and switches target to the new mode', () => {
    let s = fresh();
    s = hit(s, 10);
    let sawBlack = false;
    for (let i = 0; i < 50; i++) {
      s = applyMode(s, 'accidentals', 0);
      if (isBlack(s.target.midi)) sawBlack = true;
      s = applyMode(s, 'naturals', 0);
      expect(isBlack(s.target.midi)).toBe(false);
    }
    expect(sawBlack).toBe(true);
    expect(s.stats.naturals.correct).toBe(1);
    expect(s.stats.accidentals.correct).toBe(0);
  });

  it('range change limits targets immediately', () => {
    let s = applyRange(fresh(), { from: 6, to: 6 }, 0);
    for (let i = 0; i < 30; i++) {
      expect(s.target.midi).toBeGreaterThanOrEqual(84);
      expect(s.target.midi).toBeLessThanOrEqual(95);
      s = applySkip(s, 0);
    }
  });

  it('hint counts as a miss without changing the target', () => {
    const s = fresh();
    const h = applyHint(s);
    expect(h.target).toEqual(s.target);
    expect(h.stats.naturals.wrong).toBe(1);
    expect(h.reaction?.mood).toBe('thinking');
  });

  it('reset clears only the current mode', () => {
    let s = fresh();
    s = hit(s, 10);
    s = applyMode(s, 'accidentals', 0);
    s = hit(s, 10);
    s = applyResetStats(s);
    expect(s.stats.accidentals.correct).toBe(0);
    expect(s.stats.naturals.correct).toBe(1);
  });
});
