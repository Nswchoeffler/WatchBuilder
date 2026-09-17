import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SAMPLE_BUILDS } from '../data/sampleBuilds';
import { resolveParts, type ResolvedParts } from '../domain/rules';
import { build, catalogWith, core, coreCatalog, corePart, mixedBuild } from '../domain/rules/testkit';
import { PART_TYPES, type Part } from '../domain/schemas';
import { sizedSvg, viewBoxOf, widthForScale } from './export';
import { LAYER_ORDER, WatchSvg } from './WatchSvg';

const render = (parts: ResolvedParts, idPrefix = 't') => renderToStaticMarkup(<WatchSvg parts={parts} idPrefix={idPrefix} />);
const partsOf = (slots: Parameters<typeof build>[0]) => resolveParts(build(slots), coreCatalog).parts;

const sample = (id: string) => {
  const s = SAMPLE_BUILDS.find((b) => b.id === id);
  if (!s) throw new Error(id);
  return partsOf(s.slots);
};

const layers = (svg: string) => [...svg.matchAll(/data-layer="([a-zA-Z]+)"/g)].map((m) => m[1]);
const attr = (svg: string, layer: string, name: string) =>
  new RegExp(`data-layer="${layer}"[^>]*?${name}="([^"]*)"|${name}="([^"]*)"[^>]*?data-layer="${layer}"`).exec(svg)?.slice(1).find(Boolean);

/** Every url(#id) and href="#id" must point at an element in the same document. */
function brokenRefs(svg: string): string[] {
  const ids = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const refs = [...svg.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map((m) => m[1] ?? m[2]);
  return [...new Set(refs.filter((r): r is string => !!r && !ids.has(r)))];
}

describe('WatchSvg', () => {
  describe.each(SAMPLE_BUILDS.map((b) => [b.id]))('sample build %s', (id) => {
    const svg = render(sample(id));

    it('draws every filled slot (except movement) with its own template, in layer order', () => {
      const s = SAMPLE_BUILDS.find((b) => b.id === id)!;
      const expected = LAYER_ORDER.filter((t) => s.slots[t]);
      expect(layers(svg)).toEqual(expected);
      expect(svg).not.toContain('data-fallback');
    });

    it('has no dangling url(#…) / href references', () => {
      expect(brokenRefs(svg)).toEqual([]);
    });

    it('has unique element ids', () => {
      const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      expect(ids.length).toBe(new Set(ids).size);
    });
  });

  it('is drawn at true scale: 1 SVG unit = 1mm', () => {
    const diver = render(sample('diver-classic'));
    expect(diver).toContain('<circle r="21"'); // Ø42 case body
    const fluted = render(sample('fluted-sunburst'));
    expect(fluted).toContain('<circle r="18"'); // Ø36 case body
    // 36mm case frames narrower than 42mm case.
    expect(viewBoxOf(fluted)![2]).toBeLessThan(viewBoxOf(diver)![2]);
  });

  it('frames lug-to-lug plus strap; head framing crops at the lugs', () => {
    const parts = sample('diver-classic');
    const [, y, , h] = viewBoxOf(render(parts))!;
    expect(h).toBeCloseTo(46 + 44, 5);
    expect(y).toBeCloseTo(-45, 5);
    const head = renderToStaticMarkup(<WatchSvg parts={parts} idPrefix="h" framing="head" />);
    expect(viewBoxOf(head)![3]).toBeCloseTo(46 + 3, 5);
  });

  it('rotates the crown to the case crown position', () => {
    expect(attr(render(partsOf({ case: 'cs-diver42-30', crown: 'cw-diver42' })), 'crown', 'transform')).toBe('rotate(0)');
    const rotated = attr(render(partsOf({ case: 'cs-diver42-38', crown: 'cw-diver42' })), 'crown', 'transform');
    expect(Number(/rotate\(([\d.]+)\)/.exec(rotated ?? '')?.[1])).toBeCloseTo(23.226, 2);
  });

  it('places the date window at the dial window angle and radius', () => {
    const svg = render(partsOf({ dial: 'dl-diver-black' }));
    // 28.5mm dial → r 14.25 × 0.76 = 10.83 at 3:00, no rotation.
    expect(svg).toContain('translate(10.83 0) rotate(0)');
  });

  it('draws a magnified date only when the crystal has a magnifier', () => {
    const withLens = render(partsOf({ dial: 'dl-sub-black', crystal: 'cy-sub40-magnifier' }));
    const noLens = render(partsOf({ dial: 'dl-sub-black', crystal: 'cy-diver42-flat' }));
    expect(withLens).toContain('scale(1.6)');
    expect(noLens).not.toContain('scale(1.6)');
  });

  it('two watches on one page never share ids', () => {
    const idsOf = (svg: string) => new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    const a = idsOf(render(sample('diver-classic'), 'a'));
    const b = idsOf(render(sample('diver-classic'), 'b'));
    expect([...a].filter((x) => b.has(x))).toEqual([]);
  });

  it('renders an empty build without throwing', () => {
    const svg = render({});
    expect(viewBoxOf(svg)).not.toBeNull();
    expect(layers(svg)).toEqual([]);
  });

  describe('every core part renders on its own with a real template', () => {
    const rendered = core.parts.filter((p) => p.type !== 'movement');
    it.each(rendered.map((p) => [p.id, p] as [string, Part]))('%s', (_, part) => {
      const svg = render({ [part.type]: part } as ResolvedParts);
      expect(layers(svg)).toEqual([part.type]);
      expect(svg).not.toContain('data-fallback');
      expect(brokenRefs(svg)).toEqual([]);
    });
  });

  it('falls back safely for unknown templates and uploaded-SVG visuals', () => {
    const dial = corePart('dl-diver-black', 'dial');
    const catalog = catalogWith([
      { ...dial, id: 'dl-unknown', visual: { kind: 'template', template: 'dial/does-not-exist', params: {} } },
    ]);
    const unknown = resolveParts(mixedBuild({ dial: 'test:dl-unknown' }), catalog).parts;
    expect(render(unknown)).toContain('data-fallback="unknown-template:dial/does-not-exist"');

    const svgVisual = { dial: { ...dial, visual: { kind: 'svg', assetId: 'art' } } } as ResolvedParts;
    expect(render(svgVisual)).toContain('data-fallback="svg-pending"');
  });

  it('covers every part type except movement in the layer order', () => {
    expect([...LAYER_ORDER].sort()).toEqual(PART_TYPES.filter((t) => t !== 'movement').sort());
  });
});

describe('export helpers', () => {
  const svg = render(sample('diver-classic'));

  it('sizes an SVG in pixels keeping the viewBox aspect ratio', () => {
    const [, , w, h] = viewBoxOf(svg)!;
    const sized = sizedSvg(svg, 800);
    expect(sized).toMatch(/<svg[^>]* width="800" height="(\d+)"/);
    expect(Number(/<svg[^>]*\sheight="(\d+)"/.exec(sized)![1])).toBe(Math.round((800 * h) / w));
  });

  it('replaces existing size attributes rather than duplicating them', () => {
    const twice = sizedSvg(sizedSvg(svg, 400), 800);
    expect(twice.match(/<svg[^>]*>/)![0].match(/ width=/g)).toHaveLength(1);
  });

  it('computes pixel width from a physical scale', () => {
    expect(widthForScale(svg, 20)).toBe(Math.round(viewBoxOf(svg)![2] * 20));
  });
});
