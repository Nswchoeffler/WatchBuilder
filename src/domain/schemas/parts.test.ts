import { describe, expect, it } from 'vitest';
import { DATE_STEP_DEG, crownAngle } from './common';
import { Case, ChapterRing, Dial, Hands, Part, Strap } from './parts';

const visual = { kind: 'template', template: 'x' } as const;
const base = { name: 'Test', confidence: 'community', visual } as const;

const validCase = {
  ...base,
  type: 'case',
  id: 'cs-test',
  style: 'diver42',
  diameter: 42,
  lugToLug: 46,
  thickness: 10.2,
  lugWidth: 22,
  crownSteps: 2,
  crownTube: 'diver42',
  movementMounts: ['seiko-nh'],
  maxMovementStack: 8.2,
  dialSeat: { min: 28.3, max: 28.7 },
  chapterRing: { requirement: 'optional', seatDiameter: 30.5 },
  bezelSeat: 'diver42',
  crystalSeat: 31.5,
};

describe('crown geometry', () => {
  it('maps 3.8 and 4.1 to 2 and 3 date-disc steps', () => {
    expect(crownAngle(0)).toBe(90);
    expect(crownAngle(2) - 90).toBeCloseTo(23.23, 2);
    expect(crownAngle(3) - 90).toBeCloseTo(34.84, 2);
    expect(DATE_STEP_DEG).toBeCloseTo(11.613, 3);
  });
});

describe('Case', () => {
  it('accepts a valid case and applies defaults', () => {
    const parsed = Case.parse(validCase);
    expect(parsed.spacerMounts).toEqual([]);
  });

  it('rejects crown positions that are not whole date steps', () => {
    expect(Case.safeParse({ ...validCase, crownSteps: 1 }).success).toBe(false);
  });

  it('rejects an integrated case that also declares a lug width', () => {
    const r = Case.safeParse({ ...validCase, integratedProfile: 'octagon41' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['lugWidth']);
  });

  it('rejects a non-integrated case without a lug width', () => {
    expect(Case.safeParse({ ...validCase, lugWidth: null }).success).toBe(false);
  });

  it('requires a seat diameter unless chapter ring is "none"', () => {
    expect(Case.safeParse({ ...validCase, chapterRing: { requirement: 'required' } }).success).toBe(false);
    expect(Case.safeParse({ ...validCase, chapterRing: { requirement: 'none' } }).success).toBe(true);
  });

  it('rejects an inverted dial seat', () => {
    expect(Case.safeParse({ ...validCase, dialSeat: { min: 29, max: 28 } }).success).toBe(false);
  });

  it('rejects ids with uppercase or spaces', () => {
    expect(Case.safeParse({ ...validCase, id: 'Case 1' }).success).toBe(false);
  });
});

describe('Dial', () => {
  const dial = {
    ...base, type: 'dial', id: 'dl-test', diameter: 28.5, feetSystem: 'seiko-nh', crownSteps: [0, 2],
    centerHole: 2.1, dateWindow: { angle: 90 }, dayWindow: null, openHeartAperture: null,
  };
  it('accepts a dual-feet dial', () => expect(Dial.parse(dial).gmtScale).toBe(false));
  it('rejects duplicate crown steps', () => expect(Dial.safeParse({ ...dial, crownSteps: [2, 2] }).success).toBe(false));
  it('rejects an angle of 360', () => expect(Dial.safeParse({ ...dial, dateWindow: { angle: 360 } }).success).toBe(false));
});

describe('Hands', () => {
  const hands = {
    ...base, type: 'hands', id: 'hd-test',
    holes: { hour: 1.5, minute: 0.9, seconds: 0.2 },
    lengths: { hour: 8.5, minute: 12.5, seconds: 13 },
  };
  it('accepts a 3-hand set', () => expect(Hands.safeParse(hands).success).toBe(true));
  it('rejects a GMT hole without a GMT length', () => {
    expect(Hands.safeParse({ ...hands, holes: { ...hands.holes, gmt: 2.2 } }).success).toBe(false);
  });
});

describe('ChapterRing', () => {
  it('rejects inner >= outer', () => {
    const ring = { ...base, type: 'chapterRing', id: 'cr-test', outerDiameter: 27.5, innerDiameter: 30.5, height: 2.3 };
    expect(ChapterRing.safeParse(ring).success).toBe(false);
  });
});

describe('Strap', () => {
  const strap = { ...base, type: 'strap', id: 'st-test', kind: 'integrated', width: null, integratedProfile: 'octagon41' };
  it('accepts an integrated bracelet', () => expect(Strap.safeParse(strap).success).toBe(true));
  it('rejects an integrated bracelet without a profile', () => {
    expect(Strap.safeParse({ ...strap, integratedProfile: undefined }).success).toBe(false);
  });
  it('rejects a regular strap without a width', () => {
    expect(Strap.safeParse({ ...strap, kind: 'nato', integratedProfile: undefined }).success).toBe(false);
  });
});

describe('Part union', () => {
  it('dispatches on type and still runs refinements', () => {
    expect(Part.safeParse(validCase).success).toBe(true);
    expect(Part.safeParse({ ...validCase, lugWidth: null }).success).toBe(false);
  });
  it('rejects unknown types', () => {
    expect(Part.safeParse({ ...validCase, type: 'gasket' }).success).toBe(false);
  });
});
