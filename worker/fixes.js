// Oct 30 look-only run #6 (live check of -90): nothing is changed. Signature requests and what followed them, P-2030's
// margins, the win rate, whether the test project is out of the forecast, sent-email states, task notices, WO 1019 and
// the lock state. Counts, states and labels only.
(async (T) => {
  const S = T.S, out = {}; const all = [...S.projects.values()];
  const ps = all.filter((p) => !p.deleted);
  out.sign = []; try { const snap = await T.getDb().collection("signreq").get(); (snap.docs || []).forEach((d) => { const r = d.data(); const p = S.projects.get(r.projectId) || {};
    out.sign.push({ k: r.kind, st: r.status, at: new Date(r.createdAt || 0).toISOString().slice(11, 16), notified: !!r.notified, filed: !!r.filed, won: !!r.wonSet, stage: p.stage || "?", pieces: (r.pieces || []).length, po: !!r.po }); }); } catch (e) { out.signErr = String(e.message).slice(0, 80); }
  out.sigFiles = [...S.files.values()].filter((f) => !f.deleted && /^Signed (quote|proof)/.test(f.cat || "")).map((f) => (f.link ? "link" : "pdf") + ":" + (f.type || ""));
  const p30 = ps.find((p) => String(p.num) === "2030");
  if (p30) { const c = T.costedMargin(p30); out.m30 = [Math.round(T.projMargin(p30)), c.uncostedLines]; out.p30test = T.real([p30]).length === 0; }
  out.win = T.winRate(T.real(ps), 180);
  const acts = [...S.activity.values()]; out.mailStates = {}; acts.filter((a) => a.sendState).forEach((a) => { out.mailStates[a.sendState] = (out.mailStates[a.sendState] || 0) + 1; });
  out.gmailLogged = acts.filter((a) => a.gmailId).length; out.gmailOnProject = acts.filter((a) => a.gmailId && a.recType === "project").length;
  out.notes = [...S.notifications.values()].reduce((o, x) => { o[x.kind || "?"] = (o[x.kind || "?"] || 0) + 1; return o; }, {});
  const j = S.jobs.get("1019"); out.wo1019 = j ? { deleted: !!j.deleted, archived: !!j.archived, status: j.status } : "missing";
  try { const L = await T.getDb().doc("settings/dbLock").get(); const d = L.data ? L.data() : L; out.lock = { state: d.state, available: !!d.available, applyPending: !!d.apply, note: String(d.note || "").slice(0, 80) }; } catch (e) {}
  return out;
})
