#!/usr/bin/env node
// Baja lo que no cabe en el repo y necesita el APK para la voz sin internet:
//   - la libreria de sherpa-onnx (AAR)           -> android/app/libs/
//   - la voz Piper "Miro" (es-ES, CC BY-NC-SA 4.0) -> android/app/src/main/assets/voz/
//
//   node app/descarga-voz.mjs
// Solo hace falta una vez por PC (o si se borra). Necesita tar (viene en Windows 10+).
import { createWriteStream, existsSync, mkdirSync, rmSync, renameSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const APP = dirname(fileURLToPath(import.meta.url));
const SHERPA = "1.13.8";
const AAR = `https://github.com/k2-fsa/sherpa-onnx/releases/download/v${SHERPA}/sherpa-onnx-${SHERPA}.aar`;
const VOZ = "vits-piper-es_ES-miro-high";
const MODELO = `https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${VOZ}.tar.bz2`;
const LIBS = join(APP, "android", "app", "libs");
const ASSETS = join(APP, "android", "app", "src", "main", "assets", "voz");

async function baja(url, destino) {
  console.log("bajando " + url);
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ": " + r.status);
  await pipeline(Readable.fromWeb(r.body), createWriteStream(destino));
}

mkdirSync(LIBS, { recursive: true });
const aar = join(LIBS, `sherpa-onnx-${SHERPA}.aar`);
if (!existsSync(aar)) await baja(AAR, aar);

if (!existsSync(join(ASSETS, "es_ES-miro-high.onnx"))) {
  const tmp = join(tmpdir(), "copiloto-voz"); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  const tar = join(tmp, VOZ + ".tar.bz2");
  await baja(MODELO, tar);
  execFileSync("tar", ["-xjf", tar, "-C", tmp], { stdio: "inherit" });
  rmSync(ASSETS, { recursive: true, force: true }); mkdirSync(dirname(ASSETS), { recursive: true });
  const d = join(tmp, VOZ);
  mkdirSync(ASSETS);
  for (const f of ["es_ES-miro-high.onnx", "tokens.txt"]) copyFileSync(join(d, f), join(ASSETS, f));
  copyFileSync(join(d, "README.md"), join(ASSETS, "LICENCIA.md"));
  renameSync(join(d, "espeak-ng-data"), join(ASSETS, "espeak-ng-data"));
  rmSync(tmp, { recursive: true, force: true });
}
console.log("voz lista en " + ASSETS);
