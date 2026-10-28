/**
 * Render every sample build to SVG + PNG for visual review (with system fonts, so dial text is drawn).
 *   npm run previews -- [outDir] [pxPerMm]
 * For the automated regression check see golden.tsx.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { rasterise, renderSamples } from './lib/samples';

const outDir = resolve(process.argv[2] ?? 'previews');
const pxPerMm = Number(process.argv[3] ?? 16);
mkdirSync(outDir, { recursive: true });

for (const s of renderSamples()) {
  writeFileSync(join(outDir, `${s.name}.svg`), s.svg);
  writeFileSync(join(outDir, `${s.name}.png`), rasterise(s, pxPerMm, true));
  if (!s.night) console.log(`${s.sampleId.padEnd(22)} ${s.status}`);
}
