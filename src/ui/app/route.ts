import type { PartType } from '../../domain/schemas';

export type Route =
  | { name: 'builds' }
  | { name: 'build'; id: string }
  | { name: 'compare'; ids: string[] }
  | { name: 'catalog' }
  | { name: 'packs' }
  | { name: 'share'; code: string }
  | { name: 'part-new'; type: PartType | null; from: string | null }
  | { name: 'part'; packId: string; partId: string }
  | { name: 'not-found'; path: string };

/** Parse `location.hash` (with or without the leading `#`). Empty → library. */
export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const [path = '', query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(query);

  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'builds')) return { name: 'builds' };
  if (parts.length === 1 && parts[0] === 'catalog') return { name: 'catalog' };
  if (parts.length === 1 && parts[0] === 'packs') return { name: 'packs' };
  if (parts.length === 2 && parts[0] === 'share') return { name: 'share', code: parts[1]! };
  if (parts.length === 2 && parts[0] === 'build') return { name: 'build', id: parts[1]! };
  if (parts.length === 1 && parts[0] === 'compare') {
    const ids = (params.get('ids') ?? '').split(',').filter(Boolean);
    return { name: 'compare', ids: [...new Set(ids)] };
  }
  // The editor: `#/part/new?type=dial` for a blank part, `#/part/<pack>/<id>` for an existing one.
  if (parts.length === 2 && parts[0] === 'part' && parts[1] === 'new') {
    return { name: 'part-new', type: (params.get('type') as PartType | null) ?? null, from: params.get('from') };
  }
  if (parts.length === 3 && parts[0] === 'part') return { name: 'part', packId: parts[1]!, partId: parts[2]! };
  return { name: 'not-found', path: raw };
}

const q = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => e[1] !== undefined));
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const href = {
  builds: () => '#/builds',
  build: (id: string) => `#/build/${encodeURIComponent(id)}`,
  compare: (ids: readonly string[]) => `#/compare?ids=${ids.map(encodeURIComponent).join(',')}`,
  catalog: () => '#/catalog',
  packs: () => '#/packs',
  share: (code: string) => `#/share/${code}`,
  /** `from` is a `packId/partId` pair to copy measurements from. */
  newPart: (type?: PartType, from?: string) => `#/part/new${q({ type, from })}`,
  part: (packId: string, partId: string) => `#/part/${encodeURIComponent(packId)}/${encodeURIComponent(partId)}`,
};

export function navigate(to: string): void {
  window.location.hash = to;
}
