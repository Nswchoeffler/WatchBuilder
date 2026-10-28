// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Catalog, loadCorePack } from '../../data/catalog';
import type { PartRef } from '../../domain/schemas';
import { PartPicker } from './PartPicker';

const core = (partId: string): PartRef => ({ packId: 'core', partId });
const build = { slots: { case: core('cs-diver42-38'), movement: core('mv-nh35') }, flags: [] };

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

/** A stand-in IntersectionObserver that records what each row asked to watch and lets a test scroll rows into view. */
function stubObserver() {
  const watched = new Map<Element, Callback>();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private cb: Callback) {}
      observe(el: Element) {
        watched.set(el, this.cb);
      }
      disconnect() {}
    },
  );
  return { watched, reveal: (el: Element) => act(() => watched.get(el)!([{ isIntersecting: true }])) };
}

const mount = (catalog = new Catalog([loadCorePack()])) =>
  render(<PartPicker slot="dial" build={build} catalog={catalog} onPick={() => {}} onPreview={() => {}} />);
const drawn = () => document.querySelectorAll('.candidate-thumb svg');

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PartPicker thumbnails', () => {
  it('leaves placeholders, and still works, where IntersectionObserver is missing', () => {
    expect(typeof IntersectionObserver).toBe('undefined');
    mount();
    const rows = document.querySelectorAll('.candidate');
    expect(rows.length).toBeGreaterThan(5);
    expect(document.querySelectorAll('.candidate-thumb').length).toBe(rows.length);
    expect(drawn().length).toBe(0);
  });

  it('draws a thumbnail only once its row scrolls into view, as the candidate on the current build', () => {
    const { watched, reveal } = stubObserver();
    mount();
    expect(watched.size).toBeGreaterThan(5);
    expect(drawn().length).toBe(0);

    const first = document.querySelector('.candidate-thumb')!;
    reveal(first);
    expect(drawn().length).toBe(1);
    const svg = first.querySelector('svg')!;
    expect(svg.querySelector('[data-layer="case"]')).toBeTruthy();
    expect(svg.querySelector('[data-layer="dial"]')).toBeTruthy();
    expect(first.getAttribute('aria-hidden')).toBe('true');
  });

  it('draws a candidate that comes from an upload with its art', () => {
    const base = loadCorePack();
    const dial = base.parts.find((p) => p.type === 'dial')!;
    const mine = {
      ...base,
      id: 'mine',
      parts: [{ ...dial, id: 'dl-drawn', name: 'Drawn Dial', visual: { kind: 'svg' as const, assetId: 'a' } }],
      assets: { a: { mime: 'image/svg+xml' as const, data: '<circle r="9"/>' } },
    };
    const { reveal } = stubObserver();
    mount(new Catalog([base, mine]));
    const row = screen.getByRole('option', { name: /Drawn Dial/ });
    reveal(row.querySelector('.candidate-thumb')!);
    expect(row.querySelector('[data-layer="dial"][data-art="uploaded"]')).toBeTruthy();
  });

  it('keeps arrow-key navigation between rows', () => {
    mount();
    const rows = [...document.querySelectorAll<HTMLButtonElement>('.candidate')];
    rows[0]!.focus();
    fireEvent.keyDown(document.querySelector('.candidates')!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(rows[1]);
  });
});
