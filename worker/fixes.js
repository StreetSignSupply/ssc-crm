// look only: every blank's cost, source and where its price came from; P-2014's stop lines. No writes.
(async (T) => {
  const S = T.S;
  const vn = (id) => { const v = id && S.vendors.get(id); return v ? String(v.name || "").slice(0, 8) : ""; };
  const b = [...S.items.values()].filter((i) => !i.deleted && (/^BLK-|^GRM-/i.test(i.sku || "")))
    .map((i) => [i.sku, i.cost, i.costSrc || "-", vn(i.vendorId), String(i.vendorSource || "").slice(0, 22)].join("|"));
  const p = [...S.projects.values()].find((x) => String(x.num) === "2014" && !x.deleted);
  const st = (p.orderLines || []).filter((l) => l && /stop/i.test(l.desc || "")).map((l) => { let c = {}; try { c = T.quoteLineCost(l); } catch (e) {} return l.size + "|" + c.cost + "|" + String(c.why || "").replace(/.*?(Blank|blank)/, "$1").slice(0, 50); });
  return { b, st };
})
