// Oct 30 look-only run #3: nothing is changed. For Stop-sign quote lines, which picture the quote PDF uses and
// whether it can be copied into the PDF. Hosts and sizes only.
(async (T) => {
  const S = T.S, out = { pics: [] };
  const ps = [...S.projects.values()].filter((p) => !p.deleted);
  for (const p of ps) for (const l of (p.orderLines || [])) {
    if (!l || !(/^R1-1$/i.test(String(l.code || "").trim()) || /\bstop\b/i.test(String(l.desc || "")) && !/here|ahead|when/i.test(String(l.desc || "")))) continue;
    if (out.pics.length >= 4) break;
    let u = ""; try { u = T.linePic(p, l) || ""; } catch (e) { u = "err " + e.message; }
    let h = u.slice(0, 15); try { const x = new URL(u); h = x.host + " ." + (x.pathname.split(".").pop() || "").slice(0, 5) + (l.webImg ? " (webImg)" : ""); } catch (e) {}
    let d = 0; try { d = String((await T.imgAsData(u)) || "").length; } catch (e) { d = -1; }
    out.pics.push({ p: p.num, h, d, fb: (T.picFb(l) || "").slice(0, 22) });
  }
  return out;
})
