import { describe, expect, it } from 'vitest';
import type { Pack, Part } from '../domain/schemas';
import { buildFromSample } from './builds';
import { makeBundle, mergeBundlePack, parseBundleJson, serializeBundle } from './bundle';
import { Catalog, loadCorePack } from './catalog';
import { PackError, serializePack } from './packs';
import { SAMPLE_BUILDS } from './sampleBuilds';
import { emptyUserPack, withPart } from './userPack';

const core = loadCorePack();
const coreDial = core.parts.find((p) => p.id === 'dl-diver-black')!;
const art = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-15 -15 30 30"><circle r="14"/></svg>';

const dial = (id: string, extra: Partial<Part> = {}) => ({ ...coreDial, id, name: `Dial ${id}`, ...extra }) as Part;
const drawn = (id: string) => ({ ...dial(id), visual: { kind: 'svg', assetId: id } }) as Part;

/** My Parts with a used template dial, a used uploaded dial, and one unused part with art. */
const myParts: Pack = [dial('dl-plain'), drawn('dl-drawn'), drawn('dl-unused')].reduce(
  (pack, part) => withPart(pack, part, undefined, part.visual.kind === 'svg' ? art : undefined),
  emptyUserPack(),
);
const catalog = new Catalog([core, myParts]);

const build = () => {
  const b = buildFromSample(SAMPLE_BUILDS[0]!);
  return { ...b, slots: { ...b.slots, dial: { packId: 'my-parts', partId: 'dl-drawn' } } };
};

describe('makeBundle', () => {
  it('carries only the non-core parts the build uses, with their art', () => {
    const { bundle, missing } = makeBundle(build(), catalog);
    expect(missing).toEqual([]);
    expect(bundle.packs).toHaveLength(1);
    const [pack] = bundle.packs;
    expect(pack).toMatchObject({ id: 'my-parts', name: 'My Parts', version: myParts.version });
    expect(pack!.parts.map((p) => p.id)).toEqual(['dl-drawn']);
    expect(Object.keys(pack!.assets)).toEqual(['dl-drawn']);
  });

  it('carries no packs for an all-core build', () => {
    expect(makeBundle(buildFromSample(SAMPLE_BUILDS[0]!), catalog).bundle.packs).toEqual([]);
  });

  it('lists parts it cannot find but keeps their references', () => {
    const b = { ...build(), slots: { ...build().slots, strap: { packId: 'gone', partId: 'st-x' } } };
    const { bundle, missing } = makeBundle(b, catalog);
    expect(missing).toEqual(['gone/st-x']);
    expect(bundle.build.slots.strap).toEqual({ packId: 'gone', partId: 'st-x' });
  });
});

describe('parseBundleJson', () => {
  const file = () => JSON.parse(serializeBundle(makeBundle(build(), catalog).bundle));
  const issuesOf = (json: string) => {
    try {
      parseBundleJson(json);
    } catch (e) {
      return e instanceof PackError ? [e.message.split('\n')[0], ...e.issues] : [String(e)];
    }
    throw new Error('expected the file to be refused');
  };

  it('round-trips a bundle', () => {
    const { bundle } = makeBundle({ ...build(), notes: 'Mine.' }, catalog);
    expect(parseBundleJson(serializeBundle(bundle))).toEqual(bundle);
  });

  it('refuses non-JSON, other files, and pack files with a pointer to the Packs page', () => {
    expect(issuesOf('{nope')[0]).toMatch(/not valid JSON/);
    expect(issuesOf('{"hello":1}')[0]).toMatch(/Not a build file/);
    expect(issuesOf(serializePack(myParts))[0]).toMatch(/part pack.*Packs page/);
  });

  it('refuses files from a newer version', () => {
    expect(issuesOf(JSON.stringify({ ...file(), schemaVersion: 2 }))[0]).toMatch(/newer than this app/);
  });

  it('names the pack and part behind every problem', () => {
    const bad = file();
    bad.build.flags = ['glue-it'];
    bad.packs[0].parts[0].diameter = -1;
    const issues = issuesOf(JSON.stringify(bad));
    expect(issues).toEqual(expect.arrayContaining([expect.stringMatching(/^build\.flags/)]));

    const badPack = file();
    badPack.packs[0].parts[0].diameter = -1;
    expect(issuesOf(JSON.stringify(badPack))).toContainEqual(expect.stringMatching(/^packs\[0\]\.parts\[0\] \(dl-drawn\)\.diameter:/));
  });

  it('never accepts a copy of the core pack', () => {
    const bad = file();
    bad.packs[0].id = 'core';
    expect(issuesOf(JSON.stringify(bad))).toContainEqual(expect.stringMatching(/built-in catalog/));
  });

  it('migrates packs from older schema versions', () => {
    const old = file();
    old.packs[0].schemaVersion = 1;
    expect(parseBundleJson(JSON.stringify(old)).packs[0]!.schemaVersion).toBe(2);
  });
});

describe('mergeBundlePack', () => {
  const incoming = makeBundle(build(), catalog).bundle.packs[0]!;

  it('stores a pack you do not have as it comes', () => {
    expect(mergeBundlePack(undefined, incoming)).toEqual({ pack: incoming, added: ['dl-drawn'], keptYours: [] });
  });

  it('adds missing parts with their art, bumping the version once', () => {
    const mine = withPart(emptyUserPack(), dial('dl-other'));
    const both = { ...incoming, parts: [...incoming.parts, dial('dl-plain')] };
    const merge = mergeBundlePack(mine, both);
    expect(merge.added).toEqual(['dl-drawn', 'dl-plain']);
    expect(merge.pack!.version).toBe('1.0.2');
    expect(merge.pack!.parts.map((p) => p.id).sort()).toEqual(['dl-drawn', 'dl-other', 'dl-plain']);
    expect(merge.pack!.assets['dl-drawn']?.data).toBe(art);
  });

  it('never overwrites your parts, and reports the ones that differ', () => {
    const same = mergeBundlePack(myParts, incoming);
    expect(same).toEqual({ pack: null, added: [], keptYours: [] });

    const changed = withPart(myParts, { ...drawn('dl-drawn'), name: 'Renamed by me' }, undefined, art);
    const merge = mergeBundlePack(changed, incoming);
    expect(merge).toEqual({ pack: null, added: [], keptYours: ['dl-drawn'] });

    const redrawn = withPart(myParts, drawn('dl-drawn'), undefined, art.replace('14', '13'));
    expect(mergeBundlePack(redrawn, incoming).keptYours).toEqual(['dl-drawn']);
  });
});
