// Oct 29 night fixes (counts only in the log, no names in this file):
// P-2025: the newest quote PDF must be the live one — if a cleanup binned it, put it back (older ones stay in the bin).
// P-2025 / P-2026: the note "Posts/hardware not quoted (no listed price)." is wrong now that the posts and hardware are
//   on the quote — that sentence comes out.
// P-2028: "Grade TBD" in the notes becomes the grade on the lines.
(async (T) => {
  const S = T.S, out = {}; const now = Date.now();
  const byNum = (n) => [...S.projects.values()].find((x) => String(x.num) === String(n) && !x.deleted);
  const p5 = byNum(2025);
  if (p5) { const all = [...S.files.values()].filter((f) => f.projectId === p5.id && f.cat === "Quote" && /pdf/i.test((f.type || "") + (f.name || ""))).sort((a, b) => (Number(a.at) || 0) - (Number(b.at) || 0));
    out.p2025 = all.map((f) => ({ at: f.at, del: !!f.deleted, by: f.deleted ? (f.deletedBy === "fix run" ? "fix" : f.supersededBy ? "replaced" : "person") : "", size: f.size || 0 }));
    const newest = all[all.length - 1];
    if (newest && newest.deleted) { await T.push("files/" + newest.id, { deleted: false, deletedAt: "", deletedBy: "", supersededBy: "", updatedAt: now });
      await T.recordHistory("project", p5.id, [{ f: "Fix run", o: "", n: "The newest quote PDF was put back from the recycle bin", ev: 1 }]); out.p2025restored = true; } }
  for (const n of [2025, 2026]) { const p = byNum(n); if (!p) continue;
    const hasHw = T.orderedLines(p).some((l) => /telespar|anchor|post|bolt|nut|rivet/i.test(l.desc || ""));
    const a = String(p.notes || ""); const b = a.replace(/\s*Posts\/hardware not quoted \(no listed price\)\.?/i, "");
    if (hasHw && b !== a) { await T.fix("projects/" + p.id, { notes: b, updatedAt: now }, "Fix run: removed the note that posts and hardware weren't quoted — they are on the quote"); out["n" + n] = "note fixed"; } }
  const p8 = byNum(2028);
  if (p8) { const g = (T.orderedLines(p8).find((l) => !T.isCharge(l) && l.grade) || {}).grade || "";
    const a = String(p8.notes || ""); const b = g ? a.replace(/Grade TBD\.?/i, "Grade: " + g + ".") : a;
    if (b !== a) { await T.fix("projects/" + p8.id, { notes: b, updatedAt: now }, "Fix run: notes now give the grade on the lines"); out.p2028 = "grade in notes"; } }
  await new Promise((r) => setTimeout(r, 6000));
  return out;
})
