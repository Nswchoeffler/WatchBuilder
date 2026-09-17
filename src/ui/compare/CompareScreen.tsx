import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, type ReactNode } from 'react';
import type { Catalog } from '../../data/catalog';
import { evaluate, resolveParts, type BuildReport, type ResolvedParts } from '../../domain/rules';
import type { Build } from '../../domain/schemas';
import { computeLayout, sharedViewBox } from '../../render/layout';
import { useApp } from '../app/AppContext';
import { href } from '../app/route';
import { StatusBadge, WatchStage } from '../common';
import { FLAG_INFO, SLOT_LABELS, SLOT_ORDER } from '../labels';

interface Column {
  build: Build;
  parts: ResolvedParts;
  report: BuildReport;
}

interface Row {
  label: string;
  values: ReactNode[];
  /** Comparable text per column, to highlight differences. */
  keys: string[];
}

const mm = (n: number | null | undefined) => (n == null ? '–' : `${n} mm`);

export function compareRows(columns: readonly Column[], catalog: Catalog): { specs: Row[]; slots: Row[] } {
  const row = (label: string, get: (c: Column) => string): Row => {
    const keys = columns.map(get);
    return { label, values: keys, keys };
  };
  const specs = [
    row('Case diameter', (c) => mm(c.parts.case?.diameter)),
    row('Lug to lug', (c) => mm(c.parts.case?.lugToLug)),
    row('Lug width', (c) => (c.parts.case ? (c.parts.case.lugWidth ? mm(c.parts.case.lugWidth) : 'Integrated') : '–')),
    row('Thickness', (c) => mm(c.parts.case?.thickness)),
    row('Movement', (c) => (c.parts.movement ? `${c.parts.movement.maker} ${c.parts.movement.caliber}` : '–')),
    row('Mods', (c) => (c.build.flags.length ? c.build.flags.map((f) => FLAG_INFO[f].label).join(', ') : 'None')),
  ];
  const slots = SLOT_ORDER.filter((slot) => columns.some((c) => c.build.slots[slot])).map((slot) =>
    row(SLOT_LABELS[slot], (c) => {
      const ref = c.build.slots[slot];
      return ref ? (catalog.get(ref)?.name ?? 'Missing part') : '–';
    }),
  );
  return { specs, slots };
}

export function CompareScreen({ ids }: { ids: string[] }) {
  const { db, catalog } = useApp();
  const builds = useLiveQuery(() => db.builds.bulkGet(ids), [db, ids.join(',')]);

  const columns = useMemo<Column[]>(
    () =>
      (builds ?? [])
        .filter((b): b is Build => Boolean(b))
        .map((build) => ({ build, parts: resolveParts(build, catalog).parts, report: evaluate(build, catalog) })),
    [builds, catalog],
  );

  if (!builds) return <div className="center-message muted">Loading…</div>;
  if (columns.length < 2) {
    return (
      <div className="center-message">
        <h2>Pick two or three builds</h2>
        <p className="muted">Select builds in your library, then choose Compare.</p>
        <a className="btn" href={href.builds()}>Back to builds</a>
      </div>
    );
  }

  const viewBox = sharedViewBox(columns.map((c) => computeLayout(c.parts)), 'watch');
  const { specs, slots } = compareRows(columns, catalog);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Side by side, same scale</p>
          <h1>Compare</h1>
        </div>
        <a className="btn" href={href.builds()}>Back to builds</a>
      </header>

      <div className="compare-grid" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
        {columns.map((c) => (
          <article key={c.build.id} className="compare-col">
            <WatchStage parts={c.parts} viewBox={viewBox} title={c.build.name} />
            <div className="compare-col-head">
              <h3><a href={href.build(c.build.id)} style={{ textDecoration: 'none' }}>{c.build.name}</a></h3>
              <StatusBadge status={c.report.status} />
            </div>
          </article>
        ))}
      </div>

      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <td />
              {columns.map((c) => <th key={c.build.id} scope="col">{c.build.name}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr className="group"><th colSpan={columns.length + 1} className="eyebrow">Key specs</th></tr>
            {specs.map((r) => <CompareRow key={r.label} row={r} />)}
            <tr className="group"><th colSpan={columns.length + 1} className="eyebrow">Parts</th></tr>
            {slots.map((r) => <CompareRow key={r.label} row={r} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompareRow({ row }: { row: Row }) {
  const differs = new Set(row.keys).size > 1;
  return (
    <tr>
      <th scope="row">{row.label}</th>
      {row.values.map((v, i) => (
        <td key={i} className={differs ? 'differs' : undefined}>{v}</td>
      ))}
    </tr>
  );
}
