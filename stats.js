/* ===========================================================================
   ESTADISTICAS · carrera y gimnasio a partir de lo hecho (Strava y Hevy)
   ---------------------------------------------------------------------------
   Todo sale de las actividades reales que baja la app (las de los ultimos
   ~4 meses). Nada se estima si no hay datos: donde falta algo, null.
   Sin DOM: se prueba con node (tests/stats.test.mjs).

   - bloque(): lo hecho entre dos fechas (km, sesiones, ritmo, FC, gym...)
   - semanas(): las ultimas N semanas de lunes a domingo
   - carga(): km de los ultimos 7 dias frente a la media semanal de 28
   - records(): tirada mas larga, mejor ritmo medio en 5 km o mas
   - ejercicios() / anterior(): la progresion de cada ejercicio del gym
     con la mejor serie y su 1RM estimado (Epley, solo hasta 12 reps)
   =========================================================================== */
(function (raiz, fabrica) {
  var S = fabrica();
  if (typeof module === "object" && module.exports) module.exports = S;
  else raiz.Stats = S;
})(typeof window !== "undefined" ? window : this, function () {
  var DIA = 86400000;
  function aFecha(iso) { var p = iso.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function iso(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function mas(f, n) { return iso(aFecha(f) + n * DIA); }
  function lunes(f) { var d = new Date(aFecha(f)).getUTCDay(); return mas(f, -((d + 6) % 7)); }

  function esRun(a) { return /Run/.test(a.deporte || ""); }
  function esGym(a) { return a.fuente === "hevy" || /Weight|Workout|Crossfit|Training/i.test(a.deporte || ""); }
  function esCinta(a) { return esRun(a) && (!!a.cinta || /Virtual/.test(a.deporte || "")); }
  function entre(acts, desde, hasta) {
    return (acts || []).filter(function (a) { return a && a.fecha && a.fecha >= desde && a.fecha <= hasta; });
  }

  function bloque(acts, desde, hasta) {
    var L = entre(acts, desde, hasta), b = { desde: desde, hasta: hasta, km: 0, kmCinta: 0, carreras: 0, seg: 0,
      ritmo: null, fc: null, gym: 0, gymSeg: 0, series: 0, volKg: 0, dias: 0, larga: 0 };
    var dRit = 0, tRit = 0, tFc = 0, sFc = 0, dias = {};
    L.forEach(function (a) {
      if (esRun(a)) {
        var km = (a.distancia || 0) / 1000;
        b.carreras++; b.km += km; b.seg += a.mov || 0; dias[a.fecha] = 1;
        if (esCinta(a)) b.kmCinta += km;
        if (km > b.larga) b.larga = km;
        if (a.distancia > 50 && a.mov > 0) { dRit += km; tRit += a.mov; }
        if (a.fcMedia && a.mov > 0) { tFc += a.mov; sFc += a.fcMedia * a.mov; }
      } else if (esGym(a)) {
        b.gym++; b.gymSeg += a.mov || 0; b.series += a.series || 0; b.volKg += a.volumenKg || 0; dias[a.fecha] = 1;
      }
    });
    if (dRit > 0) b.ritmo = tRit / dRit;                 // s/km, ponderado por distancia
    if (tFc > 0) b.fc = Math.round(sFc / tFc);          // ppm, ponderada por tiempo
    b.dias = Object.keys(dias).length;
    return b;
  }

  // n semanas de lunes a domingo; la ultima es la de hoy (a medias)
  function semanas(acts, hoy, n) {
    var R = [], l = lunes(hoy);
    for (var i = n - 1; i >= 0; i--) {
      var d = mas(l, -7 * i), b = bloque(acts, d, mas(d, 6));
      b.actual = i === 0; R.push(b);
    }
    return R;
  }

  // relacion aguda:cronica con los km: 7 dias frente a la media semanal de 28.
  // Si en 28 dias hay menos de 5 km de media no se da la relacion (no dice nada).
  function carga(acts, hoy) {
    var agudo = bloque(acts, mas(hoy, -6), hoy).km, cronico = bloque(acts, mas(hoy, -27), hoy).km / 4;
    var r = { agudo: agudo, cronico: cronico, ratio: null, estado: null };
    if (cronico >= 5) {
      r.ratio = agudo / cronico;
      r.estado = r.ratio > 1.3 ? "alta" : (r.ratio < 0.8 ? "baja" : "normal");
    }
    return r;
  }

  function records(acts, desde, hasta) {
    var L = entre(acts, desde, hasta).filter(esRun), larga = null, rapido = null;
    L.forEach(function (a) {
      if (a.distancia > 50 && (!larga || a.distancia > larga.distancia)) larga = a;
      if (a.distancia >= 5000 && a.mov > 0) {
        var r = a.mov / (a.distancia / 1000);
        if (!rapido || r < rapido.ritmo) rapido = { a: a, ritmo: r };
      }
    });
    return { larga: larga, rapido: rapido };
  }

  // 1RM estimado (Epley). Con mas de 12 reps la formula ya no vale: null.
  function e1rm(kg, reps) {
    if (!kg || !reps || reps < 1 || reps > 12) return null;
    return reps === 1 ? kg : kg * (1 + reps / 30);
  }
  function clave(t) { return String(t || "").trim().toLowerCase(); }
  // la mejor serie de trabajo de un ejercicio (sin calentamiento): la de mas 1RM estimado
  function mejorSerie(e) {
    var m = null;
    (e && e.sets || []).forEach(function (x) {
      if (x.tipo === "warmup" || !x.kg || !x.reps) return;
      var v = e1rm(x.kg, x.reps);
      if (v == null) v = x.kg;                           // muchas reps: vale el peso
      if (!m || v > m.e1rm || (v === m.e1rm && x.kg > m.kg)) m = { kg: x.kg, reps: x.reps, e1rm: v };
    });
    return m;
  }
  function ordena(acts) {
    return (acts || []).slice().sort(function (a, b) {
      return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : String(a.hora || "") < String(b.hora || "") ? -1 : 1;
    });
  }
  // por ejercicio, las sesiones en orden y cuanto ha subido la mejor serie
  function ejercicios(acts, desde, hasta) {
    var M = {};
    ordena(entre(acts, desde, hasta)).forEach(function (a) {
      if (!esGym(a)) return;
      (a.ejercicios || []).forEach(function (e) {
        var m = mejorSerie(e); if (!m) return;
        var k = clave(e.titulo);
        (M[k] = M[k] || { titulo: e.titulo, sesiones: [] }).sesiones.push({ fecha: a.fecha, kg: m.kg, reps: m.reps, e1rm: m.e1rm });
      });
    });
    return Object.keys(M).map(function (k) {
      var x = M[k], s = x.sesiones, p = s[0], u = s[s.length - 1];
      x.ultima = u; x.primera = p;
      x.cambio = s.length > 1 && p.e1rm ? (u.e1rm - p.e1rm) / p.e1rm : null;
      x.mejor = s.reduce(function (m, y) { return !m || y.e1rm > m.e1rm ? y : m; }, null);
      return x;
    }).sort(function (a, b) { return b.sesiones.length - a.sesiones.length || (a.titulo < b.titulo ? -1 : 1); });
  }
  // la ultima vez que se hizo ese ejercicio antes de esta actividad
  function anterior(acts, act, titulo) {
    var k = clave(titulo), L = ordena(acts), i = -1;
    for (var j = 0; j < L.length; j++) if (L[j] === act || (act.id && L[j].id === act.id)) { i = j; break; }
    if (i < 0) L = L.filter(function (a) { return a.fecha < act.fecha; }); else L = L.slice(0, i);
    for (var n = L.length - 1; n >= 0; n--) {
      if (!esGym(L[n])) continue;
      var e = (L[n].ejercicios || []).filter(function (x) { return clave(x.titulo) === k; })[0];
      var m = e && mejorSerie(e);
      if (m) return { fecha: L[n].fecha, kg: m.kg, reps: m.reps, e1rm: m.e1rm };
    }
    return null;
  }

  /* ---------------------------- el peso que toca hoy ----------------------------
     La regla del plan: mismo peso en todas las series (y 2 reps en recamara). Si la ultima
     vez TODAS las series de trabajo llegaron al tope de reps del plan, toca subir un escalon
     (5 lb); si no, repetir ese peso. El nombre del plan ("Press pecho") se busca en Hevy
     ("Press de Pecho (Maquina)"): sin lo de entre parentesis ni palabras de relleno, las del
     nombre mas corto tienen que estar todas en el otro.                                   */
  var RELLENO = { de: 1, del: 1, la: 1, el: 1, al: 1, con: 1, en: 1, para: 1, a: 1, y: 1, maquina: 1, machine: 1 };
  function palabrasEj(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\([^)]*\)/g, " ")
      .replace(/[^a-z0-9ñ ]+/g, " ").split(/\s+/).filter(function (w) { return w && !RELLENO[w]; })
      .map(function (w) { return w.length > 4 ? w.replace(/(es|s)$/, "") : w; });
  }
  function mismoEjercicio(a, b) {                        // 0 (no) a 1 (igual)
    var A = palabrasEj(a), B = palabrasEj(b); if (!A.length || !B.length) return 0;
    var c = A.filter(function (w) { return B.indexOf(w) >= 0; }).length;
    return c === Math.min(A.length, B.length) ? c / Math.max(A.length, B.length) : 0;
  }
  function topeReps(reps) {                              // "10/10/8-10" o "8-10" -> {min: 8, max: 10}
    var n = String(reps == null ? "" : reps).match(/\d+/g);
    if (!n) return null;
    n = n.map(Number);
    return { min: Math.min.apply(null, n), max: Math.max.apply(null, n) };
  }
  var ESCALON_KG = 5 / 2.20462;                          // 5 lb
  function pesoQueToca(acts, nombre, reps, antesDe) {
    var R = topeReps(reps), L = ordena(acts);
    for (var n = L.length - 1; n >= 0; n--) {
      var a = L[n];
      if (!esGym(a) || (antesDe && a.fecha >= antesDe)) continue;
      var e = null, pm = 0;
      (a.ejercicios || []).forEach(function (x) { var p = mismoEjercicio(nombre, x.titulo); if (p > pm) { pm = p; e = x; } });
      if (!e) continue;
      var S = (e.sets || []).filter(function (x) { return x.tipo !== "warmup" && x.kg && x.reps; });
      if (!S.length) continue;
      var kg = Math.max.apply(null, S.map(function (x) { return x.kg; }));
      var alTope = !!R && S.every(function (x) { return x.reps >= R.max; });
      return { fecha: a.fecha, titulo: e.titulo, sets: S.map(function (x) { return { kg: x.kg, reps: x.reps }; }),
               kg: alTope ? kg + ESCALON_KG : kg, sube: alTope, tope: R ? R.max : null };
    }
    return null;
  }

  /* v2.56.2 · lo que se hizo en una sesion de gimnasio, por ejercicio y sin calentamientos, para la
     tarjeta del dia cuando el evento no trae ejercicios: series, reps de cada serie ("10/10/9") y el peso
     (kg si fue el mismo en todas; si cambio, kgMax con el mayor). Sin sesion o sin ejercicios: [].   */
  function resumenGym(a) {
    if (!a || !esGym(a)) return [];
    return (a.ejercicios || []).map(function (e) {
      var S = (e.sets || []).filter(function (x) { return x.tipo !== "warmup"; });
      if (!S.length) return null;
      var kgs = S.map(function (x) { return x.kg || 0; }).filter(Boolean);
      var igual = kgs.length === S.length && kgs.every(function (k) { return k === kgs[0]; });
      var reps = S.map(function (x) { return x.reps != null ? String(x.reps) : x.seg ? x.seg + " s" : x.m ? x.m + " m" : "?"; });
      return { nombre: String(e.titulo || "Ejercicio"), series: S.length,
               reps: reps.every(function (r) { return r === reps[0]; }) ? reps[0] : reps.join("/"),
               kg: igual ? kgs[0] : null, kgMax: kgs.length ? Math.max.apply(null, kgs) : null };
    }).filter(Boolean);
  }

  return { resumenGym: resumenGym, mas: mas, lunes: lunes, esRun: esRun, esGym: esGym, esCinta: esCinta, bloque: bloque, semanas: semanas,
    carga: carga, records: records, e1rm: e1rm, mejorSerie: mejorSerie, ejercicios: ejercicios, anterior: anterior,
    mismoEjercicio: mismoEjercicio, topeReps: topeReps, pesoQueToca: pesoQueToca };
});
