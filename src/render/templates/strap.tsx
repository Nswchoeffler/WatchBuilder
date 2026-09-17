import type { ReactNode } from 'react';
import { color, darken, f, lighten, range } from '../util';
import { MetalGradient, url, type Template, type TemplateProps } from './common';

// Straps and bracelets. Each template draws the TOP half (extending to −y); the scene mirrors it for
// the bottom half. The strap starts under the case so the lugs overlap it.

export interface StrapGeometry {
  /** y where the strap starts (under the case), negative. */
  start: number;
  /** y where the drawing ends (viewBox edge), negative. */
  end: number;
  /** Width at the lugs. */
  width: number;
  /** Width at `end`. */
  endWidth: number;
}

export function strapGeometry(props: TemplateProps<'strap'>, viewTop: number): StrapGeometry {
  const { layout } = props.ctx;
  const width = props.part.width ?? layout.lugWidth;
  const start = -layout.caseRadius * 0.6;
  const taper = props.part.kind === 'integrated' ? 0.82 : props.part.kind === 'nato' ? 1 : 0.9;
  return { start, end: viewTop, width, endWidth: width * taper };
}

/** Horizontal half-width at y, linearly tapering from the spring bar to the end. */
function halfWidthAt(g: StrapGeometry, springY: number, y: number): number {
  if (y >= springY) return g.width / 2;
  const t = (springY - y) / (springY - g.end);
  return (g.width + (g.endWidth - g.width) * t) / 2;
}

/** Outline of the strap between x fractions [u0, u1] of its width (−0.5…0.5). */
function band(g: StrapGeometry, springY: number, u0: number, u1: number, y0: number, y1: number): string {
  const hw0 = halfWidthAt(g, springY, y0);
  const hw1 = halfWidthAt(g, springY, y1);
  return `M ${f(u0 * 2 * hw0)} ${f(y0)} L ${f(u1 * 2 * hw0)} ${f(y0)} L ${f(u1 * 2 * hw1)} ${f(y1)} L ${f(u0 * 2 * hw1)} ${f(y1)} Z`;
}

interface Row {
  /** Fraction of total width. */
  w: number;
  polished: boolean;
  /** Link pitch in mm and phase offset (fraction of pitch). */
  pitch: number;
  phase?: number;
}

function LinkBracelet({ props, g, rows, springY }: { props: TemplateProps<'strap'>; g: StrapGeometry; rows: Row[]; springY: number }) {
  const metal = color(props.params, 'metal', '#c9ccd1');
  const brushed = props.ctx.id(`bracelet-brushed-${props.part.id}`);
  const polished = props.ctx.id(`bracelet-polished-${props.part.id}`);
  const total = rows.reduce((s, r) => s + r.w, 0);
  let u = -0.5;
  const pieces: ReactNode[] = [];
  rows.forEach((row, i) => {
    const u0 = u;
    const u1 = u + row.w / total;
    u = u1;
    const len = g.start - g.end;
    const n = Math.ceil(len / row.pitch) + 1;
    range(n).forEach((k) => {
      const y0 = g.start - (k + (row.phase ?? 0)) * row.pitch;
      const y1 = y0 - row.pitch + 0.18;
      if (y1 > g.start || y0 < g.end - row.pitch) return;
      pieces.push(
        <path
          key={`${i}-${k}`}
          d={band(g, springY, u0 + 0.004, u1 - 0.004, Math.min(y0, g.start), Math.max(y1, g.end))}
          fill={url(row.polished ? polished : brushed)}
          stroke={darken(metal, 0.5)}
          strokeWidth={0.08}
        />,
      );
    });
  });
  return (
    <g>
      <defs>
        <MetalGradient id={brushed} base={metal} finish="brushed" r={30} />
        <MetalGradient id={polished} base={metal} finish="polished" r={12} />
      </defs>
      <path d={band(g, springY, -0.5, 0.5, g.start, g.end)} fill={darken(metal, 0.55)} />
      {pieces}
    </g>
  );
}

function FabricStrap({ props, g, springY, texture }: { props: TemplateProps<'strap'>; g: StrapGeometry; springY: number; texture: 'nato' | 'rubber' | 'leather' | 'tropic' }) {
  const fallback = texture === 'leather' ? '#6b4428' : texture === 'nato' ? '#1b1c1e' : '#18191b';
  const base = color(props.params, 'primary', props.part.color ?? fallback);
  const d = band(g, springY, -0.5, 0.5, g.start, g.end);
  const inset = (y: number, s: number) => halfWidthAt(g, springY, y) - s;
  const pid = props.ctx.id(`strap-texture-${props.part.id}`);
  return (
    <g>
      <defs>
        {texture === 'nato' && (
          <pattern id={pid} width={0.6} height={0.6} patternUnits="userSpaceOnUse">
            <rect width={0.6} height={0.3} fill="#fff" opacity={0.04} />
          </pattern>
        )}
        {texture === 'tropic' && (
          <pattern id={pid} width={2} height={2} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={0.32} fill="#000" opacity={0.55} />
          </pattern>
        )}
      </defs>
      <path d={d} fill={base} stroke={darken(base, 0.45)} strokeWidth={0.15} />
      {(texture === 'nato' || texture === 'tropic') && <path d={d} fill={url(pid)} />}
      {texture === 'rubber' &&
        range(Math.floor((g.start - g.end) / 2.2)).map((i) => {
          const y = g.start - 3 - i * 2.2;
          return <line key={i} x1={f(-inset(y, 1.2))} y1={f(y)} x2={f(inset(y, 1.2))} y2={f(y)} stroke={darken(base, 0.35)} strokeWidth={0.35} />;
        })}
      {(texture === 'nato' || texture === 'leather') && (
        <g stroke={lighten(base, texture === 'leather' ? 0.45 : 0.25)} strokeWidth={0.12} strokeDasharray="0.6 0.4" fill="none">
          {[-1, 1].map((s) => (
            <path key={s} d={`M ${f(s * inset(g.start, 0.9))} ${f(g.start)} L ${f(s * inset(g.end, 0.9))} ${f(g.end)}`} />
          ))}
        </g>
      )}
      {texture === 'nato' && (
        <rect x={f(-g.width / 2 - 0.3)} y={f(g.start - (g.start - g.end) * 0.55)} width={f(g.width + 0.6)} height={1.4} rx={0.4} fill="#b9bcc1" stroke="#6d7075" strokeWidth={0.1} />
      )}
    </g>
  );
}

type StrapTemplate = (props: TemplateProps<'strap'>, g: StrapGeometry, springY: number) => ReactNode;

const bracelet =
  (rows: Row[]): StrapTemplate =>
  (props, g, springY) => <LinkBracelet props={props} g={g} rows={rows} springY={springY} />;

const fabric =
  (texture: 'nato' | 'rubber' | 'leather' | 'tropic'): StrapTemplate =>
  (props, g, springY) => <FabricStrap props={props} g={g} springY={springY} texture={texture} />;

export const strapDrawers: Record<string, StrapTemplate> = {
  'strap/oyster': bracelet([
    { w: 0.32, polished: false, pitch: 5.4 },
    { w: 0.36, polished: false, pitch: 5.4, phase: 0.5 },
    { w: 0.32, polished: false, pitch: 5.4 },
  ]),
  'strap/jubilee': bracelet([
    { w: 0.26, polished: false, pitch: 3.1 },
    { w: 0.16, polished: true, pitch: 2.2, phase: 0.5 },
    { w: 0.16, polished: true, pitch: 2.2 },
    { w: 0.16, polished: true, pitch: 2.2, phase: 0.5 },
    { w: 0.26, polished: false, pitch: 3.1 },
  ]),
  'strap/president': bracelet([
    { w: 0.3, polished: false, pitch: 4 },
    { w: 0.4, polished: true, pitch: 4, phase: 0.5 },
    { w: 0.3, polished: false, pitch: 4 },
  ]),
  'strap/integrated-octagon': bracelet([
    { w: 0.34, polished: false, pitch: 6 },
    { w: 0.32, polished: true, pitch: 6, phase: 0.5 },
    { w: 0.34, polished: false, pitch: 6 },
  ]),
  'strap/mesh': bracelet([{ w: 1, polished: false, pitch: 0.9 }]),
  'strap/nato': fabric('nato'),
  'strap/rubber': fabric('rubber'),
  'strap/leather': fabric('leather'),
  'strap/tropic': fabric('tropic'),
};

/** Default drawer per strap kind when the template is unknown. */
export const STRAP_KIND_DEFAULT: Record<string, string> = {
  oyster: 'strap/oyster',
  jubilee: 'strap/jubilee',
  president: 'strap/president',
  mesh: 'strap/mesh',
  nato: 'strap/nato',
  rubber: 'strap/rubber',
  tropic: 'strap/tropic',
  leather: 'strap/leather',
  integrated: 'strap/integrated-octagon',
};

export type { Template };
