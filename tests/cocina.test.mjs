// Tests de cocina.js: lo que queda en él (HOY, avisos, rutinas, escáner, sincronizar). Las comidas,
// en tests/receta.test.mjs; Tengo y Comprar, en tests/despensa.test.mjs; el paso a paso, en tests/cocina-modo.test.mjs.
// Los datos son de ejemplo, con el mismo formato que los de verdad (no van al repo).
//   node --test tests/cocina.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const C = createRequire(import.meta.url)("../cocina.js");

test("el movil y Chrome: los cambios se juntan por id y lo borrado queda borrado", () => {
  const a = [{ id: "1", t: 1, tipo: "compra", items: ["x"] }, { t: 5, tipo: "gasto", items: ["y"] }];
  const b = [{ id: "1", t: 1, tipo: "compra", items: ["x"], borrado: true, tb: 9 }, { id: "2", t: 3, tipo: "acaba", items: ["z"] }];
  const m = C.mezcla(a, b);
  assert.deepEqual(m.map((x) => x.id), ["1", "2", "t5"], "por fecha; los viejos sin id la sacan de su fecha");
  assert.equal(m[0].borrado, true);
  assert.equal(C.mezcla(m, a).length, 3, "juntar otra vez no duplica");
  assert.equal(C.vigentes(m).length, 2);
});

test("una rutina con horas se hace paso a paso; su reloj sale de lo que dura", () => {
  const P = C.pasosGuia({ titulo: "Rutina de noche", texto: "RUTINA:\n21:40 · Overnight oats para mañana (10 min)\n22:00 · Ducha\n· 22:10 · Leer (10 min)\nNotas sueltas" });
  assert.deepEqual(P.map((p) => [p.titulo, p.duracion_s]), [["Overnight oats para mañana", 600], ["Ducha", 0], ["Leer", 600]]);
  assert.equal(P[0].detalle, "A las 21:40 · 10 min");
  assert.equal(C.pasosGuia({ texto: "Sin horas" }).length, 0);
});

test("un codigo de barras de Open Food Facts: nombre, marca, cantidad y donde se guarda", () => {
  const p = C.productoOFF({ code: "8431876302196", status: 1, product: { product_name: "CREMA DE CALABAZA", brands: "Carrefour Classic, Carrefour", quantity: "350 ml", categories_tags: ["en:soups"] } });
  assert.deepEqual(p, { codigo: "8431876302196", nombre: "Crema de calabaza", marca: "Carrefour", cantidad: "350 ml", zona: "Despensa", txt: "Crema de calabaza (Carrefour, 350 ml)" });
  assert.equal(C.productoOFF({ status: 1, product: { product_name: "Yogur griego", categories_tags: ["en:dairies", "en:yogurts"] } }).zona, "Nevera");
  assert.equal(C.productoOFF({ status: 1, product: { product_name_es: "Guisantes", categories_tags: ["en:frozen-foods"] } }).zona, "Congelador");
  assert.equal(C.productoOFF({ status: 0 }), null, "si no lo conoce, se escribe a mano");
  const n = C.productoOFF({ status: 1, product: { product_name: "Yogur griego", quantity: "500 g", nutriscore_grade: "b",
    nutriments: { "energy-kcal_100g": 97, proteins_100g: 9.2, carbohydrates_100g: 4, fat_100g: 5, salt_100g: 0.1 } } }).nutri;
  assert.deepEqual(n, { kcal: 97, prot: 9.2, hc: 4, grasa: 5, sal: 0.1, por: "100 g", nutriscore: "B" });
  assert.equal(C.nutriTxt(n), "97 kcal · 9,2 g proteína · 4 g hidratos · 5 g grasa");
  assert.equal(C.productoOFF({ status: 1, product: { product_name: "Leche", quantity: "1 l", nutriments: { energy_100g: 200 } } }).nutri.kcal, 47.8, "solo kJ: se pasa a kcal");
  assert.equal(C.productoOFF({ status: 1, product: { product_name: "Leche", quantity: "1 l", nutriments: { energy_100g: 200 } } }).nutri.por, "100 ml");
  assert.equal(C.productoOFF({ status: 1, product: { product_name: "Sin datos" } }).nutri, undefined);
  assert.ok(C.esCodigo("8431876302196") && C.esCodigo("12345678") && !C.esCodigo("123"));
});

test("en grande en HOY: el entreno a su hora y luego cada comida a la suya", () => {
  const dia = (hecho) => [
    { tipo: "ent", hora: "06:10", fin: "06:55", hecho, ref: 0 },
    { tipo: "comida", hora: "08:00", ref: "desayuno" },
    { tipo: "comida", hora: "14:30", fin: "15:15", ref: "comida" },
    { tipo: "comida", hora: "21:00", ref: "cena" },
    { tipo: "comida", hora: null, ref: "todo el dia" }
  ];
  const g = (hora, hecho = false) => { const x = C.queGrande(dia(hecho), hora); return x && x.ref; };
  assert.equal(g("05:30"), 0, "antes de nada, lo primero");
  assert.equal(g("07:00"), 0, "el entreno sigue hasta 30 min despues de su fin");
  assert.equal(g("07:00", true), "desayuno", "hecho el entreno, lo siguiente");
  assert.equal(g("07:30"), "desayuno");
  assert.equal(g("09:30"), "comida", "el desayuno pasa 1 h despues de su hora");
  assert.equal(g("15:10"), "comida");
  assert.equal(g("15:20"), "cena");
  assert.equal(g("22:30"), null, "si ya paso todo, lo de siempre");
  assert.equal(C.queGrande([{ tipo: "ent", hora: "18:00", ref: 1 }, { tipo: "comida", hora: "14:30", fin: "15:15", ref: "c" }], "16:00").ref, 1);
});

test("avisos: el tupper la noche antes, la avena al salir, y los avisos que ya trae el calendario", () => {
  const ahora = new Date(2026, 8, 30, 12, 0).getTime();          // miercoles 30/09 12:00
  const dia = [
    { uid: "t1", fuente: "comida", fecha: "2026-10-01", hora: "14:30", titulo: "Tupper · Albóndigas con rigatoni", texto: "Sale del congelador la noche antes." },
    { uid: "o1", fuente: "comida", fecha: "2026-10-01", hora: "08:30", titulo: "Desayuno · Overnight oats", texto: "Bote de la nevera, en la oficina" },
    { uid: "t2", fuente: "comida", fecha: "2026-10-02", hora: "14:30", titulo: "Tupper · Guiso de carne", texto: "Del congelador" },
    { uid: "d2", fuente: "comida", fecha: "2026-10-01", hora: "22:00", titulo: "Descongelar el tupper del guiso", texto: "A la nevera para mañana" },
    { uid: "x", fuente: "comida", fecha: "2026-10-01", hora: "21:00", titulo: "Cena · Tortilla", texto: "" },
    { uid: "v", fuente: "comida", fecha: "2026-09-30", hora: "08:00", titulo: "Desayuno · Overnight oats", texto: "" },   // ya paso
    { uid: "r", fuente: "rutina", fecha: "2026-10-01", hora: "07:00", titulo: "Overnight oats", texto: "" }
  ];
  const A = C.avisosComida(dia, ahora), h = (ms) => { const d = new Date(ms); return d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  assert.deepEqual(A.map((a) => [a.id, h(a.cuando)]), [
    ["tupper:t1", "30 21:30"], ["avena:o1", "1 07:45"], ["cal:d2", "1 22:00"]
  ], "el guiso del 2/10 ya tiene su aviso de descongelar en el calendario");
  assert.equal(A[0].titulo, "Saca el tupper de albóndigas con rigatoni a la nevera");
  assert.equal(A[0].texto, "Es para comida de mañana, a las 14:30.");
  assert.equal(A[1].titulo, "Coge el bote de avena de la nevera");
});

test("una comida que es una receta de Copiloto Cocina: por su id o por el titulo", () => {
  const idx = [{ id: "albondigas-rigatoni", titulo: "Albóndigas en salsa con rigatoni" }, { id: "curry-pollo", titulo: "Curry de pollo" }];
  assert.equal(C.recetaDe(C.comida({ titulo: "Albóndigas", texto: "Receta: albondigas-rigatoni\nINGREDIENTES\n· 500 g carne picada" }), idx).id, "albondigas-rigatoni");
  assert.equal(C.recetaDe(C.comida({ titulo: "Curry de pollo con arroz" }), idx).id, "curry-pollo", "por el titulo");
  assert.equal(C.recetaDe(C.comida({ titulo: "Tortilla francesa" }), idx), null);
});
