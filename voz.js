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
var UD_RE = new RegExp("(" + NUM + "(?:\\s*[-–]\\s*" + NUM + ")?)\\s*(" + UDS.map(function (u) { return u[0].source; }).join("|") + ")(?:\\.(?!\\s+[A-ZÁÉÍÓÚÑ]|\\s*$))?(?![" + L + "])", "g");
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
var PALABRA_N = { 2: "dos", 3: "tres", 4: "cuatro", 5: "cinco", 6: "seis", 7: "siete", 8: "ocho", 9: "nueve", 10: "diez", 11: "once", 12: "doce" };

/* v2.73 · la señal de «ya está», siempre en indicativo detrás de «Listo si …»:
     «la salsa espesa», «humea un poco», «se separa en láminas» -> tal cual (sujeto + verbo, o verbo);
     «dorado por fuera», «blandas y doradas», «al dente», «cocidos» -> «está / están …» (concuerda con lo
     primero que dice). «hasta que esté dorado» (lo de antes) -> «está dorado».                            */
var ADJ = /^(blanc|tiern|crujient|calient|suelt|jugos|transparent|firm|cremos|espes|líquid|liquid|tibi|frí|fri|templad|cuajad|hech|frit|abiert|cubiert|puest|rot|list|dorad|blandit|bland|tostad|caramelizad|reducid|fundid|derretid|cocid|hervid|pochad|sellad|gratinad|esponjos|brillant|homogéne|homogene|lis|uniform|opac|rosad|tostadit)(o|a|e|os|as|es)?$/i;
var NO_ADJ = /^(dados?|cubos?|tiras?|rodajas?|trozos?|l[aá]minas?|crema|sin|ya|no|nada|todo|todos|todas|toda)$/i;
var SUBJ = { "esté": "está", "este": "está", "estén": "están", "esten": "están", dore: "dora", doren: "doran", espese: "espesa", cuaje: "cuaja", cuajen: "cuajan",
  hierva: "hierve", burbujee: "burbujea", humee: "humea", reduzca: "reduce", funda: "funde", ablande: "ablanda", ablanden: "ablandan", evapore: "evapora",
  quede: "queda", queden: "quedan", suelte: "suelta", cambie: "cambia", empiece: "empieza", cueza: "cuece", rompa: "rompe", tome: "toma", brille: "brilla",
  pierda: "pierde", pierdan: "pierden", absorba: "absorbe", huela: "huele", crezca: "crece", suba: "sube", baje: "baja", se: "se" };
function listoSi(senal) {
  var s = String(senal || "").replace(/[.;]+$/, "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  // «hasta que la salsa espese» (las recetas de antes): sin «hasta que» y en indicativo
  if (/^(?:hasta que|cuando)\s+/i.test(s)) s = s.replace(/^(?:hasta que|cuando)\s+/i, "").replace(new RegExp("(^|\\s)(" + Object.keys(SUBJ).join("|") + ")(?=[\\s,.;]|$)", "i"), function (x, a, w) { return a + SUBJ[w.toLowerCase()]; });
  if (!/^[A-ZÁÉÍÓÚÑ]{2,}\b/.test(s)) s = s.charAt(0).toLowerCase() + s.slice(1);
  var w = (s.match(new RegExp("^[" + L + "]+")) || [""])[0];
  if (/^sin$/i.test(w)) return "está " + s;
  if (/^(al dente|en su punto|a punto)\b/i.test(s)) return "está " + s;
  if (!NO_ADJ.test(w) && esAdj(w)) return (/s$/i.test(w) ? "están " : "está ") + s;
  // «rodajas finas», «crema con trocitos» -> «quedan rodajas finas», «queda crema con trocitos»
  if (/^(dados|cubos|tiras|rodajas|trozos|l[aá]minas|crema)$/i.test(w)) return (/s$/i.test(w) ? "quedan " : "queda ") + s;
  // «la cebolla, transparente», «el hielo picado del todo» -> «la cebolla está transparente», «el hielo está picado…»
  var sj = s.match(new RegExp("^((?:el|la|los|las) [" + L + "]+),? ([" + L + "]+)(.*)$", "i"));
  if (sj && esAdj(sj[2]) && !/^espesa?n?$/i.test(sj[2])) return sj[1] + (/s$/i.test(sj[1]) ? " están " : " está ") + sj[2] + sj[3];
  return s;
}
function esAdj(w) { return ADJ.test(w) || /^[a-záéíóúñ]+(ad|id)(o|a|os|as)$/i.test(w); }
// «Listo si la salsa espesa» (la pantalla) / «Te aviso para ver si …» y «Lentejas: mira si …» (la voz)
function listoTxt(senal) { var x = listoSi(senal); return x ? "Listo si " + x : ""; }
function vozReloj(seg, senal) {
  // desde 2 min, en minutos redondos («Reloj de 3 minutos», no «2 minutos 45 segundos»)
  var m = Math.round(seg / 60), t = seg >= 120 ? m + " min" : seg < 60 ? Math.round(seg) + " s" : (seg % 60 ? Math.floor(seg / 60) + " min " + Math.round(seg % 60) + " s" : m + " min");
  var x = listoSi(senal);
  return paraVoz("Reloj de " + t + ". " + (x ? "Te aviso para ver si " + x + "." : "Te aviso."));
}
function vozMira(nombre, senal) {
  var x = listoSi(senal);
  return paraVoz((nombre ? nombre + ": " : "") + (x ? "mira si " + x + "." : "tiempo. Mira si ya está."));
}

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
  // la señal: «→ dorado por fuera» -> «, listo si está dorado por fuera»
  t = t.replace(/…/g, "").replace(/[\s.;:,]*(?:→|->)\s*(.*)$/, function (x, s) { s = listoSi(s); return s ? ", listo si " + s : ""; });
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
    var U = ud(u), rango = /[-–]/.test(n), v = valor(n.split(/[-–]/).pop()), me = !rango && n.match(/^(\d+)(?:,5|\s*½)$/);
    // «1,5 cm» -> «centímetro y medio», «2,5 kg» -> «dos kilos y medio», «1,5 h» -> «hora y media»
    if (me) return (me[1] === "1" ? U[1] : (PALABRA_N[me[1]] || me[1]) + " " + U[2]) + (U[3] ? " y media" : " y medio");
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

return { paraVoz: paraVoz, listoSi: listoSi, listoTxt: listoTxt, vozReloj: vozReloj, vozMira: vozMira };
});
