// Matt's answers 10/28 12:21 AM, checked against QuickBooks. Runs once; every write tagged "Fix run" in Field history.
// (no Send all: the CRM sends each changed record to the sheet by itself)
(async (T) => {
  const S = T.S, n = {};
  const P = (num) => T.live(S.projects).find((p) => String(p.num) === String(num));
  const fresh = async (path) => { const d = await T.getDb().doc(path).get(); return d && d.exists ? d.data() : null; };

  // 1. WO 1012: Matt — the invoice is right. QuickBooks invoice 1004 bills 50 handicap, 25 van, 50 fire lane, so the
  //    work order takes the quote quantities for those three lines
  { const p = P(2008); const d = await fresh("jobs/1012"); if (p && d) {
      const q = {}; T.orderedLines(p).forEach((l) => { q[l.id] = l.qty; });
      let k = 0; const was = [];
      const items = (d.items || []).map((it) => { const want = q[it.lineId];
        if (want !== undefined && String(it.qty) !== String(want)) { k++; was.push((it.desc || it.lineId) + " " + it.qty + " → " + want); return Object.assign({}, it, { qty: String(want) }); } return it; });
      if (k) await T.fix("jobs/1012", { items, updatedAt: Date.now() }, "Quantities to match the paid invoice 1004 (Matt: the invoice is correct): " + was.join("; "));
      n.wo1012Lines = k;
      // the tax QuickBooks charged on invoice 1004: none
      await T.fix("projects/" + p.id, { invTax: 0, updatedAt: Date.now() }, "Sales tax as charged on QuickBooks invoice 1004: $0.00 (was an estimate)"); n.p2008Tax = 0;
  } }

  // 2. P-2009 Toquerville: QuickBooks invoice 1013, $620.14, no tax, unpaid. Every line was invoiced and shipped,
  //    so the four lines missing from WO 1015 go on it
  { const p = P(2009); if (p) {
      await T.fix("projects/" + p.id, { invTax: 0, invNum: "1013", updatedAt: Date.now() }, "Sales tax as charged on QuickBooks invoice 1013: $0.00");
      const jobs = T.jobsOf(p.id); const j = jobs.find((x) => String(x.num) === "1015") || jobs[0];
      if (j) { const d = await fresh("jobs/" + j.num); const items = (d && d.items) || [];
        const on = new Set(); T.jobsOf(p.id).forEach((x) => T.woItems(x).forEach((it) => on.add(T.itKey(it))));
        const add = T.orderedLines(p).filter((l) => !T.isCharge(l) && !on.has(T.olKey(l))).map((l) => ({ qty: String(l.qty || ""), lineId: l.id || "", desc: l.desc || "", code: l.code || "",
          size: l.size || "", grade: l.grade || "", build: l.build || "", sub: "", legend: l.legend || "", legends: l.legends || [], price: "", noLam: !!l.noLam }));
        if (add.length) await T.fix("jobs/" + j.num, { items: items.concat(add), updatedAt: Date.now() }, add.length + " invoiced and shipped line(s) added — they were on QuickBooks invoice 1013 but on no work order");
        n.p2009LinesAdded = add.length; } } }
  return n;
})
