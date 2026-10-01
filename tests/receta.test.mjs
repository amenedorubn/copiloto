// Tests de receta.js: leer el texto de un evento del calendario "Comidas".
// Los datos son de ejemplo, con el mismo formato que los de verdad (no van al repo).
//   node --test tests/receta.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const R = createRequire(import.meta.url)("../receta.js");
const ev = (titulo, texto, extra = {}) => Object.assign({ uid: "u1", fuente: "comida", fecha: "2026-10-05", hora: "14:00", fin: "14:40", titulo, texto: texto.join ? texto.join("\n") : texto }, extra);
const ing = (r, base) => r.ingredientes.find((g) => g.base === base);
const idx = (r, base) => r.ingredientes.findIndex((g) => g.base === base);
const reales = (r) => r.pasos.filter((p) => !p.auto);

/* ------------------------------ cantidades ------------------------------ */
test("cantidades: gramos, kilos, cucharadas, fracciones, rangos, ~ y docenas", () => {
  assert.deepEqual(R.cantidad("250 g solomillos de pollo"), { n: 250, ud: "g", resto: "solomillos de pollo" });
  assert.deepEqual(R.cantidad("1,2 kg de rigatoni"), { n: 1200, ud: "g", resto: "rigatoni" });
  assert.deepEqual(R.cantidad("2 cdas leche"), { n: 2, ud: "cda", resto: "leche" });
  assert.deepEqual(R.cantidad("3 huevos"), { n: 3, ud: "ud", resto: "huevos" });
  assert.deepEqual(R.cantidad("½ cebolla"), { n: 0.5, ud: "ud", resto: "cebolla" });
  assert.deepEqual(R.cantidad("medio aguacate"), { n: 0.5, ud: "ud", resto: "aguacate" });
  assert.deepEqual(R.cantidad("4 bolsas de arroz"), { n: 4, ud: "bolsa", resto: "arroz" });
  assert.deepEqual(R.cantidad("1/2 cdta de comino"), { n: 0.5, ud: "cdta", resto: "comino" });
  assert.deepEqual(R.cantidad("1 docena de huevos"), { n: 12, ud: "ud", resto: "huevos" });
  assert.deepEqual(R.cantidad("3-4 lonchas de pavo"), { n: 4, min: 3, ud: "loncha", resto: "pavo" });
  assert.deepEqual(R.cantidad("~40 g de queso"), { n: 40, ud: "g", aprox: true, resto: "queso" });
  assert.deepEqual(R.cantidad("1 puñado grande de nueces"), { n: 1, ud: "puñado", resto: "nueces" });
  assert.equal(R.cantidad("2 lomos de salmón").resto, "lomos de salmón", "el de es del nombre si no hay unidad");
  assert.equal(R.cantidad("Sal al gusto"), null);
  assert.equal(R.cantTxt({ n: 1200, ud: "g" }), "1,2 kg");
  assert.equal(R.cantTxt({ n: 3, ud: "ud" }), "3");
  assert.equal(R.cantTxt({ n: 4, min: 3, ud: "loncha" }), "3-4 lonchas");
  assert.equal(R.cantTxt({ n: 40, ud: "g", aprox: true }), "~40 g");
  assert.equal(R.cantTxt({ n: 0.5, ud: "cdta" }), "½ cdta");
});

/* ------------------------------ un ingrediente ------------------------------ */
test("un ingrediente: alimento, preparacion, de casa, se acaba, abre, basico", () => {
  const a = R.ingrediente("250 g de pollo (el del lunes, descongelado desde anoche) en dados de 2 cm");
  assert.deepEqual(a.c, { n: 250, ud: "g" });
  assert.equal(a.base, "pollo"); assert.equal(a.ver, "Pollo"); assert.equal(a.prep, "en dados de 2 cm");
  assert.ok(a.deCasa && !a.acaba && !a.basico);
  const b = R.ingrediente("La otra media berenjena en cubos de 2 cm");
  assert.deepEqual(b.c, { n: 0.5, ud: "ud" }); assert.equal(b.base, "berenjena"); assert.ok(b.deCasa && b.acaba);
  const c = R.ingrediente("Los 200 g de tomate triturado que quedan");
  assert.equal(c.base, "tomate triturado"); assert.equal(c.c.n, 200); assert.ok(c.acaba && c.deCasa);
  const d = R.ingrediente("2-3 cdas de maíz (abre la lata pequeña hoy)");
  assert.deepEqual(d.c, { n: 3, min: 2, ud: "cda" }); assert.equal(d.base, "maíz"); assert.ok(d.abre);
  assert.equal(R.ingrediente("1 rebanada de pan rústico para mojar").prep, "para mojar");
  assert.equal(R.ingrediente("1 rebanada de pan rústico tostada").base, "pan rústico");
  assert.equal(R.ingrediente("30 g de pan rallado").base, "pan rallado", "pan rallado es un alimento, no pan + rallado");
  assert.equal(R.ingrediente("Queso tierno rallado o en trocitos").prep, "rallado o en trocitos");
  assert.deepEqual(R.ingrediente("1 vaso de leche semi (250 ml)").c, { n: 250, ud: "ml" }, "el vaso se pasa a ml");
  assert.deepEqual(R.ingrediente("1 scoop de proteína (30 g)").equiv, { n: 30, ud: "g" });
  const e = R.ingrediente("El huevo cocido de anoche, en rodajas");
  assert.ok(e.hecho && e.deCasa); assert.equal(e.base, "huevo cocido");
  assert.ok(R.ingrediente("Tupper del guiso (descongelado desde anoche)").hecho);
  assert.ok(R.ingrediente("Unas gotas de AOVE").basico && R.ingrediente("Leche al gusto").basico);
  assert.ok(R.ingrediente("1 cdta de pimentón dulce").basico && !R.ingrediente("1 cdta de miel").basico);
  assert.equal(R.ingrediente("Todas las lonchas de pavo").acaba, true);
  assert.equal(R.ingrediente("2 lomos de salmón").nombre, "lomos de salmón");
  assert.equal(R.ingrediente("2 lomos de salmón").base, "salmón");
  assert.equal(R.ingrediente("3 nueces").base, "nuez"); assert.equal(R.ingrediente("4 dátiles").base, "dátil");
  assert.equal(R.clave("2 limones"), R.clave("1 limón"));
  assert.equal(R.clave("3 tomates"), R.clave("Medio tomate"));
});

test("una linea con varios: + , y ... se parte solo si cada trozo es basico o lleva cantidad", () => {
  const t = (x) => R.ings(x).map((g) => [g.base, g.c && R.cantTxt(g.c)]);
  assert.deepEqual(t("1 cda de cebolla + ½ cda de ajo congelados"), [["cebolla", "1 cda"], ["ajo", "½ cda"]]);
  assert.ok(R.ings("1 cda de cebolla + ½ cda de ajo congelados").every((g) => /congelad[oa]$/.test(g.txt)), "congelados vale para los dos");
  assert.deepEqual(t("3 cdas de AOVE, 1 cdta de sal, ¼ cdta de pimienta"), [["aove", "3 cdas"], ["sal", "1 cdta"], ["pimienta", "¼ cdta"]]);
  assert.deepEqual(t("Canela y una pizca de sal"), [["canela", null], ["sal", "1 pizca"]]);
  assert.deepEqual(t("AOVE, sal, una pizca de curry"), [["aove", null], ["sal", null], ["curry", "1 pizca"]]);
  assert.equal(R.ings("Un puñado de espinacas, de la bolsa").length, 1, "\"de la bolsa\" no es otro alimento");
  assert.equal(R.ings("Medio aguacate (la otra mitad, con hueso, al tupper)").length, 1, "lo de entre parentesis no se parte");
  const enc = R.ings("Encima: miel + un puñado de arándanos congelados");
  assert.deepEqual(enc.map((g) => [g.base, g.cuando]), [["miel", "Encima"], ["arándano", "Encima"]]);
  assert.equal(R.ings("Opcional: 1 rebanada de pan")[0].opcional, true);
});

/* ------------------------- ¿es el mismo alimento? ------------------------- */
test("mismo(): la tabla de pares de la despensa", () => {
  const si = [["pollo en dados", "500 g solomillos de pollo"], ["pan rústico tostada", "pan rústico Lidl"], ["pan rústico para mojar", "pan rústico Lidl"],
    ["tomate en dados", "3 tomates"], ["ajo troceado congelado", "ajo troceado"], ["pimiento rojo congelado", "pimiento rojo en tiras"],
    ["queso canario en trocitos", "queso canario"], ["leche semi", "6 bricks de leche semi"], ["scoop de proteína", "proteína de cookies"],
    ["espinacas CRUDAS", "100 g espinacas"], ["AOVE", "aceite de oliva"], ["yogur griego", "yogur griego light"]];
  const no = [["pan rústico", "pan rallado"], ["tomate triturado", "tomate"], ["leche de coco", "leche semi"], ["crema de cacahuete", "proteína de cacahuete"],
    ["avena (30 g)", "avena molida"], ["huevos cocidos de anoche", "huevos"], ["guiso tupper", "carne picada"], ["crema de calabaza", "calabaza"],
    ["crema de calabaza", "crema de cacahuete"], ["nueces", "nuez moscada"]];
  si.forEach(([a, b]) => assert.ok(R.mismo(a, b) > 0, a + " = " + b));
  no.forEach(([a, b]) => assert.equal(R.mismo(a, b), 0, a + " != " + b));
  assert.equal(R.mismo("pollo", "solomillos de pollo"), 1);
  assert.ok(R.mismo(R.ingrediente("Tupper del guiso"), "guiso de carne con patatas") > 0, "lo generico de casa vale");
  assert.ok(R.mismo(R.ingrediente("1 rebanada de pan rústico"), R.ingrediente("2 rebanadas de pan rústico tostado")) === 1, "con Ing tambien");
});

/* ------------------------------ tiempos ------------------------------ */
test("tiempos: sumados, con avisos, rangos, segundos y horas", () => {
  const t = (x) => { const r = R.tiempo(x); return [r.duracion_s, r.avisos.map((a) => [a.a_los_s, a.texto])]; };
  assert.deepEqual(t("Boniato solo: 5 min, agitar, 5 min más."), [600, [[300, "Agita"]]]);
  assert.deepEqual(t("Ninja en AIR FRY, 10 min. Agita a los 5."), [600, [[300, "Agita"]]]);
  assert.deepEqual(t("12 min, con vuelta a los 6."), [720, [[360, "Dale la vuelta"]]]);
  assert.deepEqual(t("Microondas 3-4 min."), [240, [[180, "Mira si ya está"]]]);
  assert.equal(R.tiempo("Microondas 3-4 min.").hasta_s, 240);
  assert.deepEqual(t("El ajo con el AOVE, 20 s al microondas."), [20, []]);
  assert.deepEqual(t("Al horno 1 h."), [3600, []]);
  assert.deepEqual(t("Crema al cazo 4 min, o microondas 2-3 min tapada, removiendo a la mitad."), [240, [[120, "Remueve"]]], "lo de la o es otra forma");
  assert.deepEqual(t("Cuando salgan burbujas (1-2 min), vuelta. 1 min más."), [180, [[60, "Mira si ya está"], [120, "Dale la vuelta"]]]);
  assert.deepEqual(t("Rodajas de 1 cm, 300 g, a las 12:30."), [0, []], "cm, g y horas del reloj no son tiempos");
  assert.equal(R.tiempo("5 min").avisos.length, 0);
});

/* ------------------------------ eventos ------------------------------ */
const POLLO = ev("🍽️ Pollo al pimentón con boniato y calabacín (Ninja)", [
  "1 RACIÓN · ~25 min · Plato completo, sin pan.",
  "",
  "INGREDIENTES",
  "· 250 g de pollo (el del lunes, descongelado desde anoche) en dados de 2 cm",
  "· 1 boniato en cubos de 2 cm",
  "· El medio calabacín de la nevera en cubos de 2 cm",
  "· 2 dientes de ajo picados",
  "· 1 cdta de orégano + 1 cdta de pimentón dulce",
  "· 3 cdas de AOVE, 1 cdta de sal, ¼ cdta de pimienta",
  "",
  "ANTES DE EMPEZAR",
  "· Calabacín en cubos, en un colador con sal, 10 min. Luego sécalo con papel.",
  "· El ajo con el AOVE, 20 s al microondas.",
  "· Adobo del pollo: ese aceite con ajo + orégano + pimentón + sal + pimienta.",
  "",
  "NINJA CRISPI · todo en AIR FRY",
  "1. 4 min en vacío para precalentar.",
  "2. Boniato solo, con un chorrito de AOVE: 5 min, agitar, 5 min más.",
  "3. Añade el pollo adobado y el calabacín: 6 min, agitar, 6 min más.",
  "4. 3 min extra SIN remover, para que dore.",
  "",
  "El pimentón va solo en el adobo, no en el boniato desde el principio: se quemaría.",
  "",
  "DESPUÉS: lava el tupper del pollo.",
  "La bolsa de arroz que no usas se queda en el congelador."
]);

test("pollo con boniato: paso 0 con los cortes, cabecera NINJA como grupo, consejo y tiempos", () => {
  const r = R.leer(POLLO), P = r.pasos;
  assert.equal(r.tipo, "comida"); assert.equal(r.titulo, "Pollo al pimentón con boniato y calabacín (Ninja)");
  assert.equal(r.raciones, 1); assert.equal(r.minutos, 25);
  assert.deepEqual(r.resumen, ["1 ración", "~25 min", "Plato completo, sin pan."]);
  assert.deepEqual(r.ingredientes.map((g) => g.base), ["pollo", "boniato", "calabacín", "ajo", "orégano", "pimentón dulce", "aove", "sal", "pimienta"]);
  // paso 0 automatico
  assert.ok(P[0].auto && P[0].tipo === "prep" && P[0].titulo === "Antes de empezar");
  const sec = Object.fromEntries(P[0].secciones.map((s) => [s.titulo, s.items.map((x) => x.txt)]));
  assert.ok(sec["Corta y prepara"].includes("1 boniato · pélalo, en cubos de 2 cm"), sec["Corta y prepara"].join(" | "));
  assert.ok(sec["Corta y prepara"].includes("250 g de pollo · en dados de 2 cm"));
  assert.ok(sec["Corta y prepara"].includes("2 dientes de ajo · pélalos, picados"));
  assert.deepEqual(sec["Ten a mano"], ["1 cdta de orégano", "1 cdta de pimentón dulce", "3 cdas de AOVE", "1 cdta de sal", "¼ cdta de pimienta"]);
  // antes de empezar, luego los pasos de la Ninja con su grupo, luego lo de despues
  assert.deepEqual(P.map((p) => p.tipo), ["prep", "prep", "prep", "prep", "paso", "paso", "paso", "paso", "despues"]);
  const ninja = P.filter((p) => p.grupo === "NINJA CRISPI · todo en AIR FRY");
  assert.equal(ninja.length, 4, "la cabecera NINJA no es un paso");
  assert.ok(!P.some((p) => /^NINJA/.test(p.titulo)));
  assert.deepEqual(ninja.map((p) => p.duracion_s), [240, 600, 720, 180]);
  assert.deepEqual(ninja[1].avisos.map((a) => [a.a_los_s, a.texto]), [[300, "Agita"]]);
  assert.equal(ninja[1].avisos[0].voz, "Boniato solo: agita.");
  assert.ok(ninja[1].usa.includes(idx(r, "boniato")));
  assert.ok(ninja[2].usa.includes(idx(r, "pollo")) && ninja[2].usa.includes(idx(r, "calabacín")));
  assert.equal(ninja[3].pista, "para que dore");
  assert.equal(P[1].duracion_s, 600); assert.equal(P[2].duracion_s, 20);
  // el consejo del pimenton va con el adobo y no es un paso
  assert.ok(!P.some((p) => /pimentón va solo/.test(p.titulo)));
  assert.match(P[3].titulo, /Adobo/); assert.match(P[3].consejo, /pimentón va solo/);
  assert.equal(P[8].tipo, "despues"); assert.equal(P[8].titulo, "Lava el tupper del pollo");
  assert.ok(r.notas.some((n) => /bolsa de arroz/.test(n)));
  // problemas: cortes que ningun paso hace y el tiempo
  const cortes = r.problemas.filter((p) => p.tipo === "corte-sin-paso").map((p) => r.ingredientes[p.ing].base);
  assert.deepEqual(cortes, ["pollo", "boniato", "ajo"]);
  assert.ok(r.problemas.some((p) => p.tipo === "tiempo"), "los pasos suman mas que los 25 min");
  assert.ok(R.pasosDe(r) === r.pasos && R.pasosDe(POLLO).length === 9);
});

test("overnight oats: POR TARRO con 2 TARROS dobla las cantidades; un consejo numerado no es un paso", () => {
  const r = R.leer(ev("🥣 Prepara 2 tarros de overnight oats", [
    "2 TARROS de una vez: lunes y martes. 8 min.",
    "POR TARRO",
    "· 40 g de avena",
    "· 60 ml de leche semi",
    "· 125 g de yogur griego",
    "· 1 scoop de proteína (30 g)",
    "· 15 g de crema de cacahuete",
    "· 5 g de miel",
    "· Canela",
    "PROCESO",
    "1. Primero la proteína con la leche.",
    "2. Luego yogur, avena y canela. Remueve bien.",
    "3. La crema de cacahuete en el centro. Tapar.",
    "4. Las nueces NO van dentro: se echan al abrirlo."
  ]));
  assert.equal(r.mult, 2);
  assert.deepEqual(r.grupos.map((g) => [g.titulo, g.mult, g.items.length]), [["Por tarro", 2, 7]]);
  assert.deepEqual(r.ingredientes.map((g) => g.c && R.cantTxt(g.c)), ["80 g", "120 ml", "250 g", "2 scoops", "30 g", "10 g", null]);
  assert.deepEqual(ing(r, "proteína").equiv, { n: 60, ud: "g" });
  assert.equal(reales(r).length, 3);
  assert.match(reales(r)[2].consejo, /nueces NO van dentro/);
  assert.deepEqual(r.problemas.filter((p) => p.tipo === "sin-paso").map((p) => r.ingredientes[p.ing].base), ["miel"]);
});

test("shakshuka: EN PARALELO es un paso con reloj y sus huevos cuentan (4 en total)", () => {
  const r = R.leer(ev("🌙 Shakshuka · huevos en salsa de tomate", [
    "CENA · 15 min · Se acaba el tomate triturado.",
    "Si no te convence: tostadas con tomate + tortilla.",
    "",
    "INGREDIENTES",
    "· Los 300 g de tomate triturado que quedan",
    "· 2 huevos",
    "· 1 puñado de pimiento rojo congelado",
    "· 2-3 cdas de maíz (abre la lata hoy)",
    "· Queso tierno en trocitos",
    "· AOVE, sal, pimienta",
    "· 1 rebanada de pan rústico para mojar",
    "",
    "EN PARALELO: 2 huevos a cocer 10 min en un cazo. Son para mañana.",
    "",
    "PROCESO",
    "1. Sartén con AOVE: pimiento, 3 min.",
    "2. Tomate, maíz y sal. 5 min a fuego medio hasta que espese.",
    "3. Haz 2 huecos y casca un huevo en cada uno.",
    "4. Tapa y deja 5 min a fuego bajo: la yema aún blanda.",
    "5. Queso por encima. Se come mojando pan.",
    "",
    "AL TERMINAR: el tupper del guiso, del congelador → nevera."
  ]));
  assert.deepEqual([r.titulo, r.sub, r.etiqueta], ["Shakshuka", "huevos en salsa de tomate", ""]);
  assert.deepEqual(r.planB, ["Tostadas con tomate + tortilla."]);
  const huevos = r.ingredientes.filter((g) => g.base === "huevo");
  assert.equal(huevos.reduce((a, g) => a + g.c.n, 0), 4);
  assert.deepEqual(huevos.map((g) => g.grupo), [null, "En paralelo"]);
  const par = r.pasos.find((p) => p.tipo === "paralelo");
  assert.equal(par.duracion_s, 600); assert.equal(r.pasos.indexOf(par), 1, "justo despues del paso 0");
  assert.deepEqual(r.pasos.filter((p) => p.tipo === "paso").map((p) => p.duracion_s), [180, 300, 0, 300, 0]);
  assert.equal(r.pasos.filter((p) => p.tipo === "paso")[3].pista, "la yema aún blanda");
  const desp = r.pasos[r.pasos.length - 1];
  assert.ok(desp.tipo === "despues" && desp.descongela);
  assert.ok(ing(r, "tomate triturado").acaba && ing(r, "maíz").abre);
  assert.deepEqual(r.acaba, ["tomat triturado"]);
  const corta = r.pasos[0].secciones.find((s) => s.titulo === "Corta y prepara").items.map((x) => x.txt);
  assert.deepEqual(corta, ["2-3 cdas de maíz · abre la lata", "Queso tierno · en trocitos"]);
});

test("albóndigas: grupos con lo que rinden, TU PLATO en linea, Mientras y REPARTO", () => {
  const r = R.leer(ev("🍽️ COCINAS · Albóndigas con macarrones (3 raciones)", [
    "3 RACIONES · 35 min · 1 la comes y 2 van al congelador.",
    "",
    "ALBÓNDIGAS (salen ~18)",
    "· 400 g de carne picada (descongelada desde anoche)",
    "· 1 huevo",
    "· 30 g de pan rallado",
    "· Perejil, sal, pimienta",
    "",
    "SALSA",
    "· 300 g de tomate triturado",
    "· 2 cdas de cebolla + 1 cdta de ajo congelados",
    "· Orégano, sal, AOVE",
    "",
    "TU PLATO: 90 g de macarrones",
    "",
    "PROCESO",
    "1. Mezcla la carne con el huevo, el pan rallado, el perejil, la sal y la pimienta. Bolitas del tamaño de una nuez.",
    "2. Ninja en AIR FRY, 10 min. Agita a los 5.",
    "3. Mientras: en la pota, AOVE con la cebolla y el ajo, 3 min.",
    "4. Tomate, orégano y sal. 10 min a fuego bajo.",
    "5. Pasta a cocer.",
    "6. Albóndigas a la salsa, 5 min más.",
    "",
    "REPARTO",
    "· Tu plato: 6 albóndigas con salsa.",
    "· 6 albóndigas → TUPPER → CONGELADOR.",
    "Enfría en la encimera antes de congelar."
  ]));
  assert.deepEqual([r.etiqueta, r.titulo, r.raciones], ["Cocinas", "Albóndigas con macarrones", 3]);
  assert.deepEqual(r.grupos.map((g) => [g.titulo, g.items.length]), [["Albóndigas", 6], ["Salsa", 6], ["Tu plato", 1]]);
  assert.deepEqual(r.grupos[0].rinde, { n: 18, aprox: true });
  assert.deepEqual(ing(r, "macarrón").c, { n: 90, ud: "g" });
  assert.equal(ing(r, "macarrón").grupo, "Tu plato");
  const P = reales(r);
  assert.deepEqual(P.map((p) => [p.tipo, p.duracion_s]), [["paso", 0], ["paso", 600], ["paralelo", 180], ["paso", 600], ["paso", 0], ["paso", 300], ["despues", 0]]);
  assert.equal(P[0].pista, "del tamaño de una nuez");
  assert.ok(P[4].usa.includes(idx(r, "macarrón")), "pasta = macarrones");
  // el ajo de la salsa en el paso de la salsa, no el de las albondigas
  assert.ok(P[2].usa.includes(r.grupos[1].items.find((k) => r.ingredientes[k].base === "ajo")));
  assert.equal(P[6].titulo, "Reparto"); assert.equal(P[6].checklist.length, 2); assert.match(P[6].consejo, /Enfría/);
  assert.ok(!r.problemas.some((p) => p.tipo === "no-en-lista"), JSON.stringify(r.problemas));
});

test("tortitas: Encima es un grupo, la batidora usa todo menos el aceite, PLAN B y nota", () => {
  const r = R.leer(ev("🌙 Tortitas de avena con miel", [
    "CENA · 12 min.",
    "INGREDIENTES",
    "· 60 g de avena molida",
    "· 1 plátano",
    "· 1 huevo",
    "· Canela y una pizca de sal",
    "· Unas gotas de AOVE",
    "· Encima: miel + un puñado de arándanos",
    "PROCESO",
    "1. Batidora 20 s con todo menos el aceite y los toppings.",
    "2. Sartén a fuego MEDIO con unas gotas de AOVE.",
    "3. Salen 3-4 tortitas. Cuando salgan burbujas (1-2 min), vuelta. 1 min más.",
    "4. Arándanos 30 s al microondas. Por encima con la miel.",
    "PLAN B (sin sartén): la misma masa en la Ninja, AIR FRY 12 min.",
    "SARTÉN NUEVA: nunca a fuego fuerte."
  ]));
  assert.deepEqual(r.ingredientes.map((g) => g.base), ["avena molida", "plátano", "huevo", "canela", "sal", "aove", "miel", "arándano"]);
  assert.deepEqual(r.grupos.map((g) => [g.titulo, g.items]), [["Encima", [6, 7]]]);
  const P = reales(r);
  assert.deepEqual(P[0].usa, [0, 1, 2, 3, 4]);
  assert.deepEqual(P[2].repetir, { n: 4, min: 3 });
  assert.deepEqual(P.map((p) => p.duracion_s), [20, 0, 180, 30]);
  assert.deepEqual(r.planB, ["Sin sartén: la misma masa en la Ninja, AIR FRY 12 min."]);
  assert.deepEqual(r.notas, ["Sartén nueva: nunca a fuego fuerte."]);
  assert.equal(r.problemas.length, 0, JSON.stringify(r.problemas));
});

test("compra, aviso y comida fuera: su tipo y sin pasos", () => {
  const c = R.leer(ev("🛒 Compra de la tarde · huevos, pan y yogur", [
    "COMPRA (con cantidades)",
    "1. Huevos, 1 docena",
    "2. Pollo 500 g → para el jueves",
    "3. Mozzarella · 1 bola",
    "SOLO SI FALTA",
    "· Pan rústico: si quedan menos de 10 rebanadas",
    "AL LLEGAR A CASA",
    "· El pollo al congelador."
  ]));
  assert.equal(c.tipo, "compra"); assert.equal(c.titulo, "Compra de la tarde"); assert.equal(c.sub, "huevos, pan y yogur");
  assert.equal(c.pasos.length, 0); assert.equal(c.ingredientes.length, 0);
  assert.deepEqual(c.lista.map((g) => [g.base, g.c && R.cantTxt(g.c), g.opcional]), [["huevo", "12", false], ["pollo", "500 g", false], ["mozzarella", "1 bola", false], ["pan rústico", null, true]]);
  assert.deepEqual(c.notas, ["El pollo al congelador."]);
  const a = R.leer(ev("❄️ Saca el pollo a la nevera", "Pasa el tupper del CONGELADOR a la NEVERA. Si no, mañana no hay pollo."));
  assert.equal(a.tipo, "aviso"); assert.equal(a.pasos.length, 0);
  assert.deepEqual(a.resumen, ["Pasa el tupper del CONGELADOR a la NEVERA.", "Si no, mañana no hay pollo."]);
  assert.equal(R.leer(ev("🍽️ Comida fuera", "Comes fuera. Nada que preparar.")).tipo, "fuera");
  assert.equal(R.leer(ev("🌯 Cena fuera · Pizzería", "Pizza con amigos. Nada que preparar.")).tipo, "fuera");
  const of = R.leer(ev("🥣 Desayuno de oficina · plátano + avena", ["Nada en casa.", "· Por el camino: 1 plátano", "· En la oficina: tarro 1 de overnight oats + un puñado de nueces al abrirlo"]));
  assert.equal(of.tipo, "comida"); assert.equal(of.pasos.length, 0, "sin nada que hacer, sin paso 0");
  assert.deepEqual(of.ingredientes.map((g) => [g.base, g.cuando, g.hecho]), [["plátano", "Por el camino", false], ["overnight oats", "En la oficina", true], ["nuez", "En la oficina", false]]);
});

test("el titulo: etiqueta, plato y subtitulo", () => {
  const t = (x) => { const r = R.titulo(x); return [r.etiqueta, r.titulo, r.sub]; };
  assert.deepEqual(t("☀️ Desayuno de teletrabajo · huevos, tomate y jamón"), ["", "Desayuno de teletrabajo", "huevos, tomate y jamón"]);
  assert.deepEqual(t("🍽️ Tupper · Guiso de carne con patatas"), ["Tupper", "Guiso de carne con patatas", ""]);
  assert.deepEqual(t("🍽️ COCINAS · Pollo con arroz (1 ración) · reserva 200 g de pollo"), ["Cocinas", "Pollo con arroz", "reserva 200 g de pollo"]);
  assert.deepEqual(t("Merienda · Muesli con leche"), ["Merienda", "Muesli con leche", ""]);
  assert.deepEqual(t("Berenjena gratinada (media berenjena)"), ["", "Berenjena gratinada (media berenjena)", ""]);
});

/* ------------------------- lo que ya hacia cocina.js ------------------------- */
const EVENTO = ev("Tupper · Pollo al curry con arroz", [
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
]);

test("como antes: ingredientes, pasos y notas de una comida", () => {
  const c = R.leer(EVENTO);
  assert.equal(c.titulo, "Pollo al curry con arroz"); assert.equal(c.etiqueta, "Tupper"); assert.equal(c.raciones, 2);
  assert.deepEqual(c.ingredientes.map((i) => i.txt), ["500 g solomillos de pollo", "1 cebolla", "200 ml leche de coco", "Sal al gusto"]);
  assert.deepEqual(c.ingredientes[0].c, { n: 500, ud: "g" });
  assert.deepEqual(reales(c).map((p) => p.duracion_s), [360, 240, 600], "de 3-4 min, lo largo");
  assert.ok(c.notas.some((n) => /destapado/.test(n)));
  assert.equal(c.pasos[0].auto, true);
  assert.deepEqual(c.pasos[0].secciones.find((s) => s.titulo === "Corta y prepara").items.map((x) => x.txt), ["1 cebolla · pélala"]);
});

test("como antes: HTML de Google y emojis", () => {
  const c = R.leer({ titulo: "🍗 Tupper · Pollo al curry", texto:
    "<b>🥣 INGREDIENTES:</b><br><ul><li>✅ 500 g solomillos de pollo</li><li>1 cebolla</li></ul><b>CÓMO SE HACE:</b><br>1. Dora el pollo&nbsp;6 min.<br>2. Añade la cebolla." });
  assert.equal(c.titulo, "Pollo al curry"); assert.equal(c.etiqueta, "Tupper");
  assert.deepEqual(c.ingredientes.map((i) => i.txt), ["500 g solomillos de pollo", "1 cebolla"]);
  assert.deepEqual(reales(c).map((p) => p.detalle), ["Dora el pollo 6 min.", "Añade la cebolla."]);
  assert.equal(R.sinHtml("a&amp;b<br>c"), "a&b\nc");
  assert.equal(R.sinEmoji("🍗 Pollo").trim(), "Pollo");
});

test("como antes: sin apartados, las viñetas son ingredientes y los numeros, pasos", () => {
  const c = R.leer({ titulo: "Tostada con huevo", texto: "- 1 rebanada de pan\n- 2 huevos\n1. Tuesta el pan.\n2. Huevos a la plancha 3 min." });
  assert.equal(c.ingredientes.length, 2); assert.equal(reales(c).length, 2);
});

test("como antes: ingredientes en una linea y enlace a la receta de Copiloto Cocina", () => {
  const c = R.leer({ titulo: "Albóndigas", texto: "Ingredientes: 500 g carne picada, 1 huevo, 30 g pan rallado (o avena)\nReceta: albondigas-rigatoni" });
  assert.deepEqual(c.ingredientes.map((i) => i.nombre), ["carne picada", "huevo", "pan rallado (o avena)"]);
  assert.equal(c.receta, "albondigas-rigatoni");
});

test("como antes: en la lista solo alimentos, ni apartados ni consejos", () => {
  const c = R.leer({ uid: "b", titulo: "Pollo al pimentón con boniato", texto: [
    "INGREDIENTES:", "· 400 g contramuslos de pollo", "· 1 boniato grande", "El pimentón va solo en el adobo, no en el boniato desde el principio, se quemaría",
    "ADOBO:", "· 1 cdta pimentón dulce", "· Sal al gusto",
    "ANTES DE EMPEZAR:", "· Saca el pollo de la nevera 15 min antes", "OJO", "· El horno, precalentado",
    "CÓMO SE HACE:", "1. Adoba el pollo.", "2. Al horno 25 min."].join("\n") });
  assert.deepEqual(c.ingredientes.map((i) => i.nombre), ["contramuslos de pollo", "boniato grande", "pimentón dulce", "Sal al gusto"]);
  assert.equal(reales(c)[0].titulo, "Saca el pollo de la nevera 15 min antes", "antes de empezar: el primer paso");
  assert.ok(c.notas.some((n) => /pimentón va solo/.test(n)) && c.notas.some((n) => /precalentado/.test(n)));
  assert.equal(c.grupos[0].titulo, "Adobo");
  assert.ok(R.esBasico("Sal al gusto") && R.esBasico("1 cdta pimentón dulce") && !R.esBasico("1 boniato"));
  assert.deepEqual(R.resumenIngs(c).slice(0, 2), ["400 g de contramuslos de pollo", "1 boniato"]);
});
