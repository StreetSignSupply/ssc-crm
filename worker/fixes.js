// Read-only check for the evening fixes: which P-2028 fields mention a "Ranch", and what PDFs P-2025 has
// (counts, sizes, dates and whether the name carries the quote number — no names). Changes nothing.
(async (T) => {
  const S = T.S, out = {};
  const byNum = (n) => [...S.projects.values()].find((x) => String(x.num) === String(n) && !x.deleted);
  const p8 = byNum(2028);
  if (p8) { out.p2028 = Object.keys(p8).filter((k) => typeof p8[k] === "string" && /ranch/i.test(p8[k]));
    out.p2028lines = T.orderedLines(p8).map((l) => ({ build: l.build || "", grade: l.grade || "", ranch: /ranch/i.test(JSON.stringify(l)) })); }
  const p5 = byNum(2025);
  if (p5) { const no = String(p5.quote || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    out.p2025quote = !!no;
    out.p2025files = T.live(S.files).filter((f) => f.projectId === p5.id || (p5.accountId && f.accountId === p5.accountId)).map((f) => ({ proj: f.projectId === p5.id, pdf: /pdf/i.test((f.type || "") + (f.name || "")),
      size: f.size || 0, at: f.at || 0, hasNo: no ? String(f.name || "").toUpperCase().replace(/[^A-Z0-9]/g, "").indexOf(no) >= 0 : false, link: !!f.link, cat: f.cat || "", who: f.who || "" })); }
  return out;
})
