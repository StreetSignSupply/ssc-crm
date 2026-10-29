// Check which red 1172 36in item went to the recycle bin, and put it back if it was the real catalog item. Counts/SKUs only.
(async (T) => {
  const S = T.S; const all = [...S.items.values()].filter((i) => /1172/.test(String(i.name || "") + String(i.sku || "")) && /36/.test(String(i.name || "")) && /red/i.test(i.name || ""));
  const out = { items: all.map((i) => ({ sku: i.sku || "(none)", deleted: !!i.deleted, by: i.deletedBy || "", vendors: T.itemVendors(i).length, cost: Number(i.cost) > 0 })) };
  for (const i of all) if (i.deleted && i.deletedBy === "fix run" && /^EC-/i.test(String(i.sku || ""))) {
    await T.fix("items/" + i.id, { deleted: false, deletedAt: "", deletedBy: "", updatedAt: Date.now() }, "Put back: this is the catalog EC-1172 item, not the stray"); out.restored = i.sku; }
  return out;
})
