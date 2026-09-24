/* ===========================================================================
   Lo que se ha hecho de verdad: actividades de Strava para marcar los
   entrenos del calendario como hechos y enseñar lo que se corrio.

     GET /hecho?desde=AAAA-MM-DD&hasta=AAAA-MM-DD   resumen de cada actividad
     GET /hecho/detalle?id=123                      una actividad entera:
                                                    parciales, vueltas y
                                                    series (ritmo, FC, altura)
   Los resumenes se guardan 5 minutos en KV y el detalle una semana: una
   actividad casi nunca cambia y asi Strava no se entera de cada vistazo.
   =========================================================================== */
import { accessToken } from "./strava.js";

const API = "https://www.strava.com/api/v3";
const HEVY = "https://api.hevyapp.com/v1";
const ZONA = "Europe/Madrid";
const PUNTOS = 600;                    // muestras por serie: de sobra para una grafica

function fecha(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : null; }
function falla(r, que) {
  const e = new Error(r.status === 429
    ? "Strava dice que se han hecho demasiadas peticiones. Prueba en unos minutos."
    : "Strava ha contestado " + r.status + " al pedir " + que + ".");
  e.codigo = r.status === 429 ? 429 : 502; return e;
}
async function kvLee(env, k) {
  if (!env.COPILOTO) return null;
  try { const t = await env.COPILOTO.get(k); return t ? JSON.parse(t) : null; } catch (e) { return null; }
}
async function kvGuarda(env, k, v, ttl) {
  if (!env.COPILOTO) return;
  try { await env.COPILOTO.put(k, JSON.stringify(v), { expirationTtl: ttl }); } catch (e) {}
}

// lo comun al resumen y al detalle
function base(a) {
  const run = /Run/.test(a.sport_type || a.type || "");
  return {
    id: String(a.id),
    nombre: a.name || "",
    deporte: a.sport_type || a.type || "",
    cinta: !!a.trainer,
    fecha: String(a.start_date_local || "").slice(0, 10),
    hora: String(a.start_date_local || "").slice(11, 16),
    distancia: Math.round(a.distance || 0),
    mov: a.moving_time || 0,
    total: a.elapsed_time || 0,
    desnivel: Math.round(a.total_elevation_gain || 0),
    vel: a.average_speed || 0,
    fcMedia: a.has_heartrate && a.average_heartrate ? Math.round(a.average_heartrate) : null,
    fcMax: a.has_heartrate && a.max_heartrate ? Math.round(a.max_heartrate) : null,
    // Strava da la cadencia de carrera por pierna: pasos por minuto es el doble
    cad: a.average_cadence ? Math.round(a.average_cadence * (run ? 2 : 1)) : null,
    esfuerzo: a.suffer_score || null,
    linea: (a.map && (a.map.polyline || a.map.summary_polyline)) || ""
  };
}

/* ------------------------------- Hevy -------------------------------
   El gimnasio no llega a Strava: se lee de Hevy (hace falta el secreto
   HEVY_API_KEY en Cloudflare). Cada sesion trae TODAS sus series. */
function local(iso) {                    // "2026-09-21T05:05:00Z" -> fecha y hora de Madrid
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const g = t => (p.find(x => x.type === t) || {}).value;
  return { fecha: g("year") + "-" + g("month") + "-" + g("day"), hora: g("hour") + ":" + g("minute") };
}
function sesionHevy(w) {
  const ini = Date.parse(w.start_time), fin = Date.parse(w.end_time);
  const l = local(w.start_time);
  let vol = 0, series = 0, reps = 0;
  const ejercicios = (w.exercises || []).map(e => ({
    titulo: e.title || "",
    notas: e.notes || "",
    sets: (e.sets || []).map(x => {
      if (x.type !== "warmup") { series++; reps += x.reps || 0; vol += (x.weight_kg || 0) * (x.reps || 0); }
      return { tipo: x.type || "normal", kg: x.weight_kg, reps: x.reps, rpe: x.rpe || null,
               seg: x.duration_seconds || null, m: x.distance_meters || null };
    })
  }));
  return {
    id: "hevy-" + w.id, fuente: "hevy", nombre: w.title || "Gimnasio", deporte: "WeightTraining", cinta: false,
    fecha: l.fecha, hora: l.hora, distancia: 0, mov: isFinite(fin - ini) ? Math.round((fin - ini) / 1000) : 0,
    total: isFinite(fin - ini) ? Math.round((fin - ini) / 1000) : 0, desnivel: 0,
    fcMedia: null, fcMax: null, cad: null, esfuerzo: null, linea: "",
    series, reps, volumenKg: Math.round(vol), descripcion: w.description || "", ejercicios
  };
}
// la clave pegada en el panel a veces lleva espacios o un salto de linea
const claveHevy = env => String(env.HEVY_API_KEY || "").trim();

// para /salud: solo dice si Hevy acepta la clave (codigo HTTP), nada de datos
export async function pruebaHevy(env) {
  if (!claveHevy(env)) return "sin clave";
  try {
    const r = await fetch(HEVY + "/workouts?page=1&pageSize=1",
      { headers: { "api-key": claveHevy(env), Accept: "application/json" } });
    return r.ok ? "ok" : "Hevy responde " + r.status;
  } catch (e) { return "Hevy no contesta"; }
}

async function hevyEntre(env, desde, hasta) {
  if (!claveHevy(env)) return [];
  const out = [];
  for (let p = 1; p <= 8; p++) {             // van de la mas nueva a la mas vieja
    const r = await fetch(HEVY + "/workouts?page=" + p + "&pageSize=10",
      { headers: { "api-key": claveHevy(env), Accept: "application/json" } });
    if (!r.ok) {                             // Hevy caido o clave mala: el resto sigue valiendo
      if (p === 1) throw new Error("Hevy responde " + r.status);
      break;
    }
    const j = await r.json(), lote = j.workouts || [];
    let viejo = false;
    for (const w of lote) {
      const s = sesionHevy(w);
      if (s.fecha < desde) { viejo = true; continue; }
      if (s.fecha <= hasta) out.push(s);
    }
    if (viejo || !lote.length || (j.page_count && p >= j.page_count)) break;
  }
  return out;
}

export async function hechos(env, url) {
  const desde = fecha(url.searchParams.get("desde")), hasta = fecha(url.searchParams.get("hasta"));
  if (!desde || !hasta || hasta < desde)
    return { error: "fechas", codigo: 400, mensaje: "Pide /hecho?desde=AAAA-MM-DD&hasta=AAAA-MM-DD." };
  const dias = (Date.parse(hasta) - Date.parse(desde)) / 86400000;
  if (dias > 120) return { error: "rango", codigo: 400, mensaje: "Como mucho 120 días de golpe." };

  const k = "hechos:" + desde + ":" + hasta;
  const guardado = await kvLee(env, k);
  if (guardado) return guardado;

  // Strava filtra en UTC: se pide un dia de margen a cada lado y luego se
  // recorta por la fecha LOCAL de cada actividad
  const after = Math.floor(Date.parse(desde + "T00:00:00Z") / 1000) - 86400;
  const before = Math.floor(Date.parse(hasta + "T23:59:59Z") / 1000) + 86400;
  const token = await accessToken(env);
  const lista = [];
  for (let p = 1; p <= 4; p++) {
    const r = await fetch(API + "/athlete/activities?per_page=100&page=" + p + "&after=" + after + "&before=" + before,
      { headers: { Authorization: "Bearer " + token } });
    if (!r.ok) throw falla(r, "las actividades");
    const lote = await r.json();
    if (!Array.isArray(lote) || !lote.length) break;
    lista.push(...lote);
    if (lote.length < 100) break;
  }
  let gym = [], hevyFallo = null;
  try { gym = await hevyEntre(env, desde, hasta); } catch (e) { gym = []; hevyFallo = String(e.message || e); }
  const min = h => { const p = h.split(":"); return (+p[0]) * 60 + (+p[1]); };
  const actividades = lista.map(base)
    .filter(a => a.fecha >= desde && a.fecha <= hasta)
    .map(a => { a.linea = ""; return a; })            // el trazado va en el detalle
    // si una sesion de Hevy llega tambien a Strava, se queda la de Hevy (tiene las series)
    .filter(a => !(/Weight|Workout/i.test(a.deporte) &&
                   gym.some(g => g.fecha === a.fecha && Math.abs(min(g.hora) - min(a.hora)) <= 90)))
    .concat(gym)
    .sort((x, y) => (x.fecha + x.hora < y.fecha + y.hora ? -1 : 1));
  const out = { desde, hasta, generado: new Date().toISOString(), hevy: !!claveHevy(env), hevyFallo, actividades };
  // con Hevy fallando no se guarda: el siguiente intento vuelve a preguntar
  if (!hevyFallo) await kvGuarda(env, k, out, 300);
  return out;
}

// reduce una serie a como mucho PUNTOS muestras, siempre con la primera y la ultima
function reduce(arr, idx) { return Array.isArray(arr) ? idx.map(i => arr[i]) : null; }

export async function detalle(env, url) {
  const id = (url.searchParams.get("id") || "").trim();
  if (!/^\d+$/.test(id)) return { error: "sin_id", codigo: 400, mensaje: "Falta el id de la actividad." };
  const k = "act:" + id;
  const guardado = await kvLee(env, k);
  if (guardado) return guardado;

  const token = await accessToken(env);
  const cab = { headers: { Authorization: "Bearer " + token } };
  const rA = await fetch(API + "/activities/" + id + "?include_all_efforts=false", cab);
  if (rA.status === 404) return { error: "no_esta", codigo: 404, mensaje: "Esa actividad ya no está en Strava." };
  if (!rA.ok) throw falla(rA, "la actividad");
  const a = await rA.json();

  const out = base(a);
  out.descripcion = a.description || "";
  out.dispositivo = a.device_name || "";
  out.calorias = a.calories ? Math.round(a.calories) : null;
  out.splits = (a.splits_metric || []).map(s => ({
    d: Math.round(s.distance || 0), t: s.moving_time || 0, te: s.elapsed_time || 0,
    fc: s.average_heartrate ? Math.round(s.average_heartrate) : null,
    dz: Math.round((s.elevation_difference || 0) * 10) / 10
  }));
  out.laps = (a.laps || []).map(l => ({
    nombre: l.name || "", d: Math.round(l.distance || 0), t: l.moving_time || 0, te: l.elapsed_time || 0,
    fc: l.average_heartrate ? Math.round(l.average_heartrate) : null, vel: l.average_speed || 0
  }));

  out.s = null;
  try {
    const rS = await fetch(API + "/activities/" + id +
      "/streams?keys=time,distance,heartrate,altitude,velocity_smooth,cadence&key_by_type=true", cab);
    if (rS.ok) {
      const s = await rS.json(), t = s.time && s.time.data;
      if (Array.isArray(t) && t.length > 1) {
        const n = t.length, paso = Math.max(1, Math.ceil(n / PUNTOS)), idx = [];
        for (let i = 0; i < n; i += paso) idx.push(i);
        if (idx[idx.length - 1] !== n - 1) idx.push(n - 1);
        const g = key => s[key] && reduce(s[key].data, idx);
        out.s = { t: g("time"), d: g("distance"), fc: g("heartrate"), alt: g("altitude"),
                  v: g("velocity_smooth"), cad: g("cadence") };
        // segundos en cada pulsacion, con TODAS las muestras (no las reducidas):
        // de aqui sale el tiempo en cada zona sin que la reduccion lo deforme
        if (s.heartrate && Array.isArray(s.heartrate.data)) {
          const fc = s.heartrate.data, porFc = {};
          for (let i = 0; i < n - 1; i++) if (fc[i]) porFc[fc[i]] = (porFc[fc[i]] || 0) + Math.min(30, t[i + 1] - t[i]);
          out.fcTiempo = porFc;
        }
      }
    }
  } catch (e) { out.s = null; }

  await kvGuarda(env, k, out, 7 * 86400);
  return out;
}
