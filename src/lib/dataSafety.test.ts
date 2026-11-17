import { describe, expect, it } from 'vitest';
import { backupDue } from './dataSafety';

const DAY = 86_400_000;

describe('backup reminder', () => {
  it('waits for a couple of practice days and a week without a backup', () => {
    const now = 100 * DAY;
    expect(backupDue(1, now, { last: 0, snoozeUntil: 0 })).toBe(false);
    expect(backupDue(3, now, { last: 0, snoozeUntil: 0 })).toBe(true);
    expect(backupDue(3, now, { last: now - 3 * DAY, snoozeUntil: 0 })).toBe(false);
    expect(backupDue(3, now, { last: now - 8 * DAY, snoozeUntil: 0 })).toBe(true);
    expect(backupDue(3, now, { last: 0, snoozeUntil: now + DAY })).toBe(false);
  });
});
