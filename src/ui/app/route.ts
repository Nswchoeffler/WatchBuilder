export type Route =
  | { name: 'builds' }
  | { name: 'build'; id: string }
  | { name: 'compare'; ids: string[] }
  | { name: 'catalog' }
  | { name: 'not-found'; path: string };

/** Parse `location.hash` (with or without the leading `#`). Empty → library. */
export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const [path = '', query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);

  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'builds')) return { name: 'builds' };
  if (parts.length === 1 && parts[0] === 'catalog') return { name: 'catalog' };
  if (parts.length === 2 && parts[0] === 'build') return { name: 'build', id: parts[1]! };
  if (parts.length === 1 && parts[0] === 'compare') {
    const ids = (new URLSearchParams(query).get('ids') ?? '').split(',').filter(Boolean);
    return { name: 'compare', ids: [...new Set(ids)] };
  }
  return { name: 'not-found', path: raw };
}

export const href = {
  builds: () => '#/builds',
  build: (id: string) => `#/build/${encodeURIComponent(id)}`,
  compare: (ids: readonly string[]) => `#/compare?ids=${ids.map(encodeURIComponent).join(',')}`,
  catalog: () => '#/catalog',
};

export function navigate(to: string): void {
  window.location.hash = to;
}
