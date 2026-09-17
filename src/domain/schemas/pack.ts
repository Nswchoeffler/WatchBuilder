import { z } from 'zod';
import { Slug } from './common';
import { Part } from './parts';

export const PACK_FORMAT = 'modwatch-pack';
export const PACK_SCHEMA_VERSION = 1;

export const Asset = z.object({
  mime: z.literal('image/svg+xml'),
  /** Sanitized SVG markup. */
  data: z.string().min(1).max(512 * 1024),
});
export type Asset = z.infer<typeof Asset>;

export const Pack = z
  .object({
    format: z.literal(PACK_FORMAT),
    schemaVersion: z.literal(PACK_SCHEMA_VERSION),
    id: Slug,
    name: z.string().min(1).max(80),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, 'expected semver like 1.0.0'),
    author: z.string().max(80).optional(),
    description: z.string().max(2000).optional(),
    parts: z.array(Part),
    assets: z.record(Slug, Asset).default({}),
  })
  .superRefine((pack, ctx) => {
    const seen = new Set<string>();
    pack.parts.forEach((part, i) => {
      if (seen.has(part.id)) {
        ctx.addIssue({ code: 'custom', path: ['parts', i, 'id'], message: `duplicate part id "${part.id}"` });
      }
      seen.add(part.id);
      if (part.visual.kind === 'svg' && !(part.visual.assetId in pack.assets)) {
        ctx.addIssue({
          code: 'custom',
          path: ['parts', i, 'visual', 'assetId'],
          message: `asset "${part.visual.assetId}" is not in this pack`,
        });
      }
    });
  });
export type Pack = z.infer<typeof Pack>;
