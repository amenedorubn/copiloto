/* ===========================================================================
   COCINA DE PRUEBA · el paso a paso con carriles desde Ajustes (v2.38)
   ---------------------------------------------------------------------------
   Como la Simulacion del GPS: eliges una receta de ejemplo y se abre el paso a
   paso DE VERDAD (receta.js lee el texto, carriles.js planifica y
   cocina-modo.js lo pinta), con el reloj simulado (x1, x10, x30, "Retrasarme
   2 min") y "SIMULACION · no cuenta". No deja rastro: no lee ni escribe el
   calendario, Comprar, la Despensa, lo gastado, Mi cocina ni el estado del
   paso a paso; al terminar todo queda como estaba.
   Las recetas son de ejemplo y genericas (el repo es publico).
   =========================================================================== */
(function (raiz, fabrica) {
  var X = fabrica();
  if (typeof module === "object" && module.exports) module.exports = X;
  else raiz.CocinaPrueba = X;
})(typeof window !== "undefined" ? window : this, function () {
"use strict";

var RECETAS = [
  { id: "pasta", titulo: "Pasta con tomate y atún", sub: "La del formato: agua y salsa, y se juntan",
    texto: [
      "1 RACIÓN · 20 min", "",
      "INGREDIENTES", "· 100 g de pasta", "· 1 lata de atún", "· 200 g de tomate triturado", "· ½ cebolla", "· 1 diente de ajo", "· Básicos: sal, AOVE", "",
      "CARRIL AGUA (olla)", "1. Olla con agua y sal al fuego, 8 min hasta que hierva", "2. La pasta, 9 min (no espera)", "3. Escúrrela", "",
      "CARRIL SALSA (sartén)", "1. Pica la cebolla y el ajo, 3 min (manos)", "2. Sofríelos con AOVE, 6 min", "3. El tomate, 8 min", "4. El atún, 1 min", "",
      "AL JUNTAR", "1. Mezcla la pasta con la salsa y sirve"] },
  { id: "albondigas", titulo: "Albóndigas con rigatoni", sub: "Air fryer, dos fuegos y micro a la vez",
    texto: [
      "3 RACIONES · 45 min", "",
      "INGREDIENTES", "· 500 g de carne picada mixta", "· 1 huevo", "· 30 g de pan rallado", "· 600 g de tomate triturado", "· 180 g de rigatoni",
      "· 1 bolsa de arroz de microondas", "· Básicos: sal, AOVE, orégano", "",
      "CARRIL BOLAS (air fryer)", "1. Mezcla la carne con el huevo y el pan rallado y haz 21 bolas, 8 min (manos)",
      "2. Tanda 1: 11 bolas al air fryer a 200 °C, 10 min, agita a los 5", "3. Tanda 2: 10 bolas al air fryer, 10 min, agita a los 5", "",
      "CARRIL SALSA (sartén)", "1. Sartén a fuego medio con AOVE, 3 min", "2. El tomate con orégano y sal, 15 min a fuego bajo", "3. Las albóndigas a la salsa, 12 min (tras BOLAS)", "",
      "CARRIL PASTA (olla)", "1. Olla con agua y sal al fuego, tapada, 10 min hasta que hierva", "2. Los rigatoni, 12 min (no espera)", "3. Escúrrelos", "",
      "CARRIL ARROZ", "1. El arroz al micro, 3 min (no espera)", "",
      "AL JUNTAR", "1. Reparte en tu plato y los 2 tuppers, 3 min"] },
  { id: "errores", titulo: "Pollo con verduras (con errores)", sub: "Escrita mal a propósito, para ver los avisos",
    texto: [
      "1 RACIÓN · 25 min", "",
      "INGREDIENTES", "· 200 g de pechuga de pollo", "· 1 calabacín", "· 100 ml de nata para cocinar", "· 1 bolsa de arroz de microondas", "· Básicos: sal, AOVE", "",
      "CARRIL POLLO (sartén)", "1. Dora el pollo a fuego medio hasta que esté hecho", "2. El calabacín, 5 min (tras VERDURAS)", "",
      "CARRIL SALSA", "1. Calienta la nata a fuego bajo, 3 min", "",
      "CARRIL ARROZ", "1. El arroz al micro, 3 min (no espera)", "",
      "AL JUNTAR", "1. Sirve el pollo con la salsa y el arroz"] }
];
var VELOCIDADES = [1, 10, 30];

// el evento de mentira: como uno de "Comidas", pero sin uid de verdad
function evento(id) {
  var r = RECETAS.filter(function (x) { return x.id === id; })[0] || RECETAS[0];
  return { uid: "prueba-" + r.id, fuente: "comida", fecha: "", hora: "", titulo: r.titulo, texto: r.texto.join("\n") };
}

/* ------------------------------ la casa de prueba (v2.41) ------------------------------
   Una despensa, un plan y lo apuntado de ejemplo, con fechas alrededor de hoy, para ver
   "Por confirmar", las cantidades y los tuppers sin tocar los tuyos. hoy = "AAAA-MM-DD".   */
function dias(hoy, n) {
  var p = hoy.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2] + n, 12);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function casa(hoy, ahoraMs) {
  var ayer = dias(hoy, -1), antes = dias(hoy, -2), man = dias(hoy, 1), f = antes.split("-");
  var nota = "DESPENSA EN VIVO — última actualización: " + f[2] + "/" + f[1] + "/" + f[0] + "\n" +
    "\\## CONGELADOR\n- Tupper: albóndigas con rigatoni\n- Tupper: lentejas con verduras\n- Tupper: crema de calabaza\nBolsas: cebolla troceada, guisantes, 3 bolsas de arroz de microondas\n" +
    "\\## NEVERA\nLeche semi (1 l), 2 yogures naturales, 6 huevos (sin confirmar), 2 lonchas de pavo\n" +
    "\\## FRESCO\n4 plátanos, 2 tomates, 1 cebolla\n" +
    "\\## DESPENSA SECA\n1 kg de macarrones, 240 g de atún en lata, 400 g de tomate triturado, pan de molde, avena\n" +
    "\\## ESPECIAS\nOrégano, pimentón dulce, comino";
  var dia = [
    { uid: "prueba-c1", fuente: "comida", fecha: hoy, hora: "08:00", fin: "08:30", titulo: "Desayuno · Avena con plátano",
      texto: "INGREDIENTES\n· 50 g de avena\n· 1 plátano\n· 200 ml de leche semi\nPROCESO\n1. Mezcla y calienta 2 min al micro." },
    { uid: "prueba-c2", fuente: "comida", fecha: ayer, hora: "21:00", fin: "21:30", titulo: "Cena · Tortilla francesa",
      texto: "INGREDIENTES\n· 2 huevos\n· 1 tomate\n· Básicos: sal, AOVE\nPROCESO\n1. Bate los huevos y cuaja la tortilla, 4 min." },
    { uid: "prueba-c3", fuente: "comida", fecha: hoy, hora: "21:00", fin: "21:40", titulo: "Cena · Pasta con tomate y atún", texto: RECETAS[0].texto.join("\n") },
    { uid: "prueba-c4", fuente: "comida", fecha: man, hora: "14:00", fin: "14:40", titulo: "Pollo al curry con arroz",
      texto: "2 RACIONES · 30 min\nINGREDIENTES\n· 400 g de contramuslos de pollo\n· 1 pimiento rojo\n· 1 bolsa de arroz de microondas\n· Básicos: sal, AOVE, curry\nPROCESO\n1. El pollo a la sartén 8 min.\n2. El pimiento, 5 min.\n3. El arroz, 3 min al micro." }
  ];
  var t = ahoraMs - 90 * 60e3;
  var cambios = [{ id: "prueba-k1", t: t, tipo: "compra", items: ["Contramuslos de pollo"], lista: "f:contramuslo pollo", zona: "Nevera" }];
  var alimentos = [{ id: "prueba-a1", t: t, nombre: "Atún en lata", alias: ["Atún claro al natural"], zona: "Despensa salada",
    codigos: [{ ean: "0000000000017", marca: "Marca de ejemplo", formato: "240 g (3 x 80 g)" }], eq: { n: 80, ud: "g" },
    nutri: { kcal: 116, prot: 26, hc: 0, grasa: 1, por: "100 g", fuente: "OFF" } }];
  return { dia: dia, nota: nota, cambios: cambios, lista: [], alimentos: alimentos };
}

var API = { RECETAS: RECETAS, VELOCIDADES: VELOCIDADES, evento: evento, casa: casa, pinta: function () {} };

if (typeof document !== "undefined") (function () {
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var ELEGIDA = "pasta", VEL = 10;
  // c: el cuerpo de la pantalla propia; op = {marca, atrasManual, alTerminar}
  API.pinta = function (c, op) {
    op = op || {};
    if (!window.Receta || !window.Carriles || !window.CocinaModo) { c.innerHTML = '<div class="ayuda">Falta un archivo de la app. Actualízala.</div>'; return; }
    c.innerHTML = '<div class="ayuda">Abre el paso a paso con carriles de verdad con una receta de ejemplo. El reloj va más rápido si quieres. ' +
      'No toca el calendario, ni Comprar, ni la Despensa, ni lo gastado: al terminar, todo queda como estaba.</div>' +
      '<label>Receta</label><div id="cprRec"></div>' +
      '<label>Velocidad del reloj</label><div class="simMoms" id="cprVel"></div>' +
      '<div class="ayuda">Dentro también puedes cambiarla, retrasarte 2 min y abrir Mi cocina.</div>' +
      '<button class="bPri" id="cprGo">Empezar la prueba</button>';
    var rec = c.querySelector("#cprRec"), vel = c.querySelector("#cprVel");
    function marca() {
      Array.prototype.forEach.call(rec.querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-r") === ELEGIDA)); });
      Array.prototype.forEach.call(vel.querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-v") === VEL)); });
    }
    RECETAS.forEach(function (r) {
      var b = document.createElement("button");
      b.className = "opc pFila cprOpc"; b.setAttribute("data-r", r.id);
      b.innerHTML = '<span>' + esc(r.titulo) + '<small>' + esc(r.sub) + '</small></span><i class="cprMarca" aria-hidden="true"></i>';
      b.addEventListener("click", function () { ELEGIDA = r.id; marca(); });
      rec.appendChild(b);
    });
    VELOCIDADES.forEach(function (v) {
      var b = document.createElement("button");
      b.className = "chip"; b.setAttribute("data-v", v); b.textContent = "×" + v;
      b.addEventListener("click", function () { VEL = v; marca(); });
      vel.appendChild(b);
    });
    marca();
    c.querySelector("#cprGo").addEventListener("click", function () {
      var R = window.Receta.leer(evento(ELEGIDA));
      window.CocinaModo.abre({ comida: R }, { prueba: { vel: VEL }, marca: op.marca, atrasManual: op.atrasManual, alCerrar: op.alTerminar });
    });
  };
})();

return API;
});
