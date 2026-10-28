// Read-only breakdown of the live accounts (Matt 10/28 12:07 PM). No writes; counts only.
(async (T) => {
  const S = T.S, live = T.live, L = live(S.accounts);
  const proj = new Set(live(S.projects).map(p => p.accountId));
  const wo = new Set(live(S.jobs).map(j => j.accountId));
  const acts = live(S.activity);
  const humanAct = new Set(acts.filter(x => x.who && x.who !== "AI" && x.who !== "auto" && !x.feedId).map(x => x.recType === "account" ? x.recId : (S.projects.get(x.recId) || {}).accountId));
  const agentMail = new Set(acts.filter(x => x.feedId || x.who === "AI").map(x => x.recType === "account" ? x.recId : (S.projects.get(x.recId) || {}).accountId));
  const src = {}; L.forEach(a => { const k = (a.feedId ? "feed:" : "crm:") + (a.source || "none"); src[k] = (src[k] || 0) + 1; });
  const day = {}; L.forEach(a => { const d = new Date(Number(a.createdAt) || 0).toISOString().slice(0, 10); day[d] = (day[d] || 0) + 1; });
  return { live: L.length, withProjectOrWO: L.filter(a => proj.has(a.id) || wo.has(a.id)).length,
    humanActivity: L.filter(a => humanAct.has(a.id)).length,
    onlyAgentEmails: L.filter(a => !proj.has(a.id) && !wo.has(a.id) && !humanAct.has(a.id) && agentMail.has(a.id)).length,
    nothingAtAll: L.filter(a => !proj.has(a.id) && !wo.has(a.id) && !humanAct.has(a.id) && !agentMail.has(a.id)).length,
    bySource: src, byCreatedDay: day };
})
