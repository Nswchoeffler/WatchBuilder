import { useMemo, useState } from 'react';
import { blankPart, duplicatePart, NEW_PART_NAMES } from '../../data/blankParts';
import { buildsUsing, countBuilds } from '../../data/builds';
import type { Catalog } from '../../data/catalog';
import { CORE_PACK_ID } from '../../data/seed';
import { MY_PARTS_ID, slugify, uniquePartId } from '../../data/userPack';
import { PART_TYPES, type Part, type PartRef, type PartType, type Slot, type Visual } from '../../domain/schemas';
import { artIds, artWarnings, measureArt } from '../../render/uploaded/scaleCheck';
import { deletePart, listBuilds, savePart } from '../../storage/db';
import { useApp } from '../app/AppContext';
import { href, navigate, type Route } from '../app/route';
import { ConfirmDialog, icons, SourceLinks, StatusBadge, WatchStage } from '../common';
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
    return (
      <Editor
        key={`new-${route.type}-${route.from ?? ''}`}
        draft={draft}
        art={from ? catalog.assetFor(from) : undefined}
        packId={MY_PARTS_ID}
        existing={null}
      />
    );
  }

  const ref = { packId: route.packId, partId: route.partId };
  const part = catalog.get(ref);
  if (!part) return <NotFound message="This part is not in any installed pack." />;
  if (route.packId === CORE_PACK_ID) return <CorePartView part={part} />;
  return <Editor key={`${route.packId}/${route.partId}`} draft={part} art={catalog.assetFor(ref)} packId={route.packId} existing={ref} />;
}

const refFrom = (value: string): PartRef | null => {
  const [packId, partId] = value.split('/');
  return packId && partId ? { packId, partId } : null;
};

const copyName = (name: string) => (name.length <= 73 ? `${name} (copy)` : `${name.slice(0, 73)} (copy)`);

/** Packs a new part can be saved into: every user pack, plus My Parts, which the first save creates. */
export function packTargets(catalog: Catalog): { id: string; name: string }[] {
  const user = catalog.packs.filter((p) => p.id !== CORE_PACK_ID).map((p) => ({ id: p.id, name: p.name }));
  return user.some((p) => p.id === MY_PARTS_ID) ? user : [{ id: MY_PARTS_ID, name: 'My Parts' }, ...user];
}

// ── the editor ──────────────────────────────────────────────────────────────

type Tab = 'measurements' | 'drawing';

function Editor({ draft: initial, art: initialArt, packId: initialPackId, existing }: { draft: Part; art?: string; packId: string; existing: PartRef | null }) {
  const { db, catalog, reloadCatalog } = useApp();
  const draft = usePartDraft(initial as unknown as Record<string, unknown>);
  const [tab, setTab] = useState<Tab>('measurements');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** Builds using the part while the delete confirmation is open, otherwise null. */
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // A new part can go into any user pack; an existing one stays where it is.
  const targets = useMemo(() => packTargets(catalog), [catalog]);
  const [packId, setPackId] = useState(initialPackId);
  const packName = targets.find((t) => t.id === packId)?.name ?? packId;

  const type = initial.type;

  // Uploaded art sits beside the draft: the part only names an asset, the pack holds the markup.
  const [art, setArt] = useState(initialArt);
  const [savedArt, setSavedArt] = useState(initialArt);
  const [lastTemplate, setLastTemplate] = useState<Visual>(() =>
    initial.visual.kind === 'template' ? initial.visual : blankPart(type, 'template').visual,
  );
  const uploaded = (draft.value.visual as Visual | undefined)?.kind === 'svg';
  const missingArt = uploaded && !art;
  // Measuring lays the art out off-screen, so it only runs when the art changes, not on every keystroke.
  const artShape = useMemo(() => (art ? { ids: artIds(art) ?? new Set<string>(), measure: measureArt(art, type) } : null), [art, type]);
  const artWarningList = useMemo(
    () => (uploaded && artShape && draft.lastValid ? artWarnings(draft.lastValid, artShape.ids, artShape.measure) : []),
    [uploaded, artShape, draft.lastValid],
  );
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

  // The draft preview draws the edited part from `art`; the parts around it from their packs.
  const previewArt = useMemo(
    () => ({ ...(preview ? catalog.artFor(preview.slots) : {}), ...(uploaded && art ? { [type]: art } : {}) }),
    [preview, catalog, uploaded, art, type],
  );

  const save = async () => {
    if (!draft.part || clash || missingArt) return;
    setSaving(true);
    setSaveError(null);
    try {
      const pack = await savePart(db, packId, draft.part, savedAs ?? undefined, uploaded ? art : undefined);
      setSavedAs(draft.part.id);
      setSavedArt(art);
      await reloadCatalog();
      // The stored part, not the draft: saving points an upload's assetId at the part's id.
      const stored = pack.parts.find((p) => p.id === draft.part!.id) ?? draft.part;
      draft.reset(stored as unknown as Record<string, unknown>);
      if (!existing || existing.partId !== draft.part.id) navigate(href.part(packId, draft.part.id));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const askDelete = async () => {
    if (!existing) return;
    setConfirmDelete(buildsUsing(await listBuilds(db), existing.packId, savedAs ?? existing.partId).length);
  };

  const remove = async () => {
    setConfirmDelete(null);
    if (!existing) return;
    // `savedAs` rather than the route's id, so a rename that was saved is still the part we delete.
    await deletePart(db, existing.packId, savedAs ?? existing.partId);
    await reloadCatalog();
    navigate(href.catalog());
  };

  const errorCount = draft.errors.size + (clash ? 1 : 0) + (missingArt ? 1 : 0);
  const dirty = draft.dirty || (uploaded && art !== savedArt);

  return (
    <div className="page page-wide">
      <header className="builder-head">
        <div className="name-field">
          <a className="btn ghost icon" href={href.catalog()} aria-label="Back to parts">{icons.back}</a>
          <div>
            <p className="eyebrow">
              {existing ? 'Editing' : 'New'} {TYPE_LABELS[type].toLowerCase().replace(/s$/, '')} · {packName}
            </p>
            <h2 className="editor-title">{typeof draft.value.name === 'string' && draft.value.name ? draft.value.name : 'Untitled part'}</h2>
          </div>
        </div>
        <span className="save-state" role="status">
          {saving ? 'Saving…' : errorCount > 0 ? `${errorCount} ${errorCount === 1 ? 'problem' : 'problems'} to fix` : dirty ? 'Unsaved changes' : 'Saved'}
        </span>
        <div className="toolbar">
          {existing && (
            <a className="btn" href={href.newPart(type, `${existing.packId}/${existing.partId}`)}>{icons.copy} Duplicate</a>
          )}
          {!existing && targets.length > 1 && (
            <select className="input" aria-label="Pack to save into" value={packId} onChange={(e) => setPackId(e.target.value)}>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <button type="button" className="btn primary" onClick={() => void save()} disabled={!draft.part || !!clash || saving || !dirty || missingArt}>
            {existing ? 'Save' : `Save to ${packName}`}
          </button>
          {existing && (
            <button type="button" className="btn icon danger" onClick={() => void askDelete()} aria-label="Delete part" title="Delete part">
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
              {missingArt ? (
                <span className="tab-count" title="Upload an SVG file">1</span>
              ) : (
                artWarningList.length > 0 && <span className="tab-count warn">{artWarningList.length}</span>
              )}
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
                <VisualForm
                  type={type}
                  upload={{ art, onArt: setArt, warnings: artWarningList, lastTemplate, onLeaveTemplate: setLastTemplate }}
                />
              )}
            </FormProvider>
          </div>
        </div>

        <div className="side editor-preview">
          <div className="panel preview">
            <WatchStage parts={preview?.parts ?? {}} art={previewArt} framing="head" title="Part preview" highlight={[type]} />
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
        open={confirmDelete !== null}
        title="Delete this part?"
        message={
          `“${initial.name}” will be removed from ${packName}.` +
          (confirmDelete
            ? ` ${countBuilds(confirmDelete)} ${confirmDelete === 1 ? 'uses' : 'use'} it and will show it as missing.`
            : ' No saved build uses it.')
        }
        confirmLabel="Delete"
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(null)}
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
          <SourceLinks sources={part.sources} />
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
