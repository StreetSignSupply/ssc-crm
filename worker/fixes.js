// Matt 10/28: the CRM must hold every prospect that was actually contacted (SSS Pipeline sheet, Prospects tab:
// emailed / Contacted / Replied / Lost) and nothing else. This run: restore any contacted prospect that was archived,
// and report (by prospect id only) the ones the CRM doesn't have, so they can be added through the feed.
// Names and emails are passed as one-way hashes so no contact details sit in this public file.
(async (T) => {
  const S = T.S, live = T.live, now = Date.now();
  const P = [{"p":"P0001","n":"7d1518a0b8e8c141bd55","e":["b1b920faabb561b36eec"]},{"p":"P0002","n":"4963c6272243b4583cf8","e":["fea8f54ebd05b0531319"]},{"p":"P0004","n":"4c7caa1998e7f1299de5","e":["1eb25f699dbc8cc5e109"]},{"p":"P0005","n":"a2c381e95577ceb5b321","e":["6236ba3f7fc8deac81f7"]},{"p":"P0006","n":"1ca09cf490706683ea65","e":["8da07487b53b5bfe8553"]},{"p":"P0007","n":"e489376befd0ff29084e","e":["03a28553f4b9dbb4b910"]},{"p":"P0010","n":"4952bc30b704152082d9","e":["340cd3e5e7708e097784"]},{"p":"P0013","n":"0a69fee704cc404d357b","e":["880c7e5e48dd8e2c3edf"]},{"p":"P0014","n":"4b340f96e444adaee83e","e":["791e5e697901fbb70af5"]},{"p":"P0015","n":"6a015be86045b6608b5d","e":["01a84cd6da67c2542f7d"]},{"p":"P0016","n":"f2268f3ba2b84b425ba2","e":["864ae0fe834614b4001b"]},{"p":"P0017","n":"49efe221b7e5108839a7","e":["70c45a9892339081af3a"]},{"p":"P0018","n":"b050335cbc51715467cc","e":["3f8a360c5fde0f9e7cf0"]},{"p":"P0019","n":"528e14ec710edda95be5","e":["47a9ce46e5b39b8a4e09"]},{"p":"P0020","n":"8bf96b26319c0e07bb01","e":["e2d4ce0c024cf38ee10a"]},{"p":"P0021","n":"871746446157c5fe6e0c","e":["6ff74703ff7c6c710ba2"]},{"p":"P0027","n":"625db8c0317c541dedc3","e":["9a13c771fbb7c03eab6c"]},{"p":"P0029","n":"1daad7c49f9a4eb27b29","e":["5dffeea98d12ba0e0284"]},{"p":"P0030","n":"80cebb48671be6840ab6","e":["674957665014c0f10a50"]},{"p":"P0031","n":"478a400a4b1fe8db463e","e":["c5aea5e9c7f663a04733"]},{"p":"P0032","n":"317d8d645c91843ec5e6","e":["d1ebff4b188a6cfc872e"]},{"p":"P0033","n":"a2e6197ce1c37e02a361","e":["c64bbe26e705bb9f342f"]},{"p":"P0034","n":"3b60271e1a1987e86acc","e":["6d422e20c4598989b742"]},{"p":"P0046","n":"0491117ee93795f9842c","e":["9bfd1ca770e142073e78"]},{"p":"P0101","n":"58bf6bb6eaf8d36165d2","e":["d7533c305748dcfef704"]},{"p":"P0102","n":"84abbabac0e29fb6fcab","e":["de365d99efdc716c7aad"]},{"p":"P1296","n":"652ad2208b60eeb48367","e":["07392e3ec71fd1018098"]},{"p":"P1297","n":"1a0b1bbd1a0d83c14fae","e":["98173195498e64ef8717"]},{"p":"P1298","n":"e0189360ad16a5b8a5c5","e":["b430ead176d7667a2e25"]},{"p":"P1301","n":"42b102681abd6f0ea346","e":["05fa8fdc95cf836653b2"]},{"p":"P1302","n":"c78ee5bfcc06bfbcf7a3","e":["5b42521e9ccdef929c19"]},{"p":"P1303","n":"5a9830a2a4f8ddd4183f","e":["827070c02679fc4900f9"]},{"p":"P1304","n":"6e0f12b12d93a8ee7332","e":["09d4b3859a5d6a567c04"]},{"p":"P1364","n":"f6061edf9ac637a85de4","e":["3f4f61309b546086ed43"]},{"p":"P1365","n":"af397e49e4ac9f699486","e":["05e3e4a2e5da8ee9df04"]},{"p":"P1367","n":"d607be9c8cfab2194b66","e":["80c65c5b886979e3bcc5"]},{"p":"P1368","n":"3b84cab86466d1025e56","e":["16b4ad57a91dae448363"]},{"p":"P1370","n":"2b0e2cbbe04716dba726","e":["fa485d3fd12f8139f3b5"]},{"p":"P1446","n":"c790dcaee23a057aabc3","e":["1f604dc7acf68cc600a2"]},{"p":"P1447","n":"e2cd0e51009b055883d8","e":["a32cd2f51605acbb30d1"]},{"p":"P1448","n":"a9c9e68595d5d8ed3f13","e":["bcabac41afebcda3bdfd"]},{"p":"P1449","n":"e6043300b74b4ffa83f6","e":["10e5d31b49b171411ed1"]},{"p":"P1450","n":"0b9c4e12f09cf61afd99","e":["3c8851a4c882edcc3b01"]},{"p":"P1503","n":"afbe1aaa23ea1b4a5b37","e":["1d83971ebe92d7df83f6"]},{"p":"P1504","n":"06dea9c8cdfb551959f5","e":["e9d0157ea47aea988dc7"]},{"p":"P1505","n":"9b678fe661b2e9aa1b6b","e":["eeace965ca74a47a7822"]},{"p":"P1513","n":"f31810747485b5755ef6","e":["b97c61a7db39eb8cd20e"]},{"p":"P1514","n":"fefa234444e8f028175a","e":["7d29c629b09293f51e4e"]},{"p":"P1677","n":"d27c30b2a6de482556db","e":["889482d4bd08c1eb7e74"]},{"p":"P1678","n":"311d97aae824193350ae","e":["7702bef226f4ca67ce6b"]},{"p":"P1684","n":"d469601d4074caf180db","e":["341387d865fb827029ec"]}];
  const nk = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const h = async s => { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("").slice(0, 20) };
  const accs = [...S.accounts.values()].filter(a => !a.merged);
  const byName = {}, byEmail = {};
  for (const a of accs) { (byName[await h(nk(a.name))] = byName[await h(nk(a.name))] || []).push(a) }
  for (const c of [...S.contacts.values()]) { const e = String(c.email || "").toLowerCase().trim(); if (e && c.accountId) (byEmail[await h(e)] = byEmail[await h(e)] || []).push(c.accountId) }
  const out = { prospects: P.length, alreadyIn: 0, restored: 0, contactsRestored: 0, missing: [] };
  const restored = new Set();
  for (const p of P) {
    let ids = [].concat(byName[p.n] || []).map(a => a.id);
    p.e.forEach(e => (byEmail[e] || []).forEach(id => ids.push(id)));
    ids = [...new Set(ids)].filter(id => S.accounts.get(id));
    if (!ids.length) { out.missing.push(p.p); continue }
    const liveOne = ids.find(id => !S.accounts.get(id).deleted);
    if (liveOne) { out.alreadyIn++; continue }
    // archived today as "never contacted" — bring it back with its contacts
    const id = ids.sort((a, b) => (S.accounts.get(b).deletedAt || 0) - (S.accounts.get(a).deletedAt || 0))[0];
    if (restored.has(id)) { out.alreadyIn++; continue }
    restored.add(id);
    await T.fix("accounts/" + id, { deleted: false, restoredAt: now, restoredBy: "MJ", deletedWith: "", updatedAt: now }, "Restored — the SSS Pipeline sheet shows this prospect was contacted");
    for (const c of [...S.contacts.values()].filter(c => c.deleted && c.deletedWith === "account:" + id)) {
      await T.push("contacts/" + c.id, { deleted: false, restoredAt: now, restoredBy: "MJ", deletedWith: "", updatedAt: now }); out.contactsRestored++ }
    for (const x of [...S.activity.values()].filter(x => x.deleted && x.deletedWith === "account:" + id))
      await T.push("activity/" + x.id, { deleted: false, deletedWith: "", updatedAt: now });
    out.restored++;
  }
  return out;
})
