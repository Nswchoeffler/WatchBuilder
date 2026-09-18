// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Catalog, loadCorePack } from '../../data/catalog';
import { newBuild } from '../../data/builds';
import { evaluate } from '../../domain/rules';
import type { Build, PartRef } from '../../domain/schemas';
import { getBuild, ModWatchDB, saveBuild } from '../../storage/db';
import { AppProvider } from '../app/AppContext';
import { BuilderScreen } from './BuilderScreen';
import { PartPicker } from './PartPicker';
import { AUTOSAVE_MS } from './useBuildDraft';

const catalog = new Catalog([loadCorePack()]);
const core = (partId: string): PartRef => ({ packId: 'core', partId });

let db: ModWatchDB;
let n = 0;

beforeEach(async () => {
  db = new ModWatchDB(`ui-test-${n++}`);
  await db.open();
});

afterEach(async () => {
  cleanup();
  await db.delete();
});

async function openBuilder(build: Build) {
  await saveBuild(db, build);
  render(
    <AppProvider db={db} catalog={catalog} reloadCatalog={async () => {}}>
      <BuilderScreen id={build.id} />
    </AppProvider>,
  );
  await screen.findByLabelText('Build name');
}

const options = () => [...document.querySelectorAll('.candidate .candidate-name')].map((o) => o.textContent);

describe('PartPicker', () => {
  const build = { slots: { case: core('cs-diver42-38'), movement: core('mv-nh35') }, flags: [] };

  it('hides incompatible parts by default and shows them with a reason under "Show all"', () => {
    render(<PartPicker slot="dial" build={build} catalog={catalog} onPick={() => {}} onPreview={() => {}} />);
    expect(options()).toContain('Diver Black');
    expect(options()).not.toContain('Tapisserie Blue');
    expect(screen.getByText(/incompatible part(s)? hidden/)).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Show all'));
    const row = screen.getByRole('option', { name: /Tapisserie Blue/ });
    expect(row.className).toContain('incompatible');
    expect(row.querySelector('.reason.error')?.textContent).toMatch(/\w/);
    // Incompatible parts sort last.
    expect(options().at(-1)).not.toBe('Diver Black');
  });

  it('filters by search text', () => {
    render(<PartPicker slot="dial" build={build} catalog={catalog} onPick={() => {}} onPreview={() => {}} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'DIVER B' } });
    expect(options()).toEqual(['Diver Black']);
  });
});

describe('BuilderScreen', () => {
  it('assembles a build from empty and autosaves it', async () => {
    const build = newBuild('From scratch');
    await openBuilder(build);

    // Starts on the case picker.
    fireEvent.click(screen.getByRole('option', { name: /Diver 42 \(crown 3\.8\)/ }));
    await waitFor(() => expect(screen.getByLabelText(/^Case: Diver 42/)).toBeTruthy());
    // Filling an empty slot moves on to the next required one.
    expect(screen.getByRole('tab', { name: 'Movement' })).toBeTruthy();

    await waitFor(async () => expect((await getBuild(db, build.id))?.slots.case).toEqual(core('cs-diver42-38')), { timeout: AUTOSAVE_MS * 4 });
  });

  it('undoes and redoes a slot change', async () => {
    await openBuilder(newBuild('Undo me', { case: core('cs-sub40') }));
    fireEvent.click(screen.getByRole('button', { name: /Clear Case/ }));
    expect(screen.getByLabelText(/^Case: Empty/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText(/^Case: Sub-style 40/)).toBeTruthy();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(screen.getByLabelText(/^Case: Empty/)).toBeTruthy();
  });

  it('NH36 day-date in a 3.8 case warns about the day offset until the day wheel is swapped', async () => {
    const slots = {
      case: core('cs-diver42-38'), movement: core('mv-nh36'), dial: core('dl-diver-daydate'), hands: core('hd-nh-sword'),
      bezel: core('bz-diver42-sloped'), bezelInsert: core('in-diver42-dive-blue'), chapterRing: core('cr-diver42-black'),
      crystal: core('cy-diver42-flat'), crown: core('cw-diver42'), strap: core('st-jubilee-22'),
    };
    expect(evaluate({ slots, flags: [] }, catalog).status).toBe('warnings');
    await openBuilder(newBuild('Day-date', slots));

    fireEvent.click(screen.getByRole('tab', { name: /Fit check/ }));
    expect(screen.getByText(/day sits 2\.\d° off-centre/)).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Day wheel swap'));
    expect(screen.queryByText(/Warnings/i, { selector: '.check-group-title' })).toBeNull();
    expect(screen.getByText('Fits')).toBeTruthy();
    expect(screen.getByText(/fixed by day wheel swap/)).toBeTruthy();
  });

  it('"Add a …" links open the matching picker', async () => {
    await openBuilder(newBuild('Partial', { case: core('cs-sub40') }));
    fireEvent.click(screen.getByRole('tab', { name: /Fit check/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add a dial' }));
    expect(screen.getByRole('tab', { name: 'Dial', selected: true })).toBeTruthy();
    expect(screen.getByRole('listbox', { name: 'Dial options' })).toBeTruthy();
  });

  it('renames inline and persists the name', async () => {
    const build = newBuild('Old name');
    await openBuilder(build);
    fireEvent.change(screen.getByLabelText('Build name'), { target: { value: 'New name' } });
    await act(() => new Promise((r) => setTimeout(r, AUTOSAVE_MS + 200)));
    expect((await getBuild(db, build.id))?.name).toBe('New name');
  });
});
