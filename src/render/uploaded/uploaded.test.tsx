// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ResolvedParts } from '../../domain/rules';
import { Catalog } from '../../data/catalog';
import { validatePack } from '../../data/packs';
import { loadCorePack } from '../../data/catalog';
import { PACK_FORMAT, PACK_SCHEMA_VERSION, type PartOf, type PartType } from '../../domain/schemas';
import { WatchSvg } from '../WatchSvg';
import { prepareArt } from './prepare';

const art = (body: string, attrs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 40 40"${attrs ? ' ' + attrs : ''}>${body}</svg>`;

describe('prepareArt', () => {
  it('drops the root <svg> so the art is not rescaled by a nested viewport', () => {
    const out = prepareArt(art('<circle r="5"/>'), { prefix: 'p-' })!;
    expect(out.rest).not.toContain('<svg');
    expect(out.rest).not.toContain('viewBox');
    expect(out.rest).toContain('<circle r="5"');
  });

  it('carries the root presentation attributes onto the wrapping group', () => {
    const out = prepareArt(art('<circle r="5"/>', 'fill="#334455"'), { prefix: 'p-' })!;
    expect(out.rest).toContain('fill="#334455"');
  });

  it('prefixes ids and their references', () => {
    const out = prepareArt(art('<defs><linearGradient id="g"/></defs><rect fill="url(#g)"/>'), { prefix: 'p-' })!;
    expect(out.rest).toContain('id="p-g"');
    expect(out.rest).toContain('url(#p-g)');
  });

  it('recolours role-tagged elements', () => {
    const out = prepareArt(art('<circle r="5" data-role="primary" fill="#000000"/>'), {
      prefix: 'p-',
      colors: { primary: '#ff0000' },
    })!;
    expect(out.rest).toContain('fill="#ff0000"');
  });

  it('recolours an outline on its stroke instead of filling it in', () => {
    const out = prepareArt(art('<circle r="5" data-role="accent" fill="none" stroke="#000000"/>'), {
      prefix: 'p-',
      colors: { accent: '#00ff00' },
    })!;
    expect(out.rest).toContain('stroke="#00ff00"');
    expect(out.rest).toContain('fill="none"');
  });

  it('leaves untagged elements alone', () => {
    const out = prepareArt(art('<circle r="5" fill="#123456"/>'), { prefix: 'p-', colors: { primary: '#ff0000' } })!;
    expect(out.rest).toContain('fill="#123456"');
  });

  it('extracts requested groups and removes them from the rest', () => {
    const out = prepareArt(art('<g id="hour"><path d="M0 0"/></g><circle r="1"/>'), {
      prefix: 'p-',
      groupIds: ['hour', 'minute'],
    })!;
    expect(out.groups.hour).toContain('M0 0');
    expect(out.groups.minute).toBeUndefined();
    expect(out.rest).not.toContain('M0 0');
    expect(out.rest).toContain('<circle');
  });

  it('returns null for markup that will not parse', () => {
    expect(prepareArt('<svg><g></svg>', { prefix: 'p-' })).toBeNull();
  });
});

/** Minimal resolved parts carrying an uploaded visual, enough for the scene to draw. */
const svgVisual = (assetId: string) => ({ kind: 'svg' as const, assetId });

const corePart = <T extends PartType>(type: T): PartOf<T> =>
  loadCorePack().parts.find((p): p is PartOf<T> => p.type === type)!;

const render = (parts: ResolvedParts, artMap: Record<string, string>) =>
  renderToStaticMarkup(<WatchSvg parts={parts} art={artMap} idPrefix="t" />);

describe('WatchSvg with uploaded art', () => {
  it('draws the upload instead of the fallback template', () => {
    const dial = { ...corePart('dial'), visual: svgVisual('a') };
    const out = render({ dial } as ResolvedParts, { dial: art('<circle r="9" data-testid="up"/>') });
    expect(out).toContain('data-art="uploaded"');
    expect(out).not.toContain('svg-pending');
    expect(out).toContain('r="9"');
  });

  it('still falls back when a part is an upload but its art is missing', () => {
    const dial = { ...corePart('dial'), visual: svgVisual('a') };
    const out = render({ dial } as ResolvedParts, {});
    expect(out).toContain('data-fallback="svg-pending"');
  });

  it('rotates each hand group to the display time', () => {
    const hands = { ...corePart('hands'), visual: svgVisual('a') };
    const out = render({ hands } as ResolvedParts, {
      hands: art('<g id="hour"><path d="M0 0"/></g><g id="minute"><path d="M1 1"/></g>'),
    });
    // 10:08:37 → hour and minute hands sit at different angles.
    const rotations = [...out.matchAll(/rotate\(([-\d.]+)\)/g)].map((m) => Number(m[1]));
    expect(rotations.length).toBeGreaterThanOrEqual(2);
    expect(new Set(rotations).size).toBeGreaterThan(1);
  });

  it('draws hand art with no groups rather than nothing', () => {
    const hands = { ...corePart('hands'), visual: svgVisual('a') };
    const out = render({ hands } as ResolvedParts, { hands: art('<path d="M2 2"/>') });
    expect(out).toContain('M2 2');
  });

  it('places both strap halves on the spring bars', () => {
    const strap = { ...corePart('strap'), visual: svgVisual('a') };
    const out = render({ strap } as ResolvedParts, {
      strap: art('<g id="top"><path d="M0 0"/></g><g id="bottom"><path d="M1 1"/></g>'),
    });
    expect(out).toContain('M0 0');
    expect(out).toContain('M1 1');
    expect(out).toMatch(/translate\(0 -?\d/);
  });

  it('mirrors the top half when a strap file has no bottom group', () => {
    const strap = { ...corePart('strap'), visual: svgVisual('a') };
    const out = render({ strap } as ResolvedParts, { strap: art('<g id="top"><path d="M0 0"/></g>') });
    expect(out).toContain('scale(1 -1)');
  });

  it('moves crown art out to the case edge', () => {
    const crown = { ...corePart('crown'), visual: svgVisual('a') };
    const caseP = corePart('case');
    const out = render({ crown, case: caseP } as ResolvedParts, { crown: art('<rect width="3" height="3"/>') });
    expect(out).toContain(`translate(${caseP.diameter / 2} 0)`);
  });

  it('gives two uploads on one scene different id namespaces', () => {
    const dial = { ...corePart('dial'), visual: svgVisual('a') };
    const bezel = { ...corePart('bezel'), visual: svgVisual('a') };
    const gradient = art('<defs><linearGradient id="g"/></defs><rect fill="url(#g)"/>');
    const out = render({ dial, bezel } as ResolvedParts, { dial: gradient, bezel: gradient });
    expect(out).toContain('id="t-dial-art-g"');
    expect(out).toContain('id="t-bezel-art-g"');
  });
});

describe('Catalog.artFor', () => {
  const packWithAsset = validatePack({
    format: PACK_FORMAT,
    schemaVersion: PACK_SCHEMA_VERSION,
    id: 'mine',
    name: 'My Parts',
    version: '1.0.0',
    parts: [{ ...corePart('dial'), id: 'my-dial', visual: svgVisual('art-1') }],
    assets: { 'art-1': { mime: 'image/svg+xml', data: art('<circle r="5"/>') } },
  });

  it('resolves an uploaded part to its markup', () => {
    const catalog = new Catalog([packWithAsset]);
    const out = catalog.artFor({ dial: { packId: 'mine', partId: 'my-dial' } });
    expect(out.dial).toContain('<circle r="5"');
  });

  it('omits slots that draw from a template', () => {
    const catalog = new Catalog([loadCorePack()]);
    const core = loadCorePack();
    const dial = core.parts.find((p) => p.type === 'dial')!;
    expect(catalog.artFor({ dial: { packId: core.id, partId: dial.id } })).toEqual({});
  });
});
