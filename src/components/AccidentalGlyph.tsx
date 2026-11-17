/**
 * ♯ / ♭ drawn as SVG so they look identical in every font, never collide with
 * the letter and never shift the baseline. The Unicode symbol is kept for screen
 * readers and copy-paste via the parent's aria-label.
 */
type SvgBox = { x?: number; y?: number; width?: number; height?: number };

export function AccidentalGlyph({ kind, className, ...box }: { kind: 'sharp' | 'flat'; className?: string } & SvgBox) {
  if (kind === 'sharp') {
    return (
      <svg className={className} {...box} viewBox="0 0 11 18" fill="currentColor" aria-hidden="true">
        <rect x="2.4" y="1.6" width="1.9" height="16" />
        <rect x="6.7" y="0.4" width="1.9" height="16" />
        <path d="M0.3 6.9 L10.7 4.6 V7.6 L0.3 9.9 Z" />
        <path d="M0.3 12.1 L10.7 9.8 V12.8 L0.3 15.1 Z" />
      </svg>
    );
  }
  return (
    <svg className={className} {...box} viewBox="0 0 10 18" fill="currentColor" aria-hidden="true">
      <rect x="0.6" y="0" width="2.1" height="17.8" />
      <path
        fillRule="evenodd"
        d="M0.6 17.8 C5.4 16 9.6 13.4 9.3 10.3 C9.1 8 6.2 7 0.6 9.9 Z M2.7 15 C5.4 13.6 6.9 12.2 6.8 11 C6.7 9.9 5.3 9.7 2.7 11.3 Z"
      />
    </svg>
  );
}
