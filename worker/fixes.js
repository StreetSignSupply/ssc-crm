// P-2028: the ship-to note names the wrong community — swap that "<Word> Ranch" for the project's own community name
// (the part of the project name before " - "). P-2025: of its two Quote PDFs, the older (the earlier, smaller quote)
// goes to the recycle bin; the newer stays. Counts only in the log.
(async (T) => {
  const S = T.S, out = {}; const now = Date.now();
  const byNum = (n) => [...S.projects.values()].find((x) => String(x.num) === String(n) && !x.deleted);
  const p8 = byNum(2028);
  if (p8) { const want = String(p8.name || "").split(" - ")[0].trim(); const a = String(p8.shipTo || ""); const b = want ? a.replace(/\b[A-Z][a-z]+ Ranch\b/g, want) : a;
    if (b !== a) { await T.fix("projects/" + p8.id, { shipTo: b, updatedAt: now }, "Fix run: ship-to note now names this project's community"); out.p2028 = "ship-to fixed"; } else out.p2028 = "no change"; }
  const p5 = byNum(2025);
  if (p5) { const pdfs = T.live(S.files).filter((f) => f.projectId === p5.id && /pdf/i.test((f.type || "") + (f.name || "")) && f.cat === "Quote").sort((x, y) => (Number(x.at) || 0) - (Number(y.at) || 0));
    if (pdfs.length === 2) { await T.push("files/" + pdfs[0].id, { deleted: true, deletedAt: now, deletedBy: "fix run", supersededBy: pdfs[1].id, updatedAt: now });
      await T.recordHistory("project", p5.id, [{ f: "Fix run", o: "", n: "The older quote PDF moved to the recycle bin (the newer one, with the full package, is kept)", ev: 1 }]); out.p2025 = "older PDF binned"; }
    else out.p2025 = "left (" + pdfs.length + " quote PDFs)"; }
  await new Promise((r) => setTimeout(r, 6000));
  return out;
})
