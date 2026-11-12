"""Copy every generated stencil (stencil-files branch checkout) into the CRM's shipped cut files:
public/cut/SKU.dxf (or SKU.zip for a one-sheet-per-letter set) + SKU.pdf proof, and stencil-cuts.json.
An older shipped copy that gets replaced is kept in public/cut-archive (never deleted).
Matt 2026-11-12: the corrected files must show up in the CRM without anyone copying them by hand.
usage: python3 stencil-crm-sync.py <stencil-out dir> <repo root>"""
import glob, json, os, re, shutil, sys, time, zipfile
from PIL import Image

src, root = sys.argv[1], sys.argv[2]
pub = os.path.join(root, "public"); idxp = os.path.join(pub, "stencil-cuts.json")
idx = json.load(open(idxp))
os.makedirs(os.path.join(pub, "cut-archive"), exist_ok=True)
gen = {}
for p in glob.glob(os.path.join(src, "stencils", "*", "*")):
    n = os.path.basename(p); m = re.match(r"(SSS-[A-Z]{3}-\d{3}-\d{2,3})-", n)
    if not m: continue
    g = gen.setdefault(m.group(1), {})
    if os.path.isdir(p): g["set"] = p
    elif n.endswith(".dxf"): g["dxf"] = p
    elif n.endswith(".png"): g["png"] = p
changed = 0
for sku, g in gen.items():
    cut = os.path.join(pub, "cut")
    new = {}
    if "set" in g:
        tmp = os.path.join(cut, sku + ".zip.tmp")
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
            for d in sorted(glob.glob(os.path.join(g["set"], "*.dxf"))):
                zi = zipfile.ZipInfo(os.path.basename(d), (2026, 1, 1, 0, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(zi, open(d, "rb").read())                       # fixed timestamps: same input = same zip
        files = {"zip": tmp}
    else:
        files = {"dxf": g["dxf"]}
    def same_file(k, v):
        f = os.path.join(cut, f"{sku}.{k}")
        if not os.path.exists(f): return False
        if k != "zip": return open(f, "rb").read() == open(v, "rb").read()
        try:                                               # compare the DXFs inside, not the zip bytes (zlib differs by machine)
            a, b = zipfile.ZipFile(f), zipfile.ZipFile(v)
            return sorted(a.namelist()) == sorted(b.namelist()) and all(a.read(n) == b.read(n) for n in a.namelist())
        except zipfile.BadZipFile: return False
    same = all(same_file(k, v) for k, v in files.items())
    if same and sku in idx["items"]:
        if "zip" in files: os.remove(files["zip"])
        continue
    for k in ("dxf", "pdf", "zip"):
        f = os.path.join(cut, f"{sku}.{k}")
        a = os.path.join(pub, "cut-archive", f"{sku}.{k}")
        if os.path.exists(f):
            if os.path.exists(a): os.remove(f)          # the first (pre-generator) copy is already archived; keep it
            else: shutil.move(f, a)
    for k, v in files.items():
        dst = os.path.join(cut, f"{sku}.{k}")
        if v.endswith(".tmp"): os.replace(v, dst)
        else: shutil.copy(v, dst)
        new[k] = os.path.getsize(dst)
    pngs = ([g["png"]] if g.get("png") else []) + (sorted(glob.glob(os.path.join(g["set"], "*.png"))) if "set" in g else [])
    if pngs:
        ims = [Image.open(p).convert("RGB") for p in pngs]
        pdf = os.path.join(cut, f"{sku}.pdf"); ims[0].save(pdf, save_all=True, append_images=ims[1:]); new["pdf"] = os.path.getsize(pdf)
    idx["items"][sku] = new; changed += 1
if changed:
    idx["at"] = int(time.time() * 1000)
    json.dump(idx, open(idxp, "w"), separators=(",", ":"))
print(f"CRM cut sync: {changed} stencil(s) updated, {len(idx['items'])} in the CRM")
