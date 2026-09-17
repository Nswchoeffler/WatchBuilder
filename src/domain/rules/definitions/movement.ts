import { DATE_STEP_DEG, DAY_STEP_DEG } from '../../schemas';
import { angularDistance, crownName, deg, mm, movementToDial, offGrid } from '../geometry';
import { TOL } from '../tolerances';
import { defineRule, error, info, warning } from '../types';

// Movement ↔ Case, Movement ↔ Dial. IDs match docs/compatibility-spec.md §6.

export const movementCaseRules = [
  defineRule({
    id: 'R-MC-1',
    title: 'Movement fits case mount',
    requires: ['movement', 'case'],
    check: ({ movement, case: c }) => {
      if (c.movementMounts.includes(movement.mountSystem)) return [];
      if (c.spacerMounts.includes(movement.mountSystem)) {
        return [error(`${movement.caliber} needs a spacer ring to sit in this case.`, 'movement-spacer')];
      }
      return [error(`${movement.caliber} (${movement.mountSystem} mount) doesn't fit this case (takes ${c.movementMounts.join(', ')}).`)];
    },
  }),

  defineRule({
    id: 'R-MC-2',
    title: 'Movement stack height',
    requires: ['movement', 'case'],
    check: ({ movement, case: c }) => {
      const over = movement.heightWithHands - c.maxMovementStack;
      if (over <= 0) return [];
      const msg = `${movement.caliber} stands ${mm(movement.heightWithHands)} with hands; this case allows ${mm(c.maxMovementStack)}`;
      return over > TOL.stack ? [error(`${msg}. Hands will hit the crystal.`)] : [warning(`${msg}. Very tight clearance.`)];
    },
  }),
];

export const movementDialRules = [
  defineRule({
    id: 'R-MD-1',
    title: 'Dial feet match movement',
    requires: ['movement', 'dial'],
    check: ({ movement, dial }) => {
      if (dial.feetSystem === 'none') return [info('Feetless dial: mount with dial dots.')];
      if (dial.feetSystem === movement.feetSystem) return [];
      return [
        error(`Dial feet are for ${dial.feetSystem}; ${movement.caliber} uses ${movement.feetSystem}.`, 'dial-dots'),
      ];
    },
  }),

  defineRule({
    id: 'R-MD-2',
    title: 'Date window',
    requires: ['movement', 'dial'],
    reads: ['case'],
    check: ({ movement, dial, case: c }) => {
      if (dial.dateWindow && !movement.date) {
        return [error(`Dial has a date window but ${movement.caliber} has no date.`)];
      }
      if (movement.date && !dial.dateWindow) {
        return [info(`${movement.caliber} has a date but the dial has no window (ghost date position when setting).`)];
      }
      if (!movement.date || !dial.dateWindow || !c) return [];
      const shown = movementToDial(movement.date.angle, c.crownSteps);
      const miss = offGrid(dial.dateWindow.angle - shown, DATE_STEP_DEG);
      if (miss <= TOL.dateAlignDeg) return [];
      return [warning(`Date numerals sit ${deg(miss)} off-centre in the window with a ${crownName(c.crownSteps)} crown.`)];
    },
  }),

  defineRule({
    id: 'R-MD-3',
    title: 'Day window',
    requires: ['movement', 'dial'],
    reads: ['case'],
    check: ({ movement, dial, case: c }) => {
      if (dial.dayWindow && !movement.day) {
        return [error(`Dial has a day window but ${movement.caliber} has no day wheel.`)];
      }
      if (movement.day && !dial.dayWindow) {
        return [info(`${movement.caliber} has a day wheel the dial doesn't show.`)];
      }
      if (!movement.day || !dial.dayWindow || !c) return [];
      // A day wheel indexed for crown c centres its labels at dial angle `day.angle` when mounted with crown c.
      // Mounted with crown s, every label shifts by (s - c) date steps; labels repeat every DAY_STEP_DEG.
      const shift = (c.crownSteps - movement.day.crownSteps) * DATE_STEP_DEG;
      const miss = offGrid(dial.dayWindow.angle - movement.day.angle - shift, DAY_STEP_DEG);
      if (miss <= TOL.dayAlignDeg) return [];
      return [
        warning(
          `Day wheel is indexed for a ${crownName(movement.day.crownSteps)} crown; in this ${crownName(c.crownSteps)} case the day sits ${deg(miss)} off-centre.`,
          'day-wheel-swap',
        ),
      ];
    },
  }),

  defineRule({
    id: 'R-MD-4',
    title: 'Open-heart aperture',
    requires: ['movement', 'dial'],
    reads: ['case'],
    check: ({ movement, dial, case: c }) => {
      if (dial.openHeartAperture && !movement.openHeart) {
        return [error(`Dial has an open-heart aperture but ${movement.caliber} has no visible balance there.`)];
      }
      if (movement.openHeart && !dial.openHeartAperture) {
        return [info(`${movement.caliber} is open-heart; this dial hides the balance.`)];
      }
      if (!movement.openHeart || !dial.openHeartAperture || !c) return [];
      const balance = movementToDial(movement.openHeart.angle, c.crownSteps);
      const miss = angularDistance(dial.openHeartAperture.angle, balance);
      if (miss <= TOL.apertureAlignDeg) return [];
      return [error(`Aperture misses the balance by ${deg(miss)} with a ${crownName(c.crownSteps)} crown.`)];
    },
  }),

  defineRule({
    id: 'R-MD-5',
    title: 'Dial centre hole',
    requires: ['movement', 'dial'],
    check: ({ movement, dial }) =>
      dial.centerHole < movement.minDialCenterHole
        ? [error(`Dial centre hole is ${mm(dial.centerHole)}; ${movement.caliber} needs at least ${mm(movement.minDialCenterHole)}.`)]
        : [],
  }),
];
