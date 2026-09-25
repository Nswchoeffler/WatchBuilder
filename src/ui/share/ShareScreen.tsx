import { useEffect, useState } from 'react';
import { newBuild } from '../../data/builds';
import { decodeShare, type SharedBuild } from '../../data/share';
import { saveBuild } from '../../storage/db';
import { useApp } from '../app/AppContext';
import { href, navigate } from '../app/route';
import { PartsList } from '../builder/PartsList';
import { StatusBadge, useEvaluation, WatchStage } from '../common';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; build: SharedBuild };

/** `#/share/<code>`: a read-only look at someone's build, with a way to keep a copy. */
export function ShareScreen({ code }: { code: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    decodeShare(code).then(
      (build) => !cancelled && setState({ status: 'ready', build }),
      (e: unknown) => !cancelled && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (state.status === 'loading') return <div className="center-message muted">Opening shared build…</div>;
  if (state.status === 'error') {
    return (
      <div className="center-message">
        <h2>Can't open this link</h2>
        <p className="muted">{state.message}</p>
        <a className="btn" href={href.builds()}>Go to builds</a>
      </div>
    );
  }
  return <SharedBuildView build={state.build} />;
}

function SharedBuildView({ build }: { build: SharedBuild }) {
  const { db, catalog } = useApp();
  const { report, parts, art } = useEvaluation(build, catalog);
  const [saving, setSaving] = useState(false);

  // Parts from packs this browser doesn't have, grouped by pack.
  const missing = new Map<string, number>();
  for (const u of report.unresolved) missing.set(u.ref.packId, (missing.get(u.ref.packId) ?? 0) + 1);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await saveBuild(db, { ...newBuild(build.name, build.slots, build.flags), ...(build.notes ? { notes: build.notes } : {}) });
      navigate(href.build(saved.id));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page page-wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">Shared build · read-only</p>
          <h1>{build.name}</h1>
          <div className="toolbar">
            <StatusBadge status={report.status} />
          </div>
        </div>
        <button type="button" className="btn primary" onClick={() => void save()} disabled={saving}>
          Save to my builds
        </button>
      </header>

      <div className="share-view">
        <div className="panel preview">
          <WatchStage parts={parts} art={art} framing="watch" title={build.name} />
        </div>
        <div className="side">
          {missing.size > 0 && (
            <section className="panel import-result bad" aria-label="Missing parts">
              <p>
                {report.unresolved.length === 1 ? 'One part comes' : `${report.unresolved.length} parts come`} from packs you don't have:
              </p>
              <ul className="import-issues">
                {[...missing].map(([packId, count]) => (
                  <li key={packId}>
                    <span className="mono">{packId}</span> ({count} {count === 1 ? 'part' : 'parts'})
                  </li>
                ))}
              </ul>
              <p className="muted">
                Ask for the build file instead of the link — it carries those parts — or import the packs on the <a href={href.packs()}>Packs</a> page.
              </p>
            </section>
          )}
          <div className="panel">
            <PartsList build={build} catalog={catalog} />
          </div>
          {build.notes && (
            <div className="panel panel-body share-notes">
              <p className="muted">{build.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
