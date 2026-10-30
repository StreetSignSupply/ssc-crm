// Oct 30 look-only run #5: nothing is changed. On the test project P-2030: the price-source labels the quote table shows
// (labels only). On P-2028: whether a proof spec still runs a thickness into a word (yes/no + which part), and whether
// the proof's fingerprint is stable between two reads. Counts and labels only.
(async (T) => {
  const S = T.S, out = {};
  const ps = [...S.projects.values()].filter((p) => !p.deleted);
  const p30 = ps.find((p) => String(p.num) === "2030");
  if (p30) { T.go("project/" + p30.id); await new Promise((r) => setTimeout(r, 4000));
    out.cells = [...document.querySelectorAll("table.qlines tbody tr")].map((tr) => { const td = tr.children[5]; return td ? (td.querySelector(".sub") || {}).textContent || "(none)" : "-"; }).slice(0, 12);
    out.src = (p30.orderLines || []).map((l) => { try { return T.linePriceSrc(p30, l) || "(empty)"; } catch (e) { return "err"; } }); }
  const p28 = ps.find((p) => String(p.num) === "2028");
  if (p28) { try { const L = T.proofLines(p28); out.glued = L.map((l) => { const m = /\.\d{2,3}[a-z]/i.test(l.spec) ? "spec" : /\.\d{2,3}[a-z]/i.test(l.name) ? "name" : ""; return m; });
      const arts = T.proofArt(p28).concat(T.proofLineArts(p28)); out.sigStable = T.proofSig(p28, arts) === T.proofSig(p28, T.proofArt(p28).concat(T.proofLineArts(p28))); out.sigSaved = p28.proofSig ? (p28.proofSig === T.proofSig(p28, arts)) : "none";
      out.specShape = L.map((l) => l.spec.replace(/[A-Za-z]+/g, "a").slice(0, 60)); } catch (e) { out.err = String(e.message).slice(0, 100); } }
  return out;
})
