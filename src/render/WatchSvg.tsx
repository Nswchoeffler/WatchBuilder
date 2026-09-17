import { useId, type ReactNode } from 'react';
import type { ResolvedParts } from '../domain/rules';
import type { Part, PartOf, PartType } from '../domain/schemas';
import { computeLayout, viewBoxFor, type Framing } from './layout';
import { bezelTemplates, chapterRingTemplates, crownTemplates, insertTemplates } from './templates/bezel';
import { caseTemplates } from './templates/case';
import { url, type RenderCtx, type Template } from './templates/common';
import { CrystalLayer } from './templates/crystal';
import { DateWindow, dialStyle, dialTemplates } from './templates/dial';
import { handsTemplates } from './templates/hands';
import { STRAP_KIND_DEFAULT, strapDrawers, strapGeometry } from './templates/strap';
import { DISPLAY_TIME, paramsOf, type DisplayTime } from './util';

export interface WatchSvgProps {
  parts: ResolvedParts;
  time?: DisplayTime;
  framing?: Framing;
  /** Override the framed viewBox, e.g. to draw several watches at the same scale. */
  viewBox?: readonly [number, number, number, number];
  /** Deterministic id prefix (tests/exports). Defaults to a React id. */
  idPrefix?: string;
  title?: string;
  className?: string;
}

const REGISTRIES = {
  case: caseTemplates,
  bezel: bezelTemplates,
  bezelInsert: insertTemplates,
  chapterRing: chapterRingTemplates,
  crown: crownTemplates,
  dial: dialTemplates,
  hands: handsTemplates,
} as const;

const DEFAULT_TEMPLATE = {
  case: 'case/sub',
  bezel: 'bezel/coin-edge',
  bezelInsert: 'bezelInsert/dive',
  chapterRing: 'chapterRing/plain',
  crown: 'crown/knurled',
  dial: 'dial/generated',
  hands: 'hands/sword',
} as const;

type Registered = keyof typeof REGISTRIES;

/**
 * Template for a part. Unknown template names and uploaded-SVG visuals (rendered in Phase 5)
 * fall back to the type's default template, flagged with data-fallback.
 */
function templateFor<T extends Registered>(type: T, part: Part): { Tpl: Template<T>; fallback: string | null } {
  const registry = REGISTRIES[type] as unknown as Record<string, Template<T>>;
  const visual = part.visual;
  if (visual.kind === 'template' && registry[visual.template]) return { Tpl: registry[visual.template]!, fallback: null };
  const fallback = visual.kind === 'svg' ? 'svg-pending' : `unknown-template:${visual.template}`;
  return { Tpl: registry[DEFAULT_TEMPLATE[type]]!, fallback };
}

function Layer<T extends Registered>({ type, part, ctx, transform }: { type: T; part: PartOf<T> | undefined; ctx: RenderCtx; transform?: string }) {
  if (!part) return null;
  const base = part as Part;
  const { Tpl, fallback } = templateFor(type, base);
  return (
    <g data-layer={type} data-part={base.id} data-fallback={fallback ?? undefined} transform={transform}>
      <Tpl part={part} params={paramsOf(base.visual)} ctx={ctx} />
    </g>
  );
}

function StrapLayer({ part, ctx, viewTop }: { part: PartOf<'strap'> | undefined; ctx: RenderCtx; viewTop: number }) {
  if (!part) return null;
  const visual = part.visual;
  const known = visual.kind === 'template' && strapDrawers[visual.template];
  const draw = known ? strapDrawers[visual.template]! : strapDrawers[STRAP_KIND_DEFAULT[part.kind] ?? 'strap/nato']!;
  const props = { part, params: paramsOf(visual), ctx };
  const g = strapGeometry(props, viewTop);
  const topId = ctx.id('strap-top');
  const fallback = known ? undefined : visual.kind === 'svg' ? 'svg-pending' : `unknown-template:${visual.template}`;
  return (
    <g data-layer="strap" data-part={part.id} data-fallback={fallback}>
      <g id={topId}>{draw(props, g, ctx.layout.springBarY)}</g>
      <use href={`#${topId}`} transform="scale(1 -1)" />
    </g>
  );
}

export function WatchSvg({ parts, time = DISPLAY_TIME, framing = 'watch', viewBox, idPrefix, title, className }: WatchSvgProps) {
  const reactId = useId();
  const prefix = idPrefix ?? `w${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const layout = computeLayout(parts);
  const [vx, vy, vw, vh] = viewBox ?? viewBoxFor(layout, framing);
  const ctx: RenderCtx = { layout, parts, id: (name) => `${prefix}-${name}`, time };
  const dialClip = ctx.id('dial-clip');

  let magnified: ReactNode = null;
  if (parts.dial && parts.crystal?.magnifier) {
    const s = dialStyle(paramsOf(parts.dial.visual));
    magnified = <DateWindow dial={parts.dial} r={parts.dial.diameter / 2} opts={{ date: 17, day: 'SUN', wheel: s.wheel, metal: s.metal }} />;
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${vx} ${vy} ${vw} ${vh}`}
      className={className}
      role="img"
      aria-label={title ?? 'Watch mockup'}
      data-mm-width={vw}
      data-mm-height={vh}
    >
      <title>{title ?? 'Watch mockup'}</title>
      <defs>
        <clipPath id={dialClip}>
          <circle r={layout.bezelInnerRadius} />
        </clipPath>
      </defs>
      <StrapLayer part={parts.strap} ctx={ctx} viewTop={vy} />
      <Layer type="crown" part={parts.crown} ctx={ctx} transform={`rotate(${layout.crownAngle - 90})`} />
      <Layer type="case" part={parts.case} ctx={ctx} />
      <Layer type="bezel" part={parts.bezel} ctx={ctx} />
      <Layer type="bezelInsert" part={parts.bezelInsert} ctx={ctx} />
      <g clipPath={url(dialClip)}>
        <Layer type="dial" part={parts.dial} ctx={ctx} />
        <Layer type="chapterRing" part={parts.chapterRing} ctx={ctx} />
      </g>
      <Layer type="hands" part={parts.hands} ctx={ctx} />
      {parts.crystal && (
        <g data-layer="crystal" data-part={parts.crystal.id}>
          <CrystalLayer part={parts.crystal} params={paramsOf(parts.crystal.visual)} ctx={ctx} magnified={magnified} />
        </g>
      )}
    </svg>
  );
}

export const LAYER_ORDER: readonly PartType[] = ['strap', 'crown', 'case', 'bezel', 'bezelInsert', 'dial', 'chapterRing', 'hands', 'crystal'];
