import type { ReactNode } from 'react';
import { choice, color, darken, f, lighten, polar, range } from '../util';
import { FlutedRing, SmoothRing } from './bezel';
import { MetalGradient, url, type MetalFinish, type Template, type TemplateProps } from './common';

// Case templates. Drawn 12:00-up at true size; the crown is a separate layer.
// Shapes are drawn twice: a dark outline pass, then a fill pass on top, so overlapping
// pieces (body + lugs) read as one silhouette.
//
// Side detail (chamfered edges, brushing, drilled lugs) is drawn inside that silhouette and clipped to it,
// so it never changes the case's outline. It is driven by the template's `finish`, `bevel` and `drilled`
// settings. Nothing here uses `lumeClass`: the case does not glow at night.

type Mirror = readonly [number, number];
const QUADRANTS: readonly Mirror[] = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

/**
 * Side detail, drawn once per mirror. Coordinates are those of the first mirror
 * (the top-right lug, or the whole body).
 */
interface Trim {
  mirrors: readonly Mirror[];
  /** Outline that gets the chamfer: open for a lug (so it leaves out the root), closed for a whole body. */
  edge: string;
  /** Fine straight lines for a brushed surface. */
  grain?: string;
  /** One sharp highlight along the piece, for a polished surface. */
  glint?: string;
  /** Drilled hole: x, y, radius. */
  hole?: readonly [number, number, number];
  /** Radius of the round case body that the trim stays out of (set for lugs, which join it). */
  outside?: number;
}

interface Silhouette {
  shapes: ReactNode[];
  /** Extra detail drawn above the body (bevels, integral bezel…). */
  detail?: ReactNode;
  trim?: Trim;
  /** Circular brushing on the case top between these two radii. */
  rings?: readonly [number, number];
}

const BEVEL_WIDTH = { none: 0, narrow: 0.5, wide: 0.9 } as const;
type Bevel = keyof typeof BEVEL_WIDTH;

/** Vertical lines `step` apart from x `from` to `to`, each running from y0 to y1. */
function vlines(from: number, to: number, step: number, y0: number, y1: number): string {
  const d: string[] = [];
  for (let x = from; x <= to + 1e-6; x += step) d.push(`M ${f(x)} ${f(y0)} L ${f(x)} ${f(y1)}`);
  return d.join(' ');
}

interface TrimProps {
  trim?: Trim;
  rings?: readonly [number, number];
  metal: string;
  finish: MetalFinish;
  bevel: Bevel;
  drilled: boolean;
  clipId: string;
  outsideId: string;
}

/**
 * Chamfer, brushing and drilled holes. A brushed case gets a bright chamfer and fine grain, a polished one a brighter
 * chamfer and a sharp highlight, a matte one a soft chamfer only.
 */
function CaseTrim({ trim, rings, metal, finish, bevel, drilled, clipId, outsideId }: TrimProps) {
  const w = BEVEL_WIDTH[bevel];
  const brushed = finish === 'brushed';
  const grain = lighten(metal, 0.75);
  const ringRadii = rings && brushed ? range(Math.max(0, Math.floor((rings[1] - rings[0]) / 0.45))).map((i) => rings[0] + 0.3 + i * 0.45) : [];
  const edgeLight = lighten(metal, finish === 'polished' ? 0.78 : brushed ? 0.65 : 0.3);
  return (
    <g>
      {ringRadii.length > 0 && (
        <g clipPath={url(clipId)} fill="none" stroke={grain} strokeWidth={0.06} opacity={0.35}>
          {ringRadii.map((r) => (
            <circle key={r} r={f(r)} />
          ))}
        </g>
      )}
      {trim && (
        <g clipPath={url(clipId)}>
          <g clipPath={trim.outside ? url(outsideId) : undefined}>
            {trim.mirrors.map(([sx, sy]) => (
              <g key={`${sx}${sy}`} transform={`scale(${sx} ${sy})`} fill="none" strokeLinejoin="round">
                {brushed && trim.grain && <path d={trim.grain} stroke={grain} strokeWidth={0.07} opacity={0.4} />}
                {w > 0 && (
                  <>
                    <path d={trim.edge} stroke={darken(metal, 0.5)} strokeWidth={2 * (w + 0.1)} opacity={0.4} />
                    <path d={trim.edge} stroke={edgeLight} strokeWidth={2 * w} opacity={finish === 'polished' ? 0.92 : 0.8} />
                  </>
                )}
                {finish === 'polished' && trim.glint && (
                  <path d={trim.glint} stroke={lighten(metal, 0.92)} strokeWidth={0.16} strokeLinecap="round" opacity={0.7} />
                )}
              </g>
            ))}
          </g>
        </g>
      )}
      {drilled &&
        trim?.hole &&
        trim.mirrors.map(([sx, sy]) => (
          <circle
            key={`hole${sx}${sy}`}
            cx={f(sx * trim.hole![0])}
            cy={f(sy * trim.hole![1])}
            r={trim.hole![2]}
            fill={darken(metal, 0.78)}
            stroke={lighten(metal, 0.6)}
            strokeWidth={0.1}
          />
        ))}
    </g>
  );
}

function CaseBody({ ctx, part, params, silhouette }: TemplateProps<'case'> & { silhouette: (fill: string) => Silhouette }) {
  const metal = color(params, 'metal', '#c9ccd1');
  const finish = choice<MetalFinish>(params, 'finish', ['brushed', 'polished', 'matte'], 'brushed');
  const bevel = choice<Bevel>(params, 'bevel', ['none', 'narrow', 'wide'], 'narrow');
  const drilled = choice(params, 'drilled', ['no', 'yes'], 'no') === 'yes';
  const gid = ctx.id(`case-metal-${part.id}`);
  const clipId = ctx.id(`case-clip-${part.id}`);
  const outsideId = ctx.id(`case-outside-${part.id}`);
  const outline = silhouette(darken(metal, 0.55));
  const body = silhouette(url(gid));
  const { layout } = ctx;
  const flange = ctx.id(`case-flange-${part.id}`);
  const rf = layout.bezelInnerRadius + 0.05;
  const o = body.trim?.outside;
  // Everything outside a circle of radius `o` (even-odd): keeps lug trim off the round body.
  const outside = o ? `M -100 -100 H 100 V 100 H -100 Z M ${f(o)} 0 A ${f(o)} ${f(o)} 0 1 0 ${f(-o)} 0 A ${f(o)} ${f(o)} 0 1 0 ${f(o)} 0 Z` : '';
  return (
    <g>
      <defs>
        <MetalGradient id={gid} base={metal} finish={finish} r={layout.lugToLug / 2} />
        {/* Case opening: inner flange sloping down to the dial, darker towards the centre. */}
        <radialGradient id={flange} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={rf}>
          <stop offset={0.8} stopColor={darken(metal, 0.7)} />
          <stop offset={1} stopColor={darken(metal, 0.35)} />
        </radialGradient>
        <clipPath id={clipId}>{body.shapes}</clipPath>
        {o && (
          <clipPath id={outsideId}>
            <path d={outside} clipRule="evenodd" />
          </clipPath>
        )}
      </defs>
      <g stroke={darken(metal, 0.55)} strokeWidth={0.35} strokeLinejoin="round">
        {outline.shapes}
      </g>
      <g>{body.shapes}</g>
      <CaseTrim trim={body.trim} rings={body.rings} metal={metal} finish={finish} bevel={bevel} drilled={drilled} clipId={clipId} outsideId={outsideId} />
      {body.detail}
      <circle r={rf} fill={url(flange)} />
    </g>
  );
}

/**
 * Four lugs. Each has a straight inner edge at the lug width and an outer edge that flares into
 * the case (`flare` × thickness at the root), with a rounded tip. Drawn for the top-right lug and mirrored.
 */
function lugGeometry(R: number, lugWidth: number, lugToLug: number, t: number, flare: number) {
  const h = lugToLug / 2;
  const xi = lugWidth / 2;
  const xo = xi + t;
  const rootY = -R * 0.55;
  const tip = Math.min(1.1, t / 2);
  const open = [
    `M ${f(xi)} ${f(rootY)}`,
    `L ${f(xi)} ${f(-h + tip)}`,
    `Q ${f(xi)} ${f(-h)} ${f(xi + tip)} ${f(-h)}`,
    `L ${f(xo - tip)} ${f(-h)}`,
    `Q ${f(xo)} ${f(-h)} ${f(xo)} ${f(-h + tip)}`,
    `C ${f(xo)} ${f(-R * 0.95)} ${f(xi + t * flare)} ${f(-R * 0.85)} ${f(xi + t * flare)} ${f(rootY)}`,
  ].join(' ');
  return { h, xi, xo, rootY, tip, open, closed: `${open} Z` };
}

function lugs(fill: string, R: number, lugWidth: number, lugToLug: number, t: number, flare: number, key: string) {
  const { closed } = lugGeometry(R, lugWidth, lugToLug, t, flare);
  return QUADRANTS.map(([sx, sy]) => <path key={`${key}${sx}${sy}`} d={closed} fill={fill} transform={`scale(${sx} ${sy})`} />);
}

/** Trim for the four lugs: chamfer round the exposed edges, brushing along their length, a highlight down the middle, a hole at the spring bar. */
function lugTrim(R: number, lugWidth: number, lugToLug: number, t: number, flare: number, springBarY: number): Trim {
  const { h, xi, xo, rootY, open } = lugGeometry(R, lugWidth, lugToLug, t, flare);
  const mid = (xi + xo) / 2;
  return {
    mirrors: QUADRANTS,
    edge: open,
    grain: vlines(xi + 0.4, xo - 0.2, 0.4, -h, rootY),
    glint: `M ${f(mid)} ${f(-h + 1.2)} L ${f(mid)} ${f(rootY - 1)}`,
    hole: [mid, -springBarY, Math.min(0.5, t * 0.17)],
    outside: R,
  };
}

/** Rounded crown-guard shoulders either side of the crown, leaving a gap the crown's width. */
function crownGuards(fill: string, r: number, angle: number, size: number, crownDiameter: number) {
  const gap = (Math.asin(Math.min(1, (crownDiameter / 2 + size * 0.55) / r)) * 180) / Math.PI;
  return [-1, 1].map((side) => {
    const [x, y] = polar(r - size * 0.35, angle + side * gap);
    return <circle key={`guard${side}`} cx={f(x)} cy={f(y)} r={f(size)} fill={fill} />;
  });
}

const diver: Template<'case'> = (props) => {
  const { layout } = props.ctx;
  const R = layout.caseRadius;
  const guards = choice(props.params, 'guards', ['yes', 'no'], 'yes') === 'yes';
  return (
    <CaseBody
      {...props}
      silhouette={(fill) => ({
        shapes: [
          <circle key="body" r={R} fill={fill} />,
          ...lugs(fill, R, layout.lugWidth, layout.lugToLug, 3.2, 2.2, 'lug'),
          ...(guards ? crownGuards(fill, R, layout.crownAngle, 2.3, props.ctx.parts.crown?.diameter ?? 6.5) : []),
        ],
        trim: lugTrim(R, layout.lugWidth, layout.lugToLug, 3.2, 2.2, layout.springBarY),
      })}
    />
  );
};

/**
 * Cushion case (Turtle-style): no separate lugs. The flanks bulge out to the full case width at 3/9
 * and curve back in to a flat end just wider than the strap.
 */
const cushion: Template<'case'> = (props) => {
  const { layout } = props.ctx;
  const R = layout.caseRadius;
  const half = layout.lugToLug / 2;
  const endX = layout.lugWidth / 2 + 2.4;
  const body = [
    `M ${f(R)} 0`,
    `C ${f(R)} ${f(-half * 0.62)} ${f(endX + (R - endX) * 0.55)} ${f(-half)} ${f(endX)} ${f(-half)}`,
    `L ${f(-endX)} ${f(-half)}`,
    `C ${f(-endX - (R - endX) * 0.55)} ${f(-half)} ${f(-R)} ${f(-half * 0.62)} ${f(-R)} 0`,
    `C ${f(-R)} ${f(half * 0.62)} ${f(-endX - (R - endX) * 0.55)} ${f(half)} ${f(-endX)} ${f(half)}`,
    `L ${f(endX)} ${f(half)}`,
    `C ${f(endX + (R - endX) * 0.55)} ${f(half)} ${f(R)} ${f(half * 0.62)} ${f(R)} 0 Z`,
  ].join(' ');
  return (
    <CaseBody
      {...props}
      silhouette={(fill) => ({
        shapes: [<path key="body" d={body} fill={fill} />],
        trim: { mirrors: [[1, 1]], edge: body, grain: vlines(-R, R, 0.5, -half, half) },
      })}
    />
  );
};

const sub: Template<'case'> = (props) => {
  const { layout } = props.ctx;
  const R = layout.caseRadius;
  const guards = choice(props.params, 'guards', ['yes', 'no'], 'yes') === 'yes';
  return (
    <CaseBody
      {...props}
      silhouette={(fill) => ({
        shapes: [
          <circle key="body" r={R} fill={fill} />,
          ...lugs(fill, R, layout.lugWidth, layout.lugToLug, 2.6, 1.8, 'lug'),
          ...(guards ? crownGuards(fill, R, layout.crownAngle, 1.7, props.ctx.parts.crown?.diameter ?? 7) : []),
        ],
        trim: lugTrim(R, layout.lugWidth, layout.lugToLug, 2.6, 1.8, layout.springBarY),
      })}
    />
  );
};

/** Dress case with slim lugs. `bezel` draws a bezel that is part of the case (bezel seat `integral`). */
const fluted: Template<'case'> = (props) => {
  const { layout, id } = props.ctx;
  const R = layout.caseRadius;
  const bezel = choice(props.params, 'bezel', ['none', 'smooth', 'fluted'], 'none');
  const metal = color(props.params, 'metal', '#d4d7db');
  const inner = layout.bezelInnerRadius;
  const outer = layout.bezelOuterRadius;
  return (
    <CaseBody
      {...props}
      silhouette={(fill) => ({
        shapes: [
          <circle key="body" r={R} fill={fill} />,
          ...lugs(fill, R, layout.lugWidth, layout.lugToLug, 2.3, 1.6, 'lug'),
        ],
        trim: lugTrim(R, layout.lugWidth, layout.lugToLug, 2.3, 1.6, layout.springBarY),
        // The case top shows between the opening and the edge, or between the built-in bezel and the edge.
        rings: [bezel === 'none' ? inner + 0.2 : outer + 0.2, R - 0.2],
        detail:
          bezel === 'fluted' ? (
            <FlutedRing inner={inner} outer={outer} metal={lighten(metal, 0.15)} />
          ) : bezel === 'smooth' ? (
            <SmoothRing inner={inner} outer={outer} metal={metal} gid={id(`case-bezel-${props.part.id}`)} />
          ) : undefined,
      })}
    />
  );
};

const octagon: Template<'case'> = (props) => {
  const { layout, id } = props.ctx;
  const { part, params } = props;
  const R = layout.caseRadius;
  const half = layout.lugToLug / 2;
  const metal = color(params, 'metal', '#c9ccd1');
  const polishId = id(`oct-polish-${part.id}`);
  const hexId = id(`oct-screw-${part.id}`);

  // Integral octagonal bezel, flat side at 12.
  const bezelR = R * 0.93;
  const octagonPts = range(8)
    .map((i) => polar(bezelR, 22.5 + i * 45))
    .map(([x, y]) => `${f(x)},${f(y)}`)
    .join(' ');
  // Screws sit midway between the crystal opening and the octagon's corners.
  const screwR = (bezelR + layout.crystalRadius + 0.55) / 2;
  // Cushion-shaped body: flanks curve in from full width at 3/9 to the bracelet width, ending just past
  // the bezel's flat. The first bracelet links (drawn underneath) make up the rest of the lug-to-lug.
  const endY = Math.min(half, bezelR * Math.cos(22.5 * (Math.PI / 180)) + 2.6);
  const endX = Math.min(R * 0.66, layout.lugWidth / 2);
  const body = [
    `M ${f(R)} 0`,
    `C ${f(R)} ${f(-endY * 0.55)} ${f(endX + (R - endX) * 0.35)} ${f(-endY * 0.92)} ${f(endX)} ${f(-endY)}`,
    `L ${f(-endX)} ${f(-endY)}`,
    `C ${f(-endX - (R - endX) * 0.35)} ${f(-endY * 0.92)} ${f(-R)} ${f(-endY * 0.55)} ${f(-R)} 0`,
    `C ${f(-R)} ${f(endY * 0.55)} ${f(-endX - (R - endX) * 0.35)} ${f(endY * 0.92)} ${f(-endX)} ${f(endY)}`,
    `L ${f(endX)} ${f(endY)}`,
    `C ${f(endX + (R - endX) * 0.35)} ${f(endY * 0.92)} ${f(R)} ${f(endY * 0.55)} ${f(R)} 0 Z`,
  ].join(' ');

  return (
    <g>
      <defs>
        <MetalGradient id={polishId} base={metal} finish="polished" r={R} />
      </defs>
      <CaseBody
        {...props}
        silhouette={(fill) => ({
          shapes: [<path key="body" fill={fill} d={body} />],
          trim: { mirrors: [[1, 1]], edge: body, grain: vlines(-R, R, 0.5, -endY, endY) },
          detail: (
            <g>
              <polygon points={octagonPts} fill={url(polishId)} stroke={darken(metal, 0.5)} strokeWidth={0.25} />
              <circle r={layout.crystalRadius + 0.55} fill={lighten(metal, 0.35)} />
              <symbol id={hexId} viewBox="-1 -1 2 2">
                <polygon points="1,0 0.5,0.866 -0.5,0.866 -1,0 -0.5,-0.866 0.5,-0.866" fill={lighten(metal, 0.5)} stroke={darken(metal, 0.5)} strokeWidth={0.15} />
                <line x1={-0.55} y1={0} x2={0.55} y2={0} stroke={darken(metal, 0.55)} strokeWidth={0.2} />
              </symbol>
              {range(8).map((i) => {
                const [x, y] = polar(screwR, 22.5 + i * 45);
                return <use key={i} href={`#${hexId}`} x={f(x - 0.75)} y={f(y - 0.75)} width={1.5} height={1.5} />;
              })}
            </g>
          ),
        })}
      />
    </g>
  );
};

export const caseTemplates: Record<string, Template<'case'>> = {
  'case/diver': diver,
  'case/sub': sub,
  'case/fluted': fluted,
  'case/octagon': octagon,
  'case/cushion': cushion,
};
