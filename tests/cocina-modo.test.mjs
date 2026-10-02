// Tests de cocina-modo.js: pasos de una receta (JSON de Copiloto Cocina), de una comida del
// calendario y de una rutina; relojes, progreso, "seguir desde aqui" y el estado viejo.
// Datos de ejemplo con el mismo formato que los de verdad (nada real en el repo).
//   node --test tests/cocina-modo.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const M = createRequire(import.meta.url)("../cocina-modo.js");
const T0 = Date.UTC(2026, 9, 1, 12, 0, 0);   // un "ahora" fijo

// receta de Copiloto Cocina (formato de receta.schema.json), recortada
const J = {
  id: "curry-prueba",
  meta: { titulo: "Curry de prueba", raciones: 2, tiempo_total_min: 20, reparto: { taper: "La otra ración, al congelador." } },
  tema: { acento: "#8B6909", acento_oscuro: "#E9B00F", superficie: "#FBF6E6" },
  ingredientes: [
    { nombre: "Solomillos de pollo", cantidad: "500 g" },
    { nombre: "Ajo troceado congelado", cantidad: "1 cdta" },
    { nombre: "Curry", cantidad: "2 cdtas" },
    { nombre: "AOVE, sal, pimienta", cantidad: "al gusto" },
    { nombre: "Ajo troceado congelado", cantidad: "1 cdta" },
    { nombre: "Tomate triturado (bote ya abierto)", cantidad: "100 g" }
  ],
  pasos: [
    { titulo: "Prepara todo antes del fuego", detalle: "Bol con las especias.", fuego: null, duracion_s: 0, usa: [1, 2, 3], estimado: "≈3 min",
      carriles: ["manos"], mientras_tanto: null, solo_esto: false, checklist: ["Bol: 2 cdtas curry", "Platito: ajo"], avisos: [],
      voz_inicio: "Paso uno. Prepara todo.", voz_fin: null, consejo: null },
    { titulo: "Sartén al fuego y corta el pollo", detalle: "Sartén vacía al fuego.", fuego: "medio-alto", duracion_s: 240, usa: [0, 3, 99],
      carriles: ["fuego", "manos"], mientras_tanto: "Solomillos en dados de 2–3 cm.", solo_esto: false, checklist: [],
      avisos: [{ a_los_s: 120, voz: "Dos minutos.", texto: "Mitad del tiempo" }], voz_inicio: "Paso dos.", voz_fin: "Sartén caliente.", consejo: null },
    { titulo: "Salsa", detalle: "Tomate y ajo.", fuego: "medio", duracion_s: 360, usa: [4, 5], carriles: ["fuego"], mientras_tanto: null,
      solo_esto: false, checklist: [], avisos: [{ a_los_s: 180, voz: "Remueve.", texto: "Remover" }, { a_los_s: 300, voz: "Prueba.", texto: "Prueba" }],
      voz_inicio: "Paso tres.", voz_fin: null, consejo: "Si espesa, un chorrito de agua." },
    { titulo: "Emplata y guarda", detalle: "Táper destapado.", fuego: null, duracion_s: 0, usa: [], estimado: "≈2 min", carriles: ["manos"],
      mientras_tanto: null, solo_esto: false, checklist: [], avisos: [], aviso_reposo_min: 45, voz_inicio: "Último paso.", voz_fin: null, consejo: null }
  ],
  plan_gantt: []
};

// comida del calendario ya leida por Receta.leer (forma del contrato), escrita a mano
const ING = (o) => Object.assign({ txt: "", c: null, nombre: "", base: "", clave: "", ver: "", prep: "", grupo: "", cuando: "",
  deCasa: false, hecho: false, acaba: false, abre: false, basico: false, opcional: false }, o);
const R = {
  uid: "ev-pollo", fecha: "2026-10-01", hora: "14:00", fin: "14:45", titulo: "Pollo con boniato", etiqueta: "Comida", tipo: "comida",
  raciones: 1, minutos: 35, resumen: [], receta: null, notas: [], planB: [], problemas: [], acaba: [],
  ingredientes: [
    ING({ txt: "230 g pollo en dados de 2 cm", c: { n: 230, ud: "g" }, nombre: "pollo en dados de 2 cm", base: "pollo", ver: "Pollo", prep: "en dados de 2 cm", deCasa: true }),
    ING({ txt: "1 boniato en cubos de 2 cm", c: { n: 1, ud: "ud" }, nombre: "boniato en cubos de 2 cm", base: "boniato", ver: "Boniato", prep: "pelado, en cubos de 2 cm" }),
    ING({ txt: "½ berenjena en cubos de 2 cm", c: { n: 0.5, ud: "ud" }, nombre: "berenjena", base: "berenjena", ver: "Berenjena", prep: "en cubos de 2 cm", deCasa: true }),
    ING({ txt: "2 dientes de ajo picados", c: { n: 2, ud: "diente" }, nombre: "ajo picados", base: "ajo", ver: "Ajo", prep: "picados" }),
    ING({ txt: "3 cdas AOVE", c: { n: 3, ud: "cda" }, nombre: "AOVE", base: "aove", ver: "AOVE", basico: true }),
    ING({ txt: "1 cdta sal", c: { n: 1, ud: "cdta" }, nombre: "sal", base: "sal", ver: "Sal", basico: true }),
    ING({ txt: "Opcional: ½ limón", c: { n: 0.5, ud: "ud" }, nombre: "limón", base: "limon", ver: "Limón", opcional: true }),
    ING({ txt: "2 huevos cocidos de anoche", c: { n: 2, ud: "ud" }, nombre: "huevos cocidos", base: "huevo cocido", ver: "Huevo cocido", hecho: true }),
    ING({ txt: "3 limones", c: { n: 3, ud: "ud" }, nombre: "limones", base: "limon", ver: "Limón" })
  ],
  grupos: [],
  pasos: [
    { titulo: "Antes de empezar", detalle: "", duracion_s: 0, avisos: [], usa: [], consejo: "", pista: "", grupo: "", tipo: "prep", checklist: [], auto: true,
      secciones: [
        { titulo: "Saca", items: [{ txt: "230 g pollo · de la nevera", ing: 0 }] },
        { titulo: "Corta y prepara", items: [{ txt: "1 boniato · pélalo, en cubos de 2 cm", ing: 1 }, { txt: "½ berenjena · en cubos de 2 cm", ing: 2 }] },
        { titulo: "Ten a mano", items: [{ txt: "3 cdas AOVE", ing: 4 }, { txt: "1 cdta sal", ing: 5 }] }
      ] },
    { titulo: "Berenjena con sal", detalle: "En un colador con sal, 10 min. Luego sécala.", duracion_s: 600, avisos: [], usa: [2, 5], consejo: "", pista: "",
      grupo: "", tipo: "prep", checklist: [] },
    { titulo: "3 min en vacío para calentar", detalle: "", duracion_s: 240, avisos: [], usa: [], consejo: "", pista: "", grupo: "AIR FRYER · todo en el cesto", tipo: "paso", checklist: [] },
    { titulo: "Boniato solo, con un poco de aceite", detalle: "5 min, agitar, 5 min más.", duracion_s: 600, avisos: [{ a_los_s: 300, texto: "Agita", voz: "Agita el cesto" }],
      usa: [1, 4], consejo: "Si no cabe en una capa, hazlo en dos tandas.", pista: "", grupo: "AIR FRYER · todo en el cesto", tipo: "paso", checklist: [] },
    { titulo: "Añade el pollo y la berenjena", detalle: "12 min, con vuelta a los 6.", duracion_s: 720, avisos: [{ a_los_s: 360, texto: "Dale la vuelta", voz: "Dale la vuelta" }],
      usa: [0, 2], consejo: "", pista: "hasta que dore", grupo: "AIR FRYER · todo en el cesto", tipo: "paso", checklist: [] },
    { titulo: "Lava el tupper", detalle: "", duracion_s: 0, avisos: [], usa: [], consejo: "", pista: "", grupo: "", tipo: "despues", checklist: [] }
  ]
};

test("id del estado: receta, comida y rutina", () => {
  assert.equal(M.idDe({ receta: J }), "r:curry-prueba");
  assert.equal(M.idDe({ receta: J, comida: R }), "r:curry-prueba", "con receta manda la receta");
  assert.equal(M.idDe({ comida: R }), "c:ev-pollo");
  assert.equal(M.idDe({ guia: { uid: "g1", titulo: "Noche" }, pasos: [] }), "g:g1");
});

test("receta de Copiloto Cocina: pasos, chips con cantidad, etiquetas y color", () => {
  const m = M.normaliza({ receta: J });
  assert.equal(m.titulo, "Curry de prueba");
  assert.equal(m.acento, "#E9B00F");
  assert.equal(m.pasos.length, 4);
  assert.equal(m.auto0, false);
  const p1 = m.pasos[1];
  assert.equal(p1.dur, 240);
  assert.deepEqual(p1.usa, [0, 3], "fuera el indice que no existe");
  assert.deepEqual(p1.tags, ["Fuego medio-alto", "Manos"]);
  assert.equal(p1.mientras, "Solomillos en dados de 2–3 cm.");
  assert.equal(p1.vozFin, "Sartén caliente.");
  assert.equal(p1.reloj, "Sartén al fuego", "nombre corto del reloj");
  const pollo = m.ings[0];
  assert.equal(pollo.cant, "500 g"); assert.equal(pollo.num, true); assert.equal(pollo.nombre, "Solomillos de pollo");
  assert.equal(m.ings[3].basico, true, "al gusto = basico");
  assert.equal(m.ings[3].num, false);
  assert.equal(m.ings[5].nombre, "Tomate triturado"); assert.equal(m.ings[5].prep, "bote ya abierto", "lo de entre parentesis, debajo");
  assert.equal(m.pasos[0].est, 180, "estimado ≈3 min");
  assert.ok(m.pasos[0].tags.includes("≈3 min"));
  assert.equal(m.pasos[3].reposo, 2700, "aviso_reposo_min");
  assert.equal(M.numDe(m, 0), 1); assert.equal(M.totalNum(m), 4);
});

test("comida del calendario: Antes de empezar es el paso 0 y los chips llevan la cantidad", () => {
  const m = M.normaliza({ comida: R });
  assert.equal(m.id, "c:ev-pollo");
  assert.equal(m.auto0, true);
  assert.equal(M.numDe(m, 0), 0); assert.equal(M.numDe(m, 3), 3); assert.equal(M.totalNum(m), 5);
  assert.equal(M.nomPaso(m, 0), "Antes de empezar");
  assert.equal(m.pasos[0].secciones.length, 3);
  const bon = m.ings[1];
  assert.equal(bon.cant, "1"); assert.equal(bon.nombre, "Boniato"); assert.equal(bon.prep, "pelado, en cubos de 2 cm");
  assert.equal(m.ings[2].cant, "½");
  assert.equal(m.ings[3].cant, "2 dientes");
  assert.equal(m.ings[4].cant, "3 cdas");
  assert.deepEqual(m.pasos[3].usa, [1, 4]);
  assert.equal(m.pasos[3].dur, 600);
  assert.deepEqual(m.pasos[3].avisos, [{ a_los_s: 300, texto: "Agita", voz: "Agita el cesto" }]);
  assert.equal(m.pasos[3].reloj, "Boniato solo");
  assert.equal(m.pasos[2].reloj, "En vacío para calentar", "sin el tiempo delante");
  assert.equal(m.pasos[1].reloj, "Berenjena con sal");
  assert.equal(m.pasos[4].pista, "hasta que dore");
  assert.deepEqual(m.pasos[5].tags, ["Al terminar"]);
  assert.equal(m.pasos[2].grupo, "AIR FRYER · todo en el cesto");
});

test("rutina y comida vieja con pasos en texto", () => {
  const g = M.normaliza({ guia: { uid: "n1", titulo: "Rutina de noche" }, pasos: [{ titulo: "Lavarse los dientes", detalle: "A las 22:30", duracion_s: 0, manual: true },
    { titulo: "Leer", detalle: "A las 22:40 · 20 min", duracion_s: 1200, manual: true }] });
  assert.equal(g.titulo, "Rutina de noche"); assert.equal(g.pasos.length, 2); assert.equal(g.pasos[1].dur, 1200); assert.equal(g.ings.length, 0);
  const v = M.normaliza({ comida: { uid: "v1", titulo: "Vieja", ingredientes: [], pasos: ["Hierve el agua, 10 min.", "Sirve."] } });
  assert.equal(v.pasos[0].dur, 600); assert.equal(v.pasos[1].titulo, "Sirve.");
  const largo = "Precalienta la air fryer a 200 grados durante cuatro minutos. Mientras, corta el boniato en cubos de dos centimetros.";
  const l = M.normaliza({ comida: { uid: "l", titulo: "L", ingredientes: [], pasos: [{ titulo: largo, duracion_s: 240 }] } }).pasos[0];
  assert.equal(l.titulo, "Precalienta la air fryer a 200 grados durante cuatro minutos", "un titulo largo no va entero en grande");
  assert.equal(l.detalle, "Mientras, corta el boniato en cubos de dos centimetros.", "y el resto, debajo");
  const rep = M.normaliza({ comida: { uid: "r", titulo: "R", ingredientes: [], pasos: [
    { titulo: "Adobo del pollo", detalle: "Adobo del pollo: ese aceite con ajo + 1 cda de limón.", duracion_s: 0 },
    { titulo: "3 min extra sin remover", detalle: "3 min extra sin remover.", duracion_s: 180 },
    { titulo: "El ajo con el AOVE, 20 s al microondas", detalle: "", duracion_s: 20 }] } }).pasos;
  assert.equal(rep[0].detalle, "Ese aceite con ajo + 1 cda de limón.", "el detalle no repite el titulo");
  assert.equal(rep[1].detalle, "");
  assert.equal(rep[2].reloj, "Ajo", "sin articulo delante");
  const cortados = M.normaliza({ comida: { uid: "c", titulo: "C", ingredientes: [], pasos: [
    { titulo: "El ajo con el AOVE, 20 s al microondas, para que no quede…", detalle: "El ajo con el AOVE, 20 s al microondas, para que no quede crudo.", duracion_s: 20 },
    { titulo: "Fuera: unas gotas de limón por encima (opcional) y 2 min…", detalle: "Fuera: unas gotas de limón por encima (opcional) y 2 min de reposo.", duracion_s: 120 }] } }).pasos;
  assert.equal(cortados[0].titulo, "El ajo con el AOVE, 20 s al microondas, para que no quede crudo", "titulo cortado con …: entero");
  assert.equal(cortados[0].detalle, "");
  assert.equal(cortados[1].titulo, "Fuera"); assert.equal(cortados[1].detalle, "Unas gotas de limón por encima (opcional) y 2 min de reposo.");
});

test("relojes: empezar, pausa, +1 min, varios a la vez y pasado de tiempo", () => {
  const m = M.normaliza({ comida: R }), S = M.nuevoEstado(T0);
  const a = M.empieza(S, m.pasos[3], T0, m);
  assert.equal(a.dur, 600); assert.equal(a.fin, T0 + 600e3); assert.equal(a.nombre, "Boniato solo"); assert.equal(a.pasoTxt, "Paso 3");
  assert.equal(M.empieza(S, m.pasos[3], T0 + 5e3, m), a, "un reloj por paso");
  assert.equal(M.empieza(S, m.pasos[5], T0, m), null, "sin tiempo no hay reloj");
  assert.equal(M.restante(a, T0 + 100e3), 500);
  // pausa y sigue
  M.pausa(S, a.id, T0 + 100e3);
  assert.equal(a.pausa, 500); assert.equal(a.fin, null);
  assert.equal(M.restante(a, T0 + 900e3), 500, "en pausa no corre");
  M.pausa(S, a.id, T0 + 200e3);
  assert.equal(a.pausa, null); assert.equal(a.fin, T0 + 700e3);
  // otro a la vez
  const b = M.empieza(S, m.pasos[1], T0 + 200e3, m);
  assert.equal(S.timers.length, 2);
  assert.equal(M.restante(b, T0 + 260e3), 540);
  // +1 min antes de acabar: el tiempo pasado no cambia
  M.masUno(S, a.id, T0 + 400e3);
  assert.equal(M.restante(a, T0 + 400e3), 360); assert.equal(a.dur, 660);
  // se pasa de tiempo
  assert.equal(M.restante(a, T0 + 774e3), -14);
  assert.equal(M.fmt(M.restante(a, T0 + 774e3)), "+0:14");
  // +1 min ya pasado: un minuto desde ahora, y vuelve a sonar
  a.finAvisado = true; a.callado = true;
  M.masUno(S, a.id, T0 + 774e3);
  assert.equal(M.restante(a, T0 + 774e3), 60); assert.equal(a.finAvisado, false); assert.equal(a.callado, false);
  assert.equal(a.dur, 600 + 60 + 14 + 60);
  // parar
  assert.equal(M.para(S, b.id), true); assert.equal(S.timers.length, 1);
});

test("avisos del reloj: a su hora, uno solo si se perdieron varios, y el final", () => {
  const m = M.normaliza({ receta: J }), S = M.nuevoEstado(T0);
  const t = M.empieza(S, m.pasos[2], T0, m);    // 360 s, avisos a 180 y 300
  assert.deepEqual(M.revisa(S, T0 + 100e3), []);
  let ev = M.revisa(S, T0 + 181e3);
  assert.equal(ev.length, 1); assert.equal(ev[0].tipo, "aviso"); assert.equal(ev[0].aviso.texto, "Remover");
  assert.deepEqual(M.revisa(S, T0 + 182e3), [], "no se repite");
  ev = M.revisa(S, T0 + 365e3);
  assert.equal(ev.length, 1); assert.equal(ev[0].tipo, "fin", "el de 300 ya no: solo el final");
  assert.ok(M.sonando(t, T0 + 366e3));
  assert.deepEqual(M.revisa(S, T0 + 400e3), []);
  // pantalla apagada: dos avisos perdidos -> solo el ultimo
  const S2 = M.nuevoEstado(T0), t2 = M.empieza(S2, m.pasos[2], T0, m);
  ev = M.revisa(S2, T0 + 310e3);
  assert.equal(ev.length, 1); assert.equal(ev[0].aviso.texto, "Prueba"); assert.equal(Math.round(ev[0].tarde), 10);
  assert.deepEqual(t2.avisados, [180, 300]);
  // pausar uno que ya ha sonado lo calla
  M.pausa(S, t.id, T0 + 401e3);
  assert.equal(t.callado, true); assert.equal(M.sonando(t, T0 + 402e3), false);
  // el aviso nativo, solo de los que corren
  const S3 = M.nuevoEstado(T0); M.empieza(S3, m.pasos[1], T0, m);
  assert.deepEqual(M.avisosDe(S3, "Curry"), [{ id: "reloj:" + S3.timers[0].id, cuando: T0 + 240e3, titulo: "Sartén al fuego: tiempo", texto: "Paso 2 · Curry" }]);
});

test("Hecho: siguiente paso sin hacer; el reloj que corre se queda, el que sonó se va", () => {
  const m = M.normaliza({ comida: R }), n = m.pasos.length, S = M.nuevoEstado(T0);
  assert.equal(M.hecho(S, n, 0, T0), 1);
  M.empieza(S, m.pasos[1], T0, m);                       // berenjena 10 min
  assert.equal(M.hecho(S, n, 1, T0 + 10e3), 2);
  assert.equal(S.timers.length, 1, "la berenjena sigue como chip");
  S.hechos[3] = 1;                                        // el 3 ya estaba hecho
  assert.equal(M.hecho(S, n, 2, T0 + 20e3), 4, "se salta el hecho");
  // vuelve atras y Hecho otra vez: al siguiente sin hacer
  M.anterior(S, T0); M.anterior(S, T0);
  assert.equal(S.actual, 2);
  assert.equal(M.hecho(S, n, 2, T0), 4);
  // el reloj de un paso que ya ha sonado se quita al darle a Hecho en ese paso
  const t = M.empieza(S, m.pasos[4], T0, m);
  assert.equal(M.hecho(S, n, 4, T0 + 800e3), 5);
  assert.equal(S.timers.includes(t), false);
  assert.equal(S.timers.length, 1, "la berenjena es de otro paso: sigue aunque haya acabado");
  assert.equal(M.hecho(S, n, 5, T0), -1, "todo hecho: fin");
  // si queda uno de antes sin hacer (ni saltado), se vuelve a el
  const S2 = M.nuevoEstado(T0); S2.hechos = { 0: 1, 1: 1, 3: 1, 4: 1 }; S2.actual = 5;
  assert.equal(M.siguiente(S2, n, 5), 2);
});

test("Seguir desde aqui: salta (y se deshace); hacia atras no marca nada", () => {
  const m = M.normaliza({ comida: R }), n = m.pasos.length, S = M.nuevoEstado(T0);
  S.hechos[0] = 1; S.actual = 1;
  const r = M.seguirDesde(S, 4, T0);
  assert.deepEqual(r.saltados, [1, 2, 3]);
  assert.equal(S.actual, 4);
  assert.deepEqual(Object.keys(S.saltados).map(Number), [1, 2, 3]);
  assert.equal(M.siguiente(S, n, 4), 5, "los saltados no vuelven solos");
  M.deshacer(S, r.antes, T0);
  assert.equal(S.actual, 1); assert.deepEqual(S.saltados, {});
  S.hechos = { 0: 1, 1: 1, 2: 1 }; S.actual = 3;
  const r2 = M.seguirDesde(S, 1, T0);
  assert.deepEqual(r2.saltados, []); assert.equal(S.actual, 1); assert.equal(S.hechos[2], 1);
  // un saltado al que se vuelve deja de estar saltado
  S.saltados = { 2: 1 }; M.seguirDesde(S, 2, T0); assert.equal(S.saltados[2], undefined);
});

test("progreso: % y lo que queda (relojes, duraciones, 1 min sin tiempo)", () => {
  const m = M.normaliza({ comida: R }), S = M.nuevoEstado(T0);
  // 0 auto (60) + 600 + 240 + 600 + 720 + 60
  assert.equal(M.quedan(S, m.pasos, T0), 60 + 600 + 240 + 600 + 720 + 60);
  S.hechos[0] = 1; S.actual = 1;
  M.empieza(S, m.pasos[1], T0, m);
  M.hecho(S, m.pasos.length, 1, T0 + 100e3);           // berenjena corre (le quedan 500)
  assert.equal(M.quedan(S, m.pasos, T0 + 100e3), 240 + 600 + 720 + 60, "lo que queda de la berenjena va en paralelo");
  const p = M.progresoDe(S, m.pasos, T0 + 100e3);
  assert.equal(p.hechos, 2); assert.equal(p.total, 6); assert.equal(p.pct, 33);
  assert.equal(p.acaba, T0 + 100e3 + p.quedan_s * 1000);
  // con todo hecho menos el ultimo y un reloj largo de uno hecho, manda el reloj
  const S2 = M.nuevoEstado(T0); for (let k = 0; k < 5; k++) S2.hechos[k] = 1;
  M.empieza(S2, m.pasos[4], T0, m);
  assert.equal(M.quedan(S2, m.pasos, T0), 720);
  // receta: el estimado cuenta para un paso sin reloj
  const mj = M.normaliza({ receta: J });
  assert.equal(M.quedan(M.nuevoEstado(T0), mj.pasos, T0), 180 + 240 + 360 + 120);
});

test("Empezar de 0 (con deshacer) y que preguntar al abrir", () => {
  const m = M.normaliza({ comida: R }), S = M.nuevoEstado(T0);
  S.hechos = { 0: 1, 1: 1 }; S.actual = 2; M.empieza(S, m.pasos[2], T0, m); S.checks.i1 = 1;
  const antes = M.reinicia(S, T0 + 1000);
  assert.equal(S.actual, 0); assert.equal(S.timers.length, 0); assert.deepEqual(S.checks, {});
  M.deshacer(S, antes, T0 + 2000);
  assert.equal(S.actual, 2); assert.equal(S.timers.length, 1); assert.equal(S.checks.i1, 1);
  // decidir al abrir
  const ahora = new Date(2026, 9, 1, 14, 30).getTime();
  const base = { ...M.nuevoEstado(ahora - 20 * 60e3), actual: 3, hechos: { 0: 1, 1: 1, 2: 1 } };
  assert.equal(M.decide(null, m, ahora), "nuevo");
  assert.equal(M.decide(base, m, ahora), "retoma", "hace 20 min: se pregunta");
  assert.equal(M.decide({ ...base, t: ahora - 60e3 }, m, ahora), "sigue", "se cerro hace nada");
  assert.equal(M.decide({ ...base, t: ahora - 7 * 3600e3 }, m, ahora), "nuevo", "mas de 6 h");
  assert.equal(M.decide({ ...M.nuevoEstado(ahora - 20 * 60e3) }, m, ahora), "nuevo", "sin progreso");
  const ayer = M.normaliza({ comida: { ...R, fecha: "2026-09-30" } });
  assert.equal(M.decide(base, ayer, ahora), "nuevo", "la comida era de ayer");
  assert.equal(M.decide({ ...base, terminado: ahora }, m, ahora), "nuevo");
  const conReloj = { ...base, t: ahora - 7 * 3600e3, timers: [{ id: "t", paso: 3, fin: ahora + 60e3, pausa: null, dur: 600, avisos: [], avisados: [] }] };
  assert.equal(M.decide(conReloj, m, ahora), "sigue", "con un reloj vivo se sigue sin preguntar");
  assert.equal(M.decide(conReloj, ayer, ahora), "sigue");
  const pausaVieja = { ...base, t: ahora - 30 * 3600e3, timers: [{ id: "t", paso: 3, fin: null, pausa: 100, dur: 600, avisos: [], avisados: [] }] };
  assert.equal(M.decide(pausaVieja, m, ahora), "nuevo", "un reloj en pausa de ayer no lo mantiene vivo");
});

test("estado viejo copiloto.cocina.modo.<id>: se retoma su paso", () => {
  const mj = M.normaliza({ receta: J });
  const v = { paso: 2, fin: null, pausa: 360, avisados: [], checks: { "0-1": true } };
  const S = M.migra(v, mj, T0);
  assert.equal(S.v, 2); assert.equal(S.actual, 2); assert.deepEqual(S.hechos, { 0: 1, 1: 1 });
  assert.equal(S.checks["c0-1"], 1);
  assert.equal(S.timers.length, 0, "un reloj sin empezar no se trae");
  assert.equal(S.migrado, true);
  assert.equal(M.decide(S, mj, T0), "retoma");
  // con el reloj en marcha: se trae con su fin y lo ya avisado
  const v2 = { paso: 2, fin: T0 + 100e3, pausa: null, avisados: ["2:180", "1:120"], checks: {} };
  const S2 = M.migra(v2, mj, T0);
  assert.equal(S2.timers.length, 1); assert.equal(S2.timers[0].fin, T0 + 100e3); assert.deepEqual(S2.timers[0].avisados, [180]);
  assert.equal(S2.t, T0 + 100e3 - 360e3);
  // en pausa a medias
  const S3 = M.migra({ paso: 1, fin: null, pausa: 100, avisados: [], checks: {} }, mj, T0);
  assert.equal(S3.timers[0].pausa, 100);
  // comida del calendario: antes no habia "Antes de empezar", el paso k es el k+1
  const mr = M.normaliza({ comida: R });
  assert.equal(M.migra({ paso: 2, fin: null, pausa: null, avisados: [], checks: {} }, mr, T0).actual, 3);
  assert.equal(M.migra({ paso: 99 }, mr, T0).actual, 5, "dentro de la lista");
  assert.equal(M.migra(null, mr, T0), null);
});

test("lo gastado: receta junta y suma; comida uno por linea sin basicos ni lo ya hecho", () => {
  const gj = M.gastadoDe(M.normaliza({ receta: J })).map((g) => g.txt);
  assert.deepEqual(gj, ["500 g solomillos de pollo", "2 cdtas ajo troceado congelado", "2 cdtas curry", "100 g tomate triturado"]);
  const gr = M.gastadoDe(M.normaliza({ comida: R }));
  assert.deepEqual(gr.map((g) => g.txt), ["230 g de pollo", "1 boniato", "½ berenjena", "2 dientes de ajo", "½ limón", "3 limones"]);
  assert.equal(gr.find((g) => g.txt === "½ limón").on, false, "lo opcional, sin marcar");
  assert.equal(gr.find((g) => g.txt === "1 boniato").on, true);
  assert.deepEqual(M.gastadoDe(M.normaliza({ guia: { uid: "g" }, pasos: [{ titulo: "x" }] })), []);
});

test("ingredientes agrupados y donde se usan por primera vez", () => {
  const mr = M.normaliza({ comida: R });
  const g = M.gruposIngs(mr);
  assert.deepEqual(g.map((x) => [x.titulo, x.items, x.k]), [["Paso 1", [2, 5], 1], ["Paso 3", [1, 4], 3], ["Paso 4", [0], 4], ["Sin paso", [3, 6, 7, 8], undefined]],
    "por el primer paso que lo usa (no por Antes de empezar, que lo tiene todo)");
  assert.equal(M.primerUso(mr, 6), -1);
  const todoEnAntes = M.normaliza({ comida: { ...R, pasos: [{ ...R.pasos[0], usa: [0, 1, 2, 3, 4, 5, 6, 7, 8] }, ...R.pasos.slice(1)] } });
  assert.deepEqual(M.gruposIngs(todoEnAntes).map((g) => [g.titulo, g.items]), [["Antes de empezar", [3, 6, 7, 8]], ["Paso 1", [2, 5]], ["Paso 3", [1, 4]], ["Paso 4", [0]]],
    "el usa de Antes de empezar (todo) no manda: solo se queda lo que no usa ningun paso");
  assert.equal(M.primerUso(todoEnAntes, 3), 0, "lo que solo esta en Antes de empezar, ahi");
  const soloAntes = M.normaliza({ comida: { ...R, pasos: [R.pasos[0], { titulo: "Sirve", usa: [] }] } });
  assert.equal(M.primerUso(soloAntes, 1), 0, "si ningun paso lo usa, vale el de Antes de empezar");
  const gj = M.gruposIngs(M.normaliza({ receta: J }));
  assert.deepEqual(gj.map((x) => x.titulo), ["Paso 1", "Paso 2", "Paso 3"]);
  const conGrupo = { ...J, ingredientes: J.ingredientes.map((i, k) => ({ ...i, grupo: k < 3 ? "Para el pollo" : "Salsa" })) };
  assert.deepEqual(M.gruposIngs(M.normaliza({ receta: conGrupo })).map((x) => [x.titulo, x.items.length]), [["Para el pollo", 3], ["Salsa", 3]]);
});

test("formatos: tiempo, cantidades y voz", () => {
  assert.equal(M.fmt(600), "10:00"); assert.equal(M.fmt(65), "1:05"); assert.equal(M.fmt(-14), "+0:14"); assert.equal(M.fmt(3700), "1:01:40");
  assert.equal(M.fmtMin(20), "20 s"); assert.equal(M.fmtMin(600), "10 min"); assert.equal(M.fmtMin(3900), "1 h 05");
  assert.equal(M.segDe("≈3 min"), 180); assert.equal(M.segDe("20 s"), 20); assert.equal(M.segDe("1 h"), 3600); assert.equal(M.segDe("3-4 min"), 240); assert.equal(M.segDe(""), 0);
  assert.equal(M.cantTxt({ n: 1500, ud: "g" }), "1,5 kg"); assert.equal(M.cantTxt({ n: 1.5, ud: "ud" }), "1½");
  assert.equal(M.cantTxt({ n: 4, min: 3, ud: "loncha" }), "3-4 lonchas"); assert.equal(M.cantTxt({ n: 0.25, ud: "cdta" }), "¼ cdta");
  assert.equal(M.cantVoz({ n: 2, ud: "cda" }), "2 cucharadas"); assert.equal(M.cantVoz({ n: 0.5, ud: "ud" }), "media");
  assert.equal(M.cantVoz({ n: 230, ud: "g" }), "230 gramos");
});

test("progreso(q) para la tarjeta de Semana, leyendo lo guardado", () => {
  const datos = {};
  globalThis.localStorage = { getItem: (k) => (k in datos ? datos[k] : null), setItem: (k, v) => { datos[k] = String(v); }, removeItem: (k) => { delete datos[k]; } };
  try {
    const ahora = Date.now();
    assert.equal(M.progreso({ comida: R }, ahora), null, "nada guardado");
    const m = M.normaliza({ comida: R }), S = M.nuevoEstado(ahora - 10 * 60e3);
    S.hechos = { 0: 1, 1: 1 }; S.actual = 2; M.empieza(S, m.pasos[1], ahora - 5 * 60e3, m);
    const R2 = { ...R, fecha: new Date(ahora).toISOString().slice(0, 10) };
    datos[M.PREF + "c:ev-pollo"] = JSON.stringify(S);
    const p = M.progreso({ comida: R2 }, ahora);
    assert.equal(p.actual, 2); assert.equal(p.total, 6); assert.equal(p.hechos, 2); assert.equal(p.texto, "Paso 2 de 5");
    assert.equal(p.relojes.length, 1); assert.equal(p.relojes[0].restante_s, 300);
    // el viejo tambien vale (sin escribir nada)
    delete datos[M.PREF + "c:ev-pollo"];
    datos[M.PREF_VIEJO + "r:curry-prueba"] = JSON.stringify({ paso: 1, fin: null, pausa: null, avisados: [], checks: {} });
    assert.equal(M.progreso({ receta: J }, ahora).texto, "Paso 2 de 4");
    assert.ok(datos[M.PREF_VIEJO + "r:curry-prueba"], "progreso no borra nada");
  } finally { delete globalThis.localStorage; }
});
