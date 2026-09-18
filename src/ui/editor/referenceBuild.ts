import type { Catalog } from '../../data/catalog';
import { candidatesFor, evaluate, requiredSlots, resolveParts, type BuildReport, type ResolvedParts } from '../../domain/rules';
import type { Part, PartOf, PartRef, PartType, Slot } from '../../domain/schemas';
import { sortCandidates } from '../builder/useCandidates';
import { SLOT_ORDER } from '../labels';

/** The part being edited, which is not in any pack yet. */
export const DRAFT_REF: PartRef = { packId: 'draft', partId: 'draft' };

const sameRef = (a: PartRef, b: PartRef) => a.packId === b.packId && a.partId === b.partId;

/** A catalog with one extra part: the draft, so the rules engine can see it before it is saved. */
export class DraftCatalog {
  constructor(
    private readonly catalog: Catalog,
    private readonly draft: Part,
    /** The saved part the draft replaces, hidden so the editor does not offer both. */
    private readonly replaces?: PartRef,
  ) {}

  get(ref: PartRef): Part | undefined {
    if (sameRef(ref, DRAFT_REF)) return this.draft;
    return this.catalog.get(ref);
  }

  list<T extends Slot>(type: T): { ref: PartRef; part: PartOf<T> }[] {
    const rest = this.catalog.list(type).filter(({ ref }) => !(this.replaces && sameRef(ref, this.replaces)));
    if (this.draft.type !== type) return rest;
    return [{ ref: DRAFT_REF, part: this.draft as PartOf<T> }, ...rest];
  }
}

export interface ReferencePreview {
  slots: Partial<Record<Slot, PartRef>>;
  parts: ResolvedParts;
  report: BuildReport;
  /** Slots no compatible part could be found for. */
  unfilled: Slot[];
}

/**
 * Build the simplest watch that shows the edited part in context: every other required
 * slot filled with the first part that fits, so the findings on screen are about this
 * part rather than about an empty build.
 *
 * Slots are filled in assembly order because each choice narrows the next (the case
 * decides which dials fit, the bezel decides whether an insert is needed at all).
 *
 * `keep` pins the parts already on screen. Without it the preview would quietly swap in
 * a case that still fits after every keystroke, hiding the very problem being introduced;
 * pinned, widening a dial past its case shows up as the error it is.
 */
export function referenceBuild(draft: Part, catalog: Catalog, replaces?: PartRef, keep: Partial<Record<Slot, PartRef>> = {}): ReferencePreview {
  const source = new DraftCatalog(catalog, draft, replaces);
  const slots: Partial<Record<Slot, PartRef>> = { [draft.type]: DRAFT_REF };
  const unfilled: Slot[] = [];

  // Pinned parts come first, but only while they still exist and still belong in a slot.
  for (const [slot, ref] of Object.entries(keep) as [Slot, PartRef][]) {
    if (slot === draft.type || !ref) continue;
    const part = source.get(ref);
    if (part?.type === slot) slots[slot] = ref;
  }

  for (const slot of SLOT_ORDER) {
    if (slots[slot]) continue;
    const { parts } = resolveParts({ slots, flags: [] }, source);
    if (!requiredSlots(parts).includes(slot)) continue;
    const best = sortCandidates(candidatesFor(slot, { slots, flags: [] }, source)).find((c) => c.compatibility !== 'incompatible');
    if (best) slots[slot] = best.ref;
    else unfilled.push(slot);
  }

  const build = { slots, flags: [] };
  return { slots, parts: resolveParts(build, source).parts, report: evaluate(build, source), unfilled };
}

/** The parts around the draft, ready to pin into the next preview. */
export function companionsOf(preview: ReferencePreview, type: PartType): Partial<Record<Slot, PartRef>> {
  const companions = { ...preview.slots };
  delete companions[type];
  return companions;
}

/** How many parts of each type the draft could sit in a valid build with. */
export function countCompatible(draft: Part, catalog: Catalog, against: PartType): number {
  const source = new DraftCatalog(catalog, draft);
  const slots = { [draft.type]: DRAFT_REF } as Partial<Record<Slot, PartRef>>;
  return candidatesFor(against, { slots, flags: [] }, source).filter((c) => c.compatibility !== 'incompatible').length;
}
