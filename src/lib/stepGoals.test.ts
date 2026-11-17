import { describe, expect, it } from 'vitest';
import { SESSIONS } from './course';
import { emptyProgress } from './progress';
import { goalBase, goalFor, goalProgress } from './stepGoals';

describe('step goals', () => {
  it('every step of the course has a task', () => {
    for (const s of SESSIONS) for (const st of s.steps) expect([s.id, st.title, !!goalFor(st)]).toEqual([s.id, st.title, true]);
  });

  it('counts from the start of the step', () => {
    const step = SESSIONS[0].steps.find((x) => x.section === 'notes')!;
    const goal = goalFor(step)!;
    const p0 = { ...emptyProgress(), counters: { 'ok:note': 40 } };
    const base = goalBase(goal, p0);
    expect(goalProgress(goal, p0, base)).toMatchObject({ value: 0, done: false, text: '0/15' });
    const p1 = { ...p0, counters: { 'ok:note': 55 } };
    expect(goalProgress(goal, p1, base)).toMatchObject({ value: 15, done: true });
  });

  it('lessons are done when marked, minutes are shown as minutes', () => {
    const lesson = goalFor(SESSIONS[0].steps[0])!;
    expect(goalProgress(lesson, { ...emptyProgress(), lessonsDone: ['keyboard'] }, 0).done).toBe(true);
    const jam = goalFor({ ...SESSIONS[6].steps[5], patch: { jamMode: 'free' } })!;
    expect(goalProgress(jam, { ...emptyProgress(), counters: { 'ms:jam': 150_000 } }, 0).text).toBe('2/4 мин');
  });
});
