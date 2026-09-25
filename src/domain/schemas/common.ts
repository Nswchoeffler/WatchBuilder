import { z } from 'zod';

/** Length in millimetres. See docs/compatibility-spec.md for units and conventions. */
export const Mm = z.number().positive().max(100);

/** Angle in degrees clockwise from 12 o'clock, seen from the dial side. */
export const Angle = z.number().min(0).lt(360);

/** One step of a 31-day date disc, in degrees. Crown positions are whole steps of this. */
export const DATE_STEP_DEG = 360 / 31;

/** Day wheel step (7 days x 2 languages). */
export const DAY_STEP_DEG = 360 / 14;

/** Crown position as date-disc steps past 3:00: 0 = 3.0, 2 = 3.8, 3 = 4.1. */
export const CrownSteps = z.union([z.literal(0), z.literal(2), z.literal(3)]);
export type CrownSteps = z.infer<typeof CrownSteps>;

export const crownAngle = (steps: CrownSteps): number => 90 + steps * DATE_STEP_DEG;

export const Confidence = z.enum(['verified', 'community', 'unverified']);
export type Confidence = z.infer<typeof Confidence>;

export const Slug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:[-.][a-z0-9]+)*$/, 'lowercase letters, digits, "-" or "." only');

export const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected #rrggbb');

/** Positioned feature (date window, magnifier, open-heart aperture) in dial coordinates. */
export const Feature = z.object({ angle: Angle });
export type Feature = z.infer<typeof Feature>;

export const Role = z.enum(['primary', 'secondary', 'accent', 'lume', 'metal']);
export type Role = z.infer<typeof Role>;

export const RoleColors = z.partialRecord(Role, HexColor);

export const Visual = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('template'),
    template: z.string().min(1),
    params: z.record(z.string(), z.unknown()).default({}),
  }),
  z.object({
    kind: z.literal('svg'),
    assetId: Slug,
    colors: RoleColors.optional(),
  }),
]);
export type Visual = z.infer<typeof Visual>;

/** Fields shared by every part type. */
export const partBaseShape = {
  id: Slug,
  name: z.string().min(1).max(80),
  confidence: Confidence,
  inspiredBy: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
  /** Where the measurements came from: spec sheets, listings, forum threads. */
  sources: z.array(z.httpUrl('expected a web address starting with http:// or https://')).max(10).optional(),
  visual: Visual,
};
