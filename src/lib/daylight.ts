/** Light in the garden follows the clock on your computer: morning, day, evening, night. */
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export function dayPhase(hour: number): DayPhase {
  if (hour >= 21 || hour < 5) return 'night';
  if (hour < 8) return 'dawn';
  if (hour < 18) return 'day';
  return 'dusk';
}

export const PHASE_NAME: Record<DayPhase, string> = { dawn: 'утро', day: 'день', dusk: 'вечер', night: 'ночь' };
