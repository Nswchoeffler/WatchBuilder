import type { Pack, Part, PartOf, PartRef, PartType } from '../domain/schemas';
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
  readonly packs: readonly Pack[];

  constructor(packs: readonly Pack[]) {
    this.packs = packs;
    for (const pack of packs) {
      for (const part of pack.parts) this.byKey.set(refKey({ packId: pack.id, partId: part.id }), part);
    }
  }

  get(ref: PartRef): Part | undefined {
    return this.byKey.get(refKey(ref));
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
