# Seed Catalog (Phase 0)

> **Source of truth is now the code:** `src/data/seed/*.ts`. This page is a summary; if they disagree, the code wins.

The built-in "core pack" for v1. It exists to prove out the rules and renderer, not to be exhaustive.

The conf. column follows the confidence labels in `compatibility-spec.md` (V = verified, C = community, ? = unverified). Every part carries a `confidence` field (`verified` / `community` / `unverified`), which the UI shows as a badge.

## Naming policy
Parts use **generic style names**, never watch brand names or trademarks. Examples:
- "Sub-style"
- "Datejust-style" → **"Fluted Classic"**
- "Royal Oak-style" → **"Octagon Integrated"**
- "SKX-style" → **"Diver 42"**

Seiko caliber names (NH35 etc.) are fine: they're sold as components under those names. A part's `inspiredBy` field may hold a descriptive note for search, but it's never shown as the name.

## Movements (9)
| id | Name | Conf. |
|---|---|---|
| mv-nh35 | Seiko NH35A | V |
| mv-nh36 | Seiko NH36A (day-date) | V |
| mv-nh34 | Seiko NH34A GMT | C |
| mv-nh38 | Seiko NH38A Open Heart | C |
| mv-m8215 | Miyota 8215 | V |
| mv-m9015 | Miyota 9015 | C |
| mv-eta2824 | ETA 2824-2 | C |
| mv-sw200 | Sellita SW200-1 | C |
| mv-vh31 | Seiko VH31 (quartz sweep) | ? |

## Cases (6)
| id | Name | Key measurements | Conf. |
|---|---|---|---|
| cs-diver42-38 | Diver 42 (crown 3.8) | Ø42, lug-to-lug 46, lugs 22, dial 28.5, ring 30.5 optional, crystal 31.5, bezel seat `diver42`, NH mount (VH via spacer) | V |
| cs-diver42-30 | Diver 42 (crown 3.0) | same, crown 3.0 | C |
| cs-sub40 | Sub-style 40 | Ø40, lugs 20, crown 3.0, dial 28.3–29.0, insert 38×30.6, mid-size ring optional, bezel seat `sub40` | ? |
| cs-fluted36 | Fluted Classic 36 | Ø36, lug-to-lug 43, lugs 20, crown 3.0, dial 28.5, crystal 29.5, mid-size ring **required**, NH + ETA mounts, not NH34 (stack ≤ 7.7) | C |
| cs-fluted39 | Fluted Classic 39 | Ø39, lug-to-lug 48, lugs 20, crown 3.0, bezel seat `fluted39` | ? |
| cs-octagon41 | Octagon Integrated 41 | Ø41, lug-to-lug 51, thickness 12.6, crown 3.0, dial 30.8–31.8, no ring, bezel integral, integrated profile `octagon41` | C |

## Bezels (4) / inserts (5)
- **Bezels:**
  - `bz-diver42-sloped` (insert 38.0/30.6, sloped)
  - `bz-diver42-flat` (38.0/31.5, flat)
  - `bz-sub40` (insert ?)
  - `bz-fluted36` / `bz-fluted39` (no insert)
- **Inserts:**
  - `in-diver42-dive-black` (sloped)
  - `in-diver42-gmt-pepsi` (flat, 24h)
  - `in-diver42-dive-blue` (sloped)
  - `in-sub40-ceramic-black` (?)
  - `in-sub40-gmt-black-blue` (?)

## Dials (8)
| id | Name | Ø | Feet / crown steps | Windows | Conf. |
|---|---|---|---|---|---|
| dl-diver-black | Diver Black | 28.5 | seiko-nh / [0, 2] | date 3 | C |
| dl-diver-daydate | Diver Day-Date | 28.5 | seiko-nh / [2] | day-date 3 | C |
| dl-sub-black | Sub-style Black | 28.5 | seiko-nh / [0] | date 3 | C |
| dl-sunburst-blue | Sunburst Blue Classic | 28.5 | seiko-nh / [0] | date 3 | C |
| dl-gmt-black | GMT Black 24h | 28.5 | seiko-nh / [0] | date 3, centre hole 2.9 | C |
| dl-openheart-silver | Open Heart Silver | 28.5 | seiko-nh / [0] | aperture 9 | C |
| dl-tapisserie-blue | Tapisserie Blue | 30.8 | seiko-nh / [0] | date 3 | C |
| dl-sterile-miyota | Sterile No-Date (Miyota) | 28.5 | miyota-82 / [0] | none | ? |

## Hands (6)
| id | Name | Posts H/M/S (GMT) | Conf. |
|---|---|---|---|
| hd-nh-mercedes | Mercedes (NH) | 1.50/0.90/0.20 | V |
| hd-nh-sword | Sword (NH) | 1.50/0.90/0.20 | V |
| hd-nh34-gmt | GMT Mercedes (NH34) | 1.50/0.90/0.20 (2.20) | C |
| hd-m8215-baton | Baton (Miyota 8215) | 1.52/1.00/0.17 | V |
| hd-eta-dauphine | Dauphine (ETA/SW) | 1.50/0.90/0.25 | C |
| hd-vh31-pencil | Pencil (VH31) | 1.20/0.70/0.17 | ? |

## Chapter rings (4), crystals (5), crowns (4)
- **Rings:**
  - `cr-diver42-silver` (30.5/27.5, height 2.3)
  - `cr-diver42-black` (same)
  - `cr-mid-silver` (28.5/24.5, height 1.5; SKX013-spec)
  - `cr-mid-thin-silver` (28.5/26.5, height 1.5)
- **Crystals:**
  - `cy-diver42-flat` (Ø31.5)
  - `cy-diver42-dd` (Ø31.5, double dome)
  - `cy-sub40-magnifier` (?)
  - `cy-fluted36-flat` (Ø29.5 × 1.5)
  - `cy-octagon41-flat` (?)
- **Crowns:**
  - `cw-diver42` (tube `diver42`)
  - `cw-sub40` (tube `sub40`)
  - `cw-fluted36` (tube `fluted36`)
  - `cw-octagon41` (tube `octagon41`)

## Straps (6)
| id | Name | Width | End-link / integrated | Conf. |
|---|---|---|---|---|
| st-oyster-22-diver42 | Oyster 22 (fitted, Diver 42) | 22 | end links `diver42` | C |
| st-jubilee-22 | Jubilee 22 (straight) | 22 | – | C |
| st-nato-22-black | NATO 22 Black | 22 | – | V |
| st-oyster-20 | Oyster 20 | 20 | – | C |
| st-jubilee-20 | Jubilee 20 | 20 | – | C |
| st-octagon41-bracelet | Octagon Integrated Bracelet | – | integrated `octagon41` | C |

## Reference test builds

Implemented as `src/domain/rules/reference-builds.test.ts`, which also adds T14–T23 (stack height, complete GMT and octagon builds, ring requirements, feet on Miyota, magnifier, crown/crystal/strap mismatches).
| # | Build | Expected |
|---|---|---|
| T1 | cs-diver42-38 + mv-nh35 + dl-diver-black + hd-nh-mercedes + bz-diver42-sloped + in-diver42-dive-black + cr-diver42-silver + cy-diver42-dd + cw-diver42 + st-oyster-22-diver42 | **Valid** |
| T2 | T1 with dl-sub-black (crown steps [0] only) | **Error** R-CD-1 |
| T3 | T2 + `dial-dots` flag | **Warning** only |
| T4 | T1 with hd-m8215-baton | **Error** R-MH-1 |
| T5 | T1 with st-jubilee-20 | **Error** R-CS-2 |
| T6 | T1 with in-diver42-gmt-pepsi (flat) on bz-diver42-sloped | **Error** R-BI-2 (inner 31.5 vs 30.6) + R-BI-3 |
| T7 | T1 with mv-nh36 + dl-diver-daydate | **Warning** R-MD-3 (day wheel), cleared by `day-wheel-swap` |
| T8 | cs-sub40 + mv-nh35 + dl-gmt-black + hd-nh-mercedes | **Valid**: R-MD-5 passes (dial hole 2.9 ≥ NH35's 2.1); **Info** R-HD-2 (24h scale, no GMT hand) |
| T9 | cs-sub40 + mv-nh34 + dl-sub-black | **Error** R-MD-5 (dial hole 2.1 < 2.9) |
| T10 | cs-sub40 + mv-nh35 + dl-openheart-silver | **Error** R-MD-4 |
| T11 | cs-octagon41 + st-oyster-20 | **Error** R-CS-1 |
| T12 | cs-fluted36 + bz-fluted36 + in-diver42-dive-black | **Error** R-BI-1 |
| T13 | cs-diver42-38 + mv-vh31 | **Error** R-MC-1; **Warning** with `movement-spacer` |
