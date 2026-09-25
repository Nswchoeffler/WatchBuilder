import { describe, expect, it } from 'vitest';
import { PACK_SCHEMA_VERSION } from '../domain/schemas';
import { loadCorePack } from './catalog';
import { MIGRATIONS, migratePack, sourcesIn } from './migrations';
import { serializePack, validatePack } from './packs';

const core = loadCorePack();
/** The core pack as a v1 file would have held it: no `sources`, schemaVersion 1. */
const v1Pack = (parts = core.parts.slice(0, 3)) => ({
  ...JSON.parse(serializePack({ ...core, id: 'old-pack', parts })),
  schemaVersion: 1,
});

describe('pack migrations', () => {
  it('has a migration from every older schema version', () => {
    for (let v = 1; v < PACK_SCHEMA_VERSION; v++) expect(MIGRATIONS[v], `migration from v${v}`).toBeTypeOf('function');
  });

  it('leaves current packs, newer packs and non-packs alone', () => {
    const current = JSON.parse(serializePack(core));
    expect(migratePack(current)).toBe(current);
    const newer = { ...current, schemaVersion: PACK_SCHEMA_VERSION + 1 };
    expect(migratePack(newer)).toBe(newer);
    expect(migratePack('hello')).toBe('hello');
    expect(migratePack({ schemaVersion: 'one' })).toEqual({ schemaVersion: 'one' });
  });

  it('validates a v1 pack by migrating it first', () => {
    const pack = validatePack(v1Pack());
    expect(pack.schemaVersion).toBe(PACK_SCHEMA_VERSION);
    expect(pack.parts).toHaveLength(3);
  });

  describe('v1 → v2', () => {
    type Migrated = { schemaVersion: number; parts: { notes?: string; sources?: string[] }[] };
    const migrate = (pack: ReturnType<typeof v1Pack>) => MIGRATIONS[1]!(pack) as unknown as Migrated;
    const withNotes = (notes: string, extra = {}) => ({ ...core.parts[0]!, notes, ...extra });

    it('copies web addresses from notes into sources and keeps the notes', () => {
      const notes = 'From the spec sheet (https://example.com/nh35.pdf). Also http://forum.example.org/t/123, measured twice.';
      const out = migrate(v1Pack([withNotes(notes)]));
      expect(out.schemaVersion).toBe(2);
      expect(out.parts[0]!.notes).toBe(notes);
      expect(out.parts[0]!.sources).toEqual(['https://example.com/nh35.pdf', 'http://forum.example.org/t/123']);
    });

    it('adds nothing when notes have no web address, and never overwrites sources', () => {
      const out = migrate(v1Pack([withNotes('Calipers.'), withNotes('see https://a.example.com', { sources: ['https://b.example.com'] })]));
      expect(out.parts[0]).not.toHaveProperty('sources');
      expect(out.parts[1]!.sources).toEqual(['https://b.example.com']);
    });

    it('produces a pack that validates, even from untidy notes', () => {
      const messy = withNotes('https://ok.example.com/a, https://ok.example.com/a again; ftp://no.example.com http://', {});
      const pack = validatePack(v1Pack([messy]));
      expect(pack.parts[0]!.sources).toEqual(['https://ok.example.com/a']);
    });
  });

  it('finds at most ten distinct addresses and trims trailing punctuation', () => {
    const text = Array.from({ length: 12 }, (_, i) => `https://s${i}.example.com/x.`).join(' ');
    expect(sourcesIn(text)).toHaveLength(10);
    expect(sourcesIn(text)[0]).toBe('https://s0.example.com/x');
    expect(sourcesIn('(see https://example.com/page)')).toEqual(['https://example.com/page']);
  });
});
