// Oct 29 evening fixes (counts/ids only in the log; no customer names in this file):
// P-2028: every line back to "work it out from the material", HIP green sheeting kept/set for the green blades,
//         and the project description's "<Word> Ranch" community name replaced with the project's own community name
//         (the part of the project name before " - ").
// P-2025: two PDFs for the same quote number in Files — the older one (the earlier, smaller quote) goes to the bin.
// P-2026: the stop sign line re-priced from the price list for its size and material (contractor account).
(async (T) => {
  const S = T.S, out = {}; const now = Date.now();
  const byNum = (n) => [...S.projects.values()].find((x) => String(x.num) === String(n) && !x.deleted);
  // P-2028
  const p8 = byNum(2028);
  if (p8) {
    const lines = T.orderedLines(p8).map((l) => Object.assign({}, l));
    let ch = 0;
    lines.forEach((l) => { if (T.isCharge(l)) return;
      if (l.build) { l.build = ""; ch++; }
      if (/green/i.test(l.desc || "") && !/HIP Green 3937/i.test(l.grade || "")) { l.grade = "3M HIP Green 3937"; ch++; } });
    const want = String(p8.name || "").split(" - ")[0].trim();
    const scope0 = String(p8.scope || "");
    const scope1 = want ? scope0.replace(/\b[A-Z][a-z]+ Ranch\b/g, want) : scope0;
    const patch = { updatedAt: now };
    if (ch) patch.orderLines = lines;
    if (scope1 !== scope0) patch.scope = scope1;
    if (Object.keys(patch).length > 1) await T.fix("projects/" + p8.id, patch, "Fix run: quote lines set to work out how they're made from the material" + (ch ? "" : "") + (scope1 !== scope0 ? "; description now names the right community" : ""));
    out.p2028 = { lineChanges: ch, scope: scope1 !== scope0 };
  }
  // P-2025
  const p5 = byNum(2025);
  if (p5) {
    const no = String(p5.quote || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const pdfs = T.live(S.files).filter((f) => f.projectId === p5.id && /\.pdf$/i.test(f.name || "") && no && String(f.name || "").toUpperCase().replace(/[^A-Z0-9]/g, "").indexOf(no) >= 0)
      .sort((a, b) => (Number(a.at) || 0) - (Number(b.at) || 0));
    if (pdfs.length > 1) { for (const f of pdfs.slice(0, -1)) await T.push("files/" + f.id, { deleted: true, deletedAt: now, deletedBy: "fix run", supersededBy: pdfs[pdfs.length - 1].id, updatedAt: now });
      await T.recordHistory("project", p5.id, [{ f: "Fix run", o: "", n: (pdfs.length - 1) + " older PDF of the same quote moved to the recycle bin (the newest is kept)", ev: 1 }]); }
    out.p2025 = { pdfs: pdfs.length, binned: Math.max(0, pdfs.length - 1) };
  }
  // P-2026
  const p6 = byNum(2026);
  if (p6) {
    const lines = T.orderedLines(p6).map((l) => Object.assign({}, l));
    const i = lines.findIndex((l) => /\bstop\b/i.test(l.desc || "") && !/not stop/i.test(l.desc || ""));
    if (i >= 0) { const l = lines[i]; const dp = T.defaultPrice(l, p6.accountId);
      out.p2026 = { was: Number(l.price), list: dp ? dp.price : null };
      if (dp && dp.price >= 55 && dp.price <= 80 && Math.abs(dp.price - Number(l.price)) > 0.005) { const was = l.price; l.price = dp.price.toFixed(2);
        await T.fix("projects/" + p6.id, { orderLines: lines, updatedAt: now }, "Fix run: stop sign line re-priced from the price list — was " + was + ", now " + l.price); out.p2026.set = true; } }
  }
  await new Promise((r) => setTimeout(r, 6000));
  return out;
})
