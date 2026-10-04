// Tests de Casa (v2.40): «Por confirmar», los tuppers del congelador y «¿Cuánto queda?». Datos de ejemplo.
//   node --test tests/casa.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Rc = require("../receta.js"), Dp = require("../despensa.js");
const NOTA = "DESPENSA EN VIVO — última actualización: 01/10/2026\n\\## CONGELADOR\n- Tupper: albóndigas con rigatoni\n- Tupper: lentejas\nArroz de microondas\n" +
  "\\## NEVERA\nLeche semi, 4 huevos (sin confirmar)\n\\## DESPENSA SECA\n500 g de macarrones, 2 latas de atún";
const ev = (uid, fecha, hora, fin, titulo, texto) => Rc.leer({ uid, fuente: "comida", fecha, hora, fin, titulo, texto });
const PASTA = ev("c1", "2026-10-02", "14:00", "14:30", "Pasta con atún", "INGREDIENTES\n· 100 g de macarrones\n· 1 lata de atún\n· Básicos: sal, AOVE\nPROCESO\n1. Cuece la pasta 9 min.");
const CENA = ev("c2", "2026-10-02", "21:00", "21:30", "Tortilla", "INGREDIENTES\n· 2 huevos\nPROCESO\n1. Bate y cuaja 4 min.");
const o = (iso) => ({ ahoraMs: Date.parse(iso), hoy: iso.slice(0, 10) });

function casa(cambios, ahora) { const D = Dp.despensa(NOTA); return Dp.casa(D, cambios, [PASTA, CENA], o(ahora)); }

test("por confirmar: la comida que ya acabó y nadie apuntó, con lo que gastó (sin básicos)", () => {
  const H = casa([], "2026-10-02T16:00:00");
  const P = Dp.porConfirmar([], [PASTA, CENA], H, o("2026-10-02T16:00:00"));
  const c = P.filter((x) => x.tipo === "comida");
  assert.equal(c.length, 1); assert.equal(c[0].R.uid, "c1");
  assert.deepEqual(c[0].items, ["100 g de macarrones", "1 lata de atún"]);
  // y la duda de los huevos
  assert.ok(P.some((x) => x.tipo === "duda" && /huevo/i.test(x.item.nombre)));
});

test("por confirmar: «Así fue», «No la hice» o una comida de hace más de 3 días ya no salen", () => {
  const gasto = [{ id: "g1", t: Date.parse("2026-10-02T16:01:00"), tipo: "gasto", uid: "c1", items: ["100 g de macarrones", "1 lata de atún"] }];
  assert.equal(Dp.porConfirmar(gasto, [PASTA], casa(gasto, "2026-10-02T16:05:00"), o("2026-10-02T16:05:00")).filter((x) => x.tipo === "comida").length, 0);
  const no = [{ id: "s1", t: Date.parse("2026-10-02T16:01:00"), tipo: "saltada", uid: "c1" }];
  assert.equal(Dp.porConfirmar(no, [PASTA], casa(no, "2026-10-02T16:05:00"), o("2026-10-02T16:05:00")).filter((x) => x.tipo === "comida").length, 0);
  assert.equal(Dp.porConfirmar([], [PASTA], casa([], "2026-10-06T16:00:00"), o("2026-10-06T16:00:00")).filter((x) => x.tipo === "comida").length, 0);
});

test("por confirmar: lo marcado en Comprar sale hasta que lo confirmas; lo escaneado, no", () => {
  const t = Date.parse("2026-10-02T10:00:00");
  const CB = [{ id: "k1", t, tipo: "compra", items: ["Contramuslos de pollo"], lista: "f:pollo", zona: "Nevera" },
              { id: "k2", t, tipo: "compra", items: ["240 g de mejillones en lata"], zona: "Despensa salada", codigo: "8400000000001" }];
  const P = Dp.porConfirmar(CB, [], casa(CB, "2026-10-02T11:00:00"), o("2026-10-02T11:00:00")).filter((x) => x.tipo === "compra");
  assert.deepEqual(P.map((x) => x.cb.id), ["k1"]);
  const ok = CB.concat([{ id: "c9", t: t + 1, tipo: "confirma", ref: "compra:k1" }]);
  assert.equal(Dp.porConfirmar(ok, [], casa(ok, "2026-10-02T11:00:00"), o("2026-10-02T11:00:00")).filter((x) => x.tipo === "compra").length, 0);
});

test("tuppers: cuenta los del congelador (el plan admite 3)", () => {
  assert.equal(Dp.tuppers(casa([], "2026-10-01T23:59:59")), 2);
  const mas = [{ id: "x", t: Date.parse("2026-10-02T09:00:00"), tipo: "compra", items: ["Tupper: curry de pollo"], zona: "Congelador" }];
  assert.equal(Dp.tuppers(casa(mas, "2026-10-02T09:30:00")), 3);
  assert.equal(Dp.MAX_TUPPERS, 3);
});

test("fracciones: lleno, ¾, ½ y ¼ del paquete o de lo que hay; sin gramos, nada", () => {
  assert.deepEqual(Dp.fracciones({ n: 1000, ud: "g" }).map((f) => f.txt + " " + f.c.n), ["Lleno 1000", "¾ 750", "½ 500", "¼ 250"]);
  assert.deepEqual(Dp.fracciones({ n: 300, ud: "g" }, { n: 500, ud: "g" }).map((f) => f.c.n), [500, 380, 250, 130]);
  assert.deepEqual(Dp.fracciones({ n: 3, ud: "lata" }), []);
});
