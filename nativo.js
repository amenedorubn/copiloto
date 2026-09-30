/* ===========================================================================
   NATIVO · Copiloto como app Android (Capacitor 8)
   ---------------------------------------------------------------------------
   En el navegador no hace nada (window.Nativo.es === false): la PWA sigue
   exactamente igual. Dentro del APK:

   - Voz: window.speechSynthesis compatible que habla con la voz del movil o
     con Miro, la neuronal que va dentro de la app (sin internet), a elegir.
     Mientras habla, Spotify se pausa y sigue solo (o no se toca, a elegir);
     en Chrome se paraba y habia que darle a play.
   - Pantalla encendida: navigator.wakeLock con el flag nativo de Android.
   - GPS con la pantalla apagada: navigator.geolocation.watchPosition con el
     servicio nativo (notificacion con km, tiempo, ritmo, Pausa y "¿Como voy?").
     Con el GPS nativo, la pantalla puede apagarse (Ajustes).
   - Informe de cada salida, que se guarda solo en el movil (GPS, pantalla,
     voz, bateria y el Diario de voz), y APK nuevo sin cable desde Ajustes.
   - Actualizaciones: la web va dentro del APK. Las versiones nuevas se bajan
     como zip de las releases de GitHub y se aplican al abrir la app (o con
     "Actualizar ahora"). Si una version no llega a arrancar, el actualizador
     vuelve solo a la anterior. Nunca con un entreno en marcha.
   =========================================================================== */
(function () {
  "use strict";
  var C = window.Capacitor;
  var es = !!(C && typeof C.isNativePlatform === "function" && C.isNativePlatform() &&
              typeof C.nativePromise === "function" && typeof C.nativeCallback === "function");
  var N = window.Nativo = { es: es };
  if (!es) return;

  var P = "Copiloto", U = "CapacitorUpdater";
  function llama(plugin, metodo, datos) { return C.nativePromise(plugin, metodo, datos || {}); }
  // lo que trae el APK instalado (un APK viejo con una web nueva no tiene lo ultimo)
  function tiene(metodo) {
    try {
      var h = (C.PluginHeaders || []).filter(function (x) { return x.name === P; })[0];
      return !!(h && (h.methods || []).some(function (m) { return m.name === metodo; }));
    } catch (e) { return false; }
  }
  // la musica mientras habla: "pausa" (por defecto: Spotify se calla y sigue solo) o "nada"
  // (la voz por encima). Bajarla al 20 % (como Google Maps) no se notaba en el OnePlus: fuera.
  var LSM = "copiloto.musica2", MODOS = ["pausa", "nada"];
  N.musica = function (v) {
    try {
      if (MODOS.indexOf(v) >= 0) localStorage.setItem(LSM, v);
      var m = localStorage.getItem(LSM); return MODOS.indexOf(m) >= 0 ? m : "pausa";
    } catch (e) { return "pausa"; }
  };
  // la voz: "movil" (por defecto, la que tiene el telefono) o "miro" (la de la app, sin internet)
  var LSV = "copiloto.voz", VOCES = ["movil", "miro"];
  N.voz = function (v) {
    try {
      if (VOCES.indexOf(v) >= 0) localStorage.setItem(LSV, v);
      var m = localStorage.getItem(LSV); return VOCES.indexOf(m) >= 0 ? m : "movil";
    } catch (e) { return "movil"; }
  };
  function musica() { var m = N.musica(); return { pausa: m === "pausa", sinFoco: m === "nada" }; }

  /* -------------------------------- voz -------------------------------- */
  function Frase(t) {
    this.text = String(t == null ? "" : t); this.lang = "es-ES"; this.rate = 1; this.pitch = 1; this.volume = 1;
    this.voice = null; this.onstart = null; this.onend = null; this.onerror = null;
    this.onboundary = null; this.onpause = null; this.onresume = null; this.onmark = null;
  }
  function avisa(f, tipo, extra) {
    var h = f && f["on" + tipo]; if (typeof h !== "function") return;
    var e = { type: tipo, utterance: f, elapsedTime: 0, charIndex: 0 };
    if (extra) for (var k in extra) e[k] = extra[k];
    try { h.call(f, e); } catch (x) {}
  }
  var actual = null;
  var voz = {
    speaking: false, pending: false, paused: false, onvoiceschanged: null,
    speak: function (f) {
      if (!f) return;
      var cerrada = false, empezo = false, intento = 0; actual = f; voz.speaking = true;
      function cierra(tipo, extra) {
        if (cerrada) return; cerrada = true;
        if (actual === f) { actual = null; voz.speaking = false; }
        avisa(f, tipo, extra);
      }
      // Si falla antes de sonar (30/09: la voz del movil dio error en la primera frase y la web
      // se paso entera a la voz por audio, que corta Spotify), otra vez al momento y luego con
      // la otra voz. Solo si fallan las dos se entera la web.
      function lanza(v) {
        try {
          var mm = musica();
          C.nativeCallback(P, "hablar", { texto: f.text, velocidad: +f.rate || 1, pausa: mm.pausa, sinFoco: mm.sinFoco, voz: v }, function (r, err) {
            if (cerrada) return;
            if (!err && r && r.evento === "inicio") { empezo = true; avisa(f, "start"); return; }
            if (!err && r && r.evento === "fin") { cierra("end"); return; }
            if (!err && r && r.evento === "cortada") { cierra("error", { error: "interrupted" }); return; }
            if (!empezo && intento < 2 && actual === f) {
              intento++;
              var otra = intento === 1 ? v : (v === "miro" ? "movil" : "miro");
              if (N.informe) N.informe("voz", "reintento " + intento + " con " + (otra === "miro" ? "Miro" : "la del móvil"));
              setTimeout(function () { if (!cerrada && actual === f) lanza(otra); }, intento === 1 ? 600 : 0);
              return;
            }
            cierra("error", { error: "synthesis-failed", detalle: (r && r.error) || "" });
          });
        } catch (x) { setTimeout(function () { cierra("error", { error: "synthesis-failed" }); }, 0); }
      }
      lanza(N.voz());
    },
    cancel: function () { actual = null; voz.speaking = false; llama(P, "callar").catch(function () {}); },
    pause: function () {}, resume: function () {},
    getVoices: function () { return []; },
    addEventListener: function () {}, removeEventListener: function () {}
  };
  function pon(obj, nombre, valor) {
    try { Object.defineProperty(obj, nombre, { value: valor, configurable: true, writable: true }); }
    catch (e) { try { obj[nombre] = valor; } catch (x) {} }
  }
  pon(window, "speechSynthesis", voz);
  pon(window, "SpeechSynthesisUtterance", Frase);
  // cual de las dos voces esta lista: {neural, sistema}
  N.estadoVoz = function () { return llama(P, "estado"); };
  // el pitido de los avisos, nativo: con un <audio> de la web Android le quitaria el
  // foco a Spotify para siempre (se para y no vuelve). Solo si el APK ya lo trae.
  N.tono = tiene("tono") ? function (bien) { var mm = musica(); return llama(P, "tono", { sube: !!bien, pausa: mm.pausa, sinFoco: mm.sinFoco }); } : null;
  // Ajustes: un aviso de muestra (pitido y voz), para elegir de oido que hacer con la musica
  N.pruebaAviso = function () {
    if (N.tono) N.tono(true).catch(function () {});
    setTimeout(function () {
      var u = new Frase("Así suenan los avisos. Kilómetro cinco: vas a cinco quince el kilómetro, perfecto, mantén el ritmo.");
      u.rate = 1.02; voz.cancel(); voz.speak(u);
    }, 520);
  };

  /* ------------------------- pantalla encendida ------------------------- */
  // Cada parte de la app guarda su "cerrojo" y lo pide otra vez al volver a la
  // pantalla sin soltar el anterior: manda el ultimo. Soltar uno viejo no apaga nada.
  // Con el GPS nativo en marcha la pantalla puede apagarse: GPS y voz siguen (Ajustes)
  var LSP = "copiloto.pantalla", PANTALLAS = ["apaga", "encendida"];
  N.pantallaCarrera = !tiene("gps") ? null : function (v) {
    try {
      if (PANTALLAS.indexOf(v) >= 0) localStorage.setItem(LSP, v);
      var m = localStorage.getItem(LSP); return PANTALLAS.indexOf(m) >= 0 ? m : "apaga";
    } catch (e) { return "apaga"; }
  };
  var ultimo = null;
  var cerrojo = {
    request: function (tipo) {
      // con el GPS nativo pedido (aunque aun este arrancando: al tocar Empezar se piden los dos
      // a la vez), la pantalla puede apagarse. El 30/09 se quedo encendida toda la salida.
      var enciende = !(N.gpsPrevisto && N.gpsPrevisto() && N.pantallaCarrera && N.pantallaCarrera() === "apaga");
      return (enciende ? llama(P, "pantalla", { encendida: true }) : Promise.resolve()).then(function () {
        var s = {
          type: tipo || "screen", released: false, onrelease: null, _h: [],
          addEventListener: function (t, h) { if (t === "release" && typeof h === "function") s._h.push(h); },
          removeEventListener: function (t, h) { s._h = s._h.filter(function (x) { return x !== h; }); },
          release: function () {
            if (s.released) return Promise.resolve();
            s.released = true;
            var mio = ultimo === s; if (mio) ultimo = null;
            return (mio ? llama(P, "pantalla", { encendida: false }) : Promise.resolve())
              .catch(function () {}).then(function () {
                var e = { type: "release" };
                s._h.forEach(function (h) { try { h(e); } catch (x) {} });
                if (typeof s.onrelease === "function") try { s.onrelease(e); } catch (x) {}
              });
          }
        };
        ultimo = s; return s;
      });
    }
  };
  pon(navigator, "wakeLock", cerrojo);

  /* ------------------------ informe de la salida ------------------------ */
  // Se guarda solo en el movil (lo abre el servicio del GPS): lo que pasa con el GPS, la
  // pantalla, la voz y la bateria, y el Diario de voz. Se comparte desde Ajustes.
  function nada() {}
  N.informe = tiene("informe") ? function (tipo, texto) { llama(P, "informe", { tipo: tipo, texto: String(texto) }).catch(nada); } : nada;
  N.informeDiario = tiene("informe") ? function () {
    try { var d = localStorage.getItem("copiloto.diario.v1"); if (d) llama(P, "informe", { diario: d }).catch(nada); } catch (e) {}
  } : nada;
  N.compartirInforme = tiene("compartirInforme") ? function () { return llama(P, "compartirInforme"); } : null;
  if (window.addEventListener) window.addEventListener("error", function (e) {
    N.informe("error", (e && e.message || "?") + " · " + String(e && e.filename || "").split("/").pop() + ":" + (e && e.lineno || 0));
  });

  /* --------------------- GPS con la pantalla apagada --------------------- */
  // En Chrome el GPS se corta al bloquear el movil. En la app las posiciones las da un
  // servicio nativo en primer plano (con su notificacion: km, tiempo, ritmo, Pausa y
  // "¿Como voy?") que sigue con la pantalla apagada. La web no cambia: usa el
  // watchPosition de siempre. Si el servicio no arranca, el GPS del navegador.
  N.gpsNativo = false;
  var geoReal = navigator.geolocation;
  if (tiene("gps") && geoReal) {
    var vig = {}, sigId = 1, modo = "nativo", encendido = false, pidiendo = false;
    var ultFix = 0, desde = 0, errDado = false, ultNoti = 0, ultDiario = 0, ultEstado = "";
    var hay = function () { for (var k in vig) return true; return false; };
    var quiere = function () {
      if (!hay()) return false;
      if (window.corriendo) return true;
      var g = document.getElementById("appGPS");
      return !!(g && !g.hidden && document.visibilityState === "visible");
    };
    N.gpsPrevisto = function () { return modo === "nativo" && hay(); };
    var aWeb = function (por) {            // sin servicio: el GPS del navegador, como en Chrome
      if (modo === "web") return;
      modo = "web"; encendido = false; N.gpsNativo = false;
      if (ultimo && !ultimo.released) llama(P, "pantalla", { encendida: true }).catch(nada);   // sin el, la pantalla no se puede apagar
      for (var k in vig) { var w = vig[k]; if (w.real == null) w.real = geoReal.watchPosition(w.ok, w.mal, w.op); }
      N.informe("gps", "sin servicio nativo (" + por + "): GPS del navegador");
    };
    var revisa = function () {
      if (modo !== "nativo") return;
      var q = quiere();
      if (q && !encendido && !pidiendo) {
        pidiendo = true;
        llama(P, "gps", { activo: true }).then(function () {
          pidiendo = false; encendido = true; N.gpsNativo = true; desde = Date.now(); ultFix = 0; errDado = false;
          setTimeout(function () {           // Android puede no dejarle arrancar
            llama(P, "gpsEstado").then(function (e) { if (encendido && e && !e.vivo) aWeb("no arranca"); }, nada);
          }, 2500);
          cuenta(true);
        }, function (e) { pidiendo = false; aWeb(e && e.message || "error"); });
      } else if (!q && encendido) {
        encendido = false; N.gpsNativo = false;
        N.informeDiario();
        llama(P, "gps", { activo: false }).catch(nada);
      }
    };
    var txt = function (id) { var e = document.getElementById(id); return e ? String(e.textContent || "").replace(/\s+/g, " ").trim() : ""; };
    // la notificacion (y el latido: si deja de llegar, el servicio avisa de que la web se ha parado)
    var cuenta = function (ya) {
      if (!encendido) return;
      var corre = !!window.corriendo, pausa = !!window.pausado, est = corre + "/" + pausa, ahora = Date.now();
      if (!ya && est === ultEstado && ahora - ultNoti < 2500) return;
      ultNoti = ahora; ultEstado = est;
      var t, x;
      if (!corre) { t = "GPS listo"; x = txt("gps") || "Dale a Empezar"; }
      else {
        var r = txt("rAct"), obj = txt("kmObj"), km = txt("kmNum"), ver = txt("veredicto");
        t = txt("dist") + " km · " + txt("reloj") + (pausa ? " · en pausa" : "");
        x = (r && r.indexOf("-") < 0 ? r + "/km · " : "") + km + (obj ? " · objetivo " + obj : "") + (ver ? " · " + ver : "");
      }
      llama(P, "carrera", { corriendo: corre, pausado: pausa, titulo: t, texto: x }).catch(nada);
      if (ahora - ultDiario > 60000) { ultDiario = ahora; N.informeDiario(); }
      if (corre && !pausa && ahora - ultRitmo > 20000) { ultRitmo = ahora; apuntaRitmo(); }
    };
    // El ritmo actual, cada 20 s, al informe: lo que enseña la pantalla, la media de la
    // velocidad del GPS (de donde sale) y lo recorrido en 30 s. El 30/09 "no iba del todo bien".
    var ultRitmo = 0, ultAcc = null;
    var ritmoTxt = function (s) {
      if (!isFinite(s) || s <= 0) return "—";
      var m = Math.floor(s / 60), g = Math.round(s % 60); if (g === 60) { m++; g = 0; }
      return m + ":" + (g < 10 ? "0" : "") + g;
    };
    var apuntaRitmo = function () {
      try {
        var V = window.VEL || [], H = window.HIST || [], ahora = Date.now(), vs = [];
        for (var i = V.length - 1; i >= 0 && ahora - V[i][0] <= 20000; i--) vs.push(V[i][1]);
        var gps = typeof window.ritmoVel === "function" ? window.ritmoVel(20000, 8) : NaN, dd = "—";
        for (var j = H.length - 1; j >= 0; j--) if (ahora - H[j][0] >= 30000) {
          var d = (window.dist || 0) - H[j][1], dt = (ahora - H[j][0]) / 1000; if (d > 5) dd = ritmoTxt(dt / (d / 1000)); break;
        }
        N.informe("ritmo", "pantalla " + (txt("rAct") || "—") + " · GPS 20 s " + ritmoTxt(gps) + " (" + vs.length + " muestras" +
          (vs.length ? ", " + Math.min.apply(null, vs).toFixed(1) + "–" + Math.max.apply(null, vs).toFixed(1) + " m/s" : "") + ")" +
          " · 30 s por distancia " + dd + (ultAcc != null ? " · GPS " + Math.round(ultAcc) + " m" : ""));
      } catch (e) {}
    };
    var llega = function (d, err) {
      if (err || !d || modo !== "nativo" || !encendido) return;
      ultFix = Date.now(); errDado = false; ultAcc = d.acc;
      var pos = { coords: { latitude: d.lat, longitude: d.lon, accuracy: d.acc,
                            speed: d.vel == null ? null : d.vel, altitude: d.alt == null ? null : d.alt,
                            heading: d.rumbo == null ? null : d.rumbo, altitudeAccuracy: null },
                  timestamp: d.t || ultFix };
      for (var k in vig) { try { vig[k].ok(pos); } catch (e) {} }
      // con la pantalla apagada los temporizadores de la web van frenados, y los avisos
      // salen de pintar(): se pinta con cada posicion
      if (document.visibilityState !== "visible" && typeof window.pintar === "function") { try { window.pintar(); } catch (e) {} }
      cuenta(false);
    };
    C.nativeCallback(P, "addListener", { eventName: "posicion" }, llega);
    C.nativeCallback(P, "addListener", { eventName: "accion" }, function (d) {
      if (!d || !window.corriendo) return;
      if (d.que === "pausa") { var b = document.getElementById("pausa"); if (b) b.click(); cuenta(true); }
      else if (d.que === "comovoy" && !window.pausado && typeof window.diceEstado === "function") window.diceEstado();
    });
    // sin posiciones en 20 s: el error de siempre ("sin señal"), como el timeout del navegador
    setInterval(function () {
      revisa();
      if (encendido && !errDado && Date.now() - (ultFix || desde) > 20000) {
        errDado = true;
        for (var k in vig) { try { if (vig[k].mal) vig[k].mal({ code: 3, message: "sin señal", TIMEOUT: 3 }); } catch (e) {} }
      }
      cuenta(false);
    }, 3000);
    document.addEventListener("visibilitychange", function () { setTimeout(revisa, 0); });
    pon(navigator, "geolocation", {
      getCurrentPosition: function (ok, mal, op) { return geoReal.getCurrentPosition(ok, mal, op); },
      watchPosition: function (ok, mal, op) {
        var id = sigId++; vig[id] = { ok: ok, mal: mal, op: op, real: null };
        if (modo === "web") vig[id].real = geoReal.watchPosition(ok, mal, op);
        setTimeout(revisa, 0);
        return id;
      },
      clearWatch: function (id) {
        var w = vig[id]; if (!w) return;
        if (w.real != null) geoReal.clearWatch(w.real);
        delete vig[id]; setTimeout(revisa, 0);
      }
    });
  }

  /* --------------------------- actualizaciones --------------------------- */
  var REPO = "amenedorubn/copiloto", ZIP = "copiloto-web.zip", LS = "copiloto.app.v1";
  function lee() { try { return JSON.parse(localStorage.getItem(LS) || "{}") || {}; } catch (e) { return {}; } }
  function guarda(o) { try { localStorage.setItem(LS, JSON.stringify(o)); } catch (e) {} }
  function vActual() { return String(window.APP_VERSION || ""); }

  // la ultima release publicada que ya tiene su zip -> {version, url, checksum, notas, fecha}
  N.ultima = function () {
    return fetch("https://api.github.com/repos/" + REPO + "/releases/latest",
                 { cache: "no-store", headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        var a = (j.assets || []).filter(function (x) { return x.name === ZIP; })[0];
        // el actualizador exige el SHA-256 del zip: GitHub lo da en cada archivo de la release
        var suma = a && /^sha256:[0-9a-f]{64}$/i.test(a.digest || "") ? a.digest.slice(7) : "";
        return { version: String(j.tag_name || "").replace(/^v/, ""), url: a && suma ? a.browser_download_url : "",
                 checksum: suma, notas: j.body || "", fecha: String(j.published_at || "").slice(0, 10) };
      });
  };
  // el bundle cargo bien: si no se llama en 15 s, el actualizador vuelve a la version anterior
  N.listo = function () { llama(U, "notifyAppReady").catch(function () {}); };

  // Lo que usa Actualiza (index.html) en la app: misma forma que la version web
  N.actualizador = function (compara, enCurso, punto) {
    var bajando = null;
    function fallida(v) { return (lee().fallidas || []).indexOf(v) >= 0; }
    function baja(u) {                       // -> Promise({id, version}); una sola descarga a la vez
      var s = lee();
      if (s.pendiente && s.pendiente.version === u.version) return Promise.resolve(s.pendiente);
      if (bajando) return bajando;
      bajando = llama(U, "download", { url: u.url, version: u.version, checksum: u.checksum }).then(function (b) {
        var t = lee(); t.pendiente = { id: b.id, version: u.version }; guarda(t); bajando = null; return t.pendiente;
      }, function (e) { bajando = null; throw e; });
      return bajando;
    }
    function aplica(p) {                     // recarga la app con la version bajada
      var s = lee(); s.intento = { id: p.id, version: p.version }; guarda(s);
      return llama(U, "set", { id: p.id });
    }
    function comprueba() {
      return N.ultima().then(function (u) {
        var nueva = !!u.url && !fallida(u.version) && compara(u.version, vActual()) > 0;
        punto(nueva);
        if (nueva && !enCurso()) baja(u).catch(function () {});   // en segundo plano; se pone al abrir
        return { estado: nueva ? "nueva" : "al_dia", version: u.version, notas: u.notas, fecha: u.fecha };
      }).catch(function () { return { estado: "sin_red" }; });
    }
    function actualiza() {
      if (enCurso()) return Promise.reject("Hay un entreno en marcha. Actualiza cuando termines.");
      return N.ultima().then(function (u) {
        if (!u.url || compara(u.version, vActual()) <= 0) { location.reload(); return; }
        return baja(u).then(aplica).catch(function () { throw "La actualización no se ha podido bajar. Prueba otra vez."; });
      }, function () { throw "Sin conexión: no se puede actualizar ahora. La app sigue igual."; });
    }
    // al abrir: si se pidio una version y no es la que corre, es que fallo y se volvio atras
    function arranque() {
      var s = lee(), v = vActual();
      if (s.intento) {
        if (s.intento.version !== v) s.fallidas = (s.fallidas || []).concat([s.intento.version]).slice(-5);
        s.intento = null;
      }
      if (s.pendiente && (compara(s.pendiente.version, v) <= 0 || (s.fallidas || []).indexOf(s.pendiente.version) >= 0)) s.pendiente = null;
      guarda(s);
      if (s.pendiente && !enCurso()) {
        aplica(s.pendiente).catch(function () { var t = lee(); t.pendiente = null; t.intento = null; guarda(t); });
        return true;
      }
      return false;
    }
    return { comprueba: comprueba, actualiza: actualiza, enCurso: enCurso, compara: compara, arranque: arranque };
  };

  /* ---------------------------- APK sin cable ---------------------------- */
  // Lo nativo (GPS, voz, permisos) solo cambia con un APK nuevo. Las releases que lo
  // traen llevan copiloto.apk: la app lo baja, comprueba su SHA-256 y Android pregunta
  // "¿Actualizar?". La primera vez hay que permitir instalar apps de Copiloto.
  // -> Promise({instalada, nueva: null | {version, url, checksum, mb}})
  N.apkNueva = tiene("instalaApk") ? function (compara) {
    return Promise.all([
      llama(P, "apk"),
      fetch("https://api.github.com/repos/" + REPO + "/releases?per_page=15",
            { cache: "no-store", headers: { Accept: "application/vnd.github+json" } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    ]).then(function (x) {
      var yo = x[0] || {}, mejor = null;
      (x[1] || []).forEach(function (j) {
        if (j.draft || j.prerelease) return;
        var a = (j.assets || []).filter(function (s) { return s.name === "copiloto.apk"; })[0];
        var suma = a && /^sha256:[0-9a-f]{64}$/i.test(a.digest || "") ? a.digest.slice(7) : "";
        var v = String(j.tag_name || "").replace(/^v/, "");
        if (!suma || !/^\d+\.\d+\.\d+$/.test(v)) return;
        if (!mejor || compara(v, mejor.version) > 0)
          mejor = { version: v, url: a.browser_download_url, checksum: suma, mb: Math.round((a.size || 0) / 1048576) };
      });
      return { instalada: String(yo.version || ""), nueva: mejor && compara(mejor.version, String(yo.version || "0")) > 0 ? mejor : null };
    });
  } : null;
  // cada({evento: "progreso"|"instalando"|"permiso"|"error", pct, error})
  N.instalaApk = function (u, cada) {
    C.nativeCallback(P, "instalaApk", { url: u.url, checksum: u.checksum, version: u.version }, function (r, err) {
      cada(err || !r ? { evento: "error", error: "nativo" } : r);
    });
  };
})();
