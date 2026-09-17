// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, cleanup, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

afterEach(cleanup);

describe('App', () => {
  it('mounts in StrictMode and survives navigation, even where scrollTo returns a promise', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation((() => Promise.resolve()) as typeof window.scrollTo);
    window.location.hash = '#/builds';
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(await screen.findByRole('heading', { name: 'Builds' })).toBeTruthy();

    await act(async () => {
      window.location.hash = '#/catalog';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(await screen.findByRole('heading', { name: 'Parts catalog' })).toBeTruthy();
  });
});
