// Capturas de la pestaña Cocina a 390x844 (oscuro y claro): una por subpestaña (Semana, Comprar,
// Despensa, Recetas), lo que pasa al tocar en Despensa y en Comprar, el modo paso a paso, HOY y el
// escaner (el de Chrome y el de la app Android, de mentira). Los datos de prueba viven
// SOLO aquí (o en el FIXTURE que se le pase): calendario y Worker interceptados, localStorage simulado.
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
    { uid: "c6", fuente: "comida", fecha: "2026-10-04", hora: "21:00", titulo: "Cena · Salmón al horno con patatas",
      texto: "INGREDIENTES:\n· 2 lomos de salmón\n· 3 patatas\n· 1 limón\n· AOVE y sal\nCÓMO SE HACE:\n1. Patatas en rodajas al horno 200 °C, 20 min.\n2. El salmón encima, 12 min." },
    { uid: "c7", fuente: "comida", fecha: "2026-10-05", hora: "14:30", titulo: "Pollo al pimentón con boniato",
      texto: "INGREDIENTES:\n· 400 g contramuslos de pollo\n· 1 boniato grande\nEl pimentón va solo en el adobo, no en el boniato desde el principio, se quemaría\n" +
        "ADOBO:\n· 1 cdta pimentón dulce\nANTES DE EMPEZAR:\n· Saca el pollo de la nevera 15 min antes\nCÓMO SE HACE:\n1. Adoba el pollo.\n2. Al horno 200 °C, 25 min." },
    { uid: "c8", fuente: "comida", fecha: "2026-10-02", hora: "21:00", titulo: "Cena · Pasta con tomate y atún",
      texto: "1 RACIÓN · 20 min\n\nINGREDIENTES\n· 100 g de pasta\n· 1 lata de atún\n· 200 g de tomate triturado\n· ½ cebolla\n· 1 diente de ajo\n· Básicos: sal, AOVE\n\n" +
        "CARRIL AGUA (olla)\n1. Olla con agua y sal al fuego, 8 min hasta que hierva\n2. La pasta, 9 min (no espera)\n3. Escúrrela\n\n" +
        "CARRIL SALSA (sartén)\n1. Pica la cebolla y el ajo, 3 min (manos)\n2. Sofríelos con AOVE, 6 min\n3. El tomate, 8 min\n4. El atún, 1 min\n\n" +
        "AL JUNTAR\n1. Mezcla la pasta con la salsa y sirve" },
    { uid: "c9", fuente: "comida", fecha: "2026-10-03", hora: "21:00", titulo: "Cena · Pollo con calabacín",
      texto: "INGREDIENTES\n· 200 g de pollo\n· 1 calabacín\n\nCARRIL POLLO (sartén)\n1. Dora el pollo hasta que esté hecho\n2. El calabacín, 5 min (tras VERDURAS)\n\n" +
        "CARRIL ARROZ\n1. El arroz al micro, 3 min (no espera)\n\nAL JUNTAR\n1. Sirve" },
    { uid: "r1", fuente: "rutina", fecha: "2026-10-01", hora: "21:40", fin: "22:20", titulo: "Rutina de noche · cama 22:20",
      texto: "21:40 · Prepara la comida de mañana (10 min)\n22:00 · Ducha (10 min)\n22:10 · Leer (10 min)\n22:20 · Cama, móvil fuera" }
  ],
  // la compra de la nota es del sabado 26/09: ya esta hecha (sale en Despensa, no en Comprar)
  nota: "DESPENSA EN VIVO — última actualización: 25/09/2026 (noche)\n\n\\## CONGELADOR\nBolsas: cebolla troceada, ajo troceado, 4 bolsas de arroz de microondas (3 min)\n\n" +
    "\\## NEVERA\nLeche semi abierta, yogur natural, 2 lonchas de pavo, 1 tomate\n\n\\## DESPENSA SECA\n6 huevos, rigatoni (1 kg), bote de tomate triturado 800 g, pan rallado, sal, AOVE, pan de molde\n\n" +
    "\\## ESPECIAS\nOrégano, pimentón dulce, perejil, curry, pimienta negra\n\n\\## NO HAY\nPollo, carne picada, crema de verduras\n\n" +
    "\\## COMPRA (sábado 26/09)\n500 g carne picada mixta, 500 g solomillos de pollo. Solo si falta: pan de molde"
};
const F = process.env.FIXTURE ? JSON.parse(readFileSync(process.env.FIXTURE, "utf8")) : EJEMPLO;

const b = await chromium.launch({ executablePath: CHROME, args: ["--mute-audio", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
let errores = 0;
for (const tema of ["oscuro", "claro"]) {
  const ls = { "copiloto.conf.v1": JSON.stringify({ url: "http://api.test", key: "k" }), "copiloto.tema": tema,
               "copiloto.cocina.lista.v1": JSON.stringify([{ id: "m1", t: Date.parse(F.hoy + "T09:00:00"), txt: "Café molido" },
                                                           { id: "m2", t: Date.parse(F.hoy + "T09:00:00"), txt: "Bolsas de basura" }]) };
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, colorScheme: tema === "claro" ? "light" : "dark" });
  p.on("pageerror", (e) => { errores++; console.log("PAGEERROR", tema, e.message); });
  await p.clock.install({ time: new Date(F.hoy + "T" + (F.hora || "13:50") + ":00") });
  await p.addInitScript((ls) => {
    const m = { ...ls };
    Object.defineProperty(window, "localStorage", { configurable: true, value: {
      getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; },
      clear() {}, key: (i) => Object.keys(m)[i] || null, get length() { return Object.keys(m).length; } } });
    // sin sonido en las pruebas: ni voz, ni pitidos, ni vibración
    if (window.speechSynthesis) { window.speechSynthesis.speak = () => {}; window.speechSynthesis.cancel = () => {}; }
    window.AudioContext = window.webkitAudioContext = function () { throw new Error("sin audio en pruebas"); };
    try { navigator.vibrate = () => true; } catch (e) {}
    // en Windows Chrome no trae BarcodeDetector (en Android si): uno que mira y no encuentra nada
    if (!("BarcodeDetector" in window)) window.BarcodeDetector = class { detect() { return Promise.resolve([]); } };
  }, ls);
  let kv = { cambios: [], lista: [] }, posts = 0;   // el /cocina del Worker, de mentira: guarda lo ultimo
  await p.route("http://api.test/**", async (r) => {
    const u = new URL(r.request().url());
    if (u.pathname === "/agenda") return r.fulfill({ json: { generado: new Date().toISOString(), zona: "Europe/Madrid", eventos: [], dia: F.dia } });
    if (u.pathname === "/despensa") return r.fulfill({ json: { texto: F.nota } });
    if (u.pathname === "/hecho") return r.fulfill({ json: { actividades: [] } });
    if (u.pathname === "/cocina") { posts++; const j = r.request().postDataJSON() || {}; kv = { cambios: j.cambios || kv.cambios, lista: j.lista || kv.lista }; return r.fulfill({ json: kv }); }
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
  // una por subpestaña, del tamaño de la pantalla: se ve si hace falta bajar
  for (const [k, n] of [["semana", "Semana"], ["comprar", "Comprar"], ["tengo", "Despensa"], ["recetas", "Recetas"]]) {
    await p.click(`.cocSeg button:has-text('${n}')`); await p.waitForTimeout(350);
    await p.screenshot({ path: `${OUT}${tema}-${k}.png` });
  }
  // deslizar a los lados: de Semana a Comprar y vuelta
  const desliza = (dx) => p.evaluate((dx) => {
    const el = document.querySelector("#ptCuerpo .cocSec"), t = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 500 });
    el.dispatchEvent(new TouchEvent("touchstart", { touches: [t(220)], changedTouches: [t(220)], bubbles: true }));
    el.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [t(220 + dx)], bubbles: true }));
  }, dx);
  const pestaña = () => p.$eval(".cocSeg [aria-selected=true]", (x) => x.textContent);
  await p.click(".cocSeg button:has-text('Semana')"); await p.waitForTimeout(300);
  await desliza(-120); await p.waitForTimeout(80);
  if (tema === "oscuro") await p.screenshot({ path: `${OUT}desliza.png` });
  await p.waitForTimeout(300);
  const a1 = await pestaña(); await desliza(-120); await p.waitForTimeout(300);
  const a2 = await pestaña(); await desliza(140); await desliza(140); await p.waitForTimeout(300);
  const a3 = await pestaña(); await desliza(140); await p.waitForTimeout(300);
  const a4 = await pestaña();
  console.log("deslizar:", a1, a2, a3, a4);
  if (!/^Comprar/.test(a1) || a2 !== "Despensa" || a3 !== "Semana" || a4 !== "Semana") { errores++; console.log("DESLIZAR MAL"); }
  if (tema === "oscuro") {
    // Despensa: tocar algo -> Se acabó / a la lista; y ver una zona sola
    await p.click(".cocSeg button:has-text('Despensa')"); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}tengo-todo.png` });
    await p.click(".cocZonaFila:has-text('Nevera')"); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}casa-zona.png` });                       // v2.40: filas con su cantidad
    // deslizar una fila a la izquierda: "Se acabó"
    await p.evaluate(() => {
      const b = [...document.querySelectorAll(".cocFilaZin")].find((x) => /Pavo/.test(x.textContent)); if (!b) return;
      const t = (x) => new Touch({ identifier: 2, target: b, clientX: x, clientY: 400 });
      b.dispatchEvent(new TouchEvent("touchstart", { touches: [t(300)], changedTouches: [t(300)], bubbles: true }));
      b.dispatchEvent(new TouchEvent("touchmove", { touches: [t(180)], changedTouches: [t(180)], bubbles: true }));
      b.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [t(180)], bubbles: true }));
    });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}casa-deslizar.png` });
    await p.click(".cocFilaZin:has-text('Yogur')"); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}tengo-tocado.png` });
    await p.click(".cocHojaBot button:has-text('a la lista')"); await p.waitForTimeout(300);
    await p.click(".cocChips button:has-text('Despensa')"); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}tengo-despensa.png` });
    await p.click(".cocFilaZin:has-text('Rigatoni')").catch(() => {}); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}casa-cuanto.png` });                     // ¿cuánto queda? lleno, ¾, ½, ¼, nada
    await p.click(".cocHojaX").catch(() => {}); await p.waitForTimeout(200);
    // Comprar: marcar uno -> al carro (y a la Despensa)
    await p.click(".cocSeg button:has-text('Comprar')"); await p.waitForTimeout(300);
    await p.click(".cocCompra li button >> nth=0"); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}comprar-carro.png` });
    // v2.42: la próxima ida al súper (mañana): "Comprar ya" y "Puede esperar"; de dónde sale; Terminar compra
    await p.click(".cocSuperB button:has-text('Mañana')"); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}comprar-super.png` });
    await p.click(".cocNom >> nth=0"); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}comprar-origen.png` });
    await p.click(".cocSuperB button:has-text('Sin fecha')"); await p.waitForTimeout(300);
    await p.click(".cocTermina"); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}comprar-terminar.png` });
    await p.fill(".cocTerm input >> nth=0", "1 kg"); await p.click(".cocHojaTermina .cocHojaSi"); await p.waitForTimeout(400);
    // v2.40: "Por confirmar" en la Despensa (el desayuno que ya pasó y lo marcado en Comprar)
    await p.click(".cocSeg button:has-text('Despensa')"); await p.waitForTimeout(300);
    await p.click(".cocChips button:has-text('Todo')"); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}casa-porconfirmar.png` });
    await p.click(".cocPcB button:has-text('Corregir')").catch(() => {}); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}casa-corregir.png` });
    await p.click(".cocCorrige button:has-text('Cancelar')").catch(() => {}); await p.waitForTimeout(200);
    await p.click(".cocBtn:has-text('Añadir')"); await p.waitForTimeout(200);
    await p.fill("#cocAnadeTengo", "ri"); await p.dispatchEvent("#cocAnadeTengo", "input"); await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}casa-anadir.png` });
    await p.click(".cocBtn:has-text('Añadir')"); await p.waitForTimeout(200);
    // v2.36: el paso a paso con carriles (la pasta con tomate y atún): plan, manos, espera, tarde, la pasta y el final
    const abreUid = (uid) => p.evaluate((uid) => {
      const ev = window.__dia.find((e) => e.uid === uid);
      return window.CocinaModo.abre({ comida: window.Receta.leer(ev) }, {});
    }, uid);
    await p.evaluate((dia) => { window.__dia = dia; }, F.dia);
    const toca = async (a) => { await p.click(`#cocPaso [data-a="${a}"]`); await p.waitForTimeout(300); };
    const pasa = async (s) => { await p.clock.runFor(s * 1000); await p.waitForTimeout(350); };
    const foto = (n) => p.screenshot({ path: `${OUT}${n}.png` });
    if (await abreUid("c8")) {
      await p.waitForTimeout(400); await foto("carril-plan");
      await toca("hCocina"); await foto("carril-micocina"); await p.evaluate(() => window.CocinaModo.atras()); await p.waitForTimeout(300);
      await toca("cEmpieza"); await foto("carril-agua");
      await toca("cHecho"); await pasa(100); await foto("carril-manos");        // 1:40: picas mientras el agua se calienta
      await pasa(200); await foto("carril-tarde");                              // 5:00: picar lleva 2 min más: se rehace el plan
      await toca("cHecho"); await toca("cHecho"); await foto("carril-espera");  // sofrito al fuego: manos libres hasta la pasta
      for (let i = 0; i < 60; i++) {                                           // hasta que toca la pasta
        const t = await p.$eval("#cocPaso .cpCuerpo h2", (e) => e.textContent).catch(() => "");
        const due = await p.$("#cocPaso .ccCap.ac");
        if (/pasta/i.test(t) && due) break;
        await pasa(15);
      }
      await foto("carril-pasta");
      for (let i = 0; i < 400 && await p.$("#cocPaso [data-a=cHecho]"); i++) {  // y el resto, a su hora
        if (await p.$("#cocPaso .ccCap.ac")) await toca("cHecho"); else await pasa(15);
      }
      await p.waitForTimeout(300); await foto("carril-fin");
      await p.click("#cocPaso [data-a=sinApuntar]").catch(() => {}); await p.waitForTimeout(400);
    } else { errores++; console.log("NO ABRE LA PASTA CON CARRILES"); }
    if (await abreUid("c9")) { await p.waitForTimeout(400); await foto("carril-error"); await p.evaluate(() => window.CocinaModo.atras()); await p.waitForTimeout(300); }
    // el modo paso a paso de lo que toca, desde la tarjeta de Semana
    await p.click(".cocSeg button:has-text('Semana')"); await p.waitForTimeout(300);
    await p.click("#ptCuerpo .tjGo"); await p.waitForTimeout(800);
    await p.screenshot({ path: `${OUT}modo-paso1.png` });
    const boton = async (re) => { for (const b of await p.$$("#cocPaso button")) if (re.test((await b.innerText()).trim())) { await b.click(); await p.waitForTimeout(400); return true; } return false; };
    await boton(/^Listo|^Hecho/);
    await boton(/^(▶\s*)?Empezar/); await p.clock.runFor(65000); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}modo-paso2.png` });
    await boton(/^Pasos$/); await p.screenshot({ path: `${OUT}modo-pasos.png` });
    await p.evaluate(() => window.Cocina.atras()); await p.waitForTimeout(300);
    await p.evaluate(() => window.Cocina.atras()); await p.waitForTimeout(500);
    // en HOY: la comida a su hora va en grande
    await p.click("#ptVolver"); await p.waitForTimeout(700);
    const tj = await p.$("#hCuerpo .tj");
    if (tj) await tj.screenshot({ path: `${OUT}hoy-comida.png` });
    // el escaner de Chrome: camara de mentira y un codigo escrito a mano (Open Food Facts de verdad)
    await p.click("#hCocina"); await p.waitForTimeout(800);
    await p.click(".cocSeg button:has-text('Comprar')"); await p.waitForTimeout(300);
    await p.click(".cocBtn:has-text('Escanear')"); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}esc-camara.png` });
    await p.fill("#cocEsc input", process.env.CODIGO || "8431876302196");
    await p.click("#cocEsc .eMano button");
    await p.waitForSelector("#cocEsc .eOk", { timeout: 15000 }).catch(() => {});
    await p.screenshot({ path: `${OUT}esc-resultado.png` });
    if (await p.$("#cocEsc .eOk")) { await p.click("#cocEsc .eOk"); await p.waitForTimeout(400); }
    await p.click("#cocEsc .eFin"); await p.waitForTimeout(600);
    // en la app Android: el escaner de Google (aqui, de mentira) y vuelta con el producto
    await p.evaluate(() => { window.Nativo.es = true; window.Nativo.escanea = () => new Promise((ok) => setTimeout(() => ok({ codigo: "8480000591463" }), 300)); });
    await p.click(".cocBtn:has-text('Escanear')"); await p.waitForTimeout(150);
    await p.screenshot({ path: `${OUT}esc-nativo-abriendo.png` });
    await p.waitForSelector("#cocEsc .eOk", { timeout: 15000 }).catch(() => {});
    await p.screenshot({ path: `${OUT}esc-nativo-resultado.png` });
    await p.evaluate(() => { window.Nativo.escanea = () => Promise.resolve({ cancelado: true }); });
    if (await p.$("#cocEsc .eOk")) { await p.click("#cocEsc .eOk"); await p.waitForTimeout(500); }
    await p.screenshot({ path: `${OUT}esc-nativo-otro.png` });
    await p.click("#cocEsc .eFin"); await p.waitForTimeout(600);
    await p.evaluate(() => { window.Nativo.es = false; });
    await p.click(".cocSeg button:has-text('Despensa')"); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}esc-tengo.png` });
    // v2.39: el mismo código otra vez sale con TU nombre y no pregunta
    await p.click(".cocBtn:has-text('Escanear')"); await p.waitForTimeout(800);
    await p.fill("#cocEsc input", process.env.CODIGO || "8431876302196");
    await p.click("#cocEsc .eMano button"); await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}esc-conocido.png` });
    await p.click("#cocEsc .eFin"); await p.waitForTimeout(600);
    // v2.38: la Cocina de prueba, desde Ajustes. No puede dejar rastro: ni localStorage ni el /cocina del Worker
    // fuera de la cuenta, lo que cambia solo con el tiempo de verdad: el calendario que se refresca y los
    // relojes de otra receta que ya estaban en marcha (siguen con la hora real). Una clave nueva sí cuenta.
    const huella = (antes) => p.evaluate((antes) => {
      const o = {}, ya = antes ? JSON.parse(antes) : null;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k === "copiloto.agenda.v1" || (k.startsWith("copiloto.cocina.modo2.") && (!ya || k in ya))) { o[k] = "(sigue solo)"; continue; }
        o[k] = localStorage.getItem(k);
      }
      return JSON.stringify(o);
    }, antes || null);
    await p.click("#ptVolver").catch(() => {}); await p.waitForTimeout(600);
    const antesLS = await huella(), antesKV = posts;
    const aAjustes = async () => { await p.click("#hConf"); await p.waitForTimeout(600); };
    // v2.43: una sola "Cocina de prueba": la pestaña Cocina entera con datos de ejemplo, en una caja
    await aAjustes();
    await p.$eval("#cfCocPrueba", (e) => e.scrollIntoView({ block: "center" })); await p.waitForTimeout(300);
    await foto("prueba-ajustes");
    await p.click("#cfCocPrueba"); await p.waitForTimeout(900);
    await foto("prueba-semana");
    const abreDeSemana = async (re) => {
      await p.click(".cocSeg button:has-text('Semana')"); await p.waitForTimeout(300);
      const f = (await p.$$("#ptCuerpo .cocFila")).filter(Boolean);
      for (const x of f) if (re.test(await x.innerText())) { await x.click(); await p.waitForTimeout(600); return true; }
      return false;
    };
    // el paso a paso con carriles: reloj simulado, retrasarse y Mi cocina
    if (await abreDeSemana(/Pasta con tomate/)) {
      await foto("prueba-plan");
      await toca("hCocina"); await toca("cocMenos\"][data-k=\"fuegos"); await toca("cocMenos\"][data-k=\"fuegos"); await toca("cocMenos\"][data-k=\"fuegos");
      await foto("prueba-micocina"); await p.evaluate(() => window.CocinaModo.atras()); await p.waitForTimeout(300);
      await toca("hCocina"); await toca("cocDefecto"); await p.evaluate(() => window.CocinaModo.atras()); await p.waitForTimeout(300);
      await toca("cEmpieza"); await toca("cHecho"); await p.clock.runFor(4000); await p.waitForTimeout(300);
      await toca("simVel\"][data-v=\"30"); await p.clock.runFor(4000); await p.waitForTimeout(300);
      await toca("simTarde"); await p.clock.runFor(1200); await p.waitForTimeout(300);
      await foto("prueba-tarde");
      for (let i = 0; i < 600 && await p.$("#cocPaso [data-a=cHecho]"); i++) {
        if (await p.$("#cocPaso .ccCap.ac")) await toca("cHecho"); else { await p.clock.runFor(1000); await p.waitForTimeout(60); }
      }
      await p.waitForTimeout(300); await foto("prueba-fin");
      await toca("sinApuntar"); await p.waitForTimeout(600);
    } else { errores++; console.log("NO SALE LA PASTA EN LA COCINA DE PRUEBA"); }
    if (await abreDeSemana(/con errores/)) { await foto("prueba-errores"); await toca("simFin"); await p.waitForTimeout(500); }
    else { errores++; console.log("NO SALE LA RECETA CON ERRORES"); }
    // la Despensa y Comprar de ejemplo
    await p.click(".cocSeg button:has-text('Despensa')"); await p.waitForTimeout(300);
    await foto("casaprueba-todo");
    await p.click(".cocPcB button:has-text('Así fue') >> nth=0"); await p.waitForTimeout(400);
    await p.click(".cocZonaFila:has-text('Congelador')"); await p.waitForTimeout(300);
    await foto("casaprueba-congelador");
    await p.click(".cocSeg button:has-text('Comprar')"); await p.waitForTimeout(300);
    await foto("casaprueba-comprar");
    await p.click(".cocSim button"); await p.waitForTimeout(800);
    await foto("prueba-vuelta");                                                     // Terminar: de vuelta a Ajustes
    await p.click("#hojaX").catch(() => {}); await p.waitForTimeout(400);
    const despuesLS = await huella(antesLS);
    if (despuesLS !== antesLS || posts !== antesKV) {
      errores++; console.log("LA PRUEBA HA DEJADO RASTRO", posts - antesKV, "envíos");
      const a = JSON.parse(antesLS), d = JSON.parse(despuesLS);
      for (const k of new Set([...Object.keys(a), ...Object.keys(d)])) if (a[k] !== d[k]) console.log("  cambia", k, String(a[k]).slice(0, 80), "->", String(d[k]).slice(0, 80));
    }
    else console.log("prueba: sin rastro (localStorage y Worker iguales)");
    console.log("\nKV:", kv.cambios.length, "cambios,", kv.lista.length, "en la lista");
  }
  await p.close();
  process.stdout.write(tema + " ");
}
await b.close();
console.log(`\n${errores} errores de página`);
process.exit(errores ? 1 : 0);
