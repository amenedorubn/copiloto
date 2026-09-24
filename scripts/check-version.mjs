#!/usr/bin/env node
// Falla si APP_VERSION (index.html), version.json y la cache de sw.js no
// dicen la misma version. Lo usa .github/workflows/version.yml.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const lee = (f) => readFileSync(join(RAIZ, f), "utf8");

const html = (lee("index.html").match(/var APP_VERSION = "([^"]*)";/) || [])[1];
const json = JSON.parse(lee("version.json")).version;
const sw = (lee("sw.js").match(/const C="copiloto-([^"]*)";/) || [])[1];

console.log(`index.html APP_VERSION: ${html}\nversion.json:           ${json}\nsw.js cache:            copiloto-${sw}`);
const semver = /^\d+\.\d+\.\d+$/;
if (!html || !json || !sw || html !== json || json !== sw || !semver.test(json)) {
  console.error("\nLas tres versiones no coinciden (o no son X.Y.Z). Usa: node scripts/bump.mjs patch \"nota\"");
  process.exit(1);
}
console.log("\nOK: las tres dicen " + json);
