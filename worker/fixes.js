// Oct 30 look-only run: nothing is changed. Reads what "Find an item" returns for a few searches (catalog names only),
// the margin the CRM shows vs the costed-lines margin on the newest project, and opens the dashboards and a project page
// so their console errors are printed (counts and messages only, no names).
(async (T) => {
  const S = T.S, out = {};
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const q of ["stop", "R1-1", ".063"]) { try { out["f_" + q] = T.ordFindRows(q).map((r) => (r.title + " ~ " + (r.sub || "")).slice(0, 90)); } catch (e) { out["f_" + q] = "err " + String(e.message).slice(0, 80); } }
  try { out.sheetSample = ((S.sheet && S.sheet.rows) || []).filter((r) => /stop/i.test((r.title || "") + (r.name || ""))).slice(0, 3).map((r) => ({ t: String(r.title || "").slice(0, 70), n: String(r.name || "").slice(0, 70), c: String(r.code || "").slice(0, 50), m: String(r.mutcd || "").slice(0, 20), sz: r.size })); } catch (e) {}
  try { out.codes = T.codeList().filter((e) => /^R1-1$/i.test(e.code) || /stop/i.test(e.name)).slice(0, 5).map((e) => e.code + "|" + e.name); } catch (e) { out.codes = "err " + e.message; }
  const ps = [...S.projects.values()].filter((p) => !p.deleted).sort((a, b) => (b.num || 0) - (a.num || 0));
  const p30 = ps.find((p) => String(p.num) === "2030") || ps[0];
  if (p30) { try { out.m2030 = [T.projMargin(p30), T.costedMargin(p30)]; } catch (e) { out.m2030 = "err " + e.message; } }
  for (const r of ["home", "mybook", "project/" + (p30 ? p30.id : ""), "reports"]) { try { T.go(r); } catch (e) { out["go_" + r.split("/")[0]] = String(e.message).slice(0, 80); } await wait(4000); }
  return out;
})
