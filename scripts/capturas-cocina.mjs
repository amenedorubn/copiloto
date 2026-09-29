// Capturas de la pestaña Cocina a 390x844 (oscuro y claro): la pantalla entera, el modo
// paso a paso de una receta y el final. Los datos de prueba viven SOLO aquí (o en el
// FIXTURE que se le pase): calendario y Worker interceptados, localStorage simulado.
//
//   npm i --no-save playwright-core                 (una vez; usa el Chrome instalado)
//   python -m http.server 8777 --bind 127.0.0.1 &   (desde la raiz del repo)
//   node scripts/capturas-cocina.mjs [carpeta]       FIXTURE=datos.json para otros datos
//
// FIXTURE: {"hoy":"2026-09-30","hora":"13:50","dia":[eventos de "Comidas"],"nota":"texto del bloque"}
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const OUT = process.argv[2] || REPO + "docs/propuestas-cocina/";
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL_APP = process.env.URL_APP || "http://127.0.0.1:8777/index.html";
const COCINA = process.env.COCINA || REPO + "../cocina/recetas/";   // las recetas de Copiloto Cocina, si esta al lado
mkdirSync(OUT, { recursive: true });

// ---- de ejemplo: el formato de los eventos de "Comidas" y de la nota, con otros alimentos ----
const EJEMPLO = {
  hoy: "2026-10-01", hora: "13:50",
  dia: [
    { uid: "c1", fuente: "comida", fecha: "2026-10-01", hora: "08:00", fin: "08:30", titulo: "Desayuno · Tostadas con tomate y huevo",
      texto: "1 ración\nINGREDIENTES:\n· 2 rebanadas de pan\n· 1 tomate\n· 2 huevos\nCÓMO SE HACE:\n1. Tuesta el pan.\n2. Huevos a la plancha 3 min." },
    { uid: "c2", fuente: "comida", fecha: "2026-10-01", hora: "14:30", fin: "15:15", titulo: "Albóndigas en salsa con rigatoni",
      texto: "3 raciones (hoy + 2 tuppers)\nReceta: albondigas-rigatoni\nINGREDIENTES:\n· 500 g carne picada mixta\n· 1 huevo\n· 30 g pan rallado\n· 600 g tomate triturado\n· 180 g rigatoni\n· 1 bolsa de arroz de microondas\n· Sal, AOVE y especias al gusto\n" +
        "CÓMO SE HACE:\n1. Agua de la pasta al fuego y haz 21 bolas.\n2. Air fryer 200 °C, 10 min, en 2 tandas; mientras, la salsa.\n3. Albóndigas a la salsa y la pasta a la pota, 12 min.\n4. Reparte en el plato y los 2 tuppers.\nTUPPER: destapados hasta que enfríen; a los 45 min, tapa y al congelador." },
    { uid: "c3", fuente: "comida", fecha: "2026-10-01", hora: "21:00", titulo: "Cena · Crema de verduras con tostada",
      texto: "INGREDIENTES:\n· 1 brick de crema de verduras\n· 1 rebanada de pan\n· 2 lonchas de pavo\nCÓMO SE HACE:\n1. Calienta la crema 3 min al micro.\n2. Tostada con el pavo." },
    { uid: "c4", fuente: "comida", fecha: "2026-10-02", hora: "14:30", titulo: "Tupper · Albóndigas con rigatoni",
      texto: "Sale del congelador la noche antes.\nCÓMO SE HACE:\n1. Al micro 3-4 min, removiendo a la mitad.\n2. Si queda espeso, un chorrito de agua." },
    { uid: "c5", fuente: "comida", fecha: "2026-10-03", hora: "14:00", titulo: "Curry de pollo con arroz", texto: "Receta: curry-pollo\n2 raciones" },
    { uid: "r1", fuente: "rutina", fecha: "2026-10-01", hora: "21:40", fin: "22:20", titulo: "Rutina de noche · cama 22:20",
      texto: "21:40 · Prepara la comida de mañana (10 min)\n22:00 · Ducha (10 min)\n22:10 · Leer (10 min)\n22:20 · Cama, móvil fuera" }
  ],
  nota: "DESPENSA EN VIVO — última actualización: 29/09/2026 (noche)\n\n\\## CONGELADOR\nBolsas: cebolla troceada, ajo troceado, 4 bolsas de arroz de microondas (3 min)\n\n" +
    "\\## NEVERA\nLeche semi abierta, yogur natural, 2 lonchas de pavo, 1 tomate\n\n\\## DESPENSA SECA\n6 huevos, rigatoni (1 kg), bote de tomate triturado 800 g, pan rallado, sal, AOVE, pan de molde\n\n" +
    "\\## ESPECIAS\nOrégano, pimentón dulce, perejil, curry, pimienta negra\n\n\\## NO HAY\nPollo, carne picada, crema de verduras\n\n\\## COMPRA (jueves 1/10)\n500 g carne picada mixta, 500 g solomillos de pollo, 1 brick de crema de verduras"
};
const F = process.env.FIXTURE ? JSON.parse(readFileSync(process.env.FIXTURE, "utf8")) : EJEMPLO;

const b = await chromium.launch({ executablePath: CHROME, args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
let errores = 0;
for (const tema of ["oscuro", "claro"]) {
  const ls = { "copiloto.conf.v1": JSON.stringify({ url: "http://api.test", key: "k" }), "copiloto.tema": tema };
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: tema === "claro" ? "light" : "dark" });
  p.on("pageerror", (e) => { errores++; console.log("PAGEERROR", tema, e.message); });
  await p.clock.install({ time: new Date(F.hoy + "T" + (F.hora || "13:50") + ":00") });
  await p.addInitScript((ls) => {
    const m = { ...ls };
    Object.defineProperty(window, "localStorage", { configurable: true, value: {
      getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; },
      clear() {}, key: (i) => Object.keys(m)[i] || null, get length() { return Object.keys(m).length; } } });
    window.speechSynthesis && (window.speechSynthesis.speak = () => {});
    // en Windows Chrome no trae BarcodeDetector (en Android si): uno que mira y no encuentra nada
    if (!("BarcodeDetector" in window)) window.BarcodeDetector = class { detect() { return Promise.resolve([]); } };
  }, ls);
  await p.route("http://api.test/**", async (r) => {
    const u = new URL(r.request().url());
    if (u.pathname === "/agenda") return r.fulfill({ json: { generado: new Date().toISOString(), zona: "Europe/Madrid", eventos: [], dia: F.dia } });
    if (u.pathname === "/despensa") return r.fulfill({ json: { texto: F.nota } });
    if (u.pathname === "/hecho") return r.fulfill({ json: { actividades: [] } });
    return r.abort("failed");
  });
  await p.route("https://raw.githubusercontent.com/amenedorubn/cocina/main/recetas/**", async (r) => {
    const f = COCINA + decodeURIComponent(new URL(r.request().url()).pathname.split("/").pop());
    if (existsSync(f)) return r.fulfill({ path: f, contentType: "application/json" });
    return r.continue();
  });
  await p.goto(URL_APP);
  await p.waitForTimeout(1500);
  await p.click("#hCocina"); await p.waitForTimeout(1200);
  const pant = "html,body{overflow:visible!important;height:auto!important}#appHoy{display:none!important}#appPant{position:static!important;min-height:844px}#ptCuerpo{overflow:visible!important}";
  const d1 = await p.addStyleTag({ content: pant });
  await p.screenshot({ path: `${OUT}cocina-${tema}.png`, fullPage: true });
  // una captura corta por seccion, para comparar de un vistazo
  const secs = await p.$$("#ptCuerpo .cocSec");
  const nom = ["toca", "semana", "compra", "alimentos", "recetas"];
  for (let i = 0; i < secs.length; i++) await secs[i].screenshot({ path: `${OUT}${tema}-${i + 1}-${nom[i] || i}.png` });
  // los tres diseños de "Ahora toca", para elegir
  for (const d of ["A", "B", "C"]) {
    await p.evaluate((d) => window.Cocina.diseno(d), d); await p.waitForTimeout(250);
    await (await p.$("#ptCuerpo > :first-child")).screenshot({ path: `${OUT}${tema}-toca-${d}.png` });
  }
  await p.evaluate(() => window.Cocina.diseno("A"));
  await d1.evaluate((n) => n.remove());
  if (tema === "oscuro") {
    await p.screenshot({ path: `${OUT}cocina-arriba.png` });
    await p.click(".cocGo"); await p.waitForTimeout(800);
    await p.screenshot({ path: `${OUT}modo-paso1.png` });
    await p.click(".mHecho"); await p.waitForTimeout(600);
    await p.clock.runFor(185000); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}modo-paso2.png` });
    for (let i = 0; i < 6; i++) { if (!(await p.$(".mHecho"))) break; await p.click(".mHecho"); await p.waitForTimeout(300); }
    await p.screenshot({ path: `${OUT}modo-fin.png` });
    await p.click("#cocModo .mX"); await p.waitForTimeout(500);
    // una comida del calendario sin receta: un paso por pantalla, con su reloj si dice "N min"
    await p.click(".cocFila:has-text('Mañana')"); await p.waitForTimeout(500);
    await p.click(".cocGo"); await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}modo-calendario.png` });
    // en HOY: la comida se abre en Cocina y la rutina con horas, paso a paso
    await p.click("#cocModo .mX"); await p.waitForTimeout(400);
    await p.click("#ptVolver"); await p.waitForTimeout(700);
    const lin = await p.$(".linDia");
    if (lin) {
      await p.click(".linIt:has-text('Rutina') .linCab"); await p.waitForTimeout(300);
      const pl = await p.addStyleTag({ content: "html,body{overflow:visible!important;height:auto!important}#appHoy{position:static!important;min-height:844px}#hCuerpo{overflow:visible!important;flex:none!important}" });
      await (await p.$(".hTop")).screenshot({ path: `${OUT}hoy-cabecera.png` });
      await (await p.$(".linIt:has-text('Rutina')")).screenshot({ path: `${OUT}hoy-rutina.png` });
      await (await p.$(".linIt.sig")).screenshot({ path: `${OUT}hoy-comida.png` });
      await pl.evaluate((n) => n.remove());
      await p.click(".linIt:has-text('Rutina') .linGuia"); await p.waitForTimeout(600);
      await p.screenshot({ path: `${OUT}modo-rutina.png` });
      await p.click("#cocModo .mX"); await p.waitForTimeout(400);
    } else console.log("sin linea del dia");
    // el escaner: camara de mentira de Chrome y un codigo escrito a mano (Open Food Facts de verdad)
    await p.click("#hCocina"); await p.waitForTimeout(800);
    await p.click(".cocBtn:has-text('Escanear')"); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}esc-camara.png` });
    await p.fill("#cocEsc input", process.env.CODIGO || "8431876302196");
    await p.click("#cocEsc .eMano button");
    await p.waitForSelector("#cocEsc .eOk", { timeout: 15000 }).catch(() => {});
    await p.screenshot({ path: `${OUT}esc-resultado.png` });
    if (await p.$("#cocEsc .eOk")) { await p.click("#cocEsc .eOk"); await p.waitForTimeout(400); }
    await p.screenshot({ path: `${OUT}esc-anadido.png` });
    await p.click("#cocEsc .eFin"); await p.waitForTimeout(600);
    const al = await p.$("#ptCuerpo .cocSec:has(h3:text('Mis alimentos'))");
    if (al) await al.screenshot({ path: `${OUT}esc-alimentos.png` });
  }
  await p.close();
  process.stdout.write(tema + " ");
}
await b.close();
console.log(`\n${errores} errores de página`);
process.exit(errores ? 1 : 0);
