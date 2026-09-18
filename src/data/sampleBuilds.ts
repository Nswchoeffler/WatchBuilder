import type { ModFlag, Slot } from '../domain/schemas';

export interface SampleBuild {
  id: string;
  name: string;
  /** Core part ids by slot. */
  slots: Partial<Record<Slot, string>>;
  flags?: ModFlag[];
}

/** Complete, valid builds that exercise every template. Used by the gallery, previews and render tests. */
export const SAMPLE_BUILDS: SampleBuild[] = [
  {
    id: 'diver-classic',
    name: 'Diver 42 Classic',
    slots: {
      case: 'cs-diver42-38', movement: 'mv-nh35', dial: 'dl-diver-black', hands: 'hd-nh-mercedes', bezel: 'bz-diver42-sloped',
      bezelInsert: 'in-diver42-dive-black', chapterRing: 'cr-diver42-silver', crystal: 'cy-diver42-dd', crown: 'cw-diver42',
      strap: 'st-oyster-22-diver42',
    },
  },
  {
    id: 'diver-daydate-blue',
    name: 'Diver 42 Day-Date Blue',
    slots: {
      case: 'cs-diver42-38', movement: 'mv-nh36', dial: 'dl-diver-daydate', hands: 'hd-nh-sword', bezel: 'bz-diver42-sloped',
      bezelInsert: 'in-diver42-dive-blue', chapterRing: 'cr-diver42-black', crystal: 'cy-diver42-flat', crown: 'cw-diver42',
      strap: 'st-jubilee-22',
    },
    flags: ['day-wheel-swap'],
  },
  {
    id: 'sub-gmt',
    name: 'Sub-style 40 GMT',
    slots: {
      case: 'cs-sub40', movement: 'mv-nh34', dial: 'dl-gmt-black', hands: 'hd-nh34-gmt', bezel: 'bz-sub40',
      bezelInsert: 'in-sub40-gmt-black-blue', crystal: 'cy-sub40-magnifier', crown: 'cw-sub40', strap: 'st-oyster-20',
    },
  },
  {
    id: 'fluted-sunburst',
    name: 'Fluted Classic 36 Sunburst',
    slots: {
      case: 'cs-fluted36', movement: 'mv-nh35', dial: 'dl-sunburst-blue', hands: 'hd-nh-sword', bezel: 'bz-fluted36',
      chapterRing: 'cr-mid-thin-silver', crystal: 'cy-fluted36-flat', crown: 'cw-fluted36', strap: 'st-jubilee-20',
    },
  },
  {
    id: 'octagon-tapisserie',
    name: 'Octagon Integrated 41',
    slots: {
      case: 'cs-octagon41', movement: 'mv-nh35', dial: 'dl-tapisserie-blue', hands: 'hd-nh-sword', crystal: 'cy-octagon41-flat',
      crown: 'cw-octagon41', strap: 'st-octagon41-bracelet',
    },
  },
  {
    id: 'openheart-oyster',
    name: 'Fluted 36 Open Heart',
    slots: {
      case: 'cs-fluted36', movement: 'mv-nh38', dial: 'dl-openheart-silver', hands: 'hd-nh-sword', bezel: 'bz-fluted36',
      chapterRing: 'cr-mid-silver', crystal: 'cy-fluted36-flat', crown: 'cw-fluted36', strap: 'st-oyster-20',
    },
  },
  {
    id: 'diver-pepsi-nato',
    name: 'Diver 42 GMT-insert on NATO',
    slots: {
      case: 'cs-diver42-30', movement: 'mv-nh35', dial: 'dl-sub-black', hands: 'hd-nh-mercedes', bezel: 'bz-diver42-flat',
      bezelInsert: 'in-diver42-gmt-pepsi', chapterRing: 'cr-diver42-silver', crystal: 'cy-diver42-flat', crown: 'cw-diver42',
      strap: 'st-nato-22-black',
    },
  },
  {
    id: 'explorer-snowflake',
    name: 'Explorer 3-6-9 on Waffle',
    slots: {
      case: 'cs-diver42-38', movement: 'mv-nh35', dial: 'dl-explorer-black', hands: 'hd-nh-snowflake', bezel: 'bz-diver42-smooth',
      chapterRing: 'cr-diver42-plain-black', crystal: 'cy-diver42-single-dome', crown: 'cw-diver42-signed',
      strap: 'st-waffle-22-black',
    },
  },
  {
    id: 'pilot-tachymeter',
    name: 'Pilot Type B, Tachymeter',
    slots: {
      case: 'cs-diver42-38', movement: 'mv-nh38', dial: 'dl-pilot-black', hands: 'hd-nh-cathedral', bezel: 'bz-diver42-flat',
      bezelInsert: 'in-diver42-tachy-silver', chapterRing: 'cr-diver42-blue', crystal: 'cy-diver42-flat', crown: 'cw-diver42-gold',
      strap: 'st-leather-22-black',
    },
  },
  {
    id: 'fume-sector',
    name: 'Fumé Blue on Mesh',
    slots: {
      case: 'cs-fluted36', movement: 'mv-nh35', dial: 'dl-fume-blue', hands: 'hd-nh-syringe', bezel: 'bz-fluted36',
      chapterRing: 'cr-mid-thin-silver', crystal: 'cy-fluted36-flat', crown: 'cw-fluted36', strap: 'st-mesh-20',
    },
  },
  {
    id: 'california-compass',
    name: 'California Dial, Compass Bezel',
    slots: {
      case: 'cs-diver42-30', movement: 'mv-nh38', dial: 'dl-california-black', hands: 'hd-nh-plongeur', bezel: 'bz-diver42-sloped',
      bezelInsert: 'in-diver42-compass-black', chapterRing: 'cr-diver42-silver', crystal: 'cy-diver42-dd', crown: 'cw-diver42',
      strap: 'st-tropic-22-black',
    },
  },
];
