// Reorder points and two stray items. Counts only.
// Reorder point for items with none: items in stock or used in the last 90 days get one buy unit's worth
// (their reorder qty if set, else 1) — or more if a typical 2 weeks of use is larger. Items never stocked are left
// alone (they're bought to order). The stray "3M EC Red 1172 36in" duplicate goes to the recycle bin if nothing
// uses it; HW-BRKANCH-48 is reported (it needs a price, which only a vendor can give).
(async (T) => {
  const S = T.S, now = Date.now(), D = 86400000;
  const items = T.live(S.items).filter((i) => !i.sample);
  const use = {}; T.live(S.invtx).forEach((x) => { if (x.type !== "use" || now - (Number(x.at) || 0) > 90 * D) return; use[x.itemId] = (use[x.itemId] || 0) + Math.abs(Number(x.qty) || 0); });
  let set = 0, skipped = 0, already = 0;
  for (const i of items) {
    if (i.reorderPoint !== "" && i.reorderPoint != null) { already++; continue; }
    const used = use[i.id] || 0, onHand = Number(i.onHand) || 0;
    if (!used && onHand <= 0) { skipped++; continue; }
    const unit = Number(i.reorderQty) > 0 ? Number(i.reorderQty) : 1;
    const twoWeeks = used ? Math.ceil(used / 90 * 14 * 100) / 100 : 0;
    const rp = Math.max(unit, twoWeeks);
    await T.push("items/" + i.id, { reorderPoint: String(rp), reorderQty: i.reorderQty || String(unit), updatedAt: now });
    await T.recordHistory("item", i.id, [{ f: "Fix run", o: "", n: "Reorder point set to " + rp + (used ? " (about 2 weeks of use)" : " (one buy unit — it's kept in stock)"), ev: 1 }]);
    set++;
  }
  const out = { itemsChecked: items.length, reorderSet: set, alreadyHad: already, notStockedLeftBlank: skipped };
  const red = items.filter((i) => /1172/.test(String(i.name || "") + String(i.sku || "")) && /36/.test(String(i.name || "")) && /red/i.test(i.name || ""));
  out.ec1172_36_found = red.length;
  for (const it of red) {
    const usedBy = T.live(S.invtx).some((x) => x.itemId === it.id && x.type !== "ordered") || Number(it.onHand) > 0 || (Number(it.onOrder) || 0) > 0;
    const twin = items.some((o) => o.id !== it.id && String(o.sku || "").toUpperCase().indexOf("EC-1172") === 0);
    if (!usedBy && twin) { await T.fix("items/" + it.id, { deleted: true, deletedAt: now, deletedBy: "fix run", updatedAt: now }, "Stray duplicate of the EC-1172 red film items — nothing used it"); out.ec1172_36_binned = (out.ec1172_36_binned || 0) + 1; }
    else out.ec1172_36_kept_reason = usedBy ? "it has stock or movements" : "no EC-1172 item to replace it";
  }
  const hw = items.find((i) => String(i.sku || "").toUpperCase() === "HW-BRKANCH-48");
  out.hwBrkanch48 = hw ? { cost: Number(hw.cost) || 0, vendors: T.itemVendors(hw).length, onHand: Number(hw.onHand) || 0, moves: T.live(S.invtx).filter((x) => x.itemId === hw.id).length } : "not found";
  return out;
})
