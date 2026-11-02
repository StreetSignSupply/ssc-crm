// One-time (Matt, 1 Nov): set Owner explicitly on the two team records that have no level set and whose access records
// already say owner (Matt's records, made before levels existed). Nobody else's level is touched. Counts only.
(async (T) => {
  const S = T.S, out = { set: 0, skipped: 0 };
  const acc = [...(S.access || new Map()).values()];
  for (const t of [...S.team.values()]) { if (t.deleted || t.access) continue;
    const r = acc.filter((a) => String(a.teamId) === String(t.id)).map((a) => a.role);
    if (r.length && r.every((x) => x === "owner")) { await T.fix("team/" + t.id, { access: "owner", updatedAt: Date.now() }, "Owner level set explicitly (it was owner already; the record had no level)"); out.set++; } else out.skipped++; }
  return out;
})
