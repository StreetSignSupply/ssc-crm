// Recheck 4 fixes (10/27 night). Runs once inside the live CRM through its own code; every write is tagged
// "Fix run" in that record's Field history. Prints counts only (public log). Ends with Send all.
// send all
(async (T) => {
  const S = T.S, now = Date.now(), n = {};
  const bump = (k, v = 1) => (n[k] = (n[k] || 0) + v);
  const P = (num) => T.live(S.projects).find((p) => String(p.num) === String(num));
  const fresh = async (path) => { const d = await T.getDb().doc(path).get(); return d && d.exists ? d.data() : null; };

  // 1. Q-1010 (P-2014 Yavapai): put back the three prices Bob agreed (total $2,961.63) that a whole-line rewrite undid,
  //    and price 4.5 (30x9 extruded) at the same $16.48/sq ft as every other extruded blank. Only the price field
  //    of those lines changes, read fresh right before the write so nothing else on the quote is touched.
  { const p = P(2014); if (p) {
      const want = [[/^1\.1\s/, 59.98], [/^5A\.1\s/, 17.86], [/^5B\.2\s/, 5.96], [/^4\.5\s/, 30.90]];
      const d = await fresh("projects/" + p.id); const lines = (d && d.orderLines) || [];
      let k = 0; const was = [];
      const out = lines.map((l) => { const w = want.find(([rx]) => rx.test(String(l.desc || "")));
        if (!w || Math.abs(Number(l.price) - w[1]) < 0.005) return l; k++; was.push(String(l.desc).split(" ")[0] + " " + l.price + " → " + w[1]);
        return Object.assign({}, l, { price: w[1] }); });
      if (k) { await T.fix("projects/" + p.id, { orderLines: out, updatedAt: Date.now() }, "Prices: " + was.join("; ") + " (Bob's agreed prices; 4.5 at $16.48/sq ft)"); bump("q1010 prices", k); }
  } }

  // 2. Work orders: "QC" only counts when it was signed off — a status of packed/shipped with no sign-off is left as is
  //    (the progress bar now shows "not signed off"); nothing to write here, just count what's waiting
  n.woPastQcUnsigned = T.live(S.jobs).filter((j) => ["packed", "shipped"].includes(j.status) && !(j.gates || {}).qc).length;

  // 3. WO 1012: identical lines get the same build (print vs film), so the laminate flag matches across them
  { const j = S.jobs.get("1012") || S.jobs.get(1012); if (j && !j.deleted) {
      const d = await fresh("jobs/1012"); const items = (d && d.items) || [];
      const key = (it) => [it.grade, it.size, it.substrate].join("|");
      const byKey = {}; items.forEach((it) => { if (it.build) (byKey[key(it)] = byKey[key(it)] || []).push(it.build); });
      let k = 0;
      const out = items.map((it) => { const b = (byKey[key(it)] || [])[0]; if (!it.build && b) { k++; return Object.assign({}, it, { build: b }); } return it; });
      if (k) { await T.fix("jobs/1012", { items: out, updatedAt: Date.now() }, k + " line(s) set to the same build as the identical lines, so the overlaminate matches"); bump("wo1012 build filled", k); }
  } }

  // 4. invoice numbers stored as "Invoice 1013" → "1013"
  for (const p of T.live(S.projects)) { const v = String(p.invNum || ""); const m = v.match(/^\s*invoice\s*#?\s*(\d+)\s*$/i);
    if (m) { await T.fix("projects/" + p.id, { invNum: m[1], updatedAt: Date.now() }, "Invoice number tidied: " + v + " → " + m[1]); bump("invoice numbers tidied"); } }

  // 5. contacts on an account that was deleted: follow a merge, else the live account with the same name, else bring the account back
  { const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const liveByName = {}; T.live(S.accounts).forEach((a) => { liveByName[norm(a.name)] = liveByName[norm(a.name)] || a; });
    const restored = new Set();
    for (const c of T.live(S.contacts)) { const a = S.accounts.get(c.accountId); if (!a || !a.deleted) continue;
      let to = a.mergedInto; while (to && S.accounts.get(to) && S.accounts.get(to).deleted && S.accounts.get(to).mergedInto) to = S.accounts.get(to).mergedInto;
      if (to && S.accounts.get(to) && !S.accounts.get(to).deleted) { await T.fix("contacts/" + c.id, { accountId: to, updatedAt: Date.now() }, "Moved to the account it was merged into"); bump("contacts followed merge"); continue; }
      const same = liveByName[norm(a.name)];
      if (same) { await T.fix("contacts/" + c.id, { accountId: same.id, updatedAt: Date.now() }, "Moved to the live account with the same name"); bump("contacts moved by name"); continue; }
      if (!restored.has(a.id)) { restored.add(a.id); await T.fix("accounts/" + a.id, { deleted: false, deletedAt: 0, mergedInto: null, updatedAt: Date.now() }, "Brought back from the recycle bin: its contacts still belong to it"); bump("accounts restored"); }
    } }

  // 6. orphan work orders (their project was deleted) go to the recycle bin the same way the Archive button does it
  for (const j of T.archivedJobs().filter((j) => { const p2 = S.projects.get(j.projectId); return p2 && p2.deleted; })) {
    await T.returnJobStock(j.num, "project deleted");
    await T.fix("jobs/" + j.num, { deleted: true, deletedAt: Date.now(), deletedBy: "fix run", deletedWith: "project:" + j.projectId, updatedAt: Date.now() }, "Project was deleted — work order to the recycle bin");
    bump("orphan WOs binned"); }

  // 7. open tasks with nobody assigned go to the project's rep, else the owner
  { const owner = T.live(S.team).find((t) => (t.access || "owner") === "owner");
    for (const a of T.live(S.activity).filter((x) => x.kind === "task" && !x.done && !x.assigneeId && !x.whoId)) {
      const p = a.recType === "project" ? S.projects.get(a.recId) : null; const rep = (p && T.repFor(p)) || owner; if (!rep) continue;
      await T.fix("activity/" + a.id, { assigneeId: rep.id, assigneeName: rep.name || "", updatedAt: Date.now() }, "Assigned to " + (rep.name || rep.initials)); bump("tasks assigned"); } }

  // 8. stock item labels: an .080 blank (BLK-080-…) whose name says .063
  for (const it of T.live(S.items)) { if (/^BLK-080-/i.test(it.sku || "") && /\.063/.test(it.name || "")) {
      await T.fix("items/" + it.id, { name: String(it.name).replace(/\.063/g, ".080"), updatedAt: Date.now() }, "Name said .063 for an .080 blank"); bump("item labels fixed"); } }

  // 9. exact duplicate contacts (same account, same name, same email): keep the oldest, move project links, bin the rest
  { const groups = {};
    T.live(S.contacts).forEach((c) => { const k = [c.accountId, String(c.name || "").trim().toLowerCase(), String(c.email || "").trim().toLowerCase()].join("|"); (groups[k] = groups[k] || []).push(c); });
    for (const g of Object.values(groups).filter((g) => g.length > 1 && g[0].name)) {
      g.sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0)); const keep = g[0];
      for (const dup of g.slice(1)) {
        for (const p of T.live(S.projects).filter((p) => (p.contacts || []).includes(dup.id))) {
          const cs = [...new Set((p.contacts || []).map((x) => (x === dup.id ? keep.id : x)))];
          await T.fix("projects/" + p.id, { contacts: cs, updatedAt: Date.now() }, "Duplicate contact replaced by the original"); }
        await T.fix("contacts/" + dup.id, { deleted: true, deletedAt: Date.now(), deletedBy: "fix run", mergedInto: keep.id, updatedAt: Date.now() }, "Exact duplicate of another contact on this account");
        bump("duplicate contacts binned"); } } }

  n.unnamedVendors = T.live(S.vendors).filter((v) => !String(v.name || "").trim()).length;
  return n;
})
