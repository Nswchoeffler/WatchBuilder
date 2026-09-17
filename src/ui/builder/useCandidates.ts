import { useMemo } from 'react';
import type { Catalog } from '../../data/catalog';
import { candidatesFor, type Candidate, type Compatibility } from '../../domain/rules';
import type { Build, Slot } from '../../domain/schemas';

const ORDER: Record<Compatibility, number> = { compatible: 0, warnings: 1, incompatible: 2 };

/** Candidates for a slot, sorted compatible → warnings → incompatible, then by name. */
export function sortCandidates<T extends Slot>(candidates: Candidate<T>[]): Candidate<T>[] {
  return [...candidates].sort(
    (a, b) => ORDER[a.compatibility] - ORDER[b.compatibility] || a.part.name.localeCompare(b.part.name),
  );
}

export function useCandidates(slot: Slot, build: Pick<Build, 'slots' | 'flags'>, catalog: Catalog) {
  const { slots, flags } = build;
  return useMemo(() => sortCandidates(candidatesFor(slot, { slots, flags }, catalog)), [slot, slots, flags, catalog]);
}
