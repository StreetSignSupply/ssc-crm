// Oct 30 cost-audit run, part 2 (same "Apply costs" go-ahead): on the audited jobs, a line whose live costing is now missing
// a part (P-2028's 6x33 blade blank, price TBD) drops its old locked cost, so it shows as missing instead of the old,
// too-low cost. Counts only.
(async (T) => {
  const S = T.S, out = {}; const now = Date.now();
  for (const n of [2014, 2017, 2025, 2026, 2028, 2029, 2031, 2032]) { const p = [...S.projects.values()].find((x) => String(x.num) === String(n) && !x.deleted); if (!p) continue;
    let k = 0; const ls = (p.orderLines || []).map((l) => { if (!l || T.isCharge(l) || l.costLock === undefined || l.costLock === "") return l;
      let c = null; try { c = T.quoteLineCostLive(l); } catch (e) {} if (!c || c.src !== "missing") return l; k++;
      return Object.assign({}, l, { costLock: "", costKey: "", costAt: 0, costWhy: "" }); });
    if (k) { await T.push("projects/" + p.id, { orderLines: ls, updatedAt: now });
      await T.recordHistory("project", p.id, [{ f: "Fix run", o: "", n: "Cost audit: " + k + " line" + (k === 1 ? "" : "s") + " now missing a cost part — old locked cost cleared so it shows as missing", ev: 1 }]); }
    out[n] = { cleared: k }; }
  await new Promise((r) => setTimeout(r, 6000));
  const p28 = [...S.projects.values()].find((x) => String(x.num) === "2028" && !x.deleted);
  if (p28) { const m = T.projMargin(p28); out.m2028 = m == null ? null : Math.round(m * 10) / 10; out.missing2028 = (p28.orderLines || []).filter((l) => l && !T.isCharge(l) && T.quoteLineCost(l).src === "missing").length; }
  return out;
})
