// Read-only check (Matt 10/28 12:07 PM: "the live CRM still shows the old accounts"). No writes; counts only.
(async (T) => {
  const S = T.S, live = T.live, arch = Date.parse("2026-10-28T15:27:00Z");
  const all = [...S.accounts.values()], L = live(S.accounts);
  const projByAcct = new Set(live(S.projects).map(p => p.accountId));
  const acts = live(S.activity);
  const contactAct = new Set(acts.filter(x => /^(email|call|meeting|text|sms|visit|voicemail)$/i.test(x.type || "")).flatMap(x => [x.recId, (S.projects.get(x.recId) || {}).accountId]));
  return {
    totalDocs: all.length, live: L.length, archived: all.filter(a => a.deleted).length,
    liveFromFeed: L.filter(a => a.feedId).length, liveManual: L.filter(a => !a.feedId).length,
    liveWithProject: L.filter(a => projByAcct.has(a.id)).length,
    liveWithLoggedContact: L.filter(a => contactAct.has(a.id)).length,
    liveNoProjectNoContact: L.filter(a => !projByAcct.has(a.id) && !contactAct.has(a.id)).length,
    liveChangedSinceArchive: L.filter(a => Number(a.updatedAt) > arch).length,
    liveCreatedSinceArchive: L.filter(a => Number(a.createdAt) > arch).length,
    liveRestored: L.filter(a => a.restoredAt).length,
    liveDeletedAtSet: L.filter(a => a.deletedAt).length,
    liveContacts: live(S.contacts).length,
  };
})
