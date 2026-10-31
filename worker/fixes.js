// Oct 30 cost fixes round 2 (Matt's fix list, 10:19 PM): two blanks into "Substrate / blanks", costs re-taken on nine jobs
// with the -95 rules (printed legends, stops on white + red ink, extruded blanks). Counts and margins only.
(async (T) => {
  const S = T.S, out = { cat: [] }; const now = Date.now();
  for (const sku of ["BLK-080-1206", "BLK-063-0633"]) { const it = [...S.items.values()].find((i) => !i.deleted && String(i.sku || "").toUpperCase() === sku);
    if (it && it.cat !== "Substrate / blanks") { await T.fix("items/" + it.id, { cat: "Substrate / blanks", updatedAt: now }, "Category: Blanks → Substrate / blanks (same as every other blank)"); out.cat.push(sku); } }
  const nums = [2014, 2017, 2025, 2026, 2029, 2031, 2032, 2033, 2035]; out.before = {}; out.after = {}; out.re = {};
  const P = (n) => [...S.projects.values()].find((x) => String(x.num) === String(n) && !x.deleted);
  const r1 = (m) => (m == null ? null : Math.round(m * 10) / 10);
  for (const n of nums) { const p = P(n); if (p) out.before[n] = r1(T.projMargin(p)); }
  for (const n of nums) { const p = P(n); if (!p) continue; out.re[n] = await T.lockLineCosts(p.id, true); }
  await new Promise((r) => setTimeout(r, 8000));
  for (const n of nums) { const p = P(n); if (p) out.after[n] = r1(T.projMargin(p)); }
  // spot checks Josh named: the Van Accessible plaque and a 24x24 stop (cost each, today)
  const ln = (n, re) => { const p = P(n); return p && (p.orderLines || []).find((l) => l && re.test((l.desc || "") + " " + (l.code || ""))); };
  const c = (l) => { try { return l ? T.quoteLineCost(l).cost : null; } catch (e) { return null; } };
  out.van = c(ln(2033, /Van Accessible/i)); out.stop = c(ln(2033, /R1-1|stop/i)); out.ext18 = c(ln(2014, /extruded.*18x6|^4\.1/i));
  const p36 = [...S.projects.values()].find((x) => String(x.num) === "2036");
  out.p36 = p36 ? { ai: p36.deletedBy === "AI", w: String(p36.deletedWith || "").split(":")[0] } : null;
  return out;
})
