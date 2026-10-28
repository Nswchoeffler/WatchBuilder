import { describe, expect, it } from 'vitest';
import { SAMPLE_BUILDS } from '../../data/sampleBuilds';
import type { Slot } from '../schemas';
import { candidatesFor, evaluate } from './index';
import { build, coreCatalog } from './testkit';

/**
 * Guards the roadmap's performance budget (< 50 ms to re-evaluate a build). Measured cost is around
 * a hundredth of a millisecond, so the limit is the budget itself: roughly a thousand times the
 * measurement, which only an order-of-magnitude regression (say, a rule that scans the whole
 * catalog) will cross, however slow or noisy the machine. `npm run bench` has the real numbers.
 */
const BUDGET_MS = 50;

const timed = (fn: () => void) => {
  fn(); // warm-up
  const times = Array.from({ length: 5 }, () => {
    const start = performance.now();
    fn();
    return performance.now() - start;
  }).sort((a, b) => a - b);
  return times[2]!; // median
};

describe('performance budget', () => {
  it('re-evaluates every sample build within budget', () => {
    for (const sample of SAMPLE_BUILDS) {
      const b = build(sample.slots, sample.flags);
      expect(timed(() => evaluate(b, coreCatalog)), sample.id).toBeLessThan(BUDGET_MS);
    }
  });

  it('computes candidates for every slot of a full build within budget', () => {
    const sample = SAMPLE_BUILDS.reduce((a, b) => (Object.keys(b.slots).length > Object.keys(a.slots).length ? b : a));
    const b = build(sample.slots, sample.flags);
    for (const slot of Object.keys(sample.slots) as Slot[]) {
      expect(timed(() => candidatesFor(slot, b, coreCatalog)), slot).toBeLessThan(BUDGET_MS);
    }
  });
});
