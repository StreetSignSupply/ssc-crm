// Matt 10/28 12:20 PM: "remove the ones that you added that have not been contacted, leave everything else".
// The feed-added accounts were all contacted. This archives the agent-added accounts that came in another way:
// not from a QuickBooks invoice, created since the agents started (10/24), no project, work order, logged
// email/call/meeting/text, event or file, and no note except the agents' own (AI / Bob). Recycle bin, restorable.
(async (T) => {
  const S = T.S, live = T.live, now = Date.now(), since = Date.parse("2026-10-24T00:00:00-06:00");
  const CONTACT = /^(email|call|meeting|text|sms|visit|voicemail)$/i, AGENT = /^(AI|BD|auto)$/i;
  const projByAcct = {}; live(S.projects).forEach(p => { (projByAcct[p.accountId] = projByAcct[p.accountId] || []).push(p.id) });
  const wo = new Set(live(S.jobs).map(j => j.accountId));
  const acts = live(S.activity), evs = live(S.events || new Map()), files = live(S.files || new Map());
  const out = { live: 0, archived: 0, contacts: 0, notes: 0, keptOlder: 0, keptInvoice: 0 };
  for (const a of live(S.accounts)) {
    out.live++;
    const pids = projByAcct[a.id] || [];
    const mine = acts.filter(x => (x.recType === "account" && x.recId === a.id) || (x.recType === "project" && pids.includes(x.recId)));
    if (pids.length || wo.has(a.id) || mine.some(x => CONTACT.test(x.type || "") || CONTACT.test(x.kind || ""))
      || evs.some(e => e.accountId === a.id) || files.some(f => f.accountId === a.id) || mine.some(x => !AGENT.test(String(x.who || "AI")))) continue;
    if (/invoice/i.test(a.source || "")) { out.keptInvoice++; continue }
    if (!(Number(a.createdAt) >= since)) { out.keptOlder++; continue }
    const tag = "account:" + a.id;
    await T.fix("accounts/" + a.id, { deleted: true, deletedAt: now, deletedBy: "MJ", deletedWith: "", updatedAt: now },
      "Archived — added by the agents and never contacted (Matt 10/28)");
    for (const c of live(S.contacts).filter(c => c.accountId === a.id)) {
      await T.push("contacts/" + c.id, { deleted: true, deletedAt: now, deletedBy: "MJ", deletedWith: tag, updatedAt: now }); out.contacts++ }
    for (const x of mine) { await T.push("activity/" + x.id, { deleted: true, deletedAt: now, deletedBy: "MJ", deletedWith: tag, updatedAt: now }); out.notes++ }
    out.archived++;
  }
  out.liveAfter = out.live - out.archived;
  return out;
})
