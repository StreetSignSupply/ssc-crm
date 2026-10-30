// One-off CRM fixes run THROUGH the CRM's own code (so history, stage logs and the order sync all happen),
// headless in GitHub Actions against the live Firestore. Prints counts only (the repo is public).
// FIX_STEP=sync      -> "Send all" to the CRM Orders sheet
// FIX_STEP=apply     -> worker/fixes.js runs inside the page, then "Send all"
import { chromium } from "playwright";
import fsys from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const STEP = process.env.FIX_STEP || "sync";
const WATCH_MIN = Number(process.env.WATCH_MIN) || 140;
process.on("unhandledRejection", (e) => { console.log("::error::fix stopped: " + String(e && e.message || e).slice(0, 200).replace(/\n/g, " ")); process.exit(1); });
// expose the CRM's functions to this script (the app keeps them inside one closure)
let html = fsys.readFileSync(path.resolve(here, "../public/index.html"), "utf8");
const cut = html.lastIndexOf("\n})();\n</script>");
if (cut < 0) throw new Error("page layout changed");
const extra = fsys.existsSync(path.resolve(here, "fix-names.txt")) ? fsys.readFileSync(path.resolve(here, "fix-names.txt"), "utf8").split(/[\s,]+/).filter(Boolean) : [];
const NAMES = [...new Set("S,syncAll,live,proj,acct,push,setDoc,mergeDoc,recordHistory,logEvent,jobsOf,setStage,today,uid".split(",").concat(extra))];
const hook = "\nwindow.__T={" + NAMES.map((n) => `${n}:(typeof ${n}!=="undefined"?${n}:undefined)`).join(",") + "};\n" +
  // T.fix(path, patch, why): writes through the CRM and tags the change in that record's Field history as a fix edit
  "window.__T.getDb=function(){return db};" +   // db is set after the page boots, so read it when it's needed
  "window.__T.fix=async function(path,patch,why){const HT={projects:'project',jobs:'job',accounts:'account',contacts:'contact',items:'item',vendors:'vendor',activity:'activity',team:'team'};" +
  "const [c,id]=String(path).split('/');await push(path,patch);if(HT[c])await recordHistory(HT[c],id,[{f:'Fix run',o:'',n:String(why||Object.keys(patch).filter(k=>k!=='updatedAt').join(', ')),ev:1}]);};\n";
html = html.slice(0, cut) + hook + html.slice(cut);
const PAGE = path.resolve(here, "../public/__fix.html");
fsys.writeFileSync(PAGE, html);

const { Firestore } = await import("@google-cloud/firestore");
const fs = new Firestore({ projectId: process.env.FIREBASE_PROJECT || "ssc-crm-a7224", ignoreUndefinedProperties: true });
const plain = (v) => JSON.parse(JSON.stringify(v === undefined ? null : v, (k, x) => x && typeof x === "object" && typeof x.toMillis === "function" ? x.toMillis() : x));
let writes = 0, errors = 0; const errs = [];
let browser; try { browser = await chromium.launch({ channel: "chrome" }); } catch (e) { browser = await chromium.launch(); }
// what has finished so far — printed if the watchdog stops the run, so a stopped run never looks green
const done = [];
const step = (s) => { done.push(s); console.log("step: " + s); };
setTimeout(async () => {
  let prog = ""; try { prog = JSON.stringify(await page.evaluate(() => window.__syncProg || null)); } catch (e) {}
  console.log("::error::fix run stopped by the watchdog after " + WATCH_MIN + " min — finished: " + done.join(" > ") + " | Send all progress " + prog + " | " + writes + " writes");
  process.exit(1);
}, WATCH_MIN * 60000).unref();
const page = await (await browser.newContext()).newPage();
page.on("pageerror", (e) => { errors++; errs.push(String(e.message || e).slice(0, 120)); });
await page.exposeBinding("__wGet", async (_, p) => { const s = await fs.doc(p).get(); return { id: s.id, exists: s.exists, data: s.exists ? plain(s.data()) : null }; });
await page.exposeBinding("__wSet", async (_, p, d) => { writes++; await fs.doc(p).set(d); });
await page.exposeBinding("__wMerge", async (_, p, d) => { writes++; await fs.doc(p).set(d, { merge: true }); });
await page.exposeBinding("__wDel", async (_, p) => { writes++; await fs.doc(p).delete(); });
await page.exposeBinding("__wCounter", (_, k, s) => { const r = fs.doc("meta/counter");
  return fs.runTransaction(async (tx) => { const x = await tx.get(r); const d = (x.exists && x.data()) || {}; const cur = Number(d[k]) || s; tx.set(r, { [k]: cur + 1 }, { merge: true }); return cur; }); });
await page.exposeBinding("__wWatch", (_, kind, p, id) => {
  const push = (payload) => page.evaluate(([i, x]) => window.__wPush && window.__wPush(i, x), [id, payload]).catch(() => {});
  if (kind === "coll") fs.collection(p).onSnapshot((qs) => push(qs.docs.map((d) => ({ id: d.id, data: plain(d.data()) }))), () => {});
  else fs.doc(p).onSnapshot((s) => push({ id: s.id, exists: s.exists, data: s.exists ? plain(s.data()) : null }), () => {});
});
await page.addInitScript(() => {
  window.sscHosted = true; window.sscWorker = true;
  try { localStorage.setItem("sscMe", "FIX"); } catch (e) {}   // history shows these edits as the fix run, never as Matt
  const cbs = {}; let n = 0;
  window.__wPush = (id, x) => { const cb = cbs[id]; if (!cb) return;
    if (Array.isArray(x)) { const docs = x.map((d) => ({ id: d.id, data: () => d.data })); cb({ docs, size: docs.length, forEach: (f) => docs.forEach(f) }); }
    else cb({ id: x.id, exists: x.exists, data: () => x.data }); };
  const db = {
    collection(p) { return { onSnapshot(cb) { const id = "c" + (n++); cbs[id] = cb; window.__wWatch("coll", p, id); return () => { delete cbs[id]; }; } }; },
    doc(p) { return { path: p,
      async get() { const x = await window.__wGet(p); return { id: x.id, exists: x.exists, data: () => x.data }; },
      set(d) { return window.__wSet(p, JSON.parse(JSON.stringify(d))); },
      update(d) { return window.__wMerge(p, JSON.parse(JSON.stringify(d))); },
      delete() { return window.__wDel(p); },
      onSnapshot(cb) { const id = "d" + (n++); cbs[id] = cb; window.__wWatch("doc", p, id); return () => { delete cbs[id]; }; },
      async acquire() { return { acquired: true }; } }; },
    nextCounter(k, s) { return window.__wCounter(k, s); } };
  const user = { async me() { return { id: "audit-fix", name: "Audit fix (Claude)", email: "", isOwner: true, canEdit: true }; } };
  window.__workerCore = { use(name) { const caps = { db, user, permissions: { async state() { return {}; } } };
    if (!(name in caps)) { const e = new Error(name + " not available"); e.code = "not_declared"; throw e; } return caps[name]; } };
});
await page.route(/firebase-adapter\.js$/, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
await page.goto("file://" + PAGE);
await page.evaluate(() => window.__sscResolve && window.__sscResolve(window.__workerCore));
await page.waitForFunction(() => window.__T && window.__T.S && window.__T.S.projects && window.__T.S.projects.size > 0 && window.__T.S.accounts.size > 0, null, { timeout: 120000 });
await page.waitForTimeout(20000);   // let every collection arrive
step("CRM loaded");
let result = {};
if (STEP === "apply") {
  const code = fsys.readFileSync(path.resolve(here, "fixes.js"), "utf8");
  // a fixes.js that already ran is never run again (the CRM keeps the fingerprint of each one it ran)
  const crypto = await import("node:crypto");
  const sig = crypto.createHash("sha256").update(code).digest("hex").slice(0, 16);
  const ran = await fs.doc("meta/fixruns").get();
  if (ran.exists && (ran.data() || {})[sig] && process.env.FIX_FORCE !== "1") { result = { skipped: "this fixes.js already ran" }; step("fixes skipped (already ran)"); }
  else {
    result = await page.evaluate(async (src) => { try { return await (0, eval)(src)(window.__T); } catch (e) { return { error: String(e && e.message || e).slice(0, 200) }; } }, code);
    await page.waitForTimeout(15000);
    if (!result || !result.error) await fs.doc("meta/fixruns").set({ [sig]: Date.now() }, { merge: true });
    step("fixes applied");
  }
}
// FIX_STEP=stencils -> the stencil export (one row per stencil per grade, with today's cost) goes to the
// "CRM Stencils" tab of the SSS Pipeline sheet for the weekly cost audit. Counts only in the log.
if (STEP === "stencils") {
  const rows = await page.evaluate(async () => { const T = window.__T; await T.stcLoad(); return T.S.stc ? T.stcExportRows() : null; });
  if (!rows) { console.log("::error::stencil catalog didn't load"); await browser.close(); process.exit(1); }
  const SHEET = process.env.PIPE_SHEET || "1aChWjS_R0ImI19AkBD-WAXRYoJz0douDNdhsASwIuVs", TAB = "CRM Stencils";
  const tok = process.env.SHEETS_TOKEN;
  { const st = await page.evaluate(() => { const T = window.__T; const L = T.S.stc.items; const g = [0, 1, 2, 3, 4].map((i) => !!T.stcMatFor(i));
      return { stencils: L.length, withPicture: L.filter((x) => x.img).length, noSqft: L.filter((x) => !(T.stcSq(x) > 0)).length, sepOnly: L.filter((x) => x.src === "sep").length, sheetFound: g, costedByGrade: [0, 1, 2, 3, 4].map((i) => L.filter((x) => T.stcCost(x, i).cost != null).length) }; });
    console.log("::notice::stencils in the CRM: " + JSON.stringify(st)); }
  const api = async (url, method, body) => { const r = await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + SHEET + url, { method, headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) { const t = await r.text(); const m = (t.match(/"status":\s*"([A-Z_]+)"/) || [])[1] || ""; const why = /has not been used|is disabled/.test(t) ? "Sheets API not turned on for the project" : /permission|PERMISSION/.test(t) ? "the sheet isn't shared with the CRM's service account" : m;
      throw new Error(method + " " + r.status + " " + why); } return r.json(); };
  try {
    const meta = await api("?fields=sheets.properties.title", "GET");
    if (!(meta.sheets || []).some((x) => x.properties.title === TAB)) await api(":batchUpdate", "POST", { requests: [{ addSheet: { properties: { title: TAB, gridProperties: { rowCount: rows.length + 50, columnCount: 22 } } } }] });
    else await api(":batchUpdate", "POST", { requests: [] }).catch(() => {});
    await api("/values/" + encodeURIComponent("'" + TAB + "'!A:V") + ":clear", "POST", {});
    const stamp = "Exported from the CRM " + new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
    rows[0] = rows[0].concat(["", stamp]);
    const meta2 = await api("?fields=sheets(properties(title,sheetId,gridProperties))", "GET");
    const sh = meta2.sheets.find((x) => x.properties.title === TAB);
    if (sh && sh.properties.gridProperties.rowCount < rows.length + 5) await api(":batchUpdate", "POST", { requests: [{ appendDimension: { sheetId: sh.properties.sheetId, dimension: "ROWS", length: rows.length + 5 - sh.properties.gridProperties.rowCount } }] });
    await api("/values/" + encodeURIComponent("'" + TAB + "'!A1") + "?valueInputOption=RAW", "PUT", { values: rows });
    const flagged = rows.slice(1).filter((r) => r[18]).length, uncosted = rows.slice(1).filter((r) => r[14] === "").length;
    console.log("::notice::stencil export: " + (rows.length - 1) + " rows (" + new Set(rows.slice(1).map((r) => r[0])).size + " stencils), " + uncosted + " rows not costed, " + flagged + " rows flagged");
    await browser.close(); process.exit(0);
  } catch (e) { console.log("::error::stencil export: " + String(e.message || e).slice(0, 160)); await browser.close(); process.exit(1); }
}
// FIX_STEP=qb -> QuickBooks is the source of truth for billing. Reads the "QB Invoices" tab (filled each morning
// from QuickBooks), matches each invoice to its CRM project, makes the CRM's invoice number, invoice date, tax and
// paid status match QuickBooks, and writes what it changed and anything it couldn't settle to the "QB Check" tab.
// Totals that differ are flagged, never changed. Counts only in the log.
if (STEP === "qb") {
  const SHEET = process.env.PIPE_SHEET || "1aChWjS_R0ImI19AkBD-WAXRYoJz0douDNdhsASwIuVs", tok = process.env.SHEETS_TOKEN;
  const api = async (url, method, body) => { const r = await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + SHEET + url, { method, headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) throw new Error(method + " " + r.status); return r.json(); };
  try {
    const got = await api("/values/" + encodeURIComponent("'QB Invoices'!A1:M2000"), "GET");
    const rows = got.values || []; const H = (rows[0] || []).map((h) => String(h).trim().toLowerCase());
    const inv = rows.slice(1).filter((r) => r && r.length).map((r) => { const o = {}; H.forEach((h, i) => o[h] = r[i] == null ? "" : String(r[i])); return o; }).filter((o) => o.doc_number);
    if (!inv.length) throw new Error("the QB Invoices tab is empty");
    const res = await page.evaluate(async ([inv, RUN]) => {
      const T = window.__T, S = T.S, today = T.today();
      const num = (v) => { const n = Number(String(v || "").replace(/[$,\s]/g, "")); return isFinite(n) ? n : 0; };
      const norm = (s) => String(s || "").toLowerCase().replace(/\(deleted\)/g, "").replace(/[^a-z0-9]/g, "");
      const projs = T.live(S.projects);
      const out = [], used = new Set(); let changed = 0, matched = 0, flagged = 0;
      for (const q of inv) {
        if (num(q.total) === 0) continue;   // voided and zeroed test invoices
        const doc = String(q.doc_number).replace(/^#/, "").trim(); const total = num(q.total), tax = num(q.tax), bal = num(q.balance);
        let p = projs.find((x) => String(x.invNum || "").replace(/^#/, "").trim() === doc);
        let how = "invoice number";
        if (!p) { const cn = norm(q.customer);
          const cand = projs.filter((x) => !used.has(x.id) && !String(x.invNum || "").trim() && ["won", "production", "shipped", "invoiced", "closed"].indexOf(x.stage) >= 0)
            .filter((x) => { const a = S.accounts.get(x.accountId) || {}; return cn && (norm(a.qb) === cn || norm(a.name) === cn); })
            .filter((x) => Math.abs((T.projValue(x) || 0) + (T.invTaxOf(x) || 0) - total) < 1.01 || Math.abs((T.projValue(x) || 0) - (total - tax)) < 1.01);
          if (cand.length === 1) { p = cand[0]; how = "customer and total"; }
          else { out.push([doc, q.txn_date, q.customer, total, "", "", "Not matched", cand.length > 1 ? "more than one CRM project fits — set the invoice number on the right one" : "no CRM project with this invoice number, or with this customer and total"]); flagged++; continue; }
        }
        // an invoice number on a project of a different customer is a wrong match: flag it, change nothing
        if (how === "invoice number") { const a = S.accounts.get(p.accountId) || {}; const cn = norm(q.customer);
          const names = [a.qb, a.name].concat(T.live(S.contacts).filter((c) => c.accountId === p.accountId).map((c) => c.name)).map(norm).filter(Boolean);
          if (cn && !names.some((n) => n === cn || n.indexOf(cn) >= 0 || cn.indexOf(n) >= 0)) {
            out.push([doc, q.txn_date, q.customer, total, "P-" + p.num, "", "Customer differs", "This invoice number is on a project for a different customer — check which project it bills; nothing was changed"]); flagged++; continue; } }
        used.add(p.id); matched++;
        // a total far from QuickBooks' means the match itself may be wrong: flag it, change nothing
        const crm0 = (T.projValue(p) || 0) + (T.invTaxOf(p) || 0);
        if (how !== "invoice number" || (total > 0 && Math.abs(crm0 - total) / total > 0.25 && Math.abs(crm0 - total) > 50)) {
          if (how === "invoice number") { out.push([doc, q.txn_date, q.customer, total, "P-" + p.num, Math.round(crm0 * 100) / 100, "Total differs", "QuickBooks " + total.toFixed(2) + " vs CRM " + crm0.toFixed(2) + " — too far apart to update automatically; check the quote lines (and any discount) against the invoice"]); flagged++; continue; } }
        const patch = {}, notes = [];
        if (String(p.invNum || "").trim() !== doc) { patch.invNum = doc; notes.push("invoice # " + doc); }
        if (q.txn_date && p.billDate !== q.txn_date) { patch.billDate = q.txn_date; notes.push("invoiced on " + q.txn_date); }
        if (T.invTaxOf(p) === null || Math.abs(T.invTaxOf(p) - tax) > 0.004) { patch.invTax = tax; notes.push("tax " + tax.toFixed(2)); }
        const paid = total > 0 && bal <= 0.004;
        const want = paid ? "paid" : (T.billState(p) === "deposit" && bal < total ? "deposit" : "invoiced");
        if (T.billState(p) !== want) { patch.billStatus = want; notes.push(want === "paid" ? "paid in full" : want); }
        // the invoice copy has no payment date, so the CRM's paid date is left as it is (never set to today)
        if (paid && !p.paidDate && q.paid_date && /^\d{4}-\d{2}-\d{2}$/.test(q.paid_date)) { patch.paidDate = q.paid_date; notes.push("paid on " + q.paid_date); }
        if (Object.keys(patch).length) { patch.updatedAt = Date.now(); await T.push("projects/" + p.id, patch);
          await T.recordHistory("project", p.id, [{ f: "Fix run", o: "", n: "QuickBooks check " + RUN + ": matched invoice " + doc + " — " + notes.join(", ") + " (before: " + Object.keys(patch).filter((k) => k !== "updatedAt").map((k) => k + " " + JSON.stringify(p[k] === undefined ? "" : p[k])).join(", ") + ")", ev: 1 }]); changed++; }
        const crmTotal = Math.round(((T.projValue(Object.assign({}, p, patch)) || 0) + tax) * 100) / 100;
        const diff = Math.abs(crmTotal - total) > 1.01;
        if (diff) flagged++;
        out.push([doc, q.txn_date, q.customer, total, "P-" + p.num, crmTotal, diff ? "Total differs" : (notes.length ? "Updated" : "Matches"),
          (diff ? "QuickBooks " + total.toFixed(2) + " vs CRM " + crmTotal.toFixed(2) + " — check the quote lines against the invoice. " : "") + (notes.length ? "CRM set to QuickBooks: " + notes.join(", ") : "") + " (matched by " + how + ")"]);
      }
      // a copy of the invoice list for the CRM's Reports page (receivables aging, quoted vs invoiced) — office-only in the rules
      try { await T.setDoc("settings/qbinv", { at: Date.now(), rows: inv.filter((q) => num(q.total) !== 0).map((q) => ({ doc: String(q.doc_number).replace(/^#/, "").trim(), date: q.txn_date || "", due: q.due_date || "", customer: q.customer || "",
        total: num(q.total), tax: num(q.tax), balance: num(q.balance), status: q.status || "", paid: q.paid_date || "" })) }); } catch (e) {}
      return { out, changed, matched, flagged, total: inv.length };
    }, [inv, "run " + (process.env.GITHUB_RUN_ID || "local")]);
    const head = [["Invoice", "Date", "Customer (QuickBooks)", "QuickBooks total", "CRM project", "CRM total", "Result", "What happened", "", "Checked " + new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC"]];
    const meta = await api("?fields=sheets.properties.title", "GET");
    if (!(meta.sheets || []).some((x) => x.properties.title === "QB Check")) await api(":batchUpdate", "POST", { requests: [{ addSheet: { properties: { title: "QB Check" } } }] });
    await api("/values/" + encodeURIComponent("'QB Check'!A:J") + ":clear", "POST", {});
    await api("/values/" + encodeURIComponent("'QB Check'!A1") + "?valueInputOption=RAW", "PUT", { values: head.concat(res.out) });
    await page.waitForTimeout(20000);
    console.log("::notice::QuickBooks check: " + res.total + " invoices, " + res.matched + " matched, " + res.changed + " CRM projects updated to match, " + res.flagged + " flagged for a look");
    await browser.close(); process.exit(0);
  } catch (e) { console.log("::error::QuickBooks check: " + String(e.message || e).slice(0, 160)); await browser.close(); process.exit(1); }
}
// Send all to the CRM Orders sheet (the toast text tells how many went)
// changed records reach the sheet by themselves (the CRM sends each change); a full Send all only when asked
const wantAll = STEP !== "apply" || /\/\/ send all/.test(fsys.readFileSync(path.resolve(here, "fixes.js"), "utf8"));
const sent = wantAll ? await page.evaluate(async () => { try { await window.__T.syncAll(); return "ok"; } catch (e) { return "sync error " + String(e).slice(0, 100); } }) : "changes only";
await page.waitForTimeout(wantAll ? 90000 : 60000);
step("sync " + (wantAll ? "Send all finished" : "changes sent"));
const prog = await page.evaluate(() => window.__syncProg || null).catch(() => null);
const toast = await page.evaluate(() => [...document.querySelectorAll(".toast,[class*=toast]")].map((x) => x.innerText).join(" | ").slice(0, 200)).catch(() => "");
console.log("::notice::fix step " + STEP + ": " + JSON.stringify(result).slice(0, 900) + " | sync " + sent + " | " + writes + " writes, " + errors + " page errors " + JSON.stringify(errs.slice(0, 3)) + " | " + toast + " | Send all " + JSON.stringify(prog));
const failed = (result && result.error) || errors > 0 || (prog && prog.bad > 0);
await browser.close(); process.exit(failed ? 1 : 0);
