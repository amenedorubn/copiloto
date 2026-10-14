// Tests de la prediccion de carrera (media de Roma): llegada, margen, ritmos
// para cada objetivo, ventanas del mapa y voz.   node --test tests/prediccion.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const P = createRequire(import.meta.url)("../prediccion.js");
const D = 21097.5, OBJ = [6600, 6300];   // sub-1:50 (manda) y sub-1:45
const SUELO = [[0, 0], [5, 1575], [10, 3125], [15, 4675], [20, 6225], [21.0975, 6565]];
const ATAQUE = [[0, 0], [5, 1575], [10, 3115], [15, 4635], [20, 6135], [21.0975, 6465]];
const dp = (s) => { s = Math.round(s); const m = Math.floor(s / 60), g = s % 60; return m + " " + (g === 0 ? "justos" : g < 10 ? "cero " + g : g); };

test("km 10 en 51:56: llegada 1:49:34, 26 s de margen, 5:14 y 4:47", () => {
  const p = P.calcula(10000, 3116, D, OBJ);
  assert.equal(p.listo, true);
  assert.equal(P.hms(p.llegada), "1:49:34");
  assert.equal(Math.round(p.margen), 26);
  assert.equal(P.colorMargen(p.margen), "warn");
  assert.equal(P.paceTxt(p.ritmos[0].ritmo), "5:14");
  assert.equal(P.paceTxt(p.ritmos[1].ritmo), "4:47");
});

test("km 8 en 41:20 a 5:10: llegada 1:49:00, verde", () => {
  const p = P.calcula(8000, 2480, D, OBJ);
  assert.equal(P.hms(p.llegada), "1:49:00");
  assert.equal(P.colorMargen(p.margen), "ok");
  assert.equal(P.paceTxt(p.ritmos[0].ritmo), "5:15");
  assert.equal(P.paceTxt(p.ritmos[1].ritmo), "4:52");
});

test("antes del km 1: calculando", () => {
  const p = P.calcula(600, 190, D, OBJ);
  assert.equal(p.listo, false);
  assert.equal(p.ritmos.length, 2);
  assert.equal(P.fraseVoz(p), "");
});

test("km 19 en 1:38:54: 1:45 fuera de alcance (más de 3:30), 1:50 a 5:18", () => {
  const p = P.calcula(19000, 5934, D, OBJ);
  assert.equal(p.ritmos[1].ritmo, null);
  assert.equal(p.ritmos[1].fuera, true);
  assert.equal(P.paceTxt(p.ritmos[0].ritmo), "5:18");
  assert.equal(P.colorMargen(p.margen), "warn");
});

test("3:30 justos todavía da; más rápido ya no", () => {
  const t = 6300 - 210 * 2;               // quedan 2 km y faltan 420 s para 1:45
  assert.equal(P.calcula(D - 2000, t, D, OBJ).ritmos[1].fuera, false);
  assert.equal(P.calcula(D - 2000, t + 5, D, OBJ).ritmos[1].fuera, true);
});

test("pasado de 1:50: rojo y sin ritmo", () => {
  const p = P.calcula(20000, 6650, D, OBJ);
  assert.equal(P.colorMargen(p.margen), "bad");
  assert.equal(p.ritmos[0].ritmo, null);
});

test("fantasma a ritmo constante y tabla de carteles", () => {
  assert.equal(Math.round(P.fantasma(6600, 6600, D)), Math.round(D));
  assert.equal(Math.round(P.fantasma(3300, 6600, D)), Math.round(D / 2));
  assert.equal(P.enTabla(SUELO, 1575), 5000);
  assert.equal(Math.round(P.enTabla(SUELO, 3125)), 10000);
  assert.equal(Math.round(P.enTabla(ATAQUE, 3115)), 10000);
  assert.equal(Math.round(P.enTabla(SUELO, 99999)), 21098);
});

test("ventanas y línea de estado", () => {
  const v = P.ventanas(3116, D, OBJ, SUELO, ATAQUE);
  assert.ok(v.azul[0] < v.naranja[0] && v.naranja[1] < v.azul[1]);
  assert.equal(P.estado(10000, v).txt, "Entre suelo y ataque");
  assert.equal(P.estado(9980, v).col, "ok");
  const v15 = P.ventanas(4732, D, OBJ, SUELO, ATAQUE);
  const e = P.estado(15000, v15);
  assert.equal(e.col, "bad");
  assert.match(e.txt, /^1[23]0 m por detrás de sub 1:50$/);
  assert.equal(P.estado(v15.lento + 20, v15).col, "warn");
  assert.match(P.estado(v15.rapido + 100, v15).txt, /por delante de sub 1:45/);
});

test("voz", () => {
  assert.equal(P.fraseVoz(P.calcula(10000, 3116, D, OBJ)),
    "Marca prevista: 1 hora, 49 minutos y 34 segundos.");
  assert.equal(P.fraseVoz(P.calcula(600, 190, D, OBJ)), "");
  assert.equal(P.tiempoVoz(6600), "1 hora y 50 minutos");
  assert.equal(P.tiempoVoz(6305), "1 hora, 45 minutos y 5 segundos");
  assert.equal(P.tiempoVoz(2004), "33 minutos y 24 segundos");
  assert.equal(P.tiempoVoz(3600), "1 hora y 0 minutos");
  // nunca dos numeros seguidos sin unidad: es lo que el sintetizador lee como una hora del dia
  for (const s of [6574, 6600, 3601, 2004, 59]) assert.doesNotMatch(P.tiempoVoz(s), /\d+\s+\d+/);
});

test("salida contenida a 5:15: por detrás del suelo en ámbar, no del 1:50 en rojo", () => {
  const v = P.ventanas(200, D, OBJ, SUELO, ATAQUE);   // a 5:15 justos irías por el 634
  const e = P.estado(600, v);
  assert.equal(e.col, "warn");
  assert.match(e.txt, /por detrás del suelo/);
});

test("plan de prueba por ritmos: la distancia sale de la ruta", () => {
  const C = P.resuelve({ distancia: null, ritmos: { objetivos: [430, 410], suelo: 425, ataque: 415 },
    etiquetas: ["A 7:10", "A 6:50"], nombres: { lento: "7:10", rapido: "6:50" },
    voz: [{ para: "Para media de 7 10", no: "Media de 7 10 ya no da" }, { para: "Para media de 6 50", no: "Media de 6 50 ya no da" }] }, 6000);
  assert.equal(C.distancia, 6000);
  assert.deepEqual(C.objetivos.map(Math.round), [2580, 2460]);
  assert.equal(Math.round(P.enTabla(C.suelo, 425 * 3)), 3000);
  const p = P.calcula(3000, 3 * 420, C.distancia, C.objetivos);
  assert.equal(P.hms(p.llegada), "42:00");
  assert.equal(P.fraseVoz(p), "Marca prevista: 42 minutos.");
  const v = P.ventanas(3 * 420, C.distancia, C.objetivos, C.suelo, C.ataque);
  assert.equal(P.estado(3000, v, C.nombres).txt, "Entre suelo y ataque");
});

test("Roma resuelta igual que antes", () => {
  const C = P.resuelve({ distancia: D, objetivos: OBJ, suelo: SUELO, ataque: ATAQUE });
  assert.deepEqual(C.etiquetas, ["Sub 1:50", "Sub 1:45"]);
  assert.equal(C.voz, null);
});

test("voz: los objetivos en palabras, nunca como una hora", () => {
  const C = P.resuelve({ distancia: D, objetivos: [6599, 6299], suelo: SUELO, ataque: ATAQUE });
  assert.deepEqual(C.nombres, { lento: "sub 1:50", rapido: "sub 1:45" });
  assert.deepEqual(C.nombresVoz, { lento: "sub uno cincuenta", rapido: "sub uno cuarenta y cinco" });
  const v = P.ventanas(4732, D, C.objetivos, SUELO, ATAQUE);
  const tv = P.estado(15000, v, C.nombresVoz).txt;
  assert.match(tv, /m por detrás de sub uno cincuenta$/);
  assert.doesNotMatch(tv, /\d[:\s]\d\d/);
  assert.equal(P.objPalabras(2580), "cuarenta y tres");
  assert.equal(P.objPalabras(6450), "uno cuarenta y ocho");
});

test("pasada la meta, la voz no da marca prevista", () => {
  assert.equal(P.fraseVoz(P.calcula(4100, 1700, 4000, [1680, 1600])), "");
  assert.equal(P.fraseVoz(P.calcula(21100, 6550, D, OBJ)), "");
});
