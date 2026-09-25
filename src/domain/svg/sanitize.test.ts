// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { CENTRE_TOLERANCE_MM, isCentred, MAX_UPLOAD_BYTES, parseViewBox, sanitizeSvg } from './sanitize';

/** A minimal, valid uploaded part: centred viewBox, one shape. */
const svg = (body: string, attrs = 'viewBox="-20 -20 40 40"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;

const expectRejected = (input: string): string[] => {
  const result = sanitizeSvg(input);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.errors;
};

const expectAccepted = (input: string): string => {
  const result = sanitizeSvg(input);
  if (!result.ok) throw new Error(`expected accept, got: ${result.errors.join(' / ')}`);
  return result.svg;
};

describe('parseViewBox', () => {
  it('reads four numbers, comma- or space-separated', () => {
    expect(parseViewBox('-20 -20 40 40')).toEqual([-20, -20, 40, 40]);
    expect(parseViewBox('-20,-20, 40,40')).toEqual([-20, -20, 40, 40]);
  });

  it('rejects the wrong count, non-numbers and a zero extent', () => {
    expect(parseViewBox('-20 -20 40')).toBeNull();
    expect(parseViewBox('a b c d')).toBeNull();
    expect(parseViewBox('-20 -20 0 40')).toBeNull();
    expect(parseViewBox(null)).toBeNull();
  });
});

describe('isCentred', () => {
  it('accepts a centred box and one within tolerance', () => {
    expect(isCentred([-20, -20, 40, 40])).toBe(true);
    expect(isCentred([-20 + CENTRE_TOLERANCE_MM, -20, 40, 40])).toBe(true);
  });

  it('rejects a corner-origin box', () => {
    expect(isCentred([0, 0, 40, 40])).toBe(false);
  });
});

describe('sanitizeSvg — accepts valid art', () => {
  it('keeps allowed shapes and re-serialises', () => {
    const out = expectAccepted(svg('<circle r="15" fill="#123456"/>'));
    expect(out).toContain('<circle');
    expect(out).toContain('r="15"');
  });

  it('keeps data-role so the renderer can recolour it', () => {
    expect(expectAccepted(svg('<path d="M0 0 L1 1" data-role="primary"/>'))).toContain('data-role="primary"');
  });

  it('allows local #references in href and url()', () => {
    const out = expectAccepted(
      svg('<defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect width="10" height="10" fill="url(#g)"/><use href="#g"/>'),
    );
    expect(out).toContain('url(#g)');
  });

  it('allows the hand and strap group ids the spec expects', () => {
    const out = expectAccepted(svg('<g id="hour"><path d="M0 0"/></g><g id="minute"><path d="M0 0"/></g>'));
    expect(out).toContain('id="hour"');
  });

  it('returns the parsed viewBox', () => {
    const result = sanitizeSvg(svg('<circle r="1"/>'));
    expect(result.ok && result.viewBox).toEqual([-20, -20, 40, 40]);
  });
});

describe('sanitizeSvg — structural rules (spec §4)', () => {
  it('rejects a file over the size limit', () => {
    const padding = ' '.repeat(MAX_UPLOAD_BYTES);
    expect(expectRejected(svg(`<desc>${padding}</desc>`))[0]).toMatch(/limit is 512 KB/);
  });

  it('rejects an empty file', () => {
    expect(expectRejected('   ')[0]).toMatch(/empty/);
  });

  it('rejects markup that is not valid XML', () => {
    expect(expectRejected('<svg><circle></svg>')[0]).toMatch(/not valid XML/);
  });

  it('rejects a non-svg root', () => {
    expect(expectRejected('<html xmlns="http://www.w3.org/1999/xhtml"><body/></html>')[0]).toMatch(/must be an <svg>/);
  });

  it('rejects a missing viewBox', () => {
    expect(expectRejected(svg('<circle r="1"/>', 'width="40" height="40"'))[0]).toMatch(/needs a viewBox/);
  });

  it('rejects a viewBox that is not centred on the origin', () => {
    expect(expectRejected(svg('<circle r="1"/>', 'viewBox="0 0 40 40"'))[0]).toMatch(/not centred on the origin/);
  });

  it('rejects duplicate ids', () => {
    expect(expectRejected(svg('<g id="dup"/><g id="dup"/>'))[0]).toMatch(/Duplicate id "dup"/);
  });

  it('rejects an element outside the allow-list', () => {
    expect(expectRejected(svg('<style>.a{fill:red}</style>'))[0]).toMatch(/<style> is not an allowed element/);
  });
});

describe('sanitizeSvg — security fixtures', () => {
  it('rejects <script>', () => {
    expect(expectRejected(svg('<script>alert(1)</script>'))[0]).toMatch(/not allowed \(scripts\)/);
  });

  it('rejects an on* event handler', () => {
    expect(expectRejected(svg('<circle r="1" onload="alert(1)"/>'))[0]).toMatch(/event handler \(onload\)/);
  });

  it('rejects a javascript: href', () => {
    expect(expectRejected(svg('<use href="javascript:alert(1)"/>'))[0]).toMatch(/only local #references/);
  });

  it('rejects an external href', () => {
    expect(expectRejected(svg('<use href="https://evil.example/x.svg#a"/>'))[0]).toMatch(/only local #references/);
  });

  it('rejects an external xlink:href', () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-20 -20 40 40"><use xlink:href="https://evil.example/x.svg"/></svg>`;
    expect(expectRejected(input)[0]).toMatch(/only local #references/);
  });

  it('rejects an external url() reference', () => {
    expect(expectRejected(svg('<rect width="1" height="1" fill="url(https://evil.example/x#g)"/>'))[0]).toMatch(
      /references an external resource/,
    );
  });

  it('rejects @import', () => {
    expect(expectRejected(svg('<desc>@import url(https://evil.example/x.css);</desc>'))[0]).toMatch(/@import/);
  });

  it('rejects <foreignObject>', () => {
    expect(expectRejected(svg('<foreignObject width="1" height="1"/>'))[0]).toMatch(/foreignObject/);
  });

  it('rejects <image>', () => {
    expect(expectRejected(svg('<image href="data:image/png;base64,AAA" width="1" height="1"/>'))[0]).toMatch(
      /bitmap images/,
    );
  });

  it('rejects <iframe>', () => {
    expect(expectRejected(svg('<iframe/>'))[0]).toMatch(/iframes/);
  });

  it.each(['animate', 'animateTransform', 'animateMotion', 'set'])('rejects <%s>', (tag) => {
    expect(expectRejected(svg(`<${tag} attributeName="fill" to="red"/>`))[0]).toMatch(/animation/);
  });

  it('does not descend into a rejected element, so one reason is reported', () => {
    const errors = expectRejected(svg('<foreignObject><script>alert(1)</script></foreignObject>'));
    expect(errors).toHaveLength(1);
  });

  it('reports every independent problem at once', () => {
    const errors = expectRejected(svg('<circle r="1" onload="x()"/><iframe/>', 'viewBox="0 0 40 40"'));
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});
