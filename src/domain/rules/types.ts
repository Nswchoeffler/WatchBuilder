import type { ModFlag, Part, PartOf, PartRef, Slot } from '../schemas';

export type Severity = 'error' | 'warning' | 'info';

/** What a rule reports before modification flags are applied. */
export interface Finding {
  severity: Severity;
  message: string;
  /** A real-world modification that downgrades this finding one level (error→warning, warning→info). */
  fix?: ModFlag;
}

export interface RuleResult {
  ruleId: string;
  severity: Severity;
  message: string;
  /** Slots involved, for highlighting in the UI. */
  slots: readonly Slot[];
  /** Fix that could downgrade this finding (not yet applied). */
  fix?: ModFlag;
  /** Fix that was applied; `severity` is already downgraded. */
  appliedFix?: ModFlag;
}

export type ResolvedParts = { [K in Slot]?: PartOf<K> };

type WithRequired<R extends Slot> = ResolvedParts & { [K in R]: PartOf<K> };

export interface Rule {
  id: string;
  title: string;
  /** Rule runs only when all of these slots are filled. */
  requires: readonly Slot[];
  /** Every slot the rule may read (requires + optional reads). */
  slots: readonly Slot[];
  check(parts: ResolvedParts): Finding[];
}

export function defineRule<const R extends Slot>(def: {
  id: string;
  title: string;
  requires: readonly R[];
  reads?: readonly Slot[];
  check(parts: WithRequired<R>): Finding[];
}): Rule {
  return {
    id: def.id,
    title: def.title,
    requires: def.requires,
    slots: [...new Set<Slot>([...def.requires, ...(def.reads ?? [])])],
    check: (parts) => def.check(parts as WithRequired<R>),
  };
}

/** Anything that can look parts up by ref — `Catalog` satisfies this. */
export interface PartLookup {
  get(ref: PartRef): Part | undefined;
}

export interface PartSource extends PartLookup {
  list<T extends Slot>(type: T): { ref: PartRef; part: PartOf<T> }[];
}

export const error = (message: string, fix?: ModFlag): Finding => ({ severity: 'error', message, fix });
export const warning = (message: string, fix?: ModFlag): Finding => ({ severity: 'warning', message, fix });
export const info = (message: string): Finding => ({ severity: 'info', message });
