import { useEffect, useMemo, useState } from 'react';
import { makeBundle, serializeBundle } from '../../data/bundle';
import { encodeShare, shareUrl, type SharedBuild } from '../../data/share';
import { CORE_PACK_ID } from '../../data/seed';
import { downloadBlob, safeFilename } from '../../render/export';
import { useApp } from '../app/AppContext';
import { icons, Modal } from '../common';

/** Share a build: a link that names its parts, or a file that carries the non-core ones too. */
export function ShareDialog({ open, build, onClose }: { open: boolean; build: SharedBuild; onClose: () => void }) {
  // The body mounts each time the dialog opens, so the link and "Copied" start fresh.
  return (
    <Modal open={open} onClose={onClose} labelledBy="share-title">
      <ShareBody build={build} onClose={onClose} />
    </Modal>
  );
}

function ShareBody({ build, onClose }: { build: SharedBuild; onClose: () => void }) {
  const { catalog } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void encodeShare(build).then((code) => !cancelled && setUrl(shareUrl(code)));
    return () => {
      cancelled = true;
    };
  }, [build]);

  // Packs other than the core one that the link alone would leave the recipient without.
  const ownPacks = useMemo(() => {
    const ids = [...new Set(Object.values(build.slots).map((r) => r.packId))].filter((id) => id !== CORE_PACK_ID);
    return ids.map((id) => catalog.packs.find((p) => p.id === id)?.name ?? id);
  }, [build, catalog]);

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };

  const downloadFile = () => {
    const { bundle } = makeBundle(build, catalog);
    downloadBlob(new Blob([serializeBundle(bundle)], { type: 'application/json' }), `${safeFilename(build.name)}.build.json`);
  };

  return (
    <>
      <h3 id="share-title">Share “{build.name}”</h3>
      <p className="muted">Anyone with the link sees this build read-only and can save a copy. It holds the parts' names, not the parts.</p>
      <div className="share-link">
        <input className="input" readOnly value={url ?? 'Making link…'} aria-label="Share link" onFocus={(e) => e.target.select()} />
        <button type="button" className="btn primary" onClick={() => void copy()} disabled={!url}>
          {icons.copy} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {ownPacks.length > 0 && (
        <p className="field-hint" role="note">
          This build uses parts from {ownPacks.map((n) => `“${n}”`).join(', ')}. The link only works for someone who has
          {ownPacks.length === 1 ? ' that pack' : ' those packs'}; the build file below includes the parts.
        </p>
      )}
      <div className="toolbar">
        <button type="button" className="btn" onClick={downloadFile}>{icons.download} Download build file</button>
        <button type="button" className="btn" onClick={onClose}>Done</button>
      </div>
    </>
  );
}
