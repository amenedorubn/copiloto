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
  assert.ok(o.kcal.estimado); assert.ok(o.mant.tmbEstimado);              // sin basal ni mantenimiento: estimado
  const p2 = N.objetivos({ ...PERFIL, mant: 2800 }, "2026-11-10", {}, "gimnasio");
  assert.ok(!p2.kcal.estimado); assert.equal(p2.kcal.min, 2800);
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

/* ------------------------------ suplementos (v2.48). Datos ficticios ------------------------------ */
const VITD = { nombre: "Vitamina D3 de ejemplo", nutri: { por: "1 unidad", vitD: 25 } };
const OMEGA = { nombre: "Omega-3 de ejemplo", nutri: { por: "1 unidad", epa: 175, dha: 125 } };
test("suplemento: dosis por toma × tomas; solo los días que tocan", () => {
  const d = N.deSuplemento({ nombre: "D3", dosis: { n: 1, ud: "cápsula" }, momentos: [{ m: "desayuno" }], dias: "todos" }, VITD, "gimnasio");
  assert.equal(d.n.vitD, 25); assert.equal(d.tomas, 1); assert.ok(!d.sinFicha); assert.ok(!d.incompleta);
  const o = N.deSuplemento({ nombre: "O3", dosis: { n: 2, ud: "cápsula" }, momentos: [{ m: "comida" }], dias: "entreno" }, OMEGA, "tirada");
  assert.equal(o.n.epadha, 600);
  assert.equal(N.deSuplemento({ nombre: "O3", dosis: { n: 2 }, momentos: [{ m: "comida" }], dias: "entreno" }, OMEGA, "descanso").tomas, 0);
  // por 100 g con la dosis en g (un cacito de 30 g)
  const w = N.deSuplemento({ nombre: "Prot", dosis: { n: 30, ud: "g" }, momentos: [{ m: "despues" }] }, { nutri: { por: "100 g", prot: 80, calcio: 400 } }, "gimnasio");
  assert.equal(w.n.prot, 24); assert.equal(w.n.calcio, 120);
});
test("suplemento sin etiqueta o sin micros: no suma y se dice", () => {
  assert.ok(N.deSuplemento({ nombre: "Magnesio", dosis: { n: 1 }, momentos: [{ m: "cena" }] }, null, "gimnasio").sinFicha);
  assert.ok(N.deSuplemento({ nombre: "X", dosis: { n: 1 }, momentos: [{ m: "cena" }] }, { nutri: { por: "1 unidad", kcal: 5 } }, "gimnasio").incompleta);
  const D = N.dia([], [], null, [N.deSuplemento({ nombre: "Magnesio", dosis: { n: 1 }, momentos: [{ m: "cena" }] }, null, "gimnasio")]);
  assert.deepEqual(D.supl.sinFicha, ["Magnesio"]);
});
test("el día: lo de los suplementos va aparte y suma al total; avisos del máximo tolerable", () => {
  const d3 = N.deSuplemento({ nombre: "D3", dosis: { n: 5, ud: "cápsula" }, momentos: [{ m: "desayuno" }] }, VITD, "gimnasio");   // 125 µg
  const D = N.dia([], [{ n: { vitD: 2 } }], null, [d3]);
  assert.equal(D.supl.n.vitD, 125); assert.equal(D.total.vitD, 127); assert.ok(D.supl.hay);
  const A = N.avisosUL(D.total, D.supl.n);
  assert.deepEqual(A.map((x) => [x.k, x.ul]), [["vitD", 100]]);
  // magnesio: el máximo es solo para lo de los suplementos (la comida no cuenta)
  assert.deepEqual(N.avisosUL({ magnesio: 600 }, { magnesio: 100 }), []);
  assert.deepEqual(N.avisosUL({ magnesio: 600 }, { magnesio: 300 }).map((x) => x.k), ["magnesio"]);
});

/* ------------------------------ semanas, tendencias y fases (v2.49). Datos ficticios ------------------------------ */
function fuentes(porDia) {
  return { comidas: (f) => porDia[f] ? [ev("Comida", "INGREDIENTES\n· " + porDia[f] + " g de macarrones\nPROCESO\n1. Cuece 9 min.")] : [],
    registro: () => [], supl: () => [], perfil: PERFIL, semanas: {}, tipo: (f) => (new Date(f + "T12:00").getDay() === 0 ? "tirada" : "gimnasio") };
}
test("semana: 7 días; sin comida es «sin datos» (null), nunca 0; adherencia", () => {
  const F = fuentes({ "2026-11-09": 100, "2026-11-10": 400 });
  const S = N.semana("2026-11-09", F);
  assert.equal(S.length, 7); assert.ok(S[0].conDatos); assert.ok(!S[2].conDatos);
  assert.equal(N.enRango(S[2]), null);
  assert.equal(N.enRango(S[0]), false);                                       // 100 g de pasta: poca proteína
  const m = N.media(S, "hc"); assert.equal(m.n, 2); assert.ok(Math.abs(m.v - (74.7 + 298.8) / 2) < 0.5);
  assert.equal(N.media(N.semana("2026-11-16", F), "hc").v, null);
});
test("tendencias: métrica por semana en g/kg con su banda; peso esperado según la fase", () => {
  const F = fuentes({ "2026-11-10": 400 });
  const W = N.semanas("2026-11-09", 3, F);
  assert.deepEqual(W.map((s) => s.lunes), ["2026-10-26", "2026-11-02", "2026-11-09"]);
  const m = N.metrica(W[2], "hcKg", PERFIL);
  assert.ok(Math.abs(m.v - 298.8 / 70) < 0.05); assert.equal(m.lo, 4); assert.equal(m.hi, 6);
  assert.equal(N.metrica(W[0], "hcKg", PERFIL).v, null);
  const esp = N.pesoEsperado([{ peso: null, fase: "mantenimiento" }, { peso: 80, fase: "definicion" }, { peso: null, fase: "definicion" }]);
  assert.deepEqual(esp, [null, 80, 79.7]);
});
test("fases por bloques, carbohidratos por tipo de día, cobertura y huecos", () => {
  const B = N.bloquesFase("2026-10-12", 4, {});
  assert.deepEqual(B.map((b) => [b.fase, b.semanas]), [["descarga", 1], ["recuperacion", 3]]);   // la recuperación acaba el lunes 2/11
  const F = fuentes({ "2026-11-09": 400, "2026-11-15": 400 });
  const S = N.semana("2026-11-09", F);
  const T = N.porTipo(S, PERFIL, "mantenimiento");
  assert.equal(T.find((x) => x.tipo === "tirada").n, 1); assert.equal(T.find((x) => x.tipo === "tirada").lo, 6);
  assert.equal(T.find((x) => x.tipo === "descanso").v, null);
  const c = N.cobertura(S, "folato"); assert.ok(c.total > 0 && c.total < 100); assert.equal(c.supl, 0);
  const H = N.huecos(S); assert.ok(H.some((h) => h.k === "vitC" && h.bajo === 2 && h.de === 2));
});
