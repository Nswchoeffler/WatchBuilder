import { useEffect, useState } from 'react';
import { Catalog } from '../data/catalog';
import { ModWatchDB, loadPacks, syncCorePack } from './db';

export const db = new ModWatchDB();

type State =
  | { status: 'loading' }
  | { status: 'ready'; catalog: Catalog }
  | { status: 'error'; error: Error };

/** Sync the bundled core pack into IndexedDB, then expose every stored pack as a Catalog. */
export function useCatalog(): State {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await syncCorePack(db);
      const packs = await loadPacks(db);
      if (!cancelled) setState({ status: 'ready', catalog: new Catalog(packs) });
    })().catch((error: unknown) => {
      if (!cancelled) setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
