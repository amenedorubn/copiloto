// Tests de Arc: dias, semanas, prologo, reglas y datos.
//   node --test tests/
// Sin dependencias: arc.js se carga con require() y no toca el DOM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const Arc = createRequire(import.meta.url)("../arc.js");

function almacen(inicial = {}) {
  const m = { ...inicial };
  return { m, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } };
}
function conReglas(...reglas) {
  const D = Arc.vacio();
  for (const r of reglas) assert.ok(Arc.anadeRegla(D, r, "2026-09-28").ok);
  return D;
}
const run = (fecha) => ({ fecha, fuente: "strava", deporte: "Run" });
const gym = (fecha) => ({ fecha, fuente: "hevy", deporte: "WeightTraining" });

/* ------------------------------- dias ------------------------------- */
test("la temporada tiene 92 dias: del 1/10 al 31/12", () => {
  assert.equal(Arc.TOTAL, 92);
  assert.equal(Arc.diaArc("2026-10-01"), 1);
  assert.equal(Arc.diaArc("2026-10-12"), 12);
  assert.equal(Arc.diaArc("2026-12-31"), 92);
  assert.equal(Arc.diaArc("2026-09-30"), null);
  assert.equal(Arc.diaArc("2027-01-01"), null);
});
test("el cambio de hora del 25/10 no se come ni repite un dia", () => {
  assert.equal(Arc.diaArc("2026-10-25"), 25);
  assert.equal(Arc.diaArc("2026-10-26"), 26);
  assert.equal(Arc.mas("2026-10-24", 2), "2026-10-26");
});
test("fase de cada fecha", () => {
  assert.equal(Arc.fase("2026-08-31"), null);
  assert.equal(Arc.fase("2026-09-01"), "prologo");
  assert.equal(Arc.fase("2026-09-30"), "prologo");
  assert.equal(Arc.fase("2026-10-01"), "temporada");
  assert.equal(Arc.fase("2026-12-31"), "temporada");
  assert.equal(Arc.fase("2027-01-01"), null);
});

/* ------------------------------ semanas ------------------------------ */
test("13 semanas que suman 92 dias, sin huecos", () => {
  assert.equal(Arc.SEMANAS.length, 13);
  assert.equal(Arc.SEMANAS.reduce((s, x) => s + x.dias, 0), 92);
  for (let i = 1; i < Arc.SEMANAS.length; i++)
    assert.equal(Arc.SEMANAS[i].desde, Arc.mas(Arc.SEMANAS[i - 1].hasta, 1));
});
test("cada semana acaba en domingo salvo la ultima (31/12)", () => {
  const dom = (iso) => new Date(iso + "T12:00:00Z").getUTCDay() === 0;
  Arc.SEMANAS.slice(0, -1).forEach((s) => assert.ok(dom(s.hasta), `semana ${s.n} acaba ${s.hasta}`));
  assert.equal(Arc.SEMANAS[12].hasta, "2026-12-31");
});
test("dia 12 = semana 2; la primera semana va del 1 al 11/10", () => {
  assert.equal(Arc.semanaArc("2026-10-01"), 1);
  assert.equal(Arc.semanaArc("2026-10-11"), 1);
  assert.equal(Arc.semanaArc("2026-10-12"), 2);
  assert.equal(Arc.semanaArc("2026-10-18"), 2);
  assert.equal(Arc.semanaArc("2026-10-19"), 3);
  assert.equal(Arc.semanaArc("2026-12-28"), 13);
  assert.equal(Arc.semanaArc("2026-12-31"), 13);
  assert.equal(Arc.semanaArc("2026-09-30"), null);
});
test("la revision de una semana se abre su domingo, no antes", () => {
  const D = conReglas({ nombre: "Leer", tipo: "manual" }, { nombre: "Estirar", tipo: "manual" }, { nombre: "Agua", tipo: "manual" });
  const sab = Arc.revision(D, "2026-10-17", []).find((s) => s.n === 2);
  const dom = Arc.revision(D, "2026-10-18", []).find((s) => s.n === 2);
  const lun = Arc.revision(D, "2026-10-19", []).find((s) => s.n === 2);
  assert.equal(sab.abierta, false);
  assert.equal(dom.abierta, true);
  assert.equal(dom.pasada, false);
  assert.equal(lun.pasada, true);
  assert.equal(Arc.revision(D, "2026-10-19", []).length, 3);   // la 3 ya esta en curso
});

/* ------------------------------ prologo ------------------------------ */
test("el prologo solo cuenta lo automatico y no se puede marcar", () => {
  const D = conReglas({ tipo: "auto", fuente: "correr" }, { nombre: "Leer", tipo: "manual" }, { tipo: "auto", fuente: "gym" });
  const e = Arc.estadoDia(D, "2026-09-10", "2026-09-28", [run("2026-09-10"), gym("2026-09-10")]);
  assert.equal(e.fase, "prologo");
  assert.equal(e.reglas[1].ok, null);          // la manual no cuenta
  assert.equal(e.cuentan, 2);
  assert.equal(e.estado, "cumplido");
  assert.ok(Arc.marcaCheck(D, "2026-09-28", D.reglas[1].id, true, "2026-09-28").error);
});
test("resumen del prologo: dias pasados y hoy solo si ya esta hecho", () => {
  const D = conReglas({ tipo: "auto", fuente: "correr" }, { nombre: "Leer", tipo: "manual" }, { nombre: "Agua", tipo: "manual" });
  const A = [run("2026-09-01"), run("2026-09-03"), run("2026-08-31")];
  const R = Arc.resumenPrologo(D, "2026-09-05", A);
  assert.equal(R.dias, 4);                     // 1, 2, 3 y 4; el 5 (hoy) aun no
  assert.equal(R.cumplidos, 2);
  assert.equal(R.porRegla[0].ok, 2);
  assert.equal(R.porRegla[1].total, 0);        // manual: nada que contar
  assert.equal(Arc.resumenPrologo(D, "2026-09-05", A.concat(run("2026-09-05"))).dias, 5);
});
test("el 31/08 queda fuera del prologo, pero sus datos no rompen nada", () => {
  const D = conReglas({ tipo: "auto", fuente: "correr" }, { nombre: "Leer", tipo: "manual" }, { nombre: "Agua", tipo: "manual" });
  Arc.registraAuto(D, [run("2026-08-31")], "2026-09-28");
  assert.deepEqual(D.auto, {});
});

/* ------------------------------- reglas ------------------------------- */
test("de 3 a 5 reglas; la sexta no entra", () => {
  const D = Arc.vacio();
  for (let i = 1; i <= 5; i++) assert.ok(Arc.anadeRegla(D, { nombre: "R" + i, tipo: "manual" }, "2026-09-28").ok);
  assert.match(Arc.anadeRegla(D, { nombre: "R6", tipo: "manual" }, "2026-09-28").error, /máximo/);
});
test("se editan hasta el 30/09 y se bloquean el 1/10", () => {
  const D = conReglas({ nombre: "Leer", tipo: "manual" });
  const id = D.reglas[0].id;
  assert.ok(Arc.editaRegla(D, id, { nombre: "Leer 20 min", tipo: "manual" }, "2026-09-30").ok);
  assert.ok(Arc.anadeRegla(D, { nombre: "Agua", tipo: "manual" }, "2026-10-01").error);
  assert.ok(Arc.editaRegla(D, id, { nombre: "Otra", tipo: "manual" }, "2026-10-01").error);
  assert.ok(Arc.borraRegla(D, id, "2026-10-01").error);
  assert.equal(D.reglas[0].nombre, "Leer 20 min");
});
test("una automatica sin nombre toma el de su fuente", () => {
  const D = conReglas({ tipo: "auto", fuente: "gym" });
  assert.equal(D.reglas[0].nombre, "Gimnasio");
  assert.ok(Arc.anadeRegla(D, { tipo: "auto", fuente: "nada" }, "2026-09-28").error);
  assert.ok(Arc.anadeRegla(D, { nombre: "   ", tipo: "manual" }, "2026-09-28").error);
});

/* ---------------------------- temporada ---------------------------- */
test("un fallo no reinicia nada: se cuentan los dias cumplidos", () => {
  const D = conReglas({ tipo: "auto", fuente: "entreno" }, { nombre: "Leer", tipo: "manual" }, { nombre: "Agua", tipo: "manual" });
  const [, leer, agua] = D.reglas.map((r) => r.id);
  const hoy = "2026-10-06";
  const A = ["2026-10-01", "2026-10-02", "2026-10-04", "2026-10-05"].map(run);
  for (const d of ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"]) {
    Arc.marcaCheck(D, d, leer, true, hoy); Arc.marcaCheck(D, d, agua, true, hoy);
  }
  const R = Arc.resumen(D, hoy, A);
  assert.equal(R.dias, 5);                     // el 6 (hoy) sin cerrar no cuenta
  assert.equal(R.cumplidos, 4);                // el 3 fallo y los demas siguen contando
  assert.equal(R.porRegla[0].pct, 80);
  assert.equal(R.porRegla[1].pct, 100);
});
test("aviso con 2 fallos seguidos (hasta ayer), no con 1", () => {
  const D = conReglas({ nombre: "Leer", tipo: "manual" }, { nombre: "Agua", tipo: "manual" }, { nombre: "Estirar", tipo: "manual" });
  const id = D.reglas.map((r) => r.id);
  const todo = (d) => id.forEach((x) => Arc.marcaCheck(D, d, x, true, "2026-10-10"));
  todo("2026-10-01"); todo("2026-10-02");
  assert.equal(Arc.fallosSeguidos(D, "2026-10-04", []), 1);   // fallo el 3
  assert.equal(Arc.fallosSeguidos(D, "2026-10-05", []), 2);   // fallos el 3 y el 4
  todo("2026-10-05");
  assert.equal(Arc.fallosSeguidos(D, "2026-10-06", []), 0);
  assert.equal(Arc.fallosSeguidos(D, "2026-10-02", []), 0);   // el 1 de octubre no mira septiembre
});
test("los checks manuales: ni futuro, ni reglas automaticas, ni fuera de temporada", () => {
  const D = conReglas({ tipo: "auto", fuente: "correr" }, { nombre: "Leer", tipo: "manual" }, { nombre: "Agua", tipo: "manual" });
  const [auto, leer] = D.reglas.map((r) => r.id);
  assert.ok(Arc.marcaCheck(D, "2026-10-08", leer, true, "2026-10-07").error);
  assert.ok(Arc.marcaCheck(D, "2026-10-07", auto, true, "2026-10-07").error);
  assert.ok(Arc.marcaCheck(D, "2027-01-01", leer, true, "2027-01-01").error);
  assert.ok(Arc.marcaCheck(D, "2026-10-07", leer, true, "2026-10-07").ok);
  assert.ok(Arc.marcaCheck(D, "2026-10-07", leer, false, "2026-10-07").ok);
  assert.deepEqual(D.checks, {});
});
test("lo automatico se guarda en Arc y sobrevive a que Strava deje de traerlo", () => {
  const D = conReglas({ tipo: "auto", fuente: "gym" }, { tipo: "auto", fuente: "correr" }, { tipo: "auto", fuente: "entreno" });
  assert.equal(Arc.registraAuto(D, [gym("2026-10-02"), run("2026-10-09")], "2026-10-05"), true);
  assert.deepEqual(D.auto, { "2026-10-02": { gym: 1 } });     // el 9 aun no ha llegado
  assert.equal(Arc.registraAuto(D, [gym("2026-10-02")], "2026-10-05"), false);
  const e = Arc.estadoDia(D, "2026-10-02", "2026-12-31", []);
  assert.deepEqual(e.reglas.map((x) => x.ok), [true, false, true]);
});

/* ------------------------------- datos ------------------------------- */
test("datos con version: sin nada, v0, v1, mas nueva y rotos", () => {
  assert.deepEqual(Arc.carga(almacen()).D, Arc.vacio());
  const v0 = Arc.carga(almacen({ [Arc.K_DATOS]: JSON.stringify({ reglas: [{ id: "r1", nombre: "Leer", tipo: "manual" }] }) }));
  assert.equal(v0.migrado, true);
  assert.equal(v0.D.v, 1);
  assert.equal(v0.D.reglas.length, 1);
  const nueva = Arc.carga(almacen({ [Arc.K_DATOS]: JSON.stringify({ v: 9, reglas: [] }) }));
  assert.equal(nueva.error, "nueva");
  assert.equal(nueva.soloLectura, true);
  const rota = Arc.carga(almacen({ [Arc.K_DATOS]: "{no es json" }));
  assert.equal(rota.error, "roto");
  assert.equal(rota.soloLectura, true);
  const mala = Arc.carga({ getItem() { throw new Error("bloqueado"); } });
  assert.equal(mala.error, "almacen");
});
test("se guarda bajo copiloto.arc.* y se lee igual", () => {
  const st = almacen();
  const D = conReglas({ nombre: "Leer", tipo: "manual" }, { tipo: "auto", fuente: "correr" }, { nombre: "Agua", tipo: "manual" });
  Arc.marcaCheck(D, "2026-10-01", D.reglas[0].id, true, "2026-10-01");
  Arc.ponNota(D, 1, "Bien");
  assert.ok(Arc.guardaEn(st, D));
  assert.deepEqual(Object.keys(st.m), ["copiloto.arc.datos"]);
  assert.deepEqual(Arc.carga(st).D, D);
});
