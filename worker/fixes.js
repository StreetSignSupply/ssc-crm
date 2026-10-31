// Josh's v97 recheck (Matt relayed 10/31 12:06 AM): blank cost sources set to what the paperwork says, then P-2014 retaken
// (its .125 stops now take .125 blanks). Counts only.
(async (T) => {
  const S = T.S, out = { set: 0, missing: [] }; const now = Date.now();
  const want = { "BLK-080-1806": "invoice", "BLK-080-2424D": "invoice", "BLK-080-2424O": "estimate",
    "BLK-080-1212": "invoice", "BLK-063-1218": "invoice", "BLK-063-1824-PW": "invoice", "BLK-080-2412": "invoice",
    "BLK-080-2424S": "estimate", "BLK-080-3030D": "estimate", "BLK-080-3030S": "estimate", "BLK-080-2430": "estimate",
    "BLK-080-1818": "estimate", "BLK-080-0636": "estimate", "BLK-080-3636O": "estimate" };
  const why = { invoice: "Invoice (Josh's invoice check 10/30)", estimate: "Estimate — no quote or invoice found (Josh 10/30)" };
  const items = [...S.items.values()].filter((i) => !i.deleted);
  for (const [sku, src] of Object.entries(want)) { const it = items.find((i) => String(i.sku || "").toUpperCase() === sku);
    if (!it) { out.missing.push(sku); continue; } if (it.costSrc === src) continue;
    await T.push("items/" + it.id, { costSrc: src, cutFrom: "", updatedAt: now });
    await T.recordHistory("item", it.id, [{ f: "Cost source", o: it.costSrc || "", n: why[src] }]); out.set++; }
  await new Promise((r) => setTimeout(r, 5000));
  const r1 = (m) => (m == null ? null : Math.round(m * 10) / 10);
  out.after = {};
  for (const n of [2014, 2026, 2033, 2035]) { const p = [...S.projects.values()].find((x) => String(x.num) === String(n) && !x.deleted); if (!p) continue;
    const b = r1(T.projMargin(p)); const re = await T.lockLineCosts(p.id, true); await new Promise((r) => setTimeout(r, 4000));
    out.after[n] = b + ">" + r1(T.projMargin(S.projects.get(p.id))) + " (" + re + ")"; }
  const p = [...S.projects.values()].find((x) => String(x.num) === "2014" && !x.deleted);
  out.stops = (p.orderLines || []).filter((l) => l && /stop/i.test(l.desc || "")).map((l) => { try { return T.quoteLineCost(l).cost; } catch (e) { return null; } });
  return out;
})
