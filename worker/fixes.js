// Read-only: the 5 files attached to nothing — category, day, type, and which vendor (by id) its file name mentions. No names printed.
(async (T) => {
  const S = T.S, live = T.live; const V = live(S.vendors);
  return live(S.files).filter(f => !(f.accountId || f.projectId || f.jobId || f.vendorId || f.itemId)).map(f => {
    const n = String(f.name || "").toLowerCase();
    const v = V.find(v => { const w = String(v.name || "").toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length >= 4)[0]; return w && n.indexOf(w) >= 0; });
    return { cat: f.cat, day: new Date(Number(f.at) || 0).toISOString().slice(0, 16), type: f.type, who: f.who, vendorByName: v ? v.id : "", invoiceInName: /inv/i.test(n) };
  });
})
