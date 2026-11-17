import { AccidentalGlyph } from './AccidentalGlyph';
import s from './Spelled.module.css';

/**
 * Renders music text with real ♯ / ♭ glyphs instead of font characters:
 * "F♯4", "B♭", "m7♭5", "B𝄫". Fonts rarely have nice accidentals, our SVGs always look the same.
 */
export function Spelled({ text, className }: { text: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  let buf = '';
  const flush = () => {
    if (buf) parts.push(buf);
    buf = '';
  };
  for (const ch of Array.from(text)) {
    if (ch === '♯' || ch === '♭' || ch === '𝄫' || ch === '𝄪') {
      flush();
      const kind = ch === '♯' || ch === '𝄪' ? 'sharp' : 'flat';
      const n = ch === '𝄫' || ch === '𝄪' ? 2 : 1;
      for (let i = 0; i < n; i++) {
        parts.push(<AccidentalGlyph key={parts.length} kind={kind} className={kind === 'sharp' ? s.sharp : s.flat} />);
      }
    } else buf += ch;
  }
  flush();
  return (
    <span className={className ? `${s.root} ${className}` : s.root} aria-label={text}>
      {parts}
    </span>
  );
}
