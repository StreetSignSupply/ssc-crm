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
// console errors (what a person sees in the browser console) — emails and long ids blanked before they're printed
const cerrs = []; page.on("console", (m) => { if (m.type() !== "error") return; const t = String(m.text() || "").replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<email>").replace(/[A-Za-z0-9_-]{24,}/g, "<id>").slice(0, 140); if (cerrs.indexOf(t) < 0 && cerrs.length < 15) cerrs.push(t); });
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
// the page must never reload or navigate during a run (a release mid-run used to pull the rug out): say so loudly if it tries
// (moving between the CRM's own pages only changes the #part of the address — that's fine; loading a different page isn't)
let loaded = false; const base = (u) => String(u).split("#")[0];
page.on("framenavigated", (f) => { if (loaded && f === page.mainFrame() && base(f.url()) !== base("file://" + PAGE)) { errors++; errs.push("the page navigated mid-run — " + base(f.url()).slice(0, 60)); } });
await page.route(/firebase-adapter\.js$/, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
await page.goto("file://" + PAGE);
await page.evaluate(() => window.__sscResolve && window.__sscResolve(window.__workerCore));
await page.waitForFunction(() => window.__T && window.__T.S && window.__T.S.projects && window.__T.S.projects.size > 0 && window.__T.S.accounts.size > 0, null, { timeout: 120000 });
await page.waitForTimeout(20000);   // let every collection arrive
loaded = true;
step("CRM loaded");
let result = {};
// FIX_STEP=aitest -> the Write it with AI check (ai-check.js): read-only apart from the AI draft requests it makes
if (STEP === "aitest") {
  const code = fsys.readFileSync(path.resolve(here, "ai-check.js"), "utf8");
  result = await page.evaluate(async (src) => { try { return await (0, eval)(src)(window.__T); } catch (e) { return { error: String(e && e.message || e).slice(0, 200) }; } }, code);
  step("AI check done");
}
if (STEP === "apply" && !fsys.existsSync(path.resolve(here, "fixes.js"))) { result = { skipped: "no fixes.js — nothing to apply" }; step("nothing to apply"); }
else if (STEP === "apply") {
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
// FIX_STEP=recent -> read-only: what the team created or changed in the last 4 days, whether it's in the database and
// whether the owner's lists would show it — team initials and counts only, no names, emails or text
if (STEP === "recent") {
  const lock = (await fs.doc("settings/dbLock").get()).data() || {};
  const acc = (await fs.collection("access").get()).docs.map((d) => d.data());
  result = await page.evaluate((x) => { const T = window.__T, S = T.S; const since = Date.now() - 4 * 864e5;
    const ini = (id, who) => { const t = id && S.team.get(id); return t ? String(t.initials || "?") + (t.deleted ? "(deleted)" : "") + "/" + T.teamRole(t) : (who ? "who:" + String(who).slice(0, 3) : "unknown"); };
    const tally = (col, at, by) => { const o = {}; for (const r of S[col].values()) { const t = Math.max(Number(r[at[0]]) || 0, Number(r[at[1]]) || 0); if (t < since) continue;
        const k = ini(r[by[0]] || r[by[1]], r.who || r.by || r.createdBy); o[k] = o[k] || { n: 0, deleted: 0, noName: 0, test: 0, merged: 0, noAcct: 0 }; const z = o[k]; z.n++;
        if (r.deleted) z.deleted++; if (!String(r.name || r.text || r.subject || r.desc || "x").trim()) z.noName++; if (T.isTestRec && T.isTestRec(r)) z.test++; if (r.mergedInto) z.merged++;
        if (col === "contacts" && !r.accountId) z.noAcct++; } return o; };
    const team = [...S.team.values()].map((t) => ({ i: t.initials, role: T.teamRole(t), deleted: !!t.deleted, hasEmail: /@/.test(t.email || ""), access: t.access || "" }));
    return { team, accounts: tally("accounts", ["createdAt", "updatedAt"], ["createdById", "byId"]), contacts: tally("contacts", ["createdAt", "updatedAt"], ["createdById", "byId"]),
      projects: tally("projects", ["createdAt", "updatedAt"], ["createdById", "repId"]), activity: tally("activity", ["at", "at"], ["whoId", "byId"]),
      totals: { accounts: S.accounts.size, contacts: S.contacts.size, vendors: S.vendors.size },
      accFields: [...new Set([...S.accounts.values()].flatMap((a) => Object.keys(a)))].sort().join(","), conFields: [...new Set([...S.contacts.values()].flatMap((a) => Object.keys(a)))].sort().join(","),
      vendorNamed: [...S.accounts.values()].filter((a) => !a.deleted && [...S.vendors.values()].some((v) => !v.deleted && T.acctKey(v.name) === T.acctKey(a.name))).length,
      vendorTyped: [...S.accounts.values()].filter((a) => !a.deleted && /vendor|supplier/i.test(String(a.type || ""))).length,
      lock: x.lock, access: x.acc }; }, { lock: { applied: lock.applied || lock.appliedAt || "", apply: lock.apply || "", rulesAt: lock.rulesAt || lock.at || "", noAddr: lock.noAddr, orphans: (lock.orphans || []).length },
      acc: acc.map((a) => ({ role: a.role || "", team: !!a.teamId, mail: !!a.mail })) });
  // where each sales person's work went: their emails in the send queue, their field-history edits, their sign-in records
  { const since = Date.now() - 4 * 864e5; const team = (await fs.collection("team").get()).docs.map((d) => Object.assign({ id: d.id }, d.data()));
    const ini = (id) => { const t = team.find((x) => x.id === id); return t ? String(t.initials || "?") : "other"; };
    const mail = (await fs.collection("mail").where("at", ">", since).get()).docs.map((d) => d.data());
    result.mail = {}; for (const m of mail) { const k = ini(m.byId) + ":" + (m.kind || "?") + ":" + (m.status || "?"); result.mail[k] = (result.mail[k] || 0) + 1; }
    const hist = (await fs.collection("history").get()).docs.map((d) => d.data()); result.historyBy = {};
    for (const h of hist) for (const e of (h.entries || h.list || h.items || [])) { if (!e || Number(e.t) < since) continue; const k = String(e.w || "?").slice(0, 3); result.historyBy[k] = (result.historyBy[k] || 0) + 1; }
    const accDocs = (await fs.collection("access").get()).docs; result.accessKeys = accDocs.map((d) => ({ key: /@/.test(d.id) ? "email" : "uid", role: d.data().role, team: ini(d.data().teamId) }));
    result.teamSignIn = team.filter((t) => !t.deleted).map((t) => ({ i: t.initials, claimed: !!(t.claudeId || t.uid), claimPending: !!t.claimPending, email: /@/.test(t.email || "") })); }
  // what the Accounts page lists for the owner right now
  await page.evaluate(() => { location.hash = "#/accounts"; }); await page.waitForTimeout(3000);
  result.accountsPage = await page.evaluate(() => ({ rows: document.querySelectorAll(".main section.wide tbody tr").length, head: ((document.querySelector(".main h2") || {}).textContent || "") + " " + ((document.querySelector(".main .card header .n") || {}).textContent || ""), filters: [...document.querySelectorAll(".main select")].map((s) => (s.dataset.acfilt || "") + "=" + s.value).join(" ") }));
  step("recent read");
}
// FIX_STEP=review -> read-only: what the owner's "quotes to review" bar lists right now (P-numbers and counts only)
if (STEP === "review") {
  result = await page.evaluate(() => { const T = window.__T; const L = T.reviewQuotes();
    const all = [...T.S.projects.values()].filter((p) => !p.deleted && /^20(3[0-9]|4[0-9])$/.test(String(p.num)));
    const VL = T.vendorLookalikes ? T.vendorLookalikes() : [];
    const VM = T.vendorMaybes ? T.vendorMaybes() : [];
    return { vendorMaybes: VM.length, vendorMaybeByName: VM.filter((x) => x.v).length, vendorLookalikes: VL.length, vendorsMatched: new Set(VL.map((x) => x.v.id)).size, vendorsTotal: [...T.S.vendors.values()].filter((v) => !v.deleted).length, onList: L.map((x) => ({ p: "P-" + x.p.num, stage: x.p.stage, stalePdf: x.stale, recipients: T.reviewTo(x.p).length, makerIsTeam: !!x.maker })),
      recentQuotes: all.map((p) => { const f = T.projFiles(p.id).filter((x) => !x.deleted && x.gen === "quote"); return { p: "P-" + p.num, stage: p.stage, pdfs: f.length, pdfCurrent: f.some((x) => x.qhash === T.quoteHash(p)), byOwner: f.some((x) => { const t = x.byId && T.S.team.get(x.byId); return !!t && T.teamRole(t) === "owner"; }), approved: !!(p.quoteApproval && p.quoteApproval.v === 2 && p.quoteApproval.hash === T.quoteHash(p)) }; }) }; });
  step("review list read");
}
// FIX_STEP=dupcheck -> read-only: for accounts made in the last 10 days, whether the new-account check would have matched
// a deleted (recycle bin) or live account, and by which rule. Counts and rule names only — no names, phones or domains.
if (STEP === "dupcheck") {
  result = await page.evaluate(() => { const T = window.__T; const S = T.S; const all = [...S.accounts.values()];
    const del = all.filter((x) => x.deleted), recent = all.filter((x) => !x.deleted && (Number(x.createdAt) || 0) > Date.now() - 10 * 864e5);
    const why = (a, x) => { const r = []; const doms = T.acctDomains(Object.assign({}, a, { id: "" })); const dx = T.acctDomains(x);
      if ([...dx].some((d) => doms.has(d))) r.push("domain" + ([...dx].filter((d) => doms.has(d)).some((d) => !/\./.test(d) || d.length < 5) ? "(odd)" : ""));
      const k = T.acctKey(a.name); if (k && k.length > 2 && T.acctKey(x.name) === k) r.push("name");
      const ph = String(a.phone || "").replace(/\D/g, "").slice(-10); if (ph.length === 10 && String(x.phone || "").replace(/\D/g, "").slice(-10) === ph) r.push("phone"); return r.join("+"); };
    const per = recent.map((a) => { const rec = Object.assign({}, a, { id: "" }); const d = T.dupAccounts(rec, true); const l = T.dupAccounts(rec).filter((x) => x.id !== a.id);
      return { bin: d.length, binWhy: [...new Set(d.map((x) => why(a, x)))], live: l.length, liveWhy: [...new Set(l.map((x) => why(a, x)))], hasEmail: !!a.email, hasWeb: !!a.website, hasPhone: !!a.phone }; });
    // how many deleted accounts share one email/web domain or phone with many others (a catch-all)
    const domCount = {}; del.forEach((x) => T.acctDomains(x).forEach((d) => { domCount[d] = (domCount[d] || 0) + 1; }));
    const phCount = {}; all.forEach((x) => { const p = String(x.phone || "").replace(/\D/g, "").slice(-10); if (p.length === 10) phCount[p] = (phCount[p] || 0) + 1; });
    const ourDom = Object.keys(domCount).filter((d) => /streetsignsupply|mesaridge/i.test(d)).map((d) => domCount[d]);
    const agg = {}; per.forEach((x) => { const k = "bin:" + (x.bin ? x.binWhy.join("|") : "none") + " live:" + (x.live ? x.liveWhy.join("|") : "none"); agg[k] = (agg[k] || 0) + 1; });
    // a random sample of plain names: would a typical new name hit the bin? (uses the deleted accounts' own names, so it's the worst case)
    const binMerged = del.filter((x) => x.mergedInto).length, binMergedLive = del.filter((x) => x.mergedInto && S.accounts.get(x.mergedInto) && !S.accounts.get(x.mergedInto).deleted).length;
    const binSameNameAsLive = del.filter((x) => { const k = T.acctKey(x.name); return k && all.some((y) => !y.deleted && T.acctKey(y.name) === k); }).length;
    const byWho = {}; del.forEach((x) => { const k = String(x.deletedBy || "?").slice(0, 3); byWho[k] = (byWho[k] || 0) + 1; });
    return { deleted: del.length, recent: recent.length, agg, binMerged, binMergedLive, binSameNameAsLive, byWho, deletedWithOurDomain: ourDom, biggestSharedDomainInBin: Math.max(0, ...Object.values(domCount)), phonesOnManyAccounts: Object.values(phCount).filter((n) => n >= 3).sort((a, b) => b - a) }; });
  step("dup check read");
}
// FIX_STEP=bincheck -> read-only: how the accounts in the recycle bin got there — grouped by who and when, with what each
// group had on it and what its field history says. Counts and fixed wording only — no names.
if (STEP === "bincheck") {
  result = await page.evaluate(async () => { const T = window.__T; const S = T.S; const all = [...S.accounts.values()]; const del = all.filter((x) => x.deleted);
    const liveKey = new Set(all.filter((x) => !x.deleted).map((x) => T.acctKey(x.name)));
    const tz = (ms) => new Date(ms).toLocaleString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const groups = {};
    del.forEach((x) => { const at = Number(x.deletedAt) || 0; const k = String(x.deletedBy || "?") + " " + (at ? tz(Math.floor(at / 600000) * 600000) : "no date") + (x.mergedInto ? " merged" : "");
      const g = groups[k] || (groups[k] = { n: 0, liveSameName: 0, withProjects: 0, withContacts: 0, withActivity: 0, created: [], keys: {}, hist: {} }); g.n++;
      if (liveKey.has(T.acctKey(x.name))) g.liveSameName++;
      if ([...S.projects.values()].some((p) => p.accountId === x.id)) g.withProjects++;
      if ([...S.contacts.values()].some((c) => c.accountId === x.id)) g.withContacts++;
      if ([...S.activity.values()].some((a) => a.recType === "account" && a.recId === x.id)) g.withActivity++;
      if (x.createdAt) g.created.push(Number(x.createdAt));
      Object.keys(x).forEach((f) => { if (/src|source|import|batch|from|lead|origin/i.test(f)) { const kk = f + "=" + String(x[f]).replace(/\bP\d+\s*/g, "").replace(/\d+/g, "#").slice(0, 26); g.keys[kk] = (g.keys[kk] || 0) + 1; } }); });
    // field history for a sample of each group
    const db = T.getDb();
    for (const k of Object.keys(groups)) { const g = groups[k]; const sample = del.filter((x) => { const at = Number(x.deletedAt) || 0; return (String(x.deletedBy || "?") + " " + (at ? tz(Math.floor(at / 600000) * 600000) : "no date") + (x.mergedInto ? " merged" : "")) === k; }).slice(0, 6);
      for (const x of sample) { try { const d = await db.doc("history/account_" + x.id).get(); const ok = d && (typeof d.exists === "function" ? d.exists() : d.exists); const h = ok ? (d.data().h || d.data().entries || []) : [];
          const ev = (Array.isArray(h) ? h : []).filter((e) => /Deleted|Event/.test(e.f || "")).map((e) => (e.f || "") + ": " + String(e.n || "").replace(/ — .*/, "").replace(/[A-Z][a-z]+ [A-Z][a-z]+/g, "").slice(0, 70) + " by " + (e.w || "?"));
          ev.forEach((t) => { g.hist[t] = (g.hist[t] || 0) + 1; }); if (!ev.length) g.hist[ok ? "history has no delete entry" : "no history doc"] = (g.hist[ok ? "history has no delete entry" : "no history doc"] || 0) + 1; } catch (e) { g.hist["history read failed"] = (g.hist["history read failed"] || 0) + 1; } }
      g.created = g.created.length ? tz(Math.min(...g.created)) + " to " + tz(Math.max(...g.created)) : "unknown"; }
    return { deleted: del.length, groups: Object.entries(groups).sort((a, b) => b[1].n - a[1].n).slice(0, 25) }; });
  step("bin check read");
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
// FIX_STEP=export -> what the Order sync does not carry: every file in the CRM (what it is attached to, who added it,
// category, link) to the "CRM Files" tab, and every inventory item (on hand, on order, reorder point, vendor) to the
// "CRM Inventory" tab of the SSS Pipeline sheet, so Josh, the accountants and the Equipment Manager see vendor
// invoices, customer POs, artwork and stock without signing in to the CRM. Read-only; counts only in the log.
if (STEP === "export") {
  const SHEET = process.env.PIPE_SHEET || "1aChWjS_R0ImI19AkBD-WAXRYoJz0douDNdhsASwIuVs", tok = process.env.SHEETS_TOKEN;
  const api = async (url, method, body) => { const r = await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + SHEET + url, { method, headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) { const t = await r.text(); const why = /has not been used|is disabled/.test(t) ? "Sheets API not turned on for the project" : /permission|PERMISSION/.test(t) ? "the sheet isn't shared with the CRM's service account" : ((t.match(/"status":\s*"([A-Z_]+)"/) || [])[1] || ""); throw new Error(method + " " + r.status + " " + why); } return r.json(); };
  const data = await page.evaluate(() => {
    const T = window.__T, S = T.S;
    const live = (m) => T.live(m);
    const ts = (v) => v ? new Date(Number(v)).toISOString().replace("T", " ").slice(0, 16) : "";
    const acct = (id) => { const a = S.accounts.get(id); return a ? a.name : ""; };
    const vend = (id) => { const v = S.vendors.get(id); return v ? v.name : ""; };
    const files = [["file_id", "added", "added_by", "category", "name", "on", "ref", "project", "work_order", "account", "vendor", "stencil_sku", "note", "approved", "verified", "size_bytes", "url", "link"]];
    live(S.files).sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0)).forEach((f) => {
      const p = f.projectId ? S.projects.get(f.projectId) : null;
      const on = p ? "project" : f.jobId ? "work_order" : f.vendorId ? "vendor" : f.accountId ? "account" : f.stencilSku ? "stencil" : "other";
      const ref = p ? "P-" + p.num + " " + (p.name || "") : f.jobId ? "WO " + f.jobId : f.vendorId ? vend(f.vendorId) : f.accountId ? acct(f.accountId) : f.stencilSku || "";
      files.push([f.id, ts(f.at) || (f.when || ""), f.who || "", f.cat || "", f.name || "", on, ref, p ? "P-" + p.num : "", f.jobId || "", acct(p ? p.accountId : f.accountId), vend(f.vendorId), f.stencilSku || "", f.note || "", f.approved ? "yes" : "", f.verified ? "yes" : "", Number(f.size) || "", f.url || "", f.link || ""]);
    });
    const items = [["item_id", "name", "sku", "category", "unit", "on_hand", "on_order", "reorder_point", "reorder_qty", "low", "bin", "preferred_vendor", "cost", "vendor_part", "lead", "sample", "updated"]];
    live(S.items).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))).forEach((i) => {
      const oh = Number(i.onHand || 0), oo = Math.max(0, Number(i.onOrder || 0)), rp = (i.reorderPoint === "" || i.reorderPoint == null) ? "" : Number(i.reorderPoint);
      items.push([i.id, i.name || "", i.sku || "", i.cat || "", i.unit || "", oh, oo, rp, i.reorderQty || "", rp !== "" && oh + oo <= rp ? "yes" : "", i.bin || "", vend(i.vendorId), i.cost || "", i.vendorPart || "", i.vendorLead || "", i.sample ? "yes" : "", ts(i.updatedAt)]);
    });
    return { files, items };
  });
  const write = async (TAB, rows, cols) => {
    const meta = await api("?fields=sheets(properties(title,sheetId,gridProperties))", "GET");
    let sh = (meta.sheets || []).find((x) => x.properties.title === TAB);
    if (!sh) { await api(":batchUpdate", "POST", { requests: [{ addSheet: { properties: { title: TAB, gridProperties: { rowCount: rows.length + 50, columnCount: cols } } } }] }); }
    else if (sh.properties.gridProperties.rowCount < rows.length + 5) await api(":batchUpdate", "POST", { requests: [{ appendDimension: { sheetId: sh.properties.sheetId, dimension: "ROWS", length: rows.length + 5 - sh.properties.gridProperties.rowCount } }] });
    const last = String.fromCharCode(64 + cols);
    await api("/values/" + encodeURIComponent("'" + TAB + "'!A:" + last) + ":clear", "POST", {});
    rows[0] = rows[0].concat(["Exported from the CRM " + new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC"]);
    await api("/values/" + encodeURIComponent("'" + TAB + "'!A1") + "?valueInputOption=RAW", "PUT", { values: rows });
  };
  try {
    await write("CRM Files", data.files, 18); step("CRM Files written");
    await write("CRM Inventory", data.items, 17); step("CRM Inventory written");
    const vinv = data.files.slice(1).filter((r) => r[5] === "vendor" && /invoice/i.test(r[3])).length, low = data.items.slice(1).filter((r) => r[9] === "yes").length;
    console.log("::notice::export: " + (data.files.length - 1) + " files (" + vinv + " vendor invoices), " + (data.items.length - 1) + " inventory items (" + low + " low)");
    await browser.close(); process.exit(0);
  } catch (e) { console.log("::error::export: " + String(e.message || e).slice(0, 160)); await browser.close(); process.exit(1); }
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
        if (Object.keys(patch).length) { patch.updatedAt = Date.now(); patch.fixedBy = "QuickBooks check " + RUN; await T.push("projects/" + p.id, patch);
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
// only a "sync" run sends everything; the AI check sends nothing; an apply run sends just its changes (or all when asked)
const fixSrc = fsys.existsSync(path.resolve(here, "fixes.js")) ? fsys.readFileSync(path.resolve(here, "fixes.js"), "utf8") : "";
const wantAll = STEP === "sync" || (STEP === "apply" && /\/\/ send all/.test(fixSrc));
if (STEP === "recent") { console.log("::notice::fix step recent: " + JSON.stringify(result).slice(0, 6000) + " | " + errors + " page errors"); await browser.close(); process.exit(0); }
if (STEP === "review" || STEP === "dupcheck" || STEP === "bincheck") { console.log("::notice::fix step " + STEP + ": " + JSON.stringify(result).slice(0, 12000) + " | " + errors + " page errors"); await browser.close(); process.exit(0); }
if (STEP === "aitest") { console.log("::notice::fix step aitest: " + JSON.stringify(result).slice(0, 1800) + " | " + errors + " page errors " + JSON.stringify(errs.slice(0, 3)));
  await browser.close(); process.exit((result && result.error) || errors > 0 ? 1 : 0); }
const sent = wantAll ? await page.evaluate(async () => { try { await window.__T.syncAll(); return "ok"; } catch (e) { return "sync error " + String(e).slice(0, 100); } }) : "changes only";
await page.waitForTimeout(wantAll ? 90000 : 60000);
step("sync " + (wantAll ? "Send all finished" : "changes sent"));
const prog = await page.evaluate(() => window.__syncProg || null).catch(() => null);
const toast = await page.evaluate(() => [...document.querySelectorAll(".toast,[class*=toast]")].map((x) => x.innerText).join(" | ").slice(0, 200)).catch(() => "");
if (cerrs.length) console.log("::notice::console errors (" + cerrs.length + "): " + JSON.stringify(cerrs).slice(0, 1800));
console.log("::notice::fix step " + STEP + ": " + JSON.stringify(result).slice(0, 900) + " | sync " + sent + " | " + writes + " writes, " + errors + " page errors " + JSON.stringify(errs.slice(0, 3)) + " | " + toast + " | Send all " + JSON.stringify(prog));
const failed = (result && result.error) || errors > 0 || (prog && prog.bad > 0);
await browser.close(); process.exit(failed ? 1 : 0);
