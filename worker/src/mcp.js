/* ===========================================================================
   mcp · el conector de Copiloto para la Claude del chat (v2.74)
   ---------------------------------------------------------------------------
   MCP remoto por Streamable HTTP en POST /mcp, sin estado (sin Durable Objects:
   cada petición se basta sola). La entrada la protege el OAuth de index.js
   (GitHub, solo tu usuario); aquí ya llega autenticada.

   Herramientas: menu, receta, guardar_comida, borrar_comida, casa, formato.
   guardar_comida hace una comprobación LIGERA (v4, raciones, POR RACIÓN, y que
   cada paso empiece por un verbo y acabe en « · tiempo»): es lo que cabe en los
   10 ms de CPU del plan gratis. El linter completo y el plan con carriles los
   pasa la app al sincronizar, y su resultado sale en receta() y menu().
   =========================================================================== */
import Receta from "../../receta.js";
import { lista, guarda, borra, delRango, franja, hoyISO, masDias, revisiones, casa } from "./comidas.js";

const VERSIONES = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVIDOR = { name: "copiloto", title: "Copiloto · comidas", version: "2.74.0" };

const HERRAMIENTAS = [
  { name: "menu", title: "Menú",
    description: "Las comidas de Copiloto entre dos fechas (incluidas): id, fecha, hora, franja, título, si ya está cocinada, la revisión de la app y la receta en formato v4.",
    inputSchema: { type: "object", properties: {
      desde: { type: "string", description: "Primer día, AAAA-MM-DD. Por defecto, hoy." },
      hasta: { type: "string", description: "Último día, AAAA-MM-DD. Por defecto, 6 días después de «desde»." } } } },
  { name: "receta", title: "Una comida",
    description: "Una comida entera por su id (el de menu): fecha, hora, título, texto v4 y lo que dice la app al revisarla (linter completo y plan).",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "guardar_comida", title: "Guardar una comida",
    description: "Crea una comida (sin id) o cambia una (con id). El texto va en formato v4 (llama a formato() si dudas). Antes de guardar se comprueba lo básico; si algo falla NO se guarda y vuelven los errores, uno por línea, para arreglarlos y reintentar. El linter completo y el plan los pasa Copiloto al sincronizar: míralos luego con receta(id).",
    inputSchema: { type: "object", properties: {
      id: { type: "string", description: "Para cambiar una comida que ya existe. Sin id, se crea una nueva." },
      fecha: { type: "string", description: "AAAA-MM-DD" }, hora: { type: "string", description: "HH:MM (hora de empezar)" },
      fin: { type: "string", description: "HH:MM (opcional)" },
      titulo: { type: "string", description: "«Plato» o «ETIQUETA · Plato»" },
      texto: { type: "string", description: "La receta en v4: «2 RACIONES · 45 min · …», «POR RACIÓN · … kcal · … g proteína», apartados y pasos." } },
      required: ["fecha", "hora", "titulo", "texto"] } },
  { name: "borrar_comida", title: "Borrar una comida",
    description: "Borra una comida de Copiloto por su id. No toca el calendario.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "casa", title: "Lo que hay en casa",
    description: "Lo que hay en la despensa, la nevera y el congelador según Copiloto (la última foto que subió la app al sincronizar), por zonas.",
    inputSchema: { type: "object", properties: {} } },
  { name: "formato", title: "Cómo se escribe una receta",
    description: "Las instrucciones del formato v4 de recetas de Copiloto. Léelas antes de escribir una comida.",
    inputSchema: { type: "object", properties: {} } }
];

/* ---------------------------- comprobación ligera ---------------------------- */
const T_FIN = /\s·\s*(?:\d+(?:[.,]\d+)?|[½¼¾])(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*(?:segundos?|seg|s|minutos?|min|horas?|h)(?![a-záéíóúñ])/i;
const NO_PASOS = /^(ing|grupo|nota|planB|reparto)$/;
// -> [errores, en una línea cada uno]. Lo que no sea una receta (compra, recordatorio) solo necesita título.
export function ligera(c) {
  const E = [], tit = String(c.titulo || "").trim(), texto = String(c.texto || "").replace(/\r/g, "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.fecha || "") || isNaN(Date.parse(c.fecha))) E.push("La fecha tiene que ser AAAA-MM-DD.");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.hora || "")) E.push("La hora tiene que ser HH:MM.");
  if (c.fin && !/^([01]\d|2[0-3]):[0-5]\d$/.test(c.fin)) E.push("La hora de fin tiene que ser HH:MM.");
  if (!tit) E.push("Falta el título.");
  if (texto.length > 20000) E.push("El texto es demasiado largo (más de 20 000 caracteres).");
  const nt = Receta.norm(Receta.sinEmoji(tit));
  if (/\u{1F6D2}/u.test(tit) || /^compra\b/.test(nt) || /^(saca|descongela)\b/.test(nt)) return E;   // compra o recordatorio
  if (!texto.trim()) { E.push("Falta el texto de la receta."); return E; }
  if (Receta.esV3(texto)) E.push("Está en formato v3 (@, ~{}, #): escríbela en v4. Llama a formato() para ver cómo.");
  const L = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!/\d+\s*raci[oó]n/i.test(tit + " " + (L[0] || ""))) E.push("Falta la primera línea: «2 RACIONES · 45 min · …».");
  if (!L.some((l) => /^por raci[oó]n\b/i.test(l) && /kcal/i.test(l) && /prote/i.test(l))) E.push("Falta «POR RACIÓN · 610 kcal · 52 g proteína».");
  let sec = null, nom = "PROCESO", n = 0, pasos = 0;
  L.forEach((l, i) => {
    const h = Receta.cabecera(l, L[i + 1]);
    if (h) { sec = h.t; nom = String(h.nombre).replace(/\(.*$/, "").trim().toUpperCase(); n = 0; return; }
    if (!/^\d{1,2}[.)]\s/.test(l) || NO_PASOS.test(sec || "")) return;
    n++; pasos++;
    const cuerpo = l.replace(/^\d{1,2}[.)]\s+/, ""), d = nom + ", paso " + n + " («" + (cuerpo.length > 50 ? cuerpo.slice(0, 48) + "…" : cuerpo) + "»)";
    if (!Receta.verbo(cuerpo)) E.push(d + ": no empieza por un verbo («Corta», «Echa», «Pasa»…).");
    if (!T_FIN.test(cuerpo.split(/\s(?:→|->)\s/)[0])) E.push(d + ": falta el tiempo al final, tras « · » («· 5 min», «· 20 s»).");
    const m = cuerpo.match(/[@#{}]|~\{/); if (m) E.push(d + ": sobra «" + m[0] + "» (en v4 no hay @, #, ~ ni llaves).");
  });
  if (!pasos) E.push("No hay pasos numerados («1. Corta …· 2 min»).");
  return E;
}

/* -------------------------------- herramientas -------------------------------- */
function lineaRev(x, rv) {
  const r = rv[x.id];
  if (!r || r.rev !== (x.rev || 1)) return "revisión: pendiente (la app la revisa al sincronizar)";
  return r.errores.length ? "revisión: " + r.errores.length + (r.errores.length === 1 ? " error" : " errores") : "revisión: sin errores" + (r.avisos.length ? " (" + r.avisos.length + " avisos)" : "");
}
function cocinadas(cambios) {
  const s = new Set();
  (cambios || []).forEach((c) => { if (c && !c.borrado && (c.tipo === "hecho" || c.tipo === "gasto") && c.uid) s.add(c.uid); });
  return s;
}
const txt = (t) => ({ content: [{ type: "text", text: t }] });
const mal = (t) => ({ content: [{ type: "text", text: t }], isError: true });

export async function herramienta(env, nombre, a, deps) {
  a = a || {};
  if (nombre === "menu") {
    const desde = /^\d{4}-\d{2}-\d{2}$/.test(a.desde || "") ? a.desde : hoyISO();
    const hasta = /^\d{4}-\d{2}-\d{2}$/.test(a.hasta || "") ? a.hasta : masDias(desde, 6);
    const [C, rv, cb] = await Promise.all([delRango(env, desde, hasta), revisiones(env), deps.cambios(env)]), hechas = cocinadas(cb);
    if (!C.length) return txt(`No hay comidas entre ${desde} y ${hasta}.`);
    return txt(`${C.length} comidas entre ${desde} y ${hasta}:\n\n` + C.map((x) =>
      `## ${x.fecha} ${x.hora || ""} · ${franja(x.hora)} · ${x.titulo}\nid: ${x.id} · ${hechas.has(x.id) ? "cocinada" : "sin cocinar"} · ${lineaRev(x, rv)}\n\n${x.texto}`).join("\n\n"));
  }
  if (nombre === "receta") {
    const g = await lista(env), x = g.comidas.find((y) => y.id === a.id);
    if (!x) return mal(`No hay ninguna comida con id «${a.id}». Mira los ids con menu().`);
    const [rv, cb] = await Promise.all([revisiones(env), deps.cambios(env)]), r = rv[x.id], al = r && r.rev === (x.rev || 1);
    let t = `${x.titulo}\n${x.fecha} ${x.hora || ""}${x.fin ? "–" + x.fin : ""} · ${franja(x.hora)} · id ${x.id} · ${cocinadas(cb).has(x.id) ? "cocinada" : "sin cocinar"}\n\n${x.texto}\n\n`;
    t += !al ? "Revisión: pendiente. La app pasa el linter completo y el plan al sincronizar (abre Copiloto o toca ↻)."
      : r.errores.length ? "Revisión de la app: " + r.errores.length + " errores (arréglalos y vuelve a guardar):\n" + r.errores.map((e) => "- " + e).join("\n")
      : "Revisión de la app: sin errores.";
    if (al && r.avisos.length) t += "\nAvisos:\n" + r.avisos.map((e) => "- " + e).join("\n");
    return txt(t);
  }
  if (nombre === "guardar_comida") {
    const c = { id: a.id ? String(a.id) : null, fecha: String(a.fecha || ""), hora: String(a.hora || ""), fin: a.fin ? String(a.fin) : null,
                titulo: String(a.titulo || ""), texto: String(a.texto || "") };
    if (c.id) { const g = await lista(env); if (!g.comidas.some((y) => y.id === c.id)) return mal(`No hay ninguna comida con id «${c.id}». Para crear una nueva, sin id.`); }
    const E = ligera(c);
    if (E.length) return mal("No se ha guardado. Arregla esto y vuelve a intentarlo:\n" + E.join("\n"));
    const x = await guarda(env, c);
    return txt(`Guardada: ${x.titulo} (${x.fecha} ${x.hora}), id ${x.id}, versión ${x.rev}. La app la ve al sincronizar y le pasa el linter completo y el plan: mira receta("${x.id}") después.`);
  }
  if (nombre === "borrar_comida") {
    return (await borra(env, String(a.id || ""))) ? txt(`Borrada la comida ${a.id}.`) : mal(`No hay ninguna comida con id «${a.id}».`);
  }
  if (nombre === "casa") {
    const c = await casa(env);
    if (!c) return txt("Copiloto aún no ha subido lo que hay en casa. Abre la app (pestaña Cocina) para que sincronice.");
    return txt(`Lo que hay en casa según Copiloto${c.actualizada ? " (al " + c.actualizada + ")" : ""}. «¿?» = no se sabe si queda.\n\n` +
      c.zonas.map((z) => `${z.zona}:\n` + z.items.map((i) => `- ${i.nombre}${i.cant ? " · " + i.cant : ""}${i.duda ? " ¿?" : ""}`).join("\n")).join("\n\n"));
  }
  if (nombre === "formato") return txt(deps.formato || "Sin instrucciones.");
  return mal(`No hay ninguna herramienta «${nombre}».`);
}

// el bloque «Instrucciones para la Claude del calendario» de docs/RECETAS-CALENDARIO.md (lo que devuelve formato())
export function bloqueFormato(md) {
  md = String(md || "");
  const i = md.indexOf("## Instrucciones para la Claude del calendario");
  const a = i < 0 ? -1 : md.indexOf("```", i), b = a < 0 ? -1 : md.indexOf("```", a + 3);
  return a < 0 || b < 0 ? md.slice(0, 4000) : md.slice(md.indexOf("\n", a) + 1, b).trim();
}

/* ----------------------------------- JSON-RPC ----------------------------------- */
export async function rpc(env, m, deps) {
  const id = m && m.id;
  if (!m || m.jsonrpc !== "2.0" || typeof m.method !== "string") return { jsonrpc: "2.0", id: id == null ? null : id, error: { code: -32600, message: "Petición no válida" } };
  if (id === undefined) return null;                                  // notificación (notifications/initialized…)
  const ok = (result) => ({ jsonrpc: "2.0", id, result });
  if (m.method === "initialize") {
    const v = m.params && m.params.protocolVersion;
    return ok({ protocolVersion: VERSIONES.indexOf(v) >= 0 ? v : VERSIONES[0], capabilities: { tools: { listChanged: false } }, serverInfo: SERVIDOR,
      instructions: "Comidas de Copiloto. Antes de escribir una receta, llama a formato(). Usa menu() para ver qué hay y casa() para saber qué queda en la despensa." });
  }
  if (m.method === "ping") return ok({});
  if (m.method === "tools/list") return ok({ tools: HERRAMIENTAS });
  if (m.method === "tools/call") {
    const p = m.params || {};
    if (!HERRAMIENTAS.some((h) => h.name === p.name)) return { jsonrpc: "2.0", id, error: { code: -32602, message: "Herramienta desconocida: " + p.name } };
    return ok(await herramienta(env, p.name, p.arguments, deps));
  }
  if (m.method === "resources/list") return ok({ resources: [] });
  if (m.method === "prompts/list") return ok({ prompts: [] });
  return { jsonrpc: "2.0", id, error: { code: -32601, message: "Método no soportado: " + m.method } };
}

export async function atiende(req, env, deps) {
  if (req.method === "GET" || req.method === "DELETE") return new Response(null, { status: 405, headers: { Allow: "POST" } });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });
  let cuerpo;
  try { cuerpo = await req.json(); } catch (e) {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON no válido" } }, { status: 400 });
  }
  const lote = Array.isArray(cuerpo), msgs = lote ? cuerpo : [cuerpo];
  const out = (await Promise.all(msgs.map((m) => rpc(env, m, deps)))).filter(Boolean);
  if (!out.length) return new Response(null, { status: 202 });
  return Response.json(lote ? out : out[0], { headers: { "Cache-Control": "no-store" } });
}
