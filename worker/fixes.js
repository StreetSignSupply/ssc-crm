// Oct 30 look-only: what the cost sheet rows hold, and where P-2036 went. Counts only, no writes.
(async (T) => {
  const S = T.S, out = {};
  const rows = (S.sheet && S.sheet.rows) || [];
  out.sheetRows = rows.length; out.withCost = rows.filter((r) => Number(r.cost) > 0).length; out.withSell = rows.filter((r) => Number(r.sell) > 0).length;
  out.sheetKeys = rows[0] ? Object.keys(rows[0]).join(",").slice(0, 300) : "";
  out.rates = JSON.stringify((S.sheet && S.sheet.rates) || {}).slice(0, 160);
  const all = [...S.projects.values()];
  out.maxNum = Math.max(...all.map((p) => Number(p.num) || 0));
  const p36 = all.filter((p) => String(p.num) === "2036");
  out.p2036 = p36.map((p) => ({ deleted: !!p.deleted, stage: p.stage, archived: !!p.archived, mergedInto: p.mergedInto ? 1 : 0, created: p.createdAt || 0, by: p.deletedBy ? 1 : 0 }));
  out.nums = all.filter((p) => Number(p.num) >= 2030).map((p) => p.num + (p.deleted ? "d" : "")).sort().join(" ");
  out.counter = JSON.stringify((S.brand && S.brand.nextNum) || null);
  out.items2 = [...S.items.values()].filter((i) => /post/i.test(i.name || "") && !i.deleted).slice(0, 3).map((i) => ({ unit: i.unit, cat: i.cat, sqftPer: i.sqftPer || "", cost: i.cost }));
  return out;
})
