// Read-only: accounts NOT from the feed that have no contact at all, by day created and how they were made. Counts only.
(async (T) => {
  const S = T.S, live = T.live;
  const CONTACT = /^(email|call|meeting|text|sms|visit|voicemail)$/i;
  const projByAcct = {}; live(S.projects).forEach(p => { (projByAcct[p.accountId] = projByAcct[p.accountId] || []).push(p.id) });
  const wo = new Set(live(S.jobs).map(j => j.accountId)); const acts = live(S.activity);
  const out = { nonFeed: 0, nonFeedNoContact: 0, byDay: {}, keys: {}, createdBy: {} };
  for (const a of live(S.accounts)) { if (a.feedId) continue; out.nonFeed++;
    const pids = projByAcct[a.id] || []; const mine = acts.filter(x => (x.recType === "account" && x.recId === a.id) || (x.recType === "project" && pids.includes(x.recId)));
    if (pids.length || wo.has(a.id) || mine.some(x => CONTACT.test(x.type || "") || CONTACT.test(x.kind || ""))) continue;
    out.nonFeedNoContact++;
    const d = new Date(Number(a.createdAt) || 0).toISOString().slice(0, 10); out.byDay[d] = (out.byDay[d] || 0) + 1;
    Object.keys(a).forEach(k => out.keys[k] = (out.keys[k] || 0) + 1);
    const by = String(a.createdBy || a.by || a.addedBy || a.source || "?"); out.createdBy[by] = (out.createdBy[by] || 0) + 1;
    out.notesKinds = out.notesKinds || {}; mine.forEach(x => { const k = (x.type || x.kind || "?") + "/" + (x.who || "?"); out.notesKinds[k] = (out.notesKinds[k] || 0) + 1; });
  }
  return out;
})
