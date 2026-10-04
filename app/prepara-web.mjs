#!/usr/bin/env node
// Copia la web (la de la raiz del repo, la misma de GitHub Pages) a app/www,
// que es lo que va dentro del APK. Sin service worker: en la app los archivos
// ya son locales y las versiones nuevas llegan como zip (ver nativo.js).
//
//   node app/prepara-web.mjs            -> app/www
//   node app/prepara-web.mjs --zip x    -> ademas, x.zip con lo mismo (para la release)
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const APP = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(APP, "..");
const WWW = join(APP, "www");
const COSAS = ["index.html", "arc.js", "stats.js", "transiciones.js", "nativo.js", "receta.js", "despensa.js", "alimentos.js", "nutri-tabla.js", "nutricion.js", "carriles.js", "cocina-modo.js", "cocina-prueba.js", "cocina.js", "pasos.js", "rutalocal.js", "version.json",
  "manifest.webmanifest", "manifest-n1.webmanifest", "manifest-b1.webmanifest", "manifest-r1.webmanifest",
  "fonts", "iconos", "rutas"];

rmSync(WWW, { recursive: true, force: true });
mkdirSync(WWW, { recursive: true });
for (const c of COSAS) {
  const de = join(RAIZ, c);
  if (!existsSync(de)) { console.error("falta " + c); process.exit(1); }
  cpSync(de, join(WWW, c), { recursive: true });
}
const v = JSON.parse(readFileSync(join(RAIZ, "version.json"), "utf8")).version;
console.log("app/www listo con la version " + v);

const i = process.argv.indexOf("--zip");
if (i > 0) {
  const zip = process.argv[i + 1];
  rmSync(zip, { force: true });
  // zip -r desde dentro de www: index.html en la raiz del zip, como pide el actualizador
  execFileSync("zip", ["-qr", zip, "."], { cwd: WWW, stdio: "inherit" });
  console.log("zip: " + zip);
}
