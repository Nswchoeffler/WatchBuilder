// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { blankPart } from '../../data/blankParts';
import type { PartOf } from '../../domain/schemas';
import { artIds, artRoles, artWarnings, measureArt, type ArtMeasure, type Box } from './scaleCheck';

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 40 40">${body}</svg>`;
const box = (width: number, height = width, x = -width / 2, y = -height / 2): Box => ({ x, y, width, height });
const measured = (overall: Box, groups: ArtMeasure['groups'] = {}): ArtMeasure => ({ overall, groups });

const dial = { ...blankPart('dial', 'dl'), diameter: 28.5 } as PartOf<'dial'>;
const kase = { ...blankPart('case', 'cs'), diameter: 40 } as PartOf<'case'>;
const insert = { ...blankPart('bezelInsert', 'bi'), outerDiameter: 38, innerDiameter: 31 } as PartOf<'bezelInsert'>;
const hands = blankPart('hands', 'hd') as PartOf<'hands'>;

describe('artIds / artRoles', () => {
  it('lists element ids and data roles', () => {
    const markup = svg('<g id="hour"><path data-role="metal" d="M0 0"/></g><circle id="c" data-role="lume" r="1"/>');
    expect(artIds(markup)).toEqual(new Set(['hour', 'c']));
    expect(artRoles(markup)).toEqual(new Set(['metal', 'lume']));
  });

  it('returns null for markup that will not parse', () => {
    expect(artIds('<svg')).toBeNull();
  });
});

describe('artWarnings (spec §5)', () => {
  it('passes a dial drawn to its diameter', () => {
    expect(artWarnings(dial, new Set(), measured(box(28.6)))).toEqual([]);
  });

  it('flags a dial drawn at the wrong size, naming both sizes', () => {
    const [w] = artWarnings(dial, new Set(), measured(box(30)));
    expect(w).toMatch(/30 mm/);
    expect(w).toMatch(/28.5 mm/);
    expect(w).toMatch(/1 unit = 1 mm/);
  });

  it('gives cases a looser tolerance than dials', () => {
    expect(artWarnings(kase, new Set(), measured(box(40.9, 48)))).toEqual([]);
    expect(artWarnings(kase, new Set(), measured(box(41.2, 48)))).toHaveLength(1);
  });

  it('checks a bezel insert by its outer diameter', () => {
    expect(artWarnings(insert, new Set(), measured(box(38.2)))).toEqual([]);
    expect(artWarnings(insert, new Set(), measured(box(40)))).toHaveLength(1);
  });

  it('measures the minute hand from the pivot to its tip', () => {
    const ids = new Set(['hour', 'minute', 'seconds']);
    const length = hands.lengths.minute;
    const ok = measured(box(30), { minute: { x: -0.5, y: -length, width: 1, height: length + 2 } });
    expect(artWarnings(hands, ids, ok)).toEqual([]);
    const short = measured(box(30), { minute: { x: -0.5, y: -(length - 2), width: 1, height: length } });
    expect(artWarnings(hands, ids, short)[0]).toMatch(/minute hand length/);
  });

  it('names the hand groups a hands file is missing, even without measuring', () => {
    const [w] = artWarnings(hands, new Set(['hour']), null);
    expect(w).toContain('<g id="minute">');
    expect(hands.lengths.seconds === null || w!.includes('<g id="seconds">')).toBe(true);
  });

  it('warns when a strap has no top half', () => {
    const strap = blankPart('strap', 'st') as PartOf<'strap'>;
    expect(artWarnings(strap, new Set(['bottom']), null)[0]).toMatch(/id="top"/);
    expect(artWarnings(strap, new Set(['top']), null)).toEqual([]);
  });

  it('skips size checks when the art could not be measured', () => {
    expect(artWarnings(dial, new Set(), null)).toEqual([]);
  });
});

describe('measureArt', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns null without a layout engine (jsdom has no getBBox)', () => {
    expect(measureArt(svg('<circle r="14"/>'), 'dial')).toBeNull();
  });

  it('measures the whole drawing and each named group, then cleans up', () => {
    // Stand in for layout: a box's height depends on which hand it contains.
    const proto = window.SVGElement.prototype as unknown as { getBBox?: () => DOMRect };
    proto.getBBox = function (this: Element) {
      const inner = this.querySelector('[id$="minute"]') ? 20 : this.querySelector('[id$="hour"]') ? 12 : 30;
      return { x: -1, y: -inner, width: 2, height: inner } as DOMRect;
    };
    try {
      const before = document.body.children.length;
      const m = measureArt(svg('<g id="hour"><path d="M0 0"/></g><g id="minute"><path d="M0 0"/></g>'), 'hands');
      expect(m?.groups.hour?.y).toBe(-12);
      expect(m?.groups.minute?.y).toBe(-20);
      expect(m?.overall).toBeTruthy();
      expect(document.body.children.length).toBe(before);
    } finally {
      delete proto.getBBox;
    }
  });
});
