/* ===========================================================================
   DESPENSA · lo que hay en casa (Tengo) y lo que hay que comprar (Comprar)
   ---------------------------------------------------------------------------
   El punto de partida es la nota de Obsidian (bloque "Estado actual") o el
   ultimo recuento hecho en la app, si es mas nuevo. Encima, por orden de
   tiempo: la compra de la nota, lo apuntado en la app (compra, gasto, se
   acabo, me queda) y cada comida del calendario que ya ha empezado, que gasta
   lo suyo sola (una vez: si se apunto lo gastado al acabar el paso a paso,
   cuenta eso).

   Cada cosa queda segura, dudosa ("¿te queda?") o fuera. Dudosa: no se sabe
   cuanto habia y las comidas la van gastando por piezas (el pan, el jamon), o
   salio en una lista de la compra del plan que nadie confirmo.

   Comprar = lo que piden las comidas que aun no han empezado, hasta el final
   del plan (max. 7 dias), que no esta en casa o puede que no quede. Sin sal,
   aceite ni especias, sin lo que el plan hace antes (los huevos cocidos de
   anoche, el tarro de avena) y sin lo que la receta dice que ya esta en casa.
   Logica pura: node la carga para los tests (tests/despensa.test.mjs).
   =========================================================================== */
(function (raiz, fabrica) {
  var X = fabrica(raiz);
  if (typeof module === "object" && module.exports) module.exports = X;
  else raiz.Despensa = X;
})(typeof window !== "undefined" ? window : this, function (raiz) {
"use strict";

var REC = null;
function Rc() {                              // receta.js: en node con require, en la app ya cargado
  if (!REC) REC = (typeof module === "object" && module.exports && typeof require === "function") ? require("./receta.js") : raiz.Receta;
  return REC;
}
function norm(s) { return Rc().norm(s); }
function dos(n) { return n < 10 ? "0" + n : "" + n; }
function mayus1(t) { t = String(t || ""); return t.charAt(0).toUpperCase() + t.slice(1); }
function isoDe(ms) { var d = new Date(ms); return d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate()); }
function msDe(fecha, hora) {
  var p = String(fecha).split("-"), h = String(hora || "12:00").split(":");
  return new Date(+p[0], +p[1] - 1, +p[2], +h[0] || 0, +h[1] || 0).getTime();
}
function corta(iso) { var p = String(iso).split("-"); return (+p[2]) + "/" + (+p[1]); }
var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
function diaCorto(iso) { return DIAS[new Date(msDe(iso, "12:00")).getDay()].slice(0, 3); }
function diaLargo(iso) { var d = new Date(msDe(iso, "12:00")); return DIAS[d.getDay()] + " " + d.getDate(); }

/* ------------------------------ la nota ------------------------------
   El bloque "Estado actual", tal cual:
     DESPENSA EN VIVO — última actualización: 25/09/2026 (noche), ...
     \## CONGELADOR
     - Tupper: guiso de carne con patatas (440 g) → ...
     Bolsas: pimiento rojo en tiras, ajo troceado, ...
     \## NO HAY
     Pollo, carne picada, ...
     \## COMPRA (sábado 26/09, Carrefour)
     Sartén ..., 500 g solomillos de pollo, ...
   Y tambien un recuento dictado en la app: "Nevera: leche, 6 huevos. Congelador: guiso (440 g)".
   -> {fecha, zonas:[{zona, items:[{txt, nombre, c, tupper}]}], noHay:[txt], compra, notas}      */
var ZONAS = /^(congelador|nevera|frigo(?:rifico)?|despensa(?: seca)?|fresco|fruta(?: y verdura)?|verdura|especias|armario|cajon)$/;
function zonaNom(n) {
  var z = norm(n);
  if (/^frigo/.test(z)) return "Nevera";
  if (/^despensa/.test(z)) return "Despensa seca";
  return mayus1(z.replace(/^cajon$/, "cajón"));
}
function partes(t) {                         // "a, b (c, d), e. Otra" -> ["a", "b (c, d)", "e", "Otra"]
  var r = [], nivel = 0, cur = "";
  String(t).replace(/\.\s+(?=\p{Lu})/gu, ";").split("").forEach(function (ch) {
    if (ch === "(") nivel++; if (ch === ")") nivel = Math.max(0, nivel - 1);
    if ((ch === "," || ch === ";") && !nivel) { if (cur.trim()) r.push(cur.trim()); cur = ""; return; }
    cur += ch;
  });
  if (cur.trim()) r.push(cur.trim());
  return r.map(function (x) { return x.replace(/\.$/, "").trim(); }).filter(Boolean);
}
function item(txt) {
  var t = String(txt).replace(/\s*→.*$/, "").trim(), g = Rc().ingrediente(t.replace(/^tupper:\s*/i, ""));
  var nombre = t.replace(/^tupper:\s*/i, "").replace(/\s*\([^)]*\)/g, "").trim();
  var c = Rc().cantidad(nombre);
  if (c) nombre = c.resto;
  nombre = nombre.replace(/\s+~?\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|cl)$/i, "")
    .replace(/^(?:bote|lata|bolsa|brick|paquete|tarro|tarrina)s?\s+de\s+/i, "");
  nombre = nombre.replace(/^((grandes?|pequeñ[oa]s?|de)\s+)+/i, "").trim();
  return { txt: String(txt).trim(), nombre: mayus1(nombre || t), c: g.c ? { n: g.c.n, ud: g.c.ud } : null, tupper: /^tupper/i.test(t) };
}
function despensa(texto) {
  var out = { fecha: null, zonas: [], noHay: [], compra: null, notas: [] };
  var f = String(texto || "").match(/actualizaci[oó]n\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (f) out.fecha = f[3] + "-" + dos(+f[2]) + "-" + dos(+f[1]);
  var zona = null;
  function abre(nom) {
    var n = norm(nom);
    if (/^no hay/.test(n)) return { tipo: "no" };
    if (/^compra/.test(n)) {
      // "COMPRA (sábado 26/09, Carrefour)": si su dia ya paso, se compro
      var fc = nom.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/), an = fc && (fc[3] || (out.fecha ? out.fecha.slice(0, 4) : String(new Date().getFullYear())));
      out.compra = { titulo: nom.replace(/^COMPRA/i, "Compra"), items: [], fecha: fc ? an + "-" + dos(+fc[2]) + "-" + dos(+fc[1]) : null };
      return { tipo: "compra" };
    }
    var nz = zonaNom(nom), z = out.zonas.filter(function (x) { return x.zona === nz; })[0];
    if (!z) { z = { zona: nz, items: [] }; out.zonas.push(z); }
    return { tipo: "zona", z: z };
  }
  function mete(cuerpo) {
    cuerpo = cuerpo.replace(/^[\s\-–—·•*]+/, "").trim(); if (!cuerpo) return;
    cuerpo = cuerpo.replace(/^(bolsas|tuppers?|botes|latas)\s*:\s*/i, function (m) { return /tupper/i.test(m) ? "Tupper: " : ""; });
    var items = /^tupper:/i.test(cuerpo) ? [cuerpo] : partes(cuerpo);
    items.forEach(function (it) {
      if (zona.tipo === "no") { out.noHay.push(it); return; }
      if (zona.tipo === "compra") {
        if (/^(plan de comidas|solo si falta)/i.test(it)) { out.compra.nota = (out.compra.nota ? out.compra.nota + " " : "") + it; return; }
        out.compra.items.push(item(it)); return;
      }
      zona.z.items.push(item(it));
    });
  }
  String(texto || "").split(/\r?\n/).forEach(function (raw) {
    var l = raw.trim(); if (!l) return;
    var h = l.match(/^\\?#{1,4}\s*(.+)$/);
    if (h) { zona = abre(h[1].trim()); return; }
    // "NEVERA" o "Nevera:" solos en su linea, o "Nevera: leche, huevos. Congelador: guiso" (recuento)
    var trozos = l.split(/(?:^|\.\s+|;\s*)(?=(?:congelador|nevera|frigo(?:r[ií]fico)?|despensa(?: seca)?|fresco|fruta(?: y verdura)?|verdura|especias|armario|no hay|compra)\s*:)/i);
    trozos.forEach(function (tr) {
      var m = tr.match(/^([^:]{3,30}):\s*(.*)$/), sola = !m && ZONAS.test(norm(tr.replace(/[:.]\s*$/, "")));
      if (m && (ZONAS.test(norm(m[1])) || /^(no hay|compra)/.test(norm(m[1])))) { zona = abre(m[1].trim()); mete(m[2]); return; }
      if (sola) { zona = abre(tr.replace(/[:.]\s*$/, "")); return; }
      if (!tr.trim()) return;
      if (!zona) { if (!/^(despensa en vivo|regla)/i.test(tr)) out.notas.push(tr.trim()); return; }
      mete(tr);
    });
  });
  return out;
}

/* ------------------------------ donde va ------------------------------ */
var RE_NEVERA = /\b(pollo|pavo|carne|ternera|cerdo|lomo|solomillo|hamburgues|salchich|pescado|salmon|merluza|bacalao|gamba|langostino|leche|yogur|kefir|queso|mozzarella|nata|mantequilla|jamon|embutido|chorizo|fiambre|tofu|hummus|lechuga|espinaca|rucula|brocoli|calabacin|zanahoria|pepino|champiñon|seta|fresa|arandano|uva|tomate cherry|masa|gazpacho|zumo|huevo cocido)/;
function zonaPara(nombre) {
  var n = norm(nombre);
  return /congelad|helado|\bhielo\b/.test(n) ? "Congelador" : RE_NEVERA.test(n) ? "Nevera" : "Despensa seca";
}
// lo que no se come (la sarten de la compra, el film)
var NO_COMIDA = /\b(sarten|olla|cazo|pota|tupper(?:s)? vacio|film|papel|bolsas? de congelacion|estropajo|lavavajillas|detergente|servilleta)\b/;
// lo que siempre hay: no se compra salvo que digas que se acabo
var SIEMPRE = /^(sal|agua|aceit|aov|pimienta|hielo|especia|caf)\b/;

/* ------------------------------ ¿que comida es? ------------------------------ */
function vivos(cambios) { return (cambios || []).filter(function (cb) { return cb && !cb.borrado; }); }
function finDe(R) { return R.fin ? msDe(R.fecha, R.fin) : msDe(R.fecha, R.hora) + 60 * 60e3; }
// el gasto o "hecha" de una comida: por su uid; los viejos (sin uid), por el titulo y el dia
function marcaDe(R, cambios, tipos) {
  var t = norm(R.titulo);
  return vivos(cambios).filter(function (cb) {
    if (tipos.indexOf(cb.tipo) < 0) return false;
    if (cb.uid) return cb.uid === R.uid;
    return cb.tipo === "gasto" && cb.de && isoDe(cb.t) === R.fecha && (norm(cb.de) === t || (t && norm(cb.de).indexOf(t) >= 0));
  })[0] || null;
}
function estadoComida(R, cambios, opts) {
  if (marcaDe(R, cambios, ["saltada"])) return "saltada";
  if (marcaDe(R, cambios, ["gasto", "hecho"])) return "hecha";
  var ahora = opts.ahoraMs, t0 = msDe(R.fecha, R.hora || "12:00"), t1 = finDe(R);
  if (ahora >= t1) return "pasada";
  if (ahora >= t0) return "ahora";
  return "proxima";
}
function porHora(a, b) { return (a.fecha + (a.hora || "99")) < (b.fecha + (b.hora || "99")) ? -1 : 1; }
// lo que toca: la comida en curso o, si no hay, la siguiente (las hechas no)
function queToca(comidas, cambios, opts) {
  var L = (comidas || []).filter(function (R) { return R.tipo === "comida" || R.tipo === "fuera"; }).slice().sort(porHora);
  var ya = L.filter(function (R) { return estadoComida(R, cambios, opts) === "ahora"; });
  if (ya.length) return ya[ya.length - 1];
  return L.filter(function (R) { return estadoComida(R, cambios, opts) === "proxima"; })[0] || null;
}

/* ------------------------------ lo que hay ------------------------------
   Un "stock" por alimento (una clave): {g (Ing), nombre, txt, c, zona, estado, usos, razon...}.
   Se rehace entero cada vez, por orden de tiempo.                                   */
var DISCRETO = { ud: 1, rebanada: 1, loncha: 1, rodaja: 1 };
var ENVASE = { lata: 1, bote: 1, bolsa: 1, brick: 1, tarro: 1, paquete: 1, blister: 1, tarrina: 1, bola: 1 };
function sumaC(a, b) { return a && b && a.ud === b.ud ? { n: Math.round((a.n + b.n) * 100) / 100, ud: a.ud } : null; }
function textoIng(x) { return typeof x === "string" ? x : (x && (x.txt || x.nombre)) || ""; }

function motor(D, cambios, comidas, opts) {
  var RC = Rc(), S = [], CB = vivos(cambios), now = opts.ahoraMs;
  var especias = {};
  function busca(g, conNo) {
    var mejor = null, pm = 0;
    S.forEach(function (s) {
      if (!conNo && s.estado === "no") return;
      var p = s.g.clave && s.g.clave === g.clave ? 1.01 : RC.mismo(g, s.g);
      if (s.estado === "no") p -= 0.001;
      if (p > pm) { pm = p; mejor = s; }
    });
    return mejor;
  }
  function nuevo(g, txt, zona, estado, por) {
    var it = item(txt), s = { g: g, nombre: it.nombre || g.ver, txt: txt, c: g.c ? { n: g.c.n, ud: g.c.ud } : null, zona: zona || zonaPara(txt),
      estado: estado, usos: 0, razon: por || "", tupper: it.tupper };
    S.push(s); return s;
  }
  // entra algo: si ya estaba, se suma; si no, nuevo
  function entra(txt, zona, extra, estado) {
    txt = String(txt).replace(/\s*→.*$/, "").trim();
    var g = RC.ingrediente(txt.replace(/^tupper:\s*/i, "")); if (!g.base && !g.c) return null;
    if (NO_COMIDA.test(norm(txt))) return null;
    var s = busca(g, true);
    if (s) {
      if (s.estado === "no") {                  // vuelve a casa: con su nombre y su sitio
        var it = item(txt);
        s.estado = estado || "seguro"; s.c = g.c ? { n: g.c.n, ud: g.c.ud } : null; s.usos = 0; s.porPlan = null;
        s.g = g; s.txt = txt; s.nombre = it.nombre || g.ver; s.zona = zona || zonaPara(txt); s.tupper = it.tupper;
      }
      else if (s.estado === "dudoso" && !s.c && estado !== "dudoso") {
        // no se sabia cuanto habia: manda lo que entra
        s.c = g.c ? { n: g.c.n, ud: g.c.ud } : null; s.estado = "seguro"; s.usos = 0; s.razon = "";
      } else {
        s.c = s.c && g.c ? sumaC(s.c, g.c) : (estado === "dudoso" ? s.c : null);
        if (estado !== "dudoso") { s.estado = "seguro"; s.usos = 0; }
      }
    } else s = nuevo(g, txt, zona, estado || "seguro");
    if (extra && extra.nuevo) s.nuevo = true;
    if (extra && extra.nutri) s.nutri = extra.nutri;
    if (estado === "dudoso" && extra && extra.razon) s.razon = extra.razon;
    return s;
  }
  // porPlan: lo gasto una comida (el plan); si otra comida lo vuelve a pedir, es "¿te queda?"
  function fuera(s, porPlan) { s.estado = "no"; s.c = null; s.usos = 0; s.porPlan = porPlan || null; }
  function desdeTxt() { return desde ? " desde el " + corta(isoDe(desde)) : ""; }
  function basico(g) { return g.basico || especias[g.clave] || SIEMPRE.test(g.clave || ""); }
  // una comida gasta un ingrediente
  function gasta(g, cuando) {
    if (basico(g) || g.hecho) return;
    var s = busca(g, true);
    if (!s || s.estado === "no") {
      if (g.acaba || g.deCasa) return;
      // lo usaste sin que estuviera: lo tenias (comprado fuera de la app)
      if (!s) s = nuevo(g, g.nombre || g.txt, zonaPara(g.base), "dudoso");
      s.estado = "dudoso"; s.c = null; s.razon = "La usó una comida sin estar en Tengo"; return;
    }
    if (g.acaba) { fuera(s, isoDe(cuando)); return; }
    var need = g.c;
    if (s.c && need && s.c.ud === need.ud) {
      s.c = { n: Math.round((s.c.n - need.n) * 100) / 100, ud: s.c.ud };
      if (s.c.n <= 0) fuera(s, isoDe(cuando));
      return;
    }
    if (s.c && need && ENVASE[s.c.ud] && !ENVASE[need.ud]) return;          // una cda de la lata: queda lata
    if (s.c && need) s.c = null;                                            // no se puede restar: ya no se sabe cuanto
    if (!s.c && need && DISCRETO[need.ud]) {
      s.usos += need.n; s.estado = "dudoso";
      s.razon = (s.usos === 1 ? "1 gastada" : String(s.usos).replace(".", ",") + " gastadas") + desdeTxt();
    }
  }
  function comidaGasta(R, cuando, gastoCb) {
    var L = R.ingredientes.slice();
    if (gastoCb && gastoCb.items && gastoCb.items.length) {
      // lo apuntado al acabar manda sobre lo del plan con la misma clave
      var ap = [];
      gastoCb.items.forEach(function (t) { ap = ap.concat(RC.ings(textoIng(t))); });
      L = L.filter(function (g) { return !ap.some(function (a) { return a.clave === g.clave; }); }).concat(ap);
    }
    L.forEach(function (g) { gasta(g, cuando); });
    // "Se acaba la mozzarella" (si no se sabe cuanta quedaba)
    (R.acaba || []).forEach(function (k) {
      S.forEach(function (s) { if (s.estado !== "no" && !s.c && s.g.clave === k) fuera(s, R.fecha); });
    });
  }

  // 1) el punto de partida: la nota o el ultimo recuento de la app
  var base = D, desde = D && D.fecha ? msDe(D.fecha, "23:59") : 0, conNota = !!(D && D.fecha);
  CB.filter(function (cb) { return cb.tipo === "inventario" && cb.texto && cb.t <= now && cb.t > desde; })
    .sort(function (a, b) { return a.t - b.t; }).slice(-1).forEach(function (cb) {
      base = despensa(cb.texto); desde = cb.t; conNota = false;
    });
  if (base) base.zonas.forEach(function (z) {
    z.items.forEach(function (x) {
      var s = entra(x.txt, z.zona, null, /sin confirmar/i.test(x.txt) ? "dudoso" : "seguro");
      if (s && /sin confirmar/i.test(x.txt)) s.razon = "Cantidad sin confirmar";
      if (s && /^especias$/i.test(z.zona)) especias[s.g.clave] = 1;
    });
    (base.noHay || []).forEach(function (t) {
      var g = RC.ingrediente(t); if (!busca(g, true)) { var s = nuevo(g, t, zonaPara(t), "no"); s.c = null; }
    });
  });

  // 2) lo que paso despues, por orden de tiempo
  var EV = [];
  if (conNota && base && base.compra && base.compra.fecha && msDe(base.compra.fecha, "12:00") <= now)
    EV.push({ t: Math.max(desde + 1, msDe(base.compra.fecha, "12:00")), k: "compraNota" });
  CB.forEach(function (cb) { if (cb.t > desde && cb.t <= now && cb.tipo !== "inventario") EV.push({ t: cb.t, k: "cb", cb: cb }); });
  (comidas || []).forEach(function (R) {
    if (R.tipo === "compra") {
      // una lista de la compra del plan ya pasada: quiza se compro (nunca seguro)
      var tf = finDe(R); if (tf > desde && tf <= now) EV.push({ t: tf, k: "lista", R: R });
      return;
    }
    if (R.tipo !== "comida") return;
    var t0 = msDe(R.fecha, R.hora || "12:00"); if (t0 <= desde) return;
    if (marcaDe(R, CB, ["saltada"])) return;
    var g = marcaDe(R, CB, ["gasto", "hecho"]);
    if (g) { if (g.tipo === "gasto" && g.t > desde && g.t <= now) EV.push({ t: g.t, k: "comida", R: R, gasto: g }); return; }
    if (t0 <= now) EV.push({ t: t0, k: "comida", R: R });
  });
  EV.sort(function (a, b) { return a.t - b.t; });
  // los gastos que son de una comida ya van con ella
  var deComida = {};
  EV.forEach(function (v) { if (v.k === "comida" && v.gasto) deComida[v.gasto.id || v.gasto.t] = 1; });
  EV.forEach(function (v) {
    if (v.k === "compraNota") base.compra.items.forEach(function (x) { entra(x.txt, null, null, "seguro"); });
    else if (v.k === "lista") {
      (v.R.lista || []).forEach(function (t) {
        var g = typeof t === "object" ? t : RC.ingrediente(String(t)), limpio = g.nombre || g.txt || "";
        if (!g.base || NO_COMIDA.test(norm(g.txt || limpio)) || basico(g)) return;
        var s = busca(g, true);
        if (!s) { s = nuevo(g, limpio, zonaPara(limpio), "dudoso"); s.c = null; s.razon = "Salía en la compra del " + corta(v.R.fecha) + " (sin confirmar)"; }
        else if (s.estado === "no") { s.estado = "dudoso"; s.c = null; s.razon = "Salía en la compra del " + corta(v.R.fecha) + " (sin confirmar)"; }
      });
    } else if (v.k === "comida") comidaGasta(v.R, v.t, v.gasto);
    else {
      var cb = v.cb, its = cb.items || [];
      if (cb.tipo === "compra") its.forEach(function (x) { entra(x, cb.zona, { nuevo: true, nutri: cb.nutri }, "seguro"); });
      else if (cb.tipo === "acaba") its.forEach(function (x) { var s = busca(RC.ingrediente(x)); if (s) fuera(s); });
      else if (cb.tipo === "hay") its.forEach(function (x) {
        var s = busca(RC.ingrediente(x), true);
        if (!s) entra(x, null, null, "seguro");
        else { if (s.estado === "no") s.c = null; s.estado = "seguro"; s.usos = 0; s.razon = ""; }
      });
      else if (cb.tipo === "gasto" && !deComida[cb.id || cb.t]) its.forEach(function (x) { RC.ings(textoIng(x)).forEach(function (g) { gasta(g, cb.t); }); });
    }
  });
  return { S: S, desde: desde, busca: busca, basico: basico, base: base };
}

// lo que hay, por zonas, sin lo que se acabo ni lo que no es comida
var ORDEN_Z = ["Congelador", "Nevera", "Despensa seca", "Fresco", "Especias"];
function casa(D, cambios, comidas, opts) {
  opts = opts || {}; if (opts.ahoraMs == null) opts.ahoraMs = Date.now();
  var M = motor(D, cambios, comidas, opts), Z = [], todos = [];
  M.S.forEach(function (s) {
    if (s.estado === "no" || NO_COMIDA.test(norm(s.txt))) return;
    var it = { nombre: s.nombre, ver: s.g.ver, clave: s.g.clave, txt: s.txt, c: s.c, zona: s.zona, dudoso: s.estado === "dudoso",
               usos: s.usos, razon: s.razon, nuevo: !!s.nuevo, nutri: s.nutri || null, tupper: !!s.tupper, g: s.g };
    var z = Z.filter(function (x) { return x.zona === s.zona; })[0];
    if (!z) { z = { zona: s.zona, items: [] }; Z.push(z); }
    z.items.push(it); todos.push(it);
  });
  Z.sort(function (a, b) {
    var i = ORDEN_Z.indexOf(a.zona), j = ORDEN_Z.indexOf(b.zona);
    return (i < 0 ? 9 : i) - (j < 0 ? 9 : j);
  });
  return { zonas: Z, todos: todos, n: todos.length, dudosos: todos.filter(function (x) { return x.dudoso; }).length,
           desde: M.desde ? isoDe(M.desde) : null, _m: M };
}
// ¿esta en casa? -> {estado: "hay" | "dudoso" | "no" | "?", item, zona}
function estadoDe(ing, H) {
  if (!H) return { estado: "?" };
  var RC = Rc(), g = typeof ing === "string" ? RC.ingrediente(ing) : ing.clave != null ? ing : RC.ingrediente(ing.txt || ing.nombre || "");
  if (g.basico || SIEMPRE.test(g.clave || "")) return { estado: "hay" };
  var mejor = null, pm = 0;
  H.todos.forEach(function (x) {
    var p = x.clave && x.clave === g.clave ? 1.01 : RC.mismo(g, x.g || x.nombre);
    if (p > pm) { pm = p; mejor = x; }
  });
  if (!mejor) return { estado: g.deCasa || g.hecho ? "hay" : "no" };
  return { estado: mejor.dudoso ? "dudoso" : "hay", item: mejor, zona: mejor.zona };
}

/* ------------------------------ lo que comprar ------------------------------ */
function sumaDias(iso, n) { var d = new Date(msDe(iso, "12:00")); d.setDate(d.getDate() + n); return isoDe(d.getTime()); }
function faltan(D, cambios, comidas, opts) {
  opts = opts || {}; if (opts.ahoraMs == null) opts.ahoraMs = Date.now();
  var hoy = opts.hoy || isoDe(opts.ahoraMs), RC = Rc();
  var M = motor(D, cambios, comidas, opts);
  var C = (comidas || []).filter(function (R) { return R.tipo === "comida"; });
  var fin = C.reduce(function (m, R) { return R.fecha > m ? R.fecha : m; }, hoy), tope = sumaDias(hoy, 7);
  var hasta = fin < tope ? fin : tope;
  var prox = C.filter(function (R) { return R.fecha <= hasta && estadoComida(R, cambios, opts) === "proxima"; }).sort(porHora);
  var need = {}, orden = [];
  prox.forEach(function (R) {
    R.ingredientes.forEach(function (g) {
      if (M.basico(g) || g.hecho || g.deCasa || g.opcional || !g.clave) return;
      var n = need[g.clave];
      if (!n) { n = need[g.clave] = { g: g, c: g.c ? { n: g.c.n, ud: g.c.ud } : null, sinC: !g.c, para: [] }; orden.push(n); }
      else if (n.c && g.c) n.c = sumaC(n.c, g.c) || n.c;
      else if (!g.c) n.sinC = true;
      if (!n.para.some(function (p) { return p.uid === R.uid; }))
        n.para.push({ uid: R.uid, titulo: R.titulo, fecha: R.fecha, hora: R.hora });
    });
  });
  var items = [];
  orden.forEach(function (n) {
    var s = M.busca(n.g, true), falta = n.c, dudoso = false, razon = "";
    if (s && s.estado === "no" && s.porPlan) { dudoso = true; razon = "Según el plan se acabó el " + corta(s.porPlan); }
    else if (!s || s.estado === "no") falta = n.c;
    else if (s.estado === "dudoso") { dudoso = true; razon = s.razon || "No se sabe si queda"; }
    else if (s.c && n.c && s.c.ud === n.c.ud) {
      if (s.c.n >= n.c.n) return;
      falta = { n: Math.round((n.c.n - s.c.n) * 100) / 100, ud: n.c.ud };
    } else return;                                            // hay (sin cantidad o en otra medida)
    // "Macarrones", "Plátanos": el nombre como venía en la receta (en plural si venía así)
    var ver = mayus1(RC.corto({ ver: n.g.ver || n.g.base, base: n.g.base, nombre: n.g.nombre, c: null }));
    items.push({ k: "f:" + n.g.clave, clave: n.g.clave, ver: ver, c: falta,
                 cant: falta ? RC.cantTxt(falta) : "", para: n.para, dudoso: dudoso, razon: razon, g: n.g });
  });
  return { items: items, hasta: hasta, hastaTxt: diaLargo(hasta), n: prox.length, comidas: prox };
}
// "Para: Shakshuka · jue"
function paraTxt(it, hoy) {
  return (it.para || []).slice(0, 2).map(function (p) { return p.titulo + " · " + (p.fecha === hoy ? "hoy" : diaCorto(p.fecha)); }).join(", ") +
    ((it.para || []).length > 2 ? " y " + (it.para.length - 2) + " más" : "");
}

/* ------------------------------ para Claude ------------------------------
   Lo que hay ahora, con el formato del bloque "Estado actual" de la nota, para pegarselo
   a la Claude que planea las comidas.                                                    */
function textoClaude(H, opts) {
  opts = opts || {}; var ms = opts.ahoraMs != null ? opts.ahoraMs : Date.now(), d = new Date(ms), RC = Rc();
  var L = ["DESPENSA EN VIVO — última actualización: " + dos(d.getDate()) + "/" + dos(d.getMonth() + 1) + "/" + d.getFullYear() + ", desde Copiloto (Tengo)", "",
           "REGLA: este bloque manda. Si un alimento no aparece aquí, NO está en casa.", ""];
  (H && H.zonas || []).forEach(function (z) {
    L.push("\\## " + z.zona.toUpperCase());
    function txt(x) { return (x.c ? RC.corto({ ver: x.ver || x.nombre, c: x.c, nombre: x.txt }) : x.nombre) + (x.dudoso ? " (¿queda?)" : ""); }
    // cada tupper en su linea (como en la nota); lo demas, seguido
    z.items.filter(function (x) { return x.tupper; }).forEach(function (x) { L.push("- Tupper: " + txt(x)); });
    var resto = z.items.filter(function (x) { return !x.tupper; });
    if (resto.length) L.push(resto.map(txt).join(", "));
    L.push("");
  });
  return L.join("\n").replace(/\n+$/, "") + "\n";
}

return { despensa: despensa, item: item, partes: partes, zonaPara: zonaPara, casa: casa, estadoDe: estadoDe,
  estadoComida: estadoComida, queToca: queToca, faltan: faltan, paraTxt: paraTxt, textoClaude: textoClaude,
  isoDe: isoDe, msDe: msDe, diaLargo: diaLargo, diaCorto: diaCorto };
});
