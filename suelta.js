/* Copiloto · Carrera sin ruta ("suelta")
   ------------------------------------------------------------------------
   Para cuando sales por donde te apetezca: no hay GPX, no hay salida que
   pisar ni dibujo. El reloj cuenta desde que tocas Empezar y la distancia se
   suma a pelo con el GPS. En pantalla: tiempo, distancia, ritmo actual,
   ritmo medio y el ultimo km. Por voz, cada km: el parcial y lo que llevas.

   Usa navigator.geolocation y navigator.wakeLock (en la app Android los
   cambia nativo.js por el GPS en segundo plano y el cerrojo de pantalla) y
   la voz de la app (aviso / habla) si estan.

   API: Suelta.abre({ titulo, ritmo:[segMin, segMax] })                    */
(function () {
  "use strict";

  var ACC_MAX = 35;          // fixes peores que esto no suman metros
  var PASO_MIN = 8;          // a saltos de 8 m: el baile del GPS parado no suma
  var VEL_MAX = 9;           // m/s: mas rapido que esto es un salto del GPS

  var st = null;             // estado de la sesion abierta
  var raiz = null;

  function $(id) { return document.getElementById(id); }
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function metros(a, b) {
    var R = 6371000, p1 = a[0] * Math.PI / 180, p2 = b[0] * Math.PI / 180;
    var dp = p2 - p1, dl = (b[1] - a[1]) * Math.PI / 180;
    var x = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function reloj(s) {
    s = Math.max(0, Math.floor(s));
    var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, g = s % 60;
    return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (g < 10 ? "0" : "") + g;
  }
  function ritmoTxt(sk) {                      // seg/km -> 6'05"
    if (!(sk > 0) || sk > 1200) return "–";
    sk = Math.round(sk);
    var m = Math.floor(sk / 60), g = sk % 60;
    return m + "'" + (g < 10 ? "0" : "") + g + '"';
  }
  function ritmoVoz(sk) {
    if (typeof window.dicePace === "function") return window.dicePace(sk);
    sk = Math.round(sk); var m = Math.floor(sk / 60), g = sk % 60;
    return m + " " + (g === 0 ? "justos" : (g < 10 ? "cero " + g : g));
  }
  function minutosVoz(s) {
    var m = Math.floor(s / 60), g = Math.floor(s % 60);
    return (m === 1 ? "1 minuto" : m + " minutos") + (g ? " y " + g + (g === 1 ? " segundo" : " segundos") : "");
  }
  function kmVoz(m) {
    var k = Math.round(m / 100) / 10;
    return String(k).replace(".", " coma ");
  }
  function di(txt, bien) {
    try {
      if (typeof window.aviso === "function") window.aviso(txt, bien !== false);
      else if (typeof window.habla === "function") window.habla(txt);
    } catch (e) {}
  }

  /* ---------------------------- tiempo ---------------------------- */
  function seg() {
    if (!st || !st.t0) return 0;
    var hasta = st.pausaEn || st.finEn || Date.now();
    return (hasta - st.t0 - st.parado) / 1000;
  }

  /* ----------------------------- GPS ------------------------------ */
  function enciendeGPS() {
    if (!navigator.geolocation) { gps("Este móvil no da GPS. El reloj cuenta igual.", true); return; }
    if (st.watch !== null) return;
    gps("Buscando GPS…");
    try {
      st.watch = navigator.geolocation.watchPosition(onPos, onErr,
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
    } catch (e) { gps("No se ha podido encender el GPS.", true); }
  }
  function apagaGPS() {
    if (st && st.watch !== null && navigator.geolocation) {
      try { navigator.geolocation.clearWatch(st.watch); } catch (e) {}
    }
    if (st) st.watch = null;
  }
  function onErr(e) {
    gps(e && e.code === 1 ? "Ubicación denegada: el reloj cuenta, la distancia no."
                          : "Sin señal GPS. Espera unos segundos en la calle.", true);
  }
  function onPos(pos) {
    if (!st) return;
    var acc = pos.coords.accuracy, p = [pos.coords.latitude, pos.coords.longitude], ahora = Date.now();
    st.acc = acc;
    gps(acc <= ACC_MAX ? "GPS listo · " + Math.round(acc) + " m" : "GPS flojo · " + Math.round(acc) + " m", acc > ACC_MAX);
    if (!st.corriendo || st.pausaEn || st.finEn) { st.ancla = null; return; }
    if (acc > ACC_MAX) return;
    if (!st.ancla) { st.ancla = p; st.tAncla = ahora; return; }
    var d = metros(st.ancla, p), dt = Math.max(1, (ahora - st.tAncla) / 1000);
    if (d < PASO_MIN) return;
    if (d / dt > VEL_MAX && d > 40) { st.ancla = p; st.tAncla = ahora; return; }   // salto raro: me recoloco sin sumar
    st.dist += d; st.ancla = p; st.tAncla = ahora;
    st.buf.push([ahora, st.dist]);
    while (st.buf.length > 2 && ahora - st.buf[0][0] > 30000) st.buf.shift();
    miraKm();
  }
  function miraKm() {
    var k = Math.floor(st.dist / 1000);
    if (k <= st.km) return;
    var t = seg();
    st.km = k;
    var parcial = t - st.tKm; st.tKm = t; st.ultKm = parcial;
    st.parciales.push(parcial);
    var txt = "Kilómetro " + k + ". Ese kilómetro en " + ritmoVoz(parcial) + ". Llevas " + minutosVoz(t) + ".";
    if (st.ritmo && parcial < st.ritmo[0] - 10) txt += " Vas rápido para hoy.";
    di(txt, true);
  }
  function ritmoActual() {
    if (!st.buf.length) return 0;
    var a = st.buf[0], b = st.buf[st.buf.length - 1];
    if (Date.now() - b[0] > 15000) return 0;          // parado o sin señal
    var dd = b[1] - a[1], dt = (b[0] - a[0]) / 1000;
    return dd >= 40 && dt > 0 ? dt / dd * 1000 : 0;
  }

  /* ---------------------------- pantalla ---------------------------- */
  function estilos() {
    if ($("sueltaCss")) return;
    var s = document.createElement("style"); s.id = "sueltaCss";
    s.textContent =
      "#appSuelta{--bg:#0a0b0d;--fg:#f4f5f7;--mu:#8e939b;--sf:#15171b;--sf2:#1c1f24;--ln:rgba(255,255,255,.08);--ac:#4f9be8;--mal:#ef6a60;" +
      "position:fixed;inset:0;z-index:9000;background:var(--bg);color:var(--fg);display:flex;flex-direction:column;" +
      "padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));overflow:auto;font-variant-numeric:tabular-nums}" +
      "html[data-tema=claro] #appSuelta{--bg:#f6f6f4;--fg:#141518;--mu:#5b6069;--sf:#fff;--sf2:#ebebe7;--ln:rgba(0,0,0,.08)}" +
      "#appSuelta .suCab{display:flex;align-items:center;gap:12px;min-height:44px}" +
      "#appSuelta .suCab h1{flex:1;margin:0;font-size:18px;font-weight:800;line-height:1.2;text-transform:none;letter-spacing:0;text-align:left;color:var(--fg)}" +
      "#appSuelta .suCab small{display:block;color:var(--mu);font-size:13px;font-weight:600;text-transform:none;letter-spacing:0}" +
      "#appSuelta .suX{flex:0 0 auto;width:auto;border:0;background:var(--sf2);color:var(--fg);border-radius:12px;min-width:44px;min-height:44px;font-size:15px;font-weight:700;padding:0 14px}" +
      "#appSuelta .suGps{margin-top:8px;font-size:13px;color:var(--mu)}#appSuelta .suGps.mal{color:var(--mal)}" +
      "#appSuelta .suReloj{font-size:clamp(64px,22vw,112px);font-weight:800;letter-spacing:-.03em;text-align:center;margin:28px 0 4px;line-height:1}" +
      "#appSuelta .suRef{text-align:center;color:var(--mu);font-size:14px;font-weight:600}" +
      "#appSuelta .suGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:24px 0}" +
      "#appSuelta .suGrid div{background:var(--sf);border:1px solid var(--ln);border-radius:16px;padding:14px}" +
      "#appSuelta .suGrid i{display:block;font-style:normal;color:var(--mu);font-size:13px;font-weight:600}" +
      "#appSuelta .suGrid b{display:block;font-size:30px;font-weight:800;margin-top:4px}" +
      "#appSuelta .suGrid .grande{grid-column:1/-1}#appSuelta .suGrid .grande b{font-size:44px}" +
      "#appSuelta .suBot{margin-top:auto;display:flex;gap:10px}" +
      "#appSuelta .suBot button{flex:1;min-height:60px;border-radius:18px;border:0;font-size:18px;font-weight:800}" +
      "#appSuelta .suGo{background:var(--ac);color:#fff}#appSuelta .suSec{background:var(--sf2);color:var(--fg)}" +
      "#appSuelta .suFin{background:var(--sf);color:var(--mal);border:1px solid var(--ln)!important}" +
      "#appSuelta .suNota{color:var(--mu);font-size:13px;text-align:center;margin:8px 0 0}" +
      "#appSuelta .suKms{margin:0 0 16px;padding:0;list-style:none;font-size:15px}" +
      "#appSuelta .suKms li{display:flex;justify-content:space-between;padding:8px 2px;border-bottom:1px solid var(--ln)}";
    document.head.appendChild(s);
  }
  function monta() {
    estilos();
    raiz = document.createElement("div");
    raiz.id = "appSuelta";
    raiz.setAttribute("role", "dialog");
    raiz.setAttribute("aria-label", "Carrera sin ruta");
    raiz.innerHTML =
      '<div class="suCab"><h1><span id="suTit"></span><small>Sin ruta · cuenta desde Empezar</small></h1>' +
      '<button class="suX" id="suSalir">Salir</button></div>' +
      '<div class="suGps" id="suGps"></div>' +
      '<div class="suReloj" id="suReloj">0:00</div>' +
      '<div class="suRef" id="suRef"></div>' +
      '<div class="suGrid">' +
      '<div class="grande"><i>Distancia</i><b id="suDist">0,00 km</b></div>' +
      '<div><i>Ritmo ahora</i><b id="suAhora">–</b></div>' +
      '<div><i>Ritmo medio</i><b id="suMedio">–</b></div>' +
      '<div><i>Último km</i><b id="suUlt">–</b></div>' +
      '<div><i>Km</i><b id="suKm">0</b></div>' +
      '</div>' +
      '<ol class="suKms" id="suKms" hidden></ol>' +
      '<div class="suBot" id="suBot"></div>' +
      '<p class="suNota" id="suNota"></p>';
    document.body.appendChild(raiz);
    $("suSalir").addEventListener("click", function () {
      if (st && st.corriendo && !st.finEn) {
        if (!confirm("¿Terminar la carrera y salir?")) return;
        termina();
      }
      cierra();
    });
  }
  function gps(t, mal) { var e = $("suGps"); if (e) { e.textContent = t; e.className = "suGps" + (mal ? " mal" : ""); } }
  function boton(txt, cls, fn) {
    var b = document.createElement("button"); b.className = cls; b.textContent = txt;
    b.addEventListener("click", fn); return b;
  }
  function botones() {
    var c = $("suBot"); c.innerHTML = "";
    if (!st.corriendo) {
      c.appendChild(boton("Empezar", "suGo", empieza));
      $("suNota").textContent = "Puedes empezar sin esperar al GPS: la distancia se suma en cuanto haya señal.";
    } else if (st.finEn) {
      c.appendChild(boton("Cerrar", "suSec", cierra));
      $("suNota").textContent = "No se guarda nada aquí: la carrera la sube tu reloj a Strava.";
    } else {
      c.appendChild(boton(st.pausaEn ? "Seguir" : "Pausa", st.pausaEn ? "suGo" : "suSec", pausa));
      c.appendChild(boton("Terminar", "suSec suFin", function () { if (confirm("¿Terminar la carrera?")) termina(); }));
      $("suNota").textContent = "";
    }
  }
  function pinta() {
    if (!st || !raiz) return;
    var t = seg();
    $("suReloj").textContent = reloj(t);
    $("suDist").textContent = (st.dist / 1000).toFixed(2).replace(".", ",") + " km";
    $("suKm").textContent = String(st.km);
    var ra = st.pausaEn || st.finEn ? 0 : ritmoActual();
    $("suAhora").textContent = ritmoTxt(ra);
    $("suMedio").textContent = st.dist >= 100 ? ritmoTxt(t / st.dist * 1000) : "–";
    $("suUlt").textContent = st.ultKm ? ritmoTxt(st.ultKm) : "–";
  }

  /* --------------------------- acciones --------------------------- */
  function cerrojo() {
    try {
      if (navigator.wakeLock && navigator.wakeLock.request)
        navigator.wakeLock.request("screen").then(function (w) { if (st) st.lock = w; }).catch(function () {});
    } catch (e) {}
  }
  function suelta() { try { if (st && st.lock) st.lock.release(); } catch (e) {} if (st) st.lock = null; }
  function empieza() {
    st.corriendo = true; st.t0 = Date.now(); st.parado = 0; st.pausaEn = 0;
    st.dist = 0; st.km = 0; st.tKm = 0; st.ultKm = 0; st.buf = []; st.ancla = null; st.parciales = [];
    window.corriendoSuelta = true;
    cerrojo();
    di("Empezamos." + (st.ritmo ? " Ritmo de referencia " + ritmoVoz(st.ritmo[0]) + " a " + ritmoVoz(st.ritmo[1]) + "." : ""), true);
    botones(); pinta();
  }
  function pausa() {
    if (st.pausaEn) { st.parado += Date.now() - st.pausaEn; st.pausaEn = 0; st.ancla = null; di("Seguimos.", true); }
    else { st.pausaEn = Date.now(); di("Pausa.", false); }
    botones(); pinta();
  }
  function termina() {
    if (!st || st.finEn) return;
    if (st.pausaEn) { st.parado += Date.now() - st.pausaEn; st.pausaEn = 0; }
    st.finEn = Date.now();
    window.corriendoSuelta = false;
    apagaGPS(); suelta();
    var t = seg();
    di("Terminado. " + kmVoz(st.dist) + " kilómetros en " + minutosVoz(t) +
       (st.dist >= 500 ? ". Ritmo medio " + ritmoVoz(t / st.dist * 1000) + "." : "."), true);
    var ol = $("suKms"); ol.innerHTML = "";
    st.parciales.forEach(function (p, i) {
      var li = document.createElement("li");
      li.innerHTML = "<span>Km " + (i + 1) + "</span><b>" + esc(ritmoTxt(p)) + "</b>";
      ol.appendChild(li);
    });
    ol.hidden = !st.parciales.length;
    gps("Terminado · " + reloj(t));
    botones(); pinta();
  }
  function cierra() {
    clearInterval(st && st.tick);
    apagaGPS(); suelta();
    window.corriendoSuelta = false;
    if (raiz && raiz.parentNode) raiz.parentNode.removeChild(raiz);
    raiz = null; st = null;
  }

  function abre(o) {
    o = o || {};
    if (st) cierra();
    st = { titulo: o.titulo || "Carrera libre", ritmo: (o.ritmo && o.ritmo[0] > 0) ? o.ritmo : null,
           corriendo: false, t0: 0, parado: 0, pausaEn: 0, finEn: 0,
           dist: 0, km: 0, tKm: 0, ultKm: 0, buf: [], ancla: null, tAncla: 0, parciales: [],
           watch: null, acc: null, lock: null, tick: null };
    monta();
    $("suTit").textContent = st.titulo;
    $("suRef").textContent = st.ritmo ? "Referencia " + ritmoTxt(st.ritmo[0]) + " – " + ritmoTxt(st.ritmo[1]) + " /km" : "";
    enciendeGPS();
    botones(); pinta();
    st.tick = setInterval(pinta, 500);
  }

  /* "6'00"-6'10"" o "6:00-6:10" en el texto del evento -> [360, 370] */
  function ritmoDeTexto(txt) {
    var m = String(txt || "").match(/(\d{1,2})\s*['’:]\s*(\d{2})\s*(?:"|”|'')?\s*(?:[-–a]|\/km\s*[-–])\s*(\d{1,2})\s*['’:]\s*(\d{2})/);
    if (!m) return null;
    var a = (+m[1]) * 60 + (+m[2]), b = (+m[3]) * 60 + (+m[4]);
    if (!(a >= 180 && a <= 600 && b >= a && b <= 660)) return null;
    return [a, b];
  }
  /* El evento pide salir sin ruta: "ruta libre", "sin ruta", "ruta improvisada", "random" */
  function pideSinRuta(txt) {
    var t = " " + String(txt || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
                 .replace(/[^a-z0-9]+/g, " ") + " ";
    return / ruta libre | sin ruta | ruta improvisada | ruta random | ruta al azar /.test(t);
  }

  window.Suelta = { abre: abre, cierra: cierra, ritmoDeTexto: ritmoDeTexto, pideSinRuta: pideSinRuta,
                    activa: function () { return !!st; } };
})();
