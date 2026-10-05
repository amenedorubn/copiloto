/* ===========================================================================
   CARRILES · el plan de una receta con varias cosas a la vez (v2.35)
   ---------------------------------------------------------------------------
   Una comida escrita con apartados "CARRIL AGUA (olla)", "CARRIL SALSA
   (sartén)" y "AL JUNTAR" (ver docs/RECETAS-CALENDARIO.md) llega de receta.js
   con cada paso clasificado: dur_s, manos_s, aguanta_s, fuego, rec, aparato y
   tras. Aqui se decide CUANDO va cada paso:
     1. hacia delante, lo antes posible: las manos hacen una cosa a la vez, y
        hay tantos fuegos, sartenes, ollas, micros... como diga "Mi cocina";
        un carril que pone la olla al fuego la tiene (y el fuego) hasta su
        ultimo paso con ella, aunque espere entre medias;
     2. hacia atras: lo que no espera (la pasta) se retrasa para acabar justo
        cuando lo necesita el siguiente paso, sin pisar las manos.
   Mientras cocinas se vuelve a planificar desde ahora con lo que ya ha pasado
   (fijos): si vas tarde, todo lo que queda se mueve, y la pasta sigue sin
   esperar. Logica pura: node la carga para los tests (tests/carriles.test.mjs).
   =========================================================================== */
(function (raiz, fabrica) {
  var X = fabrica();
  if (typeof module === "object" && module.exports) module.exports = X;
  else raiz.Carriles = X;
})(typeof window !== "undefined" ? window : this, function () {
"use strict";

/* "Mi cocina": lo que hay (se cambia en la app). La olla pequena: capacidad sin medir. */
var COCINA = {
  fuegos: 4, horno: 1, micro: 1, airfryer: 1, picadora: 1, batidora: 1,
  sarten: 1, olla: 2, tazas: 3,
  notas: { fuegos: "1 grande y 3 pequeños", sarten: "28 cm, sin tapa", olla: "2 L y una pequeña (~1 L, sin medir)" }
};
var PASO_S = 5, MAX_S = 6 * 3600;

function capacidad(cocina, r) { var n = cocina && cocina[r]; return n == null ? 1 : Math.max(0, n | 0); }

/* La receta de receta.js -> {carriles:[{id, nombre, rec}], tareas:[T], union, problemas}
   T = {id, k (indice en R.pasos), carril, n, txt, dur, manos, aguanta, fuego, rec, aparato, tras:[id]} */
function modelo(R) {
  if (!R || !R.carriles || !R.carriles.length) return null;
  var pasos = R.pasos || [], tareas = [], ult = {}, porCarril = {};
  var lanes = R.carriles.filter(function (c) { return c.id !== "union"; });
  pasos.forEach(function (p, k) {
    if (!p.carril || p.dur_s == null) return;
    // v2.58: el texto entero del paso (el titulo se corta en el primer ":" y se perdia lo que va detras)
    var T = { id: "t" + k, k: k, carril: p.carril, n: p.nCarril, txt: p.detalle || p.titulo, dur: p.dur_s, manos: Math.min(p.manos_s, p.dur_s),
              aguanta: p.aguanta_s == null ? null : p.aguanta_s, fuego: !!p.fuego, rec: p.rec || null, aparato: p.aparato || null,
              tras: [], trasCarril: (p.tras || []).slice(), supuesto: !!p.tiempoSupuesto, despues: p.tipo === "despues" };
    (porCarril[T.carril] = porCarril[T.carril] || []).push(T);
    tareas.push(T);
  });
  // dentro de un carril, en orden; "(tras SALSA)" espera al ultimo paso de SALSA. Lo que va detras
  // de algo que no espera (escurrir la pasta) tampoco espera
  Object.keys(porCarril).forEach(function (c) {
    porCarril[c].forEach(function (T, i) {
      if (!i) return;
      var A = porCarril[c][i - 1];
      T.tras.push(A.id);
      if (A.aguanta != null && T.aguanta == null) T.aguanta = A.aguanta;
    });
    ult[c] = porCarril[c][porCarril[c].length - 1];
  });
  tareas.forEach(function (T) {
    T.trasCarril.forEach(function (c) { if (ult[c] && ult[c].id !== T.id && T.tras.indexOf(ult[c].id) < 0) T.tras.push(ult[c].id); });
    delete T.trasCarril;
  });
  // AL JUNTAR: su primer paso espera a todos los carriles
  var U = porCarril.union || [];
  if (U.length) lanes.forEach(function (c) { if (ult[c.id]) U[0].tras.push(ult[c.id].id); });
  // un ciclo de "(tras ...)" no se puede cocinar: se quita lo que lo cierra
  var estado = {}, porId = {};
  tareas.forEach(function (T) { porId[T.id] = T; });
  function visita(T) {
    estado[T.id] = 1;
    T.tras = T.tras.filter(function (d) { if (estado[d] === 1) return false; if (!estado[d]) visita(porId[d]); return true; });
    estado[T.id] = 2;
  }
  tareas.forEach(function (T) { if (!estado[T.id]) visita(T); });
  // hasta donde tiene cada carril su fuego y su recipiente
  Object.keys(porCarril).forEach(function (c) {
    var L = porCarril[c];
    ["fuego", "rec"].forEach(function (r) {
      var usa = L.filter(function (T) { return r === "fuego" ? T.fuego : !!T.rec; });
      if (!usa.length) return;
      var ini = L.indexOf(usa[0]), fin = L.indexOf(usa[usa.length - 1]);
      for (var i = ini; i <= fin; i++) L[i]["sujeta_" + r] = r === "fuego" ? true : usa[0].rec;
    });
  });
  return { titulo: R.titulo || "", carriles: R.carriles.slice(), tareas: tareas,
           problemas: (R.problemas || []).filter(function (p) { return p.tipo === "carril"; }) };
}

/* -> {ini:{id:s}, fin:{id:s}, total:s, lineal:s}. fijos = {id:{ini, fin}} (lo que ya paso o esta
   pasando, en s desde que empezaste); desde = ahora, en s.
   Lo que no espera se planifica hacia atras repitiendo la pasada hacia delante con un "no antes de"
   para cada cosa que no espera: la que acabe antes de tiempo se vuelve a poner para acabar justo
   cuando la usa el paso siguiente. Asi nunca se pisan las manos, los fuegos ni los recipientes. */
function planifica(M, cocina, fijos, desde) {
  cocina = cocina || COCINA; fijos = fijos || {}; desde = Math.max(0, desde || 0);
  var sig = {};
  M.tareas.forEach(function (x) { x.tras.forEach(function (d) { (sig[d] = sig[d] || []).push(x.id); }); });
  var rel = {}, P = pase(M, cocina, fijos, desde, rel), P0 = P;
  for (var i = 0; i < 6; i++) {
    var cambia = false;
    M.tareas.forEach(function (x) {
      if (x.aguanta == null || fijos[x.id] || !sig[x.id]) return;
      var lim = Math.min.apply(null, sig[x.id].map(function (s) { return P.ini[s]; }));
      if (lim - P.fin[x.id] <= x.aguanta) return;
      var r = Math.floor((lim - x.dur) / PASO_S) * PASO_S;
      if (r > (rel[x.id] || 0)) { rel[x.id] = r; cambia = true; }
    });
    if (!cambia) break;
    var Q = pase(M, cocina, fijos, desde, rel);
    if (Q.total > P0.total + 60) break;          // retrasar no puede alargar la comida
    P = Q;
  }
  return P;
}
function pase(M, cocina, fijos, desde, rel) {
  var T = M.tareas, ini = {}, fin = {}, puesto = {}, porId = {}, sig = {}, resto = {};
  T.forEach(function (x) { porId[x.id] = x; x.tras.forEach(function (d) { (sig[d] = sig[d] || []).push(x.id); }); });
  function rest(x) {
    if (resto[x.id] != null) return resto[x.id];
    resto[x.id] = x.dur + Math.max.apply(null, [0].concat((sig[x.id] || []).map(function (s) { return rest(porId[s]); })));
    return resto[x.id];
  }
  T.forEach(rest);
  Object.keys(fijos).forEach(function (id) { if (porId[id]) { ini[id] = fijos[id].ini; fin[id] = fijos[id].fin; puesto[id] = true; } });

  function manosLibres(a, b, sin) {
    // v2.58: lo que ya hiciste (fijo) ocupa las manos hasta que acabó, no lo que decía la receta
    return !T.some(function (x) { return puesto[x.id] && x.id !== sin && x.manos > 0 && ini[x.id] < b && a < ini[x.id] + Math.min(x.manos, fin[x.id] - ini[x.id]); });
  }
  // un carril sujeta un fuego o un recipiente desde su primer paso con el hasta que acaba el ultimo
  function sujetan(r, valor, t, sin) {
    var lanes = {};
    T.forEach(function (x) {
      if (!puesto[x.id] || x.carril === sin || !x["sujeta_" + r] || (valor && x["sujeta_" + r] !== valor)) return;
      var L = T.filter(function (y) { return y.carril === x.carril && y["sujeta_" + r]; });
      var a = Math.min.apply(null, L.filter(function (y) { return puesto[y.id]; }).map(function (y) { return ini[y.id]; }));
      var ultimo = L[L.length - 1], b = puesto[ultimo.id] ? fin[ultimo.id] : Infinity;
      if (a <= t && t < b) lanes[x.carril] = 1;
    });
    return Object.keys(lanes).length;
  }
  function yaLoTiene(x, r) { return T.some(function (y) { return y.carril === x.carril && y.id !== x.id && puesto[y.id] && y["sujeta_" + r]; }); }
  function aparatoLibre(x, a) {
    if (!x.aparato) return true;
    var n = T.filter(function (y) { return puesto[y.id] && y.id !== x.id && y.aparato === x.aparato && ini[y.id] < a + x.dur && a < fin[y.id]; }).length;
    return n < capacidad(cocina, x.aparato);
  }
  function cabe(x, a) {
    if (!manosLibres(a, a + x.manos, x.id) || !aparatoLibre(x, a)) return false;
    if (x.sujeta_fuego && !yaLoTiene(x, "fuego") && sujetan("fuego", null, a, x.carril) >= capacidad(cocina, "fuegos")) return false;
    if (x.sujeta_rec && !yaLoTiene(x, "rec") && sujetan("rec", x.sujeta_rec, a, x.carril) >= capacidad(cocina, x.sujeta_rec)) return false;
    return true;
  }
  // v2.58: lo que solo pide un momento de manos y luego espera (poner el agua a hervir) va antes que
  // una tarea larga de manos: así la espera corre mientras cortas
  function arranca(x) { return x.manos <= 60 && x.dur - x.manos >= 120 && !(rel[x.id] > 0) ? 1 : 0; }
  function pon(x, a) { ini[x.id] = a; fin[x.id] = a + x.dur; puesto[x.id] = true; }

  var t = Math.ceil(desde / PASO_S) * PASO_S, quedan = T.filter(function (x) { return !puesto[x.id]; });
  while (quedan.length && t < desde + MAX_S) {
    var listas = quedan.filter(function (x) { return (rel[x.id] || 0) <= t && x.tras.every(function (d) { return puesto[d] && fin[d] <= t; }); })
      .sort(function (a, b) { return arranca(b) - arranca(a) || resto[b.id] - resto[a.id] || a.manos - b.manos || T.indexOf(a) - T.indexOf(b); });
    listas.forEach(function (x) { if (!puesto[x.id] && cabe(x, t)) pon(x, t); });
    quedan = quedan.filter(function (x) { return !puesto[x.id]; });
    t += PASO_S;
  }
  quedan.forEach(function (x) { pon(x, t); });        // no deberia pasar: que no se pierda nada
  var total = Math.max.apply(null, [0].concat(T.map(function (x) { return fin[x.id]; })));
  var lineal = T.reduce(function (s, x) { return s + x.dur; }, 0);
  return { ini: ini, fin: fin, total: total, lineal: lineal };
}

/* Lo que se ve mientras cocinas, a los "ahora" s:
   hechas = {id: true} (acciones ya hechas: la parte de manos de cada tarea)
   -> {ahora: T | null, cuando: s, mientras: [T con espera en marcha], luego: [T], acabado: bool} */
function momento(M, P, hechas, ahora) {
  var pend = M.tareas.filter(function (x) { return !hechas[x.id]; }).sort(function (a, b) { return P.ini[a.id] - P.ini[b.id]; });
  var mientras = M.tareas.filter(function (x) { return hechas[x.id] && P.fin[x.id] > ahora && x.manos < x.dur; })
    .sort(function (a, b) { return P.fin[a.id] - P.fin[b.id]; });
  return { ahora: pend[0] || null, cuando: pend[0] ? P.ini[pend[0].id] : null, mientras: mientras, luego: pend.slice(1, 4),
           acabado: !pend.length && !mientras.length };
}

/* Las frases del plan de antes de empezar: por donde empiezas y lo que se calcula hacia atras */
function explica(M, P) {
  var orden = M.tareas.slice().sort(function (a, b) { return P.ini[a.id] - P.ini[b.id]; });
  var nom = {}; M.carriles.forEach(function (c) { nom[c.id] = c.nombre; });
  var out = [];
  if (orden[0]) out.push({ tipo: "empieza", T: orden[0], carril: nom[orden[0].carril] });
  // lo que no espera, sin lo que va detras en su carril (escurrir la pasta)
  M.tareas.forEach(function (x) {
    if (x.aguanta == null) return;
    var antes = M.tareas.filter(function (y) { return y.carril === x.carril && y.n === x.n - 1; })[0];
    if (antes && antes.aguanta != null) return;
    out.push({ tipo: "justo", T: x, carril: nom[x.carril], ini: P.ini[x.id] });
  });
  return out;
}

return { COCINA: COCINA, modelo: modelo, planifica: planifica, momento: momento, explica: explica, capacidad: capacidad };
});
