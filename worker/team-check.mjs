// Read-only: the team list and the access records, as levels only — team ids, roles and counts, no names or emails.
import { Firestore } from "@google-cloud/firestore";
const fs = new Firestore({ projectId: "ssc-crm-a7224" });
const team = (await fs.collection("team").get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const acc = (await fs.collection("access").get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const T = team.map((t) => ({ id: t.id, deleted: !!t.deleted, named: !!String(t.name || "").trim(), access: t.access === undefined ? "(none)" : t.access,
  companyMail: /@streetsignsupply\.com$/i.test(String(t.email || "")), signIns: [t.claudeId].concat(t.claudeIds || []).filter(Boolean).length, initials: String(t.initials || "").slice(0, 3),
  accessRecords: acc.filter((a) => a.teamId === t.id).map((a) => ({ kind: a.id.includes("@") ? "email" : "sign-in id", role: a.role, mail: !!a.mail, by: a.by || "CRM", at: a.updatedAt ? new Date(a.updatedAt).toISOString() : "" })),
  updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : "" }));
const orphans = acc.filter((a) => !team.some((t) => t.id === a.teamId)).map((a) => ({ kind: a.id.includes("@") ? "email" : "sign-in id", role: a.role, teamId: a.teamId }));
const lock = (await fs.doc("settings/dbLock").get()).data() || {};
console.log("::notice::team " + JSON.stringify(T));
console.log("::notice::orphans " + JSON.stringify(orphans) + " | lock state " + lock.state + " want " + lock.want + " noAddr " + lock.noAddr);
