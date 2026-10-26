#!/usr/bin/env node
// Lanza el Gradle del proyecto Android con la ruta completa, en Windows y en el resto:
//   node gradle.mjs assembleRelease
// (npm run apk llamaba a "gradlew.bat" a secas, y en Windows npm puede ejecutar los
// scripts con una shell que no busca en la carpeta actual: «no se reconoce».)
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const android = join(dirname(fileURLToPath(import.meta.url)), "android");
const win = process.platform === "win32";
const gradlew = join(android, win ? "gradlew.bat" : "gradlew");
const tareas = process.argv.slice(2);
const r = spawnSync(gradlew, tareas.length ? tareas : ["assembleRelease"], { cwd: android, stdio: "inherit", shell: win });
if (r.error) { console.error("No se pudo lanzar " + gradlew + ": " + r.error.message); process.exit(1); }
process.exit(r.status ?? 1);
