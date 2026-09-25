import { z } from 'zod';
import { PACK_SCHEMA_VERSION } from '../domain/schemas';

// Packs are migrated as raw JSON *before* validation, so a pack written by an older
// version of the app is brought up to the current schema and then checked as usual.
// Each migration takes a pack at version `n` and returns it at `n + 1`. Migrations
// must not import the current part schemas: those move on, the migration must not.

type RawPack = Record<string, unknown> & { schemaVersion: number };
type Migration = (pack: RawPack) => RawPack;

/** Keyed by the version a migration upgrades *from*. */
export const MIGRATIONS: Record<number, Migration> = {
  /** v1 → v2: parts gained `sources`. The editor used to ask for sources in `notes`, so web addresses found there are copied over. */
  1: (pack) => ({
    ...pack,
    schemaVersion: 2,
    parts: Array.isArray(pack.parts) ? pack.parts.map(withSourcesFromNotes) : pack.parts,
  }),
};

/**
 * Bring a raw pack up to the current schema version. Input that isn't a pack at a known
 * older version is returned untouched, so validation can report on it.
 */
export function migratePack(input: unknown): unknown {
  if (!isRawPack(input)) return input;
  let pack = input;
  while (pack.schemaVersion < PACK_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[pack.schemaVersion];
    if (!migrate) return pack;
    pack = migrate(pack);
  }
  return pack;
}

const isRawPack = (input: unknown): input is RawPack =>
  typeof input === 'object' && input !== null && typeof (input as { schemaVersion?: unknown }).schemaVersion === 'number';

// ── v1 → v2 ─────────────────────────────────────────────────────────────────

/** The rule `sources` entries had when v2 was introduced. */
const webAddress = z.httpUrl();
const URL_IN_TEXT = /https?:\/\/[^\s<>"'`]+/g;

function withSourcesFromNotes(part: unknown): unknown {
  if (typeof part !== 'object' || part === null) return part;
  const { notes, sources } = part as { notes?: unknown; sources?: unknown };
  if (typeof notes !== 'string' || sources !== undefined) return part;
  const found = sourcesIn(notes);
  return found.length ? { ...part, sources: found } : part;
}

/** Web addresses in free text, without trailing punctuation, de-duplicated, at most 10. */
export function sourcesIn(text: string): string[] {
  const urls = (text.match(URL_IN_TEXT) ?? []).map((u) => u.replace(/[.,;:!?)\]]+$/, ''));
  return [...new Set(urls)].filter((u) => webAddress.safeParse(u).success).slice(0, 10);
}
