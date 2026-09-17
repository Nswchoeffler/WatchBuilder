import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Build } from '../domain/schemas';
import { loadCorePack } from '../data/catalog';
import { ModWatchDB, deleteBuild, listBuilds, loadPacks, saveBuild, saveUserPack, syncCorePack } from './db';

let db: ModWatchDB;
let n = 0;

beforeEach(async () => {
  db = new ModWatchDB(`test-${n++}`);
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

const core = loadCorePack();
const userPack = { ...core, id: 'my-parts', name: 'My Parts', version: '1.0.0', parts: core.parts.slice(0, 2) };

describe('core pack sync', () => {
  it('writes the core pack once and skips when up to date', async () => {
    expect(await syncCorePack(db)).toBe(true);
    expect(await syncCorePack(db)).toBe(false);
    expect((await loadPacks(db))[0]?.parts.length).toBe(core.parts.length);
  });

  it('rewrites the core pack when the bundled version changes', async () => {
    await syncCorePack(db);
    expect(await syncCorePack(db, { ...core, version: '9.9.9' })).toBe(true);
    expect((await db.packs.get('core'))?.version).toBe('9.9.9');
  });
});

describe('user packs', () => {
  it('stores a valid pack and lists core first', async () => {
    await saveUserPack(db, userPack);
    await syncCorePack(db);
    expect((await loadPacks(db)).map((p) => p.id)).toEqual(['core', 'my-parts']);
  });

  it('refuses to overwrite the core pack', async () => {
    await syncCorePack(db);
    await expect(saveUserPack(db, { ...userPack, id: 'core' })).rejects.toThrow(/reserved/);
  });

  it('refuses invalid packs', async () => {
    await expect(saveUserPack(db, { ...userPack, version: 'latest' })).rejects.toThrow(/semver/);
  });
});

describe('builds', () => {
  const build = (id: string, updatedAt: string): Build => ({
    id,
    name: `Build ${id}`,
    createdAt: '2026-09-16T12:00:00.000Z',
    updatedAt,
    slots: { case: { packId: 'core', partId: 'cs-diver42-38' } },
    flags: [],
  });

  it('saves, lists newest first, and deletes', async () => {
    await saveBuild(db, build('a', '2026-09-16T12:00:00.000Z'));
    await saveBuild(db, build('b', '2026-09-16T13:00:00.000Z'));
    expect((await listBuilds(db)).map((b) => b.id)).toEqual(['b', 'a']);
    await deleteBuild(db, 'b');
    expect((await listBuilds(db)).map((b) => b.id)).toEqual(['a']);
  });

  it('rejects builds with unknown modification flags', async () => {
    const bad = { ...build('c', '2026-09-16T12:00:00.000Z'), flags: ['glue-it'] } as unknown as Build;
    await expect(saveBuild(db, bad)).rejects.toThrow();
  });
});
