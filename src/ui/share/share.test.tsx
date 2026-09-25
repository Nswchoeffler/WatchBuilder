// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFromSample } from '../../data/builds';
import { makeBundle, serializeBundle } from '../../data/bundle';
import { Catalog, loadCorePack } from '../../data/catalog';
import { SAMPLE_BUILDS } from '../../data/sampleBuilds';
import { decodeShare, encodeShare } from '../../data/share';
import { emptyUserPack, withPart } from '../../data/userPack';
import type { Build } from '../../domain/schemas';
import { downloadBlob } from '../../render/export';
import { listBuilds, loadPacks, ModWatchDB, saveBuild, syncCorePack } from '../../storage/db';
import { AppProvider } from '../app/AppContext';
import { parseHash } from '../app/route';
import { BuilderScreen } from '../builder/BuilderScreen';
import { LibraryScreen } from '../library/LibraryScreen';
import { ShareScreen } from './ShareScreen';

vi.mock('../../render/export', async (original) => ({ ...(await original<typeof import('../../render/export')>()), downloadBlob: vi.fn() }));

const core = loadCorePack();
const myDial = { ...core.parts.find((p) => p.id === 'dl-diver-black')!, id: 'dl-mine', name: 'My dial' };
const myParts = withPart(emptyUserPack(), myDial);

let db: ModWatchDB;

beforeEach(async () => {
  db = new ModWatchDB(`share-${crypto.randomUUID()}`);
  await syncCorePack(db);
  window.location.hash = '';
  vi.mocked(downloadBlob).mockClear();
});

afterEach(async () => {
  cleanup();
  await db.delete();
});

/** Render a screen with the given packs, re-rendering on catalog reloads as the app does. */
function show(element: React.ReactElement, catalog = new Catalog([core])) {
  const ui = () => (
    <AppProvider db={db} catalog={catalog} reloadCatalog={reload}>
      {element}
    </AppProvider>
  );
  const view = render(ui());
  async function reload() {
    catalog = new Catalog(await loadPacks(db));
    view.rerender(ui());
  }
  return view;
}

const withMyDial = (): Build => {
  const b = buildFromSample(SAMPLE_BUILDS[0]!);
  return { ...b, slots: { ...b.slots, dial: { packId: 'my-parts', partId: 'dl-mine' } } };
};

describe('ShareScreen', () => {
  it('shows a shared build read-only and saves a copy into my builds', async () => {
    const sample = buildFromSample(SAMPLE_BUILDS[0]!);
    show(<ShareScreen code={await encodeShare(sample)} />);

    expect(await screen.findByRole('heading', { name: sample.name })).toBeTruthy();
    expect(screen.getByText('Shared build · read-only')).toBeTruthy();
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Missing parts' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save to my builds' }));
    await waitFor(() => expect(parseHash(window.location.hash).name).toBe('build'));
    const [saved] = await listBuilds(db);
    expect(saved).toMatchObject({ name: sample.name, slots: sample.slots, flags: sample.flags });
  });

  it('lists the packs the viewer is missing', async () => {
    show(<ShareScreen code={await encodeShare(withMyDial())} />);
    const missing = await screen.findByRole('region', { name: 'Missing parts' });
    expect(missing.textContent).toContain('One part comes from packs you don\'t have');
    expect(within(missing).getByText('my-parts')).toBeTruthy();
  });

  it('explains a damaged link', async () => {
    show(<ShareScreen code="abc" />);
    expect(await screen.findByRole('heading', { name: "Can't open this link" })).toBeTruthy();
    expect(screen.getByText(/damaged or incomplete/)).toBeTruthy();
  });
});

describe('sharing from the builder', () => {
  it('makes a link that opens the same build, and warns when the link alone is not enough', async () => {
    const build = await saveBuild(db, withMyDial());
    show(<BuilderScreen id={build.id} />, new Catalog([core, myParts]));
    fireEvent.click(await screen.findByRole('button', { name: /Share/ }));

    const dialog = screen.getByRole('dialog');
    const link = within(dialog).getByLabelText('Share link') as HTMLInputElement;
    await waitFor(() => expect(link.value).toMatch(/#\/share\/[A-Za-z0-9_-]+$/));
    const route = parseHash(new URL(link.value).hash);
    if (route.name !== 'share') throw new Error('not a share link');
    expect(await decodeShare(route.code)).toEqual({ name: build.name, slots: build.slots, flags: build.flags });
    expect(within(dialog).getByRole('note').textContent).toContain('“My Parts”');

    fireEvent.click(within(dialog).getByRole('button', { name: /Download build file/ }));
    const [blob, filename] = vi.mocked(downloadBlob).mock.calls[0]!;
    expect(filename).toMatch(/\.build\.json$/);
    expect(JSON.parse(await blob.text()).packs[0].parts.map((p: { id: string }) => p.id)).toEqual(['dl-mine']);
  });
});

describe('importing a build file into the library', () => {
  const chooseFile = (content: string, name = 'diver.build.json') =>
    fireEvent.change(screen.getByLabelText('Build file'), { target: { files: [new File([content], name, { type: 'application/json' })] } });

  it('adds the build and the parts it carries', async () => {
    const file = serializeBundle(makeBundle(withMyDial(), new Catalog([core, myParts])).bundle);
    show(<LibraryScreen />);
    await screen.findByRole('heading', { name: 'Builds' });
    chooseFile(file);

    // Importing renders the new build's card (a full watch drawing), which is slow while the whole suite runs.
    const result = await screen.findByRole('status', { name: 'Import result' }, { timeout: 5000 });
    expect(result.textContent).toContain('Added the pack “My Parts” with 1 part.');
    const [build] = await listBuilds(db);
    expect(within(result).getByRole('link', { name: 'Open it' }).getAttribute('href')).toBe(`#/build/${build!.id}`);
    expect((await loadPacks(db)).find((p) => p.id === 'my-parts')?.parts.map((p) => p.id)).toEqual(['dl-mine']);
  });

  it('reports a file it refuses, without saving anything', async () => {
    const user = userEvent.setup();
    show(<LibraryScreen />);
    await screen.findByRole('heading', { name: 'Builds' });
    chooseFile('{"format":"modwatch-pack"}', 'parts.json');
    const alert = await screen.findByRole('alert', { name: 'Import result' });
    expect(alert.textContent).toMatch(/parts\.json.*part pack/);
    await user.click(within(alert).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(await listBuilds(db)).toEqual([]);
  });
});
