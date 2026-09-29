// Tests de las transiciones entre pantallas: la decision de animar o no.
//   node --test tests/*.test.mjs
// Sin dependencias: transiciones.js se carga con require() y no toca el DOM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const T = createRequire(import.meta.url)("../transiciones.js");

// un "document" de mentira que cuenta las llamadas a startViewTransition
function docFalso(conSoporte = true) {
  const d = { llamadas: 0 };
  if (conSoporte) d.startViewTransition = (fn) => { d.llamadas++; fn(); return {}; };
  return d;
}
const entorno = (doc, extra = {}) => ({ doc, reducido: false, corriendo: false, cintaEnCurso: false, ...extra });

function prueba(nombre, doc, extra, animaEsperado) {
  test(nombre, () => {
    let veces = 0;
    const r = T.conTransicion(() => { veces++; }, entorno(doc, extra));
    assert.equal(veces, 1, "fn se ejecuta una sola vez");
    assert.equal(r, animaEsperado);
    assert.equal(doc.llamadas || 0, animaEsperado ? 1 : 0);
  });
}

prueba("sin soporte de startViewTransition: fn directo", docFalso(false), {}, false);
prueba("con movimiento reducido: fn directo", docFalso(), { reducido: true }, false);
prueba("con el GPS corriendo: fn directo", docFalso(), { corriendo: true }, false);
prueba("con la cinta en curso: fn directo", docFalso(), { cintaEnCurso: true }, false);
prueba("en el resto de casos: usa startViewTransition", docFalso(), {}, true);

test("sin entorno o sin documento no anima ni rompe", () => {
  let n = 0;
  assert.equal(T.conTransicion(() => { n++; }, undefined), false);
  assert.equal(T.conTransicion(() => { n++; }, {}), false);
  assert.equal(n, 2);
});
test("si startViewTransition lanza, fn se ejecuta igualmente una vez", () => {
  let n = 0;
  const doc = { startViewTransition() { throw new Error("no"); } };
  assert.equal(T.conTransicion(() => { n++; }, entorno(doc)), false);
  assert.equal(n, 1);
});

test("antes() corre antes de animar y alTerminar() al acabar; sin animar no corren", async () => {
  const orden = [];
  const doc = { startViewTransition(fn) { orden.push("svt"); fn(); return { finished: Promise.resolve() }; } };
  const r = T.conTransicion(() => orden.push("fn"), entorno(doc, { antes: () => orden.push("antes"), alTerminar: () => orden.push("fin") }));
  await Promise.resolve(); await Promise.resolve();
  assert.equal(r, true);
  assert.deepEqual(orden, ["antes", "svt", "fn", "fin"]);
  const o2 = [];
  T.conTransicion(() => o2.push("fn"), entorno(docFalso(false), { antes: () => o2.push("antes"), alTerminar: () => o2.push("fin") }));
  assert.deepEqual(o2, ["fn"]);
});
