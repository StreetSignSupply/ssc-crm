"""Stencil geometry core for worker/stencil-gen.mjs (one SKU per job).

stdin : JSON list of jobs {sku, name, category, blank, pieces, nominal?, legend?, tie?}
argv1 : output folder (files land in <out>/<category-slug>/)
stdout: JSON list of results {sku, ok, reason?, nominal, extents, sheet, tie, font, layout, dxf, png, sha256}

Spec: Drive stencil-spec-rule.md (Matt 2026-11-08) — NOMINAL = number in the name = cap height;
EXTENTS = painted legend W x H; SHEET = the price-list blank (must hold EXTENTS + 2 x 2.00 in);
ties 1/2 in (NOMINAL <= 24) or 3/4 in (> 24), >= 2 per island. Matt 2026-11-10 (D-20261110-19): whatever
is closest to the matching 1800stencil product wins every spec question (size, sheet, spacing, tie) within
1/4 in; the old "tie <= 25 % of the stroke" hold is gone. DXF inches, origin = sheet bottom-left, one layer
CUT, closed paths only. Glyphs: worker/stencil-glyphs (FHWA public-domain drawings only).
"""
import hashlib, json, math, re, sys
from pathlib import Path
from shapely.geometry import Polygon, MultiPolygon, box, LineString
from shapely.ops import unary_union
from shapely import affinity

GEN_VERSION = "stencil-gen 1.2 (2026-11-11)"
SNAP = 0.25              # 1800 tiebreak: our number is brought to theirs when it is within reach (see ref_fit)
MARGIN = 2.0
BED = (56.0, 116.0)          # 5 x 10 ft Biesse bed less the 2 in machine margin each side
TOL = 1 / 16
MIN_FILL = 0.6           # legend + margins must use >= 60 % of the blank on each axis, else the font/blank is wrong
HERE = Path(__file__).parent
FONTS = {k: json.loads((HERE / f"stencil-glyphs/{k}.json").read_text()) for k in ("C", "D", "P")}
FONT_LABEL = {"C": "FHWA Series C", "D": "FHWA Series D", "P": "FHWA pavement (elongated)"}


def polys_only(g):
    """Keep the polygon parts of a shapely result (drops stray lines/points from boolean ops)."""
    if g.geom_type == "Polygon": return g
    parts = [q for q in getattr(g, "geoms", []) if q.geom_type in ("Polygon", "MultiPolygon")]
    flat = []
    for q in parts: flat.extend(q.geoms if q.geom_type == "MultiPolygon" else [q])
    return MultiPolygon(flat) if len(flat) != 1 else flat[0]


def glyph_geom(font, ch):
    g = FONTS[font]["glyphs"].get(ch)
    if g is None:
        return None, None
    geom = Polygon()
    for r in g["rings"]:
        p = Polygon(r).buffer(0)
        geom = geom.symmetric_difference(p)          # even-odd fill
    return geom.buffer(0), g["adv"]


def set_line(font, text, min_gap=0.0, extra=0.0):
    """Lay one line at cap height 1.0; returns (list of per-letter geoms, missing chars).
    min_gap (cap units): the material web left between two neighbouring letters is never thinner than this
    (the tie width), so tight FHWA pairs such as LT / AV are opened up just enough.
    extra (cap units): tracking added after every character (letter spacing opened to match a reference width)."""
    f = FONTS[font]; x = 0.0; parts = []; missing = []
    for i, ch in enumerate(text):
        if ch == " ":
            sp = f["glyphs"].get(" ", {}).get("adv") or f.get("wordSpace", 0.4)
            x += sp; continue
        geom, adv = glyph_geom(font, ch)
        if geom is None:
            missing.append(ch); continue
        g = affinity.translate(geom, x, 0)
        if parts and min_gap > 0 and text[i - 1] != " ":
            d = g.distance(parts[-1])
            if d < min_gap:
                g = affinity.translate(g, min_gap - d + 1e-4, 0); x += min_gap - d + 1e-4
        parts.append(g)
        x += adv + (f["letterGap"] if font == "P" else 0) + extra  # P glyphs are drawn from x=0: add the gap rule
    return parts, missing


def layout(font, lines, nominal, tie=0.0, extra=0.0):
    """lines: list of strings, stacked with a 0.5 cap line gap, centred. Returns list of letter geoms (inches)."""
    rows = []
    for ln in lines:
        parts, missing = set_line(font, ln, (tie + 1 / 32) / nominal, extra)
        if missing:
            return None, missing
        rows.append(parts)
    out = []; y = 0.0; widths = []
    for parts in rows:
        u = unary_union(parts); widths.append(u.bounds[2] - u.bounds[0])
    maxw = max(widths)
    for parts, w in zip(rows, widths):
        u = unary_union(parts); dx = (maxw - w) / 2 - u.bounds[0]
        for p in parts:
            out.append(affinity.translate(p, dx, y))
        y -= 1.5
    out = [affinity.scale(p, nominal, nominal, origin=(0, 0)) for p in out]
    return out, []


def ref_pair(ew, eh, ref):
    """1800 lists legend W x H in either order: return (ref_w, ref_h) the way our legend lies."""
    if abs(ew - ref[0]) + abs(eh - ref[1]) <= abs(ew - ref[1]) + abs(eh - ref[0]):
        return ref[0], ref[1]
    return ref[1], ref[0]


def ref_fit(letters, ref, room=None):
    """1800 tiebreak (D-20261110-19): the FHWA drawing sets the shape, 1800's listing sets the numbers.
    An axis that is off their size by more than 1/4 in but no more than 1 % + 1/2 in (round-letter overshoot,
    a hair of width) is scaled to their number; an axis that overflows the blank's room by up to 1/4 in is
    brought inside it. Returns (letters, note)."""
    b = bounds(letters); ew, eh = b[2] - b[0], b[3] - b[1]
    fx = fy = 1.0; why = []
    if ref:
        rw, rh = ref_pair(ew, eh, ref)
        if SNAP < abs(ew - rw) <= 0.01 * rw + 0.5: fx = rw / ew
        if SNAP < abs(eh - rh) <= 0.01 * rh + 0.5: fy = rh / eh
    if room:
        if 0 < ew * fx - room[0] <= SNAP: fx = room[0] / ew
        if 0 < eh * fy - room[1] <= SNAP: fy = room[1] / eh
    if fx == 1.0 and fy == 1.0:
        return letters, ""
    cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    out = [affinity.scale(g, fx, fy, origin=(cx, cy)) for g in letters]
    return out, f"legend scaled {fx:.4f} x {fy:.4f} from the FHWA drawing ({fmt(ew)} x {fmt(eh)}) to the 1800 size / sheet"


def bounds(geoms):
    u = unary_union(geoms); return u.bounds


def add_ties(letters, tie):
    """Cut ties (material bridges) so every island is held from both sides.
    Horizontal ties at each hole's mid-height, to the left and to the right, through the stroke.
    The tie band runs past the stroke on both sides (so a slanted leg is cut clean and the bridge is the full
    tie width), but only the piece of the band that lies in that one stroke is removed.
    Stroke = true (perpendicular) width at the tie: 2 x distance from the cut's midpoint to the outline.
    Returns (letters, ties_report, problem)."""
    from shapely.geometry import Point
    out = []; report = []
    for L in letters:
        polys = list(L.geoms) if isinstance(L, MultiPolygon) else [L]
        new = L
        for P in polys:
            for hole in P.interiors:
                h = Polygon(hole); hb = h.bounds
                cx, cy = (hb[0] + hb[2]) / 2, (hb[1] + hb[3]) / 2
                for side in (-1, 1):
                    hit = P.intersection(LineString([(cx, cy), (cx + side * 1e4, cy)]))
                    segs = [hit] if hit.geom_type == "LineString" else list(getattr(hit, "geoms", []))
                    segs = [g for g in segs if g.geom_type == "LineString" and g.length > 0]
                    if not segs:
                        return None, report, "tie: no stroke beside an island"
                    seg = min(segs, key=lambda g: min(abs(c[0] - cx) for c in g.coords))
                    x0, x1 = sorted([seg.coords[0][0], seg.coords[-1][0]])
                    mid = Point((x0 + x1) / 2, cy)
                    stroke = 2 * mid.distance(P.boundary)
                    report.append(round(stroke, 3))
                    # Matt 2026-11-10 (Decision D-20261110-19): the tie is the 1800 number, else the standing
                    # 1/2 in (3/4 in over 24 in), even when it is more than 25 % of the stroke. No hold.
                    # band from the island's centre (empty) out past the stroke: clean on slanted legs too
                    band = box(x0 - 3 * tie, cy - tie / 2, cx, cy + tie / 2) if side < 0 else \
                        box(cx, cy - tie / 2, x1 + 3 * tie, cy + tie / 2)
                    part = P.intersection(band)
                    parts = list(part.geoms) if hasattr(part, "geoms") else [part]
                    cut = unary_union([q for q in parts if q.area > 0 and q.intersects(seg)])
                    new = polys_only(new.difference(cut.buffer(0.001, join_style=2)).buffer(0))  # 0.001 in over-cut: no zero-width slivers
        out.append(new)
    return out, report, None


def narrowest_web(geom):
    """Smallest material width between two separate cut-outs (ties and letter gaps)."""
    polys = list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]
    best = None
    for i in range(len(polys)):
        for k in range(i + 1, len(polys)):
            d = polys[i].distance(polys[k])
            if d < 3 and (best is None or d < best): best = d
    return best


def fmt(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


def parse_blank(s):
    m = re.match(r"\s*([\d.]+)\s*x\s*([\d.]+)", s or "")
    return (float(m.group(1)), float(m.group(2))) if m else None


def parse_name(name):
    """NOMINAL = the number in the name; LEGEND = the trailing all-caps words."""
    m = re.match(r"\s*(\d+(?:\.\d+)?)\s*(?:\"|''|”|inch(?:es)?\b|in\b)\s*(x\s*\d)?", name or "", re.I)
    if not m:
        return None, None, "no nominal size in the name"
    if m.group(2):
        return float(m.group(1)), None, "size pair in the name (line / art stencil, not a text legend)"
    rest = name[m.end():]
    rest = re.sub(r"\(.*?\)", " ", rest)
    if "," in rest or re.search(r"\b(Numbers|Letters|Alphabet|Kit|Set)\b", rest, re.I):
        return float(m.group(1)), None, "legend unclear (a set of letters/numbers, not one legend)"
    rest = re.sub(r"\bStencils?\b.*$", " ", rest, flags=re.I)
    # filler the price list puts after the legend: '96" California DOT TURN Wording', '4" GUEST Curb and Standard',
    # '4" FIRE LANE Professional Curb', '48" 7Brew "ENTER"'
    rest = re.sub(r"\b(Wording|Professional Curb|Curb and Standard|Curb|Word|Legend|Pavement|Marking)\b", " ", rest, flags=re.I)
    rest = re.sub(r"[\"“”]", " ", rest)
    toks = rest.split()
    run = []
    for t in reversed(toks):
        if re.fullmatch(r"[A-Z0-9][A-Z0-9&/'\-\.!]*", t) and t not in ("DOT", "-", "ISA", "ADA"):
            run.insert(0, t)
        else:
            break
    legend = " ".join(run).strip(" -")
    if not legend:
        return float(m.group(1)), None, "legend unclear (no capital-letter wording in the name)"
    return float(m.group(1)), legend, None


def candidates(legend):
    words = legend.split()
    c = [[legend]]
    if len(words) > 1:
        c.append(words)
        if len(words) > 2:
            for k in range(1, len(words)):
                c.append([" ".join(words[:k]), " ".join(words[k:])])
    return c


def to_dxf(path, geom, sheet):
    import ezdxf
    doc = ezdxf.new("R12"); doc.units = 1
    doc.header["$EXTMIN"] = (0, 0, 0); doc.header["$EXTMAX"] = (sheet[0], sheet[1], 0)
    doc.header["$LIMMIN"] = (0, 0); doc.header["$LIMMAX"] = (sheet[0], sheet[1])
    doc.layers.add("CUT", color=7)
    msp = doc.modelspace()
    polys = list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]
    for p in polys:
        for ring in [p.exterior, *p.interiors]:
            pts = [(round(x, 4), round(y, 4)) for x, y in list(ring.coords)[:-1]]
            msp.add_polyline2d(pts, close=True, dxfattribs={"layer": "CUT"})
    doc.saveas(path)


def to_png(path, geom, sheet, nominal, ext, sku, legend, font, tie):
    from PIL import Image, ImageDraw
    W, H = sheet; scale = min(1500 / W, 900 / H); pad = 70
    im = Image.new("RGB", (int(W * scale) + 2 * pad + 40, int(H * scale) + 2 * pad + 60), "white")
    d = ImageDraw.Draw(im)
    X = lambda x: pad + x * scale
    Y = lambda y: pad + (H - y) * scale
    d.rectangle([X(0), Y(H), X(W), Y(0)], outline="black", width=2)
    polys = list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]
    for p in polys:
        d.polygon([(X(x), Y(y)) for x, y in p.exterior.coords], fill="black")
        for r in p.interiors:
            d.polygon([(X(x), Y(y)) for x, y in r.coords], fill="white")
    gx0, gy0, gx1, gy1 = ext
    d.line([X(gx0), Y(gy0) + 14, X(gx1), Y(gy0) + 14], fill="black", width=1)       # EXTENTS width
    d.line([X(gx1) + 14, Y(gy0), X(gx1) + 14, Y(gy1)], fill="black", width=1)       # EXTENTS height
    d.line([X(0), Y(0) + 40, X(W), Y(0) + 40], fill="black", width=1)                 # SHEET width
    d.line([X(W) + 34, Y(0), X(W) + 34, Y(H)], fill="black", width=1)                 # SHEET height
    txt = (f"{sku}  {legend}  |  NOMINAL {fmt(nominal)} in  |  EXTENTS {fmt(gx1-gx0)} x {fmt(gy1-gy0)} in  |  "
           f"SHEET {fmt(W)} x {fmt(H)} in  |  ties {tie} in  |  {FONT_LABEL[font]}  |  margin 2.00 in")
    d.text((pad, 20), txt, fill="black")
    d.text((pad, im.height - 22), GEN_VERSION + "  -  proof, not to scale", fill="black")
    im.save(path)


def build(job, out):
    sku = job["sku"]; res = {"sku": sku, "ok": False}
    if str(job.get("pieces") or "1").strip() not in ("", "1"):
        res["reason"] = f"{job.get('pieces')} pieces: multi-piece split not built yet"; return res
    nominal, legend, why = parse_name(job.get("name", ""))
    if job.get("nominal"):
        try: nominal = float(re.sub(r"[^\d.]", "", str(job["nominal"])))
        except ValueError: pass
    if job.get("legend"):
        legend, why = job["legend"], None
    if why:
        res["reason"] = why; return res
    tie = float(job.get("tie") or (0.5 if nominal <= 24 else 0.75))
    blank = parse_blank(job.get("blank"))
    ref = parse_blank(job.get("ref"))
    fits = []; tried = []; low = []; per_letter = False
    for font in ("C", "D", "P"):
        for lines in candidates(legend):
            letters, missing = layout(font, lines, nominal, tie)
            if letters is None:
                tried.append(f"{font}: no glyph for {''.join(sorted(set(missing)))}"); break
            b = bounds(letters); ew, eh = b[2] - b[0], b[3] - b[1]
            track = 0.0
            if ref and len(lines) == 1 and font != "P":
                # 1800's legend is wider than the FHWA spacing gives: open the letter spacing evenly to their width
                # (never tighter than FHWA, at most 1/2 cap height per gap) so the stencil matches their size
                refw = ref[0] if abs(eh - ref[1]) <= abs(eh - ref[0]) else ref[1]
                gaps = len(lines[0]) - 1
                if gaps > 0 and refw - ew > 0.25 and (refw - ew) / gaps / nominal <= 0.5:
                    for _ in range(3):   # the min-gap rule can move letters too: converge on the reference width
                        track += (refw - ew) / gaps / nominal
                        letters, _ = layout(font, lines, nominal, tie, track)
                        b = bounds(letters); ew, eh = b[2] - b[0], b[3] - b[1]
                        if abs(refw - ew) <= 1 / 32: break
            base_letters = letters
            if blank:
                for rot, (sw, sh) in enumerate((blank, blank[::-1])):
                    # 1800 tiebreak: bring a near-miss to their size, and a hair of overflow onto their sheet
                    letters, fitnote = ref_fit(base_letters, ref, (sw - 2 * MARGIN, sh - 2 * MARGIN))
                    b = bounds(letters); ew, eh = b[2] - b[0], b[3] - b[1]
                    need = (ew + 2 * MARGIN, eh + 2 * MARGIN)
                    if need[0] <= sw + 1e-6 and need[1] <= sh + 1e-6:   # 2.00 in margin is a floor (ALP-100-03 came out 1.99)
                        fw, fh = need[0] / sw, need[1] / sh
                        if ref:   # 1800 reference size = their legend W x H: closest legend wins, listed orientation first
                            d = min(abs(ew - ref[0]) + abs(eh - ref[1]), abs(ew - ref[1]) + abs(eh - ref[0]))
                            fits.append(((1 - rot) * 1000 - d, font, lines, letters, (sw, sh), track, fitnote)); continue
                        if min(fw, fh) < MIN_FILL:
                            low.append(f"{font} {'/'.join(lines)} fills {fw:.0%} x {fh:.0%}"); continue
                        # the price-list orientation first; then the layout that uses the blank best
                        fits.append(((1 - rot) + fw * fh, font, lines, letters, (sw, sh), track, fitnote))
                letters = base_letters
                b = bounds(letters); ew, eh = b[2] - b[0], b[3] - b[1]
                need = (ew + 2 * MARGIN, eh + 2 * MARGIN)
            else:
                letters, fitnote = ref_fit(base_letters, ref)
                b = bounds(letters); ew, eh = b[2] - b[0], b[3] - b[1]
                need = (ew + 2 * MARGIN, eh + 2 * MARGIN)
                sheet = (math.ceil(need[0]), math.ceil(need[1]))
                if font in ("C", "D"):
                    fits.append((1 / (sheet[0] * sheet[1]), font, lines, letters, sheet, track, fitnote))
            tried.append(f"{font} {'/'.join(lines)} {ew:.1f}x{eh:.1f}")
            if len(lines) == 1 and blank and font == "P" and not (need[0] <= max(blank) + TOL and need[1] <= max(blank) + TOL and min(need) <= min(blank) + TOL):
                widest = max(g.bounds[2] - g.bounds[0] for g in letters)
                if len(legend.replace(" ", "")) > 1 and widest + 2 * MARGIN <= min(blank) + TOL and eh + 2 * MARGIN <= max(blank) + TOL:
                    per_letter = True
    if not fits and blank and len(legend.replace(" ", "")) > 1:
        # one letter per sheet (the 96 in DOT words: the price-list blank holds one letter, the painter sets the word)
        s = build_set(job, out, nominal, legend, tie, blank, ref)
        if s is not None:
            return s
    if not fits:
        if low and not per_letter:
            res["reason"] = (f"no FHWA font matches the blank: '{legend}' at {fmt(nominal)} in leaves the blank "
                             f"{job.get('blank')} under {MIN_FILL:.0%} used ({'; '.join(low[:3])}); blank or nominal needs checking")
        elif per_letter:
            res["reason"] = (f"per-letter set: blank {job.get('blank')} holds one {fmt(nominal)} in letter, not '{legend}'; "
                             "needs the letter-set layout rule (one sheet per distinct letter?)")
        else:
            res["reason"] = (f"sheet too small: no FHWA layout of '{legend}' at {fmt(nominal)} in fits "
                             f"blank {job.get('blank')} with 2.00 in margins (tried {'; '.join(tried[:4])})")
        return res
    fits.sort(key=lambda f: -f[0])
    problem = None
    for _, font, lines, letters0, sheet, track, fitnote in fits:     # closest to 1800 / best fill first
        if not (min(sheet) <= BED[0] and max(sheet) <= BED[1]):
            problem = problem or f"sheet {fmt(sheet[0])} x {fmt(sheet[1])} is over the 56 x 116 in bed: needs a multi-piece split"
            continue
        letters, strokes, p = add_ties(letters0, tie)
        if p:
            problem = problem if problem and "stroke" in problem else p
            continue
        if strokes and min(strokes) < tie:
            # not the old 25 % rule: a stroke thinner than the tie itself means the alphabet was squeezed to fit a
            # blank it was never meant for (6 in elongated pavement letters); the 1800 size (column H) settles it
            problem = problem or (f"no FHWA font matches the blank: '{legend}' at {fmt(nominal)} in only fits blank {job.get('blank')} "
                                  f"in an alphabet whose stroke ({min(strokes):.2f} in) is thinner than the {tie} in tie; needs the 1800 size in column H")
            continue
        geom = polys_only(unary_union(letters))
        web = narrowest_web(geom)
        if web is not None and web < tie - 1 / 64:   # a bridge (tie or letter gap) thinner than the tie width
            problem = problem or f"narrowest web between cut-outs {web:.3f} in is under the {tie} in tie width"
            continue
        break
    else:
        res.update(reason=problem); return res
    b = geom.bounds; ew, eh = b[2] - b[0], b[3] - b[1]
    geom = affinity.translate(geom, (sheet[0] - ew) / 2 - b[0], (sheet[1] - eh) / 2 - b[1])
    ext = geom.bounds
    slug = re.sub(r"[^a-z0-9]+", "-", (job.get("category") or "other").lower()).strip("-") or "other"
    folder = Path(out) / slug; folder.mkdir(parents=True, exist_ok=True)
    leg = re.sub(r"[^A-Z0-9]+", "-", legend.upper()).strip("-")
    base = f"{sku}-{leg}-{fmt(nominal)}in-SHEET{fmt(sheet[0])}x{fmt(sheet[1])}"
    dxf = folder / f"{base}.dxf"; png = folder / f"{base}.png"
    to_dxf(dxf, geom, sheet)
    to_png(png, geom, sheet, nominal, ext, sku, legend, font, tie)
    lay = " / ".join(lines)
    if track: lay += f", letter spacing opened {fmt(track * nominal)} in per gap to the 1800 width"
    if fitnote: lay += f", {fitnote}"
    if ref and abs(ew - ref_pair(ew, eh, ref)[0]) <= 0.25 and abs(eh - ref_pair(ew, eh, ref)[1]) <= 0.25:
        lay += f"; matches 1800 {fmt(ref[0])} x {fmt(ref[1])} within 1/4 in"
    lay += f"; tie {fmt(tie)} in" + (" (1800 listing shows no tie width: standing spec, D-20261110-19)" if not job.get("tie") else " (column O)")
    if strokes and tie > 0.25 * min(strokes): lay += f", thinnest stroke at a tie {fmt(min(strokes))} in"
    if ref and (abs(ew - ref[0]) > 0.25 or abs(eh - ref[1]) > 0.25):
        others = []
        for o in "CDP":
            if o == font: continue
            L2, _ = layout(o, lines, nominal, tie)
            if L2 is not None:
                b2 = bounds(L2); others.append(f"{FONT_LABEL[o][5:]} {fmt(b2[2] - b2[0])} x {fmt(b2[3] - b2[1])}")
        lay += f"; ref 1800 {fmt(ref[0])} x {fmt(ref[1])} vs ours {fmt(ew)} x {fmt(eh)} ({FONT_LABEL[font][5:]} at this cap height; " + ", ".join(others) + ")"
    res.update(ok=True, nominal=fmt(nominal), extents=f"{fmt(ew)} x {fmt(eh)}", sheet=f"{fmt(sheet[0])} x {fmt(sheet[1])}",
               tie=str(tie), font=FONT_LABEL[font], layout=lay, islands=len(strokes) // 2,
               narrowest_web=round(web, 3) if web is not None else None,
               min_stroke_at_tie=min(strokes) if strokes else None,
               dxf=str(dxf.relative_to(out)), png=str(png.relative_to(out)),
               sha256=hashlib.sha256(dxf.read_bytes()).hexdigest())
    return res


def out_folder(out, job):
    slug = re.sub(r"[^a-z0-9]+", "-", (job.get("category") or "other").lower()).strip("-") or "other"
    folder = Path(out) / slug; folder.mkdir(parents=True, exist_ok=True)
    return folder


def build_set(job, out, nominal, legend, tie, blank, ref=None):
    """Letter set: the blank holds one letter of the legend; one DXF + proof per distinct letter, every letter
    upright on its own sheet (the price-list blank, listed orientation first), 2.00 in margin, ties as usual.
    Returns a result dict, or None when no FHWA font puts every letter on the blank."""
    chars = []
    for ch in legend.replace(" ", ""):
        if ch not in chars: chars.append(ch)
    # only when the blank is a one-letter blank: its long side is the letter height plus margins (not a word's
    # width) and its short side holds one letter, not several
    if max(blank) > (nominal + 2 * MARGIN) * 1.2 + TOL or max(blank) < 3 * min(blank):
        return None
    order = ("P", "D", "C") if nominal >= 48 else ("C", "D", "P")
    for font in order:
        sheets = []; problem = None
        whole, missing = layout(font, [legend], nominal, tie)     # the word as the painter sets it = 1800's size
        if whole is None: continue
        wb = bounds(whole); word = (wb[2] - wb[0], wb[3] - wb[1]); spacing = ""
        gaps = len(legend.replace(" ", "")) - 1
        if ref and gaps > 0:
            # 1800 lists the word as the painter sets it: open the spacing between the letter sheets to their width
            refw = ref_pair(word[0], word[1], ref)[0]
            track = 0.0
            if refw - word[0] > 0.25 and (refw - word[0]) / gaps / nominal <= 0.5:
                for _ in range(3):
                    track += (refw - word[0]) / gaps / nominal
                    w2, _ = layout(font, [legend], nominal, tie, track)
                    wb = bounds(w2); word = (wb[2] - wb[0], wb[3] - wb[1])
                    if abs(refw - word[0]) <= 1 / 32: break
                spacing = (f"; set the letters {fmt(track * nominal)} in further apart than the FHWA spacing "
                           f"to make 1800's {fmt(refw)} in word width")
        widest = max(g.bounds[2] - g.bounds[0] for g in whole)
        if min(blank) > 1.6 * (widest + 2 * MARGIN): continue
        for ch in chars:
            letters, missing = layout(font, [ch], nominal, tie)
            if letters is None: problem = f"{font}: no glyph for {ch}"; break
            b = bounds(letters); ew, eh = b[2] - b[0], b[3] - b[1]
            need = (ew + 2 * MARGIN, eh + 2 * MARGIN)
            sheet = next(((sw, sh) for sw, sh in (blank, blank[::-1]) if need[0] <= sw + TOL and need[1] <= sh + TOL), None)
            if sheet is None: problem = f"{font}: '{ch}' {ew:.1f} x {eh:.1f} does not fit the blank"; break
            if not (min(sheet) <= BED[0] and max(sheet) <= BED[1]): problem = f"sheet {fmt(sheet[0])} x {fmt(sheet[1])} is over the bed"; break
            tied, strokes, p = add_ties(letters, tie)
            if p: problem = p; break
            geom = polys_only(unary_union(tied))
            web = narrowest_web(geom)
            if web is not None and web < tie - 1 / 64: problem = f"narrowest web {web:.3f} in under the tie width"; break
            sheets.append((ch, geom, sheet, strokes, web))
        if problem is None and sheets:
            break
    else:
        return None
    folder = out_folder(out, job)
    leg = re.sub(r"[^A-Z0-9]+", "-", legend.upper()).strip("-")
    sw, sh = sheets[0][2]
    base = f"{job['sku']}-{leg}-SET-{fmt(nominal)}in-SHEET{fmt(sw)}x{fmt(sh)}"
    sub = folder / base; sub.mkdir(parents=True, exist_ok=True)
    files = []; h = hashlib.sha256(); widest = 0.0; tallest = 0.0; islands = 0; webs = []; min_stroke = None
    for ch, geom, sheet, strokes, web in sheets:
        b = geom.bounds; ew, eh = b[2] - b[0], b[3] - b[1]
        geom = affinity.translate(geom, (sheet[0] - ew) / 2 - b[0], (sheet[1] - eh) / 2 - b[1])
        ext = geom.bounds
        dxf = sub / f"{base}-{ch}.dxf"; png = sub / f"{base}-{ch}.png"
        to_dxf(dxf, geom, sheet)
        to_png(png, geom, sheet, nominal, ext, job["sku"], f"{legend} / letter {ch}", font, tie)
        data = dxf.read_bytes(); h.update(data)
        files.append({"ch": ch, "dxf": str(dxf.relative_to(out)), "png": str(png.relative_to(out)),
                      "extents": f"{fmt(ew)} x {fmt(eh)}", "sheet": f"{fmt(sheet[0])} x {fmt(sheet[1])}",
                      "sha256": hashlib.sha256(data).hexdigest()})
        widest = max(widest, ew); tallest = max(tallest, eh); islands += len(strokes) // 2
        if web is not None: webs.append(web)
        if strokes: min_stroke = min(strokes) if min_stroke is None else min(min_stroke, min(strokes))
    proof = sub / f"{base}.png"
    set_proof(proof, [(sub / f"{base}-{ch}.png") for ch, *_ in sheets], f"{job['sku']}  {legend}: {len(chars)} sheets, one letter each")
    return {"sku": job["sku"], "ok": True, "set": True, "nominal": fmt(nominal), "extents": f"{fmt(word[0])} x {fmt(word[1])}",
            "sheet": f"{fmt(sw)} x {fmt(sh)}", "tie": str(tie), "font": FONT_LABEL[font],
            "layout": f"letter set {''.join(chars)}: {len(chars)} sheet(s) for '{legend}' ({len(legend.replace(' ', ''))} letters), each letter upright on its own blank; extents = the whole word as set ({fmt(word[0])} x {fmt(word[1])}), widest letter {fmt(widest)}{spacing}; tie {fmt(tie)} in",
            "islands": islands, "narrowest_web": round(min(webs), 3) if webs else None, "min_stroke_at_tie": min_stroke,
            "dxf": files[0]["dxf"], "png": str(proof.relative_to(out)), "folder": str(sub.relative_to(out)), "files": files,
            "sha256": h.hexdigest()}


def set_proof(path, pngs, title):
    """One proof for a letter set: the per-letter proofs side by side."""
    from PIL import Image, ImageDraw
    ims = [Image.open(p) for p in pngs]
    H = max(im.height for im in ims); W = sum(im.width for im in ims) + 10 * (len(ims) - 1)
    scale = min(1.0, 2400 / W)
    out = Image.new("RGB", (int(W * scale), int(H * scale) + 30), "white")
    x = 0
    for im in ims:
        r = im.resize((int(im.width * scale), int(im.height * scale)))
        out.paste(r, (int(x), 30)); x += (im.width + 10) * scale
    ImageDraw.Draw(out).text((10, 8), title, fill="black")
    out.save(path)


def check(dxf_path, expect):
    """Second check: read the DXF back, measure EXTENTS, SHEET fit, closed paths, margins."""
    import ezdxf
    doc = ezdxf.readfile(dxf_path); msp = doc.modelspace()
    xs, ys, problems = [], [], []
    for e in msp:
        if e.dxftype() not in ("POLYLINE", "LWPOLYLINE"): problems.append(f"entity {e.dxftype()}"); continue
        if e.dxf.layer != "CUT": problems.append(f"layer {e.dxf.layer}")
        if not e.is_closed: problems.append("open path")
        for v in e.points():
            xs.append(v[0]); ys.append(v[1])
    sw, sh = [float(v) for v in expect["sheet"].split(" x ")]
    ew, eh = [float(v) for v in expect["extents"].split(" x ")]
    mw, mh = max(xs) - min(xs), max(ys) - min(ys)
    if abs(mw - ew) > TOL or abs(mh - eh) > TOL: problems.append(f"extents {mw:.3f} x {mh:.3f} vs row {ew} x {eh}")
    for m in (min(xs), min(ys), sw - max(xs), sh - max(ys)):
        if m < MARGIN - TOL: problems.append(f"margin {m:.3f} < 2.00")
    return {"extents": f"{mw:.3f} x {mh:.3f}", "margins": [round(v, 3) for v in (min(xs), min(ys), sw - max(xs), sh - max(ys))], "problems": problems}


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "check":
        print(json.dumps(check(sys.argv[2], json.loads(sys.argv[3])))); sys.exit()
    jobs = json.load(sys.stdin); out = sys.argv[1]
    results = []
    for j in jobs:
        try:
            results.append(build(j, out))
        except Exception as e:  # one bad row never stops the batch
            results.append({"sku": j.get("sku"), "ok": False, "reason": f"error: {type(e).__name__}: {e}"})
    print(json.dumps(results))
