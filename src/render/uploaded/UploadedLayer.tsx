import { useMemo } from 'react';
import type { Role, Slot } from '../../domain/schemas';
import type { RenderCtx } from '../templates/common';
import { f, handAngles } from '../util';
import { prepareArt } from './prepare';

/**
 * Draws a part's uploaded art, placed per `docs/svg-canvas-spec.md` §2.
 *
 * Most parts are drawn about the dial centre and need no placement at all — the art is already in
 * millimetres on the scene's grid. Only the parts the spec gives a different origin need work:
 * hands rotate to the display time, the strap sits on the spring bars, and the crown moves out to
 * the case edge (the scene has already rotated it to the crown angle).
 */

/** Spec §2: one file holds every hand, each drawn pointing at 12. */
const HAND_GROUPS = ['hour', 'minute', 'seconds', 'gmt'] as const;
/** Spec §2: the two halves of a strap or bracelet. */
const STRAP_GROUPS = ['top', 'bottom'] as const;

const groupsFor = (type: Slot): readonly string[] =>
  type === 'hands' ? HAND_GROUPS : type === 'strap' ? STRAP_GROUPS : [];

const Inject = ({ html, transform }: { html: string; transform?: string }) => (
  <g transform={transform} dangerouslySetInnerHTML={{ __html: html }} />
);

export interface UploadedLayerProps {
  type: Slot;
  art: string;
  colors?: Partial<Record<Role, string>>;
  ctx: RenderCtx;
}

export function UploadedLayer({ type, art, colors, ctx }: UploadedLayerProps) {
  const prefix = ctx.id(`${type}-art-`);
  const prepared = useMemo(
    () => prepareArt(art, { prefix, colors, groupIds: groupsFor(type) }),
    [art, prefix, colors, type],
  );
  if (!prepared) return null;

  const { rest, groups } = prepared;

  if (type === 'hands') {
    const a = handAngles(ctx.time);
    const named = HAND_GROUPS.filter((g) => groups[g]);
    // Art with no hand groups is still worth drawing, just unrotated, rather than showing nothing.
    if (named.length === 0) return <Inject html={rest} />;
    return (
      <g>
        <Inject html={rest} />
        {named.map((g) => (
          <Inject key={g} html={groups[g]!} transform={`rotate(${f(a[g])})`} />
        ))}
      </g>
    );
  }

  if (type === 'strap') {
    const { springBarY } = ctx.layout;
    return (
      <g>
        <Inject html={rest} />
        {groups.top && <Inject html={groups.top} transform={`translate(0 ${f(springBarY)})`} />}
        {groups.bottom ? (
          <Inject html={groups.bottom} transform={`translate(0 ${f(-springBarY)})`} />
        ) : (
          // Spec §2 expects both halves; mirroring the top is better than half a strap.
          groups.top && <Inject html={groups.top} transform={`translate(0 ${f(-springBarY)}) scale(1 -1)`} />
        )}
      </g>
    );
  }

  // The scene already rotated the crown to the crown angle; the art's origin is the stem exit.
  const transform = type === 'crown' ? `translate(${f(ctx.layout.caseRadius)} 0)` : undefined;
  return <Inject html={rest} transform={transform} />;
}
