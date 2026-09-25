import { describe, expect, it } from 'vitest';
import { buildFromSample } from './builds';
import { SAMPLE_BUILDS } from './sampleBuilds';
import { decodeShare, encodeShare, ShareError, shareUrl, type SharedBuild } from './share';

const sample = buildFromSample(SAMPLE_BUILDS[0]!);
const shared: SharedBuild = {
  name: 'Diver — “mine”',
  slots: { ...sample.slots, dial: { packId: 'my-parts', partId: 'dl-fume.2' } },
  flags: ['day-wheel-swap'],
  notes: 'Sterile dial,\nsapphire crystal.',
};

/** Deflate + base64url a raw payload, for links the app itself would never make. */
async function codeFor(payload: unknown): Promise<string> {
  const stream = new Blob([JSON.stringify(payload)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('share links', () => {
  it('round-trips name, parts from any pack, mods and notes', async () => {
    expect(await decodeShare(await encodeShare(shared))).toEqual(shared);
  });

  it('round-trips an empty build without flags or notes', async () => {
    const empty = { name: 'Blank', slots: {}, flags: [] };
    expect(await decodeShare(await encodeShare(empty))).toEqual(empty);
  });

  it('only uses characters that are safe in a URL hash, and stays short', async () => {
    const code = await encodeShare(shared);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThan(400);
  });

  it('refuses damaged or truncated codes with a readable message', async () => {
    const code = await encodeShare(shared);
    await expect(decodeShare(code.slice(0, code.length / 2))).rejects.toThrow(/damaged or incomplete/);
    await expect(decodeShare('not a code!')).rejects.toThrow(ShareError);
    await expect(decodeShare('')).rejects.toThrow(ShareError);
  });

  it('says so when a link comes from a newer version', async () => {
    await expect(decodeShare(await codeFor({ v: 2, n: 'Future', s: {} }))).rejects.toThrow(/newer version/);
  });

  it('refuses payloads that are not builds', async () => {
    await expect(decodeShare(await codeFor({ v: 1, n: 'X', s: { dial: 'no-slash' } }))).rejects.toThrow(/does not describe a build/);
    await expect(decodeShare(await codeFor({ v: 1, n: 'X', s: { wristband: 'core/x' } }))).rejects.toThrow(/does not describe a build/);
    await expect(decodeShare(await codeFor({ v: 1, n: 'X', s: {}, f: ['glue-it'] }))).rejects.toThrow(/does not describe a build/);
  });

  it('builds the URL from the page the app is served from', () => {
    expect(shareUrl('abc', { origin: 'https://example.com', pathname: '/watch/' })).toBe('https://example.com/watch/#/share/abc');
  });
});
