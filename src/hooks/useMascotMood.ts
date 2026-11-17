import { useCallback, useEffect, useRef, useState } from 'react';
import type { MascotMood } from '../components/Mascot';

export type ReactionMood = 'happy' | 'oops' | 'celebrate' | 'thinking';

const SLEEP_AFTER_MS = 30_000;

/** How long each reaction face is held before returning to idle/sleepy. */
const HOLD_MS: Record<ReactionMood, number> = {
  happy: 650,
  oops: 650,
  celebrate: 1200,
  thinking: 1000,
};

/** Mascot mood shared by all sections: reactions + falling asleep when nothing happens. */
export function useMascotMood(midiConnected: boolean) {
  const [reaction, setReaction] = useState<{ mood: ReactionMood; id: number; streak: number } | null>(null);
  const seq = useRef(0);
  const timer = useRef<number>();
  const lastActive = useRef(performance.now());
  const [hasPressed, setHasPressed] = useState(false);
  const [idleTooLong, setIdleTooLong] = useState(false);

  const markActive = useCallback(() => {
    lastActive.current = performance.now();
    setIdleTooLong(false);
    setHasPressed(true);
  }, []);

  const react = useCallback(
    (mood: ReactionMood, streak = 0) => {
      markActive();
      const id = ++seq.current;
      setReaction({ mood, id, streak });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setReaction(null), HOLD_MS[mood]);
    },
    [markActive],
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      if (performance.now() - lastActive.current > SLEEP_AFTER_MS) setIdleTooLong(true);
    }, 1000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    lastActive.current = performance.now();
    setIdleTooLong(false);
  }, [midiConnected]);

  const sleepy = idleTooLong || (!midiConnected && !hasPressed);
  const mood: MascotMood = reaction?.mood ?? (sleepy ? 'sleepy' : 'idle');
  const moodId = reaction?.id ?? (sleepy ? -1 : 0);

  return { mood, moodId, streak: reaction?.streak ?? 0, react, markActive };
}

export type MascotApi = Pick<ReturnType<typeof useMascotMood>, 'react' | 'markActive'>;
