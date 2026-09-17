import type { KeyboardEvent } from 'react';
import type { Catalog } from '../../data/catalog';
import type { BuildReport, ResolvedParts } from '../../domain/rules';
import type { Build, Slot } from '../../domain/schemas';
import { icons } from '../common';
import { SLOT_LABELS, SLOT_ORDER } from '../labels';

export type SlotHealth = 'error' | 'warning' | 'ok' | 'empty';

/** Worst finding that involves a slot. */
export function slotHealth(slot: Slot, build: Pick<Build, 'slots'>, report: BuildReport): SlotHealth {
  if (report.unresolved.some((u) => u.slot === slot)) return 'error';
  if (!build.slots[slot]) return 'empty';
  const touching = report.results.filter((r) => r.slots.includes(slot));
  if (touching.some((r) => r.severity === 'error')) return 'error';
  if (touching.some((r) => r.severity === 'warning')) return 'warning';
  return 'ok';
}

interface Props {
  build: Build;
  parts: ResolvedParts;
  report: BuildReport;
  required: readonly Slot[];
  active: Slot;
  highlight: readonly Slot[];
  onSelect: (slot: Slot) => void;
  onClear: (slot: Slot) => void;
}

export function SlotList({ build, parts, report, required, active, highlight, onSelect, onClear }: Props) {
  // Arrow keys move between slots.
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-slot-button]')];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    buttons[(i + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
  };

  return (
    <nav className="panel" aria-label="Slots">
      <ul className="slot-list" onKeyDown={onKeyDown}>
        {SLOT_ORDER.map((slot) => {
          const ref = build.slots[slot];
          const part = parts[slot];
          const health = slotHealth(slot, build, report);
          const isRequired = required.includes(slot);
          const value = part ? part.name : ref ? 'Missing part' : 'Empty';
          return (
            <li
              key={slot}
              className={`slot${slot === active ? ' active' : ''}${highlight.includes(slot) ? ' highlight' : ''}`}
              onClick={() => onSelect(slot)}
            >
              <span className={`dot ${health === 'empty' ? '' : health}`} aria-hidden="true" />
              <button
                type="button"
                className="slot-button"
                data-slot-button
                aria-current={slot === active ? 'true' : undefined}
                aria-label={`${SLOT_LABELS[slot]}: ${value}${isRequired && !ref ? ' (required)' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(slot);
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span className="slot-label">
                    {SLOT_LABELS[slot]}
                    {isRequired && !ref && <span className="req">required</span>}
                  </span>
                  <span className={`slot-value${ref ? '' : ' empty-value'}`} style={{ display: 'block' }}>
                    {value}
                  </span>
                </span>
              </button>
              {ref ? (
                <button
                  type="button"
                  className="btn ghost icon small slot-clear"
                  aria-label={`Clear ${SLOT_LABELS[slot]}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear(slot);
                  }}
                >
                  {icons.close}
                </button>
              ) : (
                <span />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Part name lookup that survives deleted packs. */
export const partName = (catalog: Catalog, ref: { packId: string; partId: string }) => catalog.get(ref)?.name ?? `${ref.packId}/${ref.partId}`;
