/* ===========================================================================
   RECETA · entender el texto de un evento del calendario "Comidas"
   ---------------------------------------------------------------------------
   Claude escribe cada comida como texto libre: titulo "Etiqueta · Plato",
   una primera linea con raciones y minutos, apartados en MAYUSCULAS
   (INGREDIENTES, SALSA, POR TARRO, ANTES DE EMPEZAR, PROCESO, EN PARALELO,
   AL TERMINAR, REPARTO, PLAN B...), viñetas con ingredientes y pasos
   numerados. Aqui se convierte en:
     - ingredientes (Ing): cantidad, alimento, preparacion y de donde sale;
     - pasos (Paso): con su reloj, avisos ("agita a los 5"), lo que usa cada
       uno y un paso 0 automatico "Antes de empezar" (saca, corta, ten a mano);
     - problemas: lo que el plan no dice (cortar el boniato, la miel que nunca
       se usa, tiempos que no cuadran).
   Formas: ver docs/COCINA.md (Ing, Paso, Receta). Sin DOM: node lo carga
   para los tests (tests/receta.test.mjs).
   =========================================================================== */
(function (raiz, fabrica) {
  var X = fabrica();
  if (typeof module === "object" && module.exports) module.exports = X;
  else raiz.Receta = X;
})(typeof window !== "undefined" ? window : this, function () {
"use strict";

/* ------------------------------- texto ------------------------------- */
// minusculas, sin tildes ni signos raros (la ñ pierde la tilde: "puñado" -> "punado")
function norm(s) {
  return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ.,/½¼¾ ]+/g, " ").replace(/\s+/g, " ").trim();
}
// Google a veces mete la descripcion con etiquetas y entidades HTML
function sinHtml(t) {
  return String(t || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "\n").replace(/<li[^>]*>/gi, "· ")
    .replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&");
}
function sinEmoji(t) { return String(t || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{20E3}\u{2B00}-\u{2BFF}]/gu, ""); }
function limpia(l) { return String(l || "").replace(/^[\s\-–—·•*▪◦]+/, "").replace(/\s+/g, " ").trim(); }
function mayus1(t) { t = String(t || ""); return t.charAt(0).toUpperCase() + t.slice(1); }
// "CENA LIGERA" -> "Cena ligera"; lo que ya va en minusculas se queda igual
function frase(t) {
  t = String(t || "").trim();
  var letras = t.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
  return letras.length > 1 && letras === letras.toUpperCase() ? mayus1(t.toLowerCase()) : t;
}
// la linea es una viñeta o un paso numerado
function esVineta(l) { return /^[\-–—·•*▪◦]/.test(l); }
function esNumero(l) { return /^\d{1,2}[.)]\s/.test(l); }
// partir por comas (o lo que se pida) sin romper lo que va entre parentesis
function trocea(t, sep) {
  var r = [], nivel = 0, cur = "", i, ch;
  t = String(t || "");
  for (i = 0; i < t.length; i++) {
    ch = t.charAt(i);
    if (ch === "(") nivel++;
    if (ch === ")") nivel = Math.max(0, nivel - 1);
    if (!nivel && sep.indexOf(ch) >= 0) { r.push(cur); cur = ""; continue; }
    cur += ch;
  }
  r.push(cur);
  return r.map(function (x) { return x.trim(); }).filter(Boolean);
}

/* ------------------------------ cantidades ------------------------------
   "250 g solomillos de pollo" -> {n:250, ud:"g", resto:"solomillos de pollo"}
   "3-4 lonchas de pavo" -> {n:4, min:3, ud:"loncha", resto:"pavo"}
   "~40 g de mozzarella" -> {n:40, ud:"g", aprox:true, resto:"mozzarella"}
   kg -> g, l/cl -> ml, docena -> 12 ud. Sin numero delante: null.          */
var UDS = { g: "g", gr: "g", grs: "g", gramo: "g", gramos: "g", kg: "kg", kilo: "kg", kilos: "kg", ml: "ml",
  l: "l", litro: "l", litros: "l", cl: "cl", cda: "cda", cdas: "cda", cucharada: "cda", cucharadas: "cda",
  cdta: "cdta", cdtas: "cdta", cucharadita: "cdta", cucharaditas: "cdta", diente: "diente", dientes: "diente",
  lata: "lata", latas: "lata", bote: "bote", botes: "bote", bolsa: "bolsa", bolsas: "bolsa", brick: "brick",
  bricks: "brick", tarro: "tarro", tarros: "tarro", sobre: "sobre", sobres: "sobre", paquete: "paquete",
  paquetes: "paquete", blister: "blister", blisters: "blister", bola: "bola", bolas: "bola", tarrina: "tarrina",
  tarrinas: "tarrina", loncha: "loncha", lonchas: "loncha", rebanada: "rebanada", rebanadas: "rebanada",
  rodaja: "rodaja", rodajas: "rodaja", scoop: "scoop", scoops: "scoop", punado: "puñado", punados: "puñado",
  vaso: "vaso", vasos: "vaso", pizca: "pizca", pizcas: "pizca", tupper: "tupper", tuppers: "tupper",
  docena: "docena", docenas: "docena" };
// envases: sin numero delante valen 1 ("bote de lentejas")
var ENVASE = { lata: 1, bote: 1, bolsa: 1, brick: 1, tarro: 1, paquete: 1, blister: 1, tarrina: 1, bola: 1, tupper: 1 };
var PALNUM = { un: 1, una: 1, uno: 1, medio: 0.5, media: 0.5, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, doce: 12 };
var FRAC = { "½": 0.5, "¼": 0.25, "¾": 0.75 };
function numero(t) {
  t = String(t || "").trim();
  if (FRAC[t] != null) return FRAC[t];
  var m = t.match(/^(\d+)\/(\d+)$/); if (m) return +m[1] / +m[2];
  m = t.match(/^(\d+)\s*([½¼¾])$/); if (m) return +m[1] + FRAC[m[2]];
  var n = parseFloat(t.replace(",", ".")); return isFinite(n) ? n : null;
}
function redondea(n) { return Math.round(n * 100) / 100; }
// la unidad al principio de "resto" (con "grande", "pequeño"... y el "de" detras)
function unidadDe(resto) {
  var m = String(resto).match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ]+)\.?(?=\s|$)\s*/);
  if (!m) return null;
  var u = UDS[norm(m[1]).replace(/ñ/g, "n")];
  if (!u) return null;
  var r = resto.slice(m[0].length).replace(/^(grandes?|peque[nñ][oa]s?|median[oa]s?|generos[oa]s?|colmad[oa]s?|ras[oa]s?)\s+/i, "");
  return { ud: u, resto: r.replace(/^(de|del)\s+/i, "").trim() };
}
// pasa kg, l, cl y docenas a g, ml y unidades
function aBase(c) {
  if (c.ud === "kg") { c.n *= 1000; if (c.min != null) c.min *= 1000; c.ud = "g"; }
  if (c.ud === "l") { c.n *= 1000; if (c.min != null) c.min *= 1000; c.ud = "ml"; }
  if (c.ud === "cl") { c.n *= 10; if (c.min != null) c.min *= 10; c.ud = "ml"; }
  if (c.ud === "docena") { c.n *= 12; if (c.min != null) c.min *= 12; c.ud = "ud"; }
  c.n = redondea(c.n); if (c.min != null) c.min = redondea(c.min);
  return c;
}
function cantidad(txt) {
  var s = String(txt || "").trim(), aprox = false, m, n, min = null, resto, u;
  if (/^~/.test(s)) { aprox = true; s = s.replace(/^~\s*/, ""); }
  m = s.match(/^(\d+\/\d+|\d+(?:[.,]\d+)?(?:\s*[½¼¾])?|[½¼¾])(?:\s*[-–]\s*(\d+(?:[.,]\d+)?|[½¼¾]))?\s*(?:x\s+)?/i);
  if (m && !/^\d+[.)]\s/.test(s) && !/^\d+\s*[:h]\s*\d/.test(s)) {
    n = numero(m[1]); if (n == null) return null;
    if (m[2]) { min = n; n = numero(m[2]); }
    resto = s.slice(m[0].length);
  } else {
    m = s.match(/^(media docena|un|una|uno|medio|media|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce)\s+/i);
    if (!m) return null;
    n = /^media docena/i.test(m[1]) ? 6 : PALNUM[norm(m[1])];
    resto = s.slice(m[0].length);
    if (/^media docena/i.test(m[1])) resto = resto.replace(/^de\s+/i, "");
  }
  u = unidadDe(resto);
  // "2 lomos de salmón": "lomos" no es una unidad, asi que el "de" es del nombre
  var c = { n: n, ud: u ? u.ud : "ud" };
  if (/^media docena/i.test(s)) c.ud = "ud";
  if (min != null) c.min = min;
  if (aprox) c.aprox = true;
  aBase(c);
  c.resto = u ? u.resto : resto.trim();
  return c;
}
// "rigatoni (1,2 kg)", "1 scoop (30 g)": la cantidad que va entre parentesis
function cantidadEntre(txt) {
  var m = String(txt || "").match(/\(\s*(~?\s*\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|cl))\s*\)/i);
  if (!m) return null;
  var c = cantidad(m[1]); if (c) delete c.resto;
  return c;
}
var PLURAL_UD = /^(cda|cdta|bolsa|lata|bote|brick|diente|loncha|rebanada|rodaja|tarro|sobre|scoop|paquete|bola|tarrina|pizca|vaso|tupper|blister|puñado)$/;
function numTxt(n) {
  if (n === 0.5) return "½";
  if (n === 0.25) return "¼";
  if (n === 0.75) return "¾";
  if (n > 1 && n % 1 === 0.5) return Math.floor(n) + "½";
  return String(redondea(n)).replace(".", ",");
}
function cantTxt(c) {
  if (!c || c.n == null) return "";
  var n = c.n, ud = c.ud, t;
  if (ud === "g" && n >= 1000 && c.min == null) t = String(Math.round(n / 100) / 10).replace(".", ",") + " kg";
  else {
    t = (c.min != null ? numTxt(c.min) + "-" : "") + numTxt(n);
    if (ud !== "ud") t += " " + ud + (n > 1 && PLURAL_UD.test(ud) ? "s" : "");
  }
  return (c.aprox ? "~" : "") + t;
}

/* ------------------------------ el alimento ------------------------------
   base: el alimento en minusculas y singular ("pan rústico", "pollo",
   "tomate triturado"). clave: la base sin tildes ni plurales ("pan rustico",
   "tomat triturado"), estable para agrupar. cabeza: lo que decide si dos cosas
   son el mismo alimento (la palabra principal o el compuesto protegido).   */
// singular de una palabra, con sus tildes: "dátiles" -> "dátil", "limones" -> "limón"
var SIN_PLURAL = { rigatoni: 1, gnocchi: 1, oats: 1, mix: 1, tres: 1, dos: 1, seis: 1, mas: 1, "más": 1, gas: 1, semi: 1, microondas: 1, plus: 1,
  crispi: 1, brocoli: 1, "brócoli": 1, kiwi: 1, cookies: 1, spaghetti: 1 };
function sing(w) {
  if (SIN_PLURAL[w]) return w;
  if (w.length <= 3) return w;
  if (/ces$/.test(w)) return w.slice(0, -3) + "z";
  if (/ones$/.test(w)) return w.slice(0, -4) + "ón";
  if (/[aeiouáéíóú][lrn]es$/.test(w) && w.length > 4) return w.slice(0, -2);
  if (/[áéíóú]s$/.test(w)) return w;
  if (/s$/.test(w)) return w.slice(0, -1);
  return w;
}
// raiz para la clave: sin tildes, singular y sin la "e" final tras consonante ("tomate" -> "tomat")
function raiz(w) {
  w = sing(norm(w));
  return w.length > 3 ? w.replace(/([^aeiou])e$/, "$1") : w;
}
function claveDe(base) { return norm(base).split(" ").filter(Boolean).map(raiz).join(" "); }
// compuestos que son otro alimento: pan rallado no es pan, tomate triturado no es tomate
var PROT = /^(pan rallado|carne picada|avena molida|huevos? cocidos?|curry tostado|nuez moscada|tomates? (?:triturado|frito|cherry|seco)s?|piment[oó]n (?:dulce|picante|ahumado)|(?:ajo|cebolla) en polvo|(?:crema|leche|harina|salsa|caldo|zumo|bebida|mantequilla|guiso|aceite|queso)s? de [a-záéíóúüñ]+)/i;
// cortes de carne o pescado: "solomillos de pollo" es pollo
var CORTE_CARNE = /^((?:solomillos?|pechugas?|muslos?|contramuslos?|filetes?|lomos?|alitas?|tiras?|dados?|trozos?|hojas?|ramas?|ramitas?|cabezas?|rodajas?|copos?)\s+de\s+)/i;
// estado: no cambia el alimento
var ESTADO = /(^|\s)((?:congelad|descongelad|fresc|crud|madur|abiert|cerrad|enter|nuev)[oa]s?|grandes?|peque[nñ][oa]s?|median[oa]s?|casi|sobrantes?|desde anoche)(?=\s|$)/gi;
// "de la nevera", "del domingo", "que quedan": dicen de donde sale, no que es
var DONDE = /\s+(?:de la nevera|del congelador|de casa|de la bolsa|del bote(?: abierto)?|del tarro|de los comprados.*|del? (?:ayer|anoche|hoy|domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|mediod[ií]a)|que (?:quedan?|sobran?)|que no usas)\b.*$/i;
// la preparacion: "en cubos de 2 cm", "picados", "tostada", "para mojar"
var PREP = /(?:,\s*|\s+)((?:pelad[oa]s?\s+(?:y\s+)?)?(?:en\s+(?:dados|daditos|cubos|cubitos|rodajas|tiras|trocitos|trozos|l[aá]minas|juliana|gajos|bastones|cuartos|mitades)|(?:picad|rallad|tostad|escurrid|batid|machacad|cortad|pelad|desmenuzad|laminad|lavad|exprimid)[oa]s?|para\s+(?:mojar|servir|decorar|untar|acompa[nñ]ar)|por\s+encima|al\s+gusto|al\s+abrirlo|de\s+postre|con\s+c[aá]scara|a\s+cocer)(?=[\s,.;]|$).*)$/i;
// lo que de verdad hay que hacer con el cuchillo (o abrir, tostar...)
var CORTA = /dados|daditos|cubos|cubitos|rodajas|tiras|trocitos|trozos|l[aá]minas|juliana|gajos|bastones|cuartos|mitades|picad|rallad|tostad|escurrid|batid|machacad|cortad|pelad|desmenuzad|laminad|exprimid/i;
// lo que se pela antes de cortarlo
var PELAR = /^(boniato|patata|zanahoria|cebolla|ajo|aguacate|huevo cocido)$/;
// cortes que algun paso tendria que decir cuando se hacen
var CORTE_PASO = /dados|daditos|cubos|cubitos|rodajas|tiras|trocitos|l[aá]minas|juliana|picad|rallad/i;
// sal, aceite, agua, especias y hierbas secas
var BASICO = /^(sal(?: gorda| fina| en escamas)?|pimienta(?: negra| blanca)?|aove|aceite(?: de oliva)?(?: virgen)?(?: extra)?|agua|hielo|especia|or[eé]gano|piment[oó]n(?: dulce| picante| ahumado)?|comino|canela|curry(?: tostado)?|nuez moscada|perejil|albahaca|c[uú]rcuma|tomillo|romero|laurel|cayena|jengibre molido|(?:ajo|cebolla) en polvo|vinagre|edulcorante)$/;
var BASICO_TXT = /\bal gusto\b|\bpizcas?\b|\bgotas?\b|\bchorrit[oa]\b|\bchorro\b|\bun hilo\b/;
// sinonimos para la cabeza: AOVE es aceite
var SINON = { aov: "aceit", aove: "aceit", aceite: "aceit", mix: "semilla", banana: "platano" };

// "pollo (el del domingo) en dados" ya sin cantidad -> {base, cabeza, refina, ver}
function nucleo(t) {
  var s = String(t || "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(DONDE, "").replace(/\s+(?:para|al|a la|a los|con|que|o|y|sin|desde|hasta|se|si|tapad[oa])\s.*$/i, "");
  s = s.replace(/[~.;:!?¡¿"“”]+/g, " ").replace(/\s+/g, " ").trim();
  var low = s.toLowerCase(), corte = "", m = low.match(CORTE_CARNE);
  if (m && low.length > m[1].length) { corte = m[1]; low = low.slice(m[1].length); }
  low = (" " + low + " ").replace(ESTADO, " ").replace(/\s+/g, " ").trim();
  var pr = low.match(PROT), palabras, cab;
  palabras = low.split(" ").filter(function (w) { return w && !/^\d/.test(w) && w !== "cm"; }).map(sing);
  // "mix de semillas", "semillas (sésamo, chía, lino)": semillas
  if (palabras[0] === "mix" && palabras.indexOf("semilla") >= 0) palabras = ["semilla"];
  var base = palabras.join(" ").replace(/\s+(de|del|y|con)$/, "");
  if (pr) {
    var comp = pr[1].split(" ").map(sing).join(" ");
    cab = claveDe(comp);
    if (/^aceit de oliv/.test(cab)) cab = "aceit";
  } else cab = raiz(palabras[0] || "");
  if (SINON[cab]) cab = SINON[cab];
  var resto = palabras.slice(pr ? pr[1].split(" ").length : 1).filter(function (w) { return !/^(de|del|la|el|los|las|y|en|con)$/.test(w); }).map(raiz);
  var ver = mayus1((corte ? corte : "") + base).replace(/\baove\b/i, "AOVE");
  return { base: base, cabeza: cab, refina: resto, ver: ver };
}

/* ------------------------------ un ingrediente ------------------------------
   "230 g de pollo (el del domingo, descongelado desde anoche) en dados de 2 cm"
   -> {c:{n:230,ud:"g"}, base:"pollo", prep:"en dados de 2 cm", deCasa:true...}
   extra: {grupo, mult, cuando, opcional} del apartado donde va.            */
// "Encima:", "Por el camino:", "En la oficina:", "Opcional:" delante de la viñeta
var ETIQ = /^(por el camino|en la oficina|encima|opcional|al servir|de postre|en paralelo|para (?:el|la|los|las) [a-záéíóúñ ]{2,20})\s*:\s*/i;
var ARTIC = /^(?:todas?\s+l[oa]s|todos\s+los|lo que queda de(?:l|\s+la)?|l[oa]s?|el|lo)\s+/i;
var VAGO = /^(unas?\s+(?:pocas\s+)?gotas|un\s+chorrit[oa]|un\s+chorro|un\s+hilo|un\s+poco|algo|unas\s+cuantas|unos\s+cuantos|unas\s+hojas|unas\s+ramitas|unos|unas)\s+(?:de\s+)?/i;
var DECASA = /\b(del? (?:domingo|lunes|martes|miercoles|jueves|viernes|sabado|mediodia)|de (?:ayer|anoche|hoy)|de la nevera|del congelador|de casa|de la bolsa|del bote|del tarro|del tomate entero|descongelad[oa]s? desde|de los comprados|que quedan?|que sobran?|la otra|el otro|tupper del|del tupper)\b/;
var HECHO = /^(tupper|tarro \d|bote \d)\b|\btarro \d+ de\b|\bhuevos? cocidos? (?:de la |del? )?(?:mediodia|anoche|ayer|manana|domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b|^(?:el|la|los|las) (?:\d+ )?huevos? cocidos?\b/;
var ACABA = /\b(que quedan?|que sobran?|todas? las|todos los|la otra (?:media|mitad)|lo que queda|se acaban?)\b/;

function ingrediente(txt, extra) {
  extra = extra || {};
  var t = limpia(sinEmoji(txt)).replace(/\.$/, ""), cuando = extra.cuando || null, opcional = !!extra.opcional;
  var lab = t.match(ETIQ);
  if (lab) {
    if (/^opcional/i.test(lab[1])) opcional = true; else cuando = cuando || frase(lab[1]);
    t = t.slice(lab[0].length);
  }
  // lo de entre parentesis: una cantidad ("(250 ml)", "(~250 g)") o una nota
  var notas = [], equiv = null;
  var sinPar = t.replace(/\s*\(([^)]*)\)/g, function (_, x) {
    var e = cantidadEntre("(" + x + ")");
    if (e && !equiv) equiv = e; else if (x.trim()) notas.push(x.trim());
    return " ";
  }).replace(/\s+/g, " ").trim();
  var todo = norm(t), cuerpo = norm(sinPar);
  var ref = /^(el|la|los|las)\s/i.test(sinPar);
  var deCasa = ref || DECASA.test(todo), hecho = HECHO.test(cuerpo);
  var acaba = ACABA.test(todo);
  var abre = /\babre[sn]?\b/.test(todo);
  if (/\bopcional\b|\bsin \w+ y ya\b/.test(todo)) opcional = true;
  var basicoTxt = BASICO_TXT.test(cuerpo);
  // "La otra media berenjena" -> "media berenjena"; "Todas las lonchas de pavo" -> "lonchas de pavo"
  var s = sinPar.replace(ARTIC, "").replace(/^otr[oa]\s+/i, "");
  var nom = t.replace(ARTIC, "").replace(/^otr[oa]\s+/i, "");
  var vago = s.match(VAGO), c = null, resto = s, q;
  if (vago) { resto = s.slice(vago[0].length); nom = nom.replace(VAGO, ""); }
  else if ((q = cantidad(s))) { resto = q.resto; delete q.resto; c = q; var qn = cantidad(nom); if (qn) nom = qn.resto; }
  if (!c && !vago) {
    // "Huevos, 1 docena", "Dátiles · 1 paquete", "bote de tomate triturado 800 g"
    var tr = resto.match(/^(.*?)\s*[,·]\s*(~?\d.*|una?\s.*|media docena.*)$/i);
    if (tr && cantidad(tr[2])) { c = cantidad(tr[2]); delete c.resto; resto = tr[1]; nom = resto; }
    else if ((tr = resto.match(/^(.*\D)\s+(?:x\s*)?(\d+(?:[.,]\d+)?|[½¼¾])\s*(uds?\.?|unidades?|latas?|paquetes?|botes?|bolsas?|bricks?|tarros?|docenas?|rebanadas?|lonchas?)?$/i)) &&
             !/\b(min|minutos?|cm|s|seg)$/i.test(tr[1])) {
      // "bananas 4", "plátanos x4", "atún 3 latas": la cantidad detrás del nombre
      c = cantidad(tr[2] + " " + (tr[3] && !/^(ud|unidad)/i.test(tr[3]) ? tr[3] : "") + " x"); delete c.resto;
      resto = tr[1]; nom = resto;
    }
    else if ((tr = resto.match(/^(.*\S)\s+(~?\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|cl))$/i))) {
      c = cantidad(tr[2]); delete c.resto; resto = tr[1];
      var ue = unidadDe(resto); if (ue && ENVASE[ue.ud]) resto = ue.resto;       // "bote de tomate triturado 800 g"
      nom = resto;
    }
  }
  if (!c) {
    // "tarro 1 de overnight oats" (lo hizo el plan), "lonchas de pavo", "Tupper del guiso"
    var tn = resto.match(/^(tarro|tupper|bote)\s+(\d+)\s+de\s+/i), u;
    if (tn) { c = { n: 1, ud: UDS[tn[1].toLowerCase()] }; resto = resto.slice(tn[0].length); hecho = true; }
    else if ((u = unidadDe(resto))) { if (ENVASE[u.ud] || u.ud === "scoop") c = { n: 1, ud: u.ud }; resto = u.resto; }
  }
  if (equiv && (!c || c.ud === "vaso")) { c = equiv; equiv = null; }
  var mult = extra.mult > 0 ? extra.mult : 1;
  if (mult !== 1) [c, equiv].forEach(function (x) {
    if (!x) return;
    x.n = redondea(x.n * mult); if (x.min != null) x.min = redondea(x.min * mult);
  });
  // la preparacion, sin romper los compuestos ("pan rallado", "huevo cocido")
  var pr = resto.match(PROT), off = pr ? pr[1].length : 0, cola = resto.slice(off), prep = null, mp = cola.match(PREP);
  if (mp) { prep = mp[1].replace(/[.;,]+$/, "").trim(); cola = cola.slice(0, mp.index); }
  var coma = cola.indexOf(",");
  if (coma >= 0) { if (cola.slice(coma + 1).trim()) notas.push(cola.slice(coma + 1).trim()); cola = cola.slice(0, coma); }
  var nu = nucleo(resto.slice(0, off) + cola);
  if (!nu.base) nu = nucleo(resto);
  var g = {
    txt: t, c: c, nombre: limpia(nom).replace(/[.;]$/, "") || t, base: nu.base, clave: claveDe(nu.base), ver: nu.ver,
    prep: prep, grupo: extra.grupo || null, cuando: cuando, deCasa: deCasa, hecho: hecho, acaba: acaba, abre: abre,
    basico: basicoTxt || !!extra.basico || BASICO.test(nu.base), opcional: opcional, equiv: equiv, nota: notas.join("; ") || null, mult: mult
  };
  if (vago || (c && c.aprox)) g.aprox = true;
  return g;
}

// una linea con varios: "1 cda de cebolla + ½ cda de ajo congelados", "AOVE, sal, pimienta",
// "Canela y una pizca de sal". Por comas o "y" solo si cada trozo es basico o lleva su cantidad.
function conPar(t, fn) {
  var P = [], s = String(t).replace(/\([^)]*\)/g, function (x) { P.push(x); return "\u0001" + (P.length - 1) + "\u0001"; });
  return fn(s).map(function (x) { return x.replace(/\u0001(\d+)\u0001/g, function (_, i) { return P[+i]; }).trim(); }).filter(Boolean);
}
function tieneCant(x) {
  var s = limpia(x).replace(ARTIC, "").replace(/^otr[oa]\s+/i, "").replace(/\([^)]*\)/g, "").trim();
  return !!cantidad(s) || /^(una pizca|unas gotas|un chorrito|un hilo)\b/i.test(s);
}
function trozos(txt) {
  var out = [];
  conPar(limpia(txt), function (s) { return s.split(/\s*\+\s*/); }).forEach(function (p) {
    var sub = [];
    conPar(p, function (s) { return s.split(/\s*,\s*/); }).forEach(function (x) {
      sub = sub.concat(conPar(x, function (s) {
        return s.split(/\s+y\s+(?=(?:una?\s|unas?\s|\d|[½¼¾~]|sal\b|pimienta\b|aove\b|or[eé]gano\b))/i);
      }));
    });
    if (sub.length > 1 && sub.every(function (x) { return tieneCant(x) || esBasico(x); })) out = out.concat(sub);
    else out.push(p);
  });
  // "1 cda de cebolla + ½ cda de ajo congelados": el adjetivo vale para todos
  var adj = out.length > 1 && out[out.length - 1].match(/\s(congelad|trocead|picad)[oa]s$/i);
  if (adj && out.every(function (x) { var c = cantidad(limpia(x)); return c && /^(cda|cdta)$/.test(c.ud); })) {
    out = out.map(function (x, i) {
      if (i === out.length - 1) x = x.replace(/[oa]s$/i, "");
      else if (new RegExp("\\b" + adj[1], "i").test(x)) return x;
      else x = x + " " + adj[1].toLowerCase();
      var b = nucleo((cantidad(x) || {}).resto || x).base;
      return x + (/a$/.test(b.split(" ")[0]) ? "a" : "o");
    });
  }
  return out;
}
// la linea entera -> [Ing] (con la etiqueta "Encima:", "Opcional:"... para todos los trozos)
function ings(txt, extra) {
  var t = limpia(sinEmoji(txt)).replace(/\.$/, ""), ex = {}, k;
  for (k in (extra || {})) ex[k] = extra[k];
  // "Básicos: sal, pimienta, AOVE": lo de siempre, sin comprar ni contar
  var bas = t.match(/^b[aá]sicos?s*:s*/i);
  if (bas) { ex.basico = true; t = t.slice(bas[0].length); }
  var lab = t.match(ETIQ);
  if (lab) {
    if (/^opcional/i.test(lab[1])) ex.opcional = true; else ex.cuando = frase(lab[1]);
    t = t.slice(lab[0].length);
  }
  return trozos(t).map(function (p) { return ingrediente(p, ex); });
}
function esBasico(x) {
  if (!x) return false;
  if (typeof x === "object") return !!x.basico;
  var s = limpia(x);
  if (BASICO_TXT.test(norm(s))) return true;
  var c = cantidad(s.replace(ARTIC, "")), r = c ? c.resto : s.replace(VAGO, "");
  return BASICO.test(nucleo(r).base);
}

/* ------------------------- ¿es el mismo alimento? -------------------------
   0: no. 1: si. Entre medias: la misma cabeza con otros apellidos
   ("pan rústico" y "pan rústico Lidl"). "solomillos de pollo" es pollo; "pan
   rallado" no es "pan rústico"; "tomate triturado" no es "tomate".        */
function infoDe(x) {
  var g = typeof x === "object" && x ? x : ingrediente(String(x || ""));
  var nu = nucleo(g.base || g.nombre || g.txt || "");
  return { cab: nu.cabeza, ref: nu.refina, g: g };
}
function mismo(a, b) {
  var A = infoDe(a), B = infoDe(b);
  if (!A.cab || !B.cab) return 0;
  if (A.cab !== B.cab) {
    // "Tupper del guiso" con "guiso de carne": lo generico vale si es de casa o del plan
    var gen = B.cab.indexOf(A.cab + " de ") === 0 ? A : A.cab.indexOf(B.cab + " de ") === 0 ? B : null;
    if (gen && !/^(tomat|pan|lech|crema|harina|aceit|queso|salsa|zumo|caldo)$/.test(gen.cab) &&
        (gen.g.hecho || gen.g.deCasa || (gen.g.c && gen.g.c.ud === "tupper"))) return 0.5;
    return 0;
  }
  var comunes = A.ref.filter(function (w) { return B.ref.indexOf(w) >= 0; }).length;
  var todas = A.ref.length + B.ref.length - comunes;
  if (!A.ref.length || !B.ref.length || comunes === todas) return 1;
  return Math.round((0.7 + 0.3 * comunes / todas) * 100) / 100;
}
// "230 g de pollo", "1 boniato", "2 dientes de ajo", "Sal": para listas cortas
function pluralDe(w) {
  if (/[aeiouáéú]$/.test(w) || /s$/.test(w)) return /s$/.test(w) ? w : w + "s";
  if (/ón$/.test(w)) return w.slice(0, -2) + "ones";
  if (/z$/.test(w)) return w.slice(0, -1) + "ces";
  return w + "es";
}
function corto(g) {
  var ver = g.ver || mayus1(g.base) || g.txt, nom = /^[A-ZÁÉÍÓÚ]{2,}\b/.test(ver) ? ver : ver.charAt(0).toLowerCase() + ver.slice(1);
  if (!g.c || g.c.n == null) {
    var v1 = ver.split(" ")[0], vp = pluralDe(v1);
    return vp !== v1 && norm(g.nombre || "").split(" ").indexOf(norm(vp)) >= 0 ? vp + ver.slice(v1.length) : ver;
  }
  if (g.c.ud === "ud") {
    if (g.c.n > 1) { var p = nom.split(" de "); p[0] = p[0].split(" ").map(pluralDe).join(" "); nom = p.join(" de "); }
    return cantTxt(g.c) + " " + nom;
  }
  // el plural si la linea lo traia: "1 puñado de espinacas"
  var w = nom.split(" ")[0], pw = pluralDe(w);
  if (pw !== w && norm(g.nombre || "").split(" ").indexOf(norm(pw)) >= 0) nom = pw + nom.slice(w.length);
  return cantTxt(g.c) + " de " + nom;
}

/* ------------------------------ tiempos ------------------------------
   "5 min, agitar, 5 min más" -> 600 s con aviso a 300 "Agita"
   "10 min. Agita a los 5" -> 600, aviso a 300; "12 min, con vuelta a los 6" -> 720, aviso a 360
   "3-4 min" -> 240 (hasta_s 240) con aviso a 180 "Mira si ya está"; "20 s" -> 20; "1 h" -> 3600
   "4 min a fuego medio, o microondas 2-3 min": lo de detras de la "o" es otra forma, no cuenta. */
var T_RE = /(\d+(?:[.,]\d+)?|[½¼¾])(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*(segundos?|seg|s|minutos?|min|horas?|h)(?![a-záéíóúñ])(\s+m[aá]s)?/gi;
function segDe(n, u) { return Math.round(numero(n) * (/^s/i.test(u) ? 1 : /^h/i.test(u) ? 3600 : 60)); }
function verboAviso(t) {
  t = norm(t);
  if (/vuelta|gira/.test(t)) return "Dale la vuelta";
  if (/remov|remueve/.test(t)) return "Remueve";
  if (/agit/.test(t)) return "Agita";
  return "Sigue";
}
function tiempo(txt) {
  var s = String(txt || ""), dur = 0, rango = false, avisos = [], prev = null, m;
  T_RE.lastIndex = 0;
  while ((m = T_RE.exec(s))) {
    var antes = s.charAt(m.index - 1);
    if (/[\d:/]/.test(antes)) continue;                       // "12:30", "14/09"
    if (prev) {
      var entre = s.slice(prev, m.index), mas = !!m[4], une = /agit|vuelta|remov|remueve|gira/i.test(entre);
      if (!mas && !une) break;                                // otro tiempo suelto u otra forma ("o microondas")
      avisos.push({ a_los_s: dur, texto: verboAviso(entre) });
    }
    var lo = segDe(m[1], m[3]), hi = m[2] ? segDe(m[2], m[3]) : lo;
    if (hi > lo) { avisos.push({ a_los_s: dur + lo, texto: "Mira si ya está" }); rango = true; }
    dur += hi;
    prev = m.index + m[0].length;
  }
  if (dur) {
    // "Agita a los 5", "con vuelta a los 6", "removiendo a la mitad"
    var v, re = /(agit\w*|vuelta|remov\w*|remueve\w*|gira\w*)\s+(?:\w+\s+)?a los (\d+(?:[.,]\d+)?)\s*(s|seg|segundos)?\b/gi;
    while ((v = re.exec(s))) {
      var a = Math.round(numero(v[2]) * (v[3] ? 1 : 60));
      if (a > 0 && a < dur && !avisos.some(function (x) { return x.a_los_s === a; })) avisos.push({ a_los_s: a, texto: verboAviso(v[1]) });
    }
    var mi = s.match(/(agit\w*|vuelta|remov\w*|remueve\w*|gira\w*)\s+a la mitad/i);
    if (mi) avisos.push({ a_los_s: Math.round(dur / 2), texto: verboAviso(mi[1]) });
  }
  avisos.sort(function (a, b) { return a.a_los_s - b.a_los_s; });
  avisos.forEach(function (a) { a.voz = a.texto + "."; });
  var r = { duracion_s: dur, avisos: avisos };
  if (rango) r.hasta_s = dur;
  return r;
}
// "hasta que dore", "la yema aún blanda", "del tamaño de una nuez": como se ve cuando esta
function pistaDe(txt) {
  var m = String(txt || "").match(/(hasta que [^.,:;(]+|cuando [^.,:;(]+|(?:(?:la|el) \S+ )?a[uú]n (?:algo )?[a-záéíóúñ]+|para que (?:se )?(?:dore|espese|cuaje|funda|evapore)[^.,:;]*|del tama[nñ]o de [^.,:;]+)/i);
  return m ? m[1].trim() : null;
}

/* ------------------------------ apartados ------------------------------
   Una cabecera es una linea en MAYUSCULAS (sin contar lo de entre parentesis),
   "MAYUSCULAS: resto", "Ingredientes:" / "Si no te convence: ..." o
   "NINJA CRISPI · todo en AIR FRY" seguida de un paso numerado.          */
var CABS = [
  ["prep", /^(antes de empezar|antes de nada|mise en place|preparativos|prepara antes)/],
  ["paralelo", /^(en paralelo|mientras)\b/],
  ["despues", /^(al terminar|despues|al acabar|al llegar a casa|luego)\b/],
  ["planB", /^(plan b|si no te convence|si no hay|si falla)\b/],
  ["reparto", /^(reparto|guardar|recalentar)\b/],
  ["pasos", /^(proceso|como se hace|preparacion|pasos|elaboracion|instrucciones|en la oficina|al servir|montaje|modo)\b/],
  ["ing", /^(ingredientes?|por tarro|por racion|llevate|tu plato|necesitas|lo que necesitas|lista)\b/],
  ["nota", /^(ojo|aviso|nota|notas|importante|truco|cafeina|sarten nueva|geles|consejos?|comprueba|solo si falta|urgente|para la semana|tupper|compra)\b/]
];
function tipoCab(n) {
  for (var i = 0; i < CABS.length; i++) if (CABS[i][1].test(n)) return CABS[i][0];
  return null;
}
function enMayus(s) {
  var l = String(s).replace(/\([^)]*\)/g, "").replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
  return l.length >= 3 && l === l.toUpperCase();
}
// -> {nombre, t, resto, par} o null. sig: la siguiente linea (para "1." detras)
function cabecera(l, sig) {
  if (esVineta(l) || esNumero(l)) return null;
  var sigNum = !!sig && esNumero(sig), m, n;
  m = l.match(/^([^:]{2,40}):\s*(.*)$/);
  if (m && !/\d/.test(m[1].replace(/\([^)]*\)/g, "")) && (enMayus(m[1]) || tipoCab(norm(m[1].replace(/\([^)]*\)/g, ""))))) {
    n = norm(m[1].replace(/\([^)]*\)/g, ""));
    return { nombre: m[1].trim(), t: tipoCab(n) || (m[2] ? "nota" : sigNum ? "pasos" : "grupo"), resto: m[2].trim(), par: parDe(m[1]) };
  }
  m = l.match(/^([^·:]{3,30}?)\s+·\s+(.+)$/);
  if (m && enMayus(m[1]) && sigNum) return { nombre: l, t: "pasos", resto: "", par: null, grupo: true };
  if (enMayus(l) && l.length <= 60 && !/[.!?]$/.test(l)) {
    n = norm(l.replace(/\([^)]*\)/g, ""));
    return { nombre: l, t: tipoCab(n) || (sigNum ? "pasos" : "grupo"), resto: "", par: parDe(l) };
  }
  return null;
}
function parDe(t) { var m = String(t).match(/\(([^)]*)\)/); return m ? m[1].trim() : null; }
// "ALBÓNDIGAS (salen ~21)" -> "Albóndigas"
function nombreCab(t) { return frase(String(t).replace(/\([^)]*\)/g, "").replace(/[:：]\s*$/, "").replace(/\s+/g, " ").trim()); }

/* ------------------------------ un paso ------------------------------ */
function tituloDe(t) {
  var m = t.match(/^(.+?)[.:;](?:\s|$)/), ti = m ? m[1] : t;
  if (ti.length < 10 && m && t.length > m[0].length) {
    var m2 = t.slice(m[0].length).match(/^(.+?)[.;](?:\s|$)/);
    ti = ti + ": " + (m2 ? m2[1] : t.slice(m[0].length));
  }
  ti = ti.replace(/[.:;]+$/, "").trim();
  if (ti.length > 60) { ti = ti.slice(0, 58); ti = ti.slice(0, Math.max(ti.lastIndexOf(" "), 30)).replace(/[,;:]$/, "") + "…"; }
  return mayus1(ti);
}
function paso(txt, tipo, grupo) {
  var t = limpia(txt).replace(/^\d{1,2}[.)]\s+/, "").trim();
  var mientras = /^mientras\b[:,]?\s*/i.test(t);
  var x = tiempo(t), p = {
    titulo: tituloDe(mientras ? mayus1(t.replace(/^mientras\b[:,]?\s*/i, "")) : t), detalle: mayus1(t),
    duracion_s: x.duracion_s, avisos: x.avisos, usa: [], consejo: null, pista: pistaDe(t), grupo: grupo || null,
    tipo: mientras && tipo === "paso" ? "paralelo" : tipo, checklist: [], auto: false
  };
  if (x.hasta_s) p.hasta_s = x.hasta_s;
  if (mientras) p.mientras = true;
  var rep = t.match(/\bsalen (\d+)(?:\s*[-–]\s*(\d+))?/i);
  if (rep) p.repetir = rep[2] ? { n: +rep[2], min: +rep[1] } : { n: +rep[1] };
  if (/congelador\s*(?:→|->|a la)\s*(?:la\s+)?nevera/i.test(t)) p.descongela = true;
  return p;
}
// "Las nueces NO van dentro", "Si queda muy espeso...": un consejo, no un paso
function esConsejo(t) {
  t = limpia(t).replace(/^\d{1,2}[.)]\s+/, "");
  return /^si\b/i.test(t) || /^(?:[Ee]l|[Ll]as?|[Ll]os|[Ll]o)\s[^.:]{1,40}?\s(NO|no)\s(va|van|se|lleva|llevan|hace falta)\b/.test(t) || /^(ojo|nota|truco|importante)\b/i.test(t);
}

// una frase (consejo, aviso) no es un ingrediente: "El pimentón va solo en el adobo, no en..."
function esFrase(t) {
  var s = limpia(t).replace(ETIQ, "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (tieneCant(s) || trozos(s).length > 1) return false;
  var n = norm(s), w = n ? n.split(" ").length : 0;
  return w > 8 || (/[:;]/.test(s) && w > 4) || /\b(NO|no) (se|va|van|lleva|llevan|hace)\b/.test(s) ||
    /^(si|ojo|nota|importante|truco|cuidado|recuerda|antes|mientras|luego|despues|reserva|guarda|usa|puedes|mejor|atencion|aviso)\b/.test(n);
}
// palabras con peso de un texto, en raiz (para casar consejos y pasos)
var VACIAS = {};
("para desde como este esta estos estas pero todo toda todos todas cada menos bien hasta cuando luego antes despues " +
 "solo sola fuego minuto minutos queda quedan otra otro porque sobre entre dentro fuera").split(" ").forEach(function (w) { VACIAS[w] = 1; });
function pesadas(t) {
  var r = [];
  norm(t).split(/[^a-z0-9ñ]+/).forEach(function (w) { if (w.length > 3 && !VACIAS[w] && !/^\d/.test(w)) { w = raiz(w); if (r.indexOf(w) < 0) r.push(w); } });
  return r;
}
function palabrasDe(t) { return norm(t).split(/[^a-z0-9ñ]+/).filter(Boolean).map(raiz); }
// otras formas de nombrar lo mismo en un paso ("Pasta a cocer" con los rigatoni)
var OTROS = { rigatoni: ["pasta"], macarron: ["pasta"], espagueti: ["pasta"], fideo: ["pasta"], penne: ["pasta"],
  aov: ["aceit", "aov"], aceit: ["aov", "aceit"], pan: ["pan", "tostada"], carn: ["carn", "picada"], semilla: ["semilla"],
  huevo: ["huevo", "yema", "clara"] };
function clavesDe(g) {
  var w = norm(g.base).split(" ")[0] || "", k = raiz(w);
  return (OTROS[k] || []).concat([k]).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
}
// alimentos que, si sale uno en un paso y no esta en la lista, falta en la lista
var COMIDA = ("huevo tomat pollo carn arroz pasta pan queso mozzarella jamon pavo atun salmon merluza gamba cebolla ajo " +
  "pimiento berenjena calabacin boniato patata zanahoria espinaca lechuga aguacat limon platano manzana fresa arandano " +
  "mango nuez datil avena yogur lech miel maiz garbanzo lenteja guisant champinon brocoli calabaza pepino mantequilla " +
  "nata harina chocolat cacahuet almendra pistacho proteina guiso").split(" ");
var GENERICO_ING = /^(ingredientes?|necesitas|lo que necesitas|lista)$/;
var GENERICO_PASOS = /^(proceso|como se hace|preparacion|pasos|elaboracion|instrucciones|modo)$/;
var ORDEN = { auto: 0, prep: 1, paralelo: 2, paso: 3, despues: 4 };

function partirTitulo(raw) {
  var tit = sinEmoji(sinHtml(raw)).replace(/\s+/g, " ").trim();
  var p = tit.split(/\s+[·—–|]\s+/).map(function (x) { return x.replace(/\s*\(\s*\d+\s*raci[oó]n(?:es)?[^)]*\)/i, "").trim(); })
    .filter(function (x) { return x && !/^\d+\s*raci[oó]n(?:es)?$/i.test(x); });
  var may = function (x) { return /^[A-ZÁÉÍÓÚÑ0-9¿¡"]/.test(x); }, etiqueta = "", sub = [];
  if (p.length > 1 && may(p[1]) && p[0].length <= 24) { etiqueta = frase(p[0]); p = p.slice(1); }
  var titulo = p[0] || tit;
  p.slice(1).forEach(function (x) { if (may(x)) titulo += " · " + x; else sub.push(x); });
  return { titulo: titulo, etiqueta: etiqueta, sub: sub.join(" · ") };
}
// "1 RACIÓN · ~30 min · La receta del 14/09. Plato completo..." -> una idea por linea
function resumenDe(l) {
  var out = [];
  String(l || "").split(/\s+·\s+/).forEach(function (x) {
    x.replace(/\.\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/g, ".\u0002").split("\u0002").forEach(function (y) { if (y.trim()) out.push(frase(y.trim())); });
  });
  return out;
}
function pelaTxt(g) {
  var f = g.base.split(" ")[0], pl = g.c && g.c.n > 1 && /^(ud|diente)$/.test(g.c.ud);
  return "péla" + (/a$/.test(f) ? "la" : "lo") + (pl ? "s" : "");
}

/* ------------------------------ el evento ------------------------------
   ev = {uid, fuente, fecha, hora, fin, titulo, texto} -> Receta            */
function leer(ev) {
  ev = ev || {};
  var rawT = String(ev.titulo || ""), texto = sinHtml(ev.texto || ""), T = partirTitulo(rawT), nt = norm(sinEmoji(rawT));
  var R = { uid: ev.uid || "", fecha: ev.fecha || "", hora: ev.hora || "", fin: ev.fin || "", titulo: T.titulo, sub: T.sub,
    etiqueta: T.etiqueta, tipo: "comida", raciones: null, minutos: null, resumen: [], receta: null, ingredientes: [],
    grupos: [], pasos: [], notas: [], planB: [], problemas: [], acaba: [], mult: 1, lista: [], minutos_calc: null };
  var id = texto.match(/(?:receta\s*[:=]\s*|[?&]id=)([a-z0-9-]{3,60})/i);
  if (id) R.receta = id[1].toLowerCase();
  var compra = /\u{1F6D2}/u.test(rawT) || /^compra\b/.test(nt);
  var L = texto.split(/\r?\n/).map(function (l) { return sinEmoji(l).replace(/\s+/g, " ").trim(); })
    .filter(function (l) { return l && !/^(receta\s*[:=]|https?:\/\/)/i.test(l); });
  var primera = "";
  if (L.length && !esVineta(L[0]) && !esNumero(L[0]) && !cabecera(L[0], L[1])) primera = L.shift();
  R.resumen = resumenDe(primera);
  var rc = (T.titulo + " " + rawT + "\n" + primera).match(/(\d+)\s*raci[oó]n(?:es)?/i) || texto.match(/raciones?\s*[:=]\s*(\d+)/i);
  if (rc) R.raciones = +rc[1];
  var mi = primera.match(/(?:^|·\s*|\.\s+)~?\s*(\d+)\s*min\b/i);
  if (mi) R.minutos = +mi[1];
  var ta = (primera + " " + rawT).match(/(\d+)\s*tarros\b/i);
  if (ta) R.mult = +ta[1];

  var sec = { t: null }, hayNum = false, vistos = false, pasos = [], tips = [], reparto = null;
  function grupo(nombre, mult, extra) {
    var g = R.grupos.filter(function (x) { return x.titulo === nombre; })[0];
    if (!g) { g = { titulo: nombre, mult: mult || 1, items: [] }; for (var k in (extra || {})) g[k] = extra[k]; R.grupos.push(g); }
    return g;
  }
  function meteIngs(lista) {
    lista.forEach(function (g) {
      if (!g.base && !g.c) return;
      var k = R.ingredientes.length, gr = null;
      if (g.cuando && !sec.grupo) gr = grupo(g.cuando, 1, { cuando: g.cuando });
      else if (sec.grupo) gr = sec.grupo;
      if (gr) { g.grupo = gr.titulo; gr.items.push(k); }
      R.ingredientes.push(g);
    });
  }
  function mete(p, r) { p._r = r; p._i = pasos.length; pasos.push(p); vistos = true; return p; }
  function tip(t) { tips.push({ txt: mayus1(limpia(t).replace(/^\d{1,2}[.)]\s+/, "")), tras: pasos[pasos.length - 1] || null }); }
  function abreSec(h) {
    var t = h.t, nom = nombreCab(h.nombre), nn = norm(nom);
    hayNum = false;
    sec = { t: t, nombre: nom, grupo: null, grupoPaso: null, linea: !!h.resto };
    if (t === "pasos") sec.grupoPaso = h.grupo ? h.nombre : GENERICO_PASOS.test(nn) ? null : nom;
    if (t === "prep") sec.grupoPaso = "Antes de empezar";
    if (t === "paralelo") sec.grupoPaso = "En paralelo";
    if (t === "despues") sec.grupoPaso = nom;
    if (t === "ing" || t === "grupo") {
      if (!GENERICO_ING.test(nn)) {
        var mult = 1, par = h.par || "", x = par.match(/[×x]\s*(\d+)/i);
        if (x) mult = +x[1];
        else if (/^por tarro/.test(nn)) mult = R.mult;
        else if (/^por racion/.test(nn)) mult = R.raciones || 1;
        var extra = {}, rinde = par.match(/salen\s*(~)?\s*(\d+)/i);
        if (rinde) extra.rinde = rinde[1] ? { n: +rinde[2], aprox: true } : { n: +rinde[2] };
        if (par) extra.nota = par;
        sec.grupo = grupo(nom, mult, extra);
      }
      sec.t = "ing";
    }
    if (!h.resto) return;
    if (t === "prep" || t === "paralelo" || t === "despues" || t === "pasos") {
      var p = mete(paso(h.resto, t === "pasos" ? "paso" : t, sec.grupoPaso), ORDEN[t === "pasos" ? "paso" : t]);
      if (t === "paralelo") {
        // "EN PARALELO: 2 huevos a cocer 10 min": esos huevos tambien se gastan
        var m = h.resto.match(/^((?:\d+|un|una|dos|tres|cuatro|medio|media)\s+[a-záéíóúñ]+)/i);
        if (m) {
          var gs = ings(m[1], { grupo: "En paralelo" }).filter(function (g) { return g.base && !g.basico && COMIDA.indexOf(raiz(g.base.split(" ")[0])) >= 0; });
          if (gs.length) { var pg = sec.grupo; sec.grupo = grupo("En paralelo", 1); meteIngs(gs); sec.grupo = pg; }
        }
      }
      p.linea = true;
    } else if (t === "planB") R.planB.push(h.par ? mayus1(h.par) + ": " + h.resto : mayus1(h.resto));
    else if (t === "ing") meteIngs(ings(h.resto, { mult: sec.grupo ? sec.grupo.mult : 1 }));
    else if (t === "reparto") { reparto = reparto || []; reparto.push(mayus1(h.resto)); }
    else R.notas.push(nom + ": " + h.resto);
  }
  function lineaCompra(l, sig) {
    var h = cabecera(l, sig);
    if (h) { var n = norm(h.nombre); sec = { t: "compra", opc: /solo si falta|comprueba/.test(n), nota: /al llegar|despues|al terminar/.test(n) }; if (h.resto) R.notas.push(nombreCab(h.nombre) + ": " + h.resto); return; }
    if (!esVineta(l) && !esNumero(l)) { R.notas.push(l); return; }
    var c = limpia(l).replace(/^\d{1,2}[.)]\s+/, "");
    if (sec.nota) { R.notas.push(c); return; }
    c = c.split(/\s+(?:→|->)\s+/)[0].split(/\.\s+/)[0].replace(/\.$/, "");
    var dos = c.match(/^([^:]{2,40}):\s*(.+)$/), g = ingrediente(dos ? dos[1] : c, { opcional: !!sec.opc || !!dos });
    if (dos) g.nota = dos[2];
    R.lista.push(g);
  }

  L.forEach(function (l, i) {
    var sig = L[i + 1];
    if (compra) return lineaCompra(l, sig);
    var h = cabecera(l, sig);
    if (h) return abreSec(h);
    var num = esNumero(l), vin = esVineta(l), cuerpo = limpia(l).replace(/^\d{1,2}[.)]\s+/, ""), st = sec.t;
    var tipoPaso = st === "prep" || st === "paralelo" || st === "despues" ? st : "paso";
    if (num) {
      if (vistos && esConsejo(l)) return tip(l);
      hayNum = true;
      return mete(paso(l, tipoPaso, sec.grupoPaso), ORDEN[tipoPaso === "paso" && /^mientras\b/i.test(cuerpo) ? "paso" : tipoPaso]);
    }
    if (st === "reparto") { if (vin) { reparto = reparto || []; reparto.push(mayus1(cuerpo)); } else (reparto = reparto || []).nota = ((reparto.nota || "") + " " + cuerpo).trim(); return; }
    if (st === "nota") return R.notas.push(cuerpo);
    if (st === "planB") return R.planB.push(mayus1(cuerpo));
    if (vin) {
      if (st === "prep" || st === "paralelo" || st === "despues" || st === "pasos") {
        if (vistos && esConsejo(l)) return tip(l);
        return mete(paso(l, tipoPaso, sec.grupoPaso), ORDEN[tipoPaso]);
      }
      if (st !== "ing" && vistos) return tip(l);
      if (esFrase(cuerpo)) return R.notas.push(cuerpo);
      return meteIngs(ings(cuerpo, { mult: sec.grupo ? sec.grupo.mult : 1 }));
    }
    // linea normal, sin viñeta ni numero
    if (st === "prep" || st === "paralelo" || st === "despues" || st === "pasos") {
      if (sec.linea || hayNum || esConsejo(l)) return vistos && st !== "despues" ? tip(l) : R.notas.push(cuerpo);
      return mete(paso(l, tipoPaso, sec.grupoPaso), ORDEN[tipoPaso]);
    }
    if (st === "ing" && !esFrase(cuerpo)) return meteIngs(ings(cuerpo, { mult: sec.grupo ? sec.grupo.mult : 1 }));
    if (vistos) return tip(l);
    if (!st && tieneCant(cuerpo) && norm(cuerpo).split(" ").length <= 8) return meteIngs(ings(cuerpo));
    R.notas.push(cuerpo);
  });
  if (reparto) {
    var rp = mete(paso("Reparto", "despues", "Reparto"), ORDEN.despues);
    rp.detalle = reparto.join("\n"); rp.checklist = reparto.slice(); rp.consejo = reparto.nota || null;
  }

  // que es el evento
  var nIng = R.ingredientes.length, ntx = norm(texto);
  if (compra) R.tipo = "compra";
  else if (!nIng && (/^(saca|pasa|descongela)\b/.test(nt) || /❄/.test(rawT))) R.tipo = "aviso";
  else if (!nIng && (/\b(comida|cena|desayuno|almuerzo|merienda) fuera\b/.test(nt) || /nada que preparar|comes fuera|\bcomes con\b/.test(ntx))) R.tipo = "fuera";
  if (R.tipo !== "comida") pasos = [];

  // los pasos en su orden: preparar, en paralelo, los pasos, y lo de despues
  pasos.sort(function (a, b) { return a._r - b._r || a._i - b._i; });
  // lo que usa cada paso: por el alimento, otra forma de llamarlo o el nombre del grupo ("Monta la caprese")
  var ING = R.ingredientes, cubre = ING.map(function () { return false; });
  pasos.forEach(function (p) {
    var todo = norm(p.detalle).match(/\bcon todo\b(?: menos ([^.]*))?/);
    var w = palabrasDe(todo && todo[1] ? norm(p.detalle).replace(todo[1], "") : p.detalle), usa = [];
    ING.forEach(function (g, k) { if (clavesDe(g).some(function (c) { return w.indexOf(c) >= 0; })) usa.push(k); });
    if (todo) {
      var menos = todo[1] ? palabrasDe(todo[1]) : [];
      ING.forEach(function (g, k) {
        if (!g.cuando && !g.hecho && usa.indexOf(k) < 0 && !clavesDe(g).some(function (c) { return menos.indexOf(c) >= 0; })) usa.push(k);
      });
    }
    var gr = R.grupos.filter(function (g) { var c = raiz(norm(g.titulo).split(" ")[0] || ""); return c.length > 2 && w.indexOf(c) >= 0; });
    gr.forEach(function (g) { g.items.forEach(function (k) { cubre[k] = true; }); });
    if (!usa.length && gr.length === 1) usa = gr[0].items.slice();
    // el mismo alimento en dos grupos: el del grupo que mas sale en este paso
    var cuenta = {};
    usa.forEach(function (k) { var gk = ING[k].grupo || ""; cuenta[gk] = (cuenta[gk] || 0) + 1; });
    usa = usa.filter(function (k) {
      var g = ING[k], gk = g.grupo || "";
      return !usa.some(function (j) { var o = ING[j], ok = o.grupo || ""; return j !== k && o.clave === g.clave && ok !== gk && cuenta[ok] > cuenta[gk]; });
    });
    // "sólidos encima", "todo", "el resto": todo el grupo de lo que ya sale
    if (!todo && /\b(solidos|todo|el resto|los ingredientes)\b/.test(norm(p.detalle))) {
      R.grupos.forEach(function (gr) {
        if (gr.cuando || !gr.items.some(function (k) { return usa.indexOf(k) >= 0; })) return;
        gr.items.forEach(function (k) { if (!ING[k].basico && usa.indexOf(k) < 0) usa.push(k); });
      });
    }
    usa.sort(function (a, b) { return a - b; });
    usa.forEach(function (k) { cubre[k] = true; });
    p.usa = usa;
  });
  // las frases sueltas: consejo del paso con el que mas palabras comparte (o del de antes)
  tips.forEach(function (x) {
    if (!pasos.length) { R.notas.push(x.txt); return; }
    var pw = pesadas(x.txt), mejor = null, max = 0;
    pasos.forEach(function (p) {
      var n = pesadas(p.detalle).filter(function (w) { return pw.indexOf(w) >= 0; }).length;
      if (n > 0 && n >= max) { max = n; mejor = p; }
    });
    mejor = mejor || x.tras || pasos[pasos.length - 1];
    mejor.consejo = mejor.consejo ? mejor.consejo + " " + x.txt : x.txt;
  });

  // lo que se acaba hoy: "Se acaban el pavo y las espinacas."
  var sa = (primera + " " + R.notas.join(" ")).match(/se acaban?\s+([^.:;]+)/i);
  if (sa) sa[1].split(/\s*,\s*|\s+y\s+/).forEach(function (x) {
    var g = ingrediente(x), k = g.base && g.clave;
    if (k && R.acaba.indexOf(k) < 0) R.acaba.push(k);
    ING.forEach(function (h) { if (k && (h.deCasa || !h.c) && mismo(h, g)) h.acaba = true; });
  });

  // problemas: lo que el plan no dice
  var reales = pasos.filter(function (p) { return !p.auto; });
  var textos = reales.map(function (p) { return norm(p.detalle); });
  function cortado(g) {
    return clavesDe(g).some(function (c) {
      var re = new RegExp("(corta|pela|pica|trocea|ralla|tuesta|escurre|bate|machaca|lamina|en (dados|cubos|rodajas|tiras|trocitos|laminas))[^|]{0,40}\\b" + c +
        "|\\b" + c + "\\w*[^|]{0,25}(en (dados|cubos|rodajas|tiras|trocitos|laminas)|cortad|picad|batid|rallad|tostad|escurrid)");
      return textos.some(function (t) { return re.test(t); });
    });
  }
  if (R.tipo === "comida" && reales.length) {
    ING.forEach(function (g, k) {
      if (g.basico || g.hecho || g.opcional || g.cuando === "Por el camino" || /de postre/.test(g.prep || "")) return;
      if (!cubre[k]) R.problemas.push({ tipo: "sin-paso", ing: k, texto: "Ningún paso usa: " + corto(g) + "." });
      else if (g.prep && CORTE_PASO.test(g.prep) && !cortado(g))
        R.problemas.push({ tipo: "corte-sin-paso", ing: k, texto: "Ningún paso dice cuándo: " + corto(g) + " · " + g.prep + "." });
    });
    var vistas = {};
    reales.forEach(function (p) {
      if (p.tipo === "despues") return;
      var t = p.detalle.replace(/del tama[nñ]o de [^.,;]+/i, "");
      palabrasDe(t).forEach(function (w) {
        if (COMIDA.indexOf(w) < 0 || vistas[w]) return;
        var esta = ING.some(function (g) { return clavesDe(g).indexOf(w) >= 0 || palabrasDe(g.base).indexOf(w) >= 0; }) ||
          palabrasDe(R.titulo + " " + R.sub).indexOf(w) >= 0 ||
          R.grupos.some(function (g) { return raiz(norm(g.titulo).split(" ")[0] || "") === w; });
        if (!esta) { vistas[w] = 1; R.problemas.push({ tipo: "no-en-lista", texto: "«" + mayus1(w) + "» sale en un paso y no está en la lista." }); }
      });
    });
  }

  // paso 0 automatico: saca, corta y prepara, ten a mano
  if (R.tipo === "comida" && ING.length >= 2) {
    var saca = [], corta = [], mano = [];
    ING.forEach(function (g, k) {
      var txt = corto(g);
      if (g.basico) { if (!mano.some(function (x) { return ING[x.ing].clave === g.clave; })) mano.push({ txt: txt, ing: k }); return; }
      var ex = [], crudo = !/congelad|trocead|en polvo/.test(norm(g.txt)) && !(g.c && /^(cda|cdta)$/.test(g.c.ud));
      if (PELAR.test(g.base) && crudo && !(g.prep && /pelad/i.test(g.prep)) && (!g.hecho || /cocid/.test(g.base))) ex.push(pelaTxt(g));
      if (g.abre || (g.c && /^(lata|bote)$/.test(g.c.ud))) ex.push(/\bbote\b/.test(norm(g.txt)) || (g.c && g.c.ud === "bote") ? "abre el bote" : "abre la lata");
      if (g.prep && CORTA.test(g.prep)) ex.push(g.prep);
      if (ex.length) corta.push({ txt: txt + " · " + ex.join(", "), ing: k });
      else {
        var dos = g.grupo && ING.some(function (o, j) { return j !== k && o.clave === g.clave && o.grupo !== g.grupo; });
        saca.push({ txt: txt + (g.prep ? " · " + g.prep : "") + (dos ? " · " + g.grupo.toLowerCase() : ""), ing: k });
      }
    });
    if (reales.length || corta.length) {
      var secs = [{ titulo: "Saca", items: saca }, { titulo: "Corta y prepara", items: corta }, { titulo: "Ten a mano", items: mano }]
        .filter(function (s) { return s.items.length; });
      pasos.unshift({ titulo: "Antes de empezar", detalle: "Saca, corta y deja a mano lo que vas a usar.", duracion_s: 0, avisos: [],
        usa: ING.map(function (g, k) { return k; }), consejo: null, pista: null, grupo: null, tipo: "prep",
        checklist: secs.reduce(function (a, s) { return a.concat(s.items.map(function (x) { return x.txt; })); }, []),
        secciones: secs, auto: true });
    }
    // el tiempo: lo que suman los pasos (sin lo que va en paralelo) mas 1 min por cosa que cortar
    var seg = reales.reduce(function (a, p) { return a + (p.tipo === "prep" || p.tipo === "paso" ? p.duracion_s : 0); }, 0) + 60 * corta.length;
    R.minutos_calc = Math.round(seg / 60);
    if (R.minutos && seg > R.minutos * 60 * 1.2 + 60)
      R.problemas.push({ tipo: "tiempo", texto: "Los pasos suman ~" + R.minutos_calc + " min y el plan dice " + R.minutos + "." });
  }
  // voz de los avisos: "Boniato solo: agita."
  pasos.forEach(function (p) {
    var corta = p.titulo.split(/[,:]/)[0].split(" ").slice(0, 4).join(" ");
    p.avisos.forEach(function (a) { a.voz = corta + ": " + a.texto.charAt(0).toLowerCase() + a.texto.slice(1) + "."; });
    delete p._r; delete p._i; delete p.linea;
  });
  R.pasos = pasos;
  return R;
}

function ingDe(t) { return t && typeof t === "object" ? t : ingrediente(String(t || "")); }
// los pasos de una comida (ya leida o el evento tal cual)
function pasosDe(R) {
  if (!R) return [];
  if (R.pasos && R.ingredientes) return R.pasos;
  return leer(R).pasos;
}
// una linea corta por ingrediente: "230 g de pollo · en dados de 2 cm"
function resumenIngs(R) {
  return ((R && R.ingredientes) || []).map(function (g) { return corto(g) + (g.prep ? " · " + g.prep : ""); });
}

return {
  norm: norm, sinHtml: sinHtml, sinEmoji: sinEmoji, cantidad: cantidad, cantidadEntre: cantidadEntre, cantTxt: cantTxt,
  ingrediente: ingrediente, ings: ings, trozos: trozos, base: function (t) { return ingDe(t).base; },
  clave: function (t) { return ingDe(t).clave; }, mismo: mismo, esBasico: esBasico, tiempo: tiempo,
  pista: pistaDe, cabecera: cabecera, leer: leer, pasosDe: pasosDe, resumenIngs: resumenIngs, corto: corto, titulo: partirTitulo
};
});
