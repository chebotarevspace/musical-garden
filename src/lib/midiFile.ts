/**
 * A small Standard MIDI File reader (formats 0 and 1): enough to pull melodies out of a .mid file.
 * Returns every track's notes in beats (quarter notes), plus tempo and time signature.
 */
export interface MidiNote {
  midi: number;
  /** Start and length in quarter-note beats. */
  start: number;
  dur: number;
  velocity: number;
  channel: number;
}

export interface MidiTrack {
  name: string;
  notes: MidiNote[];
}

export interface MidiSong {
  tracks: MidiTrack[];
  /** Beats per minute of the first tempo event (120 when absent). */
  bpm: number;
  /** Beats per bar from the first time signature (4 when absent). */
  meter: number;
}

class Reader {
  pos = 0;
  constructor(private b: Uint8Array) {}
  get left() {
    return this.b.length - this.pos;
  }
  u8() {
    if (this.pos >= this.b.length) throw new Error('Файл обрывается — похоже, он повреждён.');
    return this.b[this.pos++];
  }
  u16() {
    return (this.u8() << 8) | this.u8();
  }
  u32() {
    return ((this.u8() << 24) >>> 0) + (this.u8() << 16) + (this.u8() << 8) + this.u8();
  }
  str(n: number) {
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(this.u8());
    return s;
  }
  vlq() {
    let v = 0;
    for (let i = 0; i < 4; i++) {
      const c = this.u8();
      v = (v << 7) | (c & 0x7f);
      if (!(c & 0x80)) return v;
    }
    return v;
  }
  bytes(n: number) {
    const out = this.b.subarray(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }
}

const decodeName = (bytes: Uint8Array) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).trim();
  } catch {
    try {
      return new TextDecoder('windows-1251').decode(bytes).trim();
    } catch {
      return '';
    }
  }
};

export function parseMidi(data: ArrayBuffer | Uint8Array): MidiSong {
  const r = new Reader(data instanceof Uint8Array ? data : new Uint8Array(data));
  if (r.left < 14 || r.str(4) !== 'MThd') throw new Error('Это не MIDI-файл (.mid).');
  const headerLen = r.u32();
  const format = r.u16();
  const nTracks = r.u16();
  const division = r.u16();
  r.pos += headerLen - 6;
  if (format > 1) throw new Error('Этот вид MIDI-файла (формат 2) не поддерживается.');
  if (division & 0x8000) throw new Error('MIDI с SMPTE-временем не поддерживается.');
  const ppq = division || 480;

  let bpm = 0;
  let meter = 0;
  const tracks: MidiTrack[] = [];

  for (let t = 0; t < nTracks && r.left > 8; t++) {
    const id = r.str(4);
    const len = r.u32();
    const end = r.pos + len;
    if (id !== 'MTrk') {
      r.pos = end;
      continue;
    }
    let tick = 0;
    let status = 0;
    let name = '';
    const open = new Map<number, { tick: number; vel: number }>(); // key: channel*128+note
    const notes: MidiNote[] = [];
    const close = (ch: number, note: number) => {
      const k = ch * 128 + note;
      const o = open.get(k);
      if (!o) return;
      open.delete(k);
      if (tick > o.tick) notes.push({ midi: note, start: o.tick / ppq, dur: (tick - o.tick) / ppq, velocity: o.vel, channel: ch });
    };
    while (r.pos < end) {
      tick += r.vlq();
      let b = r.u8();
      if (b === 0xff) {
        const type = r.u8();
        const n = r.vlq();
        const body = r.bytes(n);
        if (type === 0x03 && !name) name = decodeName(body);
        if (type === 0x51 && n === 3 && !bpm) bpm = 60_000_000 / ((body[0] << 16) | (body[1] << 8) | body[2]);
        if (type === 0x58 && n >= 2 && !meter) meter = body[0];
        if (type === 0x2f) break;
        continue;
      }
      if (b === 0xf0 || b === 0xf7) {
        r.pos += r.vlq();
        continue;
      }
      if (b & 0x80) status = b;
      else r.pos--; // running status
      b = status;
      const type = b & 0xf0;
      const ch = b & 0x0f;
      if (type === 0x90 || type === 0x80) {
        const note = r.u8();
        const vel = r.u8();
        if (type === 0x90 && vel > 0) {
          close(ch, note);
          open.set(ch * 128 + note, { tick, vel });
        } else close(ch, note);
      } else if (type === 0xc0 || type === 0xd0) r.u8();
      else r.pos += 2;
    }
    r.pos = end;
    if (notes.length) tracks.push({ name, notes: notes.sort((a, b) => a.start - b.start || b.midi - a.midi) });
  }
  if (!tracks.length) throw new Error('В файле не нашлось нот.');
  return { tracks, bpm: Math.round(bpm || 120), meter: meter === 3 ? 3 : 4 };
}
