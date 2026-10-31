// look only: Van Accessible line costs everywhere, the EC Red 1172 36in records, WO 1020's EG line. No writes.
(async (T) => {
  const S = T.S, out = {};
  out.van = [];
  [...S.projects.values()].filter((p) => !p.deleted).forEach((p) => (p.orderLines || []).forEach((l) => { if (l && /van accessible|R7-8P/i.test((l.desc || "") + " " + (l.code || ""))) {
    let c = {}; try { c = T.quoteLineCost(l); } catch (e) {} out.van.push(p.num + ":" + l.size + ":" + c.cost + ":" + c.src); } }));
  out.ec = [...S.items.values()].filter((i) => /1172/.test((i.sku || "") + " " + (i.name || "")) && /36/.test((i.sku || "") + " " + (i.name || ""))).map((i) => ({ id: i.id.slice(0, 6), sku: i.sku, del: !!i.deleted, cost: i.cost, oh: i.onHand, cat: i.cat, unit: i.unit, ven: (i.vendors || []).length, vs: String(i.vendorSource || "").slice(0, 20),
    tx: [...(S.invtx ? S.invtx.values() : [])].filter((t) => t.itemId === i.id).length, created: i.createdAt || 0 }));
  const j = S.jobs.get ? (S.jobs.get(1020) || S.jobs.get("1020")) : null;
  out.wo = j ? { prod: j.prod, method: j.method, items: (j.items || []).map((x) => ({ g: String(x.grade || "").slice(0, 40), sz: x.size, sub: x.sub || "" })),
    plan: (function () { try { return T.planFor(j).map((r) => (r.name || "").slice(0, 26) + (r.missing ? " MISSING" : "")); } catch (e) { return "err " + e.message; } })() } : "no 1020";
  return out;
})
