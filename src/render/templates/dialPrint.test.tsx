import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { resolveParts, type ResolvedParts } from '../../domain/rules';
import { catalogWith, corePart, mixedBuild } from '../../domain/rules/testkit';
import type { Dial } from '../../domain/schemas';
import { TEMPLATE_CATALOG } from '../templateCatalog';
import { WatchSvg } from '../WatchSvg';
import { DIAL_MARKS, DIAL_TEXT_MAX, dialPrintStyle, layoutDialPrint, printText } from './dialPrint';

/** The core Diver Black dial with `params` added and `changes` applied. */
function dialWith(params: Record<string, unknown>, changes: Partial<Dial> = {}): Dial {
  const dial = corePart('dl-diver-black', 'dial');
  const visual = dial.visual.kind === 'template' ? dial.visual : null;
  return { ...dial, ...changes, id: 'dl-test', visual: { ...visual!, params: { ...visual!.params, textTop: undefined, textBottom: undefined, mark: undefined, ...params } } };
}

const draw = (dial: Dial, night = false) => {
  const parts = resolveParts(
    mixedBuild({ case: 'cs-diver42-38', movement: 'mv-nh35', dial: 'test:dl-test' }),
    catalogWith([dial]),
  ).parts as ResolvedParts;
  return renderToStaticMarkup(<WatchSvg parts={parts} idPrefix="t" night={night} />);
};

const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

describe('dial text and applied mark', () => {
  it('draws nothing extra by default', () => {
    expect(draw(dialWith({}))).not.toContain('data-dial-print');
  });

  it('prints the top and bottom lines in the same font as the numerals', () => {
    const svg = draw(dialWith({ textTop: 'AUTOMATIC', textBottom: '200M' }));
    expect(texts(svg)).toEqual(expect.arrayContaining(['AUTOMATIC', '200M']));
    // The numerals' FONT, as React escapes it.
    expect(svg).toContain('data-dial-print=""><g font-family="&#x27;Helvetica Neue&#x27;, Helvetica, Arial, sans-serif"');
  });

  it('draws each mark shape, and none for "none"', () => {
    for (const mark of DIAL_MARKS) {
      const svg = draw(dialWith({ mark }));
      expect(svg.includes('data-dial-print'), mark).toBe(mark !== 'none');
    }
  });

  it('caps text length, strips control characters and ignores non-strings', () => {
    expect(printText({ t: 'X'.repeat(40) }, 't')).toHaveLength(DIAL_TEXT_MAX);
    expect(printText({ t: ' AUTO\n\tMATIC \u0000' }, 't')).toBe('AUTO MATIC');
    expect(printText({ t: 12 }, 't')).toBe('');
    expect(texts(draw(dialWith({ textTop: 'Y'.repeat(40) })))).toContain('Y'.repeat(DIAL_TEXT_MAX));
  });

  it('takes the text colour from the dial ink unless set', () => {
    expect(dialPrintStyle({}, '#112233', '#ffffff').ink).toBe('#112233');
    expect(dialPrintStyle({ textColor: '#aabbcc' }, '#112233', '#ffffff').ink).toBe('#aabbcc');
    expect(dialPrintStyle({ textColor: 'red' }, '#112233', '#ffffff').ink).toBe('#112233');
  });

  it('still reads the older "text" lines', () => {
    const style = dialPrintStyle({ text: ['ONE', 'TWO'] }, '#fff', '#fff');
    expect([style.top, style.bottom]).toEqual(['ONE', 'TWO']);
  });

  it('works from the dial radius, so a smaller dial scales the print', () => {
    const big = layoutDialPrint({ top: 'AUTOMATIC', bottom: '', mark: 'none' }, 14.25, []);
    const small = layoutDialPrint({ top: 'AUTOMATIC', bottom: '', mark: 'none' }, 7.125, []);
    expect(big.topY).toBeCloseTo(small.topY! * 2);
  });

  describe('keeps clear of the date window and the open-heart aperture', () => {
    const style = { top: 'AUTOMATIC', bottom: '200M', mark: 'bar' } as const;
    const r = 14.25;
    // The open-heart aperture: centre 0.52r out, radius 0.24r.
    const heartAt = (y: number) => ({ x0: -0.24 * r, x1: 0.24 * r, y0: y * r - 0.24 * r, y1: y * r + 0.24 * r });

    it('leaves out the mark when an aperture sits at 12 and moves the text below it', () => {
      const layout = layoutDialPrint(style, r, [heartAt(-0.52)]);
      expect(layout.mark).toBe(false);
      expect(layout.topY === null || layout.topY > r * -0.28 + 0.1).toBe(true);
    });

    it('leaves out bottom text when an aperture sits at 6', () => {
      expect(layoutDialPrint(style, r, [heartAt(0.52)]).bottomY).toBeNull();
    });

    it('does not move for a date window at 3', () => {
      const alone = layoutDialPrint(style, r, []);
      const dial = dialWith({}, { dateWindow: { angle: 90 } });
      expect(draw(dial)).toBeTruthy();
      expect(alone.topY).not.toBeNull();
      expect(alone.bottomY).not.toBeNull();
    });

    it('draws no text over an open-heart dial at 12 or 6', () => {
      const at12 = draw(dialWith({ textTop: 'AUTOMATIC', mark: 'bar' }, { openHeartAperture: { angle: 0 } }));
      expect(texts(at12)).not.toContain('AUTOMATIC');
      expect(at12).not.toContain('data-dial-print');
      const at6 = draw(dialWith({ textBottom: '200M' }, { openHeartAperture: { angle: 180 } }));
      expect(texts(at6)).not.toContain('200M');
    });
  });

  it('is not lume: the night view lights nothing extra', () => {
    const lume = (svg: string) => (svg.match(/class="lume"/g) ?? []).length;
    expect(lume(draw(dialWith({ textTop: 'AUTOMATIC', mark: 'shield' }), true))).toBe(lume(draw(dialWith({}), true)));
  });

  it('is offered by the editor for every dial template, with the same length limit', () => {
    for (const tpl of TEMPLATE_CATALOG.dial) {
      for (const key of ['textTop', 'textBottom']) {
        const spec = tpl.params.find((p) => p.key === key);
        expect(spec?.kind, `${tpl.id} ${key}`).toBe('text');
        if (spec?.kind === 'text') expect(spec.maxLength).toBe(DIAL_TEXT_MAX);
      }
      const mark = tpl.params.find((p) => p.key === 'mark');
      expect(mark?.kind === 'choice' && [...mark.choices]).toEqual([...DIAL_MARKS]);
      expect(tpl.params.some((p) => p.key === 'textColor')).toBe(true);
    }
  });
});
