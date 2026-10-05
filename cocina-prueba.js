/* ===========================================================================
   COCINA DE PRUEBA · los datos de ejemplo de la «Cocina de prueba» de Ajustes
   ---------------------------------------------------------------------------
   Una sola desde la v2.43: la pestaña Cocina entera (cocina.js, pintaPrueba) con
   esta despensa, este plan y lo apuntado de ejemplo, en una caja que no toca nada.
   Desde Semana se abre el paso a paso con carriles DE VERDAD (receta.js,
   carriles.js, cocina-modo.js) con el reloj simulado (x1, x10, x30, "Retrasarme
   2 min"): la pasta, las albóndigas y una receta escrita mal a propósito.
   Las recetas son de ejemplo y genericas (el repo es publico).
   =========================================================================== */
(function (raiz, fabrica) {
  var X = fabrica();
  if (typeof module === "object" && module.exports) module.exports = X;
  else raiz.CocinaPrueba = X;
})(typeof window !== "undefined" ? window : this, function () {
"use strict";

var RECETAS = [
  { id: "pasta", titulo: "Pasta con tomate y atún", sub: "La del formato: agua y salsa, y se juntan",
    texto: [
      "1 RACIÓN · 20 min", "",
      "INGREDIENTES", "· 100 g de pasta", "· 1 lata de atún", "· 200 g de tomate triturado", "· ½ cebolla", "· 1 diente de ajo", "· Básicos: sal, AOVE", "",
      "CARRIL AGUA (olla)", "1. Olla con agua y sal al fuego, 8 min hasta que hierva", "2. La pasta, 9 min (no espera)", "3. Escúrrela", "",
      "CARRIL SALSA (sartén)", "1. Pica la cebolla y el ajo, 3 min (manos)", "2. Sofríelos con AOVE, 6 min", "3. El tomate, 8 min", "4. El atún, 1 min", "",
      "AL JUNTAR", "1. Mezcla la pasta con la salsa y sirve"] },
  { id: "albondigas", titulo: "Albóndigas con rigatoni", sub: "Air fryer, dos fuegos y micro a la vez",
    texto: [
      "3 RACIONES · 45 min", "",
      "INGREDIENTES", "· 500 g de carne picada mixta", "· 1 huevo", "· 30 g de pan rallado", "· 600 g de tomate triturado", "· 180 g de rigatoni",
      "· 1 bolsa de arroz de microondas", "· Básicos: sal, AOVE, orégano", "",
      "CARRIL BOLAS (air fryer)", "1. Mezcla la carne con el huevo y el pan rallado y haz 21 bolas, 8 min (manos)",
      "2. Tanda 1: 11 bolas al air fryer a 200 °C, 10 min, agita a los 5", "3. Tanda 2: 10 bolas al air fryer, 10 min, agita a los 5", "",
      "CARRIL SALSA (sartén)", "1. Sartén a fuego medio con AOVE, 3 min", "2. El tomate con orégano y sal, 15 min a fuego bajo", "3. Las albóndigas a la salsa, 12 min (tras BOLAS)", "",
      "CARRIL PASTA (olla)", "1. Olla con agua y sal al fuego, tapada, 10 min hasta que hierva", "2. Los rigatoni, 12 min (no espera)", "3. Escúrrelos", "",
      "CARRIL ARROZ", "1. El arroz al micro, 3 min (no espera)", "",
      "AL JUNTAR", "1. Reparte en tu plato y los 2 tuppers, 3 min"] },
  { id: "errores", titulo: "Pollo con verduras (con errores)", sub: "Escrita mal a propósito, para ver los avisos",
    texto: [
      "1 RACIÓN · 25 min", "",
      "INGREDIENTES", "· 200 g de pechuga de pollo", "· 1 calabacín", "· 100 ml de nata para cocinar", "· 1 bolsa de arroz de microondas", "· Básicos: sal, AOVE", "",
      "CARRIL POLLO (sartén)", "1. Dora el pollo a fuego medio hasta que esté hecho", "2. El calabacín, 5 min (tras VERDURAS)", "",
      "CARRIL SALSA", "1. Calienta la nata a fuego bajo, 3 min", "",
      "CARRIL ARROZ", "1. El arroz al micro, 3 min (no espera)", "",
      "AL JUNTAR", "1. Sirve el pollo con la salsa y el arroz"] },
  // v2.58: el formato nuevo (ver docs/RECETAS-CALENDARIO.md): cada paso con su ingrediente, cantidad, fuego, tiempo y señal
  { id: "curry", titulo: "Curry de pollo y garbanzos", sub: "El formato nuevo: cada paso se basta solo",
    texto: [
      "2 RACIONES · 45 min",
      "POR RACIÓN · 847 kcal · 80 g proteína",
      "",
      "PREPARAR",
      "1. Corta @solomillos de pollo{500 g}(en dados de 2 cm) y quita el tendón blanco, ~{5 min} (manos) → dados iguales, sin tendón",
      "2. Seca @&pollo{500 g} con papel de cocina y salpiméntalo con @sal{=1 pizca} y @pimienta{=1 pizca}, ~{1 min} (manos)",
      "3. Corta @pimiento tricolor{150 g}(en tiras finas), ~{2 min} (manos)",
      "4. Escurre y enjuaga @garbanzos cocidos{1 bote}(~400 g), ~{1 min} (manos) → ya no hacen espuma",
      "5. Mezcla en un bol @curry tostado{1 cda}, @cúrcuma{1 cdta}, @comino{1 cdta} y @cilantro molido{1 cdta}, ~{1 min} (manos)",
      "",
      "CARRIL HUEVO (olla)",
      "1. Pon en el #cazo agua y @huevo{1} a fuego fuerte, ~{5 min} → hierve a borbotones",
      "2. Cuece @&huevo{1} a fuego medio, ~{10 min} → la cáscara no se agrieta y el agua sigue hirviendo",
      "3. Enfría @&huevo{1} con agua fría y pélalo, ~{2 min} (manos) → la cáscara sale sola",
      "",
      "CARRIL POLLO (sartén)",
      "1. Calienta @AOVE{1 cda} en la #sartén a fuego fuerte, ~{2 min} (tras PREPARAR) → humea un poco",
      "2. Echa la primera mitad, @&pollo{250 g}, en una sola capa, ~{5 min}, vuelta a los 2 → dorado por fuera",
      "3. Pasa @&pollo{250 g} dorado a un #plato, ~{20 s} (manos)",
      "4. Echa la segunda mitad, @&pollo{250 g}, en una sola capa, ~{5 min}, vuelta a los 2 → dorado por fuera",
      "5. Pasa @&pollo{250 g} dorado al mismo #plato con su jugo, ~{20 s} (manos)",
      "6. Baja a fuego medio y echa @cebolla troceada{2 cdas}(congelada) y @ajo troceado{1 cdta}(congelado), ~{3 min} removiendo y rascando el fondo → la cebolla, transparente",
      "7. Echa las tiras de @&pimiento tricolor{150 g}, ~{4 min} → blandas al pincharlas",
      "8. Apaga el fuego y echa el bol de especias: @&curry tostado{1 cda}, @&cúrcuma{1 cdta}, @&comino{1 cdta} y @&cilantro molido{1 cdta}, ~{20 s} removiendo (manos) → huele a curry",
      "9. Enciende a fuego bajo y echa @tomate triturado{400 g} y @&pollo{500 g} dorado con su jugo, ~{8 min} destapado, remueve a los 4 → burbujea suave",
      "10. Echa @&garbanzos cocidos{1 bote} y @sal{=1 pizca}, ~{5 min} → la salsa espesa y ya no está aguada",
      "",
      "CARRIL ARROZ (micro)",
      "1. Calienta @arroz de microondas{1 bolsa} en el #micro, ~{3 min} (no espera) → caliente y suelto",
      "",
      "AL JUNTAR",
      "1. Sirve tu plato: @&arroz de microondas{1 bolsa} con la mitad del curry encima, ~{1 min} (manos)",
      "2. Pasa la otra mitad del curry a un #tupper, sin tapa, ~{1 min} (manos)",
      "3. Guarda @&huevo{1} pelado en la #nevera, ~{20 s} (manos)",
      "",
      "AL TERMINAR",
      "1. Deja enfriar el #tupper en la encimera, ~{20 min} → el curry ya no humea",
      "2. Tapa el #tupper y guárdalo en la #nevera, no en el congelador, ~{20 s}",
      "",
      "NOTAS",
      "· Con el fuego alto las especias amargan: por eso se apaga el fuego en el paso 8 del CARRIL POLLO.",
      "· Si el pollo suelta agua, la sartén no estaba caliente o hay demasiado pollo: sécalo mejor y sube el fuego."] }
];
var VELOCIDADES = [1, 10, 30];

// el evento de mentira: como uno de "Comidas", pero sin uid de verdad
function evento(id) {
  var r = RECETAS.filter(function (x) { return x.id === id; })[0] || RECETAS[0];
  return { uid: "prueba-" + r.id, fuente: "comida", fecha: "", hora: "", titulo: r.titulo, texto: r.texto.join("\n") };
}

/* ------------------------------ la casa de prueba (v2.41) ------------------------------
   Una despensa, un plan y lo apuntado de ejemplo, con fechas alrededor de hoy, para ver
   "Por confirmar", las cantidades y los tuppers sin tocar los tuyos. hoy = "AAAA-MM-DD".   */
function dias(hoy, n) {
  var p = hoy.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2] + n, 12);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function casa(hoy, ahoraMs) {
  var ayer = dias(hoy, -1), antes = dias(hoy, -2), man = dias(hoy, 1), f = antes.split("-");
  var nota = "DESPENSA EN VIVO — última actualización: " + f[2] + "/" + f[1] + "/" + f[0] + "\n" +
    "\\## CONGELADOR\n- Tupper: albóndigas con rigatoni\n- Tupper: lentejas con verduras\n- Tupper: crema de calabaza\nBolsas: cebolla troceada, guisantes, 3 bolsas de arroz de microondas\n" +
    "\\## NEVERA\nLeche semi (1 l), 2 yogures naturales, 6 huevos (sin confirmar), 2 lonchas de pavo\n" +
    "\\## FRESCO\n4 plátanos, 2 tomates, 1 cebolla\n" +
    "\\## DESPENSA SECA\n1 kg de macarrones, 240 g de atún en lata, 400 g de tomate triturado, pan de molde, avena\n" +
    "\\## ESPECIAS\nOrégano, pimentón dulce, comino";
  var dia = [
    { uid: "prueba-c1", fuente: "comida", fecha: hoy, hora: "08:00", fin: "08:30", titulo: "Desayuno · Avena con plátano",
      texto: "INGREDIENTES\n· 50 g de avena\n· 1 plátano\n· 200 ml de leche semi\nPROCESO\n1. Mezcla y calienta 2 min al micro." },
    { uid: "prueba-c2", fuente: "comida", fecha: ayer, hora: "21:00", fin: "21:30", titulo: "Cena · Tortilla francesa",
      texto: "INGREDIENTES\n· 2 huevos\n· 1 tomate\n· Básicos: sal, AOVE\nPROCESO\n1. Bate los huevos y cuaja la tortilla, 4 min." },
    { uid: "prueba-c3", fuente: "comida", fecha: hoy, hora: "21:00", fin: "21:40", titulo: "Cena · Pasta con tomate y atún", texto: RECETAS[0].texto.join("\n") },
    { uid: "prueba-c7", fuente: "comida", fecha: dias(hoy, 2), hora: "14:00", fin: "15:00", titulo: "Albóndigas con rigatoni", texto: RECETAS[1].texto.join("\n") },
    { uid: "prueba-c8", fuente: "comida", fecha: dias(hoy, 2), hora: "21:00", fin: "21:40", titulo: "Pollo con verduras (con errores)", texto: RECETAS[2].texto.join("\n") },
    { uid: "prueba-c9", fuente: "comida", fecha: hoy, hora: "14:00", fin: "14:45", titulo: "COCINAS · Curry de pollo y garbanzos (2 raciones)", texto: RECETAS[3].texto.join("\n") },
    { uid: "prueba-c5", fuente: "comida", fecha: man, hora: "21:00", fin: "21:30", titulo: "Cena · Hummus con crudités",
      texto: "INGREDIENTES\n· 1 bote de garbanzos cocidos\n· 1 cda de tahini\n· 2 zanahorias\n· 1 limón\n· Básicos: sal, AOVE, comino\nPROCESO\n" +
        "1. Tritura los garbanzos con el tahini y el limón, 3 min.\n2. Corta las zanahorias en bastones." },
    { uid: "prueba-c6", fuente: "comida", fecha: dias(hoy, 3), hora: "14:00", fin: "14:40", titulo: "Salmón con patata",
      texto: "INGREDIENTES\n· 2 lomos de salmón\n· 3 patatas\n· 1 yogur griego (125 g)\nPROCESO\n1. Patatas al horno 20 min.\n2. El salmón encima, 12 min." },
    { uid: "prueba-c4", fuente: "comida", fecha: man, hora: "14:00", fin: "14:40", titulo: "Pollo al curry con arroz",
      texto: "2 RACIONES · 30 min\nINGREDIENTES\n· 400 g de contramuslos de pollo\n· 1 pimiento rojo\n· 1 bolsa de arroz de microondas\n· Básicos: sal, AOVE, curry\nPROCESO\n1. El pollo a la sartén 8 min.\n2. El pimiento, 5 min.\n3. El arroz, 3 min al micro." }
  ];
  var t = ahoraMs - 90 * 60e3;
  var cambios = [{ id: "prueba-k1", t: t, tipo: "compra", items: ["Contramuslos de pollo"], lista: "f:contramuslo pollo", zona: "Nevera" }];
  var alimentos = [{ id: "prueba-a1", t: t, nombre: "Atún en lata", alias: ["Atún claro al natural"], zona: "Despensa salada",
    codigos: [{ ean: "0000000000017", marca: "Marca de ejemplo", formato: "240 g (3 x 80 g)" }], eq: { n: 80, ud: "g" },
    nutri: { kcal: 116, prot: 26, hc: 0, grasa: 1, por: "100 g", fuente: "OFF" } }];
  var lista = [{ id: "prueba-m1", t: t, txt: "Bolsas de basura" }];   // sin pasillo conocido y sin día de uso
  // nutricion: un perfil de EJEMPLO (no el tuyo), un batido registrado hoy y un tipo de dia por dia de la semana
  var perfil = { peso: 70, altura: 175, edad: 30, sexo: "h" };
  var registro = [{ id: "prueba-r1", t: t, fecha: hoy, txt: "Batido de proteína", fav: "batido",
    n: { kcal: 270, prot: 37.4, hc: 15.5, grasa: 5.6, fibra: 0, vitC: 0, folato: 15, calcio: 485 }, sinDatos: [], estimado: false, micros: true }];
  var tipoDia = function (f) { var d = new Date(f + "T12:00:00").getDay(); return d === 0 ? "tirada" : d === 3 ? "calidad" : d === 6 ? "descanso" : "gimnasio"; };
  // suplementos de EJEMPLO: uno con etiqueta, uno en dos tomas solo los días de entreno y uno sin etiqueta (no suma)
  var suplementos = [
    { id: "prueba-s1", nombre: "Vitamina D3 (ejemplo)", dosis: { n: 1, ud: "cápsula" }, momentos: [{ m: "desayuno" }], dias: "todos" },
    { id: "prueba-s2", nombre: "Omega-3 (ejemplo)", dosis: { n: 1, ud: "cápsula" }, momentos: [{ m: "comida" }, { m: "cena" }], dias: "entreno" },
    { id: "prueba-s3", nombre: "Magnesio (ejemplo)", dosis: { n: 1, ud: "comprimido" }, momentos: [{ m: "dormir" }], dias: "todos" }];
  alimentos.push({ id: "prueba-a2", t: t, nombre: "Vitamina D3 (ejemplo)", alias: [], zona: "Suplementos", codigos: [], nutri: { por: "1 unidad", vitD: 25, fuente: "tú" } },
                 { id: "prueba-a3", t: t, nombre: "Omega-3 (ejemplo)", alias: [], zona: "Suplementos", codigos: [], nutri: { por: "1 unidad", epa: 175, dha: 125, vitE: 6, fuente: "tú" } });
  return { dia: dia, nota: nota, cambios: cambios, lista: lista, alimentos: alimentos, perfil: perfil, registro: registro, tipoDia: tipoDia, suplementos: suplementos };
}

var API = { RECETAS: RECETAS, VELOCIDADES: VELOCIDADES, evento: evento, casa: casa };

return API;
});
