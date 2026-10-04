// Tests de las recetas con carriles: receta.js las lee y carriles.js decide cuándo va cada paso.
// Datos de ejemplo (el caso de prueba de la pasta y las albóndigas del repo cocina).
//   node --test tests/carriles.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const req = createRequire(import.meta.url);
const R = req("../receta.js");
const C = req("../carriles.js");
const ev = (titulo, texto) => ({ uid: "u1", fuente: "comida", fecha: "2026-10-05", hora: "14:00", titulo, texto: texto.join("\n") });
const mmss = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

const PASTA = ev("Comida · Pasta con tomate y atún", [
  "1 RACIÓN · 20 min", "",
  "INGREDIENTES", "· 100 g de pasta", "· 1 lata de atún", "· 200 g de tomate triturado", "· ½ cebolla", "· 1 diente de ajo", "· Básicos: sal, AOVE", "",
  "CARRIL AGUA (olla)", "1. Olla con agua y sal al fuego, 8 min hasta que hierva", "2. La pasta, 9 min (no espera)", "3. Escúrrela", "",
  "CARRIL SALSA (sartén)", "1. Pica la cebolla y el ajo, 3 min (manos)", "2. Sofríelos con AOVE, 6 min", "3. El tomate, 8 min", "4. El atún, 1 min", "",
  "AL JUNTAR", "1. Mezcla la pasta con la salsa y sirve"
]);
const ALBONDIGAS = ev("Albóndigas en salsa con rigatoni", [
  "3 RACIONES · 45 min", "",
  "INGREDIENTES", "· 500 g de carne picada mixta", "· 1 huevo", "· 30 g de pan rallado", "· 600 g de tomate triturado", "· 180 g de rigatoni",
  "· 1 bolsa de arroz de microondas", "· Básicos: sal, AOVE, orégano", "",
  "CARRIL BOLAS (air fryer)", "1. Mezcla la carne con el huevo y el pan rallado y haz 21 bolas, 8 min (manos)",
  "2. Tanda 1: 11 bolas al air fryer a 200 °C, 10 min, agita a los 5", "3. Tanda 2: 10 bolas al air fryer, 10 min, agita a los 5", "",
  "CARRIL SALSA (sartén)", "1. Sartén a fuego medio con AOVE, 3 min", "2. El tomate con orégano y sal, 15 min a fuego bajo", "3. Las albóndigas a la salsa, 12 min (tras BOLAS)", "",
  "CARRIL PASTA (olla)", "1. Olla con agua y sal al fuego, tapada, 10 min hasta que hierva", "2. Los rigatoni, 12 min (no espera)", "3. Escúrrelos", "",
  "CARRIL ARROZ", "1. El arroz al micro, 3 min (no espera)", "",
  "AL JUNTAR", "1. Reparte en tu plato y los 2 tuppers, 3 min"
]);

// lo que todo plan debe cumplir: orden, manos de una en una y lo que hay en la cocina
function comprueba(M, P, cocina = C.COCINA) {
  const T = M.tareas;
  for (const x of T) for (const d of x.tras) assert.ok(P.ini[x.id] >= P.fin[d], `${x.txt} empieza antes de acabar lo que necesita`);
  for (const a of T) for (const b of T) {
    if (a === b || !a.manos || !b.manos) continue;
    assert.ok(P.ini[a.id] + a.manos <= P.ini[b.id] || P.ini[b.id] + b.manos <= P.ini[a.id], `manos a la vez: ${a.txt} / ${b.txt}`);
  }
  // fuegos y recipientes: cada carril los tiene desde su primer paso con ellos hasta el último
  const tramos = (r) => {
    const out = [];
    for (const c of new Set(T.map((x) => x.carril))) {
      const L = T.filter((x) => x.carril === c && x["sujeta_" + r]);
      if (L.length) out.push({ c, rec: L[0].sujeta_rec, a: Math.min(...L.map((x) => P.ini[x.id])), b: Math.max(...L.map((x) => P.fin[x.id])) });
    }
    return out;
  };
  const maxA = (L) => Math.max(0, ...L.map((x) => L.filter((y) => y.a <= x.a && x.a < y.b).length));
  assert.ok(maxA(tramos("fuego")) <= cocina.fuegos, "más fuegos de los que hay");
  for (const r of ["sarten", "olla"]) assert.ok(maxA(tramos("rec").filter((x) => x.rec === r)) <= cocina[r], "más " + r + " de las que hay");
  for (const ap of ["micro", "airfryer", "horno"]) {
    const L = T.filter((x) => x.aparato === ap).map((x) => ({ a: P.ini[x.id], b: P.fin[x.id] }));
    assert.ok(maxA(L) <= cocina[ap], "más " + ap + " de los que hay");
  }
}

/* ------------------------------ leer ------------------------------ */
test("leer: CARRIL AGUA (olla), CARRIL SALSA (sartén) y AL JUNTAR", () => {
  const r = R.leer(PASTA);
  assert.deepEqual(r.carriles.map((c) => [c.id, c.nombre, c.rec]), [["agua", "Agua", "olla"], ["salsa", "Salsa", "sarten"], ["union", "Al juntar", null]]);
  assert.deepEqual(r.problemas, []);
  const p = (c, n) => r.pasos.find((x) => x.carril === c && x.nCarril === n);
  assert.equal(p("agua", 2).titulo, "La pasta, 9 min");                 // la marca no se ve
  assert.equal(p("agua", 2).aguanta_s, 30);
  assert.deepEqual([p("agua", 1).dur_s, p("agua", 1).manos_s, p("agua", 1).fuego, p("agua", 1).rec], [480, 30, true, "olla"]);
  assert.deepEqual([p("agua", 3).dur_s, p("agua", 3).manos_s, p("agua", 3).fuego], [60, 60, false]);   // escurrir: 1 min de manos
  assert.deepEqual([p("salsa", 1).dur_s, p("salsa", 1).manos_s, p("salsa", 1).fuego], [180, 180, false]);
  assert.deepEqual([p("salsa", 3).manos_s, p("salsa", 3).fuego, p("salsa", 3).rec], [15, true, "sarten"]);  // "El tomate, 8 min" sigue al fuego
  assert.equal(p("union", 1).manos_s, 60);
  assert.ok(r.pasos[0].auto, "sigue el paso 0 Antes de empezar");
  assert.ok(!r.problemas.some((x) => x.tipo === "tiempo"), "los carriles no suman en línea");
});

test("leer: los eventos de siempre no tienen carriles y no cambian", () => {
  const r = R.leer(ev("Pollo al curry", ["1 RACIÓN · 30 min", "INGREDIENTES", "· 200 g de pollo", "· 1 bolsa de arroz de microondas",
    "PROCESO", "1. Sartén con AOVE: el pollo, 6 min.", "2. El arroz, 3 min al microondas."]));
  assert.equal(r.carriles, undefined);
  assert.equal(r.pasos.filter((p) => p.dur_s != null).length, 0);
  assert.equal(C.modelo(r), null);
});

test("leer: dice qué carril y qué paso no se entiende", () => {
  const r = R.leer(ev("Pollo con verduras", ["INGREDIENTES", "· 200 g de pollo", "· 1 calabacín",
    "CARRIL POLLO (sartén)", "1. Dora el pollo hasta que esté hecho", "2. Añade el calabacín (tras VERDURAS)",
    "CARRIL SALSA", "1. Calienta la nata a fuego bajo, 3 min",
    "CARRIL ARROZ", "AL JUNTAR", "1. Sirve"]));
  const t = r.problemas.filter((p) => p.tipo === "carril").map((p) => p.texto);
  assert.ok(t.some((x) => /^CARRIL POLLO, paso 1 \(«Dora el pollo hasta que esté hecho»\): no dice cuántos minutos\. Uso 5 min\.$/.test(x)), t.join("\n"));
  assert.ok(t.some((x) => /CARRIL POLLO, paso 2: «\(tras VERDURAS\)» no es ningún carril/.test(x)), t.join("\n"));
  assert.ok(t.some((x) => /CARRIL SALSA: no dice si va en la sartén o en una olla/.test(x)), t.join("\n"));
  assert.ok(t.some((x) => /CARRIL ARROZ no tiene pasos/.test(x)), t.join("\n"));
  const dora = r.pasos.find((p) => p.carril === "pollo" && p.nCarril === 1);
  assert.equal(dora.dur_s, 300); assert.ok(dora.tiempoSupuesto);
});

test("leer: un PROCESO suelto entre carriles se avisa", () => {
  const r = R.leer(ev("Algo", ["INGREDIENTES", "· 1 huevo", "PROCESO", "1. Bate el huevo, 1 min", "CARRIL SARTEN (sartén)", "1. Cuaja la tortilla a fuego medio, 4 min"]));
  assert.ok(r.problemas.some((p) => p.tipo === "carril" && /fuera de los carriles/.test(p.texto)));
});

/* ------------------------------ planificar ------------------------------ */
test("pasta: empieza por el agua, pica mientras hierve y la pasta escurre justo al juntar", () => {
  const M = C.modelo(R.leer(PASTA)), P = C.planifica(M);
  comprueba(M, P);
  const T = (c, n) => M.tareas.find((x) => x.carril === c && x.n === n).id;
  assert.equal(P.ini[T("agua", 1)], 0);                                  // lo primero, el agua
  assert.equal(P.ini[T("salsa", 1)], 30);                                // y a picar en cuanto está al fuego
  assert.ok(P.ini[T("salsa", 1)] < P.fin[T("agua", 1)], "picas mientras se calienta");
  assert.ok(P.ini[T("union", 1)] - P.fin[T("agua", 2)] <= 30 + 60, "la pasta no espera a la salsa");
  assert.ok(P.ini[T("agua", 3)] - P.fin[T("agua", 2)] <= 30);
  assert.ok(P.total <= 20 * 60, "a la mesa en 20 min o menos: " + mmss(P.total));
  assert.ok(P.lineal >= 37 * 60, "en una línea serían 37 min o más: " + mmss(P.lineal));
});

test("albóndigas: air fryer, dos fuegos y micro a la vez sin pasarse de lo que hay", () => {
  const r = R.leer(ALBONDIGAS);
  assert.deepEqual(r.problemas.filter((p) => p.tipo === "carril"), []);
  const M = C.modelo(r), P = C.planifica(M);
  comprueba(M, P);
  const T = (c, n) => M.tareas.find((x) => x.carril === c && x.n === n);
  assert.equal(T("bolas", 2).aparato, "airfryer");
  assert.equal(T("arroz", 1).aparato, "micro");
  assert.ok(P.ini[T("salsa", 3).id] >= P.fin[T("bolas", 3).id], "(tras BOLAS)");
  assert.ok(P.ini[T("union", 1).id] - P.fin[T("pasta", 2).id] <= 30 + 60, "los rigatoni no esperan");
  assert.ok(P.ini[T("union", 1).id] - P.fin[T("arroz", 1).id] <= 30, "el arroz sale justo");
  assert.ok(P.total <= 46 * 60, "como la receta escrita a mano: " + mmss(P.total));
});

test("Mi cocina: con 1 fuego, agua y salsa van una detrás de otra; con 1 olla, dos carriles de olla también", () => {
  const M = C.modelo(R.leer(PASTA));
  const uno = Object.assign({}, C.COCINA, { fuegos: 1 }), P1 = C.planifica(M, uno);
  comprueba(M, P1, uno);
  assert.ok(P1.total > C.planifica(M).total);
  const ollas = R.leer(ev("Dos ollas", ["INGREDIENTES", "· 2 huevos", "· 100 g de arroz",
    "CARRIL HUEVOS (olla)", "1. Los huevos al agua hirviendo, 10 min", "CARRIL ARROZ (olla)", "1. El arroz a fuego medio, 15 min", "AL JUNTAR", "1. Sirve"]));
  const M2 = C.modelo(ollas), unaOlla = Object.assign({}, C.COCINA, { olla: 1 }), P2 = C.planifica(M2, unaOlla);
  comprueba(M2, P2, unaOlla);
  const [h, a] = ["huevos", "arroz"].map((c) => M2.tareas.find((x) => x.carril === c).id);
  assert.ok(P2.fin[h] <= P2.ini[a] || P2.fin[a] <= P2.ini[h], "con una olla, una cosa y luego la otra");
});

test("replanificar: si picar lleva 2 min más, la pasta entra 2 min más tarde y sigue sin esperar", () => {
  const M = C.modelo(R.leer(PASTA)), P = C.planifica(M);
  const T = (c, n) => M.tareas.find((x) => x.carril === c && x.n === n).id;
  const fijos = {};
  fijos[T("agua", 1)] = { ini: 0, fin: 480 };
  fijos[T("salsa", 1)] = { ini: 30, fin: 330 };                          // picar: 5 min en vez de 3
  const Q = C.planifica(M, null, fijos, 330);
  comprueba(M, Q);
  assert.equal(Q.ini[T("salsa", 2)], 330);
  assert.ok(Q.ini[T("agua", 2)] > P.ini[T("agua", 2)], "la pasta se retrasa");
  assert.ok(Q.ini[T("union", 1)] - Q.fin[T("agua", 2)] <= 30 + 60);
  assert.ok(Q.total > P.total);
});

test("momento: lo que haces ahora, lo que espera y lo que viene", () => {
  const M = C.modelo(R.leer(PASTA)), P = C.planifica(M);
  const T = (c, n) => M.tareas.find((x) => x.carril === c && x.n === n);
  const hechas = {}; hechas[T("agua", 1).id] = true;
  const m = C.momento(M, P, hechas, 100);
  assert.equal(m.ahora.id, T("salsa", 1).id);
  assert.deepEqual(m.mientras.map((x) => x.id), [T("agua", 1).id]);
  assert.equal(m.luego[0].id, T("salsa", 2).id);
  const e = C.explica(M, P);
  assert.equal(e[0].T.id, T("agua", 1).id);
  assert.ok(e.some((x) => x.tipo === "justo" && x.T.id === T("agua", 2).id));
});
