/* ===========================================================================
   comidas · las comidas de Copiloto, en el KV (v2.74)
   ---------------------------------------------------------------------------
   Desde la v2.74 las recetas no se leen del calendario «Comidas»: viven aquí,
   en el KV COPILOTO, y las cambia la Claude del chat con el conector (/mcp).
   La app las recibe igual que antes, en /agenda (dia, fuente "comida").

     comidas.v1      {t, comidas: [C]}   C = {id, fecha, hora, fin, titulo, texto, t, rev, origen}
     comidas.revision {id: {rev, errores: [txt], avisos: [txt], t}}   lo que dice la app al sincronizar
     casa.v1         {t, zonas: [{zona, items: [{nombre, cant, duda}]}], actualizada}   la foto de Casa
     comidas.importado  la fecha de la importación única del calendario

   Lo de aquí no lee recetas (receta.js es caro para los 10 ms de CPU del plan
   gratis): guarda, borra y lista. El linter completo y el plan los pasa la app.
   =========================================================================== */

export const K_COMIDAS = "comidas.v1", K_REVISION = "comidas.revision", K_CASA = "casa.v1", K_IMPORTADO = "comidas.importado";
const ZONA = "Europe/Madrid";

async function leeJSON(env, k, d) {
  try { const v = await env.COPILOTO.get(k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
}

/* ------------------------------- fechas ------------------------------- */
// "2026-10-25" + "13:30" en Madrid -> ISO UTC (la app ordena y mide "en 20 min" con esto)
export function inicioDe(fecha, hora, zona) {
  const [y, m, d] = String(fecha).split("-").map(Number), [h, mi] = String(hora || "00:00").split(":").map(Number);
  let t = Date.UTC(y, m - 1, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const p = new Intl.DateTimeFormat("en-GB", { timeZone: zona || ZONA, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t)).reduce((a, x) => (a[x.type] = x.value, a), {});
    const vista = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    t += Date.UTC(y, m - 1, d, h, mi) - vista;
  }
  return new Date(t).toISOString();
}
export function hoyISO(zona, ms) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: zona || ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms || Date.now()));
  return p;
}
export function masDias(fecha, n) {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
// "08:45" -> "desayuno"; la franja la decide la hora
export function franja(hora) {
  if (!hora) return "día";
  const [h, m] = hora.split(":").map(Number), x = h * 60 + m;
  return x < 11 * 60 + 30 ? "desayuno" : x < 16 * 60 + 30 ? "comida" : x < 19 * 60 + 30 ? "merienda" : x < 21 * 60 + 25 ? "cena" : "noche";
}

/* ------------------------------- guardar ------------------------------- */
export async function lista(env) {
  const g = await leeJSON(env, K_COMIDAS, null);
  return g && Array.isArray(g.comidas) ? g : { t: null, comidas: [] };
}
async function escribe(env, g) {
  g.t = Date.now();
  g.comidas.sort((a, b) => (a.fecha + (a.hora || "")) < (b.fecha + (b.hora || "")) ? -1 : 1);
  await env.COPILOTO.put(K_COMIDAS, JSON.stringify(g));
  return g;
}
function nuevoId() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
// crea (sin id, o con uno que no existe) o cambia una comida. -> la comida guardada
export async function guarda(env, c) {
  const g = await lista(env), ahora = Date.now();
  let x = c.id ? g.comidas.find((y) => y.id === c.id) : null;
  if (!x) {
    x = { id: c.id || nuevoId(), rev: 0, origen: c.origen || "conector" };
    g.comidas.push(x);
  }
  x.fecha = c.fecha; x.hora = c.hora || null; x.fin = c.fin || null;
  x.titulo = String(c.titulo).trim(); x.texto = String(c.texto).replace(/\r/g, "").trim();
  x.rev = (x.rev || 0) + 1; x.t = ahora;
  await escribe(env, g);
  return x;
}
export async function borra(env, id) {
  const g = await lista(env), n = g.comidas.length;
  g.comidas = g.comidas.filter((x) => x.id !== id);
  if (g.comidas.length === n) return false;
  await escribe(env, g);
  return true;
}
// para /agenda: lo mismo que salía del calendario
export function aDia(x, zona) {
  return { fuente: "comida", uid: x.id, fecha: x.fecha, hora: x.hora, fin: x.fin, inicio: inicioDe(x.fecha, x.hora || "12:00", zona),
           titulo: x.titulo, texto: x.texto, rev: x.rev || 1 };
}
export async function delRango(env, desde, hasta) {
  const g = await lista(env);
  return g.comidas.filter((x) => x.fecha >= desde && x.fecha <= hasta);
}

/* ------------------------- importación única -------------------------
   La primera vez (sin comidas.importado): las comidas del calendario «Comidas» desde hace 7 días
   (Casa descuenta lo que gastaron las ya empezadas) se copian al KV, con su uid de siempre. El
   calendario no se toca. eventos = lo que devuelve expande() del iCal (ver index.js).          */
export async function importa(env, eventos) {
  if (await env.COPILOTO.get(K_IMPORTADO)) return { hecho: false, ya: true };
  const g = await lista(env), hay = new Set(g.comidas.map((x) => x.id));
  let n = 0;
  for (const e of eventos) {
    if (!e || !e.uid || hay.has(e.uid)) continue;
    g.comidas.push({ id: e.uid, fecha: e.fecha, hora: e.hora || null, fin: e.fin || null, titulo: e.titulo || "", texto: e.texto || "",
                     rev: 1, t: Date.now(), origen: "calendario" });
    n++;
  }
  if (n) await escribe(env, g);
  await env.COPILOTO.put(K_IMPORTADO, new Date().toISOString());
  return { hecho: true, n };
}

/* ------------------- lo que manda la app al sincronizar -------------------
   revision: {id: {rev, errores, avisos}} (el linter completo y el plan, pasados en el móvil)
   casa: {zonas: [...], actualizada} (la foto de Casa: lo que hay en la despensa y el congelador)
   Solo se escribe si cambia algo: el plan gratis da 1000 escrituras al día.                  */
const corta = (v, n) => typeof v === "string" ? v.slice(0, n) : "";
export async function recibe(env, cuerpo) {
  if (!cuerpo || typeof cuerpo !== "object") return;
  if (cuerpo.revision && typeof cuerpo.revision === "object") {
    const antes = await leeJSON(env, K_REVISION, {}), g = await lista(env), ids = new Set(g.comidas.map((x) => x.id));
    const out = {};
    for (const id of Object.keys(antes)) if (ids.has(id)) out[id] = antes[id];
    for (const [id, r] of Object.entries(cuerpo.revision).slice(0, 300)) {
      if (!ids.has(id) || !r || !isFinite(r.rev)) continue;
      out[id] = { rev: +r.rev, errores: (r.errores || []).slice(0, 30).map((t) => corta(t, 400)), avisos: (r.avisos || []).slice(0, 30).map((t) => corta(t, 400)) };
    }
    if (JSON.stringify(out) !== JSON.stringify(antes)) await env.COPILOTO.put(K_REVISION, JSON.stringify(out));
  }
  if (cuerpo.casa && Array.isArray(cuerpo.casa.zonas)) {
    const c = { zonas: cuerpo.casa.zonas.slice(0, 12).map((z) => ({ zona: corta(z.zona, 40),
      items: (z.items || []).slice(0, 150).map((i) => ({ nombre: corta(i.nombre, 120), cant: corta(i.cant, 40), duda: !!i.duda })) })),
      actualizada: corta(cuerpo.casa.actualizada, 30) };
    const antes = await leeJSON(env, K_CASA, null);
    if (!antes || JSON.stringify(antes.zonas) !== JSON.stringify(c.zonas) || antes.actualizada !== c.actualizada) {
      c.t = Date.now(); await env.COPILOTO.put(K_CASA, JSON.stringify(c));
    }
  }
}
export async function revisiones(env) { return leeJSON(env, K_REVISION, {}); }
export async function casa(env) { return leeJSON(env, K_CASA, null); }
