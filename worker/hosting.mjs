// Puts the customer signing page (docs/sign.html) on the CRM's Firebase Hosting site (ssc-crm-a7224.web.app), so a
// signature link works for anyone without signing in. Matt OK'd hosting it 10/30. Runs when docs/ changes. Counts only.
import fs from "node:fs"; import zlib from "node:zlib"; import crypto from "node:crypto";
const SITE = process.env.SITE || "ssc-crm-a7224", TOK = process.env.HOSTING_TOKEN;
const H = "https://firebasehosting.googleapis.com/v1beta1/";
const api = async (url, method = "GET", body, raw) => { const r = await fetch(url.startsWith("http") ? url : H + url, { method, headers: Object.assign({ Authorization: "Bearer " + TOK }, { "Content-Type": raw ? "application/octet-stream" : "application/json" }), body: raw ? body : (body ? JSON.stringify(body) : undefined) });
  const t = await r.text(); if (!r.ok) throw new Error(method + " " + url.split("?")[0].slice(-60) + " " + r.status + " " + ((t.match(/"message":\s*"([^"]{0,160})/) || [])[1] || "")); return t ? JSON.parse(t) : {}; };
try {
  const files = { "/sign.html": fs.readFileSync(new URL("../docs/sign.html", import.meta.url)),
    "/index.html": Buffer.from('<!DOCTYPE html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Street Sign Supply</title><p style="font-family:system-ui;margin:40px">Street Sign Supply — <a href="https://streetsignsupply.com">streetsignsupply.com</a></p>') };
  const gz = {}, hashes = {};
  for (const [p, b] of Object.entries(files)) { gz[p] = zlib.gzipSync(b, { level: 9 }); hashes[p] = crypto.createHash("sha256").update(gz[p]).digest("hex"); }
  const v = await api("sites/" + SITE + "/versions", "POST", { config: { headers: [{ glob: "**", headers: { "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer", "Cache-Control": "no-cache" } }] } });
  const pop = await api(v.name + ":populateFiles", "POST", { files: hashes });
  for (const h of pop.uploadRequiredHashes || []) { const p = Object.keys(hashes).find((k) => hashes[k] === h); await api(pop.uploadUrl + "/" + h, "POST", gz[p], true); }
  await api(v.name + "?update_mask=status", "PATCH", { status: "FINALIZED" });
  await api("sites/" + SITE + "/releases?versionName=" + encodeURIComponent(v.name), "POST", { message: "signing page" });
  console.log("::notice::hosting: signing page live at https://" + SITE + ".web.app/sign.html (" + Object.keys(files).length + " files)");
} catch (e) { console.log("::error::hosting: " + String(e.message || e).slice(0, 220)); process.exit(1); }
