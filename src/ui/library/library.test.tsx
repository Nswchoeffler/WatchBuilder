// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildFromSample, duplicateBuild, newBuild } from '../../data/builds';
import { Catalog, loadCorePack } from '../../data/catalog';
import { SAMPLE_BUILDS } from '../../data/sampleBuilds';
import { deleteBuild, getBuild, listBuilds, ModWatchDB, renameBuild, saveBuild } from '../../storage/db';
import { computeLayout, sharedViewBox, viewBoxFor } from '../../render/layout';
import { resolveParts } from '../../domain/rules';
import { AppProvider } from '../app/AppContext';
import { compareRows } from '../compare/CompareScreen';
import { LibraryScreen } from './LibraryScreen';

const catalog = new Catalog([loadCorePack()]);
let db: ModWatchDB;
let n = 0;

beforeEach(async () => {
  db = new ModWatchDB(`library-test-${n++}`);
  await db.open();
  window.location.hash = '';
});

afterEach(async () => {
  cleanup();
  await db.delete();
});

describe('library storage', () => {
  it('creates, renames, duplicates and deletes builds', async () => {
    const a = await saveBuild(db, buildFromSample(SAMPLE_BUILDS[0]!));
    await renameBuild(db, a.id, '  My diver  ');
    expect((await getBuild(db, a.id))?.name).toBe('My diver');
    await renameBuild(db, a.id, '   ');
    expect((await getBuild(db, a.id))?.name).toBe('My diver');

    const copy = duplicateBuild((await getBuild(db, a.id))!);
    await saveBuild(db, copy);
    expect(copy.id).not.toBe(a.id);
    expect(copy.name).toBe('My diver (copy)');
    expect(copy.slots).toEqual(a.slots);

    expect((await listBuilds(db)).map((b) => b.id).sort()).toEqual([a.id, copy.id].sort());
    await deleteBuild(db, a.id);
    expect((await listBuilds(db)).map((b) => b.id)).toEqual([copy.id]);
  });
});

describe('LibraryScreen', () => {
  const renderLibrary = () =>
    render(
      <AppProvider db={db} catalog={catalog} reloadCatalog={async () => {}}>
        <LibraryScreen />
      </AppProvider>,
    );

  it('explains builds and offers samples when empty; starting one opens the builder', async () => {
    renderLibrary();
    expect(await screen.findByText("What's a build?")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Start from/ }));
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/build\//));
    expect(await listBuilds(db)).toHaveLength(1);
  });

  it('selects 2–3 builds and links to compare', async () => {
    const builds = await Promise.all(SAMPLE_BUILDS.slice(0, 4).map((s) => saveBuild(db, buildFromSample(s))));
    renderLibrary();
    const boxes = await screen.findAllByRole('checkbox', { name: /to compare/ });
    fireEvent.click(boxes[0]!);
    fireEvent.click(boxes[1]!);
    fireEvent.click(boxes[2]!);
    expect((boxes[3] as HTMLInputElement).disabled).toBe(true);
    const link = within(screen.getByRole('region', { name: 'Compare selection' })).getByRole('link', { name: /Compare/ });
    const ids = new URL(link.getAttribute('href')!.replace('#', ''), 'http://x').searchParams.get('ids')!.split(',');
    expect(ids).toHaveLength(3);
    expect(ids.every((id) => builds.some((b) => b.id === id))).toBe(true);
  });

  it('deletes after confirming', async () => {
    const b = await saveBuild(db, newBuild('Doomed'));
    renderLibrary();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(async () => expect(await getBuild(db, b.id)).toBeUndefined());
  });
});

describe('compare', () => {
  const sample = (id: string) => buildFromSample(SAMPLE_BUILDS.find((s) => s.id === id)!);

  it('draws every build in one viewBox big enough for the largest', () => {
    const diver = computeLayout(resolveParts(sample('diver-classic'), catalog).parts);
    const fluted = computeLayout(resolveParts(sample('fluted-sunburst'), catalog).parts);
    const shared = sharedViewBox([fluted, diver], 'watch');
    const big = viewBoxFor(diver, 'watch');
    expect(shared[2]).toBeGreaterThanOrEqual(big[2]);
    expect(shared[3]).toBeGreaterThanOrEqual(big[3]);
    expect(shared[2]).toBeGreaterThan(viewBoxFor(fluted, 'watch')[2]);
  });

  it('marks rows that differ between builds', () => {
    const columns = ['diver-classic', 'fluted-sunburst'].map((id) => {
      const build = { ...sample(id), id };
      return { build, parts: resolveParts(build, catalog).parts, report: { status: 'valid' as const, results: [], missingSlots: [], unresolved: [], unusedFlags: [] } };
    });
    const { specs, slots } = compareRows(columns, catalog);
    const diameter = specs.find((r) => r.label === 'Case diameter')!;
    expect(diameter.keys).toEqual(['42 mm', '36 mm']);
    const movement = specs.find((r) => r.label === 'Movement')!;
    expect(new Set(movement.keys).size).toBe(1);
    expect(slots.map((r) => r.label)).toContain('Bezel insert');
  });
});
