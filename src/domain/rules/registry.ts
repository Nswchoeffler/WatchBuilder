import { bezelRules, caseDialRules, chapterRingRules } from './definitions/case';
import { crownRules, crystalRules, handRules, strapRules } from './definitions/fittings';
import { movementCaseRules, movementDialRules } from './definitions/movement';
import type { Rule } from './types';

export const RULES: readonly Rule[] = [
  ...movementCaseRules,
  ...movementDialRules,
  ...caseDialRules,
  ...chapterRingRules,
  ...bezelRules,
  ...crystalRules,
  ...crownRules,
  ...strapRules,
  ...handRules,
];
