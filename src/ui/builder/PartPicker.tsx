import { useMemo, useState, type KeyboardEvent } from 'react';
import type { Catalog } from '../../data/catalog';
import type { Candidate } from '../../domain/rules';
import type { Build, Confidence, PartRef, Slot } from '../../domain/schemas';
import { SLOT_LABELS, summarize } from '../labels';
import { useCandidates } from './useCandidates';

interface Props {
  slot: Slot;
  build: Pick<Build, 'slots' | 'flags'>;
  catalog: Catalog;
  onPick: (ref: PartRef) => void;
  /** Hover/focus preview; null when the pointer leaves the list. */
  onPreview: (ref: PartRef | null) => void;
}

const sameRef = (a: PartRef | undefined, b: PartRef) => a?.packId === b.packId && a?.partId === b.partId;

export function PartPicker({ slot, build, catalog, onPick, onPreview }: Props) {
  const candidates = useCandidates(slot, build, catalog);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  const [pack, setPack] = useState('');
  const [confidence, setConfidence] = useState<Confidence | ''>('');

  const selected = build.slots[slot];
  const packs = useMemo(() => [...new Set(candidates.map((c) => c.ref.packId))], [candidates]);

  const matching = candidates.filter((c) => {
    const q = query.trim().toLowerCase();
    if (q && !c.part.name.toLowerCase().includes(q) && !c.part.id.includes(q)) return false;
    if (pack && c.ref.packId !== pack) return false;
    if (confidence && c.part.confidence !== confidence) return false;
    return true;
  });
  // The chosen part always stays visible, even when it no longer fits.
  const visible = showAll ? matching : matching.filter((c) => c.compatibility !== 'incompatible' || sameRef(selected, c.ref));
  const hidden = matching.length - visible.length;

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const rows = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('.candidate')];
    const i = rows.indexOf(document.activeElement as HTMLButtonElement);
    e.preventDefault();
    const next = i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
    rows[next]?.focus();
  };

  return (
    <section aria-label={`${SLOT_LABELS[slot]} picker`}>
      <div className="picker-controls">
        <label className="visually-hidden" htmlFor="picker-search">Search {SLOT_LABELS[slot].toLowerCase()} parts</label>
        <input
          id="picker-search"
          className="input"
          type="search"
          placeholder={`Search ${candidates.length} ${SLOT_LABELS[slot].toLowerCase()} parts…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="picker-filters">
          <div className="toolbar">
            {packs.length > 1 && (
              <select className="input" aria-label="Pack" value={pack} onChange={(e) => setPack(e.target.value)}>
                <option value="">All packs</option>
                {packs.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            <select className="input" aria-label="Confidence" value={confidence} onChange={(e) => setConfidence(e.target.value as Confidence | '')}>
              <option value="">Any confidence</option>
              <option value="verified">Verified</option>
              <option value="community">Community</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
          <label className="switch">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Show all
          </label>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="picker-empty">
          {matching.length === 0 ? 'No parts match.' : `No compatible parts. ${hidden} incompatible hidden. Turn on “Show all” to see why.`}
        </p>
      ) : (
        <ul className="candidates" role="listbox" aria-label={`${SLOT_LABELS[slot]} options`} onKeyDown={onKeyDown} onMouseLeave={() => onPreview(null)}>
          {visible.map((c) => (
            <li key={`${c.ref.packId}/${c.ref.partId}`} role="presentation">
              <CandidateRow candidate={c} selected={sameRef(selected, c.ref)} onPick={onPick} onPreview={onPreview} />
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 && visible.length > 0 && (
        <p className="picker-empty" style={{ padding: '4px 14px 12px' }}>
          {hidden} incompatible {hidden === 1 ? 'part' : 'parts'} hidden
        </p>
      )}
    </section>
  );
}

function CandidateRow({ candidate: c, selected, onPick, onPreview }: { candidate: Candidate<Slot>; selected: boolean; onPick: (ref: PartRef) => void; onPreview: (ref: PartRef | null) => void }) {
  const reasons = c.results.filter((r) => r.severity === 'error' || r.severity === 'warning');
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={`candidate ${c.compatibility}`}
      onClick={() => onPick(c.ref)}
      onMouseEnter={() => onPreview(c.ref)}
      onFocus={() => onPreview(c.ref)}
    >
      <span className="candidate-head">
        <span className="candidate-name">{c.part.name}</span>
        <span className={`badge ${c.part.confidence}`}>{c.part.confidence}</span>
      </span>
      <span className="candidate-specs">{summarize(c.part)}</span>
      {reasons.slice(0, 3).map((r, i) => (
        <span key={i} className={`reason ${r.severity}`}>
          <span className={`dot ${r.severity}`} aria-hidden="true" />
          <span>{r.message}</span>
        </span>
      ))}
    </button>
  );
}
