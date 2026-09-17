import { useState } from 'react';
import { useCatalog } from './storage/useCatalog';
import { CatalogView } from './ui/CatalogView';
import { GalleryView } from './ui/GalleryView';

type View = 'gallery' | 'catalog';

export function App() {
  const state = useCatalog();
  const [view, setView] = useState<View>('gallery');

  if (state.status === 'loading') return <main className="app">Loading catalog…</main>;
  if (state.status === 'error') {
    return (
      <main className="app">
        <h1>Catalog failed to load</h1>
        <pre className="error">{state.error.message}</pre>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>Mod Watch Builder</h1>
          <p className="muted">
            Catalog: {state.catalog.packs.map((p) => `${p.name} v${p.version}`).join(', ')}
          </p>
        </div>
        <nav className="tabs" aria-label="Views">
          <button aria-pressed={view === 'gallery'} onClick={() => setView('gallery')}>
            Gallery
          </button>
          <button aria-pressed={view === 'catalog'} onClick={() => setView('catalog')}>
            Parts catalog
          </button>
        </nav>
      </header>
      {view === 'gallery' ? <GalleryView catalog={state.catalog} /> : <CatalogView catalog={state.catalog} />}
    </main>
  );
}
