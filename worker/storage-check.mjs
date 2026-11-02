// Read-only check before any move to Google Drive (Matt, 1 Nov): can the CRM's Firebase files still be read, and can the
// worker reach Google Drive as the company account? Prints counts and HTTP status codes only — no names, no contents.
const SA = "firebase-adminsdk-fbsvc@ssc-crm-a7224.iam.gserviceaccount.com", TOK = process.env.SA_TOKEN;
const B = ["ssc-crm-a7224.firebasestorage.app", "ssc-crm-a7224.appspot.com"];
const out = {};
for (const b of B) {
  const r = await fetch("https://storage.googleapis.com/storage/v1/b/" + b + "/o?maxResults=1000&fields=items(name,size,contentType),nextPageToken", { headers: { Authorization: "Bearer " + TOK } });
  const j = await r.json().catch(() => ({})); const items = j.items || [];
  out[b] = { list: r.status, err: r.ok ? "" : String((j.error || {}).message || "").slice(0, 120), objects: items.length, more: !!j.nextPageToken,
    bytes: items.reduce((t, x) => t + Number(x.size || 0), 0), types: items.reduce((m, x) => { const k = String(x.contentType || "?").split("/")[0]; m[k] = (m[k] || 0) + 1; return m; }, {}) };
  if (items[0]) { const m = await fetch("https://storage.googleapis.com/storage/v1/b/" + b + "/o/" + encodeURIComponent(items[0].name) + "?alt=media", { headers: { Authorization: "Bearer " + TOK } });
    out[b].download = m.status; await m.arrayBuffer().catch(() => {});
    const pub = await fetch("https://firebasestorage.googleapis.com/v0/b/" + b + "/o/" + encodeURIComponent(items[0].name) + "?alt=media"); out[b].publicUrl = pub.status; }
}
// Drive as matt@ through the same domain-wide delegation the mail worker uses
async function userToken(email, scope) { const now = Math.floor(Date.now() / 1000);
  const r = await fetch("https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" + SA + ":signJwt", { method: "POST", headers: { Authorization: "Bearer " + TOK, "Content-Type": "application/json" },
    body: JSON.stringify({ payload: JSON.stringify({ iss: SA, sub: email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 600 }) }) });
  const j = await r.json(); if (!r.ok) return { err: "sign " + r.status };
  const t = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + encodeURIComponent(j.signedJwt) });
  const tj = await t.json(); return t.ok ? { tok: tj.access_token } : { err: "token " + t.status + " " + String(tj.error || "") }; }
for (const sc of ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/drive.file"]) {
  const k = await userToken("matt@streetsignsupply.com", sc); const key = "drive " + sc.split("/").pop();
  if (!k.tok) { out[key] = k.err; continue; }
  const a = await fetch("https://www.googleapis.com/drive/v3/about?fields=storageQuota", { headers: { Authorization: "Bearer " + k.tok } }); const aj = await a.json().catch(() => ({}));
  out[key] = { about: a.status, limitGB: aj.storageQuota ? Math.round(Number(aj.storageQuota.limit || 0) / 1e9) : null, usedGB: aj.storageQuota ? Math.round(Number(aj.storageQuota.usage || 0) / 1e8) / 10 : null };
}
console.log("::notice::storage check " + JSON.stringify(out));
