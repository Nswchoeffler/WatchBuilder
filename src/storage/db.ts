import Dexie, { type EntityTable } from 'dexie';
import type { Build, Pack } from '../domain/schemas';
import { Build as BuildSchema } from '../domain/schemas';
import { loadCorePack } from '../data/catalog';
import { validatePack } from '../data/packs';

export interface PackRecord {
  id: string;
  version: string;
  /** `core` is rewritten from seed data on startup; `user` packs are created/imported by the user. */
  origin: 'core' | 'user';
  pack: Pack;
  updatedAt: string;
}

export class ModWatchDB extends Dexie {
  packs!: EntityTable<PackRecord, 'id'>;
  builds!: EntityTable<Build, 'id'>;

  constructor(name = 'modwatch') {
    super(name);
    this.version(1).stores({
      packs: 'id, origin',
      builds: 'id, updatedAt, name',
    });
  }
}

/** Write the bundled core pack if missing or out of date. Returns true when it was (re)written. */
export async function syncCorePack(db: ModWatchDB, core: Pack = loadCorePack()): Promise<boolean> {
  const existing = await db.packs.get(core.id);
  if (existing?.origin === 'core' && existing.version === core.version) return false;
  if (existing && existing.origin !== 'core') {
    throw new Error(`A user pack is using the reserved id "${core.id}".`);
  }
  await db.packs.put({ id: core.id, version: core.version, origin: 'core', pack: core, updatedAt: new Date().toISOString() });
  return true;
}

/** Validate and store a user pack. Refuses to overwrite the core pack. */
export async function saveUserPack(db: ModWatchDB, input: unknown): Promise<Pack> {
  const pack = validatePack(input);
  const existing = await db.packs.get(pack.id);
  if (existing?.origin === 'core') throw new Error(`"${pack.id}" is reserved for the built-in catalog.`);
  await db.packs.put({ id: pack.id, version: pack.version, origin: 'user', pack, updatedAt: new Date().toISOString() });
  return pack;
}

export async function loadPacks(db: ModWatchDB): Promise<Pack[]> {
  const records = await db.packs.toArray();
  // Core first, then user packs by id, for stable ordering in pickers.
  return records
    .sort((a, b) => (a.origin === b.origin ? a.id.localeCompare(b.id) : a.origin === 'core' ? -1 : 1))
    .map((r) => r.pack);
}

export async function saveBuild(db: ModWatchDB, build: Build): Promise<Build> {
  const parsed = BuildSchema.parse(build);
  await db.builds.put(parsed);
  return parsed;
}

export const listBuilds = (db: ModWatchDB): Promise<Build[]> => db.builds.orderBy('updatedAt').reverse().toArray();

export const getBuild = (db: ModWatchDB, id: string): Promise<Build | undefined> => db.builds.get(id);

export const deleteBuild = (db: ModWatchDB, id: string): Promise<void> => db.builds.delete(id);

/** Rename without touching slots; empty names are ignored. */
export async function renameBuild(db: ModWatchDB, id: string, name: string): Promise<void> {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return;
  await db.builds.update(id, { name: trimmed, updatedAt: new Date().toISOString() });
}
