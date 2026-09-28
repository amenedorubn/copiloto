// Capturas de las 4 propuestas del Arc (HOY y pantalla Arc; prologo, dia 12
// y error; claro y oscuro) a 390x844, y la revision de docs/DISENO-ARC.md en
// cada una. Los datos de prueba viven SOLO aqui: localStorage simulado y red
// interceptada; la app no trae ninguno.
//
//   npm i --no-save playwright-core                 (una vez; usa el Chrome instalado)
//   python -m http.server 8777 --bind 127.0.0.1 &   (desde la raiz del repo)
//   node scripts/capturas-arc.mjs [carpeta] [filtro]  p. ej. node scripts/capturas-arc.mjs "" C-dia12
import { chromium } from "playwright-core";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO = process.env.REPO || fileURLToPath(new URL("..", import.meta.url));
const OUT = process.argv[2] || REPO + "docs/propuestas-arc/";
const SOLO = process.argv[3] || "";
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL_APP = process.env.URL_APP || "http://127.0.0.1:8777/index.html";
const AUDITA = readFileSync(new URL("./audita-arc.js", import.meta.url), "utf8");
mkdirSync(OUT, { recursive: true });
const Arc = createRequire(import.meta.url)(REPO + "arc.js");

// ---- calendario y lo hecho de prueba (del 31/08 al 12/10) ----
const eventos = [], acts = [];
function dia(fecha, tipo, titulo, hora, hecho) {
  const plan = tipo === "fuera" ? { tipo, distancia: 8000, nombre: titulo, km: [{ desde: 0, hasta: 8, ritmo: 330 }] }
             : { tipo, rutina: "push", nombre: titulo, ejercicios: [{ nombre: "Press banca máquina", series: 4, reps: 10 }] };
  eventos.push({ uid: "e" + fecha + tipo, fecha, hora, titulo, lugar: tipo === "fuera" ? "6K ZAPATOCA" : "", texto: "", plan });
  if (hecho) acts.push(tipo === "gym"
    ? { id: "a" + fecha + tipo, fecha, hora, fuente: "hevy", deporte: "WeightTraining", nombre: titulo, mov: 3600, series: 12, reps: 100, volumenKg: 5000 }
    : { id: "a" + fecha + tipo, fecha, hora, fuente: "strava", deporte: "Run", nombre: titulo, distancia: 8000, mov: 2700 });
}
const patron = ["fuera", "gym", "fuera", "descanso", "fuera", "gym", "fuera"];
for (let d = "2026-08-31", i = 0; d <= "2026-10-12"; d = Arc.mas(d, 1), i++) {
  const t = patron[i % 7], hecho = !["2026-09-09", "2026-09-16", "2026-10-03", "2026-10-09", "2026-10-12"].includes(d);
  if (t === "descanso") eventos.push({ uid: "d" + d, fecha: d, hora: null, titulo: "Descanso", texto: "", plan: null });
  else dia(d, t, t === "gym" ? "Gym A" : "Rodaje 8K", "08:00", hecho);
}
const ctx = { acts, eventos: (iso) => eventos.filter((e) => e.fecha === iso).map((e) => ({ tipo: e.plan ? e.plan.tipo : "libre", plan: !!e.plan })) };

function datosDia12() {
  const D = Arc.vacio();
  const sinDormir = ["2026-10-03", "2026-10-10", "2026-10-11"], sinEstudio = ["2026-10-06", "2026-10-10", "2026-10-11"];
  for (let d = "2026-10-01"; d <= "2026-10-11"; d = Arc.mas(d, 1)) {
    if (!sinDormir.includes(d)) Arc.marcaCheck(D, d, "dormir", true, "2026-10-12");
    if (!sinEstudio.includes(d)) Arc.marcaCheck(D, d, "estudio", true, "2026-10-12");
  }
  Arc.marcaCheck(D, "2026-10-12", "dormir", true, "2026-10-12");
  Arc.registraAuto(D, ctx, "2026-10-12");      // lo que la app habria ido guardando
  return D;
}
const ESTADOS = {
  prologo: { hoy: "2026-09-28", datos: () => ({ ...Arc.vacio(), reglas: [] }), red: true },
  dia12: { hoy: "2026-10-12", datos: datosDia12, red: true },
  error: { hoy: "2026-10-12", datos: datosDia12, red: false },
};
const DESPLIEGA = "html,body{overflow:visible!important;height:auto!important}body{padding:0!important;max-width:390px!important}";

const b = await chromium.launch({ executablePath: CHROME });
const REV = {};
let errores = 0;
for (const est of Object.keys(ESTADOS)) for (const dis of ["A", "B", "C", "D"]) for (const tema of ["oscuro", "claro"]) {
  const nombre = `${dis}-${est}-${tema}`;
  if (SOLO && !nombre.startsWith(SOLO)) continue;
  const E = ESTADOS[est];
  const ls = {
    "copiloto.conf.v1": JSON.stringify({ url: "http://api.test", key: "k" }),
    "copiloto.arc.datos": JSON.stringify(E.datos()),
    "copiloto.arc.diseno": dis, "copiloto.tema": tema,
  };
  if (!E.red) ls["copiloto.agenda.v1"] = JSON.stringify({ generado: "2026-10-12T06:00:00Z", zona: "Europe/Madrid", eventos, dia: [], bajado: "2026-10-12T06:00:00Z" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.25, colorScheme: tema === "claro" ? "light" : "dark" });
  p.on("pageerror", (e) => { errores++; console.log("PAGEERROR", nombre, e.message); });
  await p.clock.setFixedTime(new Date(E.hoy + "T10:00:00"));
  await p.addInitScript((ls) => {
    const m = { ...ls };
    Object.defineProperty(window, "localStorage", { configurable: true, value: {
      getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; },
      clear() {}, key: (i) => Object.keys(m)[i] || null, get length() { return Object.keys(m).length; } } });
  }, ls);
  await p.addInitScript(AUDITA);
  await p.route("http://api.test/**", async (r) => {
    if (!E.red) return r.abort("internetdisconnected");
    const u = new URL(r.request().url());
    if (u.pathname === "/agenda") return r.fulfill({ json: { generado: new Date().toISOString(), zona: "Europe/Madrid", eventos, dia: [] } });
    if (u.pathname === "/hecho") return r.fulfill({ json: { actividades: acts } });
    return r.abort("failed");                     // rutas de Strava: fuera de la prueba
  });
  await p.goto(URL_APP);
  await p.waitForTimeout(1800);
  // HOY entero, tambien lo de debajo del pliegue: se despliega solo para la foto
  const plegar = await p.addStyleTag({ content: DESPLIEGA + "#appHoy{position:static!important;min-height:844px}#hCuerpo{overflow:visible!important;flex:none!important}" });
  await p.screenshot({ path: `${OUT}${nombre}-hoy.png`, fullPage: true });
  await plegar.evaluate((n) => n.remove());
  REV[nombre + "-hoy"] = await p.evaluate(() => window.__audita("hoy"));
  await p.click("#hConf"); await p.waitForTimeout(500);
  await p.click("#cfArc"); await p.waitForTimeout(700);
  REV[nombre + "-arc"] = await p.evaluate(() => window.__audita("arc"));
  await p.addStyleTag({ content: DESPLIEGA + "#appHoy{display:none!important}#appPant{position:static!important;min-height:844px}#ptCuerpo{overflow:visible!important}" });
  await p.screenshot({ path: `${OUT}${nombre}-arc.png`, fullPage: true });
  await p.close();
  process.stdout.write(nombre + " ");
}
// resumen: que incumple cada pantalla
const pag = await b.newPage();
await pag.addScriptTag({ content: AUDITA });
const F = await pag.evaluate((R) => Object.fromEntries(Object.entries(R).map(([k, v]) => [k, window.__fallos(v)])), REV);
await b.close();
writeFileSync(OUT + "revision.json", JSON.stringify(REV, null, 1) + "\n");
const malas = Object.entries(F).filter(([, f]) => f.length);
malas.forEach(([k, f]) => console.log("\n" + k + ":\n  - " + f.join("\n  - ")));
console.log(`\n${Object.keys(F).length} pantallas · ${malas.length} con fallos · ${errores} errores de página`);
process.exit(malas.length || errores ? 1 : 0);
