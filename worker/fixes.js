// Second pass after the 6 PM recheck. Runs inside the live CRM; counts only in the output.
// send all
(async (T) => {
  const S = T.S, now = Date.now(), n = {};
  const bump = (k, v = 1) => (n[k] = (n[k] || 0) + v);
  const note = (rt, id, txt) => T.recordHistory(rt, id, [{ f: "Fix", o: "", n: txt + " (CRM recheck fix 10/27)", ev: 1 }]);
  // follow-ups planned to a contact with no email can never go out: stop them (P-2014 Yavapai and any others)
  for (const p of T.live(S.projects)) {
    const open = (p.followups || []).some((f) => f.status === "planned" || f.status === "drafted");
    if (!open || p.followStop) continue;
    const on = (p.contacts || []).map((x) => S.contacts.get(x)).filter((c) => c && !c.deleted);
    const c = on.find((c) => c.email) || T.contactsOf(p.accountId).find((c) => c.email);
    if (!c) { const fus = p.followups.map((f) => (f.status === "planned" || f.status === "drafted") ? Object.assign({}, f, { status: "stopped" }) : f);
      await T.push("projects/" + p.id, { followups: fus, followStop: "no contact with an email", updatedAt: now });
      await T.recordHistory("project", p.id, [{ f: "Follow-ups", o: "", n: "Stopped — nobody on the account has an email to send them to", ev: 1 }]); bump("follow-ups stopped (no email)"); }
  }
  // open tasks with nobody on them go to the owner
  const owner = T.live(S.team).find((t) => (t.access || "owner") === "owner" && /^mj$/i.test(t.initials || "")) || T.live(S.team).find((t) => (t.access || "owner") === "owner");
  if (owner) for (const a of T.live(S.activity).filter((x) => x.kind === "task" && !x.done && !x.whoId)) {
    await T.push("activity/" + a.id, { whoId: owner.id, who: owner.initials || "", updatedAt: now }); bump("tasks given an owner"); }
  // accounts still without a rep
  if (owner) { const L = T.live(S.accounts).filter((a) => !a.repId);
    for (let i = 0; i < L.length; i += 25) { await Promise.all(L.slice(i, i + 25).map((a) => T.push("accounts/" + a.id, { repId: owner.id, updatedAt: now }))); bump("accounts given a rep", Math.min(25, L.length - i)); } }
  // 8. contacts: an email used as the name, and notes in parentheses
  for (const c of T.live(S.contacts)) { const nm = String(c.name || "").trim(); const patch = {};
    if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(nm)) { patch.name = "General inbox"; if (!c.email) patch.email = nm.toLowerCase(); }
    const m = nm.match(/^(.+?)\s*\((post author|first name only|[^)]*only)\)$/i); if (m) { patch.name = m[1].trim(); patch.notes = [c.notes, m[2]].filter(Boolean).join(" — "); }
    if (Object.keys(patch).length) { await T.push("contacts/" + c.id, Object.assign(patch, { updatedAt: now })); bump("contacts tidied"); } }

  // 9. duplicate accounts: same state and (same phone, or same name with no conflicting phone) — merged into the one with more on it
  { const weight = (a) => T.live(S.projects).filter((p) => p.accountId === a.id).length * 5 + T.contactsOf(a.id).length;
    const done = new Set();
    for (const a of T.live(S.accounts)) { if (done.has(a.id)) continue;
      const ph = String(a.phone || "").replace(/\D/g, "").slice(-10);
      const twins = T.live(S.accounts).filter((b) => b.id !== a.id && !done.has(b.id) && String(b.state || "").toUpperCase() === String(a.state || "").toUpperCase() && (() => {
        const pb = String(b.phone || "").replace(/\D/g, "").slice(-10);
        if (ph.length === 10 && pb === ph) return true;
        const ka = T.acctKey(a.name), kb = T.acctKey(b.name);
        return ka.length > 3 && ka === kb && String(a.state || "").trim() !== "" && (!ph || !pb || ph === pb); })());
      if (!twins.length) continue;
      const group = [a].concat(twins).sort((x, y) => weight(y) - weight(x)); const keep = group[0];
      for (const g of group.slice(1)) { await T.mergeAccounts(g.id, keep.id, "duplicate (recheck fix)"); done.add(g.id); bump("accounts merged"); }
      done.add(keep.id); } }
  // Brandon / Brendon Gunn: QuickBooks and his email say Brendon
  for (const a of T.live(S.accounts).filter((x) => /^brandon gunn$/i.test(x.name || ""))) { await T.push("accounts/" + a.id, { name: "Brendon Gunn", updatedAt: now }); bump("Gunn spelling"); }
  for (const c of T.live(S.contacts).filter((x) => /^brandon gunn$/i.test(x.name || ""))) { await T.push("contacts/" + c.id, { name: "Brendon Gunn", updatedAt: now }); bump("Gunn spelling"); }

  // 10. negative stock: back to zero, flagged for a count
  for (const it of T.live(S.items).filter((i) => T.onHand(i) < 0)) { await T.push("items/" + it.id, { onHand: 0, needsCount: true, updatedAt: now });
    await note("item", it.id, "Was " + T.onHand(it) + " — set to 0 and flagged for a physical count"); bump("negative stock reset"); }

  // WO 1012: link every line to the rebuilt quote lines (its old links pointed at lines that no longer exist)
  { const p = T.live(S.projects).find((x) => String(x.num) === "2008"); if (p) {
      const ids = new Set(T.orderedLines(p).map((l) => l.id));
      const pick = (it) => { const d = String((it.desc || "") + " " + (it.code || "")).toLowerCase(), sz = String(it.size || "").toLowerCase();
        if (/pedestrian/.test(d)) return "ql1004c"; if (/van/.test(d)) return "ql1004e"; if (/fire/.test(d)) return "ql1004f"; if (/handicap/.test(d)) return "ql1004d";
        if (/stop/.test(d) && /36/.test(sz + d)) return "ql1004b"; if (/stop/.test(d)) return "ql1004a"; return ""; };
      for (const j of T.jobsOf(p.id)) { const items = (j.items || []).map((it) => ids.has(it.lineId) ? it : Object.assign({}, it, { lineId: pick(it) }));
        await T.push("jobs/" + j.num, { items, updatedAt: now }); bump("wo1012 relinked"); } } }
  // contacts whose account was merged away follow it to the account it was merged into
  for (const c of T.live(S.contacts)) { const a = S.accounts.get(c.accountId);
    if (a && a.deleted && a.mergedInto) { await T.push("contacts/" + c.id, { accountId: a.mergedInto, updatedAt: now }); bump("contacts moved to merged account"); }
    else if (a && a.deleted) bump("contacts on a deleted account (left alone)"); }
  n.leftNoRep = T.live(S.accounts).filter((a) => !a.repId).length;
  n.leftNegative = T.live(S.items).filter((i) => T.onHand(i) < 0).length;
  return n;
})
