import type { Part, PartOf, PartType } from '../domain/schemas';

/**
 * Starting point for a new part: valid on its own and sized like the most common
 * mod platform (NH movement, 40–42mm diver case), so the live preview works from the first keystroke.
 */
const BLANKS: { [K in PartType]: Omit<PartOf<K>, 'id' | 'name'> } = {
  movement: {
    type: 'movement',
    confidence: 'unverified',
    maker: 'Unknown',
    caliber: 'Custom',
    kind: 'mechanical',
    mountSystem: 'seiko-nh',
    feetSystem: 'seiko-nh',
    diameter: 27.4,
    height: 5.32,
    heightWithHands: 7.59,
    handPosts: { hour: 1.5, minute: 0.9, seconds: 0.2 },
    minDialCenterHole: 2.1,
    date: { angle: 90 },
    day: null,
    openHeart: null,
    visual: { kind: 'template', template: 'movement/nh', params: {} },
  },
  case: {
    type: 'case',
    confidence: 'unverified',
    style: 'diver42',
    diameter: 42,
    lugToLug: 46,
    thickness: 10.2,
    lugWidth: 22,
    crownSteps: 2,
    crownTube: 'diver42',
    movementMounts: ['seiko-nh'],
    spacerMounts: [],
    maxMovementStack: 8.2,
    dialSeat: { min: 28.3, max: 28.7 },
    chapterRing: { requirement: 'optional', seatDiameter: 30.5 },
    bezelSeat: 'diver42',
    crystalSeat: 31.5,
    visual: { kind: 'template', template: 'case/diver', params: { finish: 'brushed', metal: '#c9ccd1' } },
  },
  dial: {
    type: 'dial',
    confidence: 'unverified',
    diameter: 28.5,
    feetSystem: 'seiko-nh',
    crownSteps: [0],
    centerHole: 2.1,
    dateWindow: { angle: 90 },
    dayWindow: null,
    openHeartAperture: null,
    gmtScale: false,
    visual: { kind: 'template', template: 'dial/generated', params: { color: '#141518', finish: 'matte', markers: 'dots-bars', lume: '#e8f0d8' } },
  },
  hands: {
    type: 'hands',
    confidence: 'unverified',
    holes: { hour: 1.5, minute: 0.9, seconds: 0.2 },
    lengths: { hour: 8.5, minute: 12.5, seconds: 13.0 },
    visual: { kind: 'template', template: 'hands/sword', params: { metal: '#e6e7e9', lume: '#e8f0d8', accent: '#e6e7e9' } },
  },
  chapterRing: {
    type: 'chapterRing',
    confidence: 'unverified',
    outerDiameter: 30.5,
    innerDiameter: 27.5,
    height: 2.3,
    visual: { kind: 'template', template: 'chapterRing/minutes', params: { color: '#c9ccd1', marks: '#141518' } },
  },
  bezel: {
    type: 'bezel',
    confidence: 'unverified',
    seat: 'diver42',
    action: 'unidirectional',
    insert: { outerDiameter: 38.0, innerDiameter: 30.6, profile: 'sloped' },
    visual: { kind: 'template', template: 'bezel/coin-edge', params: { metal: '#c9ccd1' } },
  },
  bezelInsert: {
    type: 'bezelInsert',
    confidence: 'unverified',
    outerDiameter: 38.0,
    innerDiameter: 30.6,
    profile: 'sloped',
    scale: 'dive-60',
    visual: { kind: 'template', template: 'bezelInsert/dive', params: { primary: '#141518', secondary: '#e6e7e9' } },
  },
  crystal: {
    type: 'crystal',
    confidence: 'unverified',
    diameter: 31.5,
    thickness: 3.0,
    shape: 'flat',
    magnifier: null,
    arCoating: 'clear',
    visual: { kind: 'template', template: 'crystal/flat', params: {} },
  },
  crown: {
    type: 'crown',
    confidence: 'unverified',
    tube: 'diver42',
    diameter: 6.0,
    signed: false,
    visual: { kind: 'template', template: 'crown/knurled', params: { metal: '#c9ccd1' } },
  },
  strap: {
    type: 'strap',
    confidence: 'unverified',
    kind: 'oyster',
    width: 22,
    endLinkProfile: 'diver42',
    color: '#c9ccd1',
    visual: { kind: 'template', template: 'strap/oyster', params: { metal: '#c9ccd1' } },
  },
};

export const NEW_PART_NAMES: Record<PartType, string> = {
  movement: 'New movement',
  case: 'New case',
  dial: 'New dial',
  hands: 'New hands',
  chapterRing: 'New chapter ring',
  bezel: 'New bezel',
  bezelInsert: 'New bezel insert',
  crystal: 'New crystal',
  crown: 'New crown',
  strap: 'New strap',
};

/** A fresh, valid part of `type`. Deep-cloned, so callers can edit it freely. */
export function blankPart<T extends PartType>(type: T, id: string, name = NEW_PART_NAMES[type]): PartOf<T> {
  return { ...structuredClone(BLANKS[type]), id, name } as unknown as PartOf<T>;
}

/** A copy of `part` under a new id and name, always `unverified` (the measurements are no longer the original's). */
export function duplicatePart(part: Part, id: string, name: string): Part {
  return { ...structuredClone(part), id, name, confidence: 'unverified' };
}
