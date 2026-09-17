import { describe, expect, it } from 'vitest';
import { evaluate } from './index';
import { build, coreCatalog, ids } from './testkit';

// Reference builds T1–T13 from docs/seed-catalog.md, plus extras (T14+) found while building the engine.

const T1 = {
  case: 'cs-diver42-38',
  movement: 'mv-nh35',
  dial: 'dl-diver-black',
  hands: 'hd-nh-mercedes',
  bezel: 'bz-diver42-sloped',
  bezelInsert: 'in-diver42-dive-black',
  chapterRing: 'cr-diver42-silver',
  crystal: 'cy-diver42-dd',
  crown: 'cw-diver42',
  strap: 'st-oyster-22-diver42',
} as const;

const run = (slots: Parameters<typeof build>[0], flags: Parameters<typeof build>[1] = []) =>
  evaluate(build(slots, flags), coreCatalog);

describe('reference builds', () => {
  it('T1: classic Diver 42 build is valid with no findings', () => {
    const r = run(T1);
    expect(r.status).toBe('valid');
    expect(r.results).toEqual([]);
    expect(r.missingSlots).toEqual([]);
  });

  it('T2: dial cut for a 3:00 crown in a 3.8 case → R-CD-1', () => {
    const r = run({ ...T1, dial: 'dl-sub-black' });
    expect(r.status).toBe('invalid');
    expect(ids(r, 'error')).toEqual(['R-CD-1']);
    expect(r.results[0]).toMatchObject({ fix: 'dial-dots' });
    expect(r.results[0]?.message).toMatch(/3:00 crown; this case has a 3\.8 crown/);
  });

  it('T3: T2 with dial dots → warning only', () => {
    const r = run({ ...T1, dial: 'dl-sub-black' }, ['dial-dots']);
    expect(r.status).toBe('warnings');
    expect(ids(r, 'error')).toEqual([]);
    expect(ids(r, 'warning')).toEqual(['R-CD-1']);
    expect(r.results[0]).toMatchObject({ appliedFix: 'dial-dots' });
    expect(r.unusedFlags).toEqual([]);
  });

  it('T4: Miyota hands on an NH35 → R-MH-1 for hour, minute and seconds', () => {
    const r = run({ ...T1, hands: 'hd-m8215-baton' });
    expect(ids(r, 'error')).toEqual(['R-MH-1']);
    // 1.52 vs 1.50 hour (> 0.015), 1.00 vs 0.90 minute, 0.17 vs 0.20 seconds.
    expect(r.results.filter((x) => x.ruleId === 'R-MH-1')).toHaveLength(3);
  });

  it('T5: 20mm strap on 22mm lugs → R-CS-2', () => {
    const r = run({ ...T1, strap: 'st-jubilee-20' });
    expect(ids(r, 'error')).toEqual(['R-CS-2']);
  });

  it('T6: flat GMT insert in a sloped bezel → size and profile errors', () => {
    const r = run({ ...T1, bezelInsert: 'in-diver42-gmt-pepsi' });
    expect(ids(r, 'error')).toEqual(['R-BI-2', 'R-BI-3']);
  });

  it('T7: NH36 (3:00 day wheel) with day-date dial in a 3.8 case → day off-centre warning', () => {
    const r = run({ ...T1, movement: 'mv-nh36', dial: 'dl-diver-daydate' });
    expect(r.status).toBe('warnings');
    expect(ids(r, 'warning')).toEqual(['R-MD-3']);
    expect(r.results[0]?.message).toMatch(/2\.5° off-centre/);
  });

  it('T7b: …cleared to info by a day-wheel swap', () => {
    const r = run({ ...T1, movement: 'mv-nh36', dial: 'dl-diver-daydate' }, ['day-wheel-swap']);
    expect(r.status).toBe('valid');
    expect(ids(r, 'info')).toEqual(['R-MD-3']);
  });

  it('T8: GMT dial on NH35 in Sub-style 40 → no errors, info about unused 24h scale', () => {
    const r = run({ case: 'cs-sub40', movement: 'mv-nh35', dial: 'dl-gmt-black', hands: 'hd-nh-mercedes' });
    expect(ids(r, 'error')).toEqual([]);
    expect(ids(r, 'warning')).toEqual([]);
    expect(ids(r, 'info')).toEqual(['R-HD-2']);
    expect(r.status).toBe('incomplete');
  });

  it('T9: NH34 with a standard dial → centre hole too small', () => {
    const r = run({ case: 'cs-sub40', movement: 'mv-nh34', dial: 'dl-sub-black' });
    expect(ids(r, 'error')).toEqual(['R-MD-5']);
  });

  it('T10: open-heart dial on an NH35 → R-MD-4 (plus ghost-date info)', () => {
    const r = run({ case: 'cs-sub40', movement: 'mv-nh35', dial: 'dl-openheart-silver' });
    expect(ids(r, 'error')).toEqual(['R-MD-4']);
    expect(ids(r, 'info')).toEqual(['R-MD-2']);
  });

  it('T11: regular bracelet on the integrated octagon case → R-CS-1', () => {
    const r = run({ case: 'cs-octagon41', strap: 'st-oyster-20' });
    expect(ids(r, 'error')).toEqual(['R-CS-1']);
  });

  it('T12: insert in a fluted bezel → R-BI-1', () => {
    const r = run({ case: 'cs-fluted36', bezel: 'bz-fluted36', bezelInsert: 'in-diver42-dive-black' });
    expect(ids(r, 'error')).toEqual(['R-BI-1']);
  });

  it('T13: VH31 in Diver 42 → mount error, warning with a spacer', () => {
    expect(ids(run({ case: 'cs-diver42-38', movement: 'mv-vh31' }), 'error')).toEqual(['R-MC-1']);
    const fixed = run({ case: 'cs-diver42-38', movement: 'mv-vh31' }, ['movement-spacer']);
    expect(ids(fixed, 'error')).toEqual([]);
    expect(ids(fixed, 'warning')).toEqual(['R-MC-1']);
  });

  it('T14: NH34 in Fluted Classic 36 → stack height error (vendor: not NH34-compatible)', () => {
    const r = run({ case: 'cs-fluted36', movement: 'mv-nh34' });
    expect(ids(r, 'error')).toEqual(['R-MC-2']);
  });

  it('T15: complete NH34 GMT build in Sub-style 40 is valid', () => {
    const r = run({
      case: 'cs-sub40', movement: 'mv-nh34', dial: 'dl-gmt-black', hands: 'hd-nh34-gmt',
      bezel: 'bz-sub40', bezelInsert: 'in-sub40-gmt-black-blue', crystal: 'cy-sub40-magnifier',
      crown: 'cw-sub40', strap: 'st-oyster-20',
    });
    expect(r.results).toEqual([]);
    expect(r.status).toBe('valid');
  });

  it('T16: complete octagon build is valid without bezel or ring', () => {
    const r = run({
      case: 'cs-octagon41', movement: 'mv-nh35', dial: 'dl-tapisserie-blue', hands: 'hd-nh-sword',
      crystal: 'cy-octagon41-flat', crown: 'cw-octagon41', strap: 'st-octagon41-bracelet',
    });
    expect(r.results).toEqual([]);
    expect(r.status).toBe('valid');
  });

  it('T17: bezel or chapter ring on the octagon case → R-CB-1 and R-CR-1', () => {
    const r = run({ case: 'cs-octagon41', bezel: 'bz-diver42-sloped', chapterRing: 'cr-mid-silver' });
    expect(ids(r, 'error')).toEqual(['R-CB-1', 'R-CR-1']);
  });

  it('T18: Fluted Classic 36 requires a chapter ring to be complete', () => {
    const slots = {
      case: 'cs-fluted36', movement: 'mv-nh35', dial: 'dl-sunburst-blue', hands: 'hd-nh-sword', bezel: 'bz-fluted36',
      crystal: 'cy-fluted36-flat', crown: 'cw-fluted36', strap: 'st-jubilee-20',
    };
    const without = run(slots);
    expect(without.status).toBe('incomplete');
    expect(without.missingSlots).toEqual(['chapterRing']);
    const withRing = run({ ...slots, chapterRing: 'cr-mid-thin-silver' });
    expect(withRing.results).toEqual([]);
    expect(withRing.status).toBe('valid');
  });

  it('T19: Diver 42 ring in a mid-size seat → R-CR-2', () => {
    const r = run({ case: 'cs-fluted36', chapterRing: 'cr-diver42-silver' });
    expect(ids(r, 'error')).toEqual(['R-CR-2']);
  });

  it('T20: Octagon dial (30.8) in Diver 42 → R-CD-2', () => {
    const r = run({ case: 'cs-diver42-30', dial: 'dl-tapisserie-blue' });
    expect(ids(r, 'error')).toEqual(['R-CD-2']);
  });

  it('T21: NH dial on a Miyota 8215 → feet error, warning with dial dots', () => {
    const r = run({ case: 'cs-diver42-30', movement: 'mv-m8215', dial: 'dl-sub-black' });
    expect(ids(r, 'error')).toEqual(['R-MC-1', 'R-MD-1']);
    const dotted = run({ case: 'cs-diver42-30', movement: 'mv-m8215', dial: 'dl-sub-black' }, ['dial-dots']);
    expect(ids(dotted, 'error')).toEqual(['R-MC-1']);
    expect(ids(dotted, 'warning')).toEqual(['R-MD-1']);
  });

  it('T22: date magnifier with an open-heart (no date) dial → R-CC-2 warning', () => {
    const r = run({ dial: 'dl-openheart-silver', crystal: 'cy-sub40-magnifier' });
    expect(ids(r, 'warning')).toEqual(['R-CC-2']);
  });

  it('T23: wrong crown, crystal and fitted end links on Sub-style 40', () => {
    const r = run({ case: 'cs-sub40', crown: 'cw-diver42', crystal: 'cy-diver42-flat', strap: 'st-oyster-22-diver42' });
    expect(ids(r, 'error')).toEqual(['R-CC-1', 'R-CS-2', 'R-CW-1']);
    expect(ids(r, 'warning')).toEqual(['R-CS-3']);
  });
});
