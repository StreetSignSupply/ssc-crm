# Stencil generator — design note

Matt, 2026-11-09: match 1800stencil.com on most everything; use the public DOT/FHWA drawings those
stencils are cut from (or a library Matt approves); the program runs to completion by itself.
Owner of the daily run: the Claude task "SSS · Stencil Program Lead" (2:41 PM). Builder: Claude (first
cut 2026-11-09 afternoon). QA: CNC Bot. Test cuts: Equipment Manager + a person at the machine.

## Inputs
- Sheet SSS Pipeline `1aChWjS_R0ImI19AkBD-WAXRYoJz0douDNdhsASwIuVs`, tab **Stencil Build**
  (A sku, B price_list_code, C stencil_name, D category, E blank_size_in "W x H", F pieces,
  G ref_1800_url, H ref_1800_size, I kind text|symbol|kit, J source_id, K master_id,
  L nominal_in, M extents_in, N sheet_in, O tie_in, P dxf_url, Q proof_url, R sha256, S status, T notes).
- Spec: Drive `stencil-spec-rule.md` (1HnomOuNzAP7v5-DB1D49aQdEmMrvN1D7): 2.00 in margin every side,
  ties 1/2 in for legend height ≤ 24 in, 3/4 in over 24 in, ≥ 2 ties per island, 1/16 in release gate.
  NOMINAL = legend (letter) height; EXTENTS = legend bounding box W x H; SHEET = blank W x H.
- Glyphs: FHWA Standard Highway Signs, "Pavement Markings" chapter (public domain) —
  https://mutcd.fhwa.dot.gov/ser-shs_millennium_eng.htm ; 2024 phased release (EPS/SVG) —
  https://mutcd.fhwa.dot.gov/kno-shs_2024-release-status/ . Vectorize each letter/number once into
  `worker/stencil-glyphs/<char>.json` (closed outer path + inner paths, in units of letter height = 1.0),
  committed to the repo. Arrows and symbols that FHWA publishes go in the same folder as `fhwa-<name>.json`.
- Symbol masters drawn by Carla: Drive folder "Designer Out/Stencil Masters", files `MASTER-<state>-<shape>.dxf`
  at the drawing's native size, closed paths, ties already placed, no margin.

## Output per SKU
1. `<sku>.dxf` — DXF R12, inches, LWPOLYLINE/POLYLINE closed paths only, layers `CUT` (legend and ties)
   and `SHEET` (blank outline, for reference only). Legend scaled so letter height = NOMINAL, centered on the
   blank with ≥ 2.00 in margin on every side; multi-word legends on one line unless the price-list name says
   stacked. Ties: gaps of `tie_in` width cut through strokes so every island (inside of O, A, B, D, P, Q, R,
   0, 4, 6, 8, 9, arrow heads with holes) is held by at least two ties placed at opposite sides.
2. `<sku>.png` proof — 150 dpi, sheet outline, legend, ties in red, the three numbers printed in the corner.
3. sha256 of the DXF.
4. Drive upload to `Stencil Library/<category>/` (anyone-with-link view), then write P, Q, R, L–O and
   S = `generated` on the row (never `verified`). Post a Feed `file` row (kind cut_file) onto the CRM
   stencil record when the CRM has one for the SKU.

## Rules
- Text SKUs (kind=text): fully automatic. Symbol SKUs: only when `master_id` exists and the file is in Drive;
  scale the master so its height = NOMINAL, add margin and ties the same way.
- Never copy 1800stencil images or files; `ref_1800_size` is only compared against ours (flag > 1/4 in
  difference in notes).
- Idempotent: a row already `generated` with the same sha256 inputs is skipped; a changed spec re-generates.
- Cap per run via env `GEN_CAP` (300 default); dry run with `GEN_LIMIT=5`.
- Job summary (GitHub `$GITHUB_STEP_SUMMARY`): generated, skipped, failed (sku + reason).

## Workflow
`.github/workflows/stencil-gen.yml`: `workflow_dispatch` + schedule `17 20 * * *` (1:17 PM Mountain),
Google keyless auth like `crm-export.yml` (SHEETS_TOKEN also used for Drive), `node worker/stencil-gen.mjs`.
No CRM page is opened; everything goes through the Sheets and Drive REST APIs.

## First batch
25 SKUs: STOP / ONLY / numbers 0–9 at 12, 18 and 24 in, A–E letters at 12 in. CNC Bot QA → one per
category to the Run Queue → Equipment Manager test cut → measured numbers on the Lessons row. Volume only
after the first 25 pass.
