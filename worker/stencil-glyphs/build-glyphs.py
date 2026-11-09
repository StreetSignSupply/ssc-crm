"""One-time builder for worker/stencil-glyphs/*.json (run by hand, output committed).

Sources (public domain, US government work, fetched by .github/workflows/stencil-source.yml onto a
stencil-source-<run id> branch):
  src/Pavement.pdf   FHWA Standard Highway Signs, chapter 10 Pavement Markings, pages 10-1..10-7:
                     the elongated pavement-marking alphabet and numerals          -> P.json
  src/Alphabets.pdf  FHWA Standard Alphabets for Traffic Control Devices (2000):
                     Series C and Series D outlines with their spacing (advance)  -> C.json, D.json

Output units: 1.0 = capital letter height. y up, baseline at 0, x from the glyph's left
side-bearing origin. Each glyph: {"adv": advance, "rings": [[[x,y],...], ...]} (even-odd fill).

usage: python3 build-glyphs.py <dir holding src/ and svg/ from the stencil-source branch>
"""
import json, re, sys, statistics
from pathlib import Path

ROOT = Path(sys.argv[1]); OUT = Path(__file__).parent
STEPS = 12  # line segments per Bezier

def bez(p0, c1, c2, p3, n=STEPS):
    pts = []
    for s in range(1, n + 1):
        t = s / n; a = 1 - t
        pts.append((a**3*p0[0] + 3*a*a*t*c1[0] + 3*a*t*t*c2[0] + t**3*p3[0],
                    a**3*p0[1] + 3*a*a*t*c1[1] + 3*a*t*t*c2[1] + t**3*p3[1]))
    return pts

def svg_rings(d):
    toks = re.findall(r'[MLCZ]|-?[\d.]+', d); rings = []; cur = []; i = 0; cmd = None
    while i < len(toks):
        t = toks[i]
        if t in 'MLCZ':
            cmd = t; i += 1
            if t == 'Z' and cur: rings.append(cur); cur = []
            continue
        if cmd == 'M':
            if cur: rings.append(cur)
            cur = [(float(toks[i]), float(toks[i+1]))]; i += 2; cmd = 'L'
        elif cmd == 'L':
            cur.append((float(toks[i]), float(toks[i+1]))); i += 2
        elif cmd == 'C':
            p = [(float(toks[i+k]), float(toks[i+k+1])) for k in (0, 2, 4)]; i += 6
            cur.extend(bez(cur[-1], *p))
    if cur: rings.append(cur)
    return [r for r in rings if len(r) >= 3]

def clean(r):
    out = []
    for p in r:
        q = (round(p[0], 4), round(p[1], 4))
        if not out or q != out[-1]: out.append(q)
    if len(out) > 1 and out[0] == out[-1]: out.pop()
    return [list(p) for p in out]

# ---- P: elongated pavement alphabet (pages 1-7, glyphs ordered by page then x) ----
PAV_ORDER = "CADBE" "HFIJGK" "NLOMP" "SQTRU" "XVYWZ" "31425" "86970"
glyphs = []
for pg in range(1, 8):
    svg = (ROOT / f'svg/Pavement-p{pg}.svg').read_text()
    for m in re.finditer(r'<path fill-rule="evenodd" fill="rgb\(11[^"]*"[^>]* d="([^"]+)"', svg):
        rings = svg_rings(m.group(1))  # pdftocairo wraps these paths in a y-flip matrix: raw y already points up
        ys = [y for r in rings for _, y in r]
        if max(ys) - min(ys) < 100: continue
        glyphs.append((pg, min(x for r in rings for x, _ in r), rings))
    # some counters (O, P, ...) are drawn as a separate white fill on top of the black letter
    for m in re.finditer(r'<path fill-rule="[^"]*" fill="rgb\(100%, 100%, 100%\)"[^>]* d="([^"]+)"', svg):
        for hole in svg_rings(m.group(1)):
            hx = [x for x, _ in hole]; hy = [y for _, y in hole]
            for g in glyphs:
                if g[0] != pg: continue
                gx = [x for r in g[2] for x, _ in r]; gy = [y for r in g[2] for _, y in r]
                if min(gx) <= min(hx) and max(hx) <= max(gx) and min(gy) <= min(hy) and max(hy) <= max(gy):
                    g[2].append(hole); break
glyphs.sort(key=lambda g: (g[0], g[1]))
assert len(glyphs) == len(PAV_ORDER), len(glyphs)
H = statistics.median(max(y for r in g[2] for _, y in r) - min(y for r in g[2] for _, y in r) for g in glyphs)
P = {}
for ch, (_, _, rings) in zip(PAV_ORDER, glyphs):
    x0 = min(x for r in rings for x, _ in r); y0 = min(y for r in rings for _, y in r)
    rs = [clean([((x - x0) / H, (y - y0) / H) for x, y in r]) for r in rings]
    w = max(x for r in rs for x, _ in r)
    P[ch] = {"adv": round(w, 4), "rings": rs}
# U on p10-4 is only 0.84 of the letter height as extracted (the rest is not a filled path); leave it out
# rather than ship a short U. Legends with U fall back to Series C/D or hold.
P.pop('U', None)
json.dump({"name": "FHWA SHS pavement-marking alphabet (elongated)", "source": "FHWA SHS Pavement Markings p10-1..10-7",
           "capHeight": 1, "letterGap": 0.0625, "wordSpace": 0.3, "glyphs": P},
          open(OUT / 'P.json', 'w'), separators=(',', ':'))
print('P', len(P), 'glyphs; median height (pt)', H)

# ---- C, D: Standard Alphabets fonts embedded in Alphabets.pdf ----
import pymupdf
from fontTools import t1Lib
from fontTools.pens.basePen import BasePen
NAMES = {'hyphen': '-', 'ampersand': '&', 'period': '.', 'comma': ',', 'slash': '/', 'exclam': '!',
         'question': '?', 'colon': ':', 'plus': '+', 'equal': '=', 'parenleft': '(', 'parenright': ')',
         'numbersign': '#', 'at': '@', 'dollar': '$', 'asterisk': '*',
         'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6',
         'seven': '7', 'eight': '8', 'nine': '9'}
class RingPen(BasePen):
    def __init__(s, gs): super().__init__(gs); s.rings = []; s.cur = []
    def _moveTo(s, p): s.cur = [p]
    def _lineTo(s, p): s.cur.append(p)
    def _curveToOne(s, a, b, c): s.cur.extend(bez(s.cur[-1], a, b, c))
    def _closePath(s):
        if len(s.cur) >= 3: s.rings.append(s.cur)
        s.cur = []
    _endPath = _closePath
doc = pymupdf.open(ROOT / 'src/Alphabets.pdf')
for series, pages in (('C', range(13, 19)), ('D', range(20, 27))):
    xref = next(x[0] for pn in pages for x in doc[pn-1].get_fonts() if f'Series{series}2000' in x[3])
    _, ext, _, buf = doc.extract_font(xref)
    tmp = OUT / f'.tmp-{series}.{ext}'; tmp.write_bytes(buf)
    f = t1Lib.T1Font(str(tmp)); f.parse(); gs = f.getGlyphSet(); tmp.unlink()
    pen = RingPen(gs); gs['H'].draw(pen); cap = max(y for r in pen.rings for _, y in r)
    G = {}
    for name in gs.keys():
        ch = NAMES.get(name, name if len(name) == 1 else None)
        if ch is None: continue
        pen = RingPen(gs); gs[name].draw(pen)
        G[ch] = {"adv": round(gs[name].width / cap, 4),
                 "rings": [clean([(x / cap, y / cap) for x, y in r]) for r in pen.rings]}
    G[' '] = {"adv": round(G['N']['adv'] * 0.75, 4), "rings": []}
    json.dump({"name": f"FHWA Standard Alphabets Series {series} 2000", "source": "FHWA Standard Alphabets (2000), embedded font",
               "capHeight": 1, "letterGap": 0, "glyphs": G}, open(OUT / f'{series}.json', 'w'), separators=(',', ':'))
    print(series, len(G), 'glyphs; cap units', cap)
