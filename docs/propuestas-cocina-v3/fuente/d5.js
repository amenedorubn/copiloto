// D5 · nutrición del día (objetivos EFSA) y ficha de alimento. Cifras de ejemplo.
var NUT = [
  { k: "Carbohidratos", v: 203, u: "g", obj: "45–60 % de la energía", pct: 58, txt: "58 % de la energía", ok: true, por: [70, 96, 37] },
  { k: "Fibra", v: 21, u: "g", obj: 25, pct: 84, por: [8, 8, 5] },
  { k: "Vitamina C", v: 45, u: "mg", obj: 110, pct: 41, por: [10, 23, 12] },
  { k: "Folato", v: 158, u: "µg", obj: 330, pct: 48, por: [62, 56, 40] }
];
var cabN = function () { return cab("Cocina", "Plan, compra y casa") + seg(["Semana", "Comprar|9", "Casa"], 0) + '<p class="cap g1">HOY · LUN 5 · LO COMIDO Y LO QUE TOCA</p>'; };
function valTxt(n) { return n.k === "Carbohidratos" ? n.v + " g · " + n.txt : n.v + " / " + n.obj + " " + n.u; }

// A · Barras: cada barra partida por comida (desayuno, comida, cena)
P.d5a = function () {
  return tel(cabN(), '<div class="caja g0" style="padding:14px">' + NUT.map(function (n, i) {
    var tot = n.k === "Carbohidratos" ? n.v / 0.58 * 0.6 : n.obj, x = 0;
    return '<div style="margin-top:' + (i ? 18 : 0) + 'px"><div style="display:flex;justify-content:space-between"><b style="font-size:15px">' + n.k + '</b><span class="ps" style="color:var(--fg)">' + valTxt(n) + "</span></div>" +
      '<div class="barra" style="height:12px;margin-top:8px;display:flex;gap:2px;background:var(--sf2)">' + n.por.map(function (p, k) {
        return '<i style="width:' + (p / tot * 100) + "%;opacity:" + [1, .7, .45][k] + ';border-radius:2px"></i>';
      }).join("") + "</div></div>";
  }).join("") + '<div class="ley" style="margin-top:14px"><span><i style="background:var(--fg)"></i>Desayuno</span><span><i style="background:var(--fg);opacity:.7"></i>Comida</span><span><i style="background:var(--fg);opacity:.45"></i>Cena</span></div></div>' +
  '<p class="ps g1">Objetivos EFSA para adultos. Toca una barra para ver de dónde sale.</p>');
};
// B · Cuatro anillos
P.d5b = function () {
  var anillo = function (n) {
    var r = 34, c = 2 * Math.PI * r, p = Math.min(1, n.pct / 100);
    return '<div style="background:var(--sf);border-radius:18px;padding:14px;text-align:center"><svg width="88" height="88" viewBox="0 0 88 88"><circle cx="44" cy="44" r="' + r + '" fill="none" stroke="var(--sf2)" stroke-width="10"/>' +
      '<circle cx="44" cy="44" r="' + r + '" fill="none" stroke="var(--fg)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (c * p) + " " + c + '" transform="rotate(-90 44 44)"/>' +
      '<text x="44" y="50" text-anchor="middle" font-family="Manrope" font-weight="800" font-size="17" fill="var(--fg)">' + n.pct + '%</text></svg><b style="display:block;font-size:14px;margin-top:6px">' + n.k + '</b><small class="ps">' + valTxt(n) + "</small></div>";
  };
  return tel(cabN(), '<div class="g0" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + NUT.map(anillo).join("") + "</div>");
};
// C · Tabla densa tipo Cronometer
P.d5c = function () {
  var R = [["Energía", "1400 kcal", "—", null], ["Carbohidratos", "203 g", "45–60 % E", 58], ["Fibra", "21 g", "25 g", 84], ["Proteína", "62 g", "0,83 g/kg", null], ["Grasa", "41 g", "20–35 % E", null],
    ["Vitamina C", "45 mg", "110 mg", 41], ["Folato", "158 µg", "330 µg", 48], ["Hierro", "9 mg", "11 mg", 82], ["Potasio", "2,1 g", "3,5 g", 60], ["Calcio", "640 mg", "950 mg", 67]];
  return tel(cabN(), '<div class="caja g0" style="padding:4px 14px">' + R.map(function (r) {
    return '<div class="fila" style="min-height:44px"><div class="t"><b style="font-size:14px">' + r[0] + '</b></div><span class="n" style="font-size:14px;width:72px;text-align:right">' + r[1] + '</span><span class="ps" style="width:76px;text-align:right">' + r[2] +
      '</span><span style="width:40px;text-align:right;font-size:13px;font-weight:800">' + (r[3] ? r[3] + "%" : "") + "</span></div>";
  }).join("") + "</div>");
};
// D · Lo que falta, y con qué cubrirlo (recomendada)
P.d5d = function () {
  return tel(cabN(), '<div class="caja g0" style="padding:16px 14px"><p class="cap">TE FALTA</p>' +
    '<div class="big" style="font-size:24px;margin-top:6px">65 mg de vitamina C y 172 µg de folato</div>' +
    '<p class="ps" style="margin-top:6px">Fibra casi: 21 de 25 g. Carbohidratos bien: 58 % de la energía.</p>' +
    '<div class="g1">' + NUT.map(function (n) { return '<div style="display:flex;align-items:center;gap:10px;height:28px"><span style="width:110px;font-size:13px;font-weight:700">' + n.k + '</span><div class="barra" style="flex:1"><i style="width:' + Math.min(100, n.pct) + '%"></i></div><span style="width:40px;text-align:right;font-size:13px;font-weight:800">' + n.pct + "%</span></div>"; }).join("") + "</div></div>" +
    '<p class="cap g">CON LO QUE HAY O VAS A COMPRAR</p><div class="caja g0" style="padding:2px 14px">' +
    fila(ic("orange-slice"), "1 kiwi en el desayuno de mañana", "≈ 70 mg de vitamina C · está en Comprar") +
    fila(ic("leaf"), "100 g de espinacas en la cena", "≈ 190 µg de folato · no están: ¿a la lista?", '<span class="btn min">' + ic("plus", "s") + "</span>") + "</div>" +
    '<p class="ps g1">Objetivos EFSA para adultos · fuentes: USDA y Open Food Facts</p>');
};

// ---- ficha de alimento ----
function fichaCab(nombre) {
  return cab("Alimento", "Casa · Despensa salada", ic("pencil-simple")) +
    '<div class="big g0">' + nombre + '</div><p class="ps" style="display:flex;gap:6px;align-items:center;margin-top:4px">' + ic("lock-simple", "s") + "Tu nombre: ni el escáner ni Claude lo cambian</p>";
}
function fuente(f) { return '<span style="font-size:11px;font-weight:800;letter-spacing:.06em;color:var(--mu);border:1px solid var(--ln);border-radius:6px;padding:1px 6px">' + f + "</span>"; }
P["d5-ficha"] = function () {
  var r = function (k, v, f) { return '<div class="fila" style="min-height:40px"><div class="t"><b style="font-size:14px">' + k + '</b></div><span class="n" style="font-size:14px">' + v + "</span>" + fuente(f) + "</div>"; };
  return tel(fichaCab("Atún en lata"),
    '<p class="cap g1">TAMBIÉN SE LLAMA</p><div class="g0" style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip">Atún claro al natural</span><span class="chip">Atún</span><span class="chip">' + ic("plus", "s") + "</span></div>" +
    '<p class="cap g1">CÓDIGOS</p><p class="p g0">' + ic("barcode", "s") + ' 8410000000017 · pack 3 × 56 g</p>' +
    '<p class="cap g1" style="display:flex;justify-content:space-between"><span>POR 100 G ESCURRIDO</span><span>FUENTE</span></p><div class="caja g0" style="padding:2px 14px">' +
    r("Energía", "116 kcal", "OFF") + r("Carbohidratos", "0 g", "OFF") + r("Fibra", "0 g", "OFF") + r("Proteína", "26 g", "OFF") + r("Vitamina C", "0 mg", "USDA") + r("Folato", "4 µg", "USDA") + "</div>" +
    '<p class="ps g1">Toca un valor para cambiarlo: lo tuyo manda sobre cualquier fuente.</p>');
};
P["d5-ficha-vacia"] = function () {
  var op = function (i, t, s) { return fila('<span style="width:44px;height:44px;border-radius:14px;background:var(--sf2);display:flex;align-items:center;justify-content:center">' + ic(i) + "</span>", t, s, '<span class="mu">' + ic("caret-right", "s") + "</span>"); };
  return tel(fichaCab("Espinacas frescas"),
    '<div class="caja g1"><p class="p">Sin datos de nutrición</p><p class="ps">Es un alimento sin código. Elige de dónde sacarlos: es una vez.</p></div>' +
    '<div class="caja g1" style="padding:2px 14px">' + op("leaf", "Genérico de la tabla", "«Espinacas, crudas» · USDA, sin conexión") + op("camera", "Foto de la etiqueta", "Lee la tabla nutricional del paquete") + op("keyboard", "Escribir 4 números", "Carbohidratos, fibra, vit. C y folato por 100 g") + "</div>" +
    '<p class="cap g">LO QUE SALE DE «ESPINACAS, CRUDAS»</p><p class="ps g0">Carbohidratos 3,6 g · Fibra 2,2 g · Vit. C 28 mg · Folato 194 µg por 100 g</p>',
    pie('<span class="btn inv">' + ic("check") + "Usar estos</span>"));
};
P["d5-comida"] = function () {
  return tel(cab("Pasta con tomate y atún", "Hecha · lunes 5, 14:00"),
    '<p class="cap g1">ESTA COMIDA APORTA</p><div class="caja g0" style="padding:4px 14px">' +
    [["Carbohidratos", "96 g", "47 % del día"], ["Fibra", "8 g", "32 % de 25 g"], ["Vitamina C", "23 mg", "21 % de 110 mg"], ["Folato", "56 µg", "17 % de 330 µg"]].map(function (r) { return fila("", r[0], r[2], '<span class="n">' + r[1] + "</span>"); }).join("") + "</div>" +
    '<p class="cap g">DE DÓNDE SALE</p><div class="caja g0" style="padding:4px 14px">' + fila("", "100 g de macarrones", "75 g de carbohidratos · 3 g de fibra", fuente("OFF")) + fila("", "200 g de tomate triturado", "15 g carb. · 4 g fibra · 18 mg vit. C", fuente("USDA")) + fila("", "½ cebolla", "5 g carb. · 4 mg vit. C · 10 µg folato", fuente("USDA")) + "</div>");
};
P["d5d-error"] = function () {
  return tel(cabN(), '<div class="caja g0 aviso" role="alert">' + ic("info") + '<div><p class="p">Faltan datos de 2 alimentos</p>' +
    '<p class="ps">«Crema de verduras» y «Pan de centeno» no tienen nutrición. El día sale sin ellos: los totales son más bajos de lo real.</p>' +
    '<div class="btn min inv" style="margin-top:10px;display:inline-flex">Completar · 1 min</div></div></div>' +
    '<p class="cap g">SIN CONTAR ESOS 2</p><div class="caja g0" style="padding:14px">' + NUT.map(function (n) { return '<div style="display:flex;align-items:center;gap:10px;height:28px"><span style="width:110px;font-size:13px;font-weight:700">' + n.k + '</span><div class="barra" style="flex:1"><i style="width:' + Math.min(100, n.pct - 9) + '%"></i></div><span class="ps" style="width:40px;text-align:right">≥' + (n.pct - 9) + "%</span></div>"; }).join("") + "</div>");
};
