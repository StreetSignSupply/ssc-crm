// Oct 30 look-only run #4 (after -83): nothing is changed. Find an item for "stop", P-2030's margin, and how many
// priced lines now show a price source. Catalog names and counts only.
(async (T) => {
  const S = T.S, out = {};
  out.stop = T.ordFindRows("stop").map((r) => (r.title + " ~ " + (r.sub || "")).slice(0, 60));
  const ps = [...S.projects.values()].filter((p) => !p.deleted);
  const p30 = ps.find((p) => String(p.num) === "2030"); if (p30) { const c = T.costedMargin(p30); out.m2030 = [Math.round(T.projMargin(p30)), c.uncostedLines]; }
  const src = {}; ps.forEach((p) => (p.orderLines || []).forEach((l) => { if (!l || !(Number(l.price) > 0) || T.isCharge(l)) return; const k = T.linePriceSrc(p, l) || "(none)"; src[k] = (src[k] || 0) + 1; }));
  out.src = src;
  const p28 = ps.find((p) => String(p.num) === "2028"); if (p28) out.k2028 = [...new Set((p28.orderLines || []).filter((l) => l && !T.isCharge(l)).map((l) => T.lineKind(l)))];
  out.ph = T.placeholderReorder().length;
  return out;
})
