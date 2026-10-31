// Oct 30 look-only #2: how P-2014's extruded lines point at their blanks, extruded items in inventory, P-2036's bin entry. No writes.
(async (T) => {
  const S = T.S, out = {};
  const p = [...S.projects.values()].find((x) => String(x.num) === "2014" && !x.deleted);
  out.n = (p.orderLines || []).filter((l) => l && /extruded/i.test(l.desc || "")).map((l) => {
    let c = null; try { c = T.quoteLineCostLive(l); } catch (e) {}
    return { sz: l.size, code: l.code || "", sub: (l.sub || "").slice(0, 40), grade: (l.grade || "").slice(0, 20), sk: l.sheetKey || "", item: l.itemId || "", cost: c && c.cost, why: c && String(c.why || "").slice(0, 70) };
  });
  out.ext = [...S.items.values()].filter((i) => !i.deleted && /extru/i.test((i.name || "") + " " + (i.sku || ""))).map((i) => i.sku + "|" + i.cost);
  const p36 = [...S.projects.values()].find((x) => String(x.num) === "2036");
  out.p36 = p36 ? { deletedAt: p36.deletedAt || 0, why: String(p36.deleteWhy || p36.deletedWhy || "").slice(0, 60), lines: (p36.orderLines || []).length, jobs: [...S.jobs.values()].filter((j) => j.projectId === p36.id).map((j) => (j.deleted ? "d" : "") + (j.status || "")).join(","), keys: Object.keys(p36).filter((k) => /delet|merge|dup|copy/i.test(k)).join(",") } : null;
  delete out.n; return out;
})
