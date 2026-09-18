import { useCallback, useMemo, useState } from 'react';
import { Part } from '../../domain/schemas';
import { setAt } from './form';

export interface Validation {
  /** The draft parsed as a real part, when it is valid. */
  part?: Part;
  /** Zod messages keyed by the path they belong to, e.g. `dialSeat.min`. */
  errors: Map<string, string[]>;
}

/** Validate a draft against the part schema, keeping issue paths for inline display. */
export function validatePart(draft: unknown): Validation {
  const result = Part.safeParse(draft);
  if (result.success) return { part: result.data, errors: new Map() };
  const errors = new Map<string, string[]>();
  for (const issue of result.error.issues) {
    const key = issue.path.join('.');
    errors.set(key, [...(errors.get(key) ?? []), issue.message]);
  }
  return { errors };
}

export interface PartDraft extends Validation {
  value: Record<string, unknown>;
  set: (path: string, value: unknown) => void;
  /** Replace the whole draft, e.g. after saving or switching part. */
  reset: (value: Record<string, unknown>) => void;
  dirty: boolean;
  /** The last valid version, so the preview survives a half-typed measurement. */
  lastValid: Part | undefined;
}

export function usePartDraft(initial: Record<string, unknown>): PartDraft {
  const [value, setValue] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const validation = useMemo(() => validatePart(value), [value]);

  // Keep the last version that parsed, so a half-typed measurement doesn't blank the preview.
  const [lastValid, setLastValid] = useState<Part | undefined>(validation.part);
  if (validation.part && validation.part !== lastValid) setLastValid(validation.part);

  const set = useCallback((path: string, next: unknown) => {
    setValue((prev) => setAt(prev, path, next));
  }, []);

  const reset = useCallback((next: Record<string, unknown>) => {
    setValue(next);
    setBaseline(JSON.stringify(next));
  }, []);

  return {
    ...validation,
    value,
    set,
    reset,
    dirty: JSON.stringify(value) !== baseline,
    lastValid,
  };
}
