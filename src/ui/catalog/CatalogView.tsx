import { useState } from 'react';
import { PART_TYPES, type PartType } from '../../domain/schemas';
import { useApp } from '../app/AppContext';
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
        {entries.map(({ ref, part }) => (
          <li key={`${ref.packId}/${ref.partId}`} className="part-item">
            <div className="part-item-head">
              <strong>{part.name}</strong>
              <span className={`badge ${part.confidence}`}>{part.confidence}</span>
            </div>
            <p className="specs">{summarize(part)}</p>
            {part.notes && <p className="notes">{part.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
