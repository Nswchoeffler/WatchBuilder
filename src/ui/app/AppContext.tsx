import { createContext, useContext, type ReactNode } from 'react';
import type { Catalog } from '../../data/catalog';
import type { ModWatchDB } from '../../storage/db';

interface AppServices {
  db: ModWatchDB;
  catalog: Catalog;
}

const AppContext = createContext<AppServices | null>(null);

export function AppProvider({ db, catalog, children }: AppServices & { children: ReactNode }) {
  return <AppContext.Provider value={{ db, catalog }}>{children}</AppContext.Provider>;
}

export function useApp(): AppServices {
  const services = useContext(AppContext);
  if (!services) throw new Error('useApp must be used inside <AppProvider>');
  return services;
}
