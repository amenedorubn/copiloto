/* Predicción de carrera (v2.67 · media de Roma).

   Con lo que llevas (metros y segundos) dice:
     · la LLEGADA si sigues a tu ritmo medio,
     · el MARGEN contra el objetivo principal (el primero de la lista),
     · el RITMO que hace falta desde ya, en lo que queda, para cada objetivo
       (null = "fuera de alcance": exigiría ir más rápido que "minRitmo"),
   y para el mapa, dónde estaría ahora mismo:
     · alguien a ritmo CONSTANTE desde la salida para cada objetivo (la ventana azul),
     · alguien que pasara justo por los tiempos de una TABLA de carteles
       (suelo y ataque: la ventana naranja).

   Sin DOM: se prueba con node --test tests/prediccion.test.mjs              */
(function(root){
"use strict";

var MIN_KM = 1000;        // antes del km 1 el ritmo medio aun no dice nada: "Calculando…"
var MIN_RITMO = 210;      // 3'30"/km: mas rapido que esto, ese objetivo esta fuera de alcance

// d: metros recorridos, t: segundos, D: metros totales, objetivos: [s, s] (el primero manda)
function calcula(d, t, D, objetivos, op){
  op = op || {};
  var minKm = op.minKm != null ? op.minKm : MIN_KM;
  var minRitmo = op.minRitmo != null ? op.minRitmo : MIN_RITMO;
  var obj = objetivos || [];
  if(!(d >= minKm) || !(t > 0) || !(D > 0)){
    return { listo:false, ritmos: obj.map(function(o){ return { objetivo:o, ritmo:null, fuera:false }; }) };
  }
  var resta = Math.max(0, D - d) / 1000;           // km que faltan
  var medio = t / (d / 1000);                       // s/km que llevas
  var llegada = d >= D ? t : t + resta * medio;
  var ritmos = obj.map(function(o){
    if(resta <= 0) return { objetivo:o, ritmo:null, fuera: t > o };
    var r = (o - t) / resta;
    var fuera = !(r >= minRitmo);                   // incluye "ya te has pasado" (r <= 0)
    return { objetivo:o, ritmo: fuera ? null : r, fuera:fuera };
  });
  return { listo:true, llegada:llegada, medio:medio, resta:resta,
           margen: obj.length ? obj[0] - llegada : null, ritmos:ritmos, fin: d >= D };
}

// verde con 30 s o mas de margen, ambar con menos, rojo si te pasas
function colorMargen(m){
  if(m == null || !isFinite(m)) return "dim";
  return m >= 30 ? "ok" : (m >= 0 ? "warn" : "bad");
}

// metros a los que iria, en el segundo t, alguien a ritmo constante para hacer "objetivo"
function fantasma(t, objetivo, D){
  if(!(objetivo > 0)) return 0;
  return Math.max(0, Math.min(D, t * D / objetivo));
}

// tabla: [[km, s], ...] creciente (km 0 = 0 s). Metros a los que se pasa en el segundo t.
function enTabla(tabla, t){
  if(!tabla || tabla.length < 2) return 0;
  if(t <= tabla[0][1]) return tabla[0][0] * 1000;
  for(var i = 1; i < tabla.length; i++){
    var a = tabla[i-1], b = tabla[i];
    if(t <= b[1]){
      var f = (b[1] - a[1]) > 0 ? (t - a[1]) / (b[1] - a[1]) : 1;
      return (a[0] + (b[0] - a[0]) * f) * 1000;
    }
  }
  return tabla[tabla.length-1][0] * 1000;
}

// las dos ventanas del mapa en metros: azul (objetivos a ritmo constante) y naranja (tabla)
function ventanas(t, D, objetivos, suelo, ataque){
  var az = (objetivos || []).map(function(o){ return fantasma(t, o, D); });
  var r = { azul: az.length ? [Math.min.apply(null, az), Math.max.apply(null, az)] : null, naranja:null };
  if(suelo && ataque){
    var s = enTabla(suelo, t), a = enTabla(ataque, t);
    r.naranja = [Math.min(s, a), Math.max(s, a)];
    r.suelo = s; r.ataque = a;
  }
  r.lento = az.length ? Math.min.apply(null, az) : null;     // el del objetivo imprescindible (1:50)
  r.rapido = az.length ? Math.max.apply(null, az) : null;
  return r;
}

// la linea de estado: dónde estás respecto a las ventanas (me en metros)
function estado(me, v, nombres){
  nombres = nombres || {};
  var lento = nombres.lento || "1:50", rapido = nombres.rapido || "1:45";
  var m = function(x){ return Math.round(Math.abs(x) / 10) * 10; };
  var TOL = 5;
  if(v.naranja && me >= v.naranja[0] - TOL && me <= v.naranja[1] + TOL)
    return { txt:"Entre suelo y ataque", col:"ok" };
  if(v.rapido != null && me > v.rapido + TOL)
    return { txt: m(me - v.rapido) + " m por delante del " + rapido, col:"ok" };
  if(v.naranja && me > v.naranja[1])
    return { txt: m(me - v.naranja[1]) + " m por delante del ataque", col:"ok" };
  if(v.lento != null && me >= v.lento - TOL)
    return v.naranja ? { txt: m(v.naranja[0] - me) + " m por detrás del suelo", col:"warn" }
                     : { txt:"Entre " + rapido + " y " + lento, col:"ok" };
  // en la salida contenida (5'15" los 5 primeros km) el suelo va por detrás del 1:50 a ritmo
  // constante: ahí se mide contra el suelo, que es lo que pide el plan, y no se pinta de rojo
  if(v.naranja && v.naranja[0] < v.lento) return { txt: m(v.naranja[0] - me) + " m por detrás del suelo", col:"warn" };
  if(v.lento != null) return { txt: m(v.lento - me) + " m por detrás del " + lento, col:"bad" };
  return { txt:"", col:"dim" };
}

// "1:49:34" / "49:34"
function hms(s){
  s = Math.round(s);
  var h = Math.floor(s / 3600), mi = Math.floor(s % 3600 / 60), g = s % 60;
  return (h ? h + ":" + (mi < 10 ? "0" : "") : "") + mi + ":" + (g < 10 ? "0" : "") + g;
}
function paceTxt(s){ s = Math.round(s); var m = Math.floor(s / 60), g = s % 60; return m + ":" + (g < 10 ? "0" : "") + g; }
// 6600 -> "1:50"; 6300 -> "1:45"
function objTxt(s){ var h = Math.floor(s / 3600), mi = Math.round(s % 3600 / 60); return h + ":" + (mi < 10 ? "0" : "") + mi; }

// para la voz: "1 49 34" (TTS lo lee bien así) y los ritmos con el dicePace de la app
function tiempoVoz(s){
  s = Math.round(s);
  var h = Math.floor(s / 3600), mi = Math.floor(s % 3600 / 60), g = s % 60;
  var p = [];
  if(h) p.push(String(h));
  p.push(h ? (mi < 10 ? "cero " + mi : String(mi)) : String(mi));
  p.push(g === 0 ? "justos" : (g < 10 ? "cero " + g : String(g)));
  return p.join(" ");
}
function objVoz(s){ var h = Math.floor(s / 3600), mi = Math.round(s % 3600 / 60); return h + " " + (mi < 10 ? "cero " + mi : mi); }

// lo que se añade al aviso del km: "Vas para 1 49 34. Para bajar de 1 50, 5 14. Para 1 45, 4 47."
function fraseVoz(p, dicePace){
  if(!p || !p.listo) return "";
  var f = "Vas para " + tiempoVoz(p.llegada) + ".";
  p.ritmos.forEach(function(r, i){
    var o = objVoz(r.objetivo);
    if(r.ritmo == null) f += " " + o + " ya no da.";
    else f += (i === 0 ? " Para bajar de " : " Para ") + o + ", " + dicePace(r.ritmo) + ".";
  });
  return f;
}

root.Prediccion = { calcula:calcula, colorMargen:colorMargen, fantasma:fantasma, enTabla:enTabla,
  ventanas:ventanas, estado:estado, hms:hms, paceTxt:paceTxt, objTxt:objTxt, tiempoVoz:tiempoVoz,
  fraseVoz:fraseVoz, MIN_KM:MIN_KM, MIN_RITMO:MIN_RITMO };
if(typeof module !== "undefined" && module.exports) module.exports = root.Prediccion;
})(typeof window !== "undefined" ? window : globalThis);
