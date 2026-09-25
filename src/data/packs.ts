import { z } from 'zod';
import { PACK_FORMAT, PACK_SCHEMA_VERSION, Pack } from '../domain/schemas';
import { migratePack } from './migrations';

export class PackError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(issues.length ? `${message}\n${issues.map((i) => `  - ${i}`).join('\n')}` : message);
    this.name = 'PackError';
    this.issues = issues;
  }
}

/** Human-readable issue list, e.g. `parts[3] (dl-foo).diameter: Too small`. */
export function formatIssues(error: z.ZodError, input: unknown): string[] {
  return error.issues.map((issue) => {
    const path = issue.path
      .map((seg, i) => {
        if (typeof seg !== 'number') return `${i === 0 ? '' : '.'}${String(seg)}`;
        const partId = i === 1 && issue.path[0] === 'parts' ? partIdAt(input, seg) : undefined;
        return `[${seg}]${partId ? ` (${partId})` : ''}`;
      })
      .join('');
    return `${path || '(root)'}: ${issue.message}`;
  });
}

function partIdAt(input: unknown, index: number): string | undefined {
  const parts = (input as { parts?: unknown })?.parts;
  if (!Array.isArray(parts)) return undefined;
  const id = (parts[index] as { id?: unknown })?.id;
  return typeof id === 'string' ? id : undefined;
}

/** Validate an already-parsed object as a pack. Throws PackError with every issue. */
export function validatePack(input: unknown): Pack {
  const header = z.object({ format: z.string(), schemaVersion: z.number() }).safeParse(input);
  if (!header.success || header.data.format !== PACK_FORMAT) {
    throw new PackError(`Not a part pack (expected format "${PACK_FORMAT}").`);
  }
  if (header.data.schemaVersion > PACK_SCHEMA_VERSION) {
    throw new PackError(
      `Pack schema version ${header.data.schemaVersion} is newer than this app supports (${PACK_SCHEMA_VERSION}).`,
    );
  }
  const migrated = migratePack(input);
  const result = Pack.safeParse(migrated);
  if (!result.success) throw new PackError('Pack is invalid:', formatIssues(result.error, migrated));
  return result.data;
}

export function parsePackJson(json: string): Pack {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    throw new PackError(`Pack file is not valid JSON: ${(e as Error).message}`);
  }
  return validatePack(raw);
}

export function serializePack(pack: Pack): string {
  return `${JSON.stringify(pack, null, 2)}\n`;
}
