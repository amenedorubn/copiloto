/* ===========================================================================
   COCINA · lo que toca comer, cómo se hace y lo que hay en casa
   ---------------------------------------------------------------------------
   Una pestaña como Estadísticas, con tres fuentes que ya existían:

   - El calendario "Comidas" (Claude lo rellena con el plan acordado): cada
     evento lleva raciones, ingredientes con cantidades y cómo se hace. Aquí
     se parte en ingredientes y pasos para ir marcándolos uno a uno.
   - Las recetas de Copiloto Cocina (Projects/cocina, repo público): pasos con
     temporizador, avisos por voz y lo que va en paralelo. Si un evento es una
     de ellas (por su id o por el título), se cocina con su modo paso a paso.
   - La despensa en vivo: el bloque "Estado actual" de la nota de Obsidian
     "Despensa habitual" (la actualiza Claude cuando se lo cuentas). Llega por
     el Worker (/despensa). Es el punto de partida: lo que compras, escaneas,
     gastas al cocinar o se acaba se apunta aquí (Tengo y Comprar) y se guarda
     también en el Worker (/cocina), sin tener que contárselo a nadie.

   Nada se inventa: sin nota no hay despensa, sin evento no hay comida.
   La parte de arriba no toca el DOM: node la carga para los tests.
   =========================================================================== */
(function (raiz, fabrica) {
  var C = fabrica();
  if (typeof module === "object" && module.exports) module.exports = C;
  else raiz.Cocina = C;
})(typeof window !== "undefined" ? window : this, function () {
"use strict";

var RECETAS_URL = "https://raw.githubusercontent.com/amenedorubn/cocina/main/recetas/";
var K_RECETAS = "copiloto.cocina.recetas.v1", K_CAMBIOS = "copiloto.cocina.cambios.v1",
    K_PASOS = "copiloto.cocina.pasos.v1", K_COMPRA = "copiloto.cocina.compra.v1", K_NOTA = "copiloto.cocina.nota.v1",
    K_LISTA = "copiloto.cocina.lista.v1";

/* ------------------------------- texto ------------------------------- */
function norm(s) {
  return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ.,/½¼¾ ]+/g, " ").replace(/\s+/g, " ").trim();
}
// palabras que no dicen qué alimento es
var VACIAS = ("de del la el los las un una unos unas y o con sin en al para por a su sus tu mi " +
  "bote botes lata latas bolsa bolsas brick bricks paquete tarro tarros blister trozo trozos " +
  "g gr kg ml l cl cda cdas cdta cdtas cucharada cucharadas cucharadita cucharaditas diente dientes " +
  "pizca chorrito chorro puñado racion raciones unidad unidades ud uds media medio mitad " +
  "grande grandes pequeño pequeña entero entera abierto abierta cerrado cerrada casi " +
  "troceado troceada troceados congelado congelada congelados congeladas fresco fresca frescos frescas " +
  "descongelado descongelada cocido cocida cocidos cocidas mixta mixto tiras gusto doble " +
  "tupper tuppers aprox min minutos hay queda quedan").split(" ");
var VACIA = {}; VACIAS.forEach(function (w) { VACIA[w] = 1; });
function raizDe(w) { return w.length > 4 ? w.replace(/(es|s)$/, "") : w; }
function palabras(s) {
  return norm(s).replace(/[.,/]/g, " ").split(" ").filter(function (w) {
    return w.length > 2 && !VACIA[w] && !/^\d/.test(w);
  }).map(raizDe);
}

/* ------------------------------ cantidades ------------------------------
   "250 g solomillos" -> {n:250, ud:"g", resto:"solomillos"}. En gramos o ml
   lo que se pueda (1,2 kg -> 1200 g). Sin numero delante: null.            */
var UDS = { g: "g", gr: "g", gramos: "g", kg: "kg", ml: "ml", l: "l", litro: "l", litros: "l", cl: "cl",
  cda: "cda", cdas: "cda", cucharada: "cda", cucharadas: "cda", cdta: "cdta", cdtas: "cdta",
  cucharadita: "cdta", cucharaditas: "cdta", diente: "diente", dientes: "diente", lata: "lata", latas: "lata",
  bolsa: "bolsa", bolsas: "bolsa", bote: "bote", botes: "bote", brick: "brick", bricks: "brick",
  loncha: "loncha", lonchas: "loncha", rebanada: "rebanada", rebanadas: "rebanada", scoop: "scoop", scoops: "scoop",
  tarro: "tarro", tarros: "tarro", sobre: "sobre", sobres: "sobre", pizca: "pizca", docena: "docena", docenas: "docena" };
var FRAC = { "½": 0.5, "¼": 0.25, "¾": 0.75 };
function numero(t) {
  if (FRAC[t] != null) return FRAC[t];
  var m = t.match(/^(\d+)\/(\d+)$/); if (m) return +m[1] / +m[2];
  m = t.match(/^(\d+)([½¼¾])$/); if (m) return +m[1] + FRAC[m[2]];
  var n = parseFloat(t.replace(",", ".")); return isFinite(n) ? n : null;
}
function cantidad(txt) {
  var s = String(txt || "").trim();
  var m = s.match(/^(\d+(?:[.,]\d+)?|\d+\/\d+|\d*[½¼¾])\s*(?:x\s*)?([a-zA-Zñáéíóú]+\.?)?\s*(?:de\s+)?(.*)$/);
  if (!m) {
    var un = s.match(/^(un|una|medio|media)\s+(.*)$/i);
    if (!un) return null;
    var nn = /^medi/i.test(un[1]) ? 0.5 : 1, r2 = un[2], u2 = r2.split(/\s+/)[0].toLowerCase();
    if (UDS[u2]) return { n: nn, ud: UDS[u2], resto: r2.slice(u2.length).replace(/^\s*de\s+/, "").trim() };
    return { n: nn, ud: "ud", resto: r2.trim() };
  }
  var n = numero(m[1]); if (n == null) return null;
  var u = (m[2] || "").toLowerCase().replace(/\.$/, ""), resto = m[3] || "";
  if (u && !UDS[u]) { resto = (m[2] + " " + resto).trim(); u = ""; }
  var ud = UDS[u] || "ud";
  if (ud === "kg") { n *= 1000; ud = "g"; }
  if (ud === "l") { n *= 1000; ud = "ml"; }
  if (ud === "cl") { n *= 10; ud = "ml"; }
  if (ud === "docena") { n *= 12; ud = "ud"; }
  return { n: Math.round(n * 100) / 100, ud: ud, resto: resto.replace(/^\s*de\s+/, "").trim() };
}
// "rigatoni (1,2 kg)" o "guiso (440 g)": la cantidad que va entre parentesis
function cantidadEntre(txt) {
  var m = String(txt || "").match(/\((\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|cl))\)/i);
  return m ? cantidad(m[1]) : null;
}
function cantTxt(c) {
  if (!c) return "";
  var n = c.n, ud = c.ud;
  if (ud === "g" && n >= 1000) return (String(Math.round(n / 100) / 10).replace(".", ",")) + " kg";
  var t = String(n).replace(".", ",");
  if (n === 0.5) t = "½";
  var pl = n > 1 && /^(cda|cdta|bolsa|lata|bote|brick|diente|loncha|rebanada|tarro|sobre|scoop)$/.test(ud) ? "s" : "";
  return ud === "ud" ? t : t + " " + ud + pl;
}

/* --------------------------- una comida del calendario ---------------------------
   "Albóndigas en salsa · 3 raciones" + descripcion en texto:
     INGREDIENTES (3 raciones):
     · 500 g carne picada mixta
     CÓMO SE HACE:
     1. ...
   -> {titulo, etiqueta, raciones, ingredientes:[{txt,c,nombre}], pasos:[txt], notas:[txt], receta}  */
var SEC_ING = /^(ingredientes?|necesitas|lo que necesitas|lista|compra)/, SEC_PASOS = /^(como se hace|preparacion|pasos|elaboracion|instrucciones|receta|como|modo)/;
var SEC_NOTA = /^(tupper|reparto|guardar|recalentar|notas?|consejo|aviso|descongelar|al servir|servir)/;
function limpiaLinea(l) { return l.replace(/^[\s\-–—·•*▪◦]+/, "").replace(/\s+/g, " ").trim(); }
function esTituloSec(l) {
  var sin = l.replace(/[:：]\s*$/, "").trim();
  if (!/\p{L}/u.test(sin) || sin.length > 48) return null;
  var mayus = sin === sin.toUpperCase() && /\p{Lu}/u.test(sin);
  if (!mayus && !/[:：]\s*$/.test(l)) return null;
  return norm(sin.replace(/\(.*\)/, ""));
}
// Google a veces mete la descripcion con etiquetas y entidades HTML, y los eventos llevan emojis
function sinHtml(t) {
  return String(t || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "\n").replace(/<li[^>]*>/gi, "· ")
    .replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&");
}
function sinEmoji(t) { return String(t || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{20E3}\u{2B00}-\u{2BFF}]/gu, ""); }
function comida(ev) {
  ev = ev || {};
  var tit = sinEmoji(ev.titulo || "").replace(/\s+/g, " ").trim(), et = "";
  var p = tit.split(/\s+[·—–|]\s+/);
  if (p.length > 1 && p[0].length <= 24) { et = p[0]; tit = p.slice(1).join(" · "); }
  var out = { uid: ev.uid || "", fecha: ev.fecha || "", hora: ev.hora || "", fin: ev.fin || "",
    titulo: tit, etiqueta: et, raciones: null, ingredientes: [], pasos: [], notas: [], receta: null };
  var sec = "", hayPasosNum = false, texto = sinHtml(ev.texto);
  var id = texto.match(/(?:receta\s*[:=]\s*|[?&]id=)([a-z0-9-]{3,60})/i);
  if (id) out.receta = id[1].toLowerCase();
  var r = (tit + "\n" + texto).match(/(\d+)\s*raci[oó]n(?:es)?/i) || texto.match(/raciones?\s*[:=]\s*(\d+)/i);
  if (r) out.raciones = +r[1];
  texto.split(/\r?\n/).forEach(function (raw) {
    var l = sinEmoji(raw).trim(); if (!l) return;
    if (/^(receta\s*[:=]|https?:\/\/)/i.test(l)) return;
    var s = esTituloSec(l);
    if (s != null) {
      if (SEC_ING.test(s)) { sec = "ing"; return; }
      if (SEC_PASOS.test(s)) { sec = "pasos"; return; }
      if (SEC_NOTA.test(s)) { sec = "nota"; return; }
      if (/^raciones?/.test(s)) return;
    }
    // "INGREDIENTES: 500 g carne, 1 huevo" en una sola linea
    var enLinea = l.match(/^([^:]{3,30}):\s*(.+)$/);
    if (enLinea) {
      var cab = norm(enLinea[1]);
      if (SEC_ING.test(cab)) { partes(enLinea[2]).forEach(function (x) { out.ingredientes.push(ingrediente(x)); }); sec = "ing"; return; }
      if (SEC_NOTA.test(cab)) { out.notas.push(limpiaLinea(l)); return; }
      if (/^raciones?/.test(cab)) return;
    }
    var num = l.match(/^(\d{1,2})[.)]\s+(.+)$/);
    if (num) { out.pasos.push(limpiaLinea(num[2])); hayPasosNum = true; return; }
    var vi = /^[\-–—·•*▪◦]/.test(l);
    if (sec === "ing" || (!sec && vi && !hayPasosNum && cantidad(limpiaLinea(l)))) { out.ingredientes.push(ingrediente(limpiaLinea(l))); return; }
    if (sec === "pasos") { out.pasos.push(limpiaLinea(l)); return; }
    out.notas.push(limpiaLinea(l));
  });
  return out;
}
function partes(t) {                      // "a, b (c, d), e. Otra frase" -> ["a", "b (c, d)", "e", "Otra frase"]
  var r = [], nivel = 0, cur = "";
  String(t).replace(/\.\s+(?=\p{Lu})/gu, ";").split("").forEach(function (ch) {
    if (ch === "(") nivel++; if (ch === ")") nivel = Math.max(0, nivel - 1);
    if ((ch === "," || ch === ";") && !nivel) { if (cur.trim()) r.push(cur.trim()); cur = ""; return; }
    cur += ch;
  });
  if (cur.trim()) r.push(cur.trim());
  return r.map(function (x) { return x.replace(/\.$/, "").trim(); }).filter(Boolean);
}
function ingrediente(txt) {
  var t = limpiaLinea(txt), c = cantidad(t);
  var nombre = c ? c.resto : t.replace(/\s*[:(].*$/, "");
  return { txt: t, c: c && c.ud !== "pizca" ? { n: c.n, ud: c.ud } : null, nombre: nombre || t };
}
// un paso dice cuanto dura: "10 min", "3-4 min", "1 h"
function minutosDe(paso) {
  var m = String(paso || "").match(/(\d+)(?:\s*[-–a]\s*(\d+))?\s*(min|minutos|h|hora|horas)\b/i);
  if (!m) return 0;
  var n = +(m[2] || m[1]);
  return /^h/i.test(m[3]) ? n * 60 : n;
}

/* ------------------------------ la despensa ------------------------------
   El bloque "Estado actual" de la nota, tal cual:
     DESPENSA EN VIVO — última actualización: 25/09/2026 (noche), ...
     \## CONGELADOR
     - Tupper: guiso de carne con patatas (440 g) → ...
     Bolsas: pimiento rojo en tiras, ajo troceado, ...
     \## NO HAY
     Pollo, carne picada, ...
     \## COMPRA (sábado 26/09, Carrefour)
     Sartén ..., 500 g solomillos de pollo, ...
   -> {fecha, zonas:[{zona, items:[{txt, nombre, c}]}], noHay:[...], compra:{titulo, items}, notas}   */
function despensa(texto) {
  var out = { fecha: null, zonas: [], noHay: [], compra: null, notas: [] };
  var f = String(texto || "").match(/actualizaci[oó]n\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (f) out.fecha = f[3] + "-" + dos(+f[2]) + "-" + dos(+f[1]);
  var zona = null;
  String(texto || "").split(/\r?\n/).forEach(function (raw) {
    var l = raw.trim(); if (!l) return;
    var h = l.match(/^\\?#{2,4}\s*(.+)$/);
    if (h) {
      var nom = h[1].trim(), n = norm(nom);
      if (/^no hay/.test(n)) zona = { tipo: "no" };
      else if (/^compra/.test(n)) {
        // "COMPRA (sábado 26/09, Carrefour)": si su dia ya paso, esta comprada (va a lo que hay)
        var fc = nom.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/), an = fc && (fc[3] || (out.fecha ? out.fecha.slice(0, 4) : String(new Date().getFullYear())));
        out.compra = { titulo: nom.replace(/^COMPRA/i, "Compra"), items: [], fecha: fc ? an + "-" + dos(+fc[2]) + "-" + dos(+fc[1]) : null };
        zona = { tipo: "compra" };
      }
      else { zona = { tipo: "zona", zona: mayus1(nom.toLowerCase().replace(/\s+seca$/, " seca")), items: [] }; out.zonas.push(zona); }
      return;
    }
    if (!zona) { if (!/^(despensa en vivo|regla)/i.test(l)) out.notas.push(l); return; }
    var cuerpo = limpiaLinea(l).replace(/^(bolsas|tuppers?|botes|latas)\s*:\s*/i, function (m) { return /tupper/i.test(m) ? "Tupper: " : ""; });
    var items = /^tupper:/i.test(cuerpo) ? [cuerpo] : partes(cuerpo);
    items.forEach(function (it) {
      if (zona.tipo === "no") { out.noHay.push(it); return; }
      if (zona.tipo === "compra") {
        if (/^(plan de comidas|solo si falta)/i.test(it)) { out.compra.nota = (out.compra.nota ? out.compra.nota + " " : "") + it; return; }
        out.compra.items.push(item(it)); return;
      }
      zona.items.push(item(it));
    });
  });
  return out;
}
function item(txt) {
  var t = txt.replace(/\s*→.*$/, "").trim(), c = cantidad(t) || cantidadEntre(t);
  var nombre = (cantidad(t) ? cantidad(t).resto : t).replace(/\s*\([^)]*\)/g, "").replace(/^tupper:\s*/i, "")
    .replace(/^((grandes?|pequeñ[oa]s?|de)\s+)+/i, "").trim();
  return { txt: txt.trim(), nombre: mayus1(nombre || t), c: c ? { n: c.n, ud: c.ud } : null, tupper: /^tupper/i.test(t) };
}

// Se parecen si las palabras del nombre mas corto estan todas en el otro ("carne picada" y "carne
// picada mixta cerdo-vacuno") o si comparten 2 de cada 3. "leche de coco" y "leche semi" no: la
// palabra que los distingue no coincide. 0 si no se parecen; si no, de 0 a 1 (1: iguales).
function parecido(a, b) {
  var A = palabras(a), B = palabras(b); if (!A.length || !B.length) return 0;
  var comunes = A.filter(function (w) { return B.indexOf(w) >= 0; }).length;
  if (!comunes) return 0;
  var s = comunes / Math.max(A.length, B.length);
  return comunes === Math.min(A.length, B.length) || s >= 0.67 ? s : 0;
}
function busca(nombre, lista) {             // el item de la lista que mas se parece (o null)
  var mejor = null, pm = 0;
  (lista || []).forEach(function (x) {
    var p = parecido(nombre, x.nombre || x);
    if (p > pm) { pm = p; mejor = x; }
  });
  return mejor;
}
/* ------------------------------ lo que tengo ------------------------------
   Lo de la nota y, encima, lo que ha pasado despues en la app, por orden:
   - la compra de la nota cuyo dia ya paso: ya esta en casa
   - "compra" (la lista, el escaner o Añadir): entra en su zona; si ya estaba, se suma
   - "gasto" (al cocinar): se resta si las dos cantidades van en lo mismo; si llega a 0,
     fuera. Sin cantidad no se sabe cuanto queda: se queda (para eso esta "Se acabó")
   - "acaba" (Se acabó): fuera
   -> {zonas:[{zona, items:[{nombre, txt, c, nuevo, nutri}]}], n}                        */
var RE_NEVERA = /\b(pollo|pavo|carne|ternera|cerdo|lomo|solomillo|hamburgues|salchich|pescado|salmon|merluza|bacalao|gamba|langostino|leche|yogur|kefir|queso|nata|mantequilla|jamon|embutido|chorizo|fiambre|tofu|hummus|lechuga|espinaca|rucula|brocoli|calabacin|zanahoria|pepino|champiñon|seta|fresa|arandano|uva|tomate cherry|masa|gazpacho|zumo)/;
function zonaPara(nombre) {
  var n = norm(nombre);
  return /congelad|helado|\bhielo\b/.test(n) ? "Congelador" : RE_NEVERA.test(n) ? "Nevera" : "Despensa";
}
function casa(D, cambios, hoy) {
  var Z = [], todos = [];
  function zona(nom) {
    var g = norm(nom), z = Z.filter(function (x) { return norm(x.zona) === g || norm(x.zona).indexOf(g + " ") === 0; })[0];
    if (!z) { z = { zona: mayus1(nom), items: [] }; Z.push(z); }
    return z;
  }
  function saca(x) { Z.forEach(function (z) { var i = z.items.indexOf(x); if (i >= 0) z.items.splice(i, 1); }); todos.splice(todos.indexOf(x), 1); }
  function pon(txt, pista, extra, suma) {
    var it = item(txt), ya = busca(it.nombre, todos);
    if (ya) {
      if (suma && it.c && ya.c && it.c.ud === ya.c.ud) ya.c = { n: Math.round((ya.c.n + it.c.n) * 100) / 100, ud: ya.c.ud };
      else if (suma && it.c && !ya.c) ya.c = it.c;
      if (extra.nuevo) ya.nuevo = true;
      if (extra.nutri) ya.nutri = extra.nutri;
      return;
    }
    var x = { nombre: it.nombre, txt: it.txt, c: it.c, tupper: it.tupper };
    if (extra.nuevo) x.nuevo = true;
    if (extra.nutri) x.nutri = extra.nutri;
    zona(pista || zonaPara(it.nombre)).items.push(x); todos.push(x);
  }
  function gasta(txt) {
    var c = cantidad(txt), ya = busca(c ? c.resto : txt, todos); if (!ya) return;
    if (!c || !ya.c || c.ud !== ya.c.ud) return;
    var n = Math.round((ya.c.n - c.n) * 100) / 100;
    if (n <= 0) saca(ya); else ya.c = { n: n, ud: ya.c.ud };
  }
  if (D) D.zonas.forEach(function (z) {
    var zz = zona(z.zona);
    z.items.forEach(function (x) { var y = { nombre: x.nombre, txt: x.txt, c: x.c, tupper: x.tupper }; zz.items.push(y); todos.push(y); });
  });
  if (D && D.compra && D.compra.fecha && hoy && D.compra.fecha <= hoy)
    D.compra.items.forEach(function (x) { pon(x.txt, null, {}, false); });
  vigentes(cambios, D && D.fecha).slice().sort(function (a, b) { return a.t - b.t; }).forEach(function (cb) {
    (cb.items || []).forEach(function (t) {
      if (cb.tipo === "compra") pon(t, cb.zona, { nuevo: true, nutri: cb.nutri }, true);
      else if (cb.tipo === "gasto") gasta(t);
      else if (cb.tipo === "acaba") { var ya = busca(t, todos); if (ya) saca(ya); }
    });
  });
  return { zonas: Z.filter(function (z) { return z.items.length; }), todos: todos, n: todos.length };
}
// ¿Esta el ingrediente en casa? "hay" si sale en lo que tengo (su zona); si no, "no" (la nota dice
// "si no aparece aqui, NO esta en casa"). Sin nota, "?".
var MEMO = { D: null, cb: null, hoy: null, r: null };
function casaMemo(D, cambios, hoy) {
  if (MEMO.D !== D || MEMO.cb !== cambios || MEMO.hoy !== hoy) MEMO = { D: D, cb: cambios, hoy: hoy, r: casa(D, cambios, hoy) };
  return MEMO.r;
}
function estadoDe(ing, D, cambios, hoy) {
  if (!D) return { estado: "?" };
  var H = casaMemo(D, cambios, hoy), nombre = ing.nombre || ing.txt || ing;
  var h = busca(nombre, H.todos);
  if (h) { var z = H.zonas.filter(function (z) { return z.items.indexOf(h) >= 0; })[0]; return { estado: "hay", item: h, zona: z && z.zona }; }
  return { estado: "no" };
}

/* ------------------------------ las recetas ------------------------------ */
// el evento es una receta de Copiloto Cocina: por su id, o por el titulo
function recetaDe(c, indice) {
  if (!indice || !indice.length) return null;
  if (c.receta) { var x = indice.filter(function (r) { return r.id === c.receta; })[0]; if (x) return x; }
  var mejor = null, pm = 0;
  indice.forEach(function (r) { var p = parecido(c.titulo, r.titulo); if (p > pm) { pm = p; mejor = r; } });
  return mejor;
}

/* ---------------------------------- la semana ---------------------------------- */
function comidasDe(dia) {
  return (dia || []).filter(function (e) { return e && e.fuente === "comida"; }).map(comida);
}
// lo que toca ahora: la comida en curso (hasta 90 min despues de su hora) o la siguiente
function queToca(lista, hoy, ahora) {
  var fut = lista.filter(function (c) { return c.fecha > hoy || (c.fecha === hoy && (c.fin || sumaMin(c.hora, 90)) > ahora); });
  fut.sort(function (a, b) { return (a.fecha + a.hora) < (b.fecha + b.hora) ? -1 : 1; });
  return fut[0] || null;
}
function sumaMin(h, m) {
  if (!h) return "23:59";
  var p = h.split(":"), t = Math.min(23 * 60 + 59, +p[0] * 60 + +p[1] + m);
  return dos(Math.floor(t / 60)) + ":" + dos(t % 60);
}
// lo que falta para las comidas de estos dias: lo que no esta en lo que tengo
function faltan(lista, D, cambios, hoy) {
  var vistos = {}, out = [];
  lista.forEach(function (c) {
    c.ingredientes.forEach(function (i) {
      if (/\bal gusto\b|^sal\b|^agua\b|^aceite|aove|pimienta/i.test(i.txt)) return;
      var e = estadoDe(i, D, cambios, hoy); if (e.estado === "hay") return;
      var k = palabras(i.nombre).join(" "); if (!k || vistos[k]) { if (vistos[k]) vistos[k].para.push(c.titulo); return; }
      vistos[k] = { txt: i.txt, nombre: i.nombre, para: [c.titulo], fecha: c.fecha, uid: c.uid };
      out.push(vistos[k]);
    });
  });
  return out;
}

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
function avisosComida(dia, ahoraMs) {
  var out = [], limite = ahoraMs + 48 * 3600e3, E = (dia || []).filter(function (e) { return e && e.fuente === "comida" && e.fecha; });
  var avisosCal = [];                          // los avisos de descongelar que ya trae el calendario
  E.forEach(function (e) {
    var t = sinEmoji(e.titulo || "");
    if (RE_AVISO.test(t) && e.hora) {
      avisosCal.push(msDe(e.fecha, e.hora));
      out.push({ id: "cal:" + e.uid, cuando: msDe(e.fecha, e.hora), titulo: t.replace(/\s+/g, " ").trim(),
                 texto: sinHtml(e.texto || "").split(/\r?\n/).map(function (l) { return sinEmoji(l).trim(); }).filter(Boolean)[0] || "Del calendario Comidas" });
    }
  });
  E.forEach(function (e) {
    if (!e.hora || RE_AVISO.test(e.titulo || "")) return;
    var c = comida(e), todo = (e.titulo || "") + "\n" + sinHtml(e.texto || "");
    if (/tupper/i.test(c.etiqueta + " " + c.titulo) && /congelador|descongel/i.test(todo)) {
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
function queComidaDe(h) { return !h ? "Comida" : h < "11:30" ? "Desayuno" : h < "13:00" ? "Media mañana" : h < "17:00" ? "Comida" : h < "20:00" ? "Merienda" : "Cena"; }

/* ------------------------------ cambios desde la nota ------------------------------
   {id, t, tipo: "gasto"|"compra"|"acaba", de: "Albóndigas…", items: ["500 g carne picada", ...], zona}
   Los de antes del dia de la nota ya estan dentro de ella: no cuentan (los de ese mismo dia, si:
   mejor contar dos veces una compra que perderla). Uno borrado (desmarcado) no cuenta.   */
function vigentes(cambios, fechaNota) {
  return (cambios || []).filter(function (cb) { return cb && !cb.borrado && (!fechaNota || isoDe(cb.t) >= fechaNota); });
}
/* Los cambios y la lista de la compra se guardan tambien en el Worker (/cocina), para que el
   movil y Chrome vean lo mismo. Se juntan por id: lo borrado en un sitio queda borrado.   */
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
function isoDe(ms) { var d = new Date(ms); return d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate()); }
// el texto para pegarle a Claude: lo que ha cambiado desde la nota
function paraClaude(cambios, fechaNota) {
  var V = vigentes(cambios, fechaNota); if (!V.length) return "";
  return "Despensa: cambios desde la nota" + (fechaNota ? " del " + corta(fechaNota) : "") + "\n" + V.map(function (cb) {
    var d = new Date(cb.t);
    return "- " + dos(d.getDate()) + "/" + dos(d.getMonth() + 1) + " " + (cb.tipo === "compra" ? "Comprado" + (cb.zona ? " (" + cb.zona.toLowerCase() + ")" : "") : cb.tipo === "acaba" ? "Se acabó" : "Gastado en " + (cb.de || "una receta")) +
      ": " + cb.items.join(", ");
  }).join("\n");
}

/* ------------------------------ una rutina, paso a paso ------------------------------
   Cada linea con hora ("22:10 · Ducha (10 min)") de una rutina del calendario "Claude"
   es un paso; su reloj (si dice cuanto dura) espera a que toques Empezar.              */
function pasosGuia(ev) {
  var P = [];
  sinHtml(ev && ev.texto).split(/\r?\n/).forEach(function (raw) {
    var l = sinEmoji(raw).replace(/^[\s\-–—·•*]+/, "").trim(), m = l.match(/^(\d{1,2})[:.h](\d{2})\s*[·\-–—:]\s*(.+)$/);
    if (!m) return;
    var x = m[3].trim(), d = x.match(/\s*\((\d+[^)]*(?:min|h))\)\s*$/);
    P.push({ titulo: d ? x.slice(0, d.index) : x, detalle: "A las " + dos(+m[1]) + ":" + m[2] + (d ? " · " + d[1] : ""),
             duracion_s: d ? minutosDe(d[1]) * 60 : 0, manual: true });
  });
  return P;
}

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

function dos(n) { return n < 10 ? "0" + n : "" + n; }
function mayus1(t) { t = String(t || ""); return t.charAt(0).toUpperCase() + t.slice(1); }
function corta(iso) { var p = String(iso).split("-"); return (+p[2]) + "/" + (+p[1]); }

var API = { norm: norm, palabras: palabras, cantidad: cantidad, cantTxt: cantTxt, comida: comida, minutosDe: minutosDe,
  despensa: despensa, estadoDe: estadoDe, casa: casa, zonaPara: zonaPara, mezcla: mezcla, parecido: parecido, recetaDe: recetaDe, comidasDe: comidasDe,
  queToca: queToca, faltan: faltan, vigentes: vigentes, paraClaude: paraClaude, partes: partes, pasosGuia: pasosGuia,
  productoOFF: productoOFF, esCodigo: esCodigo, OFF_URL: OFF_URL, queGrande: queGrande, nutriTxt: nutriTxt, avisosComida: avisosComida,
  RECETAS_URL: RECETAS_URL, K: { recetas: K_RECETAS, cambios: K_CAMBIOS, pasos: K_PASOS, compra: K_COMPRA, nota: K_NOTA, lista: K_LISTA } };

/* ================================ pantalla ================================
   Cocina.pinta(contenedor, ctx) con ctx = {dia, hoy, ahora, conf, marca, atrasManual}
   Subpestañas: Ahora · Semana · Comprar · Tengo · Recetas (cocTabs, fijas arriba).
   Cocinar abre el modo paso a paso a pantalla completa (#cocModo).          */
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
  return mayus1(DIAS[d.getDay()]) + " " + d.getDate();
}
function queComida(h) {
  if (!h) return "Comida";
  return h < "11:30" ? "Desayuno" : h < "13:00" ? "Media mañana" : h < "17:00" ? "Comida" : h < "20:00" ? "Merienda" : "Cena";
}
function enCuanto(c, hoy, ahora) {
  if (c.fecha !== hoy || !c.hora) return "";
  if (c.hora <= ahora) return "ahora";
  var p = c.hora.split(":"), q = ahora.split(":"), m = (+p[0] * 60 + +p[1]) - (+q[0] * 60 + +q[1]);
  return m < 60 ? "en " + m + " min" : "en " + Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : "");
}
function negritas(t) { return esc(t).replace(/(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+)?\s*(?:min|minutos|h|g|ml|°C|ºC)\b)/g, "<b>$1</b>"); }

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
  /* ---- modo cocina ---- */
  "#cocModo{position:fixed;inset:0;z-index:90;background:var(--cb,#101113);color:#f4f5f7;display:flex;flex-direction:column;font-family:Manrope,sans-serif;" +
  "padding:calc(8px + var(--safe-area-inset-top,env(safe-area-inset-top,0px))) 16px calc(12px + var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))}" +
  "#cocModo svg{background:none;border-radius:0}" +
  "#cocModo button{flex:none;padding:0;border-radius:0;font-family:inherit;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent}" +
  "#cocModo .mTop{display:flex;align-items:center;gap:8px;flex:0 0 auto}" +
  "#cocModo .mTop button{width:44px;height:44px;border-radius:14px!important;background:none;color:#f4f5f7;display:flex;align-items:center;justify-content:center}" +
  "#cocModo .mTop svg{width:22px;height:22px}" +
  "#cocModo .mTop span{flex:1;min-width:0;font-size:13px;font-weight:700;color:#9aa0a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
  "#cocModo .mProg{display:flex;gap:4px;margin:4px 0 14px;flex:0 0 auto}" +
  "#cocModo .mProg i{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.12)}" +
  "#cocModo .mProg i.ya{background:rgba(255,255,255,.45)}#cocModo .mProg i.ahora{background:#f4f5f7}" +
  "#cocModo .mCuerpo{flex:1 1 auto;overflow:auto;min-height:0}" +
  "#cocModo .mPaso{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9aa0a8}" +
  "#cocModo .mTags{display:inline-flex;gap:6px;margin-left:8px;vertical-align:1px}" +
  "#cocModo .mTags span{font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:none;color:#f4f5f7;background:rgba(255,255,255,.1);padding:3px 8px;border-radius:99px}" +
  "#cocModo h2{margin:8px 0 8px;font-size:32px;line-height:1.1;font-weight:800;letter-spacing:-.02em}" +
  "#cocModo .mDet{margin:0;font-size:19px;line-height:1.5;font-weight:600;color:#dfe2e6}" +
  "#cocModo .mDet b{color:#fff}" +
  "#cocModo .mUsa{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}" +
  "#cocModo .mUsa li{font-size:14px;font-weight:600;background:rgba(255,255,255,.08);padding:7px 10px;border-radius:12px}" +
  "#cocModo .mUsa li b{margin-left:6px;color:#fff}" +
  "#cocModo .mReloj{margin:18px 0 0;background:rgba(255,255,255,.06);border-radius:20px;padding:14px}" +
  "#cocModo .mDig{font-size:64px;line-height:1;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}" +
  "#cocModo .mDig.pasa{color:var(--ca,#f08a4b)}" +
  "#cocModo .mBarra{height:8px;border-radius:4px;background:rgba(255,255,255,.12);margin:12px 0 4px;overflow:hidden}" +
  "#cocModo .mBarra i{display:block;height:100%;width:0;background:var(--ca,#f08a4b);border-radius:4px}" +
  "#cocModo .mEst{font-size:13px;font-weight:700;color:#9aa0a8;min-height:18px}" +
  "#cocModo .mAvisos{list-style:none;margin:8px 0 0;padding:0}" +
  "#cocModo .mAvisos li{display:grid;grid-template-columns:52px 1fr;gap:8px;font-size:15px;font-weight:600;padding:6px 0;border-top:1px solid rgba(255,255,255,.08);color:#dfe2e6}" +
  "#cocModo .mAvisos li b{font-variant-numeric:tabular-nums;color:#9aa0a8}" +
  "#cocModo .mAvisos li.ya{color:#6f757d;text-decoration:line-through}" +
  "#cocModo .mAvisos li.sig{color:#fff}#cocModo .mAvisos li.sig b{color:#fff}" +
  "#cocModo .mPar{margin:14px 0 0;border-radius:16px;padding:12px 14px;background:rgba(255,255,255,.06)}" +
  "#cocModo .mPar h3{margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9aa0a8}" +
  "#cocModo .mPar p{margin:0;font-size:16px;line-height:1.5;font-weight:600}" +
  "#cocModo .mChecks{list-style:none;margin:12px 0 0;padding:0}" +
  "#cocModo .mChecks button{width:100%;border-radius:0;display:grid;grid-template-columns:28px 1fr;gap:12px;text-align:left;align-items:center;min-height:48px;background:none;color:#f4f5f7;font-size:16px;font-weight:600;border-top:1px solid rgba(255,255,255,.08)}" +
  "#cocModo .mChecks button i{width:24px;height:24px;border-radius:7px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center}" +
  "#cocModo .mChecks button[aria-pressed=true] i{background:#f4f5f7;color:#101113;box-shadow:none}" +
  "#cocModo .mChecks button[aria-pressed=true] i svg{width:14px;height:14px}" +
  "#cocModo .mLuego{margin:16px 0 4px;font-size:14px;font-weight:700;color:#9aa0a8}" +
  "#cocModo .mDock{flex:0 0 auto;padding-top:10px}" +
  "#cocModo .mFila{display:grid;grid-template-columns:auto auto 1fr;gap:8px}" +
  "#cocModo .mFila button{flex:none;height:60px;border-radius:30px!important;background:rgba(255,255,255,.1);color:#f4f5f7;font-size:16px;font-weight:800;padding:0 18px;display:flex;align-items:center;justify-content:center;gap:8px}" +
  "#cocModo .mFila button svg{width:18px;height:18px}" +
  "#cocModo .mFila .mHecho{background:var(--ca,#f08a4b);color:#140b04;font-size:19px}" +
  "#cocModo .mFila .mHecho.suena{animation:cocLate 1s ease-in-out infinite}" +
  "@keyframes cocLate{50%{filter:brightness(1.25)}}" +
  "@media (prefers-reduced-motion:reduce){#cocModo .mFila .mHecho.suena{animation:none;outline:3px solid #fff}}" +
  "#cocModo .mAtras{width:100%;height:44px;margin-top:6px;background:none;color:#9aa0a8;font-size:14px;font-weight:700}" +
  "#cocModo .mFin{text-align:center;padding-top:40px}" +
  "#cocModo .mFin h2{font-size:34px}" +
  "#cocModo .mFin p{font-size:17px;line-height:1.45;color:#dfe2e6;font-weight:600}" +
  "#cocModo .mFin ul{list-style:none;padding:0;margin:14px 0 0;text-align:left}" +
  "#cocModo .mFin li{font-size:15px;font-weight:600;padding:7px 0;border-top:1px solid rgba(255,255,255,.08);color:#dfe2e6}" +
  "#cocModo .mBig{width:100%;height:60px;border-radius:30px!important;background:var(--ca,#f08a4b);color:#140b04;font-size:18px;font-weight:800;margin-top:18px}" +
  "#cocModo .mSec{width:100%;height:52px;border-radius:26px!important;background:rgba(255,255,255,.1);color:#f4f5f7;font-size:16px;font-weight:700;margin-top:10px}";
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
  ".cocCompra li.cocGrupo{padding:14px 0 2px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mu)}" +
  ".cocCompra li.cocGrupo+li button,.cocCompra li.cocGrupo+li.conQuita{border-top:0!important}" +
  ".cocCompra li.cocGrupo:first-child{padding-top:4px}" +
  ".cocFila{grid-template-columns:84px 1fr auto!important}" +
  "#cocEsc .eCam.nativo{height:170px}" +
  ".cocZonas{margin-top:12px}" +
  ".cocZonaFila{width:100%;display:grid;grid-template-columns:1fr auto 20px;gap:10px;align-items:center;text-align:left;min-height:64px;padding:10px 0;border-top:1px solid var(--ln);color:var(--fg)}" +
  ".cocZonaFila:first-child{border-top:0}" +
  ".cocZonaFila b{display:block;font-size:16px;font-weight:800}" +
  ".cocZonaFila small{display:block;margin-top:2px;font-size:13px;font-weight:600;line-height:1.4;color:var(--mu);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}" +
  ".cocZonaFila em{font-style:normal;font-size:15px;font-weight:800;color:var(--mu)}.cocZonaFila svg{width:18px;height:18px;color:var(--mu)}" +
  ".cocPillsZona{margin-top:14px}" +
  ".cocHojaBot .cocHojaX{background:none!important;box-shadow:none!important;color:var(--mu);display:flex!important;align-items:center;justify-content:center}.cocHojaX svg{width:20px;height:20px}";
function ponCSS() {
  if (document.getElementById("cocCss")) return;
  var st = document.createElement("style"); st.id = "cocCss"; st.textContent = CSS; document.head.appendChild(st);
}

/* --------------------------------- datos --------------------------------- */
var R = lee(K_RECETAS, null) || { t: 0, lista: [], json: {} };
var cargando = null;
function recetas(cb) {                     // el indice y las recetas de Copiloto Cocina, con copia para sin red
  if (cargando) return cargando.then(cb);
  if (R.lista.length && Date.now() - R.t < 10 * 60e3) { cb && cb(); return Promise.resolve(); }   // las nuevas de Claude, a los 10 min
  cargando = fetch(RECETAS_URL + "index.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw r.status; return r.json(); })
    .then(function (idx) {
      return Promise.all(idx.map(function (x) {
        return fetch(RECETAS_URL + encodeURIComponent(x.id) + ".json", { cache: "no-store" })
          .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
      })).then(function (js) {
        var json = {}; js.forEach(function (j) { if (j && j.id) json[j.id] = j; });
        R = { t: Date.now(), lista: idx, json: json }; guarda(K_RECETAS, R);
      });
    }).catch(function () {}).then(function () { cargando = null; });
  return cargando.then(cb);
}
var NOTA = lee(K_NOTA, null), pidiendoNota = null;   // {t, texto, fecha} | {t, error}
function nota(conf, cb) {                    // la nota de la despensa, por el Worker (/despensa)
  if (!conf || !conf.url || !conf.key) { cb && cb(); return; }
  if (NOTA && Date.now() - NOTA.t < 5 * 60e3) { cb && cb(); return; }
  if (pidiendoNota) return;
  pidiendoNota = fetch(conf.url.replace(/\/+$/, "") + "/despensa", { headers: { "X-Copiloto-Key": conf.key }, cache: "no-store" })
    .then(function (r) { return r.json().catch(function () { return { error: "http " + r.status }; }); })
    .then(function (j) {
      if (j && j.texto) NOTA = { t: Date.now(), texto: j.texto, fecha: j.fecha || null };
      else NOTA = { t: Date.now(), texto: NOTA && NOTA.texto || "", error: (j && j.error) || "sin_datos" };
      guarda(K_NOTA, NOTA);
    }, function () { NOTA = NOTA || { texto: "" }; NOTA.t = Date.now(); NOTA.sinRed = true; })   // se reintenta a los 5 min
    .then(function () { pidiendoNota = null; cb && cb(); });
}
function cambios() { return lee(K_CAMBIOS, []); }
function nuevoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function apunta(cb) { cb.id = cb.id || nuevoId(); var L = conId(cambios()); L.push(cb); guarda(K_CAMBIOS, L.slice(-400)); subeLuego(); return cb; }
function desapunta(id) {                     // desmarcar: queda borrado (asi tambien se borra en el otro sitio)
  var L = conId(cambios()); L.forEach(function (x) { if (x.id === id) { x.borrado = true; x.tb = Date.now(); } });
  guarda(K_CAMBIOS, L); subeLuego();
}
// lo que apuntas tu en la lista de la compra: [{id, t, txt, borrado}]
function lista() { return lee(K_LISTA, []); }
function aLista(txt) {
  txt = String(txt || "").replace(/\s+/g, " ").trim(); if (!txt) return;
  var L = lista(); if (L.some(function (x) { return !x.borrado && parecido(x.txt, txt) === 1; })) return;
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
  var antes = JSON.stringify([conId(cambios()), lista()]);
  fetch(conf.url.replace(/\/+$/, "") + "/cocina", { method: "POST", cache: "no-store",
    headers: { "X-Copiloto-Key": conf.key, "Content-Type": "application/json" },
    body: JSON.stringify({ cambios: conId(cambios()), lista: lista() }) })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!j || !Array.isArray(j.cambios)) return;
      var C2 = mezcla(cambios(), j.cambios, 400), L2 = mezcla(lista(), j.lista || [], 300);   // y lo de aqui mientras tanto
      guarda(K_CAMBIOS, C2); guarda(K_LISTA, L2);
      if (JSON.stringify([C2, L2]) !== antes && enTab()) pinta();
    }, function () {})
    .then(function () { subiendo = false; });
}

/* ------------------------------ la pantalla ------------------------------ */
// CTX: el de la pestaña Cocina (dia, conf, activa...). MCTX: el de quien abrio el modo paso a
// paso o el escaner (la pestaña, o HOY), para su marca en el historial.
var CTX = null, MCTX = null, SEL = null, cont = null, abiertas = {};
// solo se repinta la pestaña si sigue abierta: #ptCuerpo es el mismo para Estadísticas o Arc
function diaHoy() { return (CTX && CTX.hoy) || isoDe(Date.now()); }
function enTab() { return !!(cont && document.body.contains(cont) && CTX && (!CTX.activa || CTX.activa())); }
/* Cada cosa en su sitio, sin scroll largo: cinco subpestañas arriba (fijas al bajar). */
var SUBS = [["ahora", "Ahora"], ["semana", "Semana"], ["comprar", "Comprar"], ["tengo", "Tengo"], ["recetas", "Recetas"]];
var SUB = "ahora", ZONA = null, TOCADO = null, ANADIR = false;
API.pinta = function (c, ctx) {
  ponCSS(); cont = c; CTX = ctx || {}; MCTX = CTX;
  SUB = CTX.sub || "ahora"; TOCADO = null; ANADIR = false;
  if (CTX.sel) SEL = CTX.sel;                // se abre con una comida de la linea del dia
  pinta();
  recetas(function () { if (cont === c && enTab()) pinta(); });
  nota(CTX.conf, function () { if (cont === c && enTab()) pinta(); });
  sincroniza();
};
API.sub = function (s) { if (SUBS.some(function (x) { return x[0] === s; })) { SUB = s; TOCADO = null; if (enTab()) { pinta(); cont.scrollTop = 0; } } return SUB; };
function pinta() {
  var c = cont; if (!c) return;
  var hoy = CTX.hoy, ahora = CTX.ahora || "00:00";
  var L = comidasDe(CTX.dia).filter(function (x) { return x.fecha >= hoy; });
  L.sort(function (a, b) { return (a.fecha + a.hora) < (b.fecha + b.hora) ? -1 : 1; });
  var D = NOTA && NOTA.texto ? despensa(NOTA.texto) : null, CB = vigentes(cambios(), D && D.fecha);
  var toca = (SEL && L.filter(function (x) { return x.uid === SEL; })[0]) || queToca(L, hoy, ahora);
  var LC = listaCompra(L, D, CB, hoy);
  var y = c.scrollTop, foco = document.activeElement && document.activeElement.id; c.innerHTML = "";
  c.appendChild(barra(LC.items.length));
  if (SUB === "semana") c.appendChild(semana(L, toca, hoy));
  else if (SUB === "comprar") c.appendChild(compra(LC, D));
  else if (SUB === "tengo") c.appendChild(alimentos(D, CB, hoy));
  else if (SUB === "recetas") c.appendChild(listaRecetas(D, CB, hoy));
  else { c.appendChild(hero(toca, D, CB, hoy, ahora)); var ig = ingsSec(toca, D, CB, hoy); if (ig) c.appendChild(ig); }
  c.scrollTop = y;
  if (foco && document.getElementById(foco)) document.getElementById(foco).focus();
}
function barra(nCompra) {
  var nav = el("nav", "cocTabs"), b = nav.appendChild(el("div", "cocSeg")); b.setAttribute("role", "tablist"); b.setAttribute("aria-label", "Cocina");
  SUBS.forEach(function (s) {
    var x = el("button", "", esc(s[1]) + (s[0] === "comprar" && nCompra ? '<b>' + nCompra + '</b>' : ""));
    x.setAttribute("role", "tab"); x.setAttribute("aria-selected", SUB === s[0]);
    x.addEventListener("click", function () { if (SUB === s[0]) return; SUB = s[0]; TOCADO = null; ANADIR = false; pinta(); cont.scrollTop = 0; });
    b.appendChild(x);
  });
  return nav;
}
// los ingredientes de lo que toca, cada uno con si esta en casa (debajo de la tarjeta, en Ahora)
function ingsDe(cm) {
  var rec = recetaDe(cm, R.lista), Jr = rec && R.json[rec.id], J = recalienta(cm) ? null : Jr;
  return cm.ingredientes.length ? cm.ingredientes : (J ? J.ingredientes.map(function (i) { return { txt: i.cantidad + " " + i.nombre, nombre: i.nombre, cant: i.cantidad }; }) : []);
}
function ingsSec(cm, D, CB, hoy) {
  if (!cm) return null;
  var ings = ingsDe(cm); if (!ings.length) return null;
  var s = el("section", "cocSec"), no = 0, ul = el("ul", "cocIng");
  ings.forEach(function (i) {
    var e = estadoDe(i, D, CB, hoy), txt = i.cant ? i.nombre : i.txt;
    if (e.estado === "no") no++;
    ul.appendChild(el("li", e.estado === "?" ? "" : e.estado, '<i></i><span>' + esc(txt) + '</span><small>' +
      esc(i.cant ? i.cant : e.estado === "no" ? "no hay" : e.zona || "") + '</small>'));
  });
  s.innerHTML = '<h3>Ingredientes</h3><p class="sub">' + esc(!D ? ings.length + " ingredientes" : no ? no + " no " + (no === 1 ? "está" : "están") + " en casa: salen en Comprar" : "Todo en casa") + '</p>';
  s.appendChild(ul);
  return s;
}

function hero(cm, D, CB, hoy, ahora) {
  var s = el("section", "cocSec cocHero");
  if (!cm) {
    s.innerHTML = '<h3>Ahora toca</h3><p class="cocVacio">No hay comidas en el calendario <b>Comidas</b> para los próximos días. ' +
      'Cuando Claude meta el plan de la semana, salen aquí con sus ingredientes y sus pasos.</p>';
    return s;
  }
  var rec = recetaDe(cm, R.lista), Jr = rec && R.json[rec.id];
  // un tupper (o sobras) no se cocina: se recalienta, con sus pasos o con los de la receta
  var J = recalienta(cm) ? null : Jr;
  var en = enCuanto(cm, hoy, ahora);
  var h = '<em>' + esc((cm.fecha === hoy ? "" : diaTxt(cm.fecha, hoy) + " · ") + queComida(cm.hora) + (cm.hora ? " · " + cm.hora : "") + (en ? " · " + en : "")) + '</em>' +
    '<h2>' + esc(cm.titulo) + '</h2>';
  var meta = [];
  var nr = cm.raciones || (J && J.meta.raciones); if (nr) meta.push(nr + (nr === 1 ? " ración" : " raciones"));
  if (cm.etiqueta && !/^(desayuno|comida|cena|merienda|media mañana)$/i.test(cm.etiqueta)) meta.push(cm.etiqueta);   // ya va arriba
  if (J && J.meta.tiempo_total_min) meta.push(J.meta.tiempo_total_min + " min");
  if (J) meta.push("Receta paso a paso");
  if (meta.length) h += '<div class="cocMeta">' + meta.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join("") + '</div>';
  s.innerHTML = h;
  // ingredientes: los del evento o, si es una receta, los suyos
  var ings = cm.ingredientes.length ? cm.ingredientes : (J ? J.ingredientes.map(function (i) { return { txt: i.cantidad + " " + i.nombre, nombre: i.nombre, cant: i.cantidad }; }) : []);
  if (ings.length) {
    var faltan = 0, ul = el("ul", "cocIng");
    ings.forEach(function (i) {
      var e = estadoDe(i, D, CB, hoy), txt = i.cant ? i.nombre : i.txt;
      if (e.estado === "no") faltan++;
      ul.appendChild(el("li", e.estado === "?" ? "" : e.estado, '<i></i><span>' + esc(txt) + '</span><small>' +
        esc(i.cant ? i.cant : e.estado === "no" ? "no hay" : e.estado === "gastado" ? "gastado" : e.zona || "") + '</small>'));
    });
    s.appendChild(el("div", "cocSub", "Ingredientes<b>" + (D ? (faltan ? faltan + " no hay en casa" : "todo en casa") : ings.length) + "</b>"));
    s.appendChild(ul);
  }
  // pasos: se marcan uno a uno (se acuerda aunque cierres la app)
  var pasos = cm.pasos.length ? cm.pasos : J ? J.pasos.map(function (p) { return p.titulo + (p.detalle ? ": " + p.detalle : ""); })
            : (Jr && Jr.meta.reparto && Jr.meta.reparto.recalentar) || [];
  if (pasos.length) {
    var P = lee(K_PASOS, {}), mio = P[cm.uid] || { i: [] }, hechos = mio.i.filter(Boolean).length;
    var cab = el("div", "cocSub", "Cómo se hace<b>" + hechos + " de " + pasos.length + "</b>");
    var ol = el("ol", "cocPasos");
    pasos.forEach(function (p, k) {
      var b = el("button", "", '<i>' + (mio.i[k] ? svg("tick") : (k + 1)) + '</i><span>' + negritas(p) + '</span>');
      b.setAttribute("aria-pressed", !!mio.i[k]);
      b.addEventListener("click", function () {
        var Q = lee(K_PASOS, {}); Q[cm.uid] = Q[cm.uid] || { i: [] }; Q[cm.uid].i[k] = !Q[cm.uid].i[k]; Q[cm.uid].t = Date.now();
        guarda(K_PASOS, Q); pinta();
      });
      ol.appendChild(el("li")).appendChild(b);
    });
    s.appendChild(cab); s.appendChild(ol);
  }
  cm.notas.filter(function (n) { return !/raci[oó]n/i.test(n) || n.length > 40; }).slice(0, 3).forEach(function (n) { s.appendChild(el("p", "cocNota", negritas(n))); });
  if (J || pasos.length) {
    var go = el("button", "cocGo", svg("olla") + (J ? "Cocinar paso a paso" : "Hacerlo paso a paso"));
    go.addEventListener("click", function () { abreModo(J ? { receta: J } : { comida: cm, pasos: pasos }); });
    s.appendChild(go);
  }
  if (DIS === "B") return heroB(s, cm, J, pasos, ings, D, CB);
  if (DIS === "C") return heroC(s, cm, J, pasos, ings, D, CB, h);
  return s;
}
/* Tres diseños de "Ahora toca" para elegir (copiloto.cocina.diseno; A por defecto):
   A · todo a la vista: ingredientes y pasos en la tarjeta
   B · solo lo que toca ahora: el paso siguiente en grande y lo que falta en una línea
   C · como las tarjetas de HOY: color de comida, lo esencial y un botón            */
var DIS = lee("copiloto.cocina.diseno", "C");   // el elegido el 30/09: como las tarjetas de HOY
/* HOY, a la hora de una comida: su tarjeta en grande (la del diseño C). Tocarla abre Cocina;
   su botón cocina paso a paso desde aquí, y "atrás" vuelve a HOY.                        */
API.tarjetaHoy = function (ev, ctx) {
  ponCSS(); ctx = ctx || {};
  var cm = comida(ev), D = NOTA && NOTA.texto ? despensa(NOTA.texto) : null, CB = vigentes(cambios(), D && D.fecha);
  var antes = DIS, card; DIS = "C";
  try { card = hero(cm, D, CB, ctx.hoy, ctx.ahora); } finally { DIS = antes; }
  if (!card.querySelector(".tjGo") && card.classList.contains("tj")) {
    var ver = el("button", "tjGo", svg("olla") + "Ver en Cocina");
    ver.addEventListener("click", function () { if (ctx.abre) ctx.abre(cm.uid); });
    card.appendChild(ver);
  }
  card.addEventListener("click", function (e) {           // antes que el boton: su modo vuelve a HOY
    MCTX = ctx;
    if (!(e.target.closest && e.target.closest("button")) && ctx.abre) ctx.abre(cm.uid);
  }, true);
  // recetas y despensa al dia: si llegan cambios, HOY se repinta (una vez)
  var tr = R.t, tn = NOTA && NOTA.t;
  recetas(function () { if (R.t !== tr && ctx.repinta) ctx.repinta(); });
  nota(ctx.conf, function () { if ((NOTA && NOTA.t) !== tn && ctx.repinta) ctx.repinta(); });
  return card;
};
API.diseno = function (d) { if (/^[ABC]$/.test(d)) { DIS = d; guarda("copiloto.cocina.diseno", d); if (enTab()) pinta(); } return DIS; };
function resumenIngs(ings, D, CB) {
  if (!ings.length) return "";
  if (!D) return ings.length + " ingredientes";
  var no = ings.filter(function (i) { return estadoDe(i, D, CB, diaHoy()).estado === "no"; });
  return !no.length ? "Todo en casa · " + ings.length + " ingredientes"
    : "Falta " + no.slice(0, 2).map(function (i) { return (i.cant ? i.nombre : cantidad(i.txt) ? cantidad(i.txt).resto : i.nombre).replace(/\s*\(.*\)$/, "").toLowerCase(); }).join(" y ") +
      (no.length > 2 ? " y " + (no.length - 2) + " más" : "") + " · " + (ings.length - no.length) + " de " + ings.length + " en casa";
}
function heroB(s, cm, J, pasos, ings, D, CB) {
  var cab = s.querySelector("em").outerHTML + s.querySelector("h2").outerHTML + (s.querySelector(".cocMeta") ? s.querySelector(".cocMeta").outerHTML : "");
  var go = s.querySelector(".cocGo");
  var n = el("section", "cocSec cocHero");
  n.innerHTML = cab;
  if (ings.length) n.appendChild(el("p", "cocLinea", esc(resumenIngs(ings, D, CB))));
  if (pasos.length) {
    var P = lee(K_PASOS, {}), mio = P[cm.uid] || { i: [] }, k = 0;
    while (k < pasos.length && mio.i[k]) k++;
    var puntos = pasos.map(function (_, j) { return '<i class="' + (mio.i[j] ? "ya" : j === k ? "ahora" : "") + '"></i>'; }).join("");
    var caja = el("div", "cocAhora");
    if (k < pasos.length) {
      caja.innerHTML = '<div class="cocPuntos">' + puntos + '<span>Paso ' + (k + 1) + ' de ' + pasos.length + '</span></div><p>' + negritas(pasos[k]) + '</p>' +
        (pasos[k + 1] ? '<small>Luego: ' + esc(pasos[k + 1].slice(0, 70)) + '</small>' : "");
      var ok = el("button", "cocListo", svg("tick") + "Hecho");
      ok.addEventListener("click", function () { var Q = lee(K_PASOS, {}); Q[cm.uid] = Q[cm.uid] || { i: [] }; Q[cm.uid].i[k] = true; Q[cm.uid].t = Date.now(); guarda(K_PASOS, Q); pinta(); });
      caja.appendChild(ok);
    } else caja.innerHTML = '<div class="cocPuntos">' + puntos + '<span>Todo hecho</span></div><p>Buen provecho.</p>';
    n.appendChild(caja);
  }
  if (go) n.appendChild(go);
  return n;
}
function heroC(s, cm, J, pasos, ings, D, CB, cabHtml) {
  var go = s.querySelector(".cocGo");
  var n = el("article", "tj cocTj");
  var ojo = s.querySelector("em").textContent, meta = [].map.call(s.querySelectorAll(".cocMeta span"), function (x) { return x.textContent; });
  var largo = cm.titulo.length > 26 ? (cm.titulo.length > 44 ? " muyLargo" : " largo") : "";
  n.innerHTML = '<div class="tjFondo">' + svg("olla") + '</div><div class="tjEye">' + esc(ojo) + '</div><h3 class="tjTit' + largo + '">' + esc(cm.titulo) + '</h3>' +
    (meta.length ? '<div class="tjMeta">' + meta.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join("") + '</div>' : "") +
    '<ul class="tjGym">' + (ings.length ? '<li><span>' + esc(resumenIngs(ings, D, CB)) + '</span></li>' : "") +
    (pasos.length ? '<li><span>Cómo se hace</span><b>' + pasos.length + ' pasos</b></li>' : "") + '</ul>';
  if (go) { var g = el("button", "tjGo", svg("olla") + esc(go.textContent)); g.onclick = go.onclick; g.addEventListener("click", function () { go.click(); }); n.appendChild(g); }
  return n;
}

function recalienta(cm) { return !cm.receta && /tupper|sobras|recalent/i.test(cm.etiqueta + " " + cm.titulo); }
function semana(L, toca, hoy) {
  var s = el("section", "cocSec");
  s.innerHTML = '<h3>Esta semana</h3>';
  if (!L.length) { s.appendChild(el("p", "cocVacio", "Sin comidas planificadas.")); return s; }
  L.slice(0, 14).forEach(function (cm) {
    var rec = recetaDe(cm, R.lista);
    var b = el("button", "cocFila" + (toca && cm.uid === toca.uid ? " sel" : ""),
      '<time><b>' + esc(diaTxt(cm.fecha, hoy)) + '</b>' + esc(cm.hora || "") + '</time><span>' + esc(cm.titulo) +
      '<small>' + esc(queComida(cm.hora) + (cm.raciones ? " · " + cm.raciones + (cm.raciones === 1 ? " ración" : " raciones") : "")) + '</small></span>' +
      '<em class="cocEtq">' + esc(cm.etiqueta && !/^(desayuno|comida|cena|merienda|media mañana)$/i.test(cm.etiqueta) ? cm.etiqueta : rec ? "Receta" : "") + '</em>');
    b.addEventListener("click", function () { SEL = cm.uid; SUB = "ahora"; pinta(); cont.scrollTop = 0; });
    s.appendChild(b);
  });
  return s;
}

/* Comprar: lo que falta para las comidas de los proximos 7 dias y lo que apuntas tu. Al marcarlo
   entra en Tengo; se puede desmarcar (queda en "En el carro" hasta 12 h despues).          */
function listaCompra(L, D, CB, hoy) {
  var items = [], todos = conId(cambios()).filter(function (cb) { return !cb.borrado; });
  if (D) faltan(L.filter(function (x) { return x.fecha <= mas7(hoy); }), D, CB, hoy).forEach(function (f) {
    items.push({ k: "f:" + palabras(f.nombre).join(" "), txt: f.txt, nombre: f.nombre, grupo: diaTxt(f.fecha, hoy) + " · " + f.para[0],
                 sub: f.para.length > 1 ? "También para " + f.para.slice(1, 3).join(" y ") : "" });
  });
  lista().forEach(function (x) {
    if (x.borrado || todos.some(function (cb) { return cb.lista === "m:" + x.id; })) return;
    if (items.some(function (i) { return parecido(i.nombre, x.txt) > 0; })) return;
    items.push({ k: "m:" + x.id, txt: x.txt, nombre: x.txt, id: x.id, grupo: "Apuntado por ti" });
  });
  var carro = todos.filter(function (cb) { return cb.tipo === "compra" && cb.lista && Date.now() - cb.t < 12 * 3600e3; });
  return { items: items, carro: carro };
}
function compra(LC, D) {
  var s = el("section", "cocSec");
  var n = LC.items.length;
  s.innerHTML = '<p class="cocLead">' + (n ? n + (n === 1 ? " cosa" : " cosas") + " que comprar" : "Nada que comprar") + '</p><p class="sub">' +
    (D ? "Lo que falta para las comidas de los próximos 7 días, y lo que apuntes tú" : "Lo que apuntes tú (lo de las comidas sale cuando se pueda leer lo que tienes)") + '</p>';
  if (LC.items.length) {
    var ul = el("ul", "cocCompra"), grupo = null;
    LC.items.forEach(function (it) {
      if (it.grupo !== grupo) { grupo = it.grupo; ul.appendChild(el("li", "cocGrupo", esc(grupo))); }
      var b = el("button", "", '<i></i><span>' + esc(it.txt) + (it.sub ? '<small>' + esc(it.sub) + '</small>' : "") + '</span>');
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {         // al carro: ya esta en Tengo
        apunta({ t: Date.now(), tipo: "compra", items: [it.txt], zona: zonaPara(it.nombre), lista: it.k });
        pinta();
      });
      var li = el("li"); li.appendChild(b);
      if (it.id) { var q = el("button", "cocQuita", svg("cerrar")); q.setAttribute("aria-label", "Quitar de la lista"); q.addEventListener("click", function () { deLista(it.id); pinta(); }); li.appendChild(q); li.className = "conQuita"; }
      ul.appendChild(li);
    });
    s.appendChild(ul);
  }
  s.appendChild(formAnadir("cocAnadeCompra", "Añadir a la lista", function (t) { aLista(t); }));
  if (LC.carro.length) {
    var c = el("div", "cocZona", '<h4>En el carro<small>ya en Tengo · toca para quitarlo</small></h4>'), uc = el("ul", "cocCompra");
    LC.carro.forEach(function (cb) {
      var b = el("button", "", '<i>' + svg("tick") + '</i><span>' + esc(cb.items.join(", ")) + '</span>');
      b.setAttribute("aria-pressed", "true");
      b.addEventListener("click", function () { desapunta(cb.id); pinta(); });
      uc.appendChild(el("li")).appendChild(b);
    });
    c.appendChild(uc); s.appendChild(c);
  }
  s.appendChild(botonEscaner());
  return s;
}
function mas7(iso) { var d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); }
function botonEscaner(corto) {               // lo comprado, con el codigo de barras
  var b = el("button", "cocBtn", svg("barras") + (corto ? "Escanear" : "Escanear lo que has comprado"));
  b.addEventListener("click", abreEscaner); return b;
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

/* Tengo: lo que hay en casa, por zonas. Tocar algo: "Se acabó" (y, si quieres, a la lista).
   Lo que compras, escaneas o añades aqui entra solo: no hace falta contarselo a nadie.   */
function alimentos(D, CB, hoy) {
  var s = el("section", "cocSec cocTengo");
  if (!D && !CB.length) {
    var err = NOTA && NOTA.error;
    s.innerHTML = '<p class="cocLead">Lo que tienes</p>';
    s.appendChild(el("p", "cocVacio", err === "sin_configurar"
      ? "Lo que hay en casa parte de tu nota <b>Despensa habitual</b> de Obsidian. Falta darle permiso al Worker para leerla (una vez)."
      : err === "ruta_desconocida" ? "Tu Worker todavía no sabe leer la despensa: falta desplegar su versión nueva."
      : !CTX.conf || !CTX.conf.key ? "Conecta la app en Ajustes para ver lo que tienes."
      : NOTA && NOTA.sinRed ? "Sin conexión: no se puede leer lo que tienes ahora."
      : err ? "No se ha podido leer lo que tienes (" + esc(err) + "). Lo demás funciona igual."
      : "Leyendo lo que tienes…"));
    s.appendChild(botonEscaner());
    return s;
  }
  var H = casa(D, CB, hoy), zonas = H.zonas;
  if (ZONA && !zonas.some(function (z) { return z.zona === ZONA; })) ZONA = null;
  s.innerHTML = '<p class="cocLead">' + H.n + (H.n === 1 ? " cosa" : " cosas") + ' en casa</p>' +
    (NOTA && (NOTA.sinRed || NOTA.error) ? '<p class="sub">Sin conexión: la última copia</p>' : "");
  // las zonas, para ver solo una
  var ch = el("div", "cocChips");
  [[null, "Todo", H.n]].concat(zonas.map(function (z) { return [z.zona, z.zona, z.items.length]; })).forEach(function (z) {
    var b = el("button", "", esc(z[1]) + '<b>' + z[2] + '</b>'); b.setAttribute("aria-pressed", ZONA === z[0]);
    b.addEventListener("click", function () { ZONA = z[0]; TOCADO = null; pinta(); });
    ch.appendChild(b);
  });
  s.appendChild(ch);
  var acciones = el("div", "cocDos");
  var ba = el("button", "cocBtn", svg("mas") + "Añadir"); ba.setAttribute("aria-expanded", ANADIR);
  ba.addEventListener("click", function () { ANADIR = !ANADIR; pinta(); if (ANADIR) { var i = document.getElementById("cocAnadeTengo"); if (i) i.focus(); } });
  acciones.appendChild(botonEscaner(true)); acciones.appendChild(ba);
  s.appendChild(acciones);
  if (ANADIR) {
    var zAn = ZONA || "Despensa", fz = el("div", "cocZonasAn");
    s.appendChild(formAnadir("cocAnadeTengo", "Qué has traído (p. ej. 1 kg de arroz)", function (t) {
      apunta({ t: Date.now(), tipo: "compra", items: [t], zona: fz.getAttribute("data-z") || zonaPara(t) });
    }));
    fz.setAttribute("data-z", ZONA || "");
    ["Nevera", "Despensa", "Congelador"].forEach(function (z) {
      var b = el("button", "", esc(z)); b.type = "button"; b.setAttribute("aria-pressed", ZONA ? zAn.indexOf(z) === 0 : false);
      b.addEventListener("click", function () { fz.setAttribute("data-z", z); [].forEach.call(fz.children, function (x) { x.setAttribute("aria-pressed", x === b); }); });
      fz.appendChild(b);
    });
    s.appendChild(fz);
  }
  if (!ZONA) {
    // Todo: una fila por zona con lo que hay (cabe en la pantalla); tocarla abre esa zona
    var zl = el("div", "cocZonas");
    zonas.forEach(function (z) {
      var b = el("button", "cocZonaFila", '<span><b>' + esc(z.zona) + '</b><small>' + esc(z.items.slice(0, 5).map(function (x) { return x.nombre; }).join(" · ") +
        (z.items.length > 5 ? " · y " + (z.items.length - 5) + " más" : "")) + '</small></span><em>' + z.items.length + '</em>' + svg("der"));
      b.addEventListener("click", function () { ZONA = z.zona; TOCADO = null; pinta(); cont.scrollTop = 0; });
      zl.appendChild(b);
    });
    s.appendChild(zl);
  } else zonas.forEach(function (z) {
    if (z.zona !== ZONA) return;
    var p = el("div", "cocPills cocPillsZona");
    z.items.forEach(function (x) {
      var b = el("button", "", esc(x.nombre) + (x.c ? '<b>' + esc(cantTxt(x.c)) + '</b>' : ""));
      b.setAttribute("aria-pressed", TOCADO === x.nombre);
      b.addEventListener("click", function () { TOCADO = TOCADO === x.nombre ? null : x.nombre; pinta(); });
      p.appendChild(b);
    });
    s.appendChild(p);
  });
  var tx = TOCADO && H.todos.filter(function (x) { return x.nombre === TOCADO; })[0];
  if (tx) s.appendChild(hojaItem(tx));
  else TOCADO = null;
  return s;
}
// lo tocado en Tengo: abajo, fija, con lo que se puede hacer
function hojaItem(x) {
  var h = el("div", "cocHojaIt");
  h.innerHTML = '<div><b>' + esc(x.nombre) + '</b>' + (x.c ? '<span>' + esc(cantTxt(x.c)) + '</span>' : "") +
    (x.nutri ? '<small>Por ' + esc(x.nutri.por) + ': ' + esc(nutriTxt(x.nutri)) + '</small>' : "") + '</div>';
  var fila = el("div", "cocHojaBot");
  var a = el("button", "", "Se acabó"), l = el("button", "", "Se acabó · a la lista"), c = el("button", "cocHojaX", svg("cerrar"));
  c.setAttribute("aria-label", "Cerrar");
  a.addEventListener("click", function () { apunta({ t: Date.now(), tipo: "acaba", items: [x.nombre] }); TOCADO = null; pinta(); });
  l.addEventListener("click", function () { apunta({ t: Date.now(), tipo: "acaba", items: [x.nombre] }); aLista(x.nombre); TOCADO = null; pinta(); });
  c.addEventListener("click", function () { TOCADO = null; pinta(); });
  fila.appendChild(a); fila.appendChild(l); fila.appendChild(c); h.appendChild(fila);
  return h;
}

function listaRecetas(D, CB, hoy) {
  var s = el("section", "cocSec");
  s.innerHTML = '<h3>Recetas</h3><p class="sub">De Copiloto Cocina · con temporizador y voz</p>';
  if (!R.lista.length) { s.appendChild(el("p", "cocVacio", cargando ? "Trayendo las recetas…" : "Sin conexión: las recetas salen en cuanto haya red.")); return s; }
  R.lista.forEach(function (r) {
    var J = R.json[r.id], falt = J && D ? J.ingredientes.filter(function (i) { return estadoDe(i, D, CB, hoy).estado === "no"; }).length : null;
    var b = el("button", "cocFila", '<time><b>' + esc(r.tiempo_total_min ? r.tiempo_total_min + " min" : "") + '</b>' + esc(r.raciones ? r.raciones + " rac." : "") + '</time><span>' +
      esc(r.titulo) + '<small>' + esc(falt == null ? "" : falt === 1 ? "Falta 1 ingrediente" : falt ? "Faltan " + falt + " ingredientes" : "Tienes todo") + '</small></span>' + '<em class="cocEtq">Cocinar</em>');
    b.addEventListener("click", function () { if (J) abreModo({ receta: J }); });
    s.appendChild(b);
  });
  return s;
}

/* ---------------------------- modo paso a paso ----------------------------
   Una receta de Copiloto Cocina (con su tiempo, avisos, checklist y "mientras
   tanto", como en esa app) o una comida del calendario (un paso por pantalla;
   si el paso dice "10 min", su temporizador). Pantalla encendida y voz.     */
var M = null, TICK = null, cerrojo = null;
/* Una rutina del calendario "Claude" (la de noche, p. ej.) con el mismo modo: ver pasosGuia. */
API.hayGuia = function (ev) { return pasosGuia(ev).length >= 2; };
API.guia = function (ev, ctx) {
  var P = pasosGuia(ev); if (P.length < 2) return false;
  if (ctx) MCTX = ctx;
  abreModo({ guia: { uid: ev.uid, titulo: sinEmoji(ev.titulo).replace(/\s+/g, " ").trim() }, pasosGuia: P });
  return true;
};
function abreModo(q) {
  ponCSS();
  var J = q.receta, cm = q.comida, G = q.guia;
  var pasos = J ? J.pasos : G ? q.pasosGuia : (q.pasos || cm.pasos).map(function (p) { return { titulo: p.replace(/[.:].*$/, "").slice(0, 60), detalle: p, duracion_s: minutosDe(p) * 60, soloTexto: true }; });
  var id = J ? "r:" + J.id : G ? "g:" + G.uid : "c:" + cm.uid, S = lee("copiloto.cocina.modo." + id, null);
  M = { id: id, J: J, cm: cm, G: G, pasos: pasos, titulo: J ? J.meta.titulo : G ? G.titulo : cm.titulo,
        S: S && S.paso < pasos.length ? S : { paso: 0, fin: null, pausa: null, avisados: [], checks: {} } };
  if (!S || S.paso >= pasos.length) empiezaPaso(0);
  var tema = J && J.tema || {};
  var box = document.getElementById("cocModo") || document.body.appendChild(el("div"));
  box.id = "cocModo"; box.hidden = false;
  box.style.setProperty("--ca", tema.acento_oscuro || "#f08a4b");
  if (MCTX && MCTX.marca) MCTX.marca("cocina");
  try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then(function (l) { cerrojo = l; }, function () {}); } catch (e) {}
  pintaModo(true);
  clearInterval(TICK); TICK = setInterval(tick, 250);
}
function guardaModo() { if (M) guarda("copiloto.cocina.modo." + M.id, M.S); }
function cierraModo(desdeAtras) {
  clearInterval(TICK); TICK = null; M = null;
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  try { if (cerrojo) cerrojo.release(); } catch (e) {} cerrojo = null;
  var b = document.getElementById("cocModo"); if (b) { b.hidden = true; b.innerHTML = ""; }
  if (!desdeAtras && history.state && history.state.pant === "cocina" && MCTX && MCTX.atrasManual) MCTX.atrasManual();
  if (enTab()) pinta();
  if (MCTX && MCTX.repinta) MCTX.repinta();   // HOY: lo hecho y lo gastado, al dia
}
API.atras = function () {                   // el gesto de atras cierra el escaner o el modo paso a paso
  if (ESC) { cierraEscaner(true); return true; }
  if (!M) return false; cierraModo(true); return true;
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
function fmt(s) { var neg = s < 0; s = Math.abs(Math.round(s)); return (neg ? "+" : "") + Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }
function quedan() {
  var st = M.pasos[M.S.paso]; if (!st.duracion_s) return null;
  if (M.S.pausa != null) return M.S.pausa;
  if (!M.S.fin) return st.duracion_s;
  return (M.S.fin - Date.now()) / 1000;
}
var CARRIL = { fuego: "Fuego", manos: "Manos", airfryer: "Air fryer", micro: "Micro", reposo: "Reposo" };
function pintaModo(habla) {
  var box = document.getElementById("cocModo"); if (!box || !M) return;
  var st = M.pasos[M.S.paso], J = M.J, n = M.pasos.length;
  var tags = [];
  if (st.fuego) tags.push("Fuego " + st.fuego);
  (st.carriles || []).forEach(function (l) { if (l !== "fuego" && CARRIL[l]) tags.push(CARRIL[l]); });
  if (st.estimado) tags.push(st.estimado);
  var usa = J ? (st.usa || []).map(function (i) { return J.ingredientes[i]; }).filter(Boolean) : [];
  var sig = M.pasos[M.S.paso + 1];
  var h = '<div class="mTop"><button class="mX" aria-label="Salir">' + svg("cerrar") + '</button><span>' + esc(M.titulo) + '</span></div>' +
    '<div class="mProg">' + M.pasos.map(function (_, k) { return '<i class="' + (k < M.S.paso ? "ya" : k === M.S.paso ? "ahora" : "") + '"></i>'; }).join("") + '</div>' +
    '<div class="mCuerpo"><div class="mPaso">Paso ' + (M.S.paso + 1) + ' de ' + n + (tags.length ? '<span class="mTags">' + tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join("") + '</span>' : "") + '</div>' +
    (st.soloTexto && st.detalle.length <= 110 ? '<h2>' + negritas(st.detalle) + '</h2>'
      : '<h2>' + esc(st.soloTexto ? "Paso " + (M.S.paso + 1) : st.titulo) + '</h2><p class="mDet">' + negritas(st.detalle || "") + '</p>') +
    (usa.length ? '<ul class="mUsa">' + usa.map(function (i) { return '<li>' + esc(i.nombre) + '<b>' + esc(i.cantidad) + '</b></li>'; }).join("") + '</ul>' : "") +
    (st.duracion_s ? '<div class="mReloj"><div class="mDig">0:00</div><div class="mBarra"><i></i></div><div class="mEst"></div>' +
      ((st.avisos || []).length ? '<ul class="mAvisos">' + st.avisos.map(function (a) { return '<li data-a="' + a.a_los_s + '"><b>' + fmt(st.duracion_s - a.a_los_s) + '</b>' + esc(a.texto || a.voz || "") + '</li>'; }).join("") + '</ul>' : "") + '</div>' : "") +
    ((st.checklist || []).length ? '<ul class="mChecks">' + st.checklist.map(function (c, k) { var on = !!M.S.checks[M.S.paso + "-" + k]; return '<li><button data-k="' + k + '" aria-pressed="' + on + '"><i>' + (on ? svg("tick") : "") + '</i>' + esc(c) + '</button></li>'; }).join("") + '</ul>' : "") +
    (st.mientras_tanto ? '<div class="mPar"><h3>' + (st.solo_esto ? "Solo esto" : "Mientras tanto") + '</h3><p>' + negritas(st.mientras_tanto) + '</p></div>' : "") +
    (st.consejo ? '<div class="mPar"><h3>Consejo</h3><p>' + esc(st.consejo) + '</p></div>' : "") +
    (sig ? '<p class="mLuego">Luego: ' + esc((sig.soloTexto ? sig.detalle : sig.titulo).toLowerCase().slice(0, 80)) + '</p>' : "") + '</div>' +
    '<div class="mDock"><div class="mFila">' +
      (st.duracion_s ? '<button class="mPausa">' + svg(M.S.pausa != null ? "play" : "pausa") + (M.S.pausa != null ? ((st.soloTexto || st.manual) && M.S.pausa === st.duracion_s ? "Empezar" : "Seguir") : "Pausa") + '</button><button class="mMas">+1 min</button>' : '<span></span><span></span>') +
      '<button class="mHecho">' + (M.S.paso === n - 1 ? "Terminar" : "Hecho") + '</button></div>' +
      (M.S.paso > 0 ? '<button class="mAtras">Paso anterior</button>' : "") + '</div>';
  box.innerHTML = h;
  box.querySelector(".mX").onclick = function () { cierraModo(false); };
  box.querySelector(".mHecho").onclick = hecho;
  var pb = box.querySelector(".mPausa"); if (pb) pb.onclick = function () {
    if (M.S.pausa != null) { M.S.fin = Date.now() + M.S.pausa * 1000; M.S.pausa = null; di("Seguimos."); }
    else { M.S.pausa = quedan(); di("Pausa."); }
    guardaModo(); pintaModo(false);
  };
  var mb = box.querySelector(".mMas"); if (mb) mb.onclick = function () {
    var r = Math.max(quedan(), 0) + 60;
    if (M.S.pausa != null) M.S.pausa = r; else M.S.fin = Date.now() + r * 1000;
    M.S.avisados = M.S.avisados.filter(function (k) { return k !== M.S.paso + ":fin"; }); M.suena = false;
    guardaModo(); di("Un minuto más."); tick();
  };
  var ab = box.querySelector(".mAtras"); if (ab) ab.onclick = function () { va(M.S.paso - 1); };
  Array.prototype.forEach.call(box.querySelectorAll(".mChecks button"), function (b) {
    b.onclick = function () { var k = M.S.paso + "-" + b.getAttribute("data-k"); M.S.checks[k] = !M.S.checks[k]; guardaModo(); pintaModo(false); };
  });
  if (habla) di(st.voz_inicio || (st.manual ? st.titulo : (st.soloTexto ? "Paso " + (M.S.paso + 1) + ". " : "") + (st.detalle || st.titulo)));
  tick();
}
function empiezaPaso(i) {
  var st = M.pasos[i];
  M.S.paso = i; M.S.avisados = []; M.suena = false; M.S.fin = null; M.S.pausa = null;
  if (st.duracion_s) { if (st.soloTexto || st.manual) M.S.pausa = st.duracion_s; else M.S.fin = Date.now() + st.duracion_s * 1000; }
  guardaModo();
}
function va(i) { empiezaPaso(i); pintaModo(true); }
function hecho() {
  M.suena = false;
  if (M.S.paso < M.pasos.length - 1) { va(M.S.paso + 1); return; }
  fin();
}
function tick() {
  if (!M) return;
  var box = document.getElementById("cocModo"), st = M.pasos[M.S.paso]; if (!box || !st.duracion_s) return;
  var r = quedan(), pasado = st.duracion_s - r;
  var d = box.querySelector(".mDig"); if (d) { d.textContent = fmt(r); d.classList.toggle("pasa", r < 0); }
  var b = box.querySelector(".mBarra i"); if (b) b.style.width = Math.min(100, Math.max(0, pasado / st.duracion_s * 100)) + "%";
  var sigMarcado = false;
  (st.avisos || []).forEach(function (a) {
    var k = M.S.paso + ":" + a.a_los_s, li = box.querySelector('.mAvisos li[data-a="' + a.a_los_s + '"]');
    if (pasado >= a.a_los_s && M.S.pausa == null && M.S.avisados.indexOf(k) < 0) {
      M.S.avisados.push(k); guardaModo(); pita(2); di((pasado - a.a_los_s > 5 ? "Atención, " : "") + (a.voz || a.texto));
    }
    var ya = M.S.avisados.indexOf(k) >= 0;
    if (li) { li.classList.toggle("ya", ya); li.classList.toggle("sig", !ya && !sigMarcado); }
    if (!ya) sigMarcado = true;
  });
  var kf = M.S.paso + ":fin";
  if (r <= 0 && M.S.pausa == null && M.S.avisados.indexOf(kf) < 0) {
    M.S.avisados.push(kf); guardaModo(); M.suena = true; pita(3); di(st.voz_fin || "Tiempo. Toca hecho.");
  }
  if (M.suena && Date.now() - (M.ultPita || 0) > 5000) { M.ultPita = Date.now(); pita(2); }
  var e = box.querySelector(".mEst"); if (e) e.textContent = M.S.pausa != null ? (pasado === 0 && st.manual ? "Toca Empezar cuando te pongas" : pasado === 0 && st.soloTexto ? "Toca Empezar cuando lo pongas al fuego o al micro" : "En pausa") : r <= 0 ? "Tiempo cumplido · toca Hecho" : "";
  var h = box.querySelector(".mHecho"); if (h) h.classList.toggle("suena", !!M.suena);
}
// lo gastado de una receta: sin lo "al gusto" y sumando lo repetido (el ajo de las albondigas y el de la salsa)
function juntaIngs(L) {
  var out = [], por = {};
  L.forEach(function (i) {
    if (/al gusto/i.test(i.cantidad || "")) return;
    var nom = i.nombre.replace(/\s*\(.*\)$/, ""), c = cantidad(i.cantidad || ""), k = norm(nom) + "|" + (c ? c.ud : "");
    nom = nom.charAt(0).toLowerCase() + nom.slice(1);
    if (por[k] && c && por[k].c) { por[k].c.n += c.n; return; }
    por[k] = { nom: nom, c: c ? { n: c.n, ud: c.ud } : null, txt: i.cantidad }; out.push(por[k]);
  });
  return out.map(function (x) { return (x.c ? cantTxt(x.c) : x.txt) + " " + x.nom; });
}
function fin() {
  clearInterval(TICK); TICK = null;
  var box = document.getElementById("cocModo"), J = M.J, cm = M.cm;
  var ings = J ? juntaIngs(J.ingredientes) : cm ? cm.ingredientes.filter(function (i) { return i.c; }).map(function (i) { return i.txt; }) : [];
  var rep = J && J.meta.reparto;
  if (M.G) {                                // una rutina: sin nada que apuntar
    box.innerHTML = '<div class="mTop"><button class="mX" aria-label="Salir">' + svg("cerrar") + '</button><span>' + esc(M.titulo) + '</span></div>' +
      '<div class="mCuerpo mFin"><h2>Hecho</h2><p>' + esc(M.titulo) + ' completa.</p></div><div class="mDock"><button class="mBig">Salir</button></div>';
    di(/noche/i.test(M.titulo) ? "Hecho. Buenas noches." : "Hecho.");
    guarda("copiloto.cocina.modo." + M.id, null);
    box.querySelector(".mX").onclick = box.querySelector(".mBig").onclick = function () { cierraModo(false); };
    return;
  }
  box.innerHTML = '<div class="mTop"><button class="mX" aria-label="Salir">' + svg("cerrar") + '</button><span>' + esc(M.titulo) + '</span></div>' +
    '<div class="mCuerpo mFin"><h2>Hecho</h2>' + (rep && rep.taper ? '<p>' + esc(rep.taper) + '</p>' : "") +
    (ings.length ? '<p>¿Lo quito de lo que tienes? (lo que va en gramos se resta)</p><ul>' + ings.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join("") + '</ul>' : "") + '</div>' +
    '<div class="mDock">' + (ings.length ? '<button class="mBig">Apuntar lo gastado</button><button class="mSec">No, solo salir</button>' : '<button class="mBig">Salir</button>') + '</div>';
  di("Buen provecho.");
  guarda("copiloto.cocina.modo." + M.id, null);
  box.querySelector(".mX").onclick = function () { cierraModo(false); };
  box.querySelector(".mBig").onclick = function () {
    if (ings.length) apunta({ t: Date.now(), tipo: "gasto", de: M.titulo, items: ings });
    cierraModo(false);
  };
  var sec = box.querySelector(".mSec"); if (sec) sec.onclick = function () { cierraModo(false); };
}
})();

return API;
});
