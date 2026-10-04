/* ===========================================================================
   NUTRI-GRAFICAS · las gráficas de Nutrición, en SVG a mano (v2.49)
   ---------------------------------------------------------------------------
   El lenguaje del Arc: tiras de rango, barras, curvas y un mapa de calor en
   tinta (--fg sobre --sf2), un solo acento (--coc) para lo de ahora, sin
   degradados. Cada gráfica lleva su valor también en texto (aria-label y
   etiquetas) y "s/d" donde no hay datos: nunca un 0 inventado.
   Devuelven HTML (texto): node las carga para los tests.
   =========================================================================== */
(function (raiz, fabrica) {
  var X = fabrica();
  if (typeof module === "object" && module.exports) module.exports = X;
  else raiz.NutriGraficas = X;
})(typeof window !== "undefined" ? window : this, function () {
"use strict";

function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function n1(v) { if (v == null || !isFinite(v)) return "s/d"; var r = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10; return String(r).replace(".", ","); }
var T = 'font-family="Manrope,sans-serif" font-weight="700"';

/* Tira de rango: la banda del objetivo (min–max, o desde min), el valor como marca y el número en texto.
   o = {nombre, v, min, max, u, acento, supl (lo que viene de suplementos), est (texto "estimado")}      */
function tira(o) {
  var top = Math.max(o.max || (o.min || 1) * 1.4, o.v || 0, o.min || 0) * 1.12 || 1;
  var x = function (n) { return Math.max(0, Math.min(100, n / top * 100)).toFixed(1) + "%"; };
  var banda = o.min != null ? '<i class="ngB" style="left:' + x(o.min) + ';width:' + (o.max != null && o.max > o.min ? ((o.max - o.min) / top * 100).toFixed(1) + "%" : "calc(100% - " + x(o.min) + ")") + '"></i>' : "";
  var sp = o.supl && o.v ? '<i class="ngS" style="left:' + x(Math.max(0, o.v - o.supl)) + ';width:' + (o.supl / top * 100).toFixed(1) + '%"></i>' : "";
  var mk = o.v != null ? '<i class="ngM' + (o.acento ? " ac" : "") + '" style="left:' + x(o.v) + '"></i>' : "";
  var obj = o.min == null ? "" : o.max != null && o.max !== o.min ? n1(o.min) + "–" + n1(o.max) : "≥ " + n1(o.min);
  return '<div class="ngTira" role="img" aria-label="' + esc(o.nombre + ": " + n1(o.v) + " " + o.u + (obj ? ", objetivo " + obj : "") + (o.supl ? ", " + n1(o.supl) + " de suplementos" : "")) + '">' +
    '<div class="ngTiraT"><span>' + esc(o.nombre) + '</span><span><b>' + n1(o.v) + '</b> ' + (obj ? '<em>/ ' + obj + '</em> ' : "") + esc(o.u) +
    (o.est ? ' <em>· ' + esc(o.est) + '</em>' : "") + (o.supl ? ' <em>· ' + n1(o.supl) + ' Supl.</em>' : "") + '</span></div>' +
    '<div class="ngTiraB">' + banda + sp + mk + '</div></div>';
}

/* Barras apiladas por día. dias = [{label, segs: [n, n, n] | null, total}], max, linea (objetivo), acento (índice) */
function barras(dias, max, linea, opt) {
  opt = opt || {}; var W = 340, H = opt.h || 170, n = dias.length || 1, bw = W / n, h = "", ops = [1, .55, .28];
  max = max || 1;
  dias.forEach(function (d, i) {
    var x = i * bw + bw * .18, w = bw * .64;
    if (!d.segs) h += '<rect x="' + x + '" y="' + (H - 22) + '" width="' + w + '" height="2" fill="var(--sf2)"/><text x="' + (x + w / 2) + '" y="' + (H - 28) + '" text-anchor="middle" font-size="10" fill="var(--mu)" ' + T + '>s/d</text>';
    else {
      var y = H - 20;
      d.segs.forEach(function (p, k) { var hh = Math.max(0, p) / max * (H - 44); y -= hh; h += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" fill="' + (opt.acento === i && k === 0 ? "var(--coc)" : "var(--fg)") + '" opacity="' + (opt.acento === i && k === 0 ? 1 : ops[k] || .2) + '"/>'; });
      if (opt.valor) h += '<text x="' + (x + w / 2) + '" y="' + (y - 4) + '" text-anchor="middle" font-size="10" fill="var(--fg)" ' + T + '>' + esc(opt.valor(d)) + '</text>';
    }
    h += '<text x="' + (x + w / 2) + '" y="' + (H - 5) + '" text-anchor="middle" font-size="11" fill="var(--mu)" ' + T + '>' + esc(d.label) + '</text>';
  });
  (linea ? [].concat(linea) : []).forEach(function (l) { if (l == null) return; var y = H - 20 - l / max * (H - 44); h += '<line x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="var(--mu)" stroke-dasharray="4 4"/>'; });
  return '<svg class="ngSvg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.aria || "") + '">' + h + '</svg>';
}

/* Una curva con su banda por punto (el objetivo de cada semana) y, si se da, una de referencia (lo esperado).
   pts = [{label, v | null, lo, hi}], opt = {ref: [n|null], ultimo (índice acento), h}                       */
function curva(pts, opt) {
  opt = opt || {}; var W = 340, H = opt.h || 180, n = pts.length, h = "";
  var vs = []; pts.forEach(function (p) { [p.v, p.lo, p.hi].forEach(function (v) { if (v != null && isFinite(v)) vs.push(v); }); });
  (opt.ref || []).forEach(function (v) { if (v != null) vs.push(v); });
  if (!vs.length) return '<p class="ngSin">Sin datos.</p>';
  var mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs), pad = (mx - mn) * .12 || Math.abs(mx) * .1 || 1; mn -= pad; mx += pad;
  var X = function (i) { return 16 + (n > 1 ? i * (W - 32) / (n - 1) : (W - 32) / 2); }, Y = function (v) { return 10 + (1 - (v - mn) / (mx - mn)) * (H - 34); };
  var bw = n > 1 ? (W - 32) / (n - 1) : 40;
  pts.forEach(function (p, i) { if (p.lo != null) { var hi = p.hi != null ? p.hi : mx; h += '<rect x="' + (X(i) - bw / 2) + '" y="' + Y(hi) + '" width="' + bw + '" height="' + Math.max(1, Y(p.lo) - Y(hi)) + '" fill="var(--sf2)"/>'; } });
  if (opt.ref) { var d2 = "", on = false; opt.ref.forEach(function (v, i) { if (v == null) { on = false; return; } d2 += (on ? "L" : "M") + X(i) + " " + Y(v); on = true; }); h += '<path d="' + d2 + '" fill="none" stroke="var(--mu)" stroke-width="2" stroke-dasharray="4 4"/>'; }
  var d = "", pen = false;
  pts.forEach(function (p, i) { if (p.v == null) { pen = false; return; } d += (pen ? "L" : "M") + X(i) + " " + Y(p.v); pen = true; });
  if (d) h += '<path d="' + d + '" fill="none" stroke="var(--fg)" stroke-width="2.5"/>';
  pts.forEach(function (p, i) {
    if (p.v == null) h += '<text x="' + X(i) + '" y="' + (H - 28) + '" text-anchor="middle" font-size="10" fill="var(--mu)" ' + T + '>s/d</text>';
    else h += '<circle cx="' + X(i) + '" cy="' + Y(p.v) + '" r="' + (i === opt.ultimo ? 5 : 3.5) + '" fill="' + (i === opt.ultimo ? "var(--coc)" : "var(--fg)") + '"/>';
    h += '<text x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" fill="var(--mu)" ' + T + '>' + esc(p.label) + '</text>';
  });
  var aria = pts.map(function (p) { return p.label + " " + n1(p.v); }).join(", ");
  return '<svg class="ngSvg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(aria) + '">' + h + '</svg>';
}

/* Barras con su banda de objetivo detrás (carbohidratos por tipo de día). g = [{label, v|null, lo, hi}], max */
function barrasBanda(g, max, opt) {
  opt = opt || {}; var W = 340, H = opt.h || 190, n = g.length || 1, bw = W / n, h = "";
  var y = function (v) { return H - 24 - v / max * (H - 46); };
  g.forEach(function (b, i) {
    var x = i * bw + bw * .12, w = bw * .76;
    if (b.lo != null) h += '<rect x="' + x + '" y="' + y(b.hi) + '" width="' + w + '" height="' + Math.max(1, y(b.lo) - y(b.hi)) + '" fill="var(--sf2)"/>';
    if (b.v == null) h += '<text x="' + (x + w / 2) + '" y="' + (H - 32) + '" text-anchor="middle" font-size="10" fill="var(--mu)" ' + T + '>s/d</text>';
    else h += '<rect x="' + (x + w * .3) + '" y="' + y(b.v) + '" width="' + (w * .4) + '" height="' + (H - 24 - y(b.v)) + '" rx="3" fill="' + (b.lo != null && b.v < b.lo ? "var(--coc)" : "var(--fg)") + '"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y(b.v) - 5) + '" text-anchor="middle" font-size="11" fill="var(--fg)" ' + T + '>' + n1(b.v) + '</text>';
    h += '<text x="' + (x + w / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" fill="var(--mu)" ' + T + '>' + esc(b.label) + '</text>';
  });
  return '<svg class="ngSvg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(g.map(function (b) { return b.label + " " + n1(b.v); }).join(", ")) + '">' + h + '</svg>';
}

/* Mapa de calor: filas × columnas, el % escrito en cada celda (más cubierto, más tinta). celdas: [p|null] */
function calor(cols, filas) {
  var h = '<table class="ngCalor"><tr><td></td>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join("") + '</tr>';
  filas.forEach(function (f) {
    h += '<tr><td class="ngCalorN">' + esc(f.nombre) + '</td>' + f.celdas.map(function (p) {
      if (p == null) return '<td class="sd">s/d</td>';
      var a = Math.min(1, p / 100), cl = a > .6 ? " osc" : "";
      return '<td class="ngC' + cl + '" style="--a:' + (0.12 + a * 0.75).toFixed(2) + '">' + Math.round(p) + '</td>';
    }).join("") + '</tr>';
  });
  return h + '</table>';
}

/* Una barra de cobertura horizontal: comida (tinta) + suplementos (más claro), la raya del 100 % */
function cobertura(o) {
  var top = 150, w = function (p) { return Math.max(0, Math.min(100, p / top * 100)).toFixed(1) + "%"; };
  return '<div class="ngCob" role="img" aria-label="' + esc(o.nombre + ": " + (o.total == null ? "sin datos" : Math.round(o.total) + " % del mínimo" + (o.supl ? ", " + Math.round(o.supl) + " % de suplementos" : ""))) + '">' +
    '<span>' + esc(o.nombre) + '</span><div class="ngCobB">' + (o.total == null ? "" : '<i style="width:' + w(o.total - (o.supl || 0)) + '"></i>' + (o.supl ? '<i class="s" style="width:' + w(o.supl) + '"></i>' : "")) +
    '<b style="left:' + w(100) + '"></b></div><em>' + (o.total == null ? "s/d" : Math.round(o.total) + "%") + '</em></div>';
}

var CSS =
  ".ngTira{margin-top:12px}.ngTiraT{display:flex;justify-content:space-between;gap:8px;font-size:14px;font-weight:700}.ngTiraT em{font-style:normal;font-weight:600;color:var(--mu)}" +
  ".ngTiraB{position:relative;height:12px;margin-top:6px;background:var(--sf2);border-radius:6px}" +
  ".ngB{position:absolute;top:0;bottom:0;background:var(--mu);opacity:.35;border-radius:6px}.ngS{position:absolute;top:2px;bottom:2px;background:var(--fg);opacity:.35;border-radius:4px}" +
  ".ngM{position:absolute;top:-3px;bottom:-3px;width:3px;margin-left:-1px;border-radius:2px;background:var(--fg)}.ngM.ac{background:var(--coc)}" +
  ".ngSvg{display:block;width:100%;height:auto}.ngSin{font-size:13px;font-weight:600;color:var(--mu)}" +
  ".ngCalor{width:100%;border-collapse:separate;border-spacing:3px}.ngCalor th{font-size:10px;font-weight:800;color:var(--mu);letter-spacing:.04em}" +
  ".ngCalor td{height:40px;text-align:center;font-size:12px;font-weight:800;border-radius:6px}.ngCalorN{font-size:12px!important;text-align:left!important;white-space:nowrap}" +
  ".ngC{background:rgba(244,245,247,var(--a));color:var(--fg)}.ngC.osc{color:var(--bg)}" +
  "html[data-tema=claro] .ngC{background:rgba(20,21,24,var(--a))}" +
  ".ngCalor td.sd{color:var(--mu);font-size:11px;box-shadow:inset 0 0 0 1px var(--ln)}" +
  ".ngCob{display:grid;grid-template-columns:96px 1fr 48px;gap:10px;align-items:center;min-height:44px}.ngCob span{font-size:13px;font-weight:700}.ngCob em{font-style:normal;font-size:13px;font-weight:800;text-align:right}" +
  ".ngCobB{position:relative;height:12px;background:var(--sf2);border-radius:6px;display:flex;overflow:visible}.ngCobB i{display:block;height:100%;background:var(--fg)}.ngCobB i:first-child{border-radius:6px 0 0 6px}" +
  ".ngCobB i.s{opacity:.4}.ngCobB b{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--mu)}";

return { esc: esc, n1: n1, tira: tira, barras: barras, curva: curva, barrasBanda: barrasBanda, calor: calor, cobertura: cobertura, CSS: CSS };
});
