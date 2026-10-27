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
// expose the CRM's functions to this script (the app keeps them inside one closure)
let html = fsys.readFileSync(path.resolve(here, "../public/index.html"), "utf8");
const cut = html.lastIndexOf("\n})();\n</script>");
if (cut < 0) throw new Error("page layout changed");
const extra = fsys.existsSync(path.resolve(here, "fix-names.txt")) ? fsys.readFileSync(path.resolve(here, "fix-names.txt"), "utf8").split(/[\s,]+/).filter(Boolean) : [];
const NAMES = [...new Set("S,syncAll,live,proj,acct,push,setDoc,mergeDoc,recordHistory,logEvent,jobsOf,setStage,today,uid".split(",").concat(extra))];
const hook = "\nwindow.__T={" + NAMES.map((n) => `${n}:(typeof ${n}!=="undefined"?${n}:undefined)`).join(",") + "};\n";
html = html.slice(0, cut) + hook + html.slice(cut);
const PAGE = path.resolve(here, "../public/__fix.html");
fsys.writeFileSync(PAGE, html);

const { Firestore } = await import("@google-cloud/firestore");
const fs = new Firestore({ projectId: process.env.FIREBASE_PROJECT || "ssc-crm-a7224", ignoreUndefinedProperties: true });
const plain = (v) => JSON.parse(JSON.stringify(v === undefined ? null : v, (k, x) => x && typeof x === "object" && typeof x.toMillis === "function" ? x.toMillis() : x));
let writes = 0, errors = 0; const errs = [];
let browser; try { browser = await chromium.launch({ channel: "chrome" }); } catch (e) { browser = await chromium.launch(); }
setTimeout(() => { console.log("::warning::watchdog"); process.exit(0); }, 15 * 60000).unref();
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
  try { localStorage.setItem("sscMe", "MJ"); } catch (e) {}
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
let result = {};
if (STEP === "apply") {
  const code = fsys.readFileSync(path.resolve(here, "fixes.js"), "utf8");
  result = await page.evaluate(async (src) => { try { return await (0, eval)(src)(window.__T); } catch (e) { return { error: String(e && e.message || e).slice(0, 200) }; } }, code);
  await page.waitForTimeout(15000);
}
// Send all to the CRM Orders sheet (the toast text tells how many went)
const sent = await page.evaluate(async () => { try { await window.__T.syncAll(); return "ok"; } catch (e) { return "sync error " + String(e).slice(0, 100); } });
await page.waitForTimeout(90000);
const toast = await page.evaluate(() => [...document.querySelectorAll(".toast,[class*=toast]")].map((x) => x.innerText).join(" | ").slice(0, 200)).catch(() => "");
console.log("::notice::fix step " + STEP + ": " + JSON.stringify(result).slice(0, 900) + " | sync " + sent + " | " + writes + " writes, " + errors + " page errors " + JSON.stringify(errs.slice(0, 3)) + " | " + toast);
await browser.close(); process.exit(0);
