// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Catalog, loadCorePack } from '../../data/catalog';
import { CORE_PACK_ID } from '../../data/seed';
import { MY_PARTS_ID } from '../../data/userPack';
import { ModWatchDB, loadPacks } from '../../storage/db';
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
});
