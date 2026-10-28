import { describe, expect, it } from 'vitest';
import { evaluate } from './index';
import { build, catalogWith, coreCatalog, corePart, ids, mixedBuild } from './testkit';

// Reference builds for the NH39 (24-hour sub-dial) and NH70 / NH72 (open-worked): rules R-MD-6, R-MD-7, R-MH-3, R-HD-3.

const NH39_BUILD = {
  case: 'cs-sub40',
  movement: 'mv-nh39',
  dial: 'dl-nh39-24h-black',
  hands: 'hd-nh39-24h-sword',
  bezel: 'bz-sub40',
  bezelInsert: 'in-sub40-ceramic-black',
  crystal: 'cy-sub40-dd',
  crown: 'cw-sub40',
  strap: 'st-oyster-20',
} as const;

const NH70_BUILD = {
  case: 'cs-octagon41',
  movement: 'mv-nh70',
  dial: 'dl-nh70-ring-black',
  hands: 'hd-nh-sword',
  crystal: 'cy-octagon41-flat',
  crown: 'cw-octagon41',
  strap: 'st-octagon41-bracelet',
} as const;

const run = (slots: Parameters<typeof build>[0], flags: Parameters<typeof build>[1] = []) => evaluate(build(slots, flags), coreCatalog);

describe('NH39 sub-dial builds', () => {
  it('T29: NH39 with its 24-hour dial and hands in Sub-style 40 is valid with no findings', () => {
    const r = run(NH39_BUILD);
    expect(r.results).toEqual([]);
    expect(r.status).toBe('valid');
  });

  it('T30: the same dial in a 3.8 case → crown, balance and 24-hour post all miss', () => {
    const r = run({ case: 'cs-diver42-38', movement: 'mv-nh39', dial: 'dl-nh39-24h-black', hands: 'hd-nh39-24h-sword' });
    expect(ids(r, 'error')).toEqual(['R-CD-1', 'R-MD-4', 'R-MD-6']);
    expect(r.results.find((x) => x.ruleId === 'R-MD-6')?.message).toMatch(/24-hour post lands .* from the dial's sub-dial hole with a 3\.8 crown/);
  });

  it('T31: a plain NH hand set on the NH39 → warning that the 24-hour hand is missing', () => {
    const r = run({ ...NH39_BUILD, hands: 'hd-nh-sword' });
    expect(r.status).toBe('warnings');
    expect(ids(r, 'warning')).toEqual(['R-MH-3']);
    expect(ids(r, 'error')).toEqual([]);
  });

  it('T32: a solid date dial on the NH39 → date window error, post is covered (info)', () => {
    const r = run({ ...NH39_BUILD, dial: 'dl-diver-black', bezel: 'bz-sub40' });
    expect(ids(r, 'error')).toContain('R-MD-2');
    expect(ids(r, 'info')).toEqual(expect.arrayContaining(['R-MD-4', 'R-MD-6']));
  });

  it('T33: the 24-hour dial and hands on an NH35 → no post, no balance aperture', () => {
    const r = run({ ...NH39_BUILD, movement: 'mv-nh35' });
    expect(ids(r, 'error')).toEqual(['R-MD-4', 'R-MD-6', 'R-MH-3']);
  });

  it('T34: the NH39 stands 7.99 with hands: fine in the Sub-style 40 (8.2), too tall for the Fluted 36 (7.7)', () => {
    expect(ids(run({ case: 'cs-sub40', movement: 'mv-nh39' }), 'error')).toEqual([]);
    const tight = run({ case: 'cs-fluted36', movement: 'mv-nh39' });
    expect(ids(tight, 'error')).toEqual(['R-MC-2']);
  });

  describe('edited dials and hands', () => {
    const dial = corePart('dl-nh39-24h-black', 'dial');
    const hands = corePart('hd-nh39-24h-sword', 'hands');
    const sub = dial.subdials[0]!;
    const catalog = catalogWith([
      { ...dial, id: 'dl-small-hole', subdials: [{ ...sub, hole: 0.15 }] },
      { ...dial, id: 'dl-moved', subdials: [{ ...sub, angle: 300 }] },
      { ...dial, id: 'dl-nudged', subdials: [{ ...sub, distance: sub.distance + 0.2 }] },
      { ...dial, id: 'dl-small-seconds', subdials: [{ ...sub, indicates: 'small-seconds' }] },
      { ...hands, id: 'hd-wrong-hole', subdialHands: [{ indicates: '24-hour', hole: 0.3, length: 2.2 }] },
      { ...hands, id: 'hd-long-24h', subdialHands: [{ indicates: '24-hour', hole: 0.2, length: 3.5 }] },
      { ...hands, id: 'hd-small-seconds', subdialHands: [{ indicates: 'small-seconds', hole: 0.2, length: 2.2 }] },
    ]);
    const edited = (patch: Partial<Record<keyof typeof NH39_BUILD, string>>) => evaluate(mixedBuild({ ...NH39_BUILD, ...patch }), catalog);

    it('R-MD-6: a hole narrower than the post is an error', () => {
      const r = edited({ dial: 'test:dl-small-hole' });
      expect(ids(r, 'error')).toEqual(['R-MD-6']);
      expect(r.results[0]?.message).toMatch(/hole is 0\.15mm; the NH39A post is 0\.21mm/);
    });

    it('R-MD-6: a hole 5° round is too far from the post', () => {
      expect(ids(edited({ dial: 'test:dl-moved' }), 'error')).toEqual(['R-MD-6']);
    });

    it('R-MD-6: a hole 0.2 off is inside what the Ø0.80 hole allows', () => {
      expect(edited({ dial: 'test:dl-nudged' }).results).toEqual([]);
    });

    it('R-MD-6: a hole for a different kind of hand is an error, and the post is covered', () => {
      const r = edited({ dial: 'test:dl-small-seconds' });
      expect(ids(r, 'error')).toEqual(['R-MD-6']);
      expect(ids(r, 'info')).toEqual(['R-MD-6']);
    });

    it('R-MH-3: a 24-hour hand with the wrong hole, and one for a post the movement lacks', () => {
      expect(ids(edited({ hands: 'test:hd-wrong-hole' }), 'error')).toEqual(['R-MH-3']);
      const r = edited({ hands: 'test:hd-small-seconds' });
      expect(ids(r, 'error')).toEqual(['R-MH-3']);
      expect(ids(r, 'warning')).toEqual(['R-MH-3']);
    });

    it('R-HD-3: a hand longer than its sub-dial warns', () => {
      const r = edited({ hands: 'test:hd-long-24h' });
      expect(r.status).toBe('warnings');
      expect(ids(r, 'warning')).toEqual(['R-HD-3']);
    });
  });
});

describe('NH70 / NH72 open-worked builds', () => {
  it('T35: NH70 and NH72 with the ring dial in the octagon case are valid with no findings', () => {
    for (const movement of ['mv-nh70', 'mv-nh72']) {
      const r = run({ ...NH70_BUILD, movement });
      expect(r.results, movement).toEqual([]);
      expect(r.status, movement).toBe('valid');
    }
  });

  it('T36: an NH35 under the ring dial → feet do not match, and the opening shows a plain plate', () => {
    const r = run({ ...NH70_BUILD, movement: 'mv-nh35' });
    expect(ids(r, 'error')).toEqual(['R-MD-1']);
    expect(ids(r, 'warning')).toEqual(['R-MD-7']);
    expect(r.results.find((x) => x.ruleId === 'R-MD-1')).toMatchObject({ fix: 'dial-dots' });
  });

  it('T37: an NH70 under a solid date dial → feet and date errors, and an info that the dial hides the open-work', () => {
    const r = run({ ...NH70_BUILD, dial: 'dl-tapisserie-blue' });
    expect(ids(r, 'error')).toEqual(['R-MD-1', 'R-MD-2']);
    expect(ids(r, 'info')).toEqual(['R-MD-7']);
    expect(r.results.find((x) => x.ruleId === 'R-MD-1')).toMatchObject({ fix: 'dial-dots' });
    // Dial dots fix the feet only; the date window still has nothing behind it.
    expect(ids(run({ ...NH70_BUILD, dial: 'dl-tapisserie-blue' }, ['dial-dots']), 'error')).toEqual(['R-MD-2']);
  });

  it('T38: the ring dial seats only where the case allows a Ø31.5 dial', () => {
    const r = run({ case: 'cs-sub40', movement: 'mv-nh70', dial: 'dl-nh70-ring-black' });
    expect(ids(r, 'error')).toEqual(['R-CD-2']);
  });

  it('R-MD-7: an opening wider than the movement allows is an error', () => {
    const dial = corePart('dl-nh70-ring-black', 'dial');
    const catalog = catalogWith([{ ...dial, id: 'dl-wide-open', centerOpening: 24.5, centerHole: 24.5 }]);
    const r = evaluate(mixedBuild({ ...NH70_BUILD, dial: 'test:dl-wide-open' }), catalog);
    expect(ids(r, 'error')).toEqual(['R-MD-7']);
    expect(r.results[0]?.message).toMatch(/at most 23\.9mm/);
  });
});
