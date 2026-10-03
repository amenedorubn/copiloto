// Tests de rutalocal.js en un Chrome de verdad (necesita DOMParser e IndexedDB).
// GPX INVENTADOS, lejos de cualquier sitio real: aqui no hay ni una ruta de verdad.
//   node --test tests/rutalocal.test.mjs        (se salta si no hay Chrome ni playwright-core)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
let chromium = null;
try { ({ chromium } = await import("playwright-core")); } catch (e) { /* sin playwright */ }
const hay = !!chromium && existsSync(CHROME);
const JS = readFileSync(new URL("../rutalocal.js", import.meta.url), "utf8");

// GPX de mentira: una recta al este desde (0,5 N; 0,5 E), con la altura que se pida por km
function gpx({ n = 61, paso = 50, ele = (i) => 100 + i * 0.5, hora = true, nombre = "Ruta de prueba", extra = "" } = {}) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const lon = 0.5 + (i * paso) / 111320;
    const e = ele(i);
    pts.push(`<trkpt lat="0.5" lon="${lon.toFixed(6)}">${e === null ? "" : `<ele>${e}</ele>`}${hora ? `<time>2026-10-01T00:${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}Z</time>` : ""}</trkpt>`);
  }
  return `<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1"><metadata><name>meta</name></metadata><trk>${nombre === null ? "" : `<name>${nombre}</name>`}<trkseg>${pts.join("")}</trkseg></trk>${extra}</gpx>`;
}

let srv, url, br, pg;
before(async () => {
  if (!hay) return;
  srv = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end("<!doctype html><title>t</title>"); });
  await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
  url = "http://127.0.0.1:" + srv.address().port + "/";
  br = await chromium.launch({ executablePath: CHROME, args: ["--mute-audio"] });
  pg = await br.newPage();
  await pg.goto(url);
  await pg.addScriptTag({ content: JS });
});
after(async () => { if (br) await br.close(); if (srv) srv.close(); });

const lee = (txt) => pg.evaluate((t) => { const g = RutaLocal.leeGpx(t); if (!g.ok) return g; const a = RutaLocal.analiza(g); return { g: { nombre: g.nombre, n: g.pts.length, desc: g.descartados }, a }; }, txt);
const opt = { skip: !hay && "sin Chrome o playwright-core" };

test("completo: distancia, desnivel, perfil por km y nombre", opt, async () => {
  // 61 puntos cada 50 m = 3 km; sube 0,5 m por punto (25 m por km)
  const r = await lee(gpx());
  assert.equal(r.g.nombre, "Ruta de prueba");
  assert.ok(Math.abs(r.a.distancia - 3000) <= 8, "distancia " + r.a.distancia);
  assert.equal(r.a.tieneEle, true); assert.equal(r.a.tieneHora, true);
  assert.equal(r.a.asc, 30); assert.equal(r.a.desc, 0);
  assert.equal(r.a.eleMin, 100); assert.equal(r.a.eleMax, 130);
  assert.equal(r.a.kms.length, 3);
  assert.deepEqual(r.a.kms.map((k) => k.largo), [1000, 1000, 1000].map((x, i) => r.a.kms[i].largo));
  assert.ok(r.a.kms.every((k) => k.asc >= 9 && k.asc <= 11), JSON.stringify(r.a.kms));
  assert.ok(Math.abs(r.a.kms[0].ini - 100) < 0.6 && Math.abs(r.a.kms[2].fin - 130) < 0.6);
  assert.equal(r.a.perfil[0][0], 0); assert.ok(r.a.perfil.length >= 30);
});

test("el desnivel suma subidas y bajadas por separado y no cuenta el ruido del GPS", opt, async () => {
  // sube 20, baja 20 en tramos de 10 m
  const perfil = [100, 110, 120, 110, 100];
  const r = await lee(gpx({ n: 5, paso: 100, ele: (i) => perfil[i] }));
  assert.equal(r.a.asc, 20); assert.equal(r.a.desc, 20);
  // llano con ruido de +-0,3 m: nada
  const rr = await lee(gpx({ n: 40, paso: 25, ele: (i) => 100 + (i % 2 ? 0.3 : -0.3) }));
  assert.equal(rr.a.asc, 0); assert.equal(rr.a.desc, 0);
});

test("borde: sin altura no se inventa nada", opt, async () => {
  const r = await lee(gpx({ ele: () => null }));
  assert.equal(r.a.tieneEle, false);
  assert.equal(r.a.asc, null); assert.equal(r.a.desc, null);
  assert.equal(r.a.kms.length, 0); assert.equal(r.a.perfil.length, 0);
  assert.ok(Math.abs(r.a.distancia - 3000) <= 8, "la distancia si se da");
  const svg = await pg.evaluate((t) => RutaLocal.perfilSvg(RutaLocal.analiza(RutaLocal.leeGpx(t))), gpx({ ele: () => null }));
  assert.equal(svg, "");
  const f = await pg.evaluate((t) => { const g = RutaLocal.leeGpx(t); return RutaLocal.resumenTxt(RutaLocal.ficha(g, RutaLocal.analiza(g), "x.gpx")); }, gpx({ ele: () => null }));
  assert.match(f, /sin altimetría/);
});

test("borde: sin hora sigue valiendo; con alguna altura suelta se avisa de que es parcial", opt, async () => {
  const r = await lee(gpx({ hora: false }));
  assert.equal(r.a.tieneHora, false); assert.equal(r.a.tieneEle, true); assert.equal(r.a.asc, 30);
  const p = await lee(gpx({ ele: (i) => (i === 10 || i === 11 ? null : 100 + i * 0.5) }));
  assert.equal(p.a.tieneEle, true); assert.equal(p.a.eleParcial, true);
  assert.equal(p.a.asc, 30, "los puntos sin altura se saltan, no se inventan");
});

test("error: GPX invalido, vacio, roto, sin trazado o sin puntos", opt, async () => {
  const casos = [
    ["", /vacío/], ["   \n", /vacío/], ["esto no es xml", /válido/], ["<gpx><trk>", /válido/],
    ["<?xml version='1.0'?><html><body/></html>", /No es un GPX/],
    ['<?xml version="1.0"?><gpx version="1.1"><trk><name>x</name><trkseg/></trk></gpx>', /ningún trazado/],
    ['<?xml version="1.0"?><gpx version="1.1"><trk><trkseg><trkpt lat="0.5" lon="0.5"/></trkseg></trk></gpx>', /dos puntos/],
    ['<?xml version="1.0"?><gpx version="1.1"><trk><trkseg><trkpt lat="95" lon="0.5"/><trkpt lat="0.5" lon="400"/><trkpt lat="x" lon="1"/></trkseg></trk></gpx>', /dos puntos/],
  ];
  for (const [txt, re] of casos) {
    const r = await lee(txt);
    assert.equal(r.ok, false, "debía fallar: " + txt.slice(0, 30));
    assert.match(r.error, re);
  }
  const grande = await pg.evaluate(() => RutaLocal.leeGpx("a".repeat(13 * 1024 * 1024)));
  assert.equal(grande.ok, false); assert.match(grande.error, /demasiado grande/);
});

test("una ruta (rte) vale como un track; sin nombre usa el del archivo", opt, async () => {
  const txt = '<?xml version="1.0"?><gpx version="1.1"><rte><name>Mi rte</name>' +
    Array.from({ length: 5 }, (_, i) => `<rtept lat="0.5" lon="${(0.5 + i * 0.001).toFixed(4)}"/>`).join("") + "</rte></gpx>";
  const r = await lee(txt);
  assert.equal(r.g.n, 5); assert.equal(r.g.nombre, "");
  const f = await pg.evaluate((t) => { const g = RutaLocal.leeGpx(t); return RutaLocal.ficha(g, RutaLocal.analiza(g), "Salida del sabado.gpx").nombre; }, txt);
  assert.equal(f, "Salida del sabado");
});

test("la ficha no lleva el texto del GPX ni las coordenadas completas, y el id es estable", opt, async () => {
  const txt = gpx();
  const r = await pg.evaluate((t) => {
    const g = RutaLocal.leeGpx(t), a = RutaLocal.analiza(g), f1 = RutaLocal.ficha(g, a, "a.gpx"), f2 = RutaLocal.ficha(g, a, "b.gpx");
    return { f: f1, mismo: f1.id === f2.id };
  }, txt);
  assert.equal(r.mismo, true);
  assert.match(r.f.id, /^loc-/);
  assert.equal(JSON.stringify(r.f).includes("<trkpt"), false);
  assert.equal(r.f.linea, undefined);
  assert.ok(r.f.mini.length > 10);
});

test("IndexedDB: guarda, lista, lee y borra; la lista no trae los puntos", opt, async () => {
  const r = await pg.evaluate(async (t) => {
    const g = RutaLocal.aligera(RutaLocal.leeGpx(t)), a = RutaLocal.analiza(g), f = RutaLocal.ficha(g, a, "x.gpx");
    const linea = RutaLocal.codifica(g.pts);
    await RutaLocal.almacen.guarda(f, linea, [100, 101]);
    const l = await RutaLocal.almacen.lista(), uno = await RutaLocal.almacen.lee(f.id);
    await RutaLocal.almacen.guarda(f, linea, [100, 101]);              // reimportar la misma: no se duplica
    const l2 = await RutaLocal.almacen.lista();
    await RutaLocal.almacen.borra(f.id);
    const l3 = await RutaLocal.almacen.lista(), nada = await RutaLocal.almacen.lee(f.id);
    return { n: l.length, tieneLinea: "linea" in l[0], ele: uno.ele, lin: uno.linea === linea, n2: l2.length, n3: l3.length, nada };
  }, gpx());
  assert.equal(r.n, 1); assert.equal(r.tieneLinea, false);
  assert.deepEqual(r.ele, [100, 101]); assert.equal(r.lin, true);
  assert.equal(r.n2, 1); assert.equal(r.n3, 0); assert.equal(r.nada, null);
});

test("error: sin IndexedDB (o bloqueada) se avisa en vez de callar", opt, async () => {
  // el modulo cargado de nuevo en un "navegador" sin indexedDB, y en otro donde open() revienta
  const prueba = (indexedDB) => pg.evaluate(async ([js, idb]) => {
    const raiz = { DOMParser: window.DOMParser };
    if (idb === "rompe") raiz.indexedDB = { open() { throw new Error("bloqueado por el navegador"); } };
    new Function("window", "module", js.replace('typeof window!=="undefined" ? window : globalThis', "window"))(raiz, undefined);
    try { await raiz.RutaLocal.almacen.lista(); return "sin error"; } catch (e) { return e.message; }
  }, [JS, indexedDB]);
  assert.match(await prueba("falta"), /IndexedDB/);
  assert.match(await prueba("rompe"), /bloqueado/);
});
