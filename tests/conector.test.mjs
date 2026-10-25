// v2.74 · el conector MCP de Copiloto (worker/src/mcp.js, comidas.js): las herramientas, con un KV de mentira
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { rpc, atiende, ligera, bloqueFormato } from "../worker/src/mcp.js";
import { aDia, importa, recibe, lista, K_COMIDAS, franja } from "../worker/src/comidas.js";
const require = createRequire(import.meta.url);
const Receta = require("../receta.js");
const Carriles = require("../carriles.js");
const Cocina = require("../cocina.js");

function kv() {
  const M = new Map(); let escrituras = 0;
  return { get: async (k) => (M.has(k) ? M.get(k) : null), put: async (k, v) => { escrituras++; M.set(k, String(v)); },
           get escrituras() { return escrituras; }, M };
}
const MD = readFileSync(new URL("../docs/RECETAS-CALENDARIO.md", import.meta.url), "utf8");
const deps = { formato: bloqueFormato(MD), cambios: async () => [] };
let id = 0;
const llama = async (env, name, args) => (await rpc(env, { jsonrpc: "2.0", id: ++id, method: "tools/call", params: { name, arguments: args } }, deps)).result;
const txt = (r) => r.content.map((c) => c.text).join("\n");
const v4 = (f) => { const L = readFileSync(new URL("../docs/recetas-v4/" + f, import.meta.url), "utf8").split("\n"); return { titulo: L[0], texto: L.slice(2).join("\n") }; };

test("MCP: initialize y las 6 herramientas", async () => {
  const env = { COPILOTO: kv() };
  const ini = await rpc(env, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } }, deps);
  assert.equal(ini.result.protocolVersion, "2025-06-18");
  assert.ok(ini.result.capabilities.tools);
  const l = await rpc(env, { jsonrpc: "2.0", id: 2, method: "tools/list" }, deps);
  assert.deepEqual(l.result.tools.map((t) => t.name), ["menu", "receta", "guardar_comida", "borrar_comida", "casa", "formato"]);
  assert.equal(await rpc(env, { jsonrpc: "2.0", method: "notifications/initialized" }, deps), null, "una notificación no lleva respuesta");
});

test("guardar_comida: una receta mala da errores (uno por línea) y NO se guarda", async () => {
  const env = { COPILOTO: kv() };
  const r = await llama(env, "guardar_comida", { fecha: "2026-11-02", hora: "14:00", titulo: "Pasta",
    texto: "1 RACIÓN · 20 min\n\nPROCESO\n1. La pasta, 10 min\n2. Echa @sal{=1 pizca} · 1 min" });
  assert.equal(r.isError, true);
  const t = txt(r);
  assert.match(t, /^No se ha guardado/);
  assert.match(t, /\nFalta «POR RACIÓN/);
  assert.match(t, /\nPROCESO, paso 1 «?\(?«La pasta, 10 min»\)?: no empieza por un verbo/);
  assert.match(t, /falta el tiempo al final/);
  assert.match(t, /formato v3/);
  t.split("\n").slice(1).forEach((l) => assert.ok(l.length < 300 && !/\n/.test(l)));
  assert.equal(env.COPILOTO.escrituras, 0, "nada en el KV");
  assert.match(txt(await llama(env, "menu", { desde: "2026-11-01", hasta: "2026-11-07" })), /No hay comidas/);
});

test("guardar_comida: una buena aparece en menu(), en la agenda de la app y, revisada por la app, en receta()", async () => {
  const env = { COPILOTO: kv() }, c = v4("2026-10-06-1300-lentejas.txt");
  const g = await llama(env, "guardar_comida", { fecha: "2026-11-02", hora: "14:00", ...c });
  assert.ok(!g.isError, txt(g));
  const cid = txt(g).match(/id (c[a-z0-9]+)/)[1];
  let m = txt(await llama(env, "menu", { desde: "2026-11-01", hasta: "2026-11-07" }));
  assert.match(m, /2026-11-02 14:00 · comida · 🍽️ COCINAS · Lentejas/);
  assert.match(m, new RegExp("id: " + cid + " · sin cocinar · revisión: pendiente"));
  assert.ok(m.includes("CARRIL LENTEJAS (olla)"), "con la receta v4");
  // la app la recibe en /agenda igual que antes las del calendario…
  const x = (await lista(env)).comidas[0], dia = [aDia(x, "Europe/Madrid")];
  assert.equal(dia[0].fuente, "comida"); assert.equal(dia[0].uid, cid); assert.equal(dia[0].inicio, "2026-11-02T13:00:00.000Z");
  const R = Cocina.comida(dia[0]);
  assert.equal(R.formato, 4); assert.deepEqual(R.lint.errores, []);
  // …le pasa el linter completo y el plan, y lo manda al sincronizar
  const rv = Cocina.revision(dia, {});
  assert.deepEqual(rv[cid], { rev: 1, errores: [], avisos: rv[cid].avisos });
  assert.equal(Cocina.revision(dia, { [cid]: 1 }), null, "lo ya mandado no se manda otra vez");
  await recibe(env, { revision: rv });
  assert.match(txt(await llama(env, "receta", { id: cid })), /Revisión de la app: sin errores/);
  assert.match(txt(await llama(env, "menu", {})).replace(/\n/g, " "), /No hay comidas|revisión: sin errores/);
  // cambiarla vuelve a dejar la revisión pendiente
  await llama(env, "guardar_comida", { id: cid, fecha: "2026-11-02", hora: "14:30", ...c });
  assert.match(txt(await llama(env, "receta", { id: cid })), /Revisión: pendiente/);
  assert.equal((await lista(env)).comidas[0].rev, 2);
});

test("receta() con errores de la app: el plan con carriles (nada caliente esperando más de 60 s)", async () => {
  const env = { COPILOTO: kv() };
  const texto = "1 RACIÓN · 30 min\nPOR RACIÓN · 500 kcal · 30 g proteína\n\nCARRIL PASTA (olla)\n1. Pon a hervir 2 l de agua en la olla a fuego fuerte · 8 min (espera) → hierve\n2. Echa 100 g de pasta a la olla · 10 min (espera) → al dente\n\nCARRIL SALSA (sartén)\n1. Pica 1 cebolla · 15 min (manos)\n2. Sofríe la cebolla con 1 cda de AOVE en la sartén a fuego medio · 10 min → transparente\n\nAL JUNTAR\n1. Mezcla la pasta con la salsa · 1 min";
  assert.deepEqual(ligera({ fecha: "2026-11-03", hora: "14:00", titulo: "Pasta", texto }), [], "lo básico está bien: se guarda");
  const g = await llama(env, "guardar_comida", { fecha: "2026-11-03", hora: "14:00", titulo: "Pasta", texto });
  const cid = txt(g).match(/id (c[a-z0-9]+)/)[1], x = (await lista(env)).comidas[0];
  const r = Carriles.revisa(Receta.leer(aDia(x)));
  assert.equal(r.errores.length, 1); assert.match(r.errores[0], /^Plan: «Pon a hervir 2 l de agua.*» acaba 8 min antes de «Echa 100 g de pasta/);
  await recibe(env, { revision: { [cid]: { rev: x.rev, ...r } } });
  const t = txt(await llama(env, "receta", { id: cid }));
  assert.match(t, /Revisión de la app: 1 errores \(arréglalos y vuelve a guardar\):\n- Plan: «Pon a hervir/);
});

test("borrar_comida, casa() y formato()", async () => {
  const env = { COPILOTO: kv() };
  const g = await llama(env, "guardar_comida", { fecha: "2026-11-04", hora: "21:00", titulo: "Saca el salmón del congelador", texto: "" });
  assert.ok(!g.isError, "un recordatorio no necesita receta");
  const cid = txt(g).match(/id (c[a-z0-9]+)/)[1];
  assert.match(txt(await llama(env, "borrar_comida", { id: cid })), /Borrada/);
  assert.equal((await llama(env, "borrar_comida", { id: cid })).isError, true);
  assert.match(txt(await llama(env, "casa", {})), /aún no ha subido/);
  await recibe(env, { casa: { zonas: [{ zona: "Congelador", items: [{ nombre: "Salmón", cant: "2 lomos", duda: false }, { nombre: "Guisantes", cant: "", duda: true }] }], actualizada: "2026-10-25 13:00" } });
  assert.match(txt(await llama(env, "casa", {})), /Congelador:\n- Salmón · 2 lomos\n- Guisantes ¿\?/);
  const f = txt(await llama(env, "formato", {}));
  assert.match(f, /^RECETAS DEL CALENDARIO «COMIDAS» · formato v4/);
  assert.match(f, /guardar_comida/);
  assert.equal(franja("08:45"), "desayuno"); assert.equal(franja("14:00"), "comida"); assert.equal(franja("21:00"), "cena");
});

test("importación única: las comidas del calendario pasan al KV una sola vez, con su uid", async () => {
  const env = { COPILOTO: kv() };
  const ev = [{ uid: "abc@1", fecha: "2026-10-25", hora: "13:30", fin: "14:15", titulo: "Lentejas", texto: "2 RACIONES…" },
              { uid: "def@2", fecha: "2026-10-26", hora: "21:00", titulo: "Cena", texto: "…" }];
  assert.deepEqual(await importa(env, ev), { hecho: true, n: 2 });
  assert.deepEqual(await importa(env, ev.concat([{ uid: "nuevo@3", fecha: "2026-10-27", titulo: "x", texto: "" }])), { hecho: false, ya: true }, "solo una vez");
  const g = JSON.parse(env.COPILOTO.M.get(K_COMIDAS));
  assert.deepEqual(g.comidas.map((x) => [x.id, x.origen]), [["abc@1", "calendario"], ["def@2", "calendario"]]);
});

test("HTTP: POST /mcp devuelve JSON-RPC; una notificación, 202; GET, 405", async () => {
  const env = { COPILOTO: kv() };
  const r = await atiende(new Request("https://x/mcp", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 7, method: "tools/list" }) }), env, deps);
  assert.equal(r.status, 200); assert.equal((await r.json()).id, 7);
  const n = await atiende(new Request("https://x/mcp", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) }), env, deps);
  assert.equal(n.status, 202);
  assert.equal((await atiende(new Request("https://x/mcp"), env, deps)).status, 405);
});
