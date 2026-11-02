// Customer signing page check (docs/sign.html), on an iPhone-sized screen with made-up data: no script errors, nothing wider
// than the phone, and every full-size picture (artwork and the signature) closes with Close, a tap outside, Back and Escape.
import { chromium } from "playwright";
import os from "node:os";
import fs from "node:fs";
const SRC = process.argv[2] || new URL("../docs/sign.html", import.meta.url).pathname; const OUT = fs.mkdtempSync(os.tmpdir() + "/sign-");
const img = (w, h, t) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><rect width='${w}' height='${h}' fill='#eef'/><text x='20' y='60' font-size='40'>${t}</text></svg>`);
const F = (v) => typeof v === "number" ? { integerValue: String(v) } : typeof v === "boolean" ? { booleanValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(F) } } : v && typeof v === "object" ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, F(x)])) } } : { stringValue: String(v) };
const base = { kind: "both", company: "Street Sign Supply", companyAddr: "1513 E Ridge Street, Washington, UT 84780", companyPhone: "(435) 218-7800", quoteNo: "Q-1027", proofRev: 1, project: "Street signs for Park",
  customer: "Test", contactName: "Joe Smith", repName: "Matt Jackson", repPhone: "(253) 349-6184", createdAt: Date.now(), expiresAt: Date.now() + 9 * 864e5,
  lines: [{ d: "MUTCD Accessible Reserved Parking Sign", s: "12\" × 18\" · .063\" 3M Engineering Grade Reflective", q: 10, p: 30.89 }, { d: "Setup", q: 1, p: 18.5, c: true }],
  arts: [{ url: img(1200, 1800, "ARTWORK"), cap: "R7-8 parking sign", size: "12x18" }, { url: img(1800, 600, "WIDE ART"), cap: "Second", size: "24x8" }] };
const variants = { sent: Object.assign({}, base, { status: "sent" }), signed: Object.assign({}, base, { status: "signed", signedAt: Date.now(), signedName: "Joe Smith", signedTitle: "Buyer", sigImg: img(600, 200, "J Smith"), pieces: [{ i: 0, ok: true }, { i: 1, ok: true }] }) };
const browser = await chromium.launch(); const res = {};
for (const [name, doc] of Object.entries(variants)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const pg = await ctx.newPage(); const errs = [];
  pg.on("pageerror", (e) => errs.push(String(e.message)));
  await pg.route(/firestore\.googleapis\.com/, (r) => r.request().method() === "GET" ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fields: Object.fromEntries(Object.entries(doc).map(([k, v]) => [k, F(v)])) }) }) : r.fulfill({ status: 200, body: "{}" }));
  await pg.route(/^https?:\/\/(?!firestore)/, (r) => r.abort());
  fs.writeFileSync(OUT + "/page.html", fs.readFileSync(SRC, "utf8"));
  await pg.goto("file://" + OUT + "/page.html?t=0123456789abcdef0123456789abcdef"); await pg.waitForTimeout(800);
  await pg.screenshot({ path: OUT + "/" + name + "_top.png" });
  const over = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const small = await pg.evaluate(() => [...document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, textarea")].filter((e) => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 16).length);
  const zs = await pg.$$("[data-z]"); const z = [];
  for (let i = 0; i < zs.length; i++) { await zs[i].scrollIntoViewIfNeeded(); await zs[i].tap(); await pg.waitForTimeout(300);
    const shown = await pg.evaluate(() => getComputedStyle(document.getElementById("zoom")).display);
    if (i === 0) await pg.screenshot({ path: OUT + "/" + name + "_zoom.png" });
    // close three ways: the button, a tap outside, the Back gesture
    const how = ["button", "outside", "back"][i % 3];
    if (how === "button") await pg.tap("#zx"); else if (how === "outside") await pg.touchscreen.tap(20, 830); else await pg.goBack();
    await pg.waitForTimeout(300);
    z.push({ how, opened: shown === "flex", closed: await pg.evaluate(() => getComputedStyle(document.getElementById("zoom")).display === "none"), url: pg.url().slice(-20) }); }
  // Escape closes too
  if (zs.length) { await zs[0].tap(); await pg.waitForTimeout(200); await pg.keyboard.press("Escape"); await pg.waitForTimeout(200); z.push({ how: "escape", closed: await pg.evaluate(() => getComputedStyle(document.getElementById("zoom")).display === "none") }); }
  await pg.evaluate(() => window.scrollTo(0, 99999)); await pg.waitForTimeout(200); await pg.screenshot({ path: OUT + "/" + name + "_end.png" });
  res[name] = { over, small, zooms: z, errs }; await ctx.close(); }
await browser.close();
const bad = [];
for (const [k, v] of Object.entries(res)) { if (v.over > 1) bad.push(k + ": wider than a phone"); if (v.small) bad.push(k + ": " + v.small + " typing box(es) under 16px — iPhone zooms the page in"); if (v.errs.length) bad.push(k + ": " + v.errs.join(" | "));
  if (!v.zooms.length) bad.push(k + ": no picture opens full size");
  for (const z of v.zooms) { if (z.opened === false) bad.push(k + ": a picture didn't open"); if (!z.closed) bad.push(k + ": picture didn't close with " + z.how); } }
if (!res.signed.zooms.some((z) => z.how === "back")) bad.push("signed: the signature picture can't be opened");
if (bad.length) { console.log("::error::signing page check failed: " + bad.join(" || ")); process.exit(1); }
console.log("::notice::signing page check passed: " + Object.values(res).reduce((t, v) => t + v.zooms.length, 0) + " picture opens/closes on a phone, no errors");
