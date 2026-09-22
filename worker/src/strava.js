/* ===========================================================================
   Strava · buscar rutas que ya has corrido
   ---------------------------------------------------------------------------
   Secretos (panel de Cloudflare, nunca en el repo):
     STRAVA_CLIENT_ID
     STRAVA_CLIENT_SECRET
     STRAVA_REFRESH_TOKEN

   GET /rutas?lat=&lon=&dist=&radio=&margen=
     lat,lon  donde estas ahora
     dist     distancia objetivo en metros
     radio    cuanto puede alejarse la salida (por defecto 150 m)
     margen   cuanto puede desviarse la distancia (por defecto 200 m)

   Devuelve GRUPOS: las veces que has corrido el mismo recorrido se juntan en
   uno solo, con cuantas veces lo has hecho y cuando fue la ultima.
   =========================================================================== */

const RADIO_DEF = 150;        // m desde donde estas hasta la salida de la actividad
const MARGEN_DEF = 200;       // m de diferencia admitida con la distancia objetivo
const MEDIA_MAX = 35;         // m de separacion media para considerarlas la misma ruta
const PEOR_MAX = 150;         // m en el punto que mas se separa
const MUESTRAS = 80;          // puntos que se comparan al medir el parecido
const PAGINAS = 4;            // paginas de 100 actividades que se miran
const R_TIERRA = 6371000;

/* --------------------------- token de acceso --------------------------- */
/* El token de Strava dura 6 h. Se guarda en el isolate para no pedir uno
   nuevo en cada peticion, y en KV si hay namespace, porque Strava puede
   rotar el refresh token y si se pierde hay que volver a autorizar a mano. */

let cache = { token: null, caduca: 0 };

async function accessToken(env) {
  const ahora = Date.now();
  if (cache.token && cache.caduca > ahora + 60000) return cache.token;

  let refresh = env.STRAVA_REFRESH_TOKEN;
  if (env.COPILOTO) {
    try {
      const guardado = await env.COPILOTO.get("strava_refresh");
      if (guardado) refresh = guardado;
    } catch (e) { /* sin KV se sigue con el secreto */ }
  }

  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refresh
    })
  });
  if (!r.ok) {
    const cuerpo = await r.text();
    const err = new Error("Strava no ha dado el token (" + r.status + "). " +
      (r.status === 400 ? "El refresh token ya no vale: hay que volver a autorizar la app." : cuerpo.slice(0, 200)));
    err.codigo = r.status === 400 ? 503 : 502;
    throw err;
  }
  const j = await r.json();
  cache = { token: j.access_token, caduca: (j.expires_at || 0) * 1000 };
  // Strava rota el refresh token: si cambia y hay KV, se guarda el nuevo
  if (j.refresh_token && j.refresh_token !== refresh && env.COPILOTO) {
    try { await env.COPILOTO.put("strava_refresh", j.refresh_token); } catch (e) {}
  }
  return cache.token;
}

/* ------------------------------ geometria ------------------------------ */

function metros(a, b) {                 // distancia entre dos [lat,lon]
  const la = (a[0] + b[0]) / 2 * Math.PI / 180;
  const dx = (b[1] - a[1]) * Math.PI / 180 * Math.cos(la) * R_TIERRA;
  const dy = (b[0] - a[0]) * Math.PI / 180 * R_TIERRA;
  return Math.sqrt(dx * dx + dy * dy);
}

// polilinea codificada de Google -> [[lat,lon], ...]
function decode(str) {
  if (!str) return [];
  const pts = [];
  let i = 0, lat = 0, lon = 0;
  while (i < str.length) {
    let b, shift = 0, res = 0;
    do { b = str.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (res & 1) ? ~(res >> 1) : (res >> 1);
    shift = 0; res = 0;
    do { b = str.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lon += (res & 1) ? ~(res >> 1) : (res >> 1);
    pts.push([lat / 1e5, lon / 1e5]);
  }
  return pts;
}

// longitud real de la polilinea, que no es la distancia que marca Strava
function largo(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += metros(pts[i - 1], pts[i]);
  return d;
}

// N puntos repartidos por distancia, no por indice: asi dos grabaciones de la
// misma ruta con distinta frecuencia de GPS se comparan punto con punto
function muestrea(pts, n) {
  if (pts.length < 2) return [];
  const acum = [0];
  for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + metros(pts[i - 1], pts[i]));
  const total = acum[acum.length - 1];
  if (!total) return [];
  const out = [];
  for (let k = 0; k < n; k++) {
    const objetivo = total * k / (n - 1);
    let i = 1;
    while (i < acum.length - 1 && acum[i] < objetivo) i++;
    const t = (objetivo - acum[i - 1]) / Math.max(1e-6, acum[i] - acum[i - 1]);
    out.push([
      pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
      pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t
    ]);
  }
  return out;
}

/* Comparar punto i con punto i NO vale: la misma ruta corrida otro dia no pasa
   por el mismo sitio a la misma fraccion del recorrido, porque el ritmo cambia
   y porque una vuelta se puede dar antes o despues. Medido asi, dos salidas por
   las mismas calles daban 400 m de diferencia.

   Lo que de verdad dice "es el mismo camino" es cuanto se separa cada punto del
   TRAZADO del otro, sin importar en que momento se pasa por ahi. Eso ademas sale
   gratis invariante al sentido de la marcha. */

function aTrazado(a, b) {
  let suma = 0, peor = 0;
  for (const p of a) {
    let mejor = Infinity;
    for (const q of b) {
      const d = metros(p, q);
      if (d < mejor) mejor = d;
    }
    if (mejor > peor) peor = mejor;
    suma += mejor;
  }
  return { media: suma / a.length, peor };
}

// simetrica: que A vaya por encima de B no basta, tiene que pasar en los dos sentidos
function separacion(a, b) {
  if (!a.length || !b.length) return { media: Infinity, peor: Infinity };
  const ida = aTrazado(a, b);
  if (ida.media > MEDIA_MAX || ida.peor > PEOR_MAX) return ida;   // ya no hace falta seguir
  const vuelta = aTrazado(b, a);
  return { media: Math.max(ida.media, vuelta.media),
           peor: Math.max(ida.peor, vuelta.peor) };
}

function mismaRuta(a, b) {
  const s = separacion(a, b);
  return s.media <= MEDIA_MAX && s.peor <= PEOR_MAX;
}

/* ----------------------------- actividades ----------------------------- */

async function actividades(env) {
  const token = await accessToken(env);
  const todas = [];
  for (let p = 1; p <= PAGINAS; p++) {
    const r = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=100&page=" + p,
      { headers: { Authorization: "Bearer " + token } });
    if (r.status === 429) {
      const e = new Error("Strava dice que se han hecho demasiadas peticiones. Prueba en unos minutos.");
      e.codigo = 429; throw e;
    }
    if (!r.ok) {
      const e = new Error("Strava ha contestado " + r.status + " al pedir las actividades.");
      e.codigo = 502; throw e;
    }
    const lote = await r.json();
    if (!Array.isArray(lote) || !lote.length) break;
    todas.push(...lote);
    if (lote.length < 100) break;
  }
  return todas;
}

/* ------------------------------- agrupar ------------------------------- */

export async function rutas(env, url) {
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const objetivo = Number(url.searchParams.get("dist"));
  const radio = Number(url.searchParams.get("radio")) || RADIO_DEF;
  const margen = Number(url.searchParams.get("margen")) || MARGEN_DEF;

  if (!isFinite(lat) || !isFinite(lon))
    return { error: "sin_posicion", mensaje: "Faltan lat y lon." };
  if (!isFinite(objetivo) || objetivo <= 0)
    return { error: "sin_distancia", mensaje: "Falta la distancia objetivo en metros." };
  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET || !env.STRAVA_REFRESH_TOKEN)
    return { error: "sin_configurar", codigo: 503,
      mensaje: "Faltan los secretos de Strava en el panel de Cloudflare." };

  const brutas = await actividades(env);

  // 1. lo que empieza donde estoy y mide lo que busco
  const cerca = [];
  for (const a of brutas) {
    if (a.type !== "Run" && a.sport_type !== "Run") continue;
    const s = a.start_latlng;
    if (!s || s.length !== 2) continue;
    const desdeAqui = metros([lat, lon], s);
    if (desdeAqui > radio) continue;
    const linea = (a.map && (a.map.summary_polyline || a.map.polyline)) || "";
    if (!linea) continue;
    if (Math.abs(a.distance - objetivo) > margen) continue;
    cerca.push({
      id: String(a.id),
      nombre: a.name,
      fecha: a.start_date_local,
      distancia: Math.round(a.distance),
      desnivel: Math.round(a.total_elevation_gain || 0),
      salida: desdeAqui,
      linea,
      pts: decode(linea)
    });
  }

  // 2. las que son el mismo recorrido, a un solo grupo
  const grupos = [];
  for (const a of cerca) {
    a.muestra = muestrea(a.pts, MUESTRAS);
    let metida = false;
    for (const g of grupos) {
      if (mismaRuta(a.muestra, g.muestra)) { g.veces.push(a); metida = true; break; }
    }
    if (!metida) grupos.push({ muestra: a.muestra, veces: [a] });
  }

  // 3. una ficha por grupo, con la vez mas reciente como representante
  const salida = grupos.map(g => {
    g.veces.sort((x, y) => x.fecha < y.fecha ? 1 : -1);
    const jefe = g.veces[0];
    const media = Math.round(g.veces.reduce((s, v) => s + v.distancia, 0) / g.veces.length);
    return {
      id: jefe.id,
      nombre: jefe.nombre,
      distancia: media,
      exacta: Math.round(largo(jefe.pts)),
      diferencia: media - objetivo,
      desnivel: jefe.desnivel,
      metrosPorKm: media ? Math.round(jefe.desnivel / (media / 1000) * 10) / 10 : 0,
      veces: g.veces.length,
      ultima: jefe.fecha,
      salida: Math.round(jefe.salida),
      linea: jefe.linea
    };
  });

  // la que menos se separa del objetivo, primero
  salida.sort((a, b) => Math.abs(a.diferencia) - Math.abs(b.diferencia));

  return {
    generado: new Date().toISOString(),
    objetivo, radio, margen,
    miradas: brutas.length,
    candidatas: cerca.length,
    grupos: salida
  };
}
