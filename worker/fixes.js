// Recheck #8: P-2002 carries an invoice number that QuickBooks shows on a different customer's invoice (a wrong
// match from the first QuickBooks check). Clear it, keeping the old value in the record's history. Counts only.
(async (T) => {
  const S = T.S, out = {};
  const p = [...S.projects.values()].find((x) => String(x.num) === "2002" && !x.deleted);
  if (p && String(p.invNum || "").trim() === "1009") { await T.fix("projects/" + p.id, { invNum: "", updatedAt: Date.now() }, "Invoice # 1009 removed — in QuickBooks that number is a different customer's invoice; was 1009"); out.p2002 = "cleared"; }
  else out.p2002 = p ? "left (not 1009)" : "not found";
  await new Promise((r) => setTimeout(r, 6000));
  return out;
})
