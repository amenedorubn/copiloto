// v2.57.1: recetas con carriles. Al abrir, lo guardado de antes no mete directo en los carriles
// (retoma), una receta editada empieza de cero y «Empezar de 0» funciona desde los carriles.
//   node --test tests/cocina-cero.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const req = createRequire(import.meta.url);
const R = req("../receta.js"), M = req("../cocina-modo.js");
const TEXTO = [
  "1 RACIÓN · 20 min", "",
  "INGREDIENTES", "· 100 g de pasta", "· 1 lata de atún", "· 200 g de tomate triturado", "· Básicos: sal, AOVE", "",
  "CARRIL AGUA (olla)", "1. Olla con agua y sal al fuego, 8 min hasta que hierva", "2. La pasta, 9 min (no espera)", "3. Escúrrela", "",
  "CARRIL SALSA (sartén)", "1. Sofríe el tomate con AOVE, 8 min", "2. El atún, 1 min", "",
  "AL JUNTAR", "1. Mezcla la pasta con la salsa y sirve"
];
const AHORA = new Date(2026, 9, 5, 13, 0).getTime();
const comida = (texto) => R.leer({ uid: "curry1", fuente: "comida", fecha: "2026-10-05", hora: "13:00", fin: "13:45", titulo: "Pasta", texto: texto.join("\n") });
const M0 = () => M.normaliza({ comida: comida(TEXTO) });
// un estado a medias: carriles empezados, una tarea hecha y un reloj (el del huevo) corriendo
function aMedias(m0, hace) {
  const S = M.nuevoEstado(AHORA - hace);
  S.huella = M.huella(m0);
  S.carr = { ini: AHORA - hace, hechas: { t0: AHORA - hace }, empezo: {}, fin: {}, mesa0: AHORA + 600e3 };
  S.timers = [{ id: "r1", paso: 1, nombre: "Huevo", dur: 600, fin: AHORA + 300e3, avisos: [], avisados: [] }];
  S.t = AHORA - hace;
  return S;
}

test("la receta de prueba tiene carriles", () => {
  const m0 = M0();
  assert.ok(m0.carr && m0.carr.tareas.length >= 4);
});

test("reloj vivo + receta con carriles, dejada hace más de 10 min: sale «retoma» (Seguir / Empezar de 0)", () => {
  const m0 = M0(), S = aMedias(m0, 25 * 60e3);
  assert.equal(M.decide(S, m0, AHORA), "sigue", "antes entraba directo al carril");
  const a = M.arranque(S, m0, AHORA);
  assert.equal(a.d, "retoma");
  assert.equal(a.pant, "retoma");
  assert.ok(a.S.carr && a.S.timers.length === 1, "no se pierde nada hasta que elijas");
});

test("reloj vivo + carriles dejados hace 2 min: se sigue en el carril", () => {
  const m0 = M0(), a = M.arranque(aMedias(m0, 2 * 60e3), m0, AHORA);
  assert.equal(a.pant, "carril");
});

test("un estado viejo sin huella también pasa por «retoma» si hace rato", () => {
  const m0 = M0(), S = aMedias(m0, 40 * 60e3); delete S.huella;
  const a = M.arranque(S, m0, AHORA);
  assert.equal(a.pant, "retoma");
  assert.equal(a.S.huella, M.huella(m0));
});

test("huella: cambia al editar los pasos o los carriles, no al abrir otra vez", () => {
  const h = M.huella(M0());
  assert.equal(M.huella(M0()), h);
  const otro = TEXTO.map((l) => l.replace("8 min hasta que hierva", "10 min hasta que hierva"));
  assert.notEqual(M.huella(M.normaliza({ comida: comida(otro) })), h);
});

test("huella distinta: estado nuevo, sin carriles ni los relojes de esta receta", () => {
  const m0 = M0(), S = aMedias(m0, 2 * 60e3);
  S.huella = "otra";
  const a = M.arranque(S, m0, AHORA);
  assert.equal(a.d, "nuevo");
  assert.equal(a.pant, "plan");
  assert.equal(a.S.carr, null);
  assert.deepEqual(a.S.timers, []);
  assert.deepEqual(a.quitados, ["r1"]);
  assert.equal(a.S.huella, M.huella(m0));
});

test("«Empezar de 0» desde el carril: al plan, sin hechas ni relojes, y se puede deshacer", () => {
  const m0 = M0(), S = aMedias(m0, 2 * 60e3);
  const c = M.cero(S, m0, AHORA);
  assert.equal(c.pant, "plan");
  assert.equal(S.carr, null);
  assert.deepEqual(S.timers, []);
  assert.deepEqual(S.hechos, {});
  assert.deepEqual(c.quitados, ["r1"]);
  assert.equal(S.huella, M.huella(m0), "la huella se queda");
  M.deshacer(S, c.antes, AHORA + 1000);
  assert.ok(S.carr && S.carr.hechas.t0);
  assert.equal(S.timers.length, 1);
});

test("sin carriles todo sigue igual: «sigue» va al paso y «cero» al paso", () => {
  const m0 = M.normaliza({ comida: comida(["INGREDIENTES", "· 2 huevos", "PROCESO", "1. Bate los huevos.", "2. Cuaja 4 min."]) });
  assert.ok(!m0.carr);
  const S = M.nuevoEstado(AHORA - 60e3); S.actual = 1; S.t = AHORA - 60e3;
  assert.equal(M.arranque(S, m0, AHORA).pant, "paso");
  assert.equal(M.cero(S, m0, AHORA).pant, "paso");
});
