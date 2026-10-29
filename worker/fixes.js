// P-2014: what the lines with no grade are (word counts only, read-only).
(async (T) => {
  const p = T.live(T.S.projects).find((x) => String(x.num) === "2014"); if (!p) return { found: false };
  const L = (p.orderLines || []).filter((l) => l && !l.charge && !String(l.grade || "").trim());
  const kinds = {}; const words = {};
  L.forEach((l) => { const t = String((l.desc || "") + " " + (l.code || "")).toLowerCase();
    const k = /post|u-?channel|square tub|anchor|bracket|bolt|rivet|hardware|cap|clamp/.test(t) ? "post/hardware" : /blank|aluminum|alum|\.080|\.063|sheet/.test(t) ? "blank/aluminum" : /sign|r\d|w\d|stop|speed/.test(t) ? "sign" : "other";
    kinds[k] = (kinds[k] || 0) + 1;
    (t.match(/[a-z]{4,}/g) || []).forEach((w) => words[w] = (words[w] || 0) + 1); });
  const top = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 12).map((x) => x[0] + ":" + x[1]).join(" ");
  return { lines: L.length, kinds, hasSize: L.filter((l) => T.parseSize(l.size)).length, priced: L.filter((l) => Number(l.price) > 0).length, top };
})
