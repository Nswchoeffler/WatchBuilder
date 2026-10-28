import { AT_3, AT_9, tpl, type SeedPart } from './helpers';

// Sources and confidence notes: docs/compatibility-spec.md §3.

const nhBase = {
  maker: 'Seiko (TMI)',
  kind: 'mechanical',
  mountSystem: 'seiko-nh',
  feetSystem: 'seiko-nh',
  diameter: 27.4,
  casingDiameter: 29.36,
  height: 5.32,
  heightWithHands: 7.59,
  handPosts: { hour: 1.5, minute: 0.9, seconds: 0.2 },
  minDialCenterHole: 2.1,
  date: AT_3,
  day: null,
  openHeart: null,
  visual: tpl('movement/nh'),
} as const;

/** The NH70A / NH72A: one frame, differing only in plating (TMI spec sheets NH70_SS, NH72_SS, rev. 16 Nov 2022). */
const nhOpenWorked = {
  ...nhBase,
  type: 'movement',
  confidence: 'verified',
  feetSystem: 'seiko-nh-skeleton',
  // Casing Ø27.00 (+0 / −0.32) on the open-worked pair, against 29.36 with the NH35's dial-holding spacer.
  casingDiameter: 27.0,
  date: null,
  // The dial drawing allows an opening of Ø23.90 at most.
  openWork: { maxDialOpening: 23.9 },
} as const;

const nhOpenWorkedNotes =
  'Ø27.40, height 5.32, hand posts as the NH35, total height 7.59 with the type M centre post (7.99 with the tall post), casing Ø27.00 +0 / −0.32 ' +
  '(clamped with casing clamps, no dial-holding spacer). Own dial feet: F1 at (−10.600, +7.428), F2 at (+8.322, −9.932), i.e. 305.0° and 140.0° at radius ≈12.9, ' +
  'Ø0.74, for a 3:00 crown (the NH35 pair sits at 48° / 228°), so NH dials do not fit. The dial is a ring: Ø31.50 ± 0.05, 0.40 thick, with an opening of Ø23.90 at most. ' +
  'Modelled with the NH mount because vendors list the pair for NH cases (e.g. the octagon case), but the sheet gives no mount drawing for an NH35 case ring; confirm before ordering.';

/** Miyota 9 series: one frame (Ø26.00, height 3.90), the same hand posts, feet and dial hole. Miyota drawings, see mv-m9015. */
const miyota9Base = {
  type: 'movement',
  maker: 'Miyota (Citizen)',
  kind: 'mechanical',
  confidence: 'verified',
  mountSystem: 'miyota-26',
  feetSystem: 'miyota-90',
  diameter: 26.0,
  height: 3.9,
  heightWithHands: 6.0,
  handPosts: { hour: 1.52, minute: 1.0, seconds: 0.17 },
  minDialCenterHole: 2.0,
  date: AT_3,
  day: null,
  openHeart: null,
  visual: tpl('movement/miyota'),
} as const;

export const movements: SeedPart<'movement'>[] = [
  { ...nhBase, type: 'movement', id: 'mv-nh35', name: 'Seiko NH35A', caliber: 'NH35A', confidence: 'verified' },
  {
    ...nhBase,
    type: 'movement',
    id: 'mv-nh36',
    name: 'Seiko NH36A (day-date)',
    caliber: 'NH36A',
    confidence: 'verified',
    day: { angle: 90, crownSteps: 0 },
    notes: 'Day wheel indexed for a 3:00 crown; a 3.8 case needs a day-wheel swap.',
  },
  {
    ...nhBase,
    type: 'movement',
    id: 'mv-nh34',
    name: 'Seiko NH34A GMT',
    caliber: 'NH34A',
    confidence: 'community',
    heightWithHands: 7.99,
    handPosts: { hour: 1.5, minute: 0.9, seconds: 0.2, gmt: 2.2 },
    minDialCenterHole: 2.9,
    visual: tpl('movement/nh', { gmt: true }),
  },
  {
    ...nhBase,
    type: 'movement',
    id: 'mv-nh38',
    name: 'Seiko NH38A Open Heart',
    caliber: 'NH38A',
    confidence: 'community',
    date: null,
    openHeart: AT_9,
    visual: tpl('movement/nh', { openHeart: true }),
  },
  {
    ...nhBase,
    type: 'movement',
    id: 'mv-nh39',
    name: 'Seiko NH39A (24-hour sub-dial)',
    caliber: 'NH39A',
    confidence: 'verified',
    notes:
      'From the TMI spec sheet (Watch Movement Specification and Drawing, rev. 16 Nov 2022): Ø27.40 (casing Ø29.36), height 5.32, no date. ' +
      'Small 24-hour hand on its own post, Ø0.21 ± 0.006, at (−3.656, +4.478) from the dial centre: 5.78 from centre at 320.8°. Hand posts as the NH35 (the sheet gives ' +
      '1.506 / 0.891 / 0.215; stored as 1.50 / 0.90 / 0.20 like the rest of the family, inside the 0.015 rule). Total height 7.99 with the centre post (only the tall post is listed; ' +
      'the NH35 is 7.59). Dial feet are the NH35 pair. The dial drawing marks a MAX Ø10.00 open area centred at (−6.827, −0.558), 265.3°; read as the balance aperture ' +
      '(the cover drawing shows the mechanism there), but the sheet does not name it. The sheet says: screw-type case back required, not for diver\'s watches.',
    sources: ['https://www.timemodule.com/upload/category/28/spec_sheet/NH39_SS.pdf', 'https://www.timemodule.com/upload/category/24/spec_sheet/NH35_SS.pdf'],
    heightWithHands: 7.99,
    handPosts: { hour: 1.5, minute: 0.9, seconds: 0.2 },
    date: null,
    openHeart: { angle: 265.3 },
    subdials: [{ indicates: '24-hour', angle: 320.8, distance: 5.78, post: 0.21 }],
    visual: tpl('movement/nh', { openHeart: true }),
  },
  {
    ...nhOpenWorked,
    id: 'mv-nh70',
    name: 'Seiko NH70A (open-worked, nickel)',
    caliber: 'NH70A',
    notes:
      nhOpenWorkedNotes +
      ' Nickel plated; "three hands (skeleton)", no date.',
    sources: ['https://www.timemodule.com/upload/category/29/spec_sheet/NH70_SS.pdf', 'https://www.timemodule.com/upload/category/24/spec_sheet/NH35_SS.pdf'],
  },
  {
    ...nhOpenWorked,
    id: 'mv-nh72',
    name: 'Seiko NH72A (open-worked, ruthenium)',
    caliber: 'NH72A',
    notes:
      nhOpenWorkedNotes +
      ' Ruthenium grey plated; "three hands (skeleton)", no date. The NH70A sheet and this one are identical apart from the plating.',
    sources: ['https://www.timemodule.com/upload/category/31/spec_sheet/NH72_SS.pdf', 'https://www.timemodule.com/upload/category/29/spec_sheet/NH70_SS.pdf'],
  },
  {
    type: 'movement',
    id: 'mv-m8215',
    name: 'Miyota 8215',
    maker: 'Miyota (Citizen)',
    caliber: '8215',
    kind: 'mechanical',
    confidence: 'community',
    notes:
      'Diameter 26.00 (case fitting 25.60), height 5.67, hand posts 1.52 / 1.00 / 0.17, dial centre hole 2.00 ± 0.04 and the dial feet ' +
      '(DH1 ≈ 170°, DH2 ≈ 324°, Ø0.725) from the Miyota frame and dial drawings (821500C1, 8215-33E). heightWithHands unverified.',
    sources: ['https://miyotamovement.com/product/8215/'],
    mountSystem: 'miyota-26',
    feetSystem: 'miyota-82',
    diameter: 26.0,
    height: 5.67,
    heightWithHands: 7.4,
    handPosts: { hour: 1.52, minute: 1.0, seconds: 0.17 },
    minDialCenterHole: 2.0,
    date: AT_3,
    day: null,
    openHeart: null,
    visual: tpl('movement/miyota'),
  },
  {
    ...miyota9Base,
    id: 'mv-m9015',
    name: 'Miyota 9015',
    caliber: '9015',
    notes:
      'From the Miyota frame and dial drawings (901500C0, 9015-20A / -20Y): diameter 26.00 (case fitting 25.60), height 3.90, ' +
      'hand posts 1.52 / 1.00 / 0.17 (the hour post is 1.52, not 1.50), hand stack 2.10 above the movement, dial centre hole 2.00 ± 0.04, ' +
      'dial feet DH11 ≈ 77° and DH12 ≈ 252° (Ø0.70), date at 3:00 (-20A) or 6:00 (-20Y). Caliber Corner gives the same 2.1 hand stack.',
    sources: ['https://miyotamovement.com/product/9015/', 'https://calibercorner.com/miyota-caliber-9039-vs-9015/'],
  },
  {
    ...miyota9Base,
    id: 'mv-m9019',
    name: 'Miyota 9019',
    caliber: '9019',
    notes:
      'The 9015 with a lower hand stack: 1.75 above the movement (frame drawing 901900C0), so height with hands 5.65. ' +
      'Same frame, posts, feet and date at 3:00 (dial drawing 9019-20A).',
    sources: ['https://miyotamovement.com/product/9019/'],
    heightWithHands: 5.65,
  },
  {
    ...miyota9Base,
    id: 'mv-m9039',
    name: 'Miyota 9039 (no date)',
    caliber: '9039',
    notes:
      'The 9015 without a date wheel and with a 1.75 hand stack (spec sheet: 0.90 + 0.40 + 0.45; frame drawing 903900C0), ' +
      'so height with hands 5.65. Same frame, posts and feet (dial drawing 9039-20A).',
    sources: ['https://miyotamovement.com/product/9039/'],
    heightWithHands: 5.65,
    date: null,
  },
  {
    ...miyota9Base,
    id: 'mv-m90s5',
    name: 'Miyota 90S5 Open Heart',
    caliber: '90S5',
    notes:
      'No date; the balance shows through a Ø9.20 dial opening centred 1.575 right of and 6.399 below the dial centre, ≈ 166° ' +
      '(dial drawing 90S5-20A). Same frame, posts, feet and 2.10 hand stack as the 9015 (frame drawing 90S500C0).',
    sources: ['https://miyotamovement.com/product/90S5/'],
    date: null,
    openHeart: { angle: 166 },
  },
  {
    type: 'movement',
    id: 'mv-eta2824',
    name: 'ETA 2824-2',
    maker: 'ETA',
    caliber: '2824-2',
    kind: 'mechanical',
    confidence: 'community',
    notes: 'heightWithHands and dial centre hole unverified.',
    mountSystem: 'eta-25.6',
    feetSystem: 'eta-2824',
    diameter: 25.6,
    height: 4.6,
    heightWithHands: 6.6,
    handPosts: { hour: 1.5, minute: 0.9, seconds: 0.25 },
    minDialCenterHole: 2.1,
    date: AT_3,
    day: null,
    openHeart: null,
    visual: tpl('movement/eta'),
  },
  {
    type: 'movement',
    id: 'mv-sw200',
    name: 'Sellita SW200-1',
    maker: 'Sellita',
    caliber: 'SW200-1',
    kind: 'mechanical',
    confidence: 'community',
    notes:
      'Overall diameter 26.00, case fitting diameter 25.60, height 4.60 and hand fittings 1.50 / 0.90 / 0.25 verified (Sellita technical documentation SW200-1, rev. 07, 2024). ' +
      'heightWithHands unverified. Own feet system until SW200 vs ETA 2824 dial-feet compatibility is confirmed: the Sellita dial drawing gives the feet only graphically.',
    sources: ['https://www.sellita.ch/scripts/calibres/images/DocTec_SW200-1_7.pdf'],
    mountSystem: 'eta-25.6',
    feetSystem: 'sellita-sw200',
    diameter: 26.0,
    height: 4.6,
    heightWithHands: 6.6,
    handPosts: { hour: 1.5, minute: 0.9, seconds: 0.25 },
    minDialCenterHole: 2.1,
    date: AT_3,
    day: null,
    openHeart: null,
    visual: tpl('movement/eta'),
  },
  {
    type: 'movement',
    id: 'mv-vh31',
    name: 'Seiko VH31 (quartz sweep)',
    maker: 'Seiko (TMI)',
    caliber: 'VH31A',
    kind: 'quartz',
    confidence: 'community',
    notes:
      'Diameter 23.70 / casing 23.30 / height 3.45 verified (TMI datasheet). Hand posts 1.20 / 0.70 / 0.17 from Caliber Corner (community); ' +
      'the TMI technical guide gives no hole sizes. The order is hour / minute / seconds because each hand pipe fits over the next. heightWithHands unverified.',
    sources: ['https://calibercorner.com/seiko-caliber-vh31/', 'https://boley.de/downloads/9f9f399fb4bc4651a262ecfcdb9d5e94/SHIOJIRI-VH31.pdf'],
    mountSystem: 'seiko-vh',
    feetSystem: 'seiko-vh',
    diameter: 23.7,
    casingDiameter: 23.3,
    height: 3.45,
    heightWithHands: 5.5,
    handPosts: { hour: 1.2, minute: 0.7, seconds: 0.17 },
    minDialCenterHole: 1.8,
    date: null,
    day: null,
    openHeart: null,
    visual: tpl('movement/vh'),
  },
];
