// look only: the 36x6 / 6x36 blanks and their vendors, to point the 6x33 blade at the Grimco one. No writes.
(async (T) => {
  const S = T.S;
  const vn = (id) => { const v = id && S.vendors.get(id); return v ? String(v.name || "").slice(0, 12) : ""; };
  const its = [...S.items.values()].filter((i) => !i.deleted && /^BLK-/i.test(i.sku || "") && /0636|3606/.test(i.sku || ""));
  return its.map((i) => [i.sku, i.cost, vn(i.vendorId), String(i.vendorSource || "").slice(0, 30), (i.vendors || []).map((v) => vn(v.vendorId) + ":" + v.cost + ":" + String(v.source || "").slice(0, 24)).join(";")].join("|"));
})
