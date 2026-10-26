// Tests del copiloto de bici: leer la bici (potencia y FTMS), la velocidad, la voz que guia y el TCX.
//   node --test tests/bici.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const B = createRequire(import.meta.url)("../bici.js");
const le = (n) => [n & 255, (n >> 8) & 255];

test("potencia de ciclismo: vatios y biela", () => {
  // flags 0x20 (vueltas de biela), 167 W, biela 100 vueltas en t=2048 (2 s)
  const b = [0x20, 0x00, ...le(167), ...le(100), ...le(2048)];
  assert.deepEqual(B.leePotencia(b), { w: 167, biela: { rev: 100, t: 2048 } });
  // con balance de pedales (bit 0) la biela va 1 byte mas alla
  const c = [0x21, 0x00, ...le(200), 50, ...le(7), ...le(512)];
  assert.deepEqual(B.leePotencia(c), { w: 200, biela: { rev: 7, t: 512 } });
});

test("cadencia de la biela: 3 vueltas en 2 s = 90 rpm, y 0 si para", () => {
  const L = B.Lector();
  L.procesa("potencia", [0x20, 0, ...le(150), ...le(10), ...le(0)], 1000);
  const r = L.procesa("potencia", [0x20, 0, ...le(150), ...le(13), ...le(2048)], 3000);
  assert.equal(r.w, 150); assert.equal(r.cad, 90);
  // el contador de tiempo da la vuelta (65535 -> 0) y sigue bien
  L.procesa("potencia", [0x20, 0, ...le(150), ...le(14), ...le(65000)], 4000);
  assert.equal(L.procesa("potencia", [0x20, 0, ...le(150), ...le(15), ...le(488)], 5000).cad, 60);   // 1024 ticks = 1 s
  // sin noticias 5 s: todo a 0
  assert.deepEqual(L.ahora(11000), { w: 0, cad: 0, kmh: null, t: 5000 });
});

test("FTMS: velocidad, cadencia y vatios", () => {
  // flags: bit 2 (cadencia) + bit 6 (potencia); velocidad presente (bit 0 = 0)
  const b = [0x44, 0x00, ...le(3150), ...le(180), ...le(210)];
  assert.deepEqual(B.leeFTMS(b), { kmh: 31.5, cad: 90, w: 210 });
  const L = B.Lector();
  const r = L.procesa("ftms", b, 1000);
  assert.equal(r.kmh, 31.5); assert.equal(r.cad, 90); assert.equal(r.w, 210);
});

test("velocidad en llano: 167 W ronda los 32 km/h (como la BODY BIKE de hoy)", () => {
  const kmh = B.velDePotencia(167) * 3.6;
  assert.ok(kmh > 29 && kmh < 35, kmh);
  assert.equal(B.velDePotencia(0), 0);
});

test("la guia: corrige tras 8 s fuera, dice que tocar y no repite", () => {
  const G = B.Guia(), o = { vatios: 200, cad: [85, 95], tipo: "serie" };
  const paso = (t, w, cad) => G.paso({ i: 1, t, seg: 300, o, w, cad, ms: t * 1000 });
  assert.equal(paso(10, 150, 90), null);                       // al empezar no corrige
  assert.equal(paso(20, 150, 90), null);                       // fuera, pero aun no 8 s
  assert.match(paso(28, 150, 90), /Sube resistencia/);         // buena cadencia -> resistencia
  assert.equal(paso(35, 150, 90), null);                       // no repite antes de 20 s
  assert.equal(paso(40, 200, 90), null);
  assert.equal(paso(46, 200, 90), "Así, vas bien.");           // vuelve y se le dice
});

test("la guia: con cadencia baja pide pedalear mas rapido; con alta, bajarla", () => {
  let G = B.Guia(); const o = { vatios: 200, cad: [85, 95] };
  G.paso({ i: 0, t: 20, seg: 300, o, w: 150, cad: 70, ms: 20000 });
  assert.match(G.paso({ i: 0, t: 28, seg: 300, o, w: 150, cad: 70, ms: 28000 }), /Pedalea más rápido/);
  G = B.Guia();
  G.paso({ i: 0, t: 20, seg: 300, o, w: 250, cad: 105, ms: 20000 });
  assert.match(G.paso({ i: 0, t: 28, seg: 300, o, w: 250, cad: 105, ms: 28000 }), /Baja la cadencia/);
  G = B.Guia();                                                // vatios bien, cadencia fuera
  G.paso({ i: 0, t: 20, seg: 300, o, w: 200, cad: 75, ms: 20000 });
  assert.match(G.paso({ i: 0, t: 28, seg: 300, o, w: 200, cad: 75, ms: 28000 }), /Cadencia un poco más alta/);
});

test("la guia calla en los ultimos 8 s del bloque", () => {
  const G = B.Guia(), o = { vatios: 200 };
  G.paso({ i: 0, t: 50, seg: 60, o, w: 100, cad: 80, ms: 50000 });
  assert.equal(G.paso({ i: 0, t: 58, seg: 60, o, w: 100, cad: 80, ms: 58000 }), null);
});

test("anuncio del bloque", () => {
  const t = B.anuncio({ nombre: "Serie", vatios: 220, cad: [90, 100], seg: 180 }, 2, 5);
  assert.equal(t, "Serie 2 de 5. 220 vatios, cadencia 90 a 100. 3 minutos.");
  assert.equal(B.anuncio({ nombre: "Serie 3", vatios: 200, seg: 60 }, 3, 5), "Serie 3 de 5. 200 vatios. 1 minuto.");
  assert.equal(B.durVoz(90), "1 minuto 30");
  assert.equal(B.durVoz(45), "45 segundos");
});

test("TCX y resumen", () => {
  const M = [[0, 100, 80, 0], [1, 200, 90, 8.5], [2, 300, 100, 17.4]];
  const x = B.tcx(M, Date.UTC(2026, 9, 26, 16, 46, 51));
  assert.match(x, /<Id>2026-10-26T16:46:51Z<\/Id>/);
  assert.match(x, /<ns3:Watts>300<\/ns3:Watts>/);
  assert.equal((x.match(/<Trackpoint>/g) || []).length, 3);
  assert.deepEqual(B.resumenDe(M), { seg: 2, km: 0.0174, w: 200, kj: 1, cad: 90 });
});

test("Worker: el plan de bici del calendario", async () => {
  const { normaliza } = await import("../worker/src/app.js");
  const p = normaliza({ tipo: "bici", nombre: "4×4 min", bloques: [
    { tipo: "calentar", vatios: 120, cad: [80, 90], seg: 600 },
    { tipo: "serie", nombre: "Serie 1", vatios: "220", cad: [100, 90], seg: 240 },
    { tipo: "recupera", vatios: 130, seg: 180 }
  ] });
  assert.equal(p.tipo, "bici");
  assert.deepEqual(p.bloques[1], { tipo: "serie", nombre: "Serie 1", vatios: 220, seg: 240, cad: [90, 100] });
  assert.equal(p.bloques[2].tipo, "suave"); assert.equal(p.bloques[2].nombre, "Suave");
  assert.deepEqual(p.total, { seg: 1020, kj: Math.round((120 * 600 + 220 * 240 + 130 * 180) / 1000) });
  assert.throws(() => normaliza({ tipo: "bici", bloques: [{ tipo: "serie", seg: 60 }] }), /vatios/);
});
