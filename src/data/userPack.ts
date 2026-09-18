import type { Pack, Part, PartType } from '../domain/schemas';
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
 */
export function withPart(pack: Pack, part: Part, replacesId?: string): Pack {
  const parts = pack.parts
    .filter((p) => p.id !== part.id && p.id !== replacesId)
    .concat(part)
    .sort(byTypeThenName);
  return { ...pack, parts, version: bumpPatch(pack.version) };
}

export function withoutPart(pack: Pack, partId: string): Pack {
  if (!pack.parts.some((p) => p.id === partId)) return pack;
  return { ...pack, parts: pack.parts.filter((p) => p.id !== partId), version: bumpPatch(pack.version) };
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

/** Slug from a part name, e.g. "Diver Black 28.5" → "diver-black-28-5". Empty names fall back to the type. */
export function slugify(name: string, type: PartType): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');
  return slug || type.toLowerCase();
}
