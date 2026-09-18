import { useMemo, useState } from 'react';
import { blankPart, duplicatePart, NEW_PART_NAMES } from '../../data/blankParts';
import { CORE_PACK_ID } from '../../data/seed';
import { MY_PARTS_ID, slugify, uniquePartId } from '../../data/userPack';
import { PART_TYPES, type Part, type PartRef, type PartType, type Slot } from '../../domain/schemas';
import { deletePart, savePart } from '../../storage/db';
import { useApp } from '../app/AppContext';
import { href, navigate, type Route } from '../app/route';
import { ConfirmDialog, icons, StatusBadge, WatchStage } from '../common';
import { SLOT_LABELS, summarize, TYPE_LABELS } from '../labels';
import { FormProvider } from './form';
import { IdentityFields, PartForm } from './PartForm';
import { companionsOf, countCompatible, referenceBuild } from './referenceBuild';
import { collectSuggestions } from './suggestions';
import { usePartDraft } from './usePartDraft';
import { VisualForm } from './VisualForm';

type EditorRoute = Extract<Route, { name: 'part-new' } | { name: 'part' }>;

/** The counterpart a part is most usefully counted against ("fits 4 cases"). */
const COUNT_AGAINST: Record<PartType, PartType> = {
  movement: 'case',
  case: 'movement',
  dial: 'case',
  hands: 'movement',
  chapterRing: 'case',
  bezel: 'case',
  bezelInsert: 'bezel',
  crystal: 'case',
  crown: 'case',
  strap: 'case',
};

export function PartEditorScreen({ route }: { route: EditorRoute }) {
  const { catalog } = useApp();

  if (route.name === 'part-new') {
    if (!route.type) return <TypeChooser />;
    const from = route.from ? refFrom(route.from) : null;
    const source = from ? catalog.get(from) : undefined;
    if (from && !source) return <NotFound message="The part to copy is not in any installed pack." />;
    const taken = new Set(catalog.packs.flatMap((p) => p.parts.map((x) => x.id)));
    const draft = source
      ? duplicatePart(source, uniquePartId(`${source.id}-copy`, taken), copyName(source.name))
      : blankPart(route.type, uniquePartId(slugify(NEW_PART_NAMES[route.type], route.type), taken));
    return <Editor key={`new-${route.type}-${route.from ?? ''}`} draft={draft} packId={MY_PARTS_ID} existing={null} />;
  }

  const ref = { packId: route.packId, partId: route.partId };
  const part = catalog.get(ref);
  if (!part) return <NotFound message="This part is not in any installed pack." />;
  if (route.packId === CORE_PACK_ID) return <CorePartView part={part} />;
  return <Editor key={`${route.packId}/${route.partId}`} draft={part} packId={route.packId} existing={ref} />;
}

const refFrom = (value: string): PartRef | null => {
  const [packId, partId] = value.split('/');
  return packId && partId ? { packId, partId } : null;
};

const copyName = (name: string) => (name.length <= 73 ? `${name} (copy)` : `${name.slice(0, 73)} (copy)`);

// ── the editor ──────────────────────────────────────────────────────────────

type Tab = 'measurements' | 'drawing';

function Editor({ draft: initial, packId, existing }: { draft: Part; packId: string; existing: PartRef | null }) {
  const { db, catalog, reloadCatalog } = useApp();
  const draft = usePartDraft(initial as unknown as Record<string, unknown>);
  const [tab, setTab] = useState<Tab>('measurements');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const type = initial.type;
  const suggestions = useMemo(() => collectSuggestions(catalog), [catalog]);

  // The id must be free inside the target pack; elsewhere it may repeat, since refs are pack-scoped.
  // The part's own id doesn't clash with itself, including the one it was just saved under.
  const [savedAs, setSavedAs] = useState<string | null>(existing?.partId ?? null);
  const id = typeof draft.value.id === 'string' ? draft.value.id : '';
  const clash =
    id && id !== savedAs && catalog.packs.find((p) => p.id === packId)?.parts.some((p) => p.id === id)
      ? `A part with the id “${id}” is already in this pack.`
      : null;

  // The parts around the draft stay put while you edit, so a measurement that stops
  // fitting shows up as an error instead of the preview quietly finding another case.
  const [companions, setCompanions] = useState<Partial<Record<Slot, PartRef>>>(() =>
    companionsOf(referenceBuild(initial, catalog, existing ?? undefined), initial.type),
  );

  const preview = useMemo(
    () => (draft.lastValid ? referenceBuild(draft.lastValid, catalog, existing ?? undefined, companions) : null),
    [draft.lastValid, catalog, existing, companions],
  );
  const fitCount = useMemo(
    () => (draft.lastValid ? countCompatible(draft.lastValid, catalog, COUNT_AGAINST[type]) : 0),
    [draft.lastValid, catalog, type],
  );

  const save = async () => {
    if (!draft.part || clash) return;
    setSaving(true);
    setSaveError(null);
    try {
      await savePart(db, packId, draft.part, savedAs ?? undefined);
      setSavedAs(draft.part.id);
      await reloadCatalog();
      draft.reset(draft.value);
      if (!existing || existing.partId !== draft.part.id) navigate(href.part(packId, draft.part.id));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setConfirmDelete(false);
    if (!existing) return;
    // `savedAs` rather than the route's id, so a rename that was saved is still the part we delete.
    await deletePart(db, existing.packId, savedAs ?? existing.partId);
    await reloadCatalog();
    navigate(href.catalog());
  };

  const errorCount = draft.errors.size + (clash ? 1 : 0);

  return (
    <div className="page page-wide">
      <header className="builder-head">
        <div className="name-field">
          <a className="btn ghost icon" href={href.catalog()} aria-label="Back to parts">{icons.back}</a>
          <div>
            <p className="eyebrow">
              {existing ? 'Editing' : 'New'} {TYPE_LABELS[type].toLowerCase().replace(/s$/, '')} · {packId}
            </p>
            <h2 className="editor-title">{typeof draft.value.name === 'string' && draft.value.name ? draft.value.name : 'Untitled part'}</h2>
          </div>
        </div>
        <span className="save-state" role="status">
          {saving ? 'Saving…' : errorCount > 0 ? `${errorCount} ${errorCount === 1 ? 'problem' : 'problems'} to fix` : draft.dirty ? 'Unsaved changes' : 'Saved'}
        </span>
        <div className="toolbar">
          {existing && (
            <a className="btn" href={href.newPart(type, `${existing.packId}/${existing.partId}`)}>{icons.copy} Duplicate</a>
          )}
          <button type="button" className="btn primary" onClick={() => void save()} disabled={!draft.part || !!clash || saving || !draft.dirty}>
            {existing ? 'Save' : 'Save to My Parts'}
          </button>
          {existing && (
            <button type="button" className="btn icon danger" onClick={() => setConfirmDelete(true)} aria-label="Delete part" title="Delete part">
              {icons.trash}
            </button>
          )}
        </div>
      </header>

      {saveError && <p className="error-text">{saveError}</p>}

      <div className="editor">
        <div className="panel editor-form">
          <div className="tabs" role="tablist" aria-label="Part editor">
            <button type="button" role="tab" aria-selected={tab === 'measurements'} onClick={() => setTab('measurements')}>
              Measurements
              {draft.errors.size > 0 && <span className="tab-count">{draft.errors.size}</span>}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'drawing'} onClick={() => setTab('drawing')}>
              Drawing
            </button>
          </div>
          <div role="tabpanel" className="panel-body">
            <FormProvider ctx={{ value: draft.value, errors: draft.errors, set: draft.set }}>
              {tab === 'measurements' ? (
                <>
                  <IdentityFields />
                  {clash && <p className="field-error">{clash}</p>}
                  <PartForm type={type} suggestions={suggestions} />
                </>
              ) : (
                <VisualForm type={type} />
              )}
            </FormProvider>
          </div>
        </div>

        <div className="side editor-preview">
          <div className="panel preview">
            <WatchStage parts={preview?.parts ?? {}} framing="head" title="Part preview" highlight={[type]} />
            <div className="preview-caption">
              <span>
                {draft.part
                  ? 'Shown with the same surrounding parts while you edit.'
                  : 'Showing the last valid version while you type.'}
              </span>
              {draft.lastValid && (
                <button
                  type="button"
                  className="btn small"
                  onClick={() => setCompanions(companionsOf(referenceBuild(draft.lastValid!, catalog, existing ?? undefined), type))}
                >
                  Re-pick parts
                </button>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="check-summary">
              {preview ? <StatusBadge status={preview.report.status} /> : <span className="status invalid">Not valid yet</span>}
              <span className="muted" style={{ fontSize: '0.82rem' }}>
                Fits {fitCount} {TYPE_LABELS[COUNT_AGAINST[type]].toLowerCase()}
              </span>
            </div>

            {draft.lastValid && <p className="specs editor-specs">{summarize(draft.lastValid)}</p>}

            {preview && preview.unfilled.length > 0 && (
              <p className="all-clear">
                No compatible {preview.unfilled.map((s) => SLOT_LABELS[s].toLowerCase()).join(', ')} in the catalog, so the build is incomplete.
              </p>
            )}

            {preview && preview.report.results.length > 0 ? (
              <ul className="findings">
                {preview.report.results.map((r, i) => (
                  <li key={`${r.ruleId}-${i}`} className="finding">
                    <span className={`dot ${r.severity}`} aria-hidden="true" />
                    <div>
                      {r.message}
                      <div className="finding-meta">
                        <span className="mono">{r.ruleId}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              preview && <p className="all-clear">Every rule that applies to this part passes.</p>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this part?"
        message={`“${initial.name}” will be removed from ${packId}. Builds that use it will show it as missing.`}
        confirmLabel="Delete"
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

// ── entry points ────────────────────────────────────────────────────────────

function TypeChooser() {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">New part</p>
          <h1>What are you adding?</h1>
          <p className="muted">
            Starting from scratch gives you a part with typical measurements to adjust. Copying one from the catalog is usually quicker.
          </p>
        </div>
      </header>
      <ul className="type-grid">
        {PART_TYPES.map((type) => (
          <li key={type}>
            <a className="type-card" href={href.newPart(type)}>
              <strong>{TYPE_LABELS[type].replace(/s$/, '')}</strong>
              <span className="muted">{NEW_PART_NAMES[type]}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Core parts can't be edited in place; copying one into My Parts is the way in. */
function CorePartView({ part }: { part: Part }) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Core catalog · read-only</p>
          <h1>{part.name}</h1>
          <p className="specs">{summarize(part)}</p>
          {part.notes && <p className="muted">{part.notes}</p>}
        </div>
      </header>
      <p className="muted">Built-in parts can't be changed, so a copy in My Parts is the place to make your version.</p>
      <div className="toolbar" style={{ marginTop: 16 }}>
        <a className="btn primary" href={href.newPart(part.type, `${CORE_PACK_ID}/${part.id}`)}>{icons.copy} Duplicate & edit</a>
        <a className="btn" href={href.catalog()}>Back to parts</a>
      </div>
    </div>
  );
}

function NotFound({ message }: { message: string }) {
  return (
    <div className="center-message">
      <h2>Part not found</h2>
      <p className="muted">{message}</p>
      <a className="btn" href={href.catalog()}>Back to parts</a>
    </div>
  );
}
