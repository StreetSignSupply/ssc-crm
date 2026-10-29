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
// updated rules in the repo go live only when the owner presses "Apply the updated rules" in the CRM
const crypto = await import("node:crypto");
const hash = crypto.createHash("sha256").update(fs.readFileSync(new URL("./firestore.rules", import.meta.url), "utf8")).digest("hex").slice(0, 12);
const want = d.want || "off", state = d.state || "off";
let action = "none";
if (want === "on" && (state === "off" || state === "rolled back")) action = "deploy";
else if (want === "on" && state === "pending") action = (Number(d.seenAt) > Number(d.deployedAt)) ? "confirm" : (now - Number(d.deployedAt) > 20 * 60000 ? "rollback-unseen" : "wait");
else if (want === "off" && (state === "on" || state === "pending")) action = "rollback";
else if (want === "on" && state === "on" && d.liveHash !== hash) action = d.apply === hash ? "update" : (d.available === hash ? "none" : "offer");
if (STEP === "plan") { console.log("lock: want " + want + ", state " + state + " → " + action); out("action", action); process.exit(0); }
try {
  if (action === "offer") {
    await ref.set({ available: hash, note: "Updated rules are ready — press Apply the updated rules" }, { merge: true });
    console.log("::notice::lock: updated rules offered (" + hash + ")");
  } else if (action === "deploy" || action === "update") {
    const cur = await api(rel);
    const rs = await api("projects/" + P + "/rulesets", "POST", { source: { files: [{ name: "firestore.rules", content: fs.readFileSync(new URL("./firestore.rules", import.meta.url), "utf8") }] } });
    // the rules to fall back to: the ones live before the lock (first time), or the last confirmed set (an update)
    await ref.set({ state: "pending", deployedAt: Date.now(), prev: action === "update" ? cur.rulesetName : (d.prev || cur.rulesetName), base: d.base || d.prev || cur.rulesetName,
      live: rs.name, liveHash: hash, apply: "", available: "", note: action === "update" ? "Updated rules on — waiting for your CRM to confirm" : "Turned on — waiting for your CRM to confirm it still opens" }, { merge: true });
    await api(rel, "PATCH", { release: { name: rel, rulesetName: rs.name } });
    console.log("::notice::database lock on: " + rs.name.split("/").pop() + " (before: " + (d.prev || cur.rulesetName).split("/").pop() + ")");
  } else if (action === "confirm") {
    await ref.set({ state: "on", confirmedAt: Date.now(), note: "On — confirmed by the CRM" }, { merge: true });
    console.log("::notice::database lock confirmed");
  } else if (action === "rollback" || action === "rollback-unseen") {
    if (!d.prev) throw new Error("no earlier rules saved to put back");
    // turning the lock off goes all the way back to the rules from before the lock; an update that nobody confirmed goes back one step
    const back = action === "rollback" ? (d.base || d.prev) : d.prev;
    await api(rel, "PATCH", { release: { name: rel, rulesetName: back } });
    const wasUpdate = action === "rollback-unseen" && d.base && d.prev !== d.base;
    await ref.set(wasUpdate ? { state: "on", liveHash: "previous", offAt: Date.now(), note: "The updated rules weren't confirmed in 20 minutes — the earlier lock rules are back" } : { state: action === "rollback" ? "off" : "rolled back", want: "off", offAt: Date.now(),
      note: action === "rollback" ? "Off — the earlier rules are back" : "Put back automatically: no CRM confirmed within 20 minutes of turning it on" }, { merge: true });
    console.log("::notice::database lock " + action + ": " + back.split("/").pop() + " is live again");
  }
} catch (e) { await ref.set({ error: String(e.message || e).slice(0, 200), errorAt: Date.now() }, { merge: true }); console.log("::error::lock: " + String(e.message || e).slice(0, 200)); process.exit(1); }
