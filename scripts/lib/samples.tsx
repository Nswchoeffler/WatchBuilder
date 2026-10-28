/**
 * Shared rendering for the sample builds: used by `npm run previews` (visual review) and the golden-image check.
 */
import { Resvg } from '@resvg/resvg-js';
import { renderToStaticMarkup } from 'react-dom/server';
import { Catalog, loadCorePack } from '../../src/data/catalog';
import { SAMPLE_BUILDS } from '../../src/data/sampleBuilds';
import { evaluate, resolveParts } from '../../src/domain/rules';
import { NIGHT_BACKGROUND, WatchSvg } from '../../src/render/WatchSvg';

export const DAY_BACKGROUND = '#f3f3f1';

export interface RenderedSample {
  /** `diver-classic` or `diver-classic-night`; also the file stem. */
  name: string;
  sampleId: string;
  night: boolean;
  /** Rule-engine status, for the previews log. */
  status: string;
  svg: string;
  background: string;
}

/** Each sample build by day, then at night on a dark background to check the lume. */
export function renderSamples(): RenderedSample[] {
  const catalog = new Catalog([loadCorePack()]);
  const out: RenderedSample[] = [];
  for (const sample of SAMPLE_BUILDS) {
    const build = {
      slots: Object.fromEntries(Object.entries(sample.slots).map(([slot, partId]) => [slot, { packId: 'core', partId }])),
      flags: sample.flags ?? [],
    };
    const status = evaluate(build, catalog).status;
    const { parts } = resolveParts(build, catalog);
    for (const night of [false, true]) {
      const name = night ? `${sample.id}-night` : sample.id;
      const svg = renderToStaticMarkup(<WatchSvg parts={parts} idPrefix={name} title={sample.name} night={night} />);
      out.push({ name, sampleId: sample.id, night, status, svg, background: night ? NIGHT_BACKGROUND : DAY_BACKGROUND });
    }
  }
  return out;
}

export const widthMmOf = (svg: string) => Number(/data-mm-width="([\d.]+)"/.exec(svg)?.[1] ?? 60);

/**
 * Rasterise with resvg. `systemFonts` is for human review only: goldens pass false so output cannot depend on
 * the machine's fonts (text is then simply not drawn; the SVG golden covers it instead).
 */
export function rasterise(s: Pick<RenderedSample, 'svg' | 'background'>, pxPerMm: number, systemFonts: boolean): Buffer {
  return new Resvg(s.svg, {
    fitTo: { mode: 'width', value: Math.round(widthMmOf(s.svg) * pxPerMm) },
    background: s.background,
    font: systemFonts ? { loadSystemFonts: true, defaultFontFamily: 'Arial' } : { loadSystemFonts: false },
  })
    .render()
    .asPng();
}
