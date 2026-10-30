// Oct 30 look-only run #2: nothing is changed. Checks whether website pictures on quote lines can be copied into a PDF
// (each way the CRM tries, separately), and whether an uploaded file can be read back. Hosts and sizes only.
(async (T) => {
  const S = T.S, out = { imgs: [] };
  const urls = [...new Set([...S.projects.values()].filter((p) => !p.deleted).flatMap((p) => (p.orderLines || []).map((l) => l && l.webImg).filter(Boolean)))].slice(0, 3);
  const grab = async (u) => { try { const r = await fetch(u, { mode: "cors", cache: "no-store" }); const b = await r.blob(); return r.status + " " + (b.type || "?") + " " + b.size; } catch (e) { return "fail " + String(e.message).slice(0, 40); } };
  const viaImg = (u) => new Promise((ok) => { const im = new Image(); im.crossOrigin = "anonymous"; const t = setTimeout(() => ok("timeout"), 10000);
    im.onload = () => { clearTimeout(t); try { const c = document.createElement("canvas"); c.width = im.naturalWidth || 9; c.height = im.naturalHeight || 9; c.getContext("2d").drawImage(im, 0, 0); ok("ok " + c.toDataURL("image/png").length); } catch (e) { ok("tainted"); } };
    im.onerror = () => { clearTimeout(t); ok("error"); }; im.src = u; });
  for (const u of urls) { let h = ""; try { const x = new URL(u); h = x.host + " ." + (x.pathname.split(".").pop() || ""); } catch (e) { h = "bad url " + String(u).slice(0, 20); }
    out.imgs.push({ h, direct: await grab(u), img: await viaImg(u), wsrv: await grab("https://wsrv.nl/?url=" + encodeURIComponent(u) + "&w=640&output=png"), weserv: await grab("https://images.weserv.nl/?url=" + encodeURIComponent(u) + "&w=640&output=png"), crm: String((await T.imgAsData(u)) || "").length }); }
  const f = [...S.files.values()].find((x) => !x.deleted && x.url && /firebasestorage/.test(x.url));
  if (f) out.storage = await grab(f.url);
  out.nWebImg = urls.length;
  return out;
})
