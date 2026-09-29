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
function movil({ nativo = true, release = null, version = "2.16.0", metodos = ["hablar", "callar", "estado", "pantalla", "tono"] } = {}) {
  const llamadas = [], callbacks = [], ls = {};
  const Capacitor = nativo ? {
    isNativePlatform: () => true,
    PluginHeaders: [{ name: "Copiloto", methods: metodos.map((name) => ({ name, rtype: "promise" })) }],
    nativePromise: (p, m, d) => { llamadas.push([p, m, d]);
      if (m === "download") return Promise.resolve({ id: "b-" + d.version, version: d.version });
      return Promise.resolve({}); },
    nativeCallback: (p, m, d, cb) => { llamadas.push([p, m, d]); callbacks.push(cb); return "id"; },
  } : undefined;
  const window = {
    Capacitor, APP_VERSION: version,
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } },
    fetch: async () => release ? { ok: true, json: async () => release } : { ok: false, status: 404 },
  };
  const navigator = {};
  const ctx = vm.createContext({ window, navigator, localStorage: window.localStorage, fetch: window.fetch, setTimeout, Promise, JSON, Object, String });
  vm.runInContext(CODIGO, ctx);
  return { window, navigator, llamadas, callbacks, ls };
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
  assert.deepEqual(plano(m.llamadas.at(-1)), ["Copiloto", "hablar", { texto: "Kilómetro cinco", velocidad: 1.02, pausa: false, sinFoco: false }]);
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
  assert.deepEqual(ev, ["interrupted", "synthesis-failed"]);
});
test("voz: cancel pide callar", () => {
  const m = movil();
  m.window.speechSynthesis.cancel();
  assert.deepEqual(plano(m.llamadas.at(-1)), ["Copiloto", "callar", {}]);
});

test("musica: por defecto baja; si se elige pausa, la voz y el pitido lo piden", async () => {
  const m = movil(), w = m.window;
  assert.equal(w.Nativo.musica(), "baja");
  await w.Nativo.tono(true);
  assert.deepEqual(plano(m.llamadas.at(-1)), ["Copiloto", "tono", { sube: true, pausa: false, sinFoco: false }]);
  assert.equal(w.Nativo.musica("pausa"), "pausa");
  assert.equal(w.Nativo.musica("otra cosa"), "pausa");        // lo que no vale no se guarda
  await w.Nativo.tono(false);
  assert.deepEqual(plano(m.llamadas.at(-1)), ["Copiloto", "tono", { sube: false, pausa: true, sinFoco: false }]);
  w.speechSynthesis.speak(new w.SpeechSynthesisUtterance("hola"));
  assert.equal(m.llamadas.at(-1)[2].pausa, true);
  assert.equal(w.Nativo.musica("nada"), "nada");            // la voz por encima: sin foco
  await w.Nativo.tono(true);
  assert.deepEqual(plano(m.llamadas.at(-1)), ["Copiloto", "tono", { sube: true, pausa: false, sinFoco: true }]);
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
