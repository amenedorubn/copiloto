// v2.58 · formato v3 de las recetas (Cooklang en español), el linter y el escalado
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Receta = require("../receta.js");
const Carriles = require("../carriles.js");
const { revisa, eventoDeTxt } = await import("../scripts/lint-recetas.mjs");

const curry = eventoDeTxt(readFileSync(new URL("../docs/recetas/2026-10-05-1300-curry.txt", import.meta.url), "utf8"));
const ev = (texto, titulo = "Prueba") => ({ uid: "t", fuente: "comida", titulo, texto });
const BASE = "2 RACIONES · 20 min\nPOR RACIÓN · 500 kcal · 40 g proteína\n\n";

/* ------------------------------ parser ------------------------------ */
test("cook: ingrediente, cantidad, corte, reloj, recipiente y señal dentro del paso", () => {
  const c = Receta.cook("Corta @pimiento tricolor{150 g}(en tiras finas) en la #tabla{}, ~{2 min} → tiras de 1 cm");
  assert.equal(c.t, "Corta 150 g de pimiento tricolor en tiras finas en la tabla, 2 min");
  assert.deepEqual(c.toks.map((t) => [t.nombre, t.c.n, t.c.ud, t.prep]), [["pimiento tricolor", 150, "g", "en tiras finas"]]);
  assert.equal(c.relojes[0].s, 120);
  assert.deepEqual(c.recs, ["tabla"]);
  assert.equal(c.senal, "tiras de 1 cm");
  assert.deepEqual(c.raros, []);
});
test("cook: % de Cooklang, unidades contables, sin cantidad y fijas", () => {
  const c = Receta.cook("Echa @huevo{2}, @sal{=1 pizca}, @AOVE{1%cda} y @pimienta{al gusto}, ~{20%s}");
  assert.equal(c.t, "Echa 2 huevos, 1 pizca de sal, 1 cda de AOVE y pimienta al gusto, 20 s");
  assert.equal(c.toks[1].fijo, true);
  assert.equal(c.relojes[0].s, 20);
});
test("cook: escalar multiplica las cantidades, no las fijas ni el tiempo", () => {
  const c = Receta.cook("Echa @pollo{250 g} y @sal{=1 pizca}, ~{5 min}", 1.5);
  assert.equal(c.t, "Echa 375 g de pollo y 1 pizca de sal, 5 min");
});
test("cook: lo que no se entiende no se calla", () => {
  const c = Receta.cook("Echa @pollo{250 g y remueve}, ~{un rato} →");
  assert.ok(c.raros.length >= 3, JSON.stringify(c.raros));
  assert.ok(c.raros.some((x) => /«→» sin nada/.test(x)));
  assert.ok(c.raros.some((x) => /no es un tiempo/.test(x)));
});
test("el curry: cada paso trae sus ingredientes con la cantidad de ese paso", () => {
  const R = Receta.leer(curry);
  assert.equal(R.v3, true);
  assert.equal(R.raciones, 2);
  assert.deepEqual([R.porRacion.kcal, R.porRacion.prot], [847, 80]);
  const reales = R.pasos.filter((p) => !p.auto);
  reales.forEach((p) => assert.ok(p.duracion_s > 0, "sin tiempo: " + p.detalle));
  const echa = reales.find((p) => /primera mitad/.test(p.detalle));
  assert.deepEqual(echa.ingPaso.map((x) => [x.nombre, x.c.n, x.ref]), [["pollo", 250, true]]);
  assert.equal(echa.fuegoTxt, "Fuego fuerte");
  assert.equal(echa.pista, "dorado por fuera");
  const tomate = reales.find((p) => /tomate triturado/.test(p.detalle) && p.carril === "pollo");
  assert.equal(tomate.fuegoTxt, "Fuego bajo");
  assert.match(tomate.detalle, /^Enciende a fuego bajo y echa 400 g de tomate triturado/);
  // la lista sale de los pasos y suma lo que no es referencia
  const pollo = R.ingredientes.find((g) => /pollo/.test(g.base));
  assert.deepEqual(pollo.c, { n: 500, ud: "g" });
  const garb = R.ingredientes.find((g) => /garbanzo/.test(g.base));
  assert.deepEqual([garb.c.n, garb.c.ud, garb.equiv.n, garb.equiv.ud], [1, "bote", 400, "g"]);
  // ningun ingrediente sin paso, y todos con cantidad
  R.ingredientes.forEach((g, i) => assert.ok(R.sumas[i].conCant, "sin cantidad: " + g.base));
});
test("con carriles, PREPARAR es un carril y AL TERMINAR va detrás de juntar (antes se perdían)", () => {
  const R = Receta.leer(curry);
  const prep = R.pasos.filter((p) => p.carril === "preparar");
  assert.equal(prep.length, 5);
  assert.ok(R.pasos.some((p) => p.tipo === "despues" && p.carril === "union" && /enfriar/.test(p.detalle)));
  const M = Carriles.modelo(R), P = Carriles.planifica(M);
  assert.equal(M.tareas.length, R.pasos.filter((p) => !p.auto).length, "todas las tareas en el plan");
  // v2.59: el orden lo ponen los ingredientes. El pimiento se corta con el pollo ya en la sartén
  // (no antes de poner el aceite), y se echa después de cortarlo
  const t = (re) => M.tareas.find((x) => re.test(x.txt));
  const cortaPim = t(/^Corta 150 g de pimiento/), echaPollo = t(/^Echa la primera mitad/), echaPim = t(/^Echa las tiras/), aceite = t(/^Calienta 1 cda de AOVE/);
  assert.ok(P.ini[cortaPim.id] >= P.ini[echaPollo.id], "el pimiento se corta mientras se dora el pollo");
  assert.ok(P.fin[cortaPim.id] <= P.ini[echaPim.id], "y antes de echarlo");
  assert.ok(P.ini[echaPollo.id] - P.fin[aceite.id] <= 60, "el aceite no espera humeando");
  // lo que no espera (el arroz del micro) acaba justo cuando se sirve
  const arroz = t(/^Calienta 1 bolsa de arroz/), sirve = t(/^Sirve tu plato/);
  assert.ok(P.ini[sirve.id] - P.fin[arroz.id] <= 60, "el arroz, caliente al servir");
  // mejor que todo en fila
  assert.ok(P.total < P.lineal - 15 * 60);
  // el texto del carril es el paso entero, no el titulo cortado en ":"
  assert.match(M.tareas.find((x) => x.carril === "union" && x.n === 1).txt, /arroz de microondas con la mitad del curry/);
});
test("receta vieja: el título se cortaba en «:» pero el carril ahora lleva el texto entero", () => {
  const R = Receta.leer(ev("1 RACIÓN · 10 min\n\nINGREDIENTES\n· 2 cdas de cebolla\n· Básicos: AOVE\n\nCARRIL SALSA (sartén)\n1. Baja a fuego medio: 2 cdas de cebolla, 3 min\n"));
  assert.equal(R.pasos.find((p) => p.carril).titulo, "Baja a fuego medio");
  assert.match(Carriles.modelo(R).tareas[0].txt, /2 cdas de cebolla/);
});

/* ------------------------------ linter ------------------------------ */
test("linter: el curry nuevo pasa; el del calendario de hoy, no", () => {
  assert.deepEqual(Receta.leer(curry).lint.errores, []);
  const viejo = Receta.leer(ev(readFileSync(new URL("./fixtures/curry-viejo.txt", import.meta.url), "utf8")));
  const cods = viejo.lint.errores.map((e) => e.cod);
  ["por-racion", "sin-tiempo", "sin-verbo", "no-se-entiende", "sin-cantidad"].forEach((c) => assert.ok(cods.includes(c), c + " en " + cods.join(",")));
  assert.ok(viejo.lint.errores.some((e) => /Pasa esa mitad a un plato/.test(e.texto) && e.cod === "sin-tiempo"));
  assert.ok(viejo.lint.errores.some((e) => /o lo que ponga el envase/.test(e.texto)));
});
test("linter: falla si un ingrediente no sale en ningún paso con su cantidad", () => {
  const R = Receta.leer(ev(BASE + "INGREDIENTES\n· 200 g de pollo\n· 1 tomate\n\nPROCESO\n1. Dora @pollo{200 g} en la #sartén a fuego medio, ~{5 min} → dorado\n"));
  const e = R.lint.errores.find((x) => x.cod === "sin-cantidad");
  assert.ok(e && /tomate/.test(e.texto), JSON.stringify(R.lint.errores));
});
test("linter: falla si la lista y los pasos no suman lo mismo", () => {
  const R = Receta.leer(ev(BASE + "INGREDIENTES\n· 500 g de pollo\n\nPROCESO\n1. Dora @pollo{200 g} a fuego medio, ~{5 min} → dorado\n2. Dora @pollo{200 g} a fuego medio, ~{5 min} → dorado\n"));
  assert.ok(R.lint.errores.some((x) => x.cod === "suma" && /500 g.*400 g/.test(x.texto)));
});
test("linter: falla si un paso no tiene tiempo, no dice qué hacer o con qué", () => {
  const R = Receta.leer(ev(BASE + "PROCESO\n1. Corta @tomate{1}\n2. La sartén a fuego medio, ~{2 min}\n3. Remueve bien, ~{20 s}\n"));
  const c = R.lint.errores.map((e) => e.cod);
  assert.ok(c.includes("sin-tiempo"));
  assert.ok(c.includes("sin-verbo"));
  assert.ok(c.includes("sin-ing"));
});
test("linter: falla si faltan raciones o kcal y proteína por ración", () => {
  const R = Receta.leer(ev("15 min\n\nPROCESO\n1. Corta @tomate{1}, ~{1 min}\n"));
  assert.ok(R.lint.errores.some((e) => e.cod === "raciones"));
  assert.ok(R.lint.errores.some((e) => e.cod === "por-racion"));
  const S = Receta.leer(ev("1 RACIÓN · 5 min\nPOR RACIÓN · 300 kcal\n\nPROCESO\n1. Corta @tomate{1}, ~{1 min}\n"));
  assert.ok(S.lint.errores.some((e) => e.cod === "por-racion" && /proteína/.test(e.texto)));
});
test("linter: las marcas de carril sin carriles y los paréntesis sueltos se dicen", () => {
  const R = Receta.leer(ev(BASE + "PROCESO\n1. Corta @tomate{1} (rápido), ~{1 min} (manos)\n"));
  const t = R.lint.errores.filter((e) => e.cod === "no-se-entiende").map((e) => e.texto).join(" | ");
  assert.match(t, /\(rápido\)/);
  assert.match(t, /solo valen en una receta con carriles/);
});
test("linter: «(tras X)» que no es ningún carril es un error", () => {
  const R = Receta.leer(ev(BASE + "CARRIL A (sartén)\n1. Dora @pollo{200 g} a fuego medio, ~{5 min} (tras VERDURAS) → dorado\n"));
  assert.ok(R.lint.errores.some((e) => e.cod === "carril" && /VERDURAS/.test(e.texto)));
});
test("linter: los verbos con pronombre detrás valen", () => {
  ["Córtalo en dados", "Échalas a la sartén", "Sofríelos 3 min", "Salpiméntalo", "Dale la vuelta"].forEach((t) => assert.ok(Receta.verbo(t), t));
  ["La primera mitad del pollo", "Sartén con AOVE", "Fuego bajo: el tomate"].forEach((t) => assert.equal(Receta.verbo(t), null, t));
});

/* ------------------------------ escalado ------------------------------ */
test("escalar el curry de 2 a 3: cantidades ×1,5, mismos tiempos y el linter sigue pasando", () => {
  const R = Receta.leer(curry), E = Receta.escala(R, 3);
  assert.equal(E.raciones, 3);
  assert.equal(E.raciones0, 2);
  assert.deepEqual(E.ingredientes.find((g) => /pollo/.test(g.base)).c, { n: 750, ud: "g" });
  assert.deepEqual(E.ingredientes.find((g) => /tomate/.test(g.base)).c, { n: 600, ud: "g" });
  const s = E.ingredientes.find((g) => g.base === "sal");
  assert.deepEqual(s.c, { n: 2, ud: "pizca" }, "la sal es fija");
  const p = E.pasos.find((x) => /primera mitad/.test(x.detalle));
  assert.equal(p.ingPaso[0].c.n, 375);
  assert.equal(p.duracion_s, 300);
  assert.deepEqual(E.lint.errores, []);
  // por ración no cambia
  assert.deepEqual([E.porRacion.kcal, E.porRacion.prot], [847, 80]);
  // y vuelta a 2: lo mismo que al principio
  assert.deepEqual(Receta.escala(E, 2).ingredientes.map((g) => g.c), R.ingredientes.map((g) => g.c));
});
test("escalar: una receta vieja (cantidades en el texto) no se escala", () => {
  assert.equal(Receta.escala(Receta.leer(ev("2 RACIONES · 5 min\n\nINGREDIENTES\n· 2 huevos\n\nPROCESO\n1. Bate los 2 huevos, 1 min\n")), 3), null);
});
test("el script: el curry pasa, con la nutrición de la tabla y escalado a 1-4 raciones", () => {
  const r = revisa(curry);
  assert.deepEqual(r.errores, []);
  assert.ok(r.nutri.kcal > 0 && r.nutri.prot > 0);
});
test("las recetas migradas en docs/recetas pasan todas el linter", async () => {
  const { readdirSync } = await import("node:fs");
  const dir = new URL("../docs/recetas/", import.meta.url);
  const L = readdirSync(dir).filter((f) => /\.txt$/.test(f));
  assert.ok(L.length >= 1);
  L.forEach((f) => {
    const r = revisa(eventoDeTxt(readFileSync(new URL(f, dir), "utf8")));
    if (r.R.tipo === "comida") assert.deepEqual(r.errores, [], f);
  });
});
test("v2.59: una receta sin carriles escritos se planifica igual: cada recipiente, su carril; las lentejas no se queman", () => {
  const des = eventoDeTxt(readFileSync(new URL("../docs/recetas/2026-10-05-0845-desayuno.txt", import.meta.url), "utf8"));
  const R = Receta.leer(des);
  assert.equal(R.sintetico, true);
  assert.deepEqual(R.carriles.map((c) => c.id).sort(), ["montar", "preparar", "sarten"]);
  const M = Carriles.modelo(R), P = Carriles.planifica(M);
  const tuesta = M.tareas.find((x) => /^Tuesta/.test(x.txt)), monta = M.tareas.find((x) => /^Pon sobre el pan/.test(x.txt));
  assert.ok(P.fin[tuesta.id] <= P.ini[monta.id], "el pan se monta después de tostarlo");
  assert.ok(P.total < P.lineal, "a la vez se tarda menos que en fila");
  // lentejas: la cebolla al fuego no espera a que peles el boniato
  const L = Receta.leer(eventoDeTxt(readFileSync(new URL("../docs/recetas/2026-10-06-1300-lentejas.txt", import.meta.url), "utf8")));
  const ML = Carriles.modelo(L), PL = Carriles.planifica(ML);
  ML.tareas.filter((x) => x.aguanta != null && x.carril === "lentejas").forEach((x) => {
    const y = ML.tareas.find((z) => z.carril === x.carril && z.n === x.n + 1);
    if (y) assert.ok(PL.ini[y.id] - PL.fin[x.id] <= 90, x.txt + " espera " + (PL.ini[y.id] - PL.fin[x.id]) + " s al fuego");
  });
});
