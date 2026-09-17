import { z } from 'zod';
import { Angle, CrownSteps, Feature, HexColor, Mm, Slug, partBaseShape } from './common';

/** How a movement sits in the case (casing ring / movement holder standard). */
export const MountSystem = z.enum(['seiko-nh', 'miyota-26', 'eta-25.6', 'seiko-vh']);
export type MountSystem = z.infer<typeof MountSystem>;

/** Dial-feet pattern. `none` = feetless dial mounted with dial dots. */
export const FeetSystem = z.enum([
  'seiko-nh',
  'miyota-82',
  'miyota-90',
  'eta-2824',
  'sellita-sw200',
  'seiko-vh',
  'none',
]);
export type FeetSystem = z.infer<typeof FeetSystem>;

const HandSet = <T extends z.ZodType>(value: T) =>
  z.object({
    hour: value,
    minute: value,
    seconds: value.nullable(),
    gmt: value.optional(),
  });

const uniqueSteps = z
  .array(CrownSteps)
  .min(1)
  .refine((a) => new Set(a).size === a.length, 'crown steps must be unique');

// ---------------------------------------------------------------- movement

export const Movement = z.object({
  ...partBaseShape,
  type: z.literal('movement'),
  maker: z.string().min(1),
  caliber: z.string().min(1),
  kind: z.enum(['mechanical', 'quartz']),
  mountSystem: MountSystem,
  feetSystem: FeetSystem,
  diameter: Mm,
  casingDiameter: Mm.optional(),
  height: Mm,
  /** Stack height including hands; used against case.maxMovementStack. */
  heightWithHands: Mm,
  handPosts: HandSet(Mm),
  minDialCenterHole: Mm,
  /** Date shown at this angle in the movement's own frame (crown at 3:00). Null = no date. */
  date: Feature.nullable(),
  /** Day wheel, and which crown position it is indexed for. Null = no day. */
  day: z.object({ angle: Angle, crownSteps: CrownSteps }).nullable(),
  /** Balance aperture angle in the movement frame. Null = not open-heart. */
  openHeart: Feature.nullable(),
});
export type Movement = z.infer<typeof Movement>;

// ---------------------------------------------------------------- case

export const Case = z
  .object({
    ...partBaseShape,
    type: z.literal('case'),
    style: Slug,
    diameter: Mm,
    lugToLug: Mm,
    thickness: Mm,
    /** Null for integrated-bracelet cases. */
    lugWidth: Mm.nullable(),
    integratedProfile: Slug.optional(),
    endLinkProfile: Slug.optional(),
    crownSteps: CrownSteps,
    crownTube: Slug,
    movementMounts: z.array(MountSystem).min(1),
    /** Mount systems that fit with a spacer ring (modification flag `movement-spacer`). */
    spacerMounts: z.array(MountSystem).default([]),
    maxMovementStack: Mm,
    dialSeat: z.object({ min: Mm, max: Mm }).refine((s) => s.min <= s.max, 'min must be <= max'),
    chapterRing: z.discriminatedUnion('requirement', [
      z.object({ requirement: z.literal('none') }),
      z.object({ requirement: z.enum(['optional', 'required']), seatDiameter: Mm }),
    ]),
    /** Bezel seat id, or `integral` when the bezel is part of the case. */
    bezelSeat: Slug,
    crystalSeat: Mm,
  })
  .superRefine((c, ctx) => {
    if (c.integratedProfile && c.lugWidth !== null) {
      ctx.addIssue({ code: 'custom', path: ['lugWidth'], message: 'integrated cases must have lugWidth null' });
    }
    if (!c.integratedProfile && c.lugWidth === null) {
      ctx.addIssue({ code: 'custom', path: ['lugWidth'], message: 'lugWidth is required unless integratedProfile is set' });
    }
  });
export type Case = z.infer<typeof Case>;

// ---------------------------------------------------------------- dial

export const Dial = z.object({
  ...partBaseShape,
  type: z.literal('dial'),
  diameter: Mm,
  feetSystem: FeetSystem,
  /** Crown positions this dial has feet for (mod dials often carry two pairs). */
  crownSteps: uniqueSteps,
  centerHole: Mm,
  /** Windows/apertures in dial coordinates (12:00 up). */
  dateWindow: Feature.nullable(),
  dayWindow: Feature.nullable(),
  openHeartAperture: Feature.nullable(),
  gmtScale: z.boolean().default(false),
});
export type Dial = z.infer<typeof Dial>;

// ---------------------------------------------------------------- hands

export const Hands = z
  .object({
    ...partBaseShape,
    type: z.literal('hands'),
    holes: HandSet(Mm),
    lengths: HandSet(Mm),
  })
  .superRefine((h, ctx) => {
    if ((h.holes.gmt === undefined) !== (h.lengths.gmt === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['lengths', 'gmt'], message: 'gmt hole and gmt length must both be set or both omitted' });
    }
    if ((h.holes.seconds === null) !== (h.lengths.seconds === null)) {
      ctx.addIssue({ code: 'custom', path: ['lengths', 'seconds'], message: 'seconds hole and length must both be set or both null' });
    }
  });
export type Hands = z.infer<typeof Hands>;

// ---------------------------------------------------------------- rings, bezels, crystal, crown

export const InsertProfile = z.enum(['flat', 'sloped']);

export const ChapterRing = z
  .object({
    ...partBaseShape,
    type: z.literal('chapterRing'),
    outerDiameter: Mm,
    innerDiameter: Mm,
    height: Mm,
  })
  .refine((r) => r.innerDiameter < r.outerDiameter, { path: ['innerDiameter'], message: 'inner must be < outer' });
export type ChapterRing = z.infer<typeof ChapterRing>;

export const Bezel = z.object({
  ...partBaseShape,
  type: z.literal('bezel'),
  seat: Slug,
  action: z.enum(['unidirectional', 'bidirectional', 'fixed']),
  insert: z
    .object({ outerDiameter: Mm, innerDiameter: Mm, profile: InsertProfile })
    .refine((i) => i.innerDiameter < i.outerDiameter, { path: ['innerDiameter'], message: 'inner must be < outer' })
    .nullable(),
});
export type Bezel = z.infer<typeof Bezel>;

export const BezelInsert = z
  .object({
    ...partBaseShape,
    type: z.literal('bezelInsert'),
    outerDiameter: Mm,
    innerDiameter: Mm,
    profile: InsertProfile,
    scale: z.enum(['dive-60', 'gmt-24', 'tachymeter', 'countdown', 'compass', 'plain']),
  })
  .refine((i) => i.innerDiameter < i.outerDiameter, { path: ['innerDiameter'], message: 'inner must be < outer' });
export type BezelInsert = z.infer<typeof BezelInsert>;

export const Crystal = z.object({
  ...partBaseShape,
  type: z.literal('crystal'),
  diameter: Mm,
  thickness: Mm,
  shape: z.enum(['flat', 'single-dome', 'double-dome', 'box']),
  magnifier: Feature.nullable(),
  arCoating: z.enum(['none', 'clear', 'blue', 'purple']),
});
export type Crystal = z.infer<typeof Crystal>;

export const Crown = z.object({
  ...partBaseShape,
  type: z.literal('crown'),
  tube: Slug,
  diameter: Mm,
  signed: z.boolean(),
});
export type Crown = z.infer<typeof Crown>;

// ---------------------------------------------------------------- strap

export const Strap = z
  .object({
    ...partBaseShape,
    type: z.literal('strap'),
    kind: z.enum(['oyster', 'jubilee', 'president', 'mesh', 'nato', 'rubber', 'tropic', 'leather', 'integrated']),
    /** Null for integrated bracelets. */
    width: Mm.nullable(),
    endLinkProfile: Slug.optional(),
    integratedProfile: Slug.optional(),
    color: HexColor.optional(),
  })
  .superRefine((s, ctx) => {
    const integrated = s.kind === 'integrated';
    if (integrated !== Boolean(s.integratedProfile)) {
      ctx.addIssue({ code: 'custom', path: ['integratedProfile'], message: 'integratedProfile is required exactly when kind is "integrated"' });
    }
    if (integrated !== (s.width === null)) {
      ctx.addIssue({ code: 'custom', path: ['width'], message: 'width must be null exactly when kind is "integrated"' });
    }
  });
export type Strap = z.infer<typeof Strap>;

// ---------------------------------------------------------------- union

export const Part = z.discriminatedUnion('type', [
  Movement,
  Case,
  Dial,
  Hands,
  ChapterRing,
  Bezel,
  BezelInsert,
  Crystal,
  Crown,
  Strap,
]);
export type Part = z.infer<typeof Part>;
export type PartType = Part['type'];
export type PartOf<T extends PartType> = Extract<Part, { type: T }>;

export const PART_TYPES = [
  'movement',
  'case',
  'dial',
  'hands',
  'chapterRing',
  'bezel',
  'bezelInsert',
  'crystal',
  'crown',
  'strap',
] as const satisfies readonly PartType[];
