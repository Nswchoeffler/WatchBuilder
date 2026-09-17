import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { buildFromSample, duplicateBuild, newBuild, sampleSlots } from '../../data/builds';
import { SAMPLE_BUILDS, type SampleBuild } from '../../data/sampleBuilds';
import type { Build } from '../../domain/schemas';
import { deleteBuild, listBuilds, renameBuild, saveBuild } from '../../storage/db';
import { useApp } from '../app/AppContext';
import { href, navigate } from '../app/route';
import { ConfirmDialog, icons, Modal } from '../common';
import { timeAgo } from '../labels';
import { BuildCard } from './BuildCard';

export const MAX_COMPARE = 3;

/** Stable build shapes for sample cards, so their previews aren't recomputed on every render. */
const SAMPLE_CARDS = SAMPLE_BUILDS.map((sample) => ({ sample, build: { name: sample.name, slots: sampleSlots(sample), flags: sample.flags ?? [] } }));

export function LibraryScreen() {
  const { db } = useApp();
  const builds = useLiveQuery(() => listBuilds(db), [db]);
  const [selected, setSelected] = useState<string[]>([]);
  const [toDelete, setToDelete] = useState<Build | null>(null);
  const [renaming, setRenaming] = useState<Build | null>(null);

  const create = async (build: Build) => {
    await saveBuild(db, build);
    navigate(href.build(build.id));
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_COMPARE ? [...s, id] : s));

  if (!builds) return <div className="center-message muted">Loading builds…</div>;
  const chosen = selected.filter((id) => builds.some((b) => b.id === id));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Your workbench</p>
          <h1>Builds</h1>
          <p className="muted">Assemble a watch from real parts. Every combination is checked for fit, and drawn to scale.</p>
        </div>
        <button type="button" className="btn primary" onClick={() => create(newBuild())}>
          {icons.plus} New build
        </button>
      </header>

      {builds.length === 0 ? (
        <EmptyLibrary onStart={(s) => create(buildFromSample(s))} onBlank={() => create(newBuild())} />
      ) : (
        <div className="card-grid">
          {builds.map((b) => (
            <BuildCard
              key={b.id}
              build={b}
              href={href.build(b.id)}
              meta={`Edited ${timeAgo(b.updatedAt)}`}
              selected={chosen.includes(b.id)}
              select={
                <input
                  type="checkbox"
                  aria-label={`Select ${b.name} to compare`}
                  checked={chosen.includes(b.id)}
                  disabled={!chosen.includes(b.id) && chosen.length >= MAX_COMPARE}
                  onChange={() => toggleSelect(b.id)}
                />
              }
              actions={
                <>
                  <button type="button" className="btn ghost small" onClick={() => setRenaming(b)}>Rename</button>
                  <button type="button" className="btn ghost small" onClick={() => saveBuild(db, duplicateBuild(b))}>Duplicate</button>
                  <button type="button" className="btn ghost small danger" onClick={() => setToDelete(b)}>Delete</button>
                </>
              }
            />
          ))}
          <button type="button" className="new-card" onClick={() => create(newBuild())}>
            {icons.plus}
            New build
          </button>
        </div>
      )}

      {chosen.length > 0 && (
        <div className="compare-bar" role="region" aria-label="Compare selection">
          <span>{chosen.length === 1 ? 'Select 1–2 more to compare' : `${chosen.length} builds selected`}</span>
          <div className="toolbar">
            <button type="button" className="btn ghost small" style={{ color: 'inherit', background: 'transparent', borderColor: 'transparent' }} onClick={() => setSelected([])}>
              Clear
            </button>
            <a className="btn small" href={href.compare(chosen)} aria-disabled={chosen.length < 2} onClick={(e) => chosen.length < 2 && e.preventDefault()}>
              {icons.compare} Compare
            </a>
          </div>
        </div>
      )}

      {builds.length > 0 && <Samples onStart={(s) => create(buildFromSample(s))} />}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this build?"
        message={`“${toDelete?.name ?? ''}” will be removed from this browser. This can't be undone.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (toDelete) await deleteBuild(db, toDelete.id);
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />
      <RenameDialog
        build={renaming}
        onClose={() => setRenaming(null)}
        onRename={async (name) => {
          if (renaming) await renameBuild(db, renaming.id, name);
          setRenaming(null);
        }}
      />
    </div>
  );
}

function EmptyLibrary({ onStart, onBlank }: { onStart: (s: SampleBuild) => void; onBlank: () => void }) {
  const first = SAMPLE_BUILDS[0]!;
  return (
    <>
      <section className="empty">
        <div>
          <p className="eyebrow">Getting started</p>
          <h2>What's a build?</h2>
          <ol>
            <li>Pick a case, movement, dial, hands and the rest, one slot at a time.</li>
            <li>Parts that don't fit are hidden, and you can see why.</li>
            <li>Everything is drawn at true scale and saved in this browser.</li>
          </ol>
          <div className="toolbar">
            <button type="button" className="btn primary" onClick={() => onStart(first)}>Start from “{first.name}”</button>
            <button type="button" className="btn" onClick={onBlank}>Blank build</button>
          </div>
        </div>
        <BuildCard build={SAMPLE_CARDS[0]!.build} />
      </section>
      <Samples onStart={onStart} />
    </>
  );
}

function Samples({ onStart }: { onStart: (s: SampleBuild) => void }) {
  return (
    <section>
      <div className="section-title">
        <h2>Start from a sample</h2>
        <span className="count">{SAMPLE_BUILDS.length}</span>
      </div>
      <div className="card-grid">
        {SAMPLE_CARDS.map(({ sample: s, build }) => (
          <BuildCard
            key={s.id}
            build={build}
            actions={
              <button type="button" className="btn small" onClick={() => onStart(s)}>
                {icons.plus} Use this
              </button>
            }
          />
        ))}
      </div>
    </section>
  );
}

function RenameDialog({ build, onClose, onRename }: { build: Build | null; onClose: () => void; onRename: (name: string) => void }) {
  return (
    <Modal open={Boolean(build)} onClose={onClose} labelledBy="rename-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const name = String(new FormData(e.currentTarget).get('name') ?? '');
          if (name.trim()) onRename(name);
        }}
      >
        <h3 id="rename-title">Rename build</h3>
        <p style={{ margin: '12px 0 18px' }}>
          <input className="input" name="name" defaultValue={build?.name} maxLength={80} required autoFocus aria-label="Build name" />
        </p>
        <div className="toolbar">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary">Rename</button>
        </div>
      </form>
    </Modal>
  );
}
