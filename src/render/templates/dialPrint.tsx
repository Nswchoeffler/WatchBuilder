import type { ReactNode } from 'react';
import { FONT, choice, color, darken, f, type Params } from '../util';
import { url } from './common';

// What is printed and applied on a dial face besides the markers: a short line of text under 12, another
// above 6, and a small applied mark at 12. Everything is placed from the dial radius and kept clear of
// whatever else occupies the face (date window, open-heart aperture, anything the dial adds later), so a
// dial with the settings left alone looks exactly as it did before.
//
// Generic names only: the editor says so, and nothing here ships a logo, only simple shapes.

export const DIAL_TEXT_MAX = 16;

export const DIAL_MARKS = ['none', 'bar', 'triangle', 'shield'] as const;
export type DialMark = (typeof DIAL_MARKS)[number];

/** Axis-aligned box in dial coordinates (mm, origin at the dial centre, y down). */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Short printable text: control characters dropped, whitespace collapsed, capped at `DIAL_TEXT_MAX`. */
export function printText(params: Params, key: string): string {
  const v = params[key];
  if (typeof v !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, DIAL_TEXT_MAX);
}

export interface DialPrintStyle {
  top: string;
  bottom: string;
  mark: DialMark;
  /** Colour of the printed text: the `textColor` setting, else the dial's marker ink. */
  ink: string;
  /** Colour of the applied mark: the dial's marker metal. */
  metal: string;
}

export function dialPrintStyle(params: Params, ink: string, metal: string): DialPrintStyle {
  // Older drawings kept their text in `text`: first line under 12, second above 6.
  const legacy = Array.isArray(params.text) ? params.text.filter((x): x is string => typeof x === 'string') : [];
  const top = printText(params, 'textTop') || printText({ t: legacy[0] }, 't');
  const bottom = printText(params, 'textBottom') || printText({ t: legacy[1] }, 't');
  return {
    top,
    bottom,
    mark: choice<DialMark>(params, 'mark', DIAL_MARKS, 'none'),
    ink: color(params, 'textColor', ink),
    metal,
  };
}

// ---------------------------------------------------------------- placement

const FONT_SIZE = 0.068;
/** Average advance of a bold capital plus its letter-spacing, in ems. Generous, so the estimate errs wide. */
const ADVANCE = 0.74;
const PAD = 0.03;

const hits = (a: Box, b: Box, pad: number) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;

/** Vertical positions to try, as fractions of the radius, nearest the ideal first. */
const TOP_TEXT = [-0.46, -0.4, -0.35, -0.3, -0.25];
const TOP_TEXT_UNDER_MARK = [-0.4, -0.35, -0.3, -0.25];
const BOTTOM_TEXT = [0.42, 0.48, 0.36, 0.3, 0.25];
const MARK_Y = -0.53;

function textBox(text: string, y: number, r: number): Box {
  const size = r * FONT_SIZE;
  const half = (text.length * ADVANCE * size) / 2;
  return { x0: -half, x1: half, y0: r * y - size * 0.6, y1: r * y + size * 0.6 };
}

function firstFree(candidates: readonly number[], boxOf: (y: number) => Box, obstacles: readonly Box[], r: number): number | null {
  return candidates.find((y) => !obstacles.some((o) => hits(boxOf(y), o, r * PAD))) ?? null;
}

const MARK_H = 0.08;
const MARK_W = 0.12;

const markBox = (r: number): Box => ({ x0: -r * MARK_W, x1: r * MARK_W, y0: r * (MARK_Y - MARK_H / 2), y1: r * (MARK_Y + MARK_H / 2) });

export interface DialPrintLayout {
  /** y (mm) of each line's centre, or null when it is empty or there is nowhere clear to put it. */
  topY: number | null;
  bottomY: number | null;
  mark: boolean;
}

export function layoutDialPrint(style: Pick<DialPrintStyle, 'top' | 'bottom' | 'mark'>, r: number, obstacles: readonly Box[]): DialPrintLayout {
  const mark = style.mark !== 'none' && !obstacles.some((o) => hits(markBox(r), o, r * PAD));
  const topList = mark ? TOP_TEXT_UNDER_MARK : TOP_TEXT;
  const top = style.top ? firstFree(topList, (y) => textBox(style.top, y, r), obstacles, r) : null;
  const bottom = style.bottom ? firstFree(BOTTOM_TEXT, (y) => textBox(style.bottom, y, r), obstacles, r) : null;
  return { topY: top === null ? null : r * top, bottomY: bottom === null ? null : r * bottom, mark };
}

// ---------------------------------------------------------------- drawing

function Mark({ kind, r, metal }: { kind: Exclude<DialMark, 'none'>; r: number; metal: string }) {
  const cy = r * MARK_Y;
  const w = r * MARK_W;
  const h = r * MARK_H;
  const edge = darken(metal, 0.45);
  let shape: ReactNode;
  if (kind === 'bar') {
    shape = <rect x={f(-w / 2)} y={f(cy - h * 0.13)} width={f(w)} height={f(h * 0.26)} rx={0.1} />;
  } else if (kind === 'triangle') {
    shape = <path d={`M 0 ${f(cy - h / 2)} L ${f(w * 0.42)} ${f(cy + h / 2)} L ${f(-w * 0.42)} ${f(cy + h / 2)} Z`} />;
  } else {
    // Shield: flat top, straight sides, curved to a point.
    const sw = w * 0.38;
    shape = (
      <path
        d={`M ${f(-sw)} ${f(cy - h / 2)} L ${f(sw)} ${f(cy - h / 2)} L ${f(sw)} ${f(cy + h * 0.1)} Q ${f(sw)} ${f(cy + h * 0.38)} 0 ${f(cy + h / 2)} Q ${f(-sw)} ${f(cy + h * 0.38)} ${f(-sw)} ${f(cy + h * 0.1)} Z`}
      />
    );
  }
  return (
    <g fill={metal} stroke={edge} strokeWidth={0.07} strokeLinejoin="round">
      {shape}
    </g>
  );
}

/**
 * The text is printed flat on the dial; the mark is applied metal, so it gets the markers' drop shadow
 * (`shadow` is the id of the filter the dial already defines).
 */
export function DialPrint({ r, style, obstacles, shadow }: { r: number; style: DialPrintStyle; obstacles: readonly Box[]; shadow: string }) {
  const layout = layoutDialPrint(style, r, obstacles);
  const size = r * FONT_SIZE;
  if (layout.topY === null && layout.bottomY === null && !layout.mark) return null;
  const lines: [string, number][] = [];
  if (layout.topY !== null) lines.push([style.top, layout.topY]);
  if (layout.bottomY !== null) lines.push([style.bottom, layout.bottomY]);
  return (
    <g data-dial-print="">
      {lines.length > 0 && (
        <g fontFamily={FONT} fontSize={f(size)} fontWeight={700} fill={style.ink} textAnchor="middle" dominantBaseline="central" letterSpacing={f(size * 0.08)}>
          {lines.map(([text, y]) => (
            <text key={y} x={0} y={f(y)}>
              {text}
            </text>
          ))}
        </g>
      )}
      {layout.mark && style.mark !== 'none' && (
        <g filter={url(shadow)}>
          <Mark kind={style.mark} r={r} metal={style.metal} />
        </g>
      )}
    </g>
  );
}
