import { useEffect, useMemo, useRef, type ReactNode, type SVGProps } from 'react';
import type { Catalog } from '../data/catalog';
import { evaluate, resolveParts, type BuildReport, type BuildStatus } from '../domain/rules';
import type { Build, Slot } from '../domain/schemas';
import type { Framing } from '../render/layout';
import { WatchSvg } from '../render/WatchSvg';
import { STATUS_LABELS } from './labels';

// ── Icons (24px grid, stroke = currentColor) ────────────────────────────────

const Icon = ({ children, ...props }: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {children}
  </svg>
);

export const icons = {
  plus: <Icon><path d="M12 5v14M5 12h14" /></Icon>,
  undo: <Icon><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Icon>,
  redo: <Icon><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></Icon>,
  copy: <Icon><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></Icon>,
  download: <Icon><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Icon>,
  trash: <Icon><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Icon>,
  close: <Icon><path d="M6 6l12 12M18 6 6 18" /></Icon>,
  back: <Icon><path d="M15 18l-6-6 6-6" /></Icon>,
  compare: <Icon><rect x="3" y="4" width="7" height="16" rx="2" /><rect x="14" y="4" width="7" height="16" rx="2" /></Icon>,
  search: <Icon><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Icon>,
  watch: (
    <Icon strokeWidth={1.4}>
      <circle cx="12" cy="12" r="6" />
      <path d="M9 6.8 9.6 2h4.8l.6 4.8M9 17.2l.6 4.8h4.8l.6-4.8M18 12h1.5" />
      <path d="M12 9v3l2 1.2" />
    </Icon>
  ),
};

/** Brand mark: a bezel with minute track and a lume pip at 12. */
export function Logo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="9.5" fill="currentColor" opacity="0.14" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="16" y1="3.6" x2="16" y2={i % 3 === 0 ? 6.4 : 5.2} stroke="currentColor" strokeWidth={i % 3 === 0 ? 1.6 : 1} transform={`rotate(${i * 30} 16 16)`} />
      ))}
      <path d="M16 16 16 9.2M16 16l4.2 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="16" r="1.3" fill="currentColor" />
    </svg>
  );
}

// ── Status ──────────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: BuildStatus }) {
  return <span className={`status ${status}`}>{STATUS_LABELS[status]}</span>;
}

/** Evaluate a stored build against the catalog (memoised on the build's content). */
export function useEvaluation(build: Pick<Build, 'slots' | 'flags'>, catalog: Catalog) {
  return useMemo(() => {
    const report: BuildReport = evaluate(build, catalog);
    const { parts } = resolveParts(build, catalog);
    return { report, parts, art: catalog.artFor(build.slots) };
  }, [build, catalog]);
}

// ── Watch stage ─────────────────────────────────────────────────────────────

interface StageProps {
  parts: ReturnType<typeof resolveParts>['parts'];
  framing?: Framing;
  viewBox?: readonly [number, number, number, number];
  title: string;
  /** Uploaded art by slot, from `Catalog.artFor`. */
  art?: Partial<Record<Slot, string>>;
  /** Dim every layer except these. */
  highlight?: readonly Slot[];
  className?: string;
  children?: ReactNode;
}

export function WatchStage({ parts, art, framing = 'watch', viewBox, title, highlight, className = '', children }: StageProps) {
  const empty = Object.keys(parts).length === 0;
  const lit = highlight?.length ? highlight.map((s) => `[data-layer="${s}"]`).join(',') : null;
  return (
    <div className={`stage ${className}`} data-highlight={lit ? '' : undefined}>
      {lit && <style>{`.stage[data-highlight] [data-layer]{opacity:.18} .stage[data-highlight] :is(${lit}){opacity:1}`}</style>}
      {empty ? <EmptyWatch /> : <WatchSvg parts={parts} art={art} framing={framing} viewBox={viewBox} title={title} />}
      {children}
    </div>
  );
}

function EmptyWatch() {
  return (
    <svg viewBox="-30 -36 60 72" role="img" aria-label="Empty build">
      <g fill="none" stroke="var(--faint)" strokeWidth="0.3" strokeDasharray="1.2 1">
        <circle r="20" />
        <circle r="14.5" />
        <path d="M-10 -19 -9 -34 M10 -19 9 -34 M-10 19 -9 34 M10 19 9 34" />
      </g>
      <text y="1.2" textAnchor="middle" fontSize="3" fill="var(--muted)" fontFamily="var(--font-ui)">
        Pick a case to start
      </text>
    </svg>
  );
}

// ── Dialogs ─────────────────────────────────────────────────────────────────

/** Native modal <dialog>, opened and closed from props. Escape calls onClose. */
export function Modal({ open, onClose, labelledBy, children }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {open && children}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} labelledBy="confirm-title">
      <h3 id="confirm-title">{title}</h3>
      <p>{message}</p>
      <div className="toolbar">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn primary" onClick={onConfirm} autoFocus>{confirmLabel}</button>
      </div>
    </Modal>
  );
}
