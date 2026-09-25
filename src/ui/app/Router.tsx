import { BuilderScreen } from '../builder/BuilderScreen';
import { CatalogView } from '../catalog/CatalogView';
import { CompareScreen } from '../compare/CompareScreen';
import { PartEditorScreen } from '../editor/PartEditorScreen';
import { LibraryScreen } from '../library/LibraryScreen';
import { PacksScreen } from '../packs/PacksScreen';
import { ShareScreen } from '../share/ShareScreen';
import { href, type Route } from './route';

export function Router({ route }: { route: Route }) {
  switch (route.name) {
    case 'builds':
      return <LibraryScreen />;
    case 'build':
      return <BuilderScreen key={route.id} id={route.id} />;
    case 'compare':
      return <CompareScreen ids={route.ids} />;
    case 'catalog':
      return <CatalogView />;
    case 'packs':
      return <PacksScreen />;
    case 'share':
      return <ShareScreen key={route.code} code={route.code} />;
    case 'part-new':
    case 'part':
      return <PartEditorScreen route={route} />;
    case 'not-found':
      return (
        <div className="center-message">
          <h2>Page not found</h2>
          <a className="btn" href={href.builds()}>Go to builds</a>
        </div>
      );
  }
}
