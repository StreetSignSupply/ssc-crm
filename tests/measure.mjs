// Every stencil's measurement drawing is to scale, has a border, and matches its sheet size.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "next/index.html"), "utf8");
const grab = (from, to) => {
  const a = html.indexOf(from);
  const b = html.indexOf(to, a + from.length);
  if (a < 0 || b < 0) throw new Error("missing " + from);
  return html.slice(a, b);
};
const src = grab("function stcParseName", "document.addEventListener")
  + grab("function stcSizeText", "function stcShort")
  + grab("function stcDiagram", "function stcHowCard");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const { stcDims, stcDiagram, stcSizeText } = new Function("esc", src + "\nreturn {stcDims, stcDiagram, stcSizeText};")(esc);
const cat = JSON.parse(fs.readFileSync(path.join(root, "public/stencil-catalog.json"), "utf8"));
const q = (x) => (Math.round(Number(x) * 100) / 100) + "″";
const bad = [];
const checkDraw = (s, label) => {
  const d = stcDims(s);
  if (!(d.sw > d.pw && d.sh > d.ph)) bad.push(label + ": no border (" + d.sw + "×" + d.sh + " around " + d.pw + "×" + d.ph + ")");
  const svg = stcDiagram(s, { w: 320, h: 250 });
  const attr = svg.match(/data-sw="([^"]+)" data-sh="([^"]+)" data-ph="([^"]+)" data-pw="([^"]+)"/);
  if (!attr) { bad.push(label + ": drawing has no sizes"); return d; }
  if (+attr[1] !== d.sw || +attr[2] !== d.sh || +attr[3] !== d.ph || +attr[4] !== d.pw) bad.push(label + ": labels are not the drawn sizes");
  if (!svg.includes("Sheet " + q(d.sw) + " wide") || !svg.includes(q(d.sh) + " tall") || !svg.includes(q(d.ph))) bad.push(label + ": a label doesn't match the size");
  if (!svg.includes(q(d.bV) + " border")) bad.push(label + ": border isn't labeled");
  const rect = svg.match(/<rect x="[\d.]+" y="[\d.]+" width="([\d.]+)" height="([\d.]+)" rx="2"/);
  if (!rect) bad.push(label + ": no sheet");
  else {
    const ratio = (+rect[1]) / (+rect[2]);
    const want = d.sw / d.sh;
    if (Math.abs(ratio / want - 1) > 0.01) bad.push(label + ": sheet not to scale (" + ratio.toFixed(3) + " vs " + want.toFixed(3) + ")");
  }
  const box = svg.match(/<rect x="[\d.]+" y="[\d.]+" width="([\d.]+)" height="([\d.]+)" fill="#D50101"|<text transform="translate/);
  if (!box) bad.push(label + ": no painted area");
  return d;
};
if (cat.items.length !== 1860) bad.push("catalog has " + cat.items.length + " stencils, expected 1860");
for (const s of cat.items) {
  const d = checkDraw(s, s.sku);
  if (Number(s.w) !== d.sw || Number(s.h) !== d.sh) bad.push(s.sku + ": diagram sheet " + d.sw + "×" + d.sh + " != catalog " + s.w + "×" + s.h);
  if (d.approx) bad.push(s.sku + ": still guessing the sheet");
  if (Number(s.paintH) !== d.ph || Number(s.paintW) !== d.pw) bad.push(s.sku + ": painted size drifted");
}
const alp = cat.items.find((s) => s.sku === "SSS-ALP-018-04");
const ad = stcDims(alp);
if (ad.sw !== 11 || ad.sh !== 22 || ad.ph !== 18 || ad.pw !== 9 || ad.bV !== 2) bad.push("SSS-ALP-018-04 is " + JSON.stringify({ sw: ad.sw, sh: ad.sh, ph: ad.ph, pw: ad.pw, bV: ad.bV }));
const text = stcSizeText(alp);
if (text !== "18″ tall × 9″ wide painted · sheet 11″ wide × 22″ tall") bad.push("size text: " + text);
const ex1 = checkDraw({ n: '12" Alphabet Kit Stencil', w: 10, h: 16, pc: 38 }, "how-card letters");
if (ex1.sh !== 16 || ex1.approx) bad.push("12″ alphabet example sheet changed (" + ex1.sw + "×" + ex1.sh + ")");
const ex2 = checkDraw({ n: '24" x 16" Arrow Stencil', w: 22, h: 30, pc: 1 }, "how-card arrow");
if (ex2.sw !== 22 || ex2.sh !== 30 || ex2.ph !== 24 || ex2.pw !== 16) bad.push("24×16 arrow example is " + ex2.sw + "×" + ex2.sh);
if (bad.length) {
  console.log("::error::measure check failed: " + bad.slice(0, 12).join(" || "));
  process.exit(1);
}
console.log("::notice::measure check passed: " + cat.items.length + " stencils to scale, with a border");
