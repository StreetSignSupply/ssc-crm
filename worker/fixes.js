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
  // an HTML code that leaked into a city name on import ("#3BSt. George")
  let cities = 0;
  for (const a of T.live(S.accounts)) { const c = String(a.city || ""); const fixed = c.replace(/&?#(x?3[bB]|59);?/g, "").replace(/&amp;/g, "&").trim();
    if (fixed !== c) { await T.fix("accounts/" + a.id, { city: fixed, updatedAt: now }, "City had an HTML code in it from an import"); cities++; } }
  out.citiesCleaned = cities;
  // P-2012: QuickBooks invoice 1015 bills Cross Traffic Does Not Stop at 23, the CRM had 24 — QuickBooks is the source of truth
  const p = T.live(S.projects).find((x) => String(x.num) === "2012");
  if (p) { let n = 0; const lines = (p.orderLines || []).map((l) => { if (l && /cross traffic/i.test(String(l.desc || "") + " " + String(l.title || "")) && Number(l.qty) === 24) { n++; return Object.assign({}, l, { qty: "23" }); } return l; });
    if (n === 1) { await T.push("projects/" + p.id, { orderLines: lines, updatedAt: now });
      await T.recordHistory("project", p.id, [{ f: "Fix run", o: "Cross Traffic qty 24", n: "23 — to match QuickBooks invoice 1015", ev: 1 }]);
      const ln = lines.find((l) => /cross traffic/i.test(String(l.desc || "") + " " + String(l.title || "")));
      for (const j of T.live(S.jobs).filter((j) => j.projectId === p.id)) { let m = 0; const items = (j.items || []).map((x) => { if (((ln.id && x.lineId === ln.id) || /cross traffic/i.test(String(x.desc || ""))) && Number(x.qty) === 24) { m++; return Object.assign({}, x, { qty: "23" }); } return x; });
        if (m) { await T.push("jobs/" + j.num, { items, updatedAt: now }); await T.recordHistory("job", String(j.num), [{ f: "Fix run", o: "Cross Traffic qty 24", n: "23 — to match QuickBooks invoice 1015", ev: 1 }]); out.p2012_woLinesFixed = (out.p2012_woLinesFixed || 0) + m; } } }
    out.p2012_linesFixed = n; out.p2012_total = Math.round(((T.projValue(Object.assign({}, p, { orderLines: lines })) || 0) + (T.invTaxOf(p) || 0)) * 100) / 100; }
  return out;
})
