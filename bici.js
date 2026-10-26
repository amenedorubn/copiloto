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

/* FTMS · Indoor Bike Data (0x2AD2). Devuelve lo que traiga: {kmh, cad, w}. */
function leeFTMS(b) {
  if (!b || b.length < 2) return {};
  var f = u16(b, 0), i = 2, o = {};
  if (!(f & 1)) { if (i + 2 > b.length) return o; o.kmh = u16(b, i) / 100; i += 2; }  // bit 0 = 0: velocidad
  if (f & 2) i += 2;                                   // velocidad media
  if (f & 4) { if (i + 2 > b.length) return o; o.cad = u16(b, i) / 2; i += 2; }
  if (f & 8) i += 2;                                   // cadencia media
  if (f & 16) i += 3;                                  // distancia total
  if (f & 32) i += 2;                                  // resistencia
  if (f & 64) { if (i + 2 > b.length) return o; o.w = s16(b, i); i += 2; }
  return o;
}

/* Cycling Power Measurement (0x2A63): {w, biela: {rev, t}} (t en 1/1024 s). */
function leePotencia(b) {
  if (!b || b.length < 4) return {};
  var f = u16(b, 0), i = 4, o = { w: s16(b, 2) };
  if (f & 1) i += 1;                                   // balance de pedales
  if (f & 4) i += 2;                                   // par acumulado
  if (f & 16) i += 6;                                  // vueltas de rueda
  if (f & 32) {
    if (i + 4 > b.length) return o;
    o.biela = { rev: u16(b, i), t: u16(b, i + 2) };
  }
  return o;
}

/* El lector junta lo que llega y da {w, cad, kmh} al momento. La cadencia de la
   potencia sale de cuantas vueltas da la biela entre dos medidas; si deja de
   moverse 3 s, es 0. Si llega FTMS con velocidad, manda esa. */
function Lector() {
  var biela = null, ultVuelta = -1e15, act = { w: 0, cad: 0, kmh: null, t: 0 }, ftmsCad = -1e15;
  return {
    procesa: function (tipo, bytes, t) {
      t = t || Date.now();
      if (tipo === "ftms") {
        var f = leeFTMS(bytes);
        if (f.w != null) act.w = Math.max(0, f.w);
        if (f.kmh != null) act.kmh = f.kmh;
        if (f.cad != null) { act.cad = f.cad; ftmsCad = t; }
      } else if (tipo === "potencia") {
        var p = leePotencia(bytes);
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
      return { w: act.w, cad: act.cad, kmh: act.kmh, t: act.t };
    },
    ahora: function (t) {
      t = t || Date.now();
      var viejo = t - act.t > 4000;                    // sin noticias de la bici: 0
      return { w: viejo ? 0 : act.w, cad: viejo ? 0 : act.cad, kmh: viejo ? null : act.kmh, t: act.t };
    }
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
   luego con las pulsaciones del reloj). M = [[seg, vatios, cadencia, metros], ...] */
function tcx(M, inicioMs) {
  var iso = function (ms) { return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z"); };
  var n = M.length, sw = 0, sc = 0, nc = 0, pts = [];
  for (var i = 0; i < n; i++) {
    var m = M[i]; sw += m[1]; if (m[2] > 0) { sc += m[2]; nc++; }
    pts.push("<Trackpoint><Time>" + iso(inicioMs + m[0] * 1000) + "</Time><DistanceMeters>" + m[3].toFixed(1) +
      "</DistanceMeters><Cadence>" + Math.round(m[2]) + "</Cadence><Extensions><ns3:TPX><ns3:Watts>" + Math.round(m[1]) +
      "</ns3:Watts></ns3:TPX></Extensions></Trackpoint>");
  }
  var dur = n ? M[n - 1][0] : 0, dist = n ? M[n - 1][3] : 0;
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">\n' +
    '<Activities><Activity Sport="Biking"><Id>' + iso(inicioMs) + '</Id><Lap StartTime="' + iso(inicioMs) + '">' +
    '<TotalTimeSeconds>' + dur + '</TotalTimeSeconds><DistanceMeters>' + dist.toFixed(1) + '</DistanceMeters>' +
    '<Calories>' + Math.round(sw / 1000 / 0.24 / 4.184) + '</Calories><Intensity>Active</Intensity>' +
    (nc ? '<Cadence>' + Math.round(sc / nc) + '</Cadence>' : '') + '<TriggerMethod>Manual</TriggerMethod>' +
    '<Track>' + pts.join("") + '</Track></Lap>' +
    '<Creator xsi:type="Device_t" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><Name>Copiloto · BODY BIKE</Name></Creator>' +
    '</Activity></Activities></TrainingCenterDatabase>\n';
}
function resumenDe(M) {
  var n = M.length, sw = 0, sc = 0, nc = 0;
  for (var i = 0; i < n; i++) { sw += M[i][1]; if (M[i][2] > 0) { sc += M[i][2]; nc++; } }
  return { seg: n ? M[n - 1][0] : 0, km: n ? M[n - 1][3] / 1000 : 0, w: n ? Math.round(sw / n) : 0,
           kj: Math.round(sw / 1000), cad: nc ? Math.round(sc / nc) : 0 };
}

var API = { leeFTMS: leeFTMS, leePotencia: leePotencia, Lector: Lector, velDePotencia: velDePotencia,
            Guia: Guia, margen: margen, anuncio: anuncio, durVoz: durVoz, tcx: tcx, resumenDe: resumenDe,
            sesionDe: sesionDe, COLT: COLT };
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
"#bkFin .nota{font-size:14px;font-weight:700;color:#8e939b;line-height:1.35}";

var HTML = "" +
'<div id="bkPre" class="bkV">' +
  '<div id="bkPreT">–</div><div id="bkPreD">–</div><div id="bkPlan"></div>' +
  '<div id="bkCon" class="bkCon"><b></b><div><span id="bkConT">Bici sin conectar</span><small id="bkConS"></small></div></div>' +
  '<button id="bkConecta">Conectar la bici</button>' +
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
  '<div class="bkLuego"><span id="bkSig">–</span><em id="bkSigT"></em></div>' +
  '<div id="bkPerfil"></div>' +
  '<div id="bkCtl"><button id="bkPausa">Pausa</button><button id="bkSalta">Saltar</button><button id="bkFinBtn">Terminar</button></div>' +
'</div>' +
'<div id="bkFin" class="bkV" hidden>' +
  '<div class="tit">Sesión terminada</div>' +
  '<div class="bkFila"><div><i>Tiempo</i><b id="bfT">0:00</b></div><div><i>Km</i><b id="bfK">0</b></div>' +
  '<div><i>Vatios media</i><b id="bfW">0</b></div><div><i>Cadencia media</i><b id="bfC">0</b></div></div>' +
  '<div class="nota" id="bfNota">Guardada en el móvil. Las pulsaciones del reloj se juntan después en Strava.</div>' +
  '<button id="bfTcx">Descargar archivo (TCX)</button>' +
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
function pintaCon(cls, t, s) {
  var c = E("bkCon"); if (!c) return;
  c.className = "bkCon " + (cls || ""); E("bkConT").textContent = t; E("bkConS").textContent = s || "";
  E("bkGo").disabled = cls !== "ok";
  E("bkConecta").hidden = cls === "ok" || cls === "va";
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
  conEstado = e;
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
    estado: cambiaEstado
  });
}
function conecta() {
  if (window.Nativo && Nativo.es && Nativo.bici) {
    fuente = "nativo"; oyeNativo();
    cambiaEstado("buscando");
    Nativo.bici.busca(true).catch(function (e) { cambiaEstado(TXT[e] ? e : "error_busqueda"); });
    return;
  }
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
  if (fuente === "nativo" && window.Nativo && Nativo.bici) Nativo.bici.corta();
  if (fuente === "web" && wbDev) { var d = wbDev; wbDev = null; try { d.gatt.disconnect(); } catch (e) {} }
  fuente = null;
}
// modo prueba: vatios alrededor del objetivo (a ratos por debajo o por encima, para oir la voz)
var simW = 120, simCad = 85;
function simula(o, t) {
  var obj = o && o.vatios || 150, cad = o && o.cad ? (o.cad[0] + o.cad[1]) / 2 : 85;
  var fase = Math.floor(t / 25) % 4, mete = fase === 1 ? -0.2 : fase === 3 ? 0.18 : 0;
  simW += (obj * (1 + mete) - simW) * 0.25 + (Math.random() - 0.5) * 12;
  simCad += (cad * (1 + mete * 0.5) - simCad) * 0.3 + (Math.random() - 0.5) * 3;
  return { w: Math.max(0, Math.round(simW)), cad: Math.max(0, Math.round(simCad)), kmh: null };
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
  E("bfNota").textContent = estado.fuente === "prueba"
    ? "Era una prueba: no se guarda como entreno."
    : "Guardada en el móvil. Las pulsaciones del reloj se juntan después en Strava.";
}
function guardaHecha(r) {
  if (estado.fuente === "prueba" || !estado.M.length) return;
  try {
    var L = JSON.parse(localStorage.getItem(LSH) || "[]");
    L.unshift({ inicio: estado.t0, nombre: S.nombre, resumen: r, M: estado.M });
    localStorage.setItem(LSH, JSON.stringify(L.slice(0, 5)));
  } catch (e) {}
}
function descarga() {
  if (!estado || !estado.M.length) return;
  var txt = tcx(estado.M, estado.t0), d = new Date(estado.t0);
  var nom = "bici_" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "_" +
            String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0") + ".tcx";
  var blob = new Blob([txt], { type: "application/vnd.garmin.tcx+xml" });
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
      estado.M.push([s, m.w, m.cad, Math.round(estado.dist * 10) / 10]);
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
API.hechas = function () { try { return JSON.parse(localStorage.getItem(LSH) || "[]"); } catch (e) { return []; } };
return API;
});
