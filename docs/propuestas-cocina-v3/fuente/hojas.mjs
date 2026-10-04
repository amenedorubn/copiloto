// Hojas resumen por decisión (oscuro y claro): 4+ opciones rotuladas y los estados de la recomendada.
// node hojas.mjs <carpeta-salida>
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire(new URL("../../../x.js", import.meta.url))("playwright-core");
const DIR = fileURLToPath(new URL(".", import.meta.url)).split("\\").join("/");
const OUT = (process.argv[2] || DIR + "../").split("\\").join("/");
mkdirSync(OUT, { recursive: true });

const D = [
  { n: "D1", t: "Estructura de Cocina y qué pasa con Recetas", rec: "A", o: [
    ["d1a", "A · Tres pestañas", "Recetas desaparece; la nutrición va en la cabecera de cada día", "La nutrición queda en una línea"],
    ["d1b", "B · Cuatro, con «Comido»", "Recetas pasa a ser la nutrición del día y de la semana", "Una pestaña más que mirar"],
    ["d1c", "C · Sin pestañas", "Una sola lista; Comprar y Casa suben desde abajo", "Comprar y Casa quedan escondidas"],
    ["d1d", "D · «Ahora» primero", "La comida siguiente, enorme, con su plan", "Una barra nueva que repite HOY"]],
    e: [["d1a-cargando", "Cargando"], ["d1a-vacio", "Vacío"], ["d1a-error", "Error"], ["d1a-extremo", "Extremo: 6 comidas"]] },
  { n: "D2", t: "Paso a paso con carriles · pasta con tomate y atún, minuto 1:40", rec: "C", o: [
    ["d2a", "A · Partida arriba y abajo", "Cada carril tiene su reloj grande", "Con 3 o más carriles no cabe"],
    ["d2b", "B · Columnas", "Se ve el orden entero de cada carril", "Letra pequeña; no se lee de lejos"],
    ["d2c", "C · Ahora + luego + mini-Gantt", "Qué haces con las manos y cuándo se junta todo", "El Gantt es pequeño"],
    ["d2d", "D · Tu turno + fichas", "Una sola acción, gigante", "No se ve cuándo se juntan los carriles"]],
    e: [["d2c-antes", "Antes de empezar: el plan"], ["d2c-pasta", "13:48: echa la pasta"], ["d2c-tarde", "Vas tarde: rehace el plan"], ["d2c-unalinea", "Receta de una línea"],
      ["d2c-error", "Error: paso sin tiempo"], ["d2c-extremo", "Extremo: albóndigas, 4 carriles"]] },
  { n: "D3", t: "Comprar", rec: "A", o: [
    ["d3a", "A · Por pasillo + terminar compra", "Va en el orden del súper; al final confirmas cuánto compraste", "Cada alimento necesita su pasillo"],
    ["d3b", "B · Fichas (como Bring!)", "Rapidísimo de tocar", "No caben cantidades largas ni dudas"],
    ["d3c", "C · Por cuándo hace falta", "Sabes qué comprar ya", "En la tienda saltas de pasillo"],
    ["d3d", "D · Dudas primero", "Los «¿te queda?» se resuelven en casa", "Un paso más antes de la lista"]],
    e: [["d3a-vacio", "Vacío"], ["d3a-error", "Error: sin conexión"], ["d3a-extremo", "Extremo: 27 cosas"], ["d3a-terminar", "Terminar compra"]] },
  { n: "D4", t: "Casa (Despensa): meter, sacar y cantidades", rec: "C", o: [
    ["d4a", "A · Zonas + gesto", "Sacar es deslizar; meter, la barra de abajo", "Lo que gasta la app sigue sin verse"],
    ["d4b", "B · Fichas por zona", "Vista rápida de todo", "Poca información por ficha"],
    ["d4c", "C · «Por confirmar» + zonas", "La app propone lo gastado y lo comprado; confirmas con un toque", "Una caja más arriba"],
    ["d4d", "D · Por uso", "Primero lo que pide el plan y lo que se acaba", "No sabes en qué zona está cada cosa"]],
    e: [["d4c-vacio", "Vacío: primer uso"], ["d4c-error", "Error: no lee la nota"], ["d4c-extremo", "Extremo: congelador 3 de 3"], ["d4c-meter", "Meter: escribir, dictar, ticket"],
      ["d4c-cantidad", "Cuánto queda"], ["d4c-escaner", "Escáner: tu nombre manda"]] },
  { n: "D5", t: "Nutrición del día (EFSA) y ficha de alimento", rec: "D", o: [
    ["d5a", "A · Barras por comida", "Se ve qué comida aporta cada cosa", "Hay que leer números"],
    ["d5b", "B · Anillos", "Se lee de un vistazo", "Mucho sitio para 4 datos"],
    ["d5c", "C · Tabla (como Cronometer)", "Todo el detalle", "Demasiado para un vistazo"],
    ["d5d", "D · Lo que falta y con qué", "Te dice qué comer, de lo que hay o vas a comprar", "Menos detalle"]],
    e: [["d5-ficha", "Ficha de alimento"], ["d5-ficha-vacia", "Ficha sin nutrición"], ["d5-comida", "Lo que aporta una comida"], ["d5d-error", "Error: faltan datos"]] },
  { n: "D6", t: "Cómo escribe Claude una receta con carriles", rec: "A", o: [
    ["d6a", "A · Un apartado por carril", "Fácil de escribir y de leer en el calendario", "Formato nuevo: hay que cambiar la nota"],
    ["d6b", "B · Etiqueta en cada paso", "Se parece a lo de hoy", "Los carriles se mezclan al leerlo"],
    ["d6c", "C · Plan con horas", "El plan exacto en el texto", "Claude hace cuentas y puede fallar"],
    ["d6d", "D · Sin cambios: la app deduce", "Claude no cambia nada", "Adivina, y falla con pasos dobles"]], e: [] }
];

const css = (tema) => `
:root{--bg:${tema === "oscuro" ? "#0a0b0d" : "#f6f6f4"};--fg:${tema === "oscuro" ? "#f4f5f7" : "#141518"};--mu:${tema === "oscuro" ? "#8e939b" : "#5b6069"};--sf:${tema === "oscuro" ? "#15171b" : "#fdfdfb"};--ac:${tema === "oscuro" ? "#f08a4b" : "#b3541e"}}
@font-face{font-family:Manrope;src:url("../../../fonts/Manrope.woff2") format("woff2");font-weight:200 800}
body{margin:0;background:var(--bg);color:var(--fg);font-family:Manrope,sans-serif;padding:40px 40px 48px;width:1272px}
h1{font-size:40px;font-weight:800;letter-spacing:-.02em;margin:0}
.k{font-size:14px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mu);margin:0 0 6px}
.row{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-top:32px}
.o img{width:100%;border-radius:22px;display:block;outline:1px solid rgba(128,128,128,.25)}
.o h2{font-size:19px;font-weight:800;margin:14px 0 6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.o h2 span{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;background:var(--ac);color:var(--bg);padding:3px 8px;border-radius:6px}
.o p{font-size:15px;font-weight:600;line-height:1.5;margin:0}
.o p.m{color:var(--mu)}
.sec{margin-top:56px}
.e h2{font-size:16px}
`;
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", args: ["--mute-audio", "--allow-file-access-from-files"] });
const p = await b.newPage({ viewport: { width: 1352, height: 900 }, deviceScaleFactor: 1.5 });
for (const d of D) for (const tema of ["oscuro", "claro"]) {
  const img = (id) => "file:///" + DIR + "png/" + id + "-" + tema + ".png";
  const html = `<!doctype html><meta charset="utf-8"><style>${css(tema)}</style>
<p class="k">${d.n} · Datos de ejemplo · 390 × 844</p><h1>${d.t}</h1>
<div class="row">${d.o.map(([id, tit, mas, menos]) => `<div class="o"><img src="${img(id)}"><h2>${tit}${tit.startsWith(d.rec + " ") ? "<span>Recomendada</span>" : ""}</h2><p>+ ${mas}</p><p class="m">− ${menos}</p></div>`).join("")}</div>
${d.e.length ? `<div class="sec"><p class="k">Estados de la recomendada (${d.rec})</p><div class="row" style="margin-top:12px">${d.e.map(([id, tit]) => `<div class="o e"><img src="${img(id)}"><h2>${tit}</h2></div>`).join("")}</div></div>` : ""}`;
  writeFileSync(DIR + "hoja.html", html);
  await p.goto("file:///" + DIR + "hoja.html");
  await p.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => {}))]));
  await p.screenshot({ path: OUT + d.n + "-" + tema + ".png", fullPage: true });
}
await b.close();
console.log("hojas en", OUT);
