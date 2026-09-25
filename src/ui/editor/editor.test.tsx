// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Catalog, loadCorePack } from '../../data/catalog';
import { CORE_PACK_ID } from '../../data/seed';
import { buildFromSample } from '../../data/builds';
import { SAMPLE_BUILDS } from '../../data/sampleBuilds';
import { MY_PARTS_ID } from '../../data/userPack';
import { ModWatchDB, createUserPack, loadPacks, saveBuild, savePart } from '../../storage/db';
import { AppProvider } from '../app/AppContext';
import { parseHash } from '../app/route';
import { PartEditorScreen } from './PartEditorScreen';

let db: ModWatchDB;
let catalog: Catalog;

beforeEach(async () => {
  db = new ModWatchDB(`editor-${crypto.randomUUID()}`);
  catalog = new Catalog([loadCorePack()]);
});

afterEach(async () => {
  cleanup();
  await db.delete();
});

/** Render the editor at a hash route, re-rendering whenever the catalog is reloaded. */
function open(hash: string) {
  const parsed = parseHash(hash);
  if (parsed.name !== 'part' && parsed.name !== 'part-new') throw new Error(`not an editor route: ${hash}`);
  const route = parsed;
  const view = render(
    <AppProvider db={db} catalog={catalog} reloadCatalog={reload}>
      <PartEditorScreen route={route} />
    </AppProvider>,
  );
  async function reload() {
    catalog = new Catalog(await loadPacks(db));
    view.rerender(
      <AppProvider db={db} catalog={catalog} reloadCatalog={reload}>
        <PartEditorScreen route={route} />
      </AppProvider>,
    );
  }
  return view;
}

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

async function type(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  const input = field(label);
  await user.clear(input);
  await user.type(input, value);
}

describe('part editor', () => {
  it('offers every part type when no type is chosen', () => {
    open('#/part/new');
    expect(screen.getByRole('heading', { name: 'What are you adding?' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Dial/ })).toBeTruthy();
  });

  it('starts a new dial with workable measurements and a valid preview', () => {
    open('#/part/new?type=dial');
    expect(field('Diameter').value).toBe('28.5');
    expect(screen.getByRole('status').textContent).toBe('Saved');
    expect(screen.getByText(/^Fits \d+ cases$/)).toBeTruthy();
  });

  it('shows schema errors inline, on the field that caused them', async () => {
    const user = userEvent.setup();
    open('#/part/new?type=dial');

    await type(user, 'Diameter', '0');
    const diameter = field('Diameter');
    await waitFor(() => expect(diameter.getAttribute('aria-invalid')).toBe('true'));
    const message = document.getElementById(`${diameter.getAttribute('aria-describedby')}`);
    expect(message?.textContent).toMatch(/greater than 0|too small/i);
    expect(screen.getByRole('button', { name: /Save/ })).toHaveProperty('disabled', true);

    await type(user, 'Diameter', '29');
    await waitFor(() => expect(field('Diameter').getAttribute('aria-invalid')).toBe(null));
  });

  /** Phase 5 acceptance: duplicating a dial and widening it makes it incompatible with its case. */
  it('reports a dial that no longer fits the case it is shown in', async () => {
    const user = userEvent.setup();
    open(`#/part/new?type=dial&from=${CORE_PACK_ID}/dl-diver-black`);
    expect(field('Name').value).toBe('Diver Black (copy)');
    expect(screen.getByText('Every rule that applies to this part passes.')).toBeTruthy();

    await type(user, 'Diameter', '30.8');

    await waitFor(() => expect(screen.getByText(/this case seats 28\.3mm–28\.7mm dials/i)).toBeTruthy());
    expect(screen.getByText("Doesn't fit")).toBeTruthy();
    expect(screen.getByText('R-CD-2')).toBeTruthy();
  });

  it('saves a new part into My Parts, where the catalog can find it', async () => {
    const user = userEvent.setup();
    open('#/part/new?type=dial');

    await type(user, 'Name', 'My Test Dial');
    await type(user, 'Id', 'dl-test');
    await user.click(screen.getByRole('button', { name: 'Save to My Parts' }));

    await waitFor(async () => {
      const packs = await loadPacks(db);
      const mine = packs.find((p) => p.id === MY_PARTS_ID);
      expect(mine?.parts.map((p) => p.id)).toEqual(['dl-test']);
      expect(mine?.parts[0]?.name).toBe('My Test Dial');
    });
  });

  it('refuses an id another part in the same pack already uses', async () => {
    const user = userEvent.setup();
    open('#/part/new?type=dial');
    await type(user, 'Id', 'dl-first');
    await user.click(screen.getByRole('button', { name: 'Save to My Parts' }));
    // Wait for the catalog reload, not just the write, so the next editor sees the new part.
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Saved'));

    cleanup();
    open('#/part/new?type=dial');
    await type(user, 'Id', 'dl-first');
    await waitFor(() => expect(screen.getByText(/already in this pack/)).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Save to My Parts' })).toHaveProperty('disabled', true);
  });

  it('keeps core parts read-only and offers a copy instead', () => {
    open(`#/part/${CORE_PACK_ID}/dl-diver-black`);
    expect(screen.getByText(/Built-in parts can't be changed/)).toBeTruthy();
    expect(screen.queryByLabelText('Diameter')).toBeNull();
    expect(screen.getByRole('link', { name: /Duplicate & edit/ })).toBeTruthy();
  });

  it('couples fields the schema requires to agree: turning off the seconds hand clears both', async () => {
    const user = userEvent.setup();
    open('#/part/new?type=hands');
    const holes = () => within(screen.getByRole('group', { name: 'Hole sizes' }));
    const lengths = () => within(screen.getByRole('group', { name: 'Lengths' }));
    expect((holes().getByLabelText('Seconds') as HTMLInputElement).value).toBe('0.2');
    expect(lengths().getByLabelText('Seconds')).toBeTruthy();

    await user.click(screen.getByLabelText('Seconds hand'));
    expect(holes().queryByLabelText('Seconds')).toBeNull();
    expect(lengths().queryByLabelText('Seconds')).toBeNull();
    // Both the hole and the length went to null together, so the part is still valid.
    expect(screen.getByRole('status').textContent).toBe('Unsaved changes');
  });

  it('edits the drawing settings on the Drawing tab', async () => {
    const user = userEvent.setup();
    open('#/part/new?type=dial');
    await user.click(screen.getByRole('tab', { name: 'Drawing' }));

    const template = screen.getByLabelText('Template') as HTMLSelectElement;
    expect([...template.options].map((o) => o.value)).toContain('dial/sub');
    expect(screen.getByLabelText('Dial colour')).toBeTruthy();
    expect(screen.getByLabelText('Markers')).toBeTruthy();
  });

  it('lets a new profile id be typed when none of the existing ones fit', async () => {
    const user = userEvent.setup();
    open('#/part/new?type=crown');
    const existing = screen.getByLabelText('Tube (existing)') as HTMLSelectElement;
    expect([...existing.options].map((o) => o.value)).toContain('diver42');

    await user.selectOptions(existing, 'new');
    await user.type(screen.getByLabelText('Tube (new id)'), 'my-tube');
    expect((screen.getByLabelText('Tube (new id)') as HTMLInputElement).value).toBe('my-tube');
  });
});

describe('editing a saved part', () => {
  it('loads it, saves changes back and can delete it', async () => {
    const user = userEvent.setup();
    open('#/part/new?type=dial');
    await type(user, 'Id', 'dl-mine');
    await type(user, 'Name', 'Mine');
    await user.click(screen.getByRole('button', { name: 'Save to My Parts' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Saved'));

    cleanup();
    catalog = new Catalog(await loadPacks(db));
    open(`#/part/${MY_PARTS_ID}/dl-mine`);
    expect(field('Name').value).toBe('Mine');

    await type(user, 'Name', 'Mine, wider');
    await type(user, 'Diameter', '29');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      const parts = (await loadPacks(db)).find((p) => p.id === MY_PARTS_ID)?.parts;
      expect(parts).toHaveLength(1);
      expect(parts?.[0]).toMatchObject({ id: 'dl-mine', name: 'Mine, wider', diameter: 29 });
    });

    await user.click(screen.getByRole('button', { name: 'Delete part' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(async () => expect((await loadPacks(db)).find((p) => p.id === MY_PARTS_ID)?.parts).toHaveLength(0));
  });

  it('says how many builds use a part before deleting it', async () => {
    const user = userEvent.setup();
    await savePart(db, MY_PARTS_ID, { ...catalog.get({ packId: CORE_PACK_ID, partId: 'dl-diver-black' })!, id: 'dl-used', name: 'Used' });
    for (const sample of SAMPLE_BUILDS.slice(0, 3)) {
      const build = buildFromSample(sample);
      build.slots.dial = { packId: MY_PARTS_ID, partId: 'dl-used' };
      await saveBuild(db, build);
    }
    catalog = new Catalog(await loadPacks(db));
    open(`#/part/${MY_PARTS_ID}/dl-used`);
    await user.click(screen.getByRole('button', { name: 'Delete part' }));
    await waitFor(() => expect(screen.getByRole('dialog').textContent).toContain('3 builds use it and will show it as missing'));
  });
});

describe('packs and sources', () => {
  it('saves a new part into another pack when one is chosen', async () => {
    const user = userEvent.setup();
    await createUserPack(db, 'Octagon project');
    catalog = new Catalog(await loadPacks(db));
    open('#/part/new?type=dial');

    const picker = screen.getByLabelText('Pack to save into') as HTMLSelectElement;
    expect([...picker.options].map((o) => o.text)).toEqual(['My Parts', 'Octagon project']);
    await user.selectOptions(picker, 'octagon-project');
    await type(user, 'Id', 'dl-octo');
    await user.click(screen.getByRole('button', { name: 'Save to Octagon project' }));

    await waitFor(() => expect(parseHash(window.location.hash)).toEqual({ name: 'part', packId: 'octagon-project', partId: 'dl-octo' }));
    const packs = await loadPacks(db);
    expect(packs.find((p) => p.id === 'octagon-project')?.parts.map((p) => p.id)).toEqual(['dl-octo']);
    expect(packs.some((p) => p.id === MY_PARTS_ID)).toBe(false);
  });

  it('offers no pack picker while My Parts is the only choice', () => {
    open('#/part/new?type=dial');
    expect(screen.queryByLabelText('Pack to save into')).toBeNull();
  });

  it('takes sources one per line and points at the line that is wrong', async () => {
    const user = userEvent.setup();
    open('#/part/new?type=dial');
    await user.type(field('Sources'), 'https://example.com/spec.pdf{enter}{enter}not a link');
    await waitFor(() => expect(screen.getByText(/Line 2: expected a web address/)).toBeTruthy());

    await user.clear(field('Sources'));
    await user.type(field('Sources'), 'https://example.com/spec.pdf{enter}https://shop.example.com/dial');
    await type(user, 'Id', 'dl-sourced');
    await user.click(screen.getByRole('button', { name: 'Save to My Parts' }));
    await waitFor(async () =>
      expect((await loadPacks(db)).find((p) => p.id === MY_PARTS_ID)?.parts[0]?.sources).toEqual([
        'https://example.com/spec.pdf',
        'https://shop.example.com/dial',
      ]),
    );
  });
});

describe('uploaded art (Phase 5.2)', () => {
  const dialArt = (diameter: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-15 -15 30 30"><circle r="${diameter / 2}" data-role="primary" fill="#111111"/></svg>`;
  const file = (markup: string, name = 'dial.svg') => new File([markup], name, { type: 'image/svg+xml' });

  async function switchToUpload(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('tab', { name: /Drawing/ }));
    await user.click(screen.getByRole('button', { name: 'Uploaded SVG' }));
  }

  it('refuses an unsafe file and says why, keeping save disabled until there is art', async () => {
    const user = userEvent.setup();
    open('#/part/new?type=dial');
    await switchToUpload(user);

    // Choosing an upload with no file yet is a problem to fix, not something to save.
    expect(screen.getByRole('status').textContent).toBe('1 problem to fix');
    expect(screen.getByRole('button', { name: 'Save to My Parts' })).toHaveProperty('disabled', true);

    await user.upload(screen.getByLabelText('SVG file'), file(dialArt(28.5).replace('<circle', '<script>x()</script><circle'), 'bad.svg'));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/bad\.svg was not used/);
    expect(alert.textContent).toMatch(/scripts/);
    expect(screen.getByRole('button', { name: 'Save to My Parts' })).toHaveProperty('disabled', true);
  });

  it('draws the upload in the preview, offers its colour roles and saves it into the pack', async () => {
    const user = userEvent.setup();
    open('#/part/new?type=dial');
    await type(user, 'Id', 'dl-drawn');
    await switchToUpload(user);

    await user.upload(screen.getByLabelText('SVG file'), file(dialArt(28.5)));
    await waitFor(() => expect(document.querySelector('[data-layer="dial"][data-art="uploaded"]')).toBeTruthy());
    expect(screen.getByText(/Using dial\.svg/)).toBeTruthy();
    expect(screen.getByLabelText('Primary')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Save to My Parts' }));
    await waitFor(async () => {
      const mine = (await loadPacks(db)).find((p) => p.id === MY_PARTS_ID);
      expect(mine?.parts[0]?.visual).toEqual({ kind: 'svg', assetId: 'dl-drawn' });
      expect(mine?.assets['dl-drawn']?.data).toContain('<circle');
    });

    // Reopened, the part still draws from its stored art.
    cleanup();
    catalog = new Catalog(await loadPacks(db));
    open(`#/part/${MY_PARTS_ID}/dl-drawn`);
    expect(document.querySelector('[data-layer="dial"][data-art="uploaded"]')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: /Drawing/ }));
    expect(screen.getByText(/Using the stored drawing/)).toBeTruthy();
  });

  it('switching back to a template restores it and drops the art on save', async () => {
    const user = userEvent.setup();
    open('#/part/new?type=dial');
    await type(user, 'Id', 'dl-back');
    await switchToUpload(user);
    await user.upload(screen.getByLabelText('SVG file'), file(dialArt(28.5)));
    await user.click(screen.getByRole('button', { name: 'Template' }));

    expect((screen.getByLabelText('Template') as HTMLSelectElement).value).toBe('dial/generated');
    await user.click(screen.getByRole('button', { name: 'Save to My Parts' }));
    await waitFor(async () => {
      const mine = (await loadPacks(db)).find((p) => p.id === MY_PARTS_ID);
      expect(mine?.parts[0]?.visual.kind).toBe('template');
      expect(mine?.assets).toEqual({});
    });
  });

  it('warns about hands art without the groups it needs', async () => {
    const user = userEvent.setup();
    open('#/part/new?type=hands');
    await switchToUpload(user);
    const art = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 20 20"><g id="hour"><path d="M0 0V-6"/></g></svg>';
    await user.upload(screen.getByLabelText('SVG file'), file(art, 'hands.svg'));

    const warnings = await screen.findByRole('list', { name: 'Drawing warnings' });
    expect(warnings.textContent).toContain('<g id="minute">');
    expect(screen.getByRole('tab', { name: /Drawing/ }).textContent).toMatch(/1$/);
  });
});
