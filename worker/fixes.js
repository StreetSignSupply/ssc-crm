// Matt's note (11:15 PM): the 6x33 .063 blade is cut from the Grimco 36x6 flat blank, $17.01 (quote 18618736-00017-v5,
// part B360685BARE8000). That blank isn't in inventory, so it's added under its Grimco part number (not a BLK- SKU, so no
// other 36x6 sign starts using a $17 blank), then BLK-063-0633 points at it and P-2028's costs are retaken. Counts only.
(async (T) => {
  const S = T.S, out = {}; const now = Date.now();
  const items = [...S.items.values()].filter((i) => !i.deleted);
  const g = [...S.vendors.values()].find((v) => !v.deleted && /grimco/i.test(v.name || ""));
  out.grimco = !!g;
  let par = items.find((i) => String(i.sku || "").toUpperCase() === "GRM-B360685BARE8000");
  if (!par) { const id = T.uid("it");
    par = { id, sku: "GRM-B360685BARE8000", name: "Blank 36x6 flat street name — Grimco B360685BARE8000 (bare, alodine)", unit: "each", cat: "Substrate / blanks",
      cost: "17.01", costSrc: "quote", vendorId: g ? g.id : "", vendorPrice: "17.01", vendorFreight: "", vendorPart: "B360685BARE8000", vendorLast: "",
      vendorSource: "Quote 18618736-00017-v5 (10/30/2026, expires 11/26)", notes: "Gauge not stated on the quote (part code 85 is Grimco's .080). Orders under $150 may get $15 shipping.",
      onHand: 0, reorderPoint: "", reorderQty: "", deleted: false, createdAt: now, updatedAt: now };
    await T.setDoc("items/" + id, par); await T.recordHistory("item", id, [{ f: "Item", o: "", n: "Added: Grimco quote 18618736-00017-v5 at $17.01", ev: 1 }]); out.added = 1; }
  const b = items.find((i) => String(i.sku || "").toUpperCase() === "BLK-063-0633");
  if (b) { await T.push("items/" + b.id, { costSrc: "cut", cutFrom: par.id, cutLabor: "", updatedAt: now });
    await T.recordHistory("item", b.id, [{ f: "Cost source", o: b.costSrc || "", n: "Cut from GRM-B360685BARE8000 (Grimco 36x6, $17.01)" }]); out.blade = 1; }
  await new Promise((r) => setTimeout(r, 5000));
  const p = [...S.projects.values()].find((x) => String(x.num) === "2028" && !x.deleted);
  if (p) { const r1 = (m) => (m == null ? null : Math.round(m * 10) / 10); out.before = r1(T.projMargin(p));
    out.re = await T.lockLineCosts(p.id, true); await new Promise((r) => setTimeout(r, 6000));
    const q = S.projects.get(p.id); out.after = r1(T.projMargin(q));
    out.lineCosts = (q.orderLines || []).filter((l) => l && !T.isCharge(l)).map((l) => { try { const c = T.quoteLineCost(l); return c.cost + (c.src === "missing" ? "m" : ""); } catch (e) { return "?"; } }); }
  return out;
})
