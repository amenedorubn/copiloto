// Tests de nutricion.js. Perfil y comidas de EJEMPLO (nunca los datos de verdad).
//   node --test tests/nutricion.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const req = createRequire(import.meta.url);
const N = req("../nutricion.js"), Rc = req("../receta.js"), T = req("../nutri-tabla.js");
const PERFIL = { peso: 70, altura: 175, edad: 30, sexo: "h" };
const ev = (titulo, texto) => Rc.leer({ uid: "u", fuente: "comida", fecha: "2026-11-10", hora: "14:00", titulo, texto });

test("tabla USDA: de dónde sale y valores conocidos", () => {
  assert.ok(T.length >= 70);
  const kiwi = N.fila("2 kiwis"); assert.equal(kiwi.nombre, "Kiwi"); assert.equal(kiwi.n.vitC, 92.7);
  assert.equal(N.fila("espinacas frescas").n.folato, 194);
  assert.equal(N.fila("tomate triturado").nombre, "Tomate triturado");      // antes que "tomate"
  assert.equal(N.fila("macarrones").nombre, "Pasta (seca)");
  assert.equal(N.fila("tahini").nombre, "Tahini");
  assert.equal(N.fila("bolsas de basura"), null);
});

test("una comida por ración; lo que no se sabe pesar queda «sin datos», nunca inventado", () => {
  const R = ev("Pasta con atún", "2 RACIONES · 20 min\nINGREDIENTES\n· 200 g de macarrones\n· 2 latas de atún\n· 1 pizca de algo raro\n· Básicos: sal, AOVE\nPROCESO\n1. Cuece 9 min.");
  const x = N.deComida(R);
  assert.equal(x.raciones, 2);
  // 100 g de pasta (371 kcal) + 1 lata de atún (56 g · 86 kcal/100 g) por ración
  assert.equal(Math.round(x.n.kcal), Math.round(371 + 86 * 0.56));
  assert.deepEqual(x.sinDatos, ["1 pizca de algo raro"]);
});

test("tus alimentos mandan en los macros; los micros siguen de la tabla", () => {
  const g = Rc.ingrediente("100 g de atún en lata");
  const x = N.deIngrediente(g, { nutri: { kcal: 116, prot: 26, hc: 0, grasa: 1, fuente: "OFF" } });
  assert.equal(x.n.kcal, 116); assert.equal(x.fuente, "OFF");
  assert.equal(x.n.b12, 2.55);                                              // de USDA
});

test("objetivos: fase de la semana, g/kg, % sobre el mantenimiento y su porqué", () => {
  const o = N.objetivos(PERFIL, "2026-11-10", {}, "gimnasio");             // noviembre: mantenimiento
  assert.equal(o.fase, "mantenimiento");
  assert.deepEqual([o.prot.min, o.prot.max], [112, 126]);                   // 1,6–1,8 × 70
  assert.deepEqual([o.hc.min, o.hc.max], [280, 420]);                       // 4–6 × 70
  const man = Math.round((10 * 70 + 6.25 * 175 - 5 * 30 + 5) * 1.6);
  assert.deepEqual([o.kcal.min, o.kcal.max], [man, man]);
  assert.match(o.kcal.porque, /Mifflin/);
  assert.equal(o.vitC.min, 110); assert.equal(o.folato.min, 330);
  // tirada larga: +2 g/kg; descanso: −1
  assert.equal(N.objetivos(PERFIL, "2026-11-10", {}, "tirada").hc.min, 420);
  assert.equal(N.objetivos(PERFIL, "2026-11-10", {}, "descanso").hc.min, 210);
});

test("fases: el plan inicial, los días de carga y lo que cambies tú en una semana", () => {
  assert.equal(N.faseDe("2026-10-14").fase, "descarga");
  assert.equal(N.faseDe("2026-10-16").fase, "carga");
  assert.equal(N.objetivos(PERFIL, "2026-10-16", {}, "tirada").hc.min, 490);   // 7 g/kg, sin sumar el día
  assert.equal(N.faseDe("2026-10-25").fase, "recuperacion");
  assert.equal(N.faseDe("2027-01-15").fase, "definicion");
  const sem = { "2026-11-09": { fase: "volumen", peso: 72, ajustes: { prot: [150, 160] } } };
  const o = N.objetivos(PERFIL, "2026-11-10", sem, "gimnasio");
  assert.equal(o.fase, "volumen"); assert.equal(o.peso, 72);
  assert.deepEqual([o.prot.min, o.prot.max, o.prot.propio], [150, 160, true]);
  assert.equal(o.hc.min, 360);                                               // 5 × 72
  assert.equal(N.lunes("2026-11-15"), "2026-11-09");
});

test("sin perfil no hay objetivos (no se inventan)", () => {
  assert.equal(N.objetivos(null, "2026-11-10", {}, "gimnasio"), null);
  assert.equal(N.objetivos({ peso: 70 }, "2026-11-10", {}, "gimnasio").kcal, undefined);   // sin altura ni edad: sin energía
});

test("el día: planificado y registrado por separado; comer fuera es estimación sin micros", () => {
  const R = ev("Avena", "INGREDIENTES\n· 50 g de avena\n· 1 plátano\nPROCESO\n1. Mezcla 1 min.");
  const fuera = N.deFavorito(N.FAVORITOS.find((f) => f.id === "fuera-normal"));
  const batido = N.deFavorito(N.FAVORITOS.find((f) => f.id === "batido"));
  const d = N.dia([R], [fuera, batido]);
  assert.ok(d.plan.n.hc > 55 && d.plan.n.hc < 65, String(d.plan.n.hc));
  assert.ok(d.reg.estimado); assert.ok(d.reg.sinMicros);
  assert.equal(Math.round(d.total.kcal), Math.round(d.plan.n.kcal + d.reg.n.kcal));
});

test("te falta X; cómete Y: primero lo de casa, luego la lista, si no qué comprar", () => {
  const obj = N.objetivos(PERFIL, "2026-11-10", {}, "gimnasio");
  const tot = { hc: 300, fibra: 31, vitC: 40, folato: 150 };
  const F = N.teFalta(tot, obj, ["Kiwis", "Macarrones"], ["Espinacas"]);
  const c = F.find((x) => x.k === "vitC"); assert.equal(c.falta, 70); assert.equal(c.y.nombre, "Kiwi"); assert.equal(c.y.donde, "casa");
  const f = F.find((x) => x.k === "folato"); assert.equal(f.y.nombre, "Espinacas"); assert.equal(f.y.donde, "lista");
  assert.ok(!F.some((x) => x.k === "hc"));                                  // 300 ≥ 280
  const sin = N.teFalta({ hc: 0, fibra: 0, vitC: 0, folato: 0 }, obj, [], []);
  assert.ok(sin.every((x) => x.y && x.y.donde === "comprar"));
});
