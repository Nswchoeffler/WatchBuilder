import type { Visual } from '../domain/schemas';

// ---------------------------------------------------------------- colour

const clamp = (n: number, lo = 0, hi = 255) => Math.min(hi, Math.max(lo, n));

function parseHex(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [128, 128, 128];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (rgb: number[]) => `#${rgb.map((c) => Math.round(clamp(c)).toString(16).padStart(2, '0')).join('')}`;

/** Mix `hex` towards `target` by t (0–1). */
export function mix(hex: string, target: string, t: number): string {
  const a = parseHex(hex);
  const b = parseHex(target);
  return toHex(a.map((c, i) => c + (b[i]! - c) * t));
}

export const lighten = (hex: string, t: number) => mix(hex, '#ffffff', t);
export const darken = (hex: string, t: number) => mix(hex, '#000000', t);

/** Perceived luminance 0–1. */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Readable ink colour on top of `hex`. */
export const inkOn = (hex: string) => (luminance(hex) > 0.55 ? '#16171a' : '#f2f2ef');

// ---------------------------------------------------------------- template params

export type Params = Record<string, unknown>;

export const paramsOf = (visual: Visual): Params => (visual.kind === 'template' ? visual.params : {});

const HEX = /^#[0-9a-f]{6}$/i;

export function color(params: Params, key: string, fallback: string): string {
  const v = params[key];
  return typeof v === 'string' && HEX.test(v) ? v : fallback;
}

/** Like `color`, but `null` in params means "none" (e.g. no lume). */
export function optionalColor(params: Params, key: string, fallback: string | null): string | null {
  const v = params[key];
  if (v === null) return null;
  return typeof v === 'string' && HEX.test(v) ? v : fallback;
}

export function choice<const T extends string>(params: Params, key: string, options: readonly T[], fallback: T): T {
  const v = params[key];
  return typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function textLines(params: Params, key: string): string[] {
  const v = params[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 4) : [];
}

// ---------------------------------------------------------------- geometry

export const DEG = Math.PI / 180;

/** Point at `r` from centre, `angle` degrees clockwise from 12 (SVG y points down). */
export function polar(r: number, angle: number): [number, number] {
  return [r * Math.sin(angle * DEG), -r * Math.cos(angle * DEG)];
}

export const f = (n: number) => Number(n.toFixed(3));

/** Closed annulus path between r1 < r2 (even-odd fill). */
export function annulus(r1: number, r2: number): string {
  const ring = (r: number) => `M ${f(-r)} 0 A ${f(r)} ${f(r)} 0 1 0 ${f(r)} 0 A ${f(r)} ${f(r)} 0 1 0 ${f(-r)} 0 Z`;
  return `${ring(r2)} ${ring(r1)}`;
}

/** Wedge of an annulus from angle a1 to a2 (clockwise from 12). */
export function sector(r1: number, r2: number, a1: number, a2: number): string {
  const large = a2 - a1 > 180 ? 1 : 0;
  const [x1, y1] = polar(r2, a1);
  const [x2, y2] = polar(r2, a2);
  const [x3, y3] = polar(r1, a2);
  const [x4, y4] = polar(r1, a1);
  return `M ${f(x1)} ${f(y1)} A ${r2} ${r2} 0 ${large} 1 ${f(x2)} ${f(y2)} L ${f(x3)} ${f(y3)} A ${r1} ${r1} 0 ${large} 0 ${f(x4)} ${f(y4)} Z`;
}

export const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// ---------------------------------------------------------------- time

export interface DisplayTime {
  hours: number;
  minutes: number;
  seconds: number;
}

/** Classic display time (docs/svg-canvas-spec.md §6). */
export const DISPLAY_TIME: DisplayTime = { hours: 10, minutes: 8, seconds: 37 };

export function handAngles({ hours, minutes, seconds }: DisplayTime, gmtOffsetHours = 12) {
  const h = (hours % 12) + minutes / 60 + seconds / 3600;
  const m = minutes + seconds / 60;
  const gmt = (((hours + gmtOffsetHours) % 24) + minutes / 60) % 24;
  return { hour: h * 30, minute: m * 6, seconds: seconds * 6, gmt: gmt * 15 };
}

export { angularDistance as angularDistanceDeg } from '../domain/rules/geometry';
