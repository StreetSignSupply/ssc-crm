// Matt's cost spec 10/28 (part 5 + locking existing jobs). Runs once through the CRM; every edit tagged "Fix run". Counts only.
(async (T) => {
  const S = T.S, live = T.live, out = { ecReattached: 0, blankVendorRetired: 0, blkRenamed: 0, aegpLinkRemoved: 0, projectsLocked: 0, linesLocked: 0 };
  const V = live(S.vendors); const cpc = V.find(v => /^cpc\b/i.test(String(v.name || "").trim()));
  const bySku = (sku) => live(S.items).find(i => String(i.sku || "").toUpperCase() === sku);
  // 1. EC film rows with no vendor → CPC (their prices match CPC's)
  if (cpc) for (const sku of ["EC-1171-30", "EC-1171-36", "EC-1171-48", "EC-1175-36", "EC-1179-30"]) {
    const i = bySku(sku); if (!i) continue;
    const L = T.itemVendors(i); let changed = false; const fixed = [];
    for (const v of L) { if (v.missing) { changed = true; if (!L.some(x => x.vendorId === cpc.id) && !fixed.some(x => x.vendorId === cpc.id)) fixed.push(Object.assign({}, v, { vendorId: cpc.id, missing: false })); } else fixed.push(v); }
    if (!changed) continue; if (fixed.length && !fixed.some(x => x.preferred)) fixed[0].preferred = true;
    await T.itemVendSave(i.id, fixed);
    await T.recordHistory("item", i.id, [{ f: "Fix run", o: "", n: "Vendor price with no vendor re-pointed to CPC (prices match CPC's)", ev: 1 }]); out.ecReattached++;
  }
  await new Promise(r => setTimeout(r, 3000));
  // the nameless vendor those rows pointed at: retired once nothing uses it
  for (const v of live(S.vendors).filter(v => !String(v.name || "").trim())) {
    const used = live(S.items).some(i => i.vendorId === v.id || (i.vendors || []).some(x => x.vendorId === v.id));
    if (!used) { await T.fix("vendors/" + v.id, { deleted: true, deletedAt: Date.now(), deletedBy: "fix run", updatedAt: Date.now() }, "Vendor with no name and nothing linked — to the recycle bin"); out.blankVendorRetired++; }
    else out.blankVendorStillUsed = (out.blankVendorStillUsed || 0) + 1;
  }
  // 2. BLK-080-2412 is .080, not .063
  { const i = bySku("BLK-080-2412"); if (i && /\.063/.test(i.name || "")) { await T.fix("items/" + i.id, { name: String(i.name).replace(/\.063/g, ".080"), updatedAt: Date.now() }, "Name said .063 for an .080 blank"); out.blkRenamed++; }
    else out.blkAlready = i ? String(i.name || "").includes(".080") : "not found"; }
  // 3. AEGP-7310-30 was linked to Interstate SignWays by mistake
  { const i = bySku("AEGP-7310-30"); const isw = V.find(v => /interstate\s*sign\s*ways/i.test(String(v.name || "")));
    if (i && isw) { const L = T.itemVendors(i); if (L.some(x => x.vendorId === isw.id)) { const rest = L.filter(x => x.vendorId !== isw.id); if (rest.length && !rest.some(x => x.preferred)) rest[0].preferred = true;
      await T.itemVendSave(i.id, rest); await T.recordHistory("item", i.id, [{ f: "Fix run", o: "Interstate SignWays", n: "Link removed (added by mistake)", ev: 1 }]);
      await T.recordHistory("vendor", isw.id, [{ f: "Fix run", o: "", n: "AEGP-7310-30 unlinked (added by mistake)", ev: 1 }]); out.aegpLinkRemoved++; } } }
  // 4. lock today's material cost on every project that's quoted or further along
  for (const p of live(S.projects).filter(p => ["quoted", "won", "production", "shipped", "invoiced", "closed"].includes(p.stage))) {
    const n = await T.lockLineCosts(p.id); if (n) { out.projectsLocked++; out.linesLocked += n; } }
  return out;
})
