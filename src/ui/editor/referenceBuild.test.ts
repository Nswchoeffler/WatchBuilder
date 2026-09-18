import { beforeAll, describe, expect, it } from 'vitest';
import { blankPart } from '../../data/blankParts';
import { Catalog, loadCorePack } from '../../data/catalog';
import type { Dial } from '../../domain/schemas';
import { companionsOf, countCompatible, DRAFT_REF, DraftCatalog, referenceBuild } from './referenceBuild';

let catalog: Catalog;
beforeAll(() => {
  catalog = new Catalog([loadCorePack()]);
});

describe('DraftCatalog', () => {
  it('offers the draft alongside the catalog, and hides the part it replaces', () => {
    const draft = blankPart('dial', 'dl-draft');
    const replaces = { packId: 'core', partId: 'dl-diver-black' };
    const source = new DraftCatalog(catalog, draft, replaces);

    expect(source.get(DRAFT_REF)).toBe(draft);
    const ids = source.list('dial').map((d) => d.ref.partId);
    expect(ids).toContain('draft');
    expect(ids).not.toContain('dl-diver-black');
    // Other types are untouched.
    expect(source.list('case').length).toBe(catalog.list('case').length);
  });
});

describe('referenceBuild', () => {
  it('fills the other required slots around the part being edited', () => {
    const { slots, parts, report } = referenceBuild(blankPart('dial', 'dl-draft'), catalog);
    expect(slots.dial).toEqual(DRAFT_REF);
    expect(parts.dial?.id).toBe('dl-draft');
    for (const slot of ['case', 'movement', 'hands', 'crystal', 'crown', 'strap'] as const) {
      expect(parts[slot], `expected a ${slot}`).toBeDefined();
    }
    expect(report.status).not.toBe('incomplete');
  });

  it('picks parts that fit: a default dial lands in a build with no errors', () => {
    const { report } = referenceBuild(blankPart('dial', 'dl-draft'), catalog);
    expect(report.results.filter((r) => r.severity === 'error')).toEqual([]);
  });

  /** Phase 5 acceptance: widening a dial past its case shows up as an error, not a quiet swap. */
  it('keeps pinned parts, so a part that stops fitting reports it', () => {
    const draft = blankPart('dial', 'dl-draft');
    const companions = companionsOf(referenceBuild(draft, catalog), 'dial');
    expect(companions.case).toBeDefined();

    const oversized: Dial = { ...draft, diameter: 30.8 };
    const pinned = referenceBuild(oversized, catalog, undefined, companions);
    expect(pinned.slots.case).toEqual(companions.case);
    const errors = pinned.report.results.filter((r) => r.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.message).join(' ')).toMatch(/dial/i);

    // Without pinning the preview finds a case the wider dial fits, which hides the problem.
    expect(referenceBuild(oversized, catalog).report.results.filter((r) => r.severity === 'error')).toEqual([]);
  });

  it('drops a pinned part that no longer belongs and fills the gap', () => {
    const draft = blankPart('dial', 'dl-draft');
    const stale = { case: { packId: 'core', partId: 'does-not-exist' } };
    const { parts } = referenceBuild(draft, catalog, undefined, stale);
    expect(parts.case?.id).not.toBe('does-not-exist');
    expect(parts.case).toBeDefined();
  });

  it('reports slots nothing in the catalog can fill', () => {
    // A case with a seat no bezel in the catalog matches can't complete a build.
    const odd = { ...blankPart('case', 'cs-draft'), bezelSeat: 'nothing-fits-this' };
    const { unfilled } = referenceBuild(odd, catalog);
    expect(unfilled).toContain('bezel');
  });
});

describe('countCompatible', () => {
  it('counts the cases a dial can go in', () => {
    const fits = countCompatible(blankPart('dial', 'dl-draft'), catalog, 'case');
    expect(fits).toBeGreaterThan(0);
    expect(fits).toBeLessThanOrEqual(catalog.list('case').length);

    const oversized: Dial = { ...blankPart('dial', 'dl-draft'), diameter: 30.8 };
    expect(countCompatible(oversized, catalog, 'case')).toBeLessThan(fits);
  });
});
