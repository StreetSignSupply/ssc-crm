// Live test of "a customer opened the quote/proof link" (run by hand). Makes a TEST signing link on the internal test
// project P-2030, opens it the way a customer's browser does (no sign-in, the public page's own call), then waits for the
// mail worker: the link must be marked opened, a bell notification made for its creator, and a TEST email queued to them
// only. Then the link is cancelled. Prints yes/no and counts only.
import { Firestore } from "@google-cloud/firestore";
import crypto from "node:crypto";
const fs = new Firestore({ projectId: process.env.FIREBASE_PROJECT || "ssc-crm-a7224" });
const out = {}; const say = (k, v) => { out[k] = v; };
const team = (await fs.collection("team").get()).docs.map((d) => Object.assign({ id: d.id }, d.data()));
const me = team.find((t) => !t.deleted && t.initials === "MJ"); if (!me) { console.log("::error::no MJ team record"); process.exit(1); }
const pd = (await fs.collection("projects").where("num", "in", [2030, "2030"]).get()).docs[0]; if (!pd) { console.log("::error::no P-2030"); process.exit(1); }
const p = pd.data(); say("testProjectInternal", !!(p.internal || p.test));
const id = crypto.randomBytes(20).toString("hex"); const now = Date.now();
await fs.doc("signreq/" + id).set({ status: "sent", kind: "quote", test: true, quoteNo: "Q-TEST", pnum: "P-2030", project: String(p.name || ""), projectId: pd.id, contactName: "Test Customer",
  customer: "Test", createdById: me.id, createdBy: me.name || "MJ", createdAt: now, expiresAt: now + 864e5, lines: [], company: "Street Sign Supply" });
// the customer's browser: the public page's own call, no sign-in
const u = "https://firestore.googleapis.com/v1/projects/ssc-crm-a7224/databases/(default)/documents/signreq/" + id + "?updateMask.fieldPaths=viewedAt&currentDocument.exists=true";
const r = await fetch(u, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: { viewedAt: { integerValue: String(Date.now()) } } }) });
say("customerOpenRecorded", r.status);
// wait for the mail worker (it checks every minute)
let s = {}; for (let i = 0; i < 30; i++) { await new Promise((x) => setTimeout(x, 10000)); s = (await fs.doc("signreq/" + id).get()).data() || {}; if (s.viewLogged) break; }
say("workerSawIt", !!s.viewLogged);
const nt = (await fs.collection("notifications").where("toId", "==", me.id).get()).docs.map((d) => d.data()).filter((n) => n.kind === "viewed" && /TEST/.test(n.text || "") && n.at >= now - 60000);
say("bellForCreator", nt.length);
const others = (await fs.collection("notifications").where("kind", "==", "viewed").get()).docs.map((d) => d.data()).filter((n) => /TEST/.test(n.text || "") && n.at >= now - 60000 && n.toId !== me.id);
say("bellForOthers", others.length);
const mails = (await fs.collection("mail").where("at", ">", now - 60000).get()).docs.map((d) => d.data()).filter((m) => m.kind === "notice" && /^TEST: /.test((m.message || {}).subject || ""));
say("testEmails", mails.length); say("testEmailOnlyToCreator", mails.every((m) => (m.to || []).length === 1 && String(m.to[0]).toLowerCase() === String(me.email || "").toLowerCase()));
let sent = false; for (let i = 0; i < 12 && mails.length; i++) { const ms = (await fs.collection("mail").where("at", ">", now - 60000).get()).docs.map((d) => d.data()).filter((m) => /^TEST: /.test((m.message || {}).subject || ""));
  if (ms.some((m) => m.status === "sent")) { sent = true; break; } await new Promise((x) => setTimeout(x, 10000)); }
say("testEmailSent", sent);
await fs.doc("signreq/" + id).set({ status: "cancelled" }, { merge: true });
const ok = out.customerOpenRecorded === 200 && out.workerSawIt && out.bellForCreator >= 1 && out.bellForOthers === 0 && out.testEmails >= 1 && out.testEmailOnlyToCreator && out.testEmailSent;
console.log((ok ? "::notice::view test PASSED " : "::error::view test FAILED ") + JSON.stringify(out)); process.exit(ok ? 0 : 1);
