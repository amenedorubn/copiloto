/* ===========================================================================
   NUTRICION · lo planificado y lo registrado contra los objetivos de la semana (v2.44)
   ---------------------------------------------------------------------------
   - Los nutrientes de cada alimento salen de nutri-tabla.js (USDA FoodData
     Central, SR Legacy, CC0) o de tus alimentos (Open Food Facts, o lo tuyo).
     Lo que no se encuentra NO se inventa: queda "sin datos".
   - PLANIFICADO = las comidas del calendario «Comidas» (por ración).
     REGISTRADO = lo que apuntas tú y no está en el calendario (batidos,
     meriendas, comer fuera). La app nunca dice que es lo que has comido de
     verdad: el calendario no lo recoge todo.
   - Objetivos por SEMANA según su fase (Descarga, Carga, Recuperación,
     Mantenimiento, Volumen, Definición), en g/kg y % sobre el mantenimiento,
     con el «por qué» de cada número. Tus datos (peso, altura, edad, % grasa)
     viven solo en el móvil: nunca en el repo, los tests ni las capturas.
   Lógica pura: node la carga para los tests (tests/nutricion.test.mjs).
   =========================================================================== */
(function (raiz, fabrica) {
  var X = fabrica(raiz);
  if (typeof module === "object" && module.exports) module.exports = X;
  else raiz.Nutricion = X;
})(typeof window !== "undefined" ? window : this, function (raiz) {
"use strict";

var EN_NODE = typeof module === "object" && module.exports && typeof require === "function";
var M = {};
function usa(n, f) { if (!M[n]) M[n] = EN_NODE ? require(f) : raiz[n]; return M[n]; }
function Rc() { return usa("Receta", "./receta.js"); }
function Tabla() { return usa("NutriTabla", "./nutri-tabla.js"); }
function norm(s) { return Rc().norm(s); }
function r1(n) { return Math.round(n * 10) / 10; }

var CLAVES = ["kcal", "prot", "hc", "grasa", "fibra", "vitC", "folato", "hierro", "magnesio", "potasio", "b12", "vitD", "calcio", "sodio",
              "vitA", "vitE", "b6", "zinc", "yodo", "epadha"];   // v2.48: lo que suele venir en los suplementos
var NOMBRE = { kcal: "Energía", prot: "Proteína", hc: "Carbohidratos", grasa: "Grasa", fibra: "Fibra", vitC: "Vitamina C", folato: "Folato",
  hierro: "Hierro", magnesio: "Magnesio", potasio: "Potasio", b12: "Vitamina B12", vitD: "Vitamina D", calcio: "Calcio", sodio: "Sodio",
  vitA: "Vitamina A", vitE: "Vitamina E", b6: "Vitamina B6", zinc: "Zinc", yodo: "Yodo", epadha: "EPA + DHA" };
var UNIDAD = { kcal: "kcal", prot: "g", hc: "g", grasa: "g", fibra: "g", vitC: "mg", folato: "µg", hierro: "mg", magnesio: "mg", potasio: "mg",
  b12: "µg", vitD: "µg", calcio: "mg", sodio: "mg", vitA: "µg", vitE: "mg", b6: "mg", zinc: "mg", yodo: "µg", epadha: "mg" };
var PRIORIDAD = ["hc", "fibra", "vitC", "folato"];

/* ------------------------------ un alimento ------------------------------ */
var RE_C = {};
function fila(nombre) {
  var n = norm(nombre); if (!n) return null;
  var T = Tabla();
  for (var i = 0; i < T.length; i++) {
    var re = RE_C[T[i].k] || (RE_C[T[i].k] = new RegExp(T[i].k));
    if (re.test(n)) return T[i];
  }
  return null;
}
// gramos de una cantidad: g y ml tal cual; cucharadas; unidades con lo que pesa una (la tabla o tus alimentos)
var GR_UD = { g: 1, kg: 1000, ml: 1, l: 1000, cl: 10, cda: 15, cdta: 5, "puñado": 30, pizca: 0.5 };
function gramos(c, F, eq) {
  if (!c || !(c.n > 0)) return null;
  if (GR_UD[c.ud] != null) return c.n * (c.ud === "cda" && F && /aceite/i.test(F.nombre) ? 13 : GR_UD[c.ud]);
  if (eq && eq.n > 0 && /^(g|ml)$/.test(eq.ud)) return c.n * eq.n;
  if (F && F.ud) return c.n * F.ud;
  return null;
}
function vacio() { var o = {}; CLAVES.forEach(function (k) { o[k] = 0; }); return o; }
function suma(a, b, f) { CLAVES.forEach(function (k) { if (b[k] != null) a[k] += b[k] * (f == null ? 1 : f); }); return a; }
/* Un ingrediente (de receta.js) -> {n: nutrientes, g, F (fila), fuente} o {sinDatos: motivo}.
   ali = tu alimento (si lo hay): su nutricion de Open Food Facts o la tuya manda en los macros. */
function deIngrediente(g, ali) {
  // v2.58: un tupper o un tarro que hizo otra receta no es el alimento que nombra ("tupper de curry de pollo" no es pollo)
  if (g.hecho || (g.c && /^(tupper|tarro)$/.test(g.c.ud))) return { sinDatos: "lo hizo otra receta", txt: g.txt };
  // v2.58: "1 bote (~400 g)": lo que pesa, si la receta lo dice (y no hay uno tuyo con su peso)
  var eqR = g.equiv && g.c && g.c.n > 0 && /^(g|ml)$/.test(g.equiv.ud) && !/^(g|ml)$/.test(g.c.ud) ? { n: g.equiv.n / g.c.n, ud: g.equiv.ud } : null;
  var F = fila(g.base || g.nombre || g.txt || ""), gr = gramos(g.c, F, (ali && ali.eq) || eqR);
  if (gr == null) return { sinDatos: g.c ? "cantidad sin peso" : "sin cantidad", txt: g.txt };
  var por100 = null, fuente = null;
  if (ali && ali.nutri && ali.nutri.kcal != null) {
    por100 = {}; CLAVES.forEach(function (k) { if (ali.nutri[k] != null) por100[k] = ali.nutri[k]; });
    if (F) CLAVES.forEach(function (k) { if (por100[k] == null && F.n[k] != null && !/kcal|prot|hc|grasa/.test(k)) por100[k] = F.n[k]; });
    fuente = ali.nutri.fuente || "OFF";
  } else if (F) { por100 = F.n; fuente = "USDA"; }
  if (!por100) return { sinDatos: "sin datos de nutrición", txt: g.txt };
  var n = {}; CLAVES.forEach(function (k) { if (por100[k] != null) n[k] = por100[k] * gr / 100; });
  return { n: n, g: gr, F: F, fuente: fuente, txt: g.txt };
}
/* Una comida del calendario (receta.js), por ración -> {n, sinDatos: [txt], lineas: [...]}.
   Los básicos sin cantidad (sal, "AOVE al gusto") no cuentan ni se avisan.                 */
function deComida(R, aliDe) {
  var tot = vacio(), sin = [], L = [], rac = R.raciones && R.raciones > 0 ? R.raciones : 1;
  (R.ingredientes || []).forEach(function (g) {
    if (!g.clave || (g.basico && !g.c)) return;
    var x = deIngrediente(g, aliDe ? aliDe(g.base || g.nombre) : null);
    if (x.sinDatos) { sin.push(g.txt); return; }
    suma(tot, x.n, 1 / rac); L.push(x);
  });
  return { n: tot, sinDatos: sin, lineas: L, raciones: rac };
}
// lo que apuntas tú: "200 g de yogur griego", "2 dátiles", o un favorito con sus nutrientes
function deTexto(txt, aliDe) {
  var tot = vacio(), sin = [], gs = Rc().ings(String(txt || ""));
  gs.forEach(function (g) { var x = deIngrediente(g, aliDe ? aliDe(g.base || g.nombre) : null); if (x.sinDatos) sin.push(g.txt); else suma(tot, x.n); });
  return { n: tot, sinDatos: sin };
}

/* ------------------------------ favoritos (registro rápido) ------------------------------
   Con lo que llevan: se calculan con la tabla. "Comida fuera" es una ESTIMACIÓN (solo energía y
   macros; los micros quedan sin datos).                                                       */
var FAVORITOS = [
  { id: "batido", txt: "Batido de proteína", ings: "30 g de proteína en polvo, 300 ml de leche semidesnatada" },
  { id: "datiles", txt: "Dátiles", ings: "3 dátiles" },
  { id: "yogurprot", txt: "Yogur griego con proteína", ings: "170 g de yogur griego, 15 g de proteína en polvo" },
  { id: "platano", txt: "Plátano", ings: "1 plátano" },
  { id: "fuera-ligera", txt: "Comida fuera · ligera", estimado: { kcal: 600, prot: 30, hc: 70, grasa: 20 } },
  { id: "fuera-normal", txt: "Comida fuera · normal", estimado: { kcal: 900, prot: 40, hc: 100, grasa: 35 } },
  { id: "fuera-copiosa", txt: "Comida fuera · copiosa", estimado: { kcal: 1300, prot: 50, hc: 140, grasa: 55 } }
];
function deFavorito(f, aliDe) {
  if (f.estimado) { var n = vacio(); for (var k in f.estimado) n[k] = f.estimado[k]; return { n: n, sinDatos: [], estimado: true, micros: false }; }
  var x = deTexto(f.ings, aliDe); x.micros = true; return x;
}

/* ------------------------------ fases y objetivos ------------------------------
   Rangos por fase (g por kg de peso; energía en % sobre el mantenimiento). Fuentes:
   ACSM/AND/DC 2016 (Nutrition and Athletic Performance), IOC 2018 (consenso), ISSN 2017
   (proteína), Aragon 2017 (ISSN, dieta y composición corporal), EFSA DRV (fibra y micros).   */
var FASES = {
  descarga: { nombre: "Descarga", kcal: [-10, -5], prot: [1.6, 1.8], hc: [5, 6], grasa: [0.8, 1.0], fibra: [25, 30],
    porque: "Menos volumen de entreno: un poco menos de energía, carbohidratos para llegar con el depósito lleno a la carrera (ACSM/IOC)." },
  carga: { nombre: "Carga de hidratos", kcal: [10, 15], prot: [1.2, 1.6], hc: [7, 8], grasa: [0.5, 0.8], fibra: [10, 20],
    porque: "Los 2 días antes de la carrera: 7–8 g/kg de carbohidratos (el IOC pide 10–12 g/kg para pruebas de más de 90 min) y poca fibra para no cargar el intestino." },
  recuperacion: { nombre: "Recuperación", kcal: [0, 0], prot: [1.8, 2.0], hc: [4, 6], grasa: [0.9, 1.1], fibra: [30, 40],
    porque: "Tras la carrera: más proteína para reparar músculo (ISSN 1,4–2,0 g/kg) y carbohidratos para reponer glucógeno." },
  mantenimiento: { nombre: "Mantenimiento", kcal: [0, 0], prot: [1.6, 1.8], hc: [4, 6], grasa: [0.9, 1.1], fibra: [30, 40],
    porque: "Energía igual al gasto; proteína en el rango que mantiene la masa muscular entrenando fuerza (ISSN)." },
  volumen: { nombre: "Volumen", kcal: [8, 11], prot: [1.6, 2.0], hc: [5, 6], grasa: [0.9, 1.1], fibra: [30, 40],
    porque: "Un superávit pequeño (+250–300 kcal) para ganar músculo con poca grasa (Aragon/ISSN)." },
  definicion: { nombre: "Definición", kcal: [-15, -10], prot: [2.0, 2.2], hc: [3, 5], grasa: [0.8, 1.0], fibra: [30, 40],
    porque: "Déficit suave (−300…−400 kcal, como mucho −0,5 % de peso por semana) con más proteína para no perder músculo (ISSN)." }
};
// micronutrientes: EFSA, hombre adulto (editables en el perfil)
var MICROS = { vitC: [110, null, "EFSA: 110 mg/día (hombre adulto)"], folato: [330, null, "EFSA: 330 µg DFE/día"], fibra: [25, null, "EFSA: 25 g/día como mínimo"],
  hierro: [11, null, "EFSA: 11 mg/día"], magnesio: [350, null, "EFSA: 350 mg/día (AI)"], potasio: [3500, null, "EFSA: 3500 mg/día (AI)"],
  b12: [4, null, "EFSA: 4 µg/día (AI)"], vitD: [15, 100, "EFSA: 15 µg/día; máximo tolerable 100 µg"], calcio: [950, 2500, "EFSA: 950 mg/día; máximo tolerable 2500 mg"],
  vitA: [750, 3000, "EFSA: 750 µg/día; máximo tolerable 3000 µg"], vitE: [13, 300, "EFSA: 13 mg/día (AI); máximo tolerable 300 mg"], b6: [1.7, 12, "EFSA: 1,7 mg/día; máximo tolerable 12 mg"],
  zinc: [9.4, 25, "EFSA: 9,4–16,3 mg/día según el fitato; máximo tolerable 25 mg"], yodo: [150, 600, "EFSA: 150 µg/día; máximo tolerable 600 µg"],
  epadha: [250, null, "EFSA: 250 mg/día de EPA + DHA"] };
/* Máximos tolerables (UL) de EFSA, adulto. "supl": solo cuenta lo que viene de suplementos (magnesio, folato). */
var UL = { vitD: [100, "µg"], vitA: [3000, "µg"], vitE: [300, "mg"], b6: [12, "mg"], zinc: [25, "mg"], calcio: [2500, "mg"], yodo: [600, "µg"],
  folato: [1000, "µg", "supl"], magnesio: [250, "mg", "supl"] };
// carbohidratos según el día (g/kg sobre el rango de la fase): descanso −1, gimnasio 0, calidad +1, tirada +2
var DIA = { descanso: [-1, "Día de descanso: 1 g/kg menos."], gimnasio: [0, "Día de gimnasio: el rango de la fase."],
  calidad: [1, "Día de calidad (series, ritmo): 1 g/kg más."], tirada: [2, "Tirada larga o carrera: 2 g/kg más."] };

// gasto en reposo: Mifflin-St Jeor; mantenimiento = reposo × 1,6 si no lo pones tú
function reposo(p) { if (!p || !(p.peso > 0) || !(p.altura > 0) || !(p.edad > 0)) return null; return Math.round(10 * p.peso + 6.25 * p.altura - 5 * p.edad + (p.sexo === "m" ? -161 : 5)); }
function mantenimiento(p) {
  if (p && p.mant > 0) return { kcal: Math.round(p.mant), estimado: false, porque: "El que has puesto tú." };
  var r = p && p.bmr > 0 ? Math.round(p.bmr) : reposo(p);
  if (!r) return null;
  return { kcal: Math.round(r * 1.6), estimado: true, tmb: r, tmbEstimado: !(p.bmr > 0), porque: (p.bmr > 0 ? "Tu metabolismo basal (" + r + " kcal)" : "Mifflin-St Jeor (" + r + " kcal en reposo)") +
    " × 1,6 por entrenar 6–7 días a la semana. Contrástalo con tu peso medio semanal y cámbialo si hace falta." };
}

/* El plan de fases inicial (editable semana a semana en la app). Semanas de lunes a domingo. */
var PLAN = [
  { desde: "2026-10-12", hasta: "2026-10-18", fase: "descarga", dias: { "2026-10-16": "carga", "2026-10-17": "carga" } },
  { desde: "2026-10-19", hasta: "2026-11-02", fase: "recuperacion" },
  { desde: "2026-11-03", hasta: "2026-11-30", fase: "mantenimiento" },
  { desde: "2026-12-01", hasta: "2027-03-31", fase: "definicion" }
];
function lunes(iso) { var p = iso.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2], 12); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
/* La fase de un día: lo que hayas puesto para su semana (semanas = {lunes: {fase, peso, ...}}) o el plan.
   -> {fase, deSemana: bool, dia: fase del dia si cambia (carga)} */
function faseDe(iso, semanas) {
  var s = semanas && semanas[lunes(iso)];
  var P = PLAN.filter(function (x) { return iso >= x.desde && iso <= x.hasta; })[0];
  var f = s && s.fase ? s.fase : P ? P.fase : "mantenimiento";
  var dia = !(s && s.fase) && P && P.dias && P.dias[iso] ? P.dias[iso] : (s && s.dias && s.dias[iso]) || null;
  return { fase: dia || f, semana: f, propia: !!(s && s.fase) };
}
/* Objetivos de un día -> {kcal, prot, hc, grasa, fibra, vitC, ...: {min, max, u, porque}} o null sin perfil.
   peso: el medio de la semana si lo hay; tipo: el del día (descanso, gimnasio, calidad, tirada).            */
function objetivos(perfil, iso, semanas, tipo) {
  var s = semanas && semanas[lunes(iso)] || {}, peso = s.peso > 0 ? s.peso : perfil && perfil.peso;
  if (!peso) return null;
  var p = {}; for (var k in perfil) p[k] = perfil[k]; p.peso = peso;
  var F = faseDe(iso, semanas), C = FASES[F.fase] || FASES.mantenimiento, man = mantenimiento(p), aj = s.ajustes || {};
  var out = { fase: F.fase, faseNombre: C.nombre, porque: C.porque, peso: peso, pesoDe: s.peso > 0 ? "tu peso medio de esta semana" : "tu peso" };
  function rango(k, a, b, u, porque) {
    var x = aj[k]; out[k] = x && x.length === 2 ? { min: x[0], max: x[1], u: u, porque: "Lo has puesto tú para esta semana.", propio: true } : { min: a, max: b, u: u, porque: porque };
  }
  out.mant = man;
  if (man) rango("kcal", Math.round(man.kcal * (1 + C.kcal[0] / 100)), Math.round(man.kcal * (1 + C.kcal[1] / 100)), "kcal",
    "Mantenimiento " + man.kcal + " kcal (" + man.porque + ") " + (C.kcal[0] || C.kcal[1] ? (C.kcal[0] > 0 ? "+" : "") + C.kcal[0] + "…" + (C.kcal[1] > 0 ? "+" : "") + C.kcal[1] + " % en " + C.nombre.toLowerCase() + "." : "sin cambio en " + C.nombre.toLowerCase() + "."));
  if (out.kcal && man && man.estimado && !out.kcal.propio) out.kcal.estimado = true;
  rango("prot", Math.round(C.prot[0] * peso), Math.round(C.prot[1] * peso), "g", C.prot[0] + "–" + C.prot[1] + " g/kg × " + r1(peso) + " kg (" + out.pesoDe + ").");
  var d = F.fase === "carga" ? 0 : DIA[tipo] ? DIA[tipo][0] : 0, h0 = Math.max(3, C.hc[0] + d), h1 = Math.max(h0, C.hc[1] + d);
  rango("hc", Math.round(h0 * peso), Math.round(h1 * peso), "g", h0 + "–" + h1 + " g/kg × " + r1(peso) + " kg." + (d && DIA[tipo] ? " " + DIA[tipo][1] : ""));
  rango("grasa", Math.round(C.grasa[0] * peso), Math.round(C.grasa[1] * peso), "g", C.grasa[0] + "–" + C.grasa[1] + " g/kg.");
  rango("fibra", C.fibra[0], C.fibra[1], "g", F.fase === "carga" ? "Poca fibra los días de carga." : "EFSA: 25 g como mínimo; " + C.fibra[0] + "–" + C.fibra[1] + " g en " + C.nombre.toLowerCase() + ".");
  Object.keys(MICROS).forEach(function (k) { if (k !== "fibra") rango(k, MICROS[k][0], MICROS[k][1], UNIDAD[k], MICROS[k][2]); });
  return out;
}

/* ------------------------------ el día ------------------------------
   comidas: las de ese día (receta.js), sin las que no hiciste; registro: [{n, sinDatos, estimado, micros}]
   -> {plan: {n, sinDatos}, reg: {n, sinDatos, estimado}, total: n}                                      */
function dia(comidas, registro, aliDe, supl) {
  var plan = vacio(), sin = [], reg = vacio(), sinR = [], est = false, sinMicros = false, sp = vacio(), sinF = [];
  (supl || []).forEach(function (x) { if (x.sinFicha) sinF.push(x.nombre); else suma(sp, x.n); });
  (comidas || []).forEach(function (R) { var x = deComida(R, aliDe); suma(plan, x.n); sin = sin.concat(x.sinDatos); });
  (registro || []).forEach(function (e) { suma(reg, e.n || {}); sinR = sinR.concat(e.sinDatos || []); if (e.estimado) est = true; if (e.micros === false) sinMicros = true; });
  var tot = suma(suma(suma(vacio(), plan), reg), sp);
  return { plan: { n: plan, sinDatos: sin }, reg: { n: reg, sinDatos: sinR, estimado: est, sinMicros: sinMicros },
           supl: { n: sp, sinFicha: sinF, hay: (supl || []).length > 0 }, total: tot };
}

/* ------------------------------ suplementos (v2.48) ------------------------------
   s = {id, nombre, dosis: {n, ud}, momentos: [{m, hora?}], dias: "todos" | "entreno" | "descanso"}
   Su etiqueta es la ficha de tu alimento (A.nutri), casi siempre POR UNIDAD (cápsula, comprimido,
   cacito: nutri.por = "1 unidad"); si es por 100 g, la dosis va en g o ml.                         */
var MOMENTOS = { desayuno: "Desayuno", comida: "Comida", cena: "Cena", dormir: "Antes de dormir", antes: "Antes de entrenar", despues: "Después de entrenar", hora: "A una hora" };
var DIAS_S = { todos: "Todos los días", entreno: "Solo días de entreno", descanso: "Solo días de descanso" };
function tomasDe(s, tipo) {
  if (!s) return 0;
  if (s.dias === "entreno" && tipo === "descanso") return 0;
  if (s.dias === "descanso" && tipo && tipo !== "descanso") return 0;
  return Math.max(1, (s.momentos || []).length);
}
var MICRO_K = ["vitA", "vitD", "vitE", "vitC", "b1", "b2", "b3", "b6", "folato", "b12", "calcio", "hierro", "magnesio", "potasio", "zinc", "fosforo", "yodo", "cobre", "selenio", "epa", "dha"];
// -> {nombre, n (lo de ese dia), tomas, sinFicha, incompleta (ninguna vitamina ni mineral en su etiqueta)}
function deSuplemento(s, A, tipo) {
  var nu = A && A.nutri, t = tomasDe(s, tipo), out = { nombre: s.nombre, tomas: t, n: {}, sinFicha: !nu };
  if (!nu || !t) return out;
  var d = s.dosis && s.dosis.n > 0 ? s.dosis.n : 1, porUnidad = !/100/.test(nu.por || "1 unidad");
  var f = porUnidad ? d * t : (/^(g|ml)$/.test(s.dosis && s.dosis.ud) ? d / 100 * t : null);
  if (f == null) { out.sinFicha = true; return out; }
  CLAVES.concat(["epa", "dha"]).forEach(function (k) { if (typeof nu[k] === "number") out.n[k] = nu[k] * f; });
  if (out.n.epa != null || out.n.dha != null) out.n.epadha = (out.n.epa || 0) + (out.n.dha || 0);
  out.incompleta = !MICRO_K.some(function (k) { return typeof nu[k] === "number"; });
  return out;
}
/* Lo que pasa del máximo tolerable de EFSA (folato y magnesio: solo lo de los suplementos) */
function avisosUL(total, supl) {
  var out = [];
  Object.keys(UL).forEach(function (k) {
    var v = UL[k][2] === "supl" ? (supl || {})[k] : total[k];
    if (v != null && v > UL[k][0]) out.push({ k: k, nombre: NOMBRE[k] || k, valor: Math.round(v * 10) / 10, ul: UL[k][0], u: UL[k][1], soloSupl: UL[k][2] === "supl" });
  });
  return out;
}

/* ------------------------------ días, semanas y tendencias (v2.49) ------------------------------
   F = {comidas(f) -> [R], registro(f) -> [e], supl(f, tipo) -> [deSuplemento], aliDe, perfil, semanas, tipo(f)}
   Un día "con datos" tiene alguna comida del calendario o algo registrado (los suplementos solos no cuentan).
   Lo que no tiene datos sale null: las gráficas dicen "s/d", nunca 0.                                   */
function masDias(iso, n) { var p = iso.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2] + n, 12);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function resumenDia(f, F) {
  var tipo = F.tipo ? F.tipo(f) : null, C = (F.comidas && F.comidas(f)) || [], Rg = (F.registro && F.registro(f)) || [], S = (F.supl && F.supl(f, tipo)) || [];
  var D = dia(C, Rg, F.aliDe, S), obj = F.perfil ? objetivos(F.perfil, f, F.semanas || {}, tipo || "gimnasio") : null;
  return { fecha: f, tipo: tipo, D: D, obj: obj, conDatos: C.length + Rg.length > 0 };
}
function diasDesde(desde, n, F) { var L = []; for (var i = 0; i < n; i++) L.push(resumenDia(masDias(desde, i), F)); return L; }
function semana(lunesIso, F) { return diasDesde(lunesIso, 7, F); }
// en rango: energía dentro de su rango (±10 %), proteína y carbohidratos por encima de su mínimo. null sin datos u objetivos
function enRango(r) {
  if (!r.conDatos || !r.obj) return null;
  var t = r.D.total, o = r.obj;
  if (o.prot && t.prot < o.prot.min) return false;
  if (o.hc && t.hc < o.hc.min) return false;
  if (o.kcal && (t.kcal < o.kcal.min * 0.9 || t.kcal > o.kcal.max * 1.1)) return false;
  return true;
}
// media de un nutriente en los días con datos -> {v, supl, n} (v null si no hay ninguno)
function media(dias, k) {
  var L = dias.filter(function (r) { return r.conDatos; });
  if (!L.length) return { v: null, supl: null, n: 0 };
  var s = 0, sp = 0; L.forEach(function (r) { s += r.D.total[k] || 0; sp += r.D.supl.n[k] || 0; });
  return { v: s / L.length, supl: sp / L.length, n: L.length };
}
/* Tendencias: nSem semanas que acaban en la de lunesFin -> [{lunes, dias, peso, fase, obj (de su miércoles)}] */
function semanas(lunesFin, nSem, F) {
  var out = [];
  for (var i = nSem - 1; i >= 0; i--) {
    var l = masDias(lunesFin, -7 * i), d = semana(l, F), s = (F.semanas || {})[l] || {};
    var ref = d[2];
    out.push({ lunes: l, dias: d, peso: s.peso > 0 ? s.peso : null, fase: faseDe(l, F.semanas).semana, obj: ref.obj });
  }
  return out;
}
/* Una métrica de una semana: "hcKg" y "protKg" en g/kg (con su peso medio o el del perfil); el resto, media diaria.
   -> {v, lo, hi} (lo/hi: el objetivo de esa semana en la misma unidad)                                          */
function metrica(S, k, perfil) {
  var kk = k === "hcKg" ? "hc" : k === "protKg" ? "prot" : k, m = media(S.dias, kk), o = S.obj && S.obj[kk];
  var peso = S.peso || (perfil && perfil.peso) || null, div = /Kg$/.test(k) ? peso : 1;
  if (!div) return { v: null, lo: null, hi: null };
  return { v: m.v == null ? null : m.v / div, lo: o ? o.min / div : null, hi: o && o.max != null ? o.max / div : null };
}
// lo esperado del peso en cada fase (por semana, sobre el primero que se sepa)
var CAMBIO_SEM = { definicion: -0.004, volumen: 0.0025 };
function pesoEsperado(S) {
  var i0 = -1; S.forEach(function (s, i) { if (i0 < 0 && s.peso) i0 = i; });
  if (i0 < 0) return S.map(function () { return null; });
  var p = S[i0].peso;
  return S.map(function (s, i) { if (i < i0) return null; if (i > i0) p = p * (1 + (CAMBIO_SEM[s.fase] || 0)); return Math.round(p * 10) / 10; });
}
/* Las fases por bloques desde una semana: [{fase, desde, hasta (domingo), semanas}] */
function bloquesFase(desde, nSem, sem) {
  var out = [], l = lunes(desde);
  for (var i = 0; i < nSem; i++) {
    var w = masDias(l, 7 * i), f = faseDe(w, sem).semana, ult = out[out.length - 1];
    if (ult && ult.fase === f) { ult.hasta = masDias(w, 6); ult.semanas++; }
    else out.push({ fase: f, nombre: (FASES[f] || {}).nombre, desde: w, hasta: masDias(w, 6), semanas: 1 });
  }
  return out;
}
/* Carbohidratos por kg según el tipo de día, en los días con datos -> [{tipo, v (media g/kg), n, lo, hi (de la fase)}] */
function porTipo(dias, perfil, fase) {
  var C = FASES[fase] || FASES.mantenimiento, peso = perfil && perfil.peso;
  return ["descanso", "gimnasio", "calidad", "tirada"].map(function (t) {
    var L = dias.filter(function (r) { return r.conDatos && (r.tipo || "gimnasio") === t; });
    var off = DIA[t][0], lo = Math.max(3, C.hc[0] + off), hi = Math.max(lo, C.hc[1] + off);
    var v = L.length && peso ? L.reduce(function (s, r) { return s + (r.D.total.hc || 0) / ((r.obj && r.obj.peso) || peso); }, 0) / L.length : null;
    return { tipo: t, v: v, n: L.length, lo: lo, hi: hi };
  });
}
// cobertura media de un micro: % del mínimo (con lo de suplementos aparte) -> {total, supl} o {total: null}
function cobertura(dias, k) {
  var L = dias.filter(function (r) { return r.conDatos && r.obj && r.obj[k] && r.obj[k].min; });
  if (!L.length) return { total: null, supl: null };
  var t = 0, s = 0; L.forEach(function (r) { t += (r.D.total[k] || 0) / r.obj[k].min * 100; s += (r.D.supl.n[k] || 0) / r.obj[k].min * 100; });
  return { total: t / L.length, supl: s / L.length };
}
// huecos que se repiten: cuántos días (con datos) quedan por debajo del mínimo en cada prioritario
function huecos(dias, ks) {
  var L = dias.filter(function (r) { return r.conDatos && r.obj; });
  return (ks || PRIORIDAD).map(function (k) {
    var bajo = L.filter(function (r) { return r.obj[k] && r.obj[k].min && (r.D.total[k] || 0) < r.obj[k].min; });
    var m = L.length ? L.reduce(function (s, r) { return s + (r.D.total[k] || 0); }, 0) / L.length : null;
    return { k: k, nombre: NOMBRE[k], u: UNIDAD[k], bajo: bajo.length, de: L.length, media: m, min: L[0] && L[0].obj[k] ? L[0].obj[k].min : null };
  }).filter(function (h) { return h.bajo > 0; }).sort(function (a, b) { return b.bajo - a.bajo; });
}

/* ------------------------------ te falta X; cómete Y ------------------------------
   Lo que falta de los prioritarios (carbohidratos, fibra, vitamina C, folato) hasta el mínimo, y qué
   comer: primero lo que hay en casa, luego lo que ya está en la lista; si no, qué comprar. Es algo
   que se añade (un tentempié o un acompañamiento): no cambia ninguna comida del plan.
   enCasa / enLista: [nombres] -> [{k, falta, u, y: {txt, aporta, donde: "casa" | "lista" | "comprar"}}]    */
var PORCION = { "Plátano": 120, "Kiwi": 75, "Naranja": 180, "Manzana": 180, "Espinacas": 60, "Pimiento": 80, "Fresas": 150, "Brócoli": 100,
  "Garbanzos cocidos": 120, "Lentejas (secas)": 60, "Avena": 50, "Dátiles": 48, "Aguacate": 75, "Arroz cocido": 125, "Pan integral": 60 };
function teFalta(total, obj, enCasa, enLista) {
  if (!obj) return [];
  var out = [], casa = (enCasa || []).map(fila).filter(Boolean), lista = (enLista || []).map(fila).filter(Boolean);
  PRIORIDAD.forEach(function (k) {
    var o = obj[k]; if (!o || o.min == null) return;
    var falta = o.min - (total[k] || 0); if (falta <= o.min * 0.05) return;
    function mejor(L, todo) {
      var m = null, pm = 0;
      L.forEach(function (F) { var g = PORCION[F.nombre] || F.ud || 100, a = (F.n[k] || 0) * g / 100; if (a > pm) { pm = a; m = { F: F, g: g, a: a }; } });
      return m && (todo || m.a >= falta * 0.15) ? m : null;
    }
    var y = mejor(casa), donde = "casa";
    if (!y) { y = mejor(lista); donde = "lista"; }
    if (!y) { y = mejor(Tabla().filter(function (F) { return PORCION[F.nombre]; }), true); donde = "comprar"; }
    out.push({ k: k, nombre: NOMBRE[k], falta: Math.round(falta), u: UNIDAD[k],
      y: y ? { nombre: y.F.nombre, txt: porcionTxt(y.F, y.g), aporta: Math.round(y.a), donde: donde } : null });
  });
  return out;
}
function porcionTxt(F, g) { return F.ud ? (Math.round(g / F.ud) <= 1 ? "1 " : Math.round(g / F.ud) + " × ") + F.nombre.toLowerCase() : g + " g de " + F.nombre.toLowerCase(); }

return { masDias: masDias, resumenDia: resumenDia, diasDesde: diasDesde, semana: semana, enRango: enRango, media: media, semanas: semanas, metrica: metrica,
  pesoEsperado: pesoEsperado, bloquesFase: bloquesFase, porTipo: porTipo, cobertura: cobertura, huecos: huecos, MOMENTOS: MOMENTOS, DIAS_S: DIAS_S, UL: UL, tomasDe: tomasDe, deSuplemento: deSuplemento, avisosUL: avisosUL, CLAVES: CLAVES, NOMBRE: NOMBRE, UNIDAD: UNIDAD, PRIORIDAD: PRIORIDAD, FASES: FASES, MICROS: MICROS, DIA: DIA, PLAN: PLAN, FAVORITOS: FAVORITOS,
  fila: fila, gramos: gramos, deIngrediente: deIngrediente, deComida: deComida, deTexto: deTexto, deFavorito: deFavorito,
  reposo: reposo, mantenimiento: mantenimiento, lunes: lunes, faseDe: faseDe, objetivos: objetivos, dia: dia, teFalta: teFalta };
});
