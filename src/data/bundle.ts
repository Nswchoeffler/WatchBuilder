import { z } from 'zod';
import { Build, type Pack, type Part } from '../domain/schemas';
import type { Catalog } from './catalog';
import { formatIssues, PackError, validatePack } from './packs';
import { CORE_PACK_ID } from './seed';
import type { SharedBuild } from './share';
import { bumpPatch, withPart } from './userPack';

// A build bundle is one file that shares a build completely: the build, plus a copy of
// every non-core pack it draws from, trimmed to the parts (and uploaded art) it uses.
// Importing merges those parts into the recipient's packs of the same id, so the build's
// `pack/part` references resolve exactly as they did for the sender.

export const BUNDLE_FORMAT = 'modwatch-build';
export const BUNDLE_SCHEMA_VERSION = 1;

export interface BuildBundle {
  format: typeof BUNDLE_FORMAT;
  schemaVersion: typeof BUNDLE_SCHEMA_VERSION;
  build: SharedBuild;
  /** Trimmed copies of the packs the build uses, never the core pack. */
  packs: Pack[];
}

const Envelope = z.object({
  format: z.literal(BUNDLE_FORMAT),
  schemaVersion: z.number(),
  build: Build.pick({ name: true, slots: true, flags: true, notes: true }),
  packs: z.array(z.unknown()),
});

/**
 * Bundle a build with the parts it needs from outside the core catalog.
 * Parts the catalog can't find are left out and listed in `missing`; the bundle still carries their references.
 */
export function makeBundle(build: SharedBuild, catalog: Catalog): { bundle: BuildBundle; missing: string[] } {
  const byPack = new Map<string, Part[]>();
  const missing: string[] = [];
  for (const ref of Object.values(build.slots)) {
    if (ref.packId === CORE_PACK_ID) continue;
    const part = catalog.get(ref);
    if (!part) {
      missing.push(`${ref.packId}/${ref.partId}`);
      continue;
    }
    byPack.set(ref.packId, [...(byPack.get(ref.packId) ?? []), part]);
  }

  const packs = [...byPack].map(([packId, parts]): Pack => {
    const source = catalog.packs.find((p) => p.id === packId)!;
    const unique = [...new Map(parts.map((p) => [p.id, p])).values()];
    const assetIds = new Set(unique.flatMap((p) => (p.visual.kind === 'svg' ? [p.visual.assetId] : [])));
    return {
      ...source,
      parts: unique,
      assets: Object.fromEntries(Object.entries(source.assets).filter(([id]) => assetIds.has(id))),
    };
  });

  const shared: SharedBuild = { name: build.name, slots: build.slots, flags: build.flags, ...(build.notes ? { notes: build.notes } : {}) };
  return { bundle: { format: BUNDLE_FORMAT, schemaVersion: BUNDLE_SCHEMA_VERSION, build: shared, packs }, missing };
}

export const serializeBundle = (bundle: BuildBundle): string => `${JSON.stringify(bundle, null, 2)}\n`;

/** Parse and validate a bundle file. Throws PackError listing every problem, pack issues prefixed with the pack. */
export function parseBundleJson(json: string): BuildBundle {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    throw new PackError(`Build file is not valid JSON: ${(e as Error).message}`);
  }
  const format = (raw as { format?: unknown } | null)?.format;
  if (format !== BUNDLE_FORMAT) {
    throw new PackError(
      format === 'modwatch-pack' ? 'This is a part pack, not a build. Import it from the Packs page.' : `Not a build file (expected format "${BUNDLE_FORMAT}").`,
    );
  }
  const envelope = Envelope.safeParse(raw);
  if (!envelope.success) throw new PackError('Build file is invalid:', formatIssues(envelope.error, raw));
  if (envelope.data.schemaVersion > BUNDLE_SCHEMA_VERSION) {
    throw new PackError(`Build file version ${envelope.data.schemaVersion} is newer than this app supports (${BUNDLE_SCHEMA_VERSION}).`);
  }

  const issues: string[] = [];
  const packs: Pack[] = [];
  envelope.data.packs.forEach((input, i) => {
    try {
      const pack = validatePack(input);
      if (pack.id === CORE_PACK_ID) issues.push(`packs[${i}]: the built-in catalog can't be replaced by a file`);
      else packs.push(pack);
    } catch (e) {
      const where = `packs[${i}]`;
      if (e instanceof PackError && e.issues.length) issues.push(...e.issues.map((issue) => `${where}.${issue}`));
      else issues.push(`${where}: ${(e as Error).message}`);
    }
  });
  if (issues.length) throw new PackError('Build file is invalid:', issues);

  const { name, slots, flags, notes } = envelope.data.build;
  return { format: BUNDLE_FORMAT, schemaVersion: BUNDLE_SCHEMA_VERSION, build: { name, slots, flags, ...(notes ? { notes } : {}) }, packs };
}

export interface PackMerge {
  /** The pack to store, or null when nothing needs writing. */
  pack: Pack | null;
  /** Ids of parts the bundle added. */
  added: string[];
  /** Ids of parts you already had that differ from the bundle's copy; yours are kept. */
  keptYours: string[];
}

/**
 * Merge a bundle's copy of a pack into the recipient's pack with the same id. Parts you don't have are added;
 * parts you have are never overwritten. A pack you don't have at all is stored as the bundle carries it.
 */
export function mergeBundlePack(existing: Pack | undefined, incoming: Pack): PackMerge {
  if (!existing) return { pack: incoming, added: incoming.parts.map((p) => p.id), keptYours: [] };
  const have = new Map(existing.parts.map((p) => [p.id, p]));
  const added: string[] = [];
  const keptYours: string[] = [];
  let pack = existing;
  for (const part of incoming.parts) {
    const mine = have.get(part.id);
    if (mine) {
      if (!sameContent(existing, mine, incoming, part)) keptYours.push(part.id);
      continue;
    }
    const art = part.visual.kind === 'svg' ? incoming.assets[part.visual.assetId]?.data : undefined;
    pack = withPart(pack, part, undefined, art);
    added.push(part.id);
  }
  // `withPart` bumps once per part; a merge is one edit, so it counts as one bump.
  return { pack: added.length ? { ...pack, version: bumpPatch(existing.version) } : null, added, keptYours };
}

/** Same measurements and same drawing, comparing uploaded art by content since asset ids may differ. */
function sameContent(packA: Pack, a: Part, packB: Pack, b: Part): boolean {
  const art = (pack: Pack, part: Part) => (part.visual.kind === 'svg' ? pack.assets[part.visual.assetId]?.data : undefined);
  const strip = (part: Part) => (part.visual.kind === 'svg' ? { ...part, visual: { ...part.visual, assetId: '' } } : part);
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b)) && art(packA, a) === art(packB, b);
}
