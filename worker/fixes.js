// Matt 10/28 12:32 AM: WO 1012 "was picked up". Will call, moved to shipped through the CRM's own advance()
// (QC is not marked signed off — nobody said it was; the work order shows "QC not signed off"). Runs once.
(async (T) => {
  const S = T.S, n = {};
  const j = S.jobs.get("1012");
  if (!j || j.deleted) return { error: "WO 1012 not found" };
  if (j.status !== "shipped") {
    const sh = Object.assign({ method: "", carrier: "", tracking: "", cartons: "", weight: "" }, j.ship || {}, { method: "Will call" });
    await T.fix("jobs/1012", { ship: sh, updatedAt: Date.now() }, "Picked up by the customer (Matt, 10/28) — will call, no tracking; pickup date not recorded");
    await T.advance("1012", "shipped", true);
    n.wo1012 = "shipped (picked up)";
  } else n.wo1012 = "already shipped";
  return n;
})
