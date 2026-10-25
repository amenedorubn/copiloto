/* ===========================================================================
   VOZ · lo que dice Cocina en voz alta (v2.72.1)
   ---------------------------------------------------------------------------
   paraVoz(texto): el texto de un paso, un reloj o un aviso, tal como se dice.
   La voz española del móvil lee tal cual lo que ve: «2 cdas» suena «2 cdas»,
   «½» se lo salta y «NEVERA» lo deletrea. Aquí se pasa a palabras:
     - unidades con su número: 1 cucharada / 2 cucharadas, gramo(s), kilo(s),
       mililitro(s), litro(s), centímetro(s), minuto(s), segundo(s), loncha(s)…
     - ½ -> medio / media (según lo que viene detrás), ¼ -> un cuarto de,
       «1,5» -> uno y medio, «~400 g» -> unos 400 gramos, «190 °C» -> 190 grados;
     - fuera las notas de origen («(de casa: …)», «(del congelador)»), las
       comillas, «·» y las marcas de la v3 (@, ~{}, #); «→ X» -> «, hasta que X»;
     - MAYÚSCULAS en minúsculas (salvo siglas de 2 letras conocidas), AOVE ->
       aceite, Air Fry -> air fray, Recrisp -> ricrisp.
   Sin DOM: node lo carga para los tests (tests/voz.test.mjs).
   =========================================================================== */
(function (raiz, fabrica) {
  var X = fabrica(raiz);
  if (typeof module === "object" && module.exports) module.exports = X;
  else raiz.Voz = X;
})(typeof window !== "undefined" ? window : this, function (raiz) {
"use strict";

var REC = null;
function Rc() {                              // receta.js, para leer las marcas de la v3
  if (!REC) {
    try { REC = (typeof module === "object" && module.exports && typeof require === "function") ? require("./receta.js") : raiz.Receta; } catch (e) { REC = null; }
  }
  return REC;
}
var L = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";
var NUM = "(?:\\d+(?:[.,]\\d+)?(?:\\s*[½¼¾])?|[½¼¾])";
// unidad -> [singular, plural, femenina]
var UDS = [
  [/cdas?|cucharadas?/, "cucharada", "cucharadas", true],
  [/cdtas?|cucharaditas?/, "cucharadita", "cucharaditas", true],
  [/g|gr|grs|gramos?/, "gramo", "gramos", false],
  [/kg|kilos?|kilogramos?/, "kilo", "kilos", false],
  [/ml|mililitros?/, "mililitro", "mililitros", false],
  [/l|litros?/, "litro", "litros", false],
  [/cm|cent[ií]metros?/, "centímetro", "centímetros", false],
  [/min|minutos?/, "minuto", "minutos", false],
  [/s|seg|segundos?/, "segundo", "segundos", false],
  [/h|horas?/, "hora", "horas", true],
  [/lonchas?/, "loncha", "lonchas", true],
  [/rebanadas?/, "rebanada", "rebanadas", true],
  [/rodajas?/, "rodaja", "rodajas", true],
  [/pu[ñn]ados?/, "puñado", "puñados", false],
  [/pizcas?/, "pizca", "pizcas", true],
  [/dientes?/, "diente", "dientes", false],
  [/latas?/, "lata", "latas", true],
  [/botes?/, "bote", "botes", false],
  [/bolsas?/, "bolsa", "bolsas", true],
  [/vasos?/, "vaso", "vasos", false],
  [/tazas?/, "taza", "tazas", true],
  [/scoops?/, "scoop", "scoops", false]
];
var UD_RE = new RegExp("(" + NUM + "(?:\\s*[-–]\\s*" + NUM + ")?)\\s*(" + UDS.map(function (u) { return u[0].source; }).join("|") + ")\\.?(?![" + L + "])", "g");
function ud(w) { for (var i = 0; i < UDS.length; i++) if (new RegExp("^(?:" + UDS[i][0].source + ")$", "i").test(w)) return UDS[i]; return null; }
function valor(t) {
  t = String(t).trim();
  var F = { "½": 0.5, "¼": 0.25, "¾": 0.75 }, m = t.match(/^(\d+)?\s*([½¼¾])$/);
  if (m) return (m[1] ? +m[1] : 0) + F[m[2]];
  return parseFloat(t.replace(",", "."));
}
// ¿femenino? (para «medio / media», «uno y medio / una y media»)
var MASC_A = /^(d[ií]a|mapa|problema|sistema|clima|planeta|programa|tema)s?$/i;
var FEM_OTRA = /^(leche|carne|sal|miel|nuez|col|coliflor|flor|piel|clara|yema|mitad|parte|vez|raci[oó]n|cucharad\w*|pizca)s?$/i;
function femenina(palabra) {
  var w = String(palabra || "").toLowerCase(), u = ud(w);
  if (u) return u[3];
  if (MASC_A.test(w)) return false;
  if (FEM_OTRA.test(w) || /(ci[oó]n|si[oó]n|dad|tad|umbre)(es)?$/.test(w)) return true;
  return /as?$/.test(w);
}
// la palabra que viene detras (saltando «de»)
function siguiente(s, i) { var m = s.slice(i).match(new RegExp("^\\s*(?:de\\s+)?([" + L + "]+)")); return m ? m[1] : ""; }

// lo de entre parentesis que solo dice de donde sale: fuera
var ORIGEN = /^\s*(?:(?:el|la|lo|los|las)\s+)?(?:de casa|de la nevera|del congelador|de la bolsa|del bote|del tarro|de ayer|de anoche|de hoy|del? (?:domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|mediod[ií]a)|descongelad[oa]s?|que (?:ya )?(?:quedan?|sobran?|tienes)|lo que queda|(?:el|la) (?:primer[oa]|segund[oa]|otr[oa])\b|sobrante)/i;
var SIGLAS = { OK: 1, TV: 1, PC: 1, UV: 1 };

function paraVoz(texto) {
  var t = String(texto == null ? "" : texto);
  if (!t.trim()) return "";
  // las notas de origen fuera, antes de nada (en la v3 van pegadas al ingrediente: «@huevo{1}(de casa: …)»)
  t = t.replace(/\(([^)]*)\)/g, function (x, d) { return ORIGEN.test(d) ? "" : x; });
  // las marcas de la v3: «@pollo{250 g}», «~{20 s}», «#sartén» -> lo que se lee
  if (/@&?[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]|~[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]*\{|#[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(t)) {
    var R = Rc();
    if (R && R.cook) { var c = R.cook(t); t = c.t + (c.senal ? " → " + c.senal : ""); }
    else t = t.replace(/@&?([^@~#{}]+?)\{([^}]*)\}/g, "$2 de $1").replace(/~[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]*\{([^}]*)\}/g, "$1").replace(/[@#]/g, "");
  }
  t = t.replace(/^\s*\d{1,2}[.)]\s+/, "");                                            // «3. Corta…»: el número del paso
  t = t.replace(/\(\s*(?:manos|espera|no espera|tras\s+[^)]+)\s*\)/gi, " ");          // marcas de carril
  t = t.replace(/\(([^)]*)\)/g, function (x, d) { return ORIGEN.test(d) ? " " : ", " + d + ", "; });
  // la señal: «→ dorado por fuera» -> «, hasta que dorado por fuera»
  t = t.replace(/…/g, "").replace(/[\s.;:,]*(?:→|->)\s*(.*)$/, function (x, s) { s = s.trim(); return s ? (/^(hasta|cuando|que)\b/i.test(s) ? ", " + s : ", hasta que " + s) : ""; });
  t = t.replace(/[«»“”"„]/g, "").replace(/\s*·\s*/g, ", ").replace(/\s*\+\s*/g, " más ").replace(/(\d)\s*%/g, "$1 por ciento").replace(/&/g, " y ");
  // nombres
  t = t.replace(/\bAOVE\b/gi, "aceite").replace(/\bair\s*fry(?:er)?\b/gi, function (x) { return /er$/i.test(x) ? "air fráyer" : "air fray"; })
    .replace(/\bairfryer\b/gi, "air fráyer").replace(/\brecrisp\b/gi, "ricrisp");
  t = t.replace(new RegExp("(^|[^" + L + "])([A-ZÁÉÍÓÚÜÑ]{2,})(?![" + L + "])", "g"), function (x, a, w) { return a + (SIGLAS[w] ? w : w.toLowerCase()); });
  // temperatura y aproximados
  t = t.replace(/(\d)\s*[°º]\s*C?\b/g, "$1 grados");
  t = t.replace(new RegExp("~\\s*(?=" + NUM + ")", "g"), function (x, i, s) {
    var resto = s.slice(i + x.length).replace(new RegExp("^" + NUM + "\\s*"), "");
    return femenina(siguiente(resto, 0)) ? "unas " : "unos ";
  }).replace(/~/g, "");
  // unidades con su numero: «2 cdas» -> «2 cucharadas», «1 min» -> «1 minuto», «½ cda» -> «½ cucharada»
  t = t.replace(UD_RE, function (x, n, u) {
    var U = ud(u), rango = /[-–]/.test(n), v = valor(n.split(/[-–]/).pop());
    return n.replace(/\s*[-–]\s*/, " a ") + " " + (rango || v > 1 ? U[2] : U[1]);
  });
  // fracciones y decimales, segun lo que viene detras
  t = t.replace(/(\d+)\s*½/g, "$1,5");
  t = t.replace(/(^|[^\d,])(\d+),5(?!\d)/g, function (x, a, n, i, s) {
    var f = femenina(siguiente(s, i + x.length));
    return a + (n === "1" ? (f ? "una" : "uno") : n) + (f ? " y media" : " y medio");
  });
  t = t.replace(/(\d),(\d)/g, "$1 coma $2");
  t = t.replace(/½/g, function (x, i, s) { return femenina(siguiente(s, i + 1)) ? "media" : "medio"; });
  t = t.replace(/([¼¾])(\s*)(de\s)?/g, function (x, f) { return (f === "¼" ? "un cuarto de " : "tres cuartos de "); });
  // lo que queda: rayas y espacios
  t = t.replace(/\s*[-–—]\s+/g, ", ").replace(/[;:]\s*,/g, ":").replace(/(,\s*){2,}/g, ", ").replace(/\s+([,.;:])/g, "$1")
    .replace(/,\s*\./g, ".").replace(/\s{2,}/g, " ").replace(/^[\s,]+|[\s,]+$/g, "");
  return t;
}

return { paraVoz: paraVoz };
});
