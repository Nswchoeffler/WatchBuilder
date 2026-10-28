import { DATE_STEP_DEG, type CrownSteps } from '../schemas';

export const normalizeDeg = (a: number): number => ((a % 360) + 360) % 360;

/** Shortest angular distance between two angles (0–180). */
export function angularDistance(a: number, b: number): number {
  const d = normalizeDeg(a - b);
  return Math.min(d, 360 - d);
}

/** Distance from `x` to the nearest multiple of `step` (0 – step/2). */
export function offGrid(x: number, step: number): number {
  const r = ((x % step) + step) % step;
  return Math.min(r, step - r);
}

/**
 * Where a movement-frame angle (crown at 3:00) appears on the dial when the case puts the
 * crown `steps` date-steps past 3:00. The movement is rotated clockwise with the crown.
 */
export const movementToDial = (angle: number, steps: CrownSteps): number =>
  normalizeDeg(angle + steps * DATE_STEP_DEG);

/** Distance between two points given in polar form (angle clockwise from 12:00, distance from the centre). */
export function polarDistance(a: { angle: number; distance: number }, b: { angle: number; distance: number }): number {
  const rad = Math.PI / 180;
  const dx = a.distance * Math.sin(a.angle * rad) - b.distance * Math.sin(b.angle * rad);
  const dy = a.distance * Math.cos(a.angle * rad) - b.distance * Math.cos(b.angle * rad);
  return Math.hypot(dx, dy);
}

export const mm = (n: number): string => `${Number(n.toFixed(2))}mm`;
export const deg = (n: number): string => `${Number(n.toFixed(1))}°`;

const CROWN_NAMES: Record<CrownSteps, string> = { 0: '3:00', 2: '3.8', 3: '4.1' };
export const crownName = (steps: CrownSteps): string => CROWN_NAMES[steps];
