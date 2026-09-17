import type { ReactNode } from 'react';
import { annulus, f, polar, sector } from '../util';
import { url, type TemplateProps } from './common';

// Crystal: AR tint, glare, and an optional date magnifier that re-renders the date larger.

const TINT: Record<string, [string, number]> = {
  none: ['#ffffff', 0.05],
  clear: ['#ffffff', 0.015],
  blue: ['#5d7dff', 0.06],
  purple: ['#a77cff', 0.06],
};

export function CrystalLayer({ part, ctx, magnified }: TemplateProps<'crystal'> & { magnified?: ReactNode }) {
  const r = ctx.layout.crystalRadius;
  const [tint, tintOpacity] = TINT[part.arCoating] ?? TINT.clear!;
  const domed = part.shape !== 'flat';
  const glare = ctx.id(`glare-${part.id}`);
  return (
    <g pointerEvents="none">
      <defs>
        <linearGradient id={glare} x1={0} y1={0} x2={1} y2={1}>
          <stop offset={0} stopColor="#fff" stopOpacity={domed ? 0.32 : 0.2} />
          <stop offset={1} stopColor="#fff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <circle r={r} fill={tint} opacity={tintOpacity} />
      <path d={sector(r * (domed ? 0.72 : 0.84), r * 0.95, 285, 345)} fill={url(glare)} />
      {domed && <path d={sector(r * 0.86, r * 0.93, 110, 150)} fill="#fff" opacity={0.08} />}
      {part.magnifier && magnified && <Magnifier angle={part.magnifier.angle} dialRadius={ctx.layout.dialRadius} id={ctx.id(`magnifier-${part.id}`)}>{magnified}</Magnifier>}
    </g>
  );
}

/** Lens over the date window: the date layer scaled ×1.6 around the lens centre, clipped to the lens. */
function Magnifier({ angle, dialRadius, id, children }: { angle: number; dialRadius: number; id: string; children: ReactNode }) {
  const [cx, cy] = polar(dialRadius * 0.76, angle);
  const lens = dialRadius * 0.2;
  const k = 1.6;
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <circle cx={f(cx)} cy={f(cy)} r={f(lens)} />
        </clipPath>
      </defs>
      <g clipPath={url(id)}>
        <circle cx={f(cx)} cy={f(cy)} r={f(lens)} fill="#000" />
        <g transform={`translate(${f(cx)} ${f(cy)}) scale(${k}) translate(${f(-cx)} ${f(-cy)})`}>{children}</g>
      </g>
      <path d={annulus(lens - 0.12, lens)} transform={`translate(${f(cx)} ${f(cy)})`} fill="#fff" opacity={0.35} fillRule="evenodd" />
      <path d={sector(lens * 0.55, lens * 0.9, 290, 340)} transform={`translate(${f(cx)} ${f(cy)})`} fill="#fff" opacity={0.25} />
    </g>
  );
}
