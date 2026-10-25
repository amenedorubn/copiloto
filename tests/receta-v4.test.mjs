// v2.72 · formato v4 de las recetas (la receta legible), su linter, el escalado y el paso v3 -> v4
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Receta = require("../receta.js");
const { revisa, eventoDeTxt } = await import("../scripts/lint-recetas.mjs");
const { compara, convierte } = await import("../scripts/v3-a-v4.mjs");

const ev = (texto, titulo = "Prueba") => ({ uid: "t", fuente: "comida", titulo, texto });
const BASE = "2 RACIONES · 20 min\nPOR RACIÓN · 500 kcal · 40 g proteína\n\n";
const tk = (c) => c.toks.map((t) => [t.nombre, t.c ? t.c.n : null, t.c ? t.c.ud : t.txt, t.ref]);

/* ------------------------------ un paso ------------------------------ */
test("cook4: cantidad en lenguaje natural, recipiente, fuego, tiempo tras « · » y señal", () => {
  const c = Receta.cook4("2. Echa 300 g de boniato y 400 g de tomate triturado a la olla, tapado, a fuego medio-bajo · 15 min → el boniato se pincha sin resistencia");
  assert.deepEqual(tk(c), [["boniato", 300, "g", false], ["tomate triturado", 400, "g", false]]);
  assert.equal(c.t, "2. Echa 300 g de boniato y 400 g de tomate triturado a la olla, tapado, a fuego medio-bajo, 15 min");
  assert.equal(c.relojes[0].s, 900);
  assert.deepEqual(c.recs, ["olla"]);
  assert.equal(c.senal, "el boniato se pincha sin resistencia");
  assert.deepEqual(c.raros, []);
});
test("cook4: unidades, fracciones, cucharadas, pizcas fijas, al gusto y unas gotas", () => {
  const c = Receta.cook4("1. Echa 2 huevos, ½ pimiento rojo, 1 cda de AOVE, 1 pizca de sal, pimienta al gusto y unas gotas de limón · 20 s");
  assert.deepEqual(tk(c), [["huevo", 2, "ud", false], ["pimiento rojo", 0.5, "ud", false], ["AOVE", 1, "cda", false],
    ["sal", 1, "pizca", false], ["pimienta", null, "al gusto", false], ["limón", null, "unas gotas", false]]);
  assert.equal(c.toks[3].fijo, true);
  assert.equal(c.toks[0].fijo, false);
});
test("cook4: lo que pesa, el corte, «unos» y «(de casa: …)»", () => {
  const c = Receta.cook4("1. Pela 1 bote de garbanzos cocidos (unos 400 g), 150 g de pimiento tricolor en tiras finas y ½ aguacate (de casa: la otra mitad) · 2 min");
  assert.deepEqual(c.toks[0].equiv, { n: 400, ud: "g", aprox: true });
  assert.equal(c.toks[1].prep, "en tiras finas");
  assert.equal(c.toks[2].prep, "de casa: la otra mitad");
  assert.ok(Receta.ingrediente("aguacate, " + c.toks[2].prep).deCasa);
});
test("cook4: lo que ya salió enlaza («el boniato», «250 g de pollo» otra vez); «otra pizca» suma", () => {
  const ctx = { vistos: [] };
  Receta.cook4("1. Corta 500 g de solomillos de pollo en dados y 1 boniato · 3 min", 1, ctx);
  const c = Receta.cook4("2. Echa 250 g de pollo, el boniato y 1 pizca de sal · 5 min", 1, ctx);
  assert.deepEqual(tk(c), [["pollo", 250, "g", true], ["boniato", null, "", true], ["sal", 1, "pizca", false]]);
  const d = Receta.cook4("3. Echa las lentejas, 1 pizca de sal y otra pizca de sal · 1 min", 1, ctx);
  assert.deepEqual(tk(d), [["sal", 1, "pizca", true], ["sal", 1, "pizca", false]]);
});
test("cook4: un nombre que no está en el diccionario se dice, no se adivina", () => {
  const c = Receta.cook4("1. Echa 3 g de flurbo y 2 zorrocotones · 1 min");
  assert.deepEqual(c.toks, []);
  assert.deepEqual(c.raros.map((x) => x.split(" (")[0]), ["no sé qué ingrediente es “flurbo”", "no sé qué ingrediente es “zorrocotones”"]);
  // los números que no son comida no se quejan: centímetros, vueltas, minutos, «en una sola capa»
  assert.deepEqual(Receta.cook4("1. Corta 1 boniato en cubos de 1,5 cm, da 2 vueltas en una sola capa · 3 min, vuelta a los 2").raros, []);
});
test("cook4: lo de «cada …:» es lo de cada uno y no suma; tus alimentos entran en el diccionario", () => {
  const c = Receta.cook4("1. Echa en cada tarro 1 yogur: 2 yogures griegos (250 g) en total · 30 s");
  assert.deepEqual(tk(c), [["yogur griego", 2, "ud", false]]);
  assert.ok(Receta.cook4("1. Echa 20 g de kombu seco · 1 min").raros.length);
  try {
    Receta.nombres(["Kombu seco", "Alga wakame"]);
    assert.deepEqual(tk(Receta.cook4("1. Echa 20 g de kombu seco · 1 min")), [["kombu seco", 20, "g", false]]);
  } finally { Receta.nombres([]); }
});
test("cook4: «@», «#» o llaves en una v4 se avisan; los paréntesis sueltos también", () => {
  const c = Receta.cook4("1. Calienta 1 cda de AOVE en la #sartén (con cuidado) · 2 min (manos)");
  assert.ok(c.raros.some((x) => /«#sartén»/.test(x)));
  assert.deepEqual(c.sueltos, ["(con cuidado)"]);
});

/* ------------------------------ la receta ------------------------------ */
const V4 = BASE + `PREPARAR
1. Pela 1 boniato (unos 300 g) y córtalo en cubos de 1,5 cm · 4 min (manos) → cubos iguales

CARRIL LENTEJAS (olla)
1. Calienta 1 cda de AOVE en la olla a fuego medio · 1 min → el aceite se mueve suelto
2. Echa 300 g de boniato y 400 g de tomate triturado a la olla, tapado, a fuego medio-bajo · 15 min → el boniato se pincha sin resistencia
3. Echa 1 bote de lentejas cocidas, 1 pizca de sal y 1 pizca de pimienta · 5 min → la salsa espesa

AL JUNTAR
1. Sirve las lentejas en un plato · 1 min (manos)

NOTAS
· Con 2 huevos al lado queda un plato completo.`;
test("leer: detecta la v4 sola, la v3 y el formato viejo siguen igual", () => {
  const R = Receta.leer(ev(V4));
  assert.equal(R.formato, 4); assert.equal(R.v3, true);
  assert.equal(Receta.leer(ev(BASE + "PROCESO\n1. Echa @pollo{250 g}, ~{5 min}")).formato, 3);
  const viejo = Receta.leer(ev("1 RACIÓN · 30 min\n\nINGREDIENTES\n· 200 g de pollo\n\nPROCESO\n1. El pollo a la sartén, 6 min."));
  assert.equal(viejo.formato, null); assert.equal(viejo.v3, false);
});
test("leer: ingredientes, sumas, referencias, tiempos, carriles y linter limpio", () => {
  const R = Receta.leer(ev(V4));
  assert.deepEqual(R.ingredientes.map((g) => [g.base, g.c && g.c.n, g.c && g.c.ud]),
    [["boniato", 1, "ud"], ["aove", 1, "cda"], ["tomate triturado", 400, "g"], ["lenteja cocida", 1, "bote"], ["sal", 1, "pizca"], ["pimienta", 1, "pizca"]]);
  // «300 g de boniato» en el carril es la tanda de ese paso: el boniato se compra una vez
  const echa = R.pasos.find((p) => /tomate triturado/.test(p.detalle));
  assert.deepEqual(echa.ingPaso.map((x) => [x.nombre, x.ref]), [["boniato", true], ["tomate triturado", false]]);
  assert.equal(echa.duracion_s, 900); assert.equal(echa.pista, "el boniato se pincha sin resistencia"); assert.equal(echa.fuegoTxt, "Fuego medio-bajo");
  assert.deepEqual(R.carriles.map((c) => [c.id, c.rec]), [["lentejas", "olla"], ["union", null], ["preparar", null]]);
  const sirve = R.pasos.find((p) => /^Sirve/.test(p.detalle));
  assert.deepEqual(sirve.ingPaso.map((x) => [x.nombre, x.ref, x.c]), [["lentejas cocidas", true, null]]);
  assert.deepEqual(R.lint.errores, []);
});
test("escala: las cantidades cambian (en el texto también), la pizca no", () => {
  const E = Receta.leer(ev(V4), { raciones: 4 });
  const echa = E.pasos.find((p) => /tomate triturado/.test(p.detalle));
  assert.match(echa.detalle, /^Echa 600 g de boniato y 800 g de tomate triturado a la olla/);
  const sal = E.pasos.find((p) => /pimienta/.test(p.detalle));
  assert.match(sal.detalle, /2 botes de lentejas cocidas, 1 pizca de sal y 1 pizca de pimienta/);
  assert.match(E.pasos.find((p) => /^Pela/.test(p.detalle)).detalle, /^Pela 2 boniatos \(unos 600 g\)/);
  assert.deepEqual(E.lint.errores, []);
});
test("linter v4: mismos códigos, con la pista escrita en v4", () => {
  const R = Receta.leer(ev(BASE + "PROCESO\n1. Echa 3 g de flurbo · 1 min\n2. Remueve bien · 1 min\n3. Echa 200 g de pollo"));
  const cods = R.lint.errores.map((e) => e.cod);
  assert.ok(cods.includes("no-se-entiende"));
  assert.ok(cods.includes("sin-ing"));
  assert.ok(R.lint.errores.some((e) => /no sé qué ingrediente es “flurbo”/.test(e.texto)));
  assert.ok(R.lint.errores.some((e) => e.cod === "sin-ing" && /«300 g de boniato»/.test(e.texto)));
  // el paso 3 no tiene « · tiempo»: sin-tiempo (la receta sigue siendo v4 por los otros pasos)
  assert.ok(cods.includes("sin-tiempo"));
});

/* ------------------------------ v3 -> v4 ------------------------------ */
test("aV4: un paso v3 pasa a lenguaje natural sin @, ~, # ni llaves", () => {
  const C = Receta.aV4("PREPARAR\n1. Pela @boniato{1}(~300 g) y córtalo, ~{4 min} (manos) → cubos iguales\n2. Echa @&boniato{1} y @huevo{2} en la #olla con @sal{=1 pizca} y @pimienta{al gusto}, ~{5 min}, vuelta a los 2 → listo\n3. Echa @sal{=1 pizca}, ~{20 s}");
  assert.deepEqual(C.texto.split("\n"), ["PREPARAR",
    "1. Pela 1 boniato (unos 300 g) y córtalo · 4 min (manos) → cubos iguales",
    "2. Echa 1 boniato y 2 huevos en la olla con 1 pizca de sal y pimienta al gusto · 5 min, vuelta a los 2 → listo",
    "3. Echa otra pizca de sal · 20 s"]);
  assert.doesNotMatch(C.texto, /[@~#{}]/);
  assert.deepEqual(C.avisos, []);
});
test("equivalencia: todas las recetas de docs/recetas, pasadas a v4, se leen igual (1 a 4 raciones)", () => {
  const dir = new URL("../docs/recetas/", import.meta.url);
  const malas = [];
  readdirSync(dir).filter((f) => f.endsWith(".txt")).forEach((f) => {
    const e = eventoDeTxt(readFileSync(new URL(f, dir), "utf8"));
    const r = convierte(e.titulo, e.texto);
    assert.doesNotMatch(r.texto, /[@#{}]|~(?!\d)/, f);
    if (r.difs.length || r.avisos.length) malas.push(f + ": " + r.difs.concat(r.avisos).join(" | "));
    // y el linter del script la pasa como la v3
    const a = revisa(e), b = revisa({ ...e, texto: r.texto });
    assert.deepEqual(b.errores, a.errores, f);
  });
  assert.deepEqual(malas, []);
});
test("compara: si la v4 dice otra cosa, se ve", () => {
  const v3 = BASE + "PROCESO\n1. Echa @pollo{250 g} en la #sartén a fuego medio, ~{5 min} → dorado\n2. Echa @&pollo{250 g}, ~{5 min} → dorado";
  const v4 = BASE + "PROCESO\n1. Echa 250 g de pollo en la sartén a fuego medio · 5 min → dorado\n2. Echa otros 250 g de pollo · 5 min → dorado";
  assert.ok(compara("Prueba", v3, v4).some((x) => /sumas|ingredientes/.test(x)));
  assert.deepEqual(compara("Prueba", v3, Receta.aV4(v3).texto), []);
});
test("docs/recetas-v4: son v4, pasan el linter y son lo que sale del conversor", () => {
  const dir = new URL("../docs/recetas-v4/", import.meta.url), dir3 = new URL("../docs/recetas/", import.meta.url);
  const fs = readdirSync(dir).filter((f) => f.endsWith(".txt"));
  assert.equal(fs.length, readdirSync(dir3).filter((f) => f.endsWith(".txt")).length);
  fs.forEach((f) => {
    const e = eventoDeTxt(readFileSync(new URL(f, dir), "utf8")), e3 = eventoDeTxt(readFileSync(new URL(f, dir3), "utf8"));
    assert.equal(Receta.leer(e).formato, 4, f);
    assert.deepEqual(revisa(e).errores, [], f);
    assert.equal(e.texto.trim(), convierte(e3.titulo, e3.texto).texto.trim(), f);
  });
});
