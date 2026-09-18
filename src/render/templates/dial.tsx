import type { ReactNode } from 'react';
import type { Dial } from '../../domain/schemas';
import { FONT, angularDistanceDeg, choice, color, darken, f, inkOn, lighten, optionalColor, polar, range, textLines, type Params } from '../util';
import { DropShadow, url, type Template, type TemplateProps } from './common';

// Parametric dial generator. Everything is derived from the dial diameter and window positions,
// so a 28.5mm diver dial and a 30.8mm tapisserie dial share the same code.

type Finish = 'matte' | 'gloss' | 'sunburst' | 'tapisserie' | 'fume';
type Markers = 'dots-bars' | 'mercedes-classic' | 'batons' | 'roman' | 'arabic' | 'explorer' | 'california' | 'sector' | 'pilot';

const FINISHES = ['matte', 'gloss', 'sunburst', 'tapisserie', 'fume'] as const;
const MARKERS = ['dots-bars', 'mercedes-classic', 'batons', 'roman', 'arabic', 'explorer', 'california', 'sector', 'pilot'] as const;

/** Radius (as a fraction of dial radius) where date/day windows sit. */
export const DATE_RADIUS = 0.76;

interface Blocked {
  angle: number;
  halfWidth: number;
}

/** Hour positions covered by windows/apertures, so markers there are omitted. */
function blockedAngles(dial: Dial): Blocked[] {
  const out: Blocked[] = [];
  if (dial.dateWindow) out.push({ angle: dial.dateWindow.angle, halfWidth: 16 });
  if (dial.dayWindow) out.push({ angle: dial.dayWindow.angle, halfWidth: 16 });
  if (dial.openHeartAperture) out.push({ angle: dial.openHeartAperture.angle, halfWidth: 22 });
  return out;
}

const isBlocked = (angle: number, blocked: Blocked[]) => blocked.some((b) => angularDistanceDeg(angle, b.angle) < b.halfWidth);

// ---------------------------------------------------------------- finishes

function Finish({ r, base, finish, id }: { r: number; base: string; finish: Finish; id: (n: string) => string }) {
  const vignette = id('dial-vignette');
  const layers: ReactNode[] = [<circle key="base" r={r} fill={base} />];

  if (finish === 'sunburst') {
    const n = 120;
    layers.push(
      <g key="sunburst">
        {range(n).map((i) => {
          const a = (i * 360) / n;
          const v = Math.cos(((2 * (a - 35)) * Math.PI) / 180);
          const [x1, y1] = polar(r, a);
          const [x2, y2] = polar(r, a + 360 / n + 0.4);
          return <path key={i} d={`M 0 0 L ${f(x1)} ${f(y1)} L ${f(x2)} ${f(y2)} Z`} fill={v > 0 ? '#fff' : '#000'} opacity={f(Math.abs(v) * 0.2)} />;
        })}
      </g>,
    );
  }

  if (finish === 'tapisserie') {
    const pid = id('tapisserie');
    const cell = 0.95;
    layers.push(
      <g key="tapisserie">
        <defs>
          <pattern id={pid} width={cell} height={cell} patternUnits="userSpaceOnUse" x={-cell / 2} y={-cell / 2}>
            <rect width={cell} height={cell} fill={darken(base, 0.45)} />
            <rect x={0.12} y={0.12} width={cell - 0.24} height={cell - 0.24} fill={lighten(base, 0.08)} />
            <path d={`M 0.12 0.12 L ${cell - 0.12} 0.12 L ${cell / 2} ${cell / 2} Z`} fill={lighten(base, 0.25)} />
            <path d={`M 0.12 ${cell - 0.12} L ${cell - 0.12} ${cell - 0.12} L ${cell / 2} ${cell / 2} Z`} fill={darken(base, 0.2)} />
          </pattern>
        </defs>
        <circle r={r} fill={url(pid)} />
      </g>,
    );
  }

  // Fumé: bright at the centre, smoked almost to black at the rim.
  if (finish === 'fume') {
    const fume = id('dial-fume');
    layers.push(
      <g key="fume">
        <defs>
          <radialGradient id={fume} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={r}>
            <stop offset={0} stopColor={lighten(base, 0.3)} />
            <stop offset={0.45} stopColor={base} />
            <stop offset={1} stopColor={darken(base, 0.78)} />
          </radialGradient>
        </defs>
        <circle r={r} fill={url(fume)} />
      </g>,
    );
  }

  layers.push(
    <g key="vignette">
      <defs>
        {/* No focal point: an offset fx/fy produces a visible cone artifact in some renderers. */}
        <radialGradient id={vignette} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={r}>
          <stop offset={0} stopColor="#fff" stopOpacity={finish === 'gloss' ? 0.14 : 0.04} />
          <stop offset={0.7} stopColor="#000" stopOpacity={0} />
          <stop offset={1} stopColor="#000" stopOpacity={finish === 'matte' ? 0.28 : finish === 'fume' ? 0 : 0.2} />
        </radialGradient>
      </defs>
      <circle r={r} fill={url(vignette)} />
    </g>,
  );
  return <>{layers}</>;
}

// ---------------------------------------------------------------- markers

interface MarkerStyle {
  r: number;
  lume: string | null;
  metal: string;
  ink: string;
  blocked: Blocked[];
}

function LumePlot({ children, lume, metal, width = 0.2 }: { children: (fill: string) => ReactNode; lume: string | null; metal: string; width?: number }) {
  return (
    <g fill={lume ?? metal} stroke={metal} strokeWidth={width} strokeLinejoin="round">
      {children(lume ?? metal)}
    </g>
  );
}

function Triangle12({ r, inner, outer, base }: { r: number; inner: number; outer: number; base: number }) {
  return <path d={`M ${f(-base / 2)} ${f(-r * outer)} L ${f(base / 2)} ${f(-r * outer)} L 0 ${f(-r * inner)} Z`} />;
}

function Bar({ r, angle, inner, outer, width }: { r: number; angle: number; inner: number; outer: number; width: number }) {
  return <rect x={f(-width / 2)} y={f(-r * outer)} width={width} height={f(r * (outer - inner))} rx={0.15} transform={`rotate(${f(angle)})`} />;
}

function DotsBars({ r, lume, metal, blocked, mercedes }: MarkerStyle & { mercedes: boolean }) {
  const dotR = r * (mercedes ? 0.072 : 0.085);
  const rDot = r * 0.79;
  return (
    <LumePlot lume={lume} metal={metal} width={mercedes ? 0.28 : 0.18}>
      {() =>
        range(12).map((h) => {
          const angle = h * 30;
          if (isBlocked(angle, blocked)) return null;
          if (h === 0) return <Triangle12 key={h} r={r} inner={0.64} outer={0.9} base={r * 0.26} />;
          if (h % 3 === 0) return <Bar key={h} r={r} angle={angle} inner={mercedes ? 0.66 : 0.64} outer={0.9} width={r * (mercedes ? 0.1 : 0.13)} />;
          const [x, y] = polar(rDot, angle);
          return <circle key={h} cx={f(x)} cy={f(y)} r={f(dotR)} />;
        })
      }
    </LumePlot>
  );
}

function Batons({ r, lume, metal, blocked }: MarkerStyle) {
  const w = r * 0.075;
  return (
    <g>
      {range(12).map((h) => {
        const angle = h * 30;
        if (isBlocked(angle, blocked)) return null;
        const offsets = h === 0 ? [-w * 0.8, w * 0.8] : [0];
        return offsets.map((dx) => (
          <g key={`${h}${dx}`} transform={`rotate(${angle}) translate(${f(dx)} 0)`}>
            <rect x={f(-w / 2)} y={f(-r * 0.9)} width={f(w)} height={f(r * 0.22)} rx={0.1} fill={metal} stroke={darken(metal, 0.45)} strokeWidth={0.08} />
            {lume && <rect x={f(-w * 0.2)} y={f(-r * 0.88)} width={f(w * 0.4)} height={f(r * 0.18)} fill={lume} />}
          </g>
        ));
      })}
    </g>
  );
}

const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

function Numerals({ r, ink, lume, blocked, style }: MarkerStyle & { style: 'roman' | 'arabic' }) {
  return (
    <g fontFamily={FONT} textAnchor="middle" dominantBaseline="central">
      {range(12).map((h) => {
        const angle = h * 30;
        if (isBlocked(angle, blocked)) return null;
        if (style === 'arabic' && h % 3 !== 0) {
          const [x1, y1] = polar(r * 0.8, angle);
          const [x2, y2] = polar(r * 0.9, angle);
          return <line key={h} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} stroke={lume ?? ink} strokeWidth={r * 0.05} strokeLinecap="round" />;
        }
        const label = style === 'roman' ? ROMAN[h]! : String(h === 0 ? 12 : h);
        const [x, y] = polar(r * (style === 'roman' ? 0.75 : 0.72), angle);
        return (
          <text
            key={h}
            x={f(x)}
            y={f(y)}
            fontSize={f(r * (style === 'roman' ? 0.13 : 0.24))}
            fontWeight={style === 'roman' ? 400 : 700}
            fill={style === 'arabic' ? (lume ?? ink) : ink}
            stroke={style === 'arabic' ? darken(lume ?? ink, 0.6) : 'none'}
            strokeWidth={0.1}
          >
            {label}
          </text>
        );
      })}
    </g>
  );
}

/** 3-6-9 arabics with batons elsewhere and a triangle at 12. */
function Explorer({ r, lume, metal, ink, blocked }: MarkerStyle) {
  const w = r * 0.07;
  return (
    <g>
      <LumePlot lume={lume} metal={metal} width={0.18}>
        {() =>
          range(12)
            .filter((h) => h === 0 && !isBlocked(0, blocked))
            .map((h) => <Triangle12 key={h} r={r} inner={0.66} outer={0.92} base={r * 0.22} />)
        }
      </LumePlot>
      <g fontFamily={FONT} textAnchor="middle" dominantBaseline="central">
        {range(12).map((h) => {
          const angle = h * 30;
          if (h === 0 || isBlocked(angle, blocked)) return null;
          if (h % 3 === 0) {
            const [x, y] = polar(r * 0.75, angle);
            return (
              <text key={h} x={f(x)} y={f(y)} fontSize={f(r * 0.22)} fontWeight={700} fill={lume ?? ink} stroke={darken(lume ?? ink, 0.55)} strokeWidth={0.08}>
                {String(h)}
              </text>
            );
          }
          return (
            <g key={h} transform={`rotate(${f(angle)})`}>
              <rect x={f(-w / 2)} y={f(-r * 0.9)} width={f(w)} height={f(r * 0.17)} rx={0.08} fill={metal} stroke={darken(metal, 0.45)} strokeWidth={0.07} />
              {lume && <rect x={f(-w * 0.28)} y={f(-r * 0.88)} width={f(w * 0.56)} height={f(r * 0.13)} fill={lume} />}
            </g>
          );
        })}
      </g>
    </g>
  );
}

/** Roman numerals on the top half, arabics on the bottom, batons on the quarters between. */
function California({ r, lume, metal, ink, blocked }: MarkerStyle) {
  const w = r * 0.075;
  return (
    <g fontFamily={FONT} textAnchor="middle" dominantBaseline="central">
      {range(12).map((h) => {
        const angle = h * 30;
        if (isBlocked(angle, blocked)) return null;
        // 11–1 o'clock and 5–7 o'clock read as the two halves; 3 and 9 stay batons.
        const roman = h === 0 || h === 1 || h === 2 || h === 10 || h === 11;
        const arabic = h >= 4 && h <= 8;
        if (!roman && !arabic) {
          return (
            <g key={h} transform={`rotate(${f(angle)})`}>
              <rect x={f(-w / 2)} y={f(-r * 0.9)} width={f(w)} height={f(r * 0.2)} rx={0.1} fill={metal} stroke={darken(metal, 0.45)} strokeWidth={0.08} />
              {lume && <rect x={f(-w * 0.28)} y={f(-r * 0.88)} width={f(w * 0.56)} height={f(r * 0.16)} fill={lume} />}
            </g>
          );
        }
        const label = roman ? ROMAN[h]! : String(h);
        const [x, y] = polar(r * (roman ? 0.76 : 0.74), angle);
        return (
          <text key={h} x={f(x)} y={f(y)} fontSize={f(r * (roman ? 0.14 : 0.2))} fontWeight={roman ? 400 : 700} fill={ink}>
            {label}
          </text>
        );
      })}
    </g>
  );
}

/** Concentric sector rings with slim printed batons — a two-tone, instrument-dial look. */
function Sector({ r, lume, ink, blocked }: MarkerStyle) {
  return (
    <g>
      <g fill="none" stroke={ink} opacity={0.55}>
        <circle r={f(r * 0.66)} strokeWidth={0.1} />
        <circle r={f(r * 0.34)} strokeWidth={0.1} />
      </g>
      <g stroke={ink}>
        {range(12).map((h) => {
          const angle = h * 30;
          if (isBlocked(angle, blocked)) return null;
          const long = h % 3 === 0;
          const [x1, y1] = polar(r * 0.66, angle);
          const [x2, y2] = polar(r * (long ? 0.88 : 0.8), angle);
          return <line key={h} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} strokeWidth={f(r * (long ? 0.05 : 0.025))} strokeLinecap="butt" />;
        })}
      </g>
      {lume && (
        <g fill={lume}>
          {range(12).map((h) => {
            const angle = h * 30;
            if (h % 3 !== 0 || isBlocked(angle, blocked)) return null;
            const [x, y] = polar(r * 0.84, angle);
            return <circle key={h} cx={f(x)} cy={f(y)} r={f(r * 0.03)} />;
          })}
        </g>
      )}
    </g>
  );
}

/** Full set of large arabics with a triangle at 12: the flieger layout. */
function Pilot({ r, lume, metal, ink, blocked }: MarkerStyle) {
  const fill = lume ?? ink;
  return (
    <g>
      <LumePlot lume={lume} metal={metal} width={0.16}>
        {() => (isBlocked(0, blocked) ? null : <Triangle12 r={r} inner={0.62} outer={0.9} base={r * 0.2} />)}
      </LumePlot>
      <g fontFamily={FONT} textAnchor="middle" dominantBaseline="central" fill={fill}>
        {range(12).map((h) => {
          const angle = h * 30;
          if (h === 0 || isBlocked(angle, blocked)) return null;
          const [x, y] = polar(r * 0.72, angle);
          return (
            <text key={h} x={f(x)} y={f(y)} fontSize={f(r * 0.21)} fontWeight={700}>
              {String(h)}
            </text>
          );
        })}
      </g>
    </g>
  );
}

function MinuteTrack({ r, ink }: { r: number; ink: string }) {
  return (
    <g stroke={ink} opacity={0.75}>
      {range(60).map((m) => {
        const major = m % 5 === 0;
        const [x1, y1] = polar(r * (major ? 0.935 : 0.955), m * 6);
        const [x2, y2] = polar(r * 0.99, m * 6);
        return <line key={m} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} strokeWidth={major ? 0.18 : 0.08} />;
      })}
    </g>
  );
}

function GmtScale({ r, ink, blocked }: { r: number; ink: string; blocked: Blocked[] }) {
  return (
    <g fontFamily={FONT} fontSize={f(r * 0.065)} fill={ink} textAnchor="middle" dominantBaseline="central" opacity={0.9}>
      {range(12).map((i) => {
        const hour = (i + 1) * 2;
        const angle = hour * 15;
        if (isBlocked(angle, blocked)) return null;
        // Outer 24h track replaces the minute track.
        const [x, y] = polar(r * 0.955, angle);
        return (
          <text key={hour} x={f(x)} y={f(y)}>
            {String(hour)}
          </text>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------- windows & apertures

export interface WindowOptions {
  date: number;
  day: string;
  wheel: string;
  metal: string;
}

/** Date (and optional day) window in local frame: +x points radially outward. */
export function DateWindow({ dial, r, opts }: { dial: Dial; r: number; opts: WindowOptions }) {
  if (!dial.dateWindow) return null;
  const angle = dial.dateWindow.angle;
  const [cx, cy] = polar(r * DATE_RADIUS, angle);
  const withDay = dial.dayWindow !== null && angularDistanceDeg(dial.dayWindow.angle, angle) < 5;
  const h = r * 0.17;
  const dateW = r * 0.21;
  const dayW = r * 0.3;
  const x0 = -dateW / 2 - (withDay ? dayW : 0);
  const width = dateW + (withDay ? dayW : 0);
  const ink = inkOn(opts.wheel);
  return (
    <g transform={`translate(${f(cx)} ${f(cy)}) rotate(${f(angle - 90)})`} fontFamily={FONT} fontWeight={600} textAnchor="middle" dominantBaseline="central">
      <rect x={f(x0 - 0.15)} y={f(-h / 2 - 0.15)} width={f(width + 0.3)} height={f(h + 0.3)} rx={0.2} fill={opts.metal} stroke={darken(opts.metal, 0.5)} strokeWidth={0.1} />
      <rect x={f(x0)} y={f(-h / 2)} width={f(width)} height={f(h)} fill={opts.wheel} />
      <text x={0} y={0.05} fontSize={f(h * 0.72)} fill={ink}>
        {String(opts.date)}
      </text>
      {withDay && (
        <>
          <line x1={f(-dateW / 2)} y1={f(-h / 2)} x2={f(-dateW / 2)} y2={f(h / 2)} stroke={darken(opts.wheel, 0.35)} strokeWidth={0.08} />
          <text x={f(-dateW / 2 - dayW / 2)} y={0.05} fontSize={f(h * 0.6)} fill={opts.day === 'SUN' ? '#c0282d' : ink}>
            {opts.day}
          </text>
        </>
      )}
    </g>
  );
}

function OpenHeart({ dial, r, metal, id }: { dial: Dial; r: number; metal: string; id: (n: string) => string }) {
  if (!dial.openHeartAperture) return null;
  const [cx, cy] = polar(r * 0.52, dial.openHeartAperture.angle);
  const ar = r * 0.24;
  const gold = '#c9a45c';
  const clip = id('open-heart');
  const spiral = range(40)
    .map((i) => {
      const t = (i / 39) * Math.PI * 6;
      const rr = ar * 0.15 + (ar * 0.45 * i) / 39;
      return `${i === 0 ? 'M' : 'L'} ${f(Math.cos(t) * rr)} ${f(Math.sin(t) * rr)}`;
    })
    .join(' ');
  return (
    <g transform={`translate(${f(cx)} ${f(cy)})`}>
      <defs>
        <clipPath id={clip}>
          <circle r={ar} />
        </clipPath>
      </defs>
      <circle r={ar} fill="#17181a" />
      <g clipPath={url(clip)}>
        <path d="M -10 1.2 L 10 -0.8" stroke="#3a3b3e" strokeWidth={1.6} />
        <circle r={ar * 0.78} fill="none" stroke={gold} strokeWidth={ar * 0.13} />
        {range(3).map((i) => (
          <line key={i} x1={0} y1={0} x2={f(Math.cos((i * 120 + 20) * (Math.PI / 180)) * ar * 0.78)} y2={f(Math.sin((i * 120 + 20) * (Math.PI / 180)) * ar * 0.78)} stroke={gold} strokeWidth={ar * 0.09} />
        ))}
        <path d={spiral} fill="none" stroke="#6f8fb8" strokeWidth={0.07} />
        <circle r={ar * 0.12} fill="#b3262b" />
      </g>
      <circle r={ar} fill="none" stroke={metal} strokeWidth={0.35} />
    </g>
  );
}

function DialText({ r, ink, lines }: { r: number; ink: string; lines: string[] }) {
  if (lines.length === 0) return null;
  const size = r * 0.068;
  return (
    <g fontFamily={FONT} fontSize={f(size)} fill={ink} textAnchor="middle" dominantBaseline="central" letterSpacing={f(size * 0.08)}>
      <text x={0} y={f(-r * 0.42)} fontWeight={700}>
        {lines[0]}
      </text>
      {lines.slice(1).map((line, i) => (
        <text key={i} x={0} y={f(r * 0.38 + i * size * 1.5)}>
          {line}
        </text>
      ))}
    </g>
  );
}

// ---------------------------------------------------------------- template

export function dialStyle(params: Params) {
  const base = color(params, 'color', '#141518');
  return {
    base,
    finish: choice<Finish>(params, 'finish', FINISHES, 'matte'),
    markers: choice<Markers>(params, 'markers', MARKERS, 'dots-bars'),
    lume: optionalColor(params, 'lume', '#e8f0d8'),
    metal: color(params, 'metal', '#dcdde0'),
    ink: color(params, 'ink', inkOn(base)),
    wheel: color(params, 'dateWheel', '#f4f3ef'),
    text: textLines(params, 'text'),
  };
}

const generatedDial: Template<'dial'> = ({ part, params, ctx }: TemplateProps<'dial'>) => {
  const r = part.diameter / 2;
  const s = dialStyle(params);
  const blocked = blockedAngles(part);
  const shadow = ctx.id(`dial-shadow-${part.id}`);
  const marker: MarkerStyle = { r, lume: s.lume, metal: s.metal, ink: s.ink, blocked };

  return (
    <g>
      <defs>
        <DropShadow id={shadow} dx={0.12} dy={0.18} blur={0.12} opacity={0.5} />
      </defs>
      <Finish r={r} base={s.base} finish={s.finish} id={(n) => ctx.id(`${n}-${part.id}`)} />
      {part.gmtScale ? <GmtScale r={r} ink={s.ink} blocked={blocked} /> : <MinuteTrack r={r} ink={s.ink} />}
      <DialText r={r} ink={s.ink} lines={s.text} />
      <g filter={url(shadow)}>
        {(s.markers === 'dots-bars' || s.markers === 'mercedes-classic') && <DotsBars {...marker} mercedes={s.markers === 'mercedes-classic'} />}
        {s.markers === 'batons' && <Batons {...marker} />}
        {(s.markers === 'roman' || s.markers === 'arabic') && <Numerals {...marker} style={s.markers} />}
        {s.markers === 'explorer' && <Explorer {...marker} />}
        {s.markers === 'california' && <California {...marker} />}
        {s.markers === 'sector' && <Sector {...marker} />}
        {s.markers === 'pilot' && <Pilot {...marker} />}
        <DateWindow dial={part} r={r} opts={{ date: 17, day: 'SUN', wheel: s.wheel, metal: s.metal }} />
      </g>
      <OpenHeart dial={part} r={r} metal={s.metal} id={(n) => ctx.id(`${n}-${part.id}`)} />
    </g>
  );
};

export const dialTemplates: Record<string, Template<'dial'>> = {
  'dial/diver': generatedDial,
  'dial/sub': generatedDial,
  'dial/classic': generatedDial,
  'dial/gmt': generatedDial,
  'dial/tapisserie': generatedDial,
  'dial/field': generatedDial,
  'dial/explorer': generatedDial,
  'dial/california': generatedDial,
  'dial/sector': generatedDial,
  'dial/pilot': generatedDial,
  'dial/fume': generatedDial,
  'dial/generated': generatedDial,
};
