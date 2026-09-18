import { describe, expect, it } from 'vitest';
import { getAt, setAt } from './form';

describe('draft paths', () => {
  it('reads nested values and arrays', () => {
    const draft = { dialSeat: { min: 28.3 }, crownSteps: [0, 2] };
    expect(getAt(draft, 'dialSeat.min')).toBe(28.3);
    expect(getAt(draft, 'crownSteps.1')).toBe(2);
    expect(getAt(draft, 'dialSeat.max')).toBeUndefined();
    expect(getAt(draft, 'nothing.here.at.all')).toBeUndefined();
  });

  it('sets without mutating the original', () => {
    const draft = { dialSeat: { min: 28.3, max: 28.7 } };
    const next = setAt(draft, 'dialSeat.max', 29);
    expect(next.dialSeat.max).toBe(29);
    expect(next.dialSeat.min).toBe(28.3);
    expect(draft.dialSeat.max).toBe(28.7);
  });

  it('creates missing parents and removes keys set to undefined', () => {
    expect(setAt({}, 'insert.outerDiameter', 38)).toEqual({ insert: { outerDiameter: 38 } });
    expect(setAt({ holes: { gmt: 2.2, hour: 1.5 } }, 'holes.gmt', undefined)).toEqual({ holes: { hour: 1.5 } });
  });

  it('keeps arrays as arrays', () => {
    const next = setAt({ crownSteps: [0, 2] }, 'crownSteps.0', 3);
    expect(Array.isArray(next.crownSteps)).toBe(true);
    expect(next.crownSteps).toEqual([3, 2]);
  });
});
