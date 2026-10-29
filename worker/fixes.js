// Database lock, step 1: write the sign-in access list from the team list (who may open the CRM). Counts only.
(async (T) => {
  const S = T.S, team = T.live(S.team).filter((t) => String(t.name || "").trim());
  const emails = team.map((t) => String(t.email || "").trim().toLowerCase()).filter(Boolean);
  const r = await T.accessSync(true);
  const want = T.accessWanted();
  return { teamMembers: team.length, withEmail: emails.length, onCompanyDomain: emails.filter((e) => /@streetsignsupply\.com$/.test(e)).length,
    withSignInIds: team.filter((t) => T.signIns(t).length).length, owners: team.filter((t) => !t.access || t.access === "owner").length,
    accessRecords: Object.keys(want).length, written: r.n, removed: r.gone || 0 };
})
