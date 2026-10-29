// The database lock switch. Matt turns it on or off from Settings → Data in the CRM (owners only); this job,
// every 10 minutes, does what he asked. After turning it on it waits for his CRM to confirm it can still read and
// write; if nobody's CRM confirms within 20 minutes, it puts the previous rules back by itself. Names only in the log.
import { Firestore } from "@google-cloud/firestore";
import fs from "node:fs";
const P = process.env.FIREBASE_PROJECT || "ssc-crm-a7224", TOK = process.env.RULES_TOKEN, STEP = process.env.STEP || "plan";
const db = new Firestore({ projectId: P }); const ref = db.doc("settings/dbLock");
const out = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, k + "=" + v + "\n"); };
const api = async (path, method = "GET", body) => { const r = await fetch("https://firebaserules.googleapis.com/v1/" + path, { method, headers: { Authorization: "Bearer " + TOK, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); if (!r.ok) throw new Error("rules " + method + " " + r.status + " " + ((t.match(/"message":\s*"([^"]{0,140})/) || [])[1] || "")); return JSON.parse(t || "{}"); };
const rel = "projects/" + P + "/releases/cloud.firestore";
const snap = await ref.get(); const d = snap.exists ? snap.data() : {}; const now = Date.now();
const want = d.want || "off", state = d.state || "off";
let action = "none";
if (want === "on" && (state === "off" || state === "rolled back")) action = "deploy";
else if (want === "on" && state === "pending") action = (Number(d.seenAt) > Number(d.deployedAt)) ? "confirm" : (now - Number(d.deployedAt) > 20 * 60000 ? "rollback-unseen" : "wait");
else if (want === "off" && (state === "on" || state === "pending")) action = "rollback";
if (STEP === "plan") { console.log("lock: want " + want + ", state " + state + " → " + action); out("action", action); process.exit(0); }
try {
  if (action === "deploy") {
    const cur = await api(rel);
    const rs = await api("projects/" + P + "/rulesets", "POST", { source: { files: [{ name: "firestore.rules", content: fs.readFileSync(new URL("./firestore.rules", import.meta.url), "utf8") }] } });
    await ref.set({ state: "pending", deployedAt: Date.now(), prev: d.prev || cur.rulesetName, live: rs.name, note: "Turned on — waiting for your CRM to confirm it still opens" }, { merge: true });
    await api(rel, "PATCH", { release: { name: rel, rulesetName: rs.name } });
    console.log("::notice::database lock on: " + rs.name.split("/").pop() + " (before: " + (d.prev || cur.rulesetName).split("/").pop() + ")");
  } else if (action === "confirm") {
    await ref.set({ state: "on", confirmedAt: Date.now(), note: "On — confirmed by the CRM" }, { merge: true });
    console.log("::notice::database lock confirmed");
  } else if (action === "rollback" || action === "rollback-unseen") {
    if (!d.prev) throw new Error("no earlier rules saved to put back");
    await api(rel, "PATCH", { release: { name: rel, rulesetName: d.prev } });
    await ref.set({ state: action === "rollback" ? "off" : "rolled back", want: "off", offAt: Date.now(),
      note: action === "rollback" ? "Off — the earlier rules are back" : "Put back automatically: no CRM confirmed within 20 minutes of turning it on" }, { merge: true });
    console.log("::notice::database lock " + action + ": " + d.prev.split("/").pop() + " is live again");
  }
} catch (e) { await ref.set({ error: String(e.message || e).slice(0, 200), errorAt: Date.now() }, { merge: true }); console.log("::error::lock: " + String(e.message || e).slice(0, 200)); process.exit(1); }
