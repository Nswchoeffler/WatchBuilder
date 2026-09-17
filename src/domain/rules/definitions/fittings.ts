import { angularDistance, deg, mm } from '../geometry';
import { TOL } from '../tolerances';
import { defineRule, error, info, warning, type Finding } from '../types';

// Case ↔ Crystal / Crown / Strap, Movement ↔ Hands, Hands ↔ Dial. IDs match docs/compatibility-spec.md §6.

export const crystalRules = [
  defineRule({
    id: 'R-CC-1',
    title: 'Crystal diameter',
    requires: ['case', 'crystal'],
    check: ({ case: c, crystal }) =>
      Math.abs(crystal.diameter - c.crystalSeat) > TOL.crystal
        ? [error(`Crystal is ${mm(crystal.diameter)}; this case takes ${mm(c.crystalSeat)}.`)]
        : [],
  }),

  defineRule({
    id: 'R-CC-2',
    title: 'Date magnifier position',
    requires: ['crystal', 'dial'],
    check: ({ crystal, dial }) => {
      if (!crystal.magnifier) return [];
      if (!dial.dateWindow) return [warning('Crystal has a date magnifier but the dial has no date window.')];
      const miss = angularDistance(crystal.magnifier.angle, dial.dateWindow.angle);
      return miss > TOL.magnifierAlignDeg ? [warning(`Date magnifier is ${deg(miss)} away from the date window.`)] : [];
    },
  }),
];

export const crownRules = [
  defineRule({
    id: 'R-CW-1',
    title: 'Crown fits case tube',
    requires: ['case', 'crown'],
    check: ({ case: c, crown }) =>
      crown.tube === c.crownTube ? [] : [error(`Crown is for a "${crown.tube}" tube; this case has a "${c.crownTube}" tube.`)],
  }),
];

export const strapRules = [
  defineRule({
    id: 'R-CS-1',
    title: 'Integrated bracelet',
    requires: ['case', 'strap'],
    check: ({ case: c, strap }) => {
      if (c.integratedProfile) {
        return strap.integratedProfile === c.integratedProfile
          ? []
          : [error('This case only takes its own integrated bracelet.')];
      }
      return strap.integratedProfile ? [error('Integrated bracelets only fit their matching case.')] : [];
    },
  }),

  defineRule({
    id: 'R-CS-2',
    title: 'Strap width matches lugs',
    requires: ['case', 'strap'],
    check: ({ case: c, strap }) => {
      if (c.lugWidth === null || strap.width === null) return [];
      return Math.abs(strap.width - c.lugWidth) > TOL.lugWidth
        ? [error(`Strap is ${mm(strap.width)} wide; the lugs are ${mm(c.lugWidth)}.`)]
        : [];
    },
  }),

  defineRule({
    id: 'R-CS-3',
    title: 'Fitted end links',
    requires: ['case', 'strap'],
    check: ({ case: c, strap }) =>
      strap.endLinkProfile && strap.endLinkProfile !== c.endLinkProfile
        ? [warning(`End links are shaped for "${strap.endLinkProfile}" cases; expect gaps against this case.`)]
        : [],
  }),
];

const HAND_NAMES = { hour: 'Hour', minute: 'Minute', seconds: 'Seconds' } as const;

export const handRules = [
  defineRule({
    id: 'R-MH-1',
    title: 'Hand holes match movement posts',
    requires: ['movement', 'hands'],
    check: ({ movement, hands }) => {
      const findings: Finding[] = [];
      for (const key of ['hour', 'minute', 'seconds'] as const) {
        const post = movement.handPosts[key];
        const hole = hands.holes[key];
        if (post === null && hole !== null) {
          findings.push(error(`${movement.caliber} has no seconds hand post.`));
        } else if (post !== null && hole === null) {
          findings.push(warning('Hand set has no seconds hand.'));
        } else if (post !== null && hole !== null && Math.abs(post - hole) > TOL.handPost) {
          findings.push(error(`${HAND_NAMES[key]} hand hole is ${mm(hole)}; ${movement.caliber} post is ${mm(post)}.`));
        }
      }
      return findings;
    },
  }),

  defineRule({
    id: 'R-MH-2',
    title: 'GMT hand',
    requires: ['movement', 'hands'],
    check: ({ movement, hands }) => {
      const post = movement.handPosts.gmt;
      const hole = hands.holes.gmt;
      if (hole !== undefined && post === undefined) return [error(`Hand set has a GMT hand; ${movement.caliber} has no GMT post.`)];
      if (post !== undefined && hole === undefined) return [warning(`${movement.caliber} is a GMT; this hand set has no GMT hand.`)];
      if (post !== undefined && hole !== undefined && Math.abs(post - hole) > TOL.handPost) {
        return [error(`GMT hand hole is ${mm(hole)}; ${movement.caliber} GMT post is ${mm(post)}.`)];
      }
      return [];
    },
  }),

  defineRule({
    id: 'R-HD-1',
    title: 'Hand length',
    requires: ['hands', 'dial'],
    reads: ['chapterRing'],
    check: ({ hands, dial, chapterRing: ring }) => {
      const limit = ring ? ring.innerDiameter / 2 : dial.diameter / 2;
      const edge = ring ? 'chapter ring' : 'dial edge';
      return hands.lengths.minute > limit + TOL.handReach
        ? [warning(`Minute hand (${mm(hands.lengths.minute)}) reaches past the ${edge} (${mm(limit)} radius) and may foul it.`)]
        : [];
    },
  }),

  defineRule({
    id: 'R-HD-2',
    title: 'GMT scale without GMT hand',
    requires: ['hands', 'dial'],
    check: ({ hands, dial }) =>
      dial.gmtScale && hands.holes.gmt === undefined ? [info('Dial has a 24-hour scale but there is no GMT hand to read it.')] : [],
  }),
];
