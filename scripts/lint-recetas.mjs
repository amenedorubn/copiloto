#!/usr/bin/env node
// Linter de recetas del calendario «Comidas» (v2.58). Ver docs/RECETAS-CALENDARIO.md.
//
//   node scripts/lint-recetas.mjs docs/recetas/*.txt
//   node scripts/lint-recetas.mjs --json eventos.json       (lista de {titulo, texto} o {summary, description})
//
// Cada .txt: la primera línea es el título del evento, luego una línea en blanco y la descripción.
// Para cada receta:
//   - pasa el linter de receta.js (el mismo que corre la app al leer el evento);
//   - si se puede escalar (formato v3), lo vuelve a pasar con 1, 2, 3 y 4 raciones;
//   - calcula kcal y proteína por ración con la tabla de la app (USDA / tus alimentos no: aquí solo USDA)
//     y avisa si «POR RACIÓN» dice otra cosa (más de un 10 % de diferencia).
// Sale con código 1 si alguna receta tiene errores.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Receta = require("../receta.js");
const Nutricion = require("../nutricion.js");

export function eventoDeTxt(txt) {
  const L = String(txt).replace(/\r/g, "").split("\n");
  return { uid: "lint", fuente: "comida", titulo: L[0].trim(), texto: L.slice(1).join("\n").replace(/^\n+/, "") };
}

// -> {R, errores: [txt], avisos: [txt], nutri: {kcal, prot, sinDatos} | null}
export function revisa(ev) {
  const R = Receta.leer(ev), out = { R, errores: [], avisos: [], nutri: null };
  if (R.tipo !== "comida") return out;
  const L = R.lint;
  L.errores.forEach((e) => out.errores.push(e.texto));
  L.avisos.forEach((e) => out.avisos.push(e.texto));
  // escalar: el linter tiene que volver a pasar
  if (R.v3 && R.raciones0) {
    [1, 2, 3, 4].filter((n) => n !== R.raciones0).forEach((n) => {
      const E = Receta.escala(R, n);
      if (!E) { out.errores.push(`No se puede escalar a ${n} ${n === 1 ? "ración" : "raciones"}.`); return; }
      E.lint.errores.forEach((e) => { const t = `Con ${n} ${n === 1 ? "ración" : "raciones"}: ${e.texto}`; if (!out.errores.includes(t)) out.errores.push(t); });
    });
  }
  const N = Nutricion.deComida(R);
  // lo que falta y pesa (no la sal, las especias en cucharaditas, el agua o el hielo): sin eso no se puede comprobar
  const importa = R.ingredientes.filter((g) => N.sinDatos.includes(g.txt) && !g.basico && !/^(agua|hielo)\b/.test(g.base) &&
    !(g.c && /^(cda|cdta|pizca)$/.test(g.c.ud)));
  out.nutri = { kcal: Math.round(N.n.kcal), prot: Math.round(N.n.prot), sinDatos: N.sinDatos, raciones: N.raciones, falta: importa.map((g) => g.base) };
  const pr = R.porRacion;
  if (!importa.length) {
    if (pr && pr.kcal != null && N.n.kcal > 0 && Math.abs(pr.kcal - N.n.kcal) > N.n.kcal * 0.1)
      out.errores.push(`POR RACIÓN dice ${pr.kcal} kcal y con la tabla salen ~${Math.round(N.n.kcal)} kcal.`);
    if (pr && pr.prot != null && N.n.prot > 0 && Math.abs(pr.prot - N.n.prot) > Math.max(2, N.n.prot * 0.1))
      out.errores.push(`POR RACIÓN dice ${pr.prot} g de proteína y con la tabla salen ~${Math.round(N.n.prot)} g.`);
  } else out.avisos.push("POR RACIÓN no se puede comprobar con la tabla: le faltan datos de " + importa.map((g) => g.base).join(", ") + ".");
  if (N.sinDatos.length) out.avisos.push("Sin datos de nutrición (no suman): " + N.sinDatos.join(" · ") + ".");
  return out;
}

function main(argv) {
  const evs = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--json") {
      const J = JSON.parse(readFileSync(argv[++i], "utf8"));
      (Array.isArray(J) ? J : J.events || []).forEach((x) => evs.push({ nombre: x.summary || x.titulo, ev: { uid: x.id || "lint", fuente: "comida", titulo: x.summary || x.titulo || "", texto: x.description || x.texto || "" } }));
    } else evs.push({ nombre: argv[i], ev: eventoDeTxt(readFileSync(argv[i], "utf8")) });
  }
  if (!evs.length) { console.error("Uso: node scripts/lint-recetas.mjs receta.txt … | --json eventos.json"); return 2; }
  let mal = 0;
  evs.forEach(({ nombre, ev }) => {
    const r = revisa(ev);
    if (r.R.tipo !== "comida") { console.log(`· ${nombre}: ${r.R.tipo}, sin receta (no se revisa)`); return; }
    const n = r.nutri ? ` · tabla: ~${r.nutri.kcal} kcal, ~${r.nutri.prot} g proteína por ración` : "";
    console.log(`${r.errores.length ? "✗" : "✓"} ${nombre}${n}`);
    r.errores.forEach((t) => console.log("   ERROR  " + t));
    r.avisos.forEach((t) => console.log("   aviso  " + t));
    if (r.errores.length) mal++;
  });
  console.log(mal ? `\n${mal} receta(s) con errores.` : "\nTodas pasan.");
  return mal ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));
