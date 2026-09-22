/* ===========================================================================
   Biblioteca de rutas
   ---------------------------------------------------------------------------
   Las rutas dejan de buscarse en vivo en Strava cada vez. Se bajan una vez,
   se guardan en KV y desde ahi la app las elige, tambien sin cobertura.
   Ademas entran por aqui las que no estan en Strava: un GPX de plotaroute se
   sube y queda como una mas.

     GET  /biblioteca                 el indice, ligero: para listar y pintar
                                      minimapas. Se cachea en el movil.
     GET  /biblioteca/ruta?id=        una ruta entera: polilinea y altimetria
     POST /biblioteca/sync            se trae Strava y guarda lo que falte
     POST /biblioteca/gpx?nombre=     sube un GPX (cuerpo = el fichero)
     POST /biblioteca/borrar?id=      quita una ruta

   En KV:
     bib:indice        lista ligera, un JSON con todas
     bib:r:<id>        la ruta entera, una entrada por ruta
   =========================================================================== */

const IDX = "bib:indice";
const PRE = "bib:r:";
const TOPE_RUTAS = 400;

export async function biblioteca(env, url, req, ayudas) {
  if (!env.COPILOTO)
    return { error: "sin_kv", codigo: 503,
      mensaje: "Falta el almacén KV. Lo prepara el despliegue: mira la pestaña Actions." };

  const q = url.pathname.replace(/^\/biblioteca\/?/, "");

  if (q === "" || q === "indice") return { rutas: await leeIndice(env) };
  if (q === "ruta") return await unaRuta(env, url, ayudas);
  if (q === "sync") return await sincroniza(env, ayudas);
  if (q === "gpx") return await subeGpx(env, url, req);
  if (q === "borrar") return await borra(env, url);
  return { error: "ruta_desconocida", codigo: 404, mensaje: "No existe /biblioteca/" + q };
}

/* ------------------------------- almacen ------------------------------- */

async function leeIndice(env) {
  try {
    const raw = await env.COPILOTO.get(IDX);
    const l = raw ? JSON.parse(raw) : [];
    return Array.isArray(l) ? l : [];
  } catch (e) { return []; }
}
async function guardaIndice(env, lista) {
  // primero lo que esta mas a mano de casa no se sabe aqui; se ordena por uso
  lista.sort((a, b) => (b.veces - a.veces) || (a.ultima < b.ultima ? 1 : -1));
  await env.COPILOTO.put(IDX, JSON.stringify(lista.slice(0, TOPE_RUTAS)));
}

/* La polilinea entera de una ruta de Strava no se baja al sincronizar: serian
   cientos de llamadas para rutas que no vas a correr. Se baja la primera vez
   que eliges esa ruta y desde entonces vive en KV, asi que la segunda vez ya
   no se toca Strava y funciona aunque Strava este caido. */
async function unaRuta(env, url, ayudas) {
  const id = (url.searchParams.get("id") || "").trim();
  if (!id) return { error: "sin_id", codigo: 400, mensaje: "Falta el id." };

  const raw = await env.COPILOTO.get(PRE + id);
  if (raw) {
    try { return JSON.parse(raw); }
    catch (e) { /* guardada rota: se vuelve a bajar */ }
  }

  const m = id.match(/^strava-(\d+)$/);
  if (!m || !ayudas || !ayudas.rutaStrava)
    return { error: "no_esta", codigo: 404, mensaje: "Esa ruta no está en la biblioteca." };

  const r = await ayudas.rutaStrava(m[1]);
  if (r.error) return r;
  const guardar = { id, nombre: r.nombre, origen: "strava", distancia: r.distancia,
                    desnivel: r.desnivel, linea: r.linea, ele: r.ele || [] };
  try { await env.COPILOTO.put(PRE + id, JSON.stringify(guardar)); } catch (e) {}
  return guardar;
}

async function borra(env, url) {
  const id = (url.searchParams.get("id") || "").trim();
  if (!id) return { error: "sin_id", codigo: 400, mensaje: "Falta el id." };
  await env.COPILOTO.delete(PRE + id);
  const lista = (await leeIndice(env)).filter(r => r.id !== id);
  await guardaIndice(env, lista);
  return { ok: true, borrada: id, quedan: lista.length };
}

/* --------------------------------- GPX --------------------------------- */
/* plotaroute exporta GPX. Se leen los <trkpt>/<rtept> y ya esta: no hace
   falta un parser de XML entero para sacar lat, lon y ele.               */

export function leeGpx(texto) {
  const pts = [], ele = [];
  const re = /<(?:trkpt|rtept)[^>]*\blat\s*=\s*"([-\d.]+)"[^>]*\blon\s*=\s*"([-\d.]+)"[^>]*>([\s\S]*?)<\/(?:trkpt|rtept)>|<(?:trkpt|rtept)[^>]*\blat\s*=\s*"([-\d.]+)"[^>]*\blon\s*=\s*"([-\d.]+)"[^>]*\/>/g;
  let m;
  while ((m = re.exec(texto)) !== null) {
    const la = Number(m[1] !== undefined ? m[1] : m[4]);
    const lo = Number(m[2] !== undefined ? m[2] : m[5]);
    if (!isFinite(la) || !isFinite(lo)) continue;
    pts.push([la, lo]);
    let h = null;
    if (m[3]) {
      const me = m[3].match(/<ele>\s*([-\d.]+)\s*<\/ele>/);
      if (me) h = Number(me[1]);
    }
    ele.push(isFinite(h) ? h : null);
  }
  return { pts, ele };
}

/* El nombre de la ruta es el <name> de dentro del <trk>, NO el primer <name>
   del fichero: plotaroute mete antes un <wpt> por cada indicacion del camino
   ("Gira a la izquierda...", "FINISH"), cada uno con su propio <name>. Cogiendo
   el primero, cuatro rutas entraban llamandose "FINISH", "FINISH", "Gira a la"
   y "Gira fuert". */
function nombreDe(texto) {
  const dentroDelTrk = texto.match(/<trk>[\s\S]*?<name>\s*([^<]{1,80})\s*<\/name>/);
  if (dentroDelTrk) return dentroDelTrk[1].trim();
  const enMetadata = texto.match(/<metadata>[\s\S]*?<name>\s*([^<]{1,80})\s*<\/name>/);
  if (enMetadata) return enMetadata[1].trim();
  const enRte = texto.match(/<rte>[\s\S]*?<name>\s*([^<]{1,80})\s*<\/name>/);
  if (enRte) return enRte[1].trim();
  return "";
}

async function subeGpx(env, url, req) {
  if (!req || req.method !== "POST")
    return { error: "metodo", codigo: 405, mensaje: "El GPX se sube con POST." };
  const texto = await req.text();
  if (!texto || !texto.trim())
    return { error: "vacio", codigo: 400, mensaje: "El fichero ha llegado vacío." };

  const { pts, ele } = leeGpx(texto);
  if (pts.length < 2)
    return { error: "sin_puntos", codigo: 422,
      mensaje: "No he encontrado puntos en ese GPX. ¿Seguro que es un GPX de ruta?" };

  const nombre = nombreDe(texto) || (url.searchParams.get("nombre") || "").trim() || "Ruta importada";

  const metros = largoDe(pts);
  const ficha = {
    id: "gpx-" + huella(pts),
    origen: "gpx",
    nombre,
    distancia: Math.round(metros),
    desnivel: Math.round(subida(ele)),
    puntos: pts.length,
    veces: 0,
    ultima: new Date().toISOString(),
    linea: encode(reduce(pts, 300)),          // ligera, para el minimapa
    creada: new Date().toISOString()
  };
  await env.COPILOTO.put(PRE + ficha.id, JSON.stringify({
    id: ficha.id, nombre, origen: "gpx", distancia: ficha.distancia,
    desnivel: ficha.desnivel, linea: encode(pts), ele: cada100(pts, ele)
  }));

  const lista = (await leeIndice(env)).filter(r => r.id !== ficha.id);
  lista.push(ficha);
  await guardaIndice(env, lista);
  return { ok: true, ruta: ficha, total: lista.length };
}

/* ------------------------------ sincronizar ------------------------------ */

async function sincroniza(env, ayudas) {
  if (!ayudas || !ayudas.gruposStrava)
    return { error: "sin_strava", codigo: 503, mensaje: "Strava no está conectado." };
  const grupos = await ayudas.gruposStrava();
  const lista = await leeIndice(env);
  const porId = {};
  for (const r of lista) porId[r.id] = r;

  let nuevas = 0, tocadas = 0;
  for (const g of grupos) {
    const id = "strava-" + g.id;
    const ficha = {
      id, origen: "strava", nombre: g.nombre,
      distancia: g.distancia, desnivel: g.desnivel,
      veces: g.veces, ultima: g.ultima, linea: g.linea,
      creada: (porId[id] && porId[id].creada) || new Date().toISOString()
    };
    if (porId[id]) { tocadas++; Object.assign(porId[id], ficha); }
    else { nuevas++; lista.push(ficha); porId[id] = ficha; }
    // la polilinea entera se baja cuando se elige, no ahora: son 400 llamadas
  }
  await guardaIndice(env, lista);
  return { ok: true, nuevas, actualizadas: tocadas, total: lista.length };
}

/* ------------------------------ utilidades ------------------------------ */

const R = 6371000;
function metrosEntre(a, b) {
  const la = (a[0] + b[0]) / 2 * Math.PI / 180;
  const dx = (b[1] - a[1]) * Math.PI / 180 * Math.cos(la) * R;
  const dy = (b[0] - a[0]) * Math.PI / 180 * R;
  return Math.sqrt(dx * dx + dy * dy);
}
function largoDe(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += metrosEntre(pts[i - 1], pts[i]);
  return d;
}
function subida(ele) {
  let s = 0, ant = null;
  for (const h of ele) {
    if (h === null || !isFinite(h)) continue;
    if (ant !== null && h > ant) s += h - ant;
    ant = h;
  }
  return s;
}
// altura cada 100 m, que es como la lee el motor; sin datos, lista vacia
function cada100(pts, ele) {
  if (!ele.some(h => h !== null && isFinite(h))) return [];
  const acum = [0];
  for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + metrosEntre(pts[i - 1], pts[i]));
  const fin = acum[acum.length - 1], out = [];
  let i = 0;
  for (let d = 0; d <= fin; d += 100) {
    while (i < acum.length - 2 && acum[i + 1] < d) i++;
    const h0 = ele[i], h1 = ele[i + 1];
    if (h0 === null || h1 === null) { out.push(out.length ? out[out.length - 1] : 0); continue; }
    const t = acum[i + 1] > acum[i] ? (d - acum[i]) / (acum[i + 1] - acum[i]) : 0;
    out.push(Math.round((h0 + (h1 - h0) * Math.max(0, Math.min(1, t))) * 10) / 10);
  }
  return out;
}
// menos puntos para el minimapa, repartidos por distancia
function reduce(pts, n) {
  if (pts.length <= n) return pts;
  const paso = (pts.length - 1) / (n - 1), out = [];
  for (let k = 0; k < n; k++) out.push(pts[Math.round(k * paso)]);
  return out;
}
// id estable: la misma ruta subida dos veces no se duplica
function huella(pts) {
  let h = 2166136261;
  const trozos = reduce(pts, 24);
  for (const p of trozos) {
    const t = Math.round(p[0] * 1e4) + ":" + Math.round(p[1] * 1e4);
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  }
  return (h >>> 0).toString(16) + "-" + Math.round(largoDe(pts));
}
function encode(pts) {
  let out = "", pl = 0, po = 0;
  const n = v => {
    v = v < 0 ? ~(v << 1) : (v << 1);
    let s = "";
    while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; }
    return s + String.fromCharCode(v + 63);
  };
  for (const [la, lo] of pts) {
    const a = Math.round(la * 1e5), b = Math.round(lo * 1e5);
    out += n(a - pl) + n(b - po);
    pl = a; po = b;
  }
  return out;
}
