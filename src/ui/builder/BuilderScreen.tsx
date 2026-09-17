import { useEffect, useMemo, useRef, useState } from 'react';
import { duplicateBuild } from '../../data/builds';
import { evaluate, requiredSlots, resolveParts } from '../../domain/rules';
import type { Build, PartRef, Slot } from '../../domain/schemas';
import type { Framing } from '../../render/layout';
import { deleteBuild, saveBuild } from '../../storage/db';
import { useApp } from '../app/AppContext';
import { href, navigate } from '../app/route';
import { ConfirmDialog, icons, WatchStage } from '../common';
import { exportPng, exportSvg, watchSvgIn } from '../exportWatch';
import { SLOT_LABELS, SLOT_ORDER } from '../labels';
import { CheckPanel } from './CheckPanel';
import { PartPicker } from './PartPicker';
import { PartsList } from './PartsList';
import { SlotList } from './SlotList';
import { useBuildDraft, type SaveState } from './useBuildDraft';

type Tab = 'parts' | 'check' | 'list';

const SAVE_LABEL: Record<SaveState, string> = {
  saved: 'All changes saved',
  pending: 'Saving…',
  saving: 'Saving…',
  error: 'Could not save',
};

export function BuilderScreen({ id }: { id: string }) {
  const { db } = useApp();
  const draft = useBuildDraft(db, id);

  if (draft.status === 'loading') return <div className="center-message muted">Opening build…</div>;
  if (draft.status === 'missing') {
    return (
      <div className="center-message">
        <h2>Build not found</h2>
        <p className="muted">It may have been deleted.</p>
        <a className="btn" href={href.builds()}>Back to builds</a>
      </div>
    );
  }
  return <Builder key={id} draft={draft} />;
}

function Builder({ draft }: { draft: Extract<ReturnType<typeof useBuildDraft>, { status: 'ready' }> }) {
  const { db, catalog } = useApp();
  const { build, dispatch, canUndo, canRedo, saveState, flush } = draft;

  const { parts, report, required } = useMemo(() => {
    const { parts } = resolveParts(build, catalog);
    return { parts, report: evaluate(build, catalog), required: requiredSlots(parts) };
  }, [build, catalog]);

  const [active, setActive] = useState<Slot>(() => SLOT_ORDER.find((slot) => report.missingSlots.includes(slot)) ?? 'case');
  const [tab, setTab] = useState<Tab>('parts');
  const [preview, setPreview] = useState<PartRef | null>(null);
  const [highlight, setHighlight] = useState<readonly Slot[] | null>(null);
  const [framing, setFraming] = useState<Framing>('watch');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exporting, setExporting] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Hovering a candidate shows it in the watch before committing.
  const shownParts = useMemo(() => {
    if (!preview) return parts;
    return resolveParts({ slots: { ...build.slots, [active]: preview }, flags: build.flags }, catalog).parts;
  }, [preview, parts, build, active, catalog]);
  const previewName = preview ? catalog.get(preview)?.name : null;

  const selectSlot = (slot: Slot) => {
    setActive(slot);
    setTab('parts');
    setPreview(null);
  };

  const pick = (ref: PartRef) => {
    dispatch({ type: 'set-slot', slot: active, ref });
    setPreview(null);
    // When filling an empty slot, move on to the next empty required slot.
    if (build.slots[active]) return;
    const nextParts = resolveParts({ slots: { ...build.slots, [active]: ref }, flags: build.flags }, catalog).parts;
    const next = SLOT_ORDER.find((s) => s !== active && !build.slots[s] && requiredSlots(nextParts).includes(s));
    if (next) setActive(next);
  };

  // Undo / redo shortcuts, ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
      } else if (key === 'y') {
        e.preventDefault();
        dispatch({ type: 'redo' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  const duplicate = async () => {
    await flush();
    const copy = duplicateBuild(build);
    await saveBuild(db, copy);
    navigate(href.build(copy.id));
  };

  const remove = async () => {
    setConfirmDelete(false);
    await deleteBuild(db, build.id);
    navigate(href.builds());
  };

  const withSvg = async (fn: (el: SVGSVGElement) => void | Promise<void>) => {
    setPreview(null);
    const el = watchSvgIn(stageRef.current);
    if (!el) return;
    setExporting(true);
    try {
      await fn(el);
    } finally {
      setExporting(false);
    }
  };

  const problemCount = report.results.filter((r) => r.severity === 'error').length + report.unresolved.length;
  const warningCount = report.results.filter((r) => r.severity === 'warning').length;
  const isEmpty = Object.keys(parts).length === 0;

  return (
    <div className="page page-wide">
      <header className="builder-head">
        <div className="name-field">
          <a className="btn ghost icon" href={href.builds()} aria-label="Back to builds">{icons.back}</a>
          <NameInput name={build.name} onRename={(name) => dispatch({ type: 'rename', name })} />
        </div>
        <span className="save-state" role="status">{SAVE_LABEL[saveState]}</span>
        <div className="toolbar">
          <button type="button" className="btn icon" onClick={() => dispatch({ type: 'undo' })} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">{icons.undo}</button>
          <button type="button" className="btn icon" onClick={() => dispatch({ type: 'redo' })} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">{icons.redo}</button>
          <button type="button" className="btn" onClick={duplicate}>{icons.copy} Duplicate</button>
          <button type="button" className="btn" onClick={() => withSvg((el) => exportSvg(el, build.name))} disabled={isEmpty || exporting}>{icons.download} SVG</button>
          <button type="button" className="btn" onClick={() => withSvg((el) => exportPng(el, build.name))} disabled={isEmpty || exporting}>{icons.download} PNG</button>
          <button type="button" className="btn icon danger" onClick={() => setConfirmDelete(true)} aria-label="Delete build" title="Delete build">{icons.trash}</button>
        </div>
      </header>

      <div className="builder">
        <SlotList
          build={build}
          parts={parts}
          report={report}
          required={required}
          active={active}
          highlight={highlight ?? []}
          onSelect={selectSlot}
          onClear={(slot) => dispatch({ type: 'set-slot', slot, ref: undefined })}
        />

        <div className="panel preview" ref={stageRef}>
          <WatchStage parts={shownParts} framing={framing} title={build.name} highlight={preview ? [active] : (highlight ?? undefined)}>
            <div className="preview-tools">
              <div className="segmented" role="group" aria-label="Framing">
                <button type="button" aria-pressed={framing === 'watch'} onClick={() => setFraming('watch')}>Watch</button>
                <button type="button" aria-pressed={framing === 'head'} onClick={() => setFraming('head')}>Head</button>
              </div>
            </div>
            {previewName && <div className="preview-hint">Previewing {previewName}</div>}
            {!previewName && !isEmpty && <div className="scale-note">1 unit = 1 mm</div>}
          </WatchStage>
        </div>

        <div className="side">
          <div className="panel">
            <div className="tabs" role="tablist" aria-label="Builder panels">
              <button type="button" role="tab" aria-selected={tab === 'parts'} onClick={() => setTab('parts')}>
                {SLOT_LABELS[active]}
              </button>
              <button type="button" role="tab" aria-selected={tab === 'check'} onClick={() => setTab('check')}>
                Fit check
                {problemCount > 0 ? <span className="tab-count">{problemCount}</span> : warningCount > 0 ? <span className="tab-count warn">{warningCount}</span> : null}
              </button>
              <button type="button" role="tab" aria-selected={tab === 'list'} onClick={() => setTab('list')}>
                Parts list
              </button>
            </div>
            <div role="tabpanel">
              {tab === 'parts' && (
                <PartPicker
                  key={active}
                  slot={active}
                  build={build}
                  catalog={catalog}
                  onPick={pick}
                  onPreview={setPreview}
                />
              )}
              {tab === 'check' && (
                <CheckPanel
                  build={build}
                  report={report}
                  catalog={catalog}
                  onSelectSlot={selectSlot}
                  onRemoveSlot={(slot) => dispatch({ type: 'set-slot', slot, ref: undefined })}
                  onToggleFlag={(flag) => dispatch({ type: 'toggle-flag', flag })}
                  onHighlight={setHighlight}
                />
              )}
              {tab === 'list' && <PartsList build={build} catalog={catalog} />}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this build?"
        message={`“${build.name}” will be removed from this browser. This can't be undone.`}
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

/** Inline rename: commits non-empty names as you type, restores the saved name on blur if emptied. */
function NameInput({ name, onRename }: { name: Build['name']; onRename: (name: string) => void }) {
  const [value, setValue] = useState(name);
  const [lastName, setLastName] = useState(name);
  if (name !== lastName) {
    setLastName(name);
    if (value.trim() !== name) setValue(name);
  }
  return (
    <input
      className="name-input"
      aria-label="Build name"
      value={value}
      maxLength={80}
      onChange={(e) => {
        setValue(e.target.value);
        if (e.target.value.trim()) onRename(e.target.value);
      }}
      onBlur={() => setValue(name)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}
