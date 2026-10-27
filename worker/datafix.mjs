// One-time clean-up from the 10/27 CRM audit (Matt: "fix everything"). Runs once in GitHub Actions.
// Prints counts only — no customer data goes in the public log.
import { Firestore } from "@google-cloud/firestore";
const fs = new Firestore({ projectId: process.env.FIREBASE_PROJECT || "ssc-crm-a7224", ignoreUndefinedProperties: true });
const now = Date.now(), who = "audit fix 10/27";
const all = async (c) => (await fs.collection(c).get()).docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
const n = {};
const bump = (k) => (n[k] = (n[k] || 0) + 1);

const projects = await all("projects"), contacts = await all("contacts"), accounts = await all("accounts"), files = await all("files");

// 1. the Yonkers dry run: lost, follow-ups stopped
for (const p of projects.filter((p) => !p.deleted && String(p.num) === "2018")) {
  const fus = (p.followups || []).map((f) => (f.status === "planned" || f.status === "drafted" ? { ...f, status: "stopped" } : f));
  await p.ref.set({ stage: "lost", lostReason: "Dry run — the bid was never submitted", followups: fus, followStop: "dry run, not submitted",
    followAuto: false, updatedAt: now, fixedBy: who }, { merge: true });
  bump("p2018 closed as lost");
}
// 2. no agents any more: nothing sends follow-ups by itself
for (const p of projects.filter((p) => p.followAuto === true)) { await p.ref.set({ followAuto: false, updatedAt: now }, { merge: true }); bump("auto-send follow-ups turned off"); }

// "Troy Frandsentroy@alexander-asphalt.com" -> Troy Frandsen / troy@alexander-asphalt.com (only when it can be split with confidence)
function splitNameMail(nm) {
  const parts = nm.trim().split(/\s+/); if (parts.length < 2) return null;
  const tail = parts[parts.length - 1], at = tail.indexOf("@"); if (at < 2 || !/\.[a-z]{2,}$/i.test(tail)) return null;
  const first = parts[0].toLowerCase();
  for (let k = 1; k < at; k++) {
    const lastBit = tail.slice(0, k), local = tail.slice(k, at).toLowerCase();
    if (local === first || local.startsWith(first + ".") || local === (first[0] + lastBit).toLowerCase() || local === first + lastBit.toLowerCase())
      return { name: parts.slice(0, -1).concat(lastBit).join(" "), mail: (local + tail.slice(at)).toLowerCase() };
  }
  return null;
}
// 3. contact emails with extra text ("sales@bgrvco.com, me") and names with an email glued on
const EM = /[^\s@,;<>]+@[^\s@,;<>]+\.[a-z]{2,}/i;
for (const c of contacts.filter((c) => !c.deleted)) {
  const patch = {};
  if (c.email && !/^[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/i.test(String(c.email).trim())) {
    const m = String(c.email).match(EM); if (m) { patch.email = m[0].toLowerCase(); bump("emails cleaned"); }
  }
  const sp = splitNameMail(String(c.name || ""));
  if (sp) { patch.name = sp.name; if (!c.email && !patch.email) patch.email = sp.mail; bump("names split from emails"); }
  if (Object.keys(patch).length) await c.ref.set({ ...patch, updatedAt: now, fixedBy: who }, { merge: true });
}

// 4. accounts the agents created as tax-exempt with no certificate: taxable until the certificate is filed
for (const a of accounts.filter((a) => !a.deleted && a.exempt === true && !a.exemptExp && a.source)) {
  await a.ref.set({ exempt: false, certNeeded: true, updatedAt: now, fixedBy: who }, { merge: true }); bump("exempt removed (no certificate)");
}

// 5. P-2009: the quote PDF was filed twice as "Signed work order"
const p2009 = projects.find((p) => !p.deleted && String(p.num) === "2009");
if (p2009) {
  const qf = files.filter((f) => !f.deleted && String(f.projectId || "") === p2009.id && /quote/i.test(f.name || "") && /signed work order/i.test(f.cat || ""));
  for (let i = 0; i < qf.length; i++) {
    if (i === 0) { await qf[i].ref.set({ cat: "Quote", updatedAt: now, fixedBy: who }, { merge: true }); bump("p2009 quote re-filed as Quote"); }
    else { await qf[i].ref.set({ deleted: true, deletedAt: now, deletedBy: "audit fix", updatedAt: now }, { merge: true }); bump("p2009 duplicate to recycle bin"); }
  }
}
console.log("done:", JSON.stringify(n));
