// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFromSample } from '../../data/builds';
import { Catalog, loadCorePack } from '../../data/catalog';
import { serializePack } from '../../data/packs';
import { SAMPLE_BUILDS } from '../../data/sampleBuilds';
import { emptyUserPack, MY_PARTS_ID, withPart } from '../../data/userPack';
import type { Pack } from '../../domain/schemas';
import { downloadBlob } from '../../render/export';
import { loadPacks, ModWatchDB, saveBuild, saveUserPack, syncCorePack } from '../../storage/db';
import { AppProvider } from '../app/AppContext';
import { compareVersions, deleteMessage, PacksScreen, replaceMessage } from './PacksScreen';

vi.mock('../../render/export', async (original) => ({ ...(await original<typeof import('../../render/export')>()), downloadBlob: vi.fn() }));

const core = loadCorePack();
const dial = { ...core.parts.find((p) => p.id === 'dl-diver-black')!, id: 'dl-mine', name: 'My dial' };
const myParts = (version = '1.0.3'): Pack => ({ ...withPart(emptyUserPack(), dial), version });

let db: ModWatchDB;

beforeEach(async () => {
  db = new ModWatchDB(`packs-${crypto.randomUUID()}`);
  await syncCorePack(db);
  vi.mocked(downloadBlob).mockClear();
});

afterEach(async () => {
  cleanup();
  await db.delete();
});

/** Render the screen, re-rendering whenever the catalog is reloaded, as the app does. */
async function open() {
  let catalog = new Catalog(await loadPacks(db));
  const ui = () => (
    <AppProvider db={db} catalog={catalog} reloadCatalog={reload}>
      <PacksScreen />
    </AppProvider>
  );
  const view = render(ui());
  async function reload() {
    catalog = new Catalog(await loadPacks(db));
    view.rerender(ui());
  }
  return view;
}

const packFile = (content: string, name = 'pack.json') => new File([content], name, { type: 'application/json' });
const chooseFile = (file: File) => fireEvent.change(screen.getByLabelText('Pack file'), { target: { files: [file] } });
const item = (name: string) => screen.getByText(name, { selector: 'strong' }).closest('li')!;

describe('PacksScreen', () => {
  it('lists user packs with part and build counts, and the core pack as read-only', async () => {
    await saveUserPack(db, myParts());
    const build = buildFromSample(SAMPLE_BUILDS[0]!);
    build.slots.dial = { packId: MY_PARTS_ID, partId: 'dl-mine' };
    await saveBuild(db, build);
    await open();

    await waitFor(() => expect(item('My Parts').textContent).toContain('used by 1 build'));
    expect(item('My Parts').textContent).toContain('1 part');
    expect(within(item('Core Catalog')).getByText(/read-only/)).toBeTruthy();
    expect(within(item('Core Catalog')).queryByRole('button', { name: /Export|Delete/ })).toBeNull();
  });

  it('explains how packs come about when there are none of your own', async () => {
    await open();
    expect(screen.getByText(/No packs of your own yet/)).toBeTruthy();
  });

  it('creates a pack from a name', async () => {
    const user = userEvent.setup();
    await open();
    await user.click(screen.getByRole('button', { name: /New pack/ }));
    await user.type(screen.getByLabelText('Name'), 'Octagon project');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(item('Octagon project').textContent).toContain('octagon-project'));
  });

  it('exports a pack as JSON named after its id and version', async () => {
    await saveUserPack(db, myParts());
    await open();
    fireEvent.click(within(item('My Parts')).getByRole('button', { name: /Export/ }));
    const [blob, filename] = vi.mocked(downloadBlob).mock.calls[0]!;
    expect(filename).toBe('my-parts-1.0.3.json');
    expect(JSON.parse(await blob.text())).toMatchObject({ id: MY_PARTS_ID, version: '1.0.3', parts: [{ id: 'dl-mine' }] });
  });

  it('imports a new pack', async () => {
    await open();
    chooseFile(packFile(serializePack({ ...myParts(), id: 'friends-parts', name: "A friend's parts" })));
    expect((await screen.findByRole('status', { name: 'Import result' })).textContent).toMatch(/Imported A friend's parts v1\.0\.3 \(1 part\)/);
    expect((await loadPacks(db)).map((p) => p.id)).toContain('friends-parts');
  });

  it('shows every validation problem in a file it refuses', async () => {
    await open();
    const bad = JSON.parse(serializePack(myParts()));
    bad.version = 'latest';
    bad.parts[0].diameter = -1;
    chooseFile(packFile(JSON.stringify(bad), 'broken.json'));
    const report = await screen.findByRole('alert', { name: 'Import result' });
    expect(report.textContent).toContain('broken.json');
    expect(report.textContent).toContain('Pack is invalid');
    const issues = within(report).getAllByRole('listitem').map((li) => li.textContent);
    expect(issues).toEqual(expect.arrayContaining([expect.stringMatching(/^version:/), expect.stringMatching(/^parts\[0\] \(dl-mine\)\.diameter:/)]));
    expect((await loadPacks(db)).map((p) => p.id)).toEqual(['core']);
  });

  it('refuses files that are not JSON, and packs that claim the core id', async () => {
    await open();
    chooseFile(packFile('{nope', 'notes.txt'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/not valid JSON/);
    chooseFile(packFile(serializePack({ ...myParts(), id: 'core' })));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/reserved for the built-in catalog/));
  });

  it('asks before replacing a pack with the same id, showing both versions', async () => {
    const user = userEvent.setup();
    await saveUserPack(db, myParts('1.0.3'));
    await open();
    const incoming = { ...myParts('1.0.7'), parts: [...myParts().parts, { ...dial, id: 'dl-mine-2', name: 'My dial 2' }] };
    chooseFile(packFile(serializePack(incoming)));

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('v1.0.3 (1 part) for v1.0.7 (2 parts)');
    await user.click(within(dialog).getByRole('button', { name: 'Replace' }));
    expect((await screen.findByRole('status', { name: 'Import result' })).textContent).toMatch(/Replaced My Parts v1\.0\.7/);
    expect((await loadPacks(db)).find((p) => p.id === MY_PARTS_ID)?.parts).toHaveLength(2);
  });

  it('keeps the existing pack when a replacement is cancelled', async () => {
    const user = userEvent.setup();
    await saveUserPack(db, myParts('1.0.3'));
    await open();
    chooseFile(packFile(serializePack({ ...myParts('1.0.1'), parts: [] })));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('newer than the file');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect((await loadPacks(db)).find((p) => p.id === MY_PARTS_ID)?.version).toBe('1.0.3');
  });

  it('warns how many builds use a pack before deleting it', async () => {
    const user = userEvent.setup();
    await saveUserPack(db, myParts());
    for (const sample of SAMPLE_BUILDS.slice(0, 2)) {
      const build = buildFromSample(sample);
      build.slots.dial = { packId: MY_PARTS_ID, partId: 'dl-mine' };
      await saveBuild(db, build);
    }
    await open();
    await waitFor(() => expect(item('My Parts').textContent).toContain('used by 2 builds'));
    await user.click(screen.getByRole('button', { name: 'Delete My Parts' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('2 builds use its parts');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(async () => expect((await loadPacks(db)).map((p) => p.id)).toEqual(['core']));
  });
});

describe('pack messages', () => {
  it('orders versions numerically', () => {
    expect(compareVersions('1.0.10', '1.0.9')).toBeGreaterThan(0);
    expect(compareVersions('1.2.0', '1.10.0')).toBeLessThan(0);
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
  });

  it('says when both versions match', () => {
    expect(replaceMessage(myParts('1.0.3'), myParts('1.0.3'))).toContain('same version');
  });

  it('does not mention builds when nothing uses the pack', () => {
    expect(deleteMessage(myParts(), 0)).not.toMatch(/build/);
    expect(deleteMessage(myParts(), 1)).toContain('1 build uses its parts');
  });
});
