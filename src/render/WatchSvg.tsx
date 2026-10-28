import { useId, type ReactNode } from 'react';
import type { ResolvedParts } from '../domain/rules';
import type { Part, PartOf, PartType, Slot } from '../domain/schemas';
import { UploadedLayer } from './uploaded/UploadedLayer';
import { computeLayout, viewBoxFor, type Framing } from './layout';
import { bezelTemplates, chapterRingTemplates, crownTemplates, insertTemplates } from './templates/bezel';
import { caseTemplates } from './templates/case';
import { url, type RenderCtx, type Template } from './templates/common';
import { CrystalLayer } from './templates/crystal';
import { DateWindow, dialStyle, dialTemplates } from './templates/dial';
import { handsTemplates } from './templates/hands';
import { STRAP_KIND_DEFAULT, strapDrawers, strapGeometry } from './templates/strap';
import { DISPLAY_TIME, optionalColor, paramsOf, type DisplayTime } from './util';

export interface WatchSvgProps {
  parts: ResolvedParts;
  /**
   * Sanitized art for parts whose visual is an upload, by slot. Parts are referenced pack-scoped,
   * so the caller resolves `assetId` against the owning pack and passes the markup in; a slot with
   * no entry falls back to the type's default template.
   */
  art?: Partial<Record<Slot, string>>;
  time?: DisplayTime;
  framing?: Framing;
  /** Night view: the watch in the dark, with its lume glowing. */
  night?: boolean;
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

function Layer<T extends Registered>({ type, part, ctx, transform, art }: { type: T; part: PartOf<T> | undefined; ctx: RenderCtx; transform?: string; art?: string }) {
  if (!part) return null;
  const base = part as Part;
  if (base.visual.kind === 'svg' && art) {
    return (
      <g data-layer={type} data-part={base.id} data-art="uploaded" transform={transform}>
        <UploadedLayer type={type} art={art} colors={base.visual.colors} ctx={ctx} />
      </g>
    );
  }
  const { Tpl, fallback } = templateFor(type, base);
  return (
    <g data-layer={type} data-part={base.id} data-fallback={fallback ?? undefined} transform={transform}>
      <Tpl part={part} params={paramsOf(base.visual)} ctx={ctx} />
    </g>
  );
}

function StrapLayer({ part, ctx, viewTop, art }: { part: PartOf<'strap'> | undefined; ctx: RenderCtx; viewTop: number; art?: string }) {
  if (!part) return null;
  const visual = part.visual;
  if (visual.kind === 'svg' && art) {
    return (
      <g data-layer="strap" data-part={part.id} data-art="uploaded">
        <UploadedLayer type="strap" art={art} colors={visual.colors} ctx={ctx} />
      </g>
    );
  }
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

/** Every layer of the watch, back to front. Drawn once by day, twice at night (see `WatchSvg`). */
function WatchLayers({ parts, art, ctx, viewTop }: { parts: ResolvedParts; art?: Partial<Record<Slot, string>>; ctx: RenderCtx; viewTop: number }) {
  const { layout } = ctx;
  const dialClip = ctx.id('dial-clip');

  let magnified: ReactNode = null;
  if (parts.dial && parts.crystal?.magnifier) {
    const s = dialStyle(paramsOf(parts.dial.visual));
    magnified = <DateWindow dial={parts.dial} r={parts.dial.diameter / 2} opts={{ date: 17, day: 'SUN', wheel: s.wheel, metal: s.metal }} />;
  }

  return (
    <>
      <defs>
        <clipPath id={dialClip}>
          <circle r={layout.bezelInnerRadius} />
        </clipPath>
      </defs>
      <StrapLayer part={parts.strap} ctx={ctx} viewTop={viewTop} art={art?.strap} />
      <Layer type="crown" part={parts.crown} ctx={ctx} transform={`rotate(${layout.crownAngle - 90})`} art={art?.crown} />
      <Layer type="case" part={parts.case} ctx={ctx} art={art?.case} />
      <Layer type="bezel" part={parts.bezel} ctx={ctx} art={art?.bezel} />
      <Layer type="bezelInsert" part={parts.bezelInsert} ctx={ctx} art={art?.bezelInsert} />
      <g clipPath={url(dialClip)}>
        <Layer type="dial" part={parts.dial} ctx={ctx} art={art?.dial} />
        <Layer type="chapterRing" part={parts.chapterRing} ctx={ctx} art={art?.chapterRing} />
      </g>
      <Layer type="hands" part={parts.hands} ctx={ctx} art={art?.hands} />
      {parts.crystal &&
        (parts.crystal.visual.kind === 'svg' && art?.crystal ? (
          <g data-layer="crystal" data-part={parts.crystal.id} data-art="uploaded">
            <UploadedLayer type="crystal" art={art.crystal} colors={parts.crystal.visual.colors} ctx={ctx} />
          </g>
        ) : (
          <g data-layer="crystal" data-part={parts.crystal.id}>
            <CrystalLayer part={parts.crystal} params={paramsOf(parts.crystal.visual)} ctx={ctx} magnified={magnified} />
          </g>
        ))}
    </>
  );
}

export const NIGHT_BACKGROUND = '#0b0c10';

/** Lume glow colours: BGW9 glows blue, C3 (and most other paints) green. */
export const GLOW = { bgw9: '#74d4ff', c3: '#b6ff70' } as const;

/** Lume paint of a part: a template's `lume` setting (null = none), or an upload's `lume` role colour. */
function lumePaint(part: Part): string | null {
  const v = part.visual;
  return v.kind === 'svg' ? (v.colors?.lume ?? '#e8f0d8') : optionalColor(paramsOf(v), 'lume', '#e8f0d8');
}

/** Glow colour for a build, from the lume paint of its dial, else its hands. Blue-tinted paint means BGW9. */
export function glowFor(parts: ResolvedParts): string {
  const paint = [parts.dial, parts.hands]
    .map((p) => (p ? lumePaint(p) : null))
    .find((c): c is string => c !== null);
  if (!paint) return GLOW.c3;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(paint.slice(i, i + 2), 16)) as [number, number, number];
  return b > g && b > r ? GLOW.bgw9 : GLOW.c3;
}

/**
 * Night view stylesheet for the lume pass: everything is hidden except lume, which takes the glow colour,
 * and the hands, which stay as dark silhouettes so they still cover the lume beneath them.
 * CSS rules beat the shapes' fill attributes, so the templates only need to mark lume with `class="lume"`.
 */
const nightCss = (pass: string, glow: string) =>
  `.${pass} *{visibility:hidden}` +
  // A hidden clip shape clips everything away, so clip paths keep their shapes.
  `.${pass} clipPath *{visibility:visible}` +
  `.${pass} [data-layer="hands"] *{visibility:visible;fill:#060708;stroke:#060708}` +
  `.${pass} .lume,.${pass} .lume *{visibility:visible;fill:${glow};stroke:none}`;

export function WatchSvg({ parts, art, time = DISPLAY_TIME, framing = 'watch', night = false, viewBox, idPrefix, title, className }: WatchSvgProps) {
  const reactId = useId();
  const prefix = idPrefix ?? `w${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const layout = computeLayout(parts);
  const [vx, vy, vw, vh] = viewBox ?? viewBoxFor(layout, framing);
  const ctxFor = (p: string): RenderCtx => ({ layout, parts, id: (name) => `${p}-${name}`, time });
  const label = title ?? 'Watch mockup';

  let body: ReactNode = <WatchLayers parts={parts} art={art} ctx={ctxFor(prefix)} viewTop={vy} />;
  if (night) {
    const pass = `${prefix}-lume`;
    body = (
      <>
        <defs>
          {/* Moonlight: very dark, slightly blue. */}
          <filter id={`${prefix}-night-dim`} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="0.08 0 0 0 0  0 0.1 0 0 0  0 0 0.15 0 0  0 0 0 1 0" />
          </filter>
          <filter id={`${prefix}-night-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.35" result="halo" />
            <feMerge>
              <feMergeNode in="halo" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <style>{nightCss(pass, glowFor(parts))}</style>
        {/* Its own dark backdrop, so the stage and both exports show the night view the same way. */}
        <rect x={vx} y={vy} width={vw} height={vh} fill={NIGHT_BACKGROUND} />
        <g filter={url(`${prefix}-night-dim`)}>{body}</g>
        <g className={pass} filter={url(`${prefix}-night-glow`)} aria-hidden="true">
          <WatchLayers parts={parts} art={art} ctx={ctxFor(pass)} viewTop={vy} />
        </g>
      </>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${vx} ${vy} ${vw} ${vh}`}
      className={className}
      role="img"
      aria-label={label}
      data-mm-width={vw}
      data-mm-height={vh}
      data-night={night ? '' : undefined}
    >
      <title>{label}</title>
      {body}
    </svg>
  );
}

export const LAYER_ORDER: readonly PartType[] = ['strap', 'crown', 'case', 'bezel', 'bezelInsert', 'dial', 'chapterRing', 'hands', 'crystal'];
