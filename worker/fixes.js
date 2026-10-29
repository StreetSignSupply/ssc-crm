// Cost spec part 5 check: which vendors the 5 EC items point at now. Read-only, counts only.
(async (T) => {
  const S = T.S, live = T.live, out = { perItem: [] };
  const cpc = live(S.vendors).find(v => /^cpc\b/i.test(String(v.name || "").trim()));
  for (const sku of ["EC-1171-30", "EC-1171-36", "EC-1171-48", "EC-1175-36", "EC-1179-30"]) {
    const i = live(S.items).find(x => String(x.sku || "").toUpperCase() === sku); if (!i) { out.perItem.push(null); continue; }
    const L = T.itemVendors(i);
    out.perItem.push({ rows: L.length, cpc: L.filter(v => v.vendorId === cpc.id).length, cpcPreferred: i.vendorId === cpc.id, missing: L.filter(v => v.missing).length, other: L.filter(v => v.vendorId !== cpc.id).length, rawRowsNoVendorField: (i.vendors || []).filter(r => !r.vendorId).length, itemHasVendorNameText: !!(i.vendor || i.vendorName) });
  }
  return out;
})
