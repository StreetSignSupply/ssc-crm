// Puts firestore.rules live (or puts an earlier ruleset back) through the Firebase Rules API. Prints only ruleset names.
const P = process.env.FIREBASE_PROJECT || "ssc-crm-a7224", TOK = process.env.RULES_TOKEN, MODE = process.env.MODE || "deploy";
import fs from "node:fs";
const api = async (path, method = "GET", body) => { const r = await fetch("https://firebaserules.googleapis.com/v1/" + path, { method, headers: { Authorization: "Bearer " + TOK, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); if (!r.ok) { console.log("::error::rules " + method + " " + path.split("/").slice(-2).join("/") + " " + r.status + " " + (t.match(/"message":\s*"([^"]{0,140})/) || [])[1]); process.exit(1); } return JSON.parse(t || "{}"); };
const rel = "projects/" + P + "/releases/cloud.firestore";
const cur = await api(rel);
console.log("::notice::rules now live: " + cur.rulesetName.split("/").pop() + " (to put it back: run with mode=rollback and ruleset=" + cur.rulesetName.split("/").pop() + ")");
let target;
if (MODE === "rollback") { if (!process.env.RULESET) { console.log("::error::give the ruleset to put back"); process.exit(1); } target = "projects/" + P + "/rulesets/" + process.env.RULESET; }
else if (MODE === "deploy") { const rs = await api("projects/" + P + "/rulesets", "POST", { source: { files: [{ name: "firestore.rules", content: fs.readFileSync(new URL("./firestore.rules", import.meta.url), "utf8") }] } }); target = rs.name; }
else { process.exit(0); }
await api(rel, "PATCH", { release: { name: rel, rulesetName: target } });
console.log("::notice::rules " + MODE + ": " + target.split("/").pop() + " is now live");
