import type { ReactNode } from 'react';
import { choice, color, darken, f, lighten, polar, range } from '../util';
import { MetalGradient, url, type MetalFinish, type Template, type TemplateProps } from './common';

// Case templates. Drawn 12:00-up at true size; the crown is a separate layer.
// Shapes are drawn twice: a dark outline pass, then a fill pass on top, so overlapping
// pieces (body + lugs) read as one silhouette.

interface Silhouette {
  shapes: ReactNode[];
  /** Extra detail drawn above the body (bevels, integral bezel…). */
  detail?: ReactNode;
}

function CaseBody({ ctx, part, params, silhouette }: TemplateProps<'case'> & { silhouette: (fill: string) => Silhouette }) {
  const metal = color(params, 'metal', '#c9ccd1');
  const finish = choice<MetalFinish>(params, 'finish', ['brushed', 'polished', 'matte'], 'brushed');
  const gid = ctx.id(`case-metal-${part.id}`);
  const outline = silhouette(darken(metal, 0.55));
  const body = silhouette(url(gid));
  const { layout } = ctx;
  const flange = ctx.id(`case-flange-${part.id}`);
  const rf = layout.bezelInnerRadius + 0.05;
  return (
    <g>
      <defs>
        <MetalGradient id={gid} base={metal} finish={finish} r={layout.lugToLug / 2} />
        {/* Case opening: inner flange sloping down to the dial, darker towards the centre. */}
        <radialGradient id={flange} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={rf}>
          <stop offset={0.8} stopColor={darken(metal, 0.7)} />
          <stop offset={1} stopColor={darken(metal, 0.35)} />
        </radialGradient>
      </defs>
      <g stroke={darken(metal, 0.55)} strokeWidth={0.35} strokeLinejoin="round">
        {outline.shapes}
      </g>
      <g>{body.shapes}</g>
      {body.detail}
      <circle r={rf} fill={url(flange)} />
    </g>
  );
}

/**
 * Four lugs. Each has a straight inner edge at the lug width and an outer edge that flares into
 * the case (`flare` × thickness at the root), with a rounded tip. Drawn for the top-right lug and mirrored.
 */
function lugs(fill: string, R: number, lugWidth: number, lugToLug: number, t: number, flare: number, key: string) {
  const h = lugToLug / 2;
  const xi = lugWidth / 2;
  const xo = xi + t;
  const rootY = -R * 0.55;
  const tip = Math.min(1.1, t / 2);
  const d = [
    `M ${f(xi)} ${f(rootY)}`,
    `L ${f(xi)} ${f(-h + tip)}`,
    `Q ${f(xi)} ${f(-h)} ${f(xi + tip)} ${f(-h)}`,
    `L ${f(xo - tip)} ${f(-h)}`,
    `Q ${f(xo)} ${f(-h)} ${f(xo)} ${f(-h + tip)}`,
    `C ${f(xo)} ${f(-R * 0.95)} ${f(xi + t * flare)} ${f(-R * 0.85)} ${f(xi + t * flare)} ${f(rootY)}`,
    'Z',
  ].join(' ');
  return [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ].map(([sx, sy]) => <path key={`${key}${sx}${sy}`} d={d} fill={fill} transform={`scale(${sx} ${sy})`} />);
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
  return (
    <CaseBody
      {...props}
      silhouette={(fill) => ({
        shapes: [
          <circle key="body" r={R} fill={fill} />,
          ...lugs(fill, R, layout.lugWidth, layout.lugToLug, 3.2, 2.2, 'lug'),
          ...crownGuards(fill, R, layout.crownAngle, 2.3, props.ctx.parts.crown?.diameter ?? 6.5),
        ],
      })}
    />
  );
};

const sub: Template<'case'> = (props) => {
  const { layout } = props.ctx;
  const R = layout.caseRadius;
  const metal = color(props.params, 'metal', '#d4d7db');
  return (
    <CaseBody
      {...props}
      silhouette={(fill) => ({
        shapes: [
          <circle key="body" r={R} fill={fill} />,
          ...lugs(fill, R, layout.lugWidth, layout.lugToLug, 2.6, 1.8, 'lug'),
          ...crownGuards(fill, R, layout.crownAngle, 1.7, props.ctx.parts.crown?.diameter ?? 7),
        ],
        detail: (
          // Polished lug bevels.
          <g stroke={lighten(metal, 0.7)} strokeWidth={0.22} opacity={0.8}>
            {[-1, 1].flatMap((sx) =>
              [-1, 1].map((sy) => {
                const x = sx * (layout.lugWidth / 2 + 1.3);
                return <line key={`${sx}${sy}`} x1={x} y1={sy * R * 0.93} x2={x} y2={sy * (layout.lugToLug / 2 - 0.8)} />;
              }),
            )}
          </g>
        ),
      })}
    />
  );
};

const fluted: Template<'case'> = (props) => {
  const { layout } = props.ctx;
  const R = layout.caseRadius;
  return (
    <CaseBody
      {...props}
      silhouette={(fill) => ({
        shapes: [
          <circle key="body" r={R} fill={fill} />,
          ...lugs(fill, R, layout.lugWidth, layout.lugToLug, 2.3, 1.6, 'lug'),
        ],
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
};
