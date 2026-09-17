import type { Build, ModFlag, PartRef, Slot } from '../domain/schemas';
import type { SampleBuild } from './sampleBuilds';

const now = () => new Date().toISOString();

export function newBuild(name = 'Untitled build', slots: Build['slots'] = {}, flags: ModFlag[] = []): Build {
  const t = now();
  return { id: crypto.randomUUID(), name, createdAt: t, updatedAt: t, slots, flags };
}

/** Engine input for a sample build (core part ids). */
export function sampleSlots(sample: SampleBuild): Build['slots'] {
  return Object.fromEntries(
    Object.entries(sample.slots).map(([slot, partId]) => [slot, { packId: 'core', partId } satisfies PartRef]),
  ) as Partial<Record<Slot, PartRef>>;
}

export const buildFromSample = (sample: SampleBuild): Build => newBuild(sample.name, sampleSlots(sample), [...(sample.flags ?? [])]);

export function duplicateBuild(build: Build): Build {
  const copy = newBuild(copyName(build.name), structuredClone(build.slots), [...build.flags]);
  return build.notes ? { ...copy, notes: build.notes } : copy;
}

function copyName(name: string): string {
  const next = `${name} (copy)`;
  return next.length <= 80 ? next : `${name.slice(0, 73)} (copy)`;
}
