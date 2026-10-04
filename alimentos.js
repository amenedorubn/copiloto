/* ===========================================================================
   ALIMENTOS · tus alimentos, con TU nombre (v2.39)
   ---------------------------------------------------------------------------
   Cada alimento tiene el nombre que usas tú, que nunca cambia solo: ni el
   escáner ni Open Food Facts lo pisan. Lo demás va colgando de él:
     - alias: otros nombres (el del paquete, el de Open Food Facts);
     - codigos: los códigos de barras, con su marca y su formato ("3 × 80 g");
     - eq: cuánto pesa una unidad (para decir "3 latas · 240 g");
     - nutri: lo de la etiqueta por 100 g, con su fuente ("OFF", "USDA", "tú").
   A = {id, t, nombre, alias: [txt], codigos: [{ean, marca, formato}], zona, eq: {g}, nutri, borrado}
   Se guarda en el móvil y en el Worker (/cocina, "alimentos"): gana lo más nuevo
   de cada id. Lógica pura: node la carga para los tests (tests/alimentos.test.mjs).
   =========================================================================== */
(function (raiz, fabrica) {
  var X = fabrica(raiz);
  if (typeof module === "object" && module.exports) module.exports = X;
  else raiz.Alimentos = X;
})(typeof window !== "undefined" ? window : this, function (raiz) {
"use strict";

var REC = null;
function Rc() {
  if (!REC) REC = (typeof module === "object" && module.exports && typeof require === "function") ? require("./receta.js") : raiz.Receta;
  return REC;
}
function norm(s) { return Rc().norm(s); }
function mayus1(t) { t = String(t || "").trim(); return t.charAt(0).toUpperCase() + t.slice(1); }

/* ------------------------------ juntar (móvil y Worker) ------------------------------ */
function mezcla(a, b) {
  var por = {}, out = [];
  [].concat(a || [], b || []).forEach(function (x) {
    if (!x || !x.id) return;
    var y = por[x.id];
    if (!y) { por[x.id] = x; out.push(x); return; }
    if ((x.t || 0) > (y.t || 0)) { out[out.indexOf(y)] = x; por[x.id] = x; }
  });
  return out;
}
function vivos(L) { return (L || []).filter(function (a) { return a && !a.borrado; }); }

/* ------------------------------ buscar ------------------------------ */
function porCodigo(L, ean) {
  ean = String(ean || "");
  return vivos(L).filter(function (a) { return (a.codigos || []).some(function (c) { return c.ean === ean; }); })[0] || null;
}
function nombres(a) { return [a.nombre].concat(a.alias || []); }
// el tuyo por nombre o alias ("Mejillón en escabeche" -> tus "Mejillones en lata")
function porNombre(L, txt) {
  var g = Rc().ingrediente(String(txt || "")), mejor = null, pm = 0;
  vivos(L).forEach(function (a) {
    nombres(a).forEach(function (n) {
      var h = Rc().ingrediente(n), p = h.clave && h.clave === g.clave ? 1.01 : Rc().mismo(g, h);
      if (p > pm) { pm = p; mejor = a; }
    });
  });
  return pm >= 0.75 ? mejor : null;
}

/* ------------------------------ el nombre del paquete ------------------------------
   "MEJILLON EN ESCABECHE (Carrefour, 3x80g)" -> "Mejillón en escabeche": sin marca, sin peso,
   en minúsculas. Es solo una propuesta: el nombre lo eliges tú.                          */
function limpiaNombre(nombre, marca) {
  var t = String(nombre || "").replace(/\([^)]*\)/g, " ").replace(/\b\d+(?:[.,]\d+)?\s*(?:x|×)\s*\d+(?:[.,]\d+)?\s*(?:g|kg|ml|cl|l)\b/gi, " ")
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:g|gr|kg|ml|cl|l)\b/gi, " ");
  (String(marca || "").split(",")).forEach(function (m) {
    m = m.trim(); if (m.length > 1) t = t.replace(new RegExp("\\b" + m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "ig"), " ");
  });
  t = t.replace(/\s+/g, " ").replace(/^[\s,.-]+|[\s,.-]+$/g, "").toLowerCase();
  return mayus1(t);
}
/* Lo que propone el escáner al ver un código que no conoce: primero lo que ya tienes y se
   parece (para no duplicarlo), luego el nombre limpio del paquete.
   casa = [{nombre}] (lo que hay en casa) -> [{nombre, id?, por: "tuyo" | "casa" | "paquete"}]      */
function sugiere(L, casa, offNombre, marca) {
  var out = [], visto = {};
  function mete(n, extra) {
    var k = norm(n); if (!n || visto[k]) return; visto[k] = 1;
    var x = { nombre: mayus1(n) }; for (var e in extra) x[e] = extra[e]; out.push(x);
  }
  var limpio = limpiaNombre(offNombre, marca), g = Rc().ingrediente(limpio);
  var tuyo = porNombre(L, limpio);
  if (tuyo) mete(tuyo.nombre, { id: tuyo.id, por: "tuyo" });
  (casa || []).map(function (x) {
    var h = Rc().ingrediente(x.nombre || x.txt || "");
    return { x: x, p: h.clave && h.clave === g.clave ? 1.01 : Rc().mismo(g, h) };
  }).filter(function (y) { return y.p >= 0.5; }).sort(function (a, b) { return b.p - a.p; }).slice(0, 2)
    .forEach(function (y) { var a = porNombre(L, y.x.nombre); mete(a ? a.nombre : y.x.nombre, a ? { id: a.id, por: "tuyo" } : { por: "casa" }); });
  mete(limpio, { por: "paquete" });
  return out.slice(0, 3);
}

/* ------------------------------ el formato ------------------------------
   "240 g (3 x 80 g)", "3x80g", "1 kg", "6 x 125 g", "330ml" -> {total: {n, ud}, uds, cada: {n, ud}} */
function formato(txt) {
  var s = String(txt || "").toLowerCase().replace(/,/g, "."), m = s.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|l)\b/);
  function a(n, u) { var c = Rc().cantidad(n + " " + u); return c && /^(g|ml)$/.test(c.ud) ? { n: c.n, ud: c.ud } : null; }
  if (m) { var cada = a(m[2], m[3]); if (cada) return { total: { n: Math.round(cada.n * +m[1] * 100) / 100, ud: cada.ud }, uds: +m[1], cada: cada }; }
  var t = s.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|l)\b/), tot = t ? a(t[1], t[2]) : null;
  return tot ? { total: tot, uds: 1, cada: tot } : null;
}

/* ------------------------------ registrar ------------------------------
   Lo escaneado entra en el catálogo con el nombre que has elegido. Si ya existía (por id, o
   porque el nombre es el de uno tuyo), se le añade el código, el alias y la nutrición; el nombre
   no cambia nunca. -> {A (el alimento, nuevo o actualizado), nuevo: bool}                       */
function nuevoId() { return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function registra(L, d, ahora) {
  ahora = ahora || Date.now();
  var A = (d.id && vivos(L).filter(function (a) { return a.id === d.id; })[0]) || porCodigo(L, d.codigo) || porNombre(L, d.nombre), nuevo = !A;
  A = A ? JSON.parse(JSON.stringify(A)) : { id: nuevoId(), nombre: mayus1(d.nombre), alias: [], codigos: [] };
  A.t = ahora;
  function alias(n) {
    n = mayus1(n); if (!n) return;
    if (norm(n) === norm(A.nombre) || A.alias.some(function (x) { return norm(x) === norm(n); })) return;
    A.alias.push(n);
  }
  if (d.offNombre) alias(d.offNombre);
  if (!nuevo && d.nombre && norm(d.nombre) !== norm(A.nombre)) alias(d.nombre);
  if (d.codigo && !A.codigos.some(function (c) { return c.ean === String(d.codigo); }))
    A.codigos.push({ ean: String(d.codigo), marca: d.marca || "", formato: d.formato || "" });
  var f = formato(d.formato);
  if (f && f.uds > 1 && !A.eq) A.eq = { n: f.cada.n, ud: f.cada.ud };
  if (d.zona && !A.zona) A.zona = d.zona;
  // la nutricion: la tuya (fuente "tú") no la pisa ninguna otra
  if (d.nutri && (!A.nutri || A.nutri.fuente !== "tú")) {
    A.nutri = {}; for (var k in d.nutri) A.nutri[k] = d.nutri[k];
    A.nutri.fuente = d.fuente || "OFF"; A.nutri.fecha = new Date(ahora).toISOString().slice(0, 10);
  }
  return { A: A, nuevo: nuevo };
}
// cambiar tu nombre: el de antes queda como alias (y el escaner lo sigue reconociendo)
function renombra(A, nombre, ahora) {
  var B = JSON.parse(JSON.stringify(A)), n = mayus1(nombre);
  if (!n || norm(n) === norm(B.nombre)) return B;
  B.alias = (B.alias || []).filter(function (x) { return norm(x) !== norm(n); });
  B.alias.unshift(B.nombre); B.nombre = n; B.t = ahora || Date.now();
  return B;
}

/* ------------------------------ cantidades claras ------------------------------
   "240 g" con 1 ud = 80 g -> "240 g · 3 ud"; "2 latas" con 1 lata = 80 g -> "2 latas · 160 g".
   Sin equivalencia, solo la cantidad.                                                          */
function cantDoble(c, eq) {
  var RC = Rc(); if (!c) return "";
  var a = RC.cantTxt(c);
  if (!eq || !(eq.n > 0)) return a;
  if (c.ud === eq.ud) {
    var u = Math.round(c.n / eq.n * 10) / 10;
    return u >= 0.5 ? a + " · " + String(u).replace(".", ",") + " ud" : a;
  }
  if (!/^(g|ml)$/.test(c.ud)) return a + " · " + RC.cantTxt({ n: Math.round(c.n * eq.n), ud: eq.ud });
  return a;
}

/* ------------------------------ la ficha entera (v2.47) ------------------------------
   Todo lo de una etiqueta, por 100 g (y por porción si se sabe cuánto es). Lo que falta es "sin dato":
   nunca 0 ni inventado. A.nutri = {campo: valor por 100 g, ..., porcionG, porcionTxt, fuente, fecha, incompleta} */
var CAMPOS = [
  ["kcal", "Energía", "kcal", "Energía"], ["kj", "Energía", "kJ", "Energía"],
  ["grasa", "Grasas", "g", "Grasas"], ["sat", "de las cuales saturadas", "g", "Grasas"], ["mono", "monoinsaturadas", "g", "Grasas"], ["poli", "poliinsaturadas", "g", "Grasas"],
  ["hc", "Hidratos de carbono", "g", "Hidratos"], ["azucar", "de los cuales azúcares", "g", "Hidratos"], ["polioles", "polialcoholes", "g", "Hidratos"], ["fibra", "Fibra alimentaria", "g", "Hidratos"],
  ["prot", "Proteínas", "g", "Proteínas y sal"], ["sal", "Sal", "g", "Proteínas y sal"],
  ["vitA", "Vitamina A", "µg", "Vitaminas"], ["vitD", "Vitamina D", "µg", "Vitaminas"], ["vitE", "Vitamina E", "mg", "Vitaminas"], ["vitC", "Vitamina C", "mg", "Vitaminas"],
  ["b1", "Tiamina (B1)", "mg", "Vitaminas"], ["b2", "Riboflavina (B2)", "mg", "Vitaminas"], ["b3", "Niacina (B3)", "mg", "Vitaminas"], ["b6", "Vitamina B6", "mg", "Vitaminas"],
  ["folato", "Ácido fólico / folato", "µg", "Vitaminas"], ["b12", "Vitamina B12", "µg", "Vitaminas"],
  ["calcio", "Calcio", "mg", "Minerales"], ["hierro", "Hierro", "mg", "Minerales"], ["magnesio", "Magnesio", "mg", "Minerales"], ["potasio", "Potasio", "mg", "Minerales"],
  ["zinc", "Zinc", "mg", "Minerales"], ["fosforo", "Fósforo", "mg", "Minerales"], ["yodo", "Yodo", "µg", "Minerales"],
  ["cobre", "Cobre", "mg", "Minerales"], ["selenio", "Selenio", "µg", "Minerales"],
  ["epa", "EPA (omega-3)", "mg", "Ácidos grasos"], ["dha", "DHA (omega-3)", "mg", "Ácidos grasos"]   // v2.48, para los suplementos
];
var BASICOS = ["kcal", "grasa", "sat", "hc", "azucar", "prot", "sal"];   // lo que lleva toda etiqueta (UE 1169/2011)
function num(v) { return typeof v === "number" && isFinite(v) ? v : null; }
// ¿le falta algo de lo obligatorio?
function incompleta(nu) { return !nu || BASICOS.some(function (k) { return num(nu[k]) == null; }); }
/* Las filas de la ficha: [{k, nombre, u, grupo, v100 (o null = sin dato), vPor (o null)}] */
function fichaFilas(nu) {
  var pg = nu && num(nu.porcionG);
  return CAMPOS.map(function (c) {
    var v = nu ? num(nu[c[0]]) : null;
    if (c[0] === "kj" && v == null && nu && num(nu.kcal) != null) v = Math.round(nu.kcal * 4.184);        // kJ de las kcal (la misma medida)
    return { k: c[0], nombre: c[1], u: c[2], grupo: c[3], v100: v, vPor: v != null && pg ? Math.round(v * pg) / 100 : null };
  });
}
/* Guardar lo que rellenas a mano (aunque sea a medias): solo los campos que pones; los vacíos siguen "sin dato".
   valores = {campo: número | null}. La fuente pasa a ser "tú" en lo que tocas.                                   */
function conFicha(A, valores, extra, ahora) {
  var B = JSON.parse(JSON.stringify(A)); B.t = ahora || Date.now();
  var nu = B.nutri ? B.nutri : {};
  Object.keys(valores || {}).forEach(function (k) { var v = valores[k]; if (v == null || v === "") delete nu[k]; else if (isFinite(+v)) nu[k] = +v; });
  for (var e in (extra || {})) if (extra[e] != null && extra[e] !== "") nu[e] = extra[e];
  nu.fuente = "tú"; nu.fecha = new Date(B.t).toISOString().slice(0, 10); nu.incompleta = incompleta(nu); nu.por = nu.por || "100 g";
  B.nutri = nu;
  return B;
}
/* Una ficha genérica de la tabla USDA (para lo que no tiene etiqueta: fruta, verdura...). sodio (mg) -> sal (g) */
function deUSDA(F) {
  if (!F) return null;
  var nu = { por: "100 g", fuente: "USDA", generico: F.nombre };
  ["kcal", "prot", "hc", "grasa", "fibra", "azucar", "vitC", "folato", "hierro", "magnesio", "potasio", "b12", "vitD", "calcio"].forEach(function (k) { if (num(F.n[k]) != null) nu[k] = F.n[k]; });
  if (num(F.n.sodio) != null) nu.sal = Math.round(F.n.sodio * 2.5) / 1000;
  if (F.ud) { nu.porcionG = F.ud; nu.porcionTxt = "1 unidad (" + F.ud + " g, estimado)"; }
  nu.incompleta = incompleta(nu);
  return nu;
}

return { CAMPOS: CAMPOS, BASICOS: BASICOS, incompleta: incompleta, fichaFilas: fichaFilas, conFicha: conFicha, deUSDA: deUSDA,
  mezcla: mezcla, vivos: vivos, porCodigo: porCodigo, porNombre: porNombre, nombres: nombres, limpiaNombre: limpiaNombre,
  sugiere: sugiere, formato: formato, registra: registra, renombra: renombra, cantDoble: cantDoble };
});
