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
// the access records (who may open the CRM, their level, and their own sending address) kept in step with the team list
// here — the same as the owner's CRM does (accessWanted in next/index.html), so nobody needs it open. To stay inside the
// free daily reads it runs once an hour (the first run after the hour) and whenever updated rules are about to go on.
// An access record with no team record behind it is never deleted here: it's listed for the owner to look at.
const OURS = /@streetsignsupply\.com$/i;
const mins = new Date().getUTCMinutes();
const sure = d.apply && d.available && d.apply === d.available;
let team = [], noAddr = 0;
if (mins < 10 || sure) {
  team = (await db.collection("team").get()).docs.map((x) => Object.assign({ id: x.id }, x.data())).filter((t) => !t.deleted && String(t.name || "").trim());
  const hasOwner = team.some((t) => t.access === "owner");
  // a team record with no level set keeps the level its access record already has (older records were made before levels
  // existed and meant owner) — this job never lowers anyone's level; only a level set on the team record changes it
  const accNow = new Map((await db.collection("access").get()).docs.map((x) => [x.id, x.data()]));
  const prior = (t) => { const r = [...accNow.values()].find((a) => a.teamId === String(t.id) && a.role); return r ? r.role : ""; };
  const roleOf = (t) => ["owner", "office", "sales", "shop"].includes(t.access) ? t.access : (prior(t) || (hasOwner ? "shop" : "owner"));
  const want2 = {};
  team.forEach((t) => { const em = String(t.email || "").trim().toLowerCase(), mail = OURS.test(em) ? em : "";
    [em].concat([t.claudeId].concat(t.claudeIds || []).filter(Boolean).map(String)).filter((k) => k && !/[\/]/.test(k) && k.length < 200).forEach((k) => { want2[k] = { role: roleOf(t), teamId: String(t.id), mail }; }); });
  let synced = 0; const orphans = [];
  if (team.length && hasOwner) { const have = accNow;
    for (const k of Object.keys(want2)) { const c = have.get(k) || {}; if (c.role === want2[k].role && c.teamId === want2[k].teamId && (c.mail || "") === want2[k].mail) continue;
      await db.doc("access/" + k).set(Object.assign({}, want2[k], { updatedAt: now, by: "lock job" })); synced++; }
    for (const [k, v] of have) if (!want2[k]) orphans.push({ key: k, teamId: String(v.teamId || ""), role: String(v.role || "") }); }
  noAddr = team.filter((t) => roleOf(t) !== "shop" && !OURS.test(String(t.email || "").trim())).length;
  // shown to the owner in Settings → Database lock; counts only in the public log
  await ref.set({ orphans, orphansAt: now, noAddr }, { merge: true });
  console.log("lock: " + synced + " access records brought in step; " + orphans.length + " with no team record (flagged, not deleted)");
} else noAddr = Number(d.noAddr) || 0;
// the new rules only go on when everyone who sends customer email has their own address on their record (noAddr, above)
// updated rules in the repo go live only when the owner presses "Apply the updated rules" in the CRM
const crypto = await import("node:crypto");
const hash = crypto.createHash("sha256").update(fs.readFileSync(new URL("./firestore.rules", import.meta.url), "utf8")).digest("hex").slice(0, 12);
const want = d.want || "off", state = d.state || "off";
let action = "none";
if (want === "on" && (state === "off" || state === "rolled back")) action = "deploy";
else if (want === "on" && state === "pending") action = (Number(d.seenAt) > Number(d.deployedAt)) ? "confirm" : (now - Number(d.deployedAt) > 20 * 60000 ? "rollback-unseen" : "wait");
else if (want === "off" && (state === "on" || state === "pending")) action = "rollback";
else if (want === "on" && state === "on" && d.liveHash !== hash) action = d.apply === hash ? (noAddr ? "blocked" : "update") : (d.available === hash ? "none" : "offer");
if (action === "blocked" && STEP === "plan") { await ref.set({ apply: "", error: noAddr + " team member(s) who send customer email have no @streetsignsupply.com address on their team record — add it, then press Apply again", errorAt: now }, { merge: true });
  console.log("::warning::lock: updated rules not applied — " + noAddr + " sender(s) without a company address"); out("action", "none"); process.exit(0); }
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
