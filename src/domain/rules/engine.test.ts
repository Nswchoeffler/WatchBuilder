import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DATE_STEP_DEG } from '../schemas';
import { angularDistance, movementToDial, offGrid } from './geometry';
import { RULES, candidatesFor, evaluate, type Candidate } from './index';
import { build, catalogWith, coreCatalog, corePart, ids, mixedBuild } from './testkit';

describe('geometry', () => {
  it('offGrid measures distance to the nearest multiple', () => {
    expect(offGrid(23.2258, DATE_STEP_DEG)).toBeCloseTo(0, 3);
    expect(offGrid(-23.2258, DATE_STEP_DEG)).toBeCloseTo(0, 3);
    expect(offGrid(-23.2258, 360 / 14)).toBeCloseTo(2.488, 2);
    expect(offGrid(45, DATE_STEP_DEG)).toBeCloseTo(4 * DATE_STEP_DEG - 45, 3); // nearest multiple is 46.45°
  });

  it('angularDistance wraps around 12 o’clock', () => {
    expect(angularDistance(355, 5)).toBe(10);
    expect(angularDistance(90, 270)).toBe(180);
  });

  it('movementToDial rotates clockwise with the crown', () => {
    expect(movementToDial(270, 2)).toBeCloseTo(293.23, 2);
    expect(movementToDial(350, 3)).toBeCloseTo(24.84, 2);
  });
});

describe('registry', () => {
  it('has unique rule ids', () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('matches the rule ids documented in docs/compatibility-spec.md §6', () => {
    const doc = readFileSync(new URL('../../../docs/compatibility-spec.md', import.meta.url), 'utf8');
    const section = doc.slice(doc.indexOf('## 6. Rules'), doc.indexOf('## 7.'));
    const documented = [...new Set([...section.matchAll(/\*\*(R-[A-Z]+-\d+)/g)].map((m) => m[1]))].sort();
    expect(RULES.map((r) => r.id).sort()).toEqual(documented);
  });

  it('declares every slot a rule requires in its slots list', () => {
    for (const rule of RULES) expect(rule.slots, rule.id).toEqual(expect.arrayContaining([...rule.requires]));
  });
});

describe('evaluate', () => {
  it('reports unresolved refs and marks the build invalid', () => {
    const r = evaluate(
      { slots: { case: { packId: 'core', partId: 'cs-nope' }, dial: { packId: 'core', partId: 'mv-nh35' } }, flags: [] },
      coreCatalog,
    );
    expect(r.status).toBe('invalid');
    expect(r.unresolved).toEqual([
      { slot: 'case', ref: { packId: 'core', partId: 'cs-nope' }, reason: 'missing' },
      { slot: 'dial', ref: { packId: 'core', partId: 'mv-nh35' }, reason: 'wrong-type' },
    ]);
  });

  it('lists flags that did nothing', () => {
    const r = evaluate(build({ case: 'cs-diver42-38' }, ['dial-dots', 'movement-spacer']), coreCatalog);
    expect(r.unusedFlags).toEqual(['dial-dots', 'movement-spacer']);
  });

  it('sorts errors before warnings before info', () => {
    const r = evaluate(
      build({ case: 'cs-sub40', movement: 'mv-nh35', dial: 'dl-openheart-silver', crystal: 'cy-sub40-magnifier', strap: 'st-oyster-22-diver42' }),
      coreCatalog,
    );
    const order = r.results.map((x) => x.severity);
    expect(order).toEqual([...order].sort((a, b) => ['error', 'warning', 'info'].indexOf(a) - ['error', 'warning', 'info'].indexOf(b)));
    expect(order).toContain('error');
    expect(order).toContain('warning');
    expect(order).toContain('info');
  });

  it('an empty build is incomplete, not invalid', () => {
    const r = evaluate(build({}), coreCatalog);
    expect(r.status).toBe('incomplete');
    expect(r.missingSlots).toEqual(['movement', 'case', 'dial', 'hands', 'crystal', 'crown', 'strap']);
  });
});

describe('rules with custom parts', () => {
  const dial = corePart('dl-diver-black', 'dial');
  const nh36 = corePart('mv-nh36', 'movement');
  const hands = corePart('hd-nh-mercedes', 'hands');
  const ring = corePart('cr-mid-silver', 'chapterRing');

  const catalog = catalogWith([
    { ...dial, id: 'dl-date-430', crownSteps: [0], dateWindow: { angle: 135 } },
    { ...dial, id: 'dl-date-38', crownSteps: [0, 2], dateWindow: { angle: 113.2258 } },
    { ...dial, id: 'dl-daydate-30', crownSteps: [0], dayWindow: { angle: 90 } },
    { ...dial, id: 'dl-feetless', feetSystem: 'none', crownSteps: [0] },
    { ...dial, id: 'dl-small', diameter: 27.8, crownSteps: [0, 2] },
    { ...dial, id: 'dl-openheart-38', crownSteps: [2], dateWindow: null, openHeartAperture: { angle: 293.2258 } },
    { ...nh36, id: 'mv-nh36-38', day: { angle: 90, crownSteps: 2 } },
    { ...hands, id: 'hd-no-seconds', holes: { ...hands.holes, seconds: null }, lengths: { ...hands.lengths, seconds: null } },
    { ...hands, id: 'hd-long', lengths: { ...hands.lengths, minute: 14.5 } },
    { ...ring, id: 'cr-wide', innerDiameter: 28.6, outerDiameter: 30.5 },
  ]);

  const run = (slots: Parameters<typeof mixedBuild>[0], flags: Parameters<typeof mixedBuild>[1] = []) =>
    evaluate(mixedBuild(slots, flags), catalog);

  it('R-MD-2: a date window between date steps is off-centre', () => {
    const r = run({ movement: 'mv-nh35', dial: 'test:dl-date-430', case: 'cs-diver42-30' });
    expect(ids(r, 'warning')).toEqual(['R-MD-2']);
    expect(r.results[0]?.message).toMatch(/1\.5° off-centre/);
  });

  it('R-MD-2: a date window placed at 3.8 is still on a date step', () => {
    expect(run({ movement: 'mv-nh35', dial: 'test:dl-date-38', case: 'cs-diver42-38' }).results).toEqual([]);
    expect(run({ movement: 'mv-nh35', dial: 'test:dl-date-38', case: 'cs-diver42-30' }).results).toEqual([]);
  });

  it('R-MD-3: matching day wheel and crown position has no finding', () => {
    expect(run({ movement: 'mv-nh36', dial: 'test:dl-daydate-30', case: 'cs-diver42-30' }).results).toEqual([]);
    expect(run({ movement: 'test:mv-nh36-38', dial: 'dl-diver-daydate', case: 'cs-diver42-38' }).results).toEqual([]);
  });

  it('R-MD-3: day dial on a movement with no day wheel', () => {
    expect(ids(run({ movement: 'mv-nh35', dial: 'dl-diver-daydate' }), 'error')).toEqual(['R-MD-3']);
  });

  it('R-MD-1 / R-CD-1: feetless dials skip feet and crown checks', () => {
    const r = run({ movement: 'mv-m8215', dial: 'test:dl-feetless', case: 'cs-diver42-38' });
    expect(ids(r, 'error')).toEqual(['R-MC-1']);
    expect(ids(r, 'info')).toEqual(['R-MD-1']);
  });

  it('R-MD-4: aperture cut for 3.8 lines up in a 3.8 case, misses in a 3:00 case', () => {
    expect(run({ movement: 'mv-nh38', dial: 'test:dl-openheart-38', case: 'cs-diver42-38' }).results).toEqual([]);
    const r = run({ movement: 'mv-nh38', dial: 'test:dl-openheart-38', case: 'cs-diver42-30' });
    expect(ids(r, 'error')).toEqual(['R-CD-1', 'R-MD-4']);
  });

  it('R-CD-2: undersized dial is an error, or a warning when a ring hides the gap', () => {
    expect(ids(run({ case: 'cs-diver42-38', dial: 'test:dl-small' }), 'error')).toEqual(['R-CD-2']);
    const covered = run({ case: 'cs-diver42-38', dial: 'test:dl-small', chapterRing: 'cr-diver42-silver' });
    expect(ids(covered, 'error')).toEqual([]);
    expect(ids(covered, 'warning')).toEqual(['R-CD-2']);
  });

  it('R-CR-3: ring opening wider than the dial', () => {
    expect(ids(run({ dial: 'dl-diver-black', chapterRing: 'test:cr-wide' }), 'warning')).toEqual(['R-CR-3']);
  });

  it('R-MH-1: missing seconds hand is a warning', () => {
    expect(ids(run({ movement: 'mv-nh35', hands: 'test:hd-no-seconds' }), 'warning')).toEqual(['R-MH-1']);
  });

  it('R-MH-2: GMT hands on a non-GMT movement, and a GMT movement without a GMT hand', () => {
    expect(ids(run({ movement: 'mv-nh35', hands: 'hd-nh34-gmt' }), 'error')).toEqual(['R-MH-2']);
    expect(ids(run({ movement: 'mv-nh34', hands: 'hd-nh-mercedes' }), 'warning')).toEqual(['R-MH-2']);
  });

  it('R-HD-1: minute hand longer than the ring opening', () => {
    expect(ids(run({ hands: 'test:hd-long', dial: 'dl-diver-black', chapterRing: 'cr-diver42-silver' }), 'warning')).toEqual(['R-HD-1']);
    expect(ids(run({ hands: 'hd-nh-mercedes', dial: 'dl-diver-black', chapterRing: 'cr-diver42-silver' }), 'warning')).toEqual([]);
  });

  it('R-BI-1: insert without a bezel', () => {
    expect(ids(run({ bezelInsert: 'in-diver42-dive-black' }), 'error')).toEqual(['R-BI-1']);
  });
});

describe('candidatesFor', () => {
  const T1_NO_DIAL = {
    case: 'cs-diver42-38', movement: 'mv-nh35', hands: 'hd-nh-mercedes', bezel: 'bz-diver42-sloped',
    bezelInsert: 'in-diver42-dive-black', chapterRing: 'cr-diver42-silver', crystal: 'cy-diver42-dd',
    crown: 'cw-diver42', strap: 'st-oyster-22-diver42',
  };
  const byId = (list: Candidate<'dial'>[]) => Object.fromEntries(list.map((c) => [c.ref.partId, c]));

  it('grades every dial against the rest of the build, with reasons', () => {
    const dials = byId(candidatesFor('dial', build(T1_NO_DIAL), coreCatalog));
    expect(Object.keys(dials)).toHaveLength(8);
    expect(dials['dl-diver-black']?.compatibility).toBe('compatible');
    expect(dials['dl-sub-black']?.compatibility).toBe('incompatible');
    expect(dials['dl-sub-black']?.results.map((r) => r.ruleId)).toEqual(['R-CD-1']);
    expect(dials['dl-tapisserie-blue']?.results.map((r) => r.ruleId)).toContain('R-CD-2');
    expect(dials['dl-gmt-black']?.compatibility).toBe('incompatible'); // cut for 3:00 only
    expect(dials['dl-diver-daydate']?.compatibility).toBe('incompatible'); // NH35 has no day
  });

  it('respects modification flags', () => {
    const dials = byId(candidatesFor('dial', build(T1_NO_DIAL, ['dial-dots']), coreCatalog));
    expect(dials['dl-sub-black']?.compatibility).toBe('warnings');
  });

  it('ignores problems in unrelated slots', () => {
    // Wrong strap width must not grey out dials.
    const dials = byId(candidatesFor('dial', build({ ...T1_NO_DIAL, strap: 'st-jubilee-20' }), coreCatalog));
    expect(dials['dl-diver-black']?.compatibility).toBe('compatible');
  });

  it('with an empty build every strap is compatible', () => {
    expect(candidatesFor('strap', build({}), coreCatalog).every((c) => c.compatibility === 'compatible')).toBe(true);
  });
});
