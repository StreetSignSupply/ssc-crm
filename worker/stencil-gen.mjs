// Stencil generator — one production DXF + proof PNG per Stencil Build row (design: docs/stencil-generator.md).
// Reads the "Stencil Build" tab, builds every text row whose legend/size/blank are clear (geometry in
// stencil_core.py from the FHWA public-domain alphabets in stencil-glyphs/), reads each DXF back (second
// check), commits the files to the `stencil-files` branch (OUT_DIR is a checkout of it) and writes
// L nominal, M extents, N sheet, O tie, P dxf_url, Q proof_url, R sha256, S 'generated' on the row.
// Rows that can't be built keep their status; the reason goes into T as "gen hold YYYY-MM-DD: ...".
// Never sets qa/test cut/verified. Never touches other tabs.
// env: SHEETS_TOKEN (required unless DRY_RUN=1), PIPE_SHEET, OUT_DIR (default ../stencil-out),
//      GEN_CAP (300; 600 once CNC Bot has passed 25), GEN_LIMIT (dry-run size), DRY_RUN=1 (no push, no sheet writes),
//      ROWS_JSON (read rows from a file instead of the sheet, for local tests), REPO (owner/name).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SHEET = process.env.PIPE_SHEET || "1aChWjS_R0ImI19AkBD-WAXRYoJz0douDNdhsASwIuVs";
const TAB = "Stencil Build";
const TOK = process.env.SHEETS_TOKEN;
const DRY = process.env.DRY_RUN === "1";
const OUT = process.env.OUT_DIR || join(HERE, "../stencil-out");
const REPO = process.env.REPO || process.env.GITHUB_REPOSITORY || "StreetSignSupply/ssc-crm";
const BRANCH = "stencil-files";
const LIMIT = Number(process.env.GEN_LIMIT || 0);
const TODAY = new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" });
const TOL = 1 / 16;
const summary = [];
const say = (s) => { console.log(s); summary.push(s); };

async function api(path, method = "GET", body) {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET}${path}`, {
    method, headers: { Authorization: "Bearer " + TOK, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`Sheets ${method} ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}
const num = (s) => { const m = String(s || "").match(/[\d.]+/); return m ? Number(m[0]) : null; };
const pair = (s) => { const m = String(s || "").match(/([\d.]+)\s*x\s*([\d.]+)/); return m ? [Number(m[1]), Number(m[2])] : null; };
const samePair = (a, b) => { const A = pair(a), B = pair(b); return A && B &&
  ((Math.abs(A[0] - B[0]) <= TOL && Math.abs(A[1] - B[1]) <= TOL) || (Math.abs(A[0] - B[1]) <= TOL && Math.abs(A[1] - B[0]) <= TOL)); };

async function main() {
  // ---- read rows (header row 1, how-to row 2, data from row 3)
  let values;
  if (process.env.ROWS_JSON) values = JSON.parse(readFileSync(process.env.ROWS_JSON, "utf8"));
  else values = (await api(`/values/${encodeURIComponent(TAB + "!A1:T3000")}`)).values || [];
  const rows = values.slice(2).map((v, i) => {
    const c = (k) => (v[k] ?? "").toString().trim();
    return { row: i + 3, sku: c(0), name: c(2), category: c(3), blank: c(4), pieces: c(5), ref: c(7), kind: c(8).toLowerCase(),
      master: c(10), L: c(11), M: c(12), N: c(13), O: c(14), P: c(15), R: c(17), status: c(18).toLowerCase(), notes: c(19) };
  }).filter((r) => r.sku);
  // CNC Bot sometimes leaves S = 'generated' and only writes 'qa fail YYYY-MM-DD' in T (lesson L-20261110: the note alone does
  // nothing downstream): a 'generated' row whose newest qa-fail note is not older than its newest gen note is a qa fail.
  for (const r of rows) {
    if (r.status !== "generated") continue;
    const q = [...r.notes.matchAll(/qa fail (\d{4}-\d\d-\d\d)/gi)].map((m) => m[1]).sort().pop();
    const g = [...r.notes.matchAll(/(?:^| \| )gen (\d{4}-\d\d-\d\d):/g)].map((m) => m[1]).sort().pop();
    if (q && (!g || q >= g) && !/\bgen \d{4}-\d\d-\d\d: .*after qa fail/.test(r.notes)) r.status = "qa fail";
  }
  const passed = rows.filter((r) => ["qa pass", "test cut", "verified"].includes(r.status)).length;
  const cap = Number(process.env.GEN_CAP || (passed >= 25 ? 600 : 300));
  const byKind = {}; for (const r of rows) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  say(`rows ${rows.length} (${Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join(", ")}); qa passed ${passed}; cap ${cap}`);

  // text rows not built yet, plus text rows that failed QA (re-built after a generator fix; same file = still held)
  // REBUILD=1 (one-time, Matt 2026-11-12): also re-build every text row already generated / QA'd / test-cut, so
  // every published DXF gets the OUTSIDE cut; those rows go back to 'generated' for a fresh CNC Bot QA.
  const REBUILD = process.env.REBUILD === "1";
  const states = REBUILD ? ["todo", "sourced", "", "qa fail", "generated", "qa pass", "test cut"] : ["todo", "sourced", "", "qa fail"];
  const todo = rows.filter((r) => (r.kind === "text" || r.kind === "kit") && r.category !== "Stencil Material" && states.includes(r.status) && !/gen skip/i.test(r.notes));
  const symbolsWaiting = rows.filter((r) => r.kind === "symbol" && r.master && ["todo", "sourced", "master ready"].includes(r.status)).length;
  let jobs = todo.map((r) => ({ kind: r.kind, sku: r.sku, name: r.name, category: r.category, blank: r.blank, pieces: r.pieces, ref: r.ref,
    nominal: r.L || undefined, tie: r.O || undefined, legend: legendFromNotes(r.notes) }));
  if (LIMIT) jobs = jobs.slice(0, LIMIT);

  // ---- build
  mkdirSync(join(OUT, "stencils"), { recursive: true });
  const res = JSON.parse(execFileSync("python3", [join(HERE, "stencil_core.py"), join(OUT, "stencils")],
    { input: JSON.stringify(jobs), maxBuffer: 1 << 28, stdio: ["pipe", "pipe", "ignore"] }).toString());
  const bySku = Object.fromEntries(todo.map((r) => [r.sku, r]));

  // ---- second check + spec-row agreement, then cap
  const good = [], held = [];
  for (const x of res) {
    const r = bySku[x.sku];
    if (!x.ok) { held.push([r, x.reason]); continue; }
    if (r.status === "qa fail" && r.R && r.R === x.sha256 && (!r.M || samePair(r.M, x.extents))) { held.push([r, "same file as the one that failed QA: the generator has not changed for this row"]); continue; }
    const specRow = r.status !== "qa fail";   // a failed row's M/N came from the failed file, not the Catalog Bot
    if (specRow && r.M && !samePair(r.M, x.extents)) { held.push([r, `spec row extents ${r.M} vs built ${x.extents} (> 1/16 in)`]); continue; }
    if (specRow && r.N && !samePair(r.N, x.sheet)) { held.push([r, `spec row sheet ${r.N} vs built ${x.sheet}`]); continue; }
    // second check: every DXF read back (a letter set has one per letter, each with its own extents)
    const problems = [];
    for (const f of x.files || [x]) {
      const chk = JSON.parse(execFileSync("python3", [join(HERE, "stencil_core.py"), "check", join(OUT, "stencils", f.dxf), JSON.stringify(f)],
        { stdio: ["ignore", "pipe", "ignore"] }).toString());
      f.check = chk;
      for (const p of chk.problems) problems.push((f.ch ? f.ch + ": " : "") + p);
    }
    if (problems.length) { held.push([r, `second check failed: ${problems.join("; ")}`]); continue; }
    if (good.length < cap || REBUILD) good.push([r, x]);   // REBUILD: every old file is replaced in one run
  }
  say(`built ${good.length}, held ${held.length}, already past todo ${rows.filter((r) => r.kind === "text").length - todo.length}, symbol rows with a master waiting ${symbolsWaiting} (symbol path not in this version)`);

  // ---- publish the files (stencil-files branch; fetch + rebase, never force)
  const url = (p, kind = "blob") => `https://github.com/${REPO}/${kind}/${BRANCH}/stencils/${p.split("/").map(encodeURIComponent).join("/")}`;
  if (!DRY && good.length) {
    const git = (...a) => execFileSync("git", ["-C", OUT, ...a], { stdio: "inherit" });
    writeFileSync(join(OUT, "README.md"), "Generated stencil files (worker/stencil-gen.mjs). One folder per category; DXF = cut file, PNG = proof.\n" +
      "Do not edit by hand: change the generator or the Stencil Build row and re-run.\n");
    git("add", "-A");
    try { git("commit", "-q", "-m", `Stencil files: ${good.length} generated ${TODAY}`); } catch { say("nothing new to commit"); }
    for (let i = 0; i < 3; i++) {
      try { git("pull", "--rebase", "-q", "origin", BRANCH); } catch { /* first push: branch not on origin yet */ }
      try { git("push", "-q", "origin", `HEAD:${BRANCH}`); break; } catch (e) { if (i === 2) throw e; }
    }
  }

  // ---- write the rows
  const data = [];
  for (const [r, x] of good) {
    // a letter set: P = the folder holding one DXF per letter, Q = the combined proof, R = sha256 over all the DXFs in letter order
    data.push({ range: `${TAB}!L${r.row}:S${r.row}`, values: [[x.nominal, x.extents, x.sheet, x.tie, x.set ? url(x.folder, "tree") : url(x.dxf), url(x.png), x.sha256, "generated"]] });
    const note = `gen ${TODAY}: ${x.font}, ${x.layout}${x.islands ? `, ${x.islands} island(s) x 2 ties` : ""}` +
      (x.set ? `; sheets ${x.files.map((f) => `${f.ch} ${f.extents}`).join(", ")}` : "");
    data.push({ range: `${TAB}!T${r.row}`, values: [[mergeNote(r.notes, note)]] });
  }
  for (const [r, why] of held) {
    // a failed file is taken off the row so nobody cuts it; the qa note stays in T
    // REBUILD: an old file without the OUTSIDE cut must never stay on a row
    const rebuiltOld = REBUILD && ["generated", "qa pass", "test cut"].includes(r.status);
    if ((r.status === "qa fail" && !why.startsWith("same file")) || rebuiltOld) data.push({ range: `${TAB}!L${r.row}:S${r.row}`, values: [["", "", "", "", "", "", "", "todo"]] });
    const merged = mergeNote(r.notes, `gen hold ${TODAY}: ${why}`);
    if (merged !== r.notes) data.push({ range: `${TAB}!T${r.row}`, values: [[merged]] });
  }
  if (!DRY && data.length) {
    for (let i = 0; i < data.length; i += 100) {   // 100 ranges a call (400 broke the connection on the 445-row rebuild)
      for (let t = 1; ; t++) {
        try { await api("/values:batchUpdate", "POST", { valueInputOption: "RAW", data: data.slice(i, i + 100) }); break; }
        catch (e) { if (t === 3) throw e; await new Promise((ok) => setTimeout(ok, 3000 * t)); }
      }
    }
  }

  // ---- summary
  const reasons = {};
  for (const [, why] of held) { const k = why.replace(/'[^']*'/g, "'…'").replace(/[\d.]+/g, "#").slice(0, 70); reasons[k] = (reasons[k] || 0) + 1; }
  say(`hold reasons: ${Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} × ${k}`).join(" | ")}`);
  writeFileSync(join(OUT, "last-run.json"), JSON.stringify({ at: new Date().toISOString(), generated: good.map(([r, x]) => ({ row: r.row, ...x })),
    held: held.map(([r, why]) => ({ row: r.row, sku: r.sku, why })) }, null, 1));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, "## Stencil generator\n\n" + summary.map((s) => "- " + s).join("\n") + "\n");
  console.log(`STENCIL_GEN_RESULT ${JSON.stringify({ generated: good.length, held: held.length, cap, passed })}`);
}

// the Catalog Bot writes "legend: CAMPUS SHUTTLES (from ...)" in T when the name has no capital-letter legend
function legendFromNotes(notes) {
  for (const p of (notes || "").split(" | ")) {
    const m = p.match(/^legend:\s*([A-Z0-9][A-Z0-9 &\/'\-.!]*?)\s*(\(|$)/);
    if (m) return m[1];
  }
  return undefined;
}

// one "gen ..." segment per row: replace the previous one, keep everyone else's notes
function mergeNote(notes, mine) {
  const parts = (notes || "").split(" | ").filter((p) => p && !/^gen (hold )?\d{4}-\d\d-\d\d:/.test(p));
  return [...parts, mine].join(" | ");
}

main().catch((e) => { console.error(e); process.exit(1); });
