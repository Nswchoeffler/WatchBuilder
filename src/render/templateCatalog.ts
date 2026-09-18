import type { PartType } from '../domain/schemas';
import { bezelTemplates, crownTemplates } from './templates/bezel';
import { caseTemplates } from './templates/case';
import { dialTemplates } from './templates/dial';
import { handsTemplates } from './templates/hands';
import { strapDrawers } from './templates/strap';

/**
 * What each drawing template offers the part editor: its name and the settings it reads.
 * The registries above stay the source of truth for what can be drawn; this adds the
 * labels and defaults a form needs. A test keeps the two in step.
 */
export type ParamSpec =
  | { key: string; label: string; kind: 'color'; fallback: string; nullable?: boolean; hint?: string }
  | { key: string; label: string; kind: 'choice'; choices: readonly string[]; fallback: string }
  | { key: string; label: string; kind: 'lines'; hint?: string };

export interface TemplateInfo {
  id: string;
  label: string;
  params: readonly ParamSpec[];
}

const color = (key: string, label: string, fallback: string, extra: { nullable?: boolean; hint?: string } = {}): ParamSpec => ({
  key,
  label,
  kind: 'color',
  fallback,
  ...extra,
});

const METAL_FINISH: ParamSpec = { key: 'finish', label: 'Finish', kind: 'choice', choices: ['brushed', 'polished', 'matte'], fallback: 'brushed' };
const INSERT_FINISH: ParamSpec = { key: 'finish', label: 'Material', kind: 'choice', choices: ['aluminium', 'ceramic'], fallback: 'aluminium' };

const metal = (fallback: string): ParamSpec[] => [color('metal', 'Metal', fallback)];

const DIAL_PARAMS: ParamSpec[] = [
  color('color', 'Dial colour', '#141518'),
  { key: 'finish', label: 'Finish', kind: 'choice', choices: ['matte', 'gloss', 'sunburst', 'tapisserie'], fallback: 'matte' },
  { key: 'markers', label: 'Markers', kind: 'choice', choices: ['dots-bars', 'mercedes-classic', 'batons', 'roman', 'arabic'], fallback: 'dots-bars' },
  color('lume', 'Lume', '#e8f0d8', { nullable: true }),
  color('metal', 'Marker metal', '#dcdde0'),
  color('ink', 'Text & marker ink', '#f2f2ef', { hint: 'Leave blank to pick automatically from the dial colour.' }),
  color('dateWheel', 'Date wheel', '#f4f3ef'),
  { key: 'text', label: 'Dial text', kind: 'lines', hint: 'One line per row, up to four.' },
];

const HAND_PARAMS: ParamSpec[] = [
  color('metal', 'Metal', '#e6e7e9'),
  color('lume', 'Lume', '#e8f0d8', { nullable: true }),
  color('accent', 'Accent', '#e6e7e9', { hint: 'Seconds hand or GMT tip.' }),
];

const label = (id: string) =>
  id
    .split('/')[1]!
    .replace(/-/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

const info = (id: string, params: readonly ParamSpec[]): TemplateInfo => ({ id, label: label(id), params });

/** Templates offered per part type, in the order they appear in the editor. */
export const TEMPLATE_CATALOG: Record<PartType, readonly TemplateInfo[]> = {
  // Movements sit under the dial and are never drawn; the name is kept so a part can say what it is.
  movement: ['movement/nh', 'movement/miyota', 'movement/eta', 'movement/vh'].map((id) => info(id, [])),
  case: Object.keys(caseTemplates).map((id) => info(id, [...metal('#c9ccd1'), METAL_FINISH])),
  dial: Object.keys(dialTemplates).map((id) => info(id, DIAL_PARAMS)),
  hands: Object.keys(handsTemplates).map((id) => info(id, HAND_PARAMS)),
  chapterRing: [
    info('chapterRing/minutes', [color('color', 'Ring colour', '#c9ccd1'), color('marks', 'Markings', '#141518')]),
    info('chapterRing/plain', [color('color', 'Ring colour', '#d4d7db')]),
  ],
  bezel: Object.keys(bezelTemplates).map((id) => info(id, metal(id === 'bezel/fluted' ? '#e1e3e6' : '#c9ccd1'))),
  bezelInsert: [
    info('bezelInsert/dive', [
      color('primary', 'Insert colour', '#141518'),
      color('secondary', 'Markings', '#e6e7e9'),
      color('lume', 'Pip lume', '#e8f0d8', { nullable: true }),
      INSERT_FINISH,
    ]),
    info('bezelInsert/gmt', [
      color('primary', 'Day half', '#b3262b'),
      color('secondary', 'Night half', '#1d3a78'),
      color('accent', 'Numerals', '#e6e7e9'),
      INSERT_FINISH,
    ]),
  ],
  crystal: [info('crystal/flat', []), info('crystal/dome', [])],
  crown: Object.keys(crownTemplates).map((id) => info(id, metal(id === 'crown/fluted' ? '#e1e3e6' : '#c9ccd1'))),
  strap: Object.keys(strapDrawers).map((id) =>
    info(id, id === 'strap/nato' || id === 'strap/rubber' || id === 'strap/leather' || id === 'strap/tropic'
      ? [color('primary', 'Strap colour', '#1b1c1e')]
      : metal('#c9ccd1')),
  ),
};

/** Part types the renderer draws from a template registry (movement and crystal are drawn from their measurements). */
export const templatesFor = (type: PartType): readonly TemplateInfo[] => TEMPLATE_CATALOG[type];

export const templateInfo = (type: PartType, id: string): TemplateInfo | undefined =>
  TEMPLATE_CATALOG[type].find((t) => t.id === id);
