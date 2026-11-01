// Write it with AI — full test through the CRM's own email window and code (Matt, 1 Nov). Six drafts on a real quoted
// project, each checked against what the feature promises. Prints only pass/fail and counts — never names or text.
(async (T) => {
  const S = T.S, $ = (q) => document.querySelector(q), out = { runs: [] };
  // act as Matt in memory only (so his Gmail signature rule applies) — nothing is saved
  const matt = [...S.team.values()].find((t) => !t.deleted && /^matt@/i.test(t.email || ""));
  if (matt) S.viewerTeam = matt; out.sig = !!T.mySig(); out.sendOn = !!T.mailSendOn();
  const p = [...S.projects.values()].filter((x) => !x.deleted && ["quoted", "inquiry"].indexOf(x.stage) >= 0 && (x.orderLines || []).length && (x.contacts || []).length).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  if (!p) return "no quoted project with a contact";
  const ct = S.contacts.get(p.contacts[0]); const first = String((ct && ct.name) || "").trim().split(/\s+/)[0];
  const LINK = "https://ssc-crm-a7224.web.app/sign.html?t=TESTLINK0123456789abcdef";
  const banned = /hope this (email |message )?finds you|delighted|don'?t hesitate|thrilled|i trust this|kindly|reach out at your earliest|\[your name\]|\[name\]|\[company\]/i;
  const draft = async (o, ask, label) => {
    T.composeModal(o); await new Promise((r) => setTimeout(r, 400));
    const body0 = ($("#cm-body") || {}).value || ""; if ($("#cm-ask")) $("#cm-ask").value = ask || "";
    const t0 = Date.now(); T.composeAIRemote();
    let b = body0, i = 0; for (; i < 90; i++) { await new Promise((r) => setTimeout(r, 1000)); b = ($("#cm-body") || {}).value || ""; if (b && b !== body0) break; }
    const subj = ($("#cm-subj") || {}).value || ""; const btn = ($("#cm-ai") || {}).textContent || "";
    const lines = b.trim().split(/\n+/).map((x) => x.trim()).filter(Boolean); const last = lines[lines.length - 1] || "";
    const r = { label, secs: Math.round((Date.now() - t0) / 1000), filled: !!b && b !== body0, subject: !!subj.trim(), words: b.split(/\s+/).filter(Boolean).length,
      noExclaim: b.indexOf("!") < 0, noAIphrases: !banned.test(b), endsThanks: /^thanks,?$/i.test(last), noSigTyped: !/street sign supply.*\n.*\(?\d{3}\)?|\(435\)\s*218/i.test(b),
      greetsContact: first ? new RegExp("\\b" + first.replace(/[^A-Za-z]/g, ""), "i").test(b) : null, buttonBack: /write it with ai/i.test(btn) };
    if (o.signUrl) r.linkExact = b.indexOf(o.signUrl) >= 0;
    T.closeModal(); return { r, b };
  };
  const a = await draft({ pid: p.id, contactId: ct && ct.id, subject: "Your quote", body: "" }, "tell them the quote is ready and ask if they want to go ahead", "1 note + project");
  out.runs.push(a.r);
  const b = await draft({ pid: p.id, contactId: ct && ct.id, subject: "Following up on your sign quote", body: "" }, "", "2 blank note, subject only");
  out.runs.push(b.r);
  const c = await draft({ pid: p.id, contactId: ct && ct.id, tpl: "quote", signUrl: LINK, kind: "quote" }, "", "3 quote template + signing link");
  out.runs.push(c.r);
  const d = await draft({ pid: p.id, contactId: ct && ct.id, subject: "Your quote", body: "" }, "tell them the quote is ready and ask if they want to go ahead", "4 same as 1 again");
  out.runs.push(d.r); out.redoDiffers = a.b.trim() !== d.b.trim();
  const e = await draft({ pid: p.id, contactId: ct && ct.id, subject: "Sign question", body: "hey can u let me know if u want the signs double sided or single, need to know by friday thx" }, "clean this up", "5 clean up rough text");
  out.runs.push(e.r); out.keptMeaning = /double/i.test(e.b) && /single/i.test(e.b) && /friday/i.test(e.b);
  const f = await draft({ pid: p.id, contactId: ct && ct.id, subject: "Proof ready", body: "" }, "the proof is ready, ask them to check spelling and mounting holes before we make the signs", "6 proof wording");
  out.runs.push(f.r); out.proofTopics = /spell/i.test(f.b) && /(hole|mount)/i.test(f.b);
  return out;
})
