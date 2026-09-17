import { useState } from 'react';
import type { Catalog } from '../data/catalog';
import { PART_TYPES, type Part, type PartType } from '../domain/schemas';

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

export function CatalogView({ catalog }: { catalog: Catalog }) {
  const [type, setType] = useState<PartType>('movement');
  const entries = catalog.list(type);

  return (
    <>
      <nav className="tabs" aria-label="Part types">
        {PART_TYPES.map((t) => (
          <button key={t} aria-pressed={t === type} onClick={() => setType(t)}>
            {TYPE_LABELS[t]} <span className="count">{catalog.list(t).length}</span>
          </button>
        ))}
      </nav>

      <ul className="parts">
        {entries.map(({ ref, part }) => (
          <li key={`${ref.packId}/${ref.partId}`}>
            <div className="part-head">
              <strong>{part.name}</strong>
              <span className={`badge ${part.confidence}`}>{part.confidence}</span>
            </div>
            <code className="muted">{part.id}</code>
            <p className="specs">{summarize(part)}</p>
            {part.notes && <p className="muted notes">{part.notes}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}

function summarize(part: Part): string {
  switch (part.type) {
    case 'movement':
      return `${part.kind} · Ø${part.diameter} × ${part.height}mm · posts ${part.handPosts.hour}/${part.handPosts.minute}/${part.handPosts.seconds ?? '–'}${part.handPosts.gmt ? ` GMT ${part.handPosts.gmt}` : ''}`;
    case 'case':
      return `Ø${part.diameter} · L2L ${part.lugToLug} · ${part.lugWidth ? `lugs ${part.lugWidth}` : 'integrated'} · crown steps ${part.crownSteps} · dial ${part.dialSeat.min}–${part.dialSeat.max}`;
    case 'dial':
      return `Ø${part.diameter} · feet ${part.feetSystem} [${part.crownSteps.join(', ')}] · ${part.dateWindow ? 'date' : 'no date'}${part.dayWindow ? ' + day' : ''}${part.openHeartAperture ? ' · open heart' : ''}`;
    case 'hands':
      return `holes ${part.holes.hour}/${part.holes.minute}/${part.holes.seconds ?? '–'}${part.holes.gmt ? ` GMT ${part.holes.gmt}` : ''}`;
    case 'chapterRing':
      return `${part.outerDiameter} × ${part.innerDiameter} · h ${part.height}`;
    case 'bezel':
      return `seat ${part.seat} · ${part.action}${part.insert ? ` · insert ${part.insert.outerDiameter} × ${part.insert.innerDiameter} ${part.insert.profile}` : ' · no insert'}`;
    case 'bezelInsert':
      return `${part.outerDiameter} × ${part.innerDiameter} · ${part.profile} · ${part.scale}`;
    case 'crystal':
      return `Ø${part.diameter} × ${part.thickness} · ${part.shape}${part.magnifier ? ' · magnifier' : ''}`;
    case 'crown':
      return `tube ${part.tube} · Ø${part.diameter}`;
    case 'strap':
      return `${part.kind} · ${part.width ? `${part.width}mm` : `integrated (${part.integratedProfile})`}`;
  }
}
