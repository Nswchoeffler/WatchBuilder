import type { Role } from '../../domain/schemas';
import { prefixIdsInPlace } from '../../domain/svg/ids';

/**
 * Turns stored art into markup the scene can inject, per `docs/svg-canvas-spec.md` §3 and §7.
 *
 * The root `<svg>` is dropped and its children are re-wrapped in a `<g>`: a nested `<svg>` would
 * open a new viewport with its own viewBox, and the drawing would be rescaled off the
 * 1-unit-per-mm grid everything else on the scene is drawn to. Presentation attributes from the
 * root move onto that `<g>` so inherited fills and strokes still apply.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface PreparedArt {
  /** Injectable markup for everything that isn't one of `groupIds`. */
  rest: string;
  /** Injectable markup per requested group, keyed by its unprefixed id. Missing groups are absent. */
  groups: Partial<Record<string, string>>;
}

export interface PrepareOptions {
  /** Unique per part per render, so two uploads can't clobber each other's ids. */
  prefix: string;
  /** Role colours from the part's visual settings. */
  colors?: Partial<Record<Role, string>>;
  /** Groups to pull out for separate placement, e.g. `['hour', 'minute']`. */
  groupIds?: readonly string[];
}

/** Root attributes describing the viewport rather than how the art looks. */
const STRUCTURAL = new Set(['viewbox', 'width', 'height', 'version', 'x', 'y', 'preserveaspectratio', 'id', 'class']);

const isStructural = (name: string) => {
  const n = name.toLowerCase();
  return STRUCTURAL.has(n) || n.startsWith('xmlns');
};

/**
 * Spec §3: a role-tagged element takes its colour from the part's settings. An element drawn as an
 * outline (`fill="none"`) is recoloured on its stroke instead, so outlines don't fill in.
 */
function applyRoles(root: Element, colors: Partial<Record<Role, string>> | undefined): void {
  if (!colors) return;
  const visit = (el: Element) => {
    const role = el.getAttribute('data-role') as Role | null;
    const c = role ? colors[role] : undefined;
    if (c) {
      if (el.getAttribute('fill') === 'none') el.setAttribute('stroke', c);
      else el.setAttribute('fill', c);
    }
    for (const child of Array.from(el.children)) visit(child);
  };
  visit(root);
}

/** Find a descendant by id and detach it from the tree. */
function takeById(root: Element, id: string): Element | null {
  const visit = (el: Element): Element | null => {
    for (const child of Array.from(el.children)) {
      if (child.getAttribute('id') === id) return child;
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  const found = visit(root);
  found?.parentNode?.removeChild(found);
  return found;
}

/** Serialise nodes inside a <g> carrying the root's presentation attributes. */
function wrapped(doc: Document, nodes: readonly Node[], attrs: readonly Attr[]): string {
  const g = doc.createElementNS(SVG_NS, 'g');
  for (const a of attrs) g.setAttribute(a.name, a.value);
  for (const n of nodes) g.appendChild(n);
  return new XMLSerializer().serializeToString(g);
}

/** Null when the art won't parse; the caller falls back to the part's default template. */
export function prepareArt(markup: string, { prefix, colors, groupIds = [] }: PrepareOptions): PreparedArt | null {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length > 0) return null;

  applyRoles(root, colors);
  // Prefix before extracting, so references from a group into <defs> still line up afterwards.
  prefixIdsInPlace(root, prefix);

  const attrs = Array.from(root.attributes).filter((a) => !isStructural(a.name));

  const groups: Partial<Record<string, string>> = {};
  for (const id of groupIds) {
    const el = takeById(root, `${prefix}${id}`);
    if (el) groups[id] = wrapped(doc, [el], attrs);
  }

  return { rest: wrapped(doc, Array.from(root.childNodes), attrs), groups };
}
