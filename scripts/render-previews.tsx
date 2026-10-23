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
import { NIGHT_BACKGROUND, WatchSvg } from '../src/render/WatchSvg';

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
  // Each sample by day, and at night on a dark background to check the lume.
  for (const night of [false, true]) {
    const name = night ? `${sample.id}-night` : sample.id;
    const svg = renderToStaticMarkup(<WatchSvg parts={parts} idPrefix={name} title={sample.name} night={night} />);
    const widthMm = Number(/data-mm-width="([\d.]+)"/.exec(svg)?.[1] ?? 60);
    const png = new Resvg(svg, {
      fitTo: { mode: 'width', value: Math.round(widthMm * pxPerMm) },
      background: night ? NIGHT_BACKGROUND : '#f3f3f1',
      font: { loadSystemFonts: true, defaultFontFamily: 'Arial' },
    })
      .render()
      .asPng();
    writeFileSync(join(outDir, `${name}.svg`), svg);
    writeFileSync(join(outDir, `${name}.png`), png);
  }
  console.log(`${sample.id.padEnd(22)} ${report.status}`);
}
