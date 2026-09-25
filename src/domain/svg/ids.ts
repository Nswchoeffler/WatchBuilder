/**
 * Namespacing for uploaded art, per `docs/svg-canvas-spec.md` §7.
 *
 * Every watch on a page shares one DOM, so two uploads that both define `id="g"` would collide and
 * the second one's gradient would win for both. The renderer gives each part's art its own prefix
 * before it goes into the document.
 *
 * Only ids the file actually defines are rewritten. A reference to an id that isn't there stays as
 * it is: it is already broken, and silently re-pointing it could attach it to another part's node.
 */

/** Ids defined anywhere in the markup. */
export function collectIds(root: Element): Set<string> {
  const ids = new Set<string>();
  const visit = (el: Element) => {
    const id = el.getAttribute('id');
    if (id) ids.add(id);
    for (const child of Array.from(el.children)) visit(child);
  };
  visit(root);
  return ids;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function rewriteRefs(value: string, ids: Set<string>, prefix: string): string {
  let out = value;
  for (const id of ids) {
    const e = escapeRe(id);
    // url(#id) with optional quotes, and a bare #id (href targets).
    out = out.replace(new RegExp(`url\\(\\s*(['"]?)#${e}\\1\\s*\\)`, 'g'), `url(#${prefix}${id})`);
    out = out.replace(new RegExp(`^#${e}$`), `#${prefix}${id}`);
  }
  return out;
}

/**
 * Prefix every id in an already-parsed tree, and every local reference to one.
 * `prefix` is used verbatim, so pass something already unique (e.g. `w3-crown-`).
 */
export function prefixIdsInPlace(root: Element, prefix: string): void {
  if (!prefix) return;
  const ids = collectIds(root);
  if (ids.size === 0) return;

  const visit = (el: Element) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name === 'id') {
        el.setAttribute('id', `${prefix}${attr.value}`);
        continue;
      }
      const next = rewriteRefs(attr.value, ids, prefix);
      if (next !== attr.value) el.setAttribute(attr.name, next);
    }
    for (const child of Array.from(el.children)) visit(child);
  };
  visit(root);
}

/** String wrapper around {@link prefixIdsInPlace}. Returns the input unchanged if it won't parse. */
export function prefixSvgIds(svg: string, prefix: string): string {
  if (!prefix) return svg;
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || doc.getElementsByTagName('parsererror').length > 0) return svg;
  if (collectIds(root).size === 0) return svg;

  prefixIdsInPlace(root, prefix);
  return new XMLSerializer().serializeToString(root);
}
