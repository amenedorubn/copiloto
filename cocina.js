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

var RECETAS_URL = "https://raw.githubusercontent.com/amenedorubn/cocina/main/recetas/";
var K_RECETAS = "copiloto.cocina.recetas.v1", K_CAMBIOS = "copiloto.cocina.cambios.v1",
    K_NOTA = "copiloto.cocina.nota.v1", K_LISTA = "copiloto.cocina.lista.v1";

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
           : /dairies|dairy|yogurt|cheese|meat|poultry|fish|fresh|refrigerat|milk|eggs|cream|sausage|ham/.test(cats) ? "Nevera" : "Despensa";
  nombre = mayus1(nombre.toLowerCase());
  var out = { codigo: String(j.code || ""), nombre: nombre, marca: marca, cantidad: cant, zona: zona,
              txt: nombre + (marca || cant ? " (" + [marca, cant].filter(Boolean).join(", ") + ")" : "") };
  var nu = nutricion(p); if (nu) out.nutri = nu;
  return out;
}
// lo que trae la etiqueta por 100 g (o 100 ml): lo que no venga, fuera
var NUTRI = [["kcal", "energy-kcal_100g"], ["prot", "proteins_100g"], ["hc", "carbohydrates_100g"], ["azucar", "sugars_100g"],
             ["grasa", "fat_100g"], ["sat", "saturated-fat_100g"], ["fibra", "fiber_100g"], ["sal", "salt_100g"]];
function nutricion(p) {
  var n = p && p.nutriments; if (!n) return null;
  var out = {}, hay = false;
  NUTRI.forEach(function (k) {
    var v = n[k[1]];
    if (k[0] === "kcal" && (v == null || v === "") && n["energy_100g"] != null) v = n["energy_100g"] / 4.184;   // solo kJ
    v = parseFloat(v);
    if (isFinite(v) && v >= 0) { out[k[0]] = Math.round(v * 10) / 10; hay = true; }
  });
  if (!hay) return null;
  out.por = /\d\s*(ml|cl|l)\b/i.test(String(p.quantity || "")) ? "100 ml" : "100 g";
  if (p.nutriscore_grade && /^[a-e]$/.test(p.nutriscore_grade)) out.nutriscore = p.nutriscore_grade.toUpperCase();
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
  OFF_URL: OFF_URL, RECETAS_URL: RECETAS_URL, K: { recetas: K_RECETAS, cambios: K_CAMBIOS, nota: K_NOTA, lista: K_LISTA } };

/* ================================ pantalla ================================
   Cocina.pinta(contenedor, ctx) con ctx = {dia, hoy, ahora, conf, marca, atrasManual, sel, activa}
   Subpestañas: Semana · Comprar · Tengo · Recetas (fijas arriba; se pasa deslizando).      */
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
ICO.carro = '<path d="M230.14,58.87A8,8,0,0,0,224,56H62.68L56.6,22.57A8,8,0,0,0,48.73,16H24a8,8,0,0,0,0,16h18L67.56,172.29a24,24,0,0,0,5.33,11.27,28,28,0,1,0,44.4,8.44h45.42A27.75,27.75,0,0,0,160,204a28,28,0,1,0,28-28H91.17a8,8,0,0,1-7.87-6.57L80.13,152h116a24,24,0,0,0,23.61-19.71l12.16-66.86A8,8,0,0,0,230.14,58.87ZM104,204a12,12,0,1,1-12-12A12,12,0,0,1,104,204Zm96,0a12,12,0,1,1-12-12A12,12,0,0,1,200,204Zm4-74.57A8,8,0,0,1,196.1,136H77.22L65.59,72H214.41Z"/>';
ICO.copia = '<path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/>';
ICO.lista = '<path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z"/>';
function svg(k, cls) { return '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '>' + ICO[k] + '</svg>'; }
API.icono = function () { return svg("olla"); };
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function lee(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
function guarda(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
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
  ".cocToast{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:95;background:var(--fg);color:var(--bg);border-radius:16px;padding:14px 16px;font:700 15px/1.4 Manrope,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)}" +
  "";;
CSS +=
  /* ---- subpestañas, Comprar y Tengo ---- */
  ".cocTabs{position:sticky;top:0;z-index:3;background:var(--bg);padding:0 0 10px}" +
  ".cocSeg{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:2px;padding:4px;border-radius:18px;background:var(--sf)}" +
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
function ponCSS() {
  if (document.getElementById("cocCss")) return;
  var st = document.createElement("style"); st.id = "cocCss"; st.textContent = CSS; document.head.appendChild(st);
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
function deLista(id) { var L = lista(); L.forEach(function (x) { if (x.id === id) { x.borrado = true; x.tb = Date.now(); } }); guarda(K_LISTA, L); subeLuego(); }
/* Los cambios y la lista, tambien en el Worker (/cocina): el movil y Chrome ven lo mismo. Se
   sube al cambiar algo (1,5 s despues) y se baja al abrir la pestaña. Sin red, espera.   */
var SUBE = null, subiendo = false;
function subeLuego() { clearTimeout(SUBE); SUBE = setTimeout(sincroniza, 1500); }
function sincroniza() {
  var conf = (CTX && CTX.conf) || (MCTX && MCTX.conf);
  if (!conf || !conf.url || !conf.key || subiendo || typeof fetch !== "function") return;
  subiendo = true;
  var antes = JSON.stringify([conId(cambios()), lista()]), cuerpo = { cambios: conId(cambios()), lista: lista() };
  fetch(conf.url.replace(/\/+$/, "") + "/cocina", { method: "POST", cache: "no-store",
    headers: { "X-Copiloto-Key": conf.key, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo) })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!j || !Array.isArray(j.cambios)) return;
      var C2 = mezcla(cambios(), j.cambios, 400), L2 = mezcla(lista(), j.lista || [], 300);   // y lo de aqui mientras tanto
      guarda(K_CAMBIOS, C2); guarda(K_LISTA, L2);
      if (JSON.stringify([C2, L2]) !== antes && enTab()) pinta();
    }, function () {})
    .then(function () { subiendo = false; });
}

/* --------------------------- todo lo de un momento ---------------------------
   Las comidas del calendario (pasadas y futuras), la despensa y lo apuntado, a la hora de
   ahora (no la de cuando se abrio la pestaña).                                           */
function ahoraOpts() { var t = Date.now(); return { hoy: isoDe(t), ahora: hmDe(t), ahoraMs: t }; }
function estado(dia) {
  var o = ahoraOpts(), Rs = comidasDe(dia), D = NOTA && NOTA.texto ? Dp().despensa(NOTA.texto) : null, CB = cambios();
  var hayBase = !!D || vigentes(CB).some(function (cb) { return cb.tipo === "inventario"; });
  return { o: o, Rs: Rs, D: D, CB: CB, hayBase: hayBase, H: hayBase ? Dp().casa(D, CB, Rs, o) : null };
}

/* ------------------------------ la pantalla ------------------------------ */
// CTX: el de la pestaña Cocina. MCTX: el de quien abrio el modo paso a paso o el escaner (la
// pestaña, o HOY), para su marca en el historial.
var CTX = null, MCTX = null, SEL = null, cont = null, RELOJ = null;
function enTab() { return !!(cont && document.body.contains(cont) && CTX && (!CTX.activa || CTX.activa())); }
var SUBS = [["semana", "Semana"], ["comprar", "Comprar"], ["tengo", "Tengo"], ["recetas", "Recetas"]];
var SUB = "semana", ZONA = null, TOCADO = null, ANADIR = false, ENTRA = 0, RECUENTO = null, COPIA = null, PASADA = null;
function subDe(s) { return s === "ahora" ? "semana" : SUBS.some(function (x) { return x[0] === s; }) ? s : "semana"; }
API.pinta = function (c, ctx) {
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
  ENTRA = ks.indexOf(s) > ks.indexOf(SUB) ? 1 : -1; SUB = s; TOCADO = null; ANADIR = false; RECUENTO = null; COPIA = null; PASADA = null;
  pinta(); cont.scrollTop = 0;
}
function pinta() {
  var c = cont; if (!c) return;
  var E = estado(CTX.dia);
  var LC = listaCompra(E);
  var y = c.scrollTop, foco = document.activeElement && document.activeElement.id; c.innerHTML = "";
  c.appendChild(barra(LC.n));
  var pag = SUB === "comprar" ? compra(E, LC) : SUB === "tengo" ? tengo(E) : SUB === "recetas" ? listaRecetas(E) : semana(E);
  if (ENTRA) { pag.classList.add(ENTRA > 0 ? "cocDer" : "cocIzq"); ENTRA = 0; }
  c.appendChild(pag);
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
    if (e.target.closest && e.target.closest(".cocChips,input,textarea,select")) return;
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

/* ------------------------------ Comprar ------------------------------
   Lo que piden las comidas que quedan (despensa.js) y lo que apuntas tú. Marcarlo = comprado
   (entra en Tengo; "En el carro" 12 h para deshacerlo). "Me queda" quita la duda.           */
function listaCompra(E) {
  var vivos = vigentes(E.CB), F = E.hayBase ? Dp().faltan(E.D, E.CB, E.Rs, E.o) : null, items = [];
  var carro = vivos.filter(function (cb) { return cb.tipo === "compra" && cb.lista && Date.now() - cb.t < 12 * 3600e3; });
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
function compra(E, LC) {
  var s = el("section", "cocSec cocComprar"), n = LC.items.length, F = LC.F, o = E.o;
  var sub = !E.hayBase ? (NOTA && NOTA.error ? "Lo de las comidas sale cuando se pueda leer lo que tienes." : "Leyendo lo que tienes…")
          : !F || !F.n ? "No quedan comidas en el plan. Lo que apuntes, aquí."
          : "Para " + (F.n === 1 ? "la comida que queda" : "las " + F.n + " comidas que quedan") + ", hasta el " + F.hastaTxt;
  s.innerHTML = '<p class="cocLead">' + (n ? n + (n === 1 ? " cosa" : " cosas") + " que comprar" : "Nada que comprar") + '</p><p class="sub">' + esc(sub) + '</p>';
  if (!n && E.hayBase && F && F.n) s.appendChild(el("p", "cocVacio", "Lo de las comidas ya está en Tengo."));
  if (n) {
    var ul = el("ul", "cocCompra");
    LC.items.forEach(function (it) {
      var li = el("li", it.dudoso ? "duda" : "");
      // con duda, la cantidad va con el nombre: a la derecha esta "Me queda"
      var b = el("button", "cocMarca", '<i></i><span>' + esc(it.ver + (it.dudoso && it.cant ? " · " + it.cant : "")) +
        (it.dudoso ? '<small>¿Te queda? ' + esc(it.razon || "") + '</small>' : it.para ? '<small>Para: ' + esc(Dp().paraTxt(it, o.hoy)) + '</small>' : "") +
        '</span><em>' + esc(it.dudoso ? "" : it.cant || "") + '</em>');
      b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-label", "Comprado: " + it.ver);
      b.addEventListener("click", function () {       // al carro: ya esta en Tengo
        apunta({ tipo: "compra", items: [it.ver], zona: Dp().zonaPara(it.ver), lista: it.k });
        if (it.mio) deLista(it.id);
        pinta();
      });
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
      ul.appendChild(li);
    });
    s.appendChild(ul);
  }
  s.appendChild(formAnadir("cocAnadeCompra", "Añadir a la lista", function (t) { aLista(t); }));
  if (LC.carro.length) {
    var c = el("div", "cocZona", '<h4>En el carro<small>ya en Tengo · toca para quitarlo</small></h4>'), uc = el("ul", "cocCompra");
    LC.carro.forEach(function (cb) {
      var nom = (cb.items || []).map(function (x) { var g = Rc().ingrediente(x); return mayus1(g.ver || g.base || x); }).join(", ");
      var b = el("button", "cocMarca", '<i>' + svg("tick") + '</i><span>' + esc(nom) + '</span><em></em>');
      b.setAttribute("aria-pressed", "true");
      b.addEventListener("click", function () { desapunta(cb.id); pinta(); });
      uc.appendChild(el("li")).appendChild(b);
    });
    c.appendChild(uc); s.appendChild(c);
  }
  s.appendChild(botonEscaner());
  return s;
}
function botonEscaner(corto) {               // lo comprado, con el codigo de barras
  var b = el("button", "cocBtn", svg("barras") + (corto ? "Escanear" : "Escanear lo que has comprado"));
  b.addEventListener("click", function () { MCTX = CTX; abreEscaner(); }); return b;
}
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
  if (ZONA && !H.zonas.some(function (z) { return z.zona === ZONA; })) ZONA = null;
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
    s.appendChild(formAnadir("cocAnadeTengo", "Qué has traído (p. ej. 1 kg de arroz)", function (t) {
      apunta({ tipo: "compra", items: [t], zona: fz.getAttribute("data-z") || Dp().zonaPara(t) });
    }));
    fz.setAttribute("data-z", ZONA || "");
    ["Nevera", "Despensa seca", "Congelador"].forEach(function (z) {
      var b = el("button", "", esc(z.replace(" seca", ""))); b.type = "button"; b.setAttribute("aria-pressed", ZONA === z);
      b.addEventListener("click", function () { fz.setAttribute("data-z", z); [].forEach.call(fz.children, function (x) { x.setAttribute("aria-pressed", x === b); }); });
      fz.appendChild(b);
    });
    s.appendChild(fz);
  }
  if (!ZONA) {
    // Todo: una fila por zona con lo que hay (cabe en la pantalla); tocarla abre esa zona
    var zl = el("div", "cocZonas");
    H.zonas.forEach(function (z) {
      var b = el("button", "cocZonaFila", '<span><b>' + esc(z.zona) + '</b><small>' + esc(z.items.slice(0, 5).map(function (x) { return x.nombre + (x.dudoso ? " (?)" : ""); }).join(" · ") +
        (z.items.length > 5 ? " · y " + (z.items.length - 5) + " más" : "")) + '</small></span><em>' + z.items.length + '</em>' + svg("der"));
      b.addEventListener("click", function () { ZONA = z.zona; TOCADO = null; pinta(); cont.scrollTop = 0; });
      zl.appendChild(b);
    });
    s.appendChild(zl);
  } else H.zonas.forEach(function (z) {
    if (z.zona !== ZONA) return;
    var p = el("div", "cocPills cocPillsZona");
    z.items.forEach(function (x) {
      var b = el("button", x.dudoso ? "duda" : "", esc(x.nombre) + (x.dudoso ? '<i>?</i>' : "") + (x.c ? '<b>' + esc(Rc().cantTxt(x.c)) + '</b>' : ""));
      b.setAttribute("aria-pressed", TOCADO === x.clave);
      b.addEventListener("click", function () { TOCADO = TOCADO === x.clave ? null : x.clave; pinta(); });
      p.appendChild(b);
    });
    s.appendChild(p);
  });
  s.appendChild(acciones2());
  var tx = TOCADO && H.todos.filter(function (x) { return x.clave === TOCADO; })[0];
  if (tx) s.appendChild(hojaItem(tx));
  else TOCADO = null;
  return s;
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
  h.innerHTML = '<div><b>' + esc(x.nombre) + '</b>' + (x.c ? '<span>' + esc(Rc().cantTxt(x.c)) + '</span>' : "") +
    (x.dudoso ? '<small>¿Te queda? ' + esc(x.razon || "") + '</small>' : "") +
    (x.nutri ? '<small>Por ' + esc(x.nutri.por) + ': ' + esc(nutriTxt(x.nutri)) + '</small>' : "") + '</div>';
  if (x.dudoso) {
    var m = el("button", "cocHojaSi", "Me queda");
    m.addEventListener("click", function () { apunta({ tipo: "hay", items: [x.nombre] }); TOCADO = null; pinta(); });
    h.appendChild(m);
  }
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
  ta.placeholder = "Nevera: leche, 6 huevos, queso canario, yogur griego (2)\nCongelador: guiso de carne (440 g), arándanos\nDespensa: pan rústico, avena, 2 latas de atún\nNo hay: pollo";
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
    RECUENTO = null; ZONA = null; aviso("Guardado: Tengo empieza desde aquí."); pinta();
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

/* ------------------------------ Recetas ------------------------------ */
function listaRecetas(E) {
  var s = el("section", "cocSec");
  s.innerHTML = '<h3>Recetas</h3><p class="sub">De Copiloto Cocina · con temporizador y voz</p>';
  if (!RJ.lista.length) { s.appendChild(el("p", "cocVacio", cargando ? "Trayendo las recetas…" : "Sin conexión: las recetas salen en cuanto haya red.")); return s; }
  RJ.lista.forEach(function (r) {
    var J = RJ.json[r.id], txt = "";
    if (J && E.H) {
      var no = (J.ingredientes || []).map(function (i) { return Rc().ingrediente((i.cantidad || "") + " " + i.nombre); })
        .filter(function (g) { return !g.basico && Dp().estadoDe(g, E.H).estado === "no"; });
      txt = !no.length ? "Tienes todo" : "Falta " + nombresDe(no);
    }
    var b = el("button", "cocFila", '<time><b>' + esc(r.tiempo_total_min ? r.tiempo_total_min + " min" : "") + '</b>' + esc(r.raciones ? r.raciones + " rac." : "") + '</time><span>' +
      esc(r.titulo) + (txt ? '<small>' + esc(txt) + '</small>' : "") + '</span><em class="cocIr">' + svg("der") + '</em>');
    b.addEventListener("click", function () { if (J) abreModo({ receta: J }); });
    s.appendChild(b);
  });
  return s;
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
API.atras = function () {                   // el gesto de atras: el escaner, luego el paso a paso
  if (ESC) { cierraEscaner(true); return true; }
  var M = Modo();
  return !!(M && M.atras && M.atras());
};

/* ------------------------------- el escaner -------------------------------
   La camara de atras y BarcodeDetector (Chrome en Android); si no hay camara o no
   lo sabe leer, el numero se escribe a mano. En la app Android, el escaner de Google.
   Cada producto entra en Tengo
   como comprado (con su zona) y se sigue escaneando.                           */
var ESC = null;
function abreEscaner() {
  ponCSS();
  var box = document.getElementById("cocEsc") || document.body.appendChild(el("div"));
  box.id = "cocEsc"; box.hidden = false;
  ESC = { box: box, stream: null, det: null, parado: false, res: null, zona: "Despensa", hechos: [], t: null };
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
  var r = ESC.box.querySelector(".eRes"); r.hidden = false; r.innerHTML = '<small>Código ' + esc(codigo) + '</small><p>Buscando en Open Food Facts…</p>';
  fetch(OFF_URL + encodeURIComponent(codigo) + ".json?fields=code,product_name,product_name_es,generic_name,generic_name_es,brands,quantity,categories_tags,nutriments,nutriscore_grade", { cache: "no-store" })
    .then(function (x) { return x.json(); }).then(function (j) { resultado(codigo, productoOFF(j)); }, function () { resultado(codigo, null, true); });
}
function resultado(codigo, p, sinRed) {
  if (!ESC) return;
  var r = ESC.box.querySelector(".eRes");
  ESC.res = p; ESC.zona = p ? p.zona : "Despensa";
  r.innerHTML = '<small>Código ' + esc(codigo) + '</small>' +
    (p ? '<h3>' + esc(p.nombre) + '</h3><p>' + esc([p.marca, p.cantidad].filter(Boolean).join(" · ") || "Open Food Facts") + '</p>' +
         (p.nutri ? '<p class="eNutri">Por ' + esc(p.nutri.por) + ': <b>' + esc(nutriTxt(p.nutri)) + '</b>' + (p.nutri.nutriscore ? ' · Nutri-Score ' + esc(p.nutri.nutriscore) : "") + '</p>' : "")
       : '<h3>' + (sinRed ? "Sin conexión" : "No está en Open Food Facts") + '</h3><p>Escribe qué es y se apunta igual.</p><input class="eNom" placeholder="p. ej. crema de calabaza" aria-label="Qué es" style="width:100%;margin-top:10px">') +
    '<div class="eZonas">' + ["Nevera", "Despensa", "Congelador"].map(function (z) { return '<button aria-pressed="' + (z === ESC.zona) + '">' + z + '</button>'; }).join("") + '</div>' +
    '<button class="eOk">Añadir a Tengo</button><button class="eOtro">Otro producto</button>';
  Array.prototype.forEach.call(r.querySelectorAll(".eZonas button"), function (b) {
    b.onclick = function () { ESC.zona = b.textContent; Array.prototype.forEach.call(r.querySelectorAll(".eZonas button"), function (x) { x.setAttribute("aria-pressed", x === b); }); };
  });
  r.querySelector(".eOk").onclick = function () {
    var txt = p ? p.txt : (r.querySelector(".eNom").value || "").trim();
    if (!txt) { r.querySelector(".eNom").focus(); return; }
    var cb = { t: Date.now(), tipo: "compra", items: [txt], zona: ESC.zona, codigo: codigo };
    if (p && p.nutri) cb.nutri = p.nutri;                 // lo de la etiqueta, por 100 g
    apunta(cb);
    ESC.hechos.push({ txt: txt, zona: ESC.zona });
    ESC.box.querySelector(".eLista").innerHTML = '<li><b>Añadido ahora</b></li>' + ESC.hechos.map(function (h) { return '<li>' + esc(h.txt) + '<small>' + esc(h.zona) + '</small></li>'; }).join("");
    otro();
  };
  r.querySelector(".eOtro").onclick = otro;
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
