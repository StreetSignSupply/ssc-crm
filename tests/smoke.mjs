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
  accounts: { a1: { name: "Test County", city: "Town", state: "UT", type: "Government agency", terms: "Net 30", repId: "t1" }, a2: { name: "Test Contractor", type: "Contractor", terms: "Prepay" } },
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
  files: { f1: { name: "Proof.png", type: "image/png", url: "", cat: "Artwork proof", projectId: "p1", accountId: "a1", at: now } },
  activity: { x1: { id: "x1", recType: "account", recId: "a1", kind: "note", type: "call", text: "Called about the bid", contactId: "c1", at: now - day, when: new Date(now - day).toISOString().slice(0, 10) } },
  events: {}, history: {}, invtx: {}, notifications: {}, reminders: {}, access: { "u1": { role: "owner", teamId: "t1" }, "owner@example.com": { role: "owner", teamId: "t1" } } };
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
