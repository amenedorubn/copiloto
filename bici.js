/* ===========================================================================
   BICI · el copiloto de la bici de spinning (BODY BIKE) (v2.75)
   ---------------------------------------------------------------------------
   Sustituye a la app de BODY BIKE: Copiloto se conecta a la bici por Bluetooth,
   lee vatios y cadencia y te lleva por la sesion del calendario «Entreno»
   (bloque #copiloto con "tipo": "bici") diciendote con la voz si subes, bajas
   o vas bien. Sin plan, "Bici libre": pantalla y datos, y la voz cada 5 min.

   De donde salen los datos (por orden):
     1. el APK: BiciBle.java (Nativo.bici) pasa cada medida en bruto;
     2. Chrome: Web Bluetooth (navigator.bluetooth);
     3. "Probar sin bici": vatios inventados alrededor del objetivo, para ver la
        pantalla y oir la voz en casa.
   La bici habla Bluetooth estandar: potencia de ciclismo (0x2A63: vatios y
   vueltas de biela, de ahi la cadencia) y/o FTMS (0x2AD2: velocidad, cadencia y
   vatios). Las dos se leen aqui, en JS: se prueban con node (tests/bici.test.mjs).

   La distancia: con FTMS, la velocidad de la bici; si no, la que daria esa
   potencia en llano (80 kg, posicion de ruta), como hace la app de BODY BIKE.

   Las pulsaciones no: el reloj (Huawei) no las comparte. La actividad del reloj
   se junta luego con esta en Strava (fase 2).
   =========================================================================== */
(function (raiz, fabrica) {
  var X = fabrica(raiz);
  if (typeof module === "object" && module.exports) module.exports = X;
  else raiz.Bici = X;
})(typeof window !== "undefined" ? window : this, function (raiz) {
"use strict";

/* ============================== 1 · LEER LA BICI ============================== */

function u16(b, i) { return b[i] | (b[i + 1] << 8); }
function s16(b, i) { var v = u16(b, i); return v > 32767 ? v - 65536 : v; }
function u24(b, i) { return b[i] | (b[i + 1] << 8) | (b[i + 2] << 16); }

/* FTMS · Indoor Bike Data (0x2AD2): TODO lo que puede mandar una bici estatica.
   {kmh, kmhMedia, cad, cadMedia, distBici (m), resist, w, wMedia, kcal, kcalHora,
    kcalMin, fc, met, tBici (s), tQueda (s)} — solo los campos que traiga.       */
function leeFTMS(b) {
  if (!b || b.length < 2) return {};
  var f = u16(b, 0), i = 2, o = {}, L = b.length;
  function hay(n) { return i + n <= L; }
  if (!(f & 1)) { if (!hay(2)) return o; o.kmh = u16(b, i) / 100; i += 2; }      // bit 0 = 0: velocidad
  if (f & 2) { if (!hay(2)) return o; o.kmhMedia = u16(b, i) / 100; i += 2; }
  if (f & 4) { if (!hay(2)) return o; o.cad = u16(b, i) / 2; i += 2; }
  if (f & 8) { if (!hay(2)) return o; o.cadMedia = u16(b, i) / 2; i += 2; }
  if (f & 16) { if (!hay(3)) return o; o.distBici = u24(b, i); i += 3; }
  if (f & 32) { if (!hay(2)) return o; o.resist = s16(b, i); i += 2; }
  if (f & 64) { if (!hay(2)) return o; o.w = s16(b, i); i += 2; }
  if (f & 128) { if (!hay(2)) return o; o.wMedia = s16(b, i); i += 2; }
  if (f & 256) {
    if (!hay(5)) return o;
    var tot = u16(b, i), hora = u16(b, i + 2), min = b[i + 4];
    if (tot !== 0xffff) o.kcal = tot;
    if (hora !== 0xffff) o.kcalHora = hora;
    if (min !== 0xff) o.kcalMin = min;
    i += 5;
  }
  if (f & 512) { if (!hay(1)) return o; if (b[i]) o.fc = b[i]; i += 1; }
  if (f & 1024) { if (!hay(1)) return o; o.met = b[i] / 10; i += 1; }
  if (f & 2048) { if (!hay(2)) return o; o.tBici = u16(b, i); i += 2; }
  if (f & 4096) { if (!hay(2)) return o; o.tQueda = u16(b, i); i += 2; }
  return o;
}

/* Cycling Power Measurement (0x2A63): todo lo que traiga.
   {w, balance (% pierna izq.), par (Nm acumulado), rueda {rev, t}, biela {rev, t}
    (t en 1/1024 s), fuerzaMax/Min (N), parMax/Min (Nm), puntoMuertoArriba/Abajo (º), kj} */
function leePotencia(b) {
  if (!b || b.length < 4) return {};
  var f = u16(b, 0), i = 4, o = { w: s16(b, 2) }, L = b.length;
  function hay(n) { return i + n <= L; }
  if (f & 1) { if (!hay(1)) return o; o.balance = b[i] / 2; i += 1; }
  if (f & 4) { if (!hay(2)) return o; o.par = u16(b, i) / 32; i += 2; }
  if (f & 16) { if (!hay(6)) return o; o.rueda = { rev: u16(b, i) + u16(b, i + 2) * 65536, t: u16(b, i + 4) / 2 }; i += 6; }
  if (f & 32) { if (!hay(4)) return o; o.biela = { rev: u16(b, i), t: u16(b, i + 2) }; i += 4; }
  if (f & 64) { if (!hay(4)) return o; o.fuerzaMax = s16(b, i); o.fuerzaMin = s16(b, i + 2); i += 4; }
  if (f & 128) { if (!hay(4)) return o; o.parMax = s16(b, i) / 32; o.parMin = s16(b, i + 2) / 32; i += 4; }
  if (f & 256) i += 3;                                       // angulos extremos
  if (f & 512) { if (!hay(2)) return o; o.puntoMuertoArriba = u16(b, i); i += 2; }
  if (f & 1024) { if (!hay(2)) return o; o.puntoMuertoAbajo = u16(b, i); i += 2; }
  if (f & 2048) { if (!hay(2)) return o; o.kj = u16(b, i); i += 2; }
  return o;
}

/* Lo que se enseña aparte de vatios y cadencia, por orden, si la bici lo manda. */
var EXTRAS = [
  ["kmh", "Km/h", function (v) { return v.toFixed(1).replace(".", ","); }],
  ["resist", "Resistencia", function (v) { return String(v); }],
  ["fc", "Pulso (bici)", function (v) { return String(v); }],
  ["kcal", "Kcal (bici)", function (v) { return String(v); }],
  ["balance", "Pierna izq.", function (v) { return Math.round(v) + " %"; }],
  ["kj", "kJ (bici)", function (v) { return String(v); }],
  ["met", "MET", function (v) { return v.toFixed(1).replace(".", ","); }],
  ["distBici", "Km (bici)", function (v) { return (v / 1000).toFixed(2).replace(".", ","); }]
];
var NOMBRES = { kmh: "velocidad", kmhMedia: "velocidad media", cad: "cadencia", cadMedia: "cadencia media", distBici: "distancia",
  resist: "resistencia", w: "vatios", wMedia: "vatios medios", kcal: "calorías", kcalHora: "kcal/h", kcalMin: "kcal/min",
  fc: "pulsaciones", met: "MET", tBici: "tiempo", tQueda: "tiempo que queda", balance: "balance de piernas", par: "par",
  rueda: "vueltas de rueda", biela: "vueltas de biela", fuerzaMax: "fuerza", parMax: "par máximo",
  puntoMuertoArriba: "punto muerto", kj: "energía" };

/* El lector junta lo que llega y da {w, cad, kmh, ...todo lo demas} al momento. La
   cadencia de la potencia sale de cuantas vueltas da la biela entre dos medidas; si
   deja de moverse 3 s, es 0. Si llega FTMS con velocidad o cadencia, manda esa.
   vistos: que campos ha mandado la bici alguna vez (para contarlo al final).    */
function Lector() {
  var biela = null, ultVuelta = -1e15, act = { w: 0, cad: 0, kmh: null, t: 0 }, ftmsCad = -1e15, x = {}, vistos = {};
  function copia(o) {
    for (var k in o) if (o[k] != null && k !== "biela" && k !== "rueda") { x[k] = o[k]; vistos[k] = 1; }
    if (o.biela) vistos.biela = 1; if (o.rueda) vistos.rueda = 1;
  }
  function sale(viejo) {
    var r = { w: viejo ? 0 : act.w, cad: viejo ? 0 : act.cad, kmh: viejo ? null : act.kmh, t: act.t };
    if (!viejo) for (var k in x) if (!(k in r)) r[k] = x[k];
    return r;
  }
  return {
    procesa: function (tipo, bytes, t) {
      t = t || Date.now();
      if (tipo === "ftms") {
        var f = leeFTMS(bytes); copia(f);
        if (f.w != null) act.w = Math.max(0, f.w);
        if (f.kmh != null) act.kmh = f.kmh;
        if (f.cad != null) { act.cad = f.cad; ftmsCad = t; }
      } else if (tipo === "potencia") {
        var p = leePotencia(bytes); copia(p);
        if (p.w != null) act.w = Math.max(0, p.w);
        if (p.biela && t - ftmsCad > 3000) {            // con FTMS dando cadencia, manda esa
          if (biela) {
            var dr = (p.biela.rev - biela.rev + 65536) % 65536;
            var dt = (p.biela.t - biela.t + 65536) % 65536;
            if (dr > 0 && dt > 0 && dr < 20) { act.cad = Math.round(dr * 60 * 1024 / dt); ultVuelta = t; }
          }
          biela = p.biela;
        }
      }
      if (t - ultVuelta > 3000 && t - ftmsCad > 3000) act.cad = 0;
      act.t = t;
      return sale(false);
    },
    ahora: function (t) { t = t || Date.now(); return sale(t - act.t > 4000); },   // sin noticias 4 s: 0
    vistos: function () { return Object.keys(vistos); }
  };
}

/* Velocidad en llano para una potencia (m/s): P = (Crr·m·g + ½·ρ·CdA·v²)·v */
function velDePotencia(w) {
  if (!(w > 0)) return 0;
  var a = 0.5 * 1.225 * 0.32, b = 0.004 * 80 * 9.81, v = 8;
  for (var k = 0; k < 30; k++) {
    var f = a * v * v * v + b * v - w, d = 3 * a * v * v + b;
    v -= f / d; if (v < 0.1) v = 0.1;
  }
  return v;
}

/* ============================== 2 · EL PLAN ============================== */
// Del calendario llega {tipo:"bici", nombre, bloques:[{tipo, nombre, vatios, cad:[min,max], seg}]}
var COLT = { calentar: "#5a9be0", serie: "#ef6a60", suave: "#8bd17c", trote: "#8bd17c", enfriar: "#5a9be0", libre: "#e0a33b" };
function sesionDe(plan, uid, titulo) {
  return { id: "cal-" + (uid || "x"), nombre: plan.nombre || titulo || "Bici", deCal: true,
           bloques: (plan.bloques || []).map(function (b) {
             return { tipo: b.tipo, nombre: b.nombre, vatios: b.vatios, cad: b.cad || null, seg: b.seg };
           }) };
}
var LIBRE = { id: "libre", nombre: "Bici libre", libre: true, bloques: [] };
var PRUEBA = { id: "prueba", nombre: "Prueba · bloques de 30 s", bloques: [
  { tipo: "calentar", nombre: "Calentamiento", vatios: 120, cad: [80, 90], seg: 30 },
  { tipo: "serie", nombre: "Serie 1", vatios: 220, cad: [90, 100], seg: 30 },
  { tipo: "suave", nombre: "Suave 1", vatios: 130, cad: [80, 90], seg: 30 },
  { tipo: "serie", nombre: "Serie 2", vatios: 220, cad: [90, 100], seg: 30 },
  { tipo: "enfriar", nombre: "Enfriar", vatios: 100, cad: [75, 85], seg: 30 }
] };

/* ============================== 3 · LA VOZ QUE GUIA ==============================
   Mira la media de 10 s contra el objetivo del bloque:
   - al empezar un bloque (15 s) y al final (8 s) no corrige: estas cambiando;
   - fuera de margen (±10 W o ±7 %, lo que sea mas) 8 s seguidos -> corrige,
     y no mas de una vez cada 20 s; dice QUE tocar segun la cadencia:
       pocos vatios con cadencia baja  -> pedalea mas rapido
       pocos vatios con buena cadencia -> mas resistencia
       muchos vatios con cadencia alta -> baja cadencia
       muchos vatios con buena cadencia -> quita resistencia
   - vatios bien pero cadencia fuera del rango -> la cadencia;
   - tras corregir, 5 s dentro -> "Así, vas bien";
   - en una serie larga sin nada que corregir, cada 2,5 min un "vas bien".     */
function margen(obj) { return Math.max(10, Math.round(obj * 0.07)); }
function Guia() {
  var prob = null, desde = 0, ult = -1e9, corregido = false, dentro = 0, animo = 0, bloque = -1;
  function frase(p, o, x) {
    var c = o.cad, cadTxt = c ? c[0] + " a " + c[1] : "";
    if (p === "w-") return c && x.cad < c[0] ? "Pedalea más rápido, cadencia " + cadTxt + "."
                                              : "Sube resistencia. Objetivo " + o.vatios + " vatios.";
    if (p === "w+") return c && x.cad > c[1] ? "Baja la cadencia, " + cadTxt + "."
                                              : "Quita resistencia. Objetivo " + o.vatios + " vatios.";
    if (p === "c-") return "Cadencia un poco más alta, " + cadTxt + ".";
    if (p === "c+") return "Cadencia un poco más baja, " + cadTxt + ".";
    return null;
  }
  return {
    // x = {i (bloque), t (s dentro del bloque), seg, o (objetivo {vatios, cad, tipo}), w, cad (medias de 10 s), ms}
    paso: function (x) {
      var o = x.o; if (!o || !o.vatios) return null;
      if (x.i !== bloque) { bloque = x.i; prob = null; corregido = false; dentro = 0; animo = x.ms; }
      if (x.t < 15 || x.seg - x.t < 8 || !(x.w > 0)) { prob = null; return null; }
      var dw = x.w - o.vatios, tol = margen(o.vatios), p = null;
      if (Math.abs(dw) > tol) p = dw < 0 ? "w-" : "w+";
      else if (o.cad && x.cad > 0 && x.cad < o.cad[0] - 3) p = "c-";
      else if (o.cad && x.cad > o.cad[1] + 3) p = "c+";
      if (p) {
        dentro = 0;
        if (p !== prob) { prob = p; desde = x.ms; }
        if (x.ms - desde >= 8000 && x.ms - ult >= 20000) { ult = x.ms; animo = x.ms; corregido = true; return frase(p, o, x); }
        return null;
      }
      prob = null;
      if (!dentro) dentro = x.ms;
      if (corregido && x.ms - dentro >= 5000 && x.ms - ult >= 8000) { corregido = false; ult = x.ms; animo = x.ms; return "Así, vas bien."; }
      if (o.tipo === "serie" && x.ms - animo >= 150000 && x.ms - ult >= 60000) { ult = x.ms; animo = x.ms; return "Vas bien, aguanta."; }
      return null;
    }
  };
}

/* Para decir duraciones: 180 -> "3 minutos", 90 -> "1 minuto 30", 45 -> "45 segundos" */
function durVoz(s) {
  s = Math.round(s); var m = Math.floor(s / 60), r = s % 60;
  if (!m) return s + " segundos";
  return (m === 1 ? "1 minuto" : m + " minutos") + (r ? " " + r : "");
}
function anuncio(b, n, de) {
  var t = b.nombre;
  if (n && de > 1) t += (/\d/.test(t) ? "" : " " + n) + " de " + de;     // "Serie" -> "Serie 2 de 5"
  t += ". " + b.vatios + " vatios";
  if (b.cad) t += ", cadencia " + b.cad[0] + " a " + b.cad[1];
  return t + ". " + durVoz(b.seg) + ".";
}

/* ============================== 4 · EL ARCHIVO ==============================
   TCX con vatios y cadencia segundo a segundo, para Strava (y para juntarlo
   luego con las pulsaciones del reloj).
   M = [[seg, vatios, cadencia, metros, ms reales], ...]; fc(ms) -> pulsaciones o null */
function tcx(M, inicioMs, fc) {
  var iso = function (ms) { return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z"); };
  var n = M.length, sw = 0, sc = 0, nc = 0, pts = [], sh = 0, nh = 0, mh = 0;
  if (n && M[0][4]) inicioMs = M[0][4];
  for (var i = 0; i < n; i++) {
    var m = M[i], ms = m[4] || inicioMs + m[0] * 1000, h = fc ? fc(ms) : (m[5] || null);
    sw += m[1]; if (m[2] > 0) { sc += m[2]; nc++; }
    if (h) { sh += h; nh++; if (h > mh) mh = h; }
    pts.push("<Trackpoint><Time>" + iso(ms) + "</Time><DistanceMeters>" + m[3].toFixed(1) +
      "</DistanceMeters>" + (h ? "<HeartRateBpm><Value>" + h + "</Value></HeartRateBpm>" : "") +
      "<Cadence>" + Math.round(m[2]) + "</Cadence><Extensions><ns3:TPX><ns3:Watts>" + Math.round(m[1]) +
      "</ns3:Watts></ns3:TPX></Extensions></Trackpoint>");
  }
  var dur = n ? M[n - 1][0] : 0, dist = n ? M[n - 1][3] : 0;
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">\n' +
    '<Activities><Activity Sport="Biking"><Id>' + iso(inicioMs) + '</Id><Lap StartTime="' + iso(inicioMs) + '">' +
    '<TotalTimeSeconds>' + dur + '</TotalTimeSeconds><DistanceMeters>' + dist.toFixed(1) + '</DistanceMeters>' +
    '<Calories>' + Math.round(sw / 1000 / 0.24 / 4.184) + '</Calories>' +
    (nh ? '<AverageHeartRateBpm><Value>' + Math.round(sh / nh) + '</Value></AverageHeartRateBpm><MaximumHeartRateBpm><Value>' + mh + '</Value></MaximumHeartRateBpm>' : '') +
    '<Intensity>Active</Intensity>' +
    (nc ? '<Cadence>' + Math.round(sc / nc) + '</Cadence>' : '') + '<TriggerMethod>Manual</TriggerMethod>' +
    '<Track>' + pts.join("") + '</Track></Lap>' +
    '<Creator xsi:type="Device_t" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><Name>Copiloto · BODY BIKE</Name></Creator>' +
    '</Activity></Activities></TrainingCenterDatabase>\n';
}
/* Las pulsaciones del reloj (lo que da /pulsos: inicio en ms y t en s desde ahi)
   en cualquier instante: interpoladas entre las dos medidas de alrededor; fuera
   de lo que grabo el reloj, la mas cercana si esta a menos de 15 s. */
function fcDe(P) {
  var t = P.t, b = P.bpm, n = t.length;
  return function (ms) {
    var x = (ms - P.inicio) / 1000, lo = 0, hi = n - 1;
    if (!n) return null;
    if (x <= t[0]) return x > t[0] - 15 ? b[0] : null;
    if (x >= t[hi]) return x < t[hi] + 15 ? b[hi] : null;
    while (hi - lo > 1) { var mi = (lo + hi) >> 1; if (t[mi] <= x) lo = mi; else hi = mi; }
    var f = (x - t[lo]) / Math.max(1, t[hi] - t[lo]);
    return Math.round(b[lo] + (b[hi] - b[lo]) * f);
  };
}
/* M = [seg, vatios, cadencia, metros, ms, fc de la bici, km/h de la bici, resistencia, kcal de la bici] */
function resumenDe(M) {
  var n = M.length, sw = 0, sc = 0, nc = 0, wMax = 0, cMax = 0, sh = 0, nh = 0, hMax = 0, kcal = null, w20 = 0;
  for (var i = 0; i < n; i++) {
    var m = M[i]; sw += m[1]; if (m[1] > wMax) wMax = m[1];
    if (m[2] > 0) { sc += m[2]; nc++; if (m[2] > cMax) cMax = m[2]; }
    if (m[5]) { sh += m[5]; nh++; if (m[5] > hMax) hMax = m[5]; }
    if (m[8] != null) kcal = m[8];
  }
  // mejores 5 min (o lo que haya): potencia media mas alta en una ventana
  var V = Math.min(300, n), acc = 0;
  for (i = 0; i < n; i++) { acc += M[i][1]; if (i >= V) acc -= M[i - V][1]; if (i >= V - 1 && V && acc / V > w20) w20 = acc / V; }
  var r = { seg: n ? M[n - 1][0] : 0, km: n ? M[n - 1][3] / 1000 : 0, w: n ? Math.round(sw / n) : 0,
            kj: Math.round(sw / 1000), cad: nc ? Math.round(sc / nc) : 0 };
  r.wMax = Math.round(wMax); r.cadMax = Math.round(cMax); r.w5 = Math.round(w20);
  r.kcal = kcal != null ? kcal : Math.round(r.kj / 0.24 / 4.184);
  if (nh) { r.fc = Math.round(sh / nh); r.fcMax = hMax; }
  return r;
}

/* ============================ 4b · ELEGIR LA BICI ============================
   En un gimnasio hay varias BODY BIKE a la vez. El APK busca y avisa de cada bici
   que ve (biciVista); aqui se decide: si hay una sola, se conecta; si hay varias,
   se pregunta cual es (por el numero del nombre); si hay una recordada y aparece,
   va directa a esa.                                                               */
var ESPERA_VISTAS = 2500, ESPERA_MIA = 6000;
// "BODY BIKE 12" -> "12"; "BODYBIKE_007" -> "7"; sin numero -> ""
function numeroDe(nombre) {
  var m = String(nombre || "").match(/(\d+)\D*$/);
  return m ? String(parseInt(m[1], 10)) : "";
}
function barrasDe(rssi) { return rssi == null ? 1 : rssi >= -62 ? 3 : rssi >= -78 ? 2 : 1; }
/* Las bicis vistas en una busqueda. El orden (mas cerca primero) se fija al
   ordenar(); las que llegan despues van al final, para que la lista no salte
   mientras se elige. */
function Vistas() {
  var L = {}, orden = [];
  return {
    ve: function (d, t) {
      if (!d || !d.id) return false;
      var v = L[d.id], nueva = !v;
      if (nueva) { v = L[d.id] = { id: d.id, nombre: "", num: "", rssi: d.rssi, t0: t }; orden.push(d.id); }
      else if (d.rssi != null) v.rssi = v.rssi == null ? d.rssi : Math.round(v.rssi * 0.7 + d.rssi * 0.3);
      if (d.nombre && d.nombre !== v.nombre) { v.nombre = d.nombre; v.num = numeroDe(d.nombre); }
      v.t = t; return nueva;
    },
    ordena: function () { orden.sort(function (a, b) { return (L[b].rssi || -999) - (L[a].rssi || -999); }); },
    lista: function () { return orden.map(function (id) { return L[id]; }); },
    n: function () { return orden.length; },
    tiene: function (id) { return !!L[id]; }
  };
}
/* Que hacer ya: {accion: "espera"} | {accion: "conecta", id} | {accion: "elige"}
   o = {lista, mia (id recordado o null), ms (desde la primera vista), siempre (forzar lista)} */
function decideBici(o) {
  var L = o.lista || [];
  if (o.mia && !o.siempre) for (var i = 0; i < L.length; i++) if (L[i].id === o.mia) return { accion: "conecta", id: o.mia };
  if (!L.length) return { accion: "espera" };
  if (o.ms < ESPERA_VISTAS) return { accion: "espera" };
  if (o.siempre) return { accion: "elige" };
  if (o.mia && o.ms < ESPERA_MIA) return { accion: "espera" };      // dale tiempo a la tuya
  if (L.length === 1 && !o.mia) return { accion: "conecta", id: L[0].id };
  return { accion: "elige" };                                       // varias, o la tuya no esta
}

var API = { leeFTMS: leeFTMS, leePotencia: leePotencia, Lector: Lector, velDePotencia: velDePotencia,
            Guia: Guia, margen: margen, anuncio: anuncio, durVoz: durVoz, tcx: tcx, resumenDe: resumenDe, fcDe: fcDe,
            sesionDe: sesionDe, COLT: COLT, EXTRAS: EXTRAS, NOMBRES: NOMBRES,
            numeroDe: numeroDe, Vistas: Vistas, decideBici: decideBici, barrasDe: barrasDe };
if (typeof document === "undefined") return API;

/* ============================== 5 · LA PANTALLA ============================== */
var CSS = "" +
"#appBici{position:fixed;inset:0;z-index:60;background:#0a0b0d;color:#fff;display:flex;flex-direction:column;overflow:hidden;" +
"padding:calc(8px + var(--safe-area-inset-top,env(safe-area-inset-top,0px))) 12px calc(8px + var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)));" +
"font-family:Manrope,-apple-system,'Segoe UI',Roboto,sans-serif;font-variant-numeric:tabular-nums;-webkit-tap-highlight-color:transparent;--tipo:#5a9be0}" +
"#appBici.flash{background:var(--tipo)}" +
"#appBici button{flex:0 0 auto;color:#fff;background:#15171b;border:1px solid rgba(255,255,255,.12);min-height:58px;font-size:17px;font-weight:800;border-radius:16px;padding:8px 10px;font-family:inherit}" +
"#appBici button:active{background:#22262c}#appBici button:disabled{opacity:.4}" +
"#appBici .bkV{flex:1 1 auto;display:flex;flex-direction:column;min-height:0}" +
"#bkPre{justify-content:center;gap:10px;text-align:center}" +
"#bkPreT{font-size:clamp(26px,5.5vh,40px);font-weight:900;line-height:1.1}" +
"#bkPreD{font-size:clamp(15px,2.6vh,19px);font-weight:700;color:#8e939b}" +
"#bkPlan{display:flex;height:46px;gap:2px;align-items:flex-end;margin:6px 0}" +
"#bkPlan i{display:block;border-radius:3px;min-width:2px}" +
".bkCon{display:flex;align-items:center;gap:10px;justify-content:center;background:#15171b;border-radius:16px;padding:12px;font-size:16px;font-weight:800;min-height:52px}" +
".bkCon b{width:12px;height:12px;border-radius:50%;background:#6b7079;flex:0 0 auto}.bkCon.ok b{background:#3fbf6f}.bkCon.va b{background:#e0a33b}.bkCon.mal b{background:#e5484d}" +
".bkCon small{display:block;font-size:13px;font-weight:700;color:#8e939b;margin-top:2px}" +
"#bkElige{display:flex;flex-direction:column;gap:8px;background:#15171b;border-radius:16px;padding:10px}" +
".bkBici{display:flex!important;align-items:center;gap:12px;text-align:left;width:100%;min-height:62px!important;padding:8px 12px!important;background:transparent!important}" +
".bkBici .n{font-size:34px;font-weight:800;min-width:52px;text-align:center;line-height:1}" +
".bkBici .t{flex:1 1 auto;min-width:0}.bkBici .t span{display:block;font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
".bkBici .t small{display:block;font-size:12px;font-weight:700;color:#8e939b;margin-top:1px}" +
".bkBici .s{display:flex;gap:2px;align-items:flex-end;flex:0 0 auto}.bkBici .s i{width:4px;border-radius:1px;background:#3a3d44}.bkBici .s i.on{background:#fff}" +
"#bkRecuerda{display:flex;align-items:center;justify-content:space-between;min-height:44px;padding:0 4px;font-size:14px;font-weight:700;color:#b9bdc4;cursor:pointer}" +
"#bkRecuerda input{width:22px;height:22px;accent-color:#3fbf6f}" +
"#bkOtra,#bkOtraVez{min-height:46px!important;font-size:14px!important;background:transparent!important;color:#b9bdc4!important}" +
"#bkGo{min-height:84px!important;font-size:25px!important;background:#f4f5f7!important;color:#0a0b0d!important;border-color:#fff!important}" +
"#bkPrueba,#bkVolver{min-height:50px!important;font-size:15px!important;background:transparent!important;color:#b9bdc4!important}" +
".bkTop{display:flex;justify-content:space-between;align-items:center;flex:0 0 auto}" +
".bkPill{background:var(--tipo);color:#0a0b0d;border-radius:10px;padding:5px 11px;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}" +
".bkTot{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8e939b}" +
"#bkEst{flex:0 0 auto;margin-top:6px;text-align:center;font-size:14px;font-weight:800;border-radius:12px;padding:8px;background:#3a2a10;color:#ffd98a;border:1px solid #8a6a20}" +
".bkMain{flex:1 1 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:0;text-align:center}" +
"#bkLbl{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#8e939b}" +
"#bkW{font-size:clamp(96px,19vh,170px);font-weight:800;line-height:.92;letter-spacing:-.05em;transition:color .3s}" +
"#bkW.bajo{color:#5ab0ff}#bkW.alto{color:#ff8a6a}#bkW.bien{color:#7ee08f}" +
"#bkWu{font-size:18px;font-weight:800;color:#8e939b;margin-top:2px}" +
"#bkObj{margin-top:10px;font-size:clamp(17px,2.8vh,22px);font-weight:800;background:#15171b;border-radius:14px;padding:9px 16px}" +
"#bkObj b{color:var(--tipo)}" +
"#bkBarra{position:relative;width:min(86vw,420px);height:14px;border-radius:7px;background:rgba(255,255,255,.08);margin-top:14px}" +
"#bkBanda{position:absolute;top:0;bottom:0;background:rgba(126,224,143,.28);border-radius:7px}" +
"#bkAguja{position:absolute;top:-5px;width:4px;height:24px;margin-left:-2px;border-radius:2px;background:#fff;transition:left .4s}" +
".bkFila{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;flex:0 0 auto;margin-top:8px}" +
".bkFila>div{background:#15171b;border-radius:16px;padding:9px 4px;text-align:center}" +
".bkFila i{display:block;font-style:normal;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#8e939b}" +
".bkFila b{display:block;font-size:clamp(24px,4.4vh,34px);font-weight:800;margin-top:2px}" +
".bkFila b.fuera{color:#ffcf6a}" +
"#bkMas{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;flex:0 0 auto;margin-top:6px}" +
"#bkMas>div{background:#111316;border-radius:12px;padding:6px 2px;text-align:center}" +
"#bkMas i{display:block;font-style:normal;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#8e939b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
"#bkMas b{display:block;font-size:18px;font-weight:800;margin-top:1px}" +
"#bfMas{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}#bfMas>div{background:#15171b;border-radius:12px;padding:8px 2px;text-align:center}" +
"#bfMas i{display:block;font-style:normal;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#8e939b}#bfMas b{display:block;font-size:20px;font-weight:800;margin-top:2px}" +
"#bfVistos{font-size:12px;font-weight:700;color:#6b7079;line-height:1.35}" +
".bkLuego{flex:0 0 auto;background:#15171b;border-radius:16px;padding:10px 14px;margin-top:8px;display:flex;justify-content:space-between;gap:10px;font-size:15px;font-weight:800}" +
".bkLuego span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bkLuego em{font-style:normal;color:#8e939b}" +
"#bkPerfil{height:34px;display:flex;gap:2px;align-items:flex-end;margin-top:8px;position:relative;flex:0 0 auto}" +
"#bkPerfil i{display:block;border-radius:2px;min-width:2px}" +
"#bkMarca{position:absolute;top:0;bottom:0;width:2px;background:#fff}" +
"#bkCtl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;flex:0 0 auto}" +
"#bkFinBtn.arm{background:#e5484d!important;border-color:#e5484d!important}" +
"#bkFin{justify-content:center;gap:10px;text-align:center}" +
"#bkFin .tit{font-size:clamp(24px,5vh,36px);font-weight:900}" +
"#bkFin .bkFila{grid-template-columns:repeat(2,1fr)}" +
"#bkFin .nota{font-size:14px;font-weight:700;color:#8e939b;line-height:1.35}" +
"#bkFin{overflow-y:auto}#bfJunta{display:flex;flex-direction:column;gap:8px;text-align:left;margin-top:4px}" +
".bfPaso{display:flex;gap:12px;align-items:center;font-size:16px;font-weight:800;margin-top:6px}" +
".bfPaso>b{flex:0 0 auto;width:28px;height:28px;border-radius:50%;background:#e0a33b;color:#0a0b0d;display:flex;align-items:center;justify-content:center;font-size:15px}" +
".bfPaso.ok>b{background:#3fbf6f}.bfPaso small{display:block;font-size:13px;font-weight:700;color:#8e939b;margin-top:2px}" +
".bfBtn{display:flex;align-items:center;justify-content:center;min-height:56px;border-radius:16px;background:#15171b;border:1px solid rgba(255,255,255,.12);color:#fff;font-size:17px;font-weight:800;text-decoration:none}";

var HTML = "" +
'<div id="bkPre" class="bkV">' +
  '<div id="bkPreT">–</div><div id="bkPreD">–</div><div id="bkPlan"></div>' +
  '<div id="bkCon" class="bkCon"><b></b><div><span id="bkConT">Bici sin conectar</span><small id="bkConS"></small></div></div>' +
  '<div id="bkElige" hidden><div id="bkLista"></div>' +
    '<label id="bkRecuerda"><span>Recordar mi bici</span><input type="checkbox" id="bkRecuerdaC"></label>' +
    '<button id="bkOtraVez">Buscar otra vez</button></div>' +
  '<button id="bkConecta">Conectar la bici</button>' +
  '<button id="bkOtra" hidden>Cambiar de bici</button>' +
  '<button id="bkGo" disabled>Empezar</button>' +
  '<button id="bkPrueba">Probar sin bici</button>' +
  '<button id="bkVolver">Volver</button>' +
'</div>' +
'<div id="bkRun" class="bkV" hidden>' +
  '<div class="bkTop"><span id="bkTipo" class="bkPill">–</span><span class="bkTot"><span id="bkEl">0:00</span> · <span id="bkRe">–</span></span></div>' +
  '<div id="bkEst" hidden>–</div>' +
  '<div class="bkMain">' +
    '<div id="bkLbl">Vatios</div><div id="bkW">–</div><div id="bkWu">W · media 3 s</div>' +
    '<div id="bkObj">–</div>' +
    '<div id="bkBarra"><div id="bkBanda"></div><div id="bkAguja"></div></div>' +
  '</div>' +
  '<div class="bkFila"><div><i>Cadencia</i><b id="bkCad">–</b></div><div><i id="bkQL">Queda</i><b id="bkQ">–</b></div><div><i>Km</i><b id="bkKm">0,0</b></div></div>' +
  '<div id="bkMas" hidden></div>' +
  '<div class="bkLuego"><span id="bkSig">–</span><em id="bkSigT"></em></div>' +
  '<div id="bkPerfil"></div>' +
  '<div id="bkCtl"><button id="bkPausa">Pausa</button><button id="bkSalta">Saltar</button><button id="bkFinBtn">Terminar</button></div>' +
'</div>' +
'<div id="bkFin" class="bkV" hidden>' +
  '<div class="tit">Sesión terminada</div>' +
  '<div class="bkFila"><div><i>Tiempo</i><b id="bfT">0:00</b></div><div><i>Km</i><b id="bfK">0</b></div>' +
  '<div><i>Vatios media</i><b id="bfW">0</b></div><div><i>Cadencia media</i><b id="bfC">0</b></div></div>' +
  '<div id="bfMas"></div>' +
  '<div id="bfVistos"></div>' +
  '<div class="nota" id="bfNota">–</div>' +
  '<div id="bfJunta">' +
    '<div class="bfPaso" id="bfP1"><b>1</b><div><span id="bfP1T">Junta las pulsaciones del reloj</span><small id="bfP1S">Cuando el Huawei se haya sincronizado con Strava</small></div></div>' +
    '<button id="bfJuntar">Juntar con el reloj</button>' +
    '<div class="bfPaso" id="bfP2" hidden><b>2</b><div><span>Guarda el archivo</span><small id="bfP2S">Se queda en Descargas</small></div></div>' +
    '<button id="bfTcx" hidden>Guardar el archivo</button>' +
    '<div class="bfPaso" id="bfP3" hidden><b>3</b><div><span>Borra en Strava la del reloj</span><small id="bfP3S">–</small></div></div>' +
    '<a id="bfBorra" class="bfBtn" hidden>Abrir la del reloj en Strava</a>' +
    '<div class="bfPaso" id="bfP4" hidden><b>4</b><div><span>Sube el archivo</span><small>Archivo → elige el de Descargas → Guardar. Tipo: Ciclismo virtual</small></div></div>' +
    '<a id="bfSube" class="bfBtn" hidden href="https://www.strava.com/upload/select">Abrir la página de subida</a>' +
  '</div>' +
  '<button id="bfVolver">Volver al inicio</button>' +
'</div>';

var LS = "copiloto.bici.v1", LSH = "copiloto.bici.hechas", MAXEDAD = 6 * 3600 * 1000;
function E(id) { return document.getElementById(id); }
function MS(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
function HMS(s) { s = Math.max(0, Math.floor(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  return (h ? h + ":" + String(m).padStart(2, "0") : String(m)) + ":" + String(s % 60).padStart(2, "0"); }
function coma(x, n) { return x.toFixed(n).replace(".", ","); }

var montado = false;
function monta() {
  if (montado) return; montado = true;
  var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  var d = document.createElement("div"); d.id = "appBici"; d.hidden = true; d.innerHTML = HTML; document.body.appendChild(d);
  E("bkConecta").addEventListener("click", function () { audioOn(); conecta(); });
  E("bkLista").addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest(".bkBici"); if (!b) return;
    audioOn(); elige(b.getAttribute("data-id"), E("bkRecuerdaC").checked);
  });
  E("bkOtraVez").addEventListener("click", function () { audioOn(); Nativo.bici.corta(); buscaNativo(true); });
  E("bkOtra").addEventListener("click", function () { audioOn(); Nativo.bici.corta(); buscaNativo(true); });
  E("bkGo").addEventListener("click", function () { audioOn(); empieza(); });
  E("bkPrueba").addEventListener("click", function () { audioOn(); fuente = "prueba"; pintaCon("ok", "Modo prueba", "vatios inventados, sin bici"); empieza(); });
  E("bkVolver").addEventListener("click", sal);
  E("bkPausa").addEventListener("click", function () { audioOn(); pausa(); });
  E("bkSalta").addEventListener("click", function () { audioOn(); salta(); });
  E("bkFinBtn").addEventListener("click", function () {
    audioOn();
    if (armado && Date.now() - armado < 4000) { armado = 0; termina(false); }
    else { armado = Date.now(); E("bkFinBtn").textContent = "¿Seguro?"; E("bkFinBtn").className = "arm"; }
  });
  E("bfTcx").addEventListener("click", descarga);
  E("bfJuntar").addEventListener("click", juntar);
  E("bfVolver").addEventListener("click", function () { olvida(); sal(); });
}

/* ------------------------------ sonido y voz ------------------------------ */
var AC = null;
function audioOn() {
  try { if (!AC) { var K = window.AudioContext || window.webkitAudioContext; if (K) AC = new K(); }
        if (AC && AC.state === "suspended") AC.resume(); } catch (e) {}
}
function pip(f, dur, vol) {
  audioOn(); if (!AC || AC.state !== "running") return;
  try {
    var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + 0.01;
    o.type = "square"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.setValueAtTime(vol, t + dur - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.03);
  } catch (e) {}
}
function voz(txt) {
  try { var u = new SpeechSynthesisUtterance(txt); u.lang = "es-ES"; u.rate = 1.04; u.volume = 1;
        speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}
var wl = null;
function pantallaOn() {
  try { if ("wakeLock" in navigator) navigator.wakeLock.request("screen").then(function (l) { wl = l; }).catch(function () {}); } catch (e) {}
}
function pantallaOff() { try { if (wl) { wl.release(); wl = null; } } catch (e) {} }

/* ------------------------------ la bici ------------------------------ */
var fuente = null;            // "nativo" | "web" | "prueba"
var lector = Lector(), conEstado = "nada", wbDev = null;
/* elegir entre varias bicis (APK) */
var LSMIA = "copiloto.bici.mia";
var vistas = null, t1Vista = 0, revisaT = null, eligiendo = false, forzarLista = false, idElegida = null;
function mia() { try { var m = JSON.parse(localStorage.getItem(LSMIA) || "null"); return m && m.id ? m : null; } catch (e) { return null; } }
function guardaMia(v) { try { if (v) localStorage.setItem(LSMIA, JSON.stringify({ id: v.id, nombre: v.nombre, num: v.num })); else localStorage.removeItem(LSMIA); } catch (e) {} }
function pintaCon(cls, t, s) {
  var c = E("bkCon"); if (!c) return;
  c.className = "bkCon " + (cls || ""); E("bkConT").textContent = t; E("bkConS").textContent = s || "";
  E("bkGo").disabled = cls !== "ok";
  E("bkConecta").hidden = cls === "ok" || cls === "va" || eligiendo;
  E("bkOtra").hidden = !(cls === "ok" && fuente === "nativo");
}
var TXT = {
  buscando: ["va", "Buscando la bici…", "pedalea un poco para despertarla"],
  conectando: ["va", "Conectando…", ""],
  conectada: ["ok", "Bici conectada", ""],
  perdida: ["mal", "Se ha perdido la bici", "reconectando sola…"],
  no_encontrada: ["mal", "No encuentro la bici", "pedalea para despertarla y vuelve a tocar Conectar"],
  sin_datos: ["mal", "Esa no manda vatios", "prueba otra vez"],
  sin_permiso: ["mal", "Falta el permiso", "dale a Permitir y vuelve a tocar Conectar"],
  apagado: ["mal", "Bluetooth apagado", "enciéndelo y vuelve a tocar Conectar"],
  sin_bluetooth: ["mal", "Este móvil no tiene Bluetooth", ""],
  desconectada: ["", "Bici sin conectar", ""],
  error_busqueda: ["mal", "No se pudo buscar", "vuelve a tocar Conectar"]
};
function cambiaEstado(e, nombre) {
  // mientras eliges, la busqueda sigue (o se acaba sola a los 15 s): no tapes la lista
  if (eligiendo && (e === "buscando" || e === "no_encontrada")) return;
  if (fuente === "nativo" && e === "no_encontrada" && vistas && vistas.n() && !idElegida) return;
  if (fuente === "nativo" && e === "desconectada" && vistas && !idElegida) return;   // el corta() de «Cambiar de bici»
  conEstado = e;
  if (e === "conectada" || e === "conectando") paraRevisa();
  if (e === "conectada" && idElegida) { var m = mia(); if (m && m.id === idElegida) nombre = (nombre || m.nombre) + " · tu bici"; }
  var t = TXT[e] || ["mal", "Bici: " + e, ""];
  pintaCon(t[0], t[1], e === "conectada" && nombre ? nombre : t[2]);
  if (estado && !estado.fin) {
    if (e === "perdida") { avisoEst("Bici desconectada · reconectando…"); voz("Se ha perdido la bici."); }
    if (e === "conectada") { avisoEst(null); voz("Bici conectada."); }
  }
}
function oyeNativo() {
  Nativo.bici.oye({
    datos: function (tipo, bytes, t) { lector.procesa(tipo, bytes, t); },
    estado: cambiaEstado,
    vista: function (d) {
      if (!vistas || idElegida) return;
      var t = Date.now(); if (!t1Vista) t1Vista = t;
      if (vistas.ve(d, t) && eligiendo) pintaLista();
    }
  });
}
/* ---- elegir la bici ---- */
function paraRevisa() { clearInterval(revisaT); revisaT = null; }
function buscaNativo(siempre) {
  fuente = "nativo"; oyeNativo();
  vistas = Vistas(); t1Vista = 0; idElegida = null; forzarLista = !!siempre; ocultaLista();
  cambiaEstado("buscando");
  Nativo.bici.busca(false).catch(function (e) { paraRevisa(); cambiaEstado(TXT[e] ? e : "error_busqueda"); });
  paraRevisa(); revisaT = setInterval(revisa, 400);
}
function revisa() {
  if (!vistas || idElegida) { paraRevisa(); return; }
  var m = mia();
  var r = decideBici({ lista: vistas.lista(), mia: m && m.id, ms: t1Vista ? Date.now() - t1Vista : 0, siempre: forzarLista });
  if (r.accion === "conecta") { paraRevisa(); elige(r.id, null); }
  else if (r.accion === "elige") { paraRevisa(); muestraLista(); }
}
function muestraLista() {
  eligiendo = true; vistas.ordena();
  var m = mia(); E("bkRecuerdaC").checked = !!m;
  E("bkElige").hidden = false; pintaLista();
}
function ocultaLista() { eligiendo = false; var x = E("bkElige"); if (x) x.hidden = true; }
function pintaLista() {
  var L = vistas.lista(), m = mia();
  var t = L.length === 1 ? "Hay 1 bici cerca" : "Hay " + L.length + " bicis cerca";
  var s = m && !vistas.tiene(m.id) ? "No veo la tuya" + (m.num ? " (la " + m.num + ")" : "") + ". ¿Cuál es?" : "¿Cuál es la tuya? Mira el número del manillar";
  pintaCon("va", t, s);
  E("bkLista").innerHTML = L.map(function (v, i) {
    var b = barrasDe(v.rssi), nom = v.nombre || "Bici sin nombre";
    var sub = (i === 0 && L.length > 1 ? "La más cerca" : "") + (m && m.id === v.id ? (i === 0 && L.length > 1 ? " · " : "") + "Tu bici" : "");
    return '<button class="bkBici" data-id="' + v.id + '"><span class="n">' + (v.num || "–") + '</span>' +
      '<span class="t"><span>' + nom.replace(/[<>&"]/g, "") + '</span><small>' + (sub || "&nbsp;") + '</small></span>' +
      '<span class="s"><i class="on" style="height:6px"></i><i class="' + (b > 1 ? "on" : "") + '" style="height:10px"></i><i class="' + (b > 2 ? "on" : "") + '" style="height:14px"></i></span></button>';
  }).join("");
}
function elige(id, recordar) {
  var v = null; vistas.lista().forEach(function (x) { if (x.id === id) v = x; });
  if (recordar === true && v) guardaMia(v);
  if (recordar === false) { var m = mia(); if (m) guardaMia(null); }
  idElegida = id; ocultaLista(); cambiaEstado("conectando");
  Nativo.bici.conecta(id).catch(function (e) { idElegida = null; cambiaEstado(TXT[e] ? e : "no_encontrada"); });
}
function conecta() {
  if (window.Nativo && Nativo.es && Nativo.bici) { buscaNativo(false); return; }
  if (window.Nativo && Nativo.es) {
    pintaCon("mal", "Hace falta el APK nuevo", "esta versión de la app aún no sabe hablar con la bici");
    return;
  }
  if (navigator.bluetooth) { conectaWeb(); return; }
  pintaCon("mal", "Este navegador no tiene Bluetooth", "ábrelo en Chrome de Android o usa el APK");
}
function conectaWeb() {
  fuente = "web"; cambiaEstado("buscando");
  navigator.bluetooth.requestDevice({
    filters: [{ services: [0x1818] }, { services: [0x1826] }, { namePrefix: "BODY" }],
    optionalServices: [0x1818, 0x1826]
  }).then(function (d) {
    wbDev = d; cambiaEstado("conectando");
    d.addEventListener("gattserverdisconnected", function () {
      if (fuente !== "web") return;
      cambiaEstado("perdida");
      setTimeout(function () { if (fuente === "web" && wbDev) abreWeb(wbDev).catch(function () {}); }, 2000);
    });
    return abreWeb(d);
  }).catch(function (e) {
    cambiaEstado(e && e.name === "NotFoundError" ? "desconectada" : "no_encontrada");
  });
}
function abreWeb(d) {
  return d.gatt.connect().then(function (s) {
    var hay = 0;
    function escucha(serv, car, tipo) {
      return s.getPrimaryService(serv).then(function (sv) { return sv.getCharacteristic(car); })
        .then(function (c) {
          c.addEventListener("characteristicvaluechanged", function (ev) {
            var dv = ev.target.value, b = []; for (var i = 0; i < dv.byteLength; i++) b.push(dv.getUint8(i));
            lector.procesa(tipo, b, Date.now());
          });
          hay++; return c.startNotifications();
        }).catch(function () {});
    }
    return escucha(0x1826, 0x2ad2, "ftms").then(function () { return escucha(0x1818, 0x2a63, "potencia"); })
      .then(function () { cambiaEstado(hay ? "conectada" : "sin_datos", d.name || ""); });
  });
}
function suelta() {
  paraRevisa(); ocultaLista(); vistas = null; idElegida = null;
  if (fuente === "nativo" && window.Nativo && Nativo.bici) Nativo.bici.corta();
  if (fuente === "web" && wbDev) { var d = wbDev; wbDev = null; try { d.gatt.disconnect(); } catch (e) {} }
  fuente = null;
}
// modo prueba: vatios alrededor del objetivo (a ratos por debajo o por encima, para oir la voz)
var simW = 120, simCad = 85;
// lo que la bici manda aparte de vatios y cadencia, en casillas pequenas (hasta 4)
function pintaMas(m) {
  var h = "", n = 0;
  for (var k = 0; k < EXTRAS.length && n < 4; k++) {
    var c = EXTRAS[k], v = m[c[0]];
    if (v == null || (c[0] === "fc" && !v)) continue;
    h += "<div><i>" + c[1] + "</i><b>" + c[2](v) + "</b></div>"; n++;
  }
  var X = E("bkMas"); X.hidden = !n; if (X.innerHTML !== h) X.innerHTML = h;
}
function simula(o, t) {
  var obj = o && o.vatios || 150, cad = o && o.cad ? (o.cad[0] + o.cad[1]) / 2 : 85;
  var fase = Math.floor(t / 25) % 4, mete = fase === 1 ? -0.2 : fase === 3 ? 0.18 : 0;
  simW += (obj * (1 + mete) - simW) * 0.25 + (Math.random() - 0.5) * 12;
  simCad += (cad * (1 + mete * 0.5) - simCad) * 0.3 + (Math.random() - 0.5) * 3;
  var w = Math.max(0, Math.round(simW));
  return { w: w, cad: Math.max(0, Math.round(simCad)), kmh: Math.round(velDePotencia(w) * 36) / 10, resist: Math.round(w / 12) };
}

/* ------------------------------ la sesion ------------------------------ */
var S = null, B = [], estado = null, tick = null, guia = null, armado = 0, ultBeep = 0, hist = [];
// estado = {ses, t0, pausaAcum, pausaDesde, bi, bIni, M:[[s,w,cad,m]], dist, fin, tFin, ultS}
function ahora() { return Date.now(); }
function elapsed() {
  if (!estado) return 0;
  var e = ahora() - estado.t0 - estado.pausaAcum;
  if (estado.pausaDesde) e -= ahora() - estado.pausaDesde;
  return e;
}
function pausada() { return !!(estado && estado.pausaDesde); }
function libre() { return !B.length; }
function totSeg() { var s = 0; B.forEach(function (b) { s += b.seg; }); return s; }
function cuenta(i) {                        // "Serie 2 de 5"
  var n = 0, de = 0; for (var k = 0; k < B.length; k++) if (B[k].tipo === B[i].tipo) { de++; if (k <= i) n++; }
  return { n: n, de: de };
}

function vistaPre(ses) {
  monta();
  S = ses; B = ses.bloques || [];
  ["appHoy", "selector"].forEach(function (id) { var x = E(id); if (x) x.hidden = true; });
  E("appBici").hidden = false; ver("bkPre");
  E("bkPreT").textContent = ses.nombre;
  if (libre()) { E("bkPreD").textContent = "Sin plan: vatios, cadencia y km. La voz te cuenta cómo vas cada 5 min."; E("bkPlan").innerHTML = ""; }
  else {
    var ws = B.map(function (b) { return b.vatios; }), mx = Math.max.apply(null, ws), tot = totSeg();
    E("bkPreD").textContent = HMS(tot) + " · " + B.length + " bloques · " + Math.min.apply(null, ws) + "–" + mx + " W";
    E("bkPlan").innerHTML = B.map(function (b) {
      return '<i style="flex:' + b.seg + ' 1 0;height:' + Math.max(12, b.vatios / mx * 100) + '%;background:' + (COLT[b.tipo] || "#5a9be0") + '"></i>';
    }).join("");
  }
  if (conEstado === "conectada") cambiaEstado("conectada"); else pintaCon("", "Bici sin conectar", "pedalea un poco para despertarla y toca Conectar");
  E("bkPrueba").textContent = "Probar sin bici";
}
function ver(id) { ["bkPre", "bkRun", "bkFin"].forEach(function (x) { E(x).hidden = x !== id; }); }
function avisoEst(t) { var n = E("bkEst"); if (!n) return; n.hidden = !t; if (t) n.textContent = t; }

function empieza() {
  guia = Guia(); hist = []; armado = 0; ultBeep = 0;
  estado = { ses: S, fuente: fuente, t0: ahora(), pausaAcum: 0, pausaDesde: 0, bi: 0, bIni: 0,
             M: [], dist: 0, fin: false, tFin: 0, ultS: -1, ultLibre: 0 };
  pintaPerfil();
  ver("bkRun"); pantallaOn(); audioOn();
  if (libre()) voz("Bici libre. Cuando quieras.");
  else { pip(1500, 0.6, 0.6); var b = B[0], c = cuenta(0); setTimeout(function () { voz(anuncio(b, c.n, c.de)); }, 620); }
  guarda(); arranca(); pinta();
}
function arranca() { clearInterval(tick); tick = setInterval(pinta, 250); }
function pausa() {
  if (!estado || estado.fin) return;
  if (estado.pausaDesde) { estado.pausaAcum += ahora() - estado.pausaDesde; estado.pausaDesde = 0; pantallaOn(); voz("Seguimos."); }
  else { estado.pausaDesde = ahora(); voz("En pausa."); }
  guarda(); pinta();
}
function salta() {
  if (!estado || estado.fin || libre()) return;
  estado.bIni = elapsed(); estado.bi++; ultBeep = 0;
  if (estado.bi >= B.length) { termina(false); return; }
  anunciaBloque(); guarda(); pinta();
}
function anunciaBloque() {
  pip(1500, 0.6, 0.6);
  var b = B[estado.bi], c = cuenta(estado.bi);
  setTimeout(function () { voz(anuncio(b, c.n, c.de)); }, 620);
}
function termina(silencio) {
  if (!estado) return;
  estado.tFin = elapsed(); estado.fin = true;
  clearInterval(tick); tick = null; pantallaOff();
  var r = resumenDe(estado.M);
  guardaHecha(r);
  guarda();
  if (!silencio) { pip(1500, 0.6, 0.6); setTimeout(function () { voz("Sesión terminada. " + r.w + " vatios de media."); }, 650); }
  vistaFin(r);
}
function vistaFin(r) {
  r = r || resumenDe(estado.M);
  ver("bkFin"); E("appBici").classList.remove("flash");
  E("bfT").textContent = HMS(r.seg); E("bfK").textContent = coma(r.km, 1);
  E("bfW").textContent = r.w; E("bfC").textContent = r.cad || "–";
  var mas = [["Vatios máx.", r.wMax], ["Mejor 5 min", r.w5 ? r.w5 + " W" : null], ["Cadencia máx.", r.cadMax || null],
             ["Kcal", r.kcal], ["kJ", r.kj], r.fc ? ["Pulso medio", r.fc + (r.fcMax ? " · " + r.fcMax : "")] : null].filter(function (x) { return x && x[1] != null; });
  E("bfMas").innerHTML = mas.map(function (x) { return "<div><i>" + x[0] + "</i><b>" + x[1] + "</b></div>"; }).join("");
  var vs = (estado.vistos || []).map(function (k) { return NOMBRES[k] || k; });
  E("bfVistos").textContent = vs.length ? "La bici ha mandado: " + vs.join(", ") + "." : "";
  var prueba = estado.fuente === "prueba";
  E("bfNota").textContent = prueba ? "Era una prueba: no se guarda como entreno." : "Guardada en el móvil.";
  E("bfJunta").hidden = prueba;
  pintaJunta();
}
/* ------------------------- juntar con el reloj -------------------------
   Copiloto no sube nada a Strava: el Huawei sube su actividad (con pulsaciones)
   y aqui se trae la de esa hora, se junta con la bici y queda el archivo listo.
   Pasos: 1 juntar · 2 guardar el archivo · 3 borrar la del reloj · 4 subir.   */
function conf() {
  try { var c = JSON.parse(localStorage.getItem("copiloto.conf.v1") || "{}");
        return { url: (c.url || "https://copiloto-api.amenedorubn.workers.dev").replace(/\/+$/, ""), key: c.key || "" }; }
  catch (e) { return { url: "https://copiloto-api.amenedorubn.workers.dev", key: "" }; }
}
function hora(ms) { var d = new Date(ms); return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"); }
function pintaJunta(msg, mal) {
  var P = estado && estado.pulsos, ok = !!P;
  E("bfP1").className = "bfPaso" + (ok ? " ok" : "");
  E("bfP1T").textContent = ok ? "Pulsaciones del reloj juntas" : "Junta las pulsaciones del reloj";
  E("bfP1S").textContent = msg || (ok ? "«" + P.nombre + "» de las " + hora(P.inicio) + " · FC media " + P.media
                                      : "Cuando el Huawei se haya sincronizado con Strava (abre Huawei Health)");
  E("bfP1S").style.color = mal ? "#ffb4a0" : "";
  E("bfJuntar").hidden = ok;
  ["bfP2", "bfTcx", "bfP3", "bfBorra", "bfP4", "bfSube"].forEach(function (id) { E(id).hidden = !ok; });
  if (!ok) return;
  E("bfP2").className = "bfPaso" + (estado.guardado ? " ok" : "");
  E("bfP2S").textContent = estado.guardado || "Se queda en Descargas";
  E("bfP3S").textContent = "«" + P.nombre + "» de las " + hora(P.inicio) + " → ··· → Eliminar";
  E("bfBorra").href = "https://www.strava.com/activities/" + P.id;
  var web = !(window.Nativo && Nativo.es);               // en Chrome, en otra pestaña
  E("bfBorra").target = web ? "_blank" : ""; E("bfSube").target = web ? "_blank" : "";
}
function juntar() {
  if (!estado || !estado.M.length) return;
  var c = conf(), M = estado.M, desde = M[0][4] || estado.t0, hasta = M[M.length - 1][4] || desde + M[M.length - 1][0] * 1000;
  if (!c.key) { pintaJunta("Falta la clave del Worker en Ajustes de Copiloto.", true); return; }
  E("bfJuntar").disabled = true; pintaJunta("Buscando en Strava…");
  fetch(c.url + "/pulsos?desde=" + desde + "&hasta=" + hasta, { headers: { "X-Copiloto-Key": c.key }, cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (P) {
      E("bfJuntar").disabled = false;
      if (P.error) {
        pintaJunta(P.error === "sin_reloj"
          ? "Aún no está en Strava la del reloj. Abre Huawei Health, espera un minuto y vuelve a tocar."
          : (P.mensaje || P.error), true);
        return;
      }
      var f = fcDe(P), s = 0, n = 0;
      M.forEach(function (m) { var h = f(m[4]); if (h) { s += h; n++; } });
      if (!n) { pintaJunta("La del reloj no coincide en hora con la bici.", true); return; }
      estado.pulsos = { id: P.id, nombre: P.nombre, inicio: P.inicio, t: P.t, bpm: P.bpm, media: Math.round(s / n) };
      guarda(true); pintaJunta();
    })
    .catch(function () { E("bfJuntar").disabled = false; pintaJunta("Sin conexión. Vuelve a tocar cuando tengas red.", true); });
}
function guardaHecha(r) {
  if (estado.fuente === "prueba" || !estado.M.length) return;
  try {
    var L = JSON.parse(localStorage.getItem(LSH) || "[]");
    L.unshift({ inicio: estado.t0, nombre: S.nombre, resumen: r, M: estado.M, vistos: estado.vistos || [] });
    localStorage.setItem(LSH, JSON.stringify(L.slice(0, 5)));
  } catch (e) {}
}
function descarga() {
  if (!estado || !estado.M.length) return;
  var txt = tcx(estado.M, estado.t0, estado.pulsos ? fcDe(estado.pulsos) : null), d = new Date(estado.t0);
  var nom = "bici_" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "_" +
            String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0") + ".tcx";
  if (window.Nativo && Nativo.guardaArchivo) {             // APK: a Descargas, donde lo ve la página de Strava
    Nativo.guardaArchivo(nom, txt, "application/vnd.garmin.tcx+xml").then(function (r) {
      estado.guardado = r && r.donde ? "Guardado en Descargas: " + nom : "Enviado: " + nom;
      guarda(true); pintaJunta();
    }).catch(function () { pintaJunta("No se ha podido guardar el archivo.", true); });
    return;
  }
  var blob = new Blob([txt], { type: "application/vnd.garmin.tcx+xml" });
  estado.guardado = "Descargado: " + nom; guarda(true); setTimeout(pintaJunta, 0);
  try {
    var f = new File([blob], nom, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: nom }).catch(function () {}); return; }
  } catch (e) {}
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nom;
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ------------------------------ persistencia ------------------------------ */
var ultGuarda = 0;
function guarda(forzar) {
  if (!estado) return;
  if (estado.fin && estado.M.length && forzar) {           // lo de juntar tambien en la lista de hechas
    try { var L = JSON.parse(localStorage.getItem(LSH) || "[]");
          if (L[0] && (L[0].inicio === estado.t0)) { L[0].pulsos = estado.pulsos || null; L[0].guardado = estado.guardado || ""; localStorage.setItem(LSH, JSON.stringify(L)); } } catch (e) {}
  }
  if (!forzar && ahora() - ultGuarda < 5000 && !estado.fin) return;
  ultGuarda = ahora();
  try { localStorage.setItem(LS, JSON.stringify(estado)); } catch (e) {}
}
function olvida() { try { localStorage.removeItem(LS); } catch (e) {} estado = null; clearInterval(tick); tick = null; suelta(); }
function retoma() {
  var st; try { st = JSON.parse(localStorage.getItem(LS) || "null"); } catch (e) { return false; }
  if (!st || typeof st.t0 !== "number" || !st.ses) return false;
  if (ahora() - st.t0 > MAXEDAD) { olvida(); return false; }
  monta(); S = st.ses; B = S.bloques || []; estado = st; guia = Guia(); hist = [];
  ["appHoy", "selector"].forEach(function (id) { var x = E(id); if (x) x.hidden = true; });
  E("appBici").hidden = false;
  if (estado.fin) { vistaFin(); return true; }
  pintaPerfil(); ver("bkRun");
  fuente = estado.fuente;
  if (fuente === "nativo" || fuente === "web") {
    avisoEst("Toca aquí para volver a conectar la bici");
    E("bkEst").onclick = function () { E("bkEst").onclick = null; audioOn(); conecta(); };
  }
  if (!pausada()) pantallaOn();
  arranca(); pinta();
  return true;
}

/* ------------------------------ pintar ------------------------------ */
function media(n, k) {                          // media de los ultimos n segundos (k: 1 vatios, 2 cadencia)
  var a = hist.slice(-n); if (!a.length) return 0;
  var s = 0; a.forEach(function (x) { s += x[k]; }); return s / a.length;
}
function pintaPerfil() {
  var P = E("bkPerfil");
  if (libre()) { P.innerHTML = ""; P.hidden = true; return; }
  P.hidden = false;
  var mx = Math.max.apply(null, B.map(function (b) { return b.vatios; }));
  P.innerHTML = B.map(function (b, i) {
    return '<i data-i="' + i + '" style="flex:' + b.seg + ' 1 0;height:' + Math.max(15, b.vatios / mx * 100) + '%;background:' + (COLT[b.tipo] || "#5a9be0") + '"></i>';
  }).join("") + '<div id="bkMarca"></div>';
}
function pinta() {
  if (!estado || estado.fin) return;
  var e = elapsed(), s = Math.floor(e / 1000), pa = pausada();

  // avance de bloque (puede cruzar varios tras dormirse el movil)
  if (!libre()) {
    var vuelta = 0, canta = s - estado.ultS <= 3;
    while (estado.bi < B.length && e - estado.bIni >= B[estado.bi].seg * 1000 && vuelta++ < 200) {
      estado.bIni += B[estado.bi].seg * 1000; estado.bi++; ultBeep = 0;
      if (estado.bi >= B.length) { termina(!canta); return; }
      if (canta) anunciaBloque();
      guarda(true);
    }
  }
  var b = libre() ? null : B[estado.bi];
  var o = b ? { vatios: b.vatios, cad: b.cad, tipo: b.tipo } : null;

  // la medida de ahora
  var m = fuente === "prueba" ? simula(o, s) : lector.ahora(ahora());

  // un segundo nuevo: se apunta (en pausa no)
  if (s !== estado.ultS && s >= 0) {
    if (!pa) {
      var v = m.kmh != null ? m.kmh / 3.6 : velDePotencia(m.w);
      estado.dist += v * Math.max(1, Math.min(5, s - estado.ultS));
      estado.M.push([s, m.w, m.cad, Math.round(estado.dist * 10) / 10, ahora(),
                     m.fc || null, m.kmh != null ? m.kmh : null, m.resist != null ? m.resist : null, m.kcal != null ? m.kcal : null]);
      if (fuente !== "prueba") estado.vistos = lector.vistos();
      hist.push([s, m.w, m.cad]); if (hist.length > 30) hist.shift();
    }
    estado.ultS = s;
    if (!pa) dirige(e, b, o, s);
    guarda();
  }

  // pantalla
  var w3 = hist.length ? Math.round(media(3, 1)) : m.w;
  var colr = COLT[b ? b.tipo : "libre"] || "#5a9be0";
  E("appBici").style.setProperty("--tipo", colr);
  var restB = b ? b.seg * 1000 - (e - estado.bIni) : 0, sig = b && estado.bi + 1 < B.length ? B[estado.bi + 1] : null;
  var ult5 = !pa && b && restB <= 5000 && restB > 0;
  E("appBici").classList.toggle("flash", !!(ult5 && Math.floor(restB / 300) % 2 === 0));
  if (!pa && b) { var sec = Math.ceil(restB / 1000); if (sec >= 1 && sec <= 3 && sec !== ultBeep) { ultBeep = sec; pip(1000, 0.13, 0.5); } }

  var cu = b ? cuenta(estado.bi) : null;            // "Serie 2/5": el tipo y por cual vas
  E("bkTipo").textContent = pa ? "En pausa" : (b ? (cu.de > 1 ? (b.tipo === "serie" ? "Serie " : b.tipo === "suave" ? "Suave " : b.nombre.replace(/\s*\d+$/, "") + " ") + cu.n + "/" + cu.de : b.nombre) : "Libre");
  E("bkEl").textContent = HMS(e / 1000);
  E("bkRe").textContent = b ? "quedan " + HMS(Math.ceil(Math.max(0, restB) / 1000 + B.slice(estado.bi + 1).reduce(function (a, x) { return a + x.seg; }, 0))) : "sin plan";
  var W = E("bkW"); W.textContent = String(w3);
  if (o) {
    var tol = margen(o.vatios);
    W.className = w3 < o.vatios - tol ? "bajo" : w3 > o.vatios + tol ? "alto" : "bien";
    var objTxt = ult5 && sig ? "Ahora: <b>" + sig.vatios + " W</b>" + (sig.cad ? " · " + sig.cad[0] + "–" + sig.cad[1] + " rpm" : "")
                             : "Objetivo <b>" + o.vatios + " W</b>" + (o.cad ? " · " + o.cad[0] + "–" + o.cad[1] + " rpm" : "");
    E("bkObj").innerHTML = objTxt; E("bkObj").hidden = false; E("bkBarra").hidden = false;
    var lo = o.vatios * 0.5, hi = o.vatios * 1.5, pos = function (x) { return Math.max(0, Math.min(100, (x - lo) / (hi - lo) * 100)); };
    E("bkBanda").style.left = pos(o.vatios - tol) + "%"; E("bkBanda").style.width = (pos(o.vatios + tol) - pos(o.vatios - tol)) + "%";
    E("bkAguja").style.left = pos(w3) + "%";
  } else { W.className = ""; E("bkObj").hidden = true; E("bkBarra").hidden = true; }
  var c3 = hist.length ? Math.round(media(3, 2)) : m.cad, CE = E("bkCad");
  CE.textContent = c3 || "–"; CE.className = o && o.cad && c3 && (c3 < o.cad[0] - 3 || c3 > o.cad[1] + 3) ? "fuera" : "";
  E("bkQL").textContent = b ? "Queda" : "Media W";
  E("bkQ").textContent = b ? MS(Math.ceil(Math.max(0, restB) / 1000)) : String(resumenDe(estado.M).w);
  E("bkKm").textContent = coma(estado.dist / 1000, 1);
  pintaMas(m);
  E("bkSig").textContent = b ? (sig ? "Luego: " + sig.nombre.toLowerCase() + " · " + sig.vatios + " W" : "Luego: fin de la sesión") : "Bici libre · " + (fuente === "prueba" ? "prueba" : "sin plan");
  E("bkSigT").textContent = sig ? MS(sig.seg) : "";
  if (b) {
    var hecho = 0; for (var i = 0; i < estado.bi; i++) hecho += B[i].seg;
    hecho += Math.min(b.seg, (e - estado.bIni) / 1000);
    var mk = E("bkMarca"); if (mk) mk.style.left = (hecho / totSeg() * 100).toFixed(2) + "%";
    var segs = E("bkPerfil").querySelectorAll("i");
    for (var j = 0; j < segs.length; j++) segs[j].style.opacity = j < estado.bi ? ".35" : j === estado.bi ? "1" : ".7";
  }
  E("bkPausa").textContent = pa ? "Seguir" : "Pausa";
  E("bkSalta").hidden = libre();
  if (armado && ahora() - armado > 4000) armado = 0;
  E("bkFinBtn").textContent = armado ? "¿Seguro?" : "Terminar"; E("bkFinBtn").className = armado ? "arm" : "";
  if (fuente !== "prueba" && !pa && conEstado === "conectada" && ahora() - lector.ahora().t > 6000) avisoEst("Sin datos de la bici · pedalea");
  else if (conEstado === "conectada" && E("bkEst").textContent === "Sin datos de la bici · pedalea") avisoEst(null);
}
// la voz: lo que dice la guia, y en libre un resumen cada 5 min
function dirige(e, b, o, s) {
  if (!b) {
    if (s - estado.ultLibre >= 300 && s > 0) {
      estado.ultLibre = s; var r = resumenDe(estado.M);
      voz("Llevas " + Math.round(s / 60) + " minutos. " + r.w + " vatios de media, " + coma(r.km, 1) + " kilómetros.");
    }
    return;
  }
  if (hist.length < 5) return;
  var f = guia.paso({ i: estado.bi, t: (e - estado.bIni) / 1000, seg: b.seg, o: o,
                      w: media(10, 1), cad: media(10, 2), ms: ahora() });
  if (f) voz(f);
}

/* ------------------------------ salir ------------------------------ */
function sal() {
  if (estado && !estado.fin) return;
  suelta(); clearInterval(tick); tick = null; pantallaOff();
  E("appBici").hidden = true;
  if (window.Agenda) window.Agenda.muestra();
}
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible" && estado && !estado.fin && !pausada()) { audioOn(); pantallaOn(); pinta(); }
});

/* La agenda entra por aqui */
API.abre = function (ses) { monta(); if (estado && !estado.fin) { retoma(); return; } estado = null; vistaPre(ses); };
API.abreLibre = function () { API.abre(LIBRE); };
API.abrePrueba = function () { API.abre(PRUEBA); };
API.enCurso = function () { return !!(estado && !estado.fin); };
API.retoma = retoma;
API.sal = function () { if (estado && estado.fin) olvida(); sal(); };
API.visible = function () { var a = E("appBici"); return !!(a && !a.hidden); };
API.abreUltima = function () {
  var L = API.hechas(); if (!L.length) return false;
  if (estado && !estado.fin) { retoma(); return true; }
  var h = L[0]; monta();
  S = { id: "hecha", nombre: h.nombre, bloques: [] }; B = [];
  estado = { ses: S, fuente: "hecha", t0: h.inicio, pausaAcum: 0, pausaDesde: 0, bi: 0, bIni: 0, M: h.M, dist: 0,
             fin: true, tFin: 0, ultS: 0, pulsos: h.pulsos || null, guardado: h.guardado || "", vistos: h.vistos || [] };
  ["appHoy", "selector"].forEach(function (id) { var x = E(id); if (x) x.hidden = true; });
  E("appBici").hidden = false; vistaFin(resumenDe(h.M));
  return true;
};
API.hechas = function () { try { return JSON.parse(localStorage.getItem(LSH) || "[]"); } catch (e) { return []; } };
return API;
});
