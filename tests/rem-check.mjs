// Reminder rules (build 170): no reminders for paid, closed or deleted projects; the day's sending is claimed by one copy.
import fs from "node:fs";
const html = fs.readFileSync(new URL("../next/index.html", import.meta.url), "utf8");
const grab = (name) => { const i = html.indexOf("function " + name + "("); if (i < 0) throw new Error(name + " missing");
  let d = 0, j = html.indexOf("{", i); for (let k = j; k < html.length; k++) { if (html[k] === "{") d++; else if (html[k] === "}") { d--; if (!d) return html.slice(i, k + 1); } } };
const S = { qbinv: { rows: [{ doc: "1004", total: "17625", balance: "0" }, { doc: "1013", total: "620.14", balance: "620.14" }] } };
const billState = (p) => (p && p.billStatus) || "none", isClosed = (p) => p.stage === "closed" || p.stage === "lost";
const qbRows = () => S.qbinv.rows, qbNum = (v) => Number(String(v).replace(/[$,\s]/g, "")) || 0;
const f = new Function("S", "billState", "isClosed", "qbRows", "qbNum", grab("remPaid") + ";" + grab("remDone") + ";return {remPaid,remDone}")(S, billState, isClosed, qbRows, qbNum);
const t = (ok, m) => { if (!ok) { console.log("::error::rem-check: " + m); process.exit(1); } };
t(f.remPaid({ invNum: "1004", billStatus: "invoiced" }), "QuickBooks paid invoice 1004 should count as paid");
t(!f.remPaid({ invNum: "1013", billStatus: "invoiced" }), "unpaid 1013 is not paid");
t(f.remDone({ deleted: true, stage: "quoted" }), "deleted project is done");
t(f.remDone({ stage: "lost" }) && !f.remDone({ stage: "quoted" }), "lost is done, quoted is not");
t(/if\(!force&&db&&!\(await remClaim\(td\)\)\)return 0/.test(html), "delivery claims the day first");
t(/syncMark\(x\.key,rec\);\s*syncPost\(/.test(html), "a reminder is marked sent before it is posted");
t(/db\.doc\("projects\/"\+pid\)\.get\(\)/.test(html), "delivery re-reads the project fresh");
console.log("::notice::rem-check passed");
