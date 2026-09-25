import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import type { Build } from '../domain/schemas';
import { resolveParts } from '../domain/rules';
import { buildFromSample, buildsUsing } from '../data/builds';
import { Catalog, loadCorePack } from '../data/catalog';
import { parsePackJson, serializePack } from '../data/packs';
import { SAMPLE_BUILDS } from '../data/sampleBuilds';
import { MY_PARTS_ID } from '../data/userPack';
import {
  ModWatchDB,
  createUserPack,
  deleteBuild,
  deleteUserPack,
  listBuilds,
  loadPacks,
  saveBuild,
  savePart,
  saveUserPack,
  syncCorePack,
} from './db';

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

describe('pack management', () => {
  it('creates packs with ids from their names, never reusing one', async () => {
    await syncCorePack(db);
    expect((await createUserPack(db, '  Octagon project  ')).id).toBe('octagon-project');
    expect((await createUserPack(db, 'Octagon project')).id).toBe('octagon-project-2');
    expect((await createUserPack(db, 'Core')).id).toBe('core-2');
    const created = await createUserPack(db, '!!!');
    expect(created).toMatchObject({ id: 'pack', name: '!!!', version: '1.0.0', parts: [] });
    await expect(createUserPack(db, '   ')).rejects.toThrow(/needs a name/);
  });

  it('deletes user packs but not the core pack', async () => {
    await syncCorePack(db);
    await saveUserPack(db, userPack);
    await deleteUserPack(db, 'my-parts');
    expect((await loadPacks(db)).map((p) => p.id)).toEqual(['core']);
    await expect(deleteUserPack(db, 'core')).rejects.toThrow(/built-in/);
  });

  it('finds the builds that use a pack or one of its parts', () => {
    const builds = SAMPLE_BUILDS.slice(0, 2).map(buildFromSample);
    builds[0]!.slots.dial = { packId: 'my-parts', partId: 'dl-mine' };
    expect(buildsUsing(builds, 'my-parts')).toEqual([builds[0]]);
    expect(buildsUsing(builds, 'my-parts', 'dl-other')).toEqual([]);
    expect(buildsUsing(builds, 'core')).toHaveLength(2);
  });

  it('brings back a build after its pack is exported, deleted and re-imported', async () => {
    await syncCorePack(db);
    const dial = { ...core.parts.find((p) => p.id === 'dl-diver-black')!, id: 'dl-mine', name: 'My dial' };
    await savePart(db, MY_PARTS_ID, dial);
    const build = buildFromSample(SAMPLE_BUILDS[0]!);
    build.slots.dial = { packId: MY_PARTS_ID, partId: 'dl-mine' };
    const unresolved = async () => resolveParts(build, new Catalog(await loadPacks(db))).unresolved.map((u) => u.slot);

    const file = serializePack((await loadPacks(db)).find((p) => p.id === MY_PARTS_ID)!);
    await deleteUserPack(db, MY_PARTS_ID);
    expect(await unresolved()).toContain('dial');
    await saveUserPack(db, parsePackJson(file));
    expect(await unresolved()).toEqual([]);
  });
});

describe('schema upgrades', () => {
  it('migrates packs stored by an older app when the database opens', async () => {
    const name = `upgrade-${n++}`;
    const old = new Dexie(name);
    old.version(1).stores({ packs: 'id, origin', builds: 'id, updatedAt, name' });
    const part = { ...core.parts[0]!, notes: 'Spec: https://example.com/spec.pdf' };
    const v1 = { ...JSON.parse(serializePack({ ...userPack, parts: [part] })), schemaVersion: 1 };
    await old.table('packs').put({ id: 'my-parts', version: '1.0.0', origin: 'user', pack: v1, updatedAt: '2026-09-01T00:00:00.000Z' });
    old.close();

    const upgraded = new ModWatchDB(name);
    try {
      const pack = (await loadPacks(upgraded))[0]!;
      expect(pack.schemaVersion).toBe(2);
      expect(pack.parts[0]!.sources).toEqual(['https://example.com/spec.pdf']);
    } finally {
      await upgraded.delete();
    }
  });

  it('rewrites a stored core pack from an older schema even at the same version', async () => {
    await syncCorePack(db);
    await db.packs.update('core', { pack: { ...core, schemaVersion: 1 } as never });
    expect(await syncCorePack(db)).toBe(true);
    expect((await db.packs.get('core'))?.pack.schemaVersion).toBe(core.schemaVersion);
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
