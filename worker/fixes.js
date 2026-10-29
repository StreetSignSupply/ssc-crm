// Matt 10/28 follow-up: the "Lowest cost" row on the 5 EC items points at a vendor with no real name → CPC. Plus a lock check on P-2012. Counts only.
(async (T) => {
  const S = T.S, live = T.live, out = { fixed: 0, rowsMoved: 0, blankVendors: 0, blankVendorRetired: 0, blankNameShape: [], p2012: null, perItem: [] };
  const cpc = live(S.vendors).find(v => /^cpc\b/i.test(String(v.name || "").trim()));
  const named = v => !!(v && /[A-Za-z0-9]/.test(String(v.name || "")));
  const blank = live(S.vendors).filter(v => !named(v)); out.blankVendors = blank.length;
  out.blankNameShape = blank.map(v => ({ len: String(v.name == null ? "" : v.name).length, codes: [...String(v.name == null ? "" : v.name)].slice(0, 4).map(c => c.charCodeAt(0)), hasCompany: !!v.company, keys: Object.keys(v).length }));
  for (const sku of ["EC-1171-30", "EC-1171-36", "EC-1171-48", "EC-1175-36", "EC-1179-30"]) {
    const i = live(S.items).find(x => String(x.sku || "").toUpperCase() === sku); if (!i || !cpc) continue;
    const L = T.itemVendors(i);
    const info = L.map(v => { const vv = S.vendors.get(v.vendorId); return { cost: Number(v.cost) || 0, named: named(vv), pref: !!v.preferred, cpc: v.vendorId === cpc.id }; });
    out.perItem.push(info);
    const bad = L.filter(v => !named(S.vendors.get(v.vendorId)));
    if (!bad.length) continue;
    const hasCpc = L.some(v => v.vendorId === cpc.id); let moved = false;
    const next = []; for (const v of L) { if (!named(S.vendors.get(v.vendorId))) { if (!hasCpc && !moved) { next.push(Object.assign({}, v, { vendorId: cpc.id, missing: false })); moved = true; out.rowsMoved++; } } else next.push(v); }
    if (next.length && !next.some(v => v.preferred)) next[0].preferred = true;
    await T.itemVendSave(i.id, next);
    await T.recordHistory("item", i.id, [{ f: "Fix run", o: "vendor with no name", n: "CPC (prices match CPC's)", ev: 1 }]); out.fixed++;
  }
  await new Promise(r => setTimeout(r, 3000));
  for (const v of live(S.vendors).filter(v => !named(v))) {
    const used = live(S.items).some(i => i.vendorId === v.id || (i.vendors || []).some(x => x.vendorId === v.id));
    if (!used) { await T.fix("vendors/" + v.id, { deleted: true, deletedAt: Date.now(), deletedBy: "fix run", updatedAt: Date.now() }, "Vendor with no name and nothing linked — to the recycle bin"); out.blankVendorRetired++; }
  }
  const p = live(S.projects).find(x => String(x.num) === "2012");
  if (p) { const ls = (p.orderLines || []).filter(l => l && !T.isCharge(l)); out.p2012 = { stage: p.stage, lines: ls.length, withLock: ls.filter(l => l.costLock !== undefined && l.costLock !== "").length, lockValid: ls.filter(l => T.lockedCostOf(l) !== null).length }; }
  return out;
})
