// Tests de Arc (v3): dias, semanas, reglas, plan, sueño de Huawei, fuerza,
// etapas y datos.   node --test tests/*.test.mjs
// Sin dependencias: arc.js se carga con require() y no toca el DOM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const Arc = createRequire(import.meta.url)("../arc.js");
const HOY = "2026-09-28";

function almacen(inicial = {}) {
  const m = { ...inicial };
  return { m, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } };
}
const run = (fecha) => ({ fecha, fuente: "strava", deporte: "Run" });
const walk = (fecha) => ({ fecha, fuente: "strava", deporte: "Walk" });
const gym = (fecha) => ({ fecha, fuente: "hevy", deporte: "WeightTraining" });
const ev = (tipo, plan = true, titulo = "") => ({ tipo, plan, titulo });
// las manuales, apuntadas desde otra fecha (para probar el "alta")
const conAlta = (d) => { const D = Arc.vacio(HOY); D.reglas.forEach((r) => { if (r.alta) r.alta = d; }); return D; };

/* ------------------------------- dias ------------------------------- */
test("el Arc empieza el 1/9 y acaba el 31/12: 122 dias", () => {
  assert.equal(Arc.TOTAL, 122);
  assert.equal(Arc.diaArc("2026-09-01"), 1);
  assert.equal(Arc.diaArc(HOY), 28);
  assert.equal(Arc.diaArc("2026-12-31"), 122);
  assert.equal(Arc.diaArc("2026-08-31"), null);
  assert.equal(Arc.diaArc("2027-01-01"), null);
});
test("el cambio de hora del 25/10 no se come ni repite un dia", () => {
  assert.equal(Arc.diaArc("2026-10-25") + 1, Arc.diaArc("2026-10-26"));
  assert.equal(Arc.mas("2026-10-24", 2), "2026-10-26");
});

/* ------------------------------ semanas ------------------------------ */
test("18 semanas de lunes a domingo que suman 122 dias, sin huecos", () => {
  assert.equal(Arc.SEMANAS.length, 18);
  assert.equal(Arc.SEMANAS.reduce((s, x) => s + x.dias, 0), 122);
  for (let i = 1; i < Arc.SEMANAS.length; i++) assert.equal(Arc.SEMANAS[i].desde, Arc.mas(Arc.SEMANAS[i - 1].hasta, 1));
  const dom = (iso) => new Date(iso + "T12:00:00Z").getUTCDay() === 0;
  Arc.SEMANAS.slice(0, -1).forEach((s) => assert.ok(dom(s.hasta), `semana ${s.n} acaba ${s.hasta}`));
});
test("la semana 1 va del martes 1 al domingo 6; la 18, del 28 al 31/12", () => {
  assert.deepEqual([Arc.SEMANAS[0].desde, Arc.SEMANAS[0].hasta], ["2026-09-01", "2026-09-06"]);
  assert.equal(Arc.semanaArc("2026-09-07"), 2);
  assert.equal(Arc.semanaArc(HOY), 5);
  assert.deepEqual([Arc.SEMANAS[17].desde, Arc.SEMANAS[17].hasta], ["2026-12-28", "2026-12-31"]);
});
test("la revision de una semana se abre su domingo, no antes", () => {
  const D = Arc.vacio(HOY);
  const w = (hoy) => Arc.revision(D, hoy, []).find((s) => s.n === 5);
  assert.equal(w("2026-10-03").abierta, false);
  assert.equal(w("2026-10-04").abierta, true);
  assert.equal(w("2026-10-04").pasada, false);
  assert.equal(w("2026-10-05").pasada, true);
});

/* ------------------------ reglas precargadas ------------------------ */
test("vienen tres reglas: plan (auto), dormir (Huawei o toque) y estudio", () => {
  const D = Arc.vacio(HOY);
  assert.deepEqual(D.reglas.map((r) => [r.id, r.tipo, r.fuente || r.dato || null]), [
    ["plan", "auto", "plan"], ["dormir", "manual", "sueno"], ["estudio", "manual", null]]);
  assert.equal(D.reglas[1].alta, HOY);          // la app las apunta desde hoy
  assert.equal(D.objetivo, "");
});
test("de 3 a 5 reglas; se editan hasta el 30/09 y se bloquean el 1/10", () => {
  const D = Arc.vacio(HOY); D.reglas = [];
  for (let i = 1; i <= 5; i++) assert.ok(Arc.anadeRegla(D, { nombre: "R" + i, tipo: "manual" }, HOY).ok);
  assert.match(Arc.anadeRegla(D, { nombre: "R6", tipo: "manual" }, HOY).error, /máximo/);
  assert.ok(Arc.editaRegla(D, D.reglas[0].id, { nombre: "Otra", tipo: "manual" }, "2026-09-30").ok);
  assert.ok(Arc.editaRegla(D, D.reglas[0].id, { nombre: "Otra más", tipo: "manual" }, "2026-10-01").error);
  assert.ok(Arc.borraRegla(D, D.reglas[0].id, "2026-10-01").error);
});
test("objetivo: se escribe hasta el 30/09; vacio, una vez mas despues", () => {
  const D = Arc.vacio(HOY);
  assert.ok(Arc.ponObjetivo(D, "Uno", "2026-09-30").ok);
  assert.ok(Arc.ponObjetivo(D, "Otro", "2026-10-02").error);
  const V = Arc.vacio(HOY);
  assert.ok(Arc.ponObjetivo(V, "Tarde", "2026-10-02").ok);
});

/* ------------------------------ sin datos ------------------------------ */
test("antes del alta de una regla manual, sin toque ni datos, no se sabe: 'sin datos'", () => {
  const D = Arc.vacio(HOY);
  const e = Arc.estadoDia(D, "2026-09-10", HOY, { acts: [], eventos: () => [] });
  assert.equal(e.reglas[2].ok, null);           // estudio: no se sabe
  assert.equal(e.reglas[0].ok, true);           // sin sesiones: el plan se cumple solo
  assert.equal(e.estado, "cumplido");           // cuenta con lo que se sabe
  const R = Arc.cuenta(D, "2026-09-01", "2026-09-27", HOY, { acts: [], eventos: () => null });
  assert.equal(R.sinDatos, 27);                 // sin calendario ni toques: "sin datos", ningun fallo
  assert.equal(R.dias, 0);
  assert.equal(Arc.fallosSeguidos(D, HOY, { acts: [], eventos: () => null }), 0);
});
test("desde el alta, una manual sin marcar es un fallo (hoy aun abierto)", () => {
  const D = conAlta("2026-09-20");
  const c = { acts: [], eventos: () => [] };
  assert.equal(Arc.estadoDia(D, "2026-09-25", HOY, c).estado, "fallado");
  assert.equal(Arc.estadoDia(D, HOY, HOY, c).estado, "hoy");
});
test("un toque en un dia pasado vale aunque sea antes del alta; el futuro y fuera del Arc no", () => {
  const D = Arc.vacio(HOY);
  Arc.marcaCheck(D, "2026-09-10", "estudio", true, HOY);
  assert.equal(Arc.estadoDia(D, "2026-09-10", HOY, []).reglas[2].ok, true);
  assert.ok(Arc.marcaCheck(D, "2026-10-01", "estudio", true, HOY).error);
  assert.ok(Arc.marcaCheck(D, "2026-08-31", "estudio", true, HOY).error);
});
test("aviso: 2 fallos seguidos hasta ayer, no 1", () => {
  const D = conAlta("2026-09-01"), c = { acts: [], eventos: () => [] };
  for (const d of ["2026-09-24", "2026-09-25"]) for (const id of ["dormir", "estudio"]) Arc.marcaCheck(D, d, id, true, HOY);
  assert.equal(Arc.fallosSeguidos(D, HOY, c), 2);            // 26 y 27
  assert.equal(Arc.fallosSeguidos(D, "2026-09-27", c), 1);
});

/* ------------------------------- el plan ------------------------------- */
function plan(eventos, acts, salud = null, dia = "2026-09-10") {
  const D = Arc.vacio(HOY);
  return Arc.estadoDia(D, dia, HOY, { acts, eventos: (iso) => (iso === dia ? eventos : []), salud }).reglas[0];
}
test("plan · rodaje: con una carrera en la calle, no con una de cinta", () => {
  assert.equal(plan([ev("fuera")], [run("2026-09-10")]).ok, true);
  assert.equal(plan([ev("fuera")], [{ ...run("2026-09-10"), cinta: true }]).ok, false);
  assert.equal(plan([ev("cinta")], [{ ...run("2026-09-10"), cinta: true }]).ok, true);
});
test("plan · gimnasio: con la sesion de Hevy, no con una carrera", () => {
  assert.equal(plan([ev("gym")], [gym("2026-09-10")]).ok, true);
  assert.equal(plan([ev("gym")], [run("2026-09-10")]).ok, false);
});
test("plan · dos sesiones: hacen falta las dos", () => {
  const x = plan([ev("fuera"), ev("gym")], [run("2026-09-10")]);
  assert.equal(x.ok, false);
  assert.deepEqual(x.plan, { s: 2, h: 1 });
});
test("plan · descanso o dia sin evento: se cumple solo", () => {
  assert.equal(plan([ev("libre", false, "Descanso")], []).ok, true);
  assert.equal(plan([], []).ok, true);
});
test("plan · caminata: vale una caminata grabada o los pasos de Huawei; sin registro no se exige", () => {
  const cam = [ev("fuera", false, "Caminata 8 km")];
  const sin = plan(cam, []);                    // el 17/09: caminó y no lo grabó
  assert.equal(sin.ok, true);
  assert.equal(sin.plan.sinRegistro, 1);
  assert.equal(plan([ev("gym"), ...cam], [gym("2026-09-10")]).ok, true);
  assert.equal(plan(cam, [walk("2026-09-10")]).ok, true);
  assert.equal(plan(cam, [], { "2026-09-10": { pasos: 9735 } }).ok, true);     // el 17/09 real: 9.735 pasos
  assert.equal(plan(cam, [], { "2026-09-10": { pasos: 3000 } }).ok, false);
  assert.equal(plan([ev("libre", false, "Paseo con la familia")], [], { "2026-09-10": { caminata: 40 } }).ok, true);
});
test("plan · lo automatico se marca 'hecho sin registrar'", () => {
  const D = Arc.vacio(HOY), c = { acts: [], eventos: () => [ev("fuera")] };
  assert.equal(Arc.estadoDia(D, "2026-09-17", HOY, c).reglas[0].ok, false);
  Arc.marcaCheck(D, "2026-09-17", "plan", true, HOY);
  const x = Arc.estadoDia(D, "2026-09-17", HOY, c).reglas[0];
  assert.equal(x.ok, true);
  assert.equal(x.como, "a mano");
});
test("plan · sin calendario: vale lo guardado; si no hay nada, 'sin datos'", () => {
  const D = Arc.vacio(HOY);
  const c = { acts: [run("2026-09-05")], eventos: (iso) => (iso === "2026-09-05" ? [ev("fuera")] : null) };
  assert.ok(Arc.registraAuto(D, c, HOY));
  assert.deepEqual(D.plan["2026-09-05"], { s: 1, h: 1 });
  const sin = { acts: [], eventos: () => null };
  assert.equal(Arc.estadoDia(D, "2026-09-05", HOY, sin).reglas[0].ok, true);
  assert.equal(Arc.estadoDia(D, "2026-09-04", HOY, sin).reglas[0].ok, null);
});

/* ------------------------- sueño de Huawei ------------------------- */
test("dormir: sale de Huawei (7 h = 420 min) y un toque manda", () => {
  const D = Arc.vacio(HOY);
  const s = { "2026-09-10": { sueno: 416 }, "2026-09-11": { sueno: 446 } };   // los reales de esas noches
  const d = (dia) => Arc.estadoDia(D, dia, HOY, { acts: [], eventos: () => [], salud: s }).reglas[1];
  assert.equal(d("2026-09-10").ok, false);       // 6 h 56: por 4 minutos no
  assert.equal(d("2026-09-10").como, "dato");
  assert.equal(d("2026-09-11").ok, true);
  assert.equal(d("2026-09-12").ok, null);        // sin datos y antes del alta: no se sabe
  Arc.marcaCheck(D, "2026-09-10", "dormir", true, HOY);
  assert.equal(d("2026-09-10").ok, true);
});
test("el fichero de salud: se valida, se mezcla y la media de acostarse cruza medianoche", () => {
  assert.ok(Arc.leeSalud("{no").error);
  assert.ok(Arc.leeSalud(JSON.stringify({ v: 1, dias: {} })).error);
  const a = Arc.leeSalud(JSON.stringify({ v: 1, dias: { "2026-09-10": { sueno: 416, acuesta: "23:31", levanta: "06:27" }, "malo": { sueno: 1 } } }));
  assert.equal(a.n, 1);
  const b = Arc.leeSalud(JSON.stringify({ v: 1, dias: { "2026-09-11": { sueno: 446, acuesta: "00:29", levanta: "06:29" } } }));
  const S = Arc.mezclaSalud(Arc.mezclaSalud(null, a), b);
  assert.deepEqual([S.desde, S.hasta], ["2026-09-10", "2026-09-11"]);
  const z = Arc.suenoDe(S.dias, "2026-09-01", "2026-09-30");
  assert.equal(z.noches, 2);
  assert.equal(z.media, 431);
  assert.equal(z.acuesta, "00:00");             // 23:31 y 00:29 -> medianoche, no mediodía
  assert.equal(z.levanta, "06:28");
  assert.equal(z.conSiete, 1);
  const st = almacen();
  assert.ok(Arc.guardaSalud(st, S));
  assert.deepEqual(Arc.cargaSalud(st).dias, S.dias);
});

/* ------------------------------- la fuerza ------------------------------- */
function todo(hasta, falla = []) {
  const D = conAlta("2026-09-01");
  for (let d = "2026-09-01"; d <= hasta; d = Arc.mas(d, 1)) if (!falla.includes(d))
    for (const id of ["dormir", "estudio"]) Arc.marcaCheck(D, d, id, true, hasta);
  return D;
}
const sinPlan = { acts: [], eventos: () => [] };
test("fuerza: 12 dias perfectos ~47 %, los 122 ~100 %", () => {
  assert.equal(Arc.fuerzas(todo("2026-09-12"), "2026-09-12", sinPlan).porRegla[1].v, 47);
  assert.ok(Arc.fuerzas(todo("2026-12-31"), "2026-12-31", sinPlan).porRegla[1].v >= 99);
});
test("fuerza: un fallo la baja un poco, nunca a cero; sin datos y hoy abierto no la mueven", () => {
  const sin = Arc.fuerzas(todo("2026-09-20"), "2026-09-20", sinPlan).porRegla[1].v;
  const con = Arc.fuerzas(todo("2026-09-20", ["2026-09-15"]), "2026-09-20", sinPlan).porRegla[1].v;
  assert.ok(con < sin && con > sin - 10 && con > 0, `${con} frente a ${sin}`);
  const D = todo("2026-09-19");
  assert.equal(Arc.fuerzas(D, "2026-09-20", sinPlan).porRegla[1].v, Arc.fuerzas(D, "2026-09-19", sinPlan).porRegla[1].v);
  assert.equal(Arc.fuerzas(Arc.vacio(HOY), HOY, { acts: [], eventos: () => null }).arc, 0);
});
test("totales: km, horas y kg solo de lo que traen Strava y Hevy", () => {
  const acts = [{ ...run("2026-09-02"), distancia: 10000, mov: 3000 }, { ...gym("2026-09-03"), mov: 3600, volumenKg: 4200 }, { ...walk("2026-09-04"), distancia: 5000, mov: 3000 }];
  const t = Arc.totales(acts, "2026-09-01", "2026-09-30");
  assert.equal(t.km, 10); assert.equal(t.kg, 4200); assert.equal(t.sesiones, 3);
});

/* ------------------------------- etapas ------------------------------- */
test("fases de partida: cinco bloques de 4 semanas del 1/9 al 31/12, sin huecos", () => {
  const D = Arc.vacio(HOY);
  assert.deepEqual(D.etapas.map((e) => e.nombre), ["Calzada", "Foro", "Travesía", "Vuelta", "Faro"]);
  assert.equal(D.etapas[0].desde, "2026-09-01");
  assert.equal(D.etapas[4].hasta, "2026-12-31");
  for (let i = 1; i < 5; i++) assert.equal(D.etapas[i].desde, Arc.mas(D.etapas[i - 1].hasta, 1));
  assert.deepEqual(D.etapas.slice(1, 4).map((e) => Arc.mas(e.hasta, 1) === Arc.mas(e.desde, 28)), [true, true, true]);   // 28 días
  assert.equal(Arc.etapaDe(D, "2026-09-27").n, 1);     // el test de 20 km cierra la Calzada
  assert.equal(Arc.etapaDe(D, HOY).n, 2);              // hoy empieza el Foro
  assert.equal(Arc.etapaDe(D, "2026-10-18").n, 2);     // Roma
  assert.equal(Arc.etapaDe(D, "2026-11-03").n, 3);     // México
  D.etapas.forEach((e) => { assert.ok(e.nombre.length <= 22); assert.ok(e.icono); });
});
test("fases, reglas y viajes vienen del código: al cargar siempre son los de esta versión", () => {
  const v = { v: 3, reglas: [], etapas: [{ id: "e1", nombre: "Mi Roma", desde: "2026-09-01", hasta: "2026-10-18" }], viajes: [], checks: { "2026-09-28": { estudio: 1 } }, auto: {}, plan: {}, notas: {} };
  const D = Arc.migra(v, HOY).D;
  assert.deepEqual(D.etapas.map((e) => e.nombre), ["Calzada", "Foro", "Travesía", "Vuelta", "Faro"]);
  assert.deepEqual(D.reglas.map((r) => r.id), ["plan", "dormir", "estudio"]);
  assert.equal(D.reglas[2].alta, "2026-09-28");                  // el estudio empieza con el Foro
  assert.equal(D.viajes.length, 9);
  assert.deepEqual(D.checks, v.checks);                          // lo marcado no se pierde
});
test("etapas: numeros de la fase en curso", () => {
  const D = Arc.vacio(HOY), c = { acts: [{ ...run("2026-09-10"), distancia: 8000, mov: 2400 }], eventos: () => [] };
  const F = Arc.fuerzas(D, HOY, c);
  const st = Arc.statsEtapa(D, D.etapas[1], HOY, c, F);
  assert.equal(st.estado, "actual");
  assert.equal(st.dias, 28);
  assert.equal(st.llevas, 1);
  assert.equal(st.faltan, 27);
  const cal = Arc.statsEtapa(D, D.etapas[0], HOY, c, F);
  assert.equal(cal.estado, "pasada");
  assert.equal(cal.hecho.km, 8);
  assert.equal(Arc.statsEtapa(D, D.etapas[2], HOY, c, null).empiezaEn, 28);
});

/* ------------------------------- datos ------------------------------- */
test("datos con version: v1/v2 -> v3, mas nueva y rotos", () => {
  const v1 = { v: 1, reglas: [{ id: "r1", nombre: "Leer", tipo: "manual" }], checks: {}, auto: {}, notas: {} };
  const m = Arc.migra(v1, HOY);
  assert.equal(m.D.v, 3);
  assert.deepEqual(m.D.reglas.map((r) => r.id), ["plan", "dormir", "estudio"]);
  assert.deepEqual(m.D.reglasPrevias.map((r) => r.nombre), ["Leer"]);
  assert.equal(m.D.reglas[1].dato, "sueno");
  assert.equal(Arc.carga(almacen({ [Arc.K_DATOS]: JSON.stringify({ v: 9 }) }), HOY).error, "nueva");
  assert.equal(Arc.carga(almacen({ [Arc.K_DATOS]: "{no" }), HOY).error, "roto");
  assert.equal(Arc.carga({ getItem() { throw new Error("x"); } }, HOY).error, "almacen");
});
test("se guarda bajo copiloto.arc.* y se lee igual; el diseño es siempre A", () => {
  const st = almacen();
  const D = Arc.vacio(HOY);
  Arc.marcaCheck(D, HOY, "estudio", true, HOY);
  Arc.ponNota(D, 4, "Bien");
  assert.ok(Arc.guardaEn(st, D));
  assert.deepEqual(Object.keys(st.m), ["copiloto.arc.datos"]);
  assert.deepEqual(Arc.carga(st, HOY).D, D);
  assert.equal(Arc.leeDiseno(almacen({ "copiloto.arc.diseno": "B" })), "A");
});

/* --------------------------- la hoja de ruta --------------------------- */
test("el 17/09 real (caminata sin grabar) no sale como sin cumplir", () => {
  const D = Arc.vacio(HOY);
  const c = { acts: [], eventos: (iso) => (iso === "2026-09-17" ? [ev("libre", false, "Caminata 1 h")] : []) };
  const e = Arc.estadoDia(D, "2026-09-17", HOY, c);
  assert.equal(e.reglas[0].ok, true);
  assert.notEqual(e.estado, "fallado");
});
test("miliario: la cuenta atras de cada fase a su destino real", () => {
  const D = Arc.vacio(HOY), [e1, e2, e3, e4, e5] = D.etapas;
  assert.deepEqual([Arc.destinoDe(D, e2, HOY).n, Arc.destinoDe(D, e2, HOY).abajo], [20, "ROMA"]);
  assert.equal(Arc.destinoDe(D, e2, "2026-10-17").arriba, "DÍA A");            // singular
  assert.equal(Arc.destinoDe(D, e2, "2026-10-18").frase, "hoy corres en Roma");
  assert.equal(Arc.destinoDe(D, e2, "2026-10-20").abajo, "TRAVESÍA");
  assert.equal(Arc.destinoDe(D, e3, "2026-10-27").abajo, "MÉXICO");
  assert.equal(Arc.destinoDe(D, e3, "2026-11-10").abajo, "VOLVER");
  assert.equal(Arc.destinoDe(D, e4, "2026-12-10").abajo, "CORUÑA");
  assert.equal(Arc.destinoDe(D, e5, "2026-12-25").abajo, "SELLAR");
  const nueva = { id: "u9", nombre: "Enero", desde: "2026-12-20", hasta: "2026-12-31" };
  assert.equal(Arc.destinoDe(D, nueva, "2026-12-21").n, 10);                  // una fase nueva cuenta a su final
});
test("la linea de HOY: numeral, nombre y lo que viene; viajes y primer dia", () => {
  const D = Arc.vacio(HOY);
  assert.equal(Arc.lineaEtapa(D, HOY), "II Foro · empieza hoy");
  assert.equal(Arc.lineaEtapa(D, "2026-09-29"), "II Foro · 19 días a Roma");
  assert.equal(Arc.lineaEtapa(D, "2026-10-10"), "II Foro · hoy, Madrid → A Coruña");
  assert.equal(Arc.lineaEtapa(D, "2026-10-18"), "II Foro · hoy corres en Roma");
  assert.equal(Arc.lineaEtapa(D, "2026-12-31"), "V Faro · hoy se sella el Arc");
  assert.equal(Arc.lineaEtapa(D, "2027-01-02"), null);
  assert.equal(Arc.lineaEtapa(D, "2026-10-01", HOY), "II Foro · día 4 de 28");  // otro día: sin "hoy"
});
test("viajes: los reales, seguros, con ciudades y sin codigos; el 3/11 a Ciudad de México", () => {
  const D = Arc.vacio(HOY);
  assert.equal(D.viajes.length, 9);
  D.viajes.forEach((v) => { assert.ok(!/[A-Z]{3}/.test(v.de + v.a)); assert.ok(!v.posible); assert.ok(v.fecha); });
  assert.deepEqual(D.viajes.filter((v) => v.fecha === "2026-11-03").map((v) => v.a), ["Ciudad de México"]);
  assert.deepEqual(D.viajes.filter((v) => v.fecha === "2026-11-12").map((v) => v.de + " → " + v.a), ["Ciudad de México → Cancún"]);
});
test("nunca dos veces: de los dias a medias, cuantos siguio uno cumplido", () => {
  const D = conAlta("2026-09-01"), c = { acts: [], eventos: () => [] };
  const todo = (d) => ["dormir", "estudio"].forEach((id) => Arc.marcaCheck(D, d, id, true, HOY));
  ["2026-09-01", "2026-09-03", "2026-09-06"].forEach(todo);       // a medias el 2 (vuelve el 3), el 4 y el 5 (vuelve el 6)
  const v = Arc.volviste(D, "2026-09-01", "2026-09-06", HOY, c);
  assert.deepEqual(v, { f: 3, v: 2 });
});
test("etapas: nombre ≤ 22 y subtitulo ≤ 60", () => {
  const D = Arc.vacio(HOY);
  assert.ok(Arc.ponEtapa(D, "e1", { nombre: "Un nombre demasiado largo", desde: "2026-09-01", hasta: "2026-10-18" }).error);
  assert.ok(Arc.ponEtapa(D, "e1", { nombre: "Calzada", sub: "x".repeat(61), desde: "2026-09-01", hasta: "2026-10-18" }).error);
  assert.ok(Arc.ponEtapa(D, "e1", { nombre: "Calzada", sub: "Otra", desde: "2026-09-01", hasta: "2026-10-18" }).ok);
  assert.equal(D.etapas[0].icono, "path");                         // el icono va por id y no se pierde
});

/* --------------------------- arreglos de la revision --------------------------- */
test("fuerza: una regla sin ningun dia con datos no hunde la media", () => {
  const D = Arc.vacio(HOY);                                       // dormir y estudio: alta hoy, sin datos antes
  const f = Arc.fuerzas(D, HOY, { acts: [], eventos: () => [] });   // el plan se cumple solo todo septiembre
  assert.equal(f.arc, f.porRegla[0].v);
  assert.ok(f.arc > 70);
});
test("dormir lee Huawei; estudio y dormir se apuntan desde el 28/09", () => {
  const D = Arc.vacio(HOY);
  assert.equal(D.reglas[1].dato, "sueno");
  assert.equal(Arc.estadoDia(D, "2026-09-20", HOY, { acts: [], eventos: () => [] }).reglas[2].ok, null);  // antes del Foro: sin datos
});
