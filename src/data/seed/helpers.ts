import type { z } from 'zod';
import type { Part, PartType } from '../../domain/schemas';

/** Seed entries are schema *inputs* (defaults may be omitted); the core pack is validated on load. */
export type SeedPart<T extends PartType> = Extract<z.input<typeof Part>, { type: T }>;

export const tpl = (template: string, params: Record<string, unknown> = {}) =>
  ({ kind: 'template', template, params }) as const;

/** Date/day/magnifier at 3:00 (dial or movement frame). */
export const AT_3 = { angle: 90 } as const;
export const AT_9 = { angle: 270 } as const;

/**
 * Note for a style variant: the measurements are inherited from a part that was already
 * researched, and only the appearance differs. Says so plainly, because the confidence
 * label describes the measurements — not whether anyone sells this exact colourway.
 */
export const variantOf = (partId: string, what = 'colour and markers') =>
  `Measurements inherited from ${partId}; ${what} are a style choice. Confirm against a listing before ordering.`;
