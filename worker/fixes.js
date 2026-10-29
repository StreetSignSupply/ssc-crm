// Matt 10/28: files saved with no record (agents' vendor quotes from this afternoon) go to the vendor their file name names. Counts only.
(async (T) => {
  const S = T.S, live = T.live, V = live(S.vendors), out = { unattached: 0, toVendor: 0 };
  for (const f of live(S.files)) {
    if (f.accountId || f.projectId || f.jobId || f.vendorId || f.itemId) continue;
    out.unattached++;
    const n = String(f.name || "").toLowerCase();
    const hits = V.filter(v => { const w = String(v.name || "").toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length >= 4)[0]; return w && n.indexOf(w) >= 0; });
    if (hits.length !== 1) continue;
    await T.push("files/" + f.id, { vendorId: hits[0].id, updatedAt: Date.now() });
    await T.recordHistory("vendor", hits[0].id, [{ f: "Fix run", o: "", n: "Vendor quote file attached to this vendor", ev: 1 }]);
    out.toVendor++;
  }
  return out;
})
