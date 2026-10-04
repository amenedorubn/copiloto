// Maquetas de las estadísticas de Nutrición (N1–N7). Datos FICTICIOS de ejemplo.
var NT = {
  hoy: [["Carbohidratos", 262, 280, 420, "g"], ["Fibra", 24, 30, 40, "g"], ["Vitamina C", 65, 110, null, "mg"], ["Folato", 210, 330, null, "µg"],
        ["Energía", 2150, 2640, 2640, "kcal"], ["Proteína", 118, 112, 126, "g"], ["Grasa", 70, 63, 77, "g"]],
  dias: ["L", "M", "X", "J", "V", "S", "D"],
  semana: [[118, 290, 68], [125, 330, 72], [110, 250, 80], [130, 360, 66], [null, null, null], [105, 300, 90], [120, 420, 70]],   // prot, hc, grasa (g); V: sin datos
  sem8: ["31/8", "7/9", "14/9", "21/9", "28/9", "5/10", "12/10", "19/10"],
  prot: [1.5, 1.6, 1.7, 1.6, 1.7, 1.8, 1.7, null], hcKg: [4.1, 4.4, 4.0, 4.6, 4.8, 5.2, 6.3, null],
  fibra: [22, 25, 24, 28, 26, 27, 23, null], vitC: [70, 85, 60, 95, 80, 72, 66, null], folato: [220, 240, 210, 260, 250, 230, 215, null],
  peso: [78.4, 78.1, 77.9, 77.6, 77.8, 77.5, 77.3, null], pesoEsp: [78.4, 78.2, 78.0, 77.8, 77.6, 77.4, 77.2, 77.2]
};
function enT(v) { return v == null ? "s/d" : String(v).replace(".", ","); }
function pct(v, min) { return v == null || !min ? null : Math.round(v / min * 100); }
// tira de rango: banda del objetivo (min–max), el valor como marca y el número en texto
function tiraRango(nom, v, a, b, u, acento) {
  var top = Math.max(b || a * 1.3, v || 0) * 1.15, x = function (n) { return (n / top * 100).toFixed(1) + "%"; };
  return '<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700"><span>' + nom + '</span><span>' + enT(v) + ' <span class="mu" style="font-weight:600">/ ' +
    (b && b !== a ? a + "–" + b : "≥ " + a) + ' ' + u + '</span></span></div><div style="position:relative;height:12px;margin-top:6px;background:var(--sf2);border-radius:6px">' +
    '<i style="position:absolute;top:0;bottom:0;left:' + x(a) + ';width:' + (b && b !== a ? ((b - a) / top * 100).toFixed(1) + "%" : "calc(100% - " + x(a) + ")") + ';background:var(--wait);border-radius:6px"></i>' +
    (v != null ? '<i style="position:absolute;top:-3px;bottom:-3px;left:' + x(v) + ';width:3px;border-radius:2px;background:' + (acento ? "var(--ac)" : "var(--fg)") + '"></i>' : "") + '</div></div>';
}
function anilloN(nom, v, min, u, acento) {
  var p = Math.min(1, (v || 0) / min), r = 30, c = 2 * Math.PI * r;
  return '<div style="text-align:center"><svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="' + r + '" fill="none" stroke="var(--sf2)" stroke-width="9"/>' +
    '<circle cx="40" cy="40" r="' + r + '" fill="none" stroke="' + (acento ? "var(--ac)" : "var(--fg)") + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + (c * p) + " " + c + '" transform="rotate(-90 40 40)"/>' +
    '<text x="40" y="45" text-anchor="middle" font-family="Manrope" font-weight="800" font-size="15" fill="var(--fg)">' + pct(v, min) + '%</text></svg><b style="display:block;font-size:13px">' + nom + '</b><small class="ps">' + enT(v) + ' / ' + min + ' ' + u + '</small></div>';
}
// barras verticales (con "s/d" donde no hay datos) y una línea de objetivo
function barrasV(vals, labels, max, obj, opt) {
  opt = opt || {}; var W = 340, H = opt.h || 150, n = vals.length, bw = W / n, h = "";
  vals.forEach(function (v, i) {
    var x = i * bw + bw * 0.18, w = bw * 0.64;
    if (v == null) h += '<rect x="' + x + '" y="' + (H - 22) + '" width="' + w + '" height="2" fill="var(--sf2)"/><text x="' + (x + w / 2) + '" y="' + (H - 28) + '" text-anchor="middle" font-size="10" fill="var(--mu)" font-family="Manrope" font-weight="700">s/d</text>';
    else if (Array.isArray(v)) { var y = H - 20; v.forEach(function (p, k) { var hh = p / max * (H - 40); y -= hh; h += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" fill="var(--fg)" opacity="' + [1, .55, .28][k] + '"/>'; }); }
    else { var hh = v / max * (H - 40); h += '<rect x="' + x + '" y="' + (H - 20 - hh) + '" width="' + w + '" height="' + hh + '" rx="3" fill="' + (opt.acento === i ? "var(--ac)" : "var(--fg)") + '"/>' +
      (opt.val ? '<text x="' + (x + w / 2) + '" y="' + (H - 25 - hh) + '" text-anchor="middle" font-size="10" fill="var(--fg)" font-family="Manrope" font-weight="700">' + enT(v) + '</text>' : ""); }
    h += '<text x="' + (x + w / 2) + '" y="' + (H - 5) + '" text-anchor="middle" font-size="11" fill="var(--mu)" font-family="Manrope" font-weight="700">' + labels[i] + '</text>';
  });
  if (obj) obj.forEach(function (o) { var y = H - 20 - o / max * (H - 40); h += '<line x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="var(--mu)" stroke-dasharray="4 4"/>'; });
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img">' + h + '</svg>';
}
// curva con puntos; null corta la línea (sin datos); banda opcional
function curva(vals, labels, lo, hi, opt) {
  opt = opt || {}; var W = 340, H = opt.h || 120, n = vals.length, h = "", ok = vals.filter(function (v) { return v != null; });
  var mn = Math.min.apply(null, ok.concat(opt.band ? [opt.band[0]] : [])) * 0.97, mx = Math.max.apply(null, ok.concat(opt.band ? [opt.band[1]] : [])) * 1.03;
  var X = function (i) { return 14 + i * (W - 28) / (n - 1); }, Y = function (v) { return 10 + (1 - (v - mn) / (mx - mn)) * (H - 30); };
  if (opt.band) h += '<rect x="0" y="' + Y(opt.band[1]) + '" width="' + W + '" height="' + (Y(opt.band[0]) - Y(opt.band[1])) + '" fill="var(--wait)" opacity=".6"/>';
  if (opt.ref) { var d2 = ""; opt.ref.forEach(function (v, i) { d2 += (i ? "L" : "M") + X(i) + " " + Y(v); }); h += '<path d="' + d2 + '" fill="none" stroke="var(--mu)" stroke-dasharray="4 4" stroke-width="2"/>'; }
  var d = "", pen = false;
  vals.forEach(function (v, i) { if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + X(i) + " " + Y(v); pen = true; });
  h += '<path d="' + d + '" fill="none" stroke="var(--fg)" stroke-width="2.5"/>';
  vals.forEach(function (v, i) {
    if (v == null) h += '<text x="' + X(i) + '" y="' + (H - 24) + '" text-anchor="middle" font-size="10" fill="var(--mu)" font-family="Manrope" font-weight="700">s/d</text>';
    else h += '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="' + (i === opt.ultimo ? 5 : 3.5) + '" fill="' + (i === opt.ultimo ? "var(--ac)" : "var(--fg)") + '"/>';
    if (labels) h += '<text x="' + X(i) + '" y="' + (H - 4) + '" text-anchor="middle" font-size="10" fill="var(--mu)" font-family="Manrope" font-weight="700">' + labels[i] + '</text>';
  });
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img">' + h + '</svg>';
}
function celda(p) {   // mapa de calor en tinta: más cubierto, más tinta; el % siempre en texto
  if (p == null) return '<td style="height:40px;text-align:center;font-size:11px;font-weight:700;color:var(--mu);border:1px dashed var(--ln)">s/d</td>';
  var a = Math.min(1, p / 100), osc = a > 0.6;
  return '<td style="height:40px;text-align:center;font-size:12px;font-weight:800;background:rgba(' + (document.documentElement.getAttribute("data-tema") === "claro" ? "20,21,24" : "244,245,247") + ',' + (0.1 + a * 0.75).toFixed(2) + ');color:' + (osc ? "var(--bg)" : "var(--fg)") + '">' + p + '</td>';
}
function cabN(sub) { return cab("Nutrición", sub || "Estadísticas") + seg(["Semana", "Comprar", "Casa", "Nutrición"], 3); }
function chipsN(L, on) { return '<div class="g1" style="display:flex;gap:6px;flex-wrap:wrap">' + L.map(function (x, i) { return '<span class="chip' + (i === on ? " on" : "") + '">' + x + '</span>'; }).join("") + '</div>'; }
var NOTA_PLAN = '<p class="ps g0">Planificado + registrado. No es lo que has comido de verdad.</p>';

/* ---------------- N1 · Hoy ---------------- */
P.n1a = function () { return tel(cabN("Hoy · gimnasio · Mantenimiento"), NOTA_PLAN + '<div class="caja g1">' + NT.hoy.map(function (r, i) { return tiraRango(r[0], r[1], r[2], r[3], r[4], i === 0); }).join("") + '</div>'); };
P.n1b = function () {
  return tel(cabN("Hoy · gimnasio · Mantenimiento"), NOTA_PLAN + '<div class="g1" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
    NT.hoy.slice(0, 4).map(function (r, i) { return '<div class="caja">' + anilloN(r[0], r[1], r[2], r[4], i === 2) + '</div>'; }).join("") + '</div>' +
    '<div class="caja g1">' + NT.hoy.slice(4).map(function (r) { return '<div class="fila" style="min-height:40px"><div class="t"><b style="font-size:14px">' + r[0] + '</b></div><span class="n" style="font-size:14px">' + enT(r[1]) + ' / ' + r[2] + (r[3] !== r[2] ? "–" + r[3] : "") + ' ' + r[4] + '</span></div>'; }).join("") + '</div>');
};
P.n1c = function () {
  return tel(cabN("Hoy · gimnasio · Mantenimiento"), '<div class="caja g0" style="padding:16px 14px"><p class="cap">ENERGÍA · ESTIMADO</p><div style="display:flex;align-items:baseline;gap:8px;margin-top:4px"><span class="reloj" style="font-size:40px">2150</span><span class="ps">de 2640 kcal · 81 %</span></div>' +
    '<div class="barra" style="height:10px;margin-top:10px"><i style="width:81%"></i></div><div style="display:flex;gap:6px;margin-top:10px">' +
    [["Prot.", 118, 0.37], ["Carb.", 262, 0.49], ["Grasa", 70, 0.29]].map(function (m) { return '<div style="flex:1;background:var(--sf2);border-radius:12px;padding:8px 10px"><small class="ps">' + m[0] + '</small><b style="display:block;font-size:17px">' + m[1] + ' g</b></div>'; }).join("") + '</div></div>' +
    '<p class="cap g">PRIORITARIOS</p><div class="caja g0">' + NT.hoy.slice(0, 4).map(function (r, i) { return tiraRango(r[0], r[1], r[2], r[3], r[4], i === 2); }).join("") + '</div>');
};
P.n1d = function () {
  return tel(cabN("Hoy · gimnasio · Mantenimiento"), '<div class="caja g0" style="padding:16px 14px"><p class="cap ac">HOY TE FALTA</p><div class="big" style="font-size:24px;margin-top:6px">45 mg de vitamina C, 120 µg de folato y 18 g de carbohidratos</div>' +
    '<p class="ps" style="margin-top:6px">1 kiwi y 60 g de espinacas, en casa. Proteína y grasa, en rango.</p></div>' +
    '<div class="caja g1" style="padding:6px 14px">' + NT.hoy.map(function (r) { var p = pct(r[1], r[2]);
      return '<div style="display:grid;grid-template-columns:104px 1fr 44px;gap:10px;align-items:center;height:38px"><span style="font-size:13px;font-weight:700">' + r[0] + '</span><div class="barra"><i style="width:' + Math.min(100, p) + '%"></i></div><b style="font-size:13px;text-align:right">' + p + '%</b></div>'; }).join("") + '</div>' + NOTA_PLAN);
};

/* ---------------- N2 · Semana ---------------- */
var SEMKC = NT.semana.map(function (d) { return d[0] == null ? null : [d[0] * 4, d[1] * 4, d[2] * 9]; });
P.n2a = function () {
  return tel(cabN("Semana del 5 oct · Mantenimiento"), '<p class="cap g1">ENERGÍA POR DÍA · KCAL</p><div class="caja g0">' + barrasV(SEMKC, NT.dias, 2600, [2640 * 0.85], { h: 170 }) +
    '<div class="ley"><span><i style="background:var(--fg)"></i>Prot.</span><span><i style="background:var(--fg);opacity:.55"></i>Carb.</span><span><i style="background:var(--fg);opacity:.28"></i>Grasa</span><span>- - objetivo</span></div></div>' +
    '<p class="cap g">ADHERENCIA</p><p class="big g0" style="font-size:22px">4 de 6 días en rango</p><p class="ps">El viernes no tiene datos: no cuenta.</p>');
};
P.n2b = function () {
  var ok = [1, 1, 0, 1, null, 0, 1];
  return tel(cabN("Semana del 5 oct · Mantenimiento"), '<div class="caja g1"><p class="cap">DÍAS EN RANGO</p><div style="display:flex;justify-content:space-between;margin-top:10px">' +
    NT.dias.map(function (d, i) { var v = ok[i]; return '<div style="text-align:center"><div style="width:36px;height:36px;border-radius:50%;' + (v == null ? "border:2px dashed var(--mu)" : v ? "background:var(--fg)" : "border:2px solid var(--fg)") +
      ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:' + (v ? "var(--bg)" : "var(--mu)") + '">' + (v == null ? "s/d" : v ? ic("check", "s") : "") + '</div><small class="ps">' + d + '</small></div>'; }).join("") + '</div></div>' +
    '<p class="cap g">MEDIA DE LA SEMANA · % DEL OBJETIVO</p><div class="caja g0" style="padding:4px 14px">' +
    [["Carbohidratos", 77], ["Fibra", 82], ["Vitamina C", 64], ["Folato", 70], ["Proteína", 101], ["Energía", 88]].map(function (r) { return fila("", r[0], "", '<span class="n">' + r[1] + ' %</span>'); }).join("") + '</div>');
};
P.n2c = function () {
  var N = [["Carb.", [70, 85, 64, 92, null, 80, 110]], ["Fibra", [80, 96, 70, 90, null, 60, 88]], ["Vit. C", [59, 72, 40, 95, null, 48, 66]], ["Folato", [64, 80, 55, 76, null, 61, 70]], ["Prot.", [105, 112, 98, 116, null, 94, 107]]];
  return tel(cabN("Semana del 5 oct · Mantenimiento"), '<p class="ps g1">% del mínimo de cada día. Toca una celda para ver el dato.</p><table class="g1" style="width:100%;border-collapse:separate;border-spacing:3px"><tr><td></td>' +
    NT.dias.map(function (d) { return '<td class="cap" style="text-align:center">' + d + '</td>'; }).join("") + '</tr>' +
    N.map(function (r) { return '<tr><td style="font-size:12px;font-weight:700;width:56px">' + r[0] + '</td>' + r[1].map(celda).join("") + '</tr>'; }).join("") + '</table>');
};
P.n2d = function () {
  return tel(cabN("Semana del 5 oct · Mantenimiento"), '<p class="cap g1">CARBOHIDRATOS POR DÍA · G</p><div class="caja g0">' + barrasV(NT.semana.map(function (d) { return d[1]; }), NT.dias, 450, [280, 420], { val: true, acento: 6 }) + '<p class="ps">Banda: 280–420 g (4–6 g/kg)</p></div>' +
    '<p class="cap g">LA SEMANA EN UNA LÍNEA</p><div class="caja g0">' + tiraRango("Fibra media", 26, 30, 40, "g") + tiraRango("Vitamina C media", 70, 110, null, "mg") + tiraRango("Folato medio", 231, 330, null, "µg") + '</div>');
};

/* ---------------- N3 · Tendencias ---------------- */
P.n3a = function () {
  var m = [["Proteína · g/kg", NT.prot, [1.6, 1.8]], ["Carbohidratos · g/kg", NT.hcKg, [4, 6]], ["Fibra · g", NT.fibra, [30, 40]], ["Vitamina C · mg", NT.vitC, [110, 130]]];
  return tel(cabN("Últimas 8 semanas"), m.map(function (x, i) { return '<p class="cap" style="margin-top:' + (i ? 18 : 12) + 'px">' + x[0] + '</p>' + curva(x[1], i === 3 ? NT.sem8 : null, 0, 0, { band: x[2], h: i === 3 ? 92 : 72, ultimo: 6 }); }).join(""));
};
P.n3b = function () {
  return tel(cabN("Últimas 8 semanas"), chipsN(["Carb. g/kg", "Prot. g/kg", "Fibra", "Vit. C", "Folato"], 0) +
    '<div class="caja g1">' + curva(NT.hcKg, NT.sem8, 0, 0, { band: [4, 6], h: 200, ultimo: 6 }) + '<p class="ps">Media semanal. La banda es el objetivo de cada fase; la última semana aún no tiene datos.</p></div>' +
    '<div class="caja g1" style="padding:4px 14px">' + fila("", "Esta semana", "Descarga · 5–6 g/kg", '<span class="n">6,3 g/kg</span>') + fila("", "Media de 8 semanas", "", '<span class="n">4,8 g/kg</span>') + '</div>');
};
P.n3c = function () {
  var R = [["Proteína", "1,7 g/kg", "▲ 0,1"], ["Carbohidratos", "6,3 g/kg", "▲ 1,1"], ["Fibra", "23 g", "▼ 4"], ["Vitamina C", "66 mg", "▼ 6"], ["Folato", "215 µg", "▼ 15"], ["Peso medio", "77,3 kg", "▼ 0,2"]];
  return tel(cabN("Medias semanales"), '<div class="caja g1" style="padding:4px 14px"><div class="fila" style="min-height:32px"><div class="t"><small class="cap">NUTRIENTE</small></div><span class="cap">SEMANA</span><span class="cap" style="width:64px;text-align:right">VS ANT.</span></div>' +
    R.map(function (r) { return '<div class="fila"><div class="t"><b>' + r[0] + '</b></div><span class="n">' + r[1] + '</span><span class="ps" style="width:64px;text-align:right;font-weight:800">' + r[2] + '</span></div>'; }).join("") + '</div>' +
    '<p class="ps g1">▲▼ frente a la semana anterior. Una semana sin datos sale «s/d», nunca 0.</p>');
};
P.n3d = function () {
  return tel(cabN("Peso medio semanal"), '<div class="caja g1"><p class="cap">PESO MEDIO · KG</p>' + curva(NT.peso, NT.sem8, 0, 0, { ref: NT.pesoEsp, h: 190, ultimo: 6 }) +
    '<div class="ley"><span><i style="background:var(--fg)"></i>Tu media</span><span>- - lo esperado en la fase</span></div></div>' +
    '<div class="caja g1" style="padding:4px 14px">' + fila("", "Esta semana", "Descarga: −0,1…−0,3 kg/sem", '<span class="n">77,3 kg</span>') + fila("", "Cambio en 7 semanas", "Esperado −1,2 kg", '<span class="n">−1,1 kg</span>') + '</div>' +
    '<p class="ps g1">El peso se pide una vez por semana: la media, no el dato del día.</p>');
};

/* ---------------- N4 · Fases ---------------- */
var FS = [["Descarga", "12–18 oct", 1], ["Recuperación", "19 oct–2 nov", 2], ["Mantenimiento", "3–30 nov", 4], ["Definición", "dic–mar", 17]];
P.n4a = function () {
  var tot = 24, x = 0;
  return tel(cabN("Fases"), '<div class="caja g1"><div style="display:flex;height:40px;border-radius:10px;overflow:hidden">' + FS.map(function (f, i) {
      return '<div style="flex:' + f[2] + ';background:var(--fg);opacity:' + [1, .7, .45, .25][i] + ';border-right:2px solid var(--sf)"></div>'; }).join("") + '</div>' +
    '<div style="position:relative;height:16px"><i style="position:absolute;left:2%;top:0;width:2px;height:14px;background:var(--ac)"></i></div>' +
    FS.map(function (f, i) { return '<div class="fila" style="min-height:44px"><i style="width:14px;height:14px;border-radius:4px;background:var(--fg);opacity:' + [1, .7, .45, .25][i] + '"></i><div class="t"><b>' + f[0] + '</b><small>' + f[1] + '</small></div></div>'; }).join("") + '</div>' +
    '<p class="ps g1">Ahora: semana 1 de la descarga. Toca una fase para cambiarla.</p>');
};
P.n4b = function () {
  var W = [["12 oct", "Descarga", 5, 6], ["19 oct", "Recuperación", 4, 6], ["26 oct", "Recuperación", null, 7], ["2 nov", "Mantenimiento", null, 7], ["9 nov", "Mantenimiento", null, 7]];
  return tel(cabN("Semanas y fases"), '<div class="caja g1" style="padding:4px 14px">' + W.map(function (w, i) {
    return fila('<span class="h">' + w[0] + '</span>', w[1], w[2] == null ? "aún no ha empezado" : w[2] + " de " + w[3] + " días en rango", w[2] == null ? '<span class="ps">—</span>' : anilloMini(w[2] / w[3], i === 0)); }).join("") + '</div>');
};
function anilloMini(p, ac) { var r = 14, c = 2 * Math.PI * r; return '<svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="' + r + '" fill="none" stroke="var(--sf2)" stroke-width="5"/><circle cx="18" cy="18" r="' + r + '" fill="none" stroke="' + (ac ? "var(--ac)" : "var(--fg)") + '" stroke-width="5" stroke-dasharray="' + (c * p) + ' ' + c + '" transform="rotate(-90 18 18)"/></svg>'; }
P.n4c = function () {
  var meses = [["OCT", [3, 3, 0, 1]], ["NOV", [1, 2, 2, 2]], ["DIC", [3, 3, 3, 3]], ["ENE", [3, 3, 3, 3]], ["FEB", [3, 3, 3, 3]], ["MAR", [3, 3, 3, 3]]], nom = ["Desc.", "Recup.", "Mant.", "Def."];
  return tel(cabN("Calendario de fases"), '<div class="caja g1">' + meses.map(function (m) { return '<div style="display:grid;grid-template-columns:44px repeat(4,1fr);gap:4px;align-items:center;margin-top:6px"><span class="cap">' + m[0] + '</span>' +
    m[1].map(function (f, i) { return '<span style="height:36px;border-radius:8px;background:var(--fg);opacity:' + [1, .7, .45, .25][f] + ';' + (m[0] === "OCT" && i === 1 ? "outline:3px solid var(--ac);outline-offset:1px" : "") + '"></span>'; }).join("") + '</div>'; }).join("") +
    '<div class="ley" style="flex-wrap:wrap">' + nom.map(function (n, i) { return '<span><i style="background:var(--fg);opacity:' + [1, .7, .45, .25][i] + '"></i>' + n + '</span>'; }).join("") + '</div></div><p class="ps g1">Una celda por semana. El marco: esta semana.</p>');
};
P.n4d = function () {
  return tel(cabN("Fase actual"), '<div class="caja g1" style="padding:16px 14px"><p class="cap ac">AHORA · DESCARGA</p><div class="big" style="margin-top:4px">12–18 oct</div><p class="ps">Carga de hidratos el 16 y el 17</p>' +
    tiraRango("Carbohidratos · g/kg", 5.4, 5, 6, "g/kg") + tiraRango("Proteína · g/kg", 1.7, 1.6, 1.8, "g/kg") + tiraRango("Energía · % del mant.", 93, 90, 95, "%") + '</div>' +
    '<p class="cap g">LUEGO</p><div class="caja g0" style="padding:4px 14px">' + fila("", "Recuperación", "19 oct–2 nov · prot. 1,8–2,0 g/kg") + fila("", "Mantenimiento", "noviembre") + fila("", "Definición", "dic–mar · −300…−400 kcal") + '</div>');
};

/* ---------------- N5 · Entreno ---------------- */
var TIPOS = [["Descanso", 3.6, 3, 5], ["Gimnasio", 4.5, 4, 6], ["Calidad", 5.2, 5, 7], ["Tirada larga", 5.8, 6, 8]];
P.n5a = function () {
  var W = 340, H = 190, h = "";
  TIPOS.forEach(function (t, i) { var x = 20 + i * 80, y = function (v) { return H - 24 - v / 9 * (H - 40); };
    h += '<rect x="' + x + '" y="' + y(t[3]) + '" width="56" height="' + (y(t[2]) - y(t[3])) + '" fill="var(--wait)"/><rect x="' + (x + 14) + '" y="' + y(t[1]) + '" width="28" height="' + (H - 24 - y(t[1])) + '" rx="3" fill="' + (t[1] < t[2] ? "var(--ac)" : "var(--fg)") + '"/>' +
      '<text x="' + (x + 28) + '" y="' + (y(t[1]) - 5) + '" text-anchor="middle" font-size="11" font-weight="800" fill="var(--fg)" font-family="Manrope">' + enT(t[1]) + '</text><text x="' + (x + 28) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" font-weight="700" fill="var(--mu)" font-family="Manrope">' + t[0] + '</text>'; });
  return tel(cabN("Carbohidratos según el día"), '<p class="cap g1">MEDIA · G/KG · 4 SEMANAS</p><div class="caja g0"><svg viewBox="0 0 340 190" width="100%">' + h + '</svg><div class="ley"><span><i style="background:var(--wait)"></i>Objetivo</span><span><i style="background:var(--fg)"></i>Tu media</span></div></div>' +
    '<p class="ps g1">Las tiradas largas se quedan cortas: 5,8 de 6–8 g/kg.</p>');
};
P.n5b = function () {
  var pts = [[0, 3.2], [0, 3.9], [1, 4.4], [1, 4.8], [1, 4.2], [2, 5.5], [2, 4.9], [3, 5.6], [3, 6.1]], W = 340, H = 200, h = "";
  TIPOS.forEach(function (t, i) { var y0 = 20 + i * 44; h += '<text x="0" y="' + (y0 + 16) + '" font-size="11" font-weight="700" fill="var(--mu)" font-family="Manrope">' + t[0] + '</text><rect x="' + (90 + t[2] * 26) + '" y="' + (y0 + 4) + '" width="' + ((t[3] - t[2]) * 26) + '" height="18" rx="4" fill="var(--wait)"/>'; });
  pts.forEach(function (p) { h += '<circle cx="' + (90 + p[1] * 26) + '" cy="' + (33 + p[0] * 44) + '" r="5" fill="var(--fg)"/>'; });
  return tel(cabN("Carbohidratos según el día"), '<p class="cap g1">CADA DÍA · G/KG</p><div class="caja g0"><svg viewBox="0 0 340 200" width="100%">' + h + '</svg></div><p class="ps g1">Un punto por día; la banda, el objetivo de ese tipo de día.</p>');
};
P.n5c = function () {
  return tel(cabN("Carbohidratos según el día"), '<div class="caja g1" style="padding:4px 14px">' + TIPOS.map(function (t) { return fila("", t[0], "Objetivo " + t[2] + "–" + t[3] + " g/kg · 3 días", '<span class="n">' + enT(t[1]) + ' g/kg</span>'); }).join("") + '</div>' +
    '<p class="ps g1">Media de las 4 últimas semanas. El tipo de día sale del calendario de entrenos.</p>');
};
P.n5d = function () {
  var S = [["L", "Gimnasio", 4.6], ["M", "Calidad", 5.4], ["X", "Gimnasio", 4.1], ["J", "Descanso", 3.5], ["V", "Gimnasio", null], ["S", "Descanso", 3.9], ["D", "Tirada", 5.6]];
  return tel(cabN("Esta semana"), '<div class="caja g1" style="padding:4px 14px">' + S.map(function (d, i) {
    var t = TIPOS.filter(function (x) { return x[0].indexOf(d[1]) === 0; })[0] || TIPOS[0], ok = d[2] != null && d[2] >= t[2];
    return fila('<span class="h">' + d[0] + '</span>', d[1], "Objetivo " + t[2] + "–" + t[3] + " g/kg", '<span class="n">' + (d[2] == null ? "s/d" : enT(d[2]) + " g/kg") + '</span>' + (d[2] == null ? "" : ok ? ic("check", "s") : ic("warning-circle", "s"))); }).join("") + '</div>');
};

/* ---------------- N6 · Casa y compra ---------------- */
P.n6a = function () {
  var H = [["Vitamina C", "5 de 7 días por debajo", "1 kiwi al día · 3 en casa"], ["Folato", "4 de 7 días", "60 g de espinacas · en la lista"], ["Fibra", "3 de 7 días", "Lentejas en la cena del jueves · en casa"]];
  return tel(cabN("Huecos que se repiten"), '<p class="ps g1">Las 2 últimas semanas, con lo planificado y lo registrado.</p><div class="caja g1" style="padding:4px 14px">' +
    H.map(function (h) { return fila("", h[0] + " · " + h[1], "Se arregla con: " + h[2], '<span class="btn min">A la lista</span>'); }).join("") + '</div>');
};
P.n6b = function () {
  return tel(cabN("Lo planificado y la casa"), '<div class="caja g1" style="padding:16px 14px"><p class="cap">YA EN CASA</p><div style="display:flex;align-items:baseline;gap:8px"><span class="reloj">72 %</span><span class="ps">de lo que piden las comidas de la semana</span></div><div class="barra" style="height:10px;margin-top:10px"><i style="width:72%"></i></div></div>' +
    '<p class="cap g">FALTA PARA LLEGAR A LOS MÍNIMOS</p><div class="caja g0" style="padding:4px 14px">' + fila("", "Kiwis", "Vitamina C · mié y jue", '<span class="n">4</span>') + fila("", "Espinacas", "Folato · jue", '<span class="n">150 g</span>') + fila("", "Avena", "Fibra · desayunos", '<span class="n">500 g</span>') + '</div>');
};
P.n6c = function () {
  var F = [["Kiwi", [3, 0, 1]], ["Espinacas", [1, 3, 1]], ["Lentejas", [1, 2, 3]], ["Naranja", [3, 1, 1]]], col = ["Vit. C", "Folato", "Fibra"];
  return tel(cabN("Qué arregla cada hueco"), '<p class="ps g1">Alimentos en casa contra tus huecos. Más tinta, más aporta por ración.</p><table class="g1" style="width:100%;border-collapse:separate;border-spacing:4px"><tr><td></td>' + col.map(function (c) { return '<td class="cap" style="text-align:center">' + c + '</td>'; }).join("") + '</tr>' +
    F.map(function (f) { return '<tr><td style="font-size:13px;font-weight:700">' + f[0] + '</td>' + f[1].map(function (v) { return celda([0, 30, 60, 90][v]); }).join("") + '</tr>'; }).join("") + '</table>');
};
P.n6d = function () {
  return tel(cabN("El hueco de la semana"), '<div class="caja g1" style="padding:18px 14px"><p class="cap ac">SE REPITE</p><div class="big" style="margin-top:6px">Vitamina C: 5 de 7 días por debajo</div><p class="ps" style="margin-top:6px">Te quedas en 70 mg de media; el mínimo es 110.</p>' +
    curva([70, 85, 60, 95, 80, 72, 66], NT.dias, 0, 0, { band: [110, 130], h: 110, ultimo: 6 }) +
    '<div class="btn inv" style="margin-top:12px">Un kiwi al día · 3 en casa</div></div>');
};

/* ---------------- N7 · Micronutrientes ---------------- */
var MIC = [["Vit. C", [64, 77, 55, 86, 73, 65, 60, null]], ["Folato", [67, 73, 64, 79, 76, 70, 65, null]], ["Hierro", [110, 118, 105, 122, 115, 109, 112, null]], ["Magnesio", [88, 95, 84, 99, 92, 90, 86, null]],
           ["Potasio", [80, 86, 77, 90, 84, 81, 79, null]], ["B12", [140, 150, 132, 160, 148, 141, 138, null]], ["Vit. D", [30, 34, 28, 40, 36, 32, 30, null]], ["Calcio", [95, 102, 90, 108, 99, 97, 94, null]]];
P.n7a = function () {
  return tel(cabN("Micronutrientes · % del mínimo"), '<table class="g1" style="width:100%;border-collapse:separate;border-spacing:2px"><tr><td></td>' + NT.sem8.map(function (s) { return '<td class="cap" style="text-align:center;font-size:9px">' + s + '</td>'; }).join("") + '</tr>' +
    MIC.map(function (m) { return '<tr><td style="font-size:12px;font-weight:700">' + m[0] + '</td>' + m[1].map(function (v) { return celda(v == null ? null : Math.min(v, 199)); }).join("") + '</tr>'; }).join("") + '</table><p class="ps g1">Media de cada semana. «s/d»: semana sin datos.</p>');
};
P.n7b = function () {
  return tel(cabN("Micronutrientes · 4 semanas"), '<div class="caja g1">' + MIC.map(function (m, i) { var v = Math.round((m[1][3] + m[1][4] + m[1][5] + m[1][6]) / 4);
    return '<div style="display:grid;grid-template-columns:72px 1fr 48px;gap:10px;align-items:center;height:36px"><span style="font-size:13px;font-weight:700">' + m[0] + '</span><div class="barra" style="height:10px;position:relative"><i style="width:' + Math.min(100, v / 1.5) + '%' + (v < 100 && i === 6 ? ";background:var(--ac)" : "") + '"></i><b style="position:absolute;left:66.6%;top:-3px;bottom:-3px;width:2px;background:var(--mu)"></b></div><b style="font-size:13px;text-align:right">' + v + '%</b></div>'; }).join("") +
    '<p class="ps">La raya: el mínimo (100 %).</p></div><p class="ps g1">La vitamina D casi no sale de la comida: cuenta el suplemento si lo apuntas.</p>');
};
P.n7c = function () {
  return tel(cabN("Micronutrientes · esta semana"), '<div class="g1" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">' + MIC.map(function (m, i) { var v = m[1][6];
    return '<div class="caja" style="padding:8px 4px;text-align:center">' + anilloMini(Math.min(1, v / 100), i === 6) + '<b style="display:block;font-size:12px;margin-top:4px">' + m[0] + '</b><small class="ps">' + v + '%</small></div>'; }).join("") + '</div>');
};
P.n7d = function () {
  return tel(cabN("Micronutrientes"), '<div class="caja g1" style="padding:4px 14px">' + MIC.map(function (m) { var v = m[1][6], a = m[1][5], d = v - a;
    return '<div class="fila" style="min-height:44px"><div class="t"><b style="font-size:14px">' + m[0] + '</b></div><span class="n" style="font-size:14px">' + v + ' %</span><span class="ps" style="width:56px;text-align:right;font-weight:800">' + (d >= 0 ? "▲ " : "▼ ") + Math.abs(d) + '</span></div>'; }).join("") +
    '</div><p class="ps g1">% del mínimo EFSA esta semana y cambio frente a la anterior.</p>');
};
