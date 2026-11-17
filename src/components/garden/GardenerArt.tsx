/** The gardener in pixels: the same critter as the keyboard mascot, with outfits and a watering can. */
import s from './Gardener.module.css';

const C = {
  body: '#D97757',
  light: '#EB9877',
  shade: '#B35A3D',
  eye: '#24140E',
  blush: '#F4A58C',
};

const P = ({ x, y, w = 1, h = 1, fill }: { x: number; y: number; w?: number; h?: number; fill: string }) => (
  <rect x={x} y={y} width={w} height={h} fill={fill} />
);

/** Outfit pixels in mascot coordinates (body spans x 2–13, y 5–11). */
export function Hat({ outfit }: { outfit: string | null | undefined }) {
  switch (outfit) {
    case 'straw':
      return (
        <g>
          <P x={4} y={1} w={8} h={3} fill="#f2d48a" />
          <P x={4} y={3} w={8} fill="#c0392b" />
          <P x={0} y={4} w={16} fill="#e9c46a" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <P x={3} y={2} w={10} h={3} fill="#2f7d3a" />
          <P x={4} y={2} w={8} fill="#4caf50" />
          <P x={11} y={4} w={5} fill="#1f5e33" />
        </g>
      );
    case 'scarf':
      return (
        <g>
          <P x={2} y={10} w={12} h={2} fill="#d9483b" />
          <P x={2} y={11} w={12} fill="#f4efe6" />
          <P x={10} y={12} w={2} h={2} fill="#d9483b" />
        </g>
      );
    case 'flower':
      return (
        <g>
          <P x={13} y={3} fill="#f6a9c8" />
          <P x={15} y={3} fill="#f6a9c8" />
          <P x={14} y={2} fill="#f6a9c8" />
          <P x={14} y={4} fill="#f6a9c8" />
          <P x={14} y={3} fill="#ffde59" />
        </g>
      );
    case 'headphones':
      return (
        <g>
          <P x={3} y={2} w={10} fill="#3a3a3a" />
          <P x={2} y={3} h={2} fill="#3a3a3a" />
          <P x={13} y={3} h={2} fill="#3a3a3a" />
          <P x={1} y={5} w={2} h={3} fill="#6b95ef" />
          <P x={13} y={5} w={2} h={3} fill="#6b95ef" />
        </g>
      );
    case 'beret':
      return (
        <g>
          <P x={8} y={1} fill="#3d63c9" />
          <P x={4} y={2} w={8} fill="#3d63c9" />
          <P x={3} y={3} w={10} h={2} fill="#3d63c9" />
          <P x={4} y={3} w={3} fill="#6b95ef" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <P x={3} y={3} w={10} h={2} fill="#4caf50" />
          <P x={3} y={2} fill="#8bd16a" />
          <P x={6} y={1} h={2} fill="#8bd16a" />
          <P x={9} y={1} h={2} fill="#8bd16a" />
          <P x={12} y={2} fill="#8bd16a" />
          <P x={7} y={3} fill="#ffde59" />
        </g>
      );
    default:
      return null;
  }
}

export type GardenerPose = 'idle' | 'water' | 'sleep' | 'dance' | 'wave';

/** The gardener as an SVG group, 16 units wide, feet at y = 14. */
export function GardenerG({ pose, outfit }: { pose: GardenerPose; outfit?: string | null }) {
  const e = C.eye;
  const happy = pose === 'dance' || pose === 'wave';
  return (
    <g className={s.gardener} data-pose={pose} shapeRendering="crispEdges">
      <g className={s.body}>
        {/* legs */}
        <P x={3} y={12} h={2} fill={C.shade} />
        <P x={5} y={12} h={2} fill={C.shade} />
        <P x={10} y={12} h={2} fill={C.shade} />
        <P x={12} y={12} h={2} fill={C.shade} />
        {/* body */}
        <P x={2} y={5} w={12} h={7} fill={C.body} />
        <P x={3} y={5} w={10} fill={C.light} />
        <P x={2} y={11} w={12} fill={C.shade} />
        <P x={0} y={7} w={2} h={2} fill={C.body} />
        {pose === 'wave' ? (
          <g className={s.waveArm}>
            <P x={14} y={4} h={3} fill={C.body} />
            <P x={15} y={3} fill={C.body} />
          </g>
        ) : (
          <P x={14} y={7} w={2} h={2} fill={C.body} />
        )}
        {/* face */}
        {pose === 'sleep' ? (
          <g>
            <P x={4} y={8} w={2} fill={e} />
            <P x={10} y={8} w={2} fill={e} />
          </g>
        ) : happy ? (
          <g>
            <P x={4} y={8} fill={e} />
            <P x={5} y={7} fill={e} />
            <P x={6} y={8} fill={e} />
            <P x={9} y={8} fill={e} />
            <P x={10} y={7} fill={e} />
            <P x={11} y={8} fill={e} />
            <P x={3} y={9} fill={C.blush} />
            <P x={12} y={9} fill={C.blush} />
          </g>
        ) : (
          <g className={s.eyes}>
            <P x={5} y={7} h={2} fill={e} />
            <P x={10} y={7} h={2} fill={e} />
          </g>
        )}
        <Hat outfit={outfit} />
        {/* watering can */}
        {pose === 'water' && (
          <g className={s.can}>
            <P x={15} y={8} w={4} h={3} fill="#4aa3c4" />
            <P x={15} y={8} w={4} fill="#6fc3df" />
            <P x={16} y={6} w={2} fill="#4aa3c4" />
            <P x={19} y={7} w={2} fill="#4aa3c4" />
            <P x={21} y={6} fill="#4aa3c4" />
          </g>
        )}
      </g>
      {pose === 'water' && (
        <g className={s.drops}>
          <P x={21} y={9} fill="#6fc3df" />
          <P x={22} y={11} fill="#6fc3df" />
          <P x={21} y={13} fill="#6fc3df" />
        </g>
      )}
      {pose === 'sleep' && (
        <g className={s.zzz}>
          <P x={14} y={1} w={3} fill="#fffbe0" />
          <P x={15} y={2} fill="#fffbe0" />
          <P x={14} y={3} w={3} fill="#fffbe0" />
        </g>
      )}
      {pose === 'dance' && (
        <g className={s.notes}>
          <P x={-3} y={2} h={3} fill="#fffbe0" />
          <P x={-4} y={4} fill="#fffbe0" />
          <P x={19} y={0} h={3} fill="#fffbe0" />
          <P x={18} y={2} fill="#fffbe0" />
        </g>
      )}
    </g>
  );
}

/** Standalone gardener picture. */
export function GardenerSvg({ pose = 'idle', outfit, size = 64 }: { pose?: GardenerPose; outfit?: string | null; size?: number }) {
  return (
    <svg viewBox="-5 -1 28 16" width={size} height={(size * 16) / 28} className={s.svg} aria-hidden="true">
      <GardenerG pose={pose} outfit={outfit} />
    </svg>
  );
}
