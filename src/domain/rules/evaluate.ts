import { REQUIRED_SLOTS, type Build, type ModFlag, type Part, type PartOf, type PartRef, type Slot } from '../schemas';
import { RULES } from './registry';
import type { Finding, PartLookup, PartSource, ResolvedParts, Rule, RuleResult, Severity } from './types';

export type BuildStatus = 'invalid' | 'incomplete' | 'warnings' | 'valid';

export interface UnresolvedRef {
  slot: Slot;
  ref: PartRef;
  reason: 'missing' | 'wrong-type';
}

export interface BuildReport {
  status: BuildStatus;
  /** Sorted: errors, then warnings, then info. */
  results: RuleResult[];
  /** Required slots that are still empty (depends on the parts chosen, e.g. a bezel for non-integral cases). */
  missingSlots: Slot[];
  unresolved: UnresolvedRef[];
  /** Flags set on the build that no finding needed. */
  unusedFlags: ModFlag[];
}

/** Minimal build shape the engine needs. */
export type BuildInput = Pick<Build, 'slots' | 'flags'>;

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
const DOWNGRADE: Record<Severity, Severity> = { error: 'warning', warning: 'info', info: 'info' };

export function resolveParts(build: BuildInput, lookup: PartLookup): { parts: ResolvedParts; unresolved: UnresolvedRef[] } {
  const parts: Record<string, Part> = {};
  const unresolved: UnresolvedRef[] = [];
  for (const [slot, ref] of Object.entries(build.slots) as [Slot, PartRef | undefined][]) {
    if (!ref) continue;
    const part = lookup.get(ref);
    if (!part) unresolved.push({ slot, ref, reason: 'missing' });
    else if (part.type !== slot) unresolved.push({ slot, ref, reason: 'wrong-type' });
    else parts[slot] = part;
  }
  return { parts: parts as ResolvedParts, unresolved };
}

/** Slots a complete build needs, given the parts already chosen. */
export function requiredSlots(parts: ResolvedParts): Slot[] {
  const slots: Slot[] = [...REQUIRED_SLOTS];
  if (parts.case && parts.case.bezelSeat !== 'integral') slots.push('bezel');
  if (parts.bezel?.insert) slots.push('bezelInsert');
  if (parts.case?.chapterRing.requirement === 'required') slots.push('chapterRing');
  return slots;
}

function runRules(rules: readonly Rule[], parts: ResolvedParts, flags: ReadonlySet<ModFlag>, used: Set<ModFlag>): RuleResult[] {
  const results: RuleResult[] = [];
  for (const rule of rules) {
    if (!rule.requires.every((slot) => parts[slot])) continue;
    for (const finding of rule.check(parts)) results.push(applyFlags(rule, finding, flags, used));
  }
  return results.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

function applyFlags(rule: Rule, finding: Finding, flags: ReadonlySet<ModFlag>, used: Set<ModFlag>): RuleResult {
  const base = { ruleId: rule.id, message: finding.message, slots: rule.slots };
  if (finding.fix && flags.has(finding.fix)) {
    used.add(finding.fix);
    return { ...base, severity: DOWNGRADE[finding.severity], appliedFix: finding.fix };
  }
  return { ...base, severity: finding.severity, ...(finding.fix ? { fix: finding.fix } : {}) };
}

function statusOf(results: RuleResult[], missing: Slot[], unresolved: UnresolvedRef[]): BuildStatus {
  if (unresolved.length || results.some((r) => r.severity === 'error')) return 'invalid';
  if (missing.length) return 'incomplete';
  if (results.some((r) => r.severity === 'warning')) return 'warnings';
  return 'valid';
}

export function evaluate(build: BuildInput, lookup: PartLookup, rules: readonly Rule[] = RULES): BuildReport {
  const { parts, unresolved } = resolveParts(build, lookup);
  const flags = new Set(build.flags);
  const used = new Set<ModFlag>();
  const results = runRules(rules, parts, flags, used);
  const missingSlots = requiredSlots(parts).filter((slot) => !parts[slot]);
  return {
    status: statusOf(results, missingSlots, unresolved),
    results,
    missingSlots,
    unresolved,
    unusedFlags: [...flags].filter((f) => !used.has(f)),
  };
}

export type Compatibility = 'compatible' | 'warnings' | 'incompatible';

export interface Candidate<T extends Slot> {
  ref: PartRef;
  part: PartOf<T>;
  compatibility: Compatibility;
  /** Only findings from rules that involve this slot. */
  results: RuleResult[];
}

/**
 * Every part that could go in `slot`, checked against the rest of the build.
 * Only rules touching `slot` are considered, so existing problems elsewhere don't grey out every option.
 */
export function candidatesFor<T extends Slot>(slot: T, build: BuildInput, source: PartSource, rules: readonly Rule[] = RULES): Candidate<T>[] {
  const relevant = rules.filter((r) => r.slots.includes(slot));
  const { parts: base } = resolveParts(build, source);
  const flags = new Set(build.flags);
  return source.list(slot).map(({ ref, part }) => {
    const results = runRules(relevant, { ...base, [slot]: part }, flags, new Set());
    const compatibility: Compatibility = results.some((r) => r.severity === 'error')
      ? 'incompatible'
      : results.some((r) => r.severity === 'warning')
        ? 'warnings'
        : 'compatible';
    return { ref, part, compatibility, results };
  });
}
