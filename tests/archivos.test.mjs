// Cada .js que carga index.html tiene que ir en la cache del service worker (la PWA sin red),
// en su lista de "red primero" y en lo que se empaqueta en el APK y en su zip de actualización.
//   node --test tests/archivos.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lee = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const scripts = [...lee("index.html").matchAll(/<script src="([a-z0-9_-]+\.js)"/gi)].map((m) => m[1]);

test("index.html carga sus .js", () => {
  assert.ok(scripts.includes("cocina.js") && scripts.includes("nativo.js"), scripts.join(", "));
});

test("cada .js va en el service worker y en el APK", () => {
  const sw = lee("sw.js"), app = lee("app/prepara-web.mjs");
  const red = sw.match(/const JS=\/(.*)\/;/)[1];
  for (const s of scripts) {
    assert.ok(sw.includes('"./' + s + '"'), s + " no esta en la cache de sw.js");
    assert.ok(new RegExp(red).test("/" + s), s + " no va red primero en sw.js");
    assert.ok(app.includes('"' + s + '"'), s + " no se empaqueta en el APK (app/prepara-web.mjs)");
  }
});
