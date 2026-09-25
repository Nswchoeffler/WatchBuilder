import { useState } from 'react';
import type { Catalog } from '../../data/catalog';
import type { Build } from '../../domain/schemas';
import { icons } from '../common';
import { FLAG_INFO, SLOT_LABELS, SLOT_ORDER } from '../labels';
import { partName } from './SlotList';

interface Row {
  slot: string;
  name: string;
  pack: string;
  confidence: string;
}

export function partsListRows(build: Pick<Build, 'slots'>, catalog: Catalog): Row[] {
  return SLOT_ORDER.flatMap((slot) => {
    const ref = build.slots[slot];
    if (!ref) return [];
    const part = catalog.get(ref);
    return [{ slot: SLOT_LABELS[slot], name: partName(catalog, ref), pack: ref.packId, confidence: part?.confidence ?? 'missing' }];
  });
}

export function partsListText(build: Pick<Build, 'name' | 'slots' | 'flags'>, catalog: Catalog): string {
  const rows = partsListRows(build, catalog);
  const lines = [build.name, '', ...rows.map((r) => `${r.slot}: ${r.name} [${r.pack}, ${r.confidence}]`)];
  if (build.flags.length) lines.push('', `Mods: ${build.flags.map((f) => FLAG_INFO[f].label).join(', ')}`);
  return lines.join('\n');
}

export function PartsList({ build, catalog }: { build: Pick<Build, 'name' | 'slots' | 'flags'>; catalog: Catalog }) {
  const rows = partsListRows(build, catalog);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(partsListText(build, catalog));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!rows.length) return <p className="picker-empty">No parts chosen yet.</p>;

  return (
    <section aria-label="Parts list">
      <table className="bom">
        <thead>
          <tr><th>Slot</th><th>Part</th><th>Source</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slot}>
              <td>{r.slot}</td>
              <td>{r.name}</td>
              <td><span className={`badge ${r.confidence === 'missing' ? 'unverified' : r.confidence}`}>{r.pack}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="toolbar" style={{ padding: 14, justifyContent: 'space-between' }}>
        <span className="muted" style={{ fontSize: '0.82rem' }}>
          {build.flags.length ? `Mods: ${build.flags.map((f) => FLAG_INFO[f].label).join(', ')}` : 'No mods'}
        </span>
        <button type="button" className="btn small" onClick={copy}>
          {icons.copy} {copied ? 'Copied' : 'Copy as text'}
        </button>
      </div>
    </section>
  );
}
