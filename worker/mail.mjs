// The CRM's mail worker (every 10 minutes). Three jobs, all through Google Workspace for streetsignsupply.com:
//  1. sends the emails people queued in the CRM (mail/ with status "queued", and task notices) from the sender's own
//     @streetsignsupply.com Gmail, with any attached files, and marks each one sent (or why it didn't go);
//  2. reads each team member's Gmail for the last few days and logs every email to or from a CRM customer as an email
//     entry on that account (once — by Gmail message id);
//  3. tells whoever sent a signature link when it's signed or changes are asked for.
// It acts as each person through the service account's domain-wide delegation (set once in Google Admin). Without it
// nothing is sent and the CRM keeps opening emails in people's own mail. The log shows counts only — never addresses,
// names, subjects or text (the repo is public).
import { Firestore, FieldValue } from "@google-cloud/firestore";
const P = process.env.FIREBASE_PROJECT || "ssc-crm-a7224";
const SA = process.env.SA_EMAIL || "firebase-adminsdk-fbsvc@ssc-crm-a7224.iam.gserviceaccount.com";
// the service account's own token (to sign the delegation requests): refreshed through the job's Google sign-in, so the
// worker can keep running for hours (it loops — see the bottom), falling back to the token the workflow handed in
let TOK = process.env.SA_TOKEN, tokAt = Date.now();
let gauth = null; try { const { GoogleAuth } = await import("google-auth-library"); gauth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] }); } catch (e) {}
async function freshTok() { if (gauth && Date.now() - tokAt > 40 * 60000) { try { const t = await gauth.getAccessToken(); if (t) { TOK = typeof t === "string" ? t : t.token; tokAt = Date.now(); for (const k in tokCache) delete tokCache[k]; } } catch (e) {} } return TOK; }
const DOMAIN = "streetsignsupply.com";
const fs = new Firestore({ projectId: P });
const say = (m) => console.log(m);
const note = (m) => console.log("::notice::" + m);
const errKinds = {};
const n = { sent: 0, failed: 0, logged: 0, users: 0, userErr: 0, signs: 0 };
const isOurs = (e) => new RegExp("@" + DOMAIN.replace(".", "[.]") + "$", "i").test(String(e || "").trim());
const b64u = (b) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// ---- a Gmail token for one person (domain-wide delegation, keyless: the JWT is signed by IAM) ----
const tokCache = {};
async function userToken(email, scope) {
  await freshTok(); const k = email + "|" + scope; const c0 = tokCache[k]; if (c0 && Date.now() - c0.at < 45 * 60000) return c0.t;
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ iss: SA, sub: email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3000 });
  const r = await fetch("https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" + SA + ":signJwt", {
    method: "POST", headers: { Authorization: "Bearer " + TOK, "Content-Type": "application/json" }, body: JSON.stringify({ payload }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("sign " + r.status + " " + String((j.error || {}).message || "").slice(0, 120));
  const t = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + encodeURIComponent(j.signedJwt) });
  const tj = await t.json().catch(() => ({}));
  if (!t.ok) throw new Error("token " + t.status + " " + String(tj.error || "") + " " + String(tj.error_description || "").slice(0, 120));
  tokCache[k] = { t: tj.access_token, at: Date.now() }; return tj.access_token;
}
const SEND = "https://www.googleapis.com/auth/gmail.send", READ = "https://www.googleapis.com/auth/gmail.readonly";
async function gmail(email, scope, path, opt = {}) {
  const t = await userToken(email, scope);
  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/" + path, Object.assign({}, opt, { headers: Object.assign({ Authorization: "Bearer " + t, "Content-Type": "application/json" }, opt.headers || {}) }));
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error("gmail " + r.status + " " + String((j.error || {}).message || "").slice(0, 100)); return j;
}

const brandRef = fs.doc("settings/brand");
let brand = (await brandRef.get()).data() || {};
const mailFrom = String(brand.mailFrom || "matt@" + DOMAIN).toLowerCase();

// ---- 0. is delegation set up? (also prints the client ID that goes in Google Admin) ----
let ok = false, why = "";
try { await userToken(mailFrom, SEND); ok = true; } catch (e) { why = String(e.message || e); }
if (!ok) {
  // the client ID Google Admin asks for: the service account's numeric id (from its own token)
  let cid = ""; try { const r = await fetch("https://oauth2.googleapis.com/tokeninfo?access_token=" + encodeURIComponent(TOK)); const j = await r.json(); cid = j.azp || j.aud || ""; } catch (e) {}
  if (!cid) { try { const r = await fetch("https://iam.googleapis.com/v1/projects/-/serviceAccounts/" + SA, { headers: { Authorization: "Bearer " + TOK } }); cid = (await r.json()).uniqueId || ""; } catch (e) {} }
  if (cid) await brandRef.set({ mailClientId: String(cid) }, { merge: true });
  note("mail: sending isn't connected yet (" + why.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<email>").slice(0, 160) + "). Google Admin → Security → Access and data control → API controls → Domain-wide delegation → Add new: client ID " + cid + ", scopes " + SEND + "," + READ);
  if (brand.mailSendOk !== false) await brandRef.set({ mailSendOk: false, mailSendErr: why.slice(0, 160), mailSendAt: Date.now() }, { merge: true });
  process.exit(0);
}
if (!brand.mailSendOk) note("mail: sending is connected");
await brandRef.set({ mailSendOk: true, mailSendErr: "", mailSendAt: Date.now() }, { merge: true });

// ---- the first time it's connected: one test email to the sending address, so sending is proven end to end ----
if (!brand.mailTestAt) { await fs.collection("mail").add({ to: [mailFrom], status: "queued", kind: "notice", at: Date.now(),
  message: { subject: "CRM email is connected", text: "This is a test from the Street Sign Supply CRM. Emails sent from the CRM now go out from each person's own Gmail, and customer emails are logged in the CRM automatically every 10 minutes.\n\nNothing to do — you can delete this." } });
  await brandRef.set({ mailTestAt: Date.now() }, { merge: true }); }
// ---- 1. send what's queued ----
function mime({ from, fromName, to, cc, subject, text, atts }) {
  const bnd = "b" + Math.random().toString(36).slice(2), enc = (s) => /^[\x20-\x7e]*$/.test(s) ? s : "=?UTF-8?B?" + Buffer.from(s).toString("base64") + "?=";
  const h = ["From: " + (fromName ? enc(fromName) + " <" + from + ">" : from), "To: " + to.join(", ")].concat(cc && cc.length ? ["Cc: " + cc.join(", ")] : [])
    .concat(["Subject: " + enc(subject || ""), "MIME-Version: 1.0"]);
  if (!atts.length) return h.concat(["Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", Buffer.from(text || "").toString("base64")]).join("\r\n");
  const parts = ["--" + bnd, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", Buffer.from(text || "").toString("base64")];
  atts.forEach((a) => parts.push("--" + bnd, "Content-Type: " + (a.type || "application/octet-stream") + "; name=\"" + enc(a.name) + "\"", "Content-Disposition: attachment; filename=\"" + enc(a.name) + "\"",
    "Content-Transfer-Encoding: base64", "", a.data.toString("base64").replace(/.{76}/g, "$&\r\n")));
  parts.push("--" + bnd + "--");
  return h.concat(["Content-Type: multipart/mixed; boundary=\"" + bnd + "\"", ""]).concat(parts).join("\r\n");
}

async function sendQueued() {
  const queued = (await fs.collection("mail").where("status", "==", "queued").limit(40).get()).docs;
  // task notices written before there was a status field: anything from the last day that hasn't been sent
  const legacy = (await fs.collection("mail").where("at", ">", Date.now() - 864e5).get()).docs.filter((d) => !d.data().status);
  for (const d of queued.concat(legacy)) {
    const m = d.data(); const now = Date.now();
    const from = m.kind === "customer" ? String(m.from || "").toLowerCase() : mailFrom;
    const to = (m.to || []).filter((x) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(x))), cc = (m.cc || []).filter((x) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(x)));
    try {
      if (!isOurs(from)) throw new Error("the sender has no @" + DOMAIN + " address");
      if (!to.length) throw new Error("no one to send it to");
      const atts = []; let tot = 0;
      for (const a of (m.attachments || []).slice(0, 10)) { const r = await fetch(a.url); if (!r.ok) throw new Error("couldn't fetch the attachment " + String(a.name || "").slice(0, 40));
        const b = Buffer.from(await r.arrayBuffer()); tot += b.length; if (tot > 20e6) throw new Error("attachments over 20 MB"); atts.push({ name: String(a.name || "file"), type: a.type || r.headers.get("content-type") || "", data: b }); }
      const msg = m.message || {};
      const raw = mime({ from, fromName: m.kind === "customer" ? m.fromName : "Street Sign Supply CRM", to, cc, subject: msg.subject, text: msg.text || String(msg.html || "").replace(/<[^>]+>/g, " "), atts });
      const res = await gmail(from, SEND, "messages/send", { method: "POST", body: JSON.stringify({ raw: b64u(raw) }) });
      await d.ref.set({ status: "sent", sentAt: now, gmailId: res.id || "", threadId: res.threadId || "" }, { merge: true });
      if (m.activityId) await fs.doc("activity/" + m.activityId).set({ sendState: "sent", sentAt: now, gmailId: res.id || "", sendErr: "" }, { merge: true }).catch(() => {});
      n.sent++;
    } catch (e) {
      const err = String(e.message || e).slice(0, 160);
      await d.ref.set({ status: "failed", failedAt: now, err }, { merge: true });
      if (m.activityId) await fs.doc("activity/" + m.activityId).set({ sendState: "failed", sendErr: err }, { merge: true }).catch(() => {});
      n.failed++;
    }
  }


}
async function logGmail() {
  // ---- 2. log customer emails from each person's Gmail ----
  const live = async (c) => (await fs.collection(c).get()).docs.map((d) => Object.assign({ id: d.id }, d.data())).filter((x) => !x.deleted);
  const team = (await live("team")).filter((t) => isOurs(t.email));
  const contacts = await live("contacts"), accounts = await live("accounts");
  const byEmail = {}; contacts.forEach((c) => { const e = String(c.email || "").trim().toLowerCase(); if (e) byEmail[e] = c; });
  const dom = (e) => String(e || "").toLowerCase().split("@")[1] || "";
  const FREE = /^(gmail|yahoo|hotmail|outlook|aol|icloud|me|msn|live|comcast|att|sbcglobal|protonmail)\./;
  const byDomain = {}; accounts.forEach((a) => { const w = String(a.website || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]; if (w && !FREE.test(w)) byDomain[w] = a.id; });
  contacts.forEach((c) => { const d2 = dom(c.email); if (d2 && !FREE.test(d2) && c.accountId && !byDomain[d2]) byDomain[d2] = c.accountId; });
  const syncRef = fs.doc("settings/mailsync"); const sync = (await syncRef.get()).data() || {}; const seen = sync.last || {};
  const addrs = (h) => String(h || "").match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) || [];
  function bodyText(pl) { if (!pl) return ""; if (pl.mimeType === "text/plain" && pl.body && pl.body.data) return Buffer.from(pl.body.data, "base64").toString("utf8");
    for (const p2 of pl.parts || []) { const t = bodyText(p2); if (t) return t; } return ""; }
  const already = new Set((await fs.collection("activity").where("at", ">", Date.now() - 10 * 864e5).get()).docs.map((d) => d.data().gmailId).filter(Boolean));
  for (const t of team) {
    const me = String(t.email).toLowerCase();
    try {
      const after = Math.max(Number(seen[t.id]) || 0, Date.now() - 3 * 864e5);
      const list = await gmail(me, READ, "messages?maxResults=100&q=" + encodeURIComponent("after:" + Math.floor(after / 1000) + " -in:chats -in:spam -in:trash"));
      let newest = Number(seen[t.id]) || 0;
      for (const it of (list.messages || [])) {
        if (already.has(it.id)) continue;
        const m = await gmail(me, READ, "messages/" + it.id + "?format=full");
        const H = {}; (m.payload && m.payload.headers || []).forEach((h) => { H[h.name.toLowerCase()] = h.value; });
        const at = Number(m.internalDate) || Date.now(); newest = Math.max(newest, at);
        const from = addrs(H.from)[0] || "", others = addrs([H.to, H.cc].join(",")).concat(from ? [from] : []).map((x) => x.toLowerCase()).filter((x) => !isOurs(x));
        if (!others.length) continue;
        const c = others.map((x) => byEmail[x]).find(Boolean) || null;
        const aid = c ? c.accountId : others.map((x) => byDomain[dom(x)]).find(Boolean);
        if (!aid) continue;                                         // not a CRM customer
        if (/^(no-?reply|notifications?|mailer-daemon)@/i.test(from)) continue;
        const dir = isOurs(from) ? "out" : "in";
        const text = (bodyText(m.payload) || m.snippet || "").replace(/\r/g, "").split(/\n>|\nOn .{5,80}wrote:\n/)[0].trim().slice(0, 4000);
        const xid = "gm_" + it.id;
        await fs.doc("activity/" + xid).set({ id: xid, recType: "account", recId: String(aid), kind: "note", type: "email", direction: dir, subject: String(H.subject || "").slice(0, 200),
          text: text || "(no text)", contactId: c ? c.id : "", whoId: t.id, who: t.initials || "", when: new Date(at).toLocaleDateString("en-CA", { timeZone: "America/Denver" }), due: "", backOn: "", noBack: true,
          at, done: true, deleted: false, gmailId: it.id, threadId: m.threadId || "", source: "gmail" }, { merge: true });
        already.add(it.id); n.logged++;
      }
      seen[t.id] = newest || after; n.users++;
    } catch (e) { n.userErr++; const k = String(e.message || e).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<email>").slice(0, 90); errKinds[k] = (errKinds[k] || 0) + 1; }
  }
  await syncRef.set({ last: seen, at: Date.now() }, { merge: true });
  await brandRef.set({ mailSyncAt: Date.now(), mailSyncN: n.logged }, { merge: true });


}
async function signFollow() {
  // ---- 3. signature links that were signed or turned down: tell the person who sent them ----
  const sigs = (await fs.collection("signreq").where("status", "in", ["signed", "declined"]).get()).docs.filter((d) => !d.data().notified);
  for (const d of sigs) {
    const r = d.data(); const tm = r.createdById ? (await fs.doc("team/" + r.createdById).get()).data() : null; const now = Date.now();
    const what = (r.kind === "proof" ? "Proof" : "Quote") + " " + (r.status === "signed" ? "signed" : "— changes asked for") + ": " + (r.pnum || "") + " by " + (r.signedName || "the customer");
    if (tm) { const nid = "nt_sig_" + d.id.slice(0, 16);
      await fs.doc("notifications/" + nid).set({ id: nid, toId: r.createdById, fromId: "", fromName: "Signature", kind: "sign", text: what + (r.note ? " — “" + String(r.note).slice(0, 200) + "”" : ""),
        link: "project/" + r.projectId, at: now, read: false, deleted: false });
      if (isOurs(tm.email)) await fs.collection("mail").add({ to: [tm.email], status: "queued", kind: "notice", at: now,
        message: { subject: what, text: what + (r.note ? "\n\nTheir note: " + r.note : "") + "\n\nOpen it: https://crm.streetsignsupply.com/#/project/" + r.projectId } }); }
    const xid = "sg_" + d.id.slice(0, 20);
    await fs.doc("activity/" + xid).set({ id: xid, recType: "project", recId: String(r.projectId), kind: "note", type: "note", subject: what, text: (r.note ? "Note: " + r.note : what),
      whoId: "", who: "Sign", when: new Date(r.signedAt || now).toLocaleDateString("en-CA", { timeZone: "America/Denver" }), at: r.signedAt || now, done: true, deleted: false, noBack: true }, { merge: true });
    // the signed record goes into the project's Files (a link to the signed page, which prints as a clean copy)
    let filed = !!r.filed;
    if (r.status === "signed" && !filed) { const pd = (await fs.doc("projects/" + r.projectId).get()).data() || {}; const fid = "f_sig_" + d.id.slice(0, 16);
      const base = String(brand.signBase || "https://ssc-crm-a7224.web.app/sign.html");
      await fs.doc("files/" + fid).set({ id: fid, url: base + "?t=" + d.id + "&view=1", link: true, size: 0, type: "text/html",
        name: (r.kind === "proof" ? "Signed proof" : "Signed quote " + (r.quoteNo || "")) + " — " + (r.signedName || "") + " — " + new Date(r.signedAt || now).toLocaleDateString("en-CA", { timeZone: "America/Denver" }),
        cat: r.kind === "proof" ? "Signed proof" : "Signed quote", who: "Sign", when: new Date(now).toLocaleString("en-US", { timeZone: "America/Denver" }), at: now, deleted: false,
        accountId: pd.accountId || "", projectId: r.projectId, jobId: "" }, { merge: true }); filed = true; }
    await d.ref.set({ notified: true, notifiedAt: now, filed }, { merge: true }); n.signs++;
  }

}
// one job runs for most of a day's quarter: every minute it sends what's queued and follows up signatures, and every
// 10 minutes it reads Gmail — so an email goes out within about a minute of pressing Send (the schedule starts the next one)
const LOOP_MIN = Number(process.env.LOOP_MIN) || 0, t0 = Date.now(); let pass = 0;
do {
  try { await signFollow(); await sendQueued(); if (pass % 10 === 0) await logGmail(); } catch (e) { say("pass error: " + String(e.message || e).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<email>").slice(0, 140)); }
  pass++;
  if (LOOP_MIN && Date.now() - t0 < LOOP_MIN * 60000) await new Promise((r) => setTimeout(r, 60000));
} while (LOOP_MIN && Date.now() - t0 < LOOP_MIN * 60000);
note("mail: " + pass + " passes — " + n.sent + " sent, " + n.failed + " didn't send, " + n.logged + " customer emails logged" + (n.userErr ? " (" + n.userErr + " inbox reads failed: " + JSON.stringify(errKinds) + ")" : "") + ", " + n.signs + " signature updates");
