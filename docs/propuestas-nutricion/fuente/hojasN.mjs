// Hojas resumen por decisión (oscuro y claro): 4+ opciones rotuladas y los estados de la recomendada.
// node hojas.mjs <carpeta-salida>
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire("C:/Users/amene/Documents/Projects/copiloto/x.js")("playwright-core");
const DIR = fileURLToPath(new URL(".", import.meta.url)).split("\\").join("/");
const OUT = (process.argv[2] || DIR + "hojas/").split("\\").join("/");
mkdirSync(OUT, { recursive: true });

const D = [
  { n: "N1", t: "Nutrición · Hoy", rec: "C", o: [
    ["n1a", "A · Tiras de rango", "Cada nutriente contra su mínimo–máximo, de un vistazo", "Siete tiras: mucho que leer"],
    ["n1b", "B · Anillos de los 4 prioritarios", "Carbohidratos, fibra, vit. C y folato se ven al momento", "Los macros quedan en texto pequeño"],
    ["n1c", "C · Energía grande + prioritarios", "Lo grande es la energía (estimada) y los macros; debajo, tus 4 prioritarios", "Más alto: hay que bajar un poco"],
    ["n1d", "D · «Te falta» primero", "Dice qué comer antes que los números", "Los rangos solo como barras de %"]], e: [] },
  { n: "N2", t: "Nutrición · Semana", rec: "A", o: [
    ["n2a", "A · Barras apiladas por día", "Energía de cada día por macros y la adherencia en una frase", "Los micros no salen"],
    ["n2b", "B · Días en rango + % medio", "Adherencia de un vistazo (7 círculos) y la media de cada nutriente", "No se ve cada día"],
    ["n2c", "C · Mapa de calor días × nutrientes", "Todo en una cuadrícula, con el % escrito", "Denso: cuesta leerlo de pie"],
    ["n2d", "D · Carbohidratos por día + medias", "Tu prioridad, con su banda; y fibra, vit. C y folato medios", "Solo un nutriente por día"]], e: [] },
  { n: "N3", t: "Nutrición · Tendencias (8 semanas)", rec: "B", o: [
    ["n3a", "A · Cuatro curvas pequeñas", "Todo a la vez, cada una con su banda", "Curvas pequeñas: cuesta ver el detalle"],
    ["n3b", "B · Una curva grande con selector", "Lee bien cada nutriente y su banda por fase", "Uno cada vez"],
    ["n3c", "C · Tabla de medias con ▲▼", "Rápida y precisa", "Sin forma: no se ve la tendencia"],
    ["n3d", "D · Peso medio contra lo esperado", "Responde «¿va la fase como debe?»", "Solo el peso"]], e: [] },
  { n: "N4", t: "Nutrición · Fases", rec: "D", o: [
    ["n4a", "A · Tira de fases", "Toda la temporada en una línea, con dónde estás", "No dice cómo vas en cada una"],
    ["n4b", "B · Semanas con su anillo", "Cómo vas semana a semana", "Lista larga en invierno"],
    ["n4c", "C · Calendario de semanas", "Seis meses en una pantalla", "Las fases solo se distinguen por tinta"],
    ["n4d", "D · La fase de ahora + lo que viene", "Lo que importa hoy, con sus objetivos y cómo vas", "La temporada entera queda abajo"]], e: [] },
  { n: "N5", t: "Nutrición · Carbohidratos según el entreno", rec: "A", o: [
    ["n5a", "A · Barras por tipo de día con su banda", "Se ve al momento qué día te quedas corto", "Medias: esconden días sueltos"],
    ["n5b", "B · Un punto por día", "Cada día cuenta, y se ve la dispersión", "Más difícil de leer"],
    ["n5c", "C · Tabla por tipo de día", "Exacta", "Sin gráfica"],
    ["n5d", "D · La semana día a día", "Cada día con su tipo, objetivo y ✓ o aviso", "Solo esta semana"]], e: [] },
  { n: "N6", t: "Nutrición · Casa y compra", rec: "A", o: [
    ["n6a", "A · Huecos que se repiten", "El hueco, cuántos días y con qué se arregla, con «A la lista»", "Sin gráfica"],
    ["n6b", "B · % ya en casa + lo que falta", "Cuánto del plan tienes y qué comprar para los mínimos", "No dice qué hueco arregla cada cosa"],
    ["n6c", "C · Matriz alimento × hueco", "Qué alimento de casa arregla cada hueco", "Hay que interpretarla"],
    ["n6d", "D · El hueco de la semana", "Una sola cosa, con su curva y la solución", "Solo uno"]], e: [] },
  { n: "N7", t: "Nutrición · Micronutrientes", rec: "A", o: [
    ["n7a", "A · Mapa de calor semanas × micros", "8 semanas y 8 micros, con el % en cada celda", "Pequeño en el móvil"],
    ["n7b", "B · Barras de cobertura (4 semanas)", "Fácil: qué cubres y qué no, con la raya del 100 %", "Sin semanas"],
    ["n7c", "C · Anillos", "Bonito y rápido", "Ocho anillos dicen poco"],
    ["n7d", "D · Tabla con ▲▼", "Exacta y con el cambio", "Sin forma"]], e: [] }
];
const css = (tema) => `
:root{--bg:${tema === "oscuro" ? "#0a0b0d" : "#f6f6f4"};--fg:${tema === "oscuro" ? "#f4f5f7" : "#141518"};--mu:${tema === "oscuro" ? "#8e939b" : "#5b6069"};--sf:${tema === "oscuro" ? "#15171b" : "#fdfdfb"};--ac:${tema === "oscuro" ? "#f08a4b" : "#b3541e"}}
@font-face{font-family:Manrope;src:url("file:///C:/Users/amene/Documents/Projects/copiloto/fonts/Manrope.woff2") format("woff2");font-weight:200 800}
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
<p class="k">${d.n} · Datos ficticios de ejemplo · 390 × 844</p><h1>${d.t}</h1>
<div class="row">${d.o.map(([id, tit, mas, menos]) => `<div class="o"><img src="${img(id)}"><h2>${tit}${tit.startsWith(d.rec + " ") ? "<span>Recomendada</span>" : ""}</h2><p>+ ${mas}</p><p class="m">− ${menos}</p></div>`).join("")}</div>
${d.e.length ? `<div class="sec"><p class="k">Estados de la recomendada (${d.rec})</p><div class="row" style="margin-top:12px">${d.e.map(([id, tit]) => `<div class="o e"><img src="${img(id)}"><h2>${tit}</h2></div>`).join("")}</div></div>` : ""}`;
  writeFileSync(DIR + "hoja.html", html);
  await p.goto("file:///" + DIR + "hoja.html");
  await p.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => {}))]));
  await p.screenshot({ path: OUT + d.n + "-" + tema + ".png", fullPage: true });
}
await b.close();
console.log("hojas en", OUT);
