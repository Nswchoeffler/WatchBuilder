import { tpl, type SeedPart } from './helpers';

// Reference products: Diver 42 ≈ namokiMODS NMK901; Fluted Classic 36 ≈ Lucius Atelier Datejust 36;
// Octagon 41 ≈ Nomods 41mm; Diver 42.5 Slim ≈ namokiMODS NMK948. See docs/compatibility-spec.md §5.

/** The NH70A / NH72A are cased at Ø27.00 against the NH35's 29.36 (see mv-nh70); an NH case takes them only with a spacer ring. */
const SPACER_NH27 = 'seiko-nh-27' as const;

const diver42 = {
  type: 'case',
  style: 'diver42',
  diameter: 42,
  lugToLug: 46,
  thickness: 10.2,
  lugWidth: 22,
  endLinkProfile: 'diver42',
  crownTube: 'diver42',
  movementMounts: ['seiko-nh'],
  spacerMounts: ['seiko-vh', SPACER_NH27],
  maxMovementStack: 8.2,
  dialSeat: { min: 28.3, max: 28.7 },
  chapterRing: { requirement: 'optional', seatDiameter: 30.5 },
  bezelSeat: 'diver42',
  crystalSeat: 31.5,
} satisfies Omit<SeedPart<'case'>, 'id' | 'name' | 'confidence' | 'crownSteps' | 'visual'>;

/**
 * Inside fittings of a case sold as taking SKX007 parts: they are the Diver 42's, since that is what
 * "fits SKX007 crystals, bezels, crowns and chapter rings" means. Outer sizes come from each listing.
 */
const skx007Fit = {
  type: 'case',
  style: 'diver42',
  confidence: 'community',
  crownTube: diver42.crownTube,
  movementMounts: diver42.movementMounts,
  spacerMounts: diver42.spacerMounts,
  maxMovementStack: diver42.maxMovementStack,
  dialSeat: diver42.dialSeat,
  chapterRing: diver42.chapterRing,
  bezelSeat: diver42.bezelSeat,
  crystalSeat: diver42.crystalSeat,
} as const;

const nmk = (ref: string, facts: string) =>
  `namokiMODS ${ref}: ${facts} Fittings inside are the SKX007's (dial 28.5, ring seat 30.5, crystal 31.5, Diver 42 bezel and crown); stack limit as the Diver 42.`;

/**
 * Lucius Atelier cases share one inside: 28.5 dial on a required SKX013-spec chapter ring (seat 28.5), a bezel that is part of
 * the case, an SKX013-spec crown and NH movements. Each lists its own crystal; NH34-ready cases keep the Diver 42 stack limit.
 */
const luciusFit = {
  type: 'case',
  style: 'dress',
  confidence: 'community',
  crownSteps: 0,
  crownTube: 'skx013',
  movementMounts: ['seiko-nh'],
  spacerMounts: [SPACER_NH27],
  maxMovementStack: 8.2,
  dialSeat: { min: 28.3, max: 28.7 },
  chapterRing: { requirement: 'required', seatDiameter: 28.5 },
  bezelSeat: 'integral',
} satisfies Partial<SeedPart<'case'>>;

export const cases: SeedPart<'case'>[] = [
  {
    ...diver42,
    id: 'cs-diver42-38',
    name: 'Diver 42 (crown 3.8)',
    inspiredBy: 'SKX007 / SRPD',
    confidence: 'verified',
    crownSteps: 2,
    visual: tpl('case/diver', { finish: 'brushed', metal: '#c9ccd1' }),
  },
  {
    ...diver42,
    id: 'cs-diver42-30',
    name: 'Diver 42 (crown 3.0)',
    inspiredBy: 'SKX007-style with 3:00 crown',
    confidence: 'community',
    crownSteps: 0,
    visual: tpl('case/diver', { finish: 'brushed', metal: '#c9ccd1' }),
  },
  {
    type: 'case',
    id: 'cs-diver42-miyota',
    name: 'Diver 42.5 Slim (Miyota 9)',
    style: 'diver42',
    inspiredBy: 'SKX007-style case for Miyota 9 series',
    confidence: 'community',
    notes:
      'namokiMODS NMK948: Ø42.5, lug-to-lug 46.4, 11.3 thick with slim bezel and crystal, lugs 22, integrated rehaut (no chapter ring), ' +
      'fits Miyota 9015 / 90S5 / 9019 / 9029 / 9039 and "all SKX007 bezels, bezel inserts, crystals and crowns" (vendor listing). ' +
      'Crown at 3.8 read from the straight-on product photo. Dial seat follows the vendor note that its 28.5mm Seiko no-date dials fit, ' +
      'feet clipped, with dial dots; it sells no Miyota dials, so every build needs dial dots. Stack height not published: set to the ' +
      'Miyota 9015 stack the case is sold for. SKX end links not mentioned.',
    sources: ['https://www.namokimods.com/products/nmk948-miyota-skx-case-steel-finish'],
    diameter: 42.5,
    lugToLug: 46.4,
    thickness: 11.3,
    lugWidth: 22,
    crownSteps: 2,
    crownTube: 'diver42',
    movementMounts: ['miyota-26'],
    maxMovementStack: 6.0,
    dialSeat: { min: 28.3, max: 28.7 },
    chapterRing: { requirement: 'none' },
    bezelSeat: 'diver42',
    crystalSeat: 31.5,
    visual: tpl('case/diver', { finish: 'brushed', metal: '#c9ccd1' }),
  },
  {
    type: 'case',
    id: 'cs-sub40',
    name: 'Sub-style 40',
    style: 'sub40',
    inspiredBy: 'Classic 40mm dive case',
    confidence: 'unverified',
    notes:
      'Dial 28.5–29, insert 38×30.6, lugs 20, SKX013-spec ring (community). Lug-to-lug, crystal, stack height unverified. ' +
      'The 38×30.6 insert matches the sloped SKX007 insert (namokiMODS insert sizes: 38.0 outer × 30.6 inner). The nearest published 40mm sub, namokiMODS NMK909, ' +
      'gives 40 / 47.5 lug-to-lug / 11 case only / lugs 22 and "fits all original and aftermarket SKX007 mod parts"; it is a 22mm-lug SKX007 clone, not necessarily this ' +
      'case (lugs 20, 13.4 thick), so nothing here was changed from it. Still unpublished for either: crown position, crystal size, stack height, crown tube.',
    sources: [
      'https://www.namokimods.com/products/nmk909-sub-skx007-srpd-watch-case-polished-black-finish',
      'https://www.namokimods.com/pages/seiko-bezel-insert-sizes',
    ],
    diameter: 40,
    lugToLug: 48,
    thickness: 13.4,
    lugWidth: 20,
    crownSteps: 0,
    crownTube: 'sub40',
    movementMounts: ['seiko-nh'],
    spacerMounts: [SPACER_NH27],
    maxMovementStack: 8.2,
    dialSeat: { min: 28.3, max: 29.0 },
    chapterRing: { requirement: 'optional', seatDiameter: 28.5 },
    bezelSeat: 'sub40',
    crystalSeat: 31.0,
    visual: tpl('case/sub', { finish: 'polished', metal: '#d4d7db' }),
  },
  {
    type: 'case',
    id: 'cs-fluted36',
    name: 'Fluted Classic 36',
    style: 'fluted36',
    inspiredBy: 'Fluted-bezel dress case',
    confidence: 'community',
    notes: 'Chapter ring mandatory (SKX013-spec). Not NH34-compatible per vendor.',
    diameter: 36,
    lugToLug: 43,
    thickness: 11.5,
    lugWidth: 20,
    crownSteps: 0,
    crownTube: 'fluted36',
    movementMounts: ['seiko-nh', 'eta-25.6'],
    spacerMounts: [SPACER_NH27],
    maxMovementStack: 7.7,
    dialSeat: { min: 28.3, max: 28.7 },
    chapterRing: { requirement: 'required', seatDiameter: 28.5 },
    bezelSeat: 'fluted36',
    crystalSeat: 29.5,
    visual: tpl('case/fluted', { finish: 'polished', metal: '#d4d7db' }),
  },
  {
    type: 'case',
    id: 'cs-fluted39',
    name: 'Fluted Classic 39',
    style: 'fluted39',
    inspiredBy: 'Fluted-bezel dress case',
    confidence: 'unverified',
    notes: 'Only diameter / lug-to-lug known (community listings). Other values copied from the 36 as placeholders.',
    diameter: 39,
    lugToLug: 48,
    thickness: 11.8,
    lugWidth: 20,
    crownSteps: 0,
    crownTube: 'fluted36',
    movementMounts: ['seiko-nh'],
    spacerMounts: [SPACER_NH27],
    maxMovementStack: 7.7,
    dialSeat: { min: 28.3, max: 28.7 },
    chapterRing: { requirement: 'required', seatDiameter: 28.5 },
    bezelSeat: 'fluted39',
    crystalSeat: 31.0,
    visual: tpl('case/fluted', { finish: 'polished', metal: '#d4d7db' }),
  },
  {
    type: 'case',
    id: 'cs-octagon41',
    name: 'Octagon Integrated 41',
    style: 'octagon41',
    inspiredBy: 'Integrated octagonal sports case',
    confidence: 'community',
    notes: 'Crystal seat and stack height unverified. Vendor recommends longer handsets.',
    diameter: 41,
    lugToLug: 51,
    thickness: 12.6,
    lugWidth: null,
    integratedProfile: 'octagon41',
    crownSteps: 0,
    crownTube: 'octagon41',
    movementMounts: ['seiko-nh'],
    spacerMounts: [SPACER_NH27],
    maxMovementStack: 7.8,
    dialSeat: { min: 30.8, max: 31.8 },
    chapterRing: { requirement: 'none' },
    bezelSeat: 'integral',
    crystalSeat: 32.0,
    visual: tpl('case/octagon', { finish: 'brushed', metal: '#c9ccd1' }),
  },

  // ── namokiMODS cases sold as taking SKX007 parts ───────────────────────────────────────────────
  // Outer sizes and crown position from each listing; the fittings inside are the SKX007's (skx007Fit).
  {
    ...skx007Fit,
    id: 'cs-diver42-ncg-30',
    name: 'Diver 42 No-Guard (crown 3.0)',
    inspiredBy: 'SKX007-style case without crown guards',
    notes: nmk('NMK907', 'Ø42, lug-to-lug 46.5, 10.2 thick, lugs 22, crown at 3, no crown guards; "fits all original and aftermarket SKX007 mod parts".'),
    sources: ['https://www.namokimods.com/products/nmk907-no-crown-guard-skx-watch-case-polished-finish'],
    diameter: 42,
    lugToLug: 46.5,
    thickness: 10.2,
    lugWidth: 22,
    endLinkProfile: 'diver42',
    crownSteps: 0,
    visual: tpl('case/diver', { finish: 'polished', metal: '#d4d7db', guards: 'no' }),
  },
  {
    ...skx007Fit,
    id: 'cs-angular43-30',
    name: 'Angular Diver 43 (crown 3.0)',
    inspiredBy: 'Samurai-style angular dive case',
    notes: nmk('NMK906', 'Ø43, lug-to-lug 48, 12 thick, lugs 22, crown at 3; fits all SKX007 parts. Only Samurai-style bracelets fit, not SKX end links.'),
    sources: ['https://www.namokimods.com/products/nmk906-samurai-skx-watch-case-polished-finish'],
    diameter: 43,
    lugToLug: 48,
    thickness: 12,
    lugWidth: 22,
    crownSteps: 0,
    visual: tpl('case/diver', { finish: 'brushed', metal: '#c9ccd1' }),
  },
  {
    ...skx007Fit,
    id: 'cs-mono42-30',
    name: 'Monobloc Diver 42.5 (crown 3.0)',
    inspiredBy: 'MM300-style monobloc dive case',
    notes: nmk('NMK919', 'Ø42.5, lug-to-lug 48, 11.1 thick, lugs 20, crown at 3, no crown guards; fits all SKX007 parts except the bracelet.'),
    sources: ['https://www.namokimods.com/products/nmk919-3h-mm300-skx-watch-case-polished-finish'],
    diameter: 42.5,
    lugToLug: 48,
    thickness: 11.1,
    lugWidth: 20,
    crownSteps: 0,
    visual: tpl('case/diver', { finish: 'polished', metal: '#d4d7db', guards: 'no' }),
  },
  {
    ...skx007Fit,
    id: 'cs-cushion45-38',
    name: 'Cushion Diver 45 (crown 3.8)',
    inspiredBy: 'Turtle-style cushion case',
    notes: nmk(
      'NMK956',
      'Ø45, lug-to-lug 47.5, 10.4 thick (case only), lugs 22; SKX007 crystals, bezels, inserts, crowns and chapter rings; Turtle bracelets. ' +
        'Crown at 3.8 read from the straight-on product photo.',
    ),
    sources: ['https://www.namokimods.com/products/nmk956-turtle-skx007-watch-case-polished-finish'],
    diameter: 45,
    lugToLug: 47.5,
    thickness: 10.4,
    lugWidth: 22,
    crownSteps: 2,
    visual: tpl('case/cushion', { finish: 'polished', metal: '#d4d7db' }),
  },

  // ── Lucius Atelier cases: full published tables, crystal pre-installed, SKX013-spec ring required ──────
  {
    ...luciusFit,
    id: 'cs-explorer36-slim',
    name: 'Explorer-style 36 Slim',
    inspiredBy: 'Explorer-style dress-sport case',
    notes:
      'Lucius Atelier Explorer 36mm Ultra Thin: Ø36, lug-to-lug 43, 9.96 thick, lugs 20, flat sapphire 29.5 × 1 pre-installed, smooth integral bezel, ' +
      'SKX013-spec crowns, SKX013-spec chapter ring required, 28.5 dials, NH35 / 36 / 38 / 70 / 71 / 72 (Type M only; no NH34, so the stack ' +
      'limit is set below its 7.99). Crown at 3 from the product photo.',
    sources: ['https://luciusatelier.com/products/explorer-watch-case-36mm-ultra-thin-edition'],
    diameter: 36,
    lugToLug: 43,
    thickness: 9.96,
    lugWidth: 20,
    maxMovementStack: 7.7,
    crystalSeat: 29.5,
    visual: tpl('case/fluted', { finish: 'brushed', metal: '#d4d7db', bezel: 'smooth' }),
  },
  {
    ...luciusFit,
    id: 'cs-pilot34-slim',
    name: 'Pilot-style 34 Slim',
    inspiredBy: 'Small pilot case',
    notes:
      'Lucius Atelier Pilot 34mm Ultra Thin: Ø34, lug-to-lug 43, 10.96 thick, lugs 20, double-domed sapphire 29.5 × 1 × 1.8 pre-installed, ' +
      'SKX-style crowns, SKX013-spec chapter ring required, 28.5 dials, NH34 / 35 / 36 / 38 / 70 / 71 / 72 (Type M). Crown at 3 from the product photo.',
    sources: ['https://luciusatelier.com/products/pilot-watch-case-34mm-ultra-thin-edition'],
    diameter: 34,
    lugToLug: 43,
    thickness: 10.96,
    lugWidth: 20,
    crystalSeat: 29.5,
    visual: tpl('case/fluted', { finish: 'brushed', metal: '#c9ccd1', bezel: 'smooth' }),
  },
  {
    ...luciusFit,
    id: 'cs-fluted36-slim',
    name: 'Fluted Dress 36 Slim',
    inspiredBy: 'Fluted-bezel dress case',
    notes:
      'Lucius Atelier 1908 36mm Ultra Thin: Ø36, lug-to-lug 43, 10.75 thick, lugs 20, fluted domed integral bezel, double-domed sapphire 28.6 × 1 × 1.75 ' +
      'pre-installed, SKX-style crowns, SKX013-spec chapter ring required, 28.5 dials, NH34 / 35 / 36 / 38 / 70 / 71 / 72 (Type M). Crown at 3 from the product photo.',
    sources: ['https://luciusatelier.com/products/1908-watch-case-36mm-ultra-thin-edition-nh34-ready'],
    diameter: 36,
    lugToLug: 43,
    thickness: 10.75,
    lugWidth: 20,
    crystalSeat: 28.6,
    visual: tpl('case/fluted', { finish: 'polished', metal: '#d4d7db', bezel: 'fluted' }),
  },
  {
    ...luciusFit,
    id: 'cs-faceted39',
    name: 'Faceted Dress 39',
    inspiredBy: 'Faceted dress case',
    notes:
      'Lucius Atelier GS 39mm v2: Ø39, lug-to-lug 46, 12.8 thick, lugs 20, double-domed sapphire 29.5 × 1.5 × 3 pre-installed, SKX013 chapter ring ' +
      'required, 28.5 dials, NH34 / 35 / 36 / 38 / 72 and ETA 2824 / SW200. Crown options are the SKX013 coin-edge and knurled crowns. ' +
      'Crown at 3 from the product photo.',
    sources: ['https://luciusatelier.com/products/gs-watch-case-39mm-v2-nh34-ready'],
    diameter: 39,
    lugToLug: 46,
    thickness: 12.8,
    lugWidth: 20,
    movementMounts: ['seiko-nh', 'eta-25.6'],
    crystalSeat: 29.5,
    visual: tpl('case/fluted', { finish: 'polished', metal: '#d4d7db', bezel: 'smooth' }),
  },
];
