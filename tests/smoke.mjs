// Release check: opens a build of the CRM (next/index.html by default) with made-up data and walks every main page
// and a few forms. Any script error, or a page that draws nothing, fails the check and the build isn't released.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "..");
const SRC = path.resolve(root, process.argv[2] || "next/index.html");
const PAGE = path.resolve(here, "__smoke.html");
fs.writeFileSync(PAGE, fs.readFileSync(SRC, "utf8"));
const now = Date.now(), day = 86400000;
const D = {
  team: { t1: { name: "Test Owner", initials: "TO", access: "owner", claudeId: "u1", email: "owner@example.com" }, t2: { name: "Test Sales", initials: "TS", access: "sales", email: "sales@example.com" } },
  accounts: { a1: { name: "Test County", city: "Town", state: "UT", type: "Government agency", terms: "Net 30", repId: "t1" }, a2: { name: "Test Contractor", type: "Contractor", terms: "Prepay" } },
  contacts: { c1: { name: "Pat Example", accountId: "a1", email: "pat@example.com", phone: "4355550100", role: "Buyer" } },
  vendors: { v1: { name: "Test Plastics" }, v2: { name: "Test Metals" } },
  items: {
    i1: { name: "LDPE .125 Stencil Sheet 5x10", cat: "Stencil material", cost: "91.20", vendorId: "v1", vendorPrice: "91.20", unit: "sheet", onHand: 4, reorderPoint: 2,
      onOrder: 3, orders: [{ ref: "PR-20261026-1", vendor: "Test Plastics", qty: 3, left: 3, expected: "2026-11-02", at: now - day }] },
    i2: { name: "Aluminum .080 sheet 48x96", cat: "Substrate", cost: "141.20", vendorId: "v2", vendorPrice: "141.20", unit: "sheet", onHand: 0 },
    i3: { name: "3M HIP White 3930 48in x 50yd", cat: "Film / vinyl", cost: "900", unit: "roll", onHand: 1 } },
  projects: {
    p1: { num: 2001, name: "Signs and stencils", accountId: "a1", stage: "quoted", repId: "t1", createdAt: now - 9 * day, orderLines: [
      { id: "l1", code: "R1-1", desc: "Stop", size: "30x30", grade: "HIP", qty: "4", price: "79.45" },
      { id: "l2", code: "SSS-FAA-108-01", desc: "108\" FAA Airport Stencil Kit", size: "48x120", grade: "LDPE .125", qty: "1", price: "219.50" },
      { id: "l3", charge: "setup", desc: "Setup", qty: "1", price: "18.50", cost: "12.50" }] },
    p2: { num: 2002, name: "Inquiry only", accountId: "a2", stage: "inquiry", createdAt: now - 2 * day } },
  jobs: { 1001: { num: 1001, desc: "Signs and stencils", projectId: "p1", accountId: "a1", prod: "sign", status: "production", due: new Date(now + 3 * day).toISOString().slice(0, 10),
    items: [{ qty: "4", code: "R1-1", desc: "Stop", size: "30x30", grade: "HIP", lineId: "l1" }], gates: {}, route: {}, ship: {}, statusLog: [{ status: "new", at: now - day }] } },
  files: { f1: { name: "Proof.png", type: "image/png", url: "", cat: "Artwork proof", projectId: "p1", accountId: "a1", at: now } },
  activity: { x1: { id: "x1", recType: "account", recId: "a1", kind: "note", type: "call", text: "Called about the bid", contactId: "c1", at: now - day, when: new Date(now - day).toISOString().slice(0, 10) } },
  events: {}, history: {}, invtx: {}, notifications: {}, reminders: {}, access: {} };
const ROUTES = ["home", "mybook", "accounts", "account/a1", "contacts", "contact/c1", "projects", "project/p1", "project/p2", "jobs", "job/1001", "tracker", "calendar",
  "files", "purchasing", "inventory", "item/i1", "stencils", "vendors", "vendor/v1", "reports", "audit", "archive", "bin", "settings"];
const browser = await chromium.launch(); const pg = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errs = [];
pg.on("pageerror", (e) => errs.push(String(e.message || e).slice(0, 160)));
await pg.addInitScript((D) => { const db = { collection(c) { return { onSnapshot(cb) { const docs = Object.entries(D[c] || {}).map(([id, d]) => ({ id, data: () => d })); setTimeout(() => cb({ docs, size: docs.length, forEach: (f) => docs.forEach(f) }), 10); return () => {}; } }; },
    doc(p) { return { path: p, async get() { return { exists: false, data: () => null }; }, set() { return Promise.resolve(); }, update() { return Promise.resolve(); }, delete() { return Promise.resolve(); }, onSnapshot(cb) { setTimeout(() => cb({ exists: false, data: () => null }), 10); return () => {}; }, async acquire() { return { acquired: true }; } }; },
    nextCounter: async () => 1 };
  const caps = { db, user: { async me() { return { id: "u1", name: "Test Owner", email: "owner@example.com" }; } } };
  window.__mock = { use: async (n) => { if (!(n in caps)) throw Object.assign(new Error("x"), { code: "not_declared" }); return caps[n]; } }; }, D);
await pg.route(/firebase-adapter\.js$/, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
await pg.route(/raw\.githubusercontent\.com\/StreetSignSupply\/ssc-crm\/main\/public\/([^?]*)/, (r) => { const f = path.resolve(root, "public", decodeURIComponent(r.request().url().match(/main\/public\/([^?]*)/)[1]));
  if (fs.existsSync(f)) r.fulfill({ status: 200, contentType: f.endsWith(".png") ? "image/png" : f.endsWith(".json") ? "application/json" : "text/plain", body: fs.readFileSync(f) }); else r.fulfill({ status: 404, body: "" }); });
await pg.route(/^https?:\/\/(?!raw\.githubusercontent)/, (r) => r.abort());
await pg.goto("file://" + PAGE);
await pg.evaluate(() => window.__sscResolve && window.__sscResolve(window.__mock));
await pg.waitForTimeout(1500);
const bad = [];
for (const r of ROUTES) {
  const before = errs.length;
  await pg.evaluate((r) => { location.hash = "#/" + r; }, r); await pg.waitForTimeout(r === "stencils" ? 1800 : 500);
  const drawn = await pg.evaluate(() => { const m = document.querySelector(".main"); return m ? m.innerText.trim().length : 0; });
  if (!drawn) bad.push(r + ": nothing drawn"); if (errs.length > before) bad.push(r + ": " + errs.slice(before).join(" | "));
}
// a few forms
const forms = [["purchasing", "[data-ponew]"], ["purchasing", "[data-porecv]"], ["project/p1", "[data-edit^='project:']"], ["project/p1", "[data-ordadd]"], ["account/a1", "[data-edit^='account:']"], ["accounts", "[data-newvend],[data-new='account']"], ["job/1001", "[data-edit^='job:']"]];
for (const [r, sel] of forms) { await pg.evaluate((r) => { location.hash = "#/" + r; }, r); await pg.waitForTimeout(400); const before = errs.length;
  const el = await pg.$(sel); if (el) { await el.click().catch(() => {}); await pg.waitForTimeout(400); if (!(await pg.$(".modal"))) bad.push(r + " " + sel + ": form didn't open"); await pg.keyboard.press("Escape"); }
  if (errs.length > before) bad.push(r + " " + sel + ": " + errs.slice(before).join(" | ")); }
const ver = await pg.evaluate(() => { const m = document.documentElement.innerHTML.match(/APP_VERSION="([^"]+)"/); return m ? m[1] : ""; });
await browser.close(); fs.unlinkSync(PAGE);
if (bad.length) { console.log("::error::release check failed: " + bad.slice(0, 8).join(" || ")); process.exit(1); }
console.log("::notice::release check passed: " + ROUTES.length + " pages and " + forms.length + " forms, no errors");
