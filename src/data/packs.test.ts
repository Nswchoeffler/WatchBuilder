import { describe, expect, it } from 'vitest';
import { loadCorePack } from './catalog';
import { PackError, parsePackJson, serializePack, validatePack } from './packs';

const core = loadCorePack();
const clone = () => JSON.parse(serializePack(core)) as Record<string, unknown> & { parts: Record<string, unknown>[] };

describe('packs', () => {
  it('round-trips through JSON unchanged', () => {
    expect(parsePackJson(serializePack(core))).toEqual(core);
  });

  it('rejects malformed JSON', () => {
    expect(() => parsePackJson('{nope')).toThrow(/not valid JSON/);
  });

  it('rejects files that are not packs', () => {
    expect(() => validatePack({ hello: 'world' })).toThrow(/Not a part pack/);
  });

  it('rejects packs from a newer schema version with a clear message', () => {
    expect(() => validatePack({ ...clone(), schemaVersion: 99 })).toThrow(/newer than this app supports/);
  });

  it('reports duplicate part ids', () => {
    const pack = clone();
    pack.parts.push(pack.parts[0]!);
    expect(() => validatePack(pack)).toThrow(/duplicate part id "mv-nh35"/);
  });

  it('reports svg visuals that reference a missing asset', () => {
    const pack = clone();
    pack.parts[0]!.visual = { kind: 'svg', assetId: 'missing-art' };
    expect(() => validatePack(pack)).toThrow(/asset "missing-art" is not in this pack/);
  });

  it('names the offending part and field in validation errors', () => {
    const pack = clone();
    const idx = pack.parts.findIndex((p) => p.id === 'dl-diver-black');
    pack.parts[idx] = { ...pack.parts[idx]!, diameter: -1 };
    try {
      validatePack(pack);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(PackError);
      expect((e as PackError).issues.join('\n')).toContain(`parts[${idx}] (dl-diver-black).diameter`);
    }
  });
});
