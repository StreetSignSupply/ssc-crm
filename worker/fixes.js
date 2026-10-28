// Matt 10/28: only accounts that have actually been contacted belong in the CRM; the rest live on the SSS Pipeline sheet (Prospects tab).
// DRY RUN — counts only, changes nothing.
(async (T) => {
  const S = T.S, live = T.live;
  const CONTACT = /^(email|call|meeting|text|sms|visit|voicemail)$/i;
  const projByAcct = {}; live(S.projects).forEach(p => { (projByAcct[p.accountId] = projByAcct[p.accountId] || []).push(p.id) });
  const acts = live(S.activity);
  const evs = live(S.events || new Map());
  const files = live(S.files || new Map());
  const out = { accounts: 0, keep: 0, remove: 0, why: {}, contactsOnRemoved: 0, removedWithHumanNotes: 0, removedNotFeed: 0 };
  const why = k => out.why[k] = (out.why[k] || 0) + 1;
  for (const a of live(S.accounts)) {
    out.accounts++;
    const pids = projByAcct[a.id] || [];
    const mine = acts.filter(x => (x.recType === "account" && x.recId === a.id) || (x.recType === "project" && pids.includes(x.recId)));
    let k = "";
    if (pids.length) k = "has project";
    else if (mine.some(x => CONTACT.test(x.type || ""))) k = "email/call logged";
    else if (evs.some(e => e.accountId === a.id)) k = "calendar event";
    else if (files.some(f => f.accountId === a.id)) k = "file";
    else if (mine.some(x => x.who && x.who !== "AI")) k = "note by a person";
    if (k) { out.keep++; why(k); continue }
    out.remove++;
    if (!a.feedId) out.removedNotFeed++;
    out.contactsOnRemoved += live(S.contacts).filter(c => c.accountId === a.id).length;
  }
  return out;
})
