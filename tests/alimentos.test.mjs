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

/* ------------------------------ la ficha entera (v2.47) ------------------------------ */
test("ficha: Open Food Facts entera, con vitaminas en mg/µg y la porción; lo que no viene, sin dato", () => {
  const C = createRequire(import.meta.url)("../cocina.js");
  const p = C.productoOFF({ status: 1, code: "1", product: { product_name: "Cereales de ejemplo", quantity: "375 g", serving_quantity: "30", serving_size: "30 g",
    nutriments: { "energy-kcal_100g": 380, "fat_100g": 2.5, "saturated-fat_100g": 0.5, "carbohydrates_100g": 80, "sugars_100g": 8, "fiber_100g": 6, "proteins_100g": 9,
                  "salt_100g": 0.7, "vitamin-c_100g": 0.0275, "vitamin-b9_100g": 0.0002, "iron_100g": 0.0084, "vitamin-d_100g": 0.0000042 } } });
  const n = p.nutri;
  assert.equal(n.vitC, 27.5); assert.equal(n.folato, 200); assert.equal(n.hierro, 8.4); assert.equal(n.vitD, 4.2);
  assert.equal(n.porcionG, 30); assert.equal(n.porcionTxt, "30 g");
  assert.equal(n.mono, undefined); assert.equal(n.incompleta, false);
  const f = A.fichaFilas(n), fila = (k) => f.find((x) => x.k === k);
  assert.equal(fila("mono").v100, null);                                    // sin dato, nunca 0
  assert.equal(fila("kcal").vPor, 114); assert.equal(fila("kj").v100, Math.round(380 * 4.184));
});

test("ficha a mano: se guarda a medias, lo vacío sigue sin dato y queda «incompleta»", () => {
  const a = A.registra([], { nombre: "Proteína de cookies" }, T0).A;
  const b = A.conFicha(a, { kcal: 370, prot: 75, hc: "", sat: null }, { porcionG: 30 }, T0 + 1);
  assert.equal(b.nutri.kcal, 370); assert.equal(b.nutri.prot, 75);
  assert.ok(!("hc" in b.nutri)); assert.ok(b.nutri.incompleta); assert.equal(b.nutri.fuente, "tú"); assert.equal(b.nutri.porcionG, 30);
  const c = A.conFicha(b, { grasa: 6, sat: 1.5, hc: 8, azucar: 2, sal: 0.4 }, null, T0 + 2);
  assert.equal(c.nutri.incompleta, false); assert.equal(c.nutri.kcal, 370);
});

test("ficha genérica de USDA para lo que no tiene etiqueta (sal desde el sodio)", () => {
  const T = createRequire(import.meta.url)("../nutri-tabla.js"), kiwi = T.find((x) => x.nombre === "Kiwi");
  const n = A.deUSDA(kiwi);
  assert.equal(n.fuente, "USDA"); assert.equal(n.vitC, 92.7); assert.equal(n.sal, Math.round(3 * 2.5) / 1000); assert.equal(n.porcionG, 75);
  assert.equal(n.sat, undefined); assert.ok(n.incompleta);
  assert.equal(A.deUSDA(null), null);
});
