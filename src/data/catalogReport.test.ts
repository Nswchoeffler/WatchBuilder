import { describe, expect, it } from 'vitest';
import { evaluate } from '../domain/rules';
import { catalogWith, core, coreCatalog, corePart } from '../domain/rules/testkit';
import { catalogReport, findBuilds, formatReport } from './catalogReport';

const ref = (partId: string, packId = 'core') => ({ packId, partId });

describe('findBuilds', () => {
  it('only returns complete builds the engine calls valid', () => {
    const builds = findBuilds(coreCatalog, { case: ref('cs-sub40') }, { limit: 50 });
    expect(builds).toHaveLength(50);
    for (const slots of builds) {
      const report = evaluate({ slots, flags: [] }, coreCatalog);
      expect(report.missingSlots).toEqual([]);
      expect(['valid', 'warnings']).toContain(report.status);
      expect(slots.case).toEqual(ref('cs-sub40'));
    }
  });

  it('finds nothing for a part that fits no case', () => {
    const strap = { ...corePart('st-oyster-22-diver42', 'strap'), id: 'st-wide', width: 30 };
    const catalog = catalogWith([strap]);
    expect(findBuilds(catalog, { strap: ref('st-wide', 'test') })).toEqual([]);
    expect(findBuilds(catalog, { strap: ref('st-wide', 'test') }, { allowMods: true })).toEqual([]);
  });

  it('accepts a build that needs a mod only when mods are allowed', () => {
    // No core case takes a Miyota movement, so this Miyota-feet dial only fits an NH with dial dots.
    const fixed = { dial: ref('dl-sterile-miyota') };
    expect(findBuilds(coreCatalog, fixed)).toEqual([]);
    const [slots] = findBuilds(coreCatalog, fixed, { allowMods: true });
    expect(evaluate({ slots: slots!, flags: ['dial-dots'] }, coreCatalog).status).not.toBe('invalid');
  });
});

describe('core catalog report', () => {
  const report = catalogReport(coreCatalog, 'core', 2);

  it('covers every core part once', () => {
    expect(report.parts).toHaveLength(core.parts.length);
  });

  // Roadmap 6.4 acceptance.
  it('gives every core case at least two valid builds', () => {
    expect(report.caseBuilds.filter((c) => c.count < 2).map((c) => c.ref.partId)).toEqual([]);
  });

  it('gives a reason for every unverified core part', () => {
    const missing = report.parts.filter((p) => p.part.confidence === 'unverified' && !p.part.notes?.trim());
    expect(missing.map((p) => p.ref.partId)).toEqual([]);
  });

  it('formats as Markdown with each section', () => {
    const md = formatReport(report);
    for (const heading of ['## Problems', '## Confidence by type', '## Unverified parts', "## Parts that can't form a valid build", '## Valid builds per case'])
      expect(md).toContain(heading);
    expect(md).toContain('`mv-m8215`');
  });
});
