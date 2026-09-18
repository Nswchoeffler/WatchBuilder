import { describe, expect, it } from 'vitest';
import { PART_TYPES, Part } from '../domain/schemas';
import { blankPart, duplicatePart } from './blankParts';
import { validatePack } from './packs';
import { bumpPatch, emptyUserPack, slugify, uniquePartId, withPart, withoutPart } from './userPack';

describe('blank parts', () => {
  it.each(PART_TYPES)('a new %s is valid on its own', (type) => {
    const result = Part.safeParse(blankPart(type, `new-${type.toLowerCase()}`));
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });

  it('copies a part under a new id and drops its confidence', () => {
    const original = { ...blankPart('dial', 'dl-original'), confidence: 'verified' as const };
    const copy = duplicatePart(original, 'dl-copy', 'Copy');
    expect(copy).toMatchObject({ id: 'dl-copy', name: 'Copy', confidence: 'unverified' });
    expect(original.id).toBe('dl-original');
  });
});

describe('user pack', () => {
  it('starts empty and valid', () => {
    expect(() => validatePack(emptyUserPack())).not.toThrow();
  });

  it('adds, replaces and removes parts, bumping the version each time', () => {
    const pack = emptyUserPack();
    const added = withPart(pack, blankPart('dial', 'dl-mine'));
    expect(added.parts).toHaveLength(1);
    expect(added.version).toBe('1.0.1');

    const replaced = withPart(added, { ...blankPart('dial', 'dl-mine'), name: 'Renamed' });
    expect(replaced.parts).toHaveLength(1);
    expect(replaced.parts[0]!.name).toBe('Renamed');
    expect(replaced.version).toBe('1.0.2');

    // Renaming an id replaces the old entry instead of leaving a duplicate behind.
    const renamed = withPart(replaced, blankPart('dial', 'dl-renamed'), 'dl-mine');
    expect(renamed.parts.map((p) => p.id)).toEqual(['dl-renamed']);

    expect(withoutPart(replaced, 'dl-mine').parts).toHaveLength(0);
    // Removing a part that isn't there is a no-op, so the version stays put.
    expect(withoutPart(replaced, 'nope')).toBe(replaced);
  });

  it('keeps a saved pack valid', () => {
    const pack = withPart(withPart(emptyUserPack(), blankPart('dial', 'dl-a')), blankPart('case', 'cs-b'));
    expect(() => validatePack(pack)).not.toThrow();
  });

  it('bumps the patch version', () => {
    expect(bumpPatch('1.0.0')).toBe('1.0.1');
    expect(bumpPatch('2.4.9')).toBe('2.4.10');
  });

  it('avoids ids already taken', () => {
    const taken = new Set(['dl-x', 'dl-x-2']);
    expect(uniquePartId('dl-y', taken)).toBe('dl-y');
    expect(uniquePartId('dl-x', taken)).toBe('dl-x-3');
  });

  it('makes slugs the schema accepts', () => {
    expect(slugify('Diver Black 28.5', 'dial')).toBe('diver-black-28-5');
    expect(slugify('  Sub-style  ', 'dial')).toBe('sub-style');
    expect(slugify('!!!', 'bezelInsert')).toBe('bezelinsert');
  });
});
