// Stencil generator — text stencils (letters, numbers, words) from the FHWA alphabets, to the shop spec.
// Design: docs/stencil-generator.md. Spec: Drive stencil-spec-rule.md — 2.00 in margin every side; ties 1/2 in for a
// legend up to 24 in tall, 3/4 in over 24 in; at least 2 ties per island.
//
// Glyphs: worker/stencil-glyphs/*.json, traced from FHWA Standard Highway Signs (public domain):
//   fhwa-pavement-elongated  — Pavement Markings chapter 10-1..10-7 (road legends, 48 in and up, state DOT wording)
//   fhwa-series-b..f, -em    — Standard Alphabets, Series B–F 2000 (parking-lot and small legends)
// Units in the glyph files: cap height = 1.0, baseline y = 0.
//
// Run: node stencil-gen.mjs            reads Stencil Build from the sheet (SHEETS_TOKEN), writes ./out/<sku>.dxf/.svg/.png/.json
//      GEN_ROWS=rows.json node ...     reads rows from a file instead (array of {row, sku, name, category, blank, ref})
//      GEN_LIMIT=25 GEN_FIRST=1        the first batch only (STOP / ONLY / numbers / single letters at 12, 18, 24 in)
// It never marks a row verified; the CNC Bot and the Equipment Manager do that after a measured cut.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pc from "polygon-clipping";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.GEN_OUT || path.join(process.cwd(), "out");
const SHEET_ID = process.env.SHEET_ID || "1aChWjS_R0ImI19AkBD-WAXRYoJz0douDNdhsASwIuVs";
const MARGIN = 2.0;
const FONTS = {};
for (const f of fs.readdirSync(path.join(HERE, "stencil-glyphs"))) if (f.endsWith(".json")) FONTS[f.replace(/\.json$/, "")] = JSON.parse(fs.readFileSync(path.join(HERE, "stencil-glyphs", f), "utf8"));

// ---------- picking the legend and the alphabet ----------
export function parseName(name) {
  const m = String(name || "").trim().match(/^(\d+(?:\.\d+)?)\s*(?:"|''|in(?:ch)?\b)\s*(.+?)\s+Stencils?$/i);
  if (!m) return null;
  let legend = m[2].replace(/\bWording\b/ig, " ").replace(/\s+/g, " ").trim();
  const dot = /\b(DOT|MUTCD)\b/.test(legend);
  legend = legend.replace(/^.*?\b(DOT|MUTCD)\b\s*/, "").trim();          // "Colorado DOT STOP" -> "STOP"
  if (!/^[A-Z0-9][A-Z0-9 \-]*$/.test(legend)) return null;                // brand names, symbols, mixed case: not a text stencil
  return { nominal: Number(m[1]), legend, dot };
}
export function tieFor(nominal) { return nominal > 24 ? 0.75 : 0.5; }
function wh(s) { const m = String(s || "").match(/([\d.]+)\s*[x×]\s*([\d.]+)/i); return m ? { w: Number(m[1]), h: Number(m[2]) } : null; }

// pavement alphabet has no letter spacing of its own: FHWA lays elongated words out with about 1/20 of the
// letter height between letters (checked against the 96 in WAY / SCHOOL proportions)
const PAVE_GAP = 0.05;
function layoutWidth(font, text) {
  const g = FONTS[font].glyphs; let pen = 0, x0 = null, x1 = 0;
  for (const ch of text) {
    if (ch === " ") { pen += font === "fhwa-pavement-elongated" ? 0.30 : 0.40; continue; }
    const gl = g[ch]; if (!gl) return null;
    const lsb = font === "fhwa-pavement-elongated" ? 0 : gl.lsb;
    const x = pen + lsb; if (x0 === null) x0 = x; x1 = Math.max(x1, x + gl.w);
    pen += font === "fhwa-pavement-elongated" ? gl.w + PAVE_GAP : (gl.adv || gl.w + 2 * gl.lsb);
  }
  return x1 - (x0 || 0);
}
export function pickFont(p, ref) {
  if (p.dot || p.nominal >= 48) { if (layoutWidth("fhwa-pavement-elongated", p.legend) != null) return { font: "fhwa-pavement-elongated", why: p.dot ? "state DOT road legend" : "48 in and up: elongated road legend" }; }
  const cands = ["fhwa-series-c", "fhwa-series-d", "fhwa-series-e", "fhwa-series-b"].filter((f) => layoutWidth(f, p.legend) != null);
  if (!cands.length) return null;
  const r = wh(ref);
  if (r && r.h > 0) {           // the 1800 listing gives W x H of the legend: pick the series whose width comes closest at our height
    const want = r.w * (p.nominal / r.h);
    let best = cands[0], d = 1e9;
    for (const f of cands) { const dd = Math.abs(layoutWidth(f, p.legend) * p.nominal - want); if (dd < d) { d = dd; best = f; } }
    return { font: best, why: "closest width to the reference size" };
  }
  return { font: "fhwa-series-c", why: "default for parking-lot legends (no reference size)" };
}

// ---------- geometry ----------
function glyphPolys(font, ch, ox, s) {      // polygon-clipping MultiPolygon in inches
  const g = FONTS[font].glyphs[ch];
  return g.polys.map((p) => [p.outer.map(([x, y]) => [ox + x * s, y * s]), ...p.holes.map((h) => h.map(([x, y]) => [ox + x * s, y * s]))]);
}
function bbox(mp) { let a = [1e9, 1e9, -1e9, -1e9]; for (const p of mp) for (const [x, y] of p[0]) { a[0] = Math.min(a[0], x); a[1] = Math.min(a[1], y); a[2] = Math.max(a[2], x); a[3] = Math.max(a[3], y); } return a; }
function area(r) { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(s / 2); }
function centroid(r) { let x = 0, y = 0, a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const f = r[j][0] * r[i][1] - r[i][0] * r[j][1]; x += (r[j][0] + r[i][0]) * f; y += (r[j][1] + r[i][1]) * f; a += f; } a /= 2; return [x / (6 * a), y / (6 * a)]; }

export function build(row) {
  const p = parseName(row.name); if (!p) return { ok: false, why: "not a plain text legend" };
  const pick = pickFont(p, row.ref); if (!pick) return { ok: false, why: "a character in \"" + p.legend + "\" is not in the alphabets" };
  const font = pick.font, s = p.nominal, tie = tieFor(p.nominal), g = FONTS[font].glyphs;
  // lay the legend out on one line, baseline at 0
  let pen = 0, cut = [];
  for (const ch of p.legend) {
    if (ch === " ") { pen += (font === "fhwa-pavement-elongated" ? 0.30 : 0.40) * s; continue; }
    const gl = g[ch]; const lsb = font === "fhwa-pavement-elongated" ? 0 : gl.lsb;
    cut = cut.concat(glyphPolys(font, ch, pen + lsb * s, s));
    pen += (font === "fhwa-pavement-elongated" ? gl.w + PAVE_GAP : (gl.adv || gl.w + 2 * gl.lsb)) * s;
  }
  cut = pc.union(cut);
  // ties: every island (a hole in a letter — the middle of O, A, B, D, P, Q, R, 0, 4, 6, 8, 9) is held by two
  // bridges of sheet, one above and one below, cut as a vertical strip of tie width through its middle
  const lb = bbox(cut); const ties = [];
  for (const poly of cut) for (const hole of poly.slice(1)) {
    if (area(hole) < 0.01) continue;
    const [cx] = centroid(hole);
    ties.push([[[cx - tie / 2, lb[1] - 1], [cx + tie / 2, lb[1] - 1], [cx + tie / 2, lb[3] + 1], [cx - tie / 2, lb[3] + 1], [cx - tie / 2, lb[1] - 1]]]);
  }
  if (ties.length) cut = pc.difference(cut, ...ties);
  // place on the sheet: 2.00 in margin every side
  const b = bbox(cut), ew = b[2] - b[0], eh = b[3] - b[1];
  const sheetW = Math.ceil((ew + 2 * MARGIN) * 4) / 4, sheetH = Math.ceil((eh + 2 * MARGIN) * 4) / 4;
  const dx = (sheetW - ew) / 2 - b[0], dy = (sheetH - eh) / 2 - b[1];
  cut = cut.map((poly) => poly.map((ring) => ring.map(([x, y]) => [x + dx, y + dy])));
  const sheet = [[[0, 0], [sheetW, 0], [sheetW, sheetH], [0, sheetH], [0, 0]]];
  // checks: the sheet left after cutting is one piece (nothing falls out), the margin holds, every island has 2 ties
  const left = pc.difference(sheet, cut);
  const nb = bbox(cut);
  const checks = {
    one_piece: left.length === 1,
    margin_ok: nb[0] >= MARGIN - 0.001 && nb[1] >= MARGIN - 0.001 && sheetW - nb[2] >= MARGIN - 0.001 && sheetH - nb[3] >= MARGIN - 0.001,
    closed_paths: cut.every((poly) => poly.every((r) => r.length > 3 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1])),
    islands: ties.length,
  };
  const blank = wh(row.blank), ref = wh(row.ref);
  const notes = [];
  if (blank && (Math.abs(blank.w - sheetW) > 0.25 || Math.abs(blank.h - sheetH) > 0.25)) notes.push("sheet " + sheetW + " x " + sheetH + " vs price-list blank " + row.blank);
  if (ref && ref.h && Math.abs(ref.w - ew) > 0.25 * Math.max(1, p.nominal / 12)) notes.push("legend " + ew.toFixed(2) + " wide vs reference " + ref.w);
  return { ok: checks.one_piece && checks.margin_ok && checks.closed_paths, sku: row.sku, legend: p.legend, font, fontWhy: pick.why,
    nominal: p.nominal, extents: [ew, eh], sheet: [sheetW, sheetH], tie, cut, checks, notes };
}

// ---------- files ----------
const f3 = (n) => (Math.round(n * 1000) / 1000).toFixed(3);
export function dxf(r) {
  const L = ["0", "SECTION", "2", "HEADER", "9", "$ACADVER", "1", "AC1009", "9", "$INSUNITS", "70", "1", "0", "ENDSEC",
    "0", "SECTION", "2", "TABLES", "0", "TABLE", "2", "LAYER", "70", "2",
    "0", "LAYER", "2", "CUT", "70", "0", "62", "1", "6", "CONTINUOUS", "0", "LAYER", "2", "SHEET", "70", "0", "62", "8", "6", "CONTINUOUS",
    "0", "ENDTAB", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES"];
  const pl = (ring, layer) => { L.push("0", "POLYLINE", "8", layer, "66", "1", "70", "1"); for (const [x, y] of ring.slice(0, -1)) L.push("0", "VERTEX", "8", layer, "10", f3(x), "20", f3(y)); L.push("0", "SEQEND", "8", layer); };
  pl([[0, 0], [r.sheet[0], 0], [r.sheet[0], r.sheet[1]], [0, r.sheet[1]], [0, 0]], "SHEET");
  for (const poly of r.cut) for (const ring of poly) pl(ring, "CUT");
  L.push("0", "ENDSEC", "0", "EOF");
  return L.join("\r\n") + "\r\n";
}
export function svg(r) {
  const [W, H] = r.sheet, k = 600 / Math.max(W, H), pad = 30, w = W * k + 2 * pad, h = H * k + 2 * pad + 70;
  const pt = ([x, y]) => (pad + x * k).toFixed(1) + "," + (pad + (H - y) * k).toFixed(1);
  const d = r.cut.map((poly) => poly.map((ring) => "M" + ring.map(pt).join("L") + "Z").join("")).join("");
  const label = r.sku + " · " + r.legend + " · " + r.font.replace("fhwa-", "FHWA ");
  const nums = "NOMINAL " + r.nominal + " in · EXTENTS " + r.extents.map((n) => n.toFixed(2)).join(" x ") + " in · SHEET " + r.sheet.join(" x ") + " in · TIE " + r.tie + " in";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(0)}" height="${h.toFixed(0)}" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}">
<rect width="100%" height="100%" fill="#fff"/><rect x="${pad}" y="${pad}" width="${(W * k).toFixed(1)}" height="${(H * k).toFixed(1)}" fill="#f2efe8" stroke="#555" stroke-width="1.5"/>
<path d="${d}" fill="#1a1a1a" fill-rule="evenodd" stroke="#c0392b" stroke-width="0.8"/>
<text x="${pad}" y="${(H * k + pad + 28).toFixed(0)}" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#111">${label}</text>
<text x="${pad}" y="${(H * k + pad + 52).toFixed(0)}" font-family="Arial, sans-serif" font-size="13" fill="#333">${nums} · PROOF, not verified</text></svg>`;
}
async function png(svgText) {
  try { const { Resvg } = await import("@resvg/resvg-js"); return new Resvg(svgText, { fitTo: { mode: "width", value: 1200 }, font: { loadSystemFonts: true } }).render().asPng(); }
  catch (e) { return null; }
}

// ---------- the sheet ----------
async function sheetRows() {
  if (process.env.GEN_ROWS) return JSON.parse(fs.readFileSync(process.env.GEN_ROWS, "utf8"));
  const tok = process.env.SHEETS_TOKEN; if (!tok) throw new Error("SHEETS_TOKEN or GEN_ROWS needed");
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent("'Stencil Build'!A1:T2400")}`, { headers: { Authorization: "Bearer " + tok } });
  if (!r.ok) throw new Error("sheet read " + r.status);
  const v = (await r.json()).values || [];
  return v.slice(1).map((x, i) => ({ row: i + 2, sku: x[0] || "", name: x[2] || "", category: x[3] || "", blank: x[4] || "", ref: x[7] || "", kind: x[8] || "", status: x[18] || "", sha: x[17] || "" }))
    .filter((x) => x.sku && /^text$/i.test(x.kind));
}
function firstBatch(rows) {
  const want = (p) => p && [12, 18, 24].includes(p.nominal) && (/^(STOP|ONLY)$/.test(p.legend) || /^[0-9]$/.test(p.legend) || /^[A-Z]$/.test(p.legend));
  return rows.filter((r) => want(parseName(r.name)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const all = await sheetRows();
  let rows = process.env.GEN_FIRST ? firstBatch(all) : all.filter((r) => !/^(generated|qa pass|test cut|verified)/i.test(r.status || ""));
  rows = rows.slice(0, Number(process.env.GEN_LIMIT || process.env.GEN_CAP || 300));
  fs.mkdirSync(OUT, { recursive: true });
  const report = [];
  for (const row of rows) {
    let r; try { r = build(row); } catch (e) { r = { ok: false, why: String(e.message || e) }; }
    if (!r.legend) { report.push({ row: row.row, sku: row.sku, name: row.name, ok: false, why: r.why }); continue; }
    const d = dxf(r), sv = svg(r), sha = crypto.createHash("sha256").update(d).digest("hex");
    fs.writeFileSync(path.join(OUT, row.sku + ".dxf"), d); fs.writeFileSync(path.join(OUT, row.sku + ".svg"), sv);
    const pn = await png(sv); if (pn) fs.writeFileSync(path.join(OUT, row.sku + ".png"), pn);
    const rec = { row: row.row, sku: row.sku, name: row.name, category: row.category, ok: r.ok, legend: r.legend, font: r.font, font_why: r.fontWhy,
      nominal_in: r.nominal, extents_in: r.extents.map((n) => +n.toFixed(3)), sheet_in: r.sheet, tie_in: r.tie, sha256: sha, checks: r.checks, notes: r.notes };
    fs.writeFileSync(path.join(OUT, row.sku + ".json"), JSON.stringify(rec, null, 1)); report.push(rec);
  }
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
  const ok = report.filter((x) => x.ok).length;
  const lines = [`## Stencil generator: ${ok} generated, ${report.length - ok} not`, "", "| SKU | legend | font | nominal | extents | sheet | tie | checks | notes |", "|---|---|---|---|---|---|---|---|---|",
    ...report.map((x) => x.legend ? `| ${x.sku} | ${x.legend} | ${x.font.replace("fhwa-", "")} | ${x.nominal_in} | ${x.extents_in.join(" x ")} | ${x.sheet_in.join(" x ")} | ${x.tie_in} | ${x.ok ? "pass" : "FAIL " + JSON.stringify(x.checks)} | ${(x.notes || []).join("; ")} |` : `| ${x.sku} | | | | | | | skipped | ${x.why} |`)];
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  console.log(lines.join("\n"));
}
