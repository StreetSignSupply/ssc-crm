// Matt's cost spec 10/28, part 5 follow-up: the 5 EC items' vendor rows carry no vendor id, so point them at CPC. Counts only.
(async (T) => {
  const S = T.S, live = T.live, out = { cpcFound: false, itemsFound: 0, rowsNoId: 0, rowsDeadId: 0, prefNoId: 0, fixed: 0, shapes: {} };
  const cpc = live(S.vendors).find(v => /^cpc\b/i.test(String(v.name || "").trim())); out.cpcFound = !!cpc;
  const ok = id => { const v = id && S.vendors.get(id); return !!(v && !v.deleted && String(v.name || "").trim()); };
  for (const sku of ["EC-1171-30", "EC-1171-36", "EC-1171-48", "EC-1175-36", "EC-1179-30"]) {
    const i = live(S.items).find(x => String(x.sku || "").toUpperCase() === sku); if (!i) continue; out.itemsFound++;
    const rows = Array.isArray(i.vendors) ? i.vendors : [];
    rows.forEach(r => { const k = Object.keys(r || {}).sort().join(","); out.shapes[k] = (out.shapes[k] || 0) + 1; });
    const bad = r => r && !ok(r.vendorId);
    const nBad = rows.filter(bad).length; out.rowsNoId += rows.filter(r => r && !r.vendorId).length; out.rowsDeadId += rows.filter(r => r && r.vendorId && !ok(r.vendorId)).length;
    const prefBad = (i.vendorId && !ok(i.vendorId)) || (!i.vendorId && (i.vendorPrice !== undefined && i.vendorPrice !== "")); if (prefBad) out.prefNoId++;
    if (!cpc || (!nBad && !prefBad)) continue;
    const L = T.itemVendors(i).filter(v => !v.missing); const hasCpc = L.some(v => v.vendorId === cpc.id);
    const src = prefBad ? { cost: i.vendorPrice !== undefined && i.vendorPrice !== "" ? i.vendorPrice : i.cost, freight: i.vendorFreight || "", part: i.vendorPart || "", lead: i.vendorLead || "" } : rows.find(bad);
    if (!hasCpc) L.push({ vendorId: cpc.id, cost: src.cost !== undefined ? src.cost : "", freight: src.freight || "", part: src.part || "", lead: src.lead || "", lastBought: src.lastBought || "", source: src.source || "", preferred: prefBad || !L.length });
    if (!L.some(v => v.preferred)) L[0].preferred = true;
    await T.itemVendSave(i.id, L);
    await T.fix("items/" + i.id, { vendors: (S.items.get(i.id).vendors || []).filter(r => ok(r.vendorId)), updatedAt: Date.now() }, "Vendor price rows with no vendor re-pointed to CPC");
    await T.recordHistory("item", i.id, [{ f: "Fix run", o: "", n: "Vendor price with no vendor re-pointed to CPC (prices match CPC's)", ev: 1 }]); out.fixed++;
  }
  return out;
})
