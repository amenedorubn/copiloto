// v2.72.1 · lo que dice Cocina en voz alta: paraVoz (voz.js), con frases reales de docs/recetas/*.txt
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { paraVoz } = require("../voz.js");

// [archivo, línea tal cual está en docs/recetas, lo que se dice]
const REALES = [
  ["2026-10-05-1300-curry.txt", "6. Baja a fuego medio y echa @cebolla troceada{2 cdas}(congelada) y @ajo troceado{1 cdta}(congelado), ~{3 min} removiendo y rascando el fondo → la cebolla, transparente",
    "Baja a fuego medio y echa 2 cucharadas de cebolla troceada congelada y 1 cucharadita de ajo troceado congelado, 3 minutos removiendo y rascando el fondo, hasta que la cebolla, transparente"],
  ["2026-10-05-1300-curry.txt", "4. Escurre y enjuaga @garbanzos cocidos{1 bote}(~400 g), ~{1 min} (manos) → ya no hacen espuma",
    "Escurre y enjuaga 1 bote de garbanzos cocidos, unos 400 gramos, 1 minuto, hasta que ya no hacen espuma"],
  ["2026-10-05-1300-curry.txt", "3. Pasa @&pollo{250 g} dorado a un #plato, ~{20 s} (manos)",
    "Pasa 250 gramos de pollo dorado a un plato, 20 segundos"],
  ["2026-10-05-1300-curry.txt", "1. Calienta @AOVE{1 cda} en la #sartén a fuego fuerte, ~{2 min} (tras PREPARAR) → humea un poco",
    "Calienta 1 cucharada de aceite en la sartén a fuego fuerte, 2 minutos, hasta que humea un poco"],
  ["2026-10-05-1300-curry.txt", "1. Corta @solomillos de pollo{500 g}(en dados de 2 cm) y quita el tendón blanco, ~{5 min} (manos) → dados iguales, sin tendón",
    "Corta 500 gramos de solomillos de pollo en dados de 2 centímetros y quita el tendón blanco, 5 minutos, hasta que dados iguales, sin tendón"],
  ["2026-10-05-1300-curry.txt", "2. Tapa el #tupper y guárdalo en la #nevera, no en el congelador, ~{20 s}",
    "Tapa el tupper y guárdalo en la nevera, no en el congelador, 20 segundos"],
  ["2026-10-05-1300-curry.txt", "2 RACIONES · 45 min · 1 la comes hoy y 1 va a la NEVERA para el jueves.",
    "2 raciones, 45 minutos, 1 la comes hoy y 1 va a la nevera para el jueves."],
  ["2026-10-05-0845-desayuno.txt", "1. Corta @tomate{½}(en rodajas), ~{1 min} → rodajas finas",
    "Corta medio tomate en rodajas, 1 minuto, hasta que rodajas finas"],
  ["2026-10-05-0845-desayuno.txt", "2. Trocea @mozzarella{~30 g}, la mitad de la media bola que tienes, ~{1 min}",
    "Trocea unos 30 gramos de mozzarella, la mitad de la media bola que tienes, 1 minuto"],
  ["2026-10-05-0845-desayuno.txt", "1. Calienta @AOVE{1 cdta} en la #sartén a fuego bajo, ~{1 min} → el aceite se mueve suelto",
    "Calienta 1 cucharadita de aceite en la sartén a fuego bajo, 1 minuto, hasta que el aceite se mueve suelto"],
  ["2026-10-05-0845-desayuno.txt", "5. Pon sobre el pan @&tomate{½} en rodajas, @jamón serrano{2 lonchas} y @orégano{=1 pizca}, ~{1 min}",
    "Pon sobre el pan medio tomate en rodajas, 2 lonchas de jamón serrano y 1 pizca de orégano, 1 minuto"],
  ["2026-10-05-2100-cena.txt", "3. Corta @huevo cocido{1}(de casa: el del mediodía) en rodajas, ~{1 min}",
    "Corta 1 huevo cocido en rodajas, 1 minuto"],
  ["2026-10-05-2100-cena.txt", "2. Machaca @&aguacate maduro{½} con @sal{=1 pizca}, @pimienta{=1 pizca} y @AOVE{1 cdta} en un #plato, ~{1 min} → crema con trocitos",
    "Machaca medio aguacate maduro con 1 pizca de sal, 1 pizca de pimienta y 1 cucharadita de aceite en un plato, 1 minuto, hasta que crema con trocitos"],
  ["2026-10-05-2100-cena.txt", "3. Monta sobre el pan el @&aguacate maduro{½}, @pavo{4 lonchas}(60 g) y @&huevo cocido{1}, ~{1 min}",
    "Monta sobre el pan el medio aguacate maduro, 4 lonchas de pavo, 60 gramos, y 1 huevo cocido, 1 minuto"],
  ["2026-10-05-2100-cena.txt", "4. Pon al lado @espinacas crudas{1 puñado}, si te apetece, ~{20 s}",
    "Pon al lado 1 puñado de espinacas crudas, si te apetece, 20 segundos"],
  ["2026-10-06-2100-cena.txt", "2. Machaca @aguacate{½}(de casa: la otra mitad de ayer) con @sal{=1 pizca}, @pimienta{=1 pizca} y @AOVE{1 cdta}, ~{1 min} (manos) → crema con trocitos",
    "Machaca medio aguacate con 1 pizca de sal, 1 pizca de pimienta y 1 cucharadita de aceite, 1 minuto, hasta que crema con trocitos"],
  ["2026-10-06-2100-cena.txt", "1. Calienta @crema de calabaza{1 brick}(350 ml) en un #cazo a fuego medio, ~{4 min}, remueve a la mitad → humea y burbujea en los bordes",
    "Calienta 1 brick de crema de calabaza, 350 mililitros, en un cazo a fuego medio, 4 minutos, remueve a la mitad, hasta que humea y burbujea en los bordes"],
  ["2026-10-06-1300-lentejas.txt", "1. Pela @boniato{1}(~300 g) y córtalo en cubos de 1,5 cm, ~{4 min} (manos) → cubos iguales",
    "Pela 1 boniato, unos 300 gramos, y córtalo en cubos de uno y medio centímetros, 4 minutos, hasta que cubos iguales"],
  ["2026-10-06-1300-lentejas.txt", "4. Enciende a fuego medio-bajo y echa @tomate triturado{200 g}, @agua{150 ml} y @&boniato{1}, tapado, ~{15 min} → el boniato se pincha sin resistencia",
    "Enciende a fuego medio-bajo y echa 200 gramos de tomate triturado, 150 mililitros de agua y 1 boniato, tapado, 15 minutos, hasta que el boniato se pincha sin resistencia"],
  ["2026-10-07-1400-tupper.txt", "1. Calienta en el #micro de la oficina @tupper de albóndigas con salsa{1}(descongelado desde anoche), tapado, a potencia media, ~{4 min}, remueve a la mitad → humea por dentro",
    "Calienta en el micro de la oficina 1 tupper de albóndigas con salsa, tapado, a potencia media, 4 minutos, remueve a la mitad, hasta que humea por dentro"],
  ["2026-10-05-2130-overnight.txt", "2. Echa en cada tarro 60 ml: @leche semi{120 ml} en total, y remueve, ~{1 min} → sin grumos",
    "Echa en cada tarro 60 mililitros: 120 mililitros de leche semi en total, y remueve, 1 minuto, hasta que sin grumos"],
  ["2026-10-05-2130-overnight.txt", "1. Echa en cada #tarro 1 scoop: @proteína{2 scoops}(60 g) en total, de cookies o de cacahuete, ~{20 s}",
    "Echa en cada tarro 1 scoop: 2 scoops de proteína, 60 gramos, en total, de cookies o de cacahuete, 20 segundos"],
  ["2026-10-07-1730-batido.txt", "3. Echa @hielo{2} y bate, ~{10 s} → el hielo picado del todo",
    "Echa 2 hielos y bate, 10 segundos, hasta que el hielo picado del todo"],
  ["2026-10-05-1730-merienda.txt", "1. Echa @yogur griego{1}(125 g) en un #cuenco, ~{20 s}",
    "Echa 1 yogur griego, 125 gramos, en un cuenco, 20 segundos"],
];
test("las frases son de verdad de docs/recetas", () => {
  const dir = new URL("../docs/recetas/", import.meta.url);
  const todo = Object.fromEntries(readdirSync(dir).map((f) => [f, readFileSync(new URL(f, dir), "utf8")]));
  assert.ok(REALES.length >= 20);
  REALES.forEach(([f, l]) => assert.ok(todo[f] && todo[f].includes(l), f + ": " + l));
});
test("paraVoz: frases reales de las recetas de la semana", () => {
  REALES.forEach(([, l, dice]) => assert.equal(paraVoz(l), dice, l));
});

/* ------------------------------ por partes ------------------------------ */
const CASOS = [
  // singular y plural
  ["2 cdas", "2 cucharadas"], ["1 cda", "1 cucharada"], ["2 cucharada", "2 cucharadas"], ["1 cdta", "1 cucharadita"],
  ["3 cdtas", "3 cucharaditas"], ["1 min", "1 minuto"], ["1 minutos", "1 minuto"], ["5 min", "5 minutos"], ["1 s", "1 segundo"],
  ["30 s", "30 segundos"], ["1 g", "1 gramo"], ["2 kg", "2 kilos"], ["1 kg", "1 kilo"], ["250 ml", "250 mililitros"],
  ["1 l", "1 litro"], ["2 l", "2 litros"], ["1 cm", "1 centímetro"], ["2 cm", "2 centímetros"], ["1 loncha", "1 loncha"],
  ["3 lonchas", "3 lonchas"], ["1 rebanada", "1 rebanada"], ["2 rebanadas", "2 rebanadas"], ["1 puñado", "1 puñado"],
  ["2 puñados", "2 puñados"], ["1 pizca", "1 pizca"], ["3-4 lonchas", "3 a 4 lonchas"],
  // fracciones y números
  ["½ pimiento rojo", "medio pimiento rojo"], ["½ cebolla", "media cebolla"], ["½ cda de miel", "media cucharada de miel"],
  ["¼ cebolla", "un cuarto de cebolla"], ["¼ cdta de comino", "un cuarto de cucharadita de comino"], ["1,5", "uno y medio"],
  ["1,5 kg de patata", "uno y medio kilos de patata"], ["~400 g", "unos 400 gramos"], ["~2 cdas", "unas 2 cucharadas"],
  ["Hornea a 190 °C", "Hornea a 190 grados"], ["~{20 s}", "20 segundos"],
  // lo que sobra
  ["(de casa: congelado)", ""], ["½ aguacate (de casa: congelado)", "medio aguacate"], ["Saca el pollo (del congelador, desde anoche)", "Saca el pollo"],
  ["Echa 1 cda de AOVE · 2 min → humea", "Echa 1 cucharada de aceite, 2 minutos, hasta que humea"],
  ["Sirve «el plato» y listo", "Sirve el plato y listo"], ["Dora → hasta que esté dorado", "Dora, hasta que esté dorado"],
  // mayúsculas y nombres
  ["Guárdalo en la NEVERA, no en el CONGELADOR", "Guárdalo en la nevera, no en el congelador"],
  ["Programa AIR FRY a 190 °C", "Programa air fray a 190 grados"], ["Pon la Ninja en Air Fry y luego Recrisp", "Pon la Ninja en air fray y luego ricrisp"],
  ["Echa 10 g de MIX de semillas", "Echa 10 gramos de mix de semillas"], ["Pon la TV", "Pon la TV"],
];
test("paraVoz: unidades, fracciones, notas, mayúsculas", () => {
  CASOS.forEach(([e, s]) => assert.equal(paraVoz(e), s, e));
});
test("paraVoz: lo que ya está dicho no cambia (se puede pasar dos veces)", () => {
  REALES.forEach(([, , dice]) => assert.equal(paraVoz(dice), dice, dice));
  assert.equal(paraVoz(""), ""); assert.equal(paraVoz(null), "");
});
test("cocina-modo y cocina: di() pasa por paraVoz y ya no queda limpiaVoz", () => {
  ["cocina-modo.js", "cocina.js"].forEach((f) => {
    const s = readFileSync(new URL("../" + f, import.meta.url), "utf8");
    assert.match(s, /function di\(t\) \{\n(?:\/\/.*\n)?\s*if \(window\.Voz && Voz\.paraVoz\) t = Voz\.paraVoz\(t\);/, f);
    assert.doesNotMatch(s, /limpiaVoz/, f);
  });
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.indexOf('src="voz.js"') >= 0 && html.indexOf('src="voz.js"') < html.indexOf('src="cocina-modo.js"'));
});
