// Release check: opens a build of the CRM (next/index.html by default) with made-up data and walks every main page
// and a few forms. Any script error, or a page that draws nothing, fails the check and the build isn't released.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBotDash } from "../worker/botdash.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "..");
const SRC = path.resolve(root, process.argv[2] || "next/index.html");
const PAGE = path.resolve(here, "__shot_" + path.basename(process.argv[3] || "x") + ".html");
fs.writeFileSync(PAGE, fs.readFileSync(SRC, "utf8"));
const now = Date.now(), day = 86400000;
// the Bot team page: a small made-up team built the same way the export job builds it
const BDT = (() => { const t = (h, m) => { const d = new Date(Date.now() - 7 * 3600000 - (h * 60 + (m || 0)) * 60000); return d.toISOString().slice(0, 16).replace("T", " "); };
  return buildBotDash({
    roster: [["bot", "platform", "team", "responsibilities", "schedule", "log_names", "owner_keys", "stale_after_hours", "notes", "hands_to"],
      ["Matt Jackson", "Person", "Owner", "Owner and president", "", "", "", "", "", ""],
      ["Bre", "Person", "Office", "Adds accounts and contacts in the CRM", "Weekdays", "", "Bre", "", "", "CRM Bot"],
      ["Brodie Tuck", "Person", "Sales", "Sales rep: his accounts and quotes", "Weekdays", "", "Brodie", "", "", "Matt Jackson"],
      ["Bob Danforth", "Grok", "Sales", "Sales email rep: first touches and follow-ups from his own account, replies and bounces", "Every 30 min, weekdays", "bob", "Bob", "2", "Sends from his own account", "Brodie Tuck; CRM Bot"],
      ["Hunter (Lead Bot)", "Grok", "Sales", "Finds leads and bids, dedupes Prospects", "Hourly", "hunter;lead bot", "Hunter;Lead Bot", "3", ""],
      ["Josh Smith", "Grok", "Shop", "Materials and purchasing", "Every 30 min, weekdays", "josh", "Josh", "2", ""],
      ["CNC Bot", "Grok", "Shop", "CNC questions and stencil QA", "On demand (no schedule yet)", "cnc", "CNC", "", "Needs a routine"],
      ["Mechanic", "Claude", "Office", "Morning sweep of every last-ran stamp; restarts stalled jobs and emails Matt only when something is stopped", "Daily 6:19 AM", "mechanic", "Mechanic", "26", ""]],
    log: [["at", "agent", "action", "detail"], [t(0, 14), "Bob", "half-hour run :00 prep", "5 follow-up drafts ready for :30"], [t(1), "Bob Danforth", "sales run :30 send", "Sent 5 follow-ups"],
      [t(0, 20), "Josh (materials)", "materials run — nothing new", "nothing new since 11:41"], [t(30), "Hunter", "Hourly lead run", "could not read the bid site"], [t(6), "Mechanic", "all current", "12 checks"], [t(50), "Mechanic", "all current", ""]],
    findings: [["finding_id", "found_at", "agent", "area", "priority", "headline", "detail", "link_or_source", "action_for_matt", "status"],
      ["F-1", t(2), "Bid Bot", "Bids", "HIGH", "Bid due Nov 19: Franklin County traffic signs", "", "", "Decide bid / no-bid by Nov 17", "New"],
      ["F-2", t(3), "Bob", "Sales", "NORMAL", "Hunter: buyer rows need an email", "", "", "None", "New"],
      ["F-3", t(4), "Marketing Bot", "Marketing", "MEDIUM", "Matt: page kit ready — make the six pages", "", "", "Use page-kit.md", "New"],
      ["F-4", t(5), "CRM Bot", "CRM", "HIGH", "Fix needed: feed import stalled", "", "", "Check the worker", "Released"]],
    tokens: [["at", "bot", "routine", "outcome", "tool_calls", "chars_read", "chars_written", "est_tokens"], [t(31), "Lead Bot (Hunter)", "h", "c", "72", "1", "1", "383750"], [t(1), "Bob", "s", "c", "10", "1", "1", "52000"]],
    health: [["metric", "value", "note"], ["status", "OK", "feed is landing"], ["crm_build", "2026.11.25-168"], ["feed_rows_unapplied", "0"], ["feed_rows_broken", "683"]],
    runq: [["run_id", "added_at", "added_by", "project_ref", "job_name", "machine", "operation", "qty", "material", "roll", "preset", "files", "preflight", "approved_by", "status", "notes", "physical_step_needed"],
      ["R-2", "", "", "", "Run 1: level the spoilboard", "biesse", "", "", "", "", "", "", "", "", "hold", "", "record board thickness"]],
    prs: [["req_id", "requested_by", "item", "vendor_link", "cost_usd", "why", "ret", "needed_by", "status"], ["PR-1", "Josh", "582U12 application tape, 1 roll", "", "$66.42", "", "", "", "Needs Matt"]],
    prospects: [["pid", "source_list", "buyer_class", "last_verified"], ["P1", "Buyer Miner", "A", new Date().toISOString().slice(0, 10)], ["P2", "Buyer Miner", "B", ""], ["P3", "", "C", ""]],
    posts: [["post_id", "status"], ["1", "posted"], ["2", "planned"], ["3", "held"]], decisions: [["decision_id", "decided_at"], ["D-1", new Date().toISOString().slice(0, 10)]] }, Date.now()); })();
const D = {
  // settings: aluminum price breaks by the pound, and a commission plan (t1 is on it)
  __docs: { "settings/botdash": BDT, "settings/brand": { alumBreaks: [{ vendor: "Vendor A", minLb: 0, perLb: 4.5, freight: "extra", freightLb: 0.25 }, { vendor: "Vendor B", minLb: 1500, perLb: 3.9, freight: "extra", freightLb: 0.25 }],
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
  files: { f1: { name: "Proof.png", type: "image/png", url: "", cat: "Artwork proof", projectId: "p1", accountId: "a1", at: now, note: "ran on 54 in vinyl, Custom 48in preset" },
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
  "files", "purchasing", "inventory", "item/i1", "stencils", "vendors", "vendor/v1", "reports", "audit", "archive", "bin", "settings", "new", "commissions", "bots", "org"];
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
// Screenshots of the Activity card (account + project pages) for comparing CRM versions. Not part of the release check.
const OUT = process.argv[3] || "shot";
for (const [name, hash] of [["account", "#/account/a1"], ["project", "#/project/" + (Object.keys(D.projects || {})[0] || "p1")]]) {
  await pg.evaluate((h) => { location.hash = h; }, hash); await pg.waitForTimeout(1200);
  const el = await pg.$(".actcard");
  if (el) { await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `${OUT}-${name}.png` }); console.log("shot", OUT, name); }
  else { await pg.screenshot({ path: `${OUT}-${name}-page.png`, fullPage: false }); console.log("no actcard", OUT, name); }
}
await browser.close();
