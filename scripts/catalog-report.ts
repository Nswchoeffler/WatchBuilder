/**
 * Catalog health report: unverified parts, parts that can't form a valid build, valid builds per case.
 *   npm run catalog:report -- [--out file.md]
 */
import { writeFileSync } from 'node:fs';
import { Catalog, loadCorePack } from '../src/data/catalog';
import { catalogReport, formatReport } from '../src/data/catalogReport';

const outIndex = process.argv.indexOf('--out');
const outFile = outIndex >= 0 ? process.argv[outIndex + 1] : undefined;

const started = performance.now();
const markdown = formatReport(catalogReport(new Catalog([loadCorePack()]), 'core'));
const seconds = ((performance.now() - started) / 1000).toFixed(1);

if (outFile) {
  writeFileSync(outFile, markdown);
  console.log(`Wrote ${outFile} (${seconds}s)`);
} else {
  console.log(markdown);
  console.error(`(${seconds}s)`);
}
