import type { Catalog } from '../../data/catalog';
import type { BuildReport, RuleResult, Severity } from '../../domain/rules';
import { ModFlag, type Build, type Slot } from '../../domain/schemas';
import { StatusBadge } from '../common';
import { FLAG_INFO, SLOT_LABELS } from '../labels';
import { partName } from './SlotList';

interface Props {
  build: Pick<Build, 'flags'>;
  report: BuildReport;
  catalog: Catalog;
  onSelectSlot: (slot: Slot) => void;
  onRemoveSlot: (slot: Slot) => void;
  onToggleFlag: (flag: ModFlag) => void;
  onHighlight: (slots: readonly Slot[] | null) => void;
}

const GROUPS: { severity: Severity; title: string }[] = [
  { severity: 'error', title: "Doesn't fit" },
  { severity: 'warning', title: 'Warnings' },
  { severity: 'info', title: 'Notes' },
];

export function CheckPanel({ build, report, catalog, onSelectSlot, onRemoveSlot, onToggleFlag, onHighlight }: Props) {
  const problems = report.results.filter((r) => r.severity !== 'info').length + report.unresolved.length;

  return (
    <section aria-label="Fit check">
      <div className="check-summary">
        <StatusBadge status={report.status} />
        <span className="muted" style={{ fontSize: '0.82rem' }}>
          {problems === 0 ? 'No problems found' : `${problems} ${problems === 1 ? 'problem' : 'problems'}`}
        </span>
      </div>

      {report.missingSlots.length > 0 && (
        <>
          <p className="eyebrow check-group-title">Still needed</p>
          <div className="missing">
            {report.missingSlots.map((slot) => (
              <button key={slot} type="button" className="btn small" onClick={() => onSelectSlot(slot)}>
                Add a {SLOT_LABELS[slot].toLowerCase()}
              </button>
            ))}
          </div>
        </>
      )}

      {report.unresolved.length > 0 && (
        <>
          <p className="eyebrow check-group-title">Missing parts</p>
          <ul className="findings">
            {report.unresolved.map((u) => (
              <li key={u.slot} className="finding">
                <span className="dot error" aria-hidden="true" />
                <div>
                  {SLOT_LABELS[u.slot]}: <span className="mono">{partName(catalog, u.ref)}</span>{' '}
                  {u.reason === 'missing' ? 'is not in any installed pack.' : 'is the wrong type of part.'}
                  <div className="finding-meta">
                    <button type="button" className="btn small" onClick={() => onRemoveSlot(u.slot)}>Remove</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {GROUPS.map(({ severity, title }) => {
        const items = report.results.filter((r) => r.severity === severity);
        if (!items.length) return null;
        return (
          <div key={severity}>
            <p className="eyebrow check-group-title">{title}</p>
            <ul className="findings" onMouseLeave={() => onHighlight(null)}>
              {items.map((r, i) => (
                <FindingRow key={`${r.ruleId}-${i}`} result={r} onHighlight={onHighlight} />
              ))}
            </ul>
          </div>
        );
      })}

      {report.results.length === 0 && report.unresolved.length === 0 && (
        <p className="all-clear">Every rule that applies to the chosen parts passes.</p>
      )}

      <ModsPanel build={build} report={report} onToggleFlag={onToggleFlag} />
    </section>
  );
}

function FindingRow({ result: r, onHighlight }: { result: RuleResult; onHighlight: Props['onHighlight'] }) {
  return (
    <li
      className="finding"
      tabIndex={0}
      onMouseEnter={() => onHighlight(r.slots)}
      onFocus={() => onHighlight(r.slots)}
      onBlur={() => onHighlight(null)}
    >
      <span className={`dot ${r.severity}`} aria-hidden="true" />
      <div>
        {r.message}
        <div className="finding-meta">
          <span className="mono">{r.ruleId}</span>
          <span className="mono">· {r.slots.map((s) => SLOT_LABELS[s].toLowerCase()).join(', ')}</span>
          {r.appliedFix && <span className="badge neutral">fixed by {FLAG_INFO[r.appliedFix].label.toLowerCase()}</span>}
        </div>
      </div>
    </li>
  );
}

/** Flags a finding suggests, plus any already on (marked "not needed" if nothing uses them). */
export function ModsPanel({ build, report, onToggleFlag }: Pick<Props, 'build' | 'report' | 'onToggleFlag'>) {
  const suggested = new Set(report.results.flatMap((r) => [r.fix, r.appliedFix]).filter((f): f is ModFlag => Boolean(f)));
  const shown = ModFlag.options.filter((f) => suggested.has(f) || build.flags.includes(f));
  if (!shown.length) return null;
  return (
    <div className="mods">
      <p className="eyebrow">Modifications</p>
      {shown.map((flag) => {
        const on = build.flags.includes(flag);
        const unused = on && report.unusedFlags.includes(flag);
        return (
          <label key={flag} className="mod switch">
            <span>
              {FLAG_INFO[flag].label} {unused && <span className="badge neutral">not needed</span>}
              <small>{FLAG_INFO[flag].description}</small>
            </span>
            <input type="checkbox" checked={on} onChange={() => onToggleFlag(flag)} aria-label={FLAG_INFO[flag].label} />
          </label>
        );
      })}
    </div>
  );
}
