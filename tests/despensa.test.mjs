// Tests de despensa.js: lo que hay en casa (Tengo) y lo que comprar (Comprar).
// Datos de ejemplo con el mismo formato que los de verdad (no van al repo).
//   node --test tests/despensa.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Rc = require("../receta.js"), Dp = require("../despensa.js");

const NOTA = [
  "DESPENSA EN VIVO — última actualización: 05/10/2026 (noche)",
  "",
  "REGLA: este bloque manda.",
  "",
  "\\## CONGELADOR",
  "- Tupper: lentejas con chorizo (400 g) → tupper del jueves",
  "Bolsas: espinacas congeladas, 2 bolsas de arroz de microondas (3 min)",
  "",
  "\\## NEVERA",
  "Leche semi abierta, yogur natural (cantidad sin confirmar), unas cuantas lonchas de pavo, queso de cabra",
  "",
  "\\## DESPENSA SECA",
  "8 huevos, pan de molde integral, bote de tomate frito 400 g (cerrado), 3 latas de atún, AOVE, sal",
  "",
  "\\## FRESCO",
  "5 plátanos, 2 tomates",
  "",
  "\\## ESPECIAS",
  "Orégano, comino, pimentón dulce",
  "",
  "\\## NO HAY",
  "Pollo, calabacín",
  "",
  "\\## COMPRA (martes 06/10)",
  "Sartén de 20 cm, 400 g contramuslos de pollo, 1 calabacín. Solo si falta: pan de molde."
].join("\n");

const ev = (uid, fecha, hora, fin, titulo, texto) => Rc.leer({ uid, fuente: "comida", fecha, hora, fin, titulo, texto });
const COMIDAS = [
  ev("d1", "2026-10-06", "08:00", "08:20", "Desayuno · Tostadas con pavo", "· 2 rebanadas de pan de molde integral\n· 2 lonchas de pavo\n· 1 tomate en rodajas\nPROCESO\n1. Tuesta el pan.\n2. Monta la tostada."),
  ev("c1", "2026-10-06", "14:00", "14:40", "Contramuslos con calabacín", "INGREDIENTES\n· 400 g de contramuslos de pollo en dados\n· El calabacín en medias lunas\n· AOVE, sal, comino\nPROCESO\n1. Dora el pollo 8 min.\n2. Añade el calabacín, 6 min."),
  ev("n1", "2026-10-06", "21:00", "21:30", "Revuelto de huevo y queso de cabra", "· 3 huevos\n· Queso de cabra en trocitos\n· 1 rebanada de pan de molde integral tostada\nPROCESO\n1. Huevos a fuego bajo.\n2. Queso por encima."),
  ev("x1", "2026-10-07", "09:00", "09:20", "Desayuno · plátano y yogur", "· 1 plátano\n· 250 g de yogur natural"),
  ev("x2", "2026-10-07", "14:00", "14:30", "Tupper · Lentejas con chorizo", "LLÉVATE\n· Tupper de lentejas (descongelado desde anoche)\n· 1 plátano de postre"),
  ev("x3", "2026-10-07", "21:00", "21:30", "Pasta con atún y tomate frito", "INGREDIENTES\n· 90 g de macarrones\n· 1 lata de atún\n· Los 400 g de tomate frito que quedan\n· 2 rebanadas de pan de molde integral para mojar\nPROCESO\n1. Pasta a cocer 10 min.\n2. Mezcla con el atún y el tomate."),
  ev("s1", "2026-10-06", "17:00", "17:30", "🛒 Compra de la tarde", "1. Macarrones · 1 paquete\n2. Sartén · 1"),
  ev("a1", "2026-10-06", "22:00", "22:05", "❄️ Saca el tupper de lentejas a la nevera", "Pasa el tupper del congelador a la nevera.")
];
const D = Dp.despensa(NOTA);
const en = (iso) => { const ms = new Date(iso).getTime(); return { hoy: iso.slice(0, 10), ahora: iso.slice(11, 16), ahoraMs: ms }; };

test("la nota: zonas, lo que no hay y la compra con su fecha", () => {
  assert.equal(D.fecha, "2026-10-05");
  assert.deepEqual(D.zonas.map((z) => z.zona), ["Congelador", "Nevera", "Despensa salada", "Fruta y verdura", "Especias"]);
  assert.ok(D.zonas[0].items[0].tupper);
  assert.deepEqual(D.noHay, ["Pollo", "calabacín"]);
  assert.equal(D.compra.fecha, "2026-10-06");
  assert.ok(/solo si falta/i.test(D.compra.nota));
  const it = D.zonas[2].items.find((x) => /tomate/i.test(x.txt));
  assert.equal(it.nombre, "Tomate frito", "sin el bote ni los 400 g");
  assert.deepEqual(it.c, { n: 400, ud: "g" });
});

test("un recuento dictado se lee igual que la nota", () => {
  const R = Dp.despensa("Nevera: leche semi, 6 huevos, queso canario. Congelador: guiso de carne (440 g), arándanos. Despensa: pan rústico, 2 latas de atún. No hay: pollo");
  assert.deepEqual(R.zonas.map((z) => z.zona + ":" + z.items.length), ["Nevera:3", "Congelador:2", "Despensa salada:2"]);
  assert.deepEqual(R.noHay, ["pollo"]);
  const R2 = Dp.despensa("NEVERA\nleche, 2 yogures\nCONGELADOR:\nmango");
  assert.deepEqual(R2.zonas.map((z) => z.zona + ":" + z.items.length), ["Nevera:2", "Congelador:1"]);
});

test("cada comida, en su sitio: hecha, saltada, ahora, pasada, proxima", () => {
  const o = en("2026-10-06T14:10");
  assert.equal(Dp.estadoComida(COMIDAS[0], [], o), "pasada");
  assert.equal(Dp.estadoComida(COMIDAS[1], [], o), "ahora");
  assert.equal(Dp.estadoComida(COMIDAS[2], [], o), "proxima");
  assert.equal(Dp.estadoComida(COMIDAS[2], [{ id: "1", t: 1, tipo: "hecho", uid: "n1" }], o), "hecha");
  assert.equal(Dp.estadoComida(COMIDAS[2], [{ id: "1", t: 1, tipo: "saltada", uid: "n1" }], o), "saltada");
  // los gastos viejos, sin uid: por el titulo y el dia
  const viejo = { id: "g", t: new Date("2026-10-06T13:00").getTime(), tipo: "gasto", de: "Contramuslos con calabacín", items: ["400 g de contramuslos de pollo"] };
  assert.equal(Dp.estadoComida(COMIDAS[1], [viejo], o), "hecha");
  assert.equal(Dp.queToca(COMIDAS, [], o).uid, "c1");
  assert.equal(Dp.queToca(COMIDAS, [], en("2026-10-06T15:00")).uid, "n1", "la siguiente; ni la compra ni el aviso");
});

test("lo que hay: la nota, su compra y lo que ya se ha comido", () => {
  const H = Dp.casa(D, [], COMIDAS, en("2026-10-06T23:00"));
  const de = (re) => H.todos.find((x) => re.test(x.nombre));
  assert.equal(de(/^huevos/i).c.n, 5, "8 - 3 del revuelto");
  assert.equal(de(/plátanos/i).c.n, 5);
  assert.equal(de(/^tomates/i).c.n, 1, "2 - 1 del desayuno");
  assert.ok(!H.todos.some((x) => /contramuslos|pollo/i.test(x.nombre)), "el pollo de la compra se gasto en la comida");
  assert.ok(!H.todos.some((x) => /sart[eé]n/i.test(x.nombre)), "una sartén no es comida");
  assert.ok(de(/pan de molde/i).dudoso, "sin saber cuántas rebanadas había: ¿te queda?");
  assert.match(de(/pan de molde/i).razon, /3 gastadas desde el 5\/10/);
  assert.ok(de(/yogur/i).dudoso, "cantidad sin confirmar");
  assert.ok(!de(/macarrones/i) || de(/macarrones/i).dudoso, "la lista de la compra del plan no confirma nada");
  const claves = H.todos.map((x) => x.clave);
  assert.equal(new Set(claves).size, claves.length, "sin duplicados entre zonas");
});

test("lo apuntado: gasto con uid, me queda, se acabó, recuento", () => {
  const o = en("2026-10-06T23:00");
  const t = (h) => new Date("2026-10-06T" + h).getTime();
  // el gasto del paso a paso manda sobre lo del plan, y la comida no se gasta dos veces
  const g = [{ id: "g1", t: t("14:35"), tipo: "gasto", uid: "c1", de: "Contramuslos con calabacín", items: ["200 g de contramuslos de pollo"] }];
  let H = Dp.casa(D, g, COMIDAS, o);
  assert.equal(H.todos.find((x) => /contramuslos/i.test(x.nombre)).c.n, 200);
  // "Me queda" quita la duda; "Se acabó" lo quita
  H = Dp.casa(D, [{ id: "h", t: t("22:00"), tipo: "hay", items: ["pan de molde"] }], COMIDAS, o);
  assert.equal(H.todos.find((x) => /pan de molde/i.test(x.nombre)).dudoso, false);
  H = Dp.casa(D, [{ id: "a", t: t("22:00"), tipo: "acaba", items: ["Queso de cabra"] }], COMIDAS, o);
  assert.ok(!H.todos.some((x) => /cabra/i.test(x.nombre)));
  // un recuento nuevo es el punto de partida: lo de antes no cuenta
  H = Dp.casa(D, [{ id: "i", t: t("22:30"), tipo: "inventario", texto: "Nevera: 2 huevos, leche. Despensa: arroz" }], COMIDAS, o);
  assert.deepEqual(H.todos.map((x) => x.nombre).sort(), ["Arroz", "Huevos", "Leche"]);
  assert.equal(H.desde, "2026-10-06");
});

test("Comprar: solo lo que piden las comidas que no han empezado, por alimento", () => {
  const F = Dp.faltan(D, [], COMIDAS, en("2026-10-06T23:00"));
  assert.equal(F.hasta, "2026-10-07");
  assert.equal(F.n, 3);
  const ver = F.items.map((x) => x.ver + (x.dudoso ? "?" : ""));
  assert.ok(ver.includes("Macarrones?"), "salía en la compra del plan: puede que lo compraras");
  assert.match(F.items.find((x) => /Macarrones/.test(x.ver)).razon, /compra del 6\/10/);
  assert.ok(ver.includes("Pan de molde integral?"), "puede que no quede");
  assert.ok(ver.includes("Yogur natural?"));
  assert.ok(!ver.some((v) => /tomate frito|lentejas|sal|aove|comino|plátano|atún/i.test(v)), ver.join(", "));
  const pan = F.items.find((x) => /pan de molde/i.test(x.ver));
  assert.equal(pan.cant, "2 rebanadas");
  assert.equal(Dp.paraTxt(pan, "2026-10-06"), "Pasta con atún y tomate frito · mié");
  // a media mañana, el desayuno ya empezó: no cuenta; la comida y la cena, si
  const F2 = Dp.faltan(D, [], COMIDAS, en("2026-10-06T08:10"));
  assert.ok(!F2.items.some((x) => /^tomate$/i.test(x.ver)));
  assert.ok(F2.items.some((x) => /^Calabac/i.test(x.ver)) === false, "el calabacín viene en la compra de la nota");
  // si ya lo has marcado como hecho, no se compra
  const F3 = Dp.faltan(D, [{ id: "h", t: 1, tipo: "hecho", uid: "x3" }], COMIDAS, en("2026-10-06T23:00"));
  assert.ok(!F3.items.some((x) => /Macarrones/.test(x.ver)));
});

test("lo que se gastó según el plan y otra comida vuelve a pedir: ¿te queda?", () => {
  const C = [
    ev("p1", "2026-10-06", "20:00", "20:30", "Tostada de pavo", "· Todas las lonchas de pavo\n· 1 rebanada de pan de molde integral"),
    ev("p2", "2026-10-07", "20:00", "20:30", "Revuelto de pavo", "· 2 huevos\n· 3-4 lonchas de pavo")
  ];
  const F = Dp.faltan(D, [], C, en("2026-10-06T23:00"));
  const pavo = F.items.find((x) => /pavo/i.test(x.ver));
  assert.ok(pavo && pavo.dudoso, "no se compra a ciegas");
  assert.match(pavo.razon, /se acabó el 6\/10/);
  assert.equal(pavo.cant, "4 lonchas");
});

test("para Claude: lo que hay con el formato de la nota, y se vuelve a leer igual", () => {
  const o = en("2026-10-06T23:00"), H = Dp.casa(D, [], COMIDAS, o), T = Dp.textoClaude(H, o);
  assert.match(T, /^DESPENSA EN VIVO — última actualización: 06\/10\/2026/);
  assert.match(T, /\\## NEVERA/);
  assert.match(T, /\(¿queda\?\)/);
  const D2 = Dp.despensa(T), H2 = Dp.casa(D2, [], [], o);
  assert.deepEqual(H2.todos.map((x) => x.clave).sort(), H.todos.map((x) => x.clave).sort());
});

test("dónde se guarda lo que compras", () => {
  assert.equal(Dp.zonaPara("Pechuga de pollo"), "Nevera");
  assert.equal(Dp.zonaPara("Guisantes congelados"), "Congelador");
  assert.equal(Dp.zonaPara("Lentejas"), "Despensa salada");
  assert.equal(Dp.zonaPara("Miel"), "Despensa dulce");
  assert.equal(Dp.zonaPara("Plátanos"), "Fruta y verdura");
  assert.equal(Dp.zonaPara("Tomate triturado"), "Despensa salada");
  assert.equal(Dp.zonaPara("Comino"), "Especias");
});

test("seis zonas: la despensa seca de la nota se reparte entre dulce y salada; fresco es fruta y verdura", () => {
  const X = Dp.despensa("\## DESPENSA SECA\nMiel, avena, 2 latas de atún, rigatoni (500 g)\n\## FRESCO\n4 plátanos");
  assert.deepEqual(X.zonas.map((z) => z.zona + ":" + z.items.map((i) => i.nombre).join("+")),
    ["Despensa dulce:Miel+Avena", "Despensa salada:Atún+Rigatoni", "Fruta y verdura:Plátanos"]);
  const R = Dp.despensa("Fruta y verdura: tomates. Despensa dulce: cacao. Despensa salada: arroz");
  assert.deepEqual(R.zonas.map((z) => z.zona), ["Fruta y verdura", "Despensa dulce", "Despensa salada"]);
});

test("decir cuánto hay: la cantidad que dices es la que hay ahora", () => {
  const o = en("2026-10-06T23:00"), t = new Date("2026-10-06T22:00").getTime();
  const H = Dp.casa(D, [{ id: "c", t, tipo: "hay", items: ["3 rebanadas de pan de molde integral"] }], COMIDAS, o);
  const pan = H.todos.find((x) => /pan de molde/i.test(x.nombre));
  assert.deepEqual(pan.c, { n: 3, ud: "rebanada" });
  assert.equal(pan.dudoso, false);
  const H2 = Dp.casa(D, [{ id: "c", t, tipo: "hay", items: ["2 huevos"] }], COMIDAS, o);
  assert.equal(H2.todos.find((x) => /^huevos/i.test(x.nombre)).c.n, 2, "no se suma: es lo que hay");
});
