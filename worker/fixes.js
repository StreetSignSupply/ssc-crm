// One-time (Matt, 1 Nov): fill in the account each existing project started on (origAccountId), so moving a project onto a
// "doesn't use POs / doesn't need an invoice" account can't skip the close-out paperwork. Where a project's change history
// shows its account was changed, the first account it had is used; otherwise its account now. Counts only.
(async (T) => {
  const S = T.S, out = { projects: 0, filled: 0, fromHistory: 0, already: 0, noAccount: 0 };
  T.histAll(); await new Promise((r) => setTimeout(r, 20000));
  const byName = new Map(); [...S.accounts.values()].forEach((a) => { const k = String(a.name || "").trim().toLowerCase(); if (k && !byName.has(k)) byName.set(k, a.id); });
  for (const p of [...S.projects.values()]) { out.projects++;
    if (p.origAccountId) { out.already++; continue; }
    if (!p.accountId) { out.noAccount++; continue; }
    const h = ((S.history.get("project_" + p.id) || {}).entries || []).filter((e) => e && /^account$/i.test(String(e.f || "")) && String(e.o || "").trim()).sort((a, b) => (a.t || 0) - (b.t || 0));
    let orig = p.accountId;
    if (h.length) { const o = String(h[0].o).trim(); const id = S.accounts.has(o) ? o : byName.get(o.toLowerCase()); if (id && id !== p.accountId) { orig = id; out.fromHistory++; } }
    await T.push("projects/" + p.id, { origAccountId: orig }); out.filled++; }
  return out;
})
