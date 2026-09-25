import DOMPurify from 'dompurify';

/**
 * Upload sanitiser for part art, per `docs/svg-canvas-spec.md` §4.
 *
 * The spec rejects unsafe uploads rather than quietly cleaning them, so the checks here walk the
 * parsed tree and collect readable reasons. DOMPurify then runs as a backstop: if it still finds
 * something to remove, our walker missed it and we refuse the file rather than store it.
 */

export const MAX_UPLOAD_BYTES = 512 * 1024;

/** How far the viewBox centre may sit from the origin, in mm. */
export const CENTRE_TOLERANCE_MM = 0.5;

/** Spec §4 allow-list. Anything outside it is rejected by name. */
export const ALLOWED_ELEMENTS = new Set([
  'svg', 'g', 'defs', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'pattern',
  'use', 'title', 'desc',
]);

/** Called out in the spec, so they get a specific message instead of "not allowed". */
const NAMED_REJECTIONS: Record<string, string> = {
  script: 'scripts',
  foreignObject: 'foreignObject',
  iframe: 'iframes',
  image: 'bitmap images',
  set: 'animation',
  animate: 'animation',
  animateTransform: 'animation',
  animateMotion: 'animation',
};

export type ViewBox = [number, number, number, number];

export type SanitizeResult =
  | { ok: true; svg: string; viewBox: ViewBox }
  | { ok: false; errors: string[] };

const byteLength = (s: string): number => new TextEncoder().encode(s).length;

/** Parse "x y w h"; null when it is missing or not four finite numbers with a positive extent. */
export function parseViewBox(value: string | null): ViewBox | null {
  if (!value) return null;
  const parts = value.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [, , w, h] = parts as ViewBox;
  if (w <= 0 || h <= 0) return null;
  return parts as ViewBox;
}

/** Spec §4: the drawing must be centred on the origin, because the renderer places it by its centre. */
export function isCentred([x, y, w, h]: ViewBox): boolean {
  return Math.abs(x + w / 2) <= CENTRE_TOLERANCE_MM && Math.abs(y + h / 2) <= CENTRE_TOLERANCE_MM;
}

const isLocalRef = (value: string): boolean => value.trim().startsWith('#');

/** `url(#local)` is fine; `url(http…)`, `url(data:…)` and bare external paths are not. */
function externalUrlRefs(value: string): string[] {
  const out: string[] = [];
  for (const m of value.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi)) {
    const target = m[2] ?? '';
    if (!isLocalRef(target)) out.push(m[0]);
  }
  return out;
}

function checkAttributes(el: Element, errors: string[]): void {
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    const value = attr.value;

    if (name.startsWith('on')) {
      errors.push(`<${el.localName}> has an event handler (${attr.name}); scripts are not allowed.`);
      continue;
    }

    if (name === 'href' || name === 'xlink:href' || attr.localName === 'href') {
      if (!isLocalRef(value)) {
        errors.push(`<${el.localName}> links to "${value.slice(0, 60)}"; only local #references are allowed.`);
      }
      continue;
    }

    if (/^\s*javascript:/i.test(value)) {
      errors.push(`<${el.localName}> has a javascript: value in ${attr.name}.`);
      continue;
    }

    for (const ref of externalUrlRefs(value)) {
      errors.push(`<${el.localName}> references an external resource in ${attr.name}: ${ref.slice(0, 60)}.`);
    }

    if (/@import/i.test(value)) {
      errors.push(`<${el.localName}> uses @import in ${attr.name}; external styles are not allowed.`);
    }
  }
}

function walk(el: Element, errors: string[], seenIds: Set<string>): void {
  const tag = el.localName;
  const named = NAMED_REJECTIONS[tag];
  if (named) {
    errors.push(`<${tag}> is not allowed (${named}).`);
    // Don't descend: everything inside is rejected with it, and one reason reads better than ten.
    return;
  }
  if (!ALLOWED_ELEMENTS.has(tag)) {
    errors.push(`<${tag}> is not an allowed element.`);
    return;
  }

  const id = el.getAttribute('id');
  if (id) {
    if (seenIds.has(id)) errors.push(`Duplicate id "${id}"; ids must be unique within the file.`);
    seenIds.add(id);
  }

  checkAttributes(el, errors);
  for (const child of Array.from(el.children)) walk(child, errors, seenIds);
}

/**
 * Validate and clean uploaded SVG art. On success the returned markup is re-serialised from the
 * parsed tree — the original string is never stored.
 */
export function sanitizeSvg(input: string): SanitizeResult {
  const size = byteLength(input);
  if (size > MAX_UPLOAD_BYTES) {
    return { ok: false, errors: [`File is ${Math.round(size / 1024)} KB; the limit is ${MAX_UPLOAD_BYTES / 1024} KB.`] };
  }
  if (!input.trim()) return { ok: false, errors: ['File is empty.'] };

  const doc = new DOMParser().parseFromString(input, 'image/svg+xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { ok: false, errors: ['File is not valid XML, so it could not be read as an SVG.'] };
  }

  const root = doc.documentElement;
  if (!root || root.localName !== 'svg') {
    return { ok: false, errors: [`Root element is <${root?.localName ?? 'nothing'}>; an uploaded part must be an <svg>.`] };
  }

  const errors: string[] = [];

  const viewBox = parseViewBox(root.getAttribute('viewBox'));
  if (!viewBox) {
    errors.push('The <svg> needs a viewBox of four numbers, e.g. viewBox="-20 -20 40 40".');
  } else if (!isCentred(viewBox)) {
    errors.push(
      `viewBox "${viewBox.join(' ')}" is not centred on the origin: the drawing's centre must be (0,0) ` +
        `within ${CENTRE_TOLERANCE_MM}mm.`,
    );
  }

  // Style elements are already off the allow-list, but @import can also hide in a CDATA block.
  if (/@import/i.test(input)) errors.push('The file uses @import; external styles are not allowed.');

  walk(root, errors, new Set());

  if (errors.length > 0) return { ok: false, errors: dedupe(errors) };

  // Backstop. Anything DOMPurify still wants to remove means the walk above has a hole in it.
  //
  // `USE_PROFILES` overrides any ALLOWED_TAGS we pass, so the allow-list above is ours alone and
  // this pass only has to catch what the walk missed. `use` has to be added back: DOMPurify lists
  // it in `svgDisallowed` because <use href="https://…"> can pull in a foreign document. The spec
  // allows it (the strap and hand files need it), and it is safe here only because `checkAttributes`
  // has already rejected every href that isn't a local #fragment — so there is nothing external
  // left to point at. Don't relax that check without removing this.
  const clean = DOMPurify.sanitize(root, {
    IN_PLACE: true,
    USE_PROFILES: { svg: true },
    ADD_TAGS: ['use'],
    ADD_ATTR: ['data-role', 'href'],
  }) as unknown as Element;

  if (DOMPurify.removed.length > 0) {
    return { ok: false, errors: ['The file contains markup that could not be made safe.'] };
  }

  return { ok: true, svg: new XMLSerializer().serializeToString(clean), viewBox: viewBox! };
}

const dedupe = (xs: string[]): string[] => [...new Set(xs)];
