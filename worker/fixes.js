// Oct 29 recheck #7 data fixes (counts and opaque ids only in the log):
// 1) P-2010 paid date from QuickBooks (its invoice was paid through QuickBooks Payments; payment 10/14, deposit 10/16)
// 2) P-2002 and P-2010 re-sent to the CRM Orders sheet (the backup restore wrote them directly, so the sheet kept the old numbers)
// 3) old shop key moved out of the general settings record into settings/secrets
// 4) three duplicates merged (one account, two contacts), by record id
// 5) which team member should keep each reminder row on the sheet (rep, else owner)
(async (T) => {
  const S = T.S, out = {}; const db = T.getDb(); const now = Date.now();
  const byNum = (n) => [...S.projects.values()].find((p) => String(p.num) === String(n) && !p.deleted);
  const p10 = byNum(2010);
  if (p10 && p10.paidDate !== "2026-10-14") { await T.fix("projects/" + p10.id, { paidDate: "2026-10-14", updatedAt: now }, "Paid date set from QuickBooks: invoice paid in full through QuickBooks Payments on 10/14 (deposit 10/16) — was " + (p10.paidDate || "blank")); out.p2010 = "set"; }
  const p02 = byNum(2002);
  for (const p of [p02, p10].filter(Boolean)) { await T.push("projects/" + p.id, { updatedAt: Date.now() }); }
  out.resent = [p02, p10].filter(Boolean).length;
  // shop key
  try { const b = (await db.doc("settings/brand").get()); const bd = b && b.exists ? b.data() : {};
    if (bd && bd.shopToken) { const sx = await db.doc("settings/secrets").get(); const sd = sx && sx.exists ? sx.data() : {};
      if (!sd.shopToken) await db.doc("settings/secrets").set(Object.assign({}, sd, { shopToken: bd.shopToken }));
      await db.doc("settings/brand").set(Object.assign({}, bd, { shopToken: "" })); out.shopKey = "moved"; } else out.shopKey = "already clear"; } catch (e) { out.shopKey = "error " + String(e.message || e).slice(0, 60); }
  // merges (ids from the CRM Orders tab)
  const merges = [];
  if (S.accounts.get("amvpf832o22f") && !S.accounts.get("amvpf832o22f").deleted && S.accounts.get("amv6zayohk1z")) merges.push(["acct", await T.mergeAccounts("amvpf832o22f", "amv6zayohk1z", "fix run: same person entered twice")]);
  if (S.contacts.get("ctmvpf839fhtr") && !S.contacts.get("ctmvpf839fhtr").deleted && S.contacts.get("ctmv6zbkk3ymh")) merges.push(["contact", await T.mergeContacts("ctmvpf839fhtr", "ctmv6zbkk3ymh", "fix run: same person entered twice")]);
  if (S.contacts.get("ctmvpi295mlqc") && !S.contacts.get("ctmvpi295mlqc").deleted && S.contacts.get("ctmvp6frxq284")) merges.push(["contact", await T.mergeContacts("ctmvpi295mlqc", "ctmvp6frxq284", "fix run: same inbox entered twice; kept the address they write from")]);
  out.merged = merges;
  out.dupPairsLeft = T.dupContactPairs().length;
  // reminders: who should get each one
  try { const all = T.remAll(); const reach = (t) => t && !t.deleted && String(t.name || "").trim() && (T.remEmailOf(t) || t.phone);
    const owner = T.live(S.team).find((t) => (t.access || "owner") === "owner" && reach(t));
    const keep = {}; ["terms:pmug0f7o7qk4", "proof:pmug0f7o7qk4:2", "terms:pmux3a0la2o3", "proof:pmvo71fw508q:1", "followup:pmvmz15tbg1z:1"].forEach((rid) => {
      const r = all.find((x) => x.id === rid); const rp = r && r.rep ? S.team.get(r.rep) : null; const w = reach(rp) ? rp : owner; keep[rid] = w ? w.id : "";
      if (!r) { const pid = rid.split(":")[1]; const p = S.projects.get(pid); const rp2 = p && p.repId ? S.team.get(p.repId) : null; keep[rid] = (reach(rp2) ? rp2 : owner || {}).id || ""; } });
    out.keepReminder = keep; } catch (e) { out.keepReminder = "error " + String(e.message || e).slice(0, 60); }
  await new Promise((r) => setTimeout(r, 8000));   // let the sheet sync go out
  return out;
})
