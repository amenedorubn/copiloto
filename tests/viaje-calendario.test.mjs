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

test("la guía empareja cada evento con su parada y conserva el audio", async () => {
  const r = await app.fetch(new Request("https://w.test/viaje?dia=2026-11-04", { headers: { "X-Copiloto-Key": "k" } }), env);
  const { eventos } = await r.json();
  const ls = {}, win = {}, ctx = { window: win, localStorage: { getItem: (k) => ls[k] || null, setItem: (k, v) => { ls[k] = v; } } };
  ctx.globalThis = ctx;
  vm.runInNewContext(readFileSync(new URL("../viaje.js", import.meta.url), "utf8"), ctx);
  ls["copiloto.viaje.cal.2026-11-04"] = JSON.stringify({ hora: "11:39", eventos });
  vm.runInNewContext(readFileSync(new URL("../viaje.js", import.meta.url), "utf8"), ctx);
  const P = JSON.parse(JSON.stringify(ctx.window.Viaje._lista()));
  assert.deepEqual(P.map((x) => [x.s, !!x.g, !!x.mov]), [
    ["9:30", false, false], ["10:10", false, true], ["11:40", true, false], ["17:15", true, false], ["19:00", false, false]]);
  assert.deepEqual(P[1].l, ["L3", "L2"]);
  assert.equal(P[2].n, "SEP");
  assert.equal(P[4].d, "Una descripción.");
});
