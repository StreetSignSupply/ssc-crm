// Runs inside the live CRM (through its own functions, so history and the order sync happen). Counts only in the output.
(async (T) => {
  const S = T.S, now = Date.now(), n = {};
  const bump = (k, v = 1) => (n[k] = (n[k] || 0) + v);
  const P = (num) => T.live(S.projects).find((p) => String(p.num) === String(num));
  const note = (rt, id, txt) => T.recordHistory(rt, id, [{ f: "Fix", o: "", n: txt + " (CRM recheck fix 10/27)", ev: 1 }]);

  // 0. agents are gone: the feed no longer comes in by itself
  await T.push("settings/brand", { pipeAuto: false, updatedAt: now }); bump("feed auto off");

  // 1. P-2018: the lost reason in the right fields
  { const p = P(2018); if (p) { await T.push("projects/" + p.id, { lostWhy: "other", lostNote: "Dry run — the bid was never submitted", updatedAt: now }); bump("p2018 reason"); } }

  // 2. P-2009 Toquerville: QuickBooks invoice 1013 ($620.14, 10/13), contact, tidy quote file name
  { const p = P(2009); if (p) {
      await T.push("projects/" + p.id, { invNum: "1013", billDate: p.billDate || "2026-10-13", updatedAt: now }); await note("project", p.id, "Invoice number 1013 from QuickBooks");
      const cs = T.contactsOf(p.accountId); const jd = cs.find((c) => /^jd\b|jd adams/i.test(c.name || "")) || cs.find((c) => /adams/i.test(c.name || ""));
      if (jd && !(p.contacts || []).includes(jd.id)) { await T.push("projects/" + p.id, { contacts: (p.contacts || []).concat([jd.id]), updatedAt: now }); bump("p2009 contact"); }
      const a = T.acct(p.accountId); const jadee = cs.find((c) => /jadee|invoices@/i.test((c.name || "") + " " + (c.email || "")));
      if (a && !a.billingContactId && jadee) { await T.push("accounts/" + a.id, { billingContactId: jadee.id, updatedAt: now }); bump("p2009 billing contact"); }
      for (const f of T.projFiles(p.id)) if (/quote/i.test(f.name || "") && /ouot|=Q-|10072026/i.test(f.name || "")) { await T.push("files/" + f.id, { name: "Quote Q-1005 - City of Toquerville.pdf", cat: "Quote", updatedAt: now }); bump("p2009 file renamed"); }
      bump("p2009 invoice 1013");
  } }

  // 3. P-2008 Signature Striping inventory order: quote lines from QuickBooks invoice 1004 (paid $17,625), WO lines linked, BGRV file out
  { const p = P(2008); if (p) {
      const L = [
        { id: "ql1004a", qty: 75, code: "R1-1", size: "30x30", grade: "DG3", desc: "30x30 Stop Sign R1-1 Diamond Grade .080 DG3", price: 98 },
        { id: "ql1004b", qty: 25, code: "R1-1", size: "36x36", grade: "DG3", desc: "36x36 Stop Sign R1-1 Diamond Grade .080 DG3", price: 130 },
        { id: "ql1004c", qty: 50, code: "R1-5b", size: "30x30", grade: "DG3", desc: "30x30 Stop Here For Pedestrians R1-5b Diamond Grade .080 DG3", price: 98 },
        { id: "ql1004d", qty: 50, code: "R7-8", size: "12x18", grade: "EG", desc: "12x18 Handicap R7-8 Engineer Grade .063", price: 17 },
        { id: "ql1004e", qty: 25, code: "R7-8", size: "12x18", grade: "EG", desc: "12x18 Handicap Van Accessible Engineer Grade .063", price: 17 },
        { id: "ql1004f", qty: 50, code: "R7-1", size: "12x18", grade: "EG", desc: "12x18 No Parking Fire Lane Engineer Grade .063", price: 17 }];
      if (!T.orderedLines(p).length) {
        await T.push("projects/" + p.id, { orderLines: L, quote: p.quote || "Q-1004", amountAuto: true, invNum: "1004", billStatus: "paid", billDate: p.billDate || "2026-09-21", paidDate: p.paidDate || "2026-09-21", updatedAt: now });
        await note("project", p.id, "Quote lines rebuilt from QuickBooks invoice 1004 ($17,625, paid). The invoice bills 50 handicap, 25 van and 50 fire lane; work order 1012 has 20 of each");
        bump("p2008 lines rebuilt");
      }
      const pick = (it) => { const d = String((it.desc || "") + " " + (it.code || "")).toLowerCase(), sz = String(it.size || "").replace(/[^0-9x]/gi, "").toLowerCase();
        if (/pedestrian/.test(d)) return "ql1004c"; if (/van/.test(d)) return "ql1004e"; if (/fire/.test(d)) return "ql1004f"; if (/handicap/.test(d)) return "ql1004d";
        if (/stop/.test(d) && /36/.test(sz + d)) return "ql1004b"; if (/stop/.test(d)) return "ql1004a"; return ""; };
      for (const j of T.jobsOf(p.id)) { const items = (j.items || []).map((it) => Object.assign({}, it, it.lineId ? {} : { lineId: pick(it) }));
        await T.push("jobs/" + j.num, { items, updatedAt: now }); await note("job", String(j.num), "Lines linked to the rebuilt quote lines, so they carry prices"); bump("wo1012 linked"); }
      for (const f of T.projFiles(p.id)) if (/bgrv/i.test(f.name || "")) { await T.push("files/" + f.id, { deleted: true, deletedAt: now, deletedBy: "recheck fix", updatedAt: now }); bump("p2008 BGRV file to recycle bin"); }
  } }

  // 4. P-2012 Walmart (Signature Striping): its QuickBooks invoice is 1015 ($6,346.72) — the filed "Invoice 1015.pdf" is the right one
  { const p = P(2012); if (p && !p.invNum) { await T.push("projects/" + p.id, { invNum: "1015", updatedAt: now }); await note("project", p.id, "QuickBooks invoice 1015 is this order's invoice (not sent yet)"); bump("p2012 invoice 1015"); } }

  // 5. leftover work orders: WO 1014 (closed, paid P-2010) and Matt's own test website orders 1004, 1006, 1007, 1008
  for (const num of ["1014", "1004", "1006", "1007", "1008"]) { const j = S.jobs.get(num); if (j && !j.deleted && j.status !== "shipped") {
      await T.push("jobs/" + num, { deleted: true, deletedAt: now, deletedBy: "recheck fix", updatedAt: now }); bump("old WOs to recycle bin"); } }

  // 6. the 25-day-old task about Q-1002
  for (const a of T.live(S.activity).filter((x) => x.kind === "task" && !x.done && /Q-1002/.test(x.text || ""))) { await T.push("activity/" + a.id, { done: true, doneAt: now, updatedAt: now }); bump("old task closed"); }

  // 7. reps: everything unassigned goes to the owner (the only rep)
  { const owner = T.live(S.team).find((t) => (t.access || "owner") === "owner" && /^mj$/i.test(t.initials || "")) || T.live(S.team).find((t) => (t.access || "owner") === "owner");
    if (owner) { for (const a of T.live(S.accounts).filter((a) => !a.repId)) { await T.push("accounts/" + a.id, { repId: owner.id, updatedAt: now }); bump("accounts given a rep"); }
    } }

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

  return n;
})
