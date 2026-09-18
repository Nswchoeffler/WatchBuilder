import { FONT, annulus, choice, color, darken, f, lighten, optionalColor, polar, range, sector } from '../util';
import { MetalGradient, url, type Template } from './common';

// Bezels, bezel inserts, chapter rings and crowns.

const coinEdge: Template<'bezel'> = ({ part, params, ctx }) => {
  const { layout, id } = ctx;
  const metal = color(params, 'metal', '#c9ccd1');
  const gid = id(`bezel-${part.id}`);
  const inner = part.insert ? part.insert.outerDiameter / 2 - 0.25 : layout.bezelInnerRadius;
  const outer = layout.bezelOuterRadius;
  return (
    <g>
      <defs>
        <MetalGradient id={gid} base={metal} finish="brushed" r={outer} />
      </defs>
      <path d={annulus(inner, outer)} fill={url(gid)} fillRule="evenodd" stroke={darken(metal, 0.5)} strokeWidth={0.2} />
      {/* Coin-edge grip. */}
      <g stroke={darken(metal, 0.45)} strokeWidth={0.12}>
        {range(120).map((i) => {
          const [x1, y1] = polar(outer - 0.55, i * 3);
          const [x2, y2] = polar(outer, i * 3);
          return <line key={i} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} />;
        })}
      </g>
    </g>
  );
};

const flutedBezel: Template<'bezel'> = ({ params, ctx }) => {
  const { layout } = ctx;
  const metal = color(params, 'metal', '#e1e3e6');
  const inner = layout.bezelInnerRadius;
  const outer = layout.bezelOuterRadius;
  const n = 60;
  return (
    <g>
      <path d={annulus(inner, outer)} fill={metal} fillRule="evenodd" />
      {range(n).map((i) => {
        const a = (i * 360) / n;
        const w = 360 / n;
        const light = Math.cos(((a - 315) * Math.PI) / 180) * 0.5 + 0.5;
        return (
          <g key={i}>
            <path d={sector(inner, outer, a, a + w / 2)} fill={lighten(metal, 0.15 + 0.55 * light)} />
            <path d={sector(inner, outer, a + w / 2, a + w)} fill={darken(metal, 0.2 + 0.35 * (1 - light))} />
          </g>
        );
      })}
      <path d={annulus(inner, outer)} fill="none" stroke={darken(metal, 0.5)} strokeWidth={0.2} />
    </g>
  );
};

/** Plain polished bezel with no grip and no insert seat markings. */
const smoothBezel: Template<'bezel'> = ({ part, params, ctx }) => {
  const { layout, id } = ctx;
  const metal = color(params, 'metal', '#d4d7db');
  const gid = id(`bezel-${part.id}`);
  const inner = part.insert ? part.insert.outerDiameter / 2 - 0.25 : layout.bezelInnerRadius;
  const outer = layout.bezelOuterRadius;
  return (
    <g>
      <defs>
        <MetalGradient id={gid} base={metal} finish="polished" r={outer} />
      </defs>
      <path d={annulus(inner, outer)} fill={url(gid)} fillRule="evenodd" stroke={darken(metal, 0.5)} strokeWidth={0.18} />
      {/* A single highlight ring reads as the crown of the dome. */}
      <circle r={f(inner + (outer - inner) * 0.55)} fill="none" stroke={lighten(metal, 0.5)} strokeWidth={0.18} opacity={0.5} />
    </g>
  );
};

export const bezelTemplates: Record<string, Template<'bezel'>> = {
  'bezel/coin-edge': coinEdge,
  'bezel/fluted': flutedBezel,
  'bezel/smooth': smoothBezel,
};

// ---------------------------------------------------------------- inserts

function InsertBase({ inner, outer, fill, sloped, ceramic, gid }: { inner: number; outer: number; fill: React.ReactNode; sloped: boolean; ceramic: boolean; gid: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={gid} gradientUnits="userSpaceOnUse" r={outer}>
          <stop offset={inner / outer} stopColor="#000" stopOpacity={sloped ? 0.35 : 0.12} />
          <stop offset={(inner + (outer - inner) * 0.35) / outer} stopColor="#000" stopOpacity={0} />
          <stop offset={1} stopColor="#000" stopOpacity={0.15} />
        </radialGradient>
      </defs>
      {fill}
      <path d={annulus(inner, outer)} fill={url(gid)} fillRule="evenodd" />
      {ceramic && <path d={annulus(outer - 0.35, outer)} fill="#fff" opacity={0.08} fillRule="evenodd" />}
    </g>
  );
}

function Pip({ r, lume, ink }: { r: number; lume: string; ink: string }) {
  return (
    <g>
      <path d={`M 0 ${f(-r - 1.3)} L -1.25 ${f(-r + 0.9)} L 1.25 ${f(-r + 0.9)} Z`} fill={ink} />
      <circle cy={f(-r - 0.1)} r={0.55} fill={lume} stroke={darken(lume, 0.4)} strokeWidth={0.08} />
    </g>
  );
}

function Numeral({ r, angle, size, fill, children }: { r: number; angle: number; size: number; fill: string; children: string }) {
  const [x, y] = polar(r, angle);
  // Rotated radially (readable from outside at every position), like classic dive inserts.
  return (
    <text
      x={f(x)}
      y={f(y)}
      transform={`rotate(${f(angle)} ${f(x)} ${f(y)})`}
      fontFamily={FONT}
      fontWeight={600}
      fontSize={size}
      fill={fill}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {children}
    </text>
  );
}

const diveInsert: Template<'bezelInsert'> = ({ part, params, ctx }) => {
  const inner = part.innerDiameter / 2;
  const outer = part.outerDiameter / 2;
  const primary = color(params, 'primary', '#141518');
  const ink = color(params, 'secondary', '#e6e7e9');
  const lume = optionalColor(params, 'lume', '#e8f0d8') ?? ink;
  const band = outer - inner;
  const mid = inner + band * 0.5;
  return (
    <g>
      <InsertBase
        inner={inner}
        outer={outer}
        sloped={part.profile === 'sloped'}
        ceramic={choice(params, 'finish', ['ceramic', 'aluminium'], 'aluminium') === 'ceramic'}
        gid={ctx.id(`insert-shade-${part.id}`)}
        fill={<path d={annulus(inner, outer)} fill={primary} fillRule="evenodd" />}
      />
      <g stroke={ink} strokeLinecap="butt">
        {range(60).map((m) => {
          if (m === 0 || (m % 10 === 0 && m > 0)) return null;
          const major = m % 5 === 0;
          if (!major && m > 15) return null;
          const [x1, y1] = polar(outer - band * (major ? 0.62 : 0.4), m * 6);
          const [x2, y2] = polar(outer - band * 0.12, m * 6);
          return <line key={m} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} strokeWidth={major ? 0.55 : 0.18} />;
        })}
      </g>
      {[10, 20, 30, 40, 50].map((m) => (
        <Numeral key={m} r={mid} angle={m * 6} size={band * 0.52} fill={ink}>
          {String(m)}
        </Numeral>
      ))}
      <Pip r={mid} lume={lume} ink={ink} />
    </g>
  );
};

const gmtInsert: Template<'bezelInsert'> = ({ part, params, ctx }) => {
  const inner = part.innerDiameter / 2;
  const outer = part.outerDiameter / 2;
  const day = color(params, 'primary', '#b3262b');
  const night = color(params, 'secondary', '#1d3a78');
  const ink = color(params, 'accent', '#e6e7e9');
  const band = outer - inner;
  const mid = inner + band * 0.5;
  return (
    <g>
      <InsertBase
        inner={inner}
        outer={outer}
        sloped={part.profile === 'sloped'}
        ceramic={choice(params, 'finish', ['ceramic', 'aluminium'], 'aluminium') === 'ceramic'}
        gid={ctx.id(`insert-shade-${part.id}`)}
        fill={
          <g>
            <path d={sector(inner, outer, 270, 450)} fill={day} />
            <path d={sector(inner, outer, 90, 270)} fill={night} />
          </g>
        }
      />
      {range(11).map((i) => {
        const hour = (i + 1) * 2;
        return (
          <Numeral key={hour} r={mid} angle={hour * 15} size={band * 0.5} fill={ink}>
            {String(hour)}
          </Numeral>
        );
      })}
      {range(12).map((i) => {
        const a = i * 30 + 15;
        const [x1, y1] = polar(mid - band * 0.12, a);
        const [x2, y2] = polar(mid + band * 0.12, a);
        return <line key={`t${i}`} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} stroke={ink} strokeWidth={0.5} strokeLinecap="round" />;
      })}
      <Pip r={mid} lume={ink} ink={ink} />
    </g>
  );
};

/** Shared shell for the plainer scales: base ring, then whatever the scale draws on it. */
const scaleInsert =
  (draw: (g: { inner: number; outer: number; band: number; mid: number; ink: string; lume: string | null }) => React.ReactNode): Template<'bezelInsert'> =>
  function ScaleInsert({ part, params, ctx }) {
    const inner = part.innerDiameter / 2;
    const outer = part.outerDiameter / 2;
    const primary = color(params, 'primary', '#141518');
    const ink = color(params, 'secondary', '#e6e7e9');
    const band = outer - inner;
    return (
      <g>
        <InsertBase
          inner={inner}
          outer={outer}
          sloped={part.profile === 'sloped'}
          ceramic={choice(params, 'finish', ['ceramic', 'aluminium'], 'aluminium') === 'ceramic'}
          gid={ctx.id(`insert-shade-${part.id}`)}
          fill={<path d={annulus(inner, outer)} fill={primary} fillRule="evenodd" />}
        />
        {draw({ inner, outer, band, mid: inner + band * 0.5, ink, lume: optionalColor(params, 'lume', null) })}
      </g>
    );
  };

/** Units-per-hour scale: crowded near 12, opening out towards 40 seconds. */
const TACHY_VALUES = [60, 70, 80, 90, 100, 120, 150, 200, 300, 400];

// 60 units/hour falls at 12 o'clock, so the scale reads from there clockwise.
const tachymeterInsert = scaleInsert(({ mid, outer, band, ink }) => (
  <g>
    <g stroke={ink} strokeLinecap="butt" opacity={0.8}>
      {range(60).map((m) => {
        if (m % 5 !== 0) return null;
        const [x1, y1] = polar(outer - band * 0.3, m * 6);
        const [x2, y2] = polar(outer - band * 0.12, m * 6);
        return <line key={m} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} strokeWidth={0.16} />;
      })}
    </g>
    {TACHY_VALUES.map((v) => (
      <Numeral key={v} r={mid} angle={((3600 / v) * 6) % 360} size={band * 0.42} fill={ink}>
        {String(v)}
      </Numeral>
    ))}
  </g>
));

/** Count-down scale: 60 at 12, running backwards. */
const countdownInsert = scaleInsert(({ mid, outer, band, ink, lume }) => (
  <g>
    <g stroke={ink} strokeLinecap="butt">
      {range(60).map((m) => {
        if (m % 5 === 0) return null;
        const [x1, y1] = polar(outer - band * 0.38, m * 6);
        const [x2, y2] = polar(outer - band * 0.12, m * 6);
        return <line key={m} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} strokeWidth={0.16} />;
      })}
    </g>
    {[55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5].map((v, i) => (
      <Numeral key={v} r={mid} angle={(i + 1) * 30} size={band * 0.46} fill={ink}>
        {String(v)}
      </Numeral>
    ))}
    <Pip r={mid} lume={lume ?? ink} ink={ink} />
  </g>
));

const COMPASS_POINTS: [string, number][] = [
  ['N', 0],
  ['NE', 45],
  ['E', 90],
  ['SE', 135],
  ['S', 180],
  ['SW', 225],
  ['W', 270],
  ['NW', 315],
];

const compassInsert = scaleInsert(({ mid, outer, band, ink }) => (
  <g>
    <g stroke={ink} strokeLinecap="butt">
      {range(36).map((i) => {
        const major = i % 3 === 0;
        const [x1, y1] = polar(outer - band * (major ? 0.5 : 0.32), i * 10);
        const [x2, y2] = polar(outer - band * 0.12, i * 10);
        return <line key={i} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} strokeWidth={major ? 0.3 : 0.14} />;
      })}
    </g>
    {COMPASS_POINTS.map(([label, angle]) => (
      <Numeral key={label} r={mid - band * 0.08} angle={angle} size={band * (label.length > 1 ? 0.34 : 0.46)} fill={ink}>
        {label}
      </Numeral>
    ))}
  </g>
));

/** Nothing but the ring: a plain coloured or steel insert. */
const plainInsert = scaleInsert(() => null);

export const insertTemplates: Record<string, Template<'bezelInsert'>> = {
  'bezelInsert/dive': diveInsert,
  'bezelInsert/gmt': gmtInsert,
  'bezelInsert/tachymeter': tachymeterInsert,
  'bezelInsert/countdown': countdownInsert,
  'bezelInsert/compass': compassInsert,
  'bezelInsert/plain': plainInsert,
};

// ---------------------------------------------------------------- chapter rings

const minutesRing: Template<'chapterRing'> = ({ part, params }) => {
  const inner = part.innerDiameter / 2;
  const outer = part.outerDiameter / 2;
  const base = color(params, 'color', '#c9ccd1');
  const marks = color(params, 'marks', '#141518');
  const band = outer - inner;
  return (
    <g>
      <path d={annulus(inner, outer)} fill={base} fillRule="evenodd" />
      <path d={annulus(inner, inner + band * 0.35)} fill="#000" opacity={0.12} fillRule="evenodd" />
      <g stroke={marks}>
        {range(60).map((m) => {
          const major = m % 5 === 0;
          const [x1, y1] = polar(inner + 0.1, m * 6);
          const [x2, y2] = polar(inner + band * (major ? 0.75 : 0.45), m * 6);
          return <line key={m} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} strokeWidth={major ? 0.28 : 0.12} />;
        })}
      </g>
    </g>
  );
};

const plainRing: Template<'chapterRing'> = ({ part, params, ctx }) => {
  const inner = part.innerDiameter / 2;
  const outer = part.outerDiameter / 2;
  const base = color(params, 'color', '#d4d7db');
  const gid = ctx.id(`ring-${part.id}`);
  return (
    <g>
      <defs>
        <MetalGradient id={gid} base={base} finish="polished" r={outer} />
      </defs>
      <path d={annulus(inner, outer)} fill={url(gid)} fillRule="evenodd" />
      <circle r={inner} fill="none" stroke={darken(base, 0.5)} strokeWidth={0.1} />
    </g>
  );
};

export const chapterRingTemplates: Record<string, Template<'chapterRing'>> = {
  'chapterRing/minutes': minutesRing,
  'chapterRing/plain': plainRing,
};

// ---------------------------------------------------------------- crowns
// Drawn pointing along +x from the case edge; the scene rotates it to the crown angle.

function CrownShape({ r, d, metal, grooves, gid, rounded }: { r: number; d: number; metal: string; grooves: number; gid: string; rounded: boolean }) {
  const len = 2.8;
  const x0 = r - 0.4;
  return (
    <g>
      <defs>
        <linearGradient id={gid} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor={lighten(metal, 0.5)} />
          <stop offset={0.45} stopColor={metal} />
          <stop offset={1} stopColor={darken(metal, 0.45)} />
        </linearGradient>
      </defs>
      <rect x={f(x0)} y={f(-d * 0.22)} width={1.2} height={f(d * 0.44)} fill={darken(metal, 0.25)} />
      <rect x={f(x0 + 0.9)} y={f(-d / 2)} width={len} height={d} rx={rounded ? 0.9 : 0.4} fill={url(gid)} stroke={darken(metal, 0.55)} strokeWidth={0.15} />
      <g stroke={darken(metal, 0.5)} strokeWidth={0.07}>
        {range(grooves).map((i) => {
          const y = -d / 2 + ((i + 1) * d) / (grooves + 1);
          return <line key={i} x1={f(x0 + 1.05)} y1={f(y)} x2={f(x0 + 0.9 + len - 0.25)} y2={f(y)} />;
        })}
      </g>
    </g>
  );
}

const knurled: Template<'crown'> = ({ part, params, ctx }) => (
  <CrownShape r={ctx.layout.caseRadius} d={part.diameter} metal={color(params, 'metal', '#c9ccd1')} grooves={9} gid={ctx.id(`crown-${part.id}`)} rounded={false} />
);

const flutedCrown: Template<'crown'> = ({ part, params, ctx }) => (
  <CrownShape r={ctx.layout.caseRadius} d={part.diameter} metal={color(params, 'metal', '#e1e3e6')} grooves={14} gid={ctx.id(`crown-${part.id}`)} rounded />
);

export const crownTemplates: Record<string, Template<'crown'>> = {
  'crown/knurled': knurled,
  'crown/fluted': flutedCrown,
  'crown/hex-guard': knurled,
};
