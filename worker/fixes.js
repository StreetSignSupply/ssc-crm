// Matt's list (10/31 12:19 AM): merge the two EC Red 1172 36in records into EC-1172-36 (stock moves and history carried over,
// the duplicate binned only after), restore P-2036 from the recycle bin, and say what WO 1020 has pulled. Counts only.
(async (T) => {
  const S = T.S, out = {}; const now = Date.now();
  const keep = [...S.items.values()].find((i) => !i.deleted && String(i.sku || "").toUpperCase() === "EC-1172-36");
  const dup = [...S.items.values()].find((i) => !i.deleted && i !== keep && !i.sku && /1172/.test(i.name || "") && /36/.test(i.name || ""));
  if (keep && dup) {
    const txs = [...S.invtx.values()].filter((t) => t.itemId === dup.id || t.swapFor === dup.id);
    for (const t of txs) await T.push("invtx/" + t.id, Object.assign({}, t.itemId === dup.id ? { itemId: keep.id } : {}, t.swapFor === dup.id ? { swapFor: keep.id } : {}, { mergedFrom: dup.id }));
    const oh = (Number(keep.onHand) || 0) + (Number(dup.onHand) || 0);
    await T.push("items/" + keep.id, { onHand: oh, updatedAt: now });
    const h = T.histOf("item", dup.id) || [];
    if (h.length) await T.recordHistory("item", keep.id, h.map((e) => Object.assign({}, e, { n: "(from the merged duplicate) " + String(e.n || "") })));
    await T.recordHistory("item", keep.id, [{ f: "Merged", o: "", n: "Merged the duplicate record \"" + dup.name + "\" into this one — " + txs.length + " stock movement" + (txs.length === 1 ? "" : "s") + " and its history moved here", ev: 1 }]);
    await T.push("items/" + dup.id, { deleted: true, deletedAt: now, deletedBy: "AI", deletedWith: "", mergedInto: keep.id, updatedAt: now });
    await T.recordHistory("item", dup.id, [{ f: "Merged", o: "", n: "Merged into EC-1172-36 (stock movements and history moved there)", ev: 1 }]);
    out.merge = { tx: txs.length, hist: h.length, onHand: oh };
  } else out.merge = { keep: !!keep, dup: !!dup };
  const p = [...S.projects.values()].find((x) => String(x.num) === "2036");
  if (p && p.deleted) { await T.restore("project", p.id); out.p2036 = "restored"; } else out.p2036 = p ? "not in bin" : "missing";
  await new Promise((r) => setTimeout(r, 4000));
  out.wo1020 = T.txOfJob(1020).map((t) => { const i = S.items.get(t.itemId); return t.type + ":" + (i ? (i.sku || i.name || "").slice(0, 16) : "?") + ":" + t.qty; });
  return out;
})
