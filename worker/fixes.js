// P-2014: why some quote lines have no cost. Read-only, counts of reasons only.
(async (T) => {
  const p = T.live(T.S.projects).find((x) => String(x.num) === "2014"); if (!p) return { found: false };
  const L = (p.orderLines || []).filter((l) => l && !l.charge);
  const why = {}; let none = 0;
  L.forEach((l) => { const c = T.quoteLineCost(l); if (c && Number(c.cost) > 0) return; none++;
    const k = [T.lineProd(l), T.parseSize(l.size) ? "size ok" : "no size", T.matchItem(l.grade) ? "grade matches an item" : "grade matches no item",
      T.sheetFind(l, true) ? "on tab 04" : "not on tab 04", (c && c.src) || "none", l.costLock !== undefined ? "has lock" : "no lock"].join(" / ");
    why[k] = (why[k] || 0) + 1; });
  const grades = {}; L.forEach((l) => { const c = T.quoteLineCost(l); if (c && Number(c.cost) > 0) return; const g = String(l.grade || "(blank)").slice(0, 20); grades[g] = (grades[g] || 0) + 1; });
  return { lines: L.length, noCost: none, why, grades };
})
