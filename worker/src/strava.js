/* ===========================================================================
   Strava · buscar rutas que ya has corrido
   ---------------------------------------------------------------------------
   Secretos (panel de Cloudflare, nunca en el repo):
     STRAVA_CLIENT_ID
     STRAVA_CLIENT_SECRET
   El refresh token NO se mete a mano: sale de /strava/conectar y se guarda en KV.

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

/* ------------------------ conectar con Strava ------------------------
   Sin terminal: el canje del codigo por el refresh token lo hace el Worker.
   Lo unico que hay que meter a mano son CLIENT_ID y CLIENT_SECRET en el panel
   de Cloudflare; el refresh token no lo llega a ver nadie.

     GET /strava/conectar?k=APP_KEY   -> manda a Strava a pedir permiso
     GET /strava/vuelta?code=...      -> Strava vuelve aqui; se canjea y se guarda

   El "state" impide que la vuelta la dispare cualquiera: se genera al empezar,
   se guarda en KV con caducidad y se comprueba al volver.
   -------------------------------------------------------------------- */

const SCOPE = "activity:read_all";     // con "read" a secas Strava no da las actividades

export async function conectar(env, url, origen) {
  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET)
    return pagina("Faltan STRAVA_CLIENT_ID y STRAVA_CLIENT_SECRET en el panel de Cloudflare.", 503);
  if (!env.COPILOTO)
    return pagina("Falta el almacen KV. En Cloudflare: Storage &amp; Databases \u2192 KV \u2192 crear " +
                  "namespace, y en el Worker Settings \u2192 Bindings \u2192 KV namespace con nombre COPILOTO.", 503);
  if (!env.APP_KEY || url.searchParams.get("k") !== env.APP_KEY)
    return pagina("Clave incorrecta.", 401);

  const state = crypto.randomUUID();
  await env.COPILOTO.put("oauth_state_" + state, "1", { expirationTtl: 600 });

  const vuelta = url.origin + "/strava/vuelta";
  const ir = "https://www.strava.com/oauth/authorize" +
    "?client_id=" + encodeURIComponent(env.STRAVA_CLIENT_ID) +
    "&response_type=code" +
    "&redirect_uri=" + encodeURIComponent(vuelta) +
    "&approval_prompt=force" +
    "&scope=" + encodeURIComponent(SCOPE) +
    "&state=" + state;

  return new Response(null, {
    status: 302,
    headers: {
      Location: ir,
      // que la clave no viaje a Strava en la cabecera Referer
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store"
    }
  });
}

export async function vuelta(env, url) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (error) return pagina("Strava ha dicho que no: " + error, 400);
  if (!code || !state) return pagina("Strava no ha devuelto el codigo.", 400);
  if (!env.COPILOTO) return pagina("Falta el almacen KV.", 503);

  const vale = await env.COPILOTO.get("oauth_state_" + state);
  if (!vale) return pagina("Esta vuelta no es de una conexion que hayas empezado, o ha caducado. Vuelve a empezar.", 403);
  await env.COPILOTO.delete("oauth_state_" + state);

  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code"
    })
  });
  if (!r.ok) return pagina("Strava no ha aceptado el codigo (" + r.status + "). Prueba otra vez.", 502);
  const j = await r.json();
  if (!j.refresh_token) return pagina("Strava no ha devuelto refresh token.", 502);

  const dado = String(j.scope || "");
  if (dado.indexOf("activity:read_all") < 0)
    return pagina("Has dado permiso de " + (dado || "solo lectura basica") +
      ", y hace falta activity:read_all. Vuelve a empezar y acepta la casilla de ver todas tus actividades.", 400);

  await env.COPILOTO.put("strava_refresh", j.refresh_token);
  cache = { token: j.access_token, caduca: (j.expires_at || 0) * 1000 };
  return pagina("Strava conectado. Permisos: " + dado + ". Ya puedes cerrar esta pagina.", 200);
}

function pagina(texto, estado) {
  return new Response(
    '<!doctype html><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<body style="margin:0;background:#111418;color:#e8ecf1;font:600 18px/1.5 system-ui,sans-serif;' +
    'display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center">' +
    '<div style="max-width:520px">' + (estado === 200 ? "\u2705 " : "\u26a0\ufe0f ") + texto + '</div></body>',
    { status: estado, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

/* --------------------------- token de acceso --------------------------- */
/* El token de Strava dura 6 h. Se guarda en el isolate para no pedir uno
   nuevo en cada peticion, y en KV si hay namespace, porque Strava puede
   rotar el refresh token y si se pierde hay que volver a autorizar a mano. */

let cache = { token: null, caduca: 0 };

async function accessToken(env) {
  const ahora = Date.now();
  if (cache.token && cache.caduca > ahora + 60000) return cache.token;

  // el token guardado al conectar manda; el secreto queda como respaldo
  let refresh = null;
  if (env.COPILOTO) {
    try { refresh = await env.COPILOTO.get("strava_refresh"); } catch (e) {}
  }
  if (!refresh) refresh = env.STRAVA_REFRESH_TOKEN;
  if (!refresh) {
    const e = new Error("Strava no esta conectado todavia. Abre /strava/conectar?k=TU_CLAVE una vez.");
    e.codigo = 503; throw e;
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
  if (j.refresh_token && j.refresh_token !== refresh && env.COPILOTO) {   // Strava lo rota
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
  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET)
    return { error: "sin_configurar", codigo: 503,
      mensaje: "Faltan STRAVA_CLIENT_ID y STRAVA_CLIENT_SECRET en el panel de Cloudflare." };

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
