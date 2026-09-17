import type { ReactNode } from 'react';
import type { ResolvedParts } from '../../domain/rules';
import type { PartOf, PartType } from '../../domain/schemas';
import type { Layout } from '../layout';
import { darken, lighten, type DisplayTime, type Params } from '../util';

export interface RenderCtx {
  layout: Layout;
  parts: ResolvedParts;
  /** Unique SVG id for this render (several watches can share a page). */
  id: (name: string) => string;
  time: DisplayTime;
}

export interface TemplateProps<T extends PartType> {
  part: PartOf<T>;
  params: Params;
  ctx: RenderCtx;
}

export type Template<T extends PartType> = (props: TemplateProps<T>) => ReactNode;

export type MetalFinish = 'brushed' | 'polished' | 'matte';

/** Diagonal metal gradient in user space, so overlapping shapes shade continuously. */
export function MetalGradient({ id, base, finish = 'brushed', r }: { id: string; base: string; finish?: MetalFinish; r: number }) {
  const stops: [number, string][] =
    finish === 'polished'
      ? [
          [0, lighten(base, 0.65)],
          [0.28, darken(base, 0.3)],
          [0.5, lighten(base, 0.55)],
          [0.72, darken(base, 0.42)],
          [1, lighten(base, 0.35)],
        ]
      : finish === 'matte'
        ? [
            [0, lighten(base, 0.12)],
            [1, darken(base, 0.12)],
          ]
        : [
            [0, lighten(base, 0.38)],
            [0.3, base],
            [0.55, darken(base, 0.22)],
            [0.78, lighten(base, 0.22)],
            [1, darken(base, 0.18)],
          ];
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={-r} y1={-r} x2={r} y2={r}>
      {stops.map(([o, c]) => (
        <stop key={o} offset={o} stopColor={c} />
      ))}
    </linearGradient>
  );
}

/** Soft shadow used under hands and applied indices. */
export function DropShadow({ id, dx = 0.25, dy = 0.35, blur = 0.25, opacity = 0.45 }: { id: string; dx?: number; dy?: number; blur?: number; opacity?: number }) {
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx={dx} dy={dy} stdDeviation={blur} floodColor="#000" floodOpacity={opacity} />
    </filter>
  );
}

export const url = (id: string) => `url(#${id})`;
