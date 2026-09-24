#!/usr/bin/env node
// Sube la version de la app en todos los sitios a la vez.
//
//   node scripts/bump.mjs patch|minor|major "nota corta"
//
// Cambia APP_VERSION y APP_FECHA en index.html, version.json, la cache de
// sw.js ("copiloto-X.Y.Z") y anade la entrada al CHANGELOG.md.
// Sin dependencias: solo node.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ruta = (f) => join(RAIZ, f);
const lee = (f) => readFileSync(ruta(f), "utf8");
const escribe = (f, s) => writeFileSync(ruta(f), s);

const [tipo, ...resto] = process.argv.slice(2);
const nota = resto.join(" ").trim();
if (!["patch", "minor", "major"].includes(tipo) || !nota) {
  console.error('Uso: node scripts/bump.mjs patch|minor|major "nota corta"');
  process.exit(1);
}

const actual = JSON.parse(lee("version.json")).version;
if (!/^\d+\.\d+\.\d+$/.test(actual)) {
  console.error(`version.json tiene una version rara: ${actual}`);
  process.exit(1);
}
let [ma, mi, pa] = actual.split(".").map(Number);
if (tipo === "major") { ma++; mi = 0; pa = 0; }
if (tipo === "minor") { mi++; pa = 0; }
if (tipo === "patch") { pa++; }
const nueva = `${ma}.${mi}.${pa}`;
const hoy = new Date();
const fecha = [hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate()]
  .map((n, i) => (i ? String(n).padStart(2, "0") : n)).join("-");

function cambia(f, re, por) {
  const s = lee(f);
  if (!re.test(s)) { console.error(`No encuentro ${re} en ${f}`); process.exit(1); }
  escribe(f, s.replace(re, por));
}

// 1. version.json
escribe("version.json", JSON.stringify({ version: nueva, fecha, notas: nota }) + "\n");
// 2. index.html
cambia("index.html", /var APP_VERSION = "[^"]*";/, `var APP_VERSION = "${nueva}";`);
cambia("index.html", /var APP_FECHA = "[^"]*";/, `var APP_FECHA = "${fecha}";`);
// 3. sw.js: al cambiar el nombre de la cache cambia el fichero y el navegador
//    detecta la version nueva
cambia("sw.js", /const C="copiloto-[^"]*";/, `const C="copiloto-${nueva}";`);
// 4. CHANGELOG.md: la entrada nueva va encima de la ultima version
const seccion = tipo === "patch" ? "Corregido" : tipo === "minor" ? "Añadido" : "Cambiado";
let log = lee("CHANGELOG.md");
const i = log.search(/^## \[\d/m);
if (i < 0) { console.error("CHANGELOG.md sin entradas de version"); process.exit(1); }
log = log.slice(0, i) + `## [${nueva}] - ${fecha}\n\n### ${seccion}\n\n- ${nota}\n\n` + log.slice(i);
const enlace = `[${nueva}]: https://github.com/amenedorubn/copiloto/releases/tag/v${nueva}\n`;
const j = log.search(/^\[\d+\.\d+\.\d+\]: /m);
log = j < 0 ? log.replace(/\n*$/, "\n\n") + enlace : log.slice(0, j) + enlace + log.slice(j);
escribe("CHANGELOG.md", log);

console.log(`${actual} -> ${nueva}  (${fecha})
Ahora:
  git add -A && git commit -m "v${nueva}: ${nota.replace(/"/g, "'")}"
  git push origin main
(el tag v${nueva} y la release los crea el Action "Publicar versión")`);
