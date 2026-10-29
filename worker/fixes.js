// P-2014: lines with no sheeting grade whose own name says which one (HIP, DG3 or EG) get that grade, so they cost.
// Lines that don't say are left alone and counted. Counts only.
(async (T) => {
  const p = T.live(T.S.projects).find((x) => String(x.num) === "2014"); if (!p) return { found: false };
  let set = 0, unclear = 0; const by = {};
  const lines = (p.orderLines || []).map((l) => { if (!l || l.charge || String(l.grade || "").trim()) return l;
    const t = String((l.desc || "") + " " + (l.title || "") + " " + (l.code || "")).toUpperCase();
    const hits = ["HIP", "DG3", "EG"].filter((g) => new RegExp("\\b" + g + "\\b").test(t));
    if (hits.length !== 1) { unclear++; return l; }
    set++; by[hits[0]] = (by[hits[0]] || 0) + 1; return Object.assign({}, l, { grade: hits[0] }); });
  if (set) { await T.push("projects/" + p.id, { orderLines: lines, updatedAt: Date.now() });
    await T.recordHistory("project", p.id, [{ f: "Fix run", o: "", n: "Sheeting grade filled in on " + set + " lines from the grade in their own name", ev: 1 }]); }
  return { set, unclear, by };
})
