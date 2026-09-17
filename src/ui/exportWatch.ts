import { downloadBlob, safeFilename, serializeSvg, sizedSvg, svgToPngBlob, widthForScale } from '../render/export';

const PX_PER_MM = 20;
/** Light stage colour, so exports look the same whatever the app theme. */
const EXPORT_BACKGROUND = '#f3efe6';

/** The rendered watch inside a container (skips the empty-build placeholder). */
export function watchSvgIn(container: HTMLElement | null): SVGSVGElement | null {
  return container?.querySelector<SVGSVGElement>('svg[data-mm-width]') ?? null;
}

export function exportSvg(el: SVGSVGElement, name: string): void {
  const svg = serializeSvg(el);
  downloadBlob(new Blob([sizedSvg(svg, widthForScale(svg, PX_PER_MM))], { type: 'image/svg+xml' }), `${safeFilename(name)}.svg`);
}

export async function exportPng(el: SVGSVGElement, name: string): Promise<void> {
  const svg = serializeSvg(el);
  downloadBlob(await svgToPngBlob(svg, widthForScale(svg, PX_PER_MM), EXPORT_BACKGROUND), `${safeFilename(name)}.png`);
}
