// v2.73 · «Hecho» no es «Ya está»: lo que se cuece queda en marcha hasta que dices «Ya está»
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const R = require("../receta.js");
const M = require("../cocina-modo.js");
const { eventoDeTxt } = await import("../scripts/lint-recetas.mjs");

const lentejas = () => R.leer(eventoDeTxt(readFileSync(new URL("../docs/recetas/2026-10-06-1300-lentejas.txt", import.meta.url), "utf8")));
const t0 = Date.parse("2026-10-06T13:00:00");
function empieza() {
  const M0 = M.normaliza({ comida: lentejas() }), S = M.nuevoEstado(t0);
  S.carr = { ini: t0, hechas: {}, empezo: {}, fin: {} };
  return { M0, S };
}
const tarea = (M0, re) => M0.carr.tareas.find((x) => re.test(x.txt));
// cocina hasta que toca «re» (y lo echa): lo de manos, al momento; lo que se cuece, «Ya está» al sonar
function hastaEchar(M0, S, re) {
  let ahora = t0;
  for (let i = 0; i < 60; i++) {
    const listos = M.cueceDe(M0, S, ahora).filter((c) => c.r <= 0);
    if (listos.length) { listos.forEach((c) => M.yaEstaCarril(S, M0, c.y.id, ahora)); continue; }
    const pl = M.planCarril(M0, S, ahora);
    if (!M.tocaYa(pl)) {                                   // nada para las manos: al siguiente momento (reloj o tarea)
      const p = M.cueceDe(M0, S, ahora)[0], t = pl.m.ahora && !pl.m.bloqueada ? pl.base + pl.m.cuando * 1000 : Infinity;
      const prox = Math.min(p ? ahora + Math.max(1, Math.ceil(p.r)) * 1000 : Infinity, t);
      if (prox === Infinity) break;
      ahora = Math.max(ahora + 1000, prox); continue;
    }
    const x = pl.m.ahora; M.hechaCarril(S, M0, x.id, ahora);
    if (re.test(x.txt)) return ahora;
  }
  throw new Error("no llega a " + re);
}

test("carriles: el botón de «Echa las lentejas… 5 min» deja el paso en marcha, no terminado", () => {
  const { M0, S } = empieza(), x = tarea(M0, /^Echa 1 bote de lentejas/);
  assert.ok(x && x.dur - x.manos > 200, "el paso espera unos 5 min");
  const ahora = hastaEchar(M0, S, /^Echa 1 bote de lentejas/);
  assert.equal(S.carr.hechas[x.id], undefined, "no está hecho");
  assert.ok(!S.hechos[x.k]);
  const cz = M.cueceDe(M0, S, ahora + 10e3);
  assert.deepEqual(cz.map((c) => c.y.id), [x.id], "está cociéndose");
  assert.ok(cz[0].T && cz[0].T.cuece && cz[0].r > 0, "con su reloj");
  assert.equal(cz[0].T.senal, "la salsa espesa");
  // ya no es lo que toca a las manos (no se repite), pero tampoco cuenta como hecho
  const pl = M.planCarril(M0, S, ahora + 10e3);
  assert.notEqual(pl.m.ahora && pl.m.ahora.id, x.id);
  assert.ok(!M.pendientesCarril(M0, S, pl).includes(x));
  assert.equal(M.todoHecho(M0, S, ahora + 3600e3), false);
});

test("carriles: AL JUNTAR no empieza hasta «Ya está», aunque el reloj ya haya sonado", () => {
  const { M0, S } = empieza(), x = tarea(M0, /^Echa 1 bote de lentejas/);
  let ahora = hastaEchar(M0, S, /^Echa 1 bote de lentejas/);
  const juntar = M0.carr.tareas.filter((y) => y.carril === "union" && !y.despues)[0];
  // el resto (los huevos) a su hora, sin tocar las lentejas
  for (let i = 0; i < 20; i++) {
    const otros = M.cueceDe(M0, S, ahora).filter((c) => c.r <= 0 && c.y.id !== x.id);
    if (otros.length) { otros.forEach((c) => M.yaEstaCarril(S, M0, c.y.id, ahora)); continue; }
    const pl = M.planCarril(M0, S, ahora);
    if (!pl.m.ahora || pl.m.ahora.carril === "union") break;
    if (!M.tocaYa(pl)) { ahora = Math.max(ahora + 1000, pl.base + pl.m.cuando * 1000); continue; }
    M.hechaCarril(S, M0, pl.m.ahora.id, ahora);
  }
  const fin = M.cueceDe(M0, S, ahora).find((c) => c.y.id === x.id).T.fin;
  ahora = Math.max(ahora, fin) + 3 * 60e3;                          // sonó hace 3 min y no has dicho nada
  M.cueceDe(M0, S, ahora).filter((c) => c.y.id !== x.id).forEach((c) => M.yaEstaCarril(S, M0, c.y.id, ahora));   // los huevos, listos
  let pl = M.planCarril(M0, S, ahora);
  assert.equal(pl.m.ahora.id, juntar.id, "lo siguiente es juntar…");
  assert.ok(pl.m.cuando > pl.desde + 15, "…pero aún no toca: espera a «Ya está»");
  assert.ok(M.cueceDe(M0, S, ahora).some((c) => c.y.id === x.id && c.r < 0), "las lentejas siguen en marcha, pasadas de tiempo");
  assert.equal(M.todoHecho(M0, S, ahora), false);
  M.yaEstaCarril(S, M0, x.id, ahora);
  pl = M.planCarril(M0, S, ahora);
  assert.equal(pl.m.ahora.id, juntar.id);
  assert.ok(pl.m.cuando <= pl.desde + 15, "con «Ya está», juntar toca ya");
  assert.ok(S.carr.hechas[x.id] && S.hechos[x.k]);
  assert.equal(S.timers.some((T) => T.paso === x.k), false, "su reloj se va");
});

test("carriles: «+1 min» alarga el reloj y rehace el plan", () => {
  const { M0, S } = empieza(), x = tarea(M0, /^Echa 1 bote de lentejas/);
  const ahora = hastaEchar(M0, S, /^Echa 1 bote de lentejas/) + 60e3;
  const T = M.cueceDe(M0, S, ahora).find((c) => c.y.id === x.id).T;
  const juntar = M0.carr.tareas.filter((y) => y.carril === "union" && !y.despues)[0];
  const fin0 = T.fin, p0 = M.planCarril(M0, S, ahora);
  M.masUno(S, T.id, ahora, 60);
  assert.equal(T.fin, fin0 + 60e3);
  const p1 = M.planCarril(M0, S, ahora);
  assert.equal(p1.P.fin[x.id], p0.P.fin[x.id] + 60, "las lentejas acaban un minuto más tarde en el plan");
  assert.ok(p1.P.ini[juntar.id] >= p1.P.fin[x.id], "y juntar va detrás");
  assert.ok(p1.mesaS > p0.mesaS, "a la mesa, más tarde");
  // y si ya sonó: +1 min desde ahora, y vuelve a avisar
  const tarde = T.fin + 30e3;
  M.revisa(S, tarde);
  assert.equal(T.finAvisado, true);
  M.masUno(S, T.id, tarde, 60);
  assert.equal(T.fin, tarde + 60e3); assert.equal(T.finAvisado, false);
});

test("carriles: el aviso a mitad («vuelta a los 2») sigue sonando en lo que se cuece", () => {
  const curry = R.leer(eventoDeTxt(readFileSync(new URL("../docs/recetas/2026-10-05-1300-curry.txt", import.meta.url), "utf8")));
  const M0 = M.normaliza({ comida: curry }), S = M.nuevoEstado(t0);
  S.carr = { ini: t0, hechas: {}, empezo: {}, fin: {} };
  const x = M0.carr.tareas.find((y) => /primera mitad/.test(y.txt));
  const T = M.hechaCarril(S, M0, x.id, t0);
  assert.ok(T.cuece && T.avisos.length, "lleva su aviso");
  const a = T.avisos[0].a_los_s;
  assert.deepEqual(M.revisa(S, t0 + (a + 1) * 1000).map((e) => e.tipo), ["aviso"]);
  assert.deepEqual(M.revisa(S, T.fin + 1000).map((e) => e.tipo), ["fin"]);
  assert.ok(M.cueceDe(M0, S, T.fin + 1000).length, "sonó y sigue en marcha");
});

test("botón: dice lo que acabas de hacer", () => {
  assert.equal(M.etiquetaHecho("Echa 1 bote de lentejas cocidas, 1 pizca de sal", 300), "Echado · empieza el reloj (5 min)");
  assert.equal(M.etiquetaHecho("Pon en el cazo agua y 1 huevo a fuego fuerte", 300), "Puesto · empieza el reloj (5 min)");
  assert.equal(M.etiquetaHecho("Deja enfriar el tupper en la encimera", 1200), "Empezar reloj · 20 min");
  assert.equal(M.etiquetaHecho("Corta 100 g de pimiento tricolor en dados", 0), "Hecho");
});

/* ------------------------------ el paso a paso lineal ------------------------------ */
const LINEAL = { uid: "l", fuente: "comida", titulo: "Lentejas rápidas",
  texto: "1 RACIÓN · 15 min\n\nINGREDIENTES\n· 1 bote de lentejas cocidas\n· 1 cda de AOVE\n\nPROCESO\n1. Calienta 1 cda de AOVE en la olla a fuego medio, 2 min.\n2. Echa las lentejas a fuego medio, 5 min, remueve a la mitad, hasta que la salsa espese.\n3. Corta el pan, 1 min.\n4. Sirve las lentejas, 1 min." };
test("lineal: lo que espera queda en marcha al tocar el botón; «Ya está» lo termina", () => {
  const M0 = M.normaliza({ comida: R.leer(LINEAL) }), n = M0.pasos.length, S = M.nuevoEstado(t0);
  const k = M0.pasos.findIndex((P) => /^Echa las lentejas/.test(P.titulo));
  assert.ok(M.esperaPaso(M0.pasos[k]), "echar las lentejas a fuego medio espera");
  const corta = M0.pasos.findIndex((P) => /^Corta el pan/.test(P.titulo));
  assert.equal(M.esperaPaso(M0.pasos[corta]), false, "cortar es de manos");
  for (let j = 0; j < k; j++) M.hecho(S, n, j, t0);
  const sig = M.echado(S, n, k, t0, M0);
  assert.equal(sig, corta, "pasas a lo siguiente…");
  assert.ok(!S.hechos[k], "…y las lentejas no cuentan como hechas");
  assert.deepEqual(M.cocinando(S), [k]);
  const T = M.relojDe(S, k);
  assert.ok(T && T.cuece && T.dur === M0.pasos[k].dur, "con su reloj");
  assert.ok(T.avisos.length, "y su aviso a mitad");
  M.hecho(S, n, corta, t0 + 60e3);
  assert.notEqual(S.actual, k, "lo que se cuece no vuelve como paso por hacer");
  M.hecho(S, n, S.actual, t0 + 120e3);                          // servir
  assert.equal(M.siguiente(S, n, -1), -1, "no queda nada por hacer con las manos…");
  assert.deepEqual(M.cocinando(S), [k], "…pero las lentejas siguen en marcha: no se acaba");
  assert.equal(M.yaEsta(S, n, k, t0 + 400e3), -1);
  assert.ok(S.hechos[k]); assert.deepEqual(M.cocinando(S), []);
  assert.equal(M.relojDe(S, k), null);
});
