import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { SecretFx as Fx } from '../lib/gardener';
import s from './SecretFx.module.css';

const COLORS = ['#ffde59', '#f6a9c8', '#8bd16a', '#6b95ef', '#e8833a', '#fffbe0', '#e57aa5'];

/** Full-screen effects for the secret tunes: fireworks, a birthday cake, snow. */
export function SecretFx({ fx }: { fx: { kind: Fx; at: number } | null }) {
  const [shown, setShown] = useState(fx);
  useEffect(() => {
    if (!fx || fx.kind === 'dance') return;
    setShown(fx);
    const t = window.setTimeout(() => setShown(null), fx.kind === 'snow' ? 9000 : 4200);
    return () => window.clearTimeout(t);
  }, [fx]);
  if (!shown || shown.kind === 'dance') return null;

  return (
    <div className={s.layer} key={shown.at} data-kind={shown.kind} aria-hidden="true">
      {shown.kind === 'fireworks' &&
        Array.from({ length: 5 }, (_, b) => (
          <div key={b} className={s.burst} style={{ left: `${15 + b * 17}%`, top: `${18 + ((b * 37) % 30)}%`, '--delay': `${b * 0.45}s` } as CSSProperties}>
            {Array.from({ length: 14 }, (_, i) => (
              <i key={i} style={{ '--a': `${(i / 14) * 360}deg`, background: COLORS[(i + b) % COLORS.length] } as CSSProperties} />
            ))}
          </div>
        ))}
      {shown.kind === 'cake' && (
        <>
          <div className={s.cake}>🎂</div>
          {Array.from({ length: 40 }, (_, i) => (
            <i key={i} className={s.confetti} style={{ left: `${(i * 37) % 100}%`, background: COLORS[i % COLORS.length], '--delay': `${(i % 10) * 0.12}s`, '--d': `${2.4 + (i % 5) * 0.3}s` } as CSSProperties} />
          ))}
        </>
      )}
      {shown.kind === 'snow' &&
        Array.from({ length: 60 }, (_, i) => (
          <span key={i} className={s.flake} style={{ left: `${(i * 53) % 100}%`, '--delay': `${(i % 15) * 0.35}s`, '--d': `${4 + (i % 6) * 0.7}s`, fontSize: `${10 + (i % 4) * 5}px` } as CSSProperties}>
            ❄
          </span>
        ))}
    </div>
  );
}
