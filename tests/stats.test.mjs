// Tests de las estadisticas: bloques, semanas, carga, records y gimnasio.
//   node --test tests/*.test.mjs
// Sin dependencias: stats.js se carga con require() y no toca el DOM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const S = createRequire(import.meta.url)("../stats.js");
const HOY = "2026-09-29";   // martes

const run = (fecha, km, min, extra = {}) => ({ fecha, hora: "08:00", fuente: "strava", deporte: "Run", distancia: km * 1000, mov: min * 60, ...extra });
const gym = (fecha, ejercicios, extra = {}) => ({ id: "hevy-" + fecha, fecha, hora: "19:00", fuente: "hevy", deporte: "WeightTraining",
  mov: 3600, series: 6, reps: 48, volumenKg: 1000, ejercicios, ...extra });
const ej = (titulo, sets) => ({ titulo, sets: sets.map(([kg, reps, tipo = "normal"]) => ({ tipo, kg, reps })) });

test("lunes y mas: semanas de lunes a domingo", () => {
  assert.equal(S.lunes(HOY), "2026-09-28");
  assert.equal(S.lunes("2026-09-28"), "2026-09-28");
  assert.equal(S.lunes("2026-10-04"), "2026-09-28");
  assert.equal(S.mas("2026-10-24", 2), "2026-10-26");   // cambio de hora
});

test("bloque: km, ritmo ponderado por distancia, FC por tiempo, cinta y gym aparte", () => {
  const A = [run("2026-09-20", 10, 50, { fcMedia: 150 }), run("2026-09-22", 5, 30, { cinta: true, fcMedia: 160 }),
             gym("2026-09-21", []), { fecha: "2026-09-21", fuente: "strava", deporte: "Walk", distancia: 3000, mov: 1800 }];
  const b = S.bloque(A, "2026-09-15", "2026-09-28");
  assert.equal(b.carreras, 2);
  assert.equal(b.km, 15);
  assert.equal(b.kmCinta, 5);
  assert.equal(b.ritmo, (80 * 60) / 15);              // 5:20/km
  assert.equal(b.fc, Math.round((150 * 3000 + 160 * 1800) / 4800));
  assert.equal(b.gym, 1);
  assert.equal(b.dias, 3);                              // el paseo no cuenta
  assert.equal(b.larga, 10);
});

test("bloque vacio: sin ritmo ni FC inventados", () => {
  const b = S.bloque([], "2026-09-01", "2026-09-28");
  assert.equal(b.km, 0); assert.equal(b.ritmo, null); assert.equal(b.fc, null);
});

test("semanas: 12 semanas, la ultima es la actual", () => {
  const W = S.semanas([run("2026-09-28", 8, 40), run("2026-09-21", 6, 30)], HOY, 12);
  assert.equal(W.length, 12);
  assert.equal(W[11].desde, "2026-09-28"); assert.equal(W[11].actual, true); assert.equal(W[11].km, 8);
  assert.equal(W[10].km, 6);
  assert.equal(W[0].desde, "2026-07-13");
});

test("carga: 7 dias frente a la media semanal de 28", () => {
  const A = [];
  for (let i = 0; i < 28; i += 2) A.push(run(S.mas(HOY, -i), 5, 25));   // 14 salidas de 5 km: 70 km / 4 = 17,5
  const c = S.carga(A, HOY);
  assert.equal(c.cronico, 17.5);
  assert.equal(c.agudo, 20);                                             // dias 0,2,4,6
  assert.equal(c.estado, "normal");
  assert.equal(S.carga([run(HOY, 3, 15)], HOY).ratio, null);             // poca base: no se dice nada
  assert.equal(S.carga([run(HOY, 30, 150), run(S.mas(HOY, -20), 5, 25)], HOY).estado, "alta");
});

test("records: tirada mas larga y mejor ritmo medio en 5 km o mas", () => {
  const A = [run("2026-09-01", 18, 99), run("2026-09-05", 5, 24), run("2026-09-06", 3, 12)];
  const r = S.records(A, "2026-08-01", HOY);
  assert.equal(r.larga.distancia, 18000);
  assert.equal(r.rapido.ritmo, 24 * 60 / 5);         // el de 3 km no cuenta
});

test("e1rm (Epley) y mejor serie sin calentamiento", () => {
  assert.equal(S.e1rm(100, 1), 100);
  assert.equal(S.e1rm(90, 6), 108);
  assert.equal(S.e1rm(50, 20), null);
  const m = S.mejorSerie(ej("Sentadilla", [[120, 3, "warmup"], [90, 6], [95, 3]]));
  assert.deepEqual([m.kg, m.reps], [90, 6]);          // 108 > 104,5; el calentamiento no cuenta
});

test("ejercicios: progresion por ejercicio y anterior de una sesion", () => {
  const g1 = gym("2026-09-10", [ej("Sentadilla", [[80, 8]]), ej("Remo", [[50, 10]])]);
  const g2 = gym("2026-09-17", [ej("sentadilla ", [[82.5, 8]])]);
  const g3 = gym("2026-09-24", [ej("Sentadilla", [[85, 8]])]);
  const E = S.ejercicios([g3, g1, g2], "2026-09-01", HOY);
  assert.equal(E[0].titulo, "Sentadilla");
  assert.equal(E[0].sesiones.length, 3);
  assert.ok(Math.abs(E[0].cambio - 0.0625) < 1e-9);  // 80 -> 85 con las mismas reps
  assert.equal(E[1].cambio, null);                   // una sola sesion: sin cambio
  const a = S.anterior([g1, g2, g3], g3, "Sentadilla");
  assert.equal(a.fecha, "2026-09-17"); assert.equal(a.kg, 82.5);
  assert.equal(S.anterior([g1, g2, g3], g1, "Sentadilla"), null);
});
