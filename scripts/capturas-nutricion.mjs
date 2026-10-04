// Capturas rápidas de Nutrición (v2.49): la Cocina de prueba (datos de EJEMPLO), cada subpestaña en oscuro y en claro.
// Falla si hay errores de página o si la prueba deja rastro.
//   python -m http.server 8777 --bind 127.0.0.1 &   y   node scripts/capturas-nutricion.mjs [carpeta] [subpestaña]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const REPO = fileURLToPath(new URL("..", import.meta.url));
const OUT = process.argv[2] || REPO + "docs/propuestas-nutricion/capturas/";
const SOLO = process.argv[3] || null;
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
mkdirSync(OUT, { recursive: true });
const SUBS = ["Hoy", "Semana", "Tendencias", "Fases", "Entreno", "Micros"].filter((s) => !SOLO || s === SOLO);
const b = await chromium.launch({ executablePath: CHROME, args: ["--mute-audio"] });
let errores = 0;
for (const tema of ["oscuro", "claro"]) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: tema === "claro" ? "light" : "dark" });
  p.on("pageerror", (e) => { errores++; console.log("PAGEERROR", tema, e.message); });
  await p.clock.install({ time: new Date("2026-10-07T13:00:00") });
  await p.addInitScript((tema) => {
    const m = { "copiloto.conf.v1": JSON.stringify({ url: "http://api.test", key: "k" }), "copiloto.tema": tema };
    Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); },
      removeItem: (k) => { delete m[k]; }, clear() {}, key: (i) => Object.keys(m)[i] || null, get length() { return Object.keys(m).length; } } });
    window.__ls = m;
    if (window.speechSynthesis) { window.speechSynthesis.speak = () => {}; window.speechSynthesis.cancel = () => {}; }
    window.AudioContext = window.webkitAudioContext = function () { throw new Error("sin audio"); };
  }, tema);
  await p.route("http://api.test/**", (r) => { const u = new URL(r.request().url());
    if (u.pathname === "/agenda") return r.fulfill({ json: { generado: new Date().toISOString(), eventos: [], dia: [] } });
    if (u.pathname === "/despensa") return r.fulfill({ json: { error: "sin_configurar" } });
    if (u.pathname === "/hecho") return r.fulfill({ json: { actividades: [] } });
    if (u.pathname === "/cocina") { errores++; console.log("LA PRUEBA LLAMA AL WORKER"); return r.fulfill({ json: { cambios: [], lista: [] } }); }
    return r.abort("failed"); });
  await p.route("https://raw.githubusercontent.com/**", (r) => r.abort("failed"));
  await p.goto(process.env.URL_APP || "http://127.0.0.1:8777/index.html"); await p.waitForTimeout(1500);
  const antes = await p.evaluate(() => JSON.stringify(window.__ls));
  await p.click("#hConf"); await p.waitForTimeout(500);
  await p.click("#cfCocPrueba"); await p.waitForTimeout(900);
  await p.click(".cocSeg button:has-text('Nutrición')"); await p.waitForTimeout(400);
  for (const s of SUBS) {
    await p.click(`.ntSubs button:has-text('${s}')`); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}${s.toLowerCase()}-${tema}.png` });
    if (s === "Micros" && await p.$(".ntCobBtn")) { await p.click(".ntCobBtn >> nth=0"); await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}micros-vuelta-${tema}.png` }); await p.click(".ntCruz .cocBtn"); await p.waitForTimeout(300); }
    if (process.env.ABAJO) { await p.evaluate(() => { const c = document.getElementById("ptCuerpo"); c.scrollTop = 700; }); await p.waitForTimeout(150);
      await p.screenshot({ path: `${OUT}${s.toLowerCase()}-abajo-${tema}.png` }); await p.evaluate(() => { document.getElementById("ptCuerpo").scrollTop = 0; }); }
  }
  await p.click(".cocSim button"); await p.waitForTimeout(500);
  // fuera de la cuenta lo que la app refresca sola (el calendario)
  const despues = await p.evaluate(() => JSON.stringify(window.__ls)), A = JSON.parse(antes), D = JSON.parse(despues);
  const cambia = [...new Set([...Object.keys(A), ...Object.keys(D)])].filter((k) => A[k] !== D[k] && k !== "copiloto.agenda.v1");
  if (cambia.length) { errores++; console.log("LA PRUEBA HA DEJADO RASTRO:", cambia.join(", ")); }
  await p.close();
}
await b.close();
console.log(errores + " errores");
process.exit(errores ? 1 : 0);
