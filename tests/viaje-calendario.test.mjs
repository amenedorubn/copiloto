// v2.82: la guía del viaje toma el horario del calendario (ruta /viaje del Worker, ICAL_VIAJE).
// Datos ficticios con la zona de Madrid, como los eventos reales: la hora sale en la de CDMX.
//   node --test tests/viaje-calendario.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { app } from "../worker/src/app.js";

const ev = (uid, ini, fin, tit, desc = "", lugar = "") => [
  "BEGIN:VEVENT", "UID:" + uid, "DTSTART;TZID=Europe/Madrid:" + ini, "DTEND;TZID=Europe/Madrid:" + fin,
  "SUMMARY:" + tit, "DESCRIPTION:" + desc, "LOCATION:" + lugar, "END:VEVENT"].join("\r\n");
const ICS = ["BEGIN:VCALENDAR", "X-WR-TIMEZONE:Europe/Madrid",
  ev("a", "20261104T163000", "20261104T170000", "🎒 Preparar la mochila"),
  ev("b", "20261104T171000", "20261104T175500", "🚇 Soriana → Zócalo", "Línea 3 (verde) L3 y luego L2", "Zócalo\\, CDMX"),
  ev("c", "20261104T184000", "20261104T194500", "🎨 Murales de Diego Rivera (SEP) + Plaza Santo Domingo", "texto"),
  ev("d", "20261105T001500", "20261105T011500", "🌇 Torre Latinoamericana (mirador al atardecer)"),
  ev("e", "20261105T020000", "20261105T030000", "🍽️ Algo nuevo que no está en la guía", "Una descripción.", "Roma Norte"),
  ev("f", "20261105T160000", "20261105T170000", "Otro día"),
  "END:VCALENDAR"].join("\r\n");

const env = { APP_KEY: "k", ICAL_URL: "x", ICAL_VIAJE: "https://ical.test/v.ics" };
globalThis.fetch = async () => new Response(ICS);

test("/viaje devuelve los eventos del día en hora de Ciudad de México", async () => {
  const r = await app.fetch(new Request("https://w.test/viaje?dia=2026-11-04", { headers: { "X-Copiloto-Key": "k" } }), env);
  const j = await r.json();
  assert.deepEqual(j.eventos.map((e) => [e.hora, e.fin, e.titulo.split(" ")[1]]), [
    ["09:30", "10:00", "Preparar"], ["10:10", "10:55", "Soriana"], ["11:40", "12:45", "Murales"],
    ["17:15", "18:15", "Torre"], ["19:00", "20:00", "Algo"]]);
});

test("/viaje sin el secreto avisa y sin clave no contesta", async () => {
  const r = await app.fetch(new Request("https://w.test/viaje", { headers: { "X-Copiloto-Key": "k" } }), { ...env, ICAL_VIAJE: undefined });
  assert.equal((await r.json()).error, "sin_viaje");
  const r2 = await app.fetch(new Request("https://w.test/viaje"), env);
  assert.equal(r2.status, 401);
});

test("si el calendario no trae ninguna parada del plan del día, se queda el plan fijo", async () => {
  const r = await app.fetch(new Request("https://w.test/viaje?dia=2026-11-04", { headers: { "X-Copiloto-Key": "k" } }), env);
  const { eventos } = await r.json();
  const ls = {}, win = { viajeDia: "2026-11-11" }, ctx = { window: win, localStorage: { getItem: (k) => ls[k] || null, setItem: (k, v) => { ls[k] = v; } } };
  ctx.globalThis = ctx;
  ls["copiloto.viaje.cal.2026-11-11"] = JSON.stringify({ hora: "11:39", eventos });
  vm.runInNewContext(readFileSync(new URL("../viaje.js", import.meta.url), "utf8"), ctx);
  const P = JSON.parse(JSON.stringify(ctx.window.Viaje._lista()));
  assert.equal(ctx.window.Viaje.dia, "2026-11-11");
  assert.ok(P.find((x) => /^🏰 Castillo/.test(x.t)).g.length >= 7);
  assert.equal(P.length, 14);
});

const carga = (eventos) => {
  const ls = { "copiloto.viaje.cal.2026-11-11": JSON.stringify({ hora: "8:00", eventos }) }, win = { viajeDia: "2026-11-11" };
  const ctx = { window: win, localStorage: { getItem: (k) => ls[k] || null, setItem: (k, v) => { ls[k] = v; } } };
  ctx.globalThis = ctx;
  vm.runInNewContext(readFileSync(new URL("../viaje.js", import.meta.url), "utf8"), ctx);
  return JSON.parse(JSON.stringify(ctx.window.Viaje._lista()));
};

test("miércoles 11: un único evento-resumen del día no sustituye al plan con guías", () => {
  const P = carga([{ hora: "09:00", fin: "19:00", titulo: "🏰 Polanco, Cablebús, Chapultepec, Reforma, Roma-Condesa y Bellas Artes (solo)", texto: "1. 9:00 …" }]);
  assert.equal(P.length, 14);
  assert.ok(P.find((x) => /Cablebús Línea 3/.test(x.t)).g.length >= 5);
});

test("miércoles 11: con eventos por parada, cada uno se empareja con su guía", () => {
  const P = carga([
    { hora: "10:30", fin: "11:30", titulo: "🚡 Cablebús ida y vuelta" },
    { hora: "12:00", fin: "13:30", titulo: "🏰 Castillo de Chapultepec" },
    { hora: "16:45", fin: "17:30", titulo: "🎭 Bellas Artes por dentro" }]);
  assert.equal(P.length, 3);
  assert.ok(P.every((x) => x.g && x.g.length >= 4));
  assert.equal(P[1].s, "12:00");
});

test("miércoles 11: todas las guías y personajes existen", () => {
  const P = carga([]);
  const src = readFileSync(new URL("../viaje.js", import.meta.url), "utf8");
  P.forEach((x) => (x.q || []).forEach((k) => assert.ok(new RegExp("\\n  " + k + ":\\[").test(src), k)));
  const min = P.filter((x) => x.g).reduce((n, x) => n + x.g.reduce((m, s) => m + s.slice(1).join(" ").split(/\s+/).length, 0), 0) / 150;
  assert.ok(min > 35, "audio total " + min);
});

test("martes 10: ese día la guía es la de Coyoacán, con mapa y audio", () => {
  const win = { viajeDia: "2026-11-10" }, ctx = { window: win, localStorage: { getItem: () => null, setItem: () => {} } };
  ctx.globalThis = ctx;
  vm.runInNewContext(readFileSync(new URL("../viaje.js", import.meta.url), "utf8"), ctx);
  const P = JSON.parse(JSON.stringify(ctx.window.Viaje._lista()));
  assert.equal(ctx.window.Viaje.dia, "2026-11-10");
  assert.match(ctx.window.Viaje.tit, /Coyoacán/);
  assert.ok(P.find((x) => /Viveros de Coyoacán/.test(x.t)).g.length >= 4);
  assert.ok(P.find((x) => /Walmart/.test(x.t)).map);
  const src = readFileSync(new URL("../viaje.js", import.meta.url), "utf8");
  P.forEach((x) => (x.q || []).forEach((k) => assert.ok(new RegExp("\\n  " + k + ":\\[").test(src), k)));
});

test("miércoles 11 rehecho: empieza en La Lagunilla y el Castillo va antes de las 17:00", () => {
  const P = carga([]);
  assert.match(P[1].t, /Lagunilla/);
  assert.ok(P[1].g.length >= 4);
  const c = P.find((x) => x.n === "Castillo");
  assert.equal(c.e, "16:00");
  const pins = P.filter((x) => x.pin).map((x) => x.pin);
  assert.deepEqual(pins, [1, 2, 3, 4, 5, 6, 7]);
});
