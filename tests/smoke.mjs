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
  // settings: aluminum price breaks by the pound, and a commission plan (t1 is on it)
  __docs: { "settings/brand": { alumBreaks: [{ vendor: "Vendor A", minLb: 0, perLb: 4.5, freight: "extra", freightLb: 0.25 }, { vendor: "Vendor B", minLb: 1500, perLb: 3.9, freight: "extra", freightLb: 0.25 }],
    commPlans: [{ id: "cp1", name: "Rep plan", type: "sale", rate: 5 }] } },
  // t1 (the person signed in) is an older owner record with no level set, and another record is set to owner explicitly —
  // the owner must still get Settings (release -119..-128 turned such a record into Shop)
  team: { t1: { name: "Test Owner", initials: "TO", claudeId: "u1", email: "owner@example.com", isRep: true, commPlanId: "cp1" }, t9: { name: "Second Owner", initials: "SO", access: "owner", email: "owner2@example.com" }, t2: { name: "Test Sales", initials: "TS", access: "sales", email: "sales@example.com" } },
  accounts: { a1: { name: "Test County", street: "1 Main St", city: "Town", state: "UT", type: "Government agency", terms: "Net 30", repId: "t1",
    billDiff: true, billStreet: "PO Box 77", billCity: "Town", billState: "UT", billZip: "84000" }, a2: { name: "Test Contractor", type: "Contractor", terms: "Prepay" },
    // a vendor that was also entered as an account: it has to be offered as a vendor, not left as a Lead
    a8: { name: "Prospect Lead Town", source: "Prospects P0075 (NV list, stage 1)", deleted: true, deletedAt: now - 2 * day, deletedBy: "AI" },
    a9: { name: "Gone Sign Co", city: "Town", state: "UT", type: "Contractor", deleted: true, deletedAt: now - day },
    a3: { name: "Test Plastics Inc", type: "Contractor", createdAt: now },
    // a real-looking customer (nothing named "test"), so emails from its project aren't held back as a dry run
    a4: { name: "Pine Ridge HOA", city: "Town", state: "UT", type: "HOA", terms: "Prepay", repId: "t1" } },
  contacts: { c1: { name: "Pat Example", accountId: "a1", email: "pat@example.com", phone: "4355550100", role: "Buyer" }, c2: { name: "Lee Sample", accountId: "a2", phone: "4355550101", role: "Buyer" },
    c3: { name: "Ana Ridge", accountId: "a4", email: "ana@example.com", role: "Manager" } },
  vendors: { v1: { name: "Test Plastics" }, v2: { name: "Test Metals" } },
  items: {
    i1: { name: "LDPE .125 Stencil Sheet 5x10", cat: "Stencil material", cost: "91.20", vendorId: "v1", vendorPrice: "91.20", unit: "sheet", onHand: 4, reorderPoint: 2,
      onOrder: 3, orders: [{ ref: "PR-20261026-1", vendor: "Test Plastics", qty: 3, left: 3, expected: "2026-11-02", at: now - day }] },
    i2: { name: "Aluminum .080 sheet 48x96", cat: "Substrate", cost: "141.20", vendorId: "v2", vendorPrice: "141.20", unit: "sheet", onHand: 0 },
    i3: { name: "3M HIP White 3930 48in x 50yd", cat: "Film / vinyl", cost: "900", unit: "roll", onHand: 1 },
    i4: { sku: "BLK-080-3030", name: "Blank .080 30x30 square", cat: "Substrate", cost: "26.66", costSrc: "invoice", unit: "each", onHand: 10 } },
  projects: {
    p1: { num: 2001, name: "Signs and stencils", accountId: "a1", stage: "quoted", repId: "t1", createdAt: now - 9 * day, orderLines: [
      { id: "l1", code: "R1-1", desc: "Stop", size: "30x30", grade: "HIP", qty: "4", price: "79.45" },
      { id: "l2", code: "SSS-FAA-108-01", desc: "108\" FAA Airport Stencil Kit", size: "48x120", grade: "LDPE .125", qty: "1", price: "219.50" },
      { id: "l3", charge: "setup", desc: "Setup", qty: "1", price: "18.50", cost: "12.50" }] },
    p2: { num: 2002, name: "Inquiry only", accountId: "a2", stage: "inquiry", createdAt: now - 2 * day },
    p3: { num: 2003, name: "Entrance signs", accountId: "a4", stage: "quoted", repId: "t1", createdAt: now - 5 * day, quote: "Q-1003", contacts: ["c3"], orderLines: [
      { id: "l5", code: "R1-1", desc: "Stop", size: "30x30", grade: "HIP", qty: "2", price: "79.45" }],
      // follow-up 1 was due 5 days ago and nobody drafted it ("no writer"); 2 and 3 are still ahead
      followups: [{ id: "fu1", n: 1, due: new Date(now - 5 * day).toISOString().slice(0, 10), status: "planned", subject: "", body: "" },
        { id: "fu2", n: 2, due: new Date(now + 2 * day).toISOString().slice(0, 10), status: "planned", subject: "", body: "" },
        { id: "fu3", n: 3, due: new Date(now + 9 * day).toISOString().slice(0, 10), status: "planned", subject: "", body: "" }] } },
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
      due: new Date(now + 2 * day).toISOString().slice(0, 10), dueTime: "14:30", done: false },
    // an older task on the same account: the call x1 and emails x3/x4 were logged after it, so it can be ticked done straight away
    x5: { id: "x5", recType: "account", recId: "a1", kind: "task", type: "task", text: "Send the price list", assigneeId: "t1", whoId: "t1", who: "TO", at: now - 2 * day, done: false } },
  // signing links for p3: one cancelled yesterday, one that ran out, one live
  signreq: { ["c".repeat(48)]: { token: "c".repeat(48), kind: "quote", projectId: "p3", status: "cancelled", createdAt: now - 2 * day, expiresAt: now + 28 * day, contactEmail: "ana@example.com", contactName: "Ana Ridge" },
    ["e".repeat(48)]: { token: "e".repeat(48), kind: "quote", projectId: "p3", status: "sent", createdAt: now - 40 * day, expiresAt: now - 10 * day, contactEmail: "ana@example.com", contactName: "Ana Ridge" },
    ["a".repeat(48)]: { token: "a".repeat(48), kind: "quote", projectId: "p3", status: "sent", createdAt: now - day, expiresAt: now + 29 * day, contactEmail: "ana@example.com", contactName: "Ana Ridge" } },
  events: {}, history: {}, invtx: {}, notifications: {}, reminders: {}, access: { "u1": { role: "owner", teamId: "t1" }, "owner@example.com": { role: "owner", teamId: "t1" } } };
const ROUTES = ["home", "mybook", "accounts", "account/a1", "contacts", "contact/c1", "projects", "project/p1", "project/p2", "jobs", "job/1001", "tracker", "calendar",
  "files", "purchasing", "inventory", "item/i1", "stencils", "vendors", "vendor/v1", "reports", "audit", "archive", "bin", "settings", "new", "commissions"];
const browser = await chromium.launch(); const pg = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errs = [];
pg.on("pageerror", (e) => errs.push(String(e.message || e).slice(0, 160)));
const mockInit = (D) => { window.__writes = []; const db = { collection(c) { return { onSnapshot(cb) { const docs = Object.entries(D[c] || {}).map(([id, d]) => ({ id, data: () => d })); setTimeout(() => cb({ docs, size: docs.length, forEach: (f) => docs.forEach(f) }), 10); return () => {}; } }; },
    doc(p) { return { path: p, async get() { return { exists: false, data: () => null }; }, set(v) { window.__writes.push(["set", p, v]); return Promise.resolve(); }, update(v) { window.__writes.push(["update", p, v]); return Promise.resolve(); }, delete() { return Promise.resolve(); }, onSnapshot(cb) { const v = (D.__docs || {})[p]; setTimeout(() => cb({ exists: !!v, data: () => v || null }), 10); return () => {}; }, async acquire() { return { acquired: true }; } }; },
    nextCounter: async () => 1 };
  window.__ups = [];
  const assets = { async upload(f) { window.__ups.push(f.name); return { id: "as" + window.__ups.length, url: "https://example.com/" + encodeURIComponent(f.name), sizeBytes: f.size, contentType: f.type }; } };
  const caps = { db, assets, user: { async me() { return { id: "u1", name: "Test Owner", email: "owner@example.com" }; } } };
  window.__mock = { use: async (n) => { if (!(n in caps)) throw Object.assign(new Error("x"), { code: "not_declared" }); return caps[n]; } }; };
await pg.addInitScript(mockInit, D);
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
// a task can't be ticked done with nothing behind it: no call, email or note logged since it was given asks what was done
// (closing leaves it open); a task with a later call on the record completes and keeps that call as its proof
{ await pg.evaluate(() => { location.hash = "#/account/a1"; }); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms)); const out = {};
    const tick = async (id) => { const b = document.querySelector('[data-task="' + id + '"]'); if (!b) return "no checkbox"; window.__writes = []; b.click(); await w(500);
      const m = document.querySelector(".modal"); return { modal: m ? m.innerText.slice(0, 200) : "", writes: window.__writes.filter((x) => /^activity\//.test(x[1])).map((x) => [x[1], x[2].done, x[2].doneProof]) }; };
    out.bare = await tick("x2"); document.querySelectorAll(".modal .mx").forEach((x) => x.click()); await w(400);
    out.bareAfter = { modal: !!document.querySelector(".modal"), checked: (document.querySelector('[data-task="x2"]') || {}).checked };
    out.proved = await tick("x5"); return out; });
  if (typeof r.bare === "string") bad.push("task done check: " + r.bare);
  else { if (!/Mark this task done\?/.test(r.bare.modal) || r.bare.writes.length) bad.push("a task with nothing logged behind it was ticked done without asking (" + (r.bare.modal ? r.bare.modal.slice(0, 40) : "no window") + (r.bare.writes.length ? "; it was written" : "") + ")");
    if (r.bareAfter.modal || r.bareAfter.checked) bad.push("closing the 'what was done?' window didn't leave the task open");
    if (typeof r.proved === "string" || r.proved.modal || !r.proved.writes.some((x) => x[0] === "activity/x5" && x[1] === true && /^x[134]$/.test(x[2]))) bad.push("a task with a later call on the record didn't complete with that call as its proof (" + JSON.stringify(r.proved).slice(0, 120) + ")"); } }
// a planned follow-up more than 3 days late with no draft is "no writer": the dashboard says so and the project row says so
{ await pg.evaluate(() => { location.hash = "#/home"; }); await pg.waitForTimeout(500);
  const chip = await pg.evaluate(() => [...document.querySelectorAll(".main .tchip")].map((x) => x.innerText).find((x) => /nobody has written/.test(x)) || "");
  if (!/^1 follow-up late — nobody has written it$/.test(chip.trim())) bad.push("the dashboard doesn't flag a follow-up nobody has written (" + (chip || "no chip") + ")");
  await pg.evaluate(() => { location.hash = "#/project/p3"; }); await pg.waitForTimeout(500);
  await pg.evaluate(() => document.querySelectorAll(".main .card.collapsed button.cz").forEach((b) => b.click())); await pg.waitForTimeout(200);
  const row = await pg.evaluate(() => (document.querySelector(".main") || {}).innerText || "");
  if (!/Nobody has written this — [1-9][0-9]* days late/.test(row)) bad.push("the project's follow-up row doesn't say nobody has written it"); }
// the dashboard counts only quotes the customer asked for; prospect quotes (lead stage or flagged) show apart
{ await pg.evaluate(() => { location.hash = "#/home"; }); await pg.waitForTimeout(500);
  const txt = await pg.evaluate(() => (document.querySelector(".main") || {}).innerText || "");
  if (!/Prospect quotes/.test(txt)) bad.push("the dashboard has no Prospect quotes number"); }
// internal words can't be saved into the scope the customer reads on the quote
{ await pg.evaluate(() => { location.hash = "#/project/p1"; }); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms));
    const b = document.querySelector("[data-edit='project:p1']"); if (!b) return { err: "no Edit button" }; b.click(); await w(500);
    const cs = document.querySelector("#f-cscope"); if (!cs) return { err: "no customer scope box" };
    cs.value = "Proactive starter package — ship-to TBD"; window.__writes = []; document.querySelector("#save").click(); await w(600);
    const t = document.querySelector(".toast"); const wrote = window.__writes.some((x) => /^projects\//.test(x[1]));
    document.querySelectorAll(".modal .mx").forEach((x) => x.click()); await w(200);
    return { toast: t ? t.innerText : "", wrote }; });
  if (r.err) bad.push("scope lint: " + r.err);
  else if (!/take out/.test(r.toast) || r.wrote) bad.push("internal words were saved into the customer-facing scope (" + (r.toast || "no message").slice(0, 60) + (r.wrote ? "; it was written" : "") + ")"); }
// Won needs the customer's yes on record: a quoted project with no PO, no signed quote and no approval asks how they approved instead of moving
{ await pg.evaluate(() => { location.hash = "#/project/p3"; }); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms));
    const b = document.querySelector("[data-stage='p3:won']"); if (!b) return { err: "no mark-it-won button" }; window.__writes = []; b.click(); await w(600);
    // the usual "Move P-2003 to Won?" confirmation comes first; say yes to it
    const ok = document.querySelector("[data-stageyes='p3:won']"); if (ok) { ok.click(); await w(800); }
    const m = document.querySelector(".modal"); const moved = window.__writes.some((x) => /^projects\/p3/.test(x[1]) && x[2] && x[2].stage === "won");
    const out = { modal: m ? m.innerText.slice(0, 120) : "", moved };
    document.querySelectorAll(".modal .mx").forEach((x) => x.click()); await w(200); return out; });
  if (r.err) bad.push("won gate: " + r.err);
  else if (!/How did the customer approve/.test(r.modal) || r.moved) bad.push("a project was marked won with nothing on file from the customer (" + (r.modal || "no window").slice(0, 50) + (r.moved ? "; it moved" : "") + ")"); }
// the bench has a size: with a week already full, a due date filled in from lead time moves to the next Monday, and the dashboard says the bench is full
{ const r = await pg.evaluate(() => { const { S, benchDue, benchChip, weekMonday } = window.__sscTest; const out = {}; const due = (S.jobs.get("1001") || S.jobs.get(1001) || {}).due; out.due = due;
    S.brand = Object.assign({}, S.brand || {}, { capHours: { def: 6, perWO: 4 } });   // one 4-hour work order is already in that week; a second won't fit
    const r1 = benchDue(due); out.pushed = r1.pushed; out.newDue = r1.due; out.newDay = new Date(r1.due + "T00:00:00").getDay();
    const wk0 = weekMonday(new Date(due + "T00:00:00")), wk1 = weekMonday(new Date(r1.due + "T00:00:00")); out.nextWeek = wk1 > wk0;
    // the chip is about this week, so put the work order's due date in this week for a moment (its real date may fall in next week)
    const j = S.jobs.get("1001") || S.jobs.get(1001); const keep = j.due; const t = new Date(); j.due = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    S.brand.capHours = { def: 3, perWO: 4 }; out.chip = benchChip(); j.due = keep;
    S.brand.capHours = {}; out.noLimit = benchDue(due); return out; });
  if (r.pushed !== 1 || r.newDay !== 1 || !r.nextWeek) bad.push("a full week didn't push the filled-in due date to the next Monday (" + JSON.stringify(r) + ")");
  if (!/^Bench full — 1 work order ≈ 4 h vs 3 h this week$/.test(r.chip || "")) bad.push("the bench-full line is wrong (" + (r.chip || "none") + ")");
  if (r.noLimit.pushed !== 0 || r.noLimit.due !== r.due) bad.push("with no capacity set the due date still moved");
  const keepDue = await pg.evaluate(() => { const S = window.__sscTest.S; const j = S.jobs.get("1001") || S.jobs.get(1001); const k = j.due; const t = new Date(); j.due = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    S.brand.capHours = { def: 3, perWO: 4 }; location.hash = "#/home"; return k; }); await pg.waitForTimeout(500);
  const chip = await pg.evaluate(() => [...document.querySelectorAll(".main .tchip")].map((x) => x.innerText).find((x) => /Bench full/.test(x)) || "");
  if (!chip) bad.push("the dashboard doesn't show the bench-full chip");
  await pg.evaluate((k) => { const S = window.__sscTest.S; S.brand.capHours = {}; (S.jobs.get("1001") || S.jobs.get(1001)).due = k; }, keepDue); }
// website pictures that were never product shots are flagged by file name; real product names pass
{ const r = await pg.evaluate(() => ["Screenshot-2024-05-02-at-10.12.33-AM-300x300.png", "IMG_4521.jpg", "20240502_101233.jpg", "image-3.png", "12345.jpg", "R1-1-Stop-Sign-30in.jpg", "Accessible-EV-Charging-Use-Last-Sign.png", "W11-2-Pedestrian-Crossing-600x600.jpg"].map((f) => window.__sscTest.picRough("https://example.com/wp-content/uploads/" + f)));
  if (!(r[0] && r[1] && r[2] && r[3] && r[4])) bad.push("a screenshot / phone photo / untitled / numbers-only picture wasn't flagged (" + JSON.stringify(r.slice(0, 5)) + ")");
  if (r[5] || r[6] || r[7]) bad.push("a real product picture was flagged (" + JSON.stringify(r.slice(5)) + ")");
  const stat = await pg.evaluate(() => { const { S, webcatStat } = window.__sscTest; const keep = S.webcatMeta; S.webcatMeta = { products: 10, vars: 20, pics: 9, roughPics: 2, updatedAt: Date.now() }; const t = webcatStat(); S.webcatMeta = keep; return t; });
  if (!/2 pictures that look like a screenshot or phone photo/.test(stat)) bad.push("the catalogue line doesn't count the rough pictures (" + stat + ")"); }
// a government agency's account page has the exemption-certificate checklist, and "Ask for it" opens the request email to the billing contact
{ await pg.evaluate(() => { location.hash = "#/account/a1"; }); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms)); const card = document.querySelector("#cert-card"); if (!card) return { err: "no checklist card" };
    const steps = card.innerText; const b = card.querySelector("[data-certask='a1']"); if (!b) return { err: "no Ask for it button", steps };
    b.click(); await w(500); const m = document.querySelector(".modal"); const to = (document.querySelector("#cm-to") || {}).value || "", body = (document.querySelector("#cm-body") || {}).value || "", subj = (document.querySelector("#cm-subj") || {}).value || "";
    document.querySelectorAll(".modal .mx").forEach((x) => x.click()); await w(200); return { steps, modal: !!m, to, body, subj }; });
  if (r.err) bad.push("exemption checklist: " + r.err);
  else { if (!/Certificate requested/.test(r.steps) || !/Certificate uploaded to Files/.test(r.steps) || !/Expiry date entered/.test(r.steps)) bad.push("the exemption checklist is missing a step");
    if (!r.modal || r.to !== "pat@example.com" || !/TC-721/.test(r.body) || !/exemption certificate/i.test(r.subj) || /agent|CRM|proactive/i.test(r.body)) bad.push("the certificate request email isn't right (to " + r.to + "; subject " + r.subj + ")"); } }
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
// aluminum by the pound and commissions: the project shows its aluminum buy and the rep's commission; the pages render
{ await pg.evaluate(() => { location.hash = "#/project/p1"; }); await pg.waitForTimeout(700);
  const t = await pg.evaluate(() => (document.querySelector(".main") || {}).innerText || "");
  { const al = await pg.evaluate(() => { const c = [...document.querySelectorAll(".main section.card")].find((x) => /^\s*Aluminum buy/.test(x.innerText)); if (!c) return null;
      return [...c.querySelectorAll("tbody tr")].map((tr) => tr.querySelectorAll("td")[1] ? tr.querySelectorAll("td")[1].innerText : ""); });
    if (al && al.length >= 2 && al[0] === al[1]) bad.push("costing blanks by the pound doesn't change the job's cost (" + al.join(" / ") + ")"); }
  if (!/Aluminum buy/.test(t) || !/By the pound at/.test(t) || !/Blank cost on file/.test(t)) bad.push("the project doesn't show its aluminum buy (" + (t.match(/Aluminum buy[\s\S]{0,80}/) || [""])[0] + ")");
  if (!/Commission/.test(t) || !/If won/.test(t) || !/5% of the sale/.test(t)) bad.push("the project doesn't show the rep's commission");
  await pg.evaluate(() => { location.hash = "#/commissions"; }); await pg.waitForTimeout(500);
  const c = await pg.evaluate(() => (document.querySelector(".main") || {}).innerText || "");
  if (!/Earned — owed/.test(c) || !/On open quotes/.test(c)) bad.push("the Commissions page doesn't show owed, pending and paid out");
  await pg.evaluate(() => { location.hash = "#/settings"; }); await pg.waitForTimeout(600);
  await pg.evaluate(() => { const b = document.querySelector('[data-stab="pricing"]'); if (b) b.click(); }); await pg.waitForTimeout(300);
  const st = await pg.evaluate(() => (document.querySelector('[data-spanel="pricing"]') || {}).innerText || "");
  await pg.evaluate(() => { const b = document.querySelector('[data-stab="comm"]'); if (b) b.click(); }); await pg.waitForTimeout(300);
  const st2 = await pg.evaluate(() => (document.querySelector('[data-spanel="comm"]') || {}).innerText || "");
  if (!/Aluminum by the pound/.test(st) || !/Who's on which plan/.test(st2)) bad.push("Settings doesn't have Aluminum by the pound and Commissions");
  await pg.evaluate(() => { location.hash = "#/home"; }); await pg.waitForTimeout(500);
  const h = await pg.evaluate(() => (document.querySelector(".main") || {}).innerText || "");
  if (!/Commissions/.test(h)) bad.push("the company dashboard has no Commissions card"); }
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
// an email can't go out with a dead approval link in it (P-2032's customer got one that had been cancelled the day before);
// an expired link is swapped for a fresh one. Signing links only load on the hosted site, so this runs on a page marked hosted.
{ const pg2 = await browser.newPage({ viewport: { width: 1400, height: 900 } }); pg2.on("pageerror", (e) => errs.push("hosted: " + String(e.message || e).slice(0, 160)));
  await pg2.addInitScript(() => { window.sscHosted = true; }); await pg2.addInitScript(mockInit, D);
  await pg2.route(/firebase-adapter\.js$/, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  await pg2.route(/^https?:\/\//, (r) => r.abort());
  await pg2.goto("file://" + PAGE); await pg2.evaluate(() => window.__sscResolve && window.__sscResolve(window.__mock)); await pg2.waitForTimeout(1500);
  const link = (t) => "https://ssc-crm-a7224.web.app/sign.html?t=" + t.repeat(48);
  const mail = async (body) => pg2.evaluate(async (body) => { const w = (ms) => new Promise((r) => setTimeout(r, ms));
    location.hash = "#/project/p3"; await w(500); document.querySelectorAll(".modal .mx").forEach((x) => x.click()); await w(200);
    const b = document.querySelector("[data-compose='project:p3']"); if (!b) return { err: "no New email button" }; b.click(); await w(500);
    const to = document.querySelector("#cm-to"), su = document.querySelector("#cm-subj"), bd = document.querySelector("#cm-body"); if (!bd) return { err: "the email window didn't open" };
    to.value = "ana@example.com"; su.value = "Your quote"; bd.value = body; window.__writes = []; document.querySelector("#cm-open").click(); await w(800);
    const t = document.querySelector(".toast"); const act = window.__writes.find((x) => /^activity\//.test(x[1]));
    return { toast: t ? t.innerText : "", open: !!document.querySelector(".modal"), newLink: window.__writes.filter((x) => /^signreq\//.test(x[1]) && x[2] && x[2].status === "sent").map((x) => x[2].token), body: act ? act[2].text : "" }; }, body);
  const e0 = errs.length;
  const c = await mail("Hi Pat,\n\nHere it is:\n" + link("c") + "\n\nThanks");
  if (c.err) bad.push("dead approval link: " + c.err);
  else if (!/cancelled/.test(c.toast) || !c.open || c.body) bad.push("an email with a cancelled approval link wasn't refused (" + (c.toast || "no message").slice(0, 60) + (c.body ? "; it was logged" : "") + ")");
  const e = await mail("Hi Pat,\n\nHere it is:\n" + link("e") + "\n\nThanks");
  if (e.err) bad.push("expired approval link: " + e.err);
  else if (e.open || e.newLink.length !== 1 || e.body.indexOf(link("e")) >= 0 || e.body.indexOf("?t=" + e.newLink[0]) < 0) bad.push("an expired approval link wasn't swapped for a fresh one (" + (e.toast || "").slice(0, 60) + ")");
  const a = await mail("Hi Pat,\n\nHere it is:\n" + link("a") + "\n\nThanks");
  if (a.err) bad.push("live approval link: " + a.err);
  else if (a.open || a.newLink.length || a.body.indexOf(link("a")) < 0) bad.push("an email with a live approval link didn't go (" + (a.toast || "").slice(0, 60) + ")");
  if (errs.length > e0) bad.push("approval-link check: " + errs.slice(e0).join(" | "));
  await pg2.close(); }
const ver = await pg.evaluate(() => { const m = document.documentElement.innerHTML.match(/APP_VERSION="([^"]+)"/); return m ? m[1] : ""; });
await browser.close(); fs.unlinkSync(PAGE);
if (bad.length) { console.log("::error::release check failed: " + bad.slice(0, 8).join(" || ")); process.exit(1); }
console.log("::notice::release check passed: " + ROUTES.length + " pages (desktop, tablet and phone; light and dark), " + forms.length + " forms and " + (filt.length + 2) + " list filters, no errors");
