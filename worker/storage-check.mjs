// Read-only check: can the CRM's Firebase files be listed and read? It runs with its own read-only storage token (no one's
// account, no Google Drive). Prints counts and HTTP status codes only — no names, no contents.
const TOK = process.env.SA_TOKEN;
const B = ["ssc-crm-a7224.firebasestorage.app", "ssc-crm-a7224.appspot.com"];
const out = {};
for (const b of B) {
  const r = await fetch("https://storage.googleapis.com/storage/v1/b/" + b + "/o?maxResults=1000&fields=items(name,size,contentType),nextPageToken", { headers: { Authorization: "Bearer " + TOK } });
  const j = await r.json().catch(() => ({})); const items = j.items || [];
  out[b] = { list: r.status, err: r.ok ? "" : String((j.error || {}).message || "").slice(0, 120), objects: items.length, more: !!j.nextPageToken,
    bytes: items.reduce((t, x) => t + Number(x.size || 0), 0), types: items.reduce((m, x) => { const k = String(x.contentType || "?").split("/")[0]; m[k] = (m[k] || 0) + 1; return m; }, {}) };
  if (items[0]) { const m = await fetch("https://storage.googleapis.com/storage/v1/b/" + b + "/o/" + encodeURIComponent(items[0].name) + "?alt=media", { headers: { Authorization: "Bearer " + TOK } });
    out[b].download = m.status; out[b].downloadErr = m.ok ? "" : String(((await m.json().catch(() => ({}))).error || {}).message || "").slice(0, 160);
    const pub = await fetch("https://firebasestorage.googleapis.com/v0/b/" + b + "/o/" + encodeURIComponent(items[0].name) + "?alt=media"); out[b].publicUrl = pub.status; out[b].publicErr = pub.ok ? "" : String(await pub.text()).replace(/\s+/g, " ").slice(0, 160); }
}
console.log("::notice::storage check " + JSON.stringify(out));
