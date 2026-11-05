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
  // t1 (the person signed in) is an older owner record with no level set, and another record is set to owner explicitly —
  // the owner must still get Settings (release -119..-128 turned such a record into Shop)
  team: { t1: { name: "Test Owner", initials: "TO", claudeId: "u1", email: "owner@example.com" }, t9: { name: "Second Owner", initials: "SO", access: "owner", email: "owner2@example.com" }, t2: { name: "Test Sales", initials: "TS", access: "sales", email: "sales@example.com" } },
  accounts: { a1: { name: "Test County", street: "1 Main St", city: "Town", state: "UT", type: "Government agency", terms: "Net 30", repId: "t1",
    billDiff: true, billStreet: "PO Box 77", billCity: "Town", billState: "UT", billZip: "84000" }, a2: { name: "Test Contractor", type: "Contractor", terms: "Prepay" },
    // a vendor that was also entered as an account: it has to be offered as a vendor, not left as a Lead
    a8: { name: "Prospect Lead Town", source: "Prospects P0075 (NV list, stage 1)", deleted: true, deletedAt: now - 2 * day, deletedBy: "AI" },
    a9: { name: "Gone Sign Co", city: "Town", state: "UT", type: "Contractor", deleted: true, deletedAt: now - day },
    a3: { name: "Test Plastics Inc", type: "Contractor", createdAt: now } },
  contacts: { c1: { name: "Pat Example", accountId: "a1", email: "pat@example.com", phone: "4355550100", role: "Buyer" }, c2: { name: "Lee Sample", accountId: "a2", phone: "4355550101", role: "Buyer" } },
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
  files: { f1: { name: "Proof.png", type: "image/png", url: "", cat: "Artwork proof", projectId: "p1", accountId: "a1", at: now },
    // a quote PDF a sales rep made (like the sales agent's starter quotes): it has to show on the owner's review list
    // a stencil's cut file and PDF: they show on that stencil (#/stencils)
    f3: { name: "SSS-FAA-108-01.dxf", type: "application/dxf", url: "", cat: "Cut file", stencilSku: "SSS-FAA-108-01", byId: "t1", who: "TO", at: now, size: 20480 },
    f4: { name: "SSS-FAA-108-01.pdf", type: "application/pdf", url: "", cat: "Artwork proof", stencilSku: "SSS-FAA-108-01", byId: "t1", who: "TO", at: now, size: 40960 },
    // a corrected preview replaces the catalog PNG on the list, in the stencil window, and on the quote
    f5: { name: "SSS-FAA-108-01.png", type: "image/png", url: "https://raw.githubusercontent.com/StreetSignSupply/ssc-crm/main/public/pics/stencils/SSS-ALP-024-05.png", cat: "Photo", stencilSku: "SSS-FAA-108-01", byId: "t1", who: "TO", at: now + 1, size: 12000 },
    // newer than the shipped cut files, so this DXF replaces the catalog one; the PDF does not
    f6: { name: "SSS-ALP-015-02.dxf", type: "application/dxf", url: "https://example.com/newer-cut.dxf", cat: "Cut file", stencilSku: "SSS-ALP-015-02", byId: "t1", who: "TO", at: now + 10 * day, size: 100 },
    f2: { name: "Quote-Q-1001.pdf", type: "application/pdf", url: "", cat: "Quote", gen: "quote", qhash: "old", projectId: "p1", accountId: "a1", byId: "t2", who: "Test Sales", at: now } },
  activity: { x3: { id: "x3", recType: "account", recId: "a1", kind: "email", type: "email", subject: "Quote for the signs", text: "Hi Pat, here is the quote.", to: "pat@example.com", at: now - 3 * 3600e3 },
    x4: { id: "x4", recType: "account", recId: "a1", kind: "email", type: "email", subject: "RE: Quote for the signs", text: "Hi Pat, here is the quote.", to: "pat@example.com", gmailId: "g1", at: now - 3 * 3600e3 + 120e3 },
    x1: { id: "x1", recType: "account", recId: "a1", kind: "note", type: "call", text: "Called about the bid", contactId: "c1", at: now - day, when: new Date(now - day).toISOString().slice(0, 10) },
    x2: { id: "x2", recType: "account", recId: "a1", kind: "task", type: "task", text: "Call back about the bid", assigneeId: "t1", whoId: "t1", who: "TO", at: now,
      due: new Date(now + 2 * day).toISOString().slice(0, 10), dueTime: "14:30", done: false } },
  events: {}, history: {}, invtx: {}, notifications: {}, reminders: {}, access: { "u1": { role: "owner", teamId: "t1" }, "owner@example.com": { role: "owner", teamId: "t1" } } };
const ROUTES = ["home", "mybook", "accounts", "account/a1", "contacts", "contact/c1", "projects", "project/p1", "project/p2", "jobs", "job/1001", "tracker", "calendar",
  "files", "purchasing", "inventory", "item/i1", "stencils", "vendors", "vendor/v1", "reports", "audit", "archive", "bin", "settings", "new"];
const browser = await chromium.launch(); const pg = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errs = [];
pg.on("pageerror", (e) => errs.push(String(e.message || e).slice(0, 160)));
await pg.addInitScript((D) => { const db = { collection(c) { return { onSnapshot(cb) { const docs = Object.entries(D[c] || {}).map(([id, d]) => ({ id, data: () => d })); setTimeout(() => cb({ docs, size: docs.length, forEach: (f) => docs.forEach(f) }), 10); return () => {}; } }; },
    doc(p) { return { path: p, async get() { return { exists: false, data: () => null }; }, set() { return Promise.resolve(); }, update() { return Promise.resolve(); }, delete() { return Promise.resolve(); }, onSnapshot(cb) { setTimeout(() => cb({ exists: false, data: () => null }), 10); return () => {}; }, async acquire() { return { acquired: true }; } }; },
    nextCounter: async () => 1 };
  window.__ups = [];
  const assets = { async upload(f) { window.__ups.push(f.name); return { id: "as" + window.__ups.length, url: "https://example.com/" + encodeURIComponent(f.name), sizeBytes: f.size, contentType: f.type }; } };
  const caps = { db, assets, user: { async me() { return { id: "u1", name: "Test Owner", email: "owner@example.com" }; } } };
  window.__mock = { use: async (n) => { if (!(n in caps)) throw Object.assign(new Error("x"), { code: "not_declared" }); return caps[n]; } }; }, D);
await pg.route(/firebase-adapter\.js$/, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
await pg.route(/raw\.githubusercontent\.com\/StreetSignSupply\/ssc-crm\/main\/public\/([^?]*)/, (r) => { const f = path.resolve(root, "public", decodeURIComponent(r.request().url().match(/main\/public\/([^?]*)/)[1]));
  if (fs.existsSync(f)) r.fulfill({ status: 200, contentType: f.endsWith(".png") ? "image/png" : f.endsWith(".pdf") ? "application/pdf" : f.endsWith(".dxf") ? "application/dxf" : f.endsWith(".zip") ? "application/zip" : f.endsWith(".json") ? "application/json" : "text/plain", body: fs.readFileSync(f) }); else r.fulfill({ status: 404, body: "" }); });
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
  const el = await pg.$(sel); if (el) { await el.click().catch(() => {}); await pg.waitForTimeout(400); if (!(await pg.$(".modal"))) bad.push(r + " " + sel + ": form didn't open"); await pg.keyboard.press("Escape"); await pg.waitForTimeout(300); }
  if (errs.length > before) bad.push(r + " " + sel + ": " + errs.slice(before).join(" | ")); }
await pg.waitForTimeout(300);
// list filters must actually filter (a release once dropped the Accounts filter handler and nothing reacted)
const rows = () => pg.evaluate(() => document.querySelectorAll(".main section.wide tbody tr").length);
const filt = [["accounts", "select[data-acfilt=type]", "Contractor"], ["accounts", "select[data-acfilt=rep]", "t1"], ["inventory", "select[data-invfilt=cat]", "Substrate"]];
for (const [r, sel, v] of filt) { await pg.evaluate((r) => { location.hash = "#/" + r; }, r); await pg.waitForTimeout(400); const n0 = await rows();
  if (!(await pg.$(sel))) { const why = await pg.evaluate(() => location.hash + " | modal:" + !!document.querySelector(".modal") + " | state:" + JSON.stringify(history.state) + " | " + ((document.querySelector(".main") || {}).innerText || "").replace(/\s+/g, " ").slice(0, 160) + " | selects:" + [...document.querySelectorAll(".main select")].map((x) => Object.keys(x.dataset).join("/")).join(",")); bad.push(r + " " + sel + ": filter missing (" + why + ")"); continue; }
  await pg.selectOption(sel, v); await pg.waitForTimeout(400); const n1 = await rows(); if (!(n1 < n0)) bad.push(r + " " + sel + ": filter didn't change the list (" + n0 + " → " + n1 + ")");
  await pg.selectOption(sel, ""); await pg.waitForTimeout(300); }
for (const [r, sel] of [["contacts", "[data-ctfilt=noemail]"], ["inventory", "button[data-invfilt=stock][data-v=zero]"]]) { await pg.evaluate((r) => { location.hash = "#/" + r; }, r); await pg.waitForTimeout(400);
  const n0 = await rows(); const el = await pg.$(sel); if (!el) { bad.push(r + " " + sel + ": filter missing"); continue; } await el.click(); await pg.waitForTimeout(300);
  const n1 = await rows(); if (!(await pg.$(sel + ".p")) || !(n1 < n0)) bad.push(r + " " + sel + ": filter didn't change the list (" + n0 + " → " + n1 + ")"); }
// no two elements share an id on any page (it breaks labels and drawings), and every box/dropdown has a name
for (const r of ROUTES) { await pg.evaluate((r) => { location.hash = "#/" + r; }, r); await pg.waitForTimeout(r === "stencils" ? 1500 : 300);
  const a = await pg.evaluate(() => { const ids = {}; document.querySelectorAll("[id]").forEach((e) => { ids[e.id] = (ids[e.id] || 0) + 1; });
    const unnamed = [...document.querySelectorAll(".main input:not([type=hidden]):not([type=checkbox]):not([type=radio]), .main select, .main textarea")].filter((e) => e.offsetParent && !e.getAttribute("aria-label") && !e.closest("label") && !(e.id && document.querySelector('label[for="' + e.id + '"]'))).length;
    return { dup: Object.keys(ids).filter((k) => ids[k] > 1), unnamed }; });
  if (a.dup.length) bad.push(r + ": duplicate ids " + a.dup.slice(0, 3).join(", ")); if (a.unnamed) bad.push(r + ": " + a.unnamed + " unnamed field(s)"); }
// text must be readable in light and dark mode (WCAG AA contrast), and anything clickable must be reachable with the keyboard
const contrastBad = () => { const parse = (c) => { const k = c.match(/color\(srgb ([^)]+)\)/); if (k) { const p = k[1].split(/[ \/]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] === undefined ? 1 : p[3]]; } const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const bgOf = (e) => { const layers = []; for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); let c = parse(cs.backgroundColor);
      // a gradient background counts as its first colour (dark headers are drawn that way)
      if ((!c || c[3] === 0) && /gradient/.test(cs.backgroundImage)) { const g = cs.backgroundImage.match(/rgba?\([^)]+\)|color\(srgb[^)]+\)/); if (g) c = parse(g[0]); }
      if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } }
    let base = [255, 255, 255]; if (!layers.length || layers[layers.length - 1][3] < 1) { const b = parse(getComputedStyle(document.body).backgroundColor); if (b) base = b.slice(0, 3); }
    for (let i = layers.length - 1; i >= 0; i--) { const c = layers[i]; base = [0, 1, 2].map((k) => c[k] * c[3] + base[k] * (1 - c[3])); } return base; };
  const out = [];
  document.querySelectorAll(".main *, .rail *, .gbar *").forEach((e) => { const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim(); if (!t) return;
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (!r.width || cs.visibility === "hidden") return; if (e.closest("[disabled], .dim, .disabled")) return;
    let op = 1; for (let n = e; n && n.nodeType === 1; n = n.parentElement) op *= +getComputedStyle(n).opacity; if (!op) return;
    const fg = parse(cs.color); if (!fg) return; const bg = bgOf(e); const a = fg[3] * op; const f2 = [0, 1, 2].map((k) => fg[k] * a + bg[k] * (1 - a));
    const L1 = lum(f2), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.6 && +cs.fontWeight >= 700);
    if (ratio < (big ? 3 : 4.5)) out.push('"' + t.slice(0, 20) + '" ' + ratio.toFixed(1)); });
  return [...new Set(out)]; };
const kbdBad = () => [...document.querySelectorAll(".main *")].filter((e) => { if (getComputedStyle(e).cursor !== "pointer" || !e.getBoundingClientRect().width) return false;
  if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA|LABEL|SUMMARY|OPTION)$/.test(e.tagName) || e.hasAttribute("tabindex") || e.getAttribute("role")) return false;
  if (e.closest("button, a, label, summary, [tabindex], [role=button]") !== e && e.closest("button, a, label, summary, [tabindex], [role=button]")) return false;
  if (e.matches("h2[data-cz], tr.rowgo") || (e.parentElement && getComputedStyle(e.parentElement).cursor === "pointer")) return false; return true; })
  .map((e) => e.tagName.toLowerCase() + "." + String(e.className).split(" ")[0]);
for (const theme of ["light", "dark"]) { await pg.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
  for (const r of ROUTES) { await pg.evaluate((r) => { location.hash = "#/" + r; }, r); await pg.waitForTimeout(r === "stencils" ? 1500 : 300);
    const c = await pg.evaluate(contrastBad); if (c.length) bad.push(r + " (" + theme + "): hard-to-read text " + c.slice(0, 3).join(", "));
    if (theme === "light") { const k = await pg.evaluate(kbdBad); if (k.length) bad.push(r + ": clickable but not reachable by keyboard " + [...new Set(k)].slice(0, 3).join(", ")); } } }
await pg.evaluate(() => document.documentElement.removeAttribute("data-theme"));
// a window that opens is a dialog, has the cursor inside it, and Tab doesn't escape it
for (const [r, sel] of [["account/a1", "[data-negadd]"], ["accounts", "[data-new='account']"], ["project/p1", "[data-ordadd]"]]) {
  await pg.evaluate((r) => { location.hash = "#/" + r; }, r); await pg.waitForTimeout(400); const el = await pg.$(sel); if (!el) { bad.push(r + " " + sel + ": button missing"); continue; }
  await el.click(); await pg.waitForTimeout(400);
  const m = await pg.evaluate(() => { const d = document.querySelector(".modal"); return d ? { role: d.getAttribute("role"), inside: d.contains(document.activeElement) } : null; });
  if (!m) { bad.push(r + " " + sel + ": window didn't open"); continue; }
  let left = false; for (let i = 0; i < 30; i++) { await pg.keyboard.press("Tab"); if (!(await pg.evaluate(() => !!(document.activeElement && document.activeElement.closest(".modal"))))) left = true; }
  if (m.role !== "dialog" || !m.inside || left) bad.push(r + " " + sel + ": window " + (m.role !== "dialog" ? "isn't marked as a dialog " : "") + (!m.inside ? "doesn't put the cursor inside " : "") + (left ? "lets Tab escape" : ""));
  await pg.evaluate(() => { const x = document.querySelector(".modal .mx"); if (x) x.click(); }); await pg.waitForTimeout(350); }
// tablets: no page wider than the screen at 820px either
await pg.setViewportSize({ width: 820, height: 1180 });
for (const r of ROUTES) { await pg.evaluate((r) => { location.hash = "#/" + r; }, r); await pg.waitForTimeout(r === "stencils" ? 1500 : 300);
  if (await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)) bad.push(r + ": wider than a tablet screen");
  if (r === "project/p1" && await pg.evaluate(() => { const d = document.querySelector(".path > details"); return !!d && d.getBoundingClientRect().right > innerWidth; })) bad.push("project stage bar runs off a tablet screen"); }
// on a phone, no page may be wider than the screen (layout check)
await pg.setViewportSize({ width: 390, height: 844 });
for (const r of ROUTES) { await pg.evaluate((r) => { location.hash = "#/" + r; }, r); await pg.waitForTimeout(r === "stencils" ? 1500 : 350);
  if (await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)) bad.push(r + ": wider than a phone screen"); }
// phone: windows have thumb-sized controls (the ×, boxes, dropdowns, buttons)
for (const [r, sel] of [["accounts", "[data-new='account']"], ["project/p1", "[data-ordadd]"], ["purchasing", "[data-ponew]"]]) {
  await pg.evaluate((r) => { location.hash = "#/" + r; }, r); await pg.waitForTimeout(400);
  if (!(await pg.evaluate((sel) => { const b = document.querySelector(sel); if (!b) return false; b.click(); return true; }, sel))) { bad.push(r + " " + sel + ": button missing on a phone"); continue; } await pg.waitForTimeout(400);
  const t = await pg.evaluate(() => { const d = document.querySelector(".modal .mbox"); if (!d) return null; return [...d.querySelectorAll("button, input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select")].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.height && b.height < 32; }).map((e) => (e.getAttribute("aria-label") || e.innerText || e.placeholder || e.tagName).trim().slice(0, 20)); });
  if (!t) bad.push(r + " " + sel + ": window didn't open on a phone"); else if (t.length) bad.push(r + " window on a phone: too small to tap — " + t.slice(0, 3).join(", "));
  await pg.evaluate(() => { const x = document.querySelector(".modal .mx"); if (x) x.click(); }); await pg.waitForTimeout(350); }
// phone with Safari's bars showing (390×664): windows keep their title (with the ×) and their buttons on screen, nothing in
// them only reachable by scrolling sideways, and Back closes the window without leaving the page
{ const css = await pg.evaluate(() => [...document.styleSheets].map((sh) => { try { return [...sh.cssRules].map((r) => r.cssText).join("\n"); } catch (e) { return ""; } }).join("\n"));
  if (!/\.mbox\s*\{[^}]*max-height:\s*90dvh/.test(css)) bad.push("windows aren't sized to the part of an iPhone screen you can see (dvh)");
  await pg.setViewportSize({ width: 390, height: 664 });
  const wins = [["stencils", "[data-stcview]"], ["accounts", "[data-new='account']"], ["project/p1", "[data-ordadd]"], ["purchasing", "[data-ponew]"], ["job/1001", "[data-edit^='job:']"], ["item/i1", "[data-edit^='item:']"]];
  for (const [r, sel] of wins) { await pg.evaluate((r) => { location.hash = "#/" + r; }, r); await pg.waitForTimeout(r === "stencils" ? 1500 : 400);
    if (!(await pg.evaluate((sel) => { const b = document.querySelector(sel); if (!b) return false; b.click(); return true; }, sel))) continue; await pg.waitForTimeout(400);
    const m = await pg.evaluate(() => { const d = document.querySelector(".modal .mbox"); if (!d) return null; const h = d.querySelector("h2").getBoundingClientRect(); const f = d.querySelector(".foot"); const fr = f && f.getBoundingClientRect();
      const side = [...d.querySelectorAll("*")].filter((e) => e.clientWidth > 0 && /auto|scroll/.test(getComputedStyle(e).overflowX) && e.scrollWidth > e.clientWidth + 4).map((e) => ((e.querySelector("th") || e.querySelector("b") || {}).textContent || e.className || e.tagName).trim().slice(0, 20));
      return { title: d.querySelector("h2").innerText.trim().slice(0, 40), head: h.top >= 0, foot: !fr || fr.bottom <= innerHeight + 1, side }; });
    if (!m) { bad.push(r + " " + sel + ": window didn't open on a phone"); continue; }
    if (!m.head || !m.foot) bad.push("phone: \"" + m.title + "\" window's " + (!m.head ? "title/×" : "buttons") + " off screen");
    if (m.side.length) bad.push("phone: \"" + m.title + "\" window has a part you have to scroll sideways (" + m.side.slice(0, 2).join(", ") + ")");
    const h0 = await pg.evaluate(() => location.hash); await pg.goBack(); await pg.waitForTimeout(400);
    const st = await pg.evaluate(() => ({ open: !!document.querySelector(".modal"), hash: location.hash }));
    if (st.open || st.hash !== h0) { bad.push("phone: Back didn't just close the \"" + m.title + "\" window (" + (st.open ? "still open" : "left the page") + ")"); await pg.evaluate(() => { const x = document.querySelector(".modal .mx"); if (x) x.click(); }); await pg.evaluate((h) => { location.hash = h; }, h0); } }
  await pg.setViewportSize({ width: 390, height: 844 }); }
// phone (light mode): readable text too — phone-only styles can change colours
for (const r of ROUTES) { await pg.evaluate((r) => { location.hash = "#/" + r; }, r); await pg.waitForTimeout(r === "stencils" ? 1500 : 300);
  const c = await pg.evaluate(contrastBad); if (c.length) bad.push(r + " (phone): hard-to-read text " + c.slice(0, 3).join(", "));
  // nothing on a phone page hides off to the side (amounts, tabs, filter buttons) — open every section first
  await pg.evaluate(() => document.querySelectorAll(".main .card.collapsed button.cz").forEach((b) => b.click())); await pg.waitForTimeout(150);
  const sd = await pg.evaluate(() => [...document.querySelectorAll(".main *")].filter((e) => e.clientWidth > 0 && /auto|scroll/.test(getComputedStyle(e).overflowX) && e.scrollWidth > e.clientWidth + 4).map((e) => String(e.className).split(" ")[0] || e.tagName));
  if (sd.length) bad.push(r + " (phone): part of the page only reachable by scrolling sideways (" + sd.slice(0, 2).join(", ") + ")"); }
// phone: quote lines read as cards (nothing cut off), and a file opened full screen has a big Close and closes with Back
{ await pg.evaluate(() => { location.hash = "#/project/p1"; }); await pg.waitForTimeout(500);
  const q = await pg.evaluate(() => { const t = document.querySelector("table.qlines"); if (!t) return "no quote lines"; const c = t.closest(".card"); if (c && c.classList.contains("collapsed")) { const b = c.querySelector("button.cz"); if (b) b.click(); } return ""; });
  if (q) bad.push(q); await pg.waitForTimeout(300);
  const ql = await pg.evaluate(() => [...document.querySelectorAll("table.qlines td")].filter((td) => td.offsetParent && (td.scrollWidth > td.clientWidth + 2 || td.getBoundingClientRect().right > innerWidth + 1)).map((td) => td.getAttribute("data-label") || "item").slice(0, 3));
  if (ql.length) bad.push("phone quote lines: cut off in " + ql.join(", "));
  await pg.evaluate(() => { const b = document.createElement("button"); b.setAttribute("data-view", "f1"); document.querySelector(".main").appendChild(b); b.click(); }); await pg.waitForTimeout(400);
  const v = await pg.evaluate(() => { const c = document.querySelector("#viewer [data-closeview]"); if (!c) return null; const r = c.getBoundingClientRect(); return { h: r.height, on: r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, hit: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === c }; });
  if (!v) bad.push("phone: the file viewer didn't open"); else { if (v.h < 44 || !v.on || !v.hit) bad.push("phone: the file viewer's Close isn't a big, visible button");
    const h0 = await pg.evaluate(() => location.hash); await pg.goBack(); await pg.waitForTimeout(400);
    const st = await pg.evaluate(() => ({ open: !!document.getElementById("viewer"), hash: location.hash }));
    if (st.open || st.hash !== h0) bad.push("phone: Back didn't just close the file viewer (" + (st.open ? "still open" : "left the page") + ")"); } }
await pg.setViewportSize({ width: 1400, height: 900 });
// an account that is really a vendor is offered as one; marked Vendor it shows the Vendor stage, not Lead
{ await pg.evaluate(() => { location.hash = "#/accounts"; }); await pg.waitForTimeout(500);
  const vb = await pg.evaluate(() => { const b = document.querySelector("[data-vaccopen]"); return b ? b.closest(".alert").innerText : ""; });
  if (!/1 account looks like a vendor/.test(vb)) bad.push("an account named like a vendor isn't offered as a vendor (" + vb.slice(0, 60) + ")");
  // each look-alike can be marked Vendor or Not a vendor (then it's never asked about again)
  { const ok = await pg.evaluate(() => { const b = document.querySelector("[data-vaccopen]"); if (!b) return false; b.click(); return true; }); await pg.waitForTimeout(400);
    if (!ok) bad.push("the vendor look-alike notice has no button to sort them out");
    else { const m = await pg.evaluate(() => ({ no: document.querySelectorAll('[data-vacc][value="no"]').length, none: !!document.getElementById("vacc-none") }));
      if (!m.no || !m.none) bad.push("an account that looks like a vendor can't be marked Not a vendor");
      await pg.evaluate(() => { document.querySelector('[data-vacc][value="no"]').click(); document.getElementById("vacc-go").click(); }); await pg.waitForTimeout(500);
      const tst = await pg.evaluate(() => [...document.querySelectorAll(".toast,[class*=toast]")].map((x) => x.innerText).join(" "));
      if (!/not a vendor/.test(tst)) bad.push("Not a vendor didn't save (" + tst.slice(0, 60) + ")"); } }
  const st = await pg.evaluate(() => { const T = window.__T; if (!T || !T.acctStage) return "no hook"; return T.acctStage({ name: "X", type: "Vendor" }); });
  if (st !== "no hook" && st !== "vendor") bad.push("a Vendor account doesn't show the Vendor stage (" + st + ")");
  // What's new lists the account added today
  await pg.evaluate(() => { location.hash = "#/new"; }); await pg.waitForTimeout(500);
  const wn = await pg.evaluate(() => (document.querySelector(".main") || {}).innerText || "");
  if (!/New accounts/.test(wn) || !/Test Plastics Inc/.test(wn)) bad.push("What's new doesn't list an account added today"); }
// stencil files: the stencil shows its DXF and PDF to open or download; bulk upload sends each file to its SKU and lists the rest
{ await pg.evaluate(() => { location.hash = "#/stencils"; }); await pg.waitForTimeout(1500);
  const row = await pg.evaluate(() => { const b = document.querySelector('[data-stcview="SSS-FAA-108-01"]'); const tr = b && b.closest("tr"); return tr ? tr.innerText : ""; });
  if (!/DXF \+ PDF on file/.test(row)) bad.push("the stencil list doesn't show which stencils have a cut file (" + row.slice(0, 80) + ")");
  await pg.evaluate(() => document.querySelector('[data-stcview="SSS-FAA-108-01"]').click()); await pg.waitForTimeout(500);
  const fx = await pg.evaluate(() => { const b = document.getElementById("stc-files"); if (!b) return null; return { t: b.innerText, dl: b.querySelectorAll("[data-dl]").length, up: !!b.querySelector("[data-stcup]"), open: b.querySelectorAll("[data-view]").length }; });
  if (!fx) bad.push("a stencil's window has no Files area");
  else { if (!/SSS-FAA-108-01\.dxf/.test(fx.t) || !/SSS-FAA-108-01\.pdf/.test(fx.t)) bad.push("a stencil's window doesn't list its DXF and PDF");
    if (fx.dl < 2 || fx.open < 1 || !fx.up) bad.push("a stencil's files can't be opened, downloaded or uploaded (" + JSON.stringify(fx) + ")"); }
  await pg.evaluate(() => { const b = document.querySelector(".mbox [data-close]"); if (b) b.click(); }); await pg.waitForTimeout(350);
  await pg.evaluate(() => document.querySelector("[data-stcbulk]").click()); await pg.waitForTimeout(400);
  await pg.setInputFiles("#stc-bf", [{ name: "SSS-FAA-120-01.dxf", mimeType: "application/dxf", buffer: Buffer.from("0\nSECTION\n") }, { name: "NOT-A-SKU.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") }, { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") }]);
  await pg.waitForTimeout(300);
  const bm = await pg.evaluate(() => ({ t: (document.getElementById("stc-bres") || {}).innerText || "", b: (document.getElementById("stc-bgo") || {}).textContent || "" }));
  if (!/1 matched a stencil/.test(bm.t) || !/1 matched no SKU/.test(bm.t) || !/NOT-A-SKU\.pdf/.test(bm.t) || !/not a DXF or PDF/.test(bm.t)) bad.push("bulk stencil upload doesn't sort files by SKU and list the ones that matched none (" + bm.t.slice(0, 80) + ")");
  if (!/Upload 1 file/.test(bm.b)) bad.push("bulk stencil upload offers the wrong count (" + bm.b + ")");
  await pg.evaluate(() => document.getElementById("stc-bgo").click()); await pg.waitForTimeout(800);
  const done = await pg.evaluate(() => ({ t: (document.getElementById("stc-bres") || {}).innerText || "", ups: window.__ups.slice() }));
  if (!/1 file uploaded/.test(done.t) || done.ups.length !== 1 || done.ups[0] !== "SSS-FAA-120-01.dxf") bad.push("bulk stencil upload didn't upload just the matched file (" + done.t.slice(0, 60) + " / " + done.ups.join(",") + ")");
  await pg.evaluate(() => { const b = document.querySelector(".mbox [data-close]"); if (b) b.click(); }); await pg.waitForTimeout(350);
  // shipped cut files: both kinds download from the repo, and a newer upload replaces only its kind
  await pg.fill("#lq", "SSS-BRD-018-02"); await pg.waitForTimeout(500);
  await pg.evaluate(() => document.querySelector('[data-stcview="SSS-BRD-018-02"]').click()); await pg.waitForTimeout(500);
  const cut = await pg.evaluate(async () => {
    const b = document.getElementById("stc-files"); if (!b) return null;
    const ids = [...b.querySelectorAll("[data-dl]")].map((x) => x.getAttribute("data-dl"));
    const pdf = ids.find((id) => id === "cut:SSS-BRD-018-02:pdf");
    let ok = false;
    if (pdf) { const r = await fetch("https://raw.githubusercontent.com/StreetSignSupply/ssc-crm/main/public/cut/SSS-BRD-018-02.dxf"); ok = r.ok && (await r.text()).indexOf("SECTION") >= 0; }
    return { t: b.innerText, ids, ok, del: !!b.querySelector("[data-stcdelfile^='cut:']") };
  });
  if (!cut) bad.push("a shipped cut file's stencil has no Files area");
  else { if (!/SSS-BRD-018-02\.dxf/.test(cut.t) || !/SSS-BRD-018-02\.pdf/.test(cut.t)) bad.push("the shipped DXF and PDF are not on the stencil (" + cut.t.slice(0, 80) + ")");
    if (cut.ids.indexOf("cut:SSS-BRD-018-02:dxf") < 0 || cut.ids.indexOf("cut:SSS-BRD-018-02:pdf") < 0 || !cut.ok) bad.push("the shipped cut file isn't the one offered (" + cut.ids.join(",") + ")");
    if (cut.del) bad.push("a shipped cut file offers delete"); }
  await pg.evaluate(() => { const b = document.querySelector(".mbox [data-close]"); if (b) b.click(); }); await pg.waitForTimeout(350);
  await pg.fill("#lq", "SSS-ALP-015-02"); await pg.waitForTimeout(500);
  await pg.evaluate(() => document.querySelector('[data-stcview="SSS-ALP-015-02"]').click()); await pg.waitForTimeout(500);
  const repl = await pg.evaluate(() => { const b = document.getElementById("stc-files"); const ids = b ? [...b.querySelectorAll("[data-dl]")].map((x) => x.getAttribute("data-dl")) : []; return ids; });
  if (repl.indexOf("f6") < 0 || repl.indexOf("cut:SSS-ALP-015-02:dxf") >= 0 || repl.indexOf("cut:SSS-ALP-015-02:pdf") < 0) bad.push("a newer DXF didn't replace just the shipped DXF (" + repl.join(",") + ")");
  await pg.evaluate(() => { const b = document.querySelector(".mbox [data-close]"); if (b) b.click(); }); await pg.waitForTimeout(350);
  await pg.fill("#lq", ""); await pg.waitForTimeout(500);
  // an uploaded picture replaces the catalog PNG on the list and on the quote (print uses the same picture)
  const shown = await pg.evaluate(() => {
    const row = (sel) => { const b = document.querySelector(sel); const tr = b && b.closest("tr"); const img = tr && tr.querySelector("img"); return img ? img.getAttribute("src") : ""; };
    return { up: row('[data-stcview="SSS-FAA-108-01"]'), cat: row('[data-stcview="SSS-FAA-120-01"]') };
  });
  if (!/SSS-ALP-024-05\.png$/.test(shown.up)) bad.push("the stencil list still shows the catalog picture (" + shown.up.slice(0, 80) + ")");
  if (!/pics\/stencils\/SSS-FAA-120-01\.png/.test(shown.cat)) bad.push("a stencil with no upload lost its catalog picture (" + shown.cat.slice(0, 80) + ")");
  await pg.evaluate(() => { location.hash = "#/project/p1"; }); await pg.waitForTimeout(700);
  const qpic = await pg.evaluate(() => { const row = [...document.querySelectorAll("tr")].find((tr) => /SSS-FAA-108-01/.test(tr.innerText) && tr.querySelector("img")); const img = row && row.querySelector("img"); return img ? img.getAttribute("src") : ""; });
  if (!/SSS-ALP-024-05\.png$/.test(qpic)) bad.push("the quote doesn't show the uploaded stencil picture (" + qpic.slice(0, 80) + ")");
  await pg.evaluate(() => { location.hash = "#/stencils"; }); await pg.waitForTimeout(800);
  await pg.evaluate(() => document.querySelector('[data-stcview="SSS-FAA-108-01"]').click()); await pg.waitForTimeout(400);
  const one = await pg.evaluate(() => { const pic = document.getElementById("stc-pic"), inp = document.getElementById("stc-picf");
    return { src: pic && pic.querySelector("img") ? pic.querySelector("img").getAttribute("src") : "", up: !!(inp && /png/i.test(inp.accept || "")) }; });
  if (!/SSS-ALP-024-05\.png$/.test(one.src) || !one.up) bad.push("a stencil's window can't replace its picture (" + JSON.stringify(one) + ")");
  const before = await pg.evaluate(() => window.__ups.length);
  await pg.setInputFiles("#stc-picf", { name: "SSS-FAA-108-01.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
  await pg.waitForTimeout(1500);
  const single = await pg.evaluate(() => { const pic = document.getElementById("stc-pic"); const img = pic && pic.querySelector("img");
    return { ups: window.__ups.slice(), src: img ? img.getAttribute("src") : "" }; });
  if (single.ups.length !== before + 1 || single.ups[single.ups.length - 1] !== "SSS-FAA-108-01.jpg" || !/SSS-FAA-108-01\.jpg/.test(single.src)) bad.push("replacing one stencil picture didn't upload it (" + single.ups.join(",") + " / " + single.src + ")");
  await pg.evaluate(() => { const b = document.querySelector(".mbox [data-close]"); if (b) b.click(); }); await pg.waitForTimeout(350);
  // bulk pictures: SSS- optional, unmatched names reported, and more than one batch (40) all upload
  const pix = Buffer.from([137, 80, 78, 71]);
  const bulkPics = JSON.parse(fs.readFileSync(path.resolve(root, "public/stencil-catalog.json"), "utf8")).items.slice(0, 41)
    .map((s) => ({ name: String(s.sku).replace(/^SSS-/i, "") + ".png", mimeType: "image/png", buffer: pix }));
  bulkPics.push({ name: "NOT-A-SKU.png", mimeType: "image/png", buffer: pix }, { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
  await pg.evaluate(() => document.querySelector("[data-stcpicbulk]").click()); await pg.waitForTimeout(400);
  await pg.setInputFiles("#stc-pf", bulkPics);
  await pg.waitForTimeout(400);
  const pm = await pg.evaluate(() => ({ t: (document.getElementById("stc-pres") || {}).innerText || "", b: (document.getElementById("stc-pgo") || {}).textContent || "" }));
  if (!/41 matched/.test(pm.t) || !/1 replaced/.test(pm.t) || !/1 unmatched/.test(pm.t) || !/NOT-A-SKU\.png/.test(pm.t) || !/not a PNG, JPG or WebP/.test(pm.t)) bad.push("bulk picture upload doesn't report matched, replaced and unmatched (" + pm.t.slice(0, 180) + ")");
  if (!/Upload 41 pictures/.test(pm.b)) bad.push("bulk picture upload offers the wrong count (" + pm.b + ")");
  const ups0 = await pg.evaluate(() => window.__ups.length);
  await pg.evaluate(() => document.getElementById("stc-pgo").click()); await pg.waitForTimeout(4000);
  const pd = await pg.evaluate(() => ({ t: (document.getElementById("stc-pres") || {}).innerText || "", ups: window.__ups.length }));
  if (!/41 matched and uploaded/.test(pd.t) || !/replaced/.test(pd.t) || !/1 unmatched/.test(pd.t) || pd.ups - ups0 !== 41) bad.push("bulk picture upload didn't upload the matched pictures in batches (" + pd.t.slice(0, 100) + " / " + (pd.ups - ups0) + ")");
  await pg.evaluate(() => { const b = document.querySelector(".mbox [data-close]"); if (b) b.click(); }); await pg.waitForTimeout(350); }
// a new account: an old deleted copy in the recycle bin doesn't stop the save; a live look-alike asks once, and
// "Create it anyway" saves it without sending you back to the form
{ await pg.evaluate(() => { location.hash = "#/accounts"; }); await pg.waitForTimeout(400);
  const tryNew = async (name) => { await pg.evaluate(() => document.querySelector("[data-new='account']").click()); await pg.waitForTimeout(300);
    await pg.fill("#f-name", name); await pg.evaluate(() => document.getElementById("save").click()); await pg.waitForTimeout(400);
    return pg.evaluate(() => { const m = document.querySelector(".mbox"); return m ? m.innerText : ""; }); };
  const m1 = await tryNew("Gone Sign Co");
  if (/recycle bin|archiv/i.test(m1) || /may already/i.test(m1)) bad.push("a new account is stopped by an old deleted copy in the recycle bin");
  if (/f-name/.test(await pg.evaluate(() => document.getElementById("f-name") ? "f-name" : ""))) bad.push("a new account didn't save (form still open)");
  await pg.evaluate(() => { location.hash = "#/accounts"; }); await pg.waitForTimeout(400);
  const m2 = await tryNew("Test County");
  if (!/Possible duplicate/.test(m2) || !/same name/.test(m2)) bad.push("a new account with the same name as a live one doesn't warn it's a possible duplicate");
  else { const v = await pg.evaluate(() => { const b = document.querySelector("#dupwarn [data-dupv]"); b.click(); const d = document.getElementById("dupd-" + b.dataset.dupv); return d && !d.hidden ? d.innerText : ""; });
    if (!/Address|Phone|Contacts/.test(v)) bad.push("the duplicate warning's View doesn't show the other account's details");
    if (!(await pg.evaluate(() => !!document.getElementById("f-name")))) bad.push("the duplicate warning closed the form");
    await pg.evaluate(() => document.getElementById("dupgo").click()); await pg.waitForTimeout(500);
    const still = await pg.evaluate(() => !!document.getElementById("f-name"));
    if (still) bad.push("'Continue — save it anyway' doesn't save the account"); }
  // a new contact with the same email as one already in the CRM gets the same warning
  await pg.evaluate(() => { location.hash = "#/contacts"; }); await pg.waitForTimeout(400);
  const nc = await pg.evaluate(() => { const b = document.querySelector("[data-new='contact']"); if (!b) return false; b.click(); return true; }); await pg.waitForTimeout(300);
  if (nc) { await pg.fill("#f-name", "Patricia Example"); await pg.fill("#f-email", "pat@example.com");
    await pg.evaluate(() => { const s = document.getElementById("f-acct"); const o = [...s.options].find((x) => x.value === "a1"); if (o) s.value = "a1"; document.getElementById("save").click(); }); await pg.waitForTimeout(400);
    const w = await pg.evaluate(() => (document.getElementById("dupwarn") || {}).innerText || "");
    if (!/Possible duplicate/.test(w) || !/same email/.test(w) || !/Pat Example/.test(w)) bad.push("a new contact with an email already in the CRM doesn't warn (" + w.slice(0, 60) + ")");
    else { await pg.evaluate(() => document.getElementById("dupgo").click()); await pg.waitForTimeout(500);
      if (await pg.evaluate(() => !!document.getElementById("f-name"))) bad.push("'Continue — save it anyway' doesn't save the contact"); } }
  else bad.push("the Contacts page has no New contact button");
  await pg.evaluate(() => { const b = document.querySelector(".mbox [data-close]"); if (b) b.click(); }); await pg.waitForTimeout(350); }
// the recycle bin searches and filters by type, so an old deleted account can be found among thousands
{ await pg.evaluate(() => { location.hash = "#/bin"; }); await pg.waitForTimeout(500);
  await pg.fill("#lq", "gone sign"); await pg.waitForTimeout(500);
  const b = await pg.evaluate(() => ({ t: (document.querySelector(".main") || {}).innerText || "", chips: document.querySelectorAll("[data-bint]").length }));
  if (!/Gone Sign Co/.test(b.t) || /Recycle bin\s*\n?\s*0/.test(b.t)) bad.push("the recycle bin search doesn't find a deleted account");
  if (b.chips < 2) bad.push("the recycle bin has no type filter");
  // agent prospect leads are kept apart from the normal bin view (nothing deleted)
  { await pg.fill("#lq", ""); await pg.waitForTimeout(400);
    const v = await pg.evaluate(() => ({ t: (document.querySelector(".main") || {}).innerText || "", b: !!document.querySelector('[data-binleads="1"]') }));
    if (/Prospect Lead Town/.test(v.t) || !v.b) bad.push("agent prospect leads aren't kept apart in the recycle bin");
    await pg.evaluate(() => document.querySelector('[data-binleads="1"]').click()); await pg.waitForTimeout(400);
    const v2 = await pg.evaluate(() => (document.querySelector(".main") || {}).innerText || "");
    if (!/Prospect Lead Town/.test(v2) || /Gone Sign Co/.test(v2)) bad.push("the Agent prospect leads view doesn't show just those leads");
    await pg.evaluate(() => document.querySelector('[data-binleads="0"]').click()); await pg.waitForTimeout(400);
    await pg.fill("#lq", "gone sign"); await pg.waitForTimeout(400); }
  { const h = await pg.evaluate(() => { const x = document.querySelector('[data-binhist="account:a9"]'); if (!x) return ""; x.click(); return "ok"; }); await pg.waitForTimeout(400);
    const m = await pg.evaluate(() => (document.querySelector(".mbox") || {}).innerText || "");
    if (!h || !/Gone Sign Co — in the recycle bin/.test(m) || !/in the bin since/.test(m) || !/Restore it/.test(m) || !/Delete forever/.test(m)) bad.push("a deleted record can't be looked at from the recycle bin before keeping or deleting it");
    const nameLink = await pg.evaluate(() => !!document.querySelector('td button.lnk[data-binhist="account:a9"]'));
    if (!nameLink) bad.push("a record's name in the recycle bin isn't clickable");
    await pg.evaluate(() => { const c = document.querySelector(".mbox [data-close]"); if (c) c.click(); }); await pg.waitForTimeout(350); }
  // the owner can delete for good: one asks plainly, many need DELETE typed
  const k = await pg.evaluate(() => { const x = document.querySelector('[data-binkill="account:a9"]'); if (!x) return ""; x.click(); return "ok"; }); await pg.waitForTimeout(300);
  if (!k) bad.push("the recycle bin has no Delete forever for the owner");
  else { const m = await pg.evaluate(() => (document.querySelector(".mbox") || {}).innerText || "");
    if (!/can't be undone/.test(m)) bad.push("Delete forever doesn't warn it can't be undone");
    await pg.evaluate(() => document.getElementById("bingo").click()); await pg.waitForTimeout(600);
    const tst = await pg.evaluate(() => [...document.querySelectorAll(".toast,[class*=toast]")].map((x) => x.innerText).join(" "));
    if (!/1 deleted for good/.test(tst)) bad.push("Delete forever didn't delete (" + tst.slice(0, 60) + ")"); }
  await pg.fill("#lq", ""); await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector("[data-binpurge]").click()); await pg.waitForTimeout(300);
  await pg.evaluate(() => document.getElementById("bingo").click()); await pg.waitForTimeout(300);
  const still = await pg.evaluate(() => !!document.getElementById("binsure"));
  if (!still) bad.push("emptying the bin doesn't need DELETE typed first");
  await pg.evaluate(() => { const c = document.querySelector(".mbox [data-close]"); if (c) c.click(); }); await pg.waitForTimeout(350); }
// the Activity card: one bar — plain tabs to filter on the left, one "+ Add" menu on the right — and a message logged twice shows once
{ await pg.evaluate(() => { location.hash = "#/account/a1"; }); await pg.waitForTimeout(600);
  const ac = await pg.evaluate(() => { const c = document.querySelector(".actcard"); if (!c) return null;
    return { tabs: [...c.querySelectorAll(".segf [data-actf]")].map((b) => b.innerText.replace(/\s+/g, " ").trim()), add: c.querySelectorAll(".addm [data-log]").length, row4: c.querySelectorAll(".actrow4").length,
      emails: [...c.querySelectorAll("ul.act > li")].filter((li) => /here is the quote/.test(li.innerText)).length }; });
  if (!ac) bad.push("the account has no Activity card");
  else { if (ac.add !== 4) bad.push("the Activity card's + Add menu doesn't offer call, email, note and task");
    if (ac.row4) bad.push("the Activity card still has the old row of add buttons that look like the filters");
    if (!ac.tabs.some((t) => /^Emails 1$/.test(t))) bad.push("the Activity tabs don't count an email logged twice once (" + ac.tabs.join(", ") + ")");
    if (ac.emails !== 1) bad.push("an email logged twice shows twice in Activity"); }
  await pg.evaluate(() => { const b = document.querySelector('.actcard .segf [data-actf="email"]'); if (b) b.click(); }); await pg.waitForTimeout(400);
  const only = await pg.evaluate(() => [...document.querySelectorAll(".actcard ul.act > li")].length);
  if (only !== 1) bad.push("the Emails tab doesn't show only emails (" + only + ")"); }
// a separate billing address: on the account's Billing card, and the form shows its boxes only when ticked
{ await pg.evaluate(() => { location.hash = "#/account/a1"; }); await pg.waitForTimeout(600);
  const tx = await pg.evaluate(() => (document.querySelector(".main") || {}).innerText || "");
  if (!/PO Box 77/.test(tx)) bad.push("the account's billing address doesn't show on its page");
  if (!/Physical address/.test(tx) || !/1 Main St/.test(tx)) bad.push("the account page doesn't show the physical address beside a different billing address");
  await pg.evaluate(() => { const b = document.querySelector('[data-edit="account:a1"]'); if (b) b.click(); }); await pg.waitForTimeout(400);
  const f = await pg.evaluate(() => { const box = document.getElementById("f-billbox"), c = document.getElementById("f-billdiff"); if (!box || !c) return null;
    const on = box.offsetParent !== null && document.getElementById("f-bstreet").value === "PO Box 77"; c.click(); const off = box.offsetParent === null; return { on, off }; });
  if (!f) bad.push("the account form has no billing address option"); else if (!f.on || !f.off) bad.push("the account form's billing address boxes don't show and hide with the tick box");
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(350);
  await pg.evaluate(() => { const b = document.querySelector(".mbox [data-close]"); if (b) b.click(); }); await pg.waitForTimeout(350);
  // a task with a time shows it
  await pg.evaluate(() => { location.hash = "#/tasks"; }); await pg.waitForTimeout(500);
  const tk = await pg.evaluate(() => (document.querySelector(".main") || {}).innerText || "");
  if (!/at 2:30 PM/.test(tk)) bad.push("a task's time doesn't show on the Tasks page"); }
// a task made by mistake can be deleted from its ⋯ menu (to the recycle bin)
{ const ok = await pg.evaluate(() => { const b = document.querySelector('[data-actdel="x2"]'); if (!b) return "no delete"; b.click(); return "ok"; });
  if (ok !== "ok") bad.push("a task has no Delete in its menu"); else { await pg.waitForTimeout(300);
    // (the test database doesn't keep writes, so this checks the confirm step, then cancels)
    const m = await pg.evaluate(() => { const x = document.querySelector(".mbox"); const t = x ? x.innerText : ""; const c = x && x.querySelector("[data-close]"); if (c) c.click(); return t; });
    await pg.waitForTimeout(350);
    if (!/Delete this task\?/.test(m) || !/recycle bin/.test(m)) bad.push("deleting a task doesn't ask first (" + m.slice(0, 40) + ")"); } }
// a project made by mistake (nothing in it yet) offers to delete itself
{ await pg.evaluate(() => { location.hash = "#/project/p2"; }); await pg.waitForTimeout(600);
  const t = await pg.evaluate(() => (document.querySelector(".main") || {}).innerText || "");
  if (!/Made this project by mistake/.test(t)) bad.push("an empty new project doesn't offer to delete it");
  await pg.evaluate(() => { location.hash = "#/project/p1"; }); await pg.waitForTimeout(500);
  const t1 = await pg.evaluate(() => (document.querySelector(".main") || {}).innerText || "");
  if (/Made this project by mistake/.test(t1)) bad.push("a project with quote lines and a work order offers the made-by-mistake delete"); }
// the owner sees quotes the team made, to review before anything is sent
{ await pg.evaluate(() => { location.hash = "#/home"; }); await pg.waitForTimeout(500);
  const rb = await pg.evaluate(() => { const b = document.querySelector("[data-rvopen]"); return b ? b.closest(".alert").innerText : ""; });
  if (!/1 quote to review/.test(rb)) bad.push("a quote PDF a sales rep made doesn't show on the owner's review list (" + rb.slice(0, 60) + ")");
  else { await pg.evaluate(() => document.querySelector("[data-rvopen]").click()); await pg.waitForTimeout(400);
    const t = await pg.evaluate(() => (document.querySelector(".modal") || {}).innerText || "");
    if (!/Quotes to review/.test(t) || !/Test County/.test(t) || !/made by Test Sales/.test(t)) bad.push("the Quotes to review window doesn't list the rep's quote");
    // "Reviewed — not sending" takes it off the list without approving or emailing anyone
    if (!/Reviewed — not sending/.test(t)) bad.push("a reviewed quote can't be taken off the review list without sending it");
    else { await pg.evaluate(() => document.querySelector("[data-rvseen]").click()); await pg.waitForTimeout(400);
      const tst = await pg.evaluate(() => [...document.querySelectorAll(".toast,[class*=toast]")].map((x) => x.innerText).join(" "));
      if (!/Nothing was sent/.test(tst)) bad.push("'Reviewed — not sending' didn't take the quote off the list (" + tst.slice(0, 60) + ")"); }
    await pg.evaluate(() => { const x = document.querySelector(".modal .mx"); if (x) x.click(); }); await pg.waitForTimeout(350); } }
// the owner always has Settings
{ await pg.evaluate(() => { location.hash = "#/home"; }); await pg.waitForTimeout(400);
  if (!(await pg.$('a[href="#/settings"], [data-go="settings"]'))) bad.push("the owner (a team record with no level set) lost Settings in the menu");
  await pg.evaluate(() => { location.hash = "#/settings"; }); await pg.waitForTimeout(500);
  const txt = await pg.evaluate(() => (document.querySelector(".main") || {}).innerText || "");
  if (!/Order sync|Reminders|Our team|Team/i.test(txt) || /owner only|only the owner/i.test(txt.slice(0, 200))) bad.push("Settings didn't open for the owner"); }
const ver = await pg.evaluate(() => { const m = document.documentElement.innerHTML.match(/APP_VERSION="([^"]+)"/); return m ? m[1] : ""; });
await browser.close(); fs.unlinkSync(PAGE);
if (bad.length) { console.log("::error::release check failed: " + bad.slice(0, 8).join(" || ")); process.exit(1); }
console.log("::notice::release check passed: " + ROUTES.length + " pages (desktop, tablet and phone; light and dark), " + forms.length + " forms and " + (filt.length + 2) + " list filters, no errors");
