/* ===========================================================================
   NATIVO · Copiloto como app Android (Capacitor 8)
   ---------------------------------------------------------------------------
   En el navegador no hace nada (window.Nativo.es === false): la PWA sigue
   exactamente igual. Dentro del APK:

   - Voz: window.speechSynthesis compatible que habla con la voz neuronal que
     va dentro de la app (Miro, sin internet) y, si esa fallara, con la del
     sistema. Pide el foco de audio "transitorio con atenuacion": Spotify
     baja el volumen mientras habla y vuelve solo (en Chrome no se podia).
   - Pantalla encendida: navigator.wakeLock con el flag nativo de Android.
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
  // la musica mientras habla: "baja" (por defecto, como Google Maps: Android la deja al 20 %),
  // "pausa" (Spotify se para y sigue solo) o "nada" (la voz por encima, la musica no cambia)
  var LSM = "copiloto.musica", MODOS = ["baja", "pausa", "nada"];
  N.musica = function (v) {
    try {
      if (MODOS.indexOf(v) >= 0) localStorage.setItem(LSM, v);
      var m = localStorage.getItem(LSM); return MODOS.indexOf(m) >= 0 ? m : "baja";
    } catch (e) { return "baja"; }
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
      var cerrada = false; actual = f; voz.speaking = true;
      function cierra(tipo, extra) {
        if (cerrada) return; cerrada = true;
        if (actual === f) { actual = null; voz.speaking = false; }
        avisa(f, tipo, extra);
      }
      try {
        var mm = musica();
        C.nativeCallback(P, "hablar", { texto: f.text, velocidad: +f.rate || 1, pausa: mm.pausa, sinFoco: mm.sinFoco }, function (r, err) {
          if (err || !r) { cierra("error", { error: "synthesis-failed" }); return; }
          if (r.evento === "inicio") { if (!cerrada) avisa(f, "start"); }
          else if (r.evento === "fin") cierra("end");
          else if (r.evento === "cortada") cierra("error", { error: "interrupted" });
          else cierra("error", { error: "synthesis-failed", detalle: r.error || "" });
        });
      } catch (x) { setTimeout(function () { cierra("error", { error: "synthesis-failed" }); }, 0); }
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
  var ultimo = null;
  var cerrojo = {
    request: function (tipo) {
      return llama(P, "pantalla", { encendida: true }).then(function () {
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
})();
