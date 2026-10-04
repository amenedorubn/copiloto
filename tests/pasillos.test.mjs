// Tests de Comprar por pasillo (v2.42): pasillo, días de uso, prisa y próxima ida al súper. Datos de ejemplo.
//   node --test tests/pasillos.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Rc = require("../receta.js"), Dp = require("../despensa.js");

test("pasilloDe: los 6 pasillos y «Otros» si no se sabe", () => {
  const P = (n, z) => Dp.pasilloDe(n, z);
  assert.equal(P("Cebolla"), "Fruta y verdura");
  assert.equal(P("Plátanos"), "Fruta y verdura");
  assert.equal(P("Contramuslos de pollo"), "Carne y pescado");
  assert.equal(P("Salmón"), "Carne y pescado");
  assert.equal(P("Huevos"), "Lácteos y huevos");
  assert.equal(P("Yogur griego"), "Lácteos y huevos");
  assert.equal(P("Pan de molde"), "Panadería");
  assert.equal(P("Pan rallado"), "Despensa");
  assert.equal(P("Tomate triturado"), "Despensa");
  assert.equal(P("Atún en lata"), "Despensa");
  assert.equal(P("Macarrones"), "Despensa");
  assert.equal(P("Guisantes congelados"), "Congelados");
  assert.equal(P("Bolsas de basura"), "Otros");
  assert.equal(P("Tahini"), "Otros");
  assert.equal(P("Tahini", "Despensa salada"), "Despensa");          // tu zona ayuda si el nombre no basta
  assert.deepEqual(Dp.PASILLOS, ["Fruta y verdura", "Carne y pescado", "Lácteos y huevos", "Panadería", "Despensa", "Congelados"]);
});

// las comidas de ejemplo: martes 6 a jueves 8 de octubre; hoy es el lunes 5
const ev = (uid, fecha, titulo, ing) => Rc.leer({ uid, fuente: "comida", fecha, hora: "14:00", fin: "14:40", titulo, texto: "INGREDIENTES\n" + ing.map((x) => "· " + x).join("\n") + "\nPROCESO\n1. Cocina 10 min." });
const C = [ev("a", "2026-10-06", "Tortilla", ["2 huevos", "1 cebolla"]), ev("b", "2026-10-07", "Curry", ["400 g de contramuslos de pollo", "1 cebolla"]),
           ev("c", "2026-10-08", "Pasta", ["100 g de macarrones", "1 cebolla"])];
const o = { ahoraMs: Date.parse("2026-10-05T10:00:00"), hoy: "2026-10-05" };
const F = Dp.faltan(null, [{ id: "i", t: Date.parse("2026-10-04T10:00:00"), tipo: "inventario", texto: "Nevera: leche" }], C, o);

test("porPasillo: días de uso en vez del plato, ordenado por el primer día y con su prisa", () => {
  const R = Dp.porPasillo(F.items.concat([{ k: "m:1", ver: "Bolsas de basura", mio: true }]), { hoy: "2026-10-05" });
  assert.equal(R.grupos.length, 1); assert.equal(R.grupos[0].titulo, null);
  const it = (n) => R.grupos[0].pasillos.flatMap((p) => p.items).find((x) => x.ver === n);
  assert.equal(it("Cebolla").diasTxt, "mañana · mié · jue");
  assert.equal(it("Cebolla").cant, "3");
  assert.equal(it("Cebolla").urgTxt, "Hace falta mañana"); assert.ok(it("Cebolla").urge);
  assert.equal(it("Contramuslos de pollo").urgTxt, "Puede esperar 2 días"); assert.ok(!it("Contramuslos de pollo").urge);
  assert.equal(it("Bolsas de basura").urgTxt, "Sin día"); assert.equal(it("Bolsas de basura").pasillo, "Otros");
  assert.deepEqual(R.grupos[0].pasillos.map((p) => p.pasillo), ["Fruta y verdura", "Carne y pescado", "Lácteos y huevos", "Despensa", "Otros"]);
});

test("porPasillo: con la próxima ida al súper, «Comprar ya» y «Puede esperar»", () => {
  const R = Dp.porPasillo(F.items, { hoy: "2026-10-05", proxima: "2026-10-07" });
  assert.deepEqual(R.grupos.map((g) => g.titulo), ["Comprar ya", "Puede esperar"]);
  const ya = R.grupos[0].pasillos.flatMap((p) => p.items).map((x) => x.ver).sort();
  assert.deepEqual(ya, ["Cebolla", "Huevos"]);
  const luego = R.grupos[1].pasillos.flatMap((p) => p.items)[0];
  assert.match(luego.urgTxt, /^Puede esperar a la compra del mié$/);
  const R2 = Dp.porPasillo(F.items, { hoy: "2026-10-05", proxima: "2026-10-06" });
  assert.ok(R2.grupos.find((g) => g.titulo === "Puede esperar").pasillos.flatMap((p) => p.items).every((x) => x.urgTxt === "Puede esperar a la compra de mañana"));
  // una fecha pasada no cuenta
  assert.equal(Dp.porPasillo(F.items, { hoy: "2026-10-05", proxima: "2026-10-01" }).proxima, null);
});

test("porPasillo: dentro del pasillo, primero lo que hace falta antes", () => {
  const items = [{ k: "1", ver: "Plátanos", lineas: [{ fecha: "2026-10-09" }] }, { k: "2", ver: "Cebolla", lineas: [{ fecha: "2026-10-06" }] },
                 { k: "3", ver: "Kiwis", mio: true }];
  const R = Dp.porPasillo(items, { hoy: "2026-10-05" });
  assert.deepEqual(R.grupos[0].pasillos[0].items.map((x) => x.ver), ["Cebolla", "Plátanos", "Kiwis"]);
});
