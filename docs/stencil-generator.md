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

## Built 2026-11-09 (Claude)
- Glyphs traced into `worker/stencil-glyphs/`: `fhwa-pavement-elongated` (SHS Pavement Markings 10-1..10-7, letters
  and numbers; counters of O and P come from the white fills on 10-3) and `fhwa-series-b/c/d/e/em/f` (SHS Standard
  Alphabets 2000, uppercase, numerals and hyphen, with the font's own advance widths). Source PDFs and page SVGs:
  branch `stencil-source-<run>` from `.github/workflows/stencil-source.yml`.
- Alphabet choice: state DOT wording or 48 in and up → elongated pavement alphabet (letter gap 0.05 x height); smaller
  legends → the Series (C, D, E or B) whose legend width comes closest to the 1800 reference size, else Series C.
  Checked: 12 in X-ING Series C = 37.26 in wide vs reference 38; 96 in WAY elongated = 55.68 vs 56.
- Checks per file: the sheet left after cutting is one piece, 2.00 in margin, closed paths, ties per island.
- Files: Drive won't take uploads owned by the service account (no storage quota), so the workflow saves its output to a
  new `stencil-out-<run id>` branch; the Stencil Program Lead (Claude, with Drive) files them in
  `Stencil Library/<category>/` and writes the row. Sheet SHEET = extents + 2 x 2.00 in rounded up to 1/4 in; a
  difference from the price-list blank goes in the row's notes.

## Rebuilt 2026-11-09 evening (Stencil Program Lead) — this is the generator that runs now
The first batch above (run 42706463004) failed the Program Lead's self-check against stencil-spec-rule.md:
(1) SHEET was extents + 4 in, not the price-list blank (spec: the legend must fit the stock blank, else HOLD);
(2) the DXF carried a second layer SHEET (spec: one layer CUT — the CNC could cut the outline);
(3) 1/2 in ties on 12 in Series C strokes (~1.6 in) are over the spec's 25 %-of-stroke limit (spec: HOLD for Carla).
Those 25 rows were marked 'qa fail' and the generator was replaced:
- `worker/stencil-gen.mjs` (sheet I/O, caps, second check, publishing) + `worker/stencil_core.py` (geometry: shapely,
  DXF: ezdxf R12, proof: Pillow). Glyphs: `worker/stencil-glyphs/{C,D,P}.json` built by `build-glyphs.py` from the
  stencil-source branch (Series C/D = the FHWA Standard Alphabets 2000 font embedded in Alphabets.pdf, with its own
  advances; P = elongated pavement alphabet SHS 10-1..10-7, white-fill counters subtracted, letter gap H/16).
  The older `fhwa-*.json` traces are kept for reference.
- NOMINAL = the number in the name (spec) unless column L is filled; LEGEND = the trailing capital words of the name.
- Layout: C, D and P, one line or stacked by words. SHEET = the price-list blank (either orientation, listed one first);
  EXTENTS + 2 x 2.00 in must fit it. With a 1800 reference size (column H) the layout whose extents come closest to it
  wins; without one, the layout must use >= 60 % of the blank on each axis (otherwise blank/font is wrong → hold).
- Ties: two per island at the island's mid-height (left and right, through the stroke). Over 25 % of that stroke →
  next layout; none passes → hold for Carla.
- DXF: one layer CUT, closed POLYLINEs, origin = sheet bottom-left, $EXTMAX = sheet. PNG proof with NOMINAL, EXTENTS,
  SHEET. Files on the `stencil-files` branch (`stencils/<category>/<SKU>-<LEGEND>-<N>in-SHEET<WxH>.dxf|.png`);
  P/Q hold GitHub links; the workflow writes the row itself (L–S, status 'generated', never further).
- Holds go to T as `gen hold YYYY-MM-DD: reason` (one per row, replaced each run). A 'qa fail' text row is rebuilt
  each run; if the file comes out identical it stays held. Not built yet: symbol rows (Carla's masters), multi-piece
  kits, per-letter sets, sheets over the 56 x 116 in bed.
- Daily at 1:17 PM Mountain (schedule) and on demand; cap 300/day until CNC Bot has passed 25, then 600.

## 2026-11-10 (Stencil Program Lead) — letter sets, the pavement U, legend filler
Today's 1:17 PM run held all 1,044 text rows. The three fixes that moved the most:
- **Letter sets.** The 96 in and up DOT words (and Caltrans 8 ft wording) are sold one letter per sheet: the
  price-list blank (20 x 104, 24 x 104, 20 x 110 ...) holds one letter, the painter sets the word. `build_set` now
  builds one DXF + proof per distinct letter when the blank is a one-letter blank (long side = cap height + margins
  within 20 %, long side >= 3 x short side, short side holds one letter), every letter upright, 2.00 in margin, ties
  as usual. Row: P = the folder on `stencil-files` (`.../<SKU>-<LEGEND>-SET-<N>in-SHEET<WxH>/`), Q = one combined
  proof, R = sha256 over all the DXFs in letter order, M = the whole word as set (what 1800 lists as the size), N = the
  per-letter blank; T lists each sheet's extents. Blanks that are not one-letter blanks (30 x 30 for a 24 in three-word
  legend, 40 x 54 for 44 in LANE) still hold: the Catalog Bot has to confirm those blanks.
- **Pavement alphabet U.** FHWA SHS page 10-4 draws the U 21 grid squares tall against 25 for every other letter; the
  legs above the bowl are straight verticals, so `build-glyphs.py` finishes the two legs to full cap height instead of
  dropping the letter. BUS / TURN / THRU / HUMP / RUNAWAY ... now build in the elongated alphabet.
- **Legend parsing.** 'Wording', 'Professional Curb', 'Curb and Standard' and quotation marks after the legend are
  filler (96" California DOT TURN Wording, 4" GUEST Curb and Standard, 48" 7Brew "ENTER").
Still held by design: ties over 25 % of the stroke (268 rows, Matt's tie-rule decision, Findings CJ1), multi-piece
blanks (78), sheets over the bed (58), names with no capital legend (140, mostly symbols filed as text), line / art
size-pair names (144).
- **1800 width.** With a reference size in H, Series C/D legends on one line get their letter spacing opened evenly
  (never tighter than FHWA, at most 1/2 cap height per gap) until the width matches 1800's; the note says by how much
  and what the other series would give (18" FIRE LANE: C 101.46 -> 109.98 vs ref 110; D would be 120.85).
- **Margin is a floor.** The blank must hold extents + 2 x 2.00 in exactly; the old 1/16 in tolerance let the 100 in
  G onto a 20 in blank with 1.99 in (CNC fail on SSS-ALP-100-03). Such rows now hold as 'sheet too small'.
