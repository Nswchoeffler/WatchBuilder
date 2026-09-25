# SVG Canvas Spec (Phase 0)

Rules that every part visual must follow: the built-in templates and SVGs uploaded by users. The goal is for any part to drop into any build at the correct size and position with no manual adjustment.

## 1. Coordinate system

- **Units are millimetres.** One SVG user unit = 1mm. There's no scale factor to remember: a 42mm case is 42 units wide.
- **Origin (0,0) is the centre of the dial / hand pivot.**
- **+x points to 3:00, +y points to 6:00** (standard SVG orientation). 12:00 is −y.
- The scene's viewBox is set by the renderer, e.g. `-30 -40 60 80` for a watch with strap stubs. A part's own viewBox is only used to check that it's centred (see §4).

## 2. How each part type is drawn

| Part | Origin | Drawn orientation | Renderer applies |
|---|---|---|---|
| Case | dial centre | 12:00 up, **without** crown | – |
| Crown | centre of the stem exit on the case edge | stem points along +x | rotate(crown angle − 90), translate to the case crown point |
| Bezel | dial centre | 12:00 up | – |
| Bezel insert | dial centre | 12:00 up (marker at 12) | optional rotation (bezel setting) |
| Chapter ring | dial centre | 12:00 up | – |
| Dial | dial centre | 12:00 up; date/day windows/aperture where they appear on the finished watch | – |
| Date/day wheel (display) | dial centre | – | drawn by the renderer inside the dial's window shape |
| Hand (each) | pivot | pointing to 12:00 (−y) | rotate(time angle) |
| Crystal | dial centre | 12:00 up | drawn last, low opacity |
| Strap / bracelet | spring-bar centre | top half extends −y; bottom half extends +y | translate to the case's lug anchor points |

**Case anchors.** A case declares these in its measurements (not in the SVG) so the renderer can place other parts:
- `lugAnchors.top = (0, −y)` and `lugAnchors.bottom = (0, +y)`: the spring-bar centres, about ±(lug-to-lug/2 − 2).
- `crownPoint = (x, y)` on the case edge at the crown angle.

**Hand files.** One SVG containing `<g id="hour">`, `<g id="minute">`, `<g id="seconds">` and optionally `<g id="gmt">`. Each group is drawn pointing to 12.

**Strap files.** `<g id="top">` and `<g id="bottom">`. An integrated bracelet may add `<g id="endlinks">`, drawn in case coordinates.

## 3. Recolouring (roles)

A part can be recoloured without editing the file. Any element may carry `data-role`:

| Role | Meaning |
|---|---|
| `primary` | Main surface (dial base, case metal, insert base) |
| `secondary` | Second colour (insert numerals, sub-surfaces) |
| `accent` | Highlight colour (seconds hand tip, GMT hand, text) |
| `lume` | Luminous material |
| `metal` | Polished/brushed steel trim (indices, hand frames) |

The renderer overrides `fill`/`stroke` for role-tagged elements with the part's visual settings. Untagged elements keep their own colours.

Finishes (sunburst, matte, brushed, polished) are applied by the renderer as gradient/filter overlays clipped to the `primary` shape. Files don't need to draw them.

## 4. Upload rules (sanitization)

Uploads are checked at import time. **Rejected** if:
- over **512 KB**;
- the root isn't `<svg>`, or `viewBox` is missing;
- the viewBox isn't centred on the origin within 0.5mm (e.g. `-20 -20 40 40` is fine; `0 0 40 40` is rejected);
- it contains `<script>`, `<foreignObject>`, `<iframe>`, `<image>` (v1), `<animate*>` or `<set>`, any `on*` attribute, or any `href` / `xlink:href` that isn't a local `#fragment`;
- it references external resources: `url(http…)`, `@import`, or external fonts.

**Allowed elements:** `svg g defs path circle ellipse rect line polyline polygon text tspan linearGradient radialGradient stop clipPath mask pattern use title desc`.
Text is allowed, but outlining it to paths is recommended because fonts vary by device.

Sanitize with DOMPurify (SVG profile) **plus** the checks above. Then re-serialize and store the cleaned markup, never the original.

## 5. Size checks (warnings, not rejections)

After upload, the editor measures the drawn outline and compares it to the entered measurements:
- Case: width without crown ≈ `case.diameter` ±1.0
- Dial: outer circle ≈ `dial.diameter` ±0.3
- Bezel insert: outer/inner ≈ measurements ±0.3
- Minute hand: length ≈ `hands.minuteLength` ±0.5

A mismatch shows a warning in the part editor so contributors notice a drawing at the wrong scale.

## 6. Display defaults

- Time shown: **10:08:37** (classic display time; hands don't cover the logo or the date at 3).
- Date shows **17**; day shows **SUN**.
- Crystal: a white highlight arc at 10–11 o'clock, opacity ≈ 0.12.

## 7. Implementation notes (Phase 3)

- Scene: `src/render/WatchSvg.tsx`. Actual layer order (back → front): strap (top half drawn, bottom mirrored with `<use>`) → crown → case → bezel → bezel insert → dial → chapter ring → hands → crystal. The crown is **under** the case so the case edge hides the crown tube. Dial and chapter ring are clipped to the case opening (`bezelInnerRadius`).
- Every layer is a `<g data-layer="…" data-part="…">`; a template fallback adds `data-fallback`.
- All `id`s are prefixed per render, so several watches can share a page (`idPrefix` prop, or a React id).
- Date/day window centre sits at 0.76 × dial radius; window size scales with the dial.
- Uploaded art (Phase 5.2) is drawn by `render/uploaded/UploadedLayer.tsx` with `data-art="uploaded"` on the layer. A part with `kind: 'svg'` whose asset is missing falls back to the type's default template (`data-fallback="svg-pending"`).
- §5 checks live in `render/uploaded/scaleCheck.ts`. Bounds come from `getBBox`, which excludes strokes. The bezel insert's inner diameter is not checked.
