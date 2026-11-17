import { useCallback, useEffect, useRef, useState } from 'react';

export type MidiStatus = 'unsupported' | 'insecure' | 'pending' | 'denied' | 'ready';

export interface MidiDevice {
  id: string;
  name: string;
}

export interface MidiHandlers {
  onNoteOn(note: number, velocity: number): void;
  onNoteOff(note: number): void;
  /** Called when inputs are re-attached (device plugged/unplugged) so stuck notes can be cleared. */
  onReset?(): void;
}

export const ALL_DEVICES = 'all';

function initialStatus(): MidiStatus {
  if (typeof window === 'undefined') return 'unsupported';
  if (typeof (navigator as { requestMIDIAccess?: unknown }).requestMIDIAccess !== 'function') {
    return window.isSecureContext ? 'unsupported' : 'insecure';
  }
  return 'pending';
}

const sameDevices = (a: MidiDevice[], b: MidiDevice[]) =>
  a.length === b.length && a.every((d, i) => d.id === b[i].id && d.name === b[i].name);

export function useMidi(handlers: MidiHandlers) {
  const [status, setStatus] = useState<MidiStatus>(initialStatus);
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [selectedId, setSelectedId] = useState<string>(ALL_DEVICES);
  const accessRef = useRef<MIDIAccess | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Stable raw message parser: goes straight to the handlers, no React state on the hot path.
  const onMessage = useCallback((e: MIDIMessageEvent) => {
    const d = e.data;
    if (!d || d.length < 2) return;
    const cmd = d[0] & 0xf0;
    const note = d[1];
    const velocity = d.length > 2 ? d[2] : 0;
    if (cmd === 0x90 && velocity > 0) handlersRef.current.onNoteOn(note, velocity);
    else if (cmd === 0x80 || cmd === 0x90) handlersRef.current.onNoteOff(note); // note-on vel 0 = note-off
    // CC64 (sustain) is deliberately ignored: highlight follows the physical key.
  }, []);

  useEffect(() => {
    if (initialStatus() !== 'pending') return;
    let cancelled = false;
    navigator.requestMIDIAccess({ sysex: false }).then(
      (access) => {
        if (cancelled) return;
        accessRef.current = access;
        const refresh = () => {
          const list: MidiDevice[] = [];
          access.inputs.forEach((input) => {
            if (input.state === 'connected') list.push({ id: input.id, name: input.name || 'MIDI-устройство' });
          });
          setDevices((prev) => (sameDevices(prev, list) ? prev : list));
        };
        access.onstatechange = refresh; // hot plug / unplug
        refresh();
        setStatus('ready');
      },
      () => {
        if (!cancelled) setStatus('denied');
      },
    );
    return () => {
      cancelled = true;
      if (accessRef.current) accessRef.current.onstatechange = null;
    };
  }, []);

  // Fall back to "all" if the selected device disappeared.
  useEffect(() => {
    if (selectedId !== ALL_DEVICES && !devices.some((d) => d.id === selectedId)) setSelectedId(ALL_DEVICES);
  }, [devices, selectedId]);

  // Attach the parser to the chosen input(s).
  useEffect(() => {
    const access = accessRef.current;
    if (!access) return;
    const attached: MIDIInput[] = [];
    access.inputs.forEach((input) => {
      const use = selectedId === ALL_DEVICES || input.id === selectedId;
      input.onmidimessage = use ? onMessage : null;
      if (use) attached.push(input);
    });
    return () => {
      attached.forEach((input) => {
        input.onmidimessage = null;
      });
      handlersRef.current.onReset?.();
    };
  }, [devices, selectedId, onMessage]);

  return {
    status,
    devices,
    selectedId,
    setSelectedId,
    connected: status === 'ready' && devices.length > 0,
  };
}
