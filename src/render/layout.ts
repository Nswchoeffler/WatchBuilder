import { crownAngle } from '../domain/schemas';
import type { ResolvedParts } from '../domain/rules';

/** Geometry shared by all layers, derived from part measurements (all mm). */
export interface Layout {
  /** Case body radius (without lugs/crown). */
  caseRadius: number;
  lugToLug: number;
  /** Width between lugs (strap width at the case). */
  lugWidth: number;
  /** y of the spring-bar centres (negative = top). */
  springBarY: number;
  /** Crown direction, degrees clockwise from 12. */
  crownAngle: number;
  /** Radius where the dial is visible (under ring/bezel). */
  dialRadius: number;
  /** Radius of the crystal opening. */
  crystalRadius: number;
  /** Bezel ring outer radius (for separate bezels). */
  bezelOuterRadius: number;
  /** Radius where the bezel/insert starts (inner edge). */
  bezelInnerRadius: number;
  integrated: boolean;
}

/** Defaults when a slot is empty, roughly a 40mm three-hander. */
const DEFAULTS = { caseDiameter: 40, lugToLug: 47, lugWidth: 20, dial: 28.5, crystal: 31 };

export function computeLayout(parts: ResolvedParts): Layout {
  const c = parts.case;
  const caseRadius = (c?.diameter ?? DEFAULTS.caseDiameter) / 2;
  const lugToLug = c?.lugToLug ?? DEFAULTS.lugToLug;
  const integrated = Boolean(c?.integratedProfile);
  const lugWidth = c?.lugWidth ?? parts.strap?.width ?? (integrated ? caseRadius * 1.32 : DEFAULTS.lugWidth);
  const dialRadius = (parts.dial?.diameter ?? (c ? (c.dialSeat.min + c.dialSeat.max) / 2 : DEFAULTS.dial)) / 2;
  const crystalRadius = (c?.crystalSeat ?? parts.crystal?.diameter ?? DEFAULTS.crystal) / 2;
  const insert = parts.bezel?.insert;
  const bezelInnerRadius = insert ? insert.innerDiameter / 2 : crystalRadius + 0.4;
  const bezelOuterRadius = Math.max(caseRadius - 0.35, (insert?.outerDiameter ?? 0) / 2 + 1.1);

  return {
    caseRadius,
    lugToLug,
    lugWidth,
    springBarY: -(lugToLug / 2 - 2),
    crownAngle: crownAngle(c?.crownSteps ?? 0),
    dialRadius,
    crystalRadius,
    bezelOuterRadius,
    bezelInnerRadius,
    integrated,
  };
}

export type Framing = 'watch' | 'head';

/** viewBox [x, y, w, h] around the watch; `watch` shows some strap, `head` crops at the lugs. */
export function viewBoxFor(layout: Layout, framing: Framing): [number, number, number, number] {
  const halfW = Math.max(layout.caseRadius + 5, layout.lugWidth / 2 + 3);
  const strap = framing === 'watch' ? 22 : 1.5;
  const halfH = layout.lugToLug / 2 + strap;
  return [-halfW, -halfH, halfW * 2, halfH * 2];
}
