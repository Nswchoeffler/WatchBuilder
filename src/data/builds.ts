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

/** Builds with at least one slot drawing from `packId` (and, when given, that one part). */
export const buildsUsing = (builds: readonly Build[], packId: string, partId?: string): Build[] =>
  builds.filter((b) => Object.values(b.slots).some((ref) => ref.packId === packId && (partId === undefined || ref.partId === partId)));

/** "1 build" / "3 builds". */
export const countBuilds = (n: number): string => `${n} ${n === 1 ? 'build' : 'builds'}`;

function copyName(name: string): string {
  const next = `${name} (copy)`;
  return next.length <= 80 ? next : `${name.slice(0, 73)} (copy)`;
}
