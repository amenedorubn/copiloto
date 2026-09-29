// Tests de cocina.js: comidas del calendario, despensa de la nota, recetas y cambios.
// Los datos son de ejemplo, con el mismo formato que los de verdad (no van al repo).
//   node --test tests/cocina.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const C = createRequire(import.meta.url)("../cocina.js");

test("cantidades: gramos, kilos, cucharadas, fracciones y sin numero", () => {
  assert.deepEqual(C.cantidad("250 g solomillos de pollo"), { n: 250, ud: "g", resto: "solomillos de pollo" });
  assert.deepEqual(C.cantidad("1,2 kg de rigatoni"), { n: 1200, ud: "g", resto: "rigatoni" });
  assert.deepEqual(C.cantidad("2 cdas leche"), { n: 2, ud: "cda", resto: "leche" });
  assert.deepEqual(C.cantidad("3 huevos"), { n: 3, ud: "ud", resto: "huevos" });
  assert.deepEqual(C.cantidad("½ cebolla"), { n: 0.5, ud: "ud", resto: "cebolla" });
  assert.deepEqual(C.cantidad("medio aguacate"), { n: 0.5, ud: "ud", resto: "aguacate" });
  assert.deepEqual(C.cantidad("4 bolsas de arroz"), { n: 4, ud: "bolsa", resto: "arroz" });
  assert.equal(C.cantidad("Sal al gusto"), null);
  assert.equal(C.cantTxt({ n: 1200, ud: "g" }), "1,2 kg");
  assert.equal(C.cantTxt({ n: 3, ud: "ud" }), "3");
});

const EVENTO = {
  uid: "e1", fuente: "comida", fecha: "2026-10-01", hora: "14:30", titulo: "Tupper · Pollo al curry con arroz",
  texto: [
    "2 raciones (hoy + tupper a la nevera)",
    "INGREDIENTES:",
    "· 500 g solomillos de pollo",
    "· 1 cebolla",
    "· 200 ml leche de coco",
    "· Sal al gusto",
    "CÓMO SE HACE:",
    "1. Dora el pollo en la sartén, 6 min.",
    "2. Añade la cebolla y el curry, 3-4 min.",
    "3. La leche de coco y a fuego bajo 10 min.",
    "TUPPER: destapado hasta que enfríe, luego a la nevera."
  ].join("\n")
};

test("una comida del calendario se parte en ingredientes, pasos y notas", () => {
  const c = C.comida(EVENTO);
  assert.equal(c.titulo, "Pollo al curry con arroz");
  assert.equal(c.etiqueta, "Tupper");
  assert.equal(c.raciones, 2);
  assert.deepEqual(c.ingredientes.map((i) => i.txt), ["500 g solomillos de pollo", "1 cebolla", "200 ml leche de coco", "Sal al gusto"]);
  assert.deepEqual(c.ingredientes[0].c, { n: 500, ud: "g" });
  assert.equal(c.pasos.length, 3);
  assert.equal(C.minutosDe(c.pasos[0]), 6);
  assert.equal(C.minutosDe(c.pasos[1]), 4, "de 3-4 min se toma lo largo");
  assert.ok(c.notas.some((n) => /destapado/.test(n)));
});

test("una comida sin apartados: las viñetas con cantidad son ingredientes y los numeros, pasos", () => {
  const c = C.comida({ titulo: "Tostada con huevo", texto: "- 1 rebanada de pan\n- 2 huevos\n1. Tuesta el pan.\n2. Huevos a la plancha 3 min." });
  assert.equal(c.ingredientes.length, 2);
  assert.equal(c.pasos.length, 2);
});

test("ingredientes en una linea y enlace a la receta de Copiloto Cocina", () => {
  const c = C.comida({ titulo: "Albóndigas", texto: "Ingredientes: 500 g carne picada, 1 huevo, 30 g pan rallado (o avena)\nReceta: albondigas-rigatoni" });
  assert.deepEqual(c.ingredientes.map((i) => i.nombre), ["carne picada", "huevo", "pan rallado (o avena)"]);
  assert.equal(c.receta, "albondigas-rigatoni");
  const idx = [{ id: "albondigas-rigatoni", titulo: "Albóndigas en salsa con rigatoni" }, { id: "curry-pollo", titulo: "Curry de pollo" }];
  assert.equal(C.recetaDe(c, idx).id, "albondigas-rigatoni");
  assert.equal(C.recetaDe(C.comida({ titulo: "Curry de pollo con arroz" }), idx).id, "curry-pollo", "por el titulo");
  assert.equal(C.recetaDe(C.comida({ titulo: "Tortilla francesa" }), idx), null);
});

const NOTA = [
  "DESPENSA EN VIVO — última actualización: 25/09/2026 (noche), declarada por el usuario",
  "",
  "REGLA: este bloque manda.",
  "",
  "\\## CONGELADOR",
  "- Tupper: lentejas con verduras (400 g) → tupper del viernes",
  "Bolsas: pimiento en tiras, cebolla troceada, 4 bolsas de arroz de microondas (3 min)",
  "",
  "\\## NEVERA",
  "Medio tomate, yogur natural, leche semi abierta",
  "",
  "\\## DESPENSA SECA",
  "6 huevos, rigatoni (1,2 kg), bote de tomate triturado 800 g (cerrado), pan rallado, sal, AOVE",
  "",
  "\\## NO HAY",
  "Pollo, carne picada, aguacate",
  "",
  "\\## COMPRA (sábado 26/09)",
  "500 g solomillos de pollo, 500 g carne picada, 1 aguacate. Solo si falta: pan (menos de 15 rebanadas).",
  "Plan de comidas confirmado y guardado en el calendario Comidas."
].join("\n");

test("la nota de la despensa: fecha, zonas con cantidades, lo que no hay y la compra", () => {
  const D = C.despensa(NOTA);
  assert.equal(D.fecha, "2026-09-25");
  assert.deepEqual(D.zonas.map((z) => z.zona), ["Congelador", "Nevera", "Despensa seca"]);
  const cong = D.zonas[0].items;
  assert.equal(cong[0].tupper, true);
  assert.deepEqual(cong[0].c, { n: 400, ud: "g" });
  assert.equal(cong[0].nombre, "Lentejas con verduras");
  assert.deepEqual(cong.map((x) => x.nombre), ["Lentejas con verduras", "Pimiento en tiras", "Cebolla troceada", "Arroz de microondas"]);
  assert.deepEqual(cong[3].c, { n: 4, ud: "bolsa" });
  assert.deepEqual(D.zonas[2].items[1].c, { n: 1200, ud: "g" }, "la cantidad entre parentesis");
  assert.deepEqual(D.noHay, ["Pollo", "carne picada", "aguacate"]);
  assert.equal(D.compra.items.length, 3);
  assert.ok(/solo si falta/i.test(D.compra.nota));
});

test("¿esta en casa?: sale en una zona, no hay, o lo cambio una compra despues", () => {
  const D = C.despensa(NOTA), c = C.comida(EVENTO);
  const [pollo, cebolla, coco] = c.ingredientes;
  assert.equal(C.estadoDe(pollo, D).estado, "no");
  assert.equal(C.estadoDe(cebolla, D).estado, "hay");
  assert.equal(C.estadoDe(cebolla, D).zona, "Congelador");
  assert.equal(C.estadoDe(coco, D).estado, "no", "lo que no sale en la nota no esta");
  const compra = [{ t: Date.parse("2026-09-26T12:00:00"), tipo: "compra", items: ["500 g solomillos de pollo"] }];
  assert.equal(C.estadoDe(pollo, D, compra).estado, "hay");
  const gasto = compra.concat([{ t: Date.parse("2026-09-27T14:00:00"), tipo: "gasto", de: "Curry", items: ["500 g solomillos de pollo"] }]);
  assert.equal(C.estadoDe(pollo, D, gasto).estado, "gastado");
});

test("lo que toca: la comida en curso o la siguiente", () => {
  const L = C.comidasDe([
    { fuente: "comida", fecha: "2026-10-01", hora: "09:00", titulo: "Desayuno" },
    { fuente: "comida", fecha: "2026-10-01", hora: "14:30", titulo: "Comida" },
    { fuente: "rutina", fecha: "2026-10-01", hora: "15:00", titulo: "No es comida" },
    { fuente: "comida", fecha: "2026-10-01", hora: "21:00", titulo: "Cena" }
  ]);
  assert.equal(L.length, 3);
  assert.equal(C.queToca(L, "2026-10-01", "08:00").titulo, "Desayuno");
  assert.equal(C.queToca(L, "2026-10-01", "15:30").titulo, "Comida", "90 min despues sigue siendo la de ahora");
  assert.equal(C.queToca(L, "2026-10-01", "16:30").titulo, "Cena");
  assert.equal(C.queToca(L, "2026-10-01", "23:00"), null);
});

test("lo que falta para las comidas y el texto para Claude", () => {
  const D = C.despensa(NOTA), L = [C.comida(EVENTO)];
  const f = C.faltan(L, D, []);
  assert.deepEqual(f.map((x) => x.nombre), ["solomillos de pollo", "leche de coco"], "sin la sal ni lo que hay");
  const cb = [{ t: Date.parse("2026-09-24T10:00:00"), tipo: "compra", items: ["viejo"] },
              { t: Date.parse("2026-09-27T14:00:00"), tipo: "gasto", de: "Curry de pollo", items: ["500 g solomillos de pollo", "1 cebolla"] }];
  assert.equal(C.vigentes(cb, "2026-09-25").length, 1, "lo anterior a la nota ya esta en ella");
  assert.equal(C.paraClaude(cb, "2026-09-25"), "Despensa: cambios desde la nota del 25/9\n- 27/09 Gastado en Curry de pollo: 500 g solomillos de pollo, 1 cebolla");
});
