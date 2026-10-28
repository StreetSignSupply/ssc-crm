// Matt 10/28: "remove all the ones that have not been contacted" — only contacted accounts belong in the CRM;
// prospects live on the SSS Pipeline sheet (Prospects tab). Archived (recycle bin), not erased: restoring an account
// from Archive brings its contacts and notes back with it. Kept: any project, logged email/call/meeting/text, calendar
// event, file, a note written by a person, or an account a person created (not the agents' feed).
(async (T) => {
  const S = T.S, live = T.live, now = Date.now();
  const CONTACT = /^(email|call|meeting|text|sms|visit|voicemail)$/i;
  const projByAcct = {}; live(S.projects).forEach(p => { (projByAcct[p.accountId] = projByAcct[p.accountId] || []).push(p.id) });
  const acts = live(S.activity), evs = live(S.events || new Map()), files = live(S.files || new Map());
  const out = { accounts: 0, kept: 0, archived: 0, contacts: 0, notes: 0, feedIdsBlocked: 0 };
  const feedIds = [];
  for (const a of live(S.accounts)) {
    out.accounts++;
    const pids = projByAcct[a.id] || [];
    const mine = acts.filter(x => (x.recType === "account" && x.recId === a.id) || (x.recType === "project" && pids.includes(x.recId)));
    const keep = pids.length || mine.some(x => CONTACT.test(x.type || "")) || evs.some(e => e.accountId === a.id)
      || files.some(f => f.accountId === a.id) || mine.some(x => x.who && x.who !== "AI") || !a.feedId;
    if (keep) { out.kept++; continue }
    const tag = "account:" + a.id;
    await T.fix("accounts/" + a.id, { deleted: true, deletedAt: now, deletedBy: "MJ", deletedWith: "", updatedAt: now },
      "Archived — never contacted (Matt 10/28: only contacted accounts stay in the CRM; the prospect stays on the SSS Pipeline sheet)");
    if (a.feedId) feedIds.push(String(a.feedId));
    for (const c of live(S.contacts).filter(c => c.accountId === a.id)) {
      await T.push("contacts/" + c.id, { deleted: true, deletedAt: now, deletedBy: "MJ", deletedWith: tag, updatedAt: now }); out.contacts++ }
    for (const x of mine) {
      await T.push("activity/" + x.id, { deleted: true, deletedAt: now, deletedBy: "MJ", deletedWith: tag, updatedAt: now }); out.notes++;
      if (x.feedId) feedIds.push(String(x.feedId)) }
    out.archived++;
  }
  // the sheet feed must not bring them back: mark their feed rows done
  const d = await T.getDb().doc("settings/pipefeed").get();
  const ok = d && (typeof d.exists === "function" ? d.exists() : d.exists);
  const done = Object.assign({}, (ok && d.data() && d.data().done) || {});
  feedIds.forEach(k => { if (!done[k]) { done[k] = 1; out.feedIdsBlocked++ } });
  await T.push("settings/pipefeed", { done, updatedAt: Date.now() });
  return out;
})
