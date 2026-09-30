// Tests del puente con la app Android (nativo.js): la voz, la pantalla y las
// actualizaciones, con un Capacitor de mentira.   node --test tests/*.test.mjs
// Sin dependencias: nativo.js se ejecuta en un contexto vm con un window falso.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const CODIGO = readFileSync(new URL("../nativo.js", import.meta.url), "utf8");
const espera = () => new Promise((r) => setTimeout(r, 0));
// lo que sale del contexto vm tiene otro Object: se compara como JSON
const plano = (x) => JSON.parse(JSON.stringify(x));

// un "movil": Capacitor que apunta las llamadas y deja responder a mano
function movil({ nativo = true, release = null, version = "2.16.0", metodos = ["hablar", "callar", "estado", "pantalla", "tono"],
                 geo = null, doc = null, rechaza = [], vivo = true } = {}) {
  const llamadas = [], callbacks = [], ls = {}, oyentes = {};
  const Capacitor = nativo ? {
    isNativePlatform: () => true,
    PluginHeaders: [{ name: "Copiloto", methods: metodos.map((name) => ({ name, rtype: "promise" })) }],
    nativePromise: (p, m, d) => { llamadas.push([p, m, d]);
      if (rechaza.includes(m)) return Promise.reject(new Error("sin_permiso"));
      if (m === "download") return Promise.resolve({ id: "b-" + d.version, version: d.version });
      if (m === "gpsEstado") return Promise.resolve({ vivo });
      return Promise.resolve({}); },
    nativeCallback: (p, m, d, cb) => { llamadas.push([p, m, d]); callbacks.push(cb);
      if (m === "addListener") oyentes[d.eventName] = cb; return "id"; },
  } : undefined;
  const window = {
    Capacitor, APP_VERSION: version,
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } },
    fetch: async () => release ? { ok: true, json: async () => release } : { ok: false, status: 404 },
  };
  const navigator = geo ? { geolocation: geo } : {};
  const intervalos = [];
  const ctx = vm.createContext({ window, navigator, localStorage: window.localStorage, fetch: window.fetch, setTimeout, Promise, JSON, Object, String,
                                 document: doc, setInterval: (f) => intervalos.push(f) });
  vm.runInContext(CODIGO, ctx);
  return { window, navigator, llamadas, callbacks, ls, oyentes, intervalos };
}
const release = (v, conZip = true) => ({ tag_name: "v" + v, body: "notas", published_at: "2026-10-01T10:00:00Z",
  assets: conZip ? [{ name: "copiloto-web.zip", digest: "sha256:" + "ab".repeat(32), browser_download_url: "https://github.com/x/y/releases/download/v" + v + "/copiloto-web.zip" }] : [] });
const compara = (a, b) => { const p = (v) => v.split(".").map(Number); a = p(a); b = p(b);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; return 0; };

/* ------------------------------- navegador ------------------------------- */
test("en el navegador no toca nada", () => {
  const m = movil({ nativo: false });
  assert.equal(m.window.Nativo.es, false);
  assert.equal(m.window.speechSynthesis, undefined);
  assert.equal(m.navigator.wakeLock, undefined);
});

/* ---------------------------------- voz ---------------------------------- */
test("voz: inicio -> onstart, fin -> onend, y speaking se apaga", () => {
  const m = movil(), w = m.window, ev = [];
  const u = new w.SpeechSynthesisUtterance("Kilómetro cinco");
  u.rate = 1.02; u.onstart = () => ev.push("start"); u.onend = () => ev.push("end"); u.onerror = (e) => ev.push("error:" + e.error);
  w.speechSynthesis.speak(u);
  assert.deepEqual(plano(m.llamadas.at(-1)), ["Copiloto", "hablar", { texto: "Kilómetro cinco", velocidad: 1.02, pausa: true, sinFoco: false, voz: "movil" }]);
  assert.equal(w.speechSynthesis.speaking, true);
  m.callbacks[0]({ evento: "inicio" }); m.callbacks[0]({ evento: "fin" });
  m.callbacks[0]({ evento: "fin" });                         // un segundo cierre no se repite
  assert.deepEqual(ev, ["start", "end"]);
  assert.equal(w.speechSynthesis.speaking, false);
});
test("voz: una frase cortada llega como error 'interrupted' (lo que espera habla())", () => {
  const m = movil(), w = m.window, ev = [];
  const u = new w.SpeechSynthesisUtterance("uno"); u.onerror = (e) => ev.push(e.error);
  w.speechSynthesis.speak(u); m.callbacks[0]({ evento: "cortada" });
  const v = new w.SpeechSynthesisUtterance("dos"); v.onerror = (e) => ev.push(e.error);
  w.speechSynthesis.speak(v); m.callbacks[1](null, { message: "sin motor" });
  assert.deepEqual(ev, ["interrupted"], "un fallo del puente se reintenta antes de avisar (ver 30/09)");
});
test("voz: cancel pide callar", () => {
  const m = movil();
  m.window.speechSynthesis.cancel();
  assert.deepEqual(plano(m.llamadas.at(-1)), ["Copiloto", "callar", {}]);
});

test("musica: por defecto se calla y sigue; se puede no tocar", async () => {
  const m = movil(), w = m.window;
  assert.equal(w.Nativo.musica(), "pausa");
  await w.Nativo.tono(true);
  assert.deepEqual(plano(m.llamadas.at(-1)), ["Copiloto", "tono", { sube: true, pausa: true, sinFoco: false }]);
  assert.equal(w.Nativo.musica("baja"), "pausa");             // bajar ya no se ofrece: no vale
  await w.Nativo.tono(false);
  assert.deepEqual(plano(m.llamadas.at(-1)), ["Copiloto", "tono", { sube: false, pausa: true, sinFoco: false }]);
  w.speechSynthesis.speak(new w.SpeechSynthesisUtterance("hola"));
  assert.equal(m.llamadas.at(-1)[2].pausa, true);
  assert.equal(w.Nativo.musica("nada"), "nada");            // la voz por encima: sin foco
  await w.Nativo.tono(true);
  assert.deepEqual(plano(m.llamadas.at(-1)), ["Copiloto", "tono", { sube: true, pausa: false, sinFoco: true }]);
});
test("voz: por defecto la del movil; se puede elegir Miro", () => {
  const m = movil(), w = m.window;
  assert.equal(w.Nativo.voz(), "movil");
  w.speechSynthesis.speak(new w.SpeechSynthesisUtterance("uno"));
  assert.equal(m.llamadas.at(-1)[2].voz, "movil");
  assert.equal(w.Nativo.voz("miro"), "miro");
  assert.equal(w.Nativo.voz("otra"), "miro");
  w.speechSynthesis.speak(new w.SpeechSynthesisUtterance("dos"));
  assert.equal(m.llamadas.at(-1)[2].voz, "miro");
});
test("probar un aviso: pitido y, medio segundo despues, la frase de muestra", async () => {
  const m = movil();
  m.window.Nativo.pruebaAviso();
  assert.equal(m.llamadas.at(-1)[1], "tono");
  await new Promise((r) => setTimeout(r, 600));
  assert.equal(m.llamadas.at(-1)[1], "hablar");
  assert.match(m.llamadas.at(-1)[2].texto, /Así suenan los avisos/);
});
test("pitido: un APK viejo sin tono deja Nativo.tono vacio (aviso() usa el de la web)", () => {
  assert.equal(movil({ metodos: ["hablar", "callar", "estado", "pantalla"] }).window.Nativo.tono, null);
  assert.equal(typeof movil().window.Nativo.tono, "function");
});

/* ------------------------------ pantalla ------------------------------ */
test("pantalla: manda el ultimo cerrojo; soltar uno viejo no la apaga", async () => {
  const m = movil(), wl = m.navigator.wakeLock;
  const a = await wl.request("screen"), b = await wl.request("screen");
  const n = m.llamadas.length;
  await a.release();
  assert.equal(m.llamadas.length, n);                       // el viejo no apaga
  let soltado = false; b.addEventListener("release", () => { soltado = true; });
  await b.release();
  assert.deepEqual(plano(m.llamadas.at(-1)), ["Copiloto", "pantalla", { encendida: false }]);
  assert.equal(soltado, true); assert.equal(b.released, true);
});

/* ---------------------------- actualizaciones ---------------------------- */
function actualizador(m, enCurso = false) {
  const puntos = [];
  return { A: m.window.Nativo.actualizador(compara, () => enCurso, (s) => puntos.push(s)), puntos };
}
test("comprueba: version nueva con zip -> punto y descarga en segundo plano", async () => {
  const m = movil({ release: release("2.17.0") }), { A, puntos } = actualizador(m);
  const r = await A.comprueba(); await espera();
  assert.equal(r.estado, "nueva"); assert.equal(r.version, "2.17.0");
  assert.deepEqual(puntos, [true]);
  assert.ok(m.llamadas.some(([p, mm, d]) => p === "CapacitorUpdater" && mm === "download" && d.version === "2.17.0" && d.checksum === "ab".repeat(32)));
  assert.equal(JSON.parse(m.ls["copiloto.app.v1"]).pendiente.version, "2.17.0");
});
test("comprueba: sin zip todavia, o misma version -> al dia y sin descargar", async () => {
  for (const rel of [release("2.17.0", false), release("2.16.0")]) {
    const m = movil({ release: rel }), { A } = actualizador(m);
    assert.equal((await A.comprueba()).estado, "al_dia");
    assert.ok(!m.llamadas.some(([, mm]) => mm === "download"));
  }
});
test("comprueba: con un entreno en marcha avisa pero no descarga", async () => {
  const m = movil({ release: release("2.17.0") }), { A } = actualizador(m, true);
  assert.equal((await A.comprueba()).estado, "nueva");
  assert.ok(!m.llamadas.some(([, mm]) => mm === "download"));
});
test("arranque: pone la version bajada al abrir, salvo con entreno en marcha", () => {
  const m = movil(); m.ls["copiloto.app.v1"] = JSON.stringify({ pendiente: { id: "b1", version: "2.17.0" } });
  assert.equal(actualizador(m).A.arranque(), true);
  assert.deepEqual(plano(m.llamadas.at(-1)), ["CapacitorUpdater", "set", { id: "b1" }]);
  const m2 = movil(); m2.ls["copiloto.app.v1"] = JSON.stringify({ pendiente: { id: "b1", version: "2.17.0" } });
  assert.equal(actualizador(m2, true).A.arranque(), false);
});
test("arranque: si la version pedida no es la que corre, fallo: no se vuelve a intentar", async () => {
  const m = movil({ version: "2.16.0", release: release("2.17.0") });
  m.ls["copiloto.app.v1"] = JSON.stringify({ intento: { id: "b1", version: "2.17.0" }, pendiente: { id: "b1", version: "2.17.0" } });
  const { A } = actualizador(m);
  assert.equal(A.arranque(), false);
  const s = JSON.parse(m.ls["copiloto.app.v1"]);
  assert.deepEqual(plano(s.fallidas), ["2.17.0"]); assert.equal(s.pendiente, null);
  assert.equal((await A.comprueba()).estado, "al_dia");     // la fallida no se ofrece otra vez
});
test("arranque: la version pedida ya corre -> se limpia", () => {
  const m = movil({ version: "2.17.0" });
  m.ls["copiloto.app.v1"] = JSON.stringify({ intento: { id: "b1", version: "2.17.0" }, pendiente: { id: "b1", version: "2.17.0" } });
  assert.equal(actualizador(m).A.arranque(), false);
  const s = JSON.parse(m.ls["copiloto.app.v1"]);
  assert.equal(s.intento, null); assert.equal(s.pendiente, null); assert.equal(s.fallidas, undefined);
});
test("comprueba: un zip sin su SHA-256 no se baja (el actualizador lo rechazaria)", async () => {
  const r = release("2.17.0"); delete r.assets[0].digest;
  const m = movil({ release: r }), { A } = actualizador(m);
  assert.equal((await A.comprueba()).estado, "al_dia");
  assert.ok(!m.llamadas.some(([, mm]) => mm === "download"));
});
test("listo avisa al actualizador de que esta version arranca", () => {
  const m = movil(); m.window.Nativo.listo();
  assert.deepEqual(plano(m.llamadas.at(-1)), ["CapacitorUpdater", "notifyAppReady", {}]);
});

/* ------------------------ GPS con la pantalla apagada ------------------------ */
const CON_GPS = ["hablar", "callar", "estado", "pantalla", "tono", "gps", "gpsEstado", "carrera", "informe", "compartirInforme"];
// el GPS del navegador, de mentira: apunta quien lo usa
function geoFalso() {
  const g = { vigila: [], quita: [] };
  g.watchPosition = (ok) => { g.vigila.push(ok); return 100 + g.vigila.length; };
  g.clearWatch = (id) => g.quita.push(id);
  g.getCurrentPosition = () => {};
  return g;
}
// la pantalla del GPS abierta (o no) y lo que pinta
function docGPS(abierto = true, textos = {}) {
  const els = { appGPS: { hidden: !abierto } };
  for (const k in textos) els[k] = { textContent: textos[k] };
  return { visibilityState: "visible", getElementById: (id) => els[id] || null, addEventListener: () => {} };
}
const espera2 = () => new Promise((r) => setTimeout(r, 5));

test("gps: con el APK nuevo, watchPosition va al servicio nativo y la posicion llega como la del navegador", async () => {
  const geo = geoFalso(), m = movil({ metodos: CON_GPS, geo, doc: docGPS() }), pos = [];
  const id = m.navigator.geolocation.watchPosition((p) => pos.push(p));
  await espera2();
  assert.ok(m.llamadas.some(([p, mm, d]) => p === "Copiloto" && mm === "gps" && d.activo === true));
  assert.equal(geo.vigila.length, 0, "el del navegador no se usa");
  assert.equal(m.window.Nativo.gpsNativo, true);
  m.oyentes.posicion({ lat: 40.1, lon: -3.6, acc: 6, vel: 2.5, t: 1000 });
  assert.equal(pos.length, 1);
  assert.deepEqual(plano(pos[0]), { coords: { latitude: 40.1, longitude: -3.6, accuracy: 6, speed: 2.5, altitude: null, heading: null, altitudeAccuracy: null }, timestamp: 1000 });
  m.navigator.geolocation.clearWatch(id);
  await espera2();
  assert.ok(m.llamadas.some(([, mm, d]) => mm === "gps" && d.activo === false), "sin nadie mirando, el servicio se para");
});

test("gps: si el servicio no arranca (sin permiso), el GPS del navegador de siempre", async () => {
  const geo = geoFalso(), m = movil({ metodos: CON_GPS, geo, doc: docGPS(), rechaza: ["gps"] }), pos = [];
  m.navigator.geolocation.watchPosition((p) => pos.push(p));
  await espera2();
  assert.equal(geo.vigila.length, 1);
  assert.equal(m.window.Nativo.gpsNativo, false);
});

test("gps: un APK viejo sin servicio deja el GPS del navegador intacto", () => {
  const geo = geoFalso(), m = movil({ geo, doc: docGPS() });
  assert.equal(m.navigator.geolocation, geo);
  assert.equal(m.window.Nativo.pantallaCarrera, null);
});

test("gps: fuera de la pantalla del GPS y sin correr no se enciende", async () => {
  const geo = geoFalso(), m = movil({ metodos: CON_GPS, geo, doc: docGPS(false) });
  m.navigator.geolocation.watchPosition(() => {});
  await espera2();
  assert.ok(!m.llamadas.some(([, mm]) => mm === "gps"));
  m.window.corriendo = true; m.intervalos.forEach((f) => f());     // empieza el entreno: ya si
  await espera2();
  assert.ok(m.llamadas.some(([, mm, d]) => mm === "gps" && d.activo === true));
});

test("gps: la notificacion lleva km, tiempo y ritmo; sus botones pausan y dicen como voy", async () => {
  const doc = docGPS(true, { dist: "3,42", reloj: "22:10", rAct: "6:31", kmNum: "Km 4", kmObj: "6:29-6:53", veredicto: "Dentro del plan" });
  const m = movil({ metodos: CON_GPS, geo: geoFalso(), doc }), w = m.window;
  let pausas = 0, estados = 0;
  doc.getElementById("dist"); w.corriendo = true;
  const b = { click: () => pausas++ };
  const orig = doc.getElementById; doc.getElementById = (id) => (id === "pausa" ? b : orig(id));
  w.diceEstado = () => estados++;
  m.navigator.geolocation.watchPosition(() => {});
  await espera2();
  const c = m.llamadas.filter(([, mm]) => mm === "carrera").at(-1);
  assert.deepEqual(plano(c[2]), { corriendo: true, pausado: false, titulo: "3,42 km · 22:10",
                                  texto: "6:31/km · Km 4 · objetivo 6:29-6:53 · Dentro del plan" });
  m.oyentes.accion({ que: "pausa" }); m.oyentes.accion({ que: "comovoy" });
  assert.equal(pausas, 1); assert.equal(estados, 1);
});

test("pantalla: con el GPS nativo y 'se apaga sola' no se enciende; con 'siempre encendida', si", async () => {
  const m = movil({ metodos: CON_GPS, geo: geoFalso(), doc: docGPS() }), w = m.window;
  m.navigator.geolocation.watchPosition(() => {});
  await espera2();
  await m.navigator.wakeLock.request("screen");
  assert.ok(!m.llamadas.some(([, mm]) => mm === "pantalla"));
  w.Nativo.pantallaCarrera("encendida");
  await m.navigator.wakeLock.request("screen");
  assert.deepEqual(plano(m.llamadas.filter(([, mm]) => mm === "pantalla").at(-1)), ["Copiloto", "pantalla", { encendida: true }]);
});

/* ------------------------------ 30/09: la salida de prueba ------------------------------ */
test("voz: si falla antes de sonar, otra vez con la misma y luego con la otra; la web solo ve el fallo si fallan todas", async () => {
  const m = movil(), w = m.window, ev = [];
  const u = new w.SpeechSynthesisUtterance("Kilómetro uno");
  u.onstart = () => ev.push("start"); u.onend = () => ev.push("end"); u.onerror = (e) => ev.push("error:" + e.error);
  w.speechSynthesis.speak(u);
  const hablar = () => m.llamadas.filter(([, mm]) => mm === "hablar");
  m.callbacks[0]({ evento: "error", error: "sistema" });
  assert.equal(hablar().length, 1, "no reintenta al instante");
  await new Promise((r) => setTimeout(r, 650));
  assert.equal(hablar().length, 2); assert.equal(hablar()[1][2].voz, "movil");
  m.callbacks[1]({ evento: "error", error: "sistema" });
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(hablar().length, 3); assert.equal(hablar()[2][2].voz, "miro", "la tercera, con la otra voz");
  assert.deepEqual(ev, [], "la web no se entera mientras se reintenta");
  m.callbacks[2]({ evento: "inicio" }); m.callbacks[2]({ evento: "fin" });
  assert.deepEqual(ev, ["start", "end"]);
});

test("voz: fallan todas -> la web recibe el error (y decide ella)", async () => {
  const m = movil(), w = m.window, ev = [];
  const u = new w.SpeechSynthesisUtterance("x"); u.onerror = (e) => ev.push(e.error);
  w.speechSynthesis.speak(u);
  m.callbacks[0]({ evento: "error" }); await new Promise((r) => setTimeout(r, 650));
  m.callbacks[1]({ evento: "error" }); await new Promise((r) => setTimeout(r, 5));
  m.callbacks[2]({ evento: "error" });
  assert.deepEqual(ev, ["synthesis-failed"]);
});

test("pantalla: Empezar pide GPS y pantalla a la vez; con el GPS nativo aun arrancando no se enciende", async () => {
  const m = movil({ metodos: CON_GPS, geo: geoFalso(), doc: docGPS() });
  m.navigator.geolocation.watchPosition(() => {});          // pideGPS()
  await m.navigator.wakeLock.request("screen");               // pantalla(), sin esperar a nada
  assert.ok(!m.llamadas.some(([, mm]) => mm === "pantalla"));
});
