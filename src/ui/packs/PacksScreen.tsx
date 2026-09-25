import { useEffect, useRef, useState, type FormEvent } from 'react';
import { buildsUsing, countBuilds } from '../../data/builds';
import { PackError, parsePackJson, serializePack } from '../../data/packs';
import { CORE_PACK_ID } from '../../data/seed';
import type { Build, Pack } from '../../domain/schemas';
import { downloadBlob } from '../../render/export';
import { createUserPack, deleteUserPack, listBuilds, saveUserPack } from '../../storage/db';
import { useApp } from '../app/AppContext';
import { href } from '../app/route';
import { ConfirmDialog, icons, Modal } from '../common';

type ImportState =
  | null
  | { kind: 'error'; fileName: string; message: string; issues: string[] }
  | { kind: 'confirm'; pack: Pack; existing: Pack }
  | { kind: 'done'; pack: Pack; replaced: Pack | null };

export function PacksScreen() {
  const { db, catalog, reloadCatalog } = useApp();
  const [builds, setBuilds] = useState<Build[] | null>(null);
  const [imported, setImported] = useState<ImportState>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Pack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void listBuilds(db).then((b) => !cancelled && setBuilds(b));
    return () => {
      cancelled = true;
    };
  }, [db]);

  const userPacks = catalog.packs.filter((p) => p.id !== CORE_PACK_ID);
  const core = catalog.packs.find((p) => p.id === CORE_PACK_ID);
  const usedBy = (pack: Pack) => (builds ? buildsUsing(builds, pack.id).length : null);

  const store = async (pack: Pack, replaced: Pack | null) => {
    try {
      await saveUserPack(db, pack);
      await reloadCatalog();
      setImported({ kind: 'done', pack, replaced });
    } catch (e) {
      setImported({ kind: 'error', fileName: `${pack.id}.json`, message: e instanceof Error ? e.message : String(e), issues: [] });
    }
  };

  const importFile = async (file: File) => {
    let pack: Pack;
    try {
      pack = parsePackJson(await file.text());
    } catch (e) {
      const issues = e instanceof PackError ? e.issues : [];
      const message = e instanceof Error ? e.message.split('\n')[0]! : String(e);
      setImported({ kind: 'error', fileName: file.name, message, issues });
      return;
    }
    if (pack.id === CORE_PACK_ID) {
      setImported({ kind: 'error', fileName: file.name, message: `This pack uses the id “${CORE_PACK_ID}”, which is reserved for the built-in catalog.`, issues: [] });
      return;
    }
    const existing = userPacks.find((p) => p.id === pack.id);
    if (existing) setImported({ kind: 'confirm', pack, existing });
    else await store(pack, null);
  };

  const exportPack = (pack: Pack) => {
    // Ids are slugs and versions are semver, so both are already safe in a filename.
    downloadBlob(new Blob([serializePack(pack)], { type: 'application/json' }), `${pack.id}-${pack.version}.json`);
  };

  const remove = async (pack: Pack) => {
    setDeleting(null);
    try {
      await deleteUserPack(db, pack.id);
      await reloadCatalog();
      if (imported?.kind === 'done' && imported.pack.id === pack.id) setImported(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">
            <a href={href.catalog()}>Parts</a> · Packs
          </p>
          <h1>Part packs</h1>
          <p className="muted">
            Parts live in packs. Export a pack to back it up or share it; importing it again brings back every build that uses its parts.
          </p>
        </div>
        <div className="toolbar">
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>{icons.upload} Import pack</button>
          <button type="button" className="btn primary" onClick={() => setCreating(true)}>{icons.plus} New pack</button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            aria-label="Pack file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void importFile(file);
            }}
          />
        </div>
      </header>

      {error && <p className="error-text">{error}</p>}
      <ImportResult state={imported} onDismiss={() => setImported(null)} />

      <ul className="part-list">
        {userPacks.map((pack) => (
          <PackItem key={pack.id} pack={pack} usedBy={usedBy(pack)} onExport={() => exportPack(pack)} onDelete={() => setDeleting(pack)} />
        ))}
        {core && <PackItem pack={core} usedBy={usedBy(core)} core />}
      </ul>
      {userPacks.length === 0 && (
        <p className="muted pack-empty">
          No packs of your own yet. Saving a part creates <strong>My Parts</strong>; you can also start a new pack or import one someone exported.
        </p>
      )}

      <NewPackDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={async (name) => {
          await createUserPack(db, name);
          await reloadCatalog();
          setCreating(false);
        }}
      />

      <ConfirmDialog
        open={imported?.kind === 'confirm'}
        title="Replace this pack?"
        message={imported?.kind === 'confirm' ? replaceMessage(imported.existing, imported.pack) : ''}
        confirmLabel="Replace"
        onConfirm={() => imported?.kind === 'confirm' && void store(imported.pack, imported.existing)}
        onCancel={() => setImported(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this pack?"
        message={deleting ? deleteMessage(deleting, usedBy(deleting)) : ''}
        confirmLabel="Delete"
        onConfirm={() => deleting && void remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function PackItem({ pack, usedBy, core, onExport, onDelete }: { pack: Pack; usedBy: number | null; core?: boolean; onExport?: () => void; onDelete?: () => void }) {
  const drawings = Object.keys(pack.assets).length;
  return (
    <li className="part-item">
      <div className="part-item-head">
        <strong>{pack.name}</strong>
        <span className="badge neutral mono">v{pack.version}</span>
      </div>
      <p className="specs">
        {pack.id} · {countParts(pack.parts.length)}
        {drawings > 0 && ` · ${drawings} uploaded ${drawings === 1 ? 'drawing' : 'drawings'}`}
        {usedBy !== null && ` · used by ${countBuilds(usedBy)}`}
      </p>
      {pack.description && <p className="notes">{pack.description}</p>}
      <div className="part-item-actions">
        {core ? (
          <span className="badge neutral">Built in · read-only</span>
        ) : (
          <>
            <button type="button" className="btn small" onClick={onExport}>{icons.download} Export</button>
            <button type="button" className="btn small icon danger" onClick={onDelete} aria-label={`Delete ${pack.name}`} title="Delete pack">
              {icons.trash}
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function ImportResult({ state, onDismiss }: { state: ImportState; onDismiss: () => void }) {
  if (!state || state.kind === 'confirm') return null;
  const ok = state.kind === 'done';
  return (
    <section className={`panel import-result ${ok ? 'ok' : 'bad'}`} role={ok ? 'status' : 'alert'} aria-label="Import result">
      <div className="import-result-head">
        {ok ? (
          <p>
            {state.replaced ? 'Replaced' : 'Imported'} <strong>{state.pack.name}</strong> v{state.pack.version} ({countParts(state.pack.parts.length)}).
          </p>
        ) : (
          <p>
            <strong>{state.fileName}</strong> wasn't imported. {state.message}
          </p>
        )}
        <button type="button" className="btn ghost icon small" onClick={onDismiss} aria-label="Dismiss">{icons.close}</button>
      </div>
      {!ok && state.issues.length > 0 && (
        <ul className="import-issues mono">
          {state.issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NewPackDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await onCreate(name);
      setName('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="new-pack-title">
      <form onSubmit={(e) => void submit(e)}>
        <h3 id="new-pack-title">New pack</h3>
        <div className="field">
          <label htmlFor="new-pack-name">Name</label>
          <input id="new-pack-name" className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          {error ? <p className="field-error">{error}</p> : <p className="field-hint">For example “Octagon project” or “Parts from my last order”.</p>}
        </div>
        <div className="toolbar">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={!name.trim()}>Create</button>
        </div>
      </form>
    </Modal>
  );
}

const countParts = (n: number) => `${n} ${n === 1 ? 'part' : 'parts'}`;

/** Negative when `a` is older than `b`. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export function replaceMessage(existing: Pack, incoming: Pack): string {
  const order = compareVersions(incoming.version, existing.version);
  const note =
    order < 0 ? ' The pack you have now is newer than the file.' : order === 0 ? ' Both are the same version, but their contents may differ.' : '';
  return (
    `You already have “${existing.name}”. Replacing it swaps v${existing.version} (${countParts(existing.parts.length)}) ` +
    `for v${incoming.version} (${countParts(incoming.parts.length)}).${note}`
  );
}

export function deleteMessage(pack: Pack, usedBy: number | null): string {
  const builds = usedBy ? ` ${countBuilds(usedBy)} ${usedBy === 1 ? 'uses' : 'use'} its parts and will show them as missing until you import it again.` : '';
  return `“${pack.name}” and its ${countParts(pack.parts.length)} will be removed from this browser.${builds} Export it first if you might want it back.`;
}
