import { useRef, useState } from 'react';
import type { Catalog } from '../data/catalog';
import { SAMPLE_BUILDS, type SampleBuild } from '../data/sampleBuilds';
import { evaluate, resolveParts } from '../domain/rules';
import { downloadBlob, safeFilename, serializeSvg, sizedSvg, svgToPngBlob, widthForScale } from '../render/export';
import { WatchSvg } from '../render/WatchSvg';

const PX_PER_MM = 20;

/** Phase 3 preview: sample builds rendered at true scale with export. Replaced by the builder in Phase 4. */
export function GalleryView({ catalog }: { catalog: Catalog }) {
  return (
    <div className="gallery">
      {SAMPLE_BUILDS.map((sample) => (
        <GalleryCard key={sample.id} sample={sample} catalog={catalog} />
      ))}
    </div>
  );
}

function GalleryCard({ sample, catalog }: { sample: SampleBuild; catalog: Catalog }) {
  const frame = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const build = {
    slots: Object.fromEntries(Object.entries(sample.slots).map(([slot, partId]) => [slot, { packId: 'core', partId }])),
    flags: sample.flags ?? [],
  };
  const report = evaluate(build, catalog);
  const { parts } = resolveParts(build, catalog);

  const svgText = () => {
    const el = frame.current?.querySelector('svg');
    if (!el) throw new Error('Preview not rendered');
    return serializeSvg(el);
  };

  const exportSvg = () => {
    const svg = svgText();
    downloadBlob(new Blob([sizedSvg(svg, widthForScale(svg, PX_PER_MM))], { type: 'image/svg+xml' }), `${safeFilename(sample.name)}.svg`);
  };

  const exportPng = async () => {
    setBusy(true);
    try {
      const svg = svgText();
      downloadBlob(await svgToPngBlob(svg, widthForScale(svg, PX_PER_MM), '#f3f3f1'), `${safeFilename(sample.name)}.png`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="card">
      <div className="watch-frame" ref={frame}>
        <WatchSvg parts={parts} title={sample.name} />
      </div>
      <div className="card-body">
        <div className="part-head">
          <strong>{sample.name}</strong>
          <span className={`badge status-${report.status}`}>{report.status}</span>
        </div>
        {sample.flags?.length ? <p className="muted notes">Mods: {sample.flags.join(', ')}</p> : null}
        <div className="actions">
          <button onClick={exportSvg}>SVG</button>
          <button onClick={exportPng} disabled={busy}>
            {busy ? 'Exporting…' : 'PNG'}
          </button>
        </div>
      </div>
    </article>
  );
}
