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
import crypto from "node:crypto";
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


// the signed page printed to a PDF (headless Chrome), and a file put in the CRM's storage with a download link
let _browser = null;
async function signedPdf(url) { if (!_browser) { const { chromium } = await import("playwright"); _browser = await chromium.launch(); }
  const pg = await _browser.newPage({ viewport: { width: 900, height: 1200 } });
  try { await pg.goto(url, { waitUntil: "networkidle", timeout: 45000 }); await pg.waitForTimeout(1500);
    return await pg.pdf({ format: "Letter", printBackground: true, margin: { top: "0.4in", bottom: "0.5in", left: "0.4in", right: "0.4in" } }); } finally { await pg.close(); } }
async function toStorage(name, buf, type) { await freshTok(); const B = "ssc-crm-a7224.firebasestorage.app", tok = crypto.randomUUID();
  const r = await fetch("https://storage.googleapis.com/upload/storage/v1/b/" + B + "/o?uploadType=media&name=" + encodeURIComponent(name), { method: "POST", headers: { Authorization: "Bearer " + TOK, "Content-Type": type }, body: buf });
  if (!r.ok) throw new Error("upload " + r.status);
  const m = await fetch("https://storage.googleapis.com/storage/v1/b/" + B + "/o/" + encodeURIComponent(name), { method: "PATCH", headers: { Authorization: "Bearer " + TOK, "Content-Type": "application/json" }, body: JSON.stringify({ metadata: { firebaseStorageDownloadTokens: tok } }) });
  if (!m.ok) throw new Error("token " + m.status);
  return "https://firebasestorage.googleapis.com/v0/b/" + B + "/o/" + encodeURIComponent(name) + "?alt=media&token=" + tok; }
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
// the message as Gmail would build it: plain text and HTML (with the sender's own Gmail signature at the bottom), plus attachments
function mime({ from, fromName, to, cc, subject, text, html, atts }) {
  const rnd = () => "b" + Math.random().toString(36).slice(2), enc = (s) => /^[\x20-\x7e]*$/.test(s) ? s : "=?UTF-8?B?" + Buffer.from(s).toString("base64") + "?=";
  const b64 = (s) => Buffer.from(s || "").toString("base64").replace(/.{76}/g, "$&\r\n");
  const h = ["From: " + (fromName ? enc(fromName) + " <" + from + ">" : from), "To: " + to.join(", ")].concat(cc && cc.length ? ["Cc: " + cc.join(", ")] : [])
    .concat(["Subject: " + enc(subject || ""), "MIME-Version: 1.0"]);
  const alt = rnd();
  const altPart = ["Content-Type: multipart/alternative; boundary=\"" + alt + "\"", "", "--" + alt, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", b64(text),
    "--" + alt, "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "", b64(html), "--" + alt + "--"].join("\r\n");
  if (!atts.length) return h.join("\r\n") + "\r\n" + altPart;
  const mix = rnd(); const parts = ["--" + mix, altPart];
  atts.forEach((a) => parts.push("--" + mix, "Content-Type: " + (a.type || "application/octet-stream") + "; name=\"" + enc(a.name) + "\"", "Content-Disposition: attachment; filename=\"" + enc(a.name) + "\"",
    "Content-Transfer-Encoding: base64", "", a.data.toString("base64").replace(/.{76}/g, "$&\r\n")));
  parts.push("--" + mix + "--");
  return h.concat(["Content-Type: multipart/mixed; boundary=\"" + mix + "\"", ""]).join("\r\n") + "\r\n" + parts.join("\r\n");
}
const escH = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const linkify = (s) => s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
const sigText = (h) => String(h || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(div|p|tr)>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();
// each person's Gmail signature (Gmail → Settings → Signature), read from their account and kept for 30 minutes
const sigCache = {};
async function gmailSig(email) { const c = sigCache[email]; if (c && Date.now() - c.at < 30 * 60000) return c.sig;
  let sig = ""; try { const j = await gmail(email, READ, "settings/sendAs"); const sa = (j.sendAs || []).find((x) => String(x.sendAsEmail).toLowerCase() === email) || (j.sendAs || []).find((x) => x.isPrimary) || {}; sig = String(sa.signature || ""); } catch (e) {}
  sigCache[email] = { sig, at: Date.now() }; return sig; }
/* ---- reads: live listeners instead of re-reading every minute ----
   The free Firebase plan allows 50,000 document reads a day. Polling the mail queue, signature links, AI drafts and the
   whole contact/project list every minute burned through that (1 Nov: "Quota exceeded" — the CRM itself stops loading).
   Each query here is read once when the worker starts; after that only documents that change are read. */
const WATCH = {};
function watch(key, q) { if (WATCH[key]) return WATCH[key].ready;
  const w = WATCH[key] = { docs: new Map(), ready: null };
  w.ready = new Promise((ok) => { let first = true;
    q.onSnapshot((snap) => { snap.docChanges().forEach((ch) => { if (ch.type === "removed") w.docs.delete(ch.doc.id); else w.docs.set(ch.doc.id, { id: ch.doc.id, ref: ch.doc.ref, data: () => ch.doc.data() }); });
      if (first) { first = false; ok(); } }, (e) => { say("listener " + key + ": " + String(e.message || e).slice(0, 80)); if (first) { first = false; ok(); } }); });
  return w.ready; }
async function docsOf(key, q) { await watch(key, q); return [...WATCH[key].docs.values()]; }
// the access record for a sign-in id or email (kept by the owner's CRM): role, team id and own address
const ACC = new Map();
async function accOf(k) { k = String(k || "").toLowerCase(); if (!k) return null; const c = ACC.get(k); if (c && Date.now() - c.at < 10 * 60000) return c.d;
  const d = (await fs.doc("access/" + k).get()).data() || null; ACC.set(k, { d, at: Date.now() }); return d; }
// the quote's fingerprint — the same as quoteHash() in the CRM (next/index.html); keep the two in step
function quoteHash(p, a, b) { a = a || {}; b = b || {}; if (!p) return ""; const nv = (x) => { const t = String(x == null ? "" : x).replace(/[$,\s]/g, ""); return t !== "" && isFinite(Number(t)) ? String(Number(t)) : String(x == null ? "" : x).trim(); };
  const L = (p.orderLines || []).filter((l) => l).map((l) => [l.code, l.desc, l.size, l.grade, l.build, nv(l.qty), nv(l.price), l.lam === true, l.charge || ""].map((x) => String(x == null ? "" : x)));
  const s = JSON.stringify([String(p.quote || ""), String(p.accountId || ""), L, String(p.custScope || "").trim(), String(a.terms || ""), String(b.quoteNote || "").trim(), String(b.quoteDays || "")]); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return "q" + (h >>> 0).toString(36); }
const isOwnerT = (t) => !!t && !t.deleted && (t.access === "owner");
const MAX_RECIP = 6;
// what to do with a customer email: "send", "wait" (a quote waiting for the owner's OK) or a reason it can't go
async function mailCheck(d, m, from, to, cc) {
  const team = (await docsOf("all_team", fs.collection("team"))).map((x) => Object.assign({ id: x.id }, x.data()));
  const writer = team.find((t) => t.id === m.byId && !t.deleted);
  // it goes only from the writer's own team address — nobody sends as someone else
  if (!writer || String(writer.email || "").toLowerCase() !== from) return "the sender isn't on the team with that address";
  if (to.length + cc.length > MAX_RECIP) return "more than " + MAX_RECIP + " people on one email";
  const projects = await docsOf("all_projects", fs.collection("projects"));
  const pid = m.quote ? m.quote.pid : (m.recType === "project" ? m.recId : "");
  const pd = pid ? projects.find((x) => x.id === String(pid)) : null; const p = pd ? pd.data() : null;
  const accts = await docsOf("all_accounts", fs.collection("accounts"));
  const aid = p ? p.accountId : (m.recType === "account" ? m.recId : ""); const ad = aid ? accts.find((x) => x.id === String(aid)) : null; const acc = ad ? ad.data() : null;
  // a dry run / test project (or an account marked internal / test) never emails anyone outside — "test" in any case
  // THE test definition — the same as isTestRec() in the CRM and testRec() in the database rules: the Internal / test box,
  // or "test", "dry run" or "do not send" as a word in the NAME, any case (scope and notes never count)
  const testy = (x) => !!x && !!(x.sample || x.internal || x.test || /(^|[^a-z0-9])(test|dry ?run|do not send)([^a-z0-9]|$)/i.test(String(x.name || "")));
  if (testy(p)) return "the project is marked as a test (its name or its Internal / test box)";
  if (testy(acc)) return "the account is marked as a test (its name or its Internal / test box)";
  // is it the quote? the client says so, but the worker checks for itself: a CRM-made quote PDF, a file filed as the quote,
  // or a signing link for the quote — whatever the file is called
  let isQ = !!m.quote;
  if (!isQ) isQ = (m.attachments || []).some((x) => x && (x.gen === "quote" || /^(Quote|Signed quote)$/.test(x.cat || "") || /quote/i.test(x.name || "")));
  if (!isQ && m.signId) { const sr = (await fs.doc("signreq/" + m.signId).get()).data() || {}; isQ = sr.kind !== "proof"; }
  if (!isQ) return "send";
  if (!m.quote) return isOwnerT(writer) ? "send" : "a quote has to be sent from the CRM's email window so Matt can approve it — send it again";
  if (!p) return "the quote's project is gone";
  if (p.quoteRejected && p.quoteRejected.mailId === d.id) return "Matt didn't approve it" + (p.quoteRejected.why ? ": " + String(p.quoteRejected.why).slice(0, 80) : "");
  if (!quoteHash.brandAt || Date.now() - quoteHash.brandAt > 5 * 60000) { quoteHash.brand = (await fs.doc("settings/brand").get()).data() || {}; quoteHash.brandAt = Date.now(); }
  const cur = quoteHash(p, acc || {}, quoteHash.brand);
  // a quote PDF made before the quote last changed, or an email written before it changed, never goes
  const stale = m.quote.hash !== cur || (m.attachments || []).some((x) => x && x.gen === "quote" && x.qhash !== cur);
  if (stale) return "the quote changed after its PDF was made — make a new quote PDF and send it again";
  if (isOwnerT(writer)) return "send";
  // the attachments' actual contents (SHA-256 of the bytes), kept on the email so Matt approves exactly these files
  const shas = await attShas(m);
  if (typeof shas === "string") return shas;
  if (JSON.stringify(m.attSha || []) !== JSON.stringify(shas)) await d.ref.set({ attSha: shas }, { merge: true });
  const ap = p.quoteApproval;
  if (!ap || ap.v !== 2 || !isOwnerT(team.find((t) => t.id === ap.byId))) return "wait";      // approvals before -123 don't count: re-approve
  const okP = new Set((ap.to || []).concat(ap.cc || []).map((x) => String(x).toLowerCase()));
  const okS = new Set(ap.sha || []);
  const same = to.concat(cc).every((x) => okP.has(String(x).toLowerCase())) && shas.every((h) => okS.has(h));
  // Matt approved this very email (he saw its PDF), or this exact quote with these exact files and people
  if (same && ap.hash === cur) { APPROVED.set(d.id, new Set(okS)); return "send"; }
  return "wait"; }
// the approved contents for a quote that's about to go: the bytes downloaded for sending are checked against these
const APPROVED = new Map();
// SHA-256 of each attachment's bytes, read fresh every time (no cache, so a swapped file is always caught). A file that
// can't be read gives a plain reason instead — the email fails with it and the CRM offers Retry.
async function attShas(m) { const out = [];
  for (const a of (m.attachments || []).slice(0, 10)) { const nm = String(a.name || "file").slice(0, 50);
    try { const r = await fetch(a.url, { cache: "no-store" });
      if (!r.ok) return "couldn't read the attachment " + nm + " (HTTP " + r.status + (r.status === 402 ? " — Firebase file storage needs the paid plan" : "") + ")";
      out.push(crypto.createHash("sha256").update(Buffer.from(await r.arrayBuffer())).digest("hex")); }
    catch (e) { return "couldn't read the attachment " + nm + " (" + String(e.message || e).slice(0, 60) + ")"; } }
  return out; }
// Files: a file record only counts (for close-out) once the worker has checked the file is really in the CRM's own storage
// (the CRM's upload) — not just a record someone typed in. The CRM marks new records needsCheck; this checks them.
const BUCKETS = ["ssc-crm-a7224.firebasestorage.app", "ssc-crm-a7224.appspot.com"];
async function verifyFiles() { const q = (await docsOf("filechk", fs.collection("files").where("needsCheck", "==", true))).slice(0, 20);
  for (const d of q) { const f = d.data(); let ok = false, why = "", md5 = "", size = 0, type = "";
    try { const m = /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\/o\/([^?]+)/.exec(String(f.url || ""));
      if (!m || !BUCKETS.includes(m[1])) why = "not a file in the CRM's own storage";
      else { await freshTok(); const r = await fetch("https://storage.googleapis.com/storage/v1/b/" + m[1] + "/o/" + m[2], { headers: { Authorization: "Bearer " + TOK } });
        if (!r.ok) why = "storage answered " + r.status + (r.status === 402 ? " (file storage needs the paid plan)" : r.status === 404 ? " (no such file)" : "");
        else { const o = await r.json(); md5 = o.md5Hash || ""; size = Number(o.size) || 0; type = o.contentType || "";
          if (/^(quote|invoice)$/.test(f.gen || "") && !/pdf/i.test(type)) why = "a CRM-made " + f.gen + " must be a PDF"; else ok = true; } } }
    catch (e) { why = String(e.message || e).slice(0, 80); }
    // storage can't be reached right now: try again later rather than marking it bad
    if (!ok && /storage answered (402|5\d\d)|fetch failed/.test(why)) { await d.ref.set({ checkErr: why, checkedAt: Date.now() }, { merge: true }); continue; }
    await d.ref.set({ needsCheck: false, verified: ok, md5, size: size || f.size || 0, checkedAt: Date.now(), checkErr: ok ? "" : why }, { merge: true }); n.fchk = (n.fchk || 0) + 1; } }
async function sendQueued() {
  const queued = (await docsOf("mailq", fs.collection("mail").where("status", "==", "queued"))).slice(0, 40)
    .concat((await docsOf("mailhold", fs.collection("mail").where("status", "==", "approval"))).slice(0, 40));
  // task notices written before there was a status field: checked once, when the worker starts
  const legacy = sendQueued.didLegacy ? [] : (await fs.collection("mail").where("at", ">", Date.now() - 864e5).get()).docs.filter((d) => !d.data().status); sendQueued.didLegacy = true;
  sendQueued.done = sendQueued.done || new Set();
  for (const d of queued.concat(legacy)) {
    if (sendQueued.done.has(d.id)) continue; sendQueued.done.add(d.id);
    const m = d.data(); const now = Date.now();
    const from = m.kind === "customer" ? String(m.from || "").toLowerCase() : mailFrom;
    const to = (m.to || []).filter((x) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(x))), cc = (m.cc || []).filter((x) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(x)));
    // a customer email: from the writer's own address, to at most 6 people, never from a test project; a quote from anyone
    // but an owner waits (status "approval") until the owner approves that exact quote for those people
    if (m.kind === "customer") { const v = await mailCheck(d, m, from, to, cc);
      if (v === "wait") { if (m.status !== "approval") { await d.ref.set({ status: "approval", heldAt: now }, { merge: true });
          if (m.activityId) await fs.doc("activity/" + m.activityId).set({ sendState: "approval", sendErr: "" }, { merge: true }).catch(() => {}); n.held = (n.held || 0) + 1; }
        sendQueued.done.delete(d.id); continue; }
      if (v !== "send") { await d.ref.set({ status: "failed", failedAt: now, err: v }, { merge: true });
        if (m.activityId) await fs.doc("activity/" + m.activityId).set({ sendState: "failed", sendErr: v }, { merge: true }).catch(() => {}); n.failed++; continue; } }
    else {
      // notices go only to people on the team
      const teamMails = new Set((await docsOf("all_team", fs.collection("team"))).map((x) => String(x.data().email || "").toLowerCase()).filter(Boolean));
      if (!to.length || !to.concat(cc).every((x) => teamMails.has(String(x).toLowerCase()))) { await d.ref.set({ status: "failed", failedAt: now, err: "a notice goes only to the team" }, { merge: true }); n.failed++; continue; } }
    try {
      if (!isOurs(from)) throw new Error("the sender has no @" + DOMAIN + " address");
      if (!to.length) throw new Error("no one to send it to");
      const atts = []; let tot = 0;
      for (const a of (m.attachments || []).slice(0, 10)) { const r = await fetch(a.url, { cache: "no-store" }); if (!r.ok) throw new Error("couldn't read the attachment " + String(a.name || "").slice(0, 40) + " (HTTP " + r.status + (r.status === 402 ? " — Firebase file storage needs the paid plan" : "") + ")");
        const b = Buffer.from(await r.arrayBuffer()); tot += b.length;
        // a quote Matt approved goes only with exactly the files he approved — checked on the bytes being sent, right now
        if (APPROVED.has(d.id) && !APPROVED.get(d.id).has(crypto.createHash("sha256").update(b).digest("hex"))) throw new Error("the attachment " + String(a.name || "").slice(0, 40) + " changed after Matt approved it — not sent; make the quote PDF again and send it for approval"); if (tot > 20e6) throw new Error("attachments over 20 MB"); atts.push({ name: String(a.name || "file"), type: a.type || r.headers.get("content-type") || "", data: b }); }
      const msg = m.message || {};
      const body = msg.text || String(msg.html || "").replace(/<[^>]+>/g, " ");
      const sig = m.kind === "customer" ? await gmailSig(from) : "";
      const html = '<div dir="ltr">' + linkify(escH(body)).replace(/\n/g, "<br>") + "</div>" + (sig ? '<br><div dir="ltr" class="gmail_signature">' + sig + "</div>" : "");
      const raw = mime({ from, fromName: m.kind === "customer" ? m.fromName : "Street Sign Supply CRM", to, cc, subject: msg.subject, text: body + (sig ? "\n\n-- \n" + sigText(sig) : ""), html, atts });
      const res = await gmail(from, SEND, "messages/send", { method: "POST", body: JSON.stringify({ raw: b64u(raw) }) });
      await d.ref.set({ status: "sent", sentAt: now, gmailId: res.id || "", threadId: res.threadId || "" }, { merge: true }); APPROVED.delete(d.id);
      // the quote has really gone: that's when it counts as sent (and the CRM plans the follow-ups); a follow-up is marked sent
      if (m.quote && m.quote.pid) { const pr = fs.doc("projects/" + m.quote.pid); const pv = (await pr.get()).data() || {};
        await pr.set(Object.assign({ quoteSentTo: to.join(", ").slice(0, 200), updatedAt: now }, pv.quoteSentAt ? {} : { quoteSentAt: now }), { merge: true }); }
      if (m.follow && m.follow.pid) { const pr = fs.doc("projects/" + m.follow.pid); const pv = (await pr.get()).data() || {};
        const fus = (pv.followups || []).map((f) => f.id === m.follow.id ? Object.assign({}, f, { status: "sent", sentAt: now }) : f);
        if (fus.length) await pr.set({ followups: fus, updatedAt: now }, { merge: true }); }
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
  const live = async (c) => (await docsOf("all_" + c, fs.collection(c))).map((d) => Object.assign({ id: d.id }, d.data())).filter((x) => !x.deleted);
  const team = (await live("team")).filter((t) => isOurs(t.email));
  const contacts = await live("contacts"), accounts = await live("accounts"), projects = await live("projects");
  // the project an email is about: a P- or quote number in the subject, else that contact's (or account's) latest open project
  const OPEN = ["lead", "inquiry", "quoted", "won", "production", "shipped"];
  const projFor = (subj, c, aid) => { const m = String(subj || "").match(/\b(?:P-?\s?(\d{4})|Q-?\s?(\d{4}))\b/i);
    if (m) { const hit = projects.find((p) => (m[1] && String(p.num) === m[1]) || (m[2] && String(p.quote || "").replace(/\D/g, "") === m[2])); if (hit && (!aid || hit.accountId === aid)) return hit; }
    const open = projects.filter((p) => p.accountId === aid && OPEN.indexOf(p.stage) >= 0);
    const byC = c ? open.filter((p) => (p.contacts || []).indexOf(c.id) >= 0) : [];
    return (byC.length ? byC : open).sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0))[0] || null; };
  const byEmail = {}; contacts.forEach((c) => { const e = String(c.email || "").trim().toLowerCase(); if (e) byEmail[e] = c; });
  const dom = (e) => String(e || "").toLowerCase().split("@")[1] || "";
  const FREE = /^(gmail|yahoo|hotmail|outlook|aol|icloud|me|msn|live|comcast|att|sbcglobal|protonmail)\./;
  const byDomain = {}; accounts.forEach((a) => { const w = String(a.website || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]; if (w && !FREE.test(w)) byDomain[w] = a.id; });
  contacts.forEach((c) => { const d2 = dom(c.email); if (d2 && !FREE.test(d2) && c.accountId && !byDomain[d2]) byDomain[d2] = c.accountId; });
  const syncRef = fs.doc("settings/mailsync"); const sync = (await syncRef.get()).data() || {}; const seen = sync.last || {};
  const addrs = (h) => String(h || "").match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) || [];
  function bodyText(pl) { if (!pl) return ""; if (pl.mimeType === "text/plain" && pl.body && pl.body.data) return Buffer.from(pl.body.data, "base64").toString("utf8");
    for (const p2 of pl.parts || []) { const t = bodyText(p2); if (t) return t; } return ""; }
  const already = new Set((await docsOf("act10", fs.collection("activity").where("at", ">", t0 - 10 * 864e5))).map((d) => d.data().gmailId).filter(Boolean));
  for (const t of team) {
    const me = String(t.email).toLowerCase();
    try { const sg = await gmailSig(me); if (sg) n.sigs = (n.sigs || 0) + 1; if (String(t.mailSig || "") !== sg) await fs.doc("team/" + t.id).set({ mailSig: sg.slice(0, 30000), mailSigAt: Date.now() }, { merge: true }); } catch (e) {}
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
        const pj = projFor(H.subject, c, aid);
        // a quote that went out from Gmail itself (its PDF attached or its number in the subject) starts the follow-ups too
        if (pj && dir === "out" && !pj.quoteSentAt && ["lead", "inquiry", "quoted"].indexOf(pj.stage) >= 0) {
          const files = []; (function walk(x) { if (!x) return; if (x.filename) files.push(x.filename); (x.parts || []).forEach(walk); })(m.payload);
          if (files.some((f) => /quote/i.test(f)) || (pj.quote && String(H.subject || "").indexOf(String(pj.quote)) >= 0)) { await fs.doc("projects/" + pj.id).set({ quoteSentAt: at, quoteSentTo: others.join(", ").slice(0, 200) }, { merge: true }); pj.quoteSentAt = at; } }
        await fs.doc("activity/" + xid).set({ id: xid, recType: pj ? "project" : "account", recId: String(pj ? pj.id : aid), accountId: String(aid), kind: "note", type: "email", direction: dir, subject: String(H.subject || "").slice(0, 200),
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
  // opened: one Activity line the first time the customer opens the link
  const srAll = await docsOf("signreq", fs.collection("signreq").where("status", "in", ["sent", "signed", "declined"]));
  for (const d of srAll.filter((x) => x.data().status === "sent")) { const r = d.data(); if (!r.viewedAt || r.viewLogged) continue;
    const xid = "sv_" + d.id.slice(0, 20);
    await fs.doc("activity/" + xid).set({ id: xid, recType: "project", recId: String(r.projectId), kind: "note", type: "note", subject: (r.kind === "proof" ? "Proof" : "Quote " + (r.quoteNo || "")) + " opened by the customer",
      text: "The signature link was opened" + (r.contactName ? " (sent to " + r.contactName + ")" : "") + ".", whoId: "", who: "Sign", when: mtDay(r.viewedAt), at: r.viewedAt, done: true, deleted: false, noBack: true }, { merge: true });
    // …and the person who sent it, and the owner, are told right away (bell + email) — they decide when to follow up
    { const what = (r.kind === "proof" ? "Proof rev " + (r.proofRev || 1) : r.kind === "both" ? "Quote " + (r.quoteNo || "") + " + proof" : "Quote " + (r.quoteNo || "")) + " " + (r.pnum || "") + " was opened by " + (r.contactName || r.customer || "the customer");
      const tm = (await docsOf("all_team", fs.collection("team"))).map((x) => Object.assign({ id: x.id }, x.data())).filter((t) => !t.deleted && (t.id === r.createdById || (t.access || "owner") === "owner"));
      for (const t of tm) { const nid = "nt_view_" + d.id.slice(0, 12) + "_" + t.id.slice(0, 8);
        await fs.doc("notifications/" + nid).set({ id: nid, toId: t.id, fromId: "", fromName: "Viewed", kind: "viewed", text: what + " — " + new Date(r.viewedAt).toLocaleString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " MT",
          link: "project/" + r.projectId, at: Number(r.viewedAt) || Date.now(), read: false, deleted: false }); }
      const tos = [...new Set(tm.map((t) => String(t.email || "").toLowerCase()).filter(isOurs))];
      if (tos.length && Date.now() - Number(r.viewedAt) < 3 * 864e5) await fs.collection("mail").add({ to: tos, status: "queued", kind: "notice", at: Date.now(),
        message: { subject: what, text: what + " (" + new Date(r.viewedAt).toLocaleString("en-US", { timeZone: "America/Denver", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " MT).\n\nOpen the project: https://crm.streetsignsupply.com/#/project/" + r.projectId } });
      n.viewed = (n.viewed || 0) + 1; }
    await d.ref.set({ viewLogged: true }, { merge: true }); }
  // ---- 3. signature links that were signed or turned down: tell the person who sent them ----
  const sigs = srAll.filter((d) => ["signed", "declined"].indexOf(d.data().status) >= 0 && !d.data().notified);
  for (const d of sigs) {
    const r = d.data(); const tm = r.createdById ? (await fs.doc("team/" + r.createdById).get()).data() : null; const now = Date.now();
    const kindL = r.kind === "both" ? "Quote " + (r.quoteNo || "") + " + proof rev " + (r.proofRev || 1) : r.kind === "proof" ? "Proof rev " + (r.proofRev || 1) : "Quote " + (r.quoteNo || "");
    const flagged = (r.pieces || []).filter((x) => x && x.ok === false).map((x) => "• " + (((r.arts || [])[x.i] || {}).cap || "Artwork " + (x.i + 1)) + (x.note ? " — " + x.note : "")).join("\n");
    const what = kindL + " " + (r.status === "signed" ? "signed" : "— changes asked for") + ": " + (r.pnum || "") + " by " + (r.signedName || "the customer");
    const body = what + (flagged ? "\n\nArtwork that needs a change:\n" + flagged : "") + (r.po ? "\n\nTheir PO: " + r.po : "") + (r.note ? "\n\nTheir note: " + r.note : "") + "\n\nOpen it: https://crm.streetsignsupply.com/#/project/" + r.projectId;
    // the person who sent the link and the owner both hear about it (bell + email)
    const owners = (await docsOf("all_team", fs.collection("team"))).map((x) => Object.assign({ id: x.id }, x.data())).filter((t) => !t.deleted && (t.id === r.createdById || (t.access || "owner") === "owner"));
    for (const t of owners) { const nid = "nt_sig_" + d.id.slice(0, 12) + "_" + t.id.slice(0, 8);
      await fs.doc("notifications/" + nid).set({ id: nid, toId: t.id, fromId: "", fromName: "Signature", kind: "sign", text: what + (flagged ? " — artwork changes asked for" : "") + (r.note ? " — “" + String(r.note).slice(0, 200) + "”" : ""),
        link: "project/" + r.projectId, at: now, read: false, deleted: false }); }
    const tos = [...new Set(owners.map((t) => String(t.email || "").toLowerCase()).filter(isOurs))];
    if (tos.length) await fs.collection("mail").add({ to: tos, status: "queued", kind: "notice", at: now, message: { subject: what, text: body } });
    const xid = "sg_" + d.id.slice(0, 20);
    await fs.doc("activity/" + xid).set({ id: xid, recType: "project", recId: String(r.projectId), kind: "note", type: "note", subject: what, text: body.replace(/\n\nOpen it:.*$/s, "").replace(/^[^\n]*\n*/, "") || what,
      whoId: "", who: "Sign", when: new Date(r.signedAt || now).toLocaleDateString("en-CA", { timeZone: "America/Denver" }), at: r.signedAt || now, done: true, deleted: false, noBack: true }, { merge: true });
    // the signed copy goes into the project's Files as a PDF (quote, artwork and signature page), or as a link if the PDF can't be made
    let filed = !!r.filed;
    if (r.status === "signed" && !filed) { const pd = (await fs.doc("projects/" + r.projectId).get()).data() || {}; const fid = "f_sig_" + d.id.slice(0, 16);
      const base = String(brand.signBase || "https://ssc-crm-a7224.web.app/sign.html"), view = base + "?t=" + d.id + "&view=1";
      const nm = (r.kind === "both" ? "Signed quote " + (r.quoteNo || "") + " + proof rev " + (r.proofRev || 1) : r.kind === "proof" ? "Signed proof rev " + (r.proofRev || 1) : "Signed quote " + (r.quoteNo || "")) + " — " + (r.signedName || "") + " — " + mtDay(r.signedAt || now);
      let url = view, link = true, size = 0, type = "text/html";
      try { const pdf = await signedPdf(view); if (pdf && pdf.length > 1000) { url = await toStorage("signed/" + d.id + ".pdf", pdf, "application/pdf"); link = false; size = pdf.length; type = "application/pdf"; } } catch (e) { say("signed pdf: " + String(e.message || e).slice(0, 100)); }
      await fs.doc("files/" + fid).set({ id: fid, url, link, size, type, name: nm + (link ? "" : ".pdf"), cat: r.kind === "proof" ? "Signed proof" : "Signed quote", who: "Sign", needsCheck: !link, verified: false,
        when: new Date(now).toLocaleString("en-US", { timeZone: "America/Denver" }), at: now, deleted: false, accountId: pd.accountId || "", projectId: r.projectId, jobId: "" }, { merge: true }); filed = true; }
    await d.ref.set({ notified: true, notifiedAt: now, filed }, { merge: true }); n.signs++;
  }

}
// tasks: a 7 AM (Mountain) email to each person with what's due today and overdue, and one email when a task goes overdue
// (to the person it's for and whoever assigned it)
const mtDay = (ms) => new Date(ms).toLocaleDateString("en-CA", { timeZone: "America/Denver" });
const mtHour = () => Number(new Date().toLocaleString("en-US", { timeZone: "America/Denver", hour: "numeric", hour12: false }));
async function taskMail() {
  const today = mtDay(Date.now()); const syncRef = fs.doc("settings/mailsync"); const sy = (await syncRef.get()).data() || {};
  const tasks = (await docsOf("tasks", fs.collection("activity").where("kind", "==", "task"))).map((d) => Object.assign({ _ref: d.ref, id: d.id }, d.data())).filter((t) => !t.done && !t.deleted);
  const team = (await docsOf("all_team", fs.collection("team"))).map((d) => Object.assign({ id: d.id }, d.data())).filter((t) => !t.deleted && isOurs(t.email));
  const mine = (t, a) => a.assigneeId ? a.assigneeId === t.id : a.whoId ? a.whoId === t.id : String(a.who || "").toUpperCase() === String(t.initials || "").toUpperCase();
  const link = (a) => "https://crm.streetsignsupply.com/#/" + (a.recType === "project" ? "project/" : a.recType === "job" ? "job/" : a.recType === "contact" ? "contact/" : "account/") + a.recId;
  const line = (a) => "• " + String(a.text || "").slice(0, 140) + (a.due ? " (due " + a.due + ")" : "") + "\n  " + link(a);
  // assignment notices: the bell for every task given to someone, once per assignment (reassigning sends a new one). Tasks older than two days are marked quietly.
  const allTeam = (await docsOf("all_team", fs.collection("team"))).map((d) => Object.assign({ id: d.id }, d.data())).filter((t) => !t.deleted);
  const bells = (await docsOf("bells", fs.collection("notifications").where("kind", "==", "task-assigned"))).map((d) => d.data());
  const recPath = (a) => (a.recType === "project" ? "project/" : a.recType === "job" ? "job/" : a.recType === "contact" ? "contact/" : "account/") + a.recId;
  for (const a of tasks.filter((x) => x.assigneeId && (Number(x.assignNoticed) || 0) < (Number(x.assignedAt) || Number(x.at) || 1))) {
    const when = Number(a.assignedAt) || Number(a.at) || 0;
    if (when < Date.now() - 2 * 864e5) { await a._ref.set({ assignNoticed: Date.now() }, { merge: true }); continue; }
    const who = allTeam.find((t) => t.id === a.assigneeId); if (!who) { await a._ref.set({ assignNoticed: Date.now() }, { merge: true }); continue; }
    const txt = String(a.text || "").slice(0, 300) + (a.due ? " — due " + a.due : "");
    if (!bells.some((n) => n.taskId === a.id && n.toId === who.id && (Number(n.at) || 0) >= when - 120000)) {
      const nid = "nt" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await fs.doc("notifications/" + nid).set({ id: nid, toId: who.id, fromId: a.assignedById || "", fromName: a.assignedByName || "the CRM", kind: "task-assigned", text: txt, link: recPath(a), taskId: a.id, at: Date.now(), read: false, deleted: false });
      n.bell = (n.bell || 0) + 1; }
    // the email goes only for a task a person gave someone else (not their own, not the CRM's automatic ones), not to anyone
    // who switched task emails off, and at most 5 a person each day — the bell and the 7 AM list carry the rest
    // today's count is kept in settings/mailsync, so restarting the worker doesn't reset it
    taskMail.sent = taskMail.sent || ((sy.taskSent && sy.taskSent.day === today) ? Object.assign({}, sy.taskSent.n || {}) : {}); const capK = who.id + ":" + today;
    if (isOurs(who.email) && a.assignedById && a.assignedById !== who.id && !a.auto && who.taskMail !== false && (taskMail.sent[capK] || 0) < 5) {
      taskMail.sent[capK] = (taskMail.sent[capK] || 0) + 1; await syncRef.set({ taskSent: { day: today, n: taskMail.sent } }, { merge: true });
      await fs.collection("mail").add({ to: [who.email], status: "queued", kind: "notice", at: Date.now(), message: { subject: "Task for you: " + String(a.text || "").slice(0, 70),
        text: txt + "\n\nFrom " + (a.assignedByName || "the CRM") + "\n\nOpen it: " + link(a) + "\nAll your tasks: https://crm.streetsignsupply.com/#/tasks" } });
      n.assignMail = (n.assignMail || 0) + 1; }
    await a._ref.set({ assignNoticed: Date.now() }, { merge: true }); }
  if (mtHour() >= 7 && sy.digestDay !== today) {
    for (const t of team.filter((x) => x.taskMail !== false)) { const due = tasks.filter((a) => mine(t, a) && a.due && a.due <= today); if (!due.length) continue;
      const over = due.filter((a) => a.due < today), now0 = due.filter((a) => a.due === today);
      await fs.collection("mail").add({ to: [t.email], status: "queued", kind: "notice", at: Date.now(), message: { subject: "Your tasks today — " + now0.length + " due" + (over.length ? ", " + over.length + " overdue" : ""),
        text: (over.length ? "Overdue:\n" + over.map(line).join("\n") + "\n\n" : "") + (now0.length ? "Due today:\n" + now0.map(line).join("\n") + "\n\n" : "") + "All your tasks: https://crm.streetsignsupply.com/#/tasks" } }); n.digest = (n.digest || 0) + 1; }
    await syncRef.set({ digestDay: today }, { merge: true }); }
  for (const a of tasks.filter((x) => x.due && x.due < today && !x.overdueNotified)) {
    // long-overdue ones from before this existed are marked quietly (no flood of emails the first time)
    if (a.due < mtDay(Date.now() - 3 * 864e5)) { await a._ref.set({ overdueNotified: Date.now() }, { merge: true }); continue; }
    const to = [...new Set(team.filter((t) => mine(t, a) || t.id === a.assignedById).map((t) => t.email))];
    if (to.length) await fs.collection("mail").add({ to, status: "queued", kind: "notice", at: Date.now(), message: { subject: "Overdue task: " + String(a.text || "").slice(0, 70),
      text: "This task was due " + a.due + " and isn't done yet" + (a.assigneeName ? " (assigned to " + a.assigneeName + ")" : "") + ":\n\n" + line(a) } });
    await a._ref.set({ overdueNotified: Date.now() }, { merge: true }); n.overdue = (n.overdue || 0) + 1; }
}
// AI drafts for the website's compose screen, written with GitHub's free AI models (the workflow's own token — no key,
// no bill; GitHub limits it to a modest number a day, plenty for a shop). Checked every few seconds while the worker waits.
const GH = process.env.GH_TOKEN || "";
// every call to an AI service gives up after 25 seconds, so one slow model can't hold up the draft — the next one is tried
const fetchT = (url, opt, ms = 25000) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms); return fetch(url, Object.assign({}, opt, { signal: c.signal })).finally(() => clearTimeout(t)); };
async function aiDrafts() {
  let k = 0;
  const q = (await docsOf("aiq", fs.collection("aidraft").where("status", "==", "queued"))).slice(0, 5);
  aiDrafts.done = aiDrafts.done || new Set();
  // each request is worked on at the same time, so one slow draft never makes another wait
  await Promise.all(q.map(async (d) => { if (aiDrafts.done.has(d.id)) return; aiDrafts.done.add(d.id); const r = d.data(); k++; const tA = Date.now();
    // the email window stops waiting after 2 minutes — an older request is closed instead of spending the free allowance on it
    if (Date.now() - (Number(r.at) || 0) > 3 * 60000) { await d.ref.set({ status: "failed", err: "asked too long ago", doneAt: Date.now() }, { merge: true }); say("AI draft: skipped one asked over 3 minutes ago"); return; }
    try {
      const RULES = "Write a short, plain business email a real person at a small sign shop would send — friendly, direct, no hype, no exclamation marks, no AI-sounding phrases (no 'I hope this finds you well', no 'delighted', no 'don't hesitate'). "
        + (r.sig ? "End with just \"Thanks,\" on its own line — the sender's email signature (name, company, phone) is added automatically, so don't write them." : "Sign off with the sender's first name and the company.")
        + " Keep any link exactly as given, on its own line.";
      const msgs = [{ role: "system", content: RULES + " Reply with JSON only: {\"subject\":\"...\",\"body\":\"...\"}." },
        { role: "user", content: "What to say: " + (r.ask || (String(r.draft || "").replace(/\s+/g, " ").trim().split(" ").length > 12 ? "(rewrite the draft below so it reads like a real person wrote it — keep every fact, number and link, change the wording)" : "(use the subject and context)")) + "\nSubject so far: " + (r.subject || "") + "\nDraft so far:\n" + (r.draft || "") + "\n\nContext:\n" + (r.ctx || "") }];
      // each model is tried in turn until one sends back an email; the answer is read whatever shape it comes in
      const pick = (txt) => { const t = String(txt || "").trim(); if (!t) return null; let j = null;
        try { j = JSON.parse(t.replace(/^```(?:json)?\s*|\s*```$/g, "")); } catch (e) { const m = t.match(/\{[\s\S]*\}/); if (m) { try { j = JSON.parse(m[0]); } catch (e2) {} } }
        if (j && typeof j === "object") { const k = (n) => Object.keys(j).find((x) => x.toLowerCase() === n);
          const body = j[k("body")] || j[k("email")] || j[k("message")] || j[k("text")] || j[k("content")] || "";
          if (String(body).trim()) return { subject: String(j[k("subject")] || ""), body: String(body) }; return null; }
        return { subject: "", body: t }; };
      // Google's free Gemini first (key saved in Settings → settings/secrets)
      let o = null, err = "";
      if (!aiDrafts.sec || Date.now() - aiDrafts.secAt > 5 * 60000) { aiDrafts.sec = (await fs.doc("settings/secrets").get()).data() || {}; aiDrafts.secAt = Date.now(); }
      const sec = aiDrafts.sec; const gk = String(sec.geminiKey || "");
      // which Gemini models this key can use right now (Google retires names) — asked once a run, newest flash model first
      if (gk && !globalThis.__gmList) { try { const lr = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": gk } });
        const lj = await lr.json().catch(() => ({})); const ok = (lj.models || []).filter((m) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m) => String(m.name || "").replace(/^models\//, ""));
        const flash = ok.filter((n) => /flash/i.test(n) && !/image|tts|audio|live|thinking|exp|preview|lite/i.test(n)).sort((x, y) => (y.match(/\d+(\.\d+)?/) || [0])[0] - (x.match(/\d+(\.\d+)?/) || [0])[0]);
        // the quick "lite" models first (fastest, biggest free allowance — a short email doesn't need more), then flash
        const lite = ok.filter((n) => /flash/i.test(n) && /lite/i.test(n) && !/image|tts|audio|live|preview|exp/i.test(n)).sort((x, y) => (y.match(/\d+(\.\d+)?/) || [0])[0] - (x.match(/\d+(\.\d+)?/) || [0])[0]);
        globalThis.__gmList = [...new Set(["gemini-flash-lite-latest"].filter((n) => ok.includes(n)).concat(lite.slice(0, 2), ["gemini-flash-latest"].filter((n) => ok.includes(n)), flash.slice(0, 2), ["gemini-2.5-flash"]))].slice(0, 6);
        say("Gemini models available: " + globalThis.__gmList.join(", ")); } catch (e) { globalThis.__gmList = ["gemini-flash-latest", "gemini-2.5-flash"]; } }
      const errs = [];
      // at most 3 attempts; a model that just said "over the free quota" (429) is skipped for 10 minutes, and one that said
      // "too busy" (503) for 2 minutes, so the next model (each has its own free allowance) gets the request instead
      globalThis.__gm429 = globalThis.__gm429 || {};
      const gmTry = (globalThis.__gmList || ["gemini-flash-latest", "gemini-2.5-flash"]).filter((m) => !(Date.now() < (globalThis.__gm429[m] || 0))).slice(0, 3);
      if (gk && !gmTry.length) err = "Google's free AI allowance is used up for now — try again in a few minutes";
      // the AI check (made-up "fix-run" person only) can ask for the backup service, to prove it works
      const backupTest = r.via === "github" && r.byId === "fix-run";
      if (gk && !backupTest) for (const gm of gmTry) {
        try {
          const x = await fetchT("https://generativelanguage.googleapis.com/v1beta/models/" + gm + ":generateContent", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": gk },
            body: JSON.stringify({ systemInstruction: { parts: [{ text: msgs[0].content }] }, contents: [{ role: "user", parts: [{ text: msgs[1].content }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 1200, responseMimeType: "application/json" } }) });
          const raw = await x.text().catch(() => ""); let j = {}; try { j = JSON.parse(raw); } catch (e) {}
          if (x.status === 429) globalThis.__gm429[gm] = Date.now() + 600000; else if (x.status === 503) globalThis.__gm429[gm] = Date.now() + 120000;
          if (!x.ok) { errs.push(gm + " " + x.status + " " + String((j.error || {}).message || "").slice(0, 70)); err = errs.join(" | "); if (x.status === 403) break; continue; }
          const txt = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map((p) => p.text || "").join("");
          const t = String(txt || "").trim(); if (!t) { errs.push(gm + " sent back nothing"); err = errs.join(" | "); continue; }
          const pk = pick(t); if (!pk || pk.body === t) { errs.push(gm + " didn't send back an email"); err = errs.join(" | "); continue; }
          o = pk; break;
        } catch (e) { errs.push(gm + " " + (e.name === "AbortError" ? "took over 25s" : String(e.message || e).slice(0, 80))); err = errs.join(" | "); } }
      // GitHub's free AI models next (the workflow's own token, no key, no bill) — used when Gemini has no key, is over its
      // free allowance, or fails, so a draft still comes back
      let via = o ? "gemini" : "";
      if (!o && GH) for (const gm of ["openai/gpt-4.1-mini", "openai/gpt-4o-mini", "meta/llama-3.3-70b-instruct"]) {
        if (Date.now() < ((globalThis.__gh429 || {})[gm] || 0)) continue;
        try {
          const x = await fetchT("https://models.github.ai/inference/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + GH, Accept: "application/vnd.github+json" },
            body: JSON.stringify(Object.assign({ model: gm, messages: msgs, temperature: 0.5, max_tokens: 1200 }, /^openai\//.test(gm) ? { response_format: { type: "json_object" } } : {})) });
          const raw = await x.text().catch(() => ""); let j = {}; try { j = JSON.parse(raw); } catch (e) {}
          if (x.status === 429) { globalThis.__gh429 = globalThis.__gh429 || {}; globalThis.__gh429[gm] = Date.now() + 600000; }
          if (!x.ok) { errs.push("github " + gm + " " + x.status + " " + String((j.error || {}).message || j.message || raw).replace(/\s+/g, " ").slice(0, 90)); err = errs.join(" | "); continue; }
          // the service can answer as JSON (choices[0].message.content) or as the plain text of the reply — both are read
          const t = String(((((j.choices || [])[0] || {}).message || {}).content) || (j && j.choices ? "" : raw) || "").trim(); if (!t) { errs.push(gm + " sent back nothing (" + String(((j.choices || [])[0] || {}).finish_reason || "") + ")"); err = errs.join(" | "); continue; }
          const pk = pick(t); if (!pk || !String(pk.body || "").trim()) { errs.push(gm + " didn't send back an email"); err = errs.join(" | "); continue; }
          o = pk; via = "github " + gm; break;
        } catch (e) { errs.push(gm + " " + (e.name === "AbortError" ? "took over 25s" : String(e.message || e).slice(0, 80))); err = errs.join(" | "); } }
      if (!o && !gk && !GH) err = "no Gemini key — add the free key in Settings → Write it with AI";
      if (!o) throw new Error(err || "no answer");
      say("AI draft: done in " + Math.round((Date.now() - tA) / 1000) + "s via " + (via || "gemini") + (errs.length ? " after: " + errs.join(" | ").slice(0, 300) : ""));
      // the email always opens with the person's first name (any service can forget it)
      { const fn = (String(r.ctx || "").match(/start with "Hi ([^",]+),"/) || [])[1]; const first = String(o.body).trim().split(/\n/)[0] || "";
        if (fn && !new RegExp("\\b" + fn.replace(/[^A-Za-z'-]/g, "") + "\\b", "i").test(first)) o.body = "Hi " + fn + ",\n\n" + String(o.body).trim().replace(/^(hi|hello|hey|dear)\b[^\n]*\n+/i, ""); }
      await d.ref.set({ status: "done", subject: String(o.subject || r.subject || "").slice(0, 200), body: String(o.body).slice(0, 5000), doneAt: Date.now() }, { merge: true }); n.ai = (n.ai || 0) + 1;
    } catch (e) { await d.ref.set({ status: "failed", err: "no AI service answered — " + String(e.message || e).slice(0, 140), doneAt: Date.now() }, { merge: true }); n.aiErr = (n.aiErr || 0) + 1; say("AI draft failed after " + Math.round((Date.now() - tA) / 1000) + "s: " + String(e.message || e).slice(0, 400)); }
  }));
  return k;
}
async function waitAndDraft(ms) { const end = Date.now() + ms; while (Date.now() < end) { try { await aiDrafts(); } catch (e) {} await new Promise((r) => setTimeout(r, 4000)); } }

// one job runs for most of a day's quarter: every minute it sends what's queued and follows up signatures, and every
// 10 minutes it reads Gmail — so an email goes out within about a minute of pressing Send (the schedule starts the next one)
const LOOP_MIN = Number(process.env.LOOP_MIN) || 0, t0 = Date.now(); let pass = 0;
// AI drafts don't wait for a pass to finish: they're checked every 3 seconds the whole time the worker runs
// once at start: does each backup AI model answer? (status only — no text is printed)
if (LOOP_MIN) (async () => { if (!GH) return say("AI backup check: no GitHub token");
  for (const m of ["openai/gpt-4.1-mini", "openai/gpt-4o-mini", "meta/llama-3.3-70b-instruct"]) { try {
    const x = await fetchT("https://models.github.ai/inference/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + GH, Accept: "application/vnd.github+json" },
      body: JSON.stringify({ model: m, messages: [{ role: "user", content: "Reply with the word OK" }], max_tokens: 10 }) });
    const raw = await x.text().catch(() => ""); let j = {}; try { j = JSON.parse(raw); } catch (e) {} const c = String(((((j.choices || [])[0] || {}).message || {}).content) || (j && j.choices ? "" : raw) || "").trim();
    say("AI backup check: " + m + " → " + x.status + (c ? " answered" : " no answer — " + raw.replace(/\s+/g, " ").slice(0, 120)));
  } catch (e) { say("AI backup check: " + m + " → " + (e.name === "AbortError" ? "over 25s" : String(e.message || e).slice(0, 60))); } } })();
let aiBusy = false; const aiTimer = LOOP_MIN ? setInterval(async () => { if (aiBusy) return; aiBusy = true; try { await aiDrafts(); } catch (e) {} aiBusy = false; }, 3000) : null;
do {
  try { await signFollow(); if (pass % 5 === 0) await taskMail().catch((e) => say("task mail: " + String(e.message || e).slice(0, 100))); await sendQueued(); if (pass % 3 === 0) await verifyFiles().catch((e) => say("file check: " + String(e.message || e).slice(0, 80))); if (pass % 10 === 0) await logGmail(); } catch (e) { say("pass error: " + String(e.message || e).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<email>").slice(0, 140)); }
  pass++;
  if (LOOP_MIN && Date.now() - t0 < LOOP_MIN * 60000) await new Promise((r) => setTimeout(r, 60000)); else await aiDrafts().catch(() => {});
} while (LOOP_MIN && Date.now() - t0 < LOOP_MIN * 60000);
if (aiTimer) clearInterval(aiTimer);
note("mail: " + pass + " passes — " + n.sent + " sent, " + n.failed + " didn't send, " + n.logged + " customer emails logged" + (n.userErr ? " (" + n.userErr + " inbox reads failed: " + JSON.stringify(errKinds) + ")" : "") + ", " + n.signs + " signature updates, " + (n.digest || 0) + " task digests, " + (n.overdue || 0) + " overdue notices, " + (n.ai || 0) + " AI drafts" + (n.aiErr ? " (" + n.aiErr + " failed)" : "") + ", " + (n.sigs || 0) + " Gmail signatures found");
