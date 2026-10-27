# Compatibility Spec (Phase 0)

The fitment rules and the measurement data behind them. The rules engine (Phase 2) is built directly from this document. Every rule here should become code with tests.

**Confidence labels** used throughout:
- **V (Verified):** from a manufacturer spec sheet / drawing, or several independent vendors agreeing.
- **C (Community):** a single vendor listing or forum consensus. Good enough to build with, but confirm before relying on it.
- **? (Unverified):** placeholder or conflicting sources. Must be checked (spec sheet or calipers) before the part ships in the core catalog.

All lengths are in **millimetres**. All angles are in **degrees clockwise from 12 o'clock**, seen from the dial side.

---

## 1. Slots

A build has one part per slot. Slots marked * are required for a complete build.

| Slot | Notes |
|---|---|
| movement* | Sets hand posts, dial-feet system, date/day, GMT, open heart |
| case* | Sets crown position, movement mount, dial seat, bezel seat, crystal, lugs, crown tube |
| dial* | |
| hands* | Set of 3 or 4 (GMT) |
| chapterRing | Required, optional or forbidden depending on the case |
| bezel | The rotating/fixed bezel ring. Holds the insert. Forbidden if the case's bezel is part of the case (e.g. octagon) |
| bezelInsert | Only if the bezel takes an insert |
| crystal* | |
| crown* | |
| strap* | Strap, bracelet or integrated bracelet |
| dayWheel / dateWheel | Optional recolor/alignment parts (Phase 6); in v1 they're movement settings |

---

## 2. Crown position geometry (the key insight)

In the Seiko NH ecosystem the **movement is identical** whatever the crown position. The "crown position" is really **how far the dial is rotated relative to the movement**, and that rotation is set by where the dial feet sit.

The standard crown positions are **whole steps of the date disc**:

| Name | Steps | Angle past 3:00 | Absolute angle | Used by |
|---|---|---|---|---|
| 3.0 | 0 | 0° | 90° | Most Sub/DJ/octagon-style mod cases, Samurai-style mod cases |
| 3.8 ("4 o'clock") | 2 | 23.23° | 113.23° | SKX007/009, SRPD, Turtle |
| 4.1 | 3 | 34.84° | 124.84° | Some aftermarket cases |

- A 31-day date disc has a step of 360/31 = **11.613°**. So 2 steps = 23.23° and 3 steps = 34.84°. These match forum measurements of 3.8 ≈ 23.23° and 4.1 ≈ 34.84° (C). The match is why the **date disc works in any of these positions**: the numbers still land centred in the window. The date just needs setting once.
- An NH36 **day wheel** has 14 positions (7 days × 2 languages), a step of **25.714°**. 23.23° isn't a multiple of that, so the day sits about 2.5° off-centre. Crown-specific day wheels exist; forum reports say a movement sold as "crown at 3" needs a day-wheel swap for a 3.8 case (C).
- The open-heart aperture (NH38) rotates with the crown in the same way. NH38 dials are cut for a specific crown position (C).

**How the model represents it:** a case stores `crownSteps` (0, 2 or 3). A dial stores the set of `crownSteps` it has feet for (many mod dials carry two pairs of feet you snap off). The date/day/open-heart positions are derived from these, not typed in by hand.

---

## 3. Movement reference data

| Caliber | Family / feet system | Diameter | Casing dia | Height | Height w/ hands | Hand posts H / M / S (GMT) | Date | Day | Notes | Conf. |
|---|---|---|---|---|---|---|---|---|---|---|
| Seiko NH35A | seiko-nh | 27.40 | 29.36 | 5.32 | ~7.6 | 1.50 / 0.90 / 0.20 | 3:00 | – | Datasheet lists "150/89/21" | V dims, V hands |
| Seiko NH36A | seiko-nh | 27.40 | 29.36 | 5.32 | ~7.6 | 1.50 / 0.90 / 0.20 | 3:00 | 3:00 (day wheel is crown-specific) | | V dims, C day wheel |
| Seiko NH34A (GMT) | seiko-nh | 27.40 | 29.36 | 5.32 | ~8.0 (+0.4 GMT stack) | 1.50 / 0.90 / 0.20 (GMT 2.20) | 3:00 | – | Needs dial centre hole ≈2.9 (standard ≈2.1) | C |
| Seiko NH38A (open heart) | seiko-nh | 27.40 | 29.36 | 5.32 | ~7.6 | 1.50 / 0.90 / 0.20 | – | – | Balance aperture at 9:00 (crown 3.0 frame) | C |
| Miyota 8215 | miyota-82 | 26.00 (case fitting 25.60) | – | 5.67 | ~7.4 | 1.52 / 1.00 / 0.17 | 3:00 | – | Miyota frame drawing 821500C1 and dial drawing 8215-33E: dial centre hole 2.00 ± 0.04, stem 2.52 above the dial side | V dims, V hands, V feet; ? stack |
| Miyota 9015 | miyota-90 | 26.00 (case fitting 25.60) | – | 3.90 | 6.00 (hand stack 2.10) | 1.52 / 1.00 / 0.17 | 3:00 (-20A) or 6:00 (-20Y) | – | Miyota frame drawing 901500C0 and dial drawings 9015-20A / -20Y: dial centre hole 2.00 ± 0.04, stem 1.53 above the dial side. The hour post is 1.52 (the seed had 1.50; Caliber Corner was right). Feet shared with the 9039 (Caliber Corner) | V |
| ETA 2824-2 | eta-2824 | 25.60 | ? | 4.60 | ? | 1.50 / 0.90 / 0.25 | 3:00 | – | | C |
| Sellita SW200-1 | eta-2824* | 26.00 (case fitting 25.60) | ? | 4.60 | ? | 1.50 / 0.90 / 0.25 | 3:00 | – | *Some reports of ETA dial feet not lining up; model as its own system `sellita-sw200` until checked. Dims and hand fittings from the Sellita technical documentation (rev. 07, 2024); its dial drawing gives the feet only graphically | V dims, V hands, C feet |
| Seiko VH31A (quartz sweep) | vh | 23.70 | 23.30 | 3.45 | ? | 1.20 / 0.70 / 0.17 (order fixed by the nested hand pipes) | – | – | Needs a spacer ring in an NH case; needs VH-specific hands | V dims (TMI datasheet), C hands (Caliber Corner) |

**Takeaways already built into the rules:**
- **Hands don't cross families.** NH (1.50/0.90/0.20), Miyota 82 and 90 (both 1.52/1.00/0.17), ETA/SW (1.50/0.90/0.25) and VH31 all differ in at least one post. The Miyota 82 and 90 series share hands but not feet, stem height or stack.
- **Dial feet don't cross families.** An NH dial on a Miyota needs its feet removed and dial dots (C).

---

## 4. Dial feet

- **seiko-nh:** 2 feet, 180° apart. For crown 3.0 they sit at the **8- and 38-minute** marks (48° / 228°). For crown 3.8 they sit at the **12- and 42-minute** marks (72° / 252°). Mod dials often carry both pairs (C, Crystaltimes).
- **miyota-82:** Miyota dial drawing 8215-33E (V): DH1 at (2.165, −11.855) ≈ 170°, DH2 at (−7.065, 9.800) ≈ 324°, both Ø0.725, for a 3:00 crown. Matches Caliber Corner's "5:30 and 10:30".
- **miyota-90:** Miyota dial drawing 9015-20A (V): DH11 at (11.850, 2.830) ≈ 77°, DH12 at (−11.600, −3.760) ≈ 252°, both Ø0.70, for a 3:00 crown. Close to, but not the same as, the NH 3.8 pair (72° / 252°), so NH dials don't fit without dial dots.
- **eta-2824:** multi-feet dials use the 12/42-minute pair for ETA (?, conflicts with the NH figure above; needs a drawing). Otto Frei sells the same 28.50 dials for ETA 2804-2 / 2824-2 and Sellita SW200-1, and says they fit "all ETA and Sellita movements which have the same dial feet location" (C, for SW200 = ETA 2824 feet).
- **vh:** separate pattern. No dial with VH31 feet was found for sale (2026-10-27); VH31 builds use a spacer ring or 3D-printed holder that carries NH feet (8/38 minutes, some with the 3.8 pair too) and a normal NH dial (C). Modelled as the `dial-feet-adapter` flag.

Coordinates are (x, y) in mm from the dial centre, x towards 3:00, y towards 12:00, angles clockwise from 12:00.

v1 models feet as `feetSystem` + `crownSteps[]`. Storing exact angles is a later refinement once the ? rows are measured.

---

## 5. Case, bezel, insert, ring and crystal reference data

| Part | Key measurements | Conf. |
|---|---|---|
| SKX007-style case (e.g. Namoki NMK901) | Ø42, lug-to-lug 46, thickness 10.2, lugs 22, crown 3.8, dial 28.5, NH mount | V (vendor) / crown V |
| SKX013-style case (e.g. NMK903) | Ø38, lug-to-lug 44.5, thickness 10 | C |
| SKX chapter ring | outer 30.5 / inner 27.5 / height 2.3 / thickness 1.5 | V (several vendors) |
| SKX crystal | Ø31.5; flat ≈2.9–3.0 thick; double dome ≈4.7 | V |
| SKX007/009/SRPD insert, flat | outer 38.0 / inner 31.5 | V (Namoki table) |
| SKX007/009/SRPD insert, sloped | outer 38.0 / inner 30.6 | V |
| SKX013 insert | outer 33.7 / inner 27.5 | V |
| SRP Turtle insert | outer 39.1 / inner 32.5 | V |
| SNZH insert | outer 39.5 / inner 32.5 | V |
| Sumo insert | outer 39.75 / inner 31.55 | V |
| TMI (Seiko 5 GMT-style) insert | outer 39.4 / inner 33.5 | C |
| Fluted dress case 36 (ref: Lucius Atelier Datejust 36) | Ø36, lug-to-lug 43, lugs 20, thickness 11.5, dial 28.5, flat crystal 29.5 × 1.5, SKX013-spec ring **mandatory**, NH35/36/38 + ETA 2824 / SW200, **not NH34** | C (vendor) |
| SKX013-spec chapter ring | outer 28.5 / inner 24.5 / height 1.5 (skinny: inner 26.5) | C |
| Octagon integrated case (ref: Nomods 41mm) | Ø41, lug-to-lug 51, thickness 12.6, crown 3.0, dial 30.8–31.8, NH35/38/70/72 (no NH34 listed), 22mm integrated bracelet; vendor recommends longer hands | C (vendor); crystal ? |
| Sub-style case 40 | Ø40, thickness 13.4 incl. crystal, lugs 20, dial 28.5–29, insert 38 × 30.6, SKX013-spec ring | C (listings); crystal / lug-to-lug ? |
| Miyota SKX-style case (ref: namokiMODS NMK948) | Ø42.5, lug-to-lug 46.4, thickness 9.7 case / 11.3 with slim bezel and crystal, lugs 22, integrated rehaut (no chapter ring), Miyota 9015 / 90S5 / 9019 / 9029 / 9039 only, takes all SKX007 bezels, inserts, crystals and crowns. Crown at 3.8 (product photo). Sells no Miyota dials: its 28.5 Seiko no-date dials fit with feet clipped and dial dots | C (vendor); crown position from photo; stack and end links ? |
| ETA dial (ref: Otto Frei DIAL-PLAIN-2804) | Ø28.50, 0.40 thick, no printing, date at 3, for ETA 2804-2 / 2824-2 and Sellita SW200-1 / SW220-1 | C (vendor); centre hole ? |

**Case measurements differ by vendor.** A "style" only supplies visual defaults. Every case part must carry its own measurements; nothing is inherited from the style name.

---

## 6. Rules

Format: **ID — what's compared — condition — result if it fails.**
- **Error:** the build is invalid; the part is greyed out in the picker.
- **Warning:** the build is valid but flagged.
- **Info:** shown only as a note.

A **fix**, where listed, is a modification flag. Enabling it downgrades that specific finding one level: Error → Warning, Warning → Info.

**Completeness is separate from rules.** A build is *incomplete* when a required slot is empty. Required slots: movement, case, dial, hands, crystal, crown, strap; plus **bezel** when the case bezel isn't integral, **bezel insert** when the bezel has an insert recess, and **chapter ring** when the case requires one. Build status is `invalid` (any error or unresolved part) → `incomplete` → `warnings` → `valid`.

Implemented in `src/domain/rules/` (tolerances in `tolerances.ts`). Tests: `reference-builds.test.ts`.

### Movement ↔ Case
- **R-MC-1 Mount:** `case.movementMounts` contains `movement.mountSystem` → **Error**. Fix `movement-spacer` when `case.spacerMounts` includes it (e.g. VH31 in an NH case).
- **R-MC-2 Height:** `movement.heightWithHands ≤ case.maxMovementStack`. Over by more than 0.2 → **Error**; over by up to 0.2 → **Warning** (tight).

### Movement ↔ Dial
- **R-MD-1 Feet:** `dial.feetSystem == movement.feetSystem` → **Error**. Fix `dial-dots` (cut the feet, use adhesive dots) → Warning; for an NH dial on a VH movement the fix is `dial-feet-adapter` instead. Dials with `feetSystem: none` always pass, with Info "needs dial dots".
- **R-MD-2 Date:** the dial has a date window but the movement has no date → **Error**. The movement has a date but the dial has no window → **Info** (a "ghost" date position when pulling the crown). Both present and a case chosen: the window must sit on a date-disc step relative to where the movement's date lands (`movementToDial`), within 1.0° → otherwise **Warning** (numerals off-centre).
- **R-MD-3 Day:** the dial has a day window but the movement has no day wheel → **Error**. The day wheel is indexed for a crown position; the offset `(case.crownSteps − day.crownSteps) × 11.613°` must land on a day step (25.714°) within 1.0° → otherwise **Warning** ("day off-centre ≈2.5°" for 3:00 wheel in a 3.8 case). Fix `day-wheel-swap` → Info. Day wheel with no day window → Info.
- **R-MD-4 Open heart:** the dial has an aperture but the movement isn't open-heart → **Error**. The movement is open-heart but the dial has no aperture → Info. Both present and a case chosen: aperture must be within 3° of the balance after crown rotation → otherwise **Error**.
- **R-MD-5 GMT centre hole:** `dial.centerHole ≥ movement.minDialCenterHole` → **Error**.

### Case ↔ Dial
- **R-CD-1 Crown:** `case.crownSteps ∈ dial.crownSteps` → **Error** (date/aperture misaligned; feet won't locate). Fix `dial-dots` → Warning. Skipped for feetless dials.
- **R-CD-2 Diameter:** `case.dialSeat.min ≤ dial.diameter ≤ case.dialSeat.max`. Too big → **Error** (won't seat). Too small → **Error**, unless the chapter ring's inner diameter covers the gap (ring.innerDiameter < dial.diameter − 0.2), in which case it's a **Warning**.

### Case ↔ Chapter ring ↔ Dial
- **R-CR-1 No ring seat:** case.chapterRing = `none` and a ring is fitted → **Error**. (A *required* ring that is missing makes the build incomplete, e.g. Fluted Classic 36.)
- **R-CR-2 Seat:** `|ring.outerDiameter − case.chapterRingSeat| ≤ 0.1` → **Error**.
- **R-CR-3 Coverage:** `ring.innerDiameter ≥ dial.diameter` → **Warning** (dial edge/seat shows).

### Case ↔ Bezel ↔ Insert
- **R-CB-1 Bezel seat:** `bezel.seat ≠ case.bezelSeat` → **Error**. A bezel on an `integral`-bezel case → **Error**.
- **R-BI-1 Insert presence:** an insert with no bezel, or in a bezel with no insert recess → **Error**. (A recess with no insert makes the build incomplete.)
- **R-BI-2 Insert size:** `|insert.outer − bezel.insertOuter| ≤ 0.1` and `|insert.inner − bezel.insertInner| ≤ 0.2` → **Error**.
- **R-BI-3 Insert profile:** `insert.profile == bezel.insertProfile` (flat / sloped) → **Error**.

### Case ↔ Crystal
- **R-CC-1 Diameter:** `|crystal.diameter − case.crystalSeat| ≤ 0.05` → **Error** (press/gasket fit).
- **R-CC-2 Magnifier:** magnifier more than 3° from the dial's date window → **Warning**. Magnifier with no date window → **Warning**.

### Case ↔ Crown
- **R-CW-1 Tube:** `crown.tube == case.crownTube` → **Error**.

### Case ↔ Strap
- **R-CS-1 Integrated:** the case has an integrated profile → the strap must have the same `integratedProfile` → **Error**. A non-integrated case with an integrated strap → **Error**.
- **R-CS-2 Width:** `strap.width == case.lugWidth` → **Error**.
- **R-CS-3 Fitted end links:** `strap.endLinkProfile` set and ≠ `case.endLinkProfile` → **Warning** (gaps/rub).

### Movement ↔ Hands
- **R-MH-1 Posts:** for each of hour/minute/seconds: `|hands.hole − movement.post| ≤ 0.015` → **Error**. One finding per mismatched hand. Hands without a seconds hand on a movement with a seconds post → **Warning**; a seconds hand on a movement with no seconds post → **Error**. No fix.
- **R-MH-2 GMT hand:** the hands include a GMT hand and the movement isn't GMT → **Error**. The movement is GMT and the hands have no GMT hand → **Warning**. Both present: GMT hole must match the GMT post within 0.015 → **Error**.
- *Quartz vs mechanical hands need no rule of their own: R-MH-1 catches them through post sizes.*

### Hands ↔ Dial / Ring
- **R-HD-1 Length:** `hands.minuteLength ≤ ringOrDialRadius + 0.3` → **Warning** (may foul a sloped chapter ring).
- **R-HD-2 GMT dial:** a dial with a 24h scale and no GMT hand → **Info**.

### Modification flags (v1)
`dial-dots`, `movement-spacer`, `day-wheel-swap`, `dial-feet-adapter`. Each flag is stored on the build, shown in its parts list, and only downgrades the rules named above.

---

## 7. Checks still to do before core-catalog parts ship

1. ETA 2824 / SW200 / VH31: heights with hands, dial-feet angles; Miyota 8215 height with hands. **Miyota 8215 and 9015 resolved 2026-10-27** from Miyota's own frame and dial drawings (miyotamovement.com): feet, centre holes, hand posts and the 9015 stack are in §3 and §4.
2. ~~VH31 hand post order~~ resolved 2026-10-23: 1.20 / 0.70 / 0.17 is hour / minute / seconds, since each hand pipe fits over the next. Sizes are still community (Caliber Corner); the TMI technical guide gives none.
3. Whether SW200-1 dial feet actually match ETA 2824-2. Now one vendor for (Otto Frei sells one dial for both) and one forum report against; still modelled as separate systems.
4. Reference cases: fluted 36 and octagon 41 now have vendor-published measurements. Still open: a Sub-style 40 reference product (crystal, lug-to-lug, stack height), the octagon 41 crystal, and all fluted 39 values.
5. NH34 "standard dial centre hole ≈2.1" and GMT dial hole 2.9. Confirm with a vendor drawing.
6. Tolerance values (0.015 posts, 0.05 crystal, 0.1/0.2 insert). These are engineering guesses; tune them against real known-good builds.

---

## Sources
- [Caliber Corner — NH35A](https://calibercorner.com/seiko-caliber-nh35a/)
- [Caliber Corner — NH34](https://calibercorner.com/seiko-caliber-nh34/)
- [Horology Beats — NH34 guide](https://horologybeats.com/blogs/seiko-mod-guides/nh34-gmt-movement-guide)
- [Lucius Atelier — NH34 compatibility](https://luciusatelier.com/blogs/news/compatibility-breakdown-of-seiko-5-gmt-series-nh34-movement)
- [CalderoneWatchCo — NH38 explained](https://calderonewatchco.com/blogs/the-watch-journal/the-seiko-nh38-explained-the-no-date-open-heart-workhorse)
- [WatchUSeek — Miyota 8215/9015 hand hole sizes](https://www.watchuseek.com/threads/hand-hole-sizes-for-miyota-8215-or-9015-movement.1734218/)
- [Miyota — 8215](https://miyotamovement.com/product/8215/)
- [Miyota — 9015](https://miyotamovement.com/product/9015/) (spec sheet, frame drawing 901500C0, dial drawings 9015-20A / -20Y)
- [Caliber Corner — Miyota 9039 vs 9015](https://calibercorner.com/miyota-caliber-9039-vs-9015/)
- [namokiMODS — NMK948 Miyota SKX case](https://www.namokimods.com/products/nmk948-miyota-skx-case-steel-finish)
- [Otto Frei — dials for ETA / Sellita](https://www.ofrei.com/page813.html)
- [eBay — VH31 spacer ring with NH35 dial feet](https://www.ebay.de/itm/177428492614)
- [Caliber Corner — SW200](https://calibercorner.com/sellita-caliber-sw200/)
- [Watch Repair Talk — ETA 2824 feet vs SW200](https://www.watchrepairtalk.com/topic/13126-eta-2824-dial-feet-do-not-match-my-sellita-sw200/)
- [Caliber Corner — VH31](https://calibercorner.com/seiko-caliber-vh31/)
- [Seikomodder — Quartz mod guide](https://www.seikomodder.com/2025/06/04/quartz-seiko-mod-guide-affordable-precision-for-seiko-modders-2025/)
- [Thingiverse — VH31 → NH dial feet adapter](https://www.thingiverse.com/thing:6683661)
- [Crystaltimes — Guide to Seiko mod dials](https://usa.crystaltimes.net/a-guide-to-seiko-mod-dials/)
- [Crystaltimes — SKX007 chapter ring dimensions](https://usa.crystaltimes.net/skx007-chapter-ring-dimensions/)
- [Crystaltimes — SKX007 double dome crystal](https://usa.crystaltimes.net/shop/skx007-mod-parts/skx007-sapphire-crystals/ct037-double-dome-sapphire-crystal-skx007-srpd/)
- [namokiMODS — Bezel insert sizes](https://www.namokimods.com/pages/seiko-bezel-insert-sizes)
- [namokiMODS — NMK901 SKX case](https://www.namokimods.com/products/skx-watch-case-polished-finish)
- [DIY Watch Club — Parts compatibility](https://diywatch.club/en/blog/parts-compatibility-for-seiko-mod)
- [WatchUSeek — SKX009 + NH36 day wheel](https://www.watchuseek.com/threads/skx009-nh36-4-oclock-movement-do-i-need-to-swap-day-wheel.5473588/)
- [WatchUSeek — How crown position affects NH35](https://www.watchuseek.com/threads/how-does-crown-position-affect-nh35.5521685/)
- [Nomods — Octagon 41mm case](https://nomods.co/products/royal-oak-41mm-case)
- [Lucius Atelier — Datejust-style 36mm case](https://luciusatelier.com/products/datejust-watch-case-36mm)
