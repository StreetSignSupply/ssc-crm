// One-time after file storage came back (Matt, 1 Nov): ask the mail worker to check every stored file once (so close-out
// can count real files), and mark test project P-2030 as internal so it never emails outside. Counts only.
(async (T) => {
  const S = T.S, out = { filesToCheck: 0, p2030: "not found" };
  for (const f of [...S.files.values()]) { if (f.deleted || f.link || f.verified === true || f.needsCheck === true || !/^https:\/\/firebasestorage\.googleapis\.com\//.test(String(f.url || ""))) continue;
    await T.push("files/" + f.id, { needsCheck: true }); out.filesToCheck++; }
  const p = [...S.projects.values()].find((x) => String(x.num) === "2030");
  if (p) { if (!p.internal) await T.fix("projects/" + p.id, { internal: true, updatedAt: Date.now() }, "Marked as a test project — never emails outside"); out.p2030 = "internal"; out.p2030NoMail = T.noMail ? T.noMail(Object.assign({}, p, { internal: true })) : "n/a"; }
  return out;
})
