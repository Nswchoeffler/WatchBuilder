/**
 * Render every sample build to PNG for visual review.
 *   npm run previews -- [outDir] [pxPerMm]
 */
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { Catalog, loadCorePack } from '../src/data/catalog';
import { SAMPLE_BUILDS } from '../src/data/sampleBuilds';
import { evaluate, resolveParts } from '../src/domain/rules';
import { WatchSvg } from '../src/render/WatchSvg';

const outDir = resolve(process.argv[2] ?? 'previews');
const pxPerMm = Number(process.argv[3] ?? 16);
mkdirSync(outDir, { recursive: true });

const catalog = new Catalog([loadCorePack()]);

for (const sample of SAMPLE_BUILDS) {
  const build = {
    slots: Object.fromEntries(Object.entries(sample.slots).map(([slot, partId]) => [slot, { packId: 'core', partId }])),
    flags: sample.flags ?? [],
  };
  const report = evaluate(build, catalog);
  const { parts } = resolveParts(build, catalog);
  const svg = renderToStaticMarkup(<WatchSvg parts={parts} idPrefix={sample.id} title={sample.name} />);
  const widthMm = Number(/data-mm-width="([\d.]+)"/.exec(svg)?.[1] ?? 60);
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: Math.round(widthMm * pxPerMm) },
    background: '#f3f3f1',
    font: { loadSystemFonts: true, defaultFontFamily: 'Arial' },
  })
    .render()
    .asPng();
  writeFileSync(join(outDir, `${sample.id}.svg`), svg);
  writeFileSync(join(outDir, `${sample.id}.png`), png);
  console.log(`${sample.id.padEnd(22)} ${report.status.padEnd(10)} ${(svg.length / 1024).toFixed(0)} KB svg`);
}
