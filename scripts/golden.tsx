/**
 * Golden-image regression check for the renderer. Every sample build is rendered by day and night and compared
 * with the files committed under test/golden/:
 *   <name>.svg  the exact markup (one element per line, so git diffs read well). This is the strict check and
 *               covers text, which the PNG cannot (see below).
 *   <name>.png  a small raster (4 px/mm) drawn with resvg with system fonts OFF, so no machine-specific font or
 *               hinting can leak in. Text is not drawn in it; geometry, colour and gradients are, compared with
 *               pixelmatch under a small tolerance in case anti-aliasing differs between platforms.
 *
 *   npm run golden:check    compare; exits 1 on any mismatch and writes actual + diff images to
 *                           previews/golden-failures/ (gitignored). Never rewrites goldens.
 *   npm run golden:update   regenerate every golden. Do this deliberately after an intended drawing change:
 *                           run `npm run previews` to eyeball it, update, and commit test/golden/ with the change.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { rasterise, renderSamples } from './lib/samples';

const GOLDEN_DIR = resolve('test/golden');
const FAIL_DIR = resolve('previews/golden-failures');
const PX_PER_MM = 4;
/** pixelmatch colour distance (0..1) below which a pixel counts as identical. */
const PIXEL_THRESHOLD = 0.1;
/** Fraction of pixels allowed to differ before the PNG check fails. */
const MAX_DIFF_RATIO = 0.0005;

/** One element per line, so a changed part shows as a few lines in a git diff instead of one huge line. */
const normaliseSvg = (svg: string) => `${svg.replace(/></g, '>\n<')}\n`;

const mode = process.argv[2];
if (mode !== 'check' && mode !== 'update') {
  console.error('Usage: tsx scripts/golden.tsx <check|update>');
  process.exit(2);
}

const samples = renderSamples().map((s) => ({
  name: s.name,
  svg: normaliseSvg(s.svg),
  png: rasterise(s, PX_PER_MM, false),
}));
const goldenFiles = new Set(samples.flatMap((s) => [`${s.name}.svg`, `${s.name}.png`]));

if (mode === 'update') {
  mkdirSync(GOLDEN_DIR, { recursive: true });
  for (const f of readdirSync(GOLDEN_DIR)) if (!goldenFiles.has(f)) rmSync(join(GOLDEN_DIR, f)); // samples that no longer exist
  for (const s of samples) {
    writeFileSync(join(GOLDEN_DIR, `${s.name}.svg`), s.svg);
    writeFileSync(join(GOLDEN_DIR, `${s.name}.png`), s.png);
  }
  console.log(`Updated ${samples.length} goldens in ${GOLDEN_DIR}. Review and commit them with your change.`);
  process.exit(0);
}

rmSync(FAIL_DIR, { recursive: true, force: true });
const failures: string[] = [];
const fail = (name: string, message: string) => failures.push(`  ${name}: ${message}`);
const save = (file: string, data: Buffer | string) => {
  mkdirSync(FAIL_DIR, { recursive: true });
  writeFileSync(join(FAIL_DIR, file), data);
};

for (const s of samples) {
  const svgPath = join(GOLDEN_DIR, `${s.name}.svg`);
  const pngPath = join(GOLDEN_DIR, `${s.name}.png`);
  if (!existsSync(svgPath) || !existsSync(pngPath)) {
    fail(s.name, 'no golden yet (new sample?); run `npm run golden:update`');
    continue;
  }

  const expectedSvg = readFileSync(svgPath, 'utf8').replace(/\r\n/g, '\n'); // tolerate autocrlf checkouts
  if (expectedSvg !== s.svg) {
    const a = expectedSvg.split('\n');
    const b = s.svg.split('\n');
    const changed = Array.from({ length: Math.max(a.length, b.length) }, (_, i) => i).filter((i) => a[i] !== b[i]);
    const first = changed[0] ?? 0;
    fail(
      s.name,
      `SVG markup differs on ${changed.length} of ${b.length} lines (first at line ${first + 1}):\n      golden: ${(a[first] ?? '(end of file)').slice(0, 160)}\n      actual: ${(b[first] ?? '(end of file)').slice(0, 160)}`,
    );
    save(`${s.name}.actual.svg`, s.svg);
  }

  const want = PNG.sync.read(readFileSync(pngPath));
  const got = PNG.sync.read(s.png);
  if (want.width !== got.width || want.height !== got.height) {
    fail(s.name, `PNG size ${got.width}x${got.height}px, golden is ${want.width}x${want.height}px`);
    save(`${s.name}.actual.png`, s.png);
    continue;
  }
  const diff = new PNG({ width: got.width, height: got.height });
  const bad = pixelmatch(want.data, got.data, diff.data, got.width, got.height, { threshold: PIXEL_THRESHOLD });
  const ratio = bad / (got.width * got.height);
  if (ratio > MAX_DIFF_RATIO) {
    fail(s.name, `${bad} pixels differ (${(ratio * 100).toFixed(2)}%, limit ${(MAX_DIFF_RATIO * 100).toFixed(2)}%)`);
    save(`${s.name}.actual.png`, s.png);
    save(`${s.name}.diff.png`, PNG.sync.write(diff));
  }
}

// Goldens whose sample was removed are stale too.
for (const f of existsSync(GOLDEN_DIR) ? readdirSync(GOLDEN_DIR) : []) {
  if (!goldenFiles.has(f)) fail(f, 'stale golden with no sample; run `npm run golden:update`');
}

if (failures.length) {
  console.error(`Golden check FAILED for ${failures.length} item(s):\n${failures.join('\n')}`);
  console.error(`\nActual and diff images: ${FAIL_DIR}\nIf the change is intended, run \`npm run golden:update\` and commit test/golden/.`);
  process.exit(1);
}
console.log(`Golden check passed: ${samples.length} renders match (${samples.length / 2} samples x day/night).`);
