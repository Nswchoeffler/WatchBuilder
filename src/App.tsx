import { useEffect } from 'react';
import { AppProvider } from './ui/app/AppContext';
import { Layout } from './ui/app/Layout';
import { Router } from './ui/app/Router';
import { useHashRoute } from './ui/app/useHashRoute';
import { db, useCatalog } from './storage/useCatalog';

export function App() {
  const state = useCatalog();
  const route = useHashRoute();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name]);

  return (
    <Layout route={route}>
      {state.status === 'loading' && <div className="center-message muted">Loading catalog…</div>}
      {state.status === 'error' && (
        <div className="center-message">
          <h2>Catalog failed to load</h2>
          <pre className="error-text">{state.error.message}</pre>
        </div>
      )}
      {state.status === 'ready' && (
        <AppProvider db={db} catalog={state.catalog}>
          <Router route={route} />
        </AppProvider>
      )}
    </Layout>
  );
}
