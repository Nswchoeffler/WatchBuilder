import type { Pack, Part, PartOf, PartRef, PartType, Slot } from '../domain/schemas';
import { validatePack } from './packs';
import { corePackInput } from './seed';

let corePack: Pack | undefined;

/** Validated built-in pack (cached). Throws PackError if seed data is invalid. */
export function loadCorePack(): Pack {
  corePack ??= validatePack(corePackInput);
  return corePack;
}

/** In-memory lookup over a set of packs. Later packs do not override earlier ones: refs are pack-scoped. */
export class Catalog {
  private readonly byKey = new Map<string, Part>();
  private readonly byPackId = new Map<string, Pack>();
  readonly packs: readonly Pack[];

  constructor(packs: readonly Pack[]) {
    this.packs = packs;
    for (const pack of packs) {
      this.byPackId.set(pack.id, pack);
      for (const part of pack.parts) this.byKey.set(refKey({ packId: pack.id, partId: part.id }), part);
    }
  }

  get(ref: PartRef): Part | undefined {
    return this.byKey.get(refKey(ref));
  }

  /**
   * Sanitized markup for a part drawn from an upload, or undefined when it draws from a template.
   * Assets are pack-scoped, so the asset is looked up in the pack the ref names.
   */
  assetFor(ref: PartRef): string | undefined {
    const part = this.get(ref);
    if (part?.visual.kind !== 'svg') return undefined;
    return this.byPackId.get(ref.packId)?.assets[part.visual.assetId]?.data;
  }

  /** Art by slot for a build's parts, ready to hand to `WatchSvg`. Slots that draw from a template are absent. */
  artFor(slots: Partial<Record<Slot, PartRef>>): Partial<Record<Slot, string>> {
    const art: Partial<Record<Slot, string>> = {};
    for (const [slot, ref] of Object.entries(slots) as [Slot, PartRef][]) {
      const markup = this.assetFor(ref);
      if (markup) art[slot] = markup;
    }
    return art;
  }

  /** All parts of a type, with the ref needed to put them in a build. */
  list<T extends PartType>(type: T): { ref: PartRef; part: PartOf<T> }[] {
    return this.packs.flatMap((pack) =>
      pack.parts
        .filter((p): p is PartOf<T> => p.type === type)
        .map((part) => ({ ref: { packId: pack.id, partId: part.id }, part })),
    );
  }
}

export const refKey = (ref: PartRef): string => `${ref.packId}/${ref.partId}`;
