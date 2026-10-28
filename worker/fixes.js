// Matt 10/28 12:20 PM: "remove the ones that you added that have not been contacted, leave everything else".
// Archives (recycle bin, restorable) only accounts the agents added (came in through the sheet feed) that have
// no project, no work order, no logged email/call/meeting/text, no calendar event, no file and no note by a person.
// Their feed rows are marked done so the feed can't bring them back. Counts only.
(async (T) => {
  const S = T.S, live = T.live, now = Date.now();
  const CONTACT = /^(email|call|meeting|text|sms|visit|voicemail)$/i;
  const projByAcct = {}; live(S.projects).forEach(p => { (projByAcct[p.accountId] = projByAcct[p.accountId] || []).push(p.id) });
  const wo = new Set(live(S.jobs).map(j => j.accountId));
  const acts = live(S.activity), evs = live(S.events || new Map()), files = live(S.files || new Map());
  const out = { live: 0, agentAdded: 0, kept: 0, archived: 0, contacts: 0, notes: 0, feedIdsBlocked: 0 };
  const feedIds = [];
  for (const a of live(S.accounts)) {
    out.live++;
    if (!a.feedId) continue;                 // not added by the agents: leave it
    out.agentAdded++;
    const pids = projByAcct[a.id] || [];
    const mine = acts.filter(x => (x.recType === "account" && x.recId === a.id) || (x.recType === "project" && pids.includes(x.recId)));
    const contacted = pids.length || wo.has(a.id) || mine.some(x => CONTACT.test(x.type || "") || CONTACT.test(x.kind || ""))
      || evs.some(e => e.accountId === a.id) || files.some(f => f.accountId === a.id) || mine.some(x => x.who && x.who !== "AI" && !x.feedId);
    if (contacted) { out.kept++; continue }
    const tag = "account:" + a.id;
    await T.fix("accounts/" + a.id, { deleted: true, deletedAt: now, deletedBy: "MJ", deletedWith: "", updatedAt: now },
      "Archived — added by the agents and never contacted (Matt 10/28)");
    feedIds.push(String(a.feedId));
    for (const c of live(S.contacts).filter(c => c.accountId === a.id)) {
      await T.push("contacts/" + c.id, { deleted: true, deletedAt: now, deletedBy: "MJ", deletedWith: tag, updatedAt: now }); out.contacts++ }
    for (const x of mine) {
      await T.push("activity/" + x.id, { deleted: true, deletedAt: now, deletedBy: "MJ", deletedWith: tag, updatedAt: now }); out.notes++;
      if (x.feedId) feedIds.push(String(x.feedId)) }
    out.archived++;
  }
  const d = await T.getDb().doc("settings/pipefeed").get();
  const ok = d && (typeof d.exists === "function" ? d.exists() : d.exists);
  const done = Object.assign({}, (ok && d.data() && d.data().done) || {});
  feedIds.forEach(k => { if (!done[k]) { done[k] = 1; out.feedIdsBlocked++ } });
  if (out.feedIdsBlocked) await T.push("settings/pipefeed", { done, updatedAt: Date.now() });
  out.liveAfter = live(S.accounts).length - out.archived;
  return out;
})
