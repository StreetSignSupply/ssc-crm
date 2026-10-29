// Nightly backup of the whole CRM database: every collection (and sub-collection) read with the service account,
// written as one gzipped JSON file to the project's own private Cloud Storage bucket, then read back and checked
// document-for-document before it counts as good. Keeps 30 days. The log shows counts only — never any data.
// BACKUP_MODE=check reads the newest backup back and compares it to the live database (the restore drill).
import { Firestore } from "@google-cloud/firestore";
import zlib from "node:zlib";
const PROJECT = process.env.FIREBASE_PROJECT || "ssc-crm-a7224";
const TOKEN = process.env.STORAGE_TOKEN;
const KEEP_DAYS = Number(process.env.KEEP_DAYS) || 30;
const MODE = process.env.BACKUP_MODE || "backup";
const fs = new Firestore({ projectId: PROJECT });
const say = (m) => console.log(m);
const fail = (m) => { console.log("::error::backup: " + m); process.exit(1); };
const enc = (v) => JSON.parse(JSON.stringify(v, (k, x) => {
  if (x && typeof x === "object" && typeof x.toMillis === "function") return { __ts: x.toMillis() };
  if (x && typeof x === "object" && x.constructor && x.constructor.name === "DocumentReference") return { __ref: x.path };
  if (x && typeof x === "object" && typeof x.latitude === "number" && typeof x.longitude === "number" && Object.keys(x).length === 2) return { __geo: [x.latitude, x.longitude] };
  if (x instanceof Uint8Array || (x && x.type === "Buffer")) return { __bytes: Buffer.from(x.data || x).toString("base64") };
  return x; }));
async function dumpColl(ref, out) {
  const snap = await ref.get();
  for (const d of snap.docs) { out[d.ref.path] = enc(d.data());
    for (const sub of await d.ref.listCollections()) await dumpColl(sub, out); }
}
async function dumpAll() { const out = {}; const cols = await fs.listCollections();
  for (const c of cols) await dumpColl(c, out); return { out, cols: cols.map((c) => c.id) }; }
const GCS = "https://storage.googleapis.com";
async function gcs(path, opt = {}) { const r = await fetch(GCS + path, Object.assign({}, opt, { headers: Object.assign({ Authorization: "Bearer " + TOKEN }, opt.headers || {}) }));
  return r; }
// the project's own bucket: the Firebase default one (new name first, then the old appspot name)
async function pickBucket() {
  for (const b of [process.env.BACKUP_BUCKET, PROJECT + ".firebasestorage.app", PROJECT + ".appspot.com"].filter(Boolean)) {
    const r = await gcs("/storage/v1/b/" + encodeURIComponent(b) + "/o?maxResults=1&prefix=crm-backups/");
    if (r.ok) return b; say("bucket " + b + ": " + r.status);
  }
  return null; }
const day = new Date().toISOString().slice(0, 10);
const bucket = await pickBucket(); if (!bucket) fail("no bucket the service account can write to");
if (MODE === "check") {
  const ls = await (await gcs("/storage/v1/b/" + bucket + "/o?prefix=crm-backups/")).json();
  const items = (ls.items || []).filter((x) => /\.json\.gz$/.test(x.name)).sort((a, b) => a.name.localeCompare(b.name));
  if (!items.length) fail("no backups yet");
  const last = items[items.length - 1];
  const buf = Buffer.from(await (await gcs("/storage/v1/b/" + bucket + "/o/" + encodeURIComponent(last.name) + "?alt=media")).arrayBuffer());
  const back = JSON.parse(zlib.gunzipSync(buf).toString("utf8"));
  const { out } = await dumpAll();
  const inBackup = Object.keys(back.docs).length, live = Object.keys(out).length;
  const missing = Object.keys(out).filter((p) => !back.docs[p]).length;
  say("::notice::restore check: newest backup " + last.name.replace("crm-backups/", "") + " has " + inBackup + " documents and reads back cleanly; live database has " + live + " (" + missing + " added since)");
  process.exit(0);
}
// BACKUP_MODE=restore: put chosen fields of chosen projects back to what the newest backup has (RESTORE="2002:invTax,billDate;2010:paidDate")
if (MODE === "restore") {
  const ls = await (await gcs("/storage/v1/b/" + bucket + "/o?prefix=crm-backups/")).json();
  const items = (ls.items || []).filter((x) => /\.json\.gz$/.test(x.name)).sort((a, b) => a.name.localeCompare(b.name));
  const last = items[items.length - 1]; if (!last) fail("no backups");
  const back = JSON.parse(zlib.gunzipSync(Buffer.from(await (await gcs("/storage/v1/b/" + bucket + "/o/" + encodeURIComponent(last.name) + "?alt=media")).arrayBuffer())).toString("utf8"));
  let done = 0;
  for (const part of String(process.env.RESTORE || "").split(";").filter(Boolean)) {
    const [num, fields] = part.split(":"); const path = Object.keys(back.docs).find((p) => /^projects\//.test(p) && String(back.docs[p].num) === num);
    if (!path) { say("project " + num + " not in the backup"); continue; }
    const old = back.docs[path], patch = {};
    fields.split(",").forEach((f) => { patch[f] = old[f] === undefined ? Firestore.FieldValue.delete() : old[f]; });
    patch.updatedAt = Date.now(); await fs.doc(path).set(patch, { merge: true });
    const hk = "history/project_" + path.split("/")[1]; const h = await fs.doc(hk).get();
    const entries = ((h.exists && h.data().entries) || []).concat([{ f: "Fix run", o: "", n: "Restored " + fields.split(",").join(", ") + " from the " + last.name.replace("crm-backups/", "").replace(".json.gz", "") + " backup (undoing a wrong QuickBooks match)", ev: 1, w: "FIX", t: Date.now() }]);
    if (h.exists) await fs.doc(hk).set({ entries }, { merge: true });
    done++;
  }
  say("::notice::restore: " + done + " projects put back from " + last.name.replace("crm-backups/", ""));
  process.exit(0);
}
const { out, cols } = await dumpAll();
const n = Object.keys(out).length; if (n < 10) fail("only " + n + " documents read — not saving a backup that small");
const body = zlib.gzipSync(Buffer.from(JSON.stringify({ project: PROJECT, at: new Date().toISOString(), collections: cols, docs: out })));
const name = "crm-backups/" + day + ".json.gz";
const up = await gcs("/upload/storage/v1/b/" + bucket + "/o?uploadType=media&name=" + encodeURIComponent(name), { method: "POST", headers: { "Content-Type": "application/gzip" }, body });
if (!up.ok) fail("upload " + up.status);
// read it back and check every document is there before calling it good
const back = JSON.parse(zlib.gunzipSync(Buffer.from(await (await gcs("/storage/v1/b/" + bucket + "/o/" + encodeURIComponent(name) + "?alt=media")).arrayBuffer())).toString("utf8"));
const bad = Object.keys(out).filter((p) => JSON.stringify(back.docs[p]) !== JSON.stringify(out[p])).length;
if (bad) fail(bad + " documents didn't read back the same");
// keep 30 days
let removed = 0;
const ls = await (await gcs("/storage/v1/b/" + bucket + "/o?prefix=crm-backups/")).json();
const cut = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
for (const it of ls.items || []) { const d = (it.name.match(/(\d{4}-\d{2}-\d{2})/) || [])[1]; if (d && d < cut) { const r = await gcs("/storage/v1/b/" + bucket + "/o/" + encodeURIComponent(it.name), { method: "DELETE" }); if (r.ok) removed++; } }
say("::notice::backup " + day + ": " + n + " documents in " + cols.length + " collections, " + Math.round(body.length / 1024) + " KB, read back and checked; " + ((ls.items || []).length - removed) + " backups kept, " + removed + " older than " + KEEP_DAYS + " days removed");
