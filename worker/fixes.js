// Oct 30 cost fixes round 3 (Matt's note, 11:06 PM): BLK-080-3030O to the US Standard invoice price, then costs re-taken on every
// open project with a stop or handicap/no-parking sign under the -96 rules (octagon area, face area × waste). Counts and margins only.
(async (T) => {
  const S = T.S, out = {}; const now = Date.now();
  const it = [...S.items.values()].find((i) => !i.deleted && String(i.sku || "").toUpperCase() === "BLK-080-3030O");
  if (it) { const was = it.cost, fr = Number(it.vendorFreight) || 0, c = 25.84;
    if (Number(was) !== c) { await T.push("items/" + it.id, { cost: String(c), vendorPrice: it.vendorPrice !== undefined && it.vendorPrice !== "" ? String(Math.round((c - fr) * 100) / 100) : (it.vendorPrice || ""), vendorLast: "2026-10-13", vendorSource: "invoice USS45002", updatedAt: now });
      await T.recordHistory("item", it.id, [{ f: "Unit cost", o: String(was || ""), n: "25.84 (US Standard invoice USS45002, 10/13)" }]); }
    out.oct30 = was + ">" + c; } else out.oct30 = "not found";
  const shut = ["lost", "closed", "invoiced", "shipped"];
  const hit = (l) => l && !T.isCharge(l) && (T.isStopSign(l) || /handicap|accessible|R7-8|R7-1\b|no parking/i.test((l.desc || "") + " " + (l.code || "")));
  const ps = [...S.projects.values()].filter((p) => !p.deleted && shut.indexOf(p.stage) < 0 && (p.orderLines || []).some(hit));
  const r1 = (m) => (m == null ? null : Math.round(m * 10) / 10);
  out.before = {}; out.after = {}; out.re = {};
  ps.forEach((p) => { out.before[p.num] = r1(T.projMargin(p)); });
  await new Promise((r) => setTimeout(r, 4000));
  for (const p of ps) out.re[p.num] = await T.lockLineCosts(p.id, true);
  await new Promise((r) => setTimeout(r, 8000));
  ps.forEach((p) => { const q = S.projects.get(p.id); out.after[p.num] = r1(T.projMargin(q)); });
  const P = (n) => [...S.projects.values()].find((x) => String(x.num) === String(n) && !x.deleted);
  const c = (n, re) => { const p = P(n); const l = p && (p.orderLines || []).find((x) => x && re.test((x.desc || "") + " " + (x.code || ""))); try { return l ? T.quoteLineCost(l).cost : null; } catch (e) { return null; } };
  out.stop33 = c(2033, /R1-1|\bstop\b/i); out.hc33 = c(2033, /R7-8\b|handicap/i); out.r71 = c(2029, /R7-1/i);
  return out;
})
