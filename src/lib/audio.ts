/** Sound via Web Audio: a recorded grand piano (with a synth fallback), cues, drums. */
import { SAMPLE_NAMES, nearestSample, sampleMidi, sampleUrl } from './pianoSamples';

let ctx: AudioContext | null = null;
let bus: AudioNode | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    // iOS 17+: play even when the ring/silent switch is on silent.
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) {
      try {
        session.type = 'playback';
      } catch {
        /* not supported */
      }
    }
    ctx = new Ctor({ latencyHint: 'interactive' });
    // Gentle limiter so chords never clip.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    comp.connect(ctx.destination);
    bus = comp;
  }
  if (ctx.state !== 'running') void ctx.resume();
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Recorded piano: samples load in the background after the first sound. */
/* ------------------------------------------------------------------ */

const samples = new Map<number, AudioBuffer>();
let samplesRequested = false;
let realPiano = true;

/** Use the recorded piano (true) or the light synth (false). */
export function setRealPiano(on: boolean) {
  realPiano = on;
  if (on && ctx) loadSamples(ctx);
}

function loadSamples(c: AudioContext) {
  if (samplesRequested || !realPiano) return;
  samplesRequested = true;
  // The middle of the keyboard first — those are needed soonest.
  const order = [...SAMPLE_NAMES].sort((a, b) => Math.abs(sampleMidi(a) - 62) - Math.abs(sampleMidi(b) - 62));
  for (const name of order)
    fetch(sampleUrl(name))
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((buf) => c.decodeAudioData(buf))
      .then((b) => samples.set(sampleMidi(name), b))
      .catch(() => {
        /* offline before the samples were cached — the synth plays instead */
      });
}

/** How many piano samples are ready (for the settings). */
export const pianoSamplesReady = () => samples.size;

/** Call from a user gesture so later MIDI-triggered sounds are allowed to play. */
export function primeAudio() {
  const c = getContext();
  if (!c) return;
  loadSamples(c);
  // iOS unlocks audio only after something actually plays inside a gesture.
  const buf = c.createBuffer(1, 1, c.sampleRate);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  src.start();
}

const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/* ------------------------------------------------------------------ */
/* Note playback: a soft electric-piano-like voice per held key.       */
/* ------------------------------------------------------------------ */

interface Voice {
  gain: GainNode;
  oscs: AudioScheduledSourceNode[];
  /** A recorded note: let it ring a little longer when released (damper). */
  sampled?: boolean;
}

const voices = new Map<number, Voice>();

/** Starts the pitch of `midi`; it rings (with a natural decay) until noteStop. */
export function noteStart(midi: number, velocity = 90) {
  const c = getContext();
  if (!c || !bus) return;
  noteStop(midi, 0.02);
  const t = c.currentTime;
  // The recorded piano, pitched from the nearest sample.
  if (realPiano) {
    loadSamples(c);
    const from = nearestSample(midi, [...samples.keys()]);
    if (from !== null) {
      const src = c.createBufferSource();
      src.buffer = samples.get(from)!;
      src.playbackRate.value = 2 ** ((midi - from) / 12);
      const v = Math.min(1, velocity / 127);
      const out = c.createGain();
      out.gain.value = 0.42 * (0.25 + 0.75 * v * v);
      src.connect(out).connect(bus);
      src.start(t);
      voices.set(midi, { gain: out, oscs: [src], sampled: true });
      return;
    }
  }
  const f = midiToHz(midi);
  const level = 0.07 + 0.16 * Math.min(1, velocity / 127);
  // Low notes ring longer, high notes fade faster — like a real string.
  const decay = Math.max(0.35, 1.6 - (midi - 21) * 0.014);

  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(level, t + 0.005);
  out.gain.setTargetAtTime(level * 0.35, t + 0.01, decay * 0.35);
  out.gain.setTargetAtTime(0.0001, t + 0.4, decay * 1.6);

  const tone = c.createBiquadFilter();
  tone.type = 'lowpass';
  tone.Q.value = 0.4;
  tone.frequency.setValueAtTime(Math.min(16000, f * 8), t);
  tone.frequency.setTargetAtTime(Math.min(12000, f * 2.5), t + 0.01, 0.25);
  tone.connect(out);
  out.connect(bus);

  const partials: [OscillatorType, number, number][] = [
    ['triangle', 1, 1],
    ['sine', 2, 0.35],
    ['sine', 3, 0.12],
  ];
  const oscs = partials.map(([type, mult, amp]) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = f * mult;
    const g = c.createGain();
    g.gain.value = amp;
    o.connect(g).connect(tone);
    o.start(t);
    return o;
  });

  voices.set(midi, { gain: out, oscs });
}

/** Releases a held note with a short fade (no clicks). */
export function noteStop(midi: number, release = 0.12) {
  const v = voices.get(midi);
  if (!v || !ctx) return;
  voices.delete(midi);
  const t = ctx.currentTime;
  v.gain.gain.cancelScheduledValues(t);
  v.gain.gain.setValueAtTime(Math.max(0.0001, v.gain.gain.value), t);
  const r = v.sampled ? Math.max(release, 0.22) : release;
  v.gain.gain.setTargetAtTime(0.0001, t, r / 3);
  v.oscs.forEach((o) => o.stop(t + r * 3));
}

export function stopAllNotes() {
  [...voices.keys()].forEach((m) => noteStop(m));
}

/* ------------------------------------------------------------------ */
/* Right / wrong cues.                                                 */
/* ------------------------------------------------------------------ */

export function playCorrect(midi: number) {
  const c = getContext();
  if (!c || !bus) return;
  const t = c.currentTime;
  const f = midiToHz(midi);

  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.16, t + 0.008);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  out.connect(bus);

  const body = c.createOscillator();
  body.type = 'triangle';
  body.frequency.value = f;
  body.connect(out);

  const shimmer = c.createOscillator();
  shimmer.type = 'sine';
  shimmer.frequency.value = f * 2;
  const shimmerGain = c.createGain();
  shimmerGain.gain.value = 0.22;
  shimmer.connect(shimmerGain).connect(out);

  body.start(t);
  shimmer.start(t);
  body.stop(t + 0.55);
  shimmer.stop(t + 0.55);
}

export function playWrong() {
  const c = getContext();
  if (!c || !bus) return;
  const t = c.currentTime;

  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(170, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.09);

  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 500;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.14, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

  osc.connect(lp).connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + 0.14);
}

/** Metronome tick; the first beat of a bar is accented. */
export function playClick(accent = false) {
  const c = getContext();
  if (!c || !bus) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = accent ? 1760 : 1175;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(accent ? 0.22 : 0.13, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + 0.06);
}

/* ------------------------------------------------------------------ */
/* Drum machine: synthesized kick, snare, hi-hat and rim — no samples. */
/* ------------------------------------------------------------------ */

export type DrumKind = 'kick' | 'snare' | 'hat' | 'rim';

let noise: AudioBuffer | null = null;
function noiseBuffer(c: AudioContext) {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** Seconds on the audio clock (for sample-accurate scheduling). */
export function audioNow(): number {
  return getContext()?.currentTime ?? 0;
}

/** One drum hit at `when` (audio-clock seconds; default now), `vel` 0…1. */
export function playDrum(kind: DrumKind, when = 0, vel = 1) {
  const c = getContext();
  if (!c || !bus) return;
  const t = Math.max(c.currentTime, when || c.currentTime);
  const out = c.createGain();
  out.connect(bus);
  if (kind === 'kick') {
    const o = c.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.75 * vel, t + 0.004);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(out);
    o.start(t);
    o.stop(t + 0.34);
    return;
  }
  if (kind === 'rim') {
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 1750;
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.18 * vel, t + 0.002);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(out);
    o.start(t);
    o.stop(t + 0.05);
    return;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = kind === 'hat' ? 7000 : 1400;
  src.connect(hp).connect(out);
  const len = kind === 'hat' ? 0.045 : 0.17;
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime((kind === 'hat' ? 0.12 : 0.32) * vel, t + 0.002);
  out.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.start(t);
  src.stop(t + len + 0.02);
  if (kind === 'snare') {
    // A little body under the noise.
    const o = c.createOscillator();
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(130, t + 0.08);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22 * vel, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.12);
  }
}

/* ------------------------------------------------------------------ */
/* Recording what the app plays (accompaniment, drums and your keys).  */
/* ------------------------------------------------------------------ */

export const canRecordAudio = () => typeof window !== 'undefined' && 'MediaRecorder' in window;

/** Starts recording the app's sound; `stop()` resolves with the audio file. */
export function startAudioRecording(): { stop(): Promise<Blob> } | null {
  const c = getContext();
  if (!c || !bus || !canRecordAudio()) return null;
  const dest = c.createMediaStreamDestination();
  bus.connect(dest);
  const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t));
  const rec = new MediaRecorder(dest.stream, type ? { mimeType: type } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start();
  return {
    stop: () =>
      new Promise((res) => {
        rec.onstop = () => {
          bus?.disconnect(dest);
          res(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
        };
        rec.stop();
      }),
  };
}

/* ------------------------------------------------------------------ */
/* For the microphone input: the shared context, and how loud we are.  */
/* ------------------------------------------------------------------ */

export function getAudioContext(): AudioContext | null {
  return getContext();
}

let outAnalyser: AnalyserNode | null = null;
let outBuf: Float32Array | null = null;
let lastSoundAt = 0;

/** Loudness of what the app itself is playing right now (0 when silent). */
export function outputLevel(): number {
  const c = getContext();
  if (!c || !bus) return 0;
  if (!outAnalyser) {
    outAnalyser = c.createAnalyser();
    outAnalyser.fftSize = 512;
    bus.connect(outAnalyser);
    outBuf = new Float32Array(outAnalyser.fftSize);
  }
  outAnalyser.getFloatTimeDomainData(outBuf!);
  let s = 0;
  for (let i = 0; i < outBuf!.length; i++) s += outBuf![i] * outBuf![i];
  const level = Math.sqrt(s / outBuf!.length);
  if (level > 0.003) lastSoundAt = performance.now();
  return level;
}

/** Milliseconds since the app last made a sound (its echo may still be in the room). */
export const sinceAppSound = () => performance.now() - lastSoundAt;

/* ------------------------------------------------------------------ */
/* Little voices for the garden cat.                                    */
/* ------------------------------------------------------------------ */

/** A short synthesized «мяу»: a vowel-ish glide up and down. */
export function playMeow() {
  const c = getContext();
  if (!c || !bus) return;
  const t = c.currentTime + 0.01;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(520, t);
  o.frequency.exponentialRampToValueAtTime(820, t + 0.12);
  o.frequency.exponentialRampToValueAtTime(560, t + 0.42);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 3;
  f.frequency.setValueAtTime(900, t);
  f.frequency.linearRampToValueAtTime(1700, t + 0.14);
  f.frequency.linearRampToValueAtTime(1000, t + 0.42);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.28, t + 0.05);
  g.gain.setValueAtTime(0.28, t + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
  o.connect(f).connect(g).connect(bus);
  o.start(t);
  o.stop(t + 0.5);
}

/** A soft purr: low noise pulsing about 25 times a second. */
export function playPurr(seconds = 1.4) {
  const c = getContext();
  if (!c || !bus) return;
  const t = c.currentTime + 0.01;
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.55 + 0.45 * Math.sin((i / c.sampleRate) * Math.PI * 2 * 24));
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 180;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.25);
  g.gain.setValueAtTime(0.5, t + seconds - 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  src.connect(f).connect(g).connect(bus);
  src.start(t);
  src.stop(t + seconds);
}
