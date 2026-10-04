/* ===========================================================================
   COCINA · lo que toca comer, cómo se hace, lo que hay en casa y la compra
   ---------------------------------------------------------------------------
   Las pantallas de la pestaña Cocina y lo que las une. El trabajo de verdad va
   en tres archivos, cada uno con sus tests:
   - receta.js: entender el texto de cada evento del calendario "Comidas"
     (ingredientes, pasos, tiempos, "antes de empezar"...).
   - despensa.js: lo que hay en casa (Tengo) y lo que comprar (Comprar), con
     la nota de Obsidian como punto de partida y las comidas que ya pasaron.
   - cocina-modo.js: el modo paso a paso a pantalla completa.
   Las recetas de Copiloto Cocina (Projects/cocina, repo público) llegan de
   GitHub, con copia en el móvil para sin red.

   Nada se inventa: sin nota no hay despensa, sin evento no hay comida.
   La parte de arriba no toca el DOM: node la carga para los tests.
   =========================================================================== */
(function (raiz, fabrica) {
  var C = fabrica(raiz);
  if (typeof module === "object" && module.exports) module.exports = C;
  else raiz.Cocina = C;
})(typeof window !== "undefined" ? window : this, function (raiz) {
"use strict";

var EN_NODE = typeof module === "object" && module.exports && typeof require === "function";
var MOD = {};
function usa(nombre, archivo) {                // receta.js, despensa.js, cocina-modo.js
  if (!MOD[nombre]) MOD[nombre] = EN_NODE ? require(archivo) : raiz[nombre];
  return MOD[nombre];
}
function Rc() { return usa("Receta", "./receta.js"); }
function Dp() { return usa("Despensa", "./despensa.js"); }
function Modo() { return EN_NODE ? null : raiz.CocinaModo; }
function Al() { return usa("Alimentos", "./alimentos.js"); }
function Nu() { return usa("Nutricion", "./nutricion.js"); }

var RECETAS_URL = "https://raw.githubusercontent.com/amenedorubn/cocina/main/recetas/";
var K_RECETAS = "copiloto.cocina.recetas.v1", K_CAMBIOS = "copiloto.cocina.cambios.v1",
    K_NOTA = "copiloto.cocina.nota.v1", K_LISTA = "copiloto.cocina.lista.v1", K_ALIM = "copiloto.cocina.alimentos.v1",
    K_SUPER = "copiloto.cocina.super.v1",
    // v2.45 · nutricion: tus datos y tu registro, solo en este movil (nunca en el repo ni en el Worker)
    K_FOTOS = "copiloto.cocina.fotos.v1",   // v2.47: la foto de la etiqueta de cada alimento (solo en este movil)
    K_SUPL = "copiloto.nutri.suplementos.v1",   // v2.48: tus suplementos (solo en este movil)
    K_PERFIL = "copiloto.nutri.perfil.v1", K_SEMANAS = "copiloto.nutri.semanas.v1", K_REG = "copiloto.nutri.registro.v1";

function dos(n) { return n < 10 ? "0" + n : "" + n; }
function mayus1(t) { t = String(t || ""); return t.charAt(0).toUpperCase() + t.slice(1); }
function isoDe(ms) { var d = new Date(ms); return d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate()); }
function hmDe(ms) { var d = new Date(ms); return dos(d.getHours()) + ":" + dos(d.getMinutes()); }
function sumaMin(h, m) {
  if (!h) return "23:59";
  var p = h.split(":"), t = Math.min(23 * 60 + 59, +p[0] * 60 + +p[1] + m);
  return dos(Math.floor(t / 60)) + ":" + dos(t % 60);
}

/* ------------------------------ las comidas ------------------------------ */
function comida(ev) { return Rc().leer(ev); }
function comidasDe(dia) {
  return (dia || []).filter(function (e) { return e && e.fuente === "comida"; }).map(comida);
}
// el evento es una receta de Copiloto Cocina: por su id ("Receta: curry-pollo") o por el titulo
var VACIAS_T = { con: 1, de: 1, del: 1, la: 1, el: 1, los: 1, las: 1, y: 1, en: 1, al: 1, sin: 1, para: 1, una: 1, un: 1 };
function palabrasT(s) {
  return Rc().norm(s).replace(/[^a-z0-9ñ ]+/g, " ").split(" ").filter(function (w) { return w.length > 2 && !VACIAS_T[w]; })
    .map(function (w) { return w.length > 4 ? w.replace(/(es|s)$/, "") : w; });
}
function parecidoT(a, b) {                   // todas las palabras del titulo corto en el largo, o 2 de cada 3
  var A = palabrasT(a), B = palabrasT(b); if (!A.length || !B.length) return 0;
  var comunes = A.filter(function (w) { return B.indexOf(w) >= 0; }).length;
  if (!comunes) return 0;
  var s = comunes / Math.max(A.length, B.length);
  return comunes === Math.min(A.length, B.length) || s >= 0.66 ? s : 0;
}
function recetaDe(c, indice) {
  if (!indice || !indice.length || !c) return null;
  if (c.receta) { var x = indice.filter(function (r) { return r.id === c.receta; })[0]; if (x) return x; }
  var mejor = null, pm = 0;
  indice.forEach(function (r) { var p = parecidoT(c.titulo, r.titulo); if (p > pm) { pm = p; mejor = r; } });
  return mejor;
}
function recalienta(R) { return !R.receta && /tupper|sobras|recalent/i.test((R.etiqueta || "") + " " + R.titulo); }
function pasosDe(R) { return (R.pasos || []).filter(function (p) { return !p.auto; }); }

/* ------------------------------ lo que va en grande en HOY ------------------------------
   El entreno a su hora y, despues, cada comida a la suya. items: [{tipo:"ent"|"comida", hora,
   fin, hecho, ref}]. Gana lo primero (por hora) que no ha pasado: un entreno pasa al estar hecho
   o 30 min despues de su fin (2 h despues de su hora si no tiene fin); una comida, a su fin (1 h
   despues de su hora si no tiene). Sin hora no compite. Si ya paso todo, null.               */
function queGrande(items, ahora) {
  var L = (items || []).filter(function (x) { return x && x.hora; }).slice();
  L.sort(function (a, b) { return a.hora < b.hora ? -1 : a.hora > b.hora ? 1 : (a.tipo === "ent" ? -1 : 1); });
  for (var i = 0; i < L.length; i++) {
    var x = L[i], hasta = x.tipo === "ent" ? (x.hecho ? null : x.fin ? sumaMin(x.fin, 30) : sumaMin(x.hora, 120))
                                          : (x.fin || sumaMin(x.hora, 60));
    if (hasta && ahora < hasta) return x;
  }
  return null;
}

/* ------------------------- avisos del tupper y de la avena -------------------------
   Del calendario "Comidas", los de las proximas 48 h (los pone el movil como notificacion):
   - un evento que ya es un aviso ("Descongelar...", "Saca el tupper...") -> a su hora
   - un tupper que sale del congelador -> la noche antes a las 21:30 (si no hay ya un aviso
     de descongelar ese dia)
   - un desayuno de avena en tarro (overnight oats) -> 45 min antes, para cogerlo al salir
   -> [{id, cuando (ms), titulo, texto}]                                                */
var RE_AVISO = /descongel|saca[r]?\b.*(congelador|nevera)|pasa[r]?\b.*nevera/i;
var RE_AVENA = /overnight|oats|\bavena\b.*(tarro|bote|vaso)|(tarro|bote|vaso)\w*\s+de\s+avena/i;
function msDe(fecha, hora) { var p = fecha.split("-"), h = (hora || "00:00").split(":"); return new Date(+p[0], +p[1] - 1, +p[2], +h[0], +h[1]).getTime(); }
function queComidaDe(h) { return !h ? "Comida" : h < "11:30" ? "Desayuno" : h < "13:00" ? "Media mañana" : h < "17:00" ? "Comida" : h < "20:00" ? "Merienda" : "Cena"; }
function avisosComida(dia, ahoraMs) {
  var RC = Rc(), out = [], limite = ahoraMs + 48 * 3600e3, E = (dia || []).filter(function (e) { return e && e.fuente === "comida" && e.fecha; });
  var avisosCal = [];                          // los avisos de descongelar que ya trae el calendario
  E.forEach(function (e) {
    var t = RC.sinEmoji(e.titulo || "");
    if (RE_AVISO.test(t) && e.hora) {
      avisosCal.push(msDe(e.fecha, e.hora));
      out.push({ id: "cal:" + e.uid, cuando: msDe(e.fecha, e.hora), titulo: t.replace(/\s+/g, " ").trim(),
                 texto: RC.sinHtml(e.texto || "").split(/\r?\n/).map(function (l) { return RC.sinEmoji(l).trim(); }).filter(Boolean)[0] || "Del calendario Comidas" });
    }
  });
  E.forEach(function (e) {
    if (!e.hora || RE_AVISO.test(e.titulo || "")) return;
    var c = comida(e), todo = (e.titulo || "") + "\n" + RC.sinHtml(e.texto || "");
    if (/tupper/i.test((c.etiqueta || "") + " " + c.titulo) && /congelador|descongel/i.test(todo)) {
      var d = new Date(msDe(e.fecha, "12:00")); d.setDate(d.getDate() - 1);
      var antes = d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate()), T = msDe(e.fecha, e.hora);
      // si el calendario ya avisa en las 24 h de antes, ese manda
      if (!avisosCal.some(function (m) { return m < T && m >= T - 24 * 3600e3; }))
        out.push({ id: "tupper:" + e.uid, cuando: msDe(antes, "21:30"), titulo: "Saca el tupper de " + c.titulo.toLowerCase() + " a la nevera",
                   texto: "Es para " + queComidaDe(e.hora).toLowerCase() + " de mañana, a las " + e.hora + "." });
    }
    if (e.hora < "11:30" && RE_AVENA.test(todo)) {
      out.push({ id: "avena:" + e.uid, cuando: msDe(e.fecha, e.hora) - 45 * 60e3, titulo: "Coge el bote de avena de la nevera",
                 texto: c.titulo + " · a las " + e.hora + "." });
    }
  });
  return out.filter(function (a) { return a.cuando > ahoraMs + 60e3 && a.cuando <= limite; })
            .sort(function (a, b) { return a.cuando - b.cuando; });
}

/* ------------------------------ una rutina, paso a paso ------------------------------
   Cada linea con hora ("22:10 · Ducha (10 min)") de una rutina del calendario "Claude"
   es un paso; su reloj (si dice cuanto dura) espera a que toques Empezar.              */
function pasosGuia(ev) {
  var RC = Rc(), P = [];
  RC.sinHtml(ev && ev.texto).split(/\r?\n/).forEach(function (raw) {
    var l = RC.sinEmoji(raw).replace(/^[\s\-–—·•*]+/, "").trim(), m = l.match(/^(\d{1,2})[:.h](\d{2})\s*[·\-–—:]\s*(.+)$/);
    if (!m) return;
    var x = m[3].trim(), d = x.match(/\s*\((\d+[^)]*(?:min|h))\)\s*$/), t = d ? RC.tiempo(d[1]) : null;
    P.push({ titulo: d ? x.slice(0, d.index) : x, detalle: "A las " + dos(+m[1]) + ":" + m[2] + (d ? " · " + d[1] : ""),
             duracion_s: t ? t.duracion_s : 0, avisos: [], usa: [], tipo: "paso", manual: true });
  });
  return P;
}

/* ------------------------------ cambios y lista, en el Worker ------------------------------
   {id, t, tipo: "compra"|"gasto"|"acaba"|"hay"|"hecho"|"saltada"|"inventario", items, uid, ...}
   El movil y Chrome ven lo mismo: se juntan por id y lo borrado en un sitio queda borrado.  */
function conId(L) {
  return (L || []).filter(Boolean).map(function (x) { return x.id ? x : Object.assign({ id: "t" + x.t }, x); });
}
function mezcla(a, b, tope) {
  var por = {}, out = [];
  conId(a).concat(conId(b)).forEach(function (x) {
    var y = por[x.id];
    if (!y) { por[x.id] = Object.assign({}, x); out.push(por[x.id]); return; }
    if (x.borrado && !y.borrado) { y.borrado = true; y.tb = x.tb || x.t; }
  });
  out.sort(function (x, y) { return x.t - y.t; });
  return out.slice(-(tope || 400));
}
function vigentes(cambios) { return (cambios || []).filter(function (cb) { return cb && !cb.borrado; }); }

/* ------------------------------ lo que compras, escaneado ------------------------------
   El codigo de barras se busca en Open Food Facts (gratis y abierto, sin cuenta).
   -> {codigo, nombre, marca, cantidad, zona, txt} o null si no lo conoce.              */
var OFF_URL = "https://world.openfoodfacts.org/api/v2/product/";
function productoOFF(j) {
  if (!j || j.status !== 1 || !j.product) return null;
  var p = j.product, nombre = String(p.product_name_es || p.product_name || p.generic_name_es || p.generic_name || "").trim();
  if (!nombre) return null;
  var marca = String(p.brands || "").split(",").pop().trim(), cant = String(p.quantity || "").replace(/\s+/g, " ").trim();
  var cats = (p.categories_tags || []).join(" ");
  var zona = /frozen|congel|ice-cream|helado/.test(cats) ? "Congelador"
           : /dairies|dairy|yogurt|cheese|meat|poultry|fish|refrigerat|milk|eggs|cream|sausage|ham/.test(cats) ? "Nevera"
           : /en:(fresh-)?(fruits|vegetables)\b|fresh-fruits|fresh-vegetables/.test(cats) && !/canned|juice|dried|jams/.test(cats) ? "Fruta y verdura"
           : /spices|herbs|condiments/.test(cats) ? "Especias"
           : /sweet|cocoa|chocolate|honey|breakfast-cereals|biscuit|cookie|jams|sugar|nuts|dried-fruits|confectioner|spreads/.test(cats) ? "Despensa dulce" : "Despensa salada";
  nombre = mayus1(nombre.toLowerCase());
  var out = { codigo: String(j.code || ""), nombre: nombre, marca: marca, cantidad: cant, zona: zona,
              txt: nombre + (marca || cant ? " (" + [marca, cant].filter(Boolean).join(", ") + ")" : "") };
  var nu = nutricion(p); if (nu) out.nutri = nu;
  return out;
}
// lo que trae la etiqueta por 100 g (o 100 ml), ENTERA (v2.47): lo que no venga, fuera (sin dato, nunca 0).
// Open Food Facts guarda vitaminas y minerales en g por 100 g: se pasan a mg o µg.
var NUTRI = [["kcal", "energy-kcal", 1], ["kj", "energy-kj", 1], ["grasa", "fat", 1], ["sat", "saturated-fat", 1], ["mono", "monounsaturated-fat", 1],
             ["poli", "polyunsaturated-fat", 1], ["hc", "carbohydrates", 1], ["azucar", "sugars", 1], ["polioles", "polyols", 1], ["fibra", "fiber", 1],
             ["prot", "proteins", 1], ["sal", "salt", 1], ["vitA", "vitamin-a", 1e6], ["vitD", "vitamin-d", 1e6], ["vitE", "vitamin-e", 1e3], ["vitC", "vitamin-c", 1e3],
             ["b1", "vitamin-b1", 1e3], ["b2", "vitamin-b2", 1e3], ["b3", "vitamin-pp", 1e3], ["b6", "vitamin-b6", 1e3], ["folato", "vitamin-b9", 1e6],
             ["b12", "vitamin-b12", 1e6], ["calcio", "calcium", 1e3], ["hierro", "iron", 1e3], ["magnesio", "magnesium", 1e3], ["potasio", "potassium", 1e3],
             ["zinc", "zinc", 1e3], ["fosforo", "phosphorus", 1e3], ["yodo", "iodine", 1e6]];
function nutricion(p) {
  var n = p && p.nutriments; if (!n) return null;
  var out = {}, hay = false;
  NUTRI.forEach(function (k) {
    var v = n[k[1] + "_100g"];
    if (k[0] === "kcal" && (v == null || v === "") && n["energy_100g"] != null) v = n["energy_100g"] / 4.184;   // solo kJ
    if (k[0] === "folato" && (v == null || v === "")) v = n["folates_100g"];
    v = parseFloat(v);
    if (isFinite(v) && v >= 0) { v = v * k[2]; out[k[0]] = v >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 1000) / 1000; hay = true; }
  });
  if (!hay) return null;
  out.por = /\d\s*(ml|cl|l)\b/i.test(String(p.quantity || "")) ? "100 ml" : "100 g";
  var pq = parseFloat(p.serving_quantity);
  if (isFinite(pq) && pq > 0) out.porcionG = pq;
  if (p.serving_size) out.porcionTxt = String(p.serving_size).slice(0, 60);
  if (p.nutriscore_grade && /^[a-e]$/.test(p.nutriscore_grade)) out.nutriscore = p.nutriscore_grade.toUpperCase();
  out.incompleta = Al().incompleta(out);
  return out;
}
// "90 kcal · 12 g proteína · 3 g hidratos · 4 g grasa" (por 100 g)
function nutriTxt(nu) {
  if (!nu) return "";
  var f = function (v) { return String(v >= 10 ? Math.round(v) : v).replace(".", ","); }, r = [];
  if (nu.kcal != null) r.push(f(nu.kcal) + " kcal");
  if (nu.prot != null) r.push(f(nu.prot) + " g proteína");
  if (nu.hc != null) r.push(f(nu.hc) + " g hidratos");
  if (nu.grasa != null) r.push(f(nu.grasa) + " g grasa");
  return r.join(" · ");
}
function esCodigo(c) { return /^\d{8}$|^\d{12,14}$/.test(String(c || "").trim()); }

var API = { comida: comida, comidasDe: comidasDe, recetaDe: recetaDe, queGrande: queGrande, avisosComida: avisosComida,
  pasosGuia: pasosGuia, mezcla: mezcla, vigentes: vigentes, productoOFF: productoOFF, nutriTxt: nutriTxt, esCodigo: esCodigo,
  OFF_URL: OFF_URL, RECETAS_URL: RECETAS_URL, K: { recetas: K_RECETAS, cambios: K_CAMBIOS, nota: K_NOTA, lista: K_LISTA, alimentos: K_ALIM } };

/* ================================ pantalla ================================
   Cocina.pinta(contenedor, ctx) con ctx = {dia, hoy, ahora, conf, marca, atrasManual, sel, activa}
   Subpestañas: Semana · Comprar · Despensa · Recetas (fijas arriba; se pasa deslizando).      */
if (typeof document !== "undefined") (function () {
var ICO = {
  olla: '<path d="M88,48V16a8,8,0,0,1,16,0V48a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V16a8,8,0,0,0-16,0V48A8,8,0,0,0,128,56Zm32,0a8,8,0,0,0,8-8V16a8,8,0,0,0-16,0V48A8,8,0,0,0,160,56Zm92.8,46.4L224,124v60a32,32,0,0,1-32,32H64a32,32,0,0,1-32-32V124L3.2,102.4a8,8,0,0,1,9.6-12.8L32,104V80a8,8,0,0,1,8-8H216a8,8,0,0,1,8,8v24l19.2-14.4a8,8,0,0,1,9.6,12.8ZM208,88H48v96a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16Z"/>',
  tick: '<path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/>',
  mas: '<path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/>',
  play: '<path d="M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z"/>',
  pausa: '<path d="M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z"/>',
  reloj: '<path d="M128,40a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,40Zm0,176a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,216ZM173.66,90.34a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32-11.32l40-40A8,8,0,0,1,173.66,90.34ZM96,16a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H104A8,8,0,0,1,96,16Z"/>',
  barras: '<path d="M232,48V88a8,8,0,0,1-16,0V56H184a8,8,0,0,1,0-16h40A8,8,0,0,1,232,48ZM72,200H40V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H72a8,8,0,0,0,0-16Zm152-40a8,8,0,0,0-8,8v32H184a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,224,160ZM32,96a8,8,0,0,0,8-8V56H72a8,8,0,0,0,0-16H32a8,8,0,0,0-8,8V88A8,8,0,0,0,32,96ZM80,80a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V88A8,8,0,0,0,80,80Zm104,88V88a8,8,0,0,0-16,0v80a8,8,0,0,0,16,0ZM144,80a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V88A8,8,0,0,0,144,80Zm-32,0a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V88A8,8,0,0,0,112,80Z"/>',
  der: '<path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"/>',
  cerrar: '<path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/>'
};
ICO.campana = '<path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z"/>';
ICO.copo = '<path d="M223.77,150.09a8,8,0,0,1-5.86,9.68l-24.64,6,6.46,24.11a8,8,0,0,1-5.66,9.8A8.25,8.25,0,0,1,192,200a8,8,0,0,1-7.72-5.93l-7.72-28.8L136,141.86v46.83l21.66,21.65a8,8,0,0,1-11.32,11.32L128,203.31l-18.34,18.35a8,8,0,0,1-11.32-11.32L120,188.69V141.86L79.45,165.27l-7.72,28.8A8,8,0,0,1,64,200a8.25,8.25,0,0,1-2.08-.27,8,8,0,0,1-5.66-9.8l6.46-24.11-24.64-6a8,8,0,0,1,3.82-15.54l29.45,7.23L112,128,71.36,104.54l-29.45,7.23A7.85,7.85,0,0,1,40,112a8,8,0,0,1-1.91-15.77l24.64-6L56.27,66.07a8,8,0,0,1,15.46-4.14l7.72,28.8L120,114.14V67.31L98.34,45.66a8,8,0,0,1,11.32-11.32L128,52.69l18.34-18.35a8,8,0,0,1,11.32,11.32L136,67.31v46.83l40.55-23.41,7.72-28.8a8,8,0,0,1,15.46,4.14l-6.46,24.11,24.64,6A8,8,0,0,1,216,112a7.85,7.85,0,0,1-1.91-.23l-29.45-7.23L144,128l40.64,23.46,29.45-7.23A8,8,0,0,1,223.77,150.09Z"/>';   // Phosphor snowflake
ICO.camara = '<path d="M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H80a8,8,0,0,0,6.66-3.56L100.28,48h55.43l13.63,20.44A8,8,0,0,0,176,72h32a8,8,0,0,1,8,8ZM128,88a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,88Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,128,160Z"/>';   // Phosphor camera
ICO.carro = '<path d="M230.14,58.87A8,8,0,0,0,224,56H62.68L56.6,22.57A8,8,0,0,0,48.73,16H24a8,8,0,0,0,0,16h18L67.56,172.29a24,24,0,0,0,5.33,11.27,28,28,0,1,0,44.4,8.44h45.42A27.75,27.75,0,0,0,160,204a28,28,0,1,0,28-28H91.17a8,8,0,0,1-7.87-6.57L80.13,152h116a24,24,0,0,0,23.61-19.71l12.16-66.86A8,8,0,0,0,230.14,58.87ZM104,204a12,12,0,1,1-12-12A12,12,0,0,1,104,204Zm96,0a12,12,0,1,1-12-12A12,12,0,0,1,200,204Zm4-74.57A8,8,0,0,1,196.1,136H77.22L65.59,72H214.41Z"/>';
ICO.copia = '<path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/>';
ICO.lista = '<path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z"/>';
function svg(k, cls) { return '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '>' + ICO[k] + '</svg>'; }
API.icono = function () { return svg("olla"); };
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
// v2.41 · Casa de prueba: mientras está abierta, todo se lee y se guarda en CAJA (en memoria),
// nunca en el móvil ni en el Worker; al salir, CAJA se tira y todo queda como estaba.
var CAJA = null;
function copiaJ(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
function lee(k, d) {
  if (CAJA) return k in CAJA ? copiaJ(CAJA[k]) : d;
  try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; }
}
function guarda(k, v) { if (CAJA) { CAJA[k] = copiaJ(v); return; } try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
function diaTxt(iso, hoy) {
  if (iso === hoy) return "Hoy";
  var d = new Date(iso + "T12:00:00"), h = new Date(hoy + "T12:00:00"), n = Math.round((d - h) / 864e5);
  if (n === 1) return "Mañana";
  if (n === -1) return "Ayer";
  return mayus1(DIAS[d.getDay()]) + " " + d.getDate();
}
function enCuanto(hora, ahora) {
  var p = hora.split(":"), q = ahora.split(":"), m = (+p[0] * 60 + +p[1]) - (+q[0] * 60 + +q[1]);
  return m <= 0 ? "" : m < 60 ? "en " + m + " min" : "en " + Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : "");
}
// lo que dice la columna de la izquierda: el momento del dia, o lo que es
function etiquetaDe(R) {
  if (R.tipo === "aviso") return "Aviso";
  if (R.tipo === "compra") return "Compra";
  if (/^prepar/i.test(R.titulo)) return "Preparar";
  return queComidaDe(R.hora);
}

var CSS =
  "#appPant{--coc:#f08a4b}html[data-tema=claro] #appPant{--coc:#b3541e}" +
  ".cocSec{background:var(--sf);border-radius:20px;padding:14px;margin-bottom:12px}" +
  ".cocSec>h3{margin:0;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}" +
  ".cocSec>p.sub{margin:4px 0 0;font-size:13px;font-weight:600;color:var(--mu)}" +
  ".cocHero em{display:block;font-style:normal;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--coc)}" +
  ".cocHero h2{margin:6px 0 4px;font-size:32px;line-height:1.08;font-weight:800;letter-spacing:-.02em}" +
  ".cocMeta{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 2px}" +
  ".cocMeta span{font-size:12px;font-weight:700;padding:5px 10px;border-radius:99px;background:var(--sf2);color:var(--fg)}" +
  ".cocSub{margin:16px 0 6px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);display:flex;justify-content:space-between;gap:8px}" +
  ".cocSub b{font-weight:700;letter-spacing:0;text-transform:none;color:var(--mu)}" +
  ".cocLinea{margin:12px 0 0;font-size:14px;font-weight:700;line-height:1.5;color:var(--mu)}" +
  ".cocAhora{margin-top:14px;background:var(--sf2);border-radius:18px;padding:14px}" +
  ".cocAhora p{margin:8px 0 0;font-size:20px;line-height:1.4;font-weight:700}" +
  ".cocAhora small{display:block;margin-top:8px;font-size:13px;font-weight:600;line-height:1.5;color:var(--mu)}" +
  ".cocPuntos{display:flex;align-items:center;gap:5px}" +
  ".cocPuntos i{width:18px;height:5px;border-radius:3px;background:var(--ln)}.cocPuntos i.ya{background:var(--mu)}.cocPuntos i.ahora{background:var(--fg)}" +
  ".cocPuntos span{margin-left:6px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}" +
  ".cocListo{margin-top:12px;height:48px;padding:0 20px!important;border-radius:24px!important;background:var(--fg)!important;color:var(--bg)!important;font-size:15px!important;font-weight:800!important;display:inline-flex;align-items:center;gap:8px}" +
  ".cocListo svg{width:16px;height:16px}" +
  ".tj.cocTj{background:linear-gradient(160deg,#e3894e 0%,#c0652f 55%,#98491e 100%);--osc:#98491e}" +
  ".cocIng{list-style:none;margin:0;padding:0}" +
  ".cocIng li{display:grid;grid-template-columns:14px 1fr auto;gap:10px;align-items:baseline;padding:7px 0;border-top:1px solid var(--ln);font-size:15px;font-weight:600}" +
  ".cocIng li:first-child{border-top:0}" +
  ".cocIng i{width:9px;height:9px;border-radius:50%;background:var(--fg);align-self:center}" +
  ".cocIng li.no i{background:none;box-shadow:inset 0 0 0 2px var(--mu)}.cocIng li.no span{color:var(--mu)}" +
  ".cocIng li.gastado span{text-decoration:line-through;color:var(--mu)}" +
  ".cocIng small{font-size:12px;font-weight:700;color:var(--mu);text-align:right}" +
  ".cocPasos{list-style:none;margin:0;padding:0}" +
  ".cocPasos li{border-top:1px solid var(--ln)}.cocPasos li:first-child{border-top:0}" +
  ".cocPasos button{width:100%;display:grid;grid-template-columns:30px 1fr;gap:12px;align-items:start;text-align:left;padding:10px 0;min-height:48px;font-size:15px;font-weight:600;line-height:1.5;color:var(--fg)}" +
  ".cocPasos button i{width:28px;height:28px;border-radius:50%;box-shadow:inset 0 0 0 2px var(--ln);display:flex;align-items:center;justify-content:center;font-style:normal;font-size:13px;font-weight:800;color:var(--mu)}" +
  ".cocPasos button[aria-pressed=true] i{background:var(--fg);box-shadow:none;color:var(--bg)}" +
  ".cocPasos button[aria-pressed=true] i svg{width:16px;height:16px}" +
  ".cocPasos button[aria-pressed=true] span{color:var(--mu);text-decoration:line-through;text-decoration-thickness:1px}" +
  ".cocPasos b{font-weight:800}" +
  ".cocNota{margin:10px 0 0;font-size:13px;font-weight:600;line-height:1.5;color:var(--mu)}" +
  ".cocGo{width:100%;height:56px;border-radius:28px;background:var(--coc)!important;color:#140b04!important;font-size:17px!important;font-weight:800!important;display:flex;align-items:center;justify-content:center;gap:10px;margin-top:14px}" +
  "html[data-tema=claro] .cocGo{color:#fff!important}" +
  ".cocGo svg{width:20px;height:20px}" +
  ".cocFila{width:100%;display:grid;grid-template-columns:64px 1fr auto;gap:10px;align-items:center;text-align:left;padding:10px 0;min-height:52px;border-top:1px solid var(--ln);color:var(--fg)}" +
  ".cocFila:first-of-type{border-top:0}" +
  ".cocFila time{font-size:12px;font-weight:800;color:var(--mu);line-height:1.25}" +
  ".cocFila time b{display:block;font-size:13px;color:var(--fg)}" +
  ".cocFila span{font-size:15px;font-weight:700;line-height:1.25;min-width:0}" +
  ".cocFila span small{display:block;font-size:12px;font-weight:600;color:var(--mu);margin-top:2px}" +
  ".cocFila.sel{box-shadow:inset 3px 0 0 var(--fg);padding-left:10px;margin-left:-10px;width:calc(100% + 10px)}" +
  ".cocEtq{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mu);white-space:nowrap}" +
  ".cocZona{margin-top:12px}.cocZona h4{margin:0 0 6px;font-size:13px;font-weight:800;color:var(--fg)}" +
  ".cocZonaCab{display:flex;align-items:center;width:100%;text-align:left;min-height:44px;color:var(--fg)}.cocZonaCab h4{margin:0}" +
  ".cocZona h4 small{font-weight:700;color:var(--mu);margin-left:6px}" +
  ".cocPills{display:flex;flex-wrap:wrap;gap:6px}" +
  ".cocPills span{font-size:13px;font-weight:600;padding:6px 10px;border-radius:12px;background:var(--sf2);color:var(--fg);max-width:100%}" +
  ".cocPills span b{font-weight:800;margin-left:4px;color:var(--mu)}" +
  ".cocPills.no span{background:none;box-shadow:inset 0 0 0 1px var(--ln);color:var(--mu)}" +
  ".cocPills span.nuevo{box-shadow:inset 0 0 0 1.5px var(--fg)}" +
  ".cocComprado{list-style:none;margin:0;padding:0}" +
  ".cocComprado li{padding:8px 0;border-top:1px solid var(--ln);font-size:14px;font-weight:700;line-height:1.5}.cocComprado li:first-child{border-top:0}" +
  ".cocComprado em{font-style:normal;font-size:12px;font-weight:700;color:var(--mu);margin-left:8px}" +
  ".cocComprado small{display:block;font-size:12px;font-weight:600;color:var(--mu)}" +
  ".cocPills span.gastado{text-decoration:line-through;color:var(--mu)}" +
  ".cocCompra{list-style:none;margin:0;padding:0}" +
  ".cocCompra button{width:100%;display:grid;grid-template-columns:28px 1fr;gap:12px;align-items:center;text-align:left;min-height:48px;padding:6px 0;border-top:1px solid var(--ln);font-size:15px;font-weight:600;color:var(--fg)}" +
  ".cocCompra li:first-child button{border-top:0}" +
  ".cocCompra button i{width:24px;height:24px;border-radius:7px;box-shadow:inset 0 0 0 2px var(--ln);display:flex;align-items:center;justify-content:center}" +
  ".cocCompra button[aria-pressed=true] i{background:var(--fg);box-shadow:none;color:var(--bg)}" +
  ".cocCompra button[aria-pressed=true] i svg{width:14px;height:14px}" +
  ".cocCompra small{display:block;font-size:12px;font-weight:600;color:var(--mu)}" +
  ".cocBtn{width:100%;height:48px;border-radius:24px;border:1px solid var(--ln)!important;background:var(--sf2)!important;color:var(--fg);font-size:15px!important;font-weight:700!important;margin-top:12px}" +
  ".cocBtn:disabled{opacity:.5}" +
  ".cocVacio{font-size:14px;font-weight:600;line-height:1.5;color:var(--mu);margin:8px 0 0}" +
  ".cocVacio b{color:var(--fg)}" +
  /* ---- v2.23: Semana, Comprar, Tengo ---- */
  ".cocSemana>.tj{margin-bottom:12px}" +
  ".cocFila.e-hecha,.cocFila.e-pasada,.cocFila.e-saltada{opacity:.5}" +
  ".cocFila span small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
  ".cocIco{display:inline-flex;vertical-align:-3px;margin-right:6px;color:var(--mu)}.cocIco svg{width:16px;height:16px}" +
  ".cocFila.e-hecha .cocIco{color:var(--fg)}" +
  ".cocCompra li{display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;border-top:1px solid var(--ln)}.cocCompra li:first-child{border-top:0}" +
  ".cocCompra li>.cocMarca{border-top:0!important;min-width:0}" +
  ".cocMarca span{min-width:0}.cocMarca span small{display:block;font-size:12px;font-weight:600;line-height:1.4;color:var(--mu);margin-top:2px}" +
  ".cocCompra li.duda .cocMarca span small{color:var(--coc)}" +
  ".cocCompra .cocQueda,.cocCompra .cocQuita{width:auto!important;display:flex!important;align-items:center;justify-content:center;border-top:0!important;grid-template-columns:none!important;min-height:0!important}" +
  ".cocCompra .cocQueda{height:40px;padding:0 14px!important;border-radius:20px!important;background:var(--sf2);color:var(--fg);font-size:13px!important;font-weight:800!important;white-space:nowrap}" +
  ".cocCompra .cocQuita{width:44px!important;height:44px}" +
  ".cocChipsW{position:relative}.cocChipsW::after{content:'';position:absolute;right:-14px;top:12px;bottom:2px;width:40px;background:linear-gradient(90deg,rgba(0,0,0,0),var(--sf));pointer-events:none}" +
  ".cocPills button i{font-style:normal;font-weight:800;color:var(--coc);margin-left:3px}" +
  ".cocPills button.duda{box-shadow:inset 0 0 0 1.5px var(--ln)}" +
  ".cocDos2{margin-top:4px}" +
  ".cocHojaSi{width:100%;height:44px;margin-top:10px;border-radius:22px!important;background:var(--coc)!important;color:#140b04!important;font-size:14px!important;font-weight:800!important}" +
  "html[data-tema=claro] .cocHojaSi{color:#fff!important}" +
  ".cocTexto{display:block;width:100%;min-height:210px;margin-top:12px;border-radius:14px;border:1px solid var(--ln);background:var(--sf2);color:var(--fg);padding:12px;font:600 15px/1.5 Manrope,sans-serif;resize:vertical;box-sizing:border-box}" +
  ".cocPrevia{margin:8px 0 0;min-height:21px}" +
  ".cocLink{display:block;background:none!important;color:var(--coc)!important;font-size:14px!important;font-weight:800!important;padding:10px 0!important;min-height:44px}" +
  ".cocGo:disabled{opacity:.45}" +
  ".cocZonasAn{grid-template-columns:repeat(2,1fr)!important}" +
  ".cocCompra li.cocCarro{grid-template-columns:1fr auto}.cocCompra li.cocCarro form{grid-column:1/-1}" +
  ".cocCantF{display:grid;grid-template-columns:1fr auto;gap:8px;margin:8px 0 10px}" +
  ".cocCantF input{margin:0!important;min-height:44px}" +
  ".cocCantF button{height:44px;padding:0 16px!important;border-radius:22px!important;background:var(--fg)!important;color:var(--bg)!important;font-size:14px!important;font-weight:800!important}" +
  ".cocHojaIt .cocCantF{margin:10px 0 0}" +
  "#cocEsc .eZonas{grid-template-columns:repeat(2,1fr)!important}" +
  "#cocEsc .eUds{display:flex;align-items:center;gap:12px;margin-top:12px;font-size:15px;font-weight:700}" +
  "#cocEsc .eUds span{color:#9aa0a8;min-width:64px}#cocEsc .eUds em{font-style:normal;color:#9aa0a8}" +
  "#cocEsc .eUds button{width:44px;height:44px;border-radius:22px!important;background:rgba(255,255,255,.12);color:#f4f5f7;font-size:22px;font-weight:800}" +
  "#cocEsc .eUds b{min-width:24px;text-align:center;font-size:20px}" +
  ".cocQueCuanto{display:grid;grid-template-columns:1fr 92px 52px;gap:8px;margin-top:12px}" +
  ".cocQueCuanto input{margin:0!important;min-width:0}" +
  ".cocQueCuanto button{height:52px;border-radius:26px!important;background:var(--sf2);color:var(--fg);display:flex!important;align-items:center;justify-content:center}.cocQueCuanto button svg{width:20px;height:20px}" +
  ".cocMover{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px}" +
  ".cocMover span{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mu);margin-right:2px}" +
  ".cocMover button{height:34px;padding:0 10px!important;border-radius:17px!important;background:var(--sf);color:var(--fg);font-size:13px!important;font-weight:700!important;box-shadow:inset 0 0 0 1px var(--ln)}" +
  ".cocMover button[aria-pressed=true]{background:var(--fg);color:var(--bg);box-shadow:none}" +
  ".cocToast{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:95;background:var(--fg);color:var(--bg);border-radius:16px;padding:14px 16px;font:700 15px/1.4 Manrope,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)}" +
  "";;
CSS +=
  /* ---- subpestañas, Comprar y Tengo ---- */
  ".cocTabs{position:sticky;top:0;z-index:3;background:var(--bg);padding:0 0 10px}" +
  ".cocSeg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px;padding:4px;border-radius:18px;background:var(--sf)}" +
  ".cocSeg button{height:40px;border-radius:14px!important;color:var(--mu);font-size:13px!important;font-weight:800!important;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
  ".cocSeg button[aria-selected=true]{background:var(--fg);color:var(--bg)}" +
  ".cocSeg button b{margin-left:3px;font-size:11px;font-weight:800;opacity:.65}" +
  ".cocLead{margin:0;font-size:22px;line-height:1.25;font-weight:800;letter-spacing:-.01em}" +
  ".cocLead+.sub{margin:4px 0 0;font-size:13px;font-weight:600;line-height:1.5;color:var(--mu)}" +
  ".cocSec .cocCompra{margin-top:8px}" +
  ".cocCompra li.conQuita{display:grid;grid-template-columns:1fr 44px;align-items:center;border-top:1px solid var(--ln)}" +
  ".cocCompra li.conQuita>button:first-child{border-top:0}.cocCompra li.conQuita:first-child{border-top:0}" +
  ".cocQuita{height:44px;color:var(--mu);display:flex!important;align-items:center;justify-content:center}.cocQuita svg{width:18px;height:18px}" +
  ".cocAnade{display:grid;grid-template-columns:1fr 52px;gap:8px;margin-top:12px}" +
  ".cocAnade input{margin:0!important}" +
  ".cocAnade button{height:52px;border-radius:26px!important;background:var(--sf2);color:var(--fg);display:flex!important;align-items:center;justify-content:center}.cocAnade button svg{width:20px;height:20px}" +
  ".cocChips{display:flex;gap:6px;overflow-x:auto;margin:12px -14px 0;padding:0 14px 2px;scrollbar-width:none}.cocChips::-webkit-scrollbar{display:none}" +
  ".cocChips button{flex:none;height:36px;padding:0 12px!important;border-radius:18px!important;background:var(--sf2);color:var(--fg);font-size:13px!important;font-weight:700!important;white-space:nowrap}" +
  ".cocChips button b{margin-left:6px;font-weight:800;color:var(--mu)}" +
  ".cocChips button[aria-pressed=true]{background:var(--fg);color:var(--bg)}.cocChips button[aria-pressed=true] b{color:inherit;opacity:.65}" +
  ".cocDos{display:grid;grid-template-columns:1fr 1fr;gap:8px}" +
  ".cocZonasAn{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}" +
  ".cocZonasAn button{height:40px;border-radius:12px!important;background:var(--sf2);color:var(--fg);font-size:13px!important;font-weight:700!important}" +
  ".cocZonasAn button[aria-pressed=true]{box-shadow:inset 0 0 0 2px var(--fg)}" +
  ".cocPills button{font-size:13px!important;font-weight:600!important;min-height:36px;padding:6px 10px!important;border-radius:12px!important;background:var(--sf2);color:var(--fg);max-width:100%;text-align:left}" +
  ".cocPills button b{font-weight:800;margin-left:4px;color:var(--mu)}" +
  ".cocPills button[aria-pressed=true]{background:var(--fg);color:var(--bg)}.cocPills button[aria-pressed=true] b{color:inherit;opacity:.7}" +
  ".cocHojaIt{position:sticky;bottom:0;margin:14px -8px -8px;padding:14px;border-radius:18px;background:var(--sf2);box-shadow:0 -6px 24px rgba(0,0,0,.28)}" +
  ".cocHojaIt>div:first-child b{font-size:17px;font-weight:800}.cocHojaIt>div:first-child span{margin-left:8px;font-size:14px;font-weight:700;color:var(--mu)}" +
  ".cocHojaIt small{display:block;margin-top:4px;font-size:12px;font-weight:600;line-height:1.5;color:var(--mu)}" +
  ".cocHojaBot{display:grid;grid-template-columns:1fr 1.5fr 44px;gap:8px;margin-top:10px}" +
  ".cocHojaBot button{height:44px;border-radius:22px!important;background:var(--fg);color:var(--bg);font-size:14px!important;font-weight:800!important}" +
  ".cocHojaBot button+button{background:var(--sf);color:var(--fg);box-shadow:inset 0 0 0 1px var(--ln)}" +
  ".cocBtn{display:flex!important;align-items:center;justify-content:center;gap:8px}.cocBtn svg{margin:0!important;flex:none}" +
  ".cocCompra li.conQuita>button{border-top:0!important}" +
  ".cocCompra li.cocItem{grid-template-columns:44px 1fr auto;gap:0 6px}" +
  ".cocCompra .cocTick{width:44px!important;min-height:48px;display:flex!important;align-items:center;justify-content:center;grid-template-columns:none!important;padding:0!important;border-top:0!important}" +
  ".cocCompra button.cocNom{grid-template-columns:1fr auto!important;gap:6px!important;border-top:0!important;min-width:0}" +
  ".cocOrigen{grid-column:1/-1;padding:0 0 12px 50px}.cocOrigen p{margin:0 0 4px;font-size:12px;font-weight:600;line-height:1.45;color:var(--mu)}" +
  ".cocOrigen p.suma{margin-top:6px;color:var(--fg);font-weight:800}" +
  ".cocCompra button{grid-template-columns:28px 1fr auto!important}" +
  ".cocCompra button em{font-style:normal;font-size:14px;font-weight:700;color:var(--mu);white-space:nowrap;padding-left:8px}" +
  ".cocDia{margin:14px 0 2px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}.cocDia:first-child{margin-top:0}" +
  ".cocFila{grid-template-columns:64px 1fr 20px!important}.cocDia+.cocFila{border-top:0}" +
  ".cocFila .cocIr{display:flex;color:var(--mu)}.cocFila .cocIr svg{width:18px;height:18px}" +
  "div.cocFila{opacity:.8}" +
  "@keyframes cocDer{from{transform:translateX(36px);opacity:.2}}@keyframes cocIzq{from{transform:translateX(-36px);opacity:.2}}" +
  ".cocDer{animation:cocDer .22s ease-out}.cocIzq{animation:cocIzq .22s ease-out}" +
  "@media (prefers-reduced-motion:reduce){.cocDer,.cocIzq{animation:none}}" +
  ".cocSeg{grid-template-columns:repeat(4,minmax(0,1fr))!important}" +
  "#cocEsc .eCam.nativo{height:170px}" +
  ".cocZonas{margin-top:12px}" +
  ".cocZonaFila{width:100%;display:grid;grid-template-columns:1fr auto 20px;gap:10px;align-items:center;text-align:left;min-height:64px;padding:10px 0;border-top:1px solid var(--ln);color:var(--fg)}" +
  ".cocZonaFila:first-child{border-top:0}" +
  ".cocZonaFila b{display:block;font-size:16px;font-weight:800}" +
  ".cocZonaFila small{display:block;margin-top:2px;font-size:13px;font-weight:600;line-height:1.4;color:var(--mu);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}" +
  ".cocZonaFila em{font-style:normal;font-size:15px;font-weight:800;color:var(--mu)}.cocZonaFila svg{width:18px;height:18px;color:var(--mu)}" +
  ".cocPillsZona{margin-top:14px}" +
  ".cocHojaBot .cocHojaX{background:none!important;box-shadow:none!important;color:var(--mu);display:flex!important;align-items:center;justify-content:center}.cocHojaX svg{width:20px;height:20px}";
CSS +=
  /* ---- escaner ---- */
  "#cocEsc{position:fixed;inset:0;z-index:91;background:#101113;color:#f4f5f7;display:flex;flex-direction:column;font-family:Manrope,sans-serif;" +
  "padding:calc(8px + var(--safe-area-inset-top,env(safe-area-inset-top,0px))) 16px calc(12px + var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))}" +
  "#cocEsc button{flex:none;padding:0;font-family:inherit;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent}" +
  "#cocEsc svg{background:none;border-radius:0}" +
  "#cocEsc .eTop{display:flex;align-items:center;gap:8px;flex:0 0 auto}" +
  "#cocEsc .eTop button{width:44px;height:44px;border-radius:14px!important;background:none;color:#f4f5f7;display:flex;align-items:center;justify-content:center}" +
  "#cocEsc .eTop svg{width:22px;height:22px}#cocEsc .eTop span{font-size:15px;font-weight:800}" +
  "#cocEsc .eCuerpo{flex:1 1 auto;overflow:auto;min-height:0}" +
  "#cocEsc .eCam{position:relative;height:260px;border-radius:20px;overflow:hidden;background:#1c1f24;margin-top:8px}" +
  "#cocEsc video{width:100%;height:100%;object-fit:cover;display:block}" +
  "#cocEsc .eVisor{position:absolute;left:12%;right:12%;top:30%;bottom:30%;border-radius:14px;box-shadow:0 0 0 999px rgba(0,0,0,.4);outline:2px solid rgba(255,255,255,.9)}" +
  "#cocEsc .eSin{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-size:15px;font-weight:600;line-height:1.5;color:#9aa0a8}" +
  "#cocEsc .eMano{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:12px}" +
  "#cocEsc input{min-height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:#1c1f24;color:#f4f5f7;padding:0 14px;font:600 17px Manrope,sans-serif;letter-spacing:.04em}" +
  "#cocEsc .eMano button{height:52px;padding:0 18px!important;border-radius:26px!important;background:rgba(255,255,255,.12);color:#f4f5f7;font-size:15px;font-weight:800}" +
  "#cocEsc .eRes{margin-top:14px;background:#1c1f24;border-radius:20px;padding:14px}" +
  "#cocEsc .eRes small{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9aa0a8}" +
  "#cocEsc .eRes h3{margin:6px 0 2px;font-size:24px;line-height:1.15;font-weight:800;letter-spacing:-.01em}" +
  "#cocEsc .eRes p{margin:0;font-size:15px;font-weight:600;line-height:1.5;color:#9aa0a8}" +
  "#cocEsc .eRes p.eNutri{margin-top:8px;font-size:14px;color:#c9ccd3}#cocEsc .eRes p.eNutri b{color:#f4f5f7}" +
  "#cocEsc .eCap{margin:14px 0 6px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9aa0a8}" +
  "#cocEsc .eNoms{display:flex;flex-direction:column;gap:6px}" +
  "#cocEsc .eNoms button{min-height:48px;border-radius:14px!important;background:rgba(255,255,255,.08);color:#f4f5f7;font-size:16px;font-weight:700;text-align:left;padding:8px 14px!important;display:flex;justify-content:space-between;align-items:center;gap:8px}" +
  "#cocEsc .eNoms button small{font-size:12px;font-weight:700;color:#9aa0a8}" +
  "#cocEsc .eNoms button[aria-pressed=true]{background:#f4f5f7;color:#101113}#cocEsc .eNoms button[aria-pressed=true] small{color:#4a4f57}" +
  "#cocEsc .eRes .eNom{width:100%;margin-top:8px}" +
  "#cocEsc .eRes p.eNota{margin-top:8px;font-size:13px}" +
  "#cocEsc .eRes p b{color:#f4f5f7}" +
  "#cocEsc .eFuente{font-size:11px;font-weight:800;letter-spacing:.06em;border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:1px 6px;margin-left:4px}" +
  "#cocEsc .eZonas{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:12px}" +
  "#cocEsc .eZonas button{height:44px;border-radius:14px!important;background:rgba(255,255,255,.08);color:#f4f5f7;font-size:14px;font-weight:700}" +
  "#cocEsc .eZonas button[aria-pressed=true]{box-shadow:inset 0 0 0 2px #f4f5f7}" +
  "#cocEsc .eOk{width:100%;height:56px;border-radius:28px!important;background:#f08a4b;color:#140b04;font-size:17px;font-weight:800;margin-top:12px}" +
  "#cocEsc .eOtro{width:100%;height:44px;background:none;color:#9aa0a8;font-size:14px;font-weight:700;margin-top:4px}" +
  "#cocEsc .eLista{list-style:none;margin:14px 0 0;padding:0}" +
  "#cocEsc .eLista li{font-size:15px;font-weight:600;padding:8px 0;border-top:1px solid rgba(255,255,255,.08);color:#dfe2e6}" +
  "#cocEsc .eLista li small{color:#9aa0a8;margin-left:6px}" +
  "#cocEsc .eFin{width:100%;height:52px;border-radius:26px!important;background:rgba(255,255,255,.1);color:#f4f5f7;font-size:16px;font-weight:700;margin-top:10px;flex:0 0 auto}" +
  ".cocBtn svg{width:18px;height:18px;vertical-align:-3px;margin-right:6px}" +
  "#cocEsc .eSin{flex-direction:column;gap:14px}" +
  "#cocEsc .eOtraVez{height:56px;padding:0 26px!important;border-radius:28px!important;background:#f08a4b;color:#140b04;font-size:17px;font-weight:800;display:inline-flex;align-items:center;gap:10px}" +
  "#cocEsc .eOtraVez svg{width:22px;height:22px}";
CSS +=
  /* ---- v2.40 Casa: por confirmar, filas con cantidad, deslizar, cuánto queda ---- */
  ".cocPc{background:var(--sf2);border-radius:18px;padding:12px 14px;margin:12px 0 0}" +
  ".cocPcTit{margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);display:flex;gap:8px}" +
  ".cocPcTit b{color:var(--fg)}" +
  ".cocPcIt{padding:10px 0;border-top:1px solid var(--ln)}.cocPcIt:first-of-type{border-top:0}" +
  ".cocPcIt p{margin:0;font-size:15px;font-weight:700;line-height:1.4}.cocPcIt p small{display:block;font-size:13px;font-weight:600;color:var(--mu);line-height:1.5;margin-top:2px}" +
  ".cocPcB{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}" +
  ".cocPcB button{flex:1 1 auto;min-height:44px;border-radius:14px!important;background:var(--sf);color:var(--fg);font-size:14px;font-weight:800;padding:0 12px!important;display:inline-flex;align-items:center;justify-content:center;gap:6px}" +
  ".cocPcB button.si{background:var(--fg);color:var(--bg)}.cocPcB svg{width:16px;height:16px}" +
  ".cocCorrige{margin-top:10px}.cocChecksC{list-style:none;margin:0;padding:0}" +
  ".cocChecksC button{width:100%;min-height:44px;display:flex;align-items:center;gap:10px;background:none;color:var(--fg);font-size:15px;font-weight:600;text-align:left;padding:0!important}" +
  ".cocChecksC i{width:22px;height:22px;border-radius:7px;box-shadow:inset 0 0 0 2px var(--mu);display:flex;align-items:center;justify-content:center;flex:none}" +
  ".cocChecksC button[aria-pressed=true] i{background:var(--fg);color:var(--bg);box-shadow:none}.cocChecksC i svg{width:14px;height:14px}" +
  ".cocChecksC button[aria-pressed=false] span{color:var(--mu);text-decoration:line-through}" +
  ".cocAviso{display:flex;gap:10px;align-items:flex-start;background:var(--sf2);border-radius:16px;padding:12px 14px;margin-top:12px;font-size:14px;font-weight:600;line-height:1.5}" +
  ".cocAviso b{display:block;font-size:15px}.cocAviso svg{width:20px;height:20px;flex:none;margin-top:2px}" +
  ".cocTup{font-style:normal;font-size:12px;font-weight:700;color:var(--mu);margin-left:6px}" +
  ".cocAyuda{margin:12px 0 4px;font-size:13px;font-weight:600;color:var(--mu)}" +
  ".cocFilasZ{list-style:none;margin:0;padding:0}" +
  ".cocFilaZ{position:relative;overflow:hidden;border-top:1px solid var(--ln)}.cocFilaZ:first-child{border-top:0}" +
  ".cocFueraZ{position:absolute;right:0;top:0;bottom:0;width:112px;background:var(--fg);color:var(--bg);font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:0!important}" +
  ".cocFueraZ svg{width:16px;height:16px}" +
  ".cocFilaZin{position:relative;width:100%;min-height:52px;display:flex;align-items:center;gap:12px;background:var(--sf);color:var(--fg);text-align:left;padding:6px 0!important;border-radius:0!important;transition:transform .18s ease}" +
  ".cocFilaZ.abierta .cocFilaZin{transform:translateX(-112px)}" +
  ".cocFilaZin span{flex:1;min-width:0;font-size:15px;font-weight:700;line-height:1.35}.cocFilaZin span small{display:block;font-size:13px;font-weight:600;color:var(--mu)}" +
  ".cocFilaZin em{font-style:normal;font-size:15px;font-weight:700;white-space:nowrap}.cocFilaZin.duda em{color:var(--mu)}" +
  ".cocFrac{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px}.cocFrac span{width:100%;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}" +
  ".cocFrac button{flex:1 1 0;min-height:44px;border-radius:14px!important;background:var(--sf2);color:var(--fg);font-size:15px;font-weight:800}" +
  ".cocSugs{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px}" +
  ".cocSugs button{min-height:44px;border-radius:14px!important;background:var(--sf2);color:var(--fg);font-size:14px;font-weight:700;padding:0 12px!important}" +
  ".cocSim{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center;background:var(--sf2);border-radius:16px;padding:10px 10px 10px 14px;margin-bottom:10px}" +
  ".cocSim b{font-size:12px;font-weight:800;letter-spacing:.08em}.cocSim span{grid-column:1;font-size:13px;font-weight:600;color:var(--mu);line-height:1.4}" +
  ".cocSim button{grid-column:2;grid-row:1/3;height:44px;padding:0 16px!important;border-radius:14px!important;background:var(--fg);color:var(--bg);font-size:15px;font-weight:800}" +
  /* ---- v2.42 Comprar por pasillo ---- */
  ".cocSuper{margin-top:12px}.cocSuper>span{display:block;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);margin-bottom:6px}" +
  ".cocSuperB{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -14px;padding:0 14px}.cocSuperB::-webkit-scrollbar{display:none}" +
  ".cocSuperB button{flex:none;min-height:44px;padding:0 14px!important;border-radius:14px!important;background:var(--sf2);color:var(--fg);font-size:14px;font-weight:700}" +
  ".cocSuperB button[aria-pressed=true]{background:var(--fg);color:var(--bg)}" +
  ".cocGrupoC{margin:24px 0 0;font-size:15px;font-weight:800;display:flex;gap:8px;align-items:baseline}.cocGrupoC b{font-size:13px;color:var(--mu)}" +
  ".cocGrupoC.luego{color:var(--mu)}" +
  ".cocPasillo{margin:16px 0 2px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);display:flex;gap:6px;align-items:baseline}" +
  ".cocPasillo b{font-weight:800}.cocPasillo small{letter-spacing:0;text-transform:none;font-weight:600}" +
  ".cocNom small b{font-weight:600}.cocNom small b.urge{font-weight:800;color:var(--fg)}" +
  ".cocTermina{margin-top:12px;display:flex;align-items:center;justify-content:center;gap:8px}.cocTermina svg{width:20px;height:20px}" +
  ".cocTerm{list-style:none;margin:8px 0 0;padding:0;max-height:46vh;overflow-y:auto}" +
  ".cocTerm li{display:grid;grid-template-columns:1fr 112px;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--ln)}" +
  ".cocTerm li span b{display:block;font-size:15px;font-weight:700}.cocTerm li span small{display:block;font-size:13px;font-weight:600;color:var(--mu)}" +
  ".cocTerm input{min-height:44px;border-radius:12px;border:1px solid var(--ln);background:var(--sf2);color:var(--fg);padding:0 10px;font:700 15px Manrope,sans-serif;width:100%}" +
  /* ---- v2.45 Nutrición ---- */
  ".ntDias{margin-top:12px}.ntQue{margin:12px 0 0;font-size:13px;font-weight:600;line-height:1.5;color:var(--mu)}.ntQue b{color:var(--fg)}" +
  ".ntNota{margin:8px 0 0;font-size:13px;font-weight:600;line-height:1.5;color:var(--mu)}.ntNota b{color:var(--fg)}" +
  ".ntTabla{margin-top:16px}" +
  ".ntFila{width:100%;display:grid;grid-template-columns:1.5fr .8fr .8fr 1.1fr .7fr;gap:6px;align-items:center;min-height:44px;padding:4px 0!important;border-top:1px solid var(--ln);background:none;color:var(--fg);text-align:right;font-size:14px;font-weight:600;border-radius:0!important}" +
  ".ntFila span:first-child{text-align:left;font-weight:700}.ntFila span small{margin-left:4px;font-size:11px;color:var(--mu);font-weight:600}" +
  ".ntFila b{font-weight:800}.ntFila.prio span:first-child{font-weight:800}" +
  ".ntCab{min-height:32px;border-top:0;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mu)}" +
  ".ntPorque{margin:0 0 6px;font-size:13px;font-weight:600;line-height:1.5;color:var(--mu)}" +
  ".ntReg{margin-top:24px}.ntFavs{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}" +
  ".ntFavs button{min-height:44px;padding:0 12px!important;border-radius:14px!important;background:var(--sf2);color:var(--fg);font-size:14px;font-weight:700}" +
  ".ntFavs button[aria-pressed=true]{background:var(--fg);color:var(--bg)}" +
  ".ntRegIt{display:flex;align-items:center;gap:8px;min-height:52px;border-top:1px solid var(--ln)}.ntRegIt span{flex:1;font-size:15px;font-weight:700}.ntRegIt small{display:block;font-size:13px;font-weight:600;color:var(--mu)}" +
  ".ntPerfil{display:grid;gap:8px;margin-top:12px}.ntPerfil label{display:grid;gap:4px;font-size:13px!important;font-weight:700;color:var(--mu);text-transform:none!important;letter-spacing:0!important;margin:0!important}" +
  ".ntPerfil input{width:100%}" +
  ".ntPerfil input{min-height:44px;border-radius:12px;border:1px solid var(--ln);background:var(--sf2);color:var(--fg);padding:0 12px;font:700 16px Manrope,sans-serif}" +
  /* ---- v2.47 la ficha de un alimento ---- */
  ".cocFicha{position:fixed;inset:0;z-index:80;background:var(--bg);color:var(--fg);overflow-y:auto;overscroll-behavior:contain;padding:calc(10px + var(--safe-area-inset-top,env(safe-area-inset-top,0px))) 16px 28px}" +
  ".cocFichaTop{display:flex;align-items:center;gap:8px;min-height:52px}.cocFichaTop div{flex:1;min-width:0}.cocFichaTop small{display:block;font-size:12px;font-weight:700;color:var(--mu)}" +
  ".cocFichaTop b{display:block;font-size:22px;font-weight:800;line-height:1.2}" +
  ".cocHojaIt.enFicha{position:static;box-shadow:none;margin:8px 0 0;border-radius:18px}" +
  ".cocFichaN{margin-top:24px}.cocFichaN h4,.cocFichaForm h4{margin:0;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}" +
  ".cocFichaT{margin-top:8px;background:var(--sf);border-radius:18px;padding:4px 14px}" +
  ".cocFichaF{display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:8px;align-items:center;min-height:40px;border-top:1px solid var(--ln);font-size:14px;font-weight:700}" +
  ".cocFichaF.sinPor{grid-template-columns:1.6fr 1.2fr}.cocFichaF span+span{text-align:right}" +
  ".cocFichaF.cab{border-top:0;min-height:34px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mu)}" +
  ".cocFichaF.sub span:first-child{padding-left:12px;font-weight:600;color:var(--mu)}.cocFichaF i{font-style:normal;font-weight:600;color:var(--mu)}" +
  ".cocFichaFoto{display:block;width:100%;border-radius:16px;margin-top:12px}" +
  ".cocFichaAcc{margin-top:16px}.cocFichaForm{margin-top:24px}" +
  ".cocFotoBtn{display:flex!important;align-items:center;justify-content:center;gap:8px;min-height:48px;border-radius:14px;background:var(--sf2);color:var(--fg)!important;font-size:15px!important;font-weight:800!important;cursor:pointer}" +
  ".cocFotoBtn svg{width:18px;height:18px}" +
  /* ---- v2.49 subpestañas de Nutrición ---- */
  ".ntSubs{margin-top:12px}.ntSubs button[aria-pressed=true]{background:var(--fg);color:var(--bg)}" +
  ".ntVista{margin-top:16px}.ntCaja{background:var(--sf2);border-radius:18px;padding:12px 14px;margin-top:12px}" +
  ".ntCap{margin:24px 0 6px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}" +
  ".ntEnergia{padding:14px}.ntBig{display:flex;align-items:baseline;gap:8px;margin-top:4px}.ntBig b{font-size:40px;font-weight:800;letter-spacing:-.02em;line-height:1}" +
  ".ntBig span{font-size:13px;font-weight:600;color:var(--mu)}.ntBarra{height:10px;margin-top:10px}" +
  ".ntMacros{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}.ntMacros div{background:var(--sf);border-radius:12px;padding:8px 10px}" +
  ".ntMacros small{display:block;font-size:12px;font-weight:600;color:var(--mu)}.ntMacros b{display:block;font-size:17px;font-weight:800}" +
  ".ntBigTxt{margin:0;font-size:22px;font-weight:800}.ntNav{margin-top:0}" +
  ".ntTiras{padding-top:2px}.ntCaja .ngTiraB,.ntCaja .ngCobB{background:var(--sf)}" +
  /* ---- v2.48 suplementos ---- */
  ".ntTabla.conSupl .ntFila{grid-template-columns:1.4fr .7fr .7fr .7fr 1fr .6fr;font-size:13px}" +
  ".ntSupl{font-weight:800}" +
  ".ntUL{color:var(--fg)}" +
  ".ntSuplIt{width:100%;display:flex;align-items:center;gap:10px;min-height:56px;padding:6px 0!important;background:none;color:var(--fg);text-align:left;border-top:1px solid var(--ln);border-radius:0!important}" +
  ".ntSuplIt span{flex:1;min-width:0}.ntSuplIt b{display:block;font-size:15px}.ntSuplIt small{display:block;font-size:13px;font-weight:600;color:var(--mu)}" +
  ".ntSuplIt small.ntAviso{color:var(--fg);font-weight:700}.ntSuplIt svg{width:16px;height:16px;color:var(--mu)}" +
  ".ntSuplSec .cocBtn{margin-top:8px;width:100%}.ntSuplL{list-style:none;margin:8px 0 0;padding:0}" +
  "@media (prefers-reduced-motion:reduce){.cocFilaZin{transition:none}}";
function ponCSS() {
  if (document.getElementById("cocCss")) return;
  var st = document.createElement("style"); st.id = "cocCss"; st.textContent = CSS + (raiz.NutriGraficas ? raiz.NutriGraficas.CSS : ""); document.head.appendChild(st);
}

/* --------------------------------- datos --------------------------------- */
var RJ = lee(K_RECETAS, null) || { t: 0, lista: [], json: {} };
var cargando = null;
function recetas(cb) {                     // el indice y las recetas de Copiloto Cocina, con copia para sin red
  if (cargando) return cargando.then(cb);
  if (RJ.lista.length && Date.now() - RJ.t < 10 * 60e3) { if (cb) cb(); return Promise.resolve(); }
  cargando = fetch(RECETAS_URL + "index.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw r.status; return r.json(); })
    .then(function (idx) {
      return Promise.all(idx.map(function (x) {
        return fetch(RECETAS_URL + encodeURIComponent(x.id) + ".json", { cache: "no-store" })
          .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
      })).then(function (js) {
        var json = {}; js.forEach(function (j) { if (j && j.id) json[j.id] = j; });
        RJ = { t: Date.now(), lista: idx, json: json }; guarda(K_RECETAS, RJ);
      });
    }).catch(function () {}).then(function () { cargando = null; });
  return cargando.then(cb);
}
var NOTA = lee(K_NOTA, null), pidiendoNota = null;   // {t, texto, fecha} | {t, error}
function nota(conf, cb) {                    // la nota de la despensa, por el Worker (/despensa)
  if (CAJA) { if (cb) cb(); return; }          // en la prueba, la nota es la de ejemplo
  if (!conf || !conf.url || !conf.key) { if (cb) cb(); return; }
  if (NOTA && Date.now() - NOTA.t < 5 * 60e3) { if (cb) cb(); return; }
  if (pidiendoNota) return;
  pidiendoNota = fetch(conf.url.replace(/\/+$/, "") + "/despensa", { headers: { "X-Copiloto-Key": conf.key }, cache: "no-store" })
    .then(function (r) { return r.json().catch(function () { return { error: "http " + r.status }; }); })
    .then(function (j) {
      if (j && j.texto) NOTA = { t: Date.now(), texto: j.texto, fecha: j.fecha || null };
      else NOTA = { t: Date.now(), texto: NOTA && NOTA.texto || "", error: (j && j.error) || "sin_datos" };
      guarda(K_NOTA, NOTA);
    }, function () { NOTA = NOTA || { texto: "" }; NOTA.t = Date.now(); NOTA.sinRed = true; })   // se reintenta a los 5 min
    .then(function () { pidiendoNota = null; if (cb) cb(); });
}
function cambios() { return lee(K_CAMBIOS, []); }
function nuevoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function apunta(cb) { cb.id = cb.id || nuevoId(); cb.t = cb.t || Date.now(); var L = conId(cambios()); L.push(cb); guarda(K_CAMBIOS, L.slice(-400)); subeLuego(); return cb; }
function desapunta(id) {                     // desmarcar: queda borrado (asi tambien se borra en el otro sitio)
  var L = conId(cambios()); L.forEach(function (x) { if (x.id === id) { x.borrado = true; x.tb = Date.now(); } });
  guarda(K_CAMBIOS, L); subeLuego();
}
// lo que apuntas tu en la lista de la compra: [{id, t, txt, borrado}]
function lista() { return lee(K_LISTA, []); }
function aLista(txt) {
  txt = String(txt || "").replace(/\s+/g, " ").trim(); if (!txt) return;
  var L = lista(), k = Rc().ingrediente(txt).clave;
  if (L.some(function (x) { return !x.borrado && Rc().ingrediente(x.txt).clave === k; })) return;
  L.push({ id: nuevoId(), t: Date.now(), txt: mayus1(txt) }); guarda(K_LISTA, L.slice(-300)); subeLuego();
}
// tus alimentos (alimentos.js): con tu nombre; se suben con lo demas
function alimentos() { return lee(K_ALIM, []); }
function guardaAli(A) { guarda(K_ALIM, Al().mezcla(alimentos(), [A])); subeLuego(); return A; }
function aliDe(nombre) { return nombre ? Al().porNombre(alimentos(), nombre) : null; }
function deLista(id) { var L = lista(); L.forEach(function (x) { if (x.id === id) { x.borrado = true; x.tb = Date.now(); } }); guarda(K_LISTA, L); subeLuego(); }
/* Los cambios y la lista, tambien en el Worker (/cocina): el movil y Chrome ven lo mismo. Se
   sube al cambiar algo (1,5 s despues) y se baja al abrir la pestaña. Sin red, espera.   */
var SUBE = null, subiendo = false;
function subeLuego() { if (CAJA) return; clearTimeout(SUBE); SUBE = setTimeout(sincroniza, 1500); }
function sincroniza() {
  if (CAJA) return;
  var conf = (CTX && CTX.conf) || (MCTX && MCTX.conf);
  if (!conf || !conf.url || !conf.key || subiendo || typeof fetch !== "function") return;
  subiendo = true;
  var antes = JSON.stringify([conId(cambios()), lista(), alimentos()]), cuerpo = { cambios: conId(cambios()), lista: lista(), alimentos: alimentos() };
  fetch(conf.url.replace(/\/+$/, "") + "/cocina", { method: "POST", cache: "no-store",
    headers: { "X-Copiloto-Key": conf.key, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo) })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!j || !Array.isArray(j.cambios)) return;
      var C2 = mezcla(cambios(), j.cambios, 400), L2 = mezcla(lista(), j.lista || [], 300);   // y lo de aqui mientras tanto
      var A2 = Al().mezcla(alimentos(), j.alimentos || []);
      guarda(K_CAMBIOS, C2); guarda(K_LISTA, L2); guarda(K_ALIM, A2);
      if (JSON.stringify([C2, L2, A2]) !== antes && enTab()) pinta();
    }, function () {})
    .then(function () { subiendo = false; });
}

/* --------------------------- todo lo de un momento ---------------------------
   Las comidas del calendario (pasadas y futuras), la despensa y lo apuntado, a la hora de
   ahora (no la de cuando se abrio la pestaña).                                           */
function ahoraOpts() { var t = Date.now(); return { hoy: isoDe(t), ahora: hmDe(t), ahoraMs: t }; }
function estado(dia) {
  var o = ahoraOpts(), Rs = comidasDe(dia), D = NOTA && NOTA.texto ? Dp().despensa(NOTA.texto) : null, CB = cambios();
  var hayBase = Dp().hayBase(D, CB);
  return { o: o, Rs: Rs, D: D, CB: CB, hayBase: hayBase, H: hayBase ? Dp().casa(D, CB, Rs, o) : null };
}

/* ------------------------------ la pantalla ------------------------------ */
// CTX: el de la pestaña Cocina. MCTX: el de quien abrio el modo paso a paso o el escaner (la
// pestaña, o HOY), para su marca en el historial.
var CTX = null, MCTX = null, SEL = null, cont = null, RELOJ = null;
function enTab() { return !!(cont && document.body.contains(cont) && CTX && (!CTX.activa || CTX.activa())); }
// v2.46: Recetas ya no es una pestaña (las de "Receta: …" siguen abriendo su paso a paso) y Despensa se llama Casa
var SUBS = [["semana", "Semana"], ["comprar", "Comprar"], ["tengo", "Casa"], ["nutri", "Nutrición"]];
var CANT = null, ORIGEN = null, SUB = "semana", ZONA = null, TOCADO = null, ANADIR = false, ENTRA = 0, RECUENTO = null, COPIA = null, PASADA = null;
var CORRIGE = null, PCANT = null, ABIERTA = null, TERMINA = false;
var FFORM = false, FICHAX = null, FSUPL = null;   // v2.48: la ficha abierta desde Nutricion o Casa (suplementos) y el formulario de uno   // v2.47: rellenando la ficha a mano
var NSUB = "hoy";   // v2.49: la subpestaña de Nutrición
var NSUBS = [["hoy", "Hoy"], ["semana", "Semana"], ["tendencias", "Tendencias"], ["fases", "Fases"], ["entreno", "Entreno"], ["micros", "Micros"]];
var NDIA = 0, NSEMANA = false, NPERFIL = false, NPORQUE = null, NMAS = false;   // v2.45: el dia que miras (0 = hoy), las hojas   // TERMINA: la hoja "Terminar compra" (v2.42)   // v2.40: la comida que corriges, la compra a la que cambias la cantidad, la fila deslizada
function subDe(s) { if (s === "despensa" || s === "casa") s = "tengo"; if (s === "recetas") s = "semana"; return s === "ahora" ? "semana" : SUBS.some(function (x) { return x[0] === s; }) ? s : "semana"; }
/* La Casa de prueba (Ajustes): la pestaña Cocina entera con los datos de ejemplo de
   cocina-prueba.js, en la CAJA, con "SIMULACIÓN · no cuenta". op = {marca, atrasManual, activa, alTerminar} */
var REAL = null;
API.pintaPrueba = function (c, op) {
  var X = raiz.CocinaPrueba; if (!X || !X.casa) { c.innerHTML = '<p class="cocVacio">Falta un archivo de la app. Actualízala.</p>'; return; }
  var o = ahoraOpts(), ej = X.casa(o.hoy, o.ahoraMs);
  if (!CAJA) REAL = { NOTA: NOTA };
  CAJA = {}; CAJA[K_CAMBIOS] = ej.cambios; CAJA[K_LISTA] = ej.lista; CAJA[K_ALIM] = ej.alimentos;
  CAJA[K_PERFIL] = ej.perfil; CAJA[K_REG] = ej.registro; CAJA[K_SEMANAS] = {}; CAJA[K_SUPL] = ej.suplementos || [];
  NOTA = { t: Date.now(), texto: ej.nota };
  CAJA.__fin = op && op.alTerminar;
  API.pinta(c, { dia: ej.dia, hoy: o.hoy, ahora: o.ahora, conf: null, marca: op && op.marca, atrasManual: op && op.atrasManual,
                 activa: op && op.activa, sub: "tengo", prueba: true, tipoDia: ej.tipoDia });
};
// salir de la prueba: se tira la CAJA y vuelve la nota de verdad
API.salPrueba = function () {
  if (!CAJA) return;
  CAJA = null; if (REAL) NOTA = REAL.NOTA; REAL = null;
  if (ESC) cierraEscaner(true);
  var t = document.getElementById("cocToast"); if (t) t.hidden = true;
};
API.enPrueba = function () { return !!CAJA; };
API.pinta = function (c, ctx) {
  if (CAJA && !(ctx && ctx.prueba)) API.salPrueba();   // la Cocina de verdad nunca ve la caja
  ponCSS(); cont = c; CTX = ctx || {}; MCTX = CTX;
  SUB = subDe(CTX.sub); TOCADO = null; ANADIR = false; ZONA = null; RECUENTO = null; COPIA = null; PASADA = null;
  SEL = CTX.sel || null;                     // se abre con una comida de la linea del dia o de HOY
  gestos(c);
  pinta();
  recetas(function () { if (cont === c && enTab()) pinta(); });
  nota(CTX.conf, function () { if (cont === c && enTab()) pinta(); });
  sincroniza();
  // lo de ahora cambia con la hora: cada minuto, mientras la pestaña siga abierta
  clearInterval(RELOJ);
  RELOJ = setInterval(function () {
    if (!enTab()) { clearInterval(RELOJ); RELOJ = null; return; }
    if (document.visibilityState === "visible" && !RECUENTO && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) pinta();
  }, 60000);
};
API.sub = function (s) { if (enTab()) cambiaSub(subDe(s)); else SUB = subDe(s); return SUB; };
function cambiaSub(s) {
  if (s === SUB) return;
  var ks = SUBS.map(function (x) { return x[0]; });
  ENTRA = ks.indexOf(s) > ks.indexOf(SUB) ? 1 : -1; SUB = s; TOCADO = null; CANT = null; ORIGEN = null; ANADIR = false; RECUENTO = null; COPIA = null; PASADA = null;
  pinta(); cont.scrollTop = 0;
}
function pinta() {
  var c = cont; if (!c) return;
  var E = estado(CTX.dia);
  var LC = listaCompra(E);
  var y = c.scrollTop, foco = document.activeElement && document.activeElement.id; c.innerHTML = "";
  if (CAJA) {
    var bn = c.appendChild(el("div", "cocSim", '<b>SIMULACIÓN · no cuenta</b><span>Datos de ejemplo: no toca tu despensa, ni el calendario, ni Comprar.</span>'));
    var fin = el("button", "", "Terminar");
    fin.addEventListener("click", function () { var f = CAJA && CAJA.__fin; API.salPrueba(); if (f) f(); });
    bn.appendChild(fin);
  }
  c.appendChild(barra(LC.n));
  var pag = SUB === "comprar" ? compra(E, LC) : SUB === "tengo" ? tengo(E) : SUB === "nutri" ? nutri(E, LC) : semana(E);
  if (ENTRA) { pag.classList.add(ENTRA > 0 ? "cocDer" : "cocIzq"); ENTRA = 0; }
  c.appendChild(pag);
  if (FICHAX) c.appendChild(fichaAlimento(FICHAX));
  c.scrollTop = y;
  if (foco && document.getElementById(foco)) document.getElementById(foco).focus();
}
function barra(nCompra) {
  var nav = el("nav", "cocTabs"), b = nav.appendChild(el("div", "cocSeg")); b.setAttribute("role", "tablist"); b.setAttribute("aria-label", "Cocina");
  SUBS.forEach(function (s) {
    var x = el("button", "", esc(s[1]) + (s[0] === "comprar" && nCompra ? '<b>' + nCompra + '</b>' : ""));
    x.setAttribute("role", "tab"); x.setAttribute("aria-selected", SUB === s[0]);
    x.addEventListener("click", function () { cambiaSub(s[0]); });
    b.appendChild(x);
  });
  return nav;
}
// deslizar a los lados: a la izquierda, la siguiente; a la derecha, la anterior. Los bordes son el
// "atras" de Android y las zonas de Tengo se desplazan solas: ahi no.
function gestos(c) {
  if (c.cocGestos) return; c.cocGestos = true;
  var x0 = null, y0 = 0, t0 = 0;
  c.addEventListener("touchstart", function (e) {
    x0 = null;
    if (!enTab() || e.touches.length !== 1) return;
    var t = e.touches[0], w = window.innerWidth || 400;
    if (t.clientX < 28 || t.clientX > w - 28) return;
    if (e.target.closest && e.target.closest(".cocChips,.cocFilasZ,input,textarea,select")) return;
    x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
  }, { passive: true });
  c.addEventListener("touchend", function (e) {
    if (x0 == null || !enTab()) return;
    var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.6 || Date.now() - t0 > 900) return;
    var ks = SUBS.map(function (x) { return x[0]; }), j = ks.indexOf(SUB) + (dx < 0 ? 1 : -1);
    if (j >= 0 && j < ks.length) cambiaSub(ks[j]);
  }, { passive: true });
  c.addEventListener("touchcancel", function () { x0 = null; }, { passive: true });
}
var TOAST = null;
function aviso(t) {
  var a = document.getElementById("cocToast") || document.body.appendChild(el("div"));
  a.id = "cocToast"; a.className = "cocToast"; a.textContent = t; a.hidden = false;
  clearTimeout(TOAST); TOAST = setTimeout(function () { a.hidden = true; }, 3200);
}

/* ------------------------- el paso a paso (cocina-modo.js) ------------------------- */
// lo que abre el paso a paso de una comida: su receta de Copiloto Cocina, sus pasos o, si es un
// tupper, recalentar (con los pasos del evento o los de la receta)
function modoDe(R) {
  if (!R || R.tipo !== "comida") return null;
  var rec = recetaDe(R, RJ.lista), J = rec && RJ.json[rec.id];
  if (J && !recalienta(R)) return { receta: J, comida: R };
  if (pasosDe(R).length) return { comida: R };
  var rc = J && J.meta && J.meta.reparto && J.meta.reparto.recalentar;
  if (rc && rc.length) return { comida: R, pasos: rc.map(function (t) {
    var ti = Rc().tiempo(t);
    return { titulo: String(t).replace(/[.:].*$/, "").slice(0, 60), detalle: t, duracion_s: ti.duracion_s, avisos: ti.avisos || [], usa: [], tipo: "paso" };
  }) };
  return null;
}
function numPasos(q) { return q.receta ? (q.receta.pasos || []).length : (q.pasos || pasosDe(q.comida)).length; }
function ctxModo(base) {
  base = base || CTX || {};
  if (CAJA) return { marca: base.marca, atrasManual: base.atrasManual, prueba: { vel: 1 },   // el paso a paso de la prueba tampoco guarda nada
                     repinta: function () { if (enTab()) pinta(); } };
  return {
    marca: base.marca, atrasManual: base.atrasManual,
    repinta: function () { if (enTab()) pinta(); if (base.repinta && base !== CTX) base.repinta(); },
    // al acabar: lo gastado (o "hecha" sin gastar nada) para que Tengo y Comprar lo sepan
    alTerminar: function (info) {
      if (!info || info.guia) return;
      if (info.gastado && info.gastado.length) apunta({ tipo: "gasto", uid: info.uid || null, de: info.titulo, items: info.gastado });
      else if (info.uid) apunta({ tipo: "hecho", uid: info.uid });
    }
  };
}
function abreModo(q, base) {
  var M = Modo(); if (!M || !q) return;
  MCTX = base || CTX;
  if (!M.abre(q, ctxModo(MCTX))) aviso("Esta comida no tiene pasos.");
}
function progresoDe(q) { var M = Modo(); try { return M && q ? M.progreso(q) : null; } catch (e) { return null; } }

/* ------------------------------ la tarjeta de lo que toca ------------------------------
   La misma de HOY (naranja): lo que toca ahora o lo siguiente, lo que falta y un botón.   */
function faltaDe(R, H) {
  var I = (R.ingredientes || []).filter(function (g) { return !g.basico && !g.hecho && g.clave; });
  if (!I.length) return { n: 0, no: [], duda: [] };
  if (!H) return { n: I.length, no: [], duda: [], sinDatos: true };
  var no = [], duda = [];
  I.forEach(function (g) {
    if (g.deCasa) return;
    var e = Dp().estadoDe(g, H);
    if (e.estado === "no" && !g.opcional) no.push(g); else if (e.estado === "dudoso") duda.push(g);
  });
  return { n: I.length, no: no, duda: duda };
}
function nombresDe(L) {
  return L.slice(0, 2).map(function (g) { return Rc().corto({ ver: g.ver, base: g.base, nombre: g.nombre, c: null }).toLowerCase(); }).join(" y ") +
    (L.length > 2 ? " y " + (L.length - 2) + " más" : "");
}
function resumenTxt(R, H) {
  var f = faltaDe(R, H);
  if (!f.n) return "";
  if (f.sinDatos) return f.n + (f.n === 1 ? " ingrediente" : " ingredientes");
  if (f.no.length) return "Falta " + nombresDe(f.no);
  if (f.duda.length) return "¿Te queda " + nombresDe(f.duda) + "?";
  return "Todo en casa · " + f.n + (f.n === 1 ? " ingrediente" : " ingredientes");
}
function tarjeta(R, E, cual, base) {
  var o = E.o, q = modoDe(R), pr = q ? progresoDe(q) : null, n = q ? numPasos(q) : 0;
  var est = R.tipo === "comida" || R.tipo === "fuera" ? Dp().estadoComida(R, E.CB, o) : "proxima";
  var cuando = R.fecha !== o.hoy ? diaTxt(R.fecha, o.hoy) : est === "ahora" ? "Ahora" : "Luego";
  var ojo = pr ? "Cocinando · " + pr.texto : [cuando, etiquetaDe(R), R.hora, R.fecha === o.hoy && est === "proxima" && R.hora ? enCuanto(R.hora, o.ahora) : ""].filter(Boolean).join(" · ");
  if (cual === "elegida") ojo = "Elegida · " + ojo;
  var meta = [];
  if (R.raciones) meta.push(R.raciones + (R.raciones === 1 ? " ración" : " raciones"));
  if (R.etiqueta && !/^(desayuno|comida|cena|merienda|media mañana)$/i.test(R.etiqueta)) meta.push(R.etiqueta);
  if (R.minutos) meta.push("~" + R.minutos + " min");
  var tit = R.titulo, largo = tit.length > 26 ? (tit.length > 44 ? " muyLargo" : " largo") : "";
  var art = el("article", "tj cocTj");
  var filas = [];
  if (R.sub) filas.push('<li><span>' + esc(mayus1(R.sub)) + '</span></li>');
  var rs = resumenTxt(R, E.H);
  if (rs) filas.push('<li><span>' + esc(rs) + '</span></li>');
  if (n) filas.push('<li><span>Cómo se hace</span><b>' + n + (n === 1 ? ' paso' : ' pasos') + '</b></li>');
  if (R.tipo === "fuera") filas.push('<li><span>Nada que preparar</span></li>');
  art.innerHTML = '<div class="tjFondo">' + svg("olla") + '</div><div class="tjEye">' + esc(ojo) + '</div><h3 class="tjTit' + largo + '">' + esc(tit) + '</h3>' +
    (meta.length ? '<div class="tjMeta">' + meta.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join("") + '</div>' : "") +
    (filas.length ? '<ul class="tjGym">' + filas.join("") + '</ul>' : "");
  if (q) {
    var go = el("button", "tjGo", svg("olla") + esc(pr ? "Seguir · " + pr.texto.toLowerCase() : q.receta ? "Cocinar paso a paso" : "Hacerlo paso a paso"));
    go.addEventListener("click", function (e) { e.stopPropagation(); abreModo(q, base); });
    art.appendChild(go);
  }
  return art;
}

/* ------------------------------ Semana ------------------------------
   Arriba, en grande, lo que toca ahora (o lo siguiente). Debajo, la semana por días: lo hecho
   y lo pasado en gris, lo de ahora marcado. Un toque abre el paso a paso.                  */
function elegida(E) {
  if (!SEL) return null;
  var R = E.Rs.filter(function (x) { return x.uid === SEL; })[0];
  var est = R && (R.tipo === "comida" || R.tipo === "fuera") ? Dp().estadoComida(R, E.CB, E.o) : null;
  if (!R || (est !== "ahora" && est !== "proxima")) { SEL = null; return null; }
  return R;
}
function semana(E) {
  var o = E.o, wrap = el("div", "cocSemana");
  var sel = elegida(E), toca = sel || Dp().queToca(E.Rs, E.CB, o);
  if (toca) wrap.appendChild(tarjeta(toca, E, sel ? "elegida" : ""));
  var s = wrap.appendChild(el("section", "cocSec"));
  var L = E.Rs.filter(function (R) { return R.fecha >= o.hoy; }).sort(function (a, b) { return (a.fecha + (a.hora || "99")) < (b.fecha + (b.hora || "99")) ? -1 : 1; });
  if (!L.length) {
    if (!toca) wrap.insertBefore(el("section", "cocSec", '<p class="cocLead">Nada en el plan</p><p class="sub">Cuando Claude meta las comidas en el calendario <b>Comidas</b>, salen aquí.</p>'), s);
    s.remove(); return wrap;
  }
  s.appendChild(el("h3", "", "Esta semana"));
  var dia = null;
  L.slice(0, 24).forEach(function (R) {
    if (R.fecha !== dia) { dia = R.fecha; s.appendChild(el("h4", "cocDia", esc(diaTxt(R.fecha, o.hoy)))); }
    s.appendChild(fila(R, E, toca));
  });
  if (PASADA) wrap.appendChild(hojaPasada(PASADA, E));
  return wrap;
}
function fila(R, E, toca) {
  var o = E.o, comidaLike = R.tipo === "comida" || R.tipo === "fuera";
  var est = comidaLike ? Dp().estadoComida(R, E.CB, o) : (R.fecha < o.hoy || (R.fecha === o.hoy && (R.fin || R.hora || "00:00") <= o.ahora) ? "pasada" : "proxima");
  var q = modoDe(R), n = q ? numPasos(q) : 0, esToca = toca && toca.uid === R.uid;
  var info = [];
  if (est === "hecha") info.push("Hecha");
  else if (est === "saltada") info.push("No la hiciste");
  else if (esToca && est === "ahora") info.push("Ahora");
  if (R.sub) info.push(R.sub);
  else if (R.tipo === "comida" && est !== "hecha" && est !== "pasada") { var rs = resumenTxt(R, E.H); if (/^(Falta|¿Te queda)/.test(rs)) info.push(rs); }
  if (n && info.length < 2) info.push(n + (n === 1 ? " paso" : " pasos"));
  if (R.tipo === "fuera") info.push("Nada que preparar");
  var ico = R.tipo === "aviso" ? svg("campana") : R.tipo === "compra" ? svg("carro") : (est === "hecha" ? svg("tick") : "");
  var abre = q || R.tipo === "compra";
  var cls = "cocFila t-" + R.tipo + " e-" + est + (esToca ? " sel" : "");
  var b = el(abre ? "button" : "div", cls,
    '<time><b>' + esc(R.hora || "") + '</b>' + esc(etiquetaDe(R)) + '</time><span>' + (ico ? '<i class="cocIco">' + ico + '</i>' : "") + esc(R.titulo) +
    (info.length ? '<small>' + esc(info.slice(0, 2).join(" · ")) + '</small>' : "") + '</span>' +
    (abre ? '<em class="cocIr">' + svg("der") + '</em>' : '<em></em>'));
  if (R.tipo === "compra") b.addEventListener("click", function () { cambiaSub("comprar"); });
  else if (q) b.addEventListener("click", function () {
    if (est === "pasada" || est === "hecha" || est === "saltada") { PASADA = R.uid; pinta(); return; }
    abreModo(q);
  });
  return b;
}
// una comida que ya paso: ver su paso a paso, o decir que no la hiciste (no gasta nada)
function hojaPasada(uid, E) {
  var R = E.Rs.filter(function (x) { return x.uid === uid; })[0]; if (!R) { PASADA = null; return el("div"); }
  var est = Dp().estadoComida(R, E.CB, E.o), q = modoDe(R);
  var h = el("div", "cocHojaIt", '<div><b>' + esc(R.titulo) + '</b><small>' + esc(diaTxt(R.fecha, E.o.hoy) + " · " + (R.hora || "") +
    (est === "hecha" ? " · hecha" : est === "saltada" ? " · no la hiciste" : " · ya pasó")) + '</small></div>');
  var fila2 = el("div", "cocHojaBot");
  var ver = el("button", "", "Ver el paso a paso"), no = el("button", "", est === "saltada" ? "Sí la hice" : "No la hice"), x = el("button", "cocHojaX", svg("cerrar"));
  x.setAttribute("aria-label", "Cerrar");
  ver.disabled = !q;
  ver.addEventListener("click", function () { PASADA = null; pinta(); abreModo(q); });
  no.addEventListener("click", function () {
    if (est === "saltada") vigentes(cambios()).filter(function (cb) { return cb.tipo === "saltada" && cb.uid === uid; }).forEach(function (cb) { desapunta(cb.id); });
    else { apunta({ tipo: "saltada", uid: uid }); aviso("Apuntado: no se gasta nada de esa comida."); }
    PASADA = null; pinta();
  });
  x.addEventListener("click", function () { PASADA = null; pinta(); });
  fila2.appendChild(ver); fila2.appendChild(no); fila2.appendChild(x); h.appendChild(fila2);
  return h;
}

/* ------------------------------ Comprar (v2.42) ------------------------------
   Lo que piden las comidas que quedan (despensa.js) y lo que apuntas tú, por PASILLO del súper.
   Cada cosa dice los DÍAS en que se usa ("lun · mar") y su prisa; con una próxima ida al súper,
   "Comprar ya" y "Puede esperar". Tocar el nombre: de qué platos sale y la cuenta. La casilla la
   mete en el carro (y en casa); "Terminar compra" pone cuánto has comprado de verdad, y eso pasa
   al "Por confirmar" de la Despensa.                                                          */
function listaCompra(E) {
  var vivos = vigentes(E.CB), F = E.hayBase ? Dp().faltan(E.D, E.CB, E.Rs, E.o) : null, items = [];
  var carro = vivos.filter(function (cb) { return cb.tipo === "compra" && cb.lista && !cb.fin && Date.now() - cb.t < 12 * 3600e3; });
  var enCarro = {}; carro.forEach(function (cb) { enCarro[cb.lista] = 1; });
  if (F) F.items.forEach(function (it) { if (!enCarro[it.k]) items.push(it); });
  lista().forEach(function (x) {
    if (x.borrado || enCarro["m:" + x.id]) return;
    var k = Rc().ingrediente(x.txt).clave;
    if (items.some(function (i) { return i.clave === k; })) return;
    items.push({ k: "m:" + x.id, clave: k, ver: x.txt, cant: "", id: x.id, mio: true });
  });
  return { items: items, carro: carro, F: F, n: items.length };
}
// la proxima ida al super (opcional; la de un dia que ya paso no cuenta)
function proxima(hoy) { var p = lee(K_SUPER, null); return p && p >= hoy ? p : null; }
function sumaDia(iso, n) { var p = iso.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2] + n, 12); return isoDe(d.getTime()); }
function filaSuper(o) {
  var p = proxima(o.hoy), d = el("div", "cocSuper", '<span>Próxima ida al súper</span>'), w = d.appendChild(el("div", "cocSuperB"));
  [[null, "Sin fecha"]].concat([0, 1, 2, 3, 4].map(function (i) { var f = sumaDia(o.hoy, i); return [f, i === 0 ? "Hoy" : i === 1 ? "Mañana" : mayus1(Dp().diaCorto(f))]; }))
    .forEach(function (x) {
      var b = el("button", "", esc(x[1])); b.setAttribute("aria-pressed", String(p === x[0]));
      b.addEventListener("click", function () { guarda(K_SUPER, x[0]); pinta(); });
      w.appendChild(b);
    });
  return d;
}
// "1 cebolla", "400 g de contramuslos": lo que se mete en el carro (si la cantidad es sencilla)
function conSuCant(it) { return it.cant && !it.dudoso && /^[\d½¼¾,.]+(\s+[a-zñ]+)?$/i.test(it.cant) ? conCant(it.cant, it.ver) : it.ver; }
function filaCompra(it, o) {
  var li = el("li", "cocItem" + (it.dudoso ? " duda" : ""));
  var tk = el("button", "cocTick", '<i></i>');
  tk.setAttribute("aria-pressed", "false"); tk.setAttribute("aria-label", "Al carro: " + it.ver);
  tk.addEventListener("click", function () {       // al carro: ya esta en casa (con la cantidad de la receta, hasta Terminar compra)
    apunta({ tipo: "compra", items: [conSuCant(it)], zona: Dp().zonaPara(it.ver), lista: it.k, pide: it.cant || "" });
    if (it.mio) deLista(it.id);
    pinta();
  });
  li.appendChild(tk);
  var bajo = it.dudoso ? '<small>¿Te queda? ' + esc(it.razon || "") + '</small>'
    : '<small>' + (it.diasTxt ? esc(it.diasTxt) + ' · ' : it.mio ? "Lo apuntaste tú · " : "") + '<b class="' + (it.urge ? "urge" : "") + '">' + esc(it.urgTxt || "") + '</b></small>';
  var b = el("button", "cocMarca cocNom", '<span>' + esc(it.ver + (it.dudoso && it.cant ? " · " + it.cant : "")) + bajo + '</span><em>' + esc(it.dudoso ? "" : it.cant || "") + '</em>');
  b.setAttribute("aria-expanded", ORIGEN === it.k ? "true" : "false"); b.setAttribute("aria-label", "De dónde sale: " + it.ver);
  b.addEventListener("click", function () { ORIGEN = ORIGEN === it.k ? null : it.k; pinta(); });
  li.appendChild(b);
  if (it.dudoso) {
    var mq = el("button", "cocQueda", "Me queda");
    mq.addEventListener("click", function () { apunta({ tipo: "hay", items: [it.ver] }); aviso("Apuntado: te queda " + it.ver.toLowerCase() + "."); pinta(); });
    li.appendChild(mq);
  } else if (it.mio) {
    var q = el("button", "cocQuita", svg("cerrar")); q.setAttribute("aria-label", "Quitar de la lista");
    q.addEventListener("click", function () { deLista(it.id); pinta(); });
    li.appendChild(q);
  }
  if (ORIGEN === it.k) {                            // un toque mas adentro: de que platos sale y la cuenta
    var lineas = it.mio ? ["Lo apuntaste tú: no sale de ninguna comida."] : Dp().origenDe(it, o.hoy);
    li.appendChild(el("div", "cocOrigen", lineas.map(function (t, i) { return "<p" + (i === lineas.length - 1 && !it.mio ? ' class="suma"' : "") + ">" + esc(t) + "</p>"; }).join("")));
  }
  return li;
}
function compra(E, LC) {
  var s = el("section", "cocSec cocComprar"), n = LC.items.length, F = LC.F, o = E.o;
  var sub = !E.hayBase ? (NOTA && NOTA.error ? "No se puede leer lo que tienes en casa: lo de las comidas sale cuando se pueda. Lo que apuntes, aquí."
                                             : NOTA && NOTA.sinRed ? "Sin conexión: lo de las comidas sale cuando vuelva la red." : "Leyendo lo que tienes…")
          : !F || !F.n ? "No quedan comidas en el plan. Lo que apuntes, aquí."
          : "Para " + (F.n === 1 ? "la comida que queda" : "las " + F.n + " comidas que quedan") + ", hasta el " + F.hastaTxt;
  s.innerHTML = '<p class="cocLead">' + (n ? n + (n === 1 ? " cosa" : " cosas") + " que comprar" : "Nada que comprar") + '</p><p class="sub">' + esc(sub) + '</p>';
  if (n || LC.carro.length) s.appendChild(filaSuper(o));
  if (!n && E.hayBase && F && F.n) s.appendChild(el("p", "cocVacio", "Lo de las comidas ya está en casa. Si quieres algo más, apúntalo."));
  if (n) {
    var PP = Dp().porPasillo(LC.items, { hoy: o.hoy, proxima: proxima(o.hoy), zonaDe: function (nom) { var A = aliDe(nom); return A && A.zona; } });
    PP.grupos.forEach(function (g) {
      if (g.titulo) s.appendChild(el("h3", "cocGrupoC" + (g.titulo === "Puede esperar" ? " luego" : ""), esc(g.titulo) + ' <b>' + g.n + '</b>'));
      g.pasillos.forEach(function (pz) {
        s.appendChild(el("h4", "cocPasillo", esc(pz.pasillo) + ' <b>' + pz.items.length + '</b>' + (pz.pasillo === "Otros" ? '<small>sin pasillo conocido</small>' : "")));
        var ul = el("ul", "cocCompra");
        pz.items.forEach(function (it) { ul.appendChild(filaCompra(it, o)); });
        s.appendChild(ul);
      });
    });
  }
  s.appendChild(formAnadir("cocAnadeCompra", "Añadir a la lista", function (t) { aLista(t); }));
  if (LC.carro.length) {
    var c = el("div", "cocZona", '<h4>En el carro<small>ya en casa · toca para sacarlo</small></h4>'), uc = el("ul", "cocCompra");
    LC.carro.forEach(function (cb) {
      var g0 = Rc().ingrediente((cb.items || [])[0] || ""), nom = mayus1(g0.ver || g0.base || (cb.items || []).join(", "));
      var li = uc.appendChild(el("li", "cocCarro"));
      var b = el("button", "cocMarca", '<i>' + svg("tick") + '</i><span>' + esc(nom) + '</span><em>' + esc(g0.c ? Rc().cantTxt(g0.c) : "") + '</em>');
      b.setAttribute("aria-pressed", "true");
      b.addEventListener("click", function () { desapunta(cb.id); pinta(); });
      li.appendChild(b);
    });
    c.appendChild(uc); s.appendChild(c);
    var tb = el("button", "cocGo cocTermina", svg("carro") + "Terminar compra · " + LC.carro.length + (LC.carro.length === 1 ? " en el carro" : " en el carro"));
    tb.addEventListener("click", function () { TERMINA = true; pinta(); });
    s.appendChild(tb);
  }
  s.appendChild(botonEscaner());
  if (TERMINA && LC.carro.length) s.appendChild(hojaTermina(LC.carro));
  else TERMINA = false;
  return s;
}
// Terminar compra: cuánto has comprado de verdad de cada cosa del carro; pasa a "Por confirmar"
function hojaTermina(carro) {
  var h = el("div", "cocHojaIt cocHojaTermina");
  h.appendChild(el("div", "", '<b>Terminar compra · ' + carro.length + '</b><small>Pon cuánto has comprado. Entra en casa y lo confirmas en Casa → Por confirmar.</small>'));
  var ul = h.appendChild(el("ul", "cocTerm")), filas = [];
  carro.forEach(function (cb) {
    var g0 = Rc().ingrediente((cb.items || [])[0] || ""), nom = mayus1(g0.ver || g0.base || (cb.items || []).join(", "));
    var li = ul.appendChild(el("li", "", '<span><b>' + esc(nom) + '</b><small>' + esc((cb.zona || "") + (cb.pide ? " · pedía " + cb.pide : "")) + '</small></span>'));
    var inp = el("input"); inp.type = "text"; inp.autocomplete = "off"; inp.value = g0.c ? Rc().cantTxt(g0.c) : ""; inp.placeholder = "Cuánto";
    inp.setAttribute("aria-label", "Cuánto has comprado de " + nom);
    li.appendChild(inp);
    filas.push({ cb: cb, nom: nom, inp: inp });
  });
  var bot = el("div", "cocHojaBot"), ok = el("button", "cocHojaSi", "Meter en casa"), no = el("button", "", "Cancelar");
  ok.addEventListener("click", function () {
    filas.forEach(function (f) {
      var q = f.inp.value.trim();
      desapunta(f.cb.id);
      apunta({ tipo: "compra", items: [q ? conCant(q, f.nom) : f.nom], zona: f.cb.zona, lista: f.cb.lista, nutri: f.cb.nutri, ali: f.cb.ali, pide: f.cb.pide, fin: 1 });
    });
    TERMINA = false; aviso("En casa. Confírmalo en Casa → Por confirmar."); pinta();
  });
  no.addEventListener("click", function () { TERMINA = false; pinta(); });
  bot.appendChild(ok); bot.appendChild(no); h.appendChild(bot);
  return h;
}
function botonEscaner(corto) {               // lo comprado, con el codigo de barras
  var b = el("button", "cocBtn", svg("barras") + (corto ? "Escanear" : "Escanear lo que has comprado"));
  b.addEventListener("click", function () { MCTX = CTX; abreEscaner(); }); return b;
}
// "6" + "Huevos" -> "6 huevos"; "1 kg" + "Arroz" -> "1 kg de arroz"
function conCant(q, nombre) {
  q = String(q || "").trim(); var n = String(nombre || "").trim();
  if (!q) return n;
  var nl = n.charAt(0).toLowerCase() + n.slice(1);
  return /^[\d½¼¾,.\s]+$/.test(q) ? q + " " + nl : q + " de " + nl;
}
function formCant(id, ph, hecho) {
  var f = el("form", "cocCantF");
  f.innerHTML = '<input id="' + id + '" type="text" autocomplete="off" enterkeyhint="done" placeholder="' + esc(ph) + '" aria-label="' + esc(ph) + '"><button type="submit">Guardar</button>';
  f.addEventListener("submit", function (e) {
    e.preventDefault(); var t = f.querySelector("input").value.trim(); if (!t) { f.querySelector("input").focus(); return; }
    hecho(t); pinta();
  });
  return f;
}
// Añadir a la despensa: qué y cuánto (lo segundo, si quieres; "plátanos 4" en el primero también vale)
function formQueCuanto(hecho) {
  var f = el("form", "cocQueCuanto");
  f.innerHTML = '<input id="cocAnadeTengo" type="text" autocomplete="off" enterkeyhint="next" placeholder="Qué (p. ej. plátanos)" aria-label="Qué has traído">' +
    '<input id="cocAnadeCuanto" type="text" autocomplete="off" enterkeyhint="done" placeholder="Cuánto" aria-label="Cuánto (4, 1 kg, 2 paquetes)">' +
    '<button type="submit" aria-label="Añadir">' + svg("mas") + '</button>';
  var q = f.querySelector("#cocAnadeTengo"), n = f.querySelector("#cocAnadeCuanto");
  q.addEventListener("keydown", function (e) { if (e.key === "Enter" && q.value.trim() && !n.value.trim()) { e.preventDefault(); n.focus(); } });
  // v2.40: mientras escribes, tus alimentos (con tu nombre): un toque y solo falta cuánto
  var sug = el("div", "cocSugs"); sug.hidden = true;
  q.addEventListener("input", function () {
    var t = Rc().norm(q.value); sug.innerHTML = ""; sug.hidden = true;
    if (t.length < 2) return;
    var vistos = {}, L = [];
    Al().vivos(alimentos()).map(function (a) { return a.nombre; }).concat(conocidos()).forEach(function (nom) {
      var k = Rc().norm(nom); if (vistos[k] || k.indexOf(t) < 0) return; vistos[k] = 1; L.push(nom);
    });
    L.slice(0, 4).forEach(function (nom) {
      var b = el("button", "", esc(nom)); b.type = "button";
      b.addEventListener("click", function () { q.value = nom; sug.hidden = true; sug.innerHTML = ""; if (f.alElegir) f.alElegir(nom); n.focus(); });
      sug.appendChild(b);
    });
    sug.hidden = !L.length;
  });
  f.appendChild(sug);
  f.addEventListener("submit", function (e) {
    e.preventDefault(); var t = q.value.trim(); if (!t) { q.focus(); return; }
    hecho(t, n.value.trim()); q.value = ""; n.value = ""; pinta();
    var i = document.getElementById("cocAnadeTengo"); if (i) i.focus();
  });
  return f;
}
// los nombres que ya usas: lo que hay en casa y lo que hubo
function conocidos() { var E = estado(CTX && CTX.dia || []); return E.H ? E.H.todos.map(function (x) { return x.nombre; }) : []; }
function formAnadir(id, ph, hecho) {
  var f = el("form", "cocAnade");
  f.innerHTML = '<input id="' + id + '" type="text" autocomplete="off" enterkeyhint="done" placeholder="' + esc(ph) + '" aria-label="' + esc(ph) + '"><button type="submit" aria-label="Añadir">' + svg("mas") + '</button>';
  f.addEventListener("submit", function (e) {
    e.preventDefault(); var i = f.querySelector("input"), t = i.value.trim(); if (!t) { i.focus(); return; }
    hecho(t); i.value = ""; pinta();
    var n = document.getElementById(id); if (n) n.focus();
  });
  return f;
}

/* ------------------------------ Tengo ------------------------------
   Lo que hay en casa (despensa.js), por zonas. Tocar algo: "Me queda", "Se acabó" (y, si
   quieres, a la lista). "Recuento" es decir todo lo que hay de una vez (punto de partida
   nuevo) y "Copiar para Claude", pasárselo a la Claude que planea las comidas.          */
function corta(iso) { var p = String(iso).split("-"); return (+p[2]) + "/" + (+p[1]); }
function tengo(E) {
  var s = el("section", "cocSec cocTengo");
  if (RECUENTO) return recuento(s, E);
  if (COPIA) return copia(s);
  var H = E.H;
  if (!H) {
    var err = NOTA && NOTA.error;
    s.innerHTML = '<p class="cocLead">Lo que tienes</p>';
    s.appendChild(el("p", "cocVacio", err === "sin_configurar"
      ? "Lo que hay en casa parte de tu nota <b>Despensa habitual</b> de Obsidian. Falta darle permiso al Worker para leerla (una vez). Mientras, haz un <b>Recuento</b>."
      : err === "ruta_desconocida" ? "Tu Worker todavía no sabe leer la despensa: falta desplegar su versión nueva."
      : !CTX.conf || !CTX.conf.key ? "Conecta la app en Ajustes para ver lo que tienes."
      : NOTA && NOTA.sinRed ? "Sin conexión: no se puede leer lo que tienes ahora."
      : err ? "No se ha podido leer lo que tienes (" + esc(err) + "). Puedes hacer un Recuento."
      : "Leyendo lo que tienes…"));
    s.appendChild(acciones2());
    return s;
  }
  if (ZONA && ZONA !== "Suplementos" && !H.zonas.some(function (z) { return z.zona === ZONA; })) ZONA = null;
  var inv = vigentes(E.CB).filter(function (cb) { return cb.tipo === "inventario"; }).pop();
  var desde = inv && H.desde && inv.t >= Dp().msDe(H.desde, "00:00") ? "tu recuento del " + corta(H.desde) : E.D && E.D.fecha ? "la nota del " + corta(E.D.fecha) : "";
  s.innerHTML = '<p class="cocLead">' + H.n + (H.n === 1 ? " cosa" : " cosas") + ' en casa</p>' +
    '<p class="sub">' + esc([desde ? "Desde " + desde + " y lo que has comido" : "", H.dudosos ? H.dudosos + " por confirmar (?)" : "",
      NOTA && (NOTA.sinRed || NOTA.error) && E.D ? "sin conexión: la última copia" : ""].filter(Boolean).join(" · ")) + '</p>';
  var cw = el("div", "cocChipsW"), ch = cw.appendChild(el("div", "cocChips"));
  [[null, "Todo", H.n]].concat(H.zonas.map(function (z) { return [z.zona, z.zona, z.items.length]; })).forEach(function (z) {
    var b = el("button", "", esc(z[1]) + '<b>' + z[2] + '</b>'); b.setAttribute("aria-pressed", ZONA === z[0]);
    b.addEventListener("click", function () { ZONA = z[0]; TOCADO = null; pinta(); });
    ch.appendChild(b);
  });
  s.appendChild(cw);
  // la zona elegida, a la vista (si no, queda cortada a la derecha)
  setTimeout(function () { var x = ch.querySelector("[aria-pressed=true]"); if (x && x.offsetLeft + x.offsetWidth > ch.clientWidth) ch.scrollLeft = x.offsetLeft - 14; }, 0);
  var acc = el("div", "cocDos");
  var ba = el("button", "cocBtn", svg("mas") + "Añadir"); ba.setAttribute("aria-expanded", ANADIR);
  ba.addEventListener("click", function () { ANADIR = !ANADIR; pinta(); if (ANADIR) { var i = document.getElementById("cocAnadeTengo"); if (i) i.focus(); } });
  acc.appendChild(botonEscaner(true)); acc.appendChild(ba);
  s.appendChild(acc);
  if (ANADIR) {
    var fz = el("div", "cocZonasAn");
    s.appendChild(formQueCuanto(function (que, cuanto) {
      var t = cuanto ? conCant(cuanto, que) : que;
      apunta({ tipo: "compra", items: [t], zona: fz.getAttribute("data-z") || Dp().zonaPara(que) });
      aviso("Apuntado: " + t + ".");
    }));
    fz.setAttribute("data-z", ZONA || "");
    var fq = s.querySelector(".cocQueCuanto");
    if (fq) fq.alElegir = function (nom) {
      var A = aliDe(nom), z = (A && A.zona) || Dp().zonaPara(nom);
      fz.setAttribute("data-z", z); [].forEach.call(fz.children, function (x) { x.setAttribute("aria-pressed", x.textContent === z); });
    };
    Dp().ZONAS.forEach(function (z) {
      var b = el("button", "", esc(z)); b.type = "button"; b.setAttribute("aria-pressed", ZONA === z);
      b.addEventListener("click", function () { fz.setAttribute("data-z", z); [].forEach.call(fz.children, function (x) { x.setAttribute("aria-pressed", x === b); }); });
      fz.appendChild(b);
    });
    s.appendChild(fz);
  }
  if (!ZONA) {
    var tp = Dp().tuppers(H);
    if (tp >= Dp().MAX_TUPPERS) s.appendChild(el("div", "cocAviso", svg("copo") + '<span><b>El congelador está lleno de tuppers</b>' + tp + ' de ' + Dp().MAX_TUPPERS +
      '. Una comida de ración doble no tendrá sitio para su tupper: come uno antes.</span>'));
    var PC = Dp().porConfirmar(E.CB, E.Rs, H, E.o);
    if (PC.length) s.appendChild(porConfirmarHtml(PC, E));
    // Todo: una fila por zona con lo que hay (cabe en la pantalla); tocarla abre esa zona
    var zl = el("div", "cocZonas");
    H.zonas.forEach(function (z) {
      var tz = z.zona === "Congelador" ? Dp().tuppers(H) : 0;
      var b = el("button", "cocZonaFila", '<span><b>' + esc(z.zona) + (tz ? ' <i class="cocTup">' + tz + ' de ' + Dp().MAX_TUPPERS + ' tuppers</i>' : "") + '</b><small>' + esc(z.items.slice(0, 5).map(function (x) { return x.nombre + (x.dudoso ? " (?)" : ""); }).join(" · ") +
        (z.items.length > 5 ? " · y " + (z.items.length - 5) + " más" : "")) + '</small></span><em>' + z.items.length + '</em>' + svg("der"));
      b.addEventListener("click", function () { ZONA = z.zona; TOCADO = null; pinta(); cont.scrollTop = 0; });
      zl.appendChild(b);
    });
    var SP = suplementos();
    if (SP.length) {                                   // v2.48: los suplementos, con su ficha (se gestionan en Nutrición)
      var bsp = el("button", "cocZonaFila", '<span><b>Suplementos</b><small>' + esc(SP.map(function (x) { return x.nombre; }).join(" · ")) + '</small></span><em>' + SP.length + '</em>' + svg("der"));
      bsp.addEventListener("click", function () { ZONA = "Suplementos"; pinta(); cont.scrollTop = 0; });
      zl.appendChild(bsp);
    }
    s.appendChild(zl);
  } else if (ZONA === "Suplementos") {
    var us = el("ul", "cocFilasZ");
    suplementos().forEach(function (sp) {
      var b2 = el("button", "cocFilaZin", '<span>' + esc(sp.nombre) + '<small>' + esc(tomaTxt(sp)) + '</small></span><em>' + svg("der") + '</em>');
      b2.addEventListener("click", function () { FICHAX = { nombre: sp.nombre, zona: "Suplementos", supl: true, sid: sp.id }; pinta(); });
      us.appendChild(el("li", "cocFilaZ")).appendChild(b2);
    });
    s.appendChild(el("p", "cocAyuda", "Cuándo los tomas y cuánto, en Nutrición → Suplementos."));
    s.appendChild(us);
  } else H.zonas.forEach(function (z) {
    if (z.zona !== ZONA) return;
    s.appendChild(el("p", "cocAyuda", "Desliza a la izquierda: se acabó. Toca: cuánto queda."));
    var ul = el("ul", "cocFilasZ");
    z.items.forEach(function (x) { ul.appendChild(filaCasa(x)); });
    s.appendChild(ul);
  });
  s.appendChild(acciones2());
  var tx = TOCADO && H.todos.filter(function (x) { return x.clave === TOCADO; })[0];
  if (tx) s.appendChild(fichaAlimento(tx));
  else TOCADO = null;
  return s;
}
// "240 g · 3 ud": con la equivalencia de tus alimentos, si la hay
function cantCasa(x) {
  if (!x.c) return x.dudoso ? "?" : "";
  var A = aliDe(x.nombre);
  return Al().cantDoble(x.c, A && A.eq);
}
function filaCasa(x) {
  var li = el("li", "cocFilaZ" + (ABIERTA === x.clave ? " abierta" : ""));
  var fuera = el("button", "cocFueraZ", svg("cerrar") + "Se acabó");
  fuera.addEventListener("click", function () { apunta({ tipo: "acaba", items: [x.nombre] }); ABIERTA = null; aviso("Se acabó: " + x.nombre + "."); pinta(); });
  var b = el("button", "cocFilaZin" + (x.dudoso ? " duda" : ""), '<span>' + esc(x.nombre) + (x.dudoso ? '<small>¿Te queda? ' + esc(x.razon || "") + '</small>' : "") + '</span><em>' + esc(cantCasa(x)) + '</em>');
  b.setAttribute("aria-label", x.nombre + (x.c ? ", " + Rc().cantTxt(x.c) : "") + ". Toca para cambiar cuánto queda");
  b.addEventListener("click", function () { if (ABIERTA === x.clave) { ABIERTA = null; pinta(); return; } TOCADO = x.clave; pinta(); });
  li.appendChild(fuera); li.appendChild(b);
  // deslizar: la fila sigue al dedo; pasada la mitad del boton se queda abierta
  var x0 = null, dx = 0;
  b.addEventListener("touchstart", function (e) { if (e.touches.length !== 1) return; x0 = e.touches[0].clientX; dx = 0; b.style.transition = "none"; }, { passive: true });
  b.addEventListener("touchmove", function (e) {
    if (x0 == null) return; dx = Math.min(0, Math.max(-128, e.touches[0].clientX - x0 + (ABIERTA === x.clave ? -112 : 0)));
    b.style.transform = "translateX(" + dx + "px)";
  }, { passive: true });
  b.addEventListener("touchend", function () {
    if (x0 == null) return; x0 = null; b.style.transition = ""; b.style.transform = "";
    var abre = dx < -56; if (abre !== (ABIERTA === x.clave)) { ABIERTA = abre ? x.clave : null; pinta(); }
  }, { passive: true });
  return li;
}
// "Por confirmar": lo que la app cree que ha pasado, con un toque
function porConfirmarHtml(PC, E) {
  var box = el("div", "cocPc");
  box.appendChild(el("h4", "cocPcTit", "Por confirmar <b>" + PC.length + "</b>"));
  PC.forEach(function (x) {
    var it = el("div", "cocPcIt"), bot = el("div", "cocPcB");
    function boton(txt, cls, fn) { var b = el("button", cls || "", txt); b.addEventListener("click", fn); bot.appendChild(b); return b; }
    if (x.tipo === "comida") {
      var R = x.R, cuando = (R.fecha === E.o.hoy ? "hoy" : Dp().diaCorto(R.fecha)) + (R.hora ? " " + R.hora : "");
      it.innerHTML = '<p><b>' + esc(R.titulo) + ' · ' + esc(cuando) + '</b><small>Gastó ' + esc(x.items.join(" · ")) + '</small></p>';
      boton(svg("tick") + "Así fue", "si", function () { apunta({ tipo: "gasto", uid: R.uid, de: R.titulo, items: x.items }); aviso("Apuntado lo que gastó."); pinta(); });
      boton("Corregir", "", function () { CORRIGE = { uid: R.uid, items: x.items.map(function (t) { return { txt: t, on: true }; }) }; pinta(); });
      if (CORRIGE && CORRIGE.uid === R.uid) it.appendChild(corrige(R));
    } else if (x.tipo === "compra") {
      var cb = x.cb, g0 = Rc().ingrediente((cb.items || [])[0] || ""), nom = mayus1(g0.ver || g0.base || (cb.items || [])[0] || "");
      it.innerHTML = '<p><b>Compraste: ' + esc(nom) + (g0.c ? " · " + esc(Rc().cantTxt(g0.c)) : "") + '</b><small>' + esc(cb.zona || "") +
        (cb.fin ? " · lo que pusiste al terminar la compra" : g0.c ? " · la cantidad de la receta: ¿fue esa?" : " · ¿cuánto?") + '</small></p>';
      boton(svg("tick") + "Bien", "si", function () { apunta({ tipo: "confirma", ref: x.k }); pinta(); });
      boton(g0.c ? "Otra cantidad" : "Cuánto", "", function () { PCANT = cb.id; pinta(); var i = document.getElementById("cocPcCant"); if (i) i.focus(); });
      if (PCANT === cb.id) it.appendChild(formCant("cocPcCant", "Cuánto has comprado (p. ej. 1 kg, 6)", function (q) {
        desapunta(cb.id);
        apunta({ tipo: "compra", items: [conCant(q, nom)], zona: cb.zona, lista: cb.lista, nutri: cb.nutri, ali: cb.ali, fin: cb.fin, pide: cb.pide });
        var n2 = cambios().slice(-1)[0]; if (n2) apunta({ tipo: "confirma", ref: "compra:" + n2.id });
        PCANT = null; aviso("Apuntado: " + conCant(q, nom) + ".");
      }));
    } else {
      var d = x.item;
      it.innerHTML = '<p><b>¿Te queda ' + esc(d.nombre.toLowerCase()) + '?</b><small>' + esc(d.razon || "No se sabe si queda") + '</small></p>';
      boton("Sí", "si", function () { apunta({ tipo: "hay", items: [d.nombre] }); pinta(); });
      boton("Cuánto", "", function () { ZONA = d.zona; TOCADO = d.clave; pinta(); });
      boton("No, se acabó", "", function () { apunta({ tipo: "acaba", items: [d.nombre] }); pinta(); });
    }
    it.insertBefore(bot, it.children[1] || null);
    box.appendChild(it);
  });
  return box;
}
// Corregir lo que gastó una comida: quita lo que no usaste, o "No la hice"
function corrige(R) {
  var f = el("div", "cocCorrige"), ul = el("ul", "cocChecksC");
  CORRIGE.items.forEach(function (g) {
    var b = el("button", "", '<i>' + (g.on ? svg("tick") : "") + '</i><span>' + esc(g.txt) + '</span>');
    b.setAttribute("aria-pressed", g.on);
    b.addEventListener("click", function () { g.on = !g.on; pinta(); });
    ul.appendChild(el("li")).appendChild(b);
  });
  f.appendChild(ul);
  var fila = el("div", "cocPcB"), ok = el("button", "si", "Apuntar lo gastado"), no = el("button", "", "No la hice"), x = el("button", "", "Cancelar");
  ok.addEventListener("click", function () {
    var its = CORRIGE.items.filter(function (g) { return g.on; }).map(function (g) { return g.txt; });
    apunta(its.length ? { tipo: "gasto", uid: R.uid, de: R.titulo, items: its } : { tipo: "hecho", uid: R.uid });
    CORRIGE = null; aviso("Apuntado."); pinta();
  });
  no.addEventListener("click", function () { apunta({ tipo: "saltada", uid: R.uid }); CORRIGE = null; aviso("No gasta nada."); pinta(); });
  x.addEventListener("click", function () { CORRIGE = null; pinta(); });
  fila.appendChild(ok); fila.appendChild(no); fila.appendChild(x); f.appendChild(fila);
  return f;
}
/* ------------------------------ la ficha de un alimento (v2.47) ------------------------------
   A pantalla completa: cuánto hay (lo de antes) y TODA su etiqueta por 100 g y por porción. Viene de
   tu alimento (Open Food Facts o lo tuyo) o, si no tiene, de la tabla genérica de USDA. Lo que falta
   dice "sin dato". Sin ficha: escanear el código o rellenarla a mano (con la foto de la etiqueta).   */
function fichaDe(x) {
  var A = aliDe(x.nombre);
  if (A && A.nutri && Object.keys(A.nutri).some(function (k) { return Al().CAMPOS.some(function (c) { return c[0] === k; }); }))
    return { A: A, nu: A.nutri, fuente: A.nutri.fuente === "tú" ? "Tuya (rellenada a mano)" : "Etiqueta · Open Food Facts" };
  if (x.supl) return { A: A, nu: null, fuente: null };          // un suplemento no tiene ficha generica
  var F = Nu().fila(x.nombre), g = Al().deUSDA(F);
  return { A: A, nu: g, fuente: g ? "Genérico · USDA (" + F.nombre + ")" : null };
}
function fmtF(v) { if (v == null) return null; var r = v >= 100 ? Math.round(v) : v >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100; return String(r).replace(".", ","); }
function fichaAlimento(x) {
  var w = el("div", "cocFicha"), FD = fichaDe(x), nu = FD.nu, fotos = lee(K_FOTOS, {}), foto = FD.A && fotos[FD.A.id];
  var top = el("div", "cocFichaTop", '<div><small>' + esc(x.zona) + '</small><b>' + esc(x.nombre) + '</b></div>');
  var cx = el("button", "cocHojaX", svg("cerrar")); cx.setAttribute("aria-label", "Cerrar la ficha");
  cx.addEventListener("click", function () { TOCADO = null; FFORM = false; FICHAX = null; FSUPL = null; pinta(); });
  top.appendChild(cx); w.appendChild(top);
  if (x.supl) w.appendChild(comoLoTomas(x));
  else { var hi = hojaItem(x); hi.className = "cocHojaIt enFicha"; var bot = hi.querySelector(".cocHojaX"); if (bot) bot.remove(); w.appendChild(hi); }
  if (FFORM) { w.appendChild(formFicha(x, FD, foto)); return w; }
  var cabN = el("div", "cocFichaN", '<h4>Información nutricional</h4>');
  if (nu) {
    cabN.appendChild(el("p", "ntNota", esc(FD.fuente) + (!x.supl && Al().incompleta(nu) ? ' · <b>incompleta</b>' : "") + (nu.porcionG ? " · porción: " + esc(nu.porcionTxt || nu.porcionG + " g") : "")));
    var t = el("div", "cocFichaT"), grupo = null, conPor = !!nu.porcionG;
    t.appendChild(el("div", "cocFichaF cab" + (conPor ? "" : " sinPor"), '<span></span><span>Por ' + esc(nu.por || "100 g") + '</span>' + (conPor ? '<span>Por porción</span>' : "")));
    var vacias = 0;
    Al().fichaFilas(nu).forEach(function (f) {
      if (f.k === "kj") return;
      if (x.supl && f.v100 == null) { vacias++; return; }      // un suplemento: solo lo que trae (lo demas, en una linea)
      if (f.grupo !== grupo) { grupo = f.grupo; }
      var sub = /^de |^mono|^poli/.test(f.nombre);
      var v = f.v100 != null ? fmtF(f.v100) + " " + f.u + (f.k === "kcal" && fmtF(Math.round(f.v100 * 4.184)) ? " · " + Math.round(f.v100 * 4.184) + " kJ" : "") : '<i>sin dato</i>';
      t.appendChild(el("div", "cocFichaF" + (sub ? " sub" : "") + (conPor ? "" : " sinPor"), '<span>' + esc(f.nombre) + '</span><span>' + v + '</span>' +
        (conPor ? '<span>' + (f.vPor != null ? fmtF(f.vPor) + " " + f.u : '<i>sin dato</i>') + '</span>' : "")));
    });
    cabN.appendChild(t);
    if (x.supl && vacias) cabN.appendChild(el("p", "ntNota", "El resto de la etiqueta (" + vacias + " campos): sin dato."));
  } else cabN.appendChild(el("p", "cocVacio", "Sin ficha: no se sabe su información nutricional. Escanea su código de barras o rellénala a mano (con una foto de la etiqueta te será más fácil)."));
  w.appendChild(cabN);
  if (foto) w.appendChild(el("img", "cocFichaFoto")).src = foto;
  var acc = el("div", "cocPcB cocFichaAcc");
  var be = el("button", "", svg("barras") + "Escanear el código"), bm = el("button", nu ? "" : "si", nu && nu.fuente === "tú" ? "Corregir a mano" : "Rellenar a mano");
  be.addEventListener("click", function () { MCTX = CTX; abreEscaner({ nombre: x.nombre, zona: x.zona }); });
  bm.addEventListener("click", function () { FFORM = true; pinta(); });
  acc.appendChild(be); acc.appendChild(bm); w.appendChild(acc);
  return w;
}
// rellenar la ficha a mano, campo a campo: se guarda a medias; lo vacío sigue "sin dato"
function formFicha(x, FD, foto) {
  var nu = FD.nu || {}, f = el("form", "ntPerfil cocFichaForm");
  f.innerHTML = '<h4>Rellenar la ficha · ' + (x.supl ? "por 1 unidad (cápsula, comprimido, cacito…)" : "por 100 g") + '</h4><p class="ntNota">Copia los números de la etiqueta. Deja vacío lo que no ponga: queda «sin dato». Se guarda aunque no esté entera.</p>' +
    '<label class="cocFotoBtn">' + svg("camara") + ' Foto de la etiqueta<input type="file" accept="image/*" capture="environment" hidden></label>' +
    (foto ? '<img class="cocFichaFoto" src="' + foto + '" alt="Foto de la etiqueta">' : "") +
    '<label>Porción (g)<input name="porcionG" inputmode="decimal" autocomplete="off" value="' + esc(nu.porcionG != null ? String(nu.porcionG).replace(".", ",") : "") + '"></label>' +
    Al().CAMPOS.filter(function (c) { return c[0] !== "kj"; }).map(function (c) {
      var v = nu[c[0]];
      return '<label>' + esc(c[1]) + ' (' + esc(c[2]) + ')<input name="' + c[0] + '" inputmode="decimal" autocomplete="off" value="' + esc(v != null ? String(v).replace(".", ",") : "") + '" placeholder="sin dato"></label>';
    }).join("") + '<div class="cocPcB"><button class="si" type="submit">Guardar la ficha</button><button type="button" class="ffNo">Cancelar</button></div>';
  f.querySelector(".ffNo").addEventListener("click", function () { FFORM = false; pinta(); });
  f.querySelector('input[type=file]').addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0]; if (!file) return;
    var rd = new FileReader();
    rd.onload = function () {
      var img = new Image();
      img.onload = function () {   // pequeña (720 px) para que quepa en el movil
        var k = Math.min(1, 720 / Math.max(img.width, img.height)), cv = document.createElement("canvas");
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        var A = aseguraAli(x), F = lee(K_FOTOS, {}); F[A.id] = cv.toDataURL("image/jpeg", 0.7); guarda(K_FOTOS, F); pinta();
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  });
  var A0 = aliDe(x.nombre);
  f.addEventListener("submit", function (e) {
    e.preventDefault(); var val = {}, ex = {};
    Al().CAMPOS.forEach(function (c) { if (c[0] === "kj") return; var t = String(f.elements[c[0]].value).trim().replace(",", "."); val[c[0]] = t === "" ? null : parseFloat(t); if (val[c[0]] != null && !isFinite(val[c[0]])) val[c[0]] = null; });
    var pg = parseFloat(String(f.elements.porcionG.value).replace(",", ".")); if (isFinite(pg) && pg > 0) { ex.porcionG = pg; ex.porcionTxt = pg + " g"; }
    if (x.supl) ex.por = (A0 && A0.nutri && /100/.test(A0.nutri.por || "") ? A0.nutri.por : "1 unidad");
    var A = aseguraAli(x), B = Al().conFicha(A, val, ex);
    if (A.nutri && A.nutri.fuente !== "tú") {                       // lo que venía de la etiqueta y no tocas, se queda
      Al().CAMPOS.forEach(function (c) { if (B.nutri[c[0]] == null && A.nutri[c[0]] != null && val[c[0]] === undefined) B.nutri[c[0]] = A.nutri[c[0]]; });
      B.nutri.incompleta = Al().incompleta(B.nutri);
    }
    guardaAli(B); FFORM = false; aviso(B.nutri.incompleta ? "Guardada, incompleta: faltan datos de la etiqueta." : "Ficha guardada."); pinta();
  });
  return f;
}
// el alimento de esta cosa de casa (si aun no existe, se crea con su nombre)
function aseguraAli(x) {
  var A = aliDe(x.nombre); if (A) return A;
  return guardaAli(Al().registra(alimentos(), { nombre: x.nombre, zona: x.zona }).A);
}
function acciones2() {
  var d = el("div", "cocDos cocDos2");
  var r = el("button", "cocBtn", svg("lista") + "Recuento"), c = el("button", "cocBtn", svg("copia") + "Para Claude");
  c.setAttribute("aria-label", "Copiar lo que hay para Claude");
  r.addEventListener("click", function () { RECUENTO = { texto: "" }; TOCADO = null; pinta(); cont.scrollTop = 0; var t = document.getElementById("cocRecuento"); if (t) t.focus(); });
  c.addEventListener("click", copiaClaude);
  d.appendChild(r); d.appendChild(c);
  return d;
}
// lo tocado en Tengo: abajo, fija, con lo que se puede hacer
function hojaItem(x) {
  var h = el("div", "cocHojaIt");
  var A = aliDe(x.nombre), nu = (A && A.nutri) || x.nutri, fmt = A && (A.codigos || []).map(function (c) { return c.formato; }).filter(Boolean)[0];
  var paq = fmt ? Al().formato(fmt) : null;
  h.innerHTML = '<div><b>' + esc(x.nombre) + '</b>' + (x.c ? '<span>' + esc(cantCasa(x)) + '</span>' : "") +
    (x.dudoso ? '<small>¿Te queda? ' + esc(x.razon || "") + '</small>' : "") +
    (A && A.alias && A.alias.length ? '<small>También: ' + esc(A.alias.slice(0, 2).join(" · ")) + '</small>' : "") +
    (nu ? '<small>Por ' + esc(nu.por || "100 g") + ': ' + esc(nutriTxt(nu)) + ' · ' + esc(nu.fuente || "OFF") + '</small>' : "") + '</div>';
  var fr = Dp().fracciones(x.c, paq && paq.total);
  if (fr.length) {
    var q = el("div", "cocFrac", '<span>¿Cuánto queda?</span>');
    fr.concat([{ txt: "Nada", c: null }]).forEach(function (f) {
      var b = el("button", "", esc(f.txt)); b.type = "button";
      b.addEventListener("click", function () {
        if (!f.c) { apunta({ tipo: "acaba", items: [x.nombre] }); aviso("Se acabó: " + x.nombre + "."); }
        else { apunta({ tipo: "hay", items: [conCant(Rc().cantTxt(f.c), x.nombre)] }); aviso("Queda " + Rc().cantTxt(f.c) + "."); }
        TOCADO = null; pinta();
      });
      q.appendChild(b);
    });
    h.appendChild(q);
  }
  if (x.dudoso) {
    var m = el("button", "cocHojaSi", "Me queda");
    m.addEventListener("click", function () { apunta({ tipo: "hay", items: [x.nombre] }); TOCADO = null; pinta(); });
    h.appendChild(m);
  }
  // cuanto queda ahora (lo que digas es lo que hay)
  h.appendChild(formCant("cocCantIt", x.c ? "Cuánto queda (ahora " + Rc().cantTxt(x.c) + ")" : "Cuánto queda (p. ej. 200 g)", function (q) {
    apunta({ tipo: "hay", items: [conCant(q, x.nombre)] }); TOCADO = null; aviso("Apuntado: " + conCant(q, x.nombre) + ".");
  }));
  // mover a otra zona de la despensa (y ahi se queda la proxima vez)
  var mv = el("div", "cocMover", '<span>Está en</span>');
  Dp().ZONAS.forEach(function (z) {
    var b = el("button", "", esc(z)); b.type = "button"; b.setAttribute("aria-pressed", x.zona === z);
    b.addEventListener("click", function () {
      if (x.zona === z) return;
      apunta({ tipo: "mueve", items: [x.nombre], zona: z }); ZONA = ZONA ? z : null; aviso(x.nombre + " → " + z + "."); pinta();
    });
    mv.appendChild(b);
  });
  h.appendChild(mv);
  var fila = el("div", "cocHojaBot");
  var a = el("button", "", "Se acabó"), l = el("button", "", "Se acabó · a la lista"), c = el("button", "cocHojaX", svg("cerrar"));
  c.setAttribute("aria-label", "Cerrar");
  a.addEventListener("click", function () { apunta({ tipo: "acaba", items: [x.nombre] }); TOCADO = null; pinta(); });
  l.addEventListener("click", function () { apunta({ tipo: "acaba", items: [x.nombre] }); aLista(x.ver || x.nombre); TOCADO = null; pinta(); });
  c.addEventListener("click", function () { TOCADO = null; pinta(); });
  fila.appendChild(a); fila.appendChild(l); fila.appendChild(c); h.appendChild(fila);
  return h;
}
// Recuento: todo lo que hay, dictado o pegado, por zonas. Pasa a ser el punto de partida.
function recuento(s, E) {
  s.innerHTML = '<p class="cocLead">Recuento</p><p class="sub">Dicta o pega todo lo que hay en casa, por zonas. Lo que no digas, no está.</p>';
  var ta = el("textarea", "cocTexto"); ta.id = "cocRecuento"; ta.rows = 9;
  ta.placeholder = "Nevera: leche, 6 huevos, queso canario\nCongelador: guiso de carne (440 g), arándanos\nFruta y verdura: 4 plátanos, 2 tomates\nDespensa dulce: avena, miel\nDespensa salada: pan rústico, 2 latas de atún\nEspecias: comino, orégano\nNo hay: pollo";
  ta.value = RECUENTO.texto || "";
  var pre = el("p", "cocVacio cocPrevia");
  function previa() {
    RECUENTO.texto = ta.value;
    var D = Dp().despensa(ta.value), nz = D.zonas.filter(function (z) { return z.items.length; }).length, ni = D.zonas.reduce(function (m, z) { return m + z.items.length; }, 0);
    pre.textContent = ni ? nz + (nz === 1 ? " zona · " : " zonas · ") + ni + (ni === 1 ? " cosa" : " cosas") + (D.noHay.length ? " · " + D.noHay.length + " que no hay" : "")
                         : ta.value.trim() ? "Empieza cada zona con su nombre: «Nevera: …»" : "";
    ok.disabled = !ni;
  }
  var ok = el("button", "cocGo", "Guardar como lo que hay hoy"), no = el("button", "cocBtn", "Cancelar"), rel = el("button", "cocLink", "Empezar con lo que hay ahora");
  ta.addEventListener("input", previa);
  ok.addEventListener("click", function () {
    apunta({ tipo: "inventario", texto: ta.value });
    RECUENTO = null; ZONA = null; aviso("Guardado: la despensa empieza desde aquí."); pinta();
  });
  no.addEventListener("click", function () { RECUENTO = null; pinta(); });
  rel.addEventListener("click", function () {
    if (E.H) ta.value = Dp().textoClaude(E.H, E.o).split("\n").filter(function (l) { return l && !/^(DESPENSA EN VIVO|REGLA)/.test(l); })
      .map(function (l) { return l.replace(/^\\## (.+)$/, function (_, z) { return mayus1(z.toLowerCase()) + ":"; }); }).join("\n").replace(/:\n/g, ": ");
    previa(); ta.focus();
  });
  s.appendChild(ta); s.appendChild(pre);
  if (E.H && !ta.value) s.appendChild(rel);
  s.appendChild(ok); s.appendChild(no);
  previa();
  return s;
}
// Copiar para Claude: lo que hay, con el formato de la nota
function copiaClaude() {
  var E = estado(CTX.dia); if (!E.H) { aviso("Aún no hay nada que copiar."); return; }
  var t = Dp().textoClaude(E.H, E.o);
  function falla() { COPIA = t; pinta(); }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { aviso("Copiado: pégaselo a Claude para que actualice tu nota."); }, falla);
    else falla();
  } catch (e) { falla(); }
}
function copia(s) {
  s.innerHTML = '<p class="cocLead">Para Claude</p><p class="sub">Mantén pulsado y copia todo. Pégaselo a Claude para que actualice tu nota.</p>';
  var ta = el("textarea", "cocTexto"); ta.readOnly = true; ta.value = COPIA; ta.rows = 12;
  var b = el("button", "cocBtn", "Hecho");
  b.addEventListener("click", function () { COPIA = null; pinta(); });
  s.appendChild(ta); s.appendChild(b);
  setTimeout(function () { try { ta.focus(); ta.select(); } catch (e) {} }, 50);
  return s;
}

/* ------------------------------ Nutrición (v2.45) ------------------------------
   nutricion.js hace las cuentas; aquí: el día (planificado del calendario + registrado por ti) contra
   los objetivos de su semana, "Te falta X; cómete Y", el registro rápido y la hoja de la semana.     */
function fmtN(v, k) { if (v == null || !isFinite(v)) return "—"; var r = v >= 100 || k === "kcal" ? Math.round(v) : Math.round(v * 10) / 10; return String(r).replace(".", ","); }
function rangoTxt(o) { return !o ? "—" : o.max != null && o.max !== o.min ? fmtN(o.min) + "–" + fmtN(o.max) : (o.max === o.min ? "" : "≥ ") + fmtN(o.min); }
function registro() { return lee(K_REG, []); }
function nutri(E, LC) {
  var N = Nu(), o = E.o, s = el("section", "cocSec cocNutri"), fecha = sumaDia(o.hoy, NDIA), perfil = lee(K_PERFIL, null), semanas = lee(K_SEMANAS, {});
  var tipo = CTX.tipoDia ? CTX.tipoDia(fecha) : null, F = N.faseDe(fecha, semanas), obj = perfil ? N.objetivos(perfil, fecha, semanas, tipo || "gimnasio") : null;
  var dTxt = NDIA === 0 ? "Hoy" : NDIA === 1 ? "Mañana" : NDIA === -1 ? "Ayer" : mayus1(Dp().diaCorto(fecha)) + " " + (+fecha.slice(8));
  var subTxt = NSUB === "hoy" ? dTxt : (NSUBS.filter(function (x) { return x[0] === NSUB; })[0] || ["", ""])[1];
  s.innerHTML = '<p class="cocLead">Nutrición · ' + esc(subTxt) + '</p><p class="sub">' + esc((N.FASES[F.fase] || {}).nombre || "") + ' · semana del ' + esc(corta(N.lunes(fecha))) +
    (tipo ? ' · ' + esc({ descanso: "descanso", gimnasio: "gimnasio", calidad: "calidad", tirada: "tirada larga" }[tipo] || tipo) : "") + '</p>';
  // las subpestañas de Nutrición
  var sb = el("div", "cocSuperB ntSubs"); sb.setAttribute("role", "tablist"); sb.setAttribute("aria-label", "Nutrición");
  NSUBS.forEach(function (x) {
    var b = el("button", "", esc(x[1])); b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(NSUB === x[0])); b.setAttribute("aria-pressed", String(NSUB === x[0]));
    b.addEventListener("click", function () { NSUB = x[0]; NPORQUE = null; pinta(); cont.scrollTop = 0; });
    sb.appendChild(b);
  });
  s.appendChild(sb);
  if (NSUB !== "hoy") {
    if (!perfil) s.appendChild(el("p", "ntNota", "Sin tus datos no hay objetivos: las gráficas solo enseñan lo que hay. Ponlos en Hoy → Poner tus datos."));
    s.appendChild(vistaNutri(NSUB, E, LC, fecha, perfil, semanas));
    return s;
  }
  var dias = el("div", "cocSuperB ntDias");
  [-1, 0, 1, 2, 3].forEach(function (d) {
    var f = sumaDia(o.hoy, d), b = el("button", "", esc(d === 0 ? "Hoy" : d === 1 ? "Mañana" : d === -1 ? "Ayer" : mayus1(Dp().diaCorto(f))));
    b.setAttribute("aria-pressed", String(NDIA === d)); b.addEventListener("click", function () { NDIA = d; NPORQUE = null; pinta(); });
    dias.appendChild(b);
  });
  s.appendChild(dias);
  var acc = el("div", "cocDos"), bs = el("button", "cocBtn", "Semana · " + esc((N.FASES[F.semana] || {}).nombre || "")), bp = el("button", "cocBtn", perfil ? "Tus datos" : "Poner tus datos");
  bs.addEventListener("click", function () { NSEMANA = !NSEMANA; NPERFIL = false; pinta(); });
  bp.addEventListener("click", function () { NPERFIL = !NPERFIL; NSEMANA = false; pinta(); });
  acc.appendChild(bs); acc.appendChild(bp); s.appendChild(acc);
  if (NPERFIL || !perfil) s.appendChild(hojaPerfil(perfil, !perfil));
  if (NSEMANA && perfil) s.appendChild(hojaSemana(fecha, semanas, perfil, tipo));
  // el dia: planificado (calendario) + registrado (tu)
  var comidas = E.Rs.filter(function (R) { return R.fecha === fecha && R.tipo === "comida" && Dp().estadoComida(R, E.CB, o) !== "saltada"; });
  var regs = registro().filter(function (x) { return x.fecha === fecha; });
  var SPd = suplementos().map(function (sp) { return N.deSuplemento(sp, aliDe(sp.nombre), tipo || "gimnasio"); }).filter(function (x) { return x.tomas > 0 || x.sinFicha; });
  var D = N.dia(comidas, regs, function (n) { return aliDe(n); }, SPd);
  s.appendChild(el("p", "ntQue", '<b>Planificado</b> sale del calendario (' + comidas.length + (comidas.length === 1 ? " comida" : " comidas") + '). <b>Registrado</b> es lo que apuntas tú (' + regs.length +
    '). No es lo que has comido de verdad: el calendario no lo recoge todo.'));
  s.appendChild(hoyN1(D, obj, comidas.length + regs.length > 0));
  if (obj) {
    var falta = N.teFalta(D.total, obj, E.H ? E.H.todos.map(function (x) { return x.nombre; }) : [], LC.items.map(function (x) { return x.ver; }));
    if (falta.length) {
      var tf = el("div", "cocPc ntFalta", '<h4 class="cocPcTit">Te falta</h4>');
      falta.forEach(function (x) {
        var it = el("div", "cocPcIt", '<p><b>' + x.falta + ' ' + esc(x.u) + ' de ' + esc(/^Vitamina/.test(x.nombre) ? "vitamina " + x.nombre.slice(9) : x.nombre.toLowerCase()) + '</b>' +
          (x.y ? '<small>Cómete ' + esc(x.y.txt) + ' (≈' + x.y.aporta + ' ' + esc(x.u) + ') · ' + (x.y.donde === "casa" ? "lo tienes en casa" : x.y.donde === "lista" ? "está en tu lista" : "no lo tienes: a la lista") + '</small>' : "") + '</p>');
        if (x.y && x.y.donde === "comprar") {
          var b = el("button", "", svg("mas") + "A la lista"); b.addEventListener("click", function () { aLista(x.y.nombre); aviso("En la lista: " + x.y.nombre + "."); pinta(); });
          var w = el("div", "cocPcB"); w.appendChild(b); it.appendChild(w);
        }
        tf.appendChild(it);
      });
      tf.appendChild(el("p", "ntNota", "Se añade a lo que comes: no cambia ninguna comida del plan."));
      s.appendChild(tf);
    } else if (comidas.length || regs.length) s.appendChild(el("p", "cocVacio", "Con lo planificado y lo registrado llegas a los mínimos de carbohidratos, fibra, vitamina C y folato."));
  }
  if (!comidas.length && !regs.length) s.appendChild(el("p", "cocVacio", "Nada planificado ni registrado para " + dTxt.toLowerCase() + ". Si comes algo que no está en el calendario, apúntalo abajo."));
  s.appendChild(tablaNutri(D, obj));
  var UL = N.avisosUL(D.total, D.supl.n);
  if (UL.length) s.appendChild(el("p", "ntNota ntUL", UL.map(function (u) {
    return esc(u.nombre) + ": " + fmtN(u.valor) + " " + esc(u.u) + (u.soloSupl ? " de suplementos" : " hoy") + ", por encima del máximo tolerable de EFSA (" + u.ul + " " + esc(u.u) + ")";
  }).join(" · ") + "."));
  s.appendChild(registroRapido(fecha, regs));
  s.appendChild(seccionSupl(fecha, tipo, SPd));
  return s;
}
/* ------------------------------ las vistas de estadísticas (v2.49) ------------------------------
   Todo sale de Nutricion.resumenDia con las fuentes de aquí: lo que hay, sin inventar.               */
function fuentesNu(E) {
  var N = Nu(), o = E.o;
  return {
    comidas: function (f) { return E.Rs.filter(function (R) { return R.fecha === f && R.tipo === "comida" && Dp().estadoComida(R, E.CB, o) !== "saltada"; }); },
    registro: function (f) { return registro().filter(function (x) { return x.fecha === f; }); },
    supl: function (f, tipo) { return suplementos().map(function (sp) { return N.deSuplemento(sp, aliDe(sp.nombre), tipo || "gimnasio"); }).filter(function (x) { return x.tomas > 0 || x.sinFicha; }); },
    aliDe: function (n) { return aliDe(n); }, perfil: lee(K_PERFIL, null), semanas: lee(K_SEMANAS, {}), tipo: CTX.tipoDia || null
  };
}
/* N1 · Hoy (opción C): la energía en grande con los macros y, debajo, TODOS los nutrientes en tiras de rango
   (como la A). Lo de suplementos va marcado dentro de cada tira. Sin datos del día: lo dice.               */
function hoyN1(D, obj, hay) {
  var N = Nu(), G = raiz.NutriGraficas, w = el("div", "ntN1");
  if (!hay && !(D.supl && D.supl.hay)) return w;
  var t = D.total, ok = obj && obj.kcal, pct = ok ? Math.round(t.kcal / obj.kcal.min * 100) : null;
  var c = el("div", "ntCaja ntEnergia", '<p class="ntCap" style="margin:0">Energía' + (ok && obj.kcal.estimado ? " · estimado" : "") + '</p>' +
    '<div class="ntBig"><b>' + fmtN(t.kcal, "kcal") + '</b><span>' + (ok ? "de " + rangoTxt(obj.kcal) + " kcal · " + pct + " %" : "kcal · sin objetivo") + '</span></div>' +
    (ok ? '<div class="barra ntBarra"><i style="width:' + Math.min(100, pct) + '%"></i></div>' : "") +
    '<div class="ntMacros">' + [["prot", "Proteína"], ["hc", "Carbohidratos"], ["grasa", "Grasa"]].map(function (m) {
      var o = obj && obj[m[0]];
      return '<div><small>' + m[1] + '</small><b>' + fmtN(t[m[0]]) + ' g</b><small>' + (o ? rangoTxt(o) + " g" : "—") + '</small></div>';
    }).join("") + '</div>');
  w.appendChild(c);
  if (!G) return w;
  var ks = N.PRIORIDAD.concat(["prot", "grasa", "hierro", "magnesio", "potasio", "calcio", "b12", "vitD", "vitA", "vitE", "b6", "zinc", "yodo", "epadha"]);
  var h = ks.map(function (k) {
    var o = obj && obj[k];
    return G.tira({ nombre: N.NOMBRE[k], v: t[k], min: o ? o.min : null, max: o ? o.max : null, u: N.UNIDAD[k], supl: D.supl && D.supl.n[k] ? D.supl.n[k] : 0 });
  }).join("");
  w.appendChild(el("p", "ntCap", "Todos los nutrientes"));
  w.appendChild(el("div", "ntCaja ntTiras", h));
  return w;
}
function vistaNutri(sub, E, LC, fecha, perfil, semanas) {
  var w = el("div", "ntVista");
  try {
    if (!CTX.dia) { w.appendChild(el("p", "cocVacio", "Trayendo el calendario…")); return w; }
    var V = { semana: vistaSemana, tendencias: vistaTendencias, fases: vistaFases, entreno: vistaEntreno, micros: vistaMicros }[sub];
    if (V) V(w, E, fecha, perfil, semanas);
    else w.appendChild(el("p", "cocVacio", "Esta vista llega en la siguiente versión."));
  } catch (e) {
    w.innerHTML = "";
    var er = el("div", "cocAviso", svg("cerrar") + '<span><b>No se ha podido calcular esta vista</b>' + esc(String(e && e.message || e)).slice(0, 120) + '. El resto de Nutrición sigue igual.</span>');
    var b = el("button", "cocBtn", "Reintentar"); b.addEventListener("click", function () { pinta(); });
    w.appendChild(er); w.appendChild(b);
  }
  return w;
}
/* N2 · Semana (A arriba + lo de la D abajo): energía por día apilada por macros con la adherencia; debajo, los
   carbohidratos por día con su banda y la media de la semana de todos los demás nutrientes (Supl. aparte).       */
var NSEM = 0;   // semanas atrás (0 = la de hoy)
function navSemana(w, l) {
  var nav = el("div", "cocPcB ntNav"), a = el("button", "", "Semana anterior"), b = el("button", "", "Siguiente");
  b.disabled = NSEM <= 0;
  a.addEventListener("click", function () { NSEM++; pinta(); }); b.addEventListener("click", function () { if (NSEM > 0) { NSEM--; pinta(); } });
  nav.appendChild(a); nav.appendChild(b);
  w.appendChild(el("p", "ntCap", "Semana del " + esc(corta(l)) + (NSEM === 0 ? " · esta" : "")));
  w.appendChild(nav);
}
function vistaSemana(w, E, fecha) {
  var N = Nu(), G = raiz.NutriGraficas, F = fuentesNu(E), l = N.masDias(N.lunes(E.o.hoy), -7 * NSEM), S = N.semana(l, F);
  navSemana(w, l);
  var con = S.filter(function (r) { return r.conDatos; }), ref = S.filter(function (r) { return r.obj; })[0], L = "LMXJVSD";
  if (!con.length) { w.appendChild(el("p", "cocVacio", "Sin datos esta semana: no hay comidas en el calendario ni nada registrado.")); return; }
  var hoyI = NSEM === 0 ? S.map(function (r) { return r.fecha; }).indexOf(E.o.hoy) : -1;
  var dias = S.map(function (r, i) { var t = r.D.total; return { label: L.charAt(i), segs: r.conDatos ? [t.prot * 4, t.hc * 4, t.grasa * 9] : null, total: t.kcal }; });
  var mx = Math.max.apply(null, dias.map(function (d) { return d.segs ? d.total : 0 }).concat(ref && ref.obj.kcal ? [ref.obj.kcal.max] : [1])) * 1.1;
  w.appendChild(el("p", "ntCap", "Energía por día · kcal"));
  var c = el("div", "ntCaja");
  c.innerHTML = G.barras(dias, mx, ref && ref.obj.kcal ? ref.obj.kcal.min : null, { acento: hoyI, valor: function (d) { return Math.round(d.total); }, aria: "Energía por día" }) +
    '<div class="ngLey"><span><i></i>Proteína</span><span><i style="opacity:.55"></i>Carbohidratos</span><span><i style="opacity:.28"></i>Grasa</span>' + (ref && ref.obj.kcal ? '<span>- - - mínimo de energía</span>' : "") + '</div>';
  w.appendChild(c);
  var ok = S.map(N.enRango), conObj = ok.filter(function (x) { return x != null; });
  w.appendChild(el("p", "ntCap", "Adherencia"));
  w.appendChild(el("p", "ntBigTxt", conObj.length ? ok.filter(function (x) { return x === true; }).length + " de " + conObj.length + " días en rango" : "Sin objetivos: pon tus datos"));
  w.appendChild(el("p", "ntNota", "En rango: energía dentro de su rango (±10 %) y proteína y carbohidratos por encima de su mínimo. Los días sin datos no cuentan."));
  // abajo (D): carbohidratos por día con su banda, y la media de todo lo demás
  w.appendChild(el("p", "ntCap", "Carbohidratos por día · g"));
  var g = S.map(function (r, i) { return { label: L.charAt(i), v: r.conDatos ? r.D.total.hc : null, lo: r.obj && r.obj.hc ? r.obj.hc.min : null, hi: r.obj && r.obj.hc ? r.obj.hc.max : null }; });
  var mh = Math.max.apply(null, g.map(function (x) { return Math.max(x.v || 0, x.hi || 0); }).concat([1])) * 1.1;
  w.appendChild(el("div", "ntCaja", G.barrasBanda(g, mh) + '<p class="ntNota">La banda: el objetivo de cada día (cambia con el tipo de día).</p>'));
  w.appendChild(el("p", "ntCap", "Media de la semana · " + con.length + (con.length === 1 ? " día con datos" : " días con datos")));
  var ks = ["fibra", "vitC", "folato", "prot", "grasa", "hierro", "magnesio", "potasio", "calcio", "b12", "vitD", "vitA", "vitE", "b6", "zinc", "yodo", "epadha"];
  w.appendChild(el("div", "ntCaja ntTiras", ks.map(function (k) {
    var m = N.media(S, k), o = ref && ref.obj[k];
    return G.tira({ nombre: N.NOMBRE[k], v: m.v, min: o ? o.min : null, max: o ? o.max : null, u: N.UNIDAD[k], supl: m.supl || 0 });
  }).join("")));
}
function vistaTendencias(w) { w.appendChild(el("p", "cocVacio", "Esta vista llega en la siguiente versión.")); }
function vistaFases(w) { w.appendChild(el("p", "cocVacio", "Esta vista llega en la siguiente versión.")); }
function vistaEntreno(w) { w.appendChild(el("p", "cocVacio", "Esta vista llega en la siguiente versión.")); }
function vistaMicros(w) { w.appendChild(el("p", "cocVacio", "Esta vista llega en la siguiente versión.")); }
function tablaNutri(D, obj) {
  var N = Nu(), w = el("div", "ntTabla"), filas = N.PRIORIDAD.concat(["kcal", "prot", "grasa"]), mas = ["hierro", "magnesio", "potasio", "b12", "vitD", "calcio", "vitA", "vitE", "b6", "zinc", "yodo", "epadha"];
  if (D.supl && D.supl.hay) mas.forEach(function (k) { if (D.supl.n[k] && filas.indexOf(k) < 0 && !NMAS) filas.push(k); });   // lo que traen tus suplementos, siempre a la vista
  var cs = D.supl && D.supl.hay;
  if (cs) w.classList.add("conSupl");
  w.appendChild(el("div", "ntFila ntCab", '<span>Nutriente</span><span>Plan.</span><span>Reg.</span>' + (cs ? '<span>Supl.</span>' : "") + '<span>Objetivo</span><span>%</span>'));
  (NMAS ? filas.concat(mas) : filas).forEach(function (k) {
    var o = obj && obj[k], t = D.total[k], pct = o && o.min ? Math.round(t / o.min * 100) : null, sinMicro = D.reg.sinMicros && !/kcal|prot|hc|grasa/.test(k);
    var b = el("button", "ntFila" + (N.PRIORIDAD.indexOf(k) >= 0 ? " prio" : ""), '<span>' + esc(N.NOMBRE[k]) + '<small>' + esc(N.UNIDAD[k]) + '</small></span><span>' + fmtN(D.plan.n[k], k) + '</span><span>' +
      (D.reg.n[k] ? fmtN(D.reg.n[k], k) : sinMicro ? "s/d" : "—") + '</span>' + (cs ? '<span class="ntSupl">' + (D.supl.n[k] ? fmtN(D.supl.n[k], k) : "—") + '</span>' : "") + '<span>' + (o ? rangoTxt(o) + (o.estimado ? '<small>estimado</small>' : "") : "—") + '</span><b>' + (pct == null ? "—" : pct + " %") + '</b>');
    b.setAttribute("aria-label", N.NOMBRE[k] + ": planificado " + fmtN(D.plan.n[k], k) + ", registrado " + fmtN(D.reg.n[k], k) + " " + N.UNIDAD[k] + (o ? ", objetivo " + rangoTxt(o) : ""));
    b.addEventListener("click", function () { NPORQUE = NPORQUE === k ? null : k; pinta(); });
    w.appendChild(b);
    if (NPORQUE === k) w.appendChild(el("p", "ntPorque", esc(o ? o.porque : "Pon tus datos para tener objetivos.")));
  });
  var m = el("button", "cocLink", NMAS ? "Menos nutrientes" : "Más nutrientes"); m.addEventListener("click", function () { NMAS = !NMAS; pinta(); });
  w.appendChild(m);
  var sin = D.plan.sinDatos.concat(D.reg.sinDatos);
  if (sin.length) w.appendChild(el("p", "ntNota", "Sin datos (no cuentan): " + esc(sin.slice(0, 4).join(" · ")) + (sin.length > 4 ? " y " + (sin.length - 4) + " más" : "") + "."));
  if (D.reg.estimado) w.appendChild(el("p", "ntNota", "Comer fuera es una estimación de energía y macros; sus vitaminas y minerales, sin datos (s/d)."));
  if (!obj) w.appendChild(el("p", "ntNota", "Sin tus datos no hay objetivos: la tabla solo suma."));
  else if (obj.kcal && obj.kcal.estimado && obj.mant) w.appendChild(el("p", "ntNota", "Energía estimada: " + (obj.mant.tmbEstimado ? "metabolismo basal con Mifflin-St Jeor (peso, altura y edad) = " : "tu basal ") +
    obj.mant.tmb + " kcal × 1,6. Pon tu mantenimiento en Tus datos para afinarla."));
  return w;
}
function registroRapido(fecha, regs) {
  var N = Nu(), w = el("div", "ntReg", '<h4 class="cocPcTit">Registrar lo que no está en el calendario</h4>'), ch = el("div", "ntFavs");
  N.FAVORITOS.forEach(function (f) {
    var b = el("button", "", esc(f.txt)); b.addEventListener("click", function () {
      var x = N.deFavorito(f, function (n) { return aliDe(n); });
      apuntaReg({ fecha: fecha, txt: f.txt, fav: f.id, n: x.n, sinDatos: x.sinDatos, estimado: !!x.estimado, micros: x.micros !== false });
      aviso("Registrado: " + f.txt + (x.estimado ? " (estimación)" : "") + ".");
    });
    ch.appendChild(b);
  });
  w.appendChild(ch);
  w.appendChild(formAnadir("ntOtra", "Otra cosa (p. ej. 200 g de yogur griego)", function (t) {
    var x = N.deTexto(t, function (n) { return aliDe(n); });
    apuntaReg({ fecha: fecha, txt: mayus1(t), n: x.n, sinDatos: x.sinDatos, estimado: false, micros: true });
    if (x.sinDatos.length) aviso("Apuntado, pero sin datos: " + x.sinDatos.join(", ") + "."); else aviso("Registrado.");
  }));
  if (regs.length) {
    var ul = el("ul", "cocCompra");
    regs.forEach(function (r) {
      var li = el("li", "ntRegIt", '<span>' + esc(r.txt) + '<small>' + fmtN(r.n.kcal, "kcal") + ' kcal · ' + fmtN(r.n.prot) + ' g prot. · ' + fmtN(r.n.hc) + ' g carb.' + (r.estimado ? " · estimación" : "") + '</small></span>');
      var q = el("button", "cocQuita", svg("cerrar")); q.setAttribute("aria-label", "Quitar " + r.txt);
      q.addEventListener("click", function () { guarda(K_REG, registro().filter(function (x) { return x.id !== r.id; })); pinta(); });
      li.appendChild(q); ul.appendChild(li);
    });
    w.appendChild(ul);
  }
  return w;
}
/* ------------------------------ suplementos (v2.48) ------------------------------
   Tus suplementos: su ficha (la misma de Casa, por unidad), cuándo los tomas, qué días y cuánto. Lo que
   aportan suma a los micros del día en su propia columna ("Supl.").                                   */
function suplementos() { return lee(K_SUPL, []); }
function tomaTxt(sp) {
  var N = Nu(), m = (sp.momentos || []).map(function (x) { return x.m === "hora" && x.hora ? x.hora : N.MOMENTOS[x.m] || x.m; }).join(", ");
  return (sp.dosis ? fmtN(sp.dosis.n) + " " + (sp.dosis.ud || "") : "") + (m ? " · " + m : "") + " · " + (N.DIAS_S[sp.dias || "todos"] || "").toLowerCase();
}
function seccionSupl(fecha, tipo, SPd) {
  var w = el("div", "ntReg ntSuplSec", '<h4 class="cocPcTit">Suplementos</h4>'), L = suplementos();
  if (FSUPL === "nuevo") { w.appendChild(formSupl(null)); return w; }
  if (!L.length) w.appendChild(el("p", "ntNota", "No tienes suplementos apuntados. Añádelos con su etiqueta y cuándo los tomas: lo que aportan suma a las vitaminas y minerales del día, marcado «suplemento»."));
  else {
    var ul = el("ul", "ntSuplL");
    L.forEach(function (sp) {
      var d = SPd.filter(function (x) { return x.nombre === sp.nombre; })[0], A = aliDe(sp.nombre);
      var est = !A || !A.nutri ? "sin etiqueta: no suma nada" : d && d.incompleta ? "su etiqueta no trae vitaminas ni minerales" : !d || !d.tomas ? "hoy no toca" : "suma hoy";
      var b = el("button", "ntSuplIt", '<span><b>' + esc(sp.nombre) + '</b><small>' + esc(tomaTxt(sp)) + '</small><small class="' + (/sin|no trae/.test(est) ? "ntAviso" : "") + '">' + esc(est) + '</small></span>' + svg("der"));
      b.addEventListener("click", function () { FICHAX = { nombre: sp.nombre, zona: "Suplementos", supl: true, sid: sp.id }; pinta(); });
      ul.appendChild(el("li")).appendChild(b);
    });
    w.appendChild(ul);
  }
  var a = el("button", "cocBtn", svg("mas") + "Añadir suplemento");
  a.addEventListener("click", function () { FSUPL = "nuevo"; pinta(); });
  w.appendChild(a);
  return w;
}
// dentro de la ficha de un suplemento: cuándo y cuánto (y cambiarlo o quitarlo)
function comoLoTomas(x) {
  var sp = suplementos().filter(function (s) { return s.id === x.sid || s.nombre === x.nombre; })[0];
  if (FSUPL && sp && FSUPL === sp.id) return formSupl(sp);
  var w = el("div", "cocPc", '<h4 class="cocPcTit">Cómo lo tomas</h4>' + (sp ? '<p class="ntNota" style="color:var(--fg)">' + esc(tomaTxt(sp)) + '</p>' : ""));
  if (sp) {
    var b = el("div", "cocPcB"), c = el("button", "", "Cambiar"), q = el("button", "", "Quitar");
    c.addEventListener("click", function () { FSUPL = sp.id; pinta(); });
    q.addEventListener("click", function () { guarda(K_SUPL, suplementos().filter(function (s) { return s.id !== sp.id; })); FICHAX = null; aviso("Quitado: " + sp.nombre + "."); pinta(); });
    b.appendChild(c); b.appendChild(q); w.appendChild(b);
  }
  return w;
}
function formSupl(sp) {
  var N = Nu(), f = el("form", "ntPerfil ntFormSupl"), d = sp || { nombre: "", dosis: { n: 1, ud: "cápsula" }, momentos: [{ m: "desayuno" }], dias: "todos" };
  var mom = {}; (d.momentos || []).forEach(function (x) { mom[x.m] = x.hora || true; });
  f.innerHTML = '<label>Nombre<input name="nombre" autocomplete="off" value="' + esc(d.nombre) + '" placeholder="p. ej. vitamina D3"' + (sp ? " readonly" : "") + '></label>' +
    '<label>Dosis por toma<input name="dosis" inputmode="decimal" autocomplete="off" value="' + esc(String(d.dosis.n).replace(".", ",")) + '"></label>' +
    '<div class="ntFavs" data-g="ud">' + ["cápsula", "comprimido", "cacito", "gotas", "g", "ml"].map(function (u) { return '<button type="button" data-v="' + u + '" aria-pressed="' + (d.dosis.ud === u) + '">' + u + '</button>'; }).join("") + '</div>' +
    '<p class="ntNota">Cuándo (puedes elegir varios)</p><div class="ntFavs" data-g="mom">' + Object.keys(N.MOMENTOS).map(function (m) { return '<button type="button" data-v="' + m + '" aria-pressed="' + !!mom[m] + '">' + esc(N.MOMENTOS[m]) + '</button>'; }).join("") + '</div>' +
    '<label>Hora (si es «a una hora»)<input name="hora" type="time" value="' + esc(typeof mom.hora === "string" ? mom.hora : "") + '"></label>' +
    '<p class="ntNota">Qué días</p><div class="ntFavs" data-g="dias">' + Object.keys(N.DIAS_S).map(function (k) { return '<button type="button" data-v="' + k + '" aria-pressed="' + ((d.dias || "todos") === k) + '">' + esc(N.DIAS_S[k]) + '</button>'; }).join("") + '</div>' +
    '<div class="cocPcB"><button class="si" type="submit">Guardar</button><button type="button" class="fsNo">Cancelar</button></div>';
  Array.prototype.forEach.call(f.querySelectorAll(".ntFavs"), function (g) {
    var multi = g.getAttribute("data-g") === "mom";
    Array.prototype.forEach.call(g.querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () {
        if (multi) b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
        else Array.prototype.forEach.call(g.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      });
    });
  });
  f.querySelector(".fsNo").addEventListener("click", function () { FSUPL = null; pinta(); });
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var nom = f.elements.nombre.value.trim(); if (!nom) { f.elements.nombre.focus(); return; }
    var sel = function (g) { return Array.prototype.filter.call(f.querySelectorAll('[data-g="' + g + '"] button'), function (b) { return b.getAttribute("aria-pressed") === "true"; }).map(function (b) { return b.getAttribute("data-v"); }); };
    var n = parseFloat(String(f.elements.dosis.value).replace(",", ".")), hora = f.elements.hora.value;
    var ms = sel("mom").map(function (m) { return m === "hora" ? { m: m, hora: hora || null } : { m: m }; });
    var x = { id: sp ? sp.id : nuevoId(), nombre: mayus1(nom), dosis: { n: isFinite(n) && n > 0 ? n : 1, ud: sel("ud")[0] || "cápsula" }, momentos: ms.length ? ms : [{ m: "desayuno" }], dias: sel("dias")[0] || "todos" };
    var L = suplementos().filter(function (s) { return s.id !== x.id; }); L.push(x); guarda(K_SUPL, L);
    aseguraAli({ nombre: x.nombre, zona: "Suplementos" });
    FSUPL = null;
    if (!sp) FICHAX = { nombre: x.nombre, zona: "Suplementos", supl: true, sid: x.id };   // nuevo: a su ficha, para la etiqueta
    aviso("Guardado: " + x.nombre + "."); pinta();
  });
  return f;
}
function apuntaReg(x) { x.id = nuevoId(); x.t = Date.now(); var L = registro(); L.push(x); guarda(K_REG, L.slice(-1500)); pinta(); }
// tus datos: solo en este movil
function hojaPerfil(p, primera) {
  p = p || {};
  var f = el("form", "ntPerfil");
  f.innerHTML = (primera ? '<p class="ntNota"><b>Para calcular tus objetivos</b> hacen falta tu peso, tu altura y tu edad. Se quedan en este móvil: no salen de aquí.</p>' : "") +
    [["peso", "Peso (kg)", "decimal"], ["altura", "Altura (cm)", "numeric"], ["edad", "Edad", "numeric"], ["grasa", "% de grasa (opcional)", "decimal"],
     ["bmr", "Metabolismo basal, kcal (opcional)", "numeric"], ["mant", "Mantenimiento, kcal (opcional)", "numeric"]].map(function (c) {
      return '<label>' + esc(c[1]) + '<input name="' + c[0] + '" inputmode="' + c[2] + '" autocomplete="off" value="' + esc(p[c[0]] != null ? String(p[c[0]]).replace(".", ",") : "") + '"></label>';
    }).join("") + (function () {
      var N = Nu(), r = N.reposo(p), m = N.mantenimiento(p);
      return '<p class="ntNota">La grasa y el basal son opcionales. Sin grasa, todo va por kg de peso (el medio de la semana si lo pones).' +
        (r && !(p.bmr > 0) ? ' Basal <b>estimado</b>: ' + r + ' kcal (Mifflin-St Jeor).' : "") + (m && m.estimado ? ' Mantenimiento <b>estimado</b>: ' + m.kcal + ' kcal.' : "") + '</p>';
    })() + '<button class="cocGo" type="submit">Guardar</button>';
  f.addEventListener("submit", function (e) {
    e.preventDefault(); var q = {}, ok = true;
    ["peso", "altura", "edad", "grasa", "bmr", "mant"].forEach(function (k) { var v = parseFloat(String(f.elements[k].value).replace(",", ".")); if (isFinite(v) && v > 0) q[k] = v; });
    if (!q.peso || !q.altura || !q.edad) { aviso("Faltan el peso, la altura o la edad."); return; }
    q.sexo = p.sexo || "h"; guarda(K_PERFIL, q); NPERFIL = false; aviso("Guardado en este móvil."); pinta();
  });
  return f;
}
// la semana: su fase, tu peso medio y lo que quieras cambiar de sus objetivos
function hojaSemana(fecha, semanas, perfil, tipo) {
  var N = Nu(), L = N.lunes(fecha), sm = semanas[L] || {}, F = N.faseDe(fecha, semanas), w = el("div", "cocPc ntSemana");
  var obj = N.objetivos(perfil, fecha, semanas, tipo || "gimnasio");
  w.innerHTML = '<h4 class="cocPcTit">Semana del ' + esc(corta(L)) + '</h4><p class="ntNota">' + esc(obj ? obj.porque : "") + '</p>';
  var fz = el("div", "ntFavs");
  Object.keys(N.FASES).forEach(function (k) {
    var b = el("button", "", esc(N.FASES[k].nombre)); b.setAttribute("aria-pressed", String(F.semana === k));
    b.addEventListener("click", function () { var S = lee(K_SEMANAS, {}); S[L] = Object.assign({}, S[L] || {}, { fase: k }); guarda(K_SEMANAS, S); pinta(); });
    fz.appendChild(b);
  });
  w.appendChild(fz);
  var f = el("form", "ntPerfil");
  f.innerHTML = '<label>Peso medio de esta semana (kg)<input name="peso" inputmode="decimal" autocomplete="off" value="' + esc(sm.peso ? String(sm.peso).replace(".", ",") : "") + '" placeholder="' + esc(String(perfil.peso).replace(".", ",")) + '"></label>' +
    ["kcal", "prot", "hc", "grasa"].map(function (k) {
      var o = obj && obj[k]; return '<label>' + esc(N.NOMBRE[k]) + ' (' + esc(N.UNIDAD[k]) + ')' + '<input name="' + k + '" autocomplete="off" value="' + esc(o && o.propio ? o.min + "-" + o.max : "") + '" placeholder="' + esc(o ? o.min + "-" + o.max : "") + '"></label>';
    }).join("") + '<div class="cocPcB"><button class="si" type="submit">Guardar la semana</button><button type="button" class="ntBorra">Lo de la fase</button></div>';
  f.addEventListener("submit", function (e) {
    e.preventDefault(); var S = lee(K_SEMANAS, {}), x = Object.assign({}, S[L] || {}), aj = {};
    var pe = parseFloat(String(f.elements.peso.value).replace(",", ".")); if (isFinite(pe) && pe > 0) x.peso = pe; else delete x.peso;
    ["kcal", "prot", "hc", "grasa"].forEach(function (k) { var m = String(f.elements[k].value).match(/(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)/); if (m) aj[k] = [parseFloat(m[1].replace(",", ".")), parseFloat(m[2].replace(",", "."))]; });
    x.ajustes = aj; S[L] = x; guarda(K_SEMANAS, S); NSEMANA = false; aviso("Semana guardada."); pinta();
  });
  f.querySelector(".ntBorra").addEventListener("click", function () { var S = lee(K_SEMANAS, {}); delete S[L]; guarda(K_SEMANAS, S); pinta(); });
  w.appendChild(f);
  return w;
}

/* HOY, a la hora de una comida: su tarjeta en grande (la misma de Semana). Tocarla abre
   Cocina; su botón cocina paso a paso desde aquí, y "atrás" vuelve a HOY.                */
API.tarjetaHoy = function (ev, ctx) {
  ponCSS(); ctx = ctx || {};
  var E = estado(ctx.dia || [ev]), R = comida(ev);
  if (!E.Rs.some(function (x) { return x.uid === R.uid; })) E.Rs.push(R);
  var card = tarjeta(R, E, "", ctx);
  if (!card.querySelector(".tjGo")) {
    var ver = el("button", "tjGo", svg("olla") + "Ver en Cocina");
    ver.addEventListener("click", function (e) { e.stopPropagation(); if (ctx.abre) ctx.abre(R.uid); });
    card.appendChild(ver);
  }
  card.addEventListener("click", function (e) {
    if (!(e.target.closest && e.target.closest("button")) && ctx.abre) ctx.abre(R.uid);
  });
  // recetas y despensa al dia: si llegan cambios, HOY se repinta (una vez)
  var tr = RJ.t, tn = NOTA && NOTA.t;
  recetas(function () { if (RJ.t !== tr && ctx.repinta) ctx.repinta(); });
  nota(ctx.conf, function () { if ((NOTA && NOTA.t) !== tn && ctx.repinta) ctx.repinta(); });
  return card;
};
API.diseno = function () { return "C"; };   // el elegido el 30/09: como las tarjetas de HOY

/* Una rutina del calendario "Claude" (la de noche, p. ej.) con el mismo modo paso a paso. */
API.hayGuia = function (ev) { return pasosGuia(ev).length >= 2; };
API.guia = function (ev, ctx) {
  var P = pasosGuia(ev), M = Modo(); if (P.length < 2 || !M) return false;
  if (ctx) MCTX = ctx;
  return M.abre({ guia: { uid: ev.uid, titulo: Rc().sinEmoji(ev.titulo).replace(/\s+/g, " ").trim() }, pasos: P }, ctxModo(MCTX || {}));
};
API.atras = function () {                   // el gesto de atras: el escaner, la ficha, luego el paso a paso
  if (ESC) { cierraEscaner(true); return true; }
  if (FICHAX && enTab()) { if (FFORM) FFORM = false; else if (FSUPL) FSUPL = null; else FICHAX = null; pinta(); return true; }
  if (TOCADO && SUB === "tengo" && enTab()) { if (FFORM) FFORM = false; else TOCADO = null; pinta(); return true; }
  var M = Modo();
  return !!(M && M.atras && M.atras());
};

/* ------------------------------- el escaner -------------------------------
   La camara de atras y BarcodeDetector (Chrome en Android); si no hay camara o no
   lo sabe leer, el numero se escribe a mano. En la app Android, el escaner de Google.
   Cada producto entra en Tengo
   como comprado (con su zona) y se sigue escaneando.                           */
var ESC = null;
function abreEscaner(ficha) {
  ponCSS();
  var box = document.getElementById("cocEsc") || document.body.appendChild(el("div"));
  box.id = "cocEsc"; box.hidden = false;
  ESC = { box: box, stream: null, det: null, parado: false, res: null, zona: "Despensa", hechos: [], t: null, ficha: ficha || null };
  if (MCTX && MCTX.marca) MCTX.marca("escaner");
  box.innerHTML = '<div class="eTop"><button class="eX" aria-label="Salir">' + svg("cerrar") + '</button><span>Escanear lo que has comprado</span></div>' +
    '<div class="eCuerpo"><div class="eCam"><video playsinline muted></video><div class="eVisor" hidden></div><div class="eSin">Abriendo la cámara…</div></div>' +
    '<form class="eMano"><input inputmode="numeric" pattern="[0-9]*" maxlength="14" placeholder="o escribe el número" aria-label="Número del código de barras"><button type="submit">Buscar</button></form>' +
    '<div class="eRes" hidden></div><ul class="eLista"></ul></div><button class="eFin">Terminar</button>';
  box.querySelector(".eX").onclick = box.querySelector(".eFin").onclick = function () { cierraEscaner(false); };
  box.querySelector(".eMano").onsubmit = function (ev) { ev.preventDefault(); var v = box.querySelector("input").value.replace(/\D/g, ""); if (esCodigo(v)) buscaCodigo(v); else avisoEsc("Un código de barras tiene 8 o 13 números."); };
  var sin = box.querySelector(".eSin"), video = box.querySelector("video");
  // en la app Android: el escaner de Google (su pantalla); al volver, lo encontrado sale aqui
  if (window.Nativo && Nativo.es) {
    if (!Nativo.escanea) { sin.innerHTML = "Para escanear con la cámara, instala la app nueva: <b>Ajustes → Instalar la app nueva</b>. Mientras, escribe el número."; return; }
    ESC.nativo = true; box.querySelector(".eCam").classList.add("nativo"); escaneaNativo(); return;
  }
  if (!("BarcodeDetector" in window)) { sin.textContent = "Este navegador no sabe leer códigos con la cámara. Escribe el número de debajo de las barras."; return; }
  try { ESC.det = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] }); } catch (e) { sin.textContent = "No se puede leer con la cámara aquí. Escribe el número."; return; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { sin.textContent = "Sin cámara aquí. Escribe el número."; return; }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }).then(function (st) {
    if (!ESC) { st.getTracks().forEach(function (t) { t.stop(); }); return; }
    ESC.stream = st; video.srcObject = st; video.play().catch(function () {});
    sin.hidden = true; box.querySelector(".eVisor").hidden = false; mira();
  }, function () {
    sin.textContent = "Sin permiso para la cámara. Dáselo en el candado de la barra, o escribe el número.";
  });
  function mira() {
    if (!ESC || !ESC.det) return;
    if (!ESC.parado && video.readyState >= 2) {
      ESC.det.detect(video).then(function (c) { if (ESC && !ESC.parado && c && c.length && esCodigo(c[0].rawValue)) buscaCodigo(c[0].rawValue); }, function () {});
    }
    ESC.t = setTimeout(mira, 300);
  }
}
function escaneaNativo() {
  if (!ESC) return;
  var sin = ESC.box.querySelector(".eSin");
  ESC.box.querySelector(".eCam").hidden = false; sin.hidden = false; sin.innerHTML = "Abriendo el escáner…";
  Nativo.escanea().then(function (r) {
    if (!ESC) return;
    if (r && r.codigo && esCodigo(r.codigo)) { ESC.box.querySelector(".eCam").hidden = true; buscaCodigo(String(r.codigo)); return; }
    if (r && r.codigo) { otraVez(); avisoEsc("Ese código no es de un producto (" + r.codigo + ")."); return; }
    if (!ESC.hechos.length) { cierraEscaner(false); return; }   // lo has cerrado sin escanear nada
    otraVez();
  }, function (e) {
    if (!ESC) return;
    var m = String(e && e.message || e || "");
    sin.innerHTML = /download|descarg|unavailable|module/i.test(m)
      ? "El escáner de Google se está instalando en el móvil. Prueba otra vez en un minuto, o escribe el número."
      : "No se ha podido abrir el escáner (" + esc(m.slice(0, 80)) + "). Escribe el número.";
    otraVez(true);
  });
}
function otraVez(conTexto) {                 // el boton para volver a abrir el escaner de Google
  var sin = ESC.box.querySelector(".eSin");
  if (!conTexto) sin.innerHTML = "";
  var b = el("button", "eOtraVez", svg("barras") + "Escanear");
  b.onclick = escaneaNativo;
  sin.appendChild(b);
}
function avisoEsc(t) { var r = ESC && ESC.box.querySelector(".eRes"); if (!r) return; r.hidden = false; r.innerHTML = '<p>' + esc(t) + '</p>'; }
function buscaCodigo(codigo) {
  if (!ESC) return;
  ESC.parado = true; pita(1);
  var r = ESC.box.querySelector(".eRes"); r.hidden = false;
  var tuyo = Al().porCodigo(alimentos(), codigo);
  if (tuyo) { resultado(codigo, null, false, tuyo); return; }   // ya lo conoces: con tu nombre, sin preguntar
  r.innerHTML = '<small>Código ' + esc(codigo) + '</small><p>Buscando en Open Food Facts…</p>';
  fetch(OFF_URL + encodeURIComponent(codigo) + ".json?fields=code,product_name,product_name_es,generic_name,generic_name_es,brands,quantity,serving_size,serving_quantity,categories_tags,nutriments,nutriscore_grade", { cache: "no-store" })
    .then(function (x) { return x.json(); }).then(function (j) { resultado(codigo, productoOFF(j)); }, function () { resultado(codigo, null, true); });
}
/* Lo escaneado entra con TU nombre (v2.39). Un código que ya conoces sale con tu nombre y no
   pregunta; uno nuevo propone lo tuyo que se parece (para no duplicar) o el nombre del paquete,
   y el de Open Food Facts queda como alias, con su código y su nutrición (fuente OFF).        */
function resultado(codigo, p, sinRed, tuyo) {
  if (!ESC) return;
  var r = ESC.box.querySelector(".eRes"), H = estado(CTX && CTX.dia || []).H;
  var formato = tuyo ? ((tuyo.codigos || []).filter(function (c) { return c.ean === codigo; })[0] || {}).formato || "" : p ? p.cantidad : "";
  var sug = tuyo ? [] : p ? Al().sugiere(alimentos(), H ? H.todos : [], p.nombre, p.marca) : [];
  ESC.res = p; ESC.tuyo = tuyo || null; ESC.uds = 1;
  ESC.zona = (tuyo && tuyo.zona) || (p ? p.zona : "Despensa salada");
  ESC.nom = tuyo ? { nombre: tuyo.nombre, id: tuyo.id } : sug[0] ? { nombre: sug[0].nombre, id: sug[0].id || null } : null;
  var h = '<small>Código ' + esc(codigo) + '</small>';
  if (tuyo) {
    h += '<h3>' + esc(tuyo.nombre) + '</h3><p>Ya lo conoces: sale con tu nombre.' + ((tuyo.alias || [])[0] ? ' El paquete dice «' + esc(tuyo.alias[0]) + '».' : "") + '</p>';
  } else if (p) {
    h += '<p>El paquete dice <b>«' + esc(p.nombre) + '»</b>' + (p.marca || p.cantidad ? ' · ' + esc([p.marca, p.cantidad].filter(Boolean).join(" · ")) : "") + '</p>' +
      '<h4 class="eCap">¿Cómo lo llamas tú?</h4><div class="eNoms">' + sug.map(function (x, i) {
        return '<button data-i="' + i + '" aria-pressed="' + (i === 0) + '">' + esc(x.nombre) + (x.por === "tuyo" || x.por === "casa" ? '<small>ya lo tienes</small>' : "") + '</button>';
      }).join("") + '<button data-i="otro" aria-pressed="false">Otro nombre</button></div>' +
      '<input class="eNom" placeholder="Tu nombre (p. ej. atún en lata)" aria-label="Tu nombre" hidden>' +
      '<p class="eNota">' + (sug[0] && sug[0].id ? "Se junta con lo tuyo: no se duplica." : "Tu nombre es el que sale en Casa y en Comprar. El del paquete se guarda aparte.") + '</p>';
  } else {
    h += '<h3>' + (sinRed ? "Sin conexión" : "No está en Open Food Facts") + '</h3><p>Escribe cómo lo llamas y se apunta igual.</p>' +
      '<input class="eNom" placeholder="Tu nombre (p. ej. crema de calabaza)" aria-label="Tu nombre">';
  }
  var nu = (tuyo && tuyo.nutri) || (p && p.nutri);
  if (nu) h += '<p class="eNutri">Por ' + esc(nu.por || "100 g") + ': <b>' + esc(nutriTxt(nu)) + '</b>' + (nu.nutriscore ? ' · Nutri-Score ' + esc(nu.nutriscore) : "") +
    ' <span class="eFuente">' + esc(nu.fuente || "OFF") + '</span></p>';
  h += '<div class="eUds"><span>Cuántos</span><button class="eMenos" aria-label="Uno menos">−</button><b>1</b><button class="eMasU" aria-label="Uno más">+</button><em></em></div>' +
    '<div class="eZonas">' + Dp().ZONAS.map(function (z) { return '<button aria-pressed="' + (z === ESC.zona) + '">' + z + '</button>'; }).join("") + '</div>' +
    '<button class="eOk">A la despensa</button><button class="eOtro">Otro producto</button>';
  r.innerHTML = h;
  Array.prototype.forEach.call(r.querySelectorAll(".eZonas button"), function (b) {
    b.onclick = function () { ESC.zona = b.textContent; Array.prototype.forEach.call(r.querySelectorAll(".eZonas button"), function (x) { x.setAttribute("aria-pressed", x === b); }); };
  });
  var inp = r.querySelector(".eNom");
  Array.prototype.forEach.call(r.querySelectorAll(".eNoms button"), function (b) {
    b.onclick = function () {
      var i = b.getAttribute("data-i");
      Array.prototype.forEach.call(r.querySelectorAll(".eNoms button"), function (x) { x.setAttribute("aria-pressed", x === b); });
      if (i === "otro") { ESC.nom = null; inp.hidden = false; inp.focus(); }
      else { ESC.nom = { nombre: sug[+i].nombre, id: sug[+i].id || null }; inp.hidden = true; }
      var nota = r.querySelector(".eNota");
      if (nota) nota.textContent = ESC.nom && ESC.nom.id ? "Se junta con lo tuyo: no se duplica." : "Tu nombre es el que sale en Casa y en Comprar. El del paquete se guarda aparte.";
    };
  });
  // cuantos has comprado: con lo que trae el paquete, el total ("2 × 240 g" -> 480 g)
  function total() {
    var f = Al().formato(formato);
    return f ? { n: Math.round(f.total.n * ESC.uds * 100) / 100, ud: f.total.ud } : { n: ESC.uds, ud: "ud" };
  }
  function pintaUds() {
    r.querySelector(".eUds b").textContent = ESC.uds;
    var f = Al().formato(formato), t = total();
    r.querySelector(".eUds em").textContent = f ? "= " + Rc().cantTxt(t) + (f.uds > 1 ? " (" + f.uds * ESC.uds + " × " + Rc().cantTxt(f.cada) + ")" : "") : "";
  }
  r.querySelector(".eMenos").onclick = function () { ESC.uds = Math.max(1, ESC.uds - 1); pintaUds(); };
  r.querySelector(".eMasU").onclick = function () { ESC.uds = Math.min(24, ESC.uds + 1); pintaUds(); };
  pintaUds();
  r.querySelector(".eOk").onclick = function () {
    var nom = ESC.nom ? ESC.nom.nombre : (inp && inp.value || "").trim();
    if (!nom) { if (inp) { inp.hidden = false; inp.focus(); } return; }
    var A = guardaAli(Al().registra(alimentos(), { id: ESC.nom && ESC.nom.id, nombre: nom, codigo: codigo, offNombre: p ? p.nombre : "", marca: p ? p.marca : "",
      formato: formato, nutri: p && p.nutri, fuente: "OFF", zona: ESC.zona }).A);
    var t = total(), txt = Rc().cantTxt(t) + (t.ud === "ud" ? " " : " de ") + A.nombre.charAt(0).toLowerCase() + A.nombre.slice(1);
    var cb = { t: Date.now(), tipo: "compra", items: [txt], zona: ESC.zona, codigo: codigo, ali: A.id };
    if (A.nutri) cb.nutri = A.nutri;
    apunta(cb);
    ESC.hechos.push({ txt: txt, zona: ESC.zona });
    ESC.box.querySelector(".eLista").innerHTML = '<li><b>Añadido ahora</b></li>' + ESC.hechos.map(function (h) { return '<li>' + esc(h.txt) + '<small>' + esc(h.zona) + '</small></li>'; }).join("");
    otro();
  };
  r.querySelector(".eOtro").onclick = otro;
  if (ESC.ficha) {                                  // v2.47: para la ficha de un alimento de Casa (no es una compra)
    var X = ESC.ficha;
    Array.prototype.forEach.call(r.querySelectorAll(".eUds,.eZonas,.eNoms,.eCap,.eNota,.eNom"), function (e) { e.hidden = true; e.style.display = "none"; });
    var ok2 = r.querySelector(".eOk");
    ok2.textContent = p && p.nutri ? "Usar para la ficha de «" + X.nombre + "»" : "Rellenar la ficha a mano";
    ok2.onclick = function () {
      if (p && p.nutri) {
        var A0 = aliDe(X.nombre);
        guardaAli(Al().registra(alimentos(), { id: A0 && A0.id, nombre: X.nombre, codigo: codigo, offNombre: p.nombre, marca: p.marca, formato: p.cantidad, nutri: p.nutri, fuente: "OFF", zona: X.zona }).A);
        aviso("Ficha de " + X.nombre + ": de Open Food Facts.");
      } else FFORM = true;
      cierraEscaner(false);
    };
  }
  function otro() {
    r.hidden = true; r.innerHTML = ""; ESC.box.querySelector("input").value = "";
    if (ESC.nativo) { ESC.parado = false; escaneaNativo(); return; }   // el siguiente, con el de Google
    setTimeout(function () { if (ESC) ESC.parado = false; }, 800);
  }
}
function cierraEscaner(desdeAtras) {
  if (!ESC) return;
  clearTimeout(ESC.t);
  if (ESC.stream) ESC.stream.getTracks().forEach(function (t) { t.stop(); });
  ESC.box.hidden = true; ESC.box.innerHTML = ""; ESC = null;
  if (!desdeAtras && history.state && history.state.pant === "escaner" && MCTX && MCTX.atrasManual) MCTX.atrasManual();
  if (enTab()) pinta();
}
function di(t) {
  if (!t || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  try { var u = new SpeechSynthesisUtterance(t); u.lang = "es-ES"; u.rate = 1.02; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}
var ac = null;
function pita(n) {
  if (window.Nativo && Nativo.tono) { Nativo.tono(true).catch(function () {}); return; }
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    for (var k = 0; k < (n || 2); k++) {
      var o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + k * 0.22;
      o.frequency.value = 880; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18); o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 0.2);
    }
  } catch (e) {}
  try { if (navigator.vibrate) navigator.vibrate([150, 80, 150]); } catch (e) {}
}
})();

return API;
});
