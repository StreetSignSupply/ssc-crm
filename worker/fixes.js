// Matt 10/28 7:25 PM. Runs once; counts only (no names or emails in this public file — they're read from the CRM).
// 1. Files uploaded on a vendor page before 2026.11.25-43 were saved with no vendor: each upload left an
//    "N files uploaded" note on the vendor, so files with no account/project/work order saved within a minute of
//    that note go back to that vendor.
// 2. Grimco: the other reps named with their email in its Notes go on its new People list.
(async (T) => {
  const S = T.S, live = T.live, out = { orphanFiles: 0, filesToVendor: 0, people: 0 };
  const ups = live(S.activity).filter(a => a.recType === "vendor" && /files? uploaded/i.test(String(a.text || a.body || "")));
  for (const f of live(S.files)) {
    if (f.accountId || f.projectId || f.jobId || f.vendorId || f.itemId) continue;
    out.orphanFiles++;
    const at = Number(f.at) || 0;
    const hit = ups.filter(a => Math.abs((Number(a.at) || 0) - at) < 120000).sort((x, y) => Math.abs(x.at - at) - Math.abs(y.at - at))[0];
    if (!hit) continue;
    await T.push("files/" + f.id, { vendorId: String(hit.recId), updatedAt: Date.now() });
    await T.recordHistory("vendor", String(hit.recId), [{ f: "Fix run", o: "", n: "Uploaded file put back on this vendor", ev: 1 }]);
    out.filesToVendor++;
  }
  const g = live(S.vendors).find(v => /^grimco\b/i.test(String(v.name || "").trim()));
  if (g) {
    const have = new Set((g.people || []).filter(x => x && !x.deleted).map(x => String(x.email || "").toLowerCase()));
    if (g.email) have.add(String(g.email).toLowerCase());
    const rx = /([A-Z][a-z]+(?:\s[A-Z][A-Za-z'’-]+)+)\s+([A-Za-z0-9._%+-]+@grimco\.com)(?:\s*\(([^)]{1,40})\))?/g;
    const add = []; let m;
    const loc = /las vegas/i.test(String(g.city || "") + " " + String(g.notes || "")) ? "Las Vegas, NV" : "";
    while ((m = rx.exec(String(g.notes || "")))) { const em = m[2].toLowerCase(); if (have.has(em)) continue; have.add(em);
      add.push({ id: T.uid("vp"), name: m[1].trim().replace(/^(Also|And|Plus|Contact|Contacts|Rep)\s+/, ""), title: m[3] ? m[3].trim().replace(/^./, c => c.toUpperCase()) : "", location: loc, email: m[2], phone: "", mobile: "", notes: "From the vendor notes", createdAt: Date.now() }); }
    if (add.length) { await T.fix("vendors/" + g.id, { people: (g.people || []).concat(add), updatedAt: Date.now() }, add.length + " rep(s) from the notes added to People");
      out.people = add.length; }
  }
  return out;
})
