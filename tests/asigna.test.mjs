// v2.57: lo de Comprar y Casa con sus comidas (conLoMio, usosDe) y «¿basta para esta receta?» (bastaPara).
//   node --test tests/asigna.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Rc = require("../receta.js"), Dp = require("../despensa.js");
const ev = (uid, fecha, hora, fin, titulo, texto) => Rc.leer({ uid, fuente: "comida", fecha, hora, fin, titulo, texto });
const CURRY = ev("cu", "2026-10-08", "13:00", "13:30", "Tupper curry", "INGREDIENTES\n· 200 g de arroz basmati\n· 1 bolsa de espinacas\nPROCESO\n1. Cuece 10 min.");
const TORTILLA = ev("to", "2026-10-06", "21:00", "21:30", "Tortilla", "INGREDIENTES\n· 3 huevos\n· 1 cebolla\nPROCESO\n1. Bate y cuaja 4 min.");
const AYER = ev("ay", "2026-10-04", "21:00", "21:30", "Pasta", "INGREDIENTES\n· 100 g de papel de horno\nPROCESO\n1. Hornea 10 min.");
const C = [CURRY, TORTILLA, AYER];
const O = { ahoraMs: Date.parse("2026-10-05T10:00:00"), hoy: "2026-10-05" };
const NOTA = "DESPENSA EN VIVO — última actualización: 04/10/2026\n## NEVERA\n1 huevo, 1 bolsa de espinacas\n";
const D = Dp.despensa(NOTA);

test("usos: en qué comidas y días se usa un alimento («jue 08/10 · Tupper curry»), solo las que quedan", () => {
  assert.deepEqual(Dp.usosTxt(Dp.usosDe("espinacas", C, [], O), O.hoy), ["jue 08/10 · Tupper curry"]);
  assert.deepEqual(Dp.usosTxt(Dp.usosDe("Huevos camperos", C, [], O), O.hoy), ["mar 06/10 · Tortilla"]);
  assert.deepEqual(Dp.usosDe("papel de horno", C, [], O), [], "la de ayer ya no cuenta");
  assert.deepEqual(Dp.usosDe("sal", C, [], O), []);
});

test("a mano: si coincide con un ingrediente de las comidas que quedan, va con esa línea y sus días", () => {
  const F = Dp.faltan(D, [], C, O);
  const M = Dp.conLoMio(F.items, [{ id: "1", txt: "Espinacas" }], C, [], O);
  assert.equal(M.length, 1);
  assert.equal(M[0].asignada, "auto");
  const P = Dp.porPasillo(M, { hoy: O.hoy });
  const it = P.grupos[0].pasillos[0].items[0];
  assert.equal(it.diasTxt, "jue");
  assert.notEqual(it.urgTxt, "Sin día");
});

test("a mano: si ya hay línea del plan igual, no se duplica (la línea lleva el apuntado)", () => {
  const F = Dp.faltan(D, [], C, O);
  const M = Dp.conLoMio(F.items, [{ id: "2", txt: "Huevos" }, { id: "3", txt: "huevo" }], C, [], O);
  assert.equal(M.length, 0);
  assert.equal(F.items.find((i) => i.clave === "huevo").mioId, "2");
});

test("a mano: sin coincidencia sale «Sin día»; con su comida elegida, los días de esa comida", () => {
  const F = Dp.faltan(D, [], C, O);
  const M = Dp.conLoMio(F.items, [{ id: "4", txt: "Papel de cocina" }, { id: "5", txt: "Yogur", uid: "to" }], C, [], O);
  const sin = M.find((i) => i.id === "4"), con = M.find((i) => i.id === "5");
  assert.equal(sin.asignada, null);
  assert.equal(Dp.porPasillo([sin], { hoy: O.hoy }).grupos[0].pasillos[0].items[0].urgTxt, "Sin día");
  assert.equal(con.asignada, "uid");
  assert.deepEqual(Dp.usosTxt(con.lineas, O.hoy), ["mar 06/10 · Tortilla"]);
  // una comida que ya pasó no vale: se queda sin día
  const M2 = Dp.conLoMio([], [{ id: "6", txt: "Yogur", uid: "ay" }], C, [], O);
  assert.equal(M2[0].asignada, null);
});

test("a mano: lo borrado no sale y dos apuntados iguales son uno", () => {
  const M = Dp.conLoMio([], [{ id: "7", txt: "Papel de cocina" }, { id: "8", txt: "papel de cocina" }, { id: "9", txt: "Leche", borrado: true }], C, [], O);
  assert.deepEqual(M.map((i) => i.id), ["7"]);
});

test("basta: tienes lo que pide, te falta, no hay, ¿te queda? y lo de siempre", () => {
  const H = Dp.casa(D, [], [], O);
  const b = (t) => Dp.bastaPara(Rc.ingrediente(t), H);
  assert.equal(b("1 bolsa de espinacas").estado, "basta");
  assert.equal(b("1 bolsa de espinacas").txt, "Tienes 1 bolsa de espinacas");
  assert.equal(b("3 huevos").estado, "falta");
  assert.equal(b("3 huevos").txt, "Te faltan 2 huevos (tienes 1 huevo)");
  assert.deepEqual(b("3 huevos").falta, { n: 2, ud: "ud" });
  assert.equal(b("200 g de arroz").estado, "no");
  assert.equal(b("200 g de arroz").txt, "Te faltan 200 g de arroz");
  assert.equal(b("Arroz").txt, "No hay arroz en casa");
  assert.equal(b("Sal").estado, "basico");
  assert.equal(Dp.bastaPara(Rc.ingrediente("2 huevos"), null).estado, "?");
  const H2 = Dp.casa(Dp.despensa("DESPENSA EN VIVO — última actualización: 04/10/2026\n## NEVERA\n4 huevos (sin confirmar)\n"), [], [], O);
  assert.equal(Dp.bastaPara(Rc.ingrediente("2 huevos"), H2).estado, "dudoso");
});

test("basta: la propia comida, ya empezada, no se cuenta como gastada si se quita de la lista", () => {
  const ahora = { ahoraMs: Date.parse("2026-10-06T21:10:00"), hoy: "2026-10-06" };
  const conElla = Dp.casa(D, [], C, ahora), sinElla = Dp.casa(D, [], C.filter((R) => R.uid !== "to"), ahora);
  assert.equal(Dp.bastaPara(Rc.ingrediente("1 huevo"), conElla).estado, "no");
  assert.equal(Dp.bastaPara(Rc.ingrediente("1 huevo"), sinElla).estado, "basta");
  // y la comida en curso cuenta entre las que quedan (para apuntar algo que falta)
  assert.ok(Dp.quedan(C, [], ahora).some((R) => R.uid === "to"));
});
