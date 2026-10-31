// Oct 30 look-only run #7 (Josh's cost audit preview): NOTHING is written. For the jobs in the audit: the margin the CRM
// shows now (with the costs locked on the quote), and what it would be with the fixed costing and Josh's corrected blank
// costs applied in memory only. Lists any line still missing a cost part (SKUs and counts only, no names).
(async (T) => {
  const S = T.S, out = { now: {}, fixed: {}, missing: {}, items: {} };
  const nums = [2014, 2017, 2025, 2026, 2028, 2029, 2031, 2032];
  const byNum = (n) => [...S.projects.values()].find((p) => String(p.num) === String(n) && !p.deleted);
  const snap = (p, live) => { let rev = 0, cost = 0, un = 0; (p.orderLines || []).forEach((l) => { if (!l) return; const q = Number(l.qty) || (T.isCharge(l) ? 1 : 0), pr = Number(l.price) || 0; if (!q || !pr) return;
      let c = 0; if (T.isCharge(l)) c = Number(l.cost) || 0; else { try { c = (live ? T.quoteLineCostLive(l) : T.quoteLineCost(l)).cost || 0; } catch (e) {} }
      if (T.isCharge(l) || c > 0) { rev += q * pr; cost += q * c; } else un++; });
    return { m: rev ? Math.round((rev - cost) / rev * 1000) / 10 : null, cost: Math.round(cost * 100) / 100, rev: Math.round(rev * 100) / 100, uncosted: un }; };
  nums.forEach((n) => { const p = byNum(n); if (p) out.now["P-" + n] = snap(p, false); });
  // Josh's corrected blank costs and the 12x6 blank, in memory only
  const fixCost = { "BLK-080-1806": 4.58, "BLK-080-2424D": 18.24, "BLK-080-3030D": 28.47, "BLK-080-2424S": 18.24, "BLK-063-1218": 6.03 };
  [...S.items.values()].forEach((i) => { const k = String(i.sku || "").toUpperCase(); if (fixCost[k]) { out.items[k] = i.cost + "→" + fixCost[k]; i.cost = String(fixCost[k]); } });
  S.items.set("tmp1206", { id: "tmp1206", sku: "BLK-080-1206", name: "Blank 12x6 Rectangle .080", cost: "3.05", unit: "each", cat: "Blanks" });
  nums.forEach((n) => { const p = byNum(n); if (!p) return; out.fixed["P-" + n] = snap(p, true);
    const ms = (p.orderLines || []).filter((l) => l && !T.isCharge(l)).map((l) => T.quoteLineCostLive(l)).filter((c) => c.src === "missing").map((c) => (c.missing || []).join("+").replace(/[^A-Za-z0-9 .x×"+-]/g, "").slice(0, 40));
    if (ms.length) out.missing["P-" + n] = ms; });
  out.sheetNoCost = (S.sheet && S.sheet.rows || []).filter((r) => !(Number(r.cost) > 0)).length + " of " + (S.sheet && S.sheet.rows || []).length;
  return out;
})
