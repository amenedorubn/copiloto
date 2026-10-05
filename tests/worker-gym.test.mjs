// El lector de gimnasio del Worker (worker/src/index.js, autoPlan): los ejercicios tienen que salir
// del texto del evento para verse en la tarjeta del día sin abrir las notas. Datos ficticios.
//   node --test tests/worker-gym.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { autoPlan } from "../worker/src/index.js";

test("gimnasio en forma corta: «1️⃣ NOMBRE · 50 lbs · 3 × 10 · descanso 2:00» da los ejercicios", () => {
  const txt = [
    "GYM X · PUSH", "", "CALENTAMIENTO", "Press de ejemplo · 1 serie × 8 reps con 20 lbs. Solo esto.", "",
    "1️⃣ PRESS DE EJEMPLO (MÁQUINA) · 50 lbs · 3 × 10 · descanso 2:30 · PRIMERO",
    "2️⃣ APERTURAS DE PRUEBA · 30 lbs · 3 × 12 · descanso 1:30",
    "3️⃣ FONDOS FICTICIOS · 40 kg · 2 × 8-10",
    "TOPE: si una serie va a bajar de 8 reps, la cortas ahí."
  ].join("\n");
  const p = autoPlan(txt, "Gym X · Push", "Gimnasio");
  assert.ok(p, "tiene que haber plan: sin él la tarjeta no enseña los ejercicios");
  assert.equal(p.tipo, "gym");
  assert.deepEqual(p.ejercicios.map((e) => [e.nombre, e.series, e.reps, e.peso, e.unidad, e.descanso]), [
    ["PRESS DE EJEMPLO (MÁQUINA)", 3, "10", 50, "lbs", 150],
    ["APERTURAS DE PRUEBA", 3, "12", 30, "lbs", 90],
    ["FONDOS FICTICIOS", 2, "8-10", 40, "kg", 90]
  ]);
  assert.equal(p.total.series, 8);
});

test("gimnasio con «Serie N — …» sigue igual, y esas líneas mandan sobre la forma corta", () => {
  const txt = [
    "1️⃣ JALÓN DE EJEMPLO · descanso 2:00", "Serie 1 — 40 lbs × 10 reps", "Serie 2 — 40 lbs × 10 reps",
    "2️⃣ REMO DE PRUEBA · 99 lbs · 4 × 6", "Serie 1 — 35 lbs × 12 reps"
  ].join("\n");
  const p = autoPlan(txt, "Gym Y · Pull", "");
  assert.deepEqual(p.ejercicios.map((e) => [e.nombre, e.series, e.reps, e.peso, e.descanso]), [
    ["JALÓN DE EJEMPLO", 2, "10", 40, 120],
    ["REMO DE PRUEBA", 1, "12", 35, 90]
  ]);
});

test("un texto de gimnasio sin ejercicios no se inventa un plan", () => {
  assert.equal(autoPlan("4 ejercicios, 3 series. Sin llegar al fallo.", "Gym X · Push", ""), null);
});
