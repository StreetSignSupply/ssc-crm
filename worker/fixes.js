// look only: the cost source now saved on each blank Josh checked. No writes.
(async (T) => {
  const S = T.S; const L = ["BLK-080-1806","BLK-080-2424D","BLK-080-2424O","BLK-080-1212","BLK-063-1218","BLK-063-1824-PW","BLK-080-2412","BLK-080-2424S","BLK-080-3030D","BLK-080-3030S","BLK-080-2430","BLK-080-1818","BLK-080-0636","BLK-080-3636O"];
  return L.map((k) => { const i = [...S.items.values()].find((x) => !x.deleted && String(x.sku || "").toUpperCase() === k); return k.slice(4) + ":" + (i ? (i.costSrc || "-") : "none"); }).join(" ");
})
