// Ayudas y datos de ejemplo comunes a todas las maquetas (inventados: no son datos reales).
var P = {};
function ic(n, c) { return '<svg class="i ' + (c || "") + '" viewBox="0 0 256 256" aria-hidden="true">' + (I[n] || "") + "</svg>"; }
function cab(tit, sub, der) {
  return '<div class="cab"><span class="ib">' + ic("caret-left") + '</span><div><small>' + (sub || "") + "</small><b>" + tit + "</b></div>" +
    (der ? '<span class="ib der">' + der + "</span>" : "") + "</div>";
}
function seg(items, on) {
  return '<div class="seg">' + items.map(function (x, i) {
    var p = x.split("|");
    return '<span class="' + (i === on ? "on" : "") + '">' + p[0] + (p[1] ? "<em>" + p[1] + "</em>" : "") + "</span>";
  }).join("") + "</div>";
}
function fila(izq, tit, sub, der, extra) {
  return '<div class="fila"' + (extra || "") + ">" + (izq || "") + '<div class="t"><b>' + tit + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</div>" + (der || "") + "</div>";
}
function pie(html) { return '<div class="pie">' + html + "</div>"; }
function tel(c, cuerpo, piehtml) { return c + '<div class="cuerpo">' + cuerpo + "</div>" + (piehtml || ""); }

// ---- el caso de prueba: pasta con tomate y atún, plan calculado por planifica.mjs ----
// s = segundos desde que empiezas (13:40:00). m = segundos de manos al empezar.
var PASTA = {
  total: 1185,
  carriles: [
    { k: "agua", et: "Agua", ic: "drop", t: [
      { a: 0, b: 510, m: 30, txt: "Olla con agua y sal al fuego" },
      { a: 510, b: 1050, m: 15, txt: "Pasta al agua · 9 min" },
      { a: 1065, b: 1125, m: 60, txt: "Escurre" }] },
    { k: "salsa", et: "Salsa", ic: "flame", t: [
      { a: 30, b: 210, m: 180, txt: "Pica cebolla y ajo" },
      { a: 210, b: 570, m: 15, txt: "Sofríe" },
      { a: 570, b: 1050, m: 15, txt: "Tomate" },
      { a: 1050, b: 1110, m: 15, txt: "Atún" }] }
  ],
  union: 1125
};
function hm(base, s) { // reloj: "13:48"
  var t = base + Math.round(s / 60); var h = Math.floor(t / 60), m = t % 60;
  return h + ":" + (m < 10 ? "0" : "") + m;
}
var INI = 13 * 60 + 40;
function mmss(s) { s = Math.round(s); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

// mini-Gantt: barras de manos (llenas) y de espera (suaves), la línea de ahora y la unión
function gantt(R, ahora, opt) {
  opt = opt || {};
  var T = R.total, h = "";
  R.carriles.forEach(function (c) {
    h += '<div class="r"><span class="et">' + ic(c.ic, "s") + (opt.sinEt ? "" : c.et) + '</span><div class="pista">';
    c.t.forEach(function (t) {
      var x = t.a / T * 100, w = (t.b - t.a) / T * 100, wm = Math.min(t.m, t.b - t.a) / T * 100;
      h += '<i class="bl" style="left:' + x + "%;width:calc(" + w + '% - 2px)"></i>';
      h += '<i class="bl m" style="left:' + x + "%;width:max(3px,calc(" + wm + '% - 2px))"></i>';
    });
    if (R.union != null) h += '<i class="un" style="left:' + (R.union / T * 100) + '%"></i>';
    if (ahora != null) h += '<i class="ya" style="left:' + (ahora / T * 100) + '%"></i>';
    h += "</div></div>";
  });
  return '<div class="gt">' + h + "</div>" + (opt.ley === false ? "" :
    '<div class="ley"><span><i style="background:var(--fg)"></i>Tus manos</span><span><i style="background:var(--wait)"></i>Espera</span><span>' +
    '<i style="border-left:2px dotted var(--mu);width:2px;border-radius:0"></i>Unión</span></div>');
}

// ---- la semana de ejemplo ----
var SEMANA = [
  { dia: "HOY · LUN 5", items: [
    { h: "08:00", q: "Desayuno", t: "Avena con plátano", e: "hecha" },
    { h: "14:00", q: "Comida", t: "Pasta con tomate y atún", e: "lista", min: 20 },
    { h: "21:00", q: "Cena", t: "Crema de verduras con tostada", e: "falta", falta: "crema de verduras" }] },
  { dia: "MAÑANA · MAR 6", items: [
    { h: "14:00", q: "Comida", t: "Tupper · Albóndigas con rigatoni", e: "tupper" },
    { h: "21:00", q: "Cena", t: "Tortilla francesa con ensalada", e: "falta", falta: "lechuga" }] },
  { dia: "MIÉ 7", items: [
    { h: "14:00", q: "Comida", t: "Pollo al curry con arroz · ración doble", e: "falta", falta: "contramuslos, pimiento" }] }
];
function estadoTxt(x) {
  if (x.e === "hecha") return "Hecha";
  if (x.e === "lista") return "Todo en casa · " + x.min + " min";
  if (x.e === "tupper") return "Del congelador: sácalo esta noche";
  return "Falta " + x.falta;
}
function estadoIc(x) {
  if (x.e === "hecha") return ic("check-circle", "mu");
  if (x.e === "lista") return ic("cooking-pot");
  if (x.e === "tupper") return ic("snowflake", "mu");
  return ic("shopping-cart", "mu");
}

// ---- la compra de ejemplo (por pasillo) ----
var COMPRA = [
  { z: "Fruta y verdura", items: [["Cebolla", "2", "Pasta · Curry"], ["Pimiento rojo", "1", "Curry · mié"], ["Lechuga", "1", "Tortilla · mar"], ["Kiwis", "3", "Desayunos"]] },
  { z: "Carne y pescado", items: [["Contramuslos de pollo", "400 g", "Curry · mié"]] },
  { z: "Lácteos y huevos", items: [["Huevos", "¿te quedan?", "Tortilla · mar", "duda"], ["Yogur griego", "2", "Desayunos"]] },
  { z: "Despensa", items: [["Crema de verduras", "1 brick", "Cena · hoy"], ["Atún en lata", "2 latas", "Ensaladas"]] }
];
var ZONAS = [
  { z: "Congelador", n: "2 de 3 tuppers", ic: "snowflake", items: [["Tupper · Albóndigas con rigatoni", "2"], ["Arroz de microondas", "3 bolsas"], ["Cebolla troceada", "½ bolsa"]] },
  { z: "Nevera", ic: "drop", items: [["Leche semi", "1 l · abierta"], ["Yogur natural", "2"], ["Huevos", "?"], ["Tomates", "2"]] },
  { z: "Despensa salada", ic: "jar", items: [["Macarrones", "600 g"], ["Atún en lata", "1 lata"], ["Tomate triturado", "400 g"], ["AOVE", "½ botella"]] }
];
