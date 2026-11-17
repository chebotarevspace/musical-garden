/**
 * Turns a stream of pitch frames (one every ~20 ms) into note-on / note-off events:
 * a note starts when the same key is heard for a couple of frames, ends when the sound decays,
 * and a struck-again note (a jump in loudness) counts as a new press.
 */
export interface Frame {
  /** Detected key, or null when there is no clear pitch. */
  midi: number | null;
  rms: number;
}

export interface TrackerOptions {
  /** Minimum loudness for a note to start. */
  gate: number;
  /** Frames the same key must persist before it counts. */
  stable: number;
}

export type TrackerEvent = { type: 'on'; midi: number; velocity: number } | { type: 'off'; midi: number };

export function createTracker(opts: TrackerOptions) {
  let current: number | null = null;
  let candidate: number | null = null;
  let candidateFrames = 0;
  let peak = 0;
  let lastRms = 0;

  return {
    get current() {
      return current;
    },
    setGate(g: number) {
      opts.gate = g;
    },
    /** Feed one frame; returns the events it caused. */
    push(f: Frame): TrackerEvent[] {
      const out: TrackerEvent[] = [];
      const loud = f.rms >= opts.gate;
      const heard = loud ? f.midi : null;

      if (heard !== null && heard === candidate) candidateFrames++;
      else {
        candidate = heard;
        candidateFrames = heard !== null ? 1 : 0;
      }

      const velocity = (r: number) => Math.max(30, Math.min(127, Math.round(40 + (r / Math.max(opts.gate, 1e-4)) * 12)));

      if (current === null) {
        if (candidate !== null && candidateFrames >= opts.stable) {
          current = candidate;
          peak = f.rms;
          out.push({ type: 'on', midi: current, velocity: velocity(f.rms) });
        }
      } else {
        const decayed = f.rms < Math.max(opts.gate * 0.6, peak * 0.06);
        const reattack = f.rms > lastRms * 1.8 && f.rms > peak * 0.45 && lastRms > 0;
        if (decayed) {
          out.push({ type: 'off', midi: current });
          current = null;
        } else if (candidate !== null && candidate !== current && candidateFrames >= opts.stable + 1) {
          // Legato: a new key while the old one still rings.
          out.push({ type: 'off', midi: current });
          current = candidate;
          peak = f.rms;
          out.push({ type: 'on', midi: current, velocity: velocity(f.rms) });
        } else if (reattack && (candidate === current || candidate === null)) {
          // The same key struck again.
          out.push({ type: 'off', midi: current });
          out.push({ type: 'on', midi: current, velocity: velocity(f.rms) });
          peak = f.rms;
        } else peak = Math.max(peak * 0.995, f.rms);
      }
      lastRms = f.rms;
      return out;
    },
    /** Stop: release whatever is sounding. */
    flush(): TrackerEvent[] {
      const out: TrackerEvent[] = current !== null ? [{ type: 'off', midi: current }] : [];
      current = null;
      candidate = null;
      candidateFrames = 0;
      return out;
    },
  };
}
