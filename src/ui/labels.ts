import type { ModFlag, Part, PartType, Slot } from '../domain/schemas';
import type { BuildStatus } from '../domain/rules';

/** Slot order in the builder: the case drives everything, then inside-out, then outside. */
export const SLOT_ORDER: readonly Slot[] = [
  'case',
  'movement',
  'dial',
  'hands',
  'chapterRing',
  'bezel',
  'bezelInsert',
  'crystal',
  'crown',
  'strap',
];

export const SLOT_LABELS: Record<Slot, string> = {
  movement: 'Movement',
  case: 'Case',
  dial: 'Dial',
  hands: 'Hands',
  chapterRing: 'Chapter ring',
  bezel: 'Bezel',
  bezelInsert: 'Bezel insert',
  crystal: 'Crystal',
  crown: 'Crown',
  strap: 'Strap',
};

export const TYPE_LABELS: Record<PartType, string> = {
  movement: 'Movements',
  case: 'Cases',
  dial: 'Dials',
  hands: 'Hands',
  chapterRing: 'Chapter rings',
  bezel: 'Bezels',
  bezelInsert: 'Bezel inserts',
  crystal: 'Crystals',
  crown: 'Crowns',
  strap: 'Straps',
};

export const STATUS_LABELS: Record<BuildStatus, string> = {
  valid: 'Fits',
  warnings: 'Warnings',
  incomplete: 'Incomplete',
  invalid: "Doesn't fit",
};

export const FLAG_INFO: Record<ModFlag, { label: string; description: string }> = {
  'dial-dots': { label: 'Dial dots', description: 'Clip the dial feet and fix the dial with adhesive dots.' },
  'movement-spacer': { label: 'Movement spacer', description: 'Seat the movement in a spacer ring made for this case.' },
  'day-wheel-swap': { label: 'Day wheel swap', description: "Fit a day wheel indexed for this case's crown position." },
};

/** One-line key measurements for a part. */
export function summarize(part: Part): string {
  switch (part.type) {
    case 'movement':
      return `${part.kind} · Ø${part.diameter} × ${part.height} · posts ${part.handPosts.hour}/${part.handPosts.minute}/${part.handPosts.seconds ?? '–'}${part.handPosts.gmt ? ` GMT ${part.handPosts.gmt}` : ''}`;
    case 'case':
      return `Ø${part.diameter} · L2L ${part.lugToLug} · ${part.lugWidth ? `lugs ${part.lugWidth}` : 'integrated'} · dial ${part.dialSeat.min}–${part.dialSeat.max}`;
    case 'dial':
      return `Ø${part.diameter} · ${part.feetSystem} feet · ${part.dateWindow ? 'date' : 'no date'}${part.dayWindow ? ' + day' : ''}${part.openHeartAperture ? ' · open heart' : ''}`;
    case 'hands':
      return `holes ${part.holes.hour}/${part.holes.minute}/${part.holes.seconds ?? '–'}${part.holes.gmt ? ` GMT ${part.holes.gmt}` : ''}`;
    case 'chapterRing':
      return `${part.outerDiameter} × ${part.innerDiameter} · h ${part.height}`;
    case 'bezel':
      return `seat ${part.seat} · ${part.action}${part.insert ? ` · insert ${part.insert.outerDiameter} × ${part.insert.innerDiameter}` : ' · no insert'}`;
    case 'bezelInsert':
      return `${part.outerDiameter} × ${part.innerDiameter} · ${part.profile} · ${part.scale}`;
    case 'crystal':
      return `Ø${part.diameter} × ${part.thickness} · ${part.shape}${part.magnifier ? ' · magnifier' : ''}`;
    case 'crown':
      return `tube ${part.tube} · Ø${part.diameter}`;
    case 'strap':
      return `${part.kind} · ${part.width ? `${part.width}mm` : 'integrated'}`;
  }
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return 'just now';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 30) return relative.format(Math.round(seconds / 86400), 'day');
  return new Date(iso).toLocaleDateString();
}
