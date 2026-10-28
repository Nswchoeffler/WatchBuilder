/**
 * Performance budget check on the core catalog (roadmap section 8: < 50 ms to re-evaluate a build,
 * < 100 ms to render one). Reports median and p95 after warm-up.
 *   npm run bench -- [iterations]
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Catalog, loadCorePack } from '../src/data/catalog';
import { SAMPLE_BUILDS } from '../src/data/sampleBuilds';
import { candidatesFor, evaluate, resolveParts } from '../src/domain/rules';
import { WatchSvg } from '../src/render/WatchSvg';
import type { Slot } from '../src/domain/schemas';

const ITERATIONS = Number(process.argv[2] ?? 30);
const WARMUP = 5;
const catalog = new Catalog([loadCorePack()]);

const toBuild = (slots: Partial<Record<Slot, string>>, flags: readonly string[] = []) =>
  ({
    slots: Object.fromEntries(Object.entries(slots).map(([slot, partId]) => [slot, { packId: 'core', partId }])),
    flags: [...flags],
  }) as Parameters<typeof evaluate>[0];

function measure(fn: () => void): { median: number; p95: number } {
  for (let i = 0; i < WARMUP; i++) fn();
  const times: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return { median: times[Math.floor(times.length / 2)]!, p95: times[Math.min(times.length - 1, Math.ceil(times.length * 0.95) - 1)]! };
}

const rows: { name: string; budget: number; median: number; p95: number }[] = [];
const record = (name: string, budget: number, fn: () => void) => rows.push({ name, budget, ...measure(fn) });

// The fullest sample is the worst case for the picker: every other slot is filled, so every rule applies.
const samples = SAMPLE_BUILDS.map((s) => ({ sample: s, build: toBuild(s.slots, s.flags) }));
const fullest = samples.reduce((a, b) => (Object.keys(b.sample.slots).length > Object.keys(a.sample.slots).length ? b : a));

for (const { sample, build } of samples) record(`evaluate  ${sample.id}`, 50, () => evaluate(build, catalog));

for (const slot of Object.keys(fullest.sample.slots) as Slot[]) {
  record(`candidatesFor ${slot} (${catalog.list(slot).length} parts)`, 50, () => candidatesFor(slot, fullest.build, catalog));
}

for (const { sample, build } of samples) {
  const { parts } = resolveParts(build, catalog);
  record(`render    ${sample.id}`, 100, () => renderToStaticMarkup(createElement(WatchSvg, { parts, idPrefix: 'bench' })));
}

const fmt = (n: number) => n.toFixed(2).padStart(8);
console.log(`core catalog, ${ITERATIONS} iterations after ${WARMUP} warm-up\n`);
console.log(`${'case'.padEnd(46)}${'median ms'.padStart(10)}${'p95 ms'.padStart(10)}${'budget'.padStart(8)}`);
for (const r of rows) console.log(`${r.name.padEnd(46)}${fmt(r.median)}  ${fmt(r.p95)}${String(r.budget).padStart(7)}${r.p95 > r.budget ? '  OVER' : ''}`);
const over = rows.filter((r) => r.p95 > r.budget);
console.log(over.length ? `\n${over.length} case(s) over budget` : '\nAll within budget');
