import type { Part, PartType } from '../../domain/schemas';
import { f } from '../util';
import { prepareArt } from './prepare';

/**
 * Spec §5: after an upload, measure what was drawn and compare it with the measurements entered.
 * A mismatch is a warning, never a rejection — it is there so a drawing made at the wrong scale
 * (pixels instead of millimetres, a 40mm template reused for a 42mm case) gets noticed.
 *
 * Measuring needs a real layout engine (`getBBox`), so `measureArt` returns null where there is
 * none (jsdom, SSR) and the size checks are skipped. The structural checks work anywhere.
 */

/** Spec §5 tolerances, in mm. */
export const SCALE_TOLERANCES = {
  caseWidth: 1.0,
  dialDiameter: 0.3,
  insertOuter: 0.3,
  minuteLength: 0.5,
} as const;

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArtMeasure {
  /** Bounds of everything drawn. */
  overall: Box;
  /** Bounds of each named group that exists, in the art's own coordinates (hands pointing at 12). */
  groups: Partial<Record<string, Box>>;
}

/** The named groups the renderer places separately, per `UploadedLayer`. */
const GROUPS: Partial<Record<PartType, readonly string[]>> = {
  hands: ['hour', 'minute', 'seconds', 'gmt'],
  strap: ['top', 'bottom'],
};

/** Ids of every element in the art. Null when it won't parse. */
export function artIds(markup: string): Set<string> | null {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return null;
  return new Set(Array.from(doc.querySelectorAll('[id]'), (el) => el.getAttribute('id')!));
}

/** Data roles the art uses, so the editor only offers colours that will change something. */
export function artRoles(markup: string): Set<string> {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  return new Set(Array.from(doc.querySelectorAll('[data-role]'), (el) => el.getAttribute('data-role')!));
}

const SVG_NS = 'http://www.w3.org/2000/svg';

type Measurable = SVGGraphicsElement & { getBBox?: () => DOMRect };

const boxOf = (el: Element): Box | null => {
  const g = el as Measurable;
  if (typeof g.getBBox !== 'function') return null;
  const { x, y, width, height } = g.getBBox();
  return { x, y, width, height };
};

/**
 * Lay the art out off-screen and read its bounds. Strokes are not included (that is how `getBBox`
 * works), which matches how measurements are taken: to the edge of the shape, not its outline.
 */
export function measureArt(markup: string, type: PartType): ArtMeasure | null {
  if (typeof document === 'undefined') return null;
  const groupIds = GROUPS[type] ?? [];
  const prepared = prepareArt(markup, { prefix: 'measure-', groupIds });
  if (!prepared) return null;

  const svg = document.createElementNS(SVG_NS, 'svg');
  // Hidden but laid out: `display: none` would make every box empty.
  svg.setAttribute('style', 'position:absolute;left:-10000px;top:0;width:10px;height:10px;visibility:hidden');
  svg.setAttribute('aria-hidden', 'true');
  const all = document.createElementNS(SVG_NS, 'g');
  all.innerHTML = prepared.rest + groupIds.map((id) => prepared.groups[id] ?? '').join('');
  svg.appendChild(all);
  document.body.appendChild(svg);
  try {
    const overall = boxOf(all);
    if (!overall) return null;
    const groups: Partial<Record<string, Box>> = {};
    // `rest` comes first, then each group in `groupIds` order that exists.
    const present = groupIds.filter((id) => prepared.groups[id]);
    const wrappers = Array.from(all.children).slice(all.children.length - present.length);
    present.forEach((id, i) => {
      const b = wrappers[i] && boxOf(wrappers[i]);
      if (b) groups[id] = b;
    });
    return { overall, groups };
  } finally {
    svg.remove();
  }
}

const mm = (n: number) => `${f(n)} mm`;

function sizeWarning(what: string, drawn: number, expected: number, field: string, tolerance: number): string | null {
  if (Math.abs(drawn - expected) <= tolerance) return null;
  return (
    `The drawing's ${what} is ${mm(drawn)}, but the ${field} is ${mm(expected)} (±${tolerance}). ` +
    'Check the file is drawn at 1 unit = 1 mm.'
  );
}

/**
 * Warnings for uploaded art, given the part's measurements. `ids` comes from `artIds`;
 * `measure` from `measureArt`, or null to skip the size checks.
 */
export function artWarnings(part: Part, ids: ReadonlySet<string>, measure: ArtMeasure | null): string[] {
  const out: (string | null)[] = [];
  const t = SCALE_TOLERANCES;

  switch (part.type) {
    case 'hands': {
      const expected = ['hour', 'minute'];
      if (part.lengths.seconds !== null) expected.push('seconds');
      if (part.lengths.gmt !== undefined) expected.push('gmt');
      const missing = expected.filter((g) => !ids.has(g));
      if (missing.length > 0) {
        out.push(
          `No ${missing.map((g) => `<g id="${g}">`).join(', ')} in the file, so ${missing.length === 1 ? 'that hand' : 'those hands'} ` +
            "can't be turned to the time. Each hand needs its own group, drawn pointing at 12.",
        );
      }
      const minute = measure?.groups.minute;
      // Drawn pointing at 12 from the pivot, so the tip is at -y.
      if (minute) out.push(sizeWarning('minute hand length', -minute.y, part.lengths.minute, 'minute hand length', t.minuteLength));
      break;
    }
    case 'strap':
      if (!ids.has('top')) {
        out.push('No <g id="top"> in the file, so the strap is drawn at the dial centre instead of on the spring bars.');
      }
      break;
    case 'case':
      if (measure) out.push(sizeWarning('width', measure.overall.width, part.diameter, 'case diameter', t.caseWidth));
      break;
    case 'dial':
      if (measure) out.push(sizeWarning('diameter', measure.overall.width, part.diameter, 'dial diameter', t.dialDiameter));
      break;
    case 'bezelInsert':
      if (measure) out.push(sizeWarning('outer diameter', measure.overall.width, part.outerDiameter, 'outer diameter', t.insertOuter));
      break;
  }

  return out.filter((w): w is string => w !== null);
}
