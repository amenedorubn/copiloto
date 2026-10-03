// Simula el rodaje de 12 km con punto de decision, de punta a punta, en un Chrome de verdad:
// importa un GPX por el input de archivo (a IndexedDB), lo elige como ruta activa y corre el
// simulador de Copiloto (el motor real) con reloj virtual, sin sonido, en cuatro versiones:
// "Si", "No", sin respuesta y GPS perdido en el punto.
//
//   node scripts/prueba-decision.mjs "C:/ruta/al/archivo.gpx" [carpeta-de-capturas]
//
// El GPX NO se copia a ningun sitio del repo: se lee del disco y solo vive en el IndexedDB de cada
// Chrome de prueba (que se borra al cerrar). Las capturas salen donde digas; por defecto en el
// directorio temporal, no en el repo (ensenan el mapa con el inicio de la ruta).
import { chromium } from "playwright-core";
import http from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const GPX = process.argv[2];
const OUT = process.argv[3] || join(tmpdir(), "copiloto-prueba-decision");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
if (!GPX || !existsSync(GPX)) { console.error("Uso: node scripts/prueba-decision.mjs <archivo.gpx> [carpeta]"); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
               ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".gpx": "application/gpx+xml", ".css": "text/css" };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, "http://x").pathname), f = normalize(join(REPO, u === "/" ? "index.html" : u));
  if (!f.startsWith(REPO) || !existsSync(f) || !statSync(f).isFile()) { r.statusCode = 404; return r.end("no"); }
  r.setHeader("content-type", MIME[extname(f)] || "application/octet-stream"); r.end(readFileSync(f));
});
await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
const URL_APP = "http://127.0.0.1:" + srv.address().port + "/index.html";

// el evento del domingo, con el formato de los del Worker
const EVENTO = { uid: "dom1", fuente: "calendar", fecha: "2026-10-04", hora: "09:00", fin: "10:15", titulo: "Rodaje suave 12 km", lugar: "", texto: "Rodaje suave, por sensación.",
  plan: { tipo: "fuera", subtipo: "facil", nombre: "Rodaje", distancia: 12000, km: [{ desde: 0, hasta: 12, ritmo: 392, banda: [380, 405] }], total: { km: 12 } } };

const b = await chromium.launch({ executablePath: CHROME, args: ["--mute-audio"] });
const filas = []; let fallos = 0;
const ok = (cond, txt) => { filas.push((cond ? "  ok   " : "  FALLA ") + txt); if (!cond) fallos++; };
const km = (m) => (m / 1000).toFixed(3).replace(".", ",") + " km";

async function escenario(nombre, { eleccion, rapido = false, gps = false }) {
  const ini = filas.length;
  filas.push(""); filas.push("== " + nombre + " ==");
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, serviceWorkers: "block" });
  const p = await ctx.newPage();
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  p.on("crash", () => console.log("   !! la pestaña se ha caído"));
  if (process.env.DEBUG) p.on("console", (m) => { if (/error|warn/i.test(m.type())) console.log("   [consola]", m.text().slice(0, 200)); });
  await p.clock.install({ time: new Date("2026-10-04T08:50:00") });
  await p.addInitScript(() => {
    if (!sessionStorage.getItem("sembrado")) { sessionStorage.setItem("sembrado", "1"); localStorage.setItem("copiloto.conf.v1", JSON.stringify({ url: "http://api.test", key: "k" })); }
    // sin sonido: la voz y los pitidos solo se apuntan (con el km y la hora virtual) para poder revisarlos
    window.__voz = []; window.__clics = 0;
    speechSynthesis.cancel = () => {};
    speechSynthesis.speak = (u) => {
      window.__voz.push({ t: Date.now(), km: Math.round(window.dist || 0), x: u.text });
      setTimeout(() => u.onstart && u.onstart(), 0); setTimeout(() => u.onend && u.onend(), 80 + u.text.length * 55);
    };
    HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
    HTMLMediaElement.prototype.pause = function () {};
    window.AudioContext = window.webkitAudioContext = function () {
      return { state: "running", currentTime: 0, destination: {}, resume() {},
        createOscillator() { window.__clics++; return { frequency: {}, connect() {}, start() {}, stop() {} }; },
        createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; } };
    };
    navigator.vibrate = () => true;
  });
  await p.route("http://api.test/**", async (r) => {
    const u = new URL(r.request().url());
    if (u.pathname === "/agenda") return r.fulfill({ json: { generado: new Date().toISOString(), zona: "Europe/Madrid", eventos: [EVENTO], dia: [] } });
    if (u.pathname === "/biblioteca") return r.fulfill({ json: { rutas: [] } });
    if (u.pathname === "/hecho") return r.fulfill({ json: { actividades: [] } });
    return r.abort("failed");
  });
  // un error dentro de un temporizador de la pagina corta el runFor: se apunta y se sigue, como haria el navegador
  const avanza = async (ms) => {
    for (let n = 0; n < 5; n++) {
      try { await p.clock.runFor(ms); return; }
      catch (e) {
        const x = await p.evaluate(() => ({ dist: window.dist, kmHecho: window.kmHecho, plan: PLAN.length, sIni: window.sIni, sAbs: window.sAbs })).catch(() => ({}));
        errores.push("[runFor] " + String(e.message).slice(0, 160) + " " + JSON.stringify(x));
      }
    }
  };
  const espera = async (fn, arg, max = 60) => { for (let i = 0; i < max; i++) { if (await p.evaluate(fn, arg)) return true; await avanza(250); await p.waitForTimeout(40); } return false; };

  await p.goto(URL_APP);
  await avanza(500);
  ok(await espera(() => !!document.querySelector(".tjRuta")), "HOY carga el entreno del domingo");

  // A. importar el GPX (estado: cargando -> completo)
  await p.click(".tjRuta"); await avanza(300);
  await p.setInputFiles("label.chip:has-text('Importar en este móvil') input", GPX);
  const hubo = await espera(() => !!document.querySelector(".rlBox"));
  ok(hubo, "el GPX se importa y sale su ficha");
  const ficha = await p.evaluate(() => ({ nota: (document.querySelector(".rlBox .rlNota") || {}).textContent, kms: document.querySelectorAll(".rlBox .rlKm li").length,
    perfil: !!document.querySelector(".rlBox svg.rlPerfil"), estado: (document.getElementById("rtEstado") || {}).textContent,
    elegida: !!document.querySelector(".rtFila.elegida"), loc: JSON.stringify(Object.keys(localStorage)) }));
  filas.push("  ficha: " + ficha.nota);
  filas.push("  estado: " + ficha.estado);
  ok(/12,0\d km · \+135 m \/ −133 m/.test(ficha.nota || ""), "distancia y desnivel de la ficha (12,03 km, +135 / −133)");
  ok(ficha.perfil && ficha.kms === 13, "perfil de altitud y 13 km de desnivel (12 + el trozo final)");
  ok(ficha.elegida, "queda elegida como ruta activa");
  const enLs = await p.evaluate(async () => {
    const claves = Object.keys(localStorage), todo = claves.map((k) => localStorage.getItem(k)).join("|");
    const idb = await new Promise((ok2) => { const r = indexedDB.open("copiloto-rutas-locales"); r.onsuccess = () => { const t = r.result.transaction("rutas").objectStore("rutas").count(); t.onsuccess = () => ok2(t.result); }; r.onerror = () => ok2(-1); });
    return { idb, enLocalStorage: /loc-/.test(claves.join(",")) || /"linea"/.test(todo.replace(/"mini":"[^"]*"/g, "")) };
  });
  ok(enLs.idb === 1, "guardada en IndexedDB (1 ruta)");
  await p.screenshot({ path: join(OUT, nombre.replace(/\W+/g, "_") + "_1_ruta.png") });
  await p.click("#hojaX"); await avanza(300);

  // B. correr el simulador: el motor real, con reloj virtual
  // por la pantalla de Ajustes > Simulación, como lo haría el usuario en casa
  await p.click("#hConf"); await avanza(400);
  await p.click("#cfSim"); await avanza(600);
  ok(await espera(() => { const g = document.getElementById("simGo"); return !!g && !g.disabled; }, undefined, 80), "Simulación: la ruta importada está elegida y se puede simular");
  await p.fill("#simKm", "0");
  await p.click("#simGo"); await avanza(800);
  ok(await espera(() => !document.getElementById("appGPS").hidden), "se abre el modo GPS con esa ruta");
  const info = await p.evaluate(() => ({ total: TOTAL, titulo: document.querySelector("#appGPS h1").textContent, pasos: !!PASOS, modo: MODO_TERRENO }));
  filas.push("  ruta cargada: " + km(info.total) + " · " + info.titulo + " · terreno=" + info.modo);
  ok(info.pasos, "el plan trae el paso de decisión");
  await p.click("#empezar"); await avanza(1500);
  await p.evaluate(() => { arranca(-3); });            // la ruta acaba donde empieza: un fix con ruido da -3 m al salir; no puede romper nada
  await avanza(2000);

  const estado = () => p.evaluate(() => ({ d: Math.round(dist), v: PASOS ? PASOS.vista() : null, dec: !document.getElementById("decision").hidden,
    ver: document.getElementById("veredicto").textContent, fin: !document.getElementById("resumen").hidden }));
  const tope = 3400; let pregunta = null, repsVistas = 0, hecho = false, capturaRep = false, capturaPreg = false, perdido = false, respuestaT = null;
  const lentoKm1 = []; let t0virtual = null;
  for (let i = 0; i < 12000; i++) {
    const s = await estado();
    if (process.env.DEBUG && i % 40 === 0) console.log("   .. i=" + i, JSON.stringify(s));
    // km 0-1,2: voy mas lento que la banda (subida): no tiene que saltar nada
    await p.evaluate(([d, rapidoRep]) => {
      const v = PASOS && PASOS.vista(), base = d < 1200 ? 60 : 0;
      SIM.delta = v && v.fase === "trabajo" ? (rapidoRep ? -152 : -132) : base;     // 4'00" o 4'20" en la recta; 7'32" en la cuesta
    }, [s.d, rapido]);
    if (s.d < 1300 && /aprieta|por detrás/i.test(s.ver)) lentoKm1.push(s.ver);
    if (gps && !perdido && s.d >= 9700) {                                            // el GPS se va justo antes del punto
      perdido = true;
      await p.evaluate(() => { clearInterval(SIMIV); SIMIV = null; });
      await avanza(150000);
      await p.evaluate(() => { SIMS = 10400; arrancaSim(); });
      await avanza(1500);
      continue;
    }
    if (s.dec && !pregunta) {
      pregunta = s;
      const m = await p.evaluate(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(); const a = r("dcSi"), c = r("dcNo");
        return { alto: Math.min(a.height, c.height), sep: c.top - a.bottom, ancho: Math.min(a.width, c.width), txt: [dcT.textContent, dcSiT.textContent, dcNoT.textContent, dcS.textContent] }; });
      filas.push("  pregunta en pantalla a " + km(s.d) + " · " + m.txt.join(" | "));
      ok(m.alto >= 44 && m.sep >= 12, "botones de " + Math.round(m.alto) + " px de alto y " + Math.round(m.sep) + " px de separación");
      if (!capturaPreg) { capturaPreg = true; await p.screenshot({ path: join(OUT, nombre.replace(/\W+/g, "_") + "_2_pregunta.png") }); }
      if (eleccion) { await avanza(5000); respuestaT = await p.evaluate(() => Date.now()); await p.click(eleccion === "si" ? "#dcSi" : "#dcNo"); await avanza(300); }
    }
    if (s.v && s.v.fase === "trabajo" && !capturaRep) { capturaRep = true; await avanza(6000); await p.screenshot({ path: join(OUT, nombre.replace(/\W+/g, "_") + "_3_recta.png") }); }
    if (s.fin) { hecho = true; break; }
    await avanza(s.d > 9400 ? 250 : (process.env.PASO ? +process.env.PASO : 20000) / (s.d < 1500 ? 4 : 1));
    if (s.d > 12500) break;
  }
  await avanza(1000);
  const R = await p.evaluate(() => ({
    d: Math.round(dist), voz: window.__voz, clics: window.__clics, diario: DIARIO.L.map((x) => [x.q, x.x, x.km]), decisiones: DIARIO.decisiones || [],
    est: PASOS.estado(), resumen: document.getElementById("rsCuerpo").innerText, resumenVisto: !document.getElementById("resumen").hidden,
    juicioNormal: juicio(442, 380, 405), juicioSens: juicioEn(500, 442, 380, 405), segSens: sensacionEn(500) }));
  if (hecho) await p.screenshot({ path: join(OUT, nombre.replace(/\W+/g, "_") + "_4_resumen.png") });

  // C. comprobaciones
  const dijo = (re) => R.voz.filter((v) => re.test(v.x));
  const q = dijo(/^En \d+ metros: ¿haces 4 rectas/);
  filas.push("  voz de la pregunta: " + q.map((v) => `«${v.x}» a ${km(v.km)}`).join(" · "));
  ok(R.juicioNormal === "Muy lento, aprieta." && R.juicioSens === "" && R.segSens, "control: a 7'22\" un plan normal diría «" + R.juicioNormal + "»; por sensación no dice nada");
  ok(lentoKm1.length === 0 && !R.voz.filter((v) => v.km < 1500).some((v) => /lento|aprieta|por detrás/i.test(v.x)),
     "primer km (subida) a 7'32\": ningún aviso por ir más lento");
  if (gps) {
    ok(q.length === 0, "con el GPS perdido no se pregunta");
    ok(dijo(/Sin GPS en el punto de decisión: sigo suave/).length === 1, "se avisa por voz de que sigue suave");
    ok(R.decisiones.length === 1 && R.decisiones[0].valor === "no" && R.decisiones[0].origen === "gps", "decisión guardada: no · sin GPS");
  } else {
    ok(q.length === 1 && q[0].x === "En 200 metros: ¿haces 4 rectas? Toca en pantalla.", "el aviso suena una vez, con el texto exacto");
    ok(q.length === 1 && q[0].km >= 9799 && q[0].km <= 9815, "el aviso salta en el km 9,8 (sonó a " + (q[0] ? km(q[0].km) : "–") + ")");
    ok(R.decisiones.length === 1, "hay una decisión guardada");
    const d = R.decisiones[0] || {};
    filas.push("  decisión guardada: " + JSON.stringify(d));
    ok(/^2026-10-04T\d\d:\d\d:\d\d/.test(d.hora || "") && typeof d.km === "number", "con valor, hora y km");
    if (eleccion === "si") { ok(d.valor === "si" && d.origen === "toque", "valor «si», tocado"); }
    if (eleccion === "no") { ok(d.valor === "no" && d.origen === "toque", "valor «no», tocado"); }
    if (!eleccion) {
      ok(d.valor === "no" && d.origen === "tiempo", "sin respuesta: se eligió «no»");
      ok(dijo(/No he oído respuesta: seguimos suave/).length === 1, "y se avisó por voz");
      const dsg = (new Date(d.hora).getTime() - q[0].t) / 1000;
      ok(dsg >= 14 && dsg <= 16.5, "pasaron " + dsg.toFixed(1) + " s entre la pregunta y el «no»");
    }
  }
  const I = R.est.int.rectas;
  const cuentas = dijo(/Tres, dos, uno, ya/);
  if (eleccion === "si") {
    ok(cuentas.length === 4, "4 cuentas atrás por voz (3, 2, 1, ya)");
    ok(dijo(/Rápido pero controlado, no sprint/).length === 1, "«rápido pero controlado, no sprint»");
    const reps = (I.rep || []).filter((r) => r.fin);
    ok(reps.length === 4 && reps.every((r) => Math.abs((r.fin - r.ini) / 1000 - 20) < 0.6), "4 repeticiones de 20 s (" + reps.map((r) => ((r.fin - r.ini) / 1000).toFixed(1)).join(", ") + ")");
    const tr = reps.slice(1).map((r, i) => (r.ini - reps[i].fin) / 1000);
    ok(tr.length === 3 && tr.every((x) => Math.abs(x - 60) < 1), "60 s de trote entre ellas (" + tr.map((x) => x.toFixed(1)).join(", ") + ")");
    ok(R.clics > 0, "metrónomo: " + R.clics + " clics");
    const fr = dijo(/Frena un poco/).length;
    ok(rapido ? fr >= 1 && fr <= 4 : fr === 0, rapido ? "a 4'00\" (por encima del techo de 4'05\") avisa «frena un poco» " + fr + " vez/veces (como mucho una por recta)" : "a 4'20\" no salta el techo");
    ok(R.voz.filter((v) => v.km >= 10000 && /^Kilómetro 10,/.test(v.x)).length === 0, "durante las rectas no se canta el km 10 por encima de la cuenta atrás");
    ok(!R.voz.some((v) => /pulsaciones|frecuencia card/i.test(v.x)), "no se guía por frecuencia cardíaca");
  } else {
    ok(cuentas.length === 0 && I.estado === "inactivo", "sin rectas: sigue suave");
  }
  ok(R.resumenVisto && R.d >= 11990, "llega a los 12 km (" + km(R.d) + ") y sale el resumen");
  filas.push("  resumen: " + R.resumen.replace(/\n+/g, " · ").slice(0, 300));
  ok(/Punto de decisión/i.test(R.resumen), "el resumen recoge la decisión");
  ok(errores.length === 0, "sin errores de JavaScript" + (errores.length ? ": " + errores.join(" | ") : ""));
  await ctx.close();
  console.log(filas.slice(ini).join(String.fromCharCode(10)));      // cada escenario sale en cuanto acaba
}

const SOLO = process.env.SOLO ? +process.env.SOLO : 0;
if (!SOLO || SOLO === 1) await escenario("Si, 4 rectas (a 4'20\")", { eleccion: "si" });
if (!SOLO || SOLO === 2) await escenario("Si, 4 rectas pasandome del techo (4'00\")", { eleccion: "si", rapido: true });
if (!SOLO || SOLO === 3) await escenario("No, seguir suave", { eleccion: "no" });
if (!SOLO || SOLO === 4) await escenario("Sin respuesta en 15 s", { eleccion: null });
if (!SOLO || SOLO === 5) await escenario("GPS perdido en el punto de decision", { eleccion: null, gps: true });
await b.close(); srv.close();
console.log(filas.join("\n"));
console.log("\n" + (fallos ? fallos + " COMPROBACION(ES) FALLAN" : "TODO BIEN") + " · capturas en " + OUT);
process.exit(fallos ? 1 : 0);
