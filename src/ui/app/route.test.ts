import { describe, expect, it } from 'vitest';
import { href, parseHash } from './route';

describe('hash routes', () => {
  it('defaults to the library', () => {
    expect(parseHash('')).toEqual({ name: 'builds' });
    expect(parseHash('#/')).toEqual({ name: 'builds' });
    expect(parseHash('#/builds')).toEqual({ name: 'builds' });
  });

  it('parses builder, catalog and compare routes', () => {
    expect(parseHash('#/build/abc-123')).toEqual({ name: 'build', id: 'abc-123' });
    expect(parseHash('#/catalog')).toEqual({ name: 'catalog' });
    expect(parseHash(href.packs())).toEqual({ name: 'packs' });
    expect(parseHash(href.share('abc_-12'))).toEqual({ name: 'share', code: 'abc_-12' });
    expect(parseHash('#/compare?ids=a,b,a,c')).toEqual({ name: 'compare', ids: ['a', 'b', 'c'] });
    expect(parseHash('#/compare')).toEqual({ name: 'compare', ids: [] });
  });

  it('reports unknown paths', () => {
    expect(parseHash('#/nope/x/y')).toEqual({ name: 'not-found', path: '/nope/x/y' });
  });

  it('round-trips hrefs, including awkward ids', () => {
    expect(parseHash(href.build('a b/c'))).toEqual({ name: 'build', id: 'a b/c' });
    expect(parseHash(href.compare(['x', 'y']))).toEqual({ name: 'compare', ids: ['x', 'y'] });
  });
});
