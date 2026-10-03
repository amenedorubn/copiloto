// Tests de pasos.js: punto de decision, rectas y cadencia. Datos inventados (nada real).
//   node --test tests/pasos.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const P = createRequire(import.meta.url)("../pasos.js");
const T0 = Date.UTC(2026, 9, 4, 8, 0, 0);

// un "movil" de mentira: reloj y distancia que avanzan a la vez, y todo lo que dice el copiloto
function banco(opc = {}) {
  const s = { t: T0, d: 0, ritmo: 392, rapido: NaN, cad: NaN, gps: true, dicho: [], diario: [], decisiones: [], metro: [], ...opc };
  const io = {
    ahora: () => s.t, dist: () => s.d,
    aviso: (x) => { if (x) s.dicho.push({ t: s.t, d: s.d, x, tipo: "aviso" }); },
    habla: (x) => { if (x) s.dicho.push({ t: s.t, d: s.d, x, tipo: "habla" }); },
    registra: (q, x) => s.diario.push({ t: s.t, q, x }),
    decision: (r) => s.decisiones.push(r),
    ritmoRapido: () => s.rapido, cadencia: () => s.cad, gpsOk: () => s.gps,
    metronomo: (on, spm) => s.metro.push({ t: s.t, on, spm }),
  };
  const m = P.crea(P.plantillaRectas(), io);
  s.m = m;
  // avanza "seg" segundos a s.ritmo (s/km), mirando cada 250 ms; "antes" corre en cada paso
  s.corre = (seg, antes) => { for (let i = 0; i < seg * 4; i++) { s.t += 250; s.d += 250 / 1000 / s.ritmo * 1000; if (antes) antes(); m.tick(); } };
  s.hasta = (metros, antes) => { while (s.d < metros) { s.t += 250; s.d += 250 / 1000 / s.ritmo * 1000; if (antes) antes(); m.tick(); } };
  return s;
}
const dijo = (s, re) => s.dicho.filter((x) => re.test(x.x));

test("valida: rechaza una decision cuya opcion segura arranca un esfuerzo", () => {
  const p = P.plantillaRectas();
  assert.deepEqual(P.valida(p), []);
  const mal = JSON.parse(JSON.stringify(p));
  mal[0].opciones.forEach((o) => { if (o.seguro) o.sigue = "rectas"; });
  assert.ok(P.valida(mal).some((e) => /opcion segura no puede/.test(e)));
  const dos = JSON.parse(JSON.stringify(p)); dos[0].opciones[0].seguro = true;
  assert.ok(P.valida(dos).some((e) => /exactamente una opcion segura/.test(e)));
  const sin = JSON.parse(JSON.stringify(p)); sin[0].opciones.forEach((o) => { delete o.seguro; });
  assert.ok(P.valida(sin).length > 0);
  const techo = JSON.parse(JSON.stringify(p)); techo[1].techo = 270;
  assert.ok(P.valida(techo).some((e) => /mas lento que el techo/.test(e)));
  assert.throws(() => P.crea(mal, {}), /mal definidos/);
});

test("la pregunta salta en el km 9,8 y no antes", () => {
  const s = banco();
  s.hasta(9790);
  assert.equal(s.dicho.length, 0, "a 9,79 km todavia no");
  assert.equal(s.m.vista(), null);
  s.hasta(9801);
  const q = dijo(s, /haces 4 rectas/);
  assert.equal(q.length, 1);
  assert.equal(q[0].x, "En 200 metros: ¿haces 4 rectas? Toca en pantalla.");
  assert.ok(q[0].d >= 9800 && q[0].d < 9803, "saltó a " + q[0].d);
  const v = s.m.vista();
  assert.equal(v.fase, "pregunta");
  assert.deepEqual(v.opciones.map((o) => o.etiqueta), ["Sí, 4 rectas", "No, seguir suave"]);
  assert.equal(v.espera_s, 15);
});

test("sin respuesta en 15 s: No, con voz, y nunca Si", () => {
  const s = banco();
  s.hasta(9801);
  const t0 = dijo(s, /haces 4 rectas/)[0].t;   // cuando se hizo la pregunta
  s.corre(13.5);
  assert.equal(s.m.decisionDe("rectas-decision"), null, "a los 14 s todavia puede contestar");
  assert.ok(s.m.vista().restan_s <= 2 && s.m.vista().restan_s >= 1);
  s.corre(1.5);
  const d = s.m.decisionDe("rectas-decision");
  assert.equal(d.valor, "no");
  assert.equal(d.origen, "tiempo");
  assert.ok(d.t - t0 >= 15000 && d.t - t0 <= 15500, "elegido a los " + (d.t - t0) / 1000 + " s");
  assert.equal(dijo(s, /No he oído respuesta: seguimos suave/).length, 1);
  s.hasta(10300); s.corre(120);
  assert.equal(s.m.vista(), null, "no hay rectas");
  assert.equal(dijo(s, /Tres, dos, uno, ya/).length, 0);
  assert.equal(s.m.responde("rectas-decision", "si"), false, "contestar tarde no cambia nada");
  assert.equal(s.m.decisionDe("rectas-decision").valor, "no");
});

test("No tocado: sigue suave y se guarda valor y hora", () => {
  const s = banco();
  s.hasta(9810); s.corre(4);
  assert.equal(s.m.responde("rectas-decision", "no"), true);
  assert.equal(s.decisiones.length, 1);
  const r = s.decisiones[0];
  assert.equal(r.valor, "no"); assert.equal(r.origen, "toque");
  assert.equal(r.hora, new Date(s.t).toISOString());
  assert.ok(r.km > 9.8 && r.km < 9.9);
  assert.ok(s.diario.some((x) => x.q === "decision" && /no \(tocado\)/.test(x.x)));
  s.hasta(10400); s.corre(60);
  assert.equal(s.m.ocupado(), false);
  assert.equal(s.metro.length, 0);
});

test("Si: 4 de 20 s con 60 s de trote, cuenta atras y el resto suave", () => {
  const s = banco();
  s.hasta(9810); s.corre(3);
  assert.equal(s.m.responde("rectas-decision", "si"), true);
  assert.equal(s.decisiones[0].valor, "si");
  assert.equal(s.m.vista().fase, "armada");
  assert.equal(s.m.ocupado(), false, "hasta el km 10 no se calla nada");
  s.hasta(10000);
  s.corre(0.25);
  assert.equal(s.m.ocupado(), true);
  assert.equal(s.m.vista().fase, "cuenta");
  const cuentas = () => dijo(s, /Tres, dos, uno, ya/);
  assert.equal(cuentas().length, 1);
  assert.match(cuentas()[0].x, /Rápido pero controlado, no sprint\. Tres, dos, uno, ya\./);
  // recorre todo con ritmo de trabajo correcto (4'20") en las repeticiones
  const inicios = [], fines = [];
  let fasePrev = null;
  s.ritmo = 392;
  for (let i = 0; i < 4 * 400 && s.m.vista(); i++) {
    const f = s.m.vista().fase;
    if (f === "trabajo" && fasePrev !== "trabajo") inicios.push(s.t);
    if (f !== "trabajo" && fasePrev === "trabajo") fines.push(s.t);
    fasePrev = f;
    s.ritmo = f === "trabajo" ? 260 : 392;
    s.corre(0.25);
  }
  assert.equal(inicios.length, 4, "cuatro repeticiones");
  fines.forEach((fin, i) => { const d = (fin - inicios[i]) / 1000; assert.ok(d >= 20 && d <= 20.5, "rep " + (i + 1) + " duró " + d); });
  for (let i = 1; i < 4; i++) { const tr = (inicios[i] - fines[i - 1]) / 1000; assert.ok(tr >= 59.5 && tr <= 61, "trote " + i + ": " + tr + " s"); }
  assert.equal(cuentas().length, 4, "una cuenta atrás por repetición");
  assert.equal(s.metro.filter((x) => x.on).length, 4);
  assert.equal(s.metro.filter((x) => !x.on).length, 4);
  assert.ok(s.metro.filter((x) => x.on).every((x) => x.spm === 173), "173 pasos/min = 86,5 por pie");
  assert.equal(dijo(s, /Rectas hechas/).length, 1);
  assert.equal(s.m.ocupado(), false);
  assert.equal(s.m.vista().fase, "hecho");
  assert.match(s.m.resumenDecision("rectas"), /Sí, 4 rectas · tocado a las \d\d:\d\d · rectas hechas/);
});

test("techo: frena un poco solo si el ritmo suavizado pasa de 4'05\", una vez por recta", () => {
  const s = banco();
  s.hasta(9810); s.m.responde("rectas-decision", "si"); s.hasta(10000);
  // a 4'20" (260) no avisa nunca
  s.rapido = 260;
  while (s.m.vista() && s.m.vista().fase !== "trabajo") s.corre(0.25);
  s.corre(19);
  assert.equal(dijo(s, /Frena un poco/).length, 0);
  // a 4'00" (240, por encima del techo de 4'05") avisa, pero una sola vez en la recta
  while (s.m.vista().fase !== "trote") s.corre(0.25);
  while (s.m.vista().fase !== "trabajo") s.corre(0.25);
  s.rapido = 240;
  s.corre(19);
  assert.equal(dijo(s, /Frena un poco/).length, 1);
  // justo en el techo (245) no cuenta como pasarse; sin dato de ritmo tampoco
  while (s.m.vista().fase !== "trote") s.corre(0.25);
  while (s.m.vista().fase !== "trabajo") s.corre(0.25);
  s.rapido = NaN; s.corre(10);
  s.rapido = 245; s.corre(9);
  assert.equal(dijo(s, /Frena un poco/).length, 1);
});

test("cadencia fuera de banda: una sola correccion por recta, sin sensor no dice nada", () => {
  const s = banco();
  s.hasta(9810); s.m.responde("rectas-decision", "si"); s.hasta(10000);
  while (s.m.vista().fase !== "trabajo") s.corre(0.25);
  s.cad = NaN; s.corre(19);
  assert.equal(dijo(s, /cadencia/i).length, 0);
  while (s.m.vista().fase !== "trabajo") s.corre(0.25);
  s.cad = 80; s.corre(19);
  assert.equal(dijo(s, /Sube la cadencia/).length, 1);
  while (s.m.vista().fase !== "trabajo") s.corre(0.25);
  s.cad = 87; s.corre(19);
  assert.equal(dijo(s, /Sube la cadencia|Baja la cadencia/).length, 1, "en banda no corrige");
  // nunca se guia con la frecuencia cardiaca
  assert.equal(s.dicho.some((x) => /pulsaciones|frecuencia card/i.test(x.x)), false);
});

test("borde: GPS perdido en el punto de decision", () => {
  // salta de 9,7 a 10,4 km sin pasar por el aviso
  const s = banco({ gps: false });
  s.hasta(9700);
  s.d = 10400; s.m.tick();
  const d = s.m.decisionDe("rectas-decision");
  assert.equal(d.valor, "no"); assert.equal(d.origen, "gps");
  assert.equal(dijo(s, /Sin GPS en el punto de decisión: sigo suave/).length, 1);
  assert.equal(dijo(s, /haces 4 rectas/).length, 0);
  assert.equal(s.decisiones[0].origen, "gps");
  // con GPS, llegar ya pasado (empezar tarde) es silencioso
  const u = banco(); u.d = 10500; u.m.tick();
  assert.equal(u.m.decisionDe("rectas-decision").origen, "salto");
  assert.equal(u.dicho.length, 0);
});

test("borde: GPS perdido con 'Si' elegido: si vuelve muy tarde no se empieza", () => {
  const s = banco();
  s.hasta(9810); s.m.responde("rectas-decision", "si");
  s.d = 10800; s.m.tick();
  assert.equal(s.m.vista(), null);
  assert.equal(dijo(s, /no he podido empezar las rectas/).length, 1);
  assert.match(s.m.resumenDecision("rectas"), /no se hicieron \(sin GPS\)/);
  // y si vuelve a tiempo (menos de 300 m despues) empiezan
  const u = banco();
  u.hasta(9810); u.m.responde("rectas-decision", "si");
  u.d = 10150; u.m.tick();
  assert.equal(u.m.vista().fase, "cuenta");
});

test("borde: GPS perdido con la pregunta en pantalla: se decide por tiempo y se avisa en la tarjeta", () => {
  const s = banco();
  s.hasta(9801);
  s.gps = false;
  assert.equal(s.m.vista().sinGps, true);
  s.t += 16000; s.m.tick();
  assert.equal(s.m.decisionDe("rectas-decision").valor, "no");
});

test("una pausa no se come la pregunta ni las repeticiones", () => {
  const s = banco();
  s.hasta(9801); s.corre(5);
  s.t += 40000; s.m.desplaza(40000); s.m.tick();           // 40 s de pausa
  assert.equal(s.m.vista().fase, "pregunta", "sigue esperando");
  assert.ok(s.m.vista().restan_s >= 9 && s.m.vista().restan_s <= 11);
  s.m.responde("rectas-decision", "si"); s.hasta(10000);
  while (s.m.vista().fase !== "trabajo") s.corre(0.25);
  s.corre(8);
  s.t += 30000; s.m.desplaza(30000); s.m.tick();
  assert.equal(s.m.vista().fase, "trabajo", "la recta sigue donde iba");
  assert.ok(s.m.vista().resta_s >= 11 && s.m.vista().resta_s <= 13, "quedan " + s.m.vista().resta_s);
});

test("el estado sobrevive a que se mate la pestaña", () => {
  const s = banco();
  s.hasta(9810); s.m.responde("rectas-decision", "si"); s.hasta(10000); s.corre(25);
  const guardado = JSON.parse(JSON.stringify(s.m.estado()));
  const s2 = banco({ t: s.t, d: s.d });
  s2.m.restaura(guardado);
  assert.equal(s2.m.vista().fase, s.m.vista().fase);
  assert.equal(s2.m.decisionDe("rectas-decision").valor, "si");
  s2.corre(1);
  assert.equal(dijo(s2, /haces 4 rectas/).length, 0, "no vuelve a preguntar");
});

test("otros parametros de la plantilla: objetivo, techo, repeticiones y punto son configurables", () => {
  const p = P.plantillaRectas({ n: 6, trabajo_s: 30, trote_s: 90, en: 8000, antes: 300, objetivo: 270, techo: 255, espera_s: 20, id: "otras" });
  assert.deepEqual(P.valida(p), []);
  assert.equal(p[0].opciones[0].etiqueta, "Sí, 6 rectas");
  assert.equal(p[0].en, 8000); assert.equal(p[0].espera_s, 20);
  assert.equal(p[1].objetivo, 270); assert.equal(p[1].techo, 255);
  assert.equal(P.plantillaRectas()[1].objetivo, 260, "por defecto 4'20\"");
  assert.equal(P.plantillaRectas()[1].techo, 245, "por defecto 4'05\"");
  assert.deepEqual(P.plantillaRectas()[1].cadencia, { min: 85, max: 88 });
});

// ---- cadencia desde el acelerometro
function senal(spm, seg, { ruido = 0.6, fs = 50, amp = 6 } = {}) {
  const out = []; let r = 12345;
  const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff - 0.5; };
  const f = spm / 60;
  for (let i = 0; i < seg * fs; i++) {
    const t = T0 + (i * 1000) / fs, ph = 2 * Math.PI * f * (i / fs);
    // gravedad en un eje + impacto en cada apoyo (picos) + ruido
    const imp = amp * Math.pow(Math.max(0, Math.sin(ph)), 3);
    out.push([t, 1.2 + rnd() * ruido, 0.8 + rnd() * ruido, 9.8 + imp + rnd() * ruido]);
  }
  return out;
}
test("cadencia: 172 pasos/min = 86 ciclos, con ruido", () => {
  for (const [spm, esperado] of [[172, 86], [176, 88], [160, 80], [184, 92]]) {
    const c = P.Cadencia();
    const x = senal(spm, 14);
    x.forEach((m) => c.alimenta(m[0], m[1], m[2], m[3]));
    const v = c.ciclos(x[x.length - 1][0]);
    assert.ok(Math.abs(v - esperado) <= 2, `${spm} spm -> ${v}`);
  }
});
test("cadencia: sin movimiento o con pocos datos da NaN", () => {
  const c = P.Cadencia();
  assert.ok(Number.isNaN(c.ciclos(T0)));
  for (let i = 0; i < 300; i++) c.alimenta(T0 + i * 20, 0.1, 0.2, 9.81);
  assert.ok(Number.isNaN(c.ciclos(T0 + 6000)));
  c.alimenta(NaN, 1, 1, 1);   // basura: no revienta
});
