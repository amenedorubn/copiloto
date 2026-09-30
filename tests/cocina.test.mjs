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

test("una descripcion con HTML de Google y emojis se lee igual", () => {
  const c = C.comida({ titulo: "🍗 Tupper · Pollo al curry", texto:
    "<b>🥣 INGREDIENTES:</b><br><ul><li>✅ 500 g solomillos de pollo</li><li>1 cebolla</li></ul><b>CÓMO SE HACE:</b><br>1. Dora el pollo&nbsp;6 min.<br>2. Añade la cebolla." });
  assert.equal(c.titulo, "Pollo al curry");
  assert.equal(c.etiqueta, "Tupper");
  assert.deepEqual(c.ingredientes.map((i) => i.txt), ["500 g solomillos de pollo", "1 cebolla"]);
  assert.deepEqual(c.pasos, ["Dora el pollo 6 min.", "Añade la cebolla."]);
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
  assert.equal(C.estadoDe(pollo, D, gasto).estado, "no", "gastado entero: ya no esta");
});

test("lo que tengo: la nota, su compra ya hecha y lo apuntado en la app", () => {
  const D = C.despensa(NOTA), t = (d) => Date.parse(d + "T12:00:00");
  assert.equal(D.compra.fecha, "2026-09-26");
  const nombres = (H) => H.todos.map((x) => x.nombre.toLowerCase());
  // antes del sabado la compra de la nota no esta; despues, si (y ya no sale como que falta)
  assert.ok(!nombres(C.casa(D, [], "2026-09-25")).includes("solomillos de pollo"));
  const H = C.casa(D, [], "2026-09-30");
  assert.ok(nombres(H).includes("solomillos de pollo"));
  assert.equal(H.zonas.find((z) => z.items.some((x) => /solomillos/i.test(x.nombre))).zona, "Nevera", "el pollo, a la nevera");
  assert.deepEqual(C.faltan([C.comida(EVENTO)], D, [], "2026-09-30").map((x) => x.nombre), ["leche de coco"]);
  // comprar suma, gastar resta lo que va en lo mismo, "se acabó" lo quita
  const cb = [
    { id: "a", t: t("2026-09-27"), tipo: "compra", items: ["1 kg arroz basmati"], zona: "Despensa" },
    { id: "b", t: t("2026-09-28"), tipo: "gasto", de: "Curry", items: ["300 g arroz basmati", "1 cebolla"] },
    { id: "c", t: t("2026-09-28"), tipo: "compra", items: ["2 yogur natural"] },
    { id: "d", t: t("2026-09-29"), tipo: "acaba", items: ["Pan rallado"] },
    { id: "e", t: t("2026-09-29"), tipo: "acaba", items: ["Medio tomate"], borrado: true }
  ];
  const H2 = C.casa(D, cb, "2026-09-30"), de = (n) => H2.todos.find((x) => x.nombre.toLowerCase() === n);
  assert.deepEqual(de("arroz basmati").c, { n: 700, ud: "g" });
  assert.equal(H2.zonas.find((z) => z.items.includes(de("arroz basmati"))).zona, "Despensa seca", "la zona de la nota que empieza igual");
  assert.ok(de("cebolla troceada"), "sin cantidad no se sabe cuanto queda: se queda");
  assert.ok(!de("pan rallado"), "se acabó");
  assert.ok(de("tomate"), "lo desmarcado no cuenta");
  assert.equal(C.zonaPara("Yogur griego"), "Nevera");
  assert.equal(C.zonaPara("Guisantes congelados"), "Congelador");
  assert.equal(C.zonaPara("Lentejas"), "Despensa");
});

test("en Comprar solo alimentos: ni apartados como ANTES DE EMPEZAR ni consejos", () => {
  const c = C.comida({ uid: "b", fecha: "2026-10-02", hora: "14:30", titulo: "Pollo al pimentón con boniato", texto: [
    "INGREDIENTES:", "· 400 g contramuslos de pollo", "· 1 boniato grande", "El pimentón va solo en el adobo, no en el boniato desde el principio, se quemaría",
    "ADOBO:", "· 1 cdta pimentón dulce", "· Sal al gusto",
    "ANTES DE EMPEZAR:", "· Saca el pollo de la nevera 15 min antes", "OJO", "· El horno, precalentado",
    "CÓMO SE HACE:", "1. Adoba el pollo.", "2. Al horno 25 min."].join("\n") });
  assert.deepEqual(c.ingredientes.map((i) => i.nombre), ["contramuslos de pollo", "boniato grande", "pimentón dulce", "Sal al gusto"]);
  assert.equal(c.pasos[0], "Saca el pollo de la nevera 15 min antes", "antes de empezar: el primer paso");
  assert.ok(c.notas.some((n) => /pimentón va solo/.test(n)) && c.notas.some((n) => /precalentado/.test(n)));
  const D = C.despensa(NOTA);
  const dos = C.comida({ uid: "d", fecha: "2026-10-03", titulo: "Pollo otra vez", texto: "INGREDIENTES:\n· 300 g contramuslos de pollo" });
  const f = C.faltan([c, dos], D, [], "2026-09-30");
  assert.deepEqual(f.map((x) => C.alimento(x.nombre)), ["Contramuslos de pollo", "Boniato grande", "Pimentón dulce"]);
  assert.deepEqual(f[0].c, { n: 700, ud: "g" }, "lo de dos comidas, sumado");
  assert.equal(C.alimento("tomate triturado (sin azúcar), del bueno"), "Tomate triturado");
  assert.equal(C.cantidad("2 lomos de salmón").resto, "lomos de salmón", "el de es del nombre si no hay unidad");
});

test("el movil y Chrome: los cambios se juntan por id y lo borrado queda borrado", () => {
  const a = [{ id: "1", t: 1, tipo: "compra", items: ["x"] }, { t: 5, tipo: "gasto", items: ["y"] }];
  const b = [{ id: "1", t: 1, tipo: "compra", items: ["x"], borrado: true, tb: 9 }, { id: "2", t: 3, tipo: "acaba", items: ["z"] }];
  const m = C.mezcla(a, b);
  assert.deepEqual(m.map((x) => x.id), ["1", "2", "t5"], "por fecha; los viejos sin id la sacan de su fecha");
  assert.equal(m[0].borrado, true);
  assert.equal(C.mezcla(m, a).length, 3, "juntar otra vez no duplica");
  assert.equal(C.vigentes(m).length, 2);
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

test("lo que falta para las comidas y el texto para Claude", () => {
  const D = C.despensa(NOTA), L = [C.comida(EVENTO)];
  const f = C.faltan(L, D, []);
  assert.deepEqual(f.map((x) => x.nombre), ["solomillos de pollo", "leche de coco"], "sin la sal ni lo que hay");
  const cb = [{ t: Date.parse("2026-09-24T10:00:00"), tipo: "compra", items: ["viejo"] },
              { t: Date.parse("2026-09-27T14:00:00"), tipo: "gasto", de: "Curry de pollo", items: ["500 g solomillos de pollo", "1 cebolla"] }];
  assert.equal(C.vigentes(cb, "2026-09-25").length, 1, "lo anterior a la nota ya esta en ella");
  assert.equal(C.paraClaude(cb, "2026-09-25"), "Despensa: cambios desde la nota del 25/9\n- 27/09 Gastado en Curry de pollo: 500 g solomillos de pollo, 1 cebolla");
});
