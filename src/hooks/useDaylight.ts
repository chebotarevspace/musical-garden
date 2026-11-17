import { useCallback, useEffect, useState } from 'react';
import { type DayPhase, dayPhase } from '../lib/daylight';
import { progress } from '../lib/progress';

/** The hour on this computer (re-checked every minute) and the light it gives. */
export function useDaylight(): { hour: number; phase: DayPhase } {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const t = window.setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return { hour, phase: dayPhase(hour) };
}

/** Shooting stars at night: one now and then; a click makes a wish. */
export function useShootingStars(night: boolean, say: (text: string, ms?: number) => void) {
  const [star, setStar] = useState<number | null>(null);
  useEffect(() => {
    if (!night) {
      setStar(null);
      return;
    }
    let t = 0;
    let id = 0;
    const next = () => {
      t = window.setTimeout(() => {
        const k = ++id;
        setStar(k);
        window.setTimeout(() => setStar((cur) => (cur === k ? null : cur)), 2300);
        next();
      }, 12_000 + Math.random() * 25_000);
    };
    next();
    return () => window.clearTimeout(t);
  }, [night]);
  const onStar = useCallback(() => {
    progress.count('wish');
    setStar(null);
    say('Падающая звезда! Загадайте музыкальное желание — и сыграйте его завтра. ✨', 5000);
  }, [say]);
  return { star, onStar };
}
