import { Catalog, loadCorePack } from '../../data/catalog';
import { validatePack } from '../../data/packs';
import type { ModFlag, Part, Slot } from '../schemas';
import type { BuildInput } from './evaluate';
import type { BuildReport, Severity } from './index';

export const core = loadCorePack();
export const coreCatalog = new Catalog([core]);

/** Build from core part ids, e.g. `build({ case: 'cs-diver42-38', dial: 'dl-diver-black' })`. */
export function build(slots: Partial<Record<Slot, string>>, flags: ModFlag[] = [], packId = 'core'): BuildInput {
  return {
    slots: Object.fromEntries(Object.entries(slots).map(([slot, partId]) => [slot, { packId, partId }])),
    flags,
  };
}

/** Rule ids at a given severity, sorted and de-duplicated. */
export const ids = (report: Pick<BuildReport, 'results'>, severity: Severity): string[] =>
  [...new Set(report.results.filter((r) => r.severity === severity).map((r) => r.ruleId))].sort();

export function corePart<T extends Part['type']>(id: string, type: T): Extract<Part, { type: T }> {
  const part = core.parts.find((p) => p.id === id);
  if (!part || part.type !== type) throw new Error(`no core ${type} "${id}"`);
  return part as Extract<Part, { type: T }>;
}

/** Catalog of core + a "test" pack built from modified copies of core parts. */
export function catalogWith(parts: Part[]): Catalog {
  const pack = validatePack({ ...core, id: 'test', name: 'Test', version: '0.0.1', parts });
  return new Catalog([core, pack]);
}

/** Mix refs from core and the test pack: ids prefixed with `test:` come from the test pack. */
export function mixedBuild(slots: Partial<Record<Slot, string>>, flags: ModFlag[] = []): BuildInput {
  return {
    slots: Object.fromEntries(
      Object.entries(slots).map(([slot, id]) =>
        id.startsWith('test:') ? [slot, { packId: 'test', partId: id.slice(5) }] : [slot, { packId: 'core', partId: id }],
      ),
    ),
    flags,
  };
}
