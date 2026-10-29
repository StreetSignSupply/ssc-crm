// Recheck #9: the owner confirmed QuickBooks invoice 1009 is billed to this project's customer, so put 1009 back on
// P-2002, and fold the separate one-person account for that customer's contact into the customer's main account
// (same company), so the QuickBooks check sees the invoice's customer name on the right account. Counts/ids only.
(async (T) => {
  const S = T.S, out = {};
  const p = [...S.projects.values()].find((x) => String(x.num) === "2002" && !x.deleted);
  if (p && !String(p.invNum || "").trim()) { await T.fix("projects/" + p.id, { invNum: "1009", updatedAt: Date.now() }, "Invoice # 1009 put back — confirmed it bills this customer; was blank"); out.p2002 = "1009"; }
  else out.p2002 = p ? "left (" + (p.invNum ? "has a number" : "?") + ")" : "not found";
  const from = S.accounts.get("amvpf843rrbd"), to = S.accounts.get("amuddq217tja");
  if (from && !from.deleted && to && !to.deleted) out.merged = await T.mergeAccounts("amvpf843rrbd", "amuddq217tja", "fix run: same company — the contact's own account folded into the company account");
  else out.merged = "skipped";
  await new Promise((r) => setTimeout(r, 6000));
  return out;
})
