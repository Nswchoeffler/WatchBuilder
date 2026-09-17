// SVG / PNG export. `sizedSvg` is pure (tested); the rest needs a browser.

const XMLNS = 'http://www.w3.org/2000/svg';

/** Parse "x y w h" from an SVG string's viewBox. */
export function viewBoxOf(svg: string): [number, number, number, number] | null {
  const m = /viewBox="([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)"/.exec(svg);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])] : null;
}

/**
 * Give the root <svg> explicit pixel width/height (keeping the viewBox aspect), replacing any
 * existing size attributes. Needed for rasterising via <img>, and for predictable file output.
 */
export function sizedSvg(svg: string, widthPx: number): string {
  const vb = viewBoxOf(svg);
  if (!vb) throw new Error('SVG has no viewBox');
  const heightPx = Math.round((widthPx * vb[3]) / vb[2]);
  return svg.replace(/<svg\b([^>]*)>/, (_, attrs: string) => {
    const cleaned = attrs.replace(/\s(width|height)="[^"]*"/g, '');
    const xmlns = cleaned.includes('xmlns=') ? '' : ` xmlns="${XMLNS}"`;
    return `<svg${cleaned}${xmlns} width="${widthPx}" height="${heightPx}">`;
  });
}

/** Pixels for a given physical scale, e.g. 20 px per mm. */
export const widthForScale = (svg: string, pxPerMm: number): number => Math.round((viewBoxOf(svg)?.[2] ?? 60) * pxPerMm);

export function serializeSvg(el: SVGSVGElement): string {
  return new XMLSerializer().serializeToString(el);
}

export async function svgToPngBlob(svg: string, widthPx: number, background = '#ffffff'): Promise<Blob> {
  const sized = sizedSvg(svg, widthPx);
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const g = canvas.getContext('2d');
    if (!g) throw new Error('Canvas 2D is not available');
    g.fillStyle = background;
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0);
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const safeFilename = (name: string) => name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'watch';
