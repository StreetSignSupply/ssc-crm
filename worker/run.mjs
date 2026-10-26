// worker v2 (keyless)
// CRM cloud worker: runs the real CRM (public/index.html) headless for a few minutes so the
// agents' feed rows are applied and the CRM's outbound sync runs, even when no one has the CRM open.
// Storage is the same Firestore the website uses, reached with a service account (GitHub secret
// FIREBASE_SERVICE_ACCOUNT). Prints counts only, never data (the repo is public).
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = "file://" + path.resolve(here, "../public/index.html");
const RUN_MS = Number(process.env.RUN_MS || 180000);

async function store() {
  if (process.env.MOCK_STORE) return (await import(process.env.MOCK_STORE)).default;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || "";
  const adc = process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
  if (!raw.trim() && !adc) { console.log("No Google credentials yet (keyless sign-in or key not set up): nothing to do."); process.exit(0); }
  let fs;
  if (raw.trim()) {
    const { initializeApp, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    initializeApp({ credential: cert(JSON.parse(raw)) });
    fs = getFirestore();
    fs.settings({ ignoreUndefinedProperties: true });
  } else {
    const { Firestore } = await import("@google-cloud/firestore");   // understands the keyless (federated) sign-in
    fs = new Firestore({ projectId: process.env.FIREBASE_PROJECT || "ssc-crm-a7224", ignoreUndefinedProperties: true });
  }
  const plain = (v) => JSON.parse(JSON.stringify(v === undefined ? null : v, (k, x) =>
    x && typeof x === "object" && typeof x.toMillis === "function" ? x.toMillis() : x));
  return {
    async get(p) { const s = await fs.doc(p).get(); return { id: s.id, exists: s.exists, data: s.exists ? plain(s.data()) : null }; },
    async set(p, d) { await fs.doc(p).set(d); },
    async merge(p, d) { await fs.doc(p).set(d, { merge: true }); },
    async del(p) { await fs.doc(p).delete(); },
    async counter(key, start) {
      const r = fs.doc("meta/counter");
      return fs.runTransaction(async (tx) => { const s = await tx.get(r); const d = (s.exists && s.data()) || {};
        const cur = Number(d[key]) || start; tx.set(r, { [key]: cur + 1 }, { merge: true }); return cur; });
    },
    watchColl(p, cb) { return fs.collection(p).onSnapshot((qs) => cb(qs.docs.map((d) => ({ id: d.id, data: plain(d.data()) }))), () => {}); },
    watchDoc(p, cb) { return fs.doc(p).onSnapshot((s) => cb({ id: s.id, exists: s.exists, data: s.exists ? plain(s.data()) : null }), () => {}); },
  };
}

process.on("unhandledRejection", (e) => { console.log("::error::" + String(e && e.message || e).slice(0, 300).replace(/\n/g, " ")); process.exit(1); });
process.on("uncaughtException", (e) => { console.log("::error::" + String(e && e.message || e).slice(0, 300).replace(/\n/g, " ")); process.exit(1); });
const st = await store();
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
let errors = 0, writes = 0;
page.on("pageerror", () => { errors++; });
const unsub = [];
await page.exposeBinding("__wGet", (_, p) => st.get(p));
await page.exposeBinding("__wSet", async (_, p, d) => { writes++; await st.set(p, d); });
await page.exposeBinding("__wMerge", async (_, p, d) => { writes++; await st.merge(p, d); });
await page.exposeBinding("__wDel", async (_, p) => { writes++; await st.del(p); });
await page.exposeBinding("__wCounter", (_, k, s) => st.counter(k, s));
await page.exposeBinding("__wWatch", (_, kind, p, id) => {
  const push = (payload) => page.evaluate(([i, x]) => window.__wPush && window.__wPush(i, x), [id, payload]).catch(() => {});
  unsub.push(kind === "coll" ? st.watchColl(p, push) : st.watchDoc(p, push));
});
await page.addInitScript(() => {
  window.sscHosted = true; window.sscWorker = true;
  try { localStorage.setItem("sscMe", ""); } catch (e) {}
  const cbs = {}; let n = 0;
  window.__wPush = (id, x) => { const cb = cbs[id]; if (!cb) return;
    if (Array.isArray(x)) { const docs = x.map((d) => ({ id: d.id, data: () => d.data })); cb({ docs, size: docs.length, forEach: (f) => docs.forEach(f) }); }
    else cb({ id: x.id, exists: x.exists, data: () => x.data }); };
  const db = {
    collection(p) { return { onSnapshot(cb) { const id = "c" + (n++); cbs[id] = cb; window.__wWatch("coll", p, id); return () => { delete cbs[id]; }; } }; },
    doc(p) { return {
      path: p,
      async get() { const x = await window.__wGet(p); return { id: x.id, exists: x.exists, data: () => x.data }; },
      set(d) { return window.__wSet(p, JSON.parse(JSON.stringify(d))); },
      update(d) { return window.__wMerge(p, JSON.parse(JSON.stringify(d))); },
      delete() { return window.__wDel(p); },
      onSnapshot(cb) { const id = "d" + (n++); cbs[id] = cb; window.__wWatch("doc", p, id); return () => { delete cbs[id]; }; },
      async acquire() { return { acquired: true }; } }; },
    nextCounter(k, s) { return window.__wCounter(k, s); },
  };
  const user = { async me() { return { id: "agents-worker", name: "Agents (cloud worker)", email: "agents@streetsignsupply.com", isOwner: true, canEdit: true }; } };
  const caps = { db, user, permissions: { async state() { return {}; } } };
  window.__workerCore = { use(name) { if (!(name in caps)) { const e = new Error(name + " not available in the worker"); e.code = "not_declared"; throw e; } return caps[name]; } };
});
await page.route(/firebase-adapter\.js$/, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
await page.goto(PAGE);
await page.evaluate(() => window.__sscResolve && window.__sscResolve(window.__workerCore));
await page.waitForTimeout(RUN_MS);
const counts = await page.evaluate(() => { try { return document.title + " / " + (document.querySelector(".main")||document.body).innerText.length + " chars on screen"; } catch (e) { return ""; } }).catch(() => "");
console.log("::notice::CRM loaded: " + counts);
const ver = await page.evaluate(() => (document.body.innerText.match(/20\d\d\.\d+\.\d+-\d+/) || [""])[0]).catch(() => "");
console.log(`::notice::CRM worker done: ${Math.round(RUN_MS / 1000)}s, ${writes} writes, ${errors} page errors${ver ? ", build " + ver : ""}`);
unsub.forEach((u) => { try { u(); } catch (e) {} });
await browser.close();
process.exit(0);
