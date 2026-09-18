import { createContext, useContext, type ReactNode } from 'react';
import type { Catalog } from '../../data/catalog';
import type { ModWatchDB } from '../../storage/db';

interface AppServices {
  db: ModWatchDB;
  catalog: Catalog;
  /** Re-read every pack from storage; call after writing parts or packs. */
  reloadCatalog: () => Promise<void>;
}

const AppContext = createContext<AppServices | null>(null);

export function AppProvider({ db, catalog, reloadCatalog, children }: AppServices & { children: ReactNode }) {
  return <AppContext.Provider value={{ db, catalog, reloadCatalog }}>{children}</AppContext.Provider>;
}

export function useApp(): AppServices {
  const services = useContext(AppContext);
  if (!services) throw new Error('useApp must be used inside <AppProvider>');
  return services;
}
