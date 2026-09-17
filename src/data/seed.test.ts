import { describe, expect, it } from 'vitest';
import { PART_TYPES } from '../domain/schemas';
import { Catalog, loadCorePack } from './catalog';

const core = loadCorePack();
const catalog = new Catalog([core]);
const all = <T extends (typeof PART_TYPES)[number]>(type: T) => catalog.list(type).map((e) => e.part);

describe('core pack', () => {
  it('validates against the pack schema', () => {
    expect(core.id).toBe('core');
    expect(core.parts.length).toBeGreaterThan(50);
  });

  it('has at least one part of every type', () => {
    for (const type of PART_TYPES) expect(all(type).length, type).toBeGreaterThan(0);
  });

  it('uses the "<prefix>-" id convention per type', () => {
    const prefix: Record<(typeof PART_TYPES)[number], string> = {
      movement: 'mv-', case: 'cs-', dial: 'dl-', hands: 'hd-', chapterRing: 'cr-',
      bezel: 'bz-', bezelInsert: 'in-', crystal: 'cy-', crown: 'cw-', strap: 'st-',
    };
    for (const part of core.parts) expect(part.id.startsWith(prefix[part.type]), part.id).toBe(true);
  });

  it('never uses trademark names in part names', () => {
    const banned = /rolex|submariner|datejust|royal oak|nautilus|omega|seamaster|patek|audemars/i;
    for (const part of core.parts) expect(part.name, part.id).not.toMatch(banned);
  });

  // Cross-references: every seat/tube/profile a case declares must be satisfiable by some core part,
  // otherwise that case can never form a valid build.
  describe('every case can be completed', () => {
    for (const c of all('case')) {
      describe(c.id, () => {
        it('has a crown for its tube', () => {
          expect(all('crown').some((cw) => cw.tube === c.crownTube)).toBe(true);
        });
        it('has a bezel for its seat (or is integral)', () => {
          if (c.bezelSeat === 'integral') return;
          expect(all('bezel').some((b) => b.seat === c.bezelSeat)).toBe(true);
        });
        it('has a strap it accepts', () => {
          const ok = all('strap').some((s) =>
            c.integratedProfile ? s.integratedProfile === c.integratedProfile : s.width === c.lugWidth,
          );
          expect(ok).toBe(true);
        });
        it('has a crystal for its seat', () => {
          expect(all('crystal').some((cy) => Math.abs(cy.diameter - c.crystalSeat) <= 0.05)).toBe(true);
        });
        it('has a dial that fits its seat', () => {
          expect(all('dial').some((d) => d.diameter >= c.dialSeat.min && d.diameter <= c.dialSeat.max)).toBe(true);
        });
        it('has a chapter ring when one is required', () => {
          if (c.chapterRing.requirement !== 'required') return;
          const seat = c.chapterRing.seatDiameter;
          expect(all('chapterRing').some((r) => Math.abs(r.outerDiameter - seat) <= 0.1)).toBe(true);
        });
      });
    }
  });

  it('has an insert for every bezel that takes one', () => {
    for (const b of all('bezel')) {
      if (!b.insert) continue;
      const { outerDiameter, innerDiameter, profile } = b.insert;
      const ok = all('bezelInsert').some(
        (i) =>
          i.profile === profile &&
          Math.abs(i.outerDiameter - outerDiameter) <= 0.1 &&
          Math.abs(i.innerDiameter - innerDiameter) <= 0.2,
      );
      expect(ok, b.id).toBe(true);
    }
  });

  it('contains every part referenced by the Phase 2 reference builds', () => {
    const referenced = [
      'cs-diver42-38', 'cs-sub40', 'cs-fluted36', 'cs-octagon41',
      'mv-nh35', 'mv-nh36', 'mv-nh34', 'mv-vh31',
      'dl-diver-black', 'dl-sub-black', 'dl-diver-daydate', 'dl-gmt-black', 'dl-openheart-silver',
      'hd-nh-mercedes', 'hd-m8215-baton',
      'bz-diver42-sloped', 'bz-fluted36',
      'in-diver42-dive-black', 'in-diver42-gmt-pepsi',
      'cr-diver42-silver', 'cy-diver42-dd', 'cw-diver42',
      'st-oyster-22-diver42', 'st-jubilee-20', 'st-oyster-20',
    ];
    const ids = new Set(core.parts.map((p) => p.id));
    expect(referenced.filter((id) => !ids.has(id))).toEqual([]);
  });
});
