import { useCallback, useEffect, useMemo, useState } from 'react';
import { Catalog } from '../data/catalog';
import { ModWatchDB, loadPacks, syncCorePack } from './db';

export const db = new ModWatchDB();

type Loaded = { status: 'loading' } | { status: 'ready'; catalog: Catalog } | { status: 'error'; error: Error };

type State = { status: 'loading' } | { status: 'ready'; catalog: Catalog; reload: () => Promise<void> } | { status: 'error'; error: Error };

/** Sync the bundled core pack into IndexedDB, then expose every stored pack as a Catalog. */
export function useCatalog(): State {
  const [state, setState] = useState<Loaded>({ status: 'loading' });

  /** Re-read every pack; called after parts or packs are written. */
  const reload = useCallback(async () => {
    setState({ status: 'ready', catalog: new Catalog(await loadPacks(db)) });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await syncCorePack(db);
      const catalog = new Catalog(await loadPacks(db));
      if (!cancelled) setState({ status: 'ready', catalog });
    })().catch((error: unknown) => {
      if (!cancelled) setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => (state.status === 'ready' ? { ...state, reload } : state), [state, reload]);
}
