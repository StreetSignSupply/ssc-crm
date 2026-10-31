// Oct 30 cost-audit run (Josh's Cost Audit; Matt said "Apply costs" at 9:36 PM): blank costs set to what was paid, the two
// missing blanks added, and costs re-taken on the quoted jobs so they use the fixed costing. Prints, per project, the
// margin before and after and any line still missing a cost part (SKUs and counts only, no names).
(async (T) => {
  const S = T.S, out = { items: [], before: {}, after: {}, missing: {} }; const now = Date.now();
  const nums = [2014, 2017, 2025, 2026, 2028, 2029, 2031, 2032];
  const byNum = (n) => [...S.projects.values()].find((p) => String(p.num) === String(n) && !p.deleted);
  const snap = (p) => { const m = T.projMargin(p); return m == null ? null : Math.round(m * 10) / 10; };
  nums.forEach((n) => { const p = byNum(n); if (p) out.before[n] = snap(p); });
  const fixCost = { "BLK-080-1806": 4.58, "BLK-080-2424D": 18.24, "BLK-080-3030D": 28.47, "BLK-080-2424S": 18.24, "BLK-063-1218": 6.03 };
  const items = [...S.items.values()].filter((i) => !i.deleted);
  for (const [sku, c] of Object.entries(fixCost)) { const it = items.find((i) => String(i.sku || "").toUpperCase() === sku);
    if (!it) { out.items.push(sku + " not found"); continue; }
    const fr = Number(it.vendorFreight) || 0, was = it.cost;
    await T.push("items/" + it.id, { cost: String(c), vendorPrice: it.vendorPrice !== undefined && it.vendorPrice !== "" ? String(Math.round((c - fr) * 100) / 100) : (it.vendorPrice || ""), updatedAt: now });
    await T.recordHistory("item", it.id, [{ f: "Unit cost", o: String(was || ""), n: String(c) + " (Josh's cost audit: what was actually paid)" }]); out.items.push(sku + " " + was + ">" + c); }
  const vend = [...S.vendors.values()].find((v) => !v.deleted && /us\s*standard/i.test(v.name || ""));
  const add = async (sku, rec) => { if (items.some((i) => String(i.sku || "").toUpperCase() === sku)) { out.items.push(sku + " already there"); return; }
    const id = T.uid("it"); await T.setDoc("items/" + id, Object.assign({ id, sku, unit: "each", cat: "Blanks", onHand: 0, reorderPoint: "", reorderQty: "", deleted: false, createdAt: now, updatedAt: now }, rec));
    await T.recordHistory("item", id, [{ f: "Item", o: "", n: "Added from Josh's cost audit", ev: 1 }]); out.items.push(sku + " added"); };
  await add("BLK-080-1206", { name: "Blank 12x6 Rectangle .080", cost: "3.05", vendorPrice: "2.91", vendorFreight: "0.14", vendorId: vend ? vend.id : "", vendorLast: "2026-10-30", vendorSource: "invoice USS45002", notes: "US Standard invoice USS45002: $2.91 + $0.14 freight" });
  await add("BLK-063-0633", { name: "Blank 6x33 Blade .063", cost: "", notes: "Price TBD — lines using it show as missing a cost until it's set" });
  out.vendor = !!vend;
  await new Promise((r) => setTimeout(r, 8000));
  for (const n of nums) { const p = byNum(n); if (!p) continue;
    try { out["re" + n] = await T.lockLineCosts(p.id, true); } catch (e) { out["re" + n] = "err " + String(e.message).slice(0, 60); } }
  await new Promise((r) => setTimeout(r, 8000));
  nums.forEach((n) => { const p = byNum(n); if (!p) return; out.after[n] = snap(p);
    const ms = (p.orderLines || []).filter((l) => l && !T.isCharge(l)).map((l) => T.quoteLineCost(l)).filter((c) => c.src === "missing").length;
    if (ms) out.missing[n] = ms; });
  return out;
})
