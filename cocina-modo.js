/* cocina-modo.js · el modo paso a paso de Cocina, a pantalla completa (v2.23)
   CocinaModo.abre(q, ctx):
     q   = {receta: J, comida?: R} | {comida: R} | {guia: {uid, titulo}, pasos: [Paso]}
           (J: receta de Copiloto Cocina; R: Receta.leer de una comida del calendario)
     ctx = {marca(tipo), atrasManual(), repinta(), alTerminar(info)}
           info = {uid, titulo, id, gastado: [txt] | null}  (null = salir sin apuntar)
   - Los relojes no son del paso: llevan su hora de fin (ms), siguen al cambiar de
     paso, al cerrar y al volver a abrir, y puede haber varios a la vez.
   - Mirar otro paso (la barra, Pasos, Luego, un reloj o deslizar) no cambia el
     paso en el que estas: ni habla ni empieza relojes, y no hay boton Hecho.
   - Estado en localStorage copiloto.cocina.modo2.<id> (id: r:<J.id> | c:<R.uid> |
     g:<uid>); el viejo copiloto.cocina.modo.<id> se usa una vez para retomar.
   Arriba las funciones puras (se prueban en node: tests/cocina-modo.test.mjs);
   abajo la pantalla, que solo existe en el navegador.                          */
(function (raiz, fabrica) {
  var X = fabrica();
  if (typeof module === "object" && module.exports) module.exports = X;
  else raiz.CocinaModo = X;
})(typeof window !== "undefined" ? window : this, function () {
"use strict";

var PREF = "copiloto.cocina.modo2.", PREF_VIEJO = "copiloto.cocina.modo.";
var SEIS_H = 6 * 3600e3, GRACIA = 3 * 60e3, MIRA_MAX = 60e3, MAX_SEG = 12;

/* ------------------------------- texto ------------------------------- */
function dos(n) { return (n < 10 ? "0" : "") + n; }
function norm(s) {
  return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ.,/½¼¾ ]+/g, " ").replace(/\s+/g, " ").trim();
}
function mayus1(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
// "Boniato" -> "boniato" detras de una cantidad; "AOVE" se queda como esta
function minus1(s) { s = String(s || ""); return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñü]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function isoDia(ms) { var d = new Date(ms); return d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate()); }
function hhmm(ms) { var d = new Date(ms); return dos(d.getHours()) + ":" + dos(d.getMinutes()); }

/* ------------------------------ cantidades ------------------------------
   Las de las recetas de Copiloto Cocina vienen en texto ("500 g", "½ cdta");
   las de las comidas del calendario ya vienen leidas (Ing.c = {n, ud, min?}). */
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
  if (!m) return null;
  var n = numero(m[1]); if (n == null) return null;
  var u = (m[2] || "").toLowerCase().replace(/\.$/, ""), resto = m[3] || "";
  if (u && !UDS[u]) { resto = s.slice(m[1].length).trim(); u = ""; }
  var ud = UDS[u] || "ud";
  if (ud === "kg") { n *= 1000; ud = "g"; }
  if (ud === "l") { n *= 1000; ud = "ml"; }
  if (ud === "cl") { n *= 10; ud = "ml"; }
  if (ud === "docena") { n *= 12; ud = "ud"; }
  return { n: Math.round(n * 100) / 100, ud: ud, resto: resto.replace(/^\s*de\s+/, "").trim() };
}
var FRAC_TXT = { "0.25": "¼", "0.5": "½", "0.75": "¾" };
function numTxt(n) {
  var e = Math.floor(n), f = Math.round((n - e) * 100) / 100;
  if (FRAC_TXT[String(f)]) return (e ? e : "") + FRAC_TXT[String(f)];
  return String(Math.round(n * 100) / 100).replace(".", ",");
}
var PLURAL_UD = { cda: "cdas", cdta: "cdtas", diente: "dientes", lata: "latas", bote: "botes", bolsa: "bolsas", brick: "bricks",
  tarro: "tarros", sobre: "sobres", paquete: "paquetes", bola: "bolas", tarrina: "tarrinas", loncha: "lonchas",
  rebanada: "rebanadas", rodaja: "rodajas", scoop: "scoops", "puñado": "puñados", vaso: "vasos", pizca: "pizcas", tupper: "tuppers" };
function cantTxt(c) {
  if (!c || c.n == null) return "";
  if (c.ud === "g" && c.n >= 1000) return String(Math.round(c.n / 100) / 10).replace(".", ",") + " kg";
  if (c.ud === "ml" && c.n >= 1000) return String(Math.round(c.n / 100) / 10).replace(".", ",") + " l";
  var t = (c.min != null && c.min !== c.n ? numTxt(c.min) + "-" : "") + numTxt(c.n);
  if (c.aprox) t = "~" + t;
  if (!c.ud || c.ud === "ud") return t;
  return t + " " + (c.n > 1 && PLURAL_UD[c.ud] ? PLURAL_UD[c.ud] : c.ud);
}
// para la voz: "2 cucharadas", "230 gramos", "media"
var UD_VOZ = { g: ["gramo", "gramos"], ml: ["mililitro", "mililitros"], cda: ["cucharada", "cucharadas"], cdta: ["cucharadita", "cucharaditas"] };
function cantVoz(c) {
  if (!c || c.n == null) return "";
  var n = c.n, t = n === 0.5 ? (UD_VOZ[c.ud] || c.ud === "ud" ? "media" : "medio") : n === 0.25 ? "un cuarto de" : String(n).replace(".", ",");
  if (!c.ud || c.ud === "ud") return t;
  var u = UD_VOZ[c.ud] ? UD_VOZ[c.ud][n > 1 ? 1 : 0] : (n > 1 && PLURAL_UD[c.ud] ? PLURAL_UD[c.ud] : c.ud);
  return t + " " + u;
}
// "limón" -> "limones", "huevo" -> "huevos" (solo la primera palabra)
function plural(s) {
  var w = String(s || "").split(" "), p = w[0];
  if (!p || /s$/.test(p)) return s;
  if (/[aeiouáéó]$/.test(p)) p += "s";
  else { p = p.replace(/á([a-z]+)$/, "a$1").replace(/é([a-z]+)$/, "e$1").replace(/í([a-z]+)$/, "i$1").replace(/ó([a-z]+)$/, "o$1").replace(/ú([a-z]+)$/, "u$1"); p += /z$/.test(p) ? "" : "es"; if (/z$/.test(p)) p = p.slice(0, -1) + "ces"; }
  w[0] = p; return w.join(" ");
}
// lo gastado de una receta de Copiloto Cocina: sin lo "al gusto" y sumando lo repetido
function juntaIngs(L) {
  var out = [], por = {};
  (L || []).forEach(function (i) {
    if (/al gusto/i.test(i.cantidad || "")) return;
    var nom = String(i.nombre || "").replace(/\s*\(.*\)$/, ""), c = cantidad(i.cantidad || ""), k = norm(nom) + "|" + (c ? c.ud : "");
    nom = minus1(nom);
    if (por[k] && c && por[k].c) { por[k].c.n += c.n; return; }
    por[k] = { nom: nom, c: c ? { n: c.n, ud: c.ud } : null, txt: i.cantidad }; out.push(por[k]);
  });
  return out.map(function (x) { return (x.c ? cantTxt(x.c) : x.txt) + " " + x.nom; });
}

/* --------------------------- tiempos para pantalla --------------------------- */
// 600 -> "10:00"; -14 -> "+0:14" (pasado de tiempo); 3700 -> "1:01:40"
function fmt(s) {
  var neg = s < 0; s = Math.abs(Math.round(s));
  var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return (neg ? "+" : "") + (h ? h + ":" + dos(m) : m) + ":" + dos(x);
}
// 600 -> "10 min", 20 -> "20 s", 3900 -> "1 h 05"
function fmtMin(s) {
  s = Math.round(s || 0);
  if (s < 60) return s + " s";
  var m = Math.round(s / 60);
  return m < 60 ? m + " min" : Math.floor(m / 60) + " h" + (m % 60 ? " " + dos(m % 60) : "");
}
// "≈3 min" -> 180; "20 s" -> 20; "1 h" -> 3600
function segDe(t) {
  var m = String(t || "").replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(?:[-–]\s*(\d+(?:\.\d+)?)\s*)?(h|min|s)\b/i);
  if (!m) return 0;
  var n = +(m[2] || m[1]), u = m[3].toLowerCase();
  return Math.round(n * (u === "h" ? 3600 : u === "min" ? 60 : 1));
}

/* --------------------------- pasos, de cualquier sitio ---------------------------
   normaliza(q) -> M0 = {id, titulo, J, R, G, ings, pasos, auto0, acento, reparto}
   Ing de pantalla: {i, nombre, cant, num, prep, grupo, basico, opcional, hecho, c, base}
   Paso de pantalla: {k, titulo, detalle, dur, hasta, est, avisos, usa: [i], consejo, pista,
     grupo, tipo, checklist, secciones, auto, mientras, soloEsto, tags, vozIni, vozFin, reposo, reloj} */
var CARRIL = { manos: "Manos", airfryer: "Air fryer", micro: "Micro", reposo: "Reposo" };
function idDe(q) {
  q = q || {};
  if (q.receta && q.receta.id) return "r:" + q.receta.id;
  if (q.comida && q.comida.uid && !q.guia) return "c:" + q.comida.uid;
  if (q.guia) return "g:" + (q.guia.uid || q.guia.titulo || "guia");
  return "x:" + norm((q.comida && q.comida.titulo) || "receta");
}
function avisosOk(L) {
  return (L || []).filter(function (a) { return a && a.a_los_s >= 0; }).map(function (a) {
    return { a_los_s: Math.round(a.a_los_s), texto: String(a.texto || a.voz || ""), voz: String(a.voz || a.texto || "") };
  }).sort(function (a, b) { return a.a_los_s - b.a_los_s; });
}
function ingJ(i, k) {
  var nom = String(i.nombre || "").trim(), prep = "", m = nom.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (m && m[1]) { nom = m[1]; prep = m[2]; }
  var cant = String(i.cantidad || "").trim();
  return { i: k, nombre: nom, cant: cant, num: /^[~≈]?\s*[\d½¼¾]/.test(cant), prep: prep, grupo: i.grupo || "",
           basico: /al gusto/i.test(cant), opcional: false, hecho: false, c: cantidad(cant), base: "" };
}
function ingR(I, k) {
  I = I || {};
  var c = I.c && I.c.n != null ? I.c : null;
  var nom = String(I.ver || I.nombre || I.base || I.txt || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
  return { i: k, nombre: nom, cant: cantTxt(c), num: !!c, prep: I.prep || "", grupo: I.grupo || "",
           basico: !!I.basico, opcional: !!I.opcional, hecho: !!I.hecho, deCasa: !!I.deCasa, c: c, base: I.base || "" };
}
function pasoJ(p, n) {
  var tags = [];
  if (p.fuego) tags.push("Fuego " + p.fuego);
  (p.carriles || []).forEach(function (l) { if (CARRIL[l]) tags.push(CARRIL[l]); });
  var est = segDe(p.estimado);
  if (!p.duracion_s && p.estimado) tags.push(String(p.estimado));
  return { titulo: String(p.titulo || ""), detalle: String(p.detalle || ""), dur: Math.max(0, p.duracion_s | 0), hasta: 0, est: est,
           avisos: avisosOk(p.avisos), usa: (p.usa || []).filter(function (i) { return i >= 0 && i < n; }),
           consejo: p.consejo || "", pista: "", grupo: "", tipo: "paso", checklist: (p.checklist || []).slice(), secciones: null, auto: false,
           mientras: p.mientras_tanto || "", soloEsto: !!p.solo_esto, tags: tags, vozIni: p.voz_inicio || "", vozFin: p.voz_fin || "",
           reposo: p.aviso_reposo_min ? p.aviso_reposo_min * 60 : 0 };
}
var TIPO_TAG = { paralelo: "En paralelo", despues: "Al terminar" };
function pasoR(p, n) {
  if (typeof p === "string") {                  // una comida vieja: el paso es una frase
    var t = p.replace(/\s+/g, " ").trim();
    p = { titulo: t.length > 70 ? t.replace(/[.:].*$/, "") : t, detalle: t.length > 70 ? t : "", duracion_s: segDe(t) };
  }
  var tags = [], tit = String(p.titulo || "").trim(), det = String(p.detalle || "").trim();
  if (p.tipo && TIPO_TAG[p.tipo]) tags.push(TIPO_TAG[p.tipo]);
  if (tit.length > 80 && !det) { det = tit; tit = tit.split(/[.:;]\s/)[0].slice(0, 80); }   // un titulo largo no va entero en grande
  if (/…$/.test(tit) && det.toLowerCase().indexOf(tit.slice(0, -1).trim().toLowerCase()) === 0) {   // titulo cortado: sale del detalle
    var m = det.match(/^(.{3,60}?)[:.]\s+(.+)$/);
    if (m) { tit = m[1]; det = mayus1(m[2]); }                   // "Fuera: unas gotas..." -> "Fuera" y el resto debajo
    else if (det.length <= 100) { tit = det.replace(/\.$/, ""); det = ""; }
  }
  if (det && tit && det.toLowerCase().indexOf(tit.toLowerCase()) === 0) {             // el detalle empieza por el titulo: solo lo que sigue
    var cola = det.slice(tit.length).replace(/^[\s.:,;·-]+/, "");
    det = cola ? mayus1(cola) : "";
  }
  return { titulo: tit, detalle: det, dur: Math.max(0, p.duracion_s | 0),
           hasta: Math.max(0, p.hasta_s | 0), est: segDe(p.estimado), avisos: avisosOk(p.avisos),
           usa: (p.usa || []).filter(function (i) { return i >= 0 && i < n; }), consejo: p.consejo || "", pista: p.pista || "",
           grupo: p.grupo || "", tipo: p.tipo || "paso", checklist: (p.checklist || []).slice(),
           secciones: p.secciones && p.secciones.length ? p.secciones : null, auto: !!p.auto, mientras: p.mientras || "",
           soloEsto: false, tags: tags, vozIni: "", vozFin: "", reposo: 0, relojNom: p.reloj || "" };
}
// el nombre corto del reloj: "Boniato solo, con un chorrito de AOVE" -> "Boniato solo"
function nombreReloj(P, ings) {
  if (P.relojNom) return P.relojNom;
  var t = String(P.titulo || "").replace(/^\s*\d+(?:[.,]\d+)?\s*(?:[-–]\s*\d+\s*)?(?:s|seg|segundos|min|minutos|h|horas)\b\.?\s*/i, "").trim();
  if (t.length > 24) t = t.split(/[,.;:(]|\s+(?:y|con|para|mientras)\s+/)[0].trim();
  t = t.replace(/^(?:el|la|los|las|un|una)\s+/i, "");
  if (t.length > 24) {
    var w = t.split(" "), o = "";
    for (var j = 0; j < w.length && (o + " " + w[j]).trim().length <= 24; j++) o = (o + " " + w[j]).trim();
    t = o;
  }
  if (t.length < 3) {
    var I = (P.usa || []).map(function (i) { return ings[i]; }).filter(function (x) { return x && !x.basico; })[0];
    t = I ? I.nombre : "";
  }
  return mayus1(t) || (P.auto ? "Antes de empezar" : "Paso " + (P.k + 1));
}
function normaliza(q) {
  q = q || {};
  var J = q.receta || null, R = q.comida || null, G = q.guia || null;
  var M0 = { id: idDe(q), titulo: "", J: J, R: R, G: G, ings: [], pasos: [], auto0: false, acento: null, reparto: null };
  if (J) {
    M0.titulo = (R && R.titulo) || (J.meta && J.meta.titulo) || "Receta";
    M0.acento = (J.tema && J.tema.acento_oscuro) || null;
    M0.reparto = (J.meta && J.meta.reparto) || null;
    M0.ings = (J.ingredientes || []).map(ingJ);
    M0.pasos = (J.pasos || []).map(function (p) { return pasoJ(p, M0.ings.length); });
  } else if (G) {
    M0.titulo = String(G.titulo || "Rutina");
    M0.pasos = (q.pasos || []).map(function (p) { return pasoR(p, 0); });
  } else if (R) {
    M0.titulo = String(R.titulo || "Comida");
    M0.ings = (R.ingredientes || []).map(ingR);
    M0.pasos = (q.pasos || R.pasos || []).map(function (p) { return pasoR(p, M0.ings.length); });
  }
  M0.pasos.forEach(function (P, k) { P.k = k; });
  M0.pasos.forEach(function (P) { P.reloj = nombreReloj(P, M0.ings); });
  M0.auto0 = !!(M0.pasos[0] && M0.pasos[0].auto);
  return M0;
}
// numero de paso para pantalla: con "Antes de empezar" delante, ese es el 0
function numDe(M0, k) { return M0.auto0 ? k : k + 1; }
function totalNum(M0) { return M0.auto0 ? M0.pasos.length - 1 : M0.pasos.length; }
function nomPaso(M0, k) { var P = M0.pasos[k]; return P && P.auto ? "Antes de empezar" : "Paso " + numDe(M0, k); }
// lo que se tarda en un paso que aun no tiene reloj
function estPaso(P) { return P.dur || P.est || 60; }

/* -------------------------------- estado --------------------------------
   S = {v:2, actual, hechos:{k:1}, saltados:{k:1}, checks:{clave:1}, timers:[T], t, inicio}
   T = {id, paso, nombre, pasoTxt, dur, fin (ms) | null, pausa (s que quedan) | null,
        avisos, avisados:[a_los_s], finAvisado, callado, vozFin}
   checks: "i<idx>" ingrediente (chips, hoja y lo de "Ten a mano"), "c<paso>-<j>" checklist,
   "s<paso>-<sec>-<item>" lo de "Antes de empezar" sin ingrediente.                        */
function nuevoEstado(ahora) { return { v: 2, actual: 0, hechos: {}, saltados: {}, checks: {}, timers: [], t: ahora || 0, inicio: ahora || 0 }; }
function copia(x) { return JSON.parse(JSON.stringify(x)); }
function restante(T, ahora) { return T.pausa != null ? T.pausa : (T.fin - ahora) / 1000; }
function relojDe(S, k) { for (var j = 0; j < S.timers.length; j++) if (S.timers[j].paso === k) return S.timers[j]; return null; }
function relojId(S, id) { for (var j = 0; j < S.timers.length; j++) if (S.timers[j].id === id) return S.timers[j]; return null; }
function empieza(S, P, ahora, M0) {
  var T = relojDe(S, P.k); if (T) return T;
  var d = P.dur || P.reposo; if (!d) return null;
  T = { id: "t" + P.k + "-" + Math.round(ahora).toString(36), paso: P.k, nombre: P.dur ? P.reloj : "Reposo",
        pasoTxt: M0 ? nomPaso(M0, P.k) : "Paso " + (P.k + 1), dur: d, fin: ahora + d * 1000, pausa: null,
        avisos: P.dur ? copia(P.avisos || []) : [], avisados: [], finAvisado: false, callado: false, vozFin: P.dur ? P.vozFin || "" : "" };
  S.timers.push(T); S.t = ahora;
  return T;
}
// pausa o sigue; uno que ya ha sonado no se pausa: se calla
function pausa(S, id, ahora) {
  var T = relojId(S, id); if (!T) return null;
  if (T.pausa != null) { T.fin = ahora + T.pausa * 1000; T.pausa = null; }
  else if (restante(T, ahora) > 0) { T.pausa = restante(T, ahora); T.fin = null; }
  else T.callado = true;
  S.t = ahora; return T;
}
// +1 min: lo que quede (o 0 si ya ha sonado) mas 60 s; vuelve a sonar al acabar
function masUno(S, id, ahora, s) {
  var T = relojId(S, id); if (!T) return null;
  var r = restante(T, ahora), pasado = T.dur - r, nr = Math.max(r, 0) + (s || 60);
  T.dur = pasado + nr;
  if (T.pausa != null) T.pausa = nr; else T.fin = ahora + nr * 1000;
  T.finAvisado = false; T.callado = false; S.t = ahora;
  return T;
}
function para(S, id, ahora) {
  var n = S.timers.length;
  S.timers = S.timers.filter(function (T) { return T.id !== id; });
  if (ahora) S.t = ahora;
  return S.timers.length < n;
}
function sonando(T, ahora) { return T.pausa == null && T.finAvisado && !T.callado && restante(T, ahora) <= 0; }
/* Lo que toca avisar ahora: [{tipo: "aviso"|"fin", T, aviso?, tarde (s)}]. Marca lo
   avisado. Con varios avisos perdidos (pantalla apagada) solo el ultimo; si el reloj
   ya acabo, solo el final.                                                          */
function revisa(S, ahora) {
  var ev = [];
  S.timers.forEach(function (T) {
    if (T.pausa != null) return;
    var r = restante(T, ahora), pasado = T.dur - r;
    var pend = (T.avisos || []).filter(function (a) { return pasado >= a.a_los_s && T.avisados.indexOf(a.a_los_s) < 0; });
    pend.forEach(function (a) { T.avisados.push(a.a_los_s); });
    if (r <= 0) {
      if (!T.finAvisado) { T.finAvisado = true; ev.push({ tipo: "fin", T: T, tarde: -r }); }
      return;
    }
    if (pend.length) { var a = pend[pend.length - 1]; ev.push({ tipo: "aviso", T: T, aviso: a, tarde: pasado - a.a_los_s }); }
  });
  return ev;
}
// el siguiente paso sin hacer (ni saltado) despues de "desde"; si no hay, uno de antes; -1 = fin
function siguiente(S, n, desde) {
  var k;
  for (k = desde + 1; k < n; k++) if (!S.hechos[k] && !S.saltados[k]) return k;
  for (k = 0; k < desde; k++) if (!S.hechos[k] && !S.saltados[k]) return k;
  return -1;
}
// Hecho: marca el paso, quita su reloj si ya sono (si sigue corriendo, se queda) y pasa al siguiente
function hecho(S, n, k, ahora) {
  S.hechos[k] = 1; delete S.saltados[k];
  S.timers = S.timers.filter(function (T) { return !(T.paso === k && restante(T, ahora) <= 0); });
  var s = siguiente(S, n, k);
  if (s >= 0) S.actual = s;
  S.t = ahora;
  return s;
}
function anterior(S, ahora) { if (S.actual > 0) { S.actual--; S.t = ahora; } return S.actual; }
/* "Seguir desde aqui": k pasa a ser el paso actual. Hacia delante, el que se deja y los
   de en medio sin hacer quedan saltados. -> {saltados: [k], antes: copia para deshacer} */
function seguirDesde(S, k, ahora) {
  var antes = { actual: S.actual, hechos: copia(S.hechos), saltados: copia(S.saltados) }, salt = [];
  if (k > S.actual) for (var j = S.actual; j < k; j++) if (!S.hechos[j] && !S.saltados[j]) { S.saltados[j] = 1; salt.push(j); }
  delete S.saltados[k];
  S.actual = k; S.t = ahora;
  return { saltados: salt, antes: antes };
}
function deshacer(S, antes, ahora) {
  if (!antes) return;
  if (antes.v === 2) { Object.keys(antes).forEach(function (x) { S[x] = antes[x]; }); }
  else { S.actual = antes.actual; S.hechos = antes.hechos; S.saltados = antes.saltados; }
  S.t = ahora;
}
// Empezar de 0: todo fuera (relojes tambien). Devuelve la copia para deshacer
function reinicia(S, ahora) {
  var antes = copia(S), n = nuevoEstado(ahora);
  Object.keys(S).forEach(function (x) { delete S[x]; });
  Object.keys(n).forEach(function (x) { S[x] = n[x]; });
  return antes;
}
// lo que queda: el reloj de cada paso por hacer (o lo que dura) y, si va mas lejos, un reloj de uno hecho
function quedan(S, pasos, ahora) {
  var tot = 0, otros = 0;
  pasos.forEach(function (P, k) {
    var T = relojDe(S, k);
    if (S.hechos[k] || S.saltados[k]) { if (T) otros = Math.max(otros, restante(T, ahora)); return; }
    tot += T ? Math.max(restante(T, ahora), 0) : estPaso(P);
  });
  return Math.round(Math.max(tot, otros, 0));
}
function cuenta(o) { return Object.keys(o || {}).filter(function (k) { return o[k]; }).length; }
function progresoDe(S, pasos, ahora) {
  var n = pasos.length, h = cuenta(S.hechos), q = quedan(S, pasos, ahora);
  return { actual: S.actual, total: n, hechos: h, saltados: cuenta(S.saltados), pct: n ? Math.round(h / n * 100) : 0, quedan_s: q, acaba: ahora + q * 1000 };
}
function hayProgreso(S) { return !!(S && (S.actual > 0 || cuenta(S.hechos) || S.timers.length || cuenta(S.checks))); }
/* Al abrir: "nuevo" (de 0, sin preguntar), "retoma" (preguntar: Seguir / Empezar de 0)
   o "sigue" (se cerro hace nada, o hay un reloj vivo: se sigue sin preguntar).        */
function decide(S, M0, ahora) {
  if (!S || S.terminado) return "nuevo";
  // un reloj vivo: corriendo (o acabado hace menos de 30 min), o en pausa de esta misma sesion
  var vivo = (S.timers || []).some(function (T) { return T.pausa != null ? !!S.t && ahora - S.t < SEIS_H : T.fin > ahora - 30 * 60e3; });
  if (!vivo && !S.migrado && (!S.t || ahora - S.t > SEIS_H)) return "nuevo";
  if (!vivo && M0 && M0.R && M0.R.fecha && M0.R.fecha < isoDia(ahora)) return "nuevo";
  if (!hayProgreso(S)) return "nuevo";
  if (vivo || (!S.migrado && ahora - S.t < GRACIA)) return "sigue";
  return "retoma";
}
/* El estado viejo {paso, fin, pausa, avisados, checks} -> el nuevo. Las comidas del
   calendario no tenian "Antes de empezar": su paso k es ahora el k+1.               */
function migra(viejo, M0, ahora) {
  if (!viejo || typeof viejo.paso !== "number" || !M0.pasos.length) return null;
  var n = M0.pasos.length, k = (viejo.paso | 0) + (M0.auto0 && /^c:/.test(M0.id) ? 1 : 0);
  k = Math.max(0, Math.min(k, n - 1));
  var S = nuevoEstado(0), P = M0.pasos[k];
  for (var j = 0; j < k; j++) S.hechos[j] = 1;
  S.actual = k; S.migrado = true;
  Object.keys(viejo.checks || {}).forEach(function (c) { var m = c.match(/^(\d+)-(\d+)$/); if (m && viejo.checks[c]) S.checks["c" + m[1] + "-" + m[2]] = 1; });
  var d = P.dur;
  if (d && (viejo.fin || (viejo.pausa != null && viejo.pausa < d))) {
    var T = empieza(S, P, ahora, M0);
    if (viejo.fin && viejo.pausa == null) { T.fin = viejo.fin; S.t = viejo.fin - d * 1000; S.migrado = false; }
    else { T.fin = null; T.pausa = Math.max(0, viejo.pausa); }
    (viejo.avisados || []).forEach(function (a) {
      var m = String(a).match(/^(\d+):(\w+)$/); if (!m || +m[1] !== viejo.paso) return;
      if (m[2] === "fin") { T.finAvisado = true; T.callado = true; } else T.avisados.push(+m[2]);
    });
  }
  if (S.migrado) S.t = 0;
  return S;
}

/* ----------------------------- lo gastado -----------------------------
   J: los ingredientes juntos (como antes). R: cada ingrediente que no es basico ni
   lo hizo antes el plan, con su cantidad, uno por linea. -> [{txt, on}]         */
function gastoTxt(I) {
  var nom = I.nombre ? minus1(I.nombre) : I.base;
  if (!I.c) return mayus1(nom);
  if (!I.c.ud || I.c.ud === "ud") return cantTxt(I.c) + " " + (I.c.n > 1 ? plural(nom) : nom);
  return cantTxt(I.c) + " de " + nom;
}
function gastadoDe(M0) {
  if (M0.G) return [];
  if (M0.J) return juntaIngs(M0.J.ingredientes).map(function (t) { return { txt: t, on: true }; });
  return M0.ings.filter(function (I) { return !I.basico && !I.hecho && I.nombre; })
    .map(function (I) { return { txt: gastoTxt(I), on: !I.opcional }; });
}
// donde se usa por primera vez cada ingrediente (para agruparlos y el "paso 5")
function primerUso(M0, i) {
  var k;
  for (k = 0; k < M0.pasos.length; k++) if (!M0.pasos[k].auto && M0.pasos[k].usa.indexOf(i) >= 0) return k;
  for (k = 0; k < M0.pasos.length; k++) {
    if (M0.pasos[k].auto && M0.pasos[k].usa.indexOf(i) >= 0) return k;
    if ((M0.pasos[k].secciones || []).some(function (s) { return (s.items || []).some(function (it) { return it.ing === i; }); })) return k;
  }
  return -1;
}
// grupos de la hoja Ingredientes: los de la receta si tiene; si no, por el paso donde se usan
function gruposIngs(M0) {
  var G = [], visto = {}, usados;
  function mete(titulo, items, k) {
    items = items.filter(function (i) { return !visto[i] && M0.ings[i]; }); items.forEach(function (i) { visto[i] = 1; });
    if (items.length) G.push(k == null ? { titulo: titulo, items: items } : { titulo: titulo, items: items, k: k });
  }
  if (M0.J && M0.ings.some(function (I) { return I.grupo; })) {
    var por = {}, orden = [];
    M0.ings.forEach(function (I) { var g = I.grupo || "Otros"; if (!por[g]) { por[g] = []; orden.push(g); } por[g].push(I.i); });
    orden.forEach(function (g) { mete(g, por[g]); });
  } else if (M0.R && (M0.R.grupos || []).filter(function (g) { return g && g.items && g.items.length; }).length >= 2) {
    M0.R.grupos.forEach(function (g) { if (g && g.items) mete(g.titulo || "Ingredientes", g.items); });
  } else {
    usados = M0.pasos.map(function () { return []; });
    M0.ings.forEach(function (I) { var k = primerUso(M0, I.i); if (k >= 0) usados[k].push(I.i); });
    usados.forEach(function (L, k) { mete(nomPaso(M0, k), L, k); });
  }
  mete(G.length ? "Sin paso" : "Ingredientes", M0.ings.map(function (I) { return I.i; }));
  return G;
}

/* ------------------------------- relojes, para el aviso nativo -------------------------------
   avisosDe(S) -> [{id, cuando, titulo, texto}]: lo que cocina.js puede juntar con
   avisosComida para Nativo.avisos (que cambia la lista entera).                           */
function avisosDe(S, titulo) {
  return (S && S.timers || []).filter(function (T) { return T.pausa == null && T.fin && !T.finAvisado; }).map(function (T) {
    return { id: "reloj:" + T.id, cuando: T.fin, titulo: T.nombre + ": tiempo", texto: (T.pasoTxt || "") + (titulo ? " · " + titulo : "") };
  });
}

var API = {
  // puras
  idDe: idDe, normaliza: normaliza, numDe: numDe, totalNum: totalNum, nomPaso: nomPaso, nombreReloj: nombreReloj,
  nuevoEstado: nuevoEstado, restante: restante, relojDe: relojDe, empieza: empieza, pausa: pausa, masUno: masUno, para: para,
  sonando: sonando, revisa: revisa, siguiente: siguiente, hecho: hecho, anterior: anterior, seguirDesde: seguirDesde,
  deshacer: deshacer, reinicia: reinicia, quedan: quedan, progresoDe: progresoDe, decide: decide, migra: migra,
  gastadoDe: gastadoDe, juntaIngs: juntaIngs, gruposIngs: gruposIngs, primerUso: primerUso, avisosDe: avisosDe,
  cantidad: cantidad, cantTxt: cantTxt, cantVoz: cantVoz, fmt: fmt, fmtMin: fmtMin, segDe: segDe,
  PREF: PREF, PREF_VIEJO: PREF_VIEJO,
  // pantalla (en node no hacen nada)
  abre: function () { return false; }, atras: function () { return false; }, abierto: function () { return false; },
  progreso: function () { return null; }, relojes: function () { return []; }
};

/* ============================ pantalla (navegador) ============================ */
function lee(k) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? null : v; } catch (e) { return null; } }
function escribe(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
// el estado guardado de q, ya pasado al formato nuevo (sin escribir nada)
function estadoGuardado(M0, ahora) {
  var S = lee(PREF + M0.id);
  if (S && S.v === 2) return S;
  return migra(lee(PREF_VIEJO + M0.id), M0, ahora);
}
// para la tarjeta de Semana: "Cocinando · paso 3 de 10"
API.progreso = function (q, ahora) {
  ahora = ahora || Date.now();
  var M0 = normaliza(q); if (!M0.pasos.length) return null;
  var S = (VIVOS[M0.id] && VIVOS[M0.id].S) || estadoGuardado(M0, ahora);
  if (!S || S.terminado || decide(S, M0, ahora) === "nuevo") return null;
  var k = Math.min(S.actual, M0.pasos.length - 1);
  return { actual: k, total: M0.pasos.length, hechos: cuenta(S.hechos), t: S.t || null,
           num: numDe(M0, k), de: totalNum(M0), texto: M0.pasos[k].auto ? "Antes de empezar" : "Paso " + numDe(M0, k) + " de " + totalNum(M0),
           relojes: S.timers.map(function (T) { return { nombre: T.nombre, paso: T.paso, restante_s: Math.round(restante(T, ahora)), pausa: T.pausa != null }; }) };
};

var V = null;            // el modo abierto
var VIVOS = {};          // id -> {S, M0, q, ctx}: estados con relojes, para avisar con el modo cerrado
var TICK = null, TICK_MS = 0, cerrojo = null, ac = null, ALARMA = {};

if (typeof document !== "undefined") (function () {
var ICO = {
  cerrar: '<path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/>',
  tick: '<path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/>',
  play: '<path d="M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27Z"/>',
  pausa: '<path d="M216,48V208a16,16,0,0,1-16,16H160a16,16,0,0,1-16-16V48a16,16,0,0,1,16-16h40A16,16,0,0,1,216,48ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Z"/>',
  parar: '<path d="M216,56V200a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40H200A16,16,0,0,1,216,56Z"/>',
  reloj: '<path d="M128,40a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,40Zm0,176a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,216ZM173.66,90.34a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32-11.32l40-40A8,8,0,0,1,173.66,90.34ZM96,16a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H104A8,8,0,0,1,96,16Z"/>',
  der: '<path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"/>',
  izq: '<path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"/>',
  ojo: '<path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"/>'
};
function svg(k) { return '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' + ICO[k] + '</svg>'; }
function negritas(t) { return esc(t).replace(/(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+)?\s*(?:min|minutos|s|seg|segundos|h|g|ml|cm|°C|ºC)(?![a-záéíóúñ]))/g, "<b>$1</b>"); }

var SA_T = "var(--safe-area-inset-top,env(safe-area-inset-top,0px))", SA_B = "var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px))";
var R0 = "#cocPaso ";
var CSS =
  "#cocPaso{position:fixed;inset:0;z-index:90;background:#101113;color:#f4f5f7;display:flex;flex-direction:column;overflow:hidden;" +
  "font-family:Manrope,-apple-system,'Segoe UI',Roboto,sans-serif;font-variant-numeric:tabular-nums;-webkit-text-size-adjust:100%;" +
  "--ca:#f08a4b;--cm:#4f8ff7;--mu:#9aa0a8;--ln:rgba(255,255,255,.09);--sf:rgba(255,255,255,.06);--sf2:rgba(255,255,255,.11);" +
  "padding:calc(4px + " + SA_T + ") 16px calc(10px + " + SA_B + ")}" +
  "#cocPaso[hidden]{display:none}" +
  R0 + "*{box-sizing:border-box}" +
  R0 + "svg{display:block;background:none;border-radius:0;width:20px;height:20px;flex:none}" +
  R0 + "button{flex:none;margin:0;padding:0;border:0;border-radius:0;background:none;color:inherit;font:inherit;text-align:inherit;letter-spacing:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
  R0 + "button:disabled{opacity:.3;cursor:default}" +
  R0 + "h2," + R0 + "h3," + R0 + "h4," + R0 + "p," + R0 + "ul{margin:0;padding:0;color:inherit;text-transform:none;text-align:left;letter-spacing:normal}" +
  R0 + "ul{list-style:none}" + R0 + "em{font-style:normal}" +
  /* arriba */
  R0 + ".cpTop{display:flex;align-items:center;gap:6px;height:56px;flex:0 0 auto;margin:0 -4px 0 -12px}" +
  R0 + ".cpX{width:48px;height:48px;display:flex;align-items:center;justify-content:center;border-radius:14px}" +
  R0 + ".cpX svg{width:24px;height:24px}" +
  R0 + ".cpTit{flex:1;min-width:0;font-size:15px;font-weight:700;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
  R0 + ".cpBtn{height:48px;padding:0 4px;display:flex;align-items:center}" +
  R0 + ".cpBtn span{height:40px;padding:0 14px;border-radius:20px;background:var(--sf2);font-size:15px;font-weight:800;display:flex;align-items:center}" +
  /* progreso */
  R0 + ".cpCab{flex:0 0 auto}" +
  R0 + ".cpLin{display:flex;justify-content:space-between;align-items:baseline;gap:4px 10px;flex-wrap:wrap;font-size:14px;font-weight:800}" +
  R0 + ".cpLin b{font-size:13px;letter-spacing:.07em;text-transform:uppercase}" +
  R0 + ".cpQueda{color:var(--mu);font-weight:700}" + R0 + ".cpQueda b{color:#f4f5f7;font-size:14px;letter-spacing:0;text-transform:none}" +
  R0 + ".cpSegs{display:flex;gap:4px;height:44px;align-items:stretch}" +
  R0 + ".cpSeg{flex:1 1 0;min-width:0;height:44px;position:relative;display:flex;align-items:center}" +
  R0 + ".cpSeg i{display:block;width:100%;height:6px;border-radius:3px;background:rgba(255,255,255,.14)}" +
  R0 + ".cpSeg.ya i{background:rgba(255,255,255,.45)}" + R0 + ".cpSeg.ahora i{background:#f4f5f7}" +
  R0 + ".cpSeg.salt i{background:none;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.4)}" +
  R0 + ".cpSeg.visto i{box-shadow:0 0 0 2px #101113,0 0 0 4px var(--cm)}" +
  R0 + ".cpSeg em{position:absolute;left:50%;top:8px;width:7px;height:7px;margin-left:-3.5px;border-radius:50%;background:var(--ca)}" +
  /* relojes */
  R0 + ".cpTira{display:flex;gap:8px;overflow-x:auto;flex:0 0 auto;margin:0 -16px;padding:0 16px 8px;scrollbar-width:none}" +
  R0 + ".cpTira::-webkit-scrollbar{display:none}" +
  R0 + ".cpChip{height:52px;min-width:84px;max-width:168px;border-radius:16px;padding:5px 14px;background:var(--sf2);display:flex;flex-direction:column;align-items:flex-start;justify-content:center;text-align:left}" +
  R0 + ".cpChip span{max-width:100%;font-size:13px;font-weight:700;line-height:1.2;color:#c9cdd3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
  R0 + ".cpChip b{display:flex;align-items:center;gap:5px;font-size:19px;font-weight:800;line-height:1.15}" +
  R0 + ".cpChip b svg{width:14px;height:14px}" +
  R0 + ".cpChip.poco{box-shadow:inset 0 0 0 2px var(--ca)}" + R0 + ".cpChip.poco b{color:var(--ca)}" +
  R0 + ".cpChip.fin{background:var(--ca);color:#140b04;animation:cpLate 1s ease-in-out infinite}" + R0 + ".cpChip.fin span{color:#140b04}" + R0 + ".cpChip.callado{animation:none}" +
  R0 + ".cpChip.pausa{background:var(--sf)}" + R0 + ".cpChip.pausa b{color:var(--mu)}" +
  R0 + ".cpChip.aqui{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35)}" +
  /* mirando otro paso */
  R0 + ".cpMira{flex:0 0 auto;display:flex;align-items:center;gap:8px;min-height:52px;background:var(--cm);color:#06142e;border-radius:16px;padding:2px 2px 2px 12px;margin-bottom:8px}" +
  R0 + ".cpMira svg{width:20px;height:20px}" +
  R0 + ".cpMira span{flex:1;min-width:0;font-size:14px;font-weight:800;line-height:1.25}" +
  R0 + ".cpMira span b{display:block;font-size:12px;letter-spacing:.07em;text-transform:uppercase}" +
  R0 + ".cpMira button{height:48px;padding:0 16px;border-radius:14px;background:rgba(6,20,46,.16);font-size:16px;font-weight:800}" +
  /* el paso */
  R0 + ".cpCuerpo{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;touch-action:pan-y;overscroll-behavior:contain;padding:4px 0 20px}" +
  R0 + ".cpCuerpo.mirando{box-shadow:inset 0 0 0 2px var(--cm);border-radius:20px;margin:0 -12px;padding:12px 12px 20px}" +
  R0 + ".cpEtq{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px}" +
  R0 + ".cpEtq em{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);margin-right:2px}" +
  R0 + ".cpEtq span{font-size:13px;font-weight:800;background:var(--sf2);padding:4px 10px;border-radius:99px}" +
  R0 + ".cpCuerpo h2{font-size:30px;line-height:1.12;font-weight:800;letter-spacing:-.02em;margin:0 0 8px;overflow-wrap:break-word}" +
  R0 + ".cpCuerpo h2.largo{font-size:25px;line-height:1.18}" +
  R0 + ".cpDet{font-size:19px;line-height:1.5;font-weight:600;color:#dfe2e6;overflow-wrap:break-word}" +
  R0 + ".cpDet b{color:#fff;font-weight:800}" +
  R0 + ".cpPista{display:flex;gap:10px;align-items:flex-start;margin-top:12px;font-size:17px;line-height:1.4;font-weight:700}" +
  R0 + ".cpPista svg{margin-top:1px;color:var(--ca)}" +
  R0 + ".cpUsa{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}" +
  R0 + ".cpUsa li{max-width:100%}" +
  R0 + ".cpIng{min-height:48px;max-width:100%;display:flex;align-items:center;gap:10px;padding:8px 14px 8px 10px;border-radius:14px;background:var(--sf2);font-size:17px;font-weight:600;line-height:1.25;text-align:left}" +
  R0 + ".cpIng span{min-width:0;overflow-wrap:break-word}" +
  R0 + ".cpIng b{font-weight:800}" + R0 + ".cpIng em{color:var(--mu)}" +
  R0 + ".cpIng small{display:block;font-size:14px;font-weight:600;color:var(--mu);margin-top:1px}" +
  R0 + ".cpCaja{width:24px;height:24px;border-radius:7px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.32);display:flex;align-items:center;justify-content:center;flex:none}" +
  R0 + ".cpCaja svg{width:15px;height:15px}" +
  R0 + "[aria-pressed=true] .cpCaja{background:#f4f5f7;color:#101113;box-shadow:none}" +
  R0 + ".cpIng[aria-pressed=true]{background:var(--sf)}" +
  R0 + "[aria-pressed=true] .cpTx{color:var(--mu);text-decoration:line-through;text-decoration-thickness:1.5px}" +
  /* reloj del paso */
  R0 + ".cpReloj{margin-top:16px;background:var(--sf);border-radius:20px;padding:14px}" +
  R0 + ".cpEmpieza{width:100%;height:56px;border-radius:28px;background:var(--ca);color:#140b04;font-size:19px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:10px}" +
  R0 + ".cpEmpieza.sec{background:var(--sf2);color:#f4f5f7;font-size:17px}" +
  R0 + ".cpDig{font-size:64px;line-height:1;font-weight:800;letter-spacing:-.03em}" +
  R0 + ".cpReloj.fin{box-shadow:inset 0 0 0 2px var(--ca)}" + R0 + ".cpReloj.fin .cpDig{color:var(--ca)}" +
  R0 + ".cpReloj.pausa .cpDig{color:var(--mu)}" +
  R0 + ".cpReloj.quieto .cpDig{font-size:44px;color:var(--mu)}" +
  R0 + ".cpBarra{height:8px;border-radius:4px;background:rgba(255,255,255,.12);margin-top:12px;overflow:hidden}" +
  R0 + ".cpBarra i{display:block;height:100%;background:var(--ca);border-radius:4px}" +
  R0 + ".cpEst{font-size:15px;font-weight:700;color:var(--mu);margin-top:8px;line-height:1.4}" +
  R0 + ".cpReloj.fin .cpEst{color:var(--ca)}" +
  R0 + ".cpDos{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}" +
  R0 + ".cpDos button{height:52px;border-radius:26px;background:var(--sf2);font-size:17px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px}" +
  R0 + ".cpDos svg{width:18px;height:18px}" +
  R0 + ".cpAvisos{margin-top:10px}" +
  R0 + ".cpAvisos li{display:grid;grid-template-columns:60px 1fr;gap:8px;font-size:17px;font-weight:600;padding:9px 0;border-top:1px solid var(--ln);color:#dfe2e6;line-height:1.35}" +
  R0 + ".cpAvisos li b{color:var(--mu);font-weight:800}" +
  R0 + ".cpAvisos li.ya{color:#6f757d;text-decoration:line-through}" + R0 + ".cpAvisos li.sig,#cocPaso .cpAvisos li.sig b{color:#fff}" +
  /* listas para marcar */
  R0 + ".cpChecks{margin-top:10px}" +
  R0 + ".cpCheck{width:100%;display:grid;grid-template-columns:24px 1fr;gap:12px;align-items:center;min-height:52px;padding:9px 0;border-top:1px solid var(--ln);font-size:17px;font-weight:600;line-height:1.35;text-align:left}" +
  R0 + ".cpChecks li:first-child .cpCheck{border-top:0}" +
  R0 + ".cpCheck .cpTx{min-width:0;overflow-wrap:break-word}" + R0 + ".cpCheck b{font-weight:800}" +
  R0 + ".cpCheck small{display:block;font-size:15px;font-weight:600;color:var(--mu);margin-top:1px}" +
  R0 + ".cpGasto[aria-pressed=true] .cpTx{color:#f4f5f7;text-decoration:none}" + R0 + ".cpGasto[aria-pressed=false] .cpTx{color:var(--mu);text-decoration:line-through}" +
  R0 + ".cpSec{margin-top:18px;background:var(--sf);border-radius:18px;padding:12px 14px 4px}" +
  R0 + ".cpSec h3{display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}" +
  R0 + ".cpSec h3 small{font-size:13px;letter-spacing:0}" +
  R0 + ".cpSec .cpChecks{margin-top:4px}" +
  R0 + ".cpPar{margin-top:14px;border-radius:16px;padding:12px 14px;background:var(--sf)}" +
  R0 + ".cpPar h3{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);margin-bottom:4px}" +
  R0 + ".cpPar p{font-size:17px;line-height:1.5;font-weight:600}" +
  R0 + ".cpPar.tip{box-shadow:inset 3px 0 0 var(--ca)}" +
  R0 + ".cpLuego{width:100%;margin-top:18px;min-height:56px;display:flex;align-items:center;gap:10px;padding:10px 0 0;border-top:1px solid var(--ln);text-align:left}" +
  R0 + ".cpLuego small{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);flex:none}" +
  R0 + ".cpLuego span{flex:1;min-width:0;font-size:17px;font-weight:700;line-height:1.35;color:#dfe2e6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}" +
  R0 + ".cpLuego svg{color:var(--mu)}" +
  /* abajo */
  R0 + ".cpDock{position:relative;flex:0 0 auto;display:grid;grid-template-columns:3fr 7fr;gap:8px;align-items:center;padding-top:10px}" +
  R0 + ".cpAnt{height:56px;border-radius:28px;background:var(--sf2);font-size:16px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:4px;padding:0 8px;line-height:1.15;text-align:center}" +
  R0 + ".cpAnt svg{width:18px;height:18px}" +
  R0 + ".cpHecho{height:64px;border-radius:32px;background:var(--ca);color:#140b04;font-size:20px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 12px;line-height:1.15;text-align:center}" +
  R0 + ".cpHecho svg{width:20px;height:20px}" +
  R0 + ".cpHecho.tenue{background:var(--sf2);color:#f4f5f7}" +
  R0 + ".cpHecho.suena{animation:cpLate 1s ease-in-out infinite}" +
  R0 + ".cpDock.mira," + R0 + ".cpDock.retoma{grid-template-columns:2fr 3fr}" + R0 + ".cpDock.mira .cpAnt{font-size:15px}" +
  R0 + ".cpHecho.azul{background:var(--cm);color:#06142e;font-size:18px}" +
  R0 + ".cpDock.pila{grid-template-columns:1fr}" + R0 + ".cpDock.pila .cpAnt{order:2}" +
  "@keyframes cpLate{50%{filter:brightness(1.22);transform:scale(1.015)}}" +
  "@keyframes cpEntra{from{transform:translateY(-12px);opacity:0}}" +
  "@media (prefers-reduced-motion:reduce){" + R0 + ".cpHecho.suena," + R0 + ".cpChip.fin{animation:none;outline:3px solid #fff}}" +
  /* alarma, aviso corto */
  R0 + ".cpAlarma,#cocPasoAviso{position:absolute;left:8px;right:8px;top:calc(6px + " + SA_T + ");z-index:8;background:var(--ca);color:#140b04;border-radius:20px;padding:12px;box-shadow:0 12px 32px rgba(0,0,0,.55);animation:cpEntra .2s ease-out}" +
  R0 + ".cpAlarma p,#cocPasoAviso p{display:flex;align-items:center;gap:8px;font-size:19px;font-weight:800;line-height:1.2;margin:0}" +
  R0 + ".cpAlarma p span,#cocPasoAviso p span{flex:1;min-width:0}" +
  R0 + ".cpAlarma p small,#cocPasoAviso p small{display:block;font-size:14px;font-weight:700;opacity:.75}" +
  R0 + ".cpAlarma p b,#cocPasoAviso p b{font-size:22px;font-weight:800}" +
  R0 + ".cpAlarma div,#cocPasoAviso div{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px}" +
  R0 + ".cpAlarma button,#cocPasoAviso button{height:52px;border-radius:26px;background:rgba(20,11,4,.16);font-size:16px;font-weight:800;text-align:center}" +
  R0 + ".cpAlarma button:first-child,#cocPasoAviso button:first-child{background:#140b04;color:#fff}" +
  R0 + ".cpToast{position:absolute;left:0;right:0;bottom:calc(100% + 8px);z-index:6;background:#2b2e34;color:#f4f5f7;border-radius:16px;min-height:56px;padding:6px 6px 6px 16px;display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;line-height:1.3;box-shadow:0 10px 28px rgba(0,0,0,.5);animation:cpEntra .2s ease-out}" +
  R0 + ".cpToast span{flex:1;min-width:0}" +
  R0 + ".cpToast.aviso{background:var(--ca);color:#140b04;font-size:18px;font-weight:800}" + R0 + ".cpToast.aviso svg{width:22px;height:22px}" +
  R0 + ".cpToast button{height:48px;padding:0 14px;border-radius:12px;color:var(--ca);font-size:16px;font-weight:800}" +
  /* hojas */
  R0 + ".cpVelo{position:absolute;inset:0;z-index:9;background:rgba(0,0,0,.6)}" +
  R0 + ".cpHoja{position:absolute;left:0;right:0;bottom:0;height:88%;z-index:10;background:#1a1c20;border-radius:24px 24px 0 0;display:flex;flex-direction:column;padding:4px 16px calc(12px + " + SA_B + ");animation:cpSube .2s ease-out}" +
  "@keyframes cpSube{from{transform:translateY(32px)}}" +
  R0 + ".cpHoja.chica{height:auto}" +
  R0 + ".cpHojaCab{display:flex;align-items:center;gap:8px;min-height:64px;flex:0 0 auto;margin-right:-8px}" +
  R0 + ".cpHojaCab div{flex:1;min-width:0}" +
  R0 + ".cpHojaCab h3{font-size:22px;font-weight:800;line-height:1.2}" +
  R0 + ".cpHojaCab small{display:block;font-size:14px;font-weight:700;color:var(--mu);margin-top:2px}" +
  R0 + ".cpHojaCuerpo{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain}" +
  R0 + ".cpFilaP{width:100%;min-height:60px;display:grid;grid-template-columns:26px 22px 1fr auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--ln);text-align:left}" +
  R0 + ".cpFilaP i{width:24px;height:24px;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;color:#101113}" +
  R0 + ".cpFilaP i svg{width:14px;height:14px}" +
  R0 + ".cpFilaP.ya i{background:rgba(255,255,255,.5);box-shadow:none}" +
  R0 + ".cpFilaP.ahora i{box-shadow:inset 0 0 0 2px #f4f5f7}" + R0 + ".cpFilaP.ahora i::after{content:'';width:12px;height:12px;border-radius:50%;background:#f4f5f7}" +
  R0 + ".cpFilaP.salt i{box-shadow:none;border:2px dashed rgba(255,255,255,.4)}" + R0 + ".cpFilaP.salt i::after{content:'';width:10px;height:2px;background:rgba(255,255,255,.6)}" +
  R0 + ".cpFilaP .n{font-size:15px;font-weight:800;color:var(--mu);text-align:center}" +
  R0 + ".cpFilaP .t{min-width:0;font-size:17px;font-weight:700;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}" +
  R0 + ".cpFilaP.ya .t," + R0 + ".cpFilaP.salt .t{color:var(--mu)}" +
  R0 + ".cpFilaP em{display:flex;flex-direction:column;align-items:flex-end;gap:3px;font-size:14px;font-weight:800;color:var(--mu);white-space:nowrap}" +
  R0 + ".cpFilaP em .ah{color:#101113;background:#f4f5f7;padding:2px 8px;border-radius:99px;font-size:11px;letter-spacing:.06em;text-transform:uppercase}" +
  R0 + ".cpFilaP em .rl{color:var(--ca)}" +
  R0 + ".cpFilaP.visto{box-shadow:inset 3px 0 0 var(--cm);padding-left:8px;margin-left:-8px;width:calc(100% + 8px)}" +
  R0 + ".cpCero{width:100%;height:52px;border-radius:26px;background:var(--sf2);font-size:16px;font-weight:800;margin-top:10px;flex:0 0 auto;text-align:center}" +
  R0 + ".cpGrupo{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);margin:16px 0 2px}" +
  R0 + ".cpGrupo:first-child{margin-top:4px}" +
  R0 + ".cpGrupo.ir{display:flex;align-items:center;gap:4px;width:100%;min-height:48px;margin:10px 0 0;text-align:left;line-height:1.3}" +
  R0 + ".cpGrupo.ir span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
  R0 + ".cpGrupo.ir svg{width:14px;height:14px}" +
  R0 + ".cpFilaI{display:flex;align-items:center;gap:6px;border-top:1px solid var(--ln)}" +
  R0 + ".cpIngF{flex:1;min-width:0;min-height:58px;display:grid;grid-template-columns:24px 1fr auto;gap:12px;align-items:center;padding:8px 0;text-align:left;font-size:17px;font-weight:600;line-height:1.3}" +
  R0 + ".cpIngF .cpTx{min-width:0;overflow-wrap:break-word}" +
  R0 + ".cpIngF b{font-weight:800;white-space:nowrap;text-align:right}" +
  R0 + ".cpIngF small{display:block;font-size:14px;font-weight:600;color:var(--mu)}" +
  R0 + ".cpBadge{height:48px;display:flex;align-items:center;flex:none}" +
  R0 + ".cpBadge span{font-size:13px;font-weight:800;color:var(--mu);background:var(--sf);border-radius:10px;padding:6px 8px;white-space:nowrap}" +
  R0 + ".cpRelojH{padding:4px 0 6px}" + R0 + ".cpRelojH .cpDig{margin-bottom:12px}" +
  R0 + ".cpRelojH .cpDos button.ver{grid-column:1/-1}" +
  /* retomar y final */
  R0 + ".cpRetoma{padding-top:28px}" +
  R0 + ".cpRetoma em,#cocPaso .cpFin em{display:block;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}" +
  R0 + ".cpRetoma h2{font-size:40px;margin:6px 0 10px}" +
  R0 + ".cpRetoma .cpHace{margin-top:14px;font-size:17px;font-weight:700;color:var(--mu)}" +
  R0 + ".cpFin{padding-top:12px}" +
  R0 + ".cpFinOk{width:60px;height:60px;border-radius:50%;background:var(--ca);color:#140b04;display:flex;align-items:center;justify-content:center;margin-bottom:12px}" +
  R0 + ".cpFinOk svg{width:30px;height:30px}" +
  R0 + ".cpFin h2{font-size:34px;margin:0 0 4px}" +
  R0 + ".cpFin .cpDet{font-size:18px}" +
  R0 + ".cpFin h3.cpFinTit{font-size:20px;font-weight:800;margin-top:22px}" +
  R0 + ".cpFin p.cpFinSub{font-size:15px;font-weight:600;color:var(--mu);margin-top:2px}" +
  /* aviso con el modo cerrado */
  "#cocPasoAviso{position:fixed;z-index:95;font-family:Manrope,-apple-system,'Segoe UI',Roboto,sans-serif;--ca:#f08a4b}" +
  "#cocPasoAviso[hidden]{display:none}" +
  "#cocPasoAviso button{flex:none;margin:0;padding:0;border:0;color:inherit;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}" +
  "#cocPasoAviso svg{display:block;background:none;border-radius:0;width:22px;height:22px;flex:none}";

function ponCSS() {
  if (document.getElementById("cocModoCss")) return;
  var s = document.createElement("style"); s.id = "cocModoCss"; s.textContent = CSS;
  (document.head || document.body).appendChild(s);
}

/* ------------------------------- sonido, voz ------------------------------- */
function di(t) {
  if (!t || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  try { var u = new SpeechSynthesisUtterance(t); u.lang = "es-ES"; u.rate = 1.02; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}
function pita(n) {
  if (window.Nativo && Nativo.tono) { Nativo.tono(true).catch(function () {}); vibra(n); return; }
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    for (var k = 0; k < (n || 2); k++) {
      var o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + k * 0.22;
      o.frequency.value = 880; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18); o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 0.2);
    }
  } catch (e) {}
  vibra(n);
}
function vibra(n) { try { if (navigator.vibrate) navigator.vibrate(n >= 3 ? [300, 120, 300, 120, 300] : [150, 80, 150]); } catch (e) {} }
function limpiaVoz(t) {
  return String(t || "").replace(/\bAOVE\b/g, "aceite").replace(/\bcdas?\b/g, "cucharada").replace(/\bcdtas?\b/g, "cucharadita")
    .replace(/(\d)\s*min\b/g, "$1 minutos").replace(/(\d)\s*s\b/g, "$1 segundos").replace(/(\d)\s*g\b/g, "$1 gramos").replace(/·/g, ",");
}
function vozPaso(M0, k) {
  var P = M0.pasos[k];
  if (P.vozIni) return P.vozIni;
  if (P.auto) return "Antes de empezar. Ten a mano lo de la lista.";
  var t = (M0.G ? "" : nomPaso(M0, k) + ". ") + limpiaVoz(P.titulo);
  var ings = P.usa.map(function (i) { return M0.ings[i]; }).filter(function (I) { return I && I.num && !I.basico; })
    .map(function (I) { return (I.c ? cantVoz(I.c) : I.cant) + " " + minus1(I.nombre); });
  if (ings.length) t += ". " + limpiaVoz(ings.join(", "));
  return t + ".";
}

/* ------------------------------- guardar ------------------------------- */
function guarda(id, S) {
  if (!S) return;
  if (S.terminado && !S.timers.length) { escribe(PREF + id, null); delete VIVOS[id]; }
  else escribe(PREF + id, S);
  try { window.dispatchEvent(new CustomEvent("cocinarelojes")); } catch (e) {}
}
function registra(M0, S, q, ctx) {
  if (S.timers.length) VIVOS[M0.id] = { S: S, M0: M0, q: q, ctx: ctx, titulo: M0.titulo, acento: M0.acento };
  else if (!V || V.id !== M0.id) delete VIVOS[M0.id];
}
// al cargar: los relojes que siguen de antes (la app se cerro con uno en marcha)
function recupera() {
  try {
    for (var j = 0; j < localStorage.length; j++) {
      var k = localStorage.key(j); if (!k || k.indexOf(PREF) !== 0) continue;
      var S = lee(k), id = k.slice(PREF.length);
      if (S && S.v === 2 && S.timers && S.timers.length && !VIVOS[id]) VIVOS[id] = { S: S, M0: null, q: null, ctx: null, titulo: S.titulo || "", acento: S.acento || null };
    }
  } catch (e) {}
}
// todos los relojes vivos (de cualquier receta), para el aviso nativo
API.relojes = function () {
  var out = [];
  Object.keys(VIVOS).forEach(function (id) { out = out.concat(avisosDe(VIVOS[id].S, VIVOS[id].titulo)); });
  return out;
};

/* ------------------------------- abrir y cerrar ------------------------------- */
API.abierto = function () { return !!V; };
API.abre = function (q, ctx) {
  var M0 = normaliza(q); if (!M0.pasos.length) return false;
  ponCSS();
  if (V) cierra(true, true);
  var ahora = Date.now(), S = (VIVOS[M0.id] && VIVOS[M0.id].S) || lee(PREF + M0.id), viejo = null;
  if (!S || S.v !== 2) { viejo = lee(PREF_VIEJO + M0.id); S = migra(viejo, M0, ahora); if (viejo) escribe(PREF_VIEJO + M0.id, null); }
  var d = decide(S, M0, ahora);
  if (d === "nuevo") {
    var quedan0 = S && S.timers ? S.timers.filter(function (T) { return T.pausa == null && T.fin > ahora; }) : [];
    S = nuevoEstado(ahora); S.timers = quedan0;   // un reloj que aun corre no se pierde
  }
  S.titulo = M0.titulo; S.acento = M0.acento;
  var box = document.getElementById("cocPaso") || document.body.appendChild(document.createElement("div"));
  box.id = "cocPaso"; box.hidden = false; box.innerHTML = "";
  box.style.setProperty("--ca", M0.acento || "#f08a4b");
  V = { id: M0.id, q: q, M0: M0, S: S, ctx: ctx || {}, box: box, pant: d === "retoma" ? "retoma" : "paso", visto: null, hoja: null,
        toast: null, ultToque: ahora, gasto: null };
  VIVOS[M0.id] = { S: S, M0: M0, q: q, ctx: V.ctx, titulo: M0.titulo, acento: M0.acento };
  guarda(M0.id, S);
  if (!box.cpListo) { escucha(box); box.cpListo = true; }
  if (V.ctx.marca) V.ctx.marca("cocina");
  pideCerrojo();
  quitaAvisoFuera();
  pinta(d !== "retoma");
  ajustaTick();
  return true;
};
function cierra(desdeAtras, sinRepintar) {
  if (!V) return;
  var X = V; V = null;
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  try { if (cerrojo) cerrojo.release(); } catch (e) {} cerrojo = null;
  X.box.hidden = true; X.box.innerHTML = "";
  if (X.pant === "fin") { X.S.terminado = Date.now(); X.S.timers = X.S.timers.filter(function (T) { return restante(T, Date.now()) > 0; }); }
  guarda(X.id, X.S);
  registra(X.M0, X.S, X.q, X.ctx);
  if (!desdeAtras && history.state && history.state.pant === "cocina" && X.ctx.atrasManual) X.ctx.atrasManual();
  if (!sinRepintar && X.ctx.repinta) { try { X.ctx.repinta(); } catch (e) {} }
  ajustaTick();
}
// gesto de atras: primero la hoja, luego mirar otro paso, luego el modo. true = habia algo
API.atras = function () {
  if (!V) return false;
  if (V.hoja || V.visto != null) {
    if (V.hoja) V.hoja = null; else V.visto = null;
    pinta(false);
    if (V.ctx.marca) V.ctx.marca("cocina");      // sigue abierto: el siguiente atras tambien es nuestro
    return true;
  }
  if (V.pant === "fin") { termina(null, true); return true; }
  cierra(true);
  return true;
};
function pideCerrojo() {
  try { if (V && navigator.wakeLock && document.visibilityState === "visible") navigator.wakeLock.request("screen").then(function (l) { cerrojo = l; }, function () {}); } catch (e) {}
}
if (document.addEventListener) document.addEventListener("visibilitychange", function () {
  if (document.visibilityState !== "visible") return;
  if (V) pideCerrojo();
  late();                                        // lo que acabo con la pantalla apagada suena ya
});

/* ------------------------------- el reloj de la pantalla ------------------------------- */
function ajustaTick() {
  var hay = !!V || Object.keys(VIVOS).length > 0, ms = V ? 250 : 1000;
  if (!hay) { clearInterval(TICK); TICK = null; TICK_MS = 0; return; }
  if (TICK && TICK_MS === ms) return;
  clearInterval(TICK); TICK = setInterval(late, ms); TICK_MS = ms;
}
function late() {
  var ahora = Date.now(), cambio = false;
  Object.keys(VIVOS).forEach(function (id) {
    var X = VIVOS[id], S = X.S, ev = revisa(S, ahora);
    if (ev.length) { guarda(id, S); ev.forEach(function (e) { avisa(id, X, e); }); cambio = true; }
    S.timers.forEach(function (T) {
      if (!sonando(T, ahora)) return;
      var u = ALARMA[T.id] || 0, iv = ahora - (T.fin || ahora) < 120e3 ? 5e3 : 30e3;
      if (!u) ALARMA[T.id] = ahora; else if (ahora - u >= iv) { ALARMA[T.id] = ahora; pita(2); }
    });
    if (!S.timers.length && (!V || V.id !== id)) delete VIVOS[id];
  });
  if (V) {
    if (V.visto != null && !V.hoja && ahora - V.ultToque > MIRA_MAX) { V.visto = null; cambio = true; }
    if (V.toast && ahora > V.toast.hasta) { V.toast = null; cambio = true; }
    if (cambio) pinta(false); else refresca(ahora);
  }
  pintaAvisoFuera(ahora);
  ajustaTick();
}
function avisa(id, X, e) {
  var T = e.T, varios = X.S.timers.length > 1;
  if (e.tipo === "fin") {
    ALARMA[T.id] = Date.now();
    pita(3);
    di(T.nombre + ": tiempo." + (T.vozFin ? " " + T.vozFin : ""));
  } else {
    pita(2);
    var a = e.aviso, t = (a.voz || a.texto);
    di((e.tarde > 5 ? "Atención. " : "") + (varios || !V || V.id !== id || V.S.actual !== T.paso ? T.nombre + ": " : "") + t);
    if (V && V.id === id) V.toast = { txt: T.nombre + ": " + (a.texto || a.voz), hasta: Date.now() + 10000, aviso: true };
  }
}
// lo que cambia cada cuarto de segundo, sin repintar todo
function refresca(ahora) {
  if (!V) return;
  var box = V.box, S = V.S;
  S.timers.forEach(function (T) {
    var r = restante(T, ahora), txt = fmt(r);
    Array.prototype.forEach.call(box.querySelectorAll('[data-r="' + T.id + '"]'), function (e) { if (e.textContent !== txt) e.textContent = txt; });
    var b = box.querySelector('[data-b="' + T.id + '"]'); if (b) b.style.width = Math.min(100, Math.max(0, (T.dur - r) / T.dur * 100)) + "%";
    var c = box.querySelector('.cpChip[data-t="' + T.id + '"]'); if (c) c.classList.toggle("poco", r > 0 && r < 30 && T.pausa == null);
    var p = box.querySelector('.cpAvisos[data-t="' + T.id + '"]');
    if (p) { var sig = false; Array.prototype.forEach.call(p.children, function (li) { var ya = T.avisados.indexOf(+li.getAttribute("data-a")) >= 0; li.className = ya ? "ya" : !sig ? "sig" : ""; if (!ya) sig = true; }); }
  });
  var q = box.querySelector(".cpQueda"); if (q) q.innerHTML = quedaHtml(ahora);
}
function quedaHtml(ahora) {
  var pr = progresoDe(V.S, V.M0.pasos, ahora), m = Math.ceil(pr.quedan_s / 60);
  if (!pr.quedan_s) return "";
  return "~" + (m < 60 ? m + " min" : Math.floor(m / 60) + " h " + dos(m % 60)) + " · acabas <b>" + hhmm(pr.acaba) + "</b>";
}

/* ------------------------------- pintar ------------------------------- */
function pinta(habla) {
  if (!V) return;
  var box = V.box, ahora = Date.now(), cu = box.querySelector(".cpCuerpo"), y = 0;
  var vista = V.pant + ":" + (V.visto != null ? V.visto : V.S.actual);
  if (cu && V.ultVista === vista) y = cu.scrollTop;
  V.ultVista = vista;
  var hc = box.querySelector(".cpHojaCuerpo"), yh = hc && V.hoja && V.ultHoja === V.hoja ? hc.scrollTop : 0;
  V.ultHoja = V.hoja;
  var h = arriba() + (V.pant === "paso" ? cabecera(ahora) : "") + tira(ahora);
  if (V.pant === "retoma") h += retoma(ahora);
  else if (V.pant === "fin") h += final(ahora);
  else h += paso(ahora);
  h += alarma(ahora) + hoja(ahora);
  box.innerHTML = h;
  cu = box.querySelector(".cpCuerpo"); if (cu && y) cu.scrollTop = y;
  hc = box.querySelector(".cpHojaCuerpo"); if (hc && yh) hc.scrollTop = yh;
  if (habla && V.pant === "paso" && V.visto == null) di(vozPaso(V.M0, V.S.actual));
}
function arriba() {
  var M0 = V.M0;
  return '<div class="cpTop"><button class="cpX" data-a="x" aria-label="Salir">' + svg("cerrar") + '</button><span class="cpTit">' + esc(M0.titulo) + '</span>' +
    (M0.ings.length && V.pant === "paso" ? '<button class="cpBtn" data-a="hIngs"><span>Ingredientes</span></button>' : "") +
    (V.pant === "paso" && M0.pasos.length > 1 ? '<button class="cpBtn" data-a="hPasos"><span>Pasos</span></button>' : "") + '</div>';
}
function cabecera(ahora) {
  var M0 = V.M0, S = V.S, n = M0.pasos.length, pr = progresoDe(S, M0.pasos, ahora), P = M0.pasos[S.actual];
  var muchos = n > MAX_SEG;
  var segs = M0.pasos.map(function (Q, j) {
    var c = S.hechos[j] ? "ya" : S.saltados[j] ? "salt" : j === S.actual ? "ahora" : "";
    if (j === V.visto) c += " visto";
    var dentro = '<i></i>' + (relojDe(S, j) ? '<em></em>' : "");
    return muchos ? '<span class="cpSeg ' + c + '">' + dentro + '</span>'
                  : '<button class="cpSeg ' + c + '" data-a="seg" data-k="' + j + '" aria-label="' + esc(nomPaso(M0, j)) + '">' + dentro + '</button>';
  }).join("");
  return '<div class="cpCab"><div class="cpLin"><b>' + (P.auto ? "Antes de empezar" : "Paso " + numDe(M0, S.actual) + " de " + totalNum(M0)) + ' · ' + pr.pct + ' %</b>' +
    '<span class="cpQueda">' + quedaHtml(ahora) + '</span></div>' +
    (muchos ? '<button class="cpSegs" data-a="hPasos" aria-label="Ver los pasos" style="width:100%">' + segs + '</button>' : '<div class="cpSegs">' + segs + '</div>') + '</div>';
}
function claseReloj(T, ahora) {
  var r = restante(T, ahora);
  return T.pausa != null ? "pausa" : r <= 0 ? "fin" + (T.callado ? " callado" : "") : r < 30 ? "poco" : "";
}
function tira(ahora) {
  var S = V.S; if (!S.timers.length) return "";
  return '<div class="cpTira">' + S.timers.map(function (T) {
    var c = claseReloj(T, ahora);
    var aqui = V.pant === "paso" && T.paso === (V.visto != null ? V.visto : S.actual);
    return '<button class="cpChip ' + c + (aqui ? " aqui" : "") + '" data-a="chip" data-t="' + T.id + '" aria-label="Reloj ' + esc(T.nombre) + '">' +
      '<span>' + esc(T.nombre) + '</span><b>' + (c === "pausa" ? svg("pausa") : "") + '<em data-r="' + T.id + '">' + fmt(restante(T, ahora)) + '</em></b></button>';
  }).join("") + '</div>';
}
function ingHtml(I) {
  return '<span class="cpTx">' + (I.num ? '<b>' + esc(I.cant) + '</b> ' + esc(minus1(I.nombre)) : esc(I.nombre) + (I.cant ? ' <em>· ' + esc(I.cant) + '</em>' : "")) +
    (I.opcional ? ' <em>(opcional)</em>' : "") + (I.prep ? '<small>' + esc(I.prep) + '</small>' : "") + '</span>';
}
function caja(on) { return '<i class="cpCaja">' + (on ? svg("tick") : "") + '</i>'; }
function fila(clave, html) {
  var on = !!V.S.checks[clave];
  return '<li><button class="cpCheck" data-a="check" data-c="' + clave + '" aria-pressed="' + on + '">' + caja(on) + '<span class="cpTx">' + html + '</span></button></li>';
}
// "1 boniato · pélalo, en cubos de 2 cm": lo primero en negrita, lo demas debajo
function itemHtml(t) {
  var p = String(t || "").split(" · ");
  return p.length > 1 ? '<b>' + esc(p[0]) + '</b><small>' + esc(p.slice(1).join(" · ")) + '</small>' : esc(t);
}
function relojPaso(P, mirando, ahora) {
  var S = V.S, T = relojDe(S, P.k), d = P.dur || P.reposo;
  if (!d && !T) return "";
  var av = (T ? T.avisos : P.avisos) || [], dur = T ? T.dur : d, sig = false;
  var lista = av.length ? '<ul class="cpAvisos"' + (T ? ' data-t="' + T.id + '"' : "") + '>' + av.map(function (a) {
    var ya = T && T.avisados.indexOf(a.a_los_s) >= 0, c = ya ? "ya" : !sig && T ? "sig" : "";
    if (!ya) sig = true;
    return '<li class="' + c + '" data-a="' + a.a_los_s + '"><b>' + fmt(d - a.a_los_s) + '</b><span>' + esc(a.texto || a.voz) + '</span></li>';
  }).join("") + '</ul>' : "";
  var rango = P.hasta > P.dur ? '<p class="cpEst">Entre ' + fmtMin(P.dur) + ' y ' + fmtMin(P.hasta) + ': mira cómo va.</p>' : "";
  if (!T) {
    if (mirando) return '<div class="cpReloj quieto"><div class="cpDig">' + fmt(d) + '</div><p class="cpEst">El reloj se pone en su paso.</p>' + lista + '</div>';
    return '<div class="cpReloj"><button class="cpEmpieza' + (P.dur ? "" : " sec") + '" data-a="empieza">' + svg("play") + (P.dur ? "Empezar " + fmt(d) : "Reloj de reposo · " + fmtMin(d)) + '</button>' +
      (P.dur ? rango : '<p class="cpEst">Destapado hasta que enfríe; luego, tapa.</p>') + lista + '</div>';
  }
  var r = restante(T, ahora), est = T.pausa != null ? "pausa" : r <= 0 ? "fin" : "corre";
  var bot = est === "corre" ? '<button data-a="pausa" data-t="' + T.id + '">' + svg("pausa") + 'Pausa</button><button data-a="mas" data-t="' + T.id + '">+1 min</button>'
          : est === "pausa" ? '<button data-a="pausa" data-t="' + T.id + '">' + svg("play") + 'Seguir</button><button data-a="parar" data-t="' + T.id + '">' + svg("parar") + 'Parar</button>'
          : '<button data-a="mas" data-t="' + T.id + '">+1 min</button><button data-a="parar" data-t="' + T.id + '">' + svg("parar") + 'Parar</button>';
  return '<div class="cpReloj ' + est + '"><div class="cpDig" data-r="' + T.id + '">' + fmt(r) + '</div>' +
    '<div class="cpBarra"><i data-b="' + T.id + '" style="width:' + Math.min(100, Math.max(0, (T.dur - r) / T.dur * 100)) + '%"></i></div>' +
    '<p class="cpEst">' + (est === "fin" ? "¡Tiempo!" + (P.pista ? " " + esc(mayus1(P.pista)) + "." : "") : est === "pausa" ? "En pausa" : T.nombre !== P.reloj ? esc(T.nombre) : "") + '</p>' +
    '<div class="cpDos">' + bot + '</div>' + (est !== "fin" ? rango : "") + lista + '</div>';
}
function paso(ahora) {
  var M0 = V.M0, S = V.S, mirando = V.visto != null, k = mirando ? V.visto : S.actual, P = M0.pasos[k];
  var h = "";
  if (mirando) {
    h += '<div class="cpMira">' + svg("ojo") + '<span><b>Mirando ' + (P.auto ? "Antes de empezar" : "el paso " + numDe(M0, k)) + '</b>' +
      (M0.pasos[S.actual].auto ? "Estás en Antes de empezar" : "Estás en el " + numDe(M0, S.actual)) + '</span><button data-a="volver">Volver</button></div>';
  }
  var etq = P.grupo || (P.tipo === "prep" && !P.auto ? "Antes de empezar" : "");
  h += '<div class="cpCuerpo' + (mirando ? " mirando" : "") + '">';
  if (etq || P.tags.length) h += '<div class="cpEtq">' + (etq ? '<em>' + esc(etq) + '</em>' : "") + P.tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join("") + '</div>';
  h += '<h2' + (P.titulo.length > 60 ? ' class="largo"' : "") + '>' + esc(P.titulo || nomPaso(M0, k)) + '</h2>';
  if (P.detalle && P.detalle !== P.titulo) h += '<p class="cpDet">' + negritas(P.detalle) + '</p>';
  if (P.pista) h += '<p class="cpPista">' + svg("ojo") + '<span>' + esc(mayus1(P.pista)) + '</span></p>';
  if (P.usa.length && !P.secciones) h += '<ul class="cpUsa">' + P.usa.map(function (i) {
    var I = M0.ings[i]; if (!I) return "";
    var on = !!S.checks["i" + i];
    return '<li><button class="cpIng" data-a="ing" data-i="' + i + '" aria-pressed="' + on + '">' + caja(on) + ingHtml(I) + '</button></li>';
  }).join("") + '</ul>';
  h += relojPaso(P, mirando, ahora);
  if (P.checklist.length && !P.secciones) h += '<ul class="cpChecks">' + P.checklist.map(function (c, j) { return fila("c" + k + "-" + j, negritas(c)); }).join("") + '</ul>';
  if (P.secciones) h += P.secciones.map(function (s, si) {
    var items = s.items || [], hechos = items.filter(function (it, ii) { return S.checks["s" + k + "-" + si + "-" + ii]; }).length;
    return '<div class="cpSec"><h3>' + esc(s.titulo) + '<small>' + hechos + ' de ' + items.length + '</small></h3><ul class="cpChecks">' +
      items.map(function (it, ii) { return fila("s" + k + "-" + si + "-" + ii, itemHtml(it.txt)); }).join("") + '</ul></div>';
  }).join("");
  if (P.mientras) h += '<div class="cpPar"><h3>' + (P.soloEsto ? "Solo esto" : "Mientras tanto") + '</h3><p>' + negritas(P.mientras) + '</p></div>';
  if (P.consejo) h += '<div class="cpPar tip"><h3>Consejo</h3><p>' + negritas(P.consejo) + '</p></div>';
  var sig = mirando ? (k + 1 < M0.pasos.length ? k + 1 : -1) : siguiente(S, M0.pasos.length, k);
  if (sig >= 0 && sig !== k) h += '<button class="cpLuego" data-a="mira" data-k="' + sig + '"><small>' + (sig < k ? "Falta" : "Luego") + '</small><span>' + esc(M0.pasos[sig].titulo) + '</span>' + svg("der") + '</button>';
  h += '</div>';
  // abajo: una sola cosa clara
  if (mirando) {
    h += '<div class="cpDock mira">' + toast() + '<button class="cpAnt" data-a="seguir">Seguir desde aquí</button><button class="cpHecho azul" data-a="volver">' +
      (M0.pasos[S.actual].auto ? "Volver a Antes" : "Volver al paso " + numDe(M0, S.actual)) + '</button></div>';
  } else {
    var nx = siguiente(S, M0.pasos.length, k), T = relojDe(S, k);
    var etqH = P.auto ? (nx >= 0 ? "Listo, al paso " + numDe(M0, nx) : "Listo") : nx < 0 ? "Terminar" : "Hecho";
    var tenue = P.dur && !T, suena = T && sonando(T, ahora);
    h += '<div class="cpDock">' + toast() + '<button class="cpAnt" data-a="ant"' + (k === 0 ? " disabled" : "") + '>' + svg("izq") + 'Anterior</button>' +
      '<button class="cpHecho' + (tenue ? " tenue" : "") + (suena ? " suena" : "") + '" data-a="hecho">' + esc(etqH) + (nx >= 0 ? svg("der") : "") + '</button></div>';
  }
  return h;
}
function retoma(ahora) {
  var M0 = V.M0, S = V.S, k = Math.min(S.actual, M0.pasos.length - 1), P = M0.pasos[k];
  var hace = S.t ? Math.max(1, Math.round((ahora - S.t) / 60e3)) : 0;
  var hTxt = !hace ? "" : hace < 60 ? "hace " + hace + " min" : "hace " + Math.floor(hace / 60) + " h" + (hace % 60 ? " " + dos(hace % 60) : "");
  var hechos = cuenta(S.hechos);
  return '<div class="cpCuerpo"><div class="cpRetoma"><em>Ibas por</em><h2>' + (P.auto ? "Antes de empezar" : "Paso " + numDe(M0, k) + " de " + totalNum(M0)) + '</h2>' +
    '<p class="cpDet">' + esc(P.titulo) + '</p><p class="cpHace">' + [hTxt, hechos ? hechos + (hechos === 1 ? " paso hecho" : " pasos hechos") : ""].filter(Boolean).join(" · ") + '</p></div></div>' +
    '<div class="cpDock retoma">' + toast() + '<button class="cpAnt" data-a="cero">Empezar de 0</button><button class="cpHecho" data-a="sigue">Seguir' + svg("der") + '</button></div>';
}
function final(ahora) {
  var M0 = V.M0, rep = M0.reparto, h = '<div class="cpCuerpo"><div class="cpFin"><div class="cpFinOk">' + svg("tick") + '</div><h2>¡Hecho!</h2>';
  h += '<p class="cpDet">' + (M0.G ? esc(M0.titulo) + " completa." : "Buen provecho.") + '</p>';
  if (rep && rep.taper) h += '<div class="cpPar"><h3>El táper</h3><p>' + negritas(rep.taper) + '</p></div>';
  var corren = V.S.timers.filter(function (T) { return restante(T, ahora) > 0; });
  if (corren.length) h += '<div class="cpPar tip"><h3>Sigue en marcha</h3><p>' + corren.map(function (T) { return esc(T.nombre); }).join(", ") + ': te aviso al acabar.</p></div>';
  if (V.gasto && V.gasto.length) {
    h += '<h3 class="cpFinTit">¿Qué has gastado?</h3><p class="cpFinSub">Quita lo que no hayas usado.</p><ul class="cpChecks">' +
      V.gasto.map(function (g, j) { return '<li><button class="cpCheck cpGasto" data-a="gasto" data-g="' + j + '" aria-pressed="' + !!g.on + '">' + caja(g.on) + '<span class="cpTx">' + esc(g.txt) + '</span></button></li>'; }).join("") + '</ul>';
  }
  h += '</div></div>';
  var n = V.gasto ? V.gasto.filter(function (g) { return g.on; }).length : 0;
  h += V.gasto && V.gasto.length
    ? '<div class="cpDock pila">' + toast() + '<button class="cpHecho" data-a="apunta"' + (n ? "" : " disabled") + '>Apuntar lo gastado</button><button class="cpAnt" data-a="sinApuntar">Salir sin apuntar</button></div>'
    : '<div class="cpDock pila">' + toast() + '<button class="cpHecho" data-a="sinApuntar">Salir</button></div>';
  return h;
}
function alarma(ahora) {
  var lista = [];
  Object.keys(VIVOS).forEach(function (id) { VIVOS[id].S.timers.forEach(function (T) { if (sonando(T, ahora)) lista.push({ id: id, T: T }); }); });
  // el reloj del paso que tienes delante ya se ve en su tarjeta (y Hecho late)
  lista = lista.filter(function (x) { return !(x.id === V.id && V.pant === "paso" && V.visto == null && !V.hoja && x.T.paso === V.S.actual); });
  if (!lista.length) return "";
  var x = lista[0], T = x.T, propio = x.id === V.id;
  return '<div class="cpAlarma" role="alert"><p>' + svg("reloj") + '<span>' + esc(T.nombre) + ': tiempo<small>' + esc(propio ? T.pasoTxt : VIVOS[x.id].titulo) + '</small></span><b data-r="' + T.id + '">' + fmt(restante(T, ahora)) + '</b></p>' +
    '<div><button data-a="aVer" data-t="' + T.id + '" data-v="' + esc(x.id) + '">Ver</button><button data-a="mas" data-t="' + T.id + '" data-v="' + esc(x.id) + '">+1 min</button>' +
    '<button data-a="parar" data-t="' + T.id + '" data-v="' + esc(x.id) + '">Parar</button></div></div>';
}
function toast() {
  if (!V.toast) return "";
  return '<div class="cpToast' + (V.toast.aviso ? " aviso" : "") + '" role="status">' + (V.toast.aviso ? svg("reloj") : "") + '<span>' + esc(V.toast.txt) + '</span>' + (V.toast.fn ? '<button data-a="deshacer">Deshacer</button>' : "") + '</div>';
}
function hoja(ahora) {
  if (!V.hoja) return "";
  var M0 = V.M0, S = V.S, h = '<div class="cpVelo" data-a="cierraHoja"></div>';
  var x = '<button class="cpX" data-a="cierraHoja" aria-label="Cerrar">' + svg("cerrar") + '</button>';
  if (V.hoja === "pasos") {
    var hechos = M0.pasos.filter(function (P, j) { return S.hechos[j] && !P.auto; }).length;
    h += '<div class="cpHoja" role="dialog" aria-label="Pasos"><div class="cpHojaCab"><div><h3>' + totalNum(M0) + ' pasos</h3><small>' + hechos + (hechos === 1 ? " hecho" : " hechos") +
      ' · ' + quedaHtml(ahora).replace(/<[^>]+>/g, "") + '</small></div>' + x + '</div><div class="cpHojaCuerpo">' +
      M0.pasos.map(function (P, j) {
        var st = S.hechos[j] ? "ya" : S.saltados[j] ? "salt" : j === S.actual ? "ahora" : "", T = relojDe(S, j);
        if (j === S.actual && st !== "ahora") st += " ahora";
        return '<button class="cpFilaP ' + st + (j === V.visto ? " visto" : "") + '" data-a="fila" data-k="' + j + '"><i>' + (S.hechos[j] ? svg("tick") : "") + '</i>' +
          '<span class="n">' + (P.auto ? "·" : numDe(M0, j)) + '</span><span class="t">' + esc(P.titulo) + '</span><em>' +
          (j === S.actual ? '<span class="ah">Ahora</span>' : "") + (T ? '<span class="rl" data-r="' + T.id + '">' + fmt(restante(T, ahora)) + '</span>' : P.dur ? fmtMin(P.dur) : "") + '</em></button>';
      }).join("") + '</div><button class="cpCero" data-a="cero">Empezar de 0</button></div>';
  } else if (V.hoja === "ings") {
    var tot = M0.ings.length, on = M0.ings.filter(function (I) { return S.checks["i" + I.i]; }).length;
    h += '<div class="cpHoja" role="dialog" aria-label="Ingredientes"><div class="cpHojaCab"><div><h3>Ingredientes</h3><small>' + on + ' de ' + tot + ' marcados</small></div>' + x + '</div><div class="cpHojaCuerpo">' +
      gruposIngs(M0).map(function (g) {
        return (g.k != null ? '<button class="cpGrupo ir" data-a="fila" data-k="' + g.k + '"><span>' + esc(g.titulo) + ' · ' + esc(M0.pasos[g.k].titulo) + '</span>' + svg("der") + '</button>'
                            : '<h4 class="cpGrupo">' + esc(g.titulo) + '</h4>') + g.items.map(function (i) {
          var I = M0.ings[i], marc = !!S.checks["i" + i], k = g.k != null ? -1 : primerUso(M0, i);
          return '<div class="cpFilaI"><button class="cpIngF" data-a="ing" data-i="' + i + '" aria-pressed="' + marc + '">' + caja(marc) +
            '<span class="cpTx">' + esc(I.nombre) + (I.opcional ? " (opcional)" : "") + (I.prep ? '<small>' + esc(I.prep) + '</small>' : "") + '</span><b>' + esc(I.cant) + '</b></button>' +
            (k >= 0 ? '<button class="cpBadge" data-a="fila" data-k="' + k + '"><span>' + (M0.pasos[k].auto ? "Antes" : "Paso " + numDe(M0, k)) + '</span></button>' : "") + '</div>';
        }).join("");
      }).join("") + '</div></div>';
  } else if (/^reloj:/.test(V.hoja)) {
    var T = relojId(S, V.hoja.slice(6));
    if (!T) { V.hoja = null; return ""; }
    var r = restante(T, ahora), est = T.pausa != null ? "pausa" : r <= 0 ? "fin" : "corre";
    h += '<div class="cpHoja chica" role="dialog" aria-label="Reloj"><div class="cpHojaCab"><div><h3>' + esc(T.nombre) + '</h3><small>' + esc(T.pasoTxt) + '</small></div>' + x + '</div>' +
      '<div class="cpRelojH cpReloj ' + est + '" style="background:none;box-shadow:none;padding:0"><div class="cpDig" data-r="' + T.id + '">' + fmt(r) + '</div><div class="cpDos">' +
      (est === "fin" ? '<button data-a="mas" data-t="' + T.id + '">+1 min</button>'
                     : '<button data-a="pausa" data-t="' + T.id + '">' + svg(est === "pausa" ? "play" : "pausa") + (est === "pausa" ? "Seguir" : "Pausa") + '</button><button data-a="mas" data-t="' + T.id + '">+1 min</button>') +
      '<button data-a="parar" data-t="' + T.id + '">' + svg("parar") + 'Parar</button>' +
      (T.paso !== (V.visto != null ? V.visto : S.actual) || V.pant !== "paso" ? '<button class="ver" data-a="aVer" data-t="' + T.id + '" data-v="' + esc(V.id) + '">' + svg("ojo") + 'Ver ' + esc(minus1(T.pasoTxt)) + '</button>' : "") +
      '</div></div></div>';
  }
  return h;
}

/* ------------------------------- tocar ------------------------------- */
function escucha(box) {
  box.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("[data-a]") : null;
    if (!b || !V || b.disabled) return;
    accion(b.getAttribute("data-a"), b);
  });
  box.addEventListener("pointerdown", function () { if (V) V.ultToque = Date.now(); }, { passive: true });
  // deslizar en el cuerpo: solo cambia el paso que miras (nunca marca nada)
  var t0 = null;
  box.addEventListener("touchstart", function (ev) {
    t0 = null;
    if (!V || V.pant !== "paso" || V.hoja || ev.touches.length !== 1) return;
    var cu = ev.target.closest && ev.target.closest(".cpCuerpo"); if (!cu) return;
    var x = ev.touches[0].clientX, w = window.innerWidth || document.documentElement.clientWidth;
    if (x < 32 || x > w - 32) return;                     // el borde es del gesto de atras de Android
    t0 = { x: x, y: ev.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  box.addEventListener("touchend", function (ev) {
    if (!t0 || !V) return;
    var c = ev.changedTouches[0], dx = c.clientX - t0.x, dy = c.clientY - t0.y, dt = Date.now() - t0.t;
    t0 = null;
    if (Math.abs(dx) < 64 || Math.abs(dx) < 2 * Math.abs(dy) || dt >= 600) return;
    var k = (V.visto != null ? V.visto : V.S.actual) + (dx < 0 ? 1 : -1);
    if (k < 0 || k >= V.M0.pasos.length) return;
    mira(k);
  }, { passive: true });
}
function mira(k) {
  if (!V) return;
  V.visto = k === V.S.actual ? null : k;
  V.ultToque = Date.now();
  if (V.pant !== "paso") V.pant = "paso";
  var cu = V.box.querySelector(".cpCuerpo"); if (cu) cu.scrollTop = 0;
  pinta(false);
}
function cambia(habla) {                    // tras tocar algo que cambia el estado
  guarda(V.id, V.S); registra(V.M0, V.S, V.q, V.ctx);
  pinta(habla);
  ajustaTick();
}
function ponToast(txt, fn) { V.toast = { txt: txt, fn: fn || null, hasta: Date.now() + (fn ? 5000 : 3500) }; }
function lista(nums) { return nums.length === 1 ? String(nums[0]) : nums.slice(0, -1).join(", ") + " y " + nums[nums.length - 1]; }
function accion(a, b) {
  var M0 = V.M0, S = V.S, ahora = Date.now(), n = M0.pasos.length, k, T, id;
  var duenio = b.getAttribute("data-v"), SX = duenio && VIVOS[duenio] ? VIVOS[duenio].S : S;
  switch (a) {
    case "x": if (V.pant === "fin") termina(null); else cierra(false); return;
    case "hIngs": V.hoja = "ings"; pinta(false); return;
    case "hPasos": V.hoja = "pasos"; pinta(false); return;
    case "cierraHoja": V.hoja = null; pinta(false); return;
    case "seg": k = +b.getAttribute("data-k"); mira(k); return;
    case "fila": k = +b.getAttribute("data-k"); V.hoja = null; mira(k); return;
    case "mira": mira(+b.getAttribute("data-k")); return;
    case "volver": V.visto = null; pinta(false); return;
    case "chip": V.hoja = "reloj:" + b.getAttribute("data-t"); pinta(false); return;
    case "ing": k = "i" + b.getAttribute("data-i"); if (S.checks[k]) delete S.checks[k]; else S.checks[k] = 1; S.t = ahora; cambia(false); return;
    case "check": k = b.getAttribute("data-c"); if (S.checks[k]) delete S.checks[k]; else S.checks[k] = 1; S.t = ahora; cambia(false); return;
    case "empieza":
      T = empieza(S, M0.pasos[S.actual], ahora, M0);
      if (T) di(T.dur >= 60 ? fmtMin(T.dur).replace("min", "minutos").replace(" s", " segundos") + "." : T.dur + " segundos.");
      cambia(false); return;
    case "pausa": T = pausa(SX, b.getAttribute("data-t"), ahora); delete ALARMA[b.getAttribute("data-t")]; guardaOtro(duenio); cambia(false); return;
    case "mas": T = masUno(SX, b.getAttribute("data-t"), ahora, 60); delete ALARMA[b.getAttribute("data-t")]; guardaOtro(duenio); di("Un minuto más."); cambia(false); return;
    case "parar": para(SX, b.getAttribute("data-t"), ahora); delete ALARMA[b.getAttribute("data-t")]; if (/^reloj:/.test(V.hoja || "")) V.hoja = null; guardaOtro(duenio); cambia(false); return;
    case "aVer":
      id = b.getAttribute("data-t");
      if (duenio && duenio !== V.id && VIVOS[duenio]) {     // un reloj de otra receta: se calla y se abre la suya si se puede
        T = relojId(VIVOS[duenio].S, id); if (T) T.callado = true; guarda(duenio, VIVOS[duenio].S);
        if (VIVOS[duenio].q) { var o = VIVOS[duenio]; if (API.abre(o.q, o.ctx || V.ctx) && T && V) mira(T.paso); return; }
        pinta(false); return;
      }
      T = relojId(S, id); if (!T) return;
      if (sonando(T, ahora)) T.callado = true;
      V.hoja = null; guarda(V.id, S);
      if (V.pant === "retoma") V.pant = "paso";
      if (V.pant === "fin") { pinta(false); return; }
      mira(T.paso); return;
    case "ant": V.visto = null; anterior(S, ahora); cambia(true); return;
    case "hecho":
      V.visto = null;
      k = hecho(S, n, S.actual, ahora);
      if (k < 0) { aFin(ahora); return; }
      cambia(true); return;
    case "seguir":
      k = V.visto; V.visto = null;
      var r = seguirDesde(S, k, ahora);
      if (r.saltados.length) ponToast("Saltados " + lista(r.saltados.map(function (j) { return M0.pasos[j].auto ? "Antes" : numDe(M0, j); })),
        function () { deshacer(S, r.antes, Date.now()); });
      cambia(true); return;
    case "cero":
      var antes = reinicia(S, ahora);
      Object.keys(ALARMA).forEach(function (x) { delete ALARMA[x]; });
      V.hoja = null; V.visto = null; V.pant = "paso";
      ponToast("Empezado de 0", function () { deshacer(S, antes, Date.now()); });
      cambia(true); return;
    case "sigue": V.pant = "paso"; S.t = ahora; cambia(true); return;
    case "deshacer": if (V.toast && V.toast.fn) V.toast.fn(); V.toast = null; cambia(false); return;
    case "gasto": k = +b.getAttribute("data-g"); if (V.gasto[k]) V.gasto[k].on = !V.gasto[k].on; pinta(false); return;
    case "apunta": termina(V.gasto.filter(function (g) { return g.on; }).map(function (g) { return g.txt; })); return;
    case "sinApuntar": termina(null); return;
  }
}
function guardaOtro(id) { if (id && VIVOS[id] && (!V || id !== V.id)) guarda(id, VIVOS[id].S); }
function aFin(ahora) {
  V.pant = "fin"; V.hoja = null; V.visto = null;
  V.gasto = gastadoDe(V.M0); V.toast = null;          // los relojes que siguen ya salen en su tarjeta
  guarda(V.id, V.S);
  di(V.M0.G ? (/noche/i.test(V.M0.titulo) ? "Hecho. Buenas noches." : "Hecho.") : "Hecho. Buen provecho.");
  pinta(false);
}
function termina(gastado, desdeAtras) {
  var M0 = V.M0, ctx = V.ctx;
  var info = { uid: M0.R ? M0.R.uid : M0.G ? M0.G.uid : null, titulo: M0.titulo, id: M0.J ? M0.J.id : (M0.R && M0.R.receta) || null,
               gastado: gastado && gastado.length ? gastado : null };
  if (M0.G) info.guia = true;
  if (ctx.alTerminar) { try { ctx.alTerminar(info); } catch (e) {} }
  V.pant = "fin";
  cierra(!!desdeAtras);
}

/* ------------------------------- aviso con el modo cerrado ------------------------------- */
function quitaAvisoFuera() { var a = document.getElementById("cocPasoAviso"); if (a) a.hidden = true; }
function pintaAvisoFuera(ahora) {
  var a = document.getElementById("cocPasoAviso");
  if (V) { if (a && !a.hidden) a.hidden = true; return; }
  var x = null;
  Object.keys(VIVOS).forEach(function (id) { VIVOS[id].S.timers.forEach(function (T) { if (!x && sonando(T, ahora)) x = { id: id, T: T }; }); });
  if (!x) { if (a) a.hidden = true; return; }
  ponCSS();
  if (!a) {
    a = document.body.appendChild(document.createElement("div")); a.id = "cocPasoAviso"; a.setAttribute("role", "alert");
    a.addEventListener("click", function (ev) {
      var b = ev.target.closest ? ev.target.closest("[data-a]") : null; if (!b) return;
      var o = VIVOS[b.getAttribute("data-v")]; if (!o) { a.hidden = true; return; }
      var T = relojId(o.S, b.getAttribute("data-t")), t = Date.now(), ac2 = b.getAttribute("data-a");
      delete ALARMA[b.getAttribute("data-t")];
      if (ac2 === "ver") {
        if (T) T.callado = true; guarda(b.getAttribute("data-v"), o.S);
        if (o.q && API.abre(o.q, o.ctx || {}) && T && V) mira(T.paso); else a.hidden = true;
        return;
      }
      if (ac2 === "mas" && T) masUno(o.S, T.id, t, 60);
      if (ac2 === "parar" && T) para(o.S, T.id, t);
      guarda(b.getAttribute("data-v"), o.S);
      if (!o.S.timers.length) delete VIVOS[b.getAttribute("data-v")];
      a.hidden = true; late();
    });
  }
  var T = x.T, clave = x.id + "|" + T.id;
  a.style.setProperty("--ca", VIVOS[x.id].acento || "#f08a4b");
  if (a.getAttribute("data-k") !== clave || a.hidden) {
    a.setAttribute("data-k", clave);
    a.innerHTML = '<p>' + svg("reloj") + '<span>' + esc(T.nombre) + ': tiempo<small>' + esc(VIVOS[x.id].titulo || T.pasoTxt) + '</small></span><b>' + fmt(restante(T, ahora)) + '</b></p>' +
      '<div><button data-a="ver" data-t="' + T.id + '" data-v="' + esc(x.id) + '">' + (VIVOS[x.id].q ? "Ver" : "Vale") + '</button><button data-a="mas" data-t="' + T.id + '" data-v="' + esc(x.id) + '">+1 min</button>' +
      '<button data-a="parar" data-t="' + T.id + '" data-v="' + esc(x.id) + '">Parar</button></div>';
  } else { var bb = a.querySelector("p b"); if (bb) bb.textContent = fmt(restante(T, ahora)); }
  a.hidden = false;
}

recupera();
ajustaTick();
})();

return API;
});
