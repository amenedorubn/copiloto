/* ===========================================================================
   Strava · buscar rutas que ya has corrido
   ---------------------------------------------------------------------------
   Secretos (panel de Cloudflare, nunca en el repo):
     STRAVA_CLIENT_ID
     STRAVA_CLIENT_SECRET
   El refresh token NO se mete a mano: sale de /strava/conectar y se guarda en KV.

   GET /rutas?dist=&lat=&lon=&radio=&margen=&todas=
     dist     distancia objetivo en metros
     lat,lon  donde estas ahora. NO filtra: solo sirve para decir a cuanto
              queda la salida de cada ruta. Sin ellos, la lista sale igual.
     radio    si se pasa, ademas filtra por cercania de la salida
     margen   cuanto puede desviarse la distancia (por defecto 200 m)
     todas=1  se salta el filtro de distancia y devuelve todo lo que hay

   Devuelve GRUPOS: las veces que has corrido el mismo recorrido se juntan en
   uno solo, con cuantas veces lo has hecho y cuando fue la ultima.
   =========================================================================== */

const MARGEN_DEF = 200;       // m de diferencia admitida con la distancia objetivo
const TOPE_SIN_FILTRO = 150;  // candidatas que se miran como mucho al pedir todas
const MEDIA_MAX = 35;         // m de separacion media para considerarlas la misma ruta
const PEOR_MAX = 150;         // m en el punto que mas se separa
const MUESTRAS = 24;          // puntos que se comparan al medir el parecido
const REFER = 70;             // vertices del trazado contra el que se mide
const TOPE_OPS = 900000;      // cuentas como mucho: pasado eso se deja de agrupar
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
  const dada = paramCrudo(url, "k");
  if (dada === null) return formulario(url);          // sin clave: se pide en pantalla
  if (!env.APP_KEY || !igual(dada, env.APP_KEY))
    return formulario(url, "Esa clave no coincide con la de Cloudflare. " +
      "Copiala entera, sin espacios delante ni detras.");

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

/* searchParams convierte el "+" en espacio, que es lo correcto para un
   formulario pero no para una clave: las claves en base64 llevan "+" y asi
   nunca coincidian. Se lee del query crudo con decodeURIComponent, que no
   toca el "+", y vale tanto si viene literal como si viene como %2B. */
function paramCrudo(url, nombre) {
  const q = url.search.replace(/^\?/, "");
  if (!q) return null;
  for (const trozo of q.split("&")) {
    const i = trozo.indexOf("=");
    if (i < 0) continue;
    let clave;
    try { clave = decodeURIComponent(trozo.slice(0, i)); } catch (e) { clave = trozo.slice(0, i); }
    if (clave !== nombre) continue;
    try { return decodeURIComponent(trozo.slice(i + 1)); } catch (e) { return trozo.slice(i + 1); }
  }
  return null;
}

// al pegar en el movil se cuela un espacio o un salto de linea muy a menudo.
// La comparacion va en tiempo constante, igual que la de la cabecera: no tiene
// que filtrar cuantos caracteres se han acertado.
function igual(a, b) {
  const x = String(a).trim(), y = String(b).trim();
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}

// Pedir la clave aqui en vez de llevarla en la URL: no se queda en el
// historial del movil ni en los registros de nadie.
function formulario(url, aviso) {
  return new Response(
    '<!doctype html><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Conectar Strava</title>' +
    '<body style="margin:0;background:#111418;color:#e8ecf1;font:600 17px/1.5 system-ui,sans-serif;' +
    'display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px">' +
    '<form method="GET" action="' + url.pathname + '" style="width:100%;max-width:440px">' +
    '<h1 style="font-size:22px;margin:0 0 6px">Conectar Strava</h1>' +
    '<p style="color:#8b93a0;font-weight:500;margin:0 0 18px">Pega la clave de acceso del copiloto.</p>' +
    (aviso ? '<p style="background:#7a3a2c;color:#ffd9cd;border-radius:12px;padding:12px 14px;margin:0 0 16px">' +
             escapa(aviso) + '</p>' : '') +
    '<input name="k" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" ' +
    'placeholder="APP_KEY" style="width:100%;box-sizing:border-box;min-height:58px;border-radius:12px;' +
    'border:1px solid #2a313a;background:#1b1f25;color:#e8ecf1;padding:10px 14px;font-size:16px;' +
    'font-weight:700;font-family:inherit">' +
    '<button style="width:100%;margin-top:12px;min-height:64px;border-radius:14px;border:0;' +
    'background:#fc4c02;color:#fff;font-size:19px;font-weight:800;font-family:inherit">Continuar</button>' +
    '</form></body>',
    { status: aviso ? 401 : 200,
      headers: { "Content-Type": "text/html; charset=utf-8",
                 "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

function escapa(t) {
  return String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
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

/* Medir la distancia de un punto a los PUNTOS del otro trazado y no a sus
   SEGMENTOS mete un error que depende de lo fino que se haya muestreado: con
   un punto cada 175 m, dos grabaciones identicas salian separadas 44 m de
   media, por encima del limite de 35, y dejaban de agruparse. Contra los
   segmentos ese error desaparece y bastan muchas menos muestras, que es lo que
   hace que quepa en el presupuesto de CPU del Worker.

   Las dos listas vienen ya en metros (x,y) respecto a un origen comun, asi que
   aqui no hay trigonometria: solo restas y multiplicaciones. */
function aTrazado(a, b, tope) {
  let suma = 0, peor = 0;
  for (let i = 0; i < a.length; i++) {
    const px = a[i][0], py = a[i][1];
    let mejor = Infinity;
    for (let j = 0; j < b.length - 1; j++) {
      const ax = b[j][0], ay = b[j][1];
      const vx = b[j + 1][0] - ax, vy = b[j + 1][1] - ay;
      const L2 = vx * vx + vy * vy;
      let t = L2 > 0 ? ((px - ax) * vx + (py - ay) * vy) / L2 : 0;
      if (t < 0) t = 0; else if (t > 1) t = 1;
      const dx = px - (ax + t * vx), dy = py - (ay + t * vy);
      const d2 = dx * dx + dy * dy;
      if (d2 < mejor) mejor = d2;
    }
    mejor = Math.sqrt(mejor);
    if (mejor > peor) {
      peor = mejor;
      if (tope && peor > tope) return { media: Infinity, peor };
    }
    suma += mejor;
  }
  return { media: suma / a.length, peor };
}

// paso de [lat,lon] a metros (x,y) respecto a un origen comun a toda la peticion
function aMetros(pts, or0) {
  const mlon = 111320 * Math.cos(or0[0] * Math.PI / 180);
  const out = [];
  for (const p of pts) out.push([(p[1] - or0[1]) * mlon, (p[0] - or0[0]) * 110574]);
  return out;
}
// N puntos repartidos por distancia, ya en metros
function muestreaXY(xy, n) {
  if (xy.length < 2) return xy.slice();
  const acum = [0];
  for (let i = 1; i < xy.length; i++)
    acum.push(acum[i - 1] + Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]));
  const total = acum[acum.length - 1];
  if (!total) return xy.slice(0, 1);
  const out = [];
  for (let k = 0; k < n; k++) {
    const obj = total * k / (n - 1);
    let i = 1;
    while (i < acum.length - 1 && acum[i] < obj) i++;
    const t = (obj - acum[i - 1]) / Math.max(1e-6, acum[i] - acum[i - 1]);
    out.push([xy[i - 1][0] + (xy[i][0] - xy[i - 1][0]) * t,
              xy[i - 1][1] + (xy[i][1] - xy[i - 1][1]) * t]);
  }
  return out;
}

// simetrica: que A vaya por encima del trazado de B no basta, tiene que pasar
// tambien al reves; si no, una ruta corta encaja dentro de otra larga
function mismaRuta(a, b) {
  const ida = aTrazado(a.muestra, b.ref, PEOR_MAX);
  if (ida.media > MEDIA_MAX || ida.peor > PEOR_MAX) return false;
  const vuelta = aTrazado(b.muestra, a.ref, PEOR_MAX);
  return vuelta.media <= MEDIA_MAX && vuelta.peor <= PEOR_MAX;
}

/* Comparar cada ruta contra cada grupo cuesta MUESTRAS x MUESTRAS distancias.
   Con un historial de verdad (cientos de actividades) eso son decenas de
   millones de cuentas y el Worker se queda sin CPU a media faena, que es lo
   que hacia que "traer de Strava" no cargase nunca.

   Antes de medir nada se descarta lo evidente con cuentas de una sola
   operacion: dos rutas que no miden casi lo mismo, o que ni siquiera caen en
   la misma zona del mapa, no pueden ser la misma. Lo que sobreviva pasa por
   una pasada gruesa de 14 puntos y solo lo que aun aguante llega a la fina. */

function caja(pts) {
  let laMin = 90, laMax = -90, loMin = 180, loMax = -180;
  for (const p of pts) {
    if (p[0] < laMin) laMin = p[0];
    if (p[0] > laMax) laMax = p[0];
    if (p[1] < loMin) loMin = p[1];
    if (p[1] > loMax) loMax = p[1];
  }
  return { laMin, laMax, loMin, loMax,
           cen: [(laMin + laMax) / 2, (loMin + loMax) / 2],
           alto: (laMax - laMin) * 110574,
           ancho: (loMax - loMin) * 111320 * Math.cos((laMin + laMax) / 2 * Math.PI / 180) };
}

function puedeSer(a, b) {
  // la distancia: la misma ruta no cambia de largo mas de un 4 %
  if (Math.abs(a.distancia - b.distancia) > Math.max(250, a.distancia * 0.04)) return false;
  const ca = a.caja, cb = b.caja;
  // ni el centro del recorrido se mueve medio kilometro
  if (metros(ca.cen, cb.cen) > 500) return false;
  // ni la forma general cambia de tamano
  if (Math.abs(ca.alto - cb.alto) > 400 || Math.abs(ca.ancho - cb.ancho) > 400) return false;
  return true;
}

/* ----------------------------- actividades ----------------------------- */

/* Una sola peticion no puede traerse y agrupar cientos de actividades: el
   Worker tiene un presupuesto de CPU pequeno y se queda a medias, que es lo
   que hacia que "traer de Strava" no cargase nunca. Se procesa una pagina de
   100 por llamada y la app va pidiendo la siguiente. */
async function actividades(env, pagina) {
  const token = await accessToken(env);
  const todas = [];
  const desde = pagina || 1;
  const hasta = pagina ? pagina : PAGINAS;
  for (let p = desde; p <= hasta; p++) {
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
    if (!Array.isArray(lote) || !lote.length) { todas.fin = true; break; }
    todas.push(...lote);
    if (lote.length < 100) { todas.fin = true; break; }
  }
  return todas;
}

/* ------------------------------- agrupar ------------------------------- */

/* Number(null) es 0, no NaN, asi que un parametro que no viene se colaba como
   cero: "sin radio" acababa siendo radio 0 y "sin posicion" el punto (0,0) en
   el golfo de Guinea. Aqui lo que falta vale null y se nota. */
function param(url, nombre) {
  const v = url.searchParams.get(nombre);
  if (v === null || v.trim() === "") return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

export async function rutas(env, url) {
  const lat = param(url, "lat");
  const lon = param(url, "lon");
  const objetivo = param(url, "dist");
  const radio = param(url, "radio");                   // null = no filtra por cercania
  const margen = param(url, "margen") || MARGEN_DEF;
  const todas = url.searchParams.get("todas") === "1";
  // la posicion es opcional: solo sirve para decir a cuanto queda cada salida
  const donde = (lat !== null && lon !== null) ? [lat, lon] : null;

  if (!todas && (objetivo === null || objetivo <= 0))
    return { error: "sin_distancia", mensaje: "Falta la distancia objetivo en metros." };
  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET)
    return { error: "sin_configurar", codigo: 503,
      mensaje: "Faltan STRAVA_CLIENT_ID y STRAVA_CLIENT_SECRET en el panel de Cloudflare." };

  const pagina = param(url, "pagina");
  const brutas = await actividades(env, pagina);

  // 1. carreras con trazado; la distancia filtra salvo que se pidan todas
  const cerca = [];
  for (const a of brutas) {
    if (a.type !== "Run" && a.sport_type !== "Run") continue;
    const linea = (a.map && (a.map.summary_polyline || a.map.polyline)) || "";
    if (!linea) continue;
    if (!todas && Math.abs(a.distance - objetivo) > margen) continue;
    const ini = (a.start_latlng && a.start_latlng.length === 2) ? a.start_latlng : null;
    const desdeAqui = (donde && ini) ? metros(donde, ini) : null;
    // el radio solo filtra si se pide a proposito
    if (radio !== null && desdeAqui !== null && desdeAqui > radio) continue;
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
    if (todas && cerca.length >= TOPE_SIN_FILTRO) break;
  }

  /* 2. las que son el mismo recorrido, a un solo grupo.
     Los grupos se indexan por distancia en cajones de 250 m: una ruta solo se
     compara con los de su cajon y los dos de al lado. Sin esto hay que mirar
     cada ruta contra TODOS los grupos, y con un historial de verdad eso son
     decenas de millones de cuentas y el Worker se queda sin CPU. */
  const grupos = [];
  const cajones = {};                    // distancia/250 -> indices de grupo
  const CAJON = 250;
  let ops = 0;
  const or0 = cerca.length ? cerca[0].pts[0] : [0, 0];

  for (const a of cerca) {
    a.caja = caja(a.pts);
    const xy = aMetros(a.pts, or0);
    a.ref = muestreaXY(xy, REFER);          // el trazado contra el que se mide
    a.muestra = muestreaXY(xy, MUESTRAS);   // los puntos que se proyectan

    const c = Math.round(a.distancia / CAJON);
    let metida = false;
    for (let k = c - 1; k <= c + 1 && !metida; k++) {
      const lista = cajones[k];
      if (!lista) continue;
      for (const gi of lista) {
        const g = grupos[gi];
        if (!puedeSer(a, g)) continue;               // descarte de una sola cuenta
        if (ops >= TOPE_OPS) break;                  // sin CPU para mas: se deja suelta
        ops += MUESTRAS * REFER * 2;
        if (mismaRuta(a, g)) { g.veces.push(a); metida = true; break; }
      }
    }
    if (!metida) {
      const gi = grupos.length;
      grupos.push({ ref: a.ref, muestra: a.muestra, caja: a.caja,
                    distancia: a.distancia, veces: [a] });
      (cajones[c] = cajones[c] || []).push(gi);
    }
  }

  // 3. una ficha por grupo, con la vez mas reciente como representante
  const salida = grupos.map(g => {
    g.veces.sort((x, y) => x.fecha < y.fecha ? 1 : -1);
    const jefe = g.veces[0];
    const media = Math.round(g.veces.reduce((s, v) => s + v.distancia, 0) / g.veces.length);
    // de todas las veces, la salida mas cercana a donde estoy
    const salidas = g.veces.map(v => v.salida).filter(v => v !== null);
    const salida = salidas.length ? Math.round(Math.min.apply(null, salidas)) : null;
    return {
      id: jefe.id,
      nombre: jefe.nombre,
      distancia: media,
      exacta: Math.round(largo(jefe.pts)),
      diferencia: todas ? null : media - objetivo,
      desnivel: jefe.desnivel,
      metrosPorKm: media ? Math.round(jefe.desnivel / (media / 1000) * 10) / 10 : 0,
      veces: g.veces.length,
      ultima: jefe.fecha,
      salida,
      linea: jefe.linea
    };
  });

  /* Orden: primero lo que puedo empezar andando (menos de 1 km), y de eso lo
     que mejor cuadra con la distancia de hoy. Despues el resto, de mas cerca a
     mas lejos, porque ahi lo que decide es si merece la pena desplazarse. */
  const CERCA = 1000;
  salida.sort((a, b) => {
    const ca = a.salida !== null && a.salida <= CERCA;
    const cb = b.salida !== null && b.salida <= CERCA;
    if (ca !== cb) return ca ? -1 : 1;
    // sin objetivo no hay "lo que mejor cuadra": manda la cercania
    if (a.diferencia === null || b.diferencia === null) {
      if (a.salida === null || b.salida === null) return b.distancia - a.distancia;
      return a.salida - b.salida;
    }
    if (ca && cb) return Math.abs(a.diferencia) - Math.abs(b.diferencia);
    if (a.salida === null || b.salida === null)
      return Math.abs(a.diferencia) - Math.abs(b.diferencia);
    return a.salida - b.salida;
  });

  return {
    generado: new Date().toISOString(),
    objetivo: todas ? null : objetivo,
    conPosicion: !!donde,
    todas,
    margen,
    pagina: pagina || null,
    fin: pagina ? !!brutas.fin : true,       // ya no quedan mas paginas
    miradas: brutas.length,
    candidatas: cerca.length,
    grupos: salida
  };
}

/* ===========================================================================
   Una ruta concreta, con todo el detalle
   ---------------------------------------------------------------------------
   GET /ruta?id=<id de actividad>

   La polilinea que trae el listado esta diezmada (un punto cada 50-60 m), que
   vale para un minimapa pero no para proyectar la posicion encima mientras
   corres. Aqui se pide la actividad entera, que trae la polilinea completa, y
   ademas la altimetria remuestreada cada 100 m, que es lo que espera el motor.
   =========================================================================== */

export async function ruta(env, url) {
  const id = (url.searchParams.get("id") || "").trim();
  if (!/^\d+$/.test(id)) return { error: "sin_id", mensaje: "Falta el id de la actividad." };
  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET)
    return { error: "sin_configurar", codigo: 503,
      mensaje: "Faltan STRAVA_CLIENT_ID y STRAVA_CLIENT_SECRET en el panel de Cloudflare." };

  const token = await accessToken(env);
  const cab = { Authorization: "Bearer " + token };

  const rA = await fetch("https://www.strava.com/api/v3/activities/" + id + "?include_all_efforts=false",
    { headers: cab });
  if (rA.status === 404) return { error: "no_esta", codigo: 404, mensaje: "Esa actividad ya no está en Strava." };
  if (!rA.ok) {
    const e = new Error("Strava ha contestado " + rA.status + " al pedir la actividad.");
    e.codigo = rA.status === 429 ? 429 : 502; throw e;
  }
  const a = await rA.json();
  const linea = (a.map && (a.map.polyline || a.map.summary_polyline)) || "";
  if (!linea) return { error: "sin_trazado", codigo: 422, mensaje: "Esa actividad no tiene trazado GPS." };

  // altimetria: si falla, la ruta sigue valiendo, solo se queda sin cuestas
  let ele = [];
  try {
    const rS = await fetch("https://www.strava.com/api/v3/activities/" + id +
      "/streams?keys=distance,altitude&key_by_type=true", { headers: cab });
    if (rS.ok) {
      const s = await rS.json();
      const dd = s.distance && s.distance.data, aa = s.altitude && s.altitude.data;
      if (Array.isArray(dd) && Array.isArray(aa) && dd.length === aa.length && dd.length > 1)
        ele = cada100(dd, aa);
    }
  } catch (e) { ele = []; }

  const pts = decode(linea);
  return {
    id: String(a.id),
    nombre: a.name,
    fecha: a.start_date_local,
    distancia: Math.round(a.distance),
    exacta: Math.round(largo(pts)),
    desnivel: Math.round(a.total_elevation_gain || 0),
    puntos: pts.length,
    linea,
    ele
  };
}

// altura cada 100 m exactos, que es como la lee el motor
function cada100(dist, alt) {
  const fin = dist[dist.length - 1];
  const out = [];
  let i = 0;
  for (let d = 0; d <= fin; d += 100) {
    while (i < dist.length - 2 && dist[i + 1] < d) i++;
    const d0 = dist[i], d1 = dist[i + 1];
    const t = d1 > d0 ? (d - d0) / (d1 - d0) : 0;
    out.push(Math.round((alt[i] + (alt[i + 1] - alt[i]) * Math.max(0, Math.min(1, t))) * 10) / 10);
  }
  return out;
}
