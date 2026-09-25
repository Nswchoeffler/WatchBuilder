import { useState } from 'react';
import { CORE_PACK_ID } from '../../data/seed';
import { PART_TYPES, type PartType } from '../../domain/schemas';
import { useApp } from '../app/AppContext';
import { href } from '../app/route';
import { icons, SourceLinks } from '../common';
import { summarize, TYPE_LABELS } from '../labels';

export function CatalogView() {
  const { catalog } = useApp();
  const [type, setType] = useState<PartType>('movement');
  const entries = catalog.list(type);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{catalog.packs.map((p) => `${p.name} v${p.version}`).join(' · ')}</p>
          <h1>Parts catalog</h1>
          <p className="muted">Every part the fit checks know about, with how sure we are of its measurements.</p>
        </div>
        <div className="toolbar">
          <a className="btn" href={href.packs()}>Packs</a>
          <a className="btn primary" href={href.newPart()}>{icons.plus} New part</a>
        </div>
      </header>

      <nav className="chips" aria-label="Part types">
        {PART_TYPES.map((t) => (
          <button key={t} type="button" aria-pressed={t === type} onClick={() => setType(t)}>
            {TYPE_LABELS[t]}
            <span className="count">{catalog.list(t).length}</span>
          </button>
        ))}
      </nav>

      <ul className="part-list">
        {entries.map(({ ref, part }) => {
          const core = ref.packId === CORE_PACK_ID;
          return (
            <li key={`${ref.packId}/${ref.partId}`} className="part-item">
              <div className="part-item-head">
                <strong>{part.name}</strong>
                <span className={`badge ${part.confidence}`}>{part.confidence}</span>
              </div>
              <p className="specs">{summarize(part)}</p>
              {part.notes && <p className="notes">{part.notes}</p>}
              <SourceLinks sources={part.sources} />
              <div className="part-item-actions">
                {!core && <span className="badge neutral">{ref.packId}</span>}
                <a className="btn small" href={href.part(ref.packId, ref.partId)}>
                  {core ? 'View' : 'Edit'}
                </a>
                <a className="btn small" href={href.newPart(part.type, `${ref.packId}/${ref.partId}`)}>
                  Duplicate
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
