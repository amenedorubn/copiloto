// Tests de alimentos.js: tu nombre manda; el del paquete es un alias. Datos de ejemplo.
//   node --test tests/alimentos.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const A = createRequire(import.meta.url)("../alimentos.js");
const T0 = Date.parse("2026-10-05T12:00:00");

test("limpiaNombre: sin marca, sin peso y en minúsculas", () => {
  assert.equal(A.limpiaNombre("MEJILLON EN ESCABECHE (3x80g)", "Marca Uno"), "Mejillon en escabeche");
  assert.equal(A.limpiaNombre("Atún claro Marca Dos 3 x 56 g", "Marca Dos"), "Atún claro");
  assert.equal(A.limpiaNombre("Leche semidesnatada 1 l", ""), "Leche semidesnatada");
});

test("formato: el paquete, sus unidades y lo que pesa cada una", () => {
  assert.deepEqual(A.formato("240 g (3 x 80 g)"), { total: { n: 240, ud: "g" }, uds: 3, cada: { n: 80, ud: "g" } });
  assert.deepEqual(A.formato("1 kg"), { total: { n: 1000, ud: "g" }, uds: 1, cada: { n: 1000, ud: "g" } });
  assert.deepEqual(A.formato("6×125g"), { total: { n: 750, ud: "g" }, uds: 6, cada: { n: 125, ud: "g" } });
  assert.equal(A.formato("sin datos"), null);
});

test("registra: un código nuevo con tu nombre; el del paquete queda como alias", () => {
  const r = A.registra([], { nombre: "Mejillones en lata", codigo: "8400000000001", offNombre: "Mejillón en escabeche", marca: "Marca Uno",
    formato: "240 g (3 x 80 g)", nutri: { kcal: 147, prot: 21 }, zona: "Despensa salada" }, T0);
  assert.ok(r.nuevo);
  assert.equal(r.A.nombre, "Mejillones en lata");
  assert.deepEqual(r.A.alias, ["Mejillón en escabeche"]);
  assert.deepEqual(r.A.codigos, [{ ean: "8400000000001", marca: "Marca Uno", formato: "240 g (3 x 80 g)" }]);
  assert.deepEqual(r.A.eq, { n: 80, ud: "g" });
  assert.equal(r.A.nutri.fuente, "OFF"); assert.equal(r.A.nutri.kcal, 147);
});

test("tu nombre manda: volver a escanear, o escanear otra marca, nunca lo cambia", () => {
  const L = [A.registra([], { nombre: "Atún en lata", codigo: "1111111111111", offNombre: "Atún claro al natural" }, T0).A];
  // el mismo código con otro nombre de Open Food Facts: sigue siendo tu "Atún en lata"
  const r1 = A.registra(L, { nombre: "Atun claro en aceite de oliva", codigo: "1111111111111", offNombre: "Atun claro en aceite de oliva" }, T0 + 1);
  assert.ok(!r1.nuevo); assert.equal(r1.A.nombre, "Atún en lata");
  assert.ok(r1.A.alias.includes("Atun claro en aceite de oliva"));
  // otra marca que eliges como tu "Atún en lata": se relaciona, no se duplica
  const r2 = A.registra(L, { id: L[0].id, nombre: "Atún en lata", codigo: "2222222222222", offNombre: "Atún Marca Dos" }, T0 + 2);
  assert.ok(!r2.nuevo); assert.equal(r2.A.codigos.length, 2); assert.equal(r2.A.nombre, "Atún en lata");
  assert.equal(A.porCodigo([r2.A], "2222222222222").nombre, "Atún en lata");
});

test("sugiere: primero lo tuyo que se parece, luego lo de casa, luego el nombre del paquete", () => {
  const L = [A.registra([], { nombre: "Mejillones en lata", codigo: "1" }, T0).A];
  const s = A.sugiere(L, [{ nombre: "Mejillones en lata" }, { nombre: "Leche semi" }], "Mejillones en escabeche", "Marca Uno");
  assert.equal(s[0].nombre, "Mejillones en lata"); assert.equal(s[0].por, "tuyo"); assert.equal(s[0].id, L[0].id);
  assert.equal(s[s.length - 1].por, "paquete");
  assert.ok(!s.some((x) => x.nombre === "Leche semi"));
  const s2 = A.sugiere([], [{ nombre: "Pan de molde" }], "Pan de molde integral", "");
  assert.equal(s2[0].nombre, "Pan de molde"); assert.equal(s2[0].por, "casa");
});

test("la nutrición que escribes tú no la pisa ninguna fuente", () => {
  let a = A.registra([], { nombre: "Yogur natural", codigo: "3", nutri: { kcal: 60 } }, T0).A;
  a.nutri = { kcal: 55, fuente: "tú" };
  a = A.registra([a], { id: a.id, nombre: "Yogur natural", codigo: "3", nutri: { kcal: 62 } }, T0 + 1).A;
  assert.equal(a.nutri.kcal, 55); assert.equal(a.nutri.fuente, "tú");
});

test("renombra: el nombre de antes queda como alias", () => {
  const a = A.registra([], { nombre: "Atún", codigo: "9" }, T0).A, b = A.renombra(a, "Atún en lata", T0 + 1);
  assert.equal(b.nombre, "Atún en lata"); assert.deepEqual(b.alias, ["Atún"]);
});

test("mezcla: gana lo más nuevo de cada alimento; lo borrado no se ve", () => {
  const x = { id: "a1", t: 1, nombre: "A" }, y = { id: "a1", t: 2, nombre: "B" }, z = { id: "a2", t: 1, nombre: "C", borrado: true };
  assert.deepEqual(A.mezcla([x, z], [y]).map((a) => a.nombre), ["B", "C"]);
  assert.deepEqual(A.vivos(A.mezcla([x, z], [y])).map((a) => a.nombre), ["B"]);
});

test("cantDoble: unidad y gramos con su equivalencia", () => {
  assert.equal(A.cantDoble({ n: 240, ud: "g" }, { n: 80, ud: "g" }), "240 g · 3 ud");
  assert.equal(A.cantDoble({ n: 2, ud: "lata" }, { n: 80, ud: "g" }), "2 latas · 160 g");
  assert.equal(A.cantDoble({ n: 500, ud: "g" }, null), "500 g");
});
