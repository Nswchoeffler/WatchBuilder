import { describe, expect, it } from 'vitest';
import { loadCorePack } from '../data/catalog';
import { PART_TYPES, type PartType } from '../domain/schemas';
import { TEMPLATE_CATALOG, templateInfo } from './templateCatalog';
import { bezelTemplates, chapterRingTemplates, crownTemplates, insertTemplates } from './templates/bezel';
import { caseTemplates } from './templates/case';
import { dialTemplates } from './templates/dial';
import { handsTemplates } from './templates/hands';
import { strapDrawers } from './templates/strap';

/** Types whose drawing comes from a registry; movement and crystal are drawn from measurements. */
const REGISTRIES: Partial<Record<PartType, Record<string, unknown>>> = {
  case: caseTemplates,
  bezel: bezelTemplates,
  bezelInsert: insertTemplates,
  chapterRing: chapterRingTemplates,
  crown: crownTemplates,
  dial: dialTemplates,
  hands: handsTemplates,
  strap: strapDrawers,
};

describe('template catalog', () => {
  it('offers a template for every part type', () => {
    for (const type of PART_TYPES) expect(TEMPLATE_CATALOG[type].length).toBeGreaterThan(0);
  });

  it.each(Object.entries(REGISTRIES))('%s offers exactly the templates the renderer can draw', (type, registry) => {
    const offered = TEMPLATE_CATALOG[type as PartType].map((t) => t.id).sort();
    expect(offered).toEqual(Object.keys(registry!).sort());
  });

  it('offers every template the core catalog already uses', () => {
    for (const part of loadCorePack().parts) {
      if (part.visual.kind !== 'template') continue;
      expect(templateInfo(part.type, part.visual.template), `${part.id} uses ${part.visual.template}`).toBeDefined();
    }
  });

  it('gives every setting a label and a usable default', () => {
    for (const type of PART_TYPES) {
      for (const tpl of TEMPLATE_CATALOG[type]) {
        for (const param of tpl.params) {
          expect(param.label).toBeTruthy();
          if (param.kind === 'color') expect(param.fallback).toMatch(/^#[0-9a-f]{6}$/i);
          if (param.kind === 'choice') expect(param.choices).toContain(param.fallback);
        }
      }
    }
  });
});
