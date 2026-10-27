import { ModFlag, PART_TYPES, type Confidence, type Part, type PartRef, type PartType, type Slot } from '../domain/schemas';
import { evaluate, requiredSlots, RULES, type PartSource, type ResolvedParts, type Rule } from '../domain/rules';

/**
 * Catalog health: which parts rest on unverified measurements, and which can't take part in any valid build.
 * Run with `npm run catalog:report`.
 */

export type Slots = Partial<Record<Slot, PartRef>>;

/** Case first: nearly every rule involves it, so it prunes the search earliest. */
const SEARCH_ORDER: readonly Slot[] = ['case', 'movement', 'dial', 'chapterRing', 'hands', 'bezel', 'bezelInsert', 'crystal', 'crown', 'strap'];
const ALL_FLAGS = ModFlag.options;

/**
 * Core cases their vendor sells for one modification, so their valid builds are counted with it.
 * The NMK948 Miyota case: namokiMODS sells no Miyota dials and says to fit its Seiko dials with dial dots.
 */
export const MOD_BUILD_CASES: Readonly<Record<string, readonly ModFlag[]>> = {
  'cs-diver42-miyota': ['dial-dots'],
};

export interface SearchOptions {
  /** Accept errors that any modification flag downgrades (the build is then evaluated with every flag set). */
  allowMods?: boolean;
  /** Accept errors that one of these flags downgrades (the build is then evaluated with them set). Overrides `allowMods`. */
  mods?: readonly ModFlag[];
  /** Stop after this many builds. */
  limit?: number;
}

/**
 * Complete builds containing every part in `fixed` whose status is `valid` or `warnings`.
 * Depth-first over the slots; a rule runs as soon as every slot it reads has been decided
 * (filled, or left empty because the parts chosen so far don't require it), and an error prunes the branch.
 */
export function findBuilds(source: PartSource, fixed: Slots, { allowMods = false, mods, limit = 1 }: SearchOptions = {}): Slots[] {
  const flags = mods ?? (allowMods ? ALL_FLAGS : []);
  // Fixed parts first, so a part that fits nothing fails at once instead of after a full search.
  const order = [...SEARCH_ORDER].sort((a, b) => Number(!fixed[a]) - Number(!fixed[b]));
  const options = new Map<Slot, { ref: PartRef; part: Part }[]>();
  for (const slot of order) {
    const ref = fixed[slot];
    const part = ref && source.get(ref);
    options.set(slot, ref ? (part && part.type === slot ? [{ ref, part }] : []) : source.list(slot));
  }

  const found: Slots[] = [];
  const slots: Slots = {};
  const parts: Record<string, Part> = {};
  const decided = new Set<Slot>();

  const blocked = (rule: Rule): boolean => {
    if (!rule.requires.every((s) => parts[s])) return false;
    return rule.check(parts as ResolvedParts).some((f) => f.severity === 'error' && !(f.fix && flags.includes(f.fix)));
  };

  const visit = (depth: number): void => {
    if (found.length >= limit) return;
    if (depth === order.length) {
      const report = evaluate({ slots, flags: [...flags] }, source);
      if (report.status === 'valid' || report.status === 'warnings') found.push({ ...slots });
      return;
    }
    const slot = order[depth]!;
    decided.add(slot);
    // Rules that become checkable once this slot is decided.
    const ready = RULES.filter((r) => r.slots.includes(slot) && r.slots.every((s) => decided.has(s)));
    for (const { ref, part } of options.get(slot)!) {
      slots[slot] = ref;
      parts[slot] = part;
      if (!ready.some(blocked)) visit(depth + 1);
      delete slots[slot];
      delete parts[slot];
      if (found.length >= limit) break;
    }
    // Leave the slot empty when nothing chosen so far requires it. Requirements only depend on
    // case and bezel, which come earlier in the order unless they are fixed (and so never empty).
    if (!fixed[slot] && !requiredSlots(parts as ResolvedParts).includes(slot) && !ready.some(blocked)) visit(depth + 1);
    decided.delete(slot);
  };

  visit(0);
  return found;
}

export interface PartHealth {
  ref: PartRef;
  part: Part;
  /** An example valid build without mods, if there is one. */
  strict: Slots | null;
  /** An example valid build when mods are allowed (only searched when there's no strict one). */
  withMods: Slots | null;
}

export interface CatalogReport {
  packId: string;
  byType: Record<PartType, Record<Confidence, number>>;
  parts: PartHealth[];
  /** Valid builds per case, counted up to `caseBuildLimit`: no mods, except the case's own `MOD_BUILD_CASES` entry. */
  caseBuilds: { ref: PartRef; part: Part; count: number; mods: readonly ModFlag[] }[];
  caseBuildLimit: number;
}

export function catalogReport(source: PartSource, packId: string, caseBuildLimit = 1000): CatalogReport {
  const byType = Object.fromEntries(
    PART_TYPES.map((t) => [t, { verified: 0, community: 0, unverified: 0 }]),
  ) as CatalogReport['byType'];
  const parts: PartHealth[] = [];
  for (const type of PART_TYPES) {
    for (const { ref, part } of source.list(type)) {
      if (ref.packId !== packId) continue;
      byType[type][part.confidence]++;
      const fixed = { [type]: ref };
      const strict = findBuilds(source, fixed)[0] ?? null;
      const withMods = strict ? null : (findBuilds(source, fixed, { allowMods: true })[0] ?? null);
      parts.push({ ref, part, strict, withMods });
    }
  }
  const caseBuilds = source
    .list('case')
    .filter(({ ref }) => ref.packId === packId)
    .map(({ ref, part }) => {
      const mods = (packId === 'core' && MOD_BUILD_CASES[ref.partId]) || [];
      return { ref, part, mods, count: findBuilds(source, { case: ref }, { mods, limit: caseBuildLimit }).length };
    });
  return { packId, byType, parts, caseBuilds, caseBuildLimit };
}

const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');

/** The report as Markdown. */
export function formatReport(report: CatalogReport): string {
  const out: string[] = [];
  const total = report.parts.length;
  const count = (c: Confidence) => report.parts.filter((p) => p.part.confidence === c).length;
  const unverified = report.parts.filter((p) => p.part.confidence === 'unverified');
  const noReason = unverified.filter((p) => !p.part.notes?.trim());
  const orphans = report.parts.filter((p) => !p.strict && !p.withMods);
  const modsOnly = report.parts.filter((p) => !p.strict && p.withMods);
  const thinCases = report.caseBuilds.filter((c) => c.count < 2);

  out.push(`# Catalog report: \`${report.packId}\``, '');
  out.push(`${total} parts: ${count('verified')} verified, ${count('community')} community, ${count('unverified')} unverified.`, '');
  out.push('## Problems', '');
  out.push(`- Unverified parts with no reason in their notes: **${noReason.length}**`);
  out.push(`- Parts that can't form any valid build: **${orphans.length}**`);
  out.push(`- Parts that only form a valid build with a mod: **${modsOnly.length}**`);
  out.push(`- Cases with fewer than two valid builds: **${thinCases.length}**`, '');

  out.push('## Confidence by type', '', '| Type | Verified | Community | Unverified |', '|---|---:|---:|---:|');
  for (const type of PART_TYPES) {
    const c = report.byType[type];
    out.push(`| ${type} | ${c.verified} | ${c.community} | ${c.unverified} |`);
  }
  out.push('');

  out.push('## Unverified parts', '');
  if (!unverified.length) out.push('None.');
  else {
    out.push('| Part | Type | Reason (from notes) |', '|---|---|---|');
    for (const p of unverified) out.push(`| \`${p.ref.partId}\` ${cell(p.part.name)} | ${p.part.type} | ${p.part.notes?.trim() ? cell(p.part.notes) : '**no reason given**'} |`);
  }
  out.push('');

  out.push("## Parts that can't form a valid build", '');
  if (!orphans.length && !modsOnly.length) out.push('None: every part appears in at least one valid build without mods.');
  for (const p of orphans) out.push(`- \`${p.ref.partId}\` ${p.part.name} (${p.part.type}): no valid build, even with mods.`);
  for (const p of modsOnly) {
    const example = Object.values(p.withMods!).map((r) => r.partId).join(', ');
    out.push(`- \`${p.ref.partId}\` ${p.part.name} (${p.part.type}): only with a mod, e.g. ${example}.`);
  }
  out.push('');

  out.push('## Valid builds per case (no mods unless noted)', '', '| Case | Valid builds |', '|---|---:|');
  for (const c of report.caseBuilds) {
    const n = c.count >= report.caseBuildLimit ? `${report.caseBuildLimit}+` : String(c.count);
    const withMods = c.mods.length ? ` (with ${c.mods.join(', ')})` : '';
    out.push(`| \`${c.ref.partId}\` ${cell(c.part.name)}${withMods} | ${c.count < 2 ? `**${n}**` : n} |`);
  }
  out.push('');
  return out.join('\n');
}
