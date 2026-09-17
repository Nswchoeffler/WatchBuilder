import { PACK_FORMAT, PACK_SCHEMA_VERSION } from '../../domain/schemas';
import type { z } from 'zod';
import type { Pack } from '../../domain/schemas';
import { bezelInserts, bezels, chapterRings, crowns, crystals, straps } from './accessories';
import { cases } from './cases';
import { dials } from './dials';
import { hands } from './hands';
import { movements } from './movements';

export const CORE_PACK_ID = 'core';

/** Raw (unvalidated) core pack. Use `loadCorePack()` from data/catalog to get the parsed version. */
export const corePackInput: z.input<typeof Pack> = {
  format: PACK_FORMAT,
  schemaVersion: PACK_SCHEMA_VERSION,
  id: CORE_PACK_ID,
  name: 'Core Catalog',
  version: '0.1.0',
  description: 'Built-in parts. Confidence levels: docs/compatibility-spec.md.',
  parts: [...movements, ...cases, ...dials, ...hands, ...chapterRings, ...bezels, ...bezelInserts, ...crystals, ...crowns, ...straps],
  assets: {},
};
