// Comprar (despensa.faltan) con la semana del 4 al 9 de octubre de 2026 y con casos pequeños, uno por fallo.
//   node --test tests/compra.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { EVENTOS, EVENTOS_NUEVO, DESPENSA_3_OCT, COMPRAR_ESPERADO } from "./fixtures/semana-4-9-oct-2026.mjs";

const require = createRequire(import.meta.url);
const Rc = require("../receta.js"), Dp = require("../despensa.js");

const AHORA = { ahoraMs: new Date("2026-10-03T22:00").getTime(), hoy: "2026-10-03" };
const leer = (evs) => evs.map((e) => Rc.leer(e));
const comprar = (nota, evs) => Dp.faltan(Dp.despensa(nota), [], leer(evs), AHORA);
const mapa = (F) => Object.fromEntries(F.items.map((i) => [i.ver, i.cant]));
// por la clave del alimento (el nombre sale de la primera línea: «Huevo» o «Huevos»)
const por = (F, clave) => F.items.find((i) => i.clave === clave);
// un evento de una comida, para los casos pequeños
let n = 0;
const ev = (fecha, titulo, texto) => ({ uid: "e" + (++n), fuente: "comida", fecha, hora: "13:00", fin: "13:30", titulo, texto });
const NOTA = (nevera = "") => "DESPENSA EN VIVO — última actualización: 03/10/2026\n\n## NEVERA\n" + (nevera || "leche semi") + "\n";

/* ---------------------------- la semana entera ---------------------------- */
for (const [nombre, eventos] of [["con la nota antigua del aguacate (el calendario tal cual)", EVENTOS], ["con «· 1 aguacate maduro» el lunes", EVENTOS_NUEVO]]) {
  test("la semana 4-9 oct " + nombre + ": los 11 valores y nada más", () => {
    const F = comprar(DESPENSA_3_OCT, eventos);
    assert.deepEqual(mapa(F), COMPRAR_ESPERADO);
    assert.ok(!F.items.some((i) => /overnight/i.test(i.ver)), "sin Overnight oats");
  });
}

test("la semana: cada línea de Comprar dice de qué recetas y líneas sale", () => {
  const F = comprar(DESPENSA_3_OCT, EVENTOS), pv = (v) => F.items.find((i) => i.ver === v);
  const hu = pv("Huevos");
  assert.deepEqual(hu.lineas.map((l) => [l.uid, l.txt]), [["lun-des", "2 huevos"], ["lun-com", "1 huevo"], ["mar-des", "2 huevos"], ["mar-com", "2 huevos"], ["jue-cena", "3 huevos"], ["vie-com", "2 huevos"]]);
  assert.deepEqual(hu.total, [{ n: 12, ud: "ud" }]);
  const t = Dp.origenDe(hu, "2026-10-03");
  assert.equal(t.length, 7);
  assert.match(t[0], /^lun 05\/10 · .*Desayuno de teletrabajo.* — «2 huevos» → 2$/);
  assert.equal(t[6], "Suman 12 − en casa 2 = 10");
  assert.deepEqual(pv("Yogur griego").lineas.map((l) => l.uid), ["lun-mer", "lun-tarros", "vie-cena"]);
  assert.deepEqual(pv("Aguacate").lineas.map((l) => l.uid), ["lun-cena"]);
});

/* ---------------------------- 1 · huevos y el paréntesis ---------------------------- */
test("huevos: «(… de hoy)» dentro de una nota no los saca de la compra", () => {
  const F = comprar(NOTA(), [
    ev("2026-10-05", "Curry", "INGREDIENTES\n· 1 huevo (el que cuecen en paralelo, de hoy)\n· 1 bote de garbanzos\n\nPROCESO\n1. Cuece el huevo y los garbanzos."),
    ev("2026-10-06", "Lentejas", "INGREDIENTES\n· 2 huevos (para el plato de hoy)\n\nPROCESO\n1. Huevos a la plancha."),
    ev("2026-10-07", "Revuelto", "INGREDIENTES\n· 3 huevos\n\nPROCESO\n1. Revuelve los huevos.")
  ]);
  assert.equal(por(F, "huevo").cant, "6");
});
test("huevos: «de casa» sí los saca, pero solo si la nota empieza por eso", () => {
  const F = comprar(NOTA(), [
    ev("2026-10-05", "A", "INGREDIENTES\n· 2 huevos (de casa: los del domingo)\n\nPROCESO\n1. Huevos."),
    ev("2026-10-06", "B", "INGREDIENTES\n· 2 huevos (del domingo)\n\nPROCESO\n1. Huevos."),
    ev("2026-10-07", "C", "INGREDIENTES\n· 2 huevos (que usas hoy, de la nevera)\n\nPROCESO\n1. Huevos.")
  ]);
  assert.equal(por(F, "huevo").cant, "2", "solo la C: su nota no empieza por «de casa»");
});

/* ---------------------------- 2 · yogur: unidades, gramos y (×N) ---------------------------- */
const YOGUR_ANTIGUO = [
  ev("2026-10-05", "Merienda", "INGREDIENTES\n· 1 yogur griego (125 g)\n\nPROCESO\n1. Come el yogur griego."),
  ev("2026-10-05", "Prepara 2 tarros", "2 TARROS · 8 min\n\nINGREDIENTES\n· 80 g de avena\n\nPOR TARRO (×2)\n· 125 g de yogur griego\n· 40 g de avena\n\nPROCESO\n1. En cada tarro: yogur griego y avena."),
  ev("2026-10-09", "Cena", "INGREDIENTES\n· 1 yogur griego (125 g)\n\nPROCESO\n1. Yogur griego en un cuenco.")
];
test("yogur: «POR TARRO (×2)» con gramos se junta con los yogures sueltos por la equivalencia 1 yogur = 125 g", () => {
  const F = comprar(NOTA(), YOGUR_ANTIGUO);
  assert.equal(por(F, "yogur griego").cant, "4");
  assert.deepEqual(por(F, "yogur griego").c, { n: 4, ud: "ud" });
});
test("yogur: «POR TARRO» sin (×N) usa los tarros de la primera línea", () => {
  const F = comprar(NOTA(), [ev("2026-10-05", "Tarros", "3 TARROS · 8 min\n\nINGREDIENTES\n· 1 yogur griego (125 g)\n\nPOR TARRO\n· 40 g de avena\n\nPROCESO\n1. Yogur griego y avena.")]);
  assert.deepEqual(por(F, "avena").c, { n: 120, ud: "g" });
});
test("yogur: «(125 g cada uno)» es por unidad: 2 yogures son 250 g", () => {
  const g = Rc.ingrediente("2 yogures griegos (125 g cada uno)");
  assert.deepEqual(g.c, { n: 2, ud: "ud" }); assert.deepEqual(g.equiv, { n: 250, ud: "g" });
  const F = comprar(NOTA(), [ev("2026-10-05", "A", "INGREDIENTES\n· 2 yogures griegos (125 g cada uno)\n\nPROCESO\n1. Yogur griego."), ev("2026-10-06", "B", "INGREDIENTES\n· 250 g de yogur griego\n\nPROCESO\n1. Yogur griego.")]);
  assert.equal(por(F, "yogur griego").cant, "4");
});
test("yogur: sin equivalencia no se pierde ninguna cantidad: salen las dos", () => {
  const F = comprar(NOTA(), [ev("2026-10-05", "A", "INGREDIENTES\n· 1 yogur griego\n\nPROCESO\n1. Yogur griego."), ev("2026-10-06", "B", "INGREDIENTES\n· 125 g de yogur griego\n\nPROCESO\n1. Yogur griego.")]);
  const it = por(F, "yogur griego");
  assert.equal(it.cant, "1 + 125 g");
  assert.deepEqual(it.cants, [{ n: 1, ud: "ud" }, { n: 125, ud: "g" }]);
});
test("yogur: lo que hay en casa en gramos se resta con la equivalencia", () => {
  const F = comprar(NOTA("250 g de yogur griego"), YOGUR_ANTIGUO);
  assert.equal(por(F, "yogur griego").cant, "2");
});

/* ---------------------------- 3 · aguacate y el redondeo de contables ---------------------------- */
test("aguacate: el lunes cuenta como compra aunque su nota diga «la otra mitad es para mañana»", () => {
  const F = comprar(NOTA(), [
    ev("2026-10-05", "Lunes", "INGREDIENTES\n· 1 aguacate maduro (usas la mitad hoy; la otra mitad es para mañana)\n\nPROCESO\n1. Machaca el aguacate."),
    ev("2026-10-06", "Martes", "INGREDIENTES\n· ½ aguacate (de casa: la otra mitad de ayer, de la nevera)\n\nPROCESO\n1. Machaca el aguacate.")
  ]);
  assert.equal(por(F, "aguacat").cant, "1");
  assert.equal(F.descartadas.length, 1);
  assert.match(F.descartadas[0].motivo, /^De casa: sale de «Lunes»/);
});
test("contables: las fracciones de eventos distintos se suman antes de redondear hacia arriba", () => {
  const evs = [1, 2, 3].map((d) => ev("2026-10-0" + (4 + d), "Tostada " + d, "INGREDIENTES\n· ½ tomate\n\nPROCESO\n1. Corta el tomate."));
  assert.equal(mapa(comprar(NOTA(), evs))["Tomate"], "2", "3 × ½ = 1,5 → 2 (no 3 de ½ cada uno redondeados)");
  assert.equal(mapa(comprar(NOTA("1 tomate"), evs))["Tomate"], "1", "1,5 − 1 en casa = 0,5 → 1");
  assert.equal(mapa(comprar(NOTA("2 tomates"), evs))["Tomate"], undefined, "1,5 − 2: nada");
});
test("contables: latas, bricks y bolsas también suben al entero; gramos y mililitros nunca", () => {
  const F = comprar(NOTA(), [
    ev("2026-10-05", "A", "INGREDIENTES\n· ½ lata de atún\n· 125 g de queso\n· 150,5 ml de nata\n\nPROCESO\n1. Atún, queso y nata."),
    ev("2026-10-06", "B", "INGREDIENTES\n· ½ lata de atún\n· 100 g de queso\n· 0,3 l de nata\n\nPROCESO\n1. Atún, queso y nata."),
    ev("2026-10-07", "C", "INGREDIENTES\n· ½ lata de atún\n\nPROCESO\n1. Atún.")
  ]);
  assert.deepEqual(por(F, "atun").c, { n: 2, ud: "lata" });
  assert.deepEqual(por(F, "queso").c, { n: 225, ud: "g" });
  assert.deepEqual(por(F, "nata").c, { n: 450.5, ud: "ml" });
});

/* ---------------------------- 4 · overnight oats y lo «de casa» que hace otra receta ---------------------------- */
test("overnight oats: lo «de casa» que otra receta del plan hace no se compra nunca", () => {
  const F = comprar(NOTA(), [
    ev("2026-10-05", "Prepara 2 tarros de overnight oats (jue + vie)", "2 TARROS · 8 min\n\nINGREDIENTES\n· 80 g de avena\n\nPROCESO\n1. Mezcla la avena."),
    ev("2026-10-07", "Desayuno de oficina", "INGREDIENTES\n· 1 vasito de overnight oats (de casa: el que ya tienes en la nevera)\n\nPROCESO\n1. Al bolso."),
    ev("2026-10-08", "Desayuno de oficina", "INGREDIENTES\n· 1 tarro de overnight oats (de casa: el primero de los 2 que montaste el lunes)\n\nPROCESO\n1. Al bolso."),
    ev("2026-10-09", "Desayuno de oficina", "INGREDIENTES\n· 1 tarro de overnight oats (de casa: el segundo de los 2 que montaste el lunes)\n\nPROCESO\n1. Al bolso.")
  ]);
  assert.deepEqual(Object.keys(mapa(F)), ["Avena"]);
  assert.equal(F.descartadas.length, 3);
  assert.ok(F.descartadas.every((d) => /^De casa: sale de «Prepara 2 tarros de overnight oats/.test(d.motivo)), F.descartadas.map((d) => d.motivo).join("|"));
});
test("overnight oats: la semana entera los descarta con su motivo", () => {
  const F = comprar(DESPENSA_3_OCT, EVENTOS);
  const d = F.descartadas.filter((x) => /overnight/i.test(x.txt));
  assert.deepEqual(d.map((x) => x.uid), ["mie-des", "jue-des", "vie-des"]);
  assert.ok(d.every((x) => x.de && x.de.uid === "lun-tarros"));
});

/* ---------------------------- 5 · el origen de cada línea ---------------------------- */
test("origen: si no hay nada en casa la cuenta lo dice y las líneas sin cantidad se marcan", () => {
  const F = comprar(NOTA(), [ev("2026-10-05", "Tostada", "INGREDIENTES\n· 2 rebanadas de pan\n· Queso al gusto de la casa\n\nPROCESO\n1. Tuesta el pan."), ev("2026-10-06", "Otra", "INGREDIENTES\n· 1 rebanada de pan\n\nPROCESO\n1. Tuesta el pan.")]);
  const pan = por(F, "pan");
  assert.deepEqual(Dp.origenDe(pan, "2026-10-05"), ["hoy 05/10 · Tostada — «2 rebanadas de pan» → 2 rebanadas", "mar 06/10 · Otra — «1 rebanada de pan» → 1 rebanada", "Suman 3 rebanadas = 3 rebanadas"]);
});
