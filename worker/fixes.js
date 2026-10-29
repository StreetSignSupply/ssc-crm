// P-2014 check after the bare-blank costing: how many lines cost now, and which reasons are left. Read-only.
(async (T) => {
  const p = T.live(T.S.projects).find((x) => String(x.num) === "2014"); if (!p) return { found: false };
  const L = (p.orderLines || []).filter((l) => l && !l.charge); const by = {};
  L.forEach((l) => { const c = T.quoteLineCost(l); const k = c && Number(c.cost) > 0 ? "costed" : (c && c.src) || "none"; by[k] = (by[k] || 0) + 1; });
  return { lines: L.length, by };
})
