# Mod Watch Mockup Builder — Full Plan

_Last updated 2026-09-17. Phases 0–3 done; Phase 4 built, awaiting browser check._

## 1. Context

A tool for designing mockups of modded watches from real parts: movement, case, dial, hands, chapter ring, bezel, bezel insert, crystal, crown, strap/bracelet. Several configurators exist (Assemble Watches, WatchModMaker, DHWatchMods, MedoMods, …), but most only offer parts from their own shop and few check fit strictly. This one's difference: **strict, explained fitment checks**, **parts added by users**, and **true-to-scale 2D drawings**.

### Decisions
| Topic | Decision |
|---|---|
| Audience | Personal tool first, built so it can go public later |
| Visuals | Stylized 2D SVG front view, true to scale (1 unit = 1mm); dials generated from settings |
| Catalog | Users add parts; a part's look comes from a template + settings **or** an uploaded SVG |
| Fitment | Strict. Incompatible parts are greyed out with a reason; "show all" lets you pick them but marks the build invalid. Real-world workarounds are explicit modification flags |
| Movements | NH35/36, NH34 GMT, NH38 open heart, Miyota 8215/9015, ETA 2824 / SW200, VH31 quartz |
| Stack | Local-first browser app: Vite + React 19 + TypeScript 6.0 + Zod 4 + Dexie 4 (IndexedDB). No backend until Phase 7 |
| Naming | Generic style names only ("Diver 42", "Fluted Classic", "Octagon Integrated"), never watch trademarks |

### Reference docs
- [`compatibility-spec.md`](compatibility-spec.md): measurements, crown geometry, the 26 fit rules, verification checklist
- [`svg-canvas-spec.md`](svg-canvas-spec.md): drawing coordinate system, part anchors, upload rules
- [`seed-catalog.md`](seed-catalog.md): summary of built-in parts and reference test builds (code is the source of truth)

---

## 2. Current state (Phase 4 built)

- **Runs:** `npm run dev` → Builds library (`#/builds`), builder (`#/build/:id`), compare (`#/compare?ids=…`), parts catalog (`#/catalog`).
- **Checks:** `npm test` (229 tests), `npm run lint`, `npm run build`, `npm run previews` (renders sample builds to PNG via resvg).
- **Git:** committed on `main`, remote github.com/Nswchoeffler/WatchBuilder (private). CI in `.github/workflows/ci.yml`.
- **Not verified in a real browser by the assistant:** the Phase 4 screens and PNG export (tests run in jsdom; watch drawings reviewed via resvg previews).

### Architecture as built
```
src/
  domain/
    schemas/     common.ts (units, crown steps, visuals), parts.ts (10 part types), build.ts, pack.ts
    rules/       definitions/{movement,case,fittings}.ts (26 rules), evaluate.ts (evaluate, candidatesFor,
                 requiredSlots), geometry.ts, tolerances.ts, registry.ts, testkit.ts
  data/
    seed/        typed core catalog (movements, cases, dials, hands, accessories)
    catalog.ts   loadCorePack(), Catalog (lookup by pack-scoped ref)
    packs.ts     validatePack / parsePackJson / serializePack with readable errors
    sampleBuilds.ts
  storage/       db.ts (Dexie: packs, builds), useCatalog.ts
  render/
    WatchSvg.tsx layer stack, template lookup + fallback, strap mirroring, dial clip
    layout.ts    geometry derived from measurements, framing/viewBox
    templates/   case, bezel (+inserts, rings, crowns), dial generator, hands, crystal, strap
    export.ts    sizedSvg, svgToPngBlob, downloads
  ui/            app/ (routes, layout, context), builder/, library/, compare/, catalog/, common.tsx, labels.ts
scripts/render-previews.tsx
```

### Key concepts (for anyone picking this up)
- **Crown position = date-disc steps** (0 = 3:00, 2 = 3.8, 3 = 4.1). The date window, day wheel offset (≈2.5° for a 3:00 wheel in a 3.8 case) and open-heart alignment are all computed from this.
- **Parts are referenced by `{packId, partId}`**, so user packs never collide with the core catalog.
- **Build status:** `invalid` (any error or unresolved part) → `incomplete` (required slot empty; which slots are required depends on the parts chosen) → `warnings` → `valid`.
- **Modification flags** (`dial-dots`, `movement-spacer`, `day-wheel-swap`) downgrade a specific finding one level.

---

## 3. Completed phases

### Phase 0 — Measurement research & spec ✅
Compatibility spec, SVG canvas spec, and seed catalog written. Research changed the model in three ways: crown position stored as date steps; a separate bezel slot; 1 SVG unit = 1mm.

### Phase 1 — Foundation ✅
Zod schemas for all part types plus builds and packs; typed seed catalog (58 parts across 9 movements, 6 cases); pack import/export with part- and field-level error messages; Dexie storage; catalog browser. Cross-reference tests guarantee every case can form a complete build from core parts.

### Phase 2 — Rules engine ✅
26 rules with named tolerances; `evaluate` and `candidatesFor`; modification flags; 23 reference builds as tests; a test keeps the spec's rule list in sync with code.

### Phase 3 — Renderer ✅
True-scale scene; templates for 4 case styles, 2 bezels, 2 insert types, 2 ring types, 3 crowns, a parametric dial generator (4 finishes, 5 marker styles, date / day-date / open heart / 24h track), 5 hand styles + GMT, crystal with magnifier, 5 bracelets and 4 strap types; SVG/PNG export; in-app gallery; 82 render tests (every core part renders, no dangling references, scale, crown rotation, date placement).

---

## 4. Phase 4 — Builder UI (first version you can actually use) — built

**Status (2026-09-17):** screens, autosave, undo/redo, mods, parts list, compare and a new visual design (warm paper / graphite theme, brass accent, Instrument Serif + Manrope + JetBrains Mono, bundled via Fontsource) are in. 22 UI tests cover routes, draft history, picker filtering, the day-wheel acceptance case, missing-slot links, rename/autosave, library CRUD and compare. The octagon case drawing was reshaped (shorter case ends).
**Still open:** manual browser check of the acceptance criteria (esp. 375 px width, PNG export); golden-image diffs for previews; lazily rendered part thumbnails in the picker; performance measurement against the < 50 ms budget. Mods live inside `CheckPanel.tsx` rather than a separate `ModsPanel.tsx`.

**Goal:** design, check, save and compare your own builds end to end without touching code.

### 4.1 Screens and navigation
Hash-based routing (no router dependency): `#/builds` (library, default), `#/build/:id` (builder), `#/compare?ids=a,b,c`, `#/catalog`. The Phase 3 Gallery becomes "Start from a sample" inside the library.

### 4.2 Builder screen
Three-column layout on desktop; stacked on phone width.

| Area | Contents |
|---|---|
| **Slot list** (left) | All 10 slots in assembly order. Each shows the chosen part name (or "Empty"), a *required* marker (dynamic, from `requiredSlots`), and a status dot (error / warning / ok) from findings that touch that slot. Click to open its picker. Clear button per slot. |
| **Preview** (centre) | `WatchSvg` at true scale; toggle watch/head framing; zoom to fit. Hovering a finding highlights the slots it involves (dim other layers via `data-layer`). |
| **Picker** (right, for the active slot) | Candidates from `candidatesFor`, sorted compatible → warnings → incompatible, then by name. Each row: name, confidence badge, key measurements, and the reason text for warnings/errors. **Show all** toggle (off by default hides incompatible parts; on shows them greyed but selectable). Search by name/id; filter by pack and confidence. Hover a row to preview it in the watch before committing. |
| **Check panel** (below picker, or a tab) | Build status badge; findings grouped by severity with rule id and message; missing required slots as "Add a …" links; unresolved parts (from deleted packs) with a "Remove" action. |
| **Mods** | Toggles for modification flags. Only flags that a current finding suggests (`fix`) or that are already on are shown; unused flags are labelled "not needed". |
| **Parts list** | Bill of materials: slot, part name, pack, confidence, mods applied. Copy as text. |
| **Header** | Build name (inline rename), autosave indicator, Duplicate, Export SVG/PNG, Delete. |

### 4.3 Behaviour
- **Autosave** the draft to Dexie (debounced ~500 ms); `updatedAt` refreshed on change.
- **Undo/redo** for slot and flag changes (in-memory history stack; Ctrl/Cmd+Z, Shift+Z).
- **No silent changes:** picking a part never auto-removes other parts; conflicts appear as findings.
- **Keyboard:** slot list and picker navigable with arrow keys/Enter; focus visible.
- **Performance:** memoise `candidatesFor` per (slot, build); picker thumbnails render lazily. Target < 50 ms to re-evaluate a build with the core catalog.

### 4.4 Library screen
- Grid of saved builds: head-framed thumbnail, name, status, last edited.
- New build (blank), Start from sample, Duplicate, Rename, Delete (with confirm), select 2–3 → Compare.
- Empty state explains what a build is and offers the samples.

### 4.5 Compare screen
- 2–3 builds side by side rendered at the **same scale** (shared viewBox = the largest), so size differences are visible.
- Table below: rows = slots and key specs (case Ø, lug-to-lug, lug width, movement), differing cells highlighted; status per build.

### 4.6 Code layout
```
src/ui/
  app/        Router.tsx, useHashRoute.ts, Layout.tsx
  builder/    BuilderScreen.tsx, SlotList.tsx, PartPicker.tsx, CheckPanel.tsx, ModsPanel.tsx, PartsList.tsx,
              useBuildDraft.ts (load/autosave/undo), useCandidates.ts
  library/    LibraryScreen.tsx, BuildCard.tsx
  compare/    CompareScreen.tsx
  catalog/    CatalogView.tsx (moved)
```

### 4.7 Tests
- Add `@testing-library/react` + `jsdom` (dev).
- Unit: `useBuildDraft` (autosave, undo/redo), hash router.
- Component: picker hides incompatible parts by default and shows the reason; "show all" reveals them; selecting a part updates status; mod toggle downgrades a finding; missing-slot links open the right picker.
- Storage: library CRUD against fake-indexeddb.
- Visual: extend `npm run previews` to golden-image comparison (resvg + pixel diff with a small threshold) for sample builds, replacing the originally planned Playwright snapshots.

### 4.8 Acceptance criteria
1. From an empty build, assemble the "Diver 42 Classic" using only the UI, with incompatible dials hidden and their reasons visible under "show all".
2. Put an NH36 with a day-date dial in the 3.8 case: a warning names the ≈2.5° day offset; enabling `day-wheel-swap` clears it.
3. Reload the browser: the build, its flags and name are intact.
4. Compare the Diver 42 and Fluted 36 builds: the 36mm case is visibly smaller.
5. Works at 375 px width without horizontal scrolling.

---

## 5. Phase 5 — Part editor, uploads, packs & sharing

**Goal:** add your own parts (by settings or by uploading art), and share parts and builds without a server.

### 5.1 Part editor
- **Start points:** "New part" (choose type) or "Duplicate & edit" from any existing part (the expected common path).
- **Measurements form** per part type, validated live with the Zod schema; errors inline next to the field. Shared field components:
  - `MmField` (number + unit, step 0.01)
  - `CrownStepsField` (3:00 / 3.8 / 4.1)
  - `AngleField` (clock-position presets + custom degrees)
  - `HandHolesField`, enum selects, profile/seat/tube pickers that list values already used in the catalog (with "new…")
- **Confidence + notes + source link** fields; user parts default to `unverified`.
- **Live preview:** the part shown in a **reference build**: other slots auto-filled with the first compatible core part (`candidatesFor`), with the findings for that combination displayed, so the editor shows immediately whether the new part fits anything.
- **Visual tab:** template picker (templates valid for the type) + settings editor (colour pickers, finish, markers, lume on/off, dial text lines, metal finish).

### 5.2 Uploaded SVG art
- Dependency: `dompurify`.
- **Sanitise on upload** per `svg-canvas-spec.md` §4: size limit, root/viewBox checks, centred viewBox, element allow-list, no scripts/handlers/external refs/`foreignObject`/`image`; re-serialise the cleaned markup.
- **Scale check** per §5 (measure the drawing's bounds in the browser vs the entered measurements) → warnings, not rejection.
- **Renderer:** `render/uploaded/UploadedLayer.tsx` replaces the `svg-pending` fallback. It places art per part type (crown rotation, hands split by `#hour/#minute/#seconds/#gmt` groups and rotated, strap `#top/#bottom`), applies `data-role` recolouring, and prefixes all ids inside the art to keep references unique.
- **Security tests:** fixtures with `<script>`, `onload`, `javascript:` hrefs, external `url()`, `foreignObject`, `<image>`, CSS `@import`, and id collisions must all be rejected or neutralised.

### 5.3 Packs
- A default editable **"My Parts"** user pack; users can create more.
- **Pack manager:** list packs (core read-only), part counts, version; export pack to `.json`; import from file with the full validation report; delete pack (warns with the number of builds that reference it).
- **Versioning:** editing a user pack bumps its patch version; importing a pack with an existing id asks to replace (shows old → new version).
- **Schema migrations:** `data/migrations.ts` applies migrations by `schemaVersion` before validation, with a test per migration.

### 5.4 Sharing builds
- **Share link:** build (name, slots, flags) → JSON → `CompressionStream('deflate-raw')` → base64url in the URL hash (`#/share/…`). Opening it shows a read-only preview and "Save to my builds". If parts are missing, list the packs needed.
- **Build bundle file:** a `.json` export that embeds any non-core parts (and their assets) used by the build, so a build shares completely without separate packs.

### 5.5 Tests & acceptance
- Unit: sanitiser fixtures, id prefixing, share-link round trip, bundle round trip, migrations.
- Component: editor shows Zod errors inline; duplicating a dial and changing its diameter to 30.8 makes it incompatible with Diver 42 in the preview.
- **Acceptance:** (1) create a custom dial by settings and use it in a saved build; (2) upload an SVG bezel insert, see it drawn at the right size; (3) export "My Parts", delete it, re-import it, and the build that uses it recovers; (4) open a share link in a private window and see the same build.

---

## 6. Phase 6 — Catalog breadth & data quality

**Goal:** enough real, verified parts and styles that the tool is useful for most real mod plans.

### 6.1 Close the verification checklist (compatibility spec §7)
- Miyota 8215/9015, ETA 2824, SW200: casing diameters, height with hands, dial-feet angles (spec sheets, or calipers on real parts).
- VH31 hand post order; whether SW200 dials fit ETA 2824.
- Reference products for Sub-style 40 (crystal, lug-to-lug, stack height), Octagon 41 crystal, Fluted 39, and crown diameters/tubes.
- **Calibrate tolerances** against known-good real builds; record each calibration in the spec.
- Add `npm run catalog:report`: lists unverified parts/fields and parts that can't form any valid build.

### 6.2 More parts & styles
- **Movements:** NH39, NH70/NH72 (skeleton/open-worked), Miyota 9039, SW200 variants; `feetSystem` angle data once measured.
- **Cases (templates + reference products):** Turtle-style cushion, Tuna-style shroud, Samurai-style angular, SKX013-style 38mm, field/pilot, Explorer-style 36/39, Nautilus-style integrated.
- **Dials:** Explorer 3-6-9, pilot type A/B, California, sector, fumé gradient, guilloché; open-worked dials for skeleton movements; dial logo/text controls.
- **Bezels & inserts:** smooth polished bezel, 12-hour, countdown, compass, tachymeter; bezel rotation setting in the preview.
- **Hands:** snowflake, plongeur, cathedral, syringe, arrow.
- **Straps:** waffle rubber, more leather/canvas, fitted end links for more cases, mesh variants.
- **Mod flags:** dial-feet adapter (e.g. VH31 → NH), chapter-ring shim, more as the research finds them.

### 6.3 Rendering polish
- Lume "night view" toggle; dark background option for exports.
- Case-side detail (crown guards, bevels) per style; applied logo slot on dials.
- Golden-image tests extended to every new template.

### 6.4 Acceptance
- No part in the core catalog is `unverified` on a rule-relevant field, or it is explicitly listed in the report with a reason.
- Every core case has at least two distinct valid complete builds.

---

## 7. Phase 7 — Growth (after personal use proves it out)

**Goal:** make it a public tool without losing the local-first behaviour.

### 7.1 Hosted backend
- **Supabase:** auth (email/OAuth), Postgres tables for packs, parts, builds, assets (Storage bucket for SVGs), row-level security.
- **Sync:** IndexedDB stays the working copy; background sync of the user's builds/packs; public catalog pulled and cached locally (offline still works).
- **Moderation:** submitted parts enter a review queue (measurement sources required, sanitiser re-run server-side); approved parts publish to the shared catalog with contributor credit.
- **Deploy:** static front end on Vercel; preview deploys per branch.

### 7.2 Community features
- Public build pages with shareable URLs and OG images (rendered PNG), fork/remix a build, simple collections.
- Reporting of incorrect measurements on a part (feeds the verification queue).

### 7.3 Real products & cost
- `vendor_products` mapping real listings (vendor, SKU, URL, price, currency, last checked) onto catalog parts; many listings per part.
- Build cost totals and "where to buy" in the parts list; clear affiliate disclosure if affiliate links are used.

### 7.4 Beyond 2D
- Case-back / rotor view.
- Optional Three.js 3D view generated from the same measurements (extruded case/bezel, dial texture from the 2D renderer).

### 7.5 Before going public
- Trademark/naming review of all names and templates; rules for uploaded art (no brand logos).
- Terms of use and privacy notice; content licence for contributed parts.
- Abuse limits on uploads (size, rate).

---

## 8. Cross-cutting work

| Item | When |
|---|---|
| ~~Commit Phases 1–3, add a GitHub remote~~ ✅ | Done |
| CI (GitHub Actions): lint, typecheck, test, build ✅; previews golden diff still to add | Phase 4 |
| Browser verification: manual checklist per phase until a browser test tool is chosen | Every phase |
| Accessibility: keyboard navigation, focus states, colour contrast, SVG titles | Phase 4 onward |
| Performance budget: < 50 ms re-evaluate, < 100 ms render of a build, JS bundle watched (currently ~158 KB gzip JS) | Phase 4 onward |
| Docs kept in sync (spec rule ids already enforced by a test) | Always |

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Wrong measurements make the "strict" checks wrong | Confidence labels on every part, verification checklist, tolerances in one file, catalog report (Phase 6) |
| User-uploaded SVG is a security risk | Allow-list sanitiser, re-serialisation, id prefixing, fixture tests; server-side re-check in Phase 7 |
| Renderer differs between resvg previews and browsers | Manual browser check per phase; avoid fragile SVG features (focal-point gradients already removed) |
| Scope creep in catalog breadth | Phase 6 driven by the verification report and real builds you actually plan |
| Local-only data loss (browser storage cleared) | Pack and build bundle exports in Phase 5; sync in Phase 7 |

---

## 10. Open decisions

1. ~~**Commit & remote**~~ ✅ private GitHub repo.
2. **Hosting the personal version:** local only, or a static deploy (e.g. Vercel) so you can use it on your phone? (Works without a backend.)
3. **Preview style:** keep the current shaded look, or offer a flat "technical drawing" mode as well?
4. **Parts you own:** any real cases/dials/movements to use as reference products and calipers for Phase 6?

---

## 11. Verification (how we know each phase works)

- **Rules:** Vitest reference builds (valid/invalid) run on every change; they are the source of truth for fitment.
- **Schemas & packs:** round-trip tests; invalid data rejected with part- and field-level messages.
- **Renderer:** every core part renders with its own template, no dangling references, true-scale assertions; `npm run previews` for visual review, moving to golden-image diffs in Phase 4.
- **UI:** component tests with Testing Library (Phase 4+) and the acceptance criteria listed in each phase, checked manually in a browser.
- **End to end (after Phase 5):** build a Diver 42 NH36 mod from scratch, see incompatible dials greyed with reasons, create a custom dial, export/import it as a pack, share the build by link, export a PNG.
