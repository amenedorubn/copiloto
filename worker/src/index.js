/* ===========================================================================
   copiloto-api · Worker de Cloudflare
   ---------------------------------------------------------------------------
   Lee la direccion iCal secreta del calendario "Entreno" de Google, la parsea
   y devuelve JSON con los entrenos del rango pedido.

   Secretos (se meten desde el panel de Cloudflare, nunca en el repo):
     APP_KEY   clave que la app manda en la cabecera X-Copiloto-Key
     ICAL_URL  direccion iCal secreta del calendario

   Rutas:
     GET /salud                      sin clave. Dice si el Worker vive y si
                                     los dos secretos estan puestos.
     GET /agenda?desde=&hasta=       con clave. Entrenos del rango.
   =========================================================================== */

const ORIGENES = [
  "https://amenedorubn.github.io"
];
const ZONA_POR_DEFECTO = "Europe/Madrid";
const DIAS_ATRAS = 7;
const DIAS_ADELANTE = 60;
const CACHE_ICAL = 120;               // segundos que el iCal se queda en el borde

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origen = cors(req);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: origen });

    try {
      if (url.pathname === "/salud") {
        return json({
          ok: true,
          worker: "copiloto-api",
          secretos: { APP_KEY: !!env.APP_KEY, ICAL_URL: !!env.ICAL_URL }
        }, 200, origen);
      }

      if (url.pathname === "/agenda") {
        const fallo = revisaClave(req, env);
        if (fallo) return json(fallo, fallo.codigo, origen);
        return json(await agenda(env, url), 200, origen);
      }

      return json({ error: "ruta_desconocida", ruta: url.pathname }, 404, origen);
    } catch (e) {
      return json({ error: "fallo_interno", detalle: String(e && e.message || e) }, 500, origen);
    }
  }
};

/* ------------------------------- plomeria ------------------------------- */

function cors(req) {
  const o = req.headers.get("Origin") || "";
  const h = {
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "X-Copiloto-Key,Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
  if (ORIGENES.indexOf(o) >= 0) h["Access-Control-Allow-Origin"] = o;
  return h;
}

function json(cuerpo, estado, cabeceras) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado || 200,
    headers: Object.assign({
      "Content-Type": "application/json; charset=utf-8",
      // la respuesta lleva la clave por medio: que no se cachee en ningun sitio.
      // La copia offline la guarda la app, no el navegador.
      "Cache-Control": "no-store"
    }, cabeceras || {})
  });
}

function revisaClave(req, env) {
  if (!env.APP_KEY) return { error: "sin_configurar", codigo: 503,
    mensaje: "Falta el secreto APP_KEY en el panel de Cloudflare." };
  if (!env.ICAL_URL) return { error: "sin_configurar", codigo: 503,
    mensaje: "Falta el secreto ICAL_URL en el panel de Cloudflare." };
  const dada = req.headers.get("X-Copiloto-Key") || "";
  if (!igual(dada, env.APP_KEY)) return { error: "clave_incorrecta", codigo: 401 };
  return null;
}

// comparacion en tiempo constante: no filtra cuantos caracteres ha acertado
function igual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* -------------------------------- agenda -------------------------------- */

async function agenda(env, url) {
  const hoy = new Date();
  const desde = url.searchParams.get("desde") || diaISO(new Date(+hoy - DIAS_ATRAS * 86400000), "UTC");
  const hasta = url.searchParams.get("hasta") || diaISO(new Date(+hoy + DIAS_ADELANTE * 86400000), "UTC");

  const res = await fetch(env.ICAL_URL, {
    cf: { cacheTtl: CACHE_ICAL, cacheEverything: true },
    headers: { "User-Agent": "copiloto-api" }
  });
  if (!res.ok) {
    return { error: "ical_no_responde", estado: res.status,
      mensaje: "Google no ha devuelto el calendario. Revisa el secreto ICAL_URL." };
  }
  const texto = await res.text();
  const cal = parseICS(texto);
  const zona = cal.zona || ZONA_POR_DEFECTO;

  const eventos = expande(cal.eventos, desde, hasta, zona);
  eventos.sort((a, b) => a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0);

  return { generado: new Date().toISOString(), zona, desde, hasta, eventos };
}

/* ------------------------------ parser iCal ------------------------------ */
/* Desplegamos las lineas (RFC 5545: una linea que empieza por espacio o tab es
   continuacion de la anterior) y luego leemos VEVENT a VEVENT.              */

function desdobla(texto) {
  const bruto = texto.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  for (const l of bruto) {
    if (l && (l[0] === " " || l[0] === "\t") && out.length) out[out.length - 1] += l.slice(1);
    else out.push(l);
  }
  return out;
}

function parseICS(texto) {
  const lineas = desdobla(texto);
  const eventos = [];
  let zona = "", ev = null;

  for (const linea of lineas) {
    if (linea === "BEGIN:VEVENT") { ev = { props: {} }; continue; }
    if (linea === "END:VEVENT") { if (ev) eventos.push(ev); ev = null; continue; }

    const c = linea.indexOf(":");
    if (c < 0) continue;
    const izq = linea.slice(0, c), val = linea.slice(c + 1);
    const pc = izq.indexOf(";");
    const nombre = (pc < 0 ? izq : izq.slice(0, pc)).toUpperCase();
    const params = {};
    if (pc >= 0) {
      for (const p of izq.slice(pc + 1).split(";")) {
        const e = p.indexOf("=");
        if (e > 0) params[p.slice(0, e).toUpperCase()] = p.slice(e + 1).replace(/^"|"$/g, "");
      }
    }

    if (!ev) { if (nombre === "X-WR-TIMEZONE") zona = val.trim(); continue; }

    // EXDATE puede repetirse y traer varias fechas separadas por coma
    if (nombre === "EXDATE") {
      (ev.props.EXDATE = ev.props.EXDATE || []).push({ val, params });
      continue;
    }
    ev.props[nombre] = { val, params };
  }
  return { zona, eventos };
}

// texto de iCal: \n es salto, \, \; \\ son literales
function desescapa(s) {
  return String(s)
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/* ------------------------------ fechas y zona ----------------------------- */

// Cuanto se separa la zona del UTC en ese instante concreto (con su horario de verano)
function desfase(t, zona) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: zona, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  const p = {};
  for (const { type, value } of f.formatToParts(new Date(t))) p[type] = value;
  const h = p.hour === "24" ? 0 : +p.hour;
  return Date.UTC(+p.year, +p.month - 1, +p.day, h, +p.minute, +p.second) - t;
}

// hora de pared en una zona -> instante UTC. Dos vueltas para clavar los
// cambios de hora de marzo y octubre.
function aUTC(y, mo, d, h, mi, s, zona) {
  const pared = Date.UTC(y, mo - 1, d, h, mi, s);
  let t = pared;
  for (let i = 0; i < 2; i++) t = pared - desfase(t, zona);
  return t;
}

// "20260927T070000" / "20260927T050000Z" / "20260927"  ->  {t, todoElDia}
function fechaICal(val, params, zona) {
  const v = String(val).trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, Y, Mo, D, H, Mi, S, Z] = m;
  if (!H) return { t: Date.UTC(+Y, +Mo - 1, +D, 0, 0, 0), todoElDia: true };
  if (Z) return { t: Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +S), todoElDia: false };
  const tz = (params && params.TZID) || zona;
  return { t: aUTC(+Y, +Mo, +D, +H, +Mi, +S, tz), todoElDia: false };
}

function partes(t, zona) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
  });
  const p = {};
  for (const { type, value } of f.formatToParts(new Date(t))) p[type] = value;
  const h = p.hour === "24" ? "00" : p.hour;
  return { fecha: p.year + "-" + p.month + "-" + p.day, hora: h + ":" + p.minute };
}

function diaISO(d, zona) { return partes(+d, zona).fecha; }

/* --------------------------- repeticiones (RRULE) -------------------------- */
/* Soportado: FREQ DAILY/WEEKLY/MONTHLY, INTERVAL, COUNT, UNTIL, BYDAY, y las
   excepciones EXDATE. Lo que no entienda se queda en la primera fecha, que es
   el comportamiento seguro: nunca inventa un entreno que no existe.          */

const DIAS_RR = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function parseRRule(s) {
  const r = {};
  for (const p of String(s).split(";")) {
    const e = p.indexOf("=");
    if (e > 0) r[p.slice(0, e).toUpperCase()] = p.slice(e + 1);
  }
  return r;
}

function repeticiones(t0, rrule, zona, topeT) {
  const r = parseRRule(rrule);
  const freq = (r.FREQ || "").toUpperCase();
  if (["DAILY", "WEEKLY", "MONTHLY"].indexOf(freq) < 0) return [t0];

  const paso = Math.max(1, parseInt(r.INTERVAL || "1", 10) || 1);
  const cuenta = r.COUNT ? parseInt(r.COUNT, 10) : 0;
  let hastaT = Infinity;
  if (r.UNTIL) { const u = fechaICal(r.UNTIL, null, zona); if (u) hastaT = u.t; }

  const base = partes(t0, zona);
  const [by, bm, bd] = base.fecha.split("-").map(Number);
  const [bh, bmi] = base.hora.split(":").map(Number);

  // sin BYDAY, un WEEKLY repite el mismo dia de la semana que la primera fecha
  const dias = r.BYDAY
    ? r.BYDAY.split(",").map(x => DIAS_RR[x.replace(/^[+-]?\d+/, "").toUpperCase()])
              .filter(x => x !== undefined)
    : [new Date(Date.UTC(by, bm - 1, bd)).getUTCDay()];

  const out = [];
  const tope = Math.min(hastaT, topeT);
  const MAX = 800;                     // freno: ningun calendario sano pasa de aqui

  if (freq === "MONTHLY") {
    for (let i = 0; out.length < MAX; i++) {
      const t = aUTC(by, bm + i * paso, bd, bh, bmi, 0, zona);
      if (t > tope) break;
      out.push(t);
      if (cuenta && out.length >= cuenta) break;
      if (i > MAX) break;
    }
    return out;
  }

  // DAILY y WEEKLY se recorren dia a dia: mas simple y no se equivoca con el
  // cambio de hora, porque cada fecha se reconvierte con su propio desfase.
  const saltoDias = freq === "DAILY" ? paso : 1;
  const semana0 = Math.floor(diasDesde(by, bm, bd) / 7);
  for (let i = 0; i < MAX * 7; i += saltoDias) {
    const c = masDias(by, bm, bd, i);
    const t = aUTC(c.y, c.m, c.d, bh, bmi, 0, zona);
    if (t > tope) break;
    let vale = true;
    if (freq === "WEEKLY") {
      const dow = new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay();
      if (dias && dias.indexOf(dow) < 0) vale = false;
      if (vale && paso > 1) {
        const semana = Math.floor(diasDesde(c.y, c.m, c.d) / 7);
        if ((semana - semana0) % paso !== 0) vale = false;
      }
    }
    if (vale) {
      out.push(t);
      if (cuenta && out.length >= cuenta) break;
      if (out.length >= MAX) break;
    }
  }
  return out;
}

function diasDesde(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / 86400000); }
function masDias(y, m, d, n) {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/* ------------------------------ expandir ------------------------------ */

function expande(brutos, desde, hasta, zona) {
  const desdeT = aUTC(...desde.split("-").map(Number), 0, 0, 0, zona);
  const hastaT = aUTC(...hasta.split("-").map(Number), 23, 59, 59, zona);
  const out = [];
  // los eventos con RECURRENCE-ID son retoques de una repeticion concreta
  const retoques = {};
  for (const ev of brutos) {
    const rid = ev.props["RECURRENCE-ID"];
    if (!rid) continue;
    const f = fechaICal(rid.val, rid.params, zona);
    const uid = ev.props.UID ? ev.props.UID.val : "";
    if (f) retoques[uid + "@" + f.t] = true;
  }

  for (const ev of brutos) {
    const p = ev.props;
    if (p.STATUS && p.STATUS.val === "CANCELLED") continue;
    if (!p.DTSTART) continue;
    const ini = fechaICal(p.DTSTART.val, p.DTSTART.params, zona);
    if (!ini) continue;

    const uid = p.UID ? p.UID.val : "";
    const esRetoque = !!p["RECURRENCE-ID"];

    // fechas borradas a mano de la serie
    const fuera = {};
    for (const ex of (p.EXDATE || [])) {
      for (const trozo of String(ex.val).split(",")) {
        const f = fechaICal(trozo, ex.params, zona);
        if (f) fuera[f.t] = true;
      }
    }

    let instantes;
    if (p.RRULE && !esRetoque) instantes = repeticiones(ini.t, p.RRULE.val, zona, hastaT);
    else instantes = [ini.t];

    for (const t of instantes) {
      if (t < desdeT || t > hastaT) continue;
      if (fuera[t]) continue;
      // si esa fecha concreta tiene su propio evento retocado, la serie no la pinta
      if (!esRetoque && p.RRULE && retoques[uid + "@" + t]) continue;
      out.push(montaEvento(ev, t, ini.todoElDia, zona));
    }
  }
  return out;
}

function montaEvento(ev, t, todoElDia, zona) {
  const p = ev.props;
  const pt = partes(t, zona);
  const titulo = p.SUMMARY ? desescapa(p.SUMMARY.val).trim() : "(sin titulo)";
  const desc = p.DESCRIPTION ? desescapa(p.DESCRIPTION.val) : "";
  const { plan, error, texto } = extraePlan(desc);

  const e = {
    uid: (p.UID ? p.UID.val : "") + "@" + t,
    fecha: pt.fecha,
    hora: todoElDia ? null : pt.hora,
    inicio: new Date(t).toISOString(),
    titulo,
    texto: texto.trim(),
    lugar: p.LOCATION ? desescapa(p.LOCATION.val).trim() : "",
    plan: plan || null
  };
  if (error) e.error = error;
  return e;
}

/* --------------------------- el bloque #copiloto --------------------------- */
/* En la descripcion del evento:
       #copiloto
       { ...json... }
       #fin
   Todo lo que quede fuera del bloque se devuelve como texto suelto.          */

function extraePlan(desc) {
  // Google a veces mete la descripcion con etiquetas y entidades HTML
  const limpio = desc
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");

  const m = limpio.match(/^[ \t]*#copiloto[ \t]*$([\s\S]*?)^[ \t]*#fin[ \t]*$/mi);
  if (!m) return { plan: null, error: null, texto: limpio };

  const texto = (limpio.slice(0, m.index) + limpio.slice(m.index + m[0].length));
  let crudo;
  try {
    crudo = JSON.parse(m[1].trim());
  } catch (e) {
    return { plan: null, texto,
      error: "El bloque #copiloto no es JSON valido: " + String(e.message || e) };
  }
  try {
    return { plan: normaliza(crudo), error: null, texto };
  } catch (e) {
    return { plan: null, texto, error: String(e.message || e) };
  }
}

/* ------------------------------ normalizado ------------------------------ */
/* Deja el plan en la forma exacta que espera la app, para que el movil no
   tenga que validar nada ni arrastrar variantes del formato.                */

const TIPOS_BLOQUE = ["calentar", "serie", "trote", "enfriar"];

function normaliza(p) {
  if (!p || typeof p !== "object") fallo("El bloque #copiloto tiene que ser un objeto JSON.");
  const tipo = String(p.tipo || "").toLowerCase();

  if (tipo === "cinta") return normCinta(p);
  if (tipo === "fuera") return normFuera(p);
  if (tipo === "gym") return normGym(p);
  fallo('El campo "tipo" tiene que ser "cinta", "fuera" o "gym" (llego: ' + JSON.stringify(p.tipo) + ").");
}

function normCinta(p) {
  if (!Array.isArray(p.bloques) || !p.bloques.length) fallo('Un plan de cinta necesita "bloques".');
  const bloques = p.bloques.map((b, i) => {
    const t = String(b.tipo || "").toLowerCase();
    if (TIPOS_BLOQUE.indexOf(t) < 0)
      fallo("Bloque " + (i + 1) + ': "tipo" tiene que ser calentar, serie, trote o enfriar.');
    const kmh = num(b.kmh, "Bloque " + (i + 1) + ': falta "kmh".');
    const seg = Math.round(num(b.seg, "Bloque " + (i + 1) + ': falta "seg".'));
    if (seg <= 0) fallo("Bloque " + (i + 1) + ': "seg" tiene que ser mayor que 0.');
    return { tipo: t, nombre: String(b.nombre || etiquetaPorDefecto(t, i)), kmh, seg };
  });
  const seg = bloques.reduce((a, b) => a + b.seg, 0);
  const km = bloques.reduce((a, b) => a + b.kmh * b.seg / 3600, 0);
  return {
    tipo: "cinta",
    nombre: String(p.nombre || "Sesion de cinta"),
    inclinacion: p.inclinacion === undefined ? 0 : num(p.inclinacion, ""),
    bloques,
    total: { seg, km: Math.round(km * 1000) / 1000 }
  };
}

function normFuera(p) {
  const sub = String(p.subtipo || "facil").toLowerCase();
  if (["tempo", "facil", "largo"].indexOf(sub) < 0)
    fallo('En un plan de fuera, "subtipo" tiene que ser tempo, facil o largo.');
  const distancia = Math.round(num(p.distancia, 'Un plan de fuera necesita "distancia" en metros.'));
  if (distancia <= 0) fallo('"distancia" tiene que ser mayor que 0.');

  const km = (Array.isArray(p.km) ? p.km : []).map((k, i) => {
    const o = {
      desde: Math.round(num(k.desde, "Tramo " + (i + 1) + ': falta "desde".')),
      hasta: Math.round(num(k.hasta, "Tramo " + (i + 1) + ': falta "hasta".')),
      ritmo: ritmoSeg(k.ritmo, "Tramo " + (i + 1))
    };
    if (o.hasta <= o.desde) fallo("Tramo " + (i + 1) + ': "hasta" tiene que ser mayor que "desde".');
    if (k.banda !== undefined) {
      if (!Array.isArray(k.banda) || k.banda.length !== 2)
        fallo("Tramo " + (i + 1) + ': "banda" tiene que ser [rapido, lento].');
      o.banda = k.banda.map(x => ritmoSeg(x, "Tramo " + (i + 1) + " (banda)"));
    }
    if (k.fc !== undefined) {
      if (!Array.isArray(k.fc) || k.fc.length !== 2)
        fallo("Tramo " + (i + 1) + ': "fc" tiene que ser [min, max].');
      o.fc = k.fc.map(x => Math.round(num(x, "Tramo " + (i + 1) + ": FC no numerica.")));
    }
    if (k.nota) o.nota = String(k.nota);
    return o;
  });

  return {
    tipo: "fuera",
    subtipo: sub,
    nombre: String(p.nombre || "Salida"),
    distancia,
    km,
    total: { km: Math.round(distancia / 10) / 100 }
  };
}

function normGym(p) {
  const rut = String(p.rutina || "").toLowerCase();
  if (["push", "pull", "pierna"].indexOf(rut) < 0)
    fallo('En un plan de gym, "rutina" tiene que ser push, pull o pierna.');
  if (!Array.isArray(p.ejercicios) || !p.ejercicios.length)
    fallo('Un plan de gym necesita "ejercicios".');

  const ejercicios = p.ejercicios.map((e, i) => {
    const o = {
      nombre: String(e.nombre || fallo("Ejercicio " + (i + 1) + ': falta "nombre".')),
      series: Math.round(num(e.series, "Ejercicio " + (i + 1) + ': falta "series".')),
      reps: e.reps === undefined ? null : (typeof e.reps === "number" ? e.reps : String(e.reps)),
      peso: e.peso === undefined || e.peso === null ? null : num(e.peso, ""),
      descanso: Math.round(e.descanso === undefined ? 90 : num(e.descanso, ""))
    };
    if (o.series <= 0) fallo("Ejercicio " + (i + 1) + ': "series" tiene que ser mayor que 0.');
    if (e.nota) o.nota = String(e.nota);
    return o;
  });

  return {
    tipo: "gym",
    rutina: rut,
    nombre: String(p.nombre || ("Rutina " + rut)),
    ejercicios,
    total: { series: ejercicios.reduce((a, e) => a + e.series, 0) }
  };
}

function etiquetaPorDefecto(t, i) {
  if (t === "serie") return "Serie";
  if (t === "trote") return "Trote";
  if (t === "calentar") return "Calentamiento";
  if (t === "enfriar") return "Enfriar";
  return "Bloque " + (i + 1);
}

function num(v, msg) {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : v;
  if (typeof n !== "number" || !isFinite(n)) fallo(msg || "Valor numerico no valido: " + JSON.stringify(v));
  return n;
}

// El ritmo se puede escribir como numero de segundos por km (330) o como
// texto tipo "5'30\"" / "5:30". Sale siempre en segundos.
function ritmoSeg(v, donde) {
  if (typeof v === "number" && isFinite(v)) return Math.round(v);
  const s = String(v == null ? "" : v).trim();
  const m = s.match(/^(\d{1,2})\s*[':.]\s*(\d{1,2})/);
  if (m) return +m[1] * 60 + +m[2];
  const n = Number(s);
  if (isFinite(n) && n > 0) return Math.round(n);
  fallo(donde + ': ritmo no entendido (' + JSON.stringify(v) + "). Usa 330 o \"5'30\\\"\".");
}

function fallo(msg) { throw new Error(msg); }
