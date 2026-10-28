// Pictures for the Yavapai County annual bid (P-2014 / Q-1010): one to-scale drawing per bare blank line. Counts only in the output.
(async (T) => {
  const S = T.S, now = Date.now(), n = {};
  const BASE = "https://raw.githubusercontent.com/StreetSignSupply/ssc-crm/main/public/pics/blanks/";
  const p = T.live(S.projects).find((x) => String(x.num) === "2014");
  if (!p) return { error: "P-2014 not found" };
  let k = 0;
  const lines = T.orderedLines(p).map((l) => {
    const d = String(l.desc || "").toLowerCase(); const m = d.match(/bare\s+(\d+)\s*x\s*(\d+)/);
    if (!m) return l;
    const kind = /mile marker|directional/.test(d) ? "marker" : /extruded/.test(d) ? "extruded" : /diamond/.test(d) ? "diamond" : /rectangle/.test(d) ? "rect" : "";
    if (!kind) return l;
    k++; return Object.assign({}, l, { webImg: BASE + kind + "-" + m[1] + "x" + m[2] + ".png" });
  });
  await T.push("projects/" + p.id, { orderLines: lines, updatedAt: now });
  await T.recordHistory("project", p.id, [{ f: "Pictures", o: "", n: k + " blank lines got a to-scale drawing of the blank", ev: 1 }]);
  n.pictures = k; n.lines = lines.length;
  return n;
})
