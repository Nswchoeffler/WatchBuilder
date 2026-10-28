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
| Miyota 9019 | miyota-90 | 26.00 | – | 3.90 | 5.65 (hand stack 1.75) | 1.52 / 1.00 / 0.17 | 3:00 | – | Frame drawing 901900C0, dial drawing 9019-20A: the 9015 with a lower hand stack | V |
| Miyota 9039 | miyota-90 | 26.00 | – | 3.90 | 5.65 (hand stack 0.90 + 0.40 + 0.45) | 1.52 / 1.00 / 0.17 | – | – | Frame drawing 903900C0, dial drawing 9039-20A: the 9015 without a date | V |
| Miyota 90S5 | miyota-90 | 26.00 | – | 3.90 | 6.00 (hand stack 2.10) | 1.52 / 1.00 / 0.17 | – | – | Open heart: dial opening Ø9.20 at (1.575, −6.399) ≈ 166° (dial drawing 90S5-20A) | V |
| Seiko NH39A | seiko-nh | 27.40 | 29.36 | 5.32 | 7.99 (tall post; only one listed) | 1.506 / 0.891 / 0.215 (stored 1.50 / 0.90 / 0.20) | – | – | 24-hour hand on its own post Ø0.21 at 5.78 from centre, 320.8° (dial hole Ø0.80 ± 0.05). Dial drawing also marks a max Ø10.00 open area at 265.3° (read as the balance aperture; the sheet does not name it). TMI spec sheet NH39_SS, rev. 16 Nov 2022 | V |
| Seiko NH70A / NH72A | seiko-nh-skeleton (mount `seiko-nh-27`) | 27.40 | 27.00 (+0 / −0.32), casing clamps, no dial-holding spacer | 5.32 | 7.59 (type M post; 7.99 tall) | 1.506 / 0.891 / 0.215 (stored 1.50 / 0.90 / 0.20) | – | – | Open-worked, three hands, no date; the two sheets differ only in plating (nickel / ruthenium grey). Ring dial: Ø31.50 ± 0.05, opening Ø23.90 at most. TMI spec sheets NH70_SS, NH72_SS. Own mount system `seiko-nh-27`: NH cases (built for the 29.36 casing) take it only with a spacer ring (`movement-spacer`) | V |
| ETA 2824-2 | eta-2824 | 25.60 (a stand-in: ETA publishes no overall diameter) | 25.60 (case fitting) | 4.60 | ? | 1.50 / 0.90 / 0.25 | 3:00 | – | ETA technical communication CT 2801-2 (ESI 289152 07, 2006; hosted by Cousins UK): "11 1/2''' Ø 25,60 mm", height on movement 4.60, hand fittings 1.50 / 0.90 / 0.256 (drawing dated 29.4.86). The document has no dial-feet drawing | V dims and hands (ETA); C feet |
| Sellita SW200-1 | sellita-sw200 (see §4) | 26.00 | 25.60 | 4.60 | ? | 1.50 / 0.90 / 0.25 | 3:00 | – | Own system `sellita-sw200` until it is confirmed that ETA 2824 dials match (some reports of ETA dial feet not lining up). Dims, hand fittings and dial feet from the Sellita technical documentation (DocTec SW200-1, rev. 07, 02.09.2024; feet in §4) | V |
| Seiko VH31A (quartz sweep) | vh | 23.70 | 23.30 | 3.45 | ? | 1.20 / 0.70 / 0.17 (order fixed by the nested hand pipes) | – | – | Needs a spacer ring in an NH case; needs VH-specific hands | V dims (TMI datasheet), C hands (Caliber Corner) |

**Takeaways already built into the rules:**
- **Hands don't cross families.** NH (1.50/0.90/0.20), Miyota 82 and 90 (both 1.52/1.00/0.17), ETA/SW (1.50/0.90/0.25) and VH31 all differ in at least one post. The Miyota 82 and 90 series share hands but not feet, stem height or stack.
- **Dial feet don't cross families.** An NH dial on a Miyota needs its feet removed and dial dots (C).
- **Mount systems** (`mountSystem` on movements, `movementMounts` / `spacerMounts` on cases): `seiko-nh`, `seiko-nh-27`, `miyota-26`, `eta-25.6`, `seiko-vh`. `seiko-nh-27` is the NH70A / NH72A: Seiko's "casing diameter" is 27.00 with casing clamps and no dial-holding spacer, against 29.36 for the NH35 family with its spacer. A case built for the 29.36 casing therefore lists `seiko-nh-27` under `spacerMounts` (every core case that takes `seiko-nh` does), so the pair needs a ring there (R-MC-1, fix `movement-spacer`).
- **`casingDiameter` vs `diameter`.** `diameter` is the overall outside diameter. `casingDiameter` is the manufacturer's case-fitting diameter: Seiko "casing diameter", Sellita / ETA "case fitting diameter" (diamètre d'encageage), what the case or its casing ring must provide for the movement as supplied. It can be larger than `diameter` (NH35: 27.40 outside, 29.36 with the dial-holding spacer) or smaller (VH31: 23.70 outside, 23.30 because the plate is not round); both are correct. SW200-1: 26.00 and 25.60. ETA 2824-2: only the 25.60 fitting value is published. No rule reads it yet.

---

## 4. Dial feet

- **seiko-nh:** 2 feet, 180° apart. For crown 3.0 they sit at the **8- and 38-minute** marks (48° / 228°). For crown 3.8 they sit at the **12- and 42-minute** marks (72° / 252°). Mod dials often carry both pairs (C, Crystaltimes).
- **seiko-nh-skeleton:** NH70A / NH72A dial drawing (V): F1 at (−10.600, +7.428) ≈ 305.0°, F2 at (+8.322, −9.932) ≈ 140.0°, both Ø0.74, for a 3:00 crown. Not the NH pair (the NH35 drawing puts F1 at (+9.672, +8.667) and F2 at (−9.466, −8.930), ≈ 48.1° / 226.7°, which the NH39 shares), so ring dials and ordinary NH dials do not swap without dial dots.
- **miyota-82:** Miyota dial drawing 8215-33E (V): DH1 at (2.165, −11.855) ≈ 170°, DH2 at (−7.065, 9.800) ≈ 324°, both Ø0.725, for a 3:00 crown. Matches Caliber Corner's "5:30 and 10:30".
- **miyota-90:** Miyota dial drawing 9015-20A (V): DH11 at (11.850, 2.830) ≈ 77°, DH12 at (−11.600, −3.760) ≈ 252°, both Ø0.70, for a 3:00 crown. Close to, but not the same as, the NH 3.8 pair (72° / 252°), so NH dials don't fit without dial dots.
- **sellita-sw200:** Sellita technical documentation SW200-1 (rev. 07, 02.09.2024), PDF page 21, drawing SW106765 A "Indications for dial SW 200-1" (V): F1 at (+11.60, +3.78), F2 at (−11.60, −3.78), i.e. **71.96° / 251.96°** at radius 12.20 (centre to centre 24.40), foot Ø0.75 (+0 / −0.14), centre hole **Ø2.00** (+0.06 / 0), for a 3:00 crown. Orientation: the drawing is the dial seen from above with the date window at 3:00 and the crown to the right; a mirrored view would read 108° / 288°, but the date side and the community "12 and 42 minutes" statement agree with 71.96° / 251.96°. Geometrically this is the NH 3.8 pair (72° / 252°) to 0.04°, but it is kept as its own system. The variant drawing SW108592 B (extra Ø2.30 aperture 10.40 below the centre) repeats the same feet. Source: https://www.sellita.ch/scripts/calibres/images/DocTec_SW200-1_7.pdf
- **eta-2824:** ETA's own technical communication (CT 2801-2, Cousins UK mirror) has no dial-feet drawing. Community only: feet "at approximately 12 and 42 minutes ... directly across from each other", pin about Ø0.75 (TimeZone thread). Otto Frei sells the same 28.50 dials for ETA 2804-2 / 2824-2 and Sellita SW200-1, and says they fit "all ETA and Sellita movements which have the same dial feet location" (C). One Watch Repair Talk report has an ETA-sold dial with feet too far apart for an SW200 (a single anecdote; the Sellita spacing is 24.40). So: SW200-1 verified, ETA 2824 community, same pair.
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
| namokiMODS cases "for SKX007 parts" (NMK907 no-guard 42 / 3.0, NMK906 angular 43 / 3.0, NMK919 monobloc 42.5 / 3.0, NMK956 cushion 45 / 3.8) | Outer sizes and crown position from each listing (NMK956 crown from its straight-on photo). Each says it takes SKX007 crystals, bezels, inserts, crowns and chapter rings, so the inside fittings are the Diver 42's | C (vendor) |
| Lucius Atelier dress cases (Explorer 36 Ultra Thin, Pilot 34 Ultra Thin, 1908 36 Ultra Thin, GS 39 v2) | Full published tables: diameter, lug-to-lug, lugs, crystal size (29.5 or 28.6, pre-installed), integral bezel, SKX013-spec crown, SKX013-spec ring **required**, 28.5 dial, movement list (NH34 on all but the Explorer; ETA 2824 / SW200 on the GS 39). Crowns at 3 from straight-on product photos | C (vendor) |
| SKX013-spec crowns (ref: Lucius Atelier) | Coin edge Ø6.0 × 3.0, knurled Ø6.0 × 3.7, big coin edge Ø7.0 × 3.7; tube modelled as `skx013` | C (vendor) |
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
- **R-MC-1 Mount:** `case.movementMounts` contains `movement.mountSystem` → **Error**. Fix `movement-spacer` when `case.spacerMounts` includes it (e.g. VH31 in an NH case; NH70 / NH72, mount `seiko-nh-27`, in any NH case). For `seiko-nh-27` the message adds why: "Its casing diameter is 27.00mm (casing clamps, no dial-holding spacer) and this case is built for the 29.36mm NH casing, so the movement needs a ring to fill the gap."
- **R-MC-2 Height:** `movement.heightWithHands ≤ case.maxMovementStack`. Over by more than 0.2 → **Error**; over by up to 0.2 → **Warning** (tight).

### Movement ↔ Dial
- **R-MD-1 Feet:** `dial.feetSystem == movement.feetSystem` → **Error**. Fix `dial-dots` (cut the feet, use adhesive dots) → Warning; for an NH dial on a VH movement the fix is `dial-feet-adapter` instead. Dials with `feetSystem: none` always pass, with Info "needs dial dots".
- **R-MD-2 Date:** the dial has a date window but the movement has no date → **Error**. The movement has a date but the dial has no window → **Info** (a "ghost" date position when pulling the crown). Both present and a case chosen: the window must sit on a date-disc step relative to where the movement's date lands (`movementToDial`), within 1.0° → otherwise **Warning** (numerals off-centre).
- **R-MD-3 Day:** the dial has a day window but the movement has no day wheel → **Error**. The day wheel is indexed for a crown position; the offset `(case.crownSteps − day.crownSteps) × 11.613°` must land on a day step (25.714°) within 1.0° → otherwise **Warning** ("day off-centre ≈2.5°" for 3:00 wheel in a 3.8 case). Fix `day-wheel-swap` → Info. Day wheel with no day window → Info.
- **R-MD-4 Open heart:** the dial has an aperture but the movement isn't open-heart → **Error**. The movement is open-heart but the dial has no aperture → Info. Both present and a case chosen: aperture must be within 3° of the balance after crown rotation → otherwise **Error**.
- **R-MD-5 GMT centre hole:** `dial.centerHole ≥ movement.minDialCenterHole` → **Error**.

- **R-MD-6 Sub-dial posts:** each sub-dial hole on the dial needs a movement post that shows the same thing (24-hour, small seconds, chrono counters), else **Error**. The hole must be at least as wide as the post → **Error**. With a case chosen, the post is rotated by the crown position (`movementToDial`) and its distance from the hole centre must not exceed the hole's clearance, `(hole − post) / 2` plus 0.05 → otherwise **Error** (post would not pass through). A movement post the dial has no hole for → **Info** (the post is covered; there can be no hand).
- **R-MD-7 Open-worked movement:** a movement with `openWork` and a dial with an open centre wider than `maxDialOpening` → **Error** (the dial loses its support). A solid dial over an open-worked movement → **Info** (valid, but it hides what you paid for). A dial with an open centre over a plain movement → **Warning** (it shows an ordinary plate, date wheel and all, not open-work). Feet are checked by R-MD-1, which is how a ring dial and an ordinary NH dial are kept apart.

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
- **R-MH-3 Sub-dial hands:** for each movement sub-dial post, the hand set needs a hand of the same kind (missing → **Warning**, like GMT) with a hole within 0.015 of the post → **Error**. A hand for a post the movement lacks → **Error**.
- *Quartz vs mechanical hands need no rule of their own: R-MH-1 catches them through post sizes.*

### Hands ↔ Dial / Ring
- **R-HD-1 Length:** `hands.minuteLength ≤ ringOrDialRadius + 0.3` → **Warning** (may foul a sloped chapter ring).
- **R-HD-2 GMT dial:** a dial with a 24h scale and no GMT hand → **Info**.

- **R-HD-3 Sub-dial hand length:** a sub-dial hand longer than the dial's sub-dial radius + 0.3 → **Warning** (may cross the printing).

### Modification flags (v1)
`dial-dots`, `movement-spacer`, `day-wheel-swap`, `dial-feet-adapter`. Each flag is stored on the build, shown in its parts list, and only downgrades the rules named above.

---

## 7. Checks still to do before core-catalog parts ship

1. ETA 2824 / SW200 / VH31: heights with hands, dial-feet angles; Miyota 8215 height with hands. **Miyota 8215 and 9015 resolved 2026-10-27** from Miyota's own frame and dial drawings (miyotamovement.com): feet, centre holes, hand posts and the 9015 stack are in §3 and §4. **SW200-1 feet resolved 2026-10-28** from Sellita's documentation (§4). Still open: heights with hands for ETA / SW200 / VH31 (neither Sellita nor ETA publishes a stack total; their hand-fitting tables give heights over the dial seat only), ETA 2824 feet (no ETA drawing exists in the technical communication). Open lead: Miyota's dial drawing **CAL.8215-36E** (https://miyotamovement.com/uploads/product/product_gtIlMOi0fnaLCYQNAV.pdf; image-only PDF, not yet read, not previously cited here) is probably the other date/crown variant of the 8215 and may carry a second feet pattern. Also unread: the 8215 spec and frame drawings, and the 821A drawing.
2. ~~VH31 hand post order~~ resolved 2026-10-23: 1.20 / 0.70 / 0.17 is hour / minute / seconds, since each hand pipe fits over the next. Sizes are still community (Caliber Corner); the TMI technical guide gives none.
3. Whether SW200-1 dial feet actually match ETA 2824-2. SW200-1 is now verified (71.96° / 251.96°, §4); the ETA technical communication carries no feet drawing, so ETA stays community. One vendor for (Otto Frei sells one dial for both) and one forum anecdote against; still modelled as separate systems.
4. Reference cases: fluted 36 and octagon 41 now have vendor-published measurements. Still open (2026-10-28 pass):
   - **Miyota 8215 case:** dead end again. No vendor publishes a dial seat and crystal seat for a case sold for the 8215 (Tandorio, Lucius, namokiMODS, Delhi Watch Co and San Martin checked); Miyota's sheet says casing ring and clamps with 26.00, so most "8215 / NH35" cases are NH cases with another ring. Path: ask Tandorio or DIY Watch Club for a drawing, or caliper a case.
   - **Sub-style 40:** closest published product is namokiMODS NMK909 (40 / 47.5 lug-to-lug / 11 case only / lugs 22, "fits all original and aftermarket SKX007 mod parts"). No crown position, crystal size, stack height or tube. A 22mm-lug SKX007 clone, not necessarily our case (lugs 20), so no field was changed. The 38×30.6 insert equals the sloped SKX007 insert.
   - **Fluted 39:** dead end; no vendor table (only retail watches and titles).
   - **Octagon 41:** crystal diameter still unpublished (Nomods lists "Sapphire" with no size). Nomods gives dial fit 30.8–31.8 and, for a 30.8 waffle dial (NH35 / NH36, crown 3:00), no centre hole or date-window geometry, so no 30.8 dial is added.
   - **Crown tube thread** (M2.5 vs M3.0): not published anywhere found. Crown diameter: 7 mm for SKX007-spec crowns (namokiMODS, Lucius, assemble.watch; community). Applied to the Diver 42 and Sub-style 40 crowns; the Fluted and Octagon crowns have no sourced diameter, so they are unchanged.
5. NH34 "standard dial centre hole ≈2.1" and GMT dial hole 2.9. Confirm with a vendor drawing. (Not touched in the 2026-10-28 pass.)
6. Tolerance values (0.015 posts, 0.05 crystal, 0.1/0.2 insert). These are engineering guesses; tune them against real known-good builds.

---

## Sources
- Time Module (TMI) spec sheets, rev. 16 Nov 2022: [NH39A](https://www.timemodule.com/upload/category/28/spec_sheet/NH39_SS.pdf), [NH70A](https://www.timemodule.com/upload/category/29/spec_sheet/NH70_SS.pdf), [NH72A](https://www.timemodule.com/upload/category/31/spec_sheet/NH72_SS.pdf), [NH35A](https://www.timemodule.com/upload/category/24/spec_sheet/NH35_SS.pdf)
- [Caliber Corner — NH35A](https://calibercorner.com/seiko-caliber-nh35a/)
- [Caliber Corner — NH34](https://calibercorner.com/seiko-caliber-nh34/)
- [Horology Beats — NH34 guide](https://horologybeats.com/blogs/seiko-mod-guides/nh34-gmt-movement-guide)
- [Lucius Atelier — NH34 compatibility](https://luciusatelier.com/blogs/news/compatibility-breakdown-of-seiko-5-gmt-series-nh34-movement)
- [CalderoneWatchCo — NH38 explained](https://calderonewatchco.com/blogs/the-watch-journal/the-seiko-nh38-explained-the-no-date-open-heart-workhorse)
- [WatchUSeek — Miyota 8215/9015 hand hole sizes](https://www.watchuseek.com/threads/hand-hole-sizes-for-miyota-8215-or-9015-movement.1734218/)
- [Miyota — 8215](https://miyotamovement.com/product/8215/)
- [Miyota — 9015](https://miyotamovement.com/product/9015/) (spec sheet, frame drawing 901500C0, dial drawings 9015-20A / -20Y)
- [Caliber Corner — Miyota 9039 vs 9015](https://calibercorner.com/miyota-caliber-9039-vs-9015/)
- Miyota [9019](https://miyotamovement.com/product/9019/), [9039](https://miyotamovement.com/product/9039/), [90S5](https://miyotamovement.com/product/90S5/) (spec sheets, frame and dial drawings)
- namokiMODS [NMK907](https://www.namokimods.com/products/nmk907-no-crown-guard-skx-watch-case-polished-finish), [NMK906](https://www.namokimods.com/products/nmk906-samurai-skx-watch-case-polished-finish), [NMK919](https://www.namokimods.com/products/nmk919-3h-mm300-skx-watch-case-polished-finish), [NMK956](https://www.namokimods.com/products/nmk956-turtle-skx007-watch-case-polished-finish)
- Lucius Atelier [Explorer 36 UT](https://luciusatelier.com/products/explorer-watch-case-36mm-ultra-thin-edition), [Pilot 34 UT](https://luciusatelier.com/products/pilot-watch-case-34mm-ultra-thin-edition), [1908 36 UT](https://luciusatelier.com/products/1908-watch-case-36mm-ultra-thin-edition-nh34-ready), [GS 39 v2](https://luciusatelier.com/products/gs-watch-case-39mm-v2-nh34-ready)
- [namokiMODS — NMK948 Miyota SKX case](https://www.namokimods.com/products/nmk948-miyota-skx-case-steel-finish)
- [Otto Frei — dials for ETA / Sellita](https://www.ofrei.com/page813.html)
- [Sellita — technical documentation SW200-1, rev. 07](https://www.sellita.ch/scripts/calibres/images/DocTec_SW200-1_7.pdf) (case fitting diameter, dial drawing SW106765 A, hand fittings)
- [ETA — technical communication 2801-2 to 2836-2 (Cousins UK mirror)](https://www.cousinsuk.com/pdf/categories/29_eta2801.2-eta2836.2.pdf)
- [Seiko Instruments — NH35A movement specification (casing diameter with dial-holding spacer)](https://gleave.london/content/TECH/Hattori%20NH35%20-%20Specification.pdf)
- [TimeZone — ETA / Sellita dial feet at 12 and 42 minutes](https://forums.timezone.com/index.php?t=msg&th=291327&rid=0)
- [namokiMODS — NMK909 Sub SKX007 case](https://www.namokimods.com/products/nmk909-sub-skx007-srpd-watch-case-polished-black-finish), [Chunky Crown Mk2](https://www.namokimods.com/products/skx007-chunky-crown-mk2); [Lucius — Crown II 7mm](https://luciusatelier.com/products/skx013-crown-ii-diamond-7mm); [assemble.watch — SKX crown](https://assemble.watch/parts/crowns/namoki_skx_crown_polished_finish) (a pointer, not a primary source)
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
