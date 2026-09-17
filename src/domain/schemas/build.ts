import { z } from 'zod';
import { Slug } from './common';
import { PART_TYPES } from './parts';

/** Build slots map 1:1 to part types. */
export const Slot = z.enum(PART_TYPES);
export type Slot = z.infer<typeof Slot>;

export const REQUIRED_SLOTS = ['movement', 'case', 'dial', 'hands', 'crystal', 'crown', 'strap'] as const satisfies readonly Slot[];

export const PartRef = z.object({ packId: Slug, partId: Slug });
export type PartRef = z.infer<typeof PartRef>;

/** Real-world modifications that downgrade specific rule errors to warnings. */
export const ModFlag = z.enum(['dial-dots', 'movement-spacer', 'day-wheel-swap']);
export type ModFlag = z.infer<typeof ModFlag>;

export const Build = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  slots: z.partialRecord(Slot, PartRef),
  flags: z.array(ModFlag).default([]),
  notes: z.string().max(2000).optional(),
});
export type Build = z.infer<typeof Build>;
