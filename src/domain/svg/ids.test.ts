// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { prefixSvgIds } from './ids';

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 40 40">${body}</svg>`;

describe('prefixSvgIds', () => {
  it('prefixes defined ids', () => {
    const out = prefixSvgIds(svg('<g id="hour"/>'), 'p-');
    expect(out).toContain('id="p-hour"');
  });

  it('rewrites url(#id) references to match', () => {
    const out = prefixSvgIds(
      svg('<defs><linearGradient id="g"><stop offset="0"/></linearGradient></defs><rect fill="url(#g)"/>'),
      'p-',
    );
    expect(out).toContain('id="p-g"');
    expect(out).toContain('fill="url(#p-g)"');
  });

  it('rewrites quoted url() references', () => {
    const out = prefixSvgIds(svg('<g id="g"/><rect fill="url(\'#g\')"/>'), 'p-');
    expect(out).toContain('url(#p-g)');
  });

  it('rewrites href targets', () => {
    const out = prefixSvgIds(svg('<g id="top"/><use href="#top"/>'), 'p-');
    expect(out).toContain('href="#p-top"');
  });

  it('leaves references to undefined ids alone', () => {
    // Already broken; re-pointing it could attach it to another part's node.
    const out = prefixSvgIds(svg('<rect fill="url(#missing)"/>'), 'p-');
    expect(out).toContain('url(#missing)');
  });

  it('does not rewrite an id that merely shares a prefix with another', () => {
    const out = prefixSvgIds(svg('<g id="a"/><g id="ab"/><rect fill="url(#ab)"/>'), 'p-');
    expect(out).toContain('url(#p-ab)');
    expect(out).not.toContain('url(#p-ab)b');
  });

  it('keeps two parts from colliding', () => {
    const art = svg('<defs><linearGradient id="g"/></defs><rect fill="url(#g)"/>');
    const a = prefixSvgIds(art, 'w1-dial-');
    const b = prefixSvgIds(art, 'w1-bezel-');
    expect(a).toContain('url(#w1-dial-g)');
    expect(b).toContain('url(#w1-bezel-g)');
    expect(a).not.toEqual(b);
  });

  it('is a no-op for art with no ids, an empty prefix, or unparseable markup', () => {
    const plain = svg('<circle r="1"/>');
    expect(prefixSvgIds(plain, 'p-')).toEqual(plain);
    expect(prefixSvgIds(svg('<g id="x"/>'), '')).toEqual(svg('<g id="x"/>'));
    expect(prefixSvgIds('<svg><g></svg>', 'p-')).toEqual('<svg><g></svg>');
  });

  it('escapes regex metacharacters in an id', () => {
    const out = prefixSvgIds(svg('<g id="a.b"/><rect fill="url(#a.b)"/>'), 'p-');
    expect(out).toContain('id="p-a.b"');
    expect(out).toContain('url(#p-a.b)');
  });
});
