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
