import type { Asset, Pack, Part, PartType } from '../domain/schemas';
import { PACK_FORMAT, PACK_SCHEMA_VERSION } from '../domain/schemas';

/** The pack new parts go into unless the user picks another one. */
export const MY_PARTS_ID = 'my-parts';

export const emptyUserPack = (id = MY_PARTS_ID, name = 'My Parts'): Pack => ({
  format: PACK_FORMAT,
  schemaVersion: PACK_SCHEMA_VERSION,
  id,
  name,
  version: '1.0.0',
  parts: [],
  assets: {},
});

/** Next patch version; editing a pack always bumps it so importers can tell copies apart. */
export function bumpPatch(version: string): string {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) return '1.0.1';
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}

/**
 * Insert or replace a part by id, keeping parts sorted by type then name.
 * `replacesId` is the id the part had before an edit renamed it, so the old entry goes too.
 *
 * `art` is sanitized markup for a part drawn from an upload. It is stored under the part's own id —
 * part ids are unique within a pack, so no two parts can claim the same asset — and the part's
 * `assetId` is pointed at it. Assets no part draws from any more are dropped.
 */
export function withPart(pack: Pack, part: Part, replacesId?: string, art?: string): Pack {
  let assets = pack.assets;
  let stored = part;
  if (part.visual.kind === 'svg' && art !== undefined) {
    assets = { ...assets, [part.id]: { mime: 'image/svg+xml', data: art } };
    stored = { ...part, visual: { ...part.visual, assetId: part.id } };
  }
  const parts = pack.parts
    .filter((p) => p.id !== part.id && p.id !== replacesId)
    .concat(stored)
    .sort(byTypeThenName);
  return { ...pack, parts, assets: usedAssets(parts, assets), version: bumpPatch(pack.version) };
}

export function withoutPart(pack: Pack, partId: string): Pack {
  if (!pack.parts.some((p) => p.id === partId)) return pack;
  const parts = pack.parts.filter((p) => p.id !== partId);
  return { ...pack, parts, assets: usedAssets(parts, pack.assets), version: bumpPatch(pack.version) };
}

/** Only the assets some part still draws from, so replaced or deleted art doesn't pile up in the pack. */
function usedAssets(parts: readonly Part[], assets: Record<string, Asset>): Record<string, Asset> {
  const used = new Set(parts.flatMap((p) => (p.visual.kind === 'svg' ? [p.visual.assetId] : [])));
  return Object.fromEntries(Object.entries(assets).filter(([id]) => used.has(id)));
}

const byTypeThenName = (a: Part, b: Part) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name);

/** `copy-of-x`, `copy-of-x-2`, … — the first id not already taken. */
export function uniquePartId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/** Slug from a name, e.g. "Diver Black 28.5" → "diver-black-28-5". Names with nothing usable fall back to `fallback` (a part's type). */
export function slugify(name: string, fallback: PartType | 'pack'): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');
  return slug || fallback.toLowerCase();
}

/** Id for a new pack named `name`: its slug, made unique among `taken` (which should include the core pack's id). */
export const newPackId = (name: string, taken: ReadonlySet<string>): string => uniquePartId(slugify(name, 'pack'), taken);
