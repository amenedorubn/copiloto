// Tests de la Cocina de prueba: sus recetas de ejemplo pasan por el lector y el planificador de verdad.
//   node --test tests/cocina-prueba.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const req = createRequire(import.meta.url);
const P = req("../cocina-prueba.js"), R = req("../receta.js"), C = req("../carriles.js"), Modo = req("../cocina-modo.js");

test("prueba: tres recetas, y la pasta y las albóndigas se entienden sin avisos", () => {
  assert.deepEqual(P.RECETAS.map((r) => r.id), ["pasta", "albondigas", "errores"]);
  for (const id of ["pasta", "albondigas"]) {
    const r = R.leer(P.evento(id));
    assert.deepEqual(r.problemas.filter((p) => p.tipo === "carril"), [], id);
    const M = C.modelo(r), plan = C.planifica(M);
    assert.ok(plan.total > 0 && plan.total < plan.lineal, id + ": los carriles ganan tiempo");
  }
});

test("prueba: la receta con errores enseña los tres avisos", () => {
  const t = R.leer(P.evento("errores")).problemas.filter((p) => p.tipo === "carril").map((p) => p.texto).join("\n");
  assert.match(t, /CARRIL SALSA: no dice si va en la sartén o en una olla/);
  assert.match(t, /CARRIL POLLO, paso 1 .*no dice cuántos minutos/);
  assert.match(t, /«\(tras VERDURAS\)» no es ningún carril/);
});

test("prueba: abre el mismo modo con carriles que la cocina de verdad", () => {
  const M0 = Modo.normaliza({ comida: R.leer(P.evento("pasta")) });
  assert.ok(M0.carr && M0.carr.tareas.length === 8);
  assert.equal(P.evento("pasta").uid, "prueba-pasta");                   // nunca un uid del calendario
  assert.deepEqual(P.VELOCIDADES, [1, 10, 30]);
});
