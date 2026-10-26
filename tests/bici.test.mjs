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
  // todo: balance, par, rueda, biela y energia
  const t = [0x35, 0x08, ...le(200), 104, ...le(320), ...le(5), ...le(0), ...le(1024), ...le(7), ...le(512), ...le(42)];
  assert.deepEqual(B.leePotencia(t), { w: 200, balance: 52, par: 10, rueda: { rev: 5, t: 512 }, biela: { rev: 7, t: 512 }, kj: 42 });
  // con balance de pedales (bit 0) la biela va 1 byte mas alla
  const c = [0x21, 0x00, ...le(200), 50, ...le(7), ...le(512)];
  assert.deepEqual(B.leePotencia(c), { w: 200, balance: 25, biela: { rev: 7, t: 512 } });
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
  assert.deepEqual(L.vistos().sort(), ["biela", "w"]);
});

test("FTMS: velocidad, cadencia y vatios", () => {
  // flags: bit 2 (cadencia) + bit 6 (potencia); velocidad presente (bit 0 = 0)
  const b = [0x44, 0x00, ...le(3150), ...le(180), ...le(210)];
  assert.deepEqual(B.leeFTMS(b), { kmh: 31.5, cad: 90, w: 210 });
  // todo lo de una BODY BIKE con FTMS completo: + distancia, resistencia, kcal, pulso y tiempo
  const full = [0x74, 0x0b, ...le(3150), ...le(180), 0x10, 0x27, 0x00, ...le(8), ...le(210), ...le(95), ...le(600), 30, 142, ...le(1200)];
  assert.deepEqual(B.leeFTMS(full), { kmh: 31.5, cad: 90, distBici: 10000, resist: 8, w: 210, kcal: 95, kcalHora: 600, kcalMin: 30, fc: 142, tBici: 1200 });
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
  const R = B.resumenDe(M);
  assert.deepEqual([R.seg, R.km, R.w, R.kj, R.cad, R.wMax, R.cadMax, R.w5], [2, 0.0174, 200, 1, 90, 300, 100, 200]);
  // con pulsaciones de la bici (M[5]) van al resumen y al TCX sin reloj
  const Mh = [[0, 100, 80, 0, 0, 120], [1, 100, 80, 5, 1000, 130]];
  assert.equal(B.resumenDe(Mh).fc, 125);
  assert.match(B.tcx(Mh, 0), /<HeartRateBpm><Value>130<\/Value>/);
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

test("juntar con el reloj: pulsaciones interpoladas por la hora real y en el TCX", () => {
  const ini = Date.UTC(2026, 9, 26, 16, 46, 51);
  // el reloj empezo 53 s despues, una medida cada 5 s
  const P = { inicio: ini + 53000, t: [0, 5, 10], bpm: [100, 110, 120] };
  const f = B.fcDe(P);
  assert.equal(f(ini + 53000), 100);
  assert.equal(f(ini + 55500), 105);            // a medio camino
  assert.equal(f(ini + 40000), 100);            // 13 s antes: la primera
  assert.equal(f(ini + 30000), null);           // 23 s antes: nada
  assert.equal(f(ini + 63000 + 20000), null);
  const M = [[0, 150, 85, 0, ini + 53000], [1, 160, 86, 9, ini + 58000], [2, 170, 87, 18, ini + 63000]];
  const x = B.tcx(M, ini, f);
  assert.match(x, /<Id>2026-10-26T16:47:44Z<\/Id>/);       // la hora real de la primera muestra
  assert.match(x, /<HeartRateBpm><Value>110<\/Value><\/HeartRateBpm>/);
  assert.match(x, /<AverageHeartRateBpm><Value>110<\/Value><\/AverageHeartRateBpm><MaximumHeartRateBpm><Value>120<\/Value>/);
});

test("Worker /pulsos: elige la del reloj que se solapa y trae sus pulsaciones", async () => {
  const { pulsos } = await import("../worker/src/strava.js");
  const ini = Date.UTC(2026, 9, 26, 16, 46, 51), fin = ini + 657000;
  const viejo = globalThis.fetch;
  globalThis.fetch = async (u) => {
    u = String(u);
    const ok = (j) => ({ ok: true, status: 200, json: async () => j, text: async () => "" });
    if (u.includes("oauth/token")) return ok({ access_token: "t", expires_at: Date.now() / 1000 + 3600 });
    if (u.includes("athlete/activities")) return ok([
      { id: 1, name: "Bicicleta por la tarde", start_date: new Date(ini).toISOString(), elapsed_time: 657, has_heartrate: false },
      { id: 2, name: "Ciclismo en interiores", start_date: new Date(ini + 53000).toISOString(), elapsed_time: 650, has_heartrate: true },
      { id: 3, name: "Carrera de ayer", start_date: new Date(ini - 86400000).toISOString(), elapsed_time: 3000, has_heartrate: true }
    ]);
    if (u.includes("/activities/2/streams")) return ok({ time: { data: [0, 5] }, heartrate: { data: [96, 104] } });
    throw new Error("no esperado " + u);
  };
  try {
    const env = { STRAVA_REFRESH_TOKEN: "r", STRAVA_CLIENT_ID: "a", STRAVA_CLIENT_SECRET: "b" };
    const r = await pulsos(env, new URL("https://x/pulsos?desde=" + ini + "&hasta=" + fin));
    assert.equal(r.id, "2"); assert.equal(r.nombre, "Ciclismo en interiores");
    assert.equal(r.inicio, ini + 53000); assert.deepEqual(r.bpm, [96, 104]);
    const r2 = await pulsos(env, new URL("https://x/pulsos?desde=" + (ini + 7200000) + "&hasta=" + (fin + 7200000)));
    assert.equal(r2.error, "sin_reloj");
  } finally { globalThis.fetch = viejo; }
});
