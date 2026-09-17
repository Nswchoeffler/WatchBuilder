import { crownName, mm } from '../geometry';
import { TOL } from '../tolerances';
import { defineRule, error, warning } from '../types';

// Case ↔ Dial, Case ↔ Chapter ring, Case ↔ Bezel ↔ Insert. IDs match docs/compatibility-spec.md §6.

export const caseDialRules = [
  defineRule({
    id: 'R-CD-1',
    title: 'Dial cut for case crown position',
    requires: ['case', 'dial'],
    check: ({ case: c, dial }) => {
      if (dial.feetSystem === 'none' || dial.crownSteps.includes(c.crownSteps)) return [];
      const cut = dial.crownSteps.map(crownName).join(' / ');
      return [error(`Dial feet are placed for a ${cut} crown; this case has a ${crownName(c.crownSteps)} crown.`, 'dial-dots')];
    },
  }),

  defineRule({
    id: 'R-CD-2',
    title: 'Dial diameter fits case',
    requires: ['case', 'dial'],
    reads: ['chapterRing'],
    check: ({ case: c, dial, chapterRing: ring }) => {
      const seat = `${mm(c.dialSeat.min)}–${mm(c.dialSeat.max)}`;
      if (dial.diameter > c.dialSeat.max) return [error(`Dial is ${mm(dial.diameter)}; this case seats ${seat} dials.`)];
      if (dial.diameter >= c.dialSeat.min) return [];
      if (ring && ring.innerDiameter < dial.diameter - TOL.dialGapCover) {
        return [warning(`Dial is ${mm(dial.diameter)} in a ${seat} seat; the chapter ring hides the gap, but the dial may shift.`)];
      }
      return [error(`Dial is ${mm(dial.diameter)}; this case seats ${seat} dials, leaving a visible gap.`)];
    },
  }),
];

export const chapterRingRules = [
  defineRule({
    id: 'R-CR-1',
    title: 'Case accepts a chapter ring',
    requires: ['case', 'chapterRing'],
    check: ({ case: c }) =>
      c.chapterRing.requirement === 'none' ? [error('This case has no chapter ring seat.')] : [],
  }),

  defineRule({
    id: 'R-CR-2',
    title: 'Chapter ring fits seat',
    requires: ['case', 'chapterRing'],
    check: ({ case: c, chapterRing: ring }) => {
      if (c.chapterRing.requirement === 'none') return [];
      const seat = c.chapterRing.seatDiameter;
      return Math.abs(ring.outerDiameter - seat) > TOL.ringSeat
        ? [error(`Chapter ring is ${mm(ring.outerDiameter)} across; this case's ring seat is ${mm(seat)}.`)]
        : [];
    },
  }),

  defineRule({
    id: 'R-CR-3',
    title: 'Chapter ring covers dial edge',
    requires: ['chapterRing', 'dial'],
    check: ({ chapterRing: ring, dial }) =>
      ring.innerDiameter >= dial.diameter
        ? [warning(`Chapter ring opening (${mm(ring.innerDiameter)}) is wider than the ${mm(dial.diameter)} dial; the dial edge will show.`)]
        : [],
  }),
];

export const bezelRules = [
  defineRule({
    id: 'R-CB-1',
    title: 'Bezel fits case',
    requires: ['case', 'bezel'],
    check: ({ case: c, bezel }) => {
      if (c.bezelSeat === 'integral') return [error('This case has an integral bezel; a separate bezel cannot be fitted.')];
      return bezel.seat === c.bezelSeat
        ? []
        : [error(`Bezel is made for a "${bezel.seat}" seat; this case has a "${c.bezelSeat}" seat.`)];
    },
  }),

  defineRule({
    id: 'R-BI-1',
    title: 'Bezel takes an insert',
    requires: ['bezelInsert'],
    reads: ['bezel'],
    check: ({ bezel }) => {
      if (!bezel) return [error('A bezel insert needs a bezel to sit in.')];
      return bezel.insert ? [] : [error(`${bezel.name} has no insert recess.`)];
    },
  }),

  defineRule({
    id: 'R-BI-2',
    title: 'Insert size',
    requires: ['bezel', 'bezelInsert'],
    check: ({ bezel, bezelInsert: insert }) => {
      if (!bezel.insert) return [];
      const want = bezel.insert;
      const outerOff = Math.abs(insert.outerDiameter - want.outerDiameter) > TOL.insertOuter;
      const innerOff = Math.abs(insert.innerDiameter - want.innerDiameter) > TOL.insertInner;
      if (!outerOff && !innerOff) return [];
      return [
        error(
          `Insert is ${mm(insert.outerDiameter)} × ${mm(insert.innerDiameter)}; bezel takes ${mm(want.outerDiameter)} × ${mm(want.innerDiameter)}.`,
        ),
      ];
    },
  }),

  defineRule({
    id: 'R-BI-3',
    title: 'Insert profile',
    requires: ['bezel', 'bezelInsert'],
    check: ({ bezel, bezelInsert: insert }) =>
      bezel.insert && bezel.insert.profile !== insert.profile
        ? [error(`Insert is ${insert.profile}; this bezel needs a ${bezel.insert.profile} insert.`)]
        : [],
  }),
];
