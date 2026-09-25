import type { ReactNode } from 'react';
import { Logo } from '../common';
import { href, type Route } from './route';

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const section = route.name === 'catalog' || route.name === 'packs' || route.name === 'part' || route.name === 'part-new' ? 'catalog' : 'builds';
  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href={href.builds()}>
          <Logo />
          <span className="brand-name">
            Mod <em>Watch</em> Builder
          </span>
        </a>
        <nav className="nav" aria-label="Main">
          <a href={href.builds()} aria-current={section === 'builds' ? 'page' : undefined}>Builds</a>
          <a href={href.catalog()} aria-current={section === 'catalog' ? 'page' : undefined}>Parts</a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
