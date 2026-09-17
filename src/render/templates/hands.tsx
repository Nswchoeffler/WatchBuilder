import type { ReactNode } from 'react';
import { color, darken, f, handAngles, optionalColor } from '../util';
import { DropShadow, url, type Template, type TemplateProps } from './common';

// Hand sets. Each hand is drawn pointing to 12 (−y) from the pivot, then rotated to the display time.

interface HandColors {
  metal: string;
  lume: string | null;
  accent: string;
  edge: string;
}

type Shape = (length: number, c: HandColors, kind: 'hour' | 'minute') => ReactNode;

/** Polygon from half-outline points (x ≥ 0, y up = negative), mirrored across the hand axis. */
function mirrored(points: [number, number][]): string {
  const right = points.map(([x, y]) => `${f(x)},${f(y)}`);
  const left = [...points].reverse().map(([x, y]) => `${f(-x)},${f(y)}`);
  return [...right, ...left].join(' ');
}

const sword: Shape = (L, c, kind) => {
  const w = kind === 'hour' ? 1.05 : 0.8;
  const outline = mirrored([[0.45, 1.2], [0.45, -L * 0.12], [w, -L * 0.62], [0, -L]]);
  const inlay = mirrored([[0.12, -L * 0.2], [w - 0.35, -L * 0.62], [0, -L + 0.9]]);
  return (
    <>
      <polygon points={outline} fill={c.metal} stroke={c.edge} strokeWidth={0.08} />
      {c.lume && <polygon points={inlay} fill={c.lume} />}
    </>
  );
};

const mercedes: Shape = (L, c, kind) => {
  if (kind === 'minute') {
    const outline = mirrored([[0.35, 1.3], [0.62, -L * 0.1], [0.62, -L + 1.6], [0, -L]]);
    const inlay = mirrored([[0.3, -L * 0.14], [0.3, -L + 1.8], [0, -L + 1.0]]);
    return (
      <>
        <polygon points={outline} fill={c.metal} stroke={c.edge} strokeWidth={0.08} />
        {c.lume && <polygon points={inlay} fill={c.lume} />}
      </>
    );
  }
  const cy = -L * 0.68;
  const cr = L * 0.15;
  return (
    <>
      <polygon points={mirrored([[0.35, 1.2], [0.7, -L * 0.1], [0.7, cy + cr], [0.25, cy], [0.55, cy - cr + 0.1], [0, -L]])} fill={c.metal} stroke={c.edge} strokeWidth={0.08} />
      <circle cy={f(cy)} r={f(cr)} fill={c.lume ?? c.metal} stroke={c.metal} strokeWidth={0.32} />
      {[0, 120, 240].map((a) => (
        <line key={a} x1={0} y1={f(cy)} x2={f(Math.sin((a * Math.PI) / 180) * cr)} y2={f(cy - Math.cos((a * Math.PI) / 180) * cr)} stroke={c.metal} strokeWidth={0.22} />
      ))}
      {c.lume && <rect x={-0.35} y={f(-L * 0.1 - (L * 0.43 - cr))} width={0.7} height={f(L * 0.43 - cr)} fill={c.lume} />}
    </>
  );
};

const baton: Shape = (L, c, kind) => {
  const w = kind === 'hour' ? 0.55 : 0.42;
  return (
    <>
      <polygon points={mirrored([[w, 1.0], [w, -L + 0.3], [0, -L]])} fill={c.metal} stroke={c.edge} strokeWidth={0.08} />
      {c.lume && <rect x={-w * 0.4} y={f(-L + 0.8)} width={f(w * 0.8)} height={f(L * 0.62)} fill={c.lume} />}
    </>
  );
};

const dauphine: Shape = (L, c, kind) => {
  const w = kind === 'hour' ? 0.95 : 0.75;
  return (
    <>
      <polygon points={`0,1 ${f(w)},${f(-L * 0.22)} 0,${f(-L)}`} fill={c.metal} />
      <polygon points={`0,1 ${f(-w)},${f(-L * 0.22)} 0,${f(-L)}`} fill={darken(c.metal, 0.3)} />
      <polygon points={`0,1 ${f(w)},${f(-L * 0.22)} 0,${f(-L)} ${f(-w)},${f(-L * 0.22)}`} fill="none" stroke={c.edge} strokeWidth={0.07} />
    </>
  );
};

const pencil: Shape = (L, c, kind) => {
  const w = kind === 'hour' ? 0.7 : 0.55;
  return (
    <>
      <polygon points={mirrored([[w, 1.2], [w, -L + 1.8], [0, -L]])} fill={c.metal} stroke={c.edge} strokeWidth={0.08} />
      {c.lume && <polygon points={mirrored([[w - 0.25, -L * 0.12], [w - 0.25, -L + 2.0], [0, -L + 1.1]])} fill={c.lume} />}
    </>
  );
};

const SHAPES: Record<string, Shape> = { sword, mercedes, baton, dauphine, pencil };

function Seconds({ L, c, lollipop }: { L: number; c: HandColors; lollipop: boolean }) {
  return (
    <>
      <polygon points={mirrored([[0.35, 3.2], [0.12, 0], [0.06, -L]])} fill={c.accent} />
      {lollipop && <circle cy={f(-L * 0.76)} r={0.62} fill={c.lume ?? c.accent} stroke={c.accent} strokeWidth={0.22} />}
    </>
  );
}

function Gmt({ L, c }: { L: number; c: HandColors }) {
  return (
    <>
      <polygon points={mirrored([[0.14, 0.8], [0.14, -L + 2.2]])} fill={c.metal} />
      <polygon points={`0,${f(-L)} ${f(1.2)},${f(-L + 2.4)} ${f(-1.2)},${f(-L + 2.4)}`} fill={c.accent} stroke={c.edge} strokeWidth={0.08} />
    </>
  );
}

const handSet = (shapeName: string): Template<'hands'> =>
  function HandSet({ part, params, ctx }: TemplateProps<'hands'>) {
    const shape = SHAPES[shapeName] ?? sword;
    const metal = color(params, 'metal', '#e6e7e9');
    const c: HandColors = { metal, lume: optionalColor(params, 'lume', '#e8f0d8'), accent: color(params, 'accent', metal), edge: darken(metal, 0.55) };
    const a = handAngles(ctx.time);
    const shadow = ctx.id(`hands-shadow-${part.id}`);
    const lollipop = shapeName === 'mercedes' || shapeName === 'sword' || shapeName === 'pencil';
    return (
      <g>
        <defs>
          <DropShadow id={shadow} />
        </defs>
        <g filter={url(shadow)}>
          {part.lengths.gmt !== undefined && (
            <g transform={`rotate(${f(a.gmt)})`}>
              <Gmt L={part.lengths.gmt} c={c} />
            </g>
          )}
          <g transform={`rotate(${f(a.hour)})`}>{shape(part.lengths.hour, c, 'hour')}</g>
          <circle r={1.25} fill={metal} stroke={c.edge} strokeWidth={0.08} />
          <g transform={`rotate(${f(a.minute)})`}>{shape(part.lengths.minute, c, 'minute')}</g>
          <circle r={0.95} fill={metal} stroke={c.edge} strokeWidth={0.08} />
          {part.lengths.seconds !== null && (
            <g transform={`rotate(${f(a.seconds)})`}>
              <Seconds L={part.lengths.seconds} c={c} lollipop={lollipop} />
            </g>
          )}
          <circle r={0.5} fill={c.accent} />
        </g>
      </g>
    );
  };

export const handsTemplates: Record<string, Template<'hands'>> = {
  'hands/sword': handSet('sword'),
  'hands/mercedes': handSet('mercedes'),
  'hands/baton': handSet('baton'),
  'hands/dauphine': handSet('dauphine'),
  'hands/pencil': handSet('pencil'),
};
