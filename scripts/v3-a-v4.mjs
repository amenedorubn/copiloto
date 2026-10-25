#!/usr/bin/env node
// Pasa recetas del formato v3 (@boniato{300 g}, ~{4 min}, #olla) al v4 legible (v2.72). Ver docs/RECETAS-CALENDARIO.md.
//
//   node scripts/v3-a-v4.mjs receta.txt …              la receta v4 por la salida (título, línea en blanco, descripción)
//   node scripts/v3-a-v4.mjs --escribe receta.txt …    la deja en receta.txt (encima de la v3)
//   node scripts/v3-a-v4.mjs --json eventos.json       lista de {id, summary, description} -> la misma lista en v4
//   --detalle                                          con todas las diferencias (si no, una línea por receta)
//
// Cada receta se comprueba al pasarla: Copiloto tiene que sacar de la v4 lo mismo que de la v3 (ingredientes,
// cantidades, tiempos, pasos, carriles y nutrición, con 1, 2, 3 y 4 raciones). Si algo no cuadra, lo dice por
// stderr y sale con código 1; la v4 sale igual, para que se vea dónde.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Receta = require("../receta.js");
const Nutricion = require("../nutricion.js");

const ev = (titulo, texto) => ({ uid: "v4", fuente: "comida", titulo, texto });
const ings = (R) => R.ingredientes.map((g) => ({ base: g.base, clave: g.clave, c: g.c, equiv: g.equiv, prep: g.prep, basico: g.basico,
  deCasa: g.deCasa, hecho: g.hecho, acaba: g.acaba, opcional: g.opcional }));
// por paso: lo que dura, sus avisos, carril, fuego, señal, plan y lo que usa (las referencias, aparte: la v4 enlaza
// también «el boniato» sin cantidad, así que puede tener más; ninguna de la v3 puede faltar)
const pasos = (R) => R.pasos.map((p) => ({ auto: p.auto, tipo: p.tipo, dur: p.duracion_s, hasta: p.hasta_s, avisos: (p.avisos || []).map((a) => [a.a_los_s, a.texto]),
  carril: p.carril, n: p.nCarril, fuego: p.fuegoTxt, pista: p.pista, espera: p.espera, dur_s: p.dur_s, manos: p.manos_s, aguanta: p.aguanta_s,
  rec: p.rec, aparato: p.aparato, tras: p.tras, deps: p.deps,
  // «Antes de empezar»: lo mismo, aunque cambie de apartado (la v4 sabe más cortes: «1 tomate · en gajos»)
  // (por alimento: «½ pimiento rojo crudo» es «½ pimiento rojo»)
  checklist: (p.checklist || []).map((t) => { const g = Receta.ingrediente(String(t).split(" · ")[0]); return g.clave + "|" + Receta.cantTxt(g.c); }).sort(),
  ings: (p.ingPaso || []).filter((x) => !x.ref).map((x) => [x.i, x.c, x.txt, x.fijo, x.equiv, x.prep || null]) }));
const refs = (R) => R.pasos.map((p) => [...new Set((p.ingPaso || []).filter((x) => x.ref).map((x) => x.i))]);
function diff(a, b, ruta, out) {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  if (a && b && typeof a === "object" && typeof b === "object") { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], ruta + "." + k, out); return; }
  out.push(`${ruta}: v3 ${JSON.stringify(a)} · v4 ${JSON.stringify(b)}`);
}
// -> [diferencias] (vacía si Copiloto lee lo mismo en las dos)
export function compara(titulo, v3, v4) {
  const out = [];
  for (const rac of [null, 1, 2, 3, 4]) {
    const op = rac ? { raciones: rac } : {}, A = Receta.leer(ev(titulo, v3), op), B = Receta.leer(ev(titulo, v4), op), d = [];
    if (!rac && A.formato !== 3) d.push("la original no es v3");
    if (!rac && B.formato !== 4) d.push("la nueva no se lee como v4");
    diff([A.tipo, A.raciones, A.minutos, A.porRacion && A.porRacion.kcal, A.porRacion && A.porRacion.prot], [B.tipo, B.raciones, B.minutos, B.porRacion && B.porRacion.kcal, B.porRacion && B.porRacion.prot], "receta", d);
    // v2.73.1: un corte que la v3 dejaba como texto («@tomate{1} en gajos») y la v4 reconoce es una mejora, no una diferencia
    const iA = ings(A), iB = ings(B);
    iA.forEach((g, k) => { if (g.prep == null && iB[k]) iB[k].prep = null; });
    diff(iA, iB, "ingredientes", d);
    diff(A.sumas.map(({ refs, ...x }) => x), B.sumas.map(({ refs, ...x }) => x), "sumas", d);
    const pA = pasos(A), pB = pasos(B);
    pA.forEach((p, k) => (p.ings || []).forEach((x, j) => { const y = pB[k] && pB[k].ings[j]; if (y && x[5] == null) y[5] = null; }));
    diff(pA, pB, "pasos", d);
    const rA = refs(A), rB = refs(B);
    rA.forEach((r, k) => { if (rB[k] && r.some((i) => !rB[k].includes(i))) d.push(`pasos.${k}: la v3 enlaza ${r.map((i) => A.ingredientes[i].base)} y la v4 no`); });
    diff((A.carriles || []).map((c) => [c.id, c.nombre, c.rec]), (B.carriles || []).map((c) => [c.id, c.nombre, c.rec]), "carriles", d);
    diff(A.lint.errores.map((e) => e.cod), B.lint.errores.map((e) => e.cod), "linter", d);
    const nA = Nutricion.deComida(A).n, nB = Nutricion.deComida(B).n;
    diff([Math.round(nA.kcal), Math.round(nA.prot)], [Math.round(nB.kcal), Math.round(nB.prot)], "nutricion", d);
    d.forEach((x) => out.push((rac ? `con ${rac} ${rac === 1 ? "ración" : "raciones"}: ` : "") + x));
    if (d.length) break;
  }
  return out;
}
/* La primera diferencia, en una línea: «ingrediente 3: v3 «mix de 4» (1 ud), v4 «queso cottage» (100 g)» */
export function resumen(titulo, v3, v4, difs) {
  if (!difs.length) return "";
  const A = Receta.leer(ev(titulo, v3)), B = Receta.leer(ev(titulo, v4));
  const ci = (g) => g ? "«" + g.base + "»" + (g.c ? " (" + Receta.cantTxt(g.c) + ")" : "") + (g.deCasa ? " de casa" : "") : "nada";
  const m = difs[0].match(/^(?:con \d+ raci\S+: )?(\w+)\.(\d+)(?:\.(\w+))?/), mas = difs.length > 1 ? ` (+${difs.length - 1} más)` : "";
  if (m && m[1] === "ingredientes") return `ingrediente ${+m[2] + 1}: v3 ${ci(A.ingredientes[+m[2]])}, v4 ${ci(B.ingredientes[+m[2]])}` + (m[3] && !/^(base|clave|c)$/.test(m[3]) ? ` (${m[3]})` : "") + mas;
  if (m && m[1] === "sumas") return `«${(A.ingredientes[+m[2]] || {}).base}» suma distinto (${difs[0].replace(/^.*?: /, "")})` + mas;
  if (m && m[1] === "pasos") { const P = A.pasos[+m[2]] || {}; return `paso «${String(P.titulo || "").slice(0, 40)}»: ${m[3] || ""} ${difs[0].replace(/^.*?: /, "").slice(0, 90)}` + mas; }
  return difs[0].slice(0, 140) + mas;
}
// -> {texto: la v4, avisos: [lo que el conversor no puede decir igual], difs: [lo que Copiloto leería distinto]}
export function convierte(titulo, v3) {
  const C = Receta.aV4(v3);
  const difs = Receta.esV3(v3) ? compara(titulo, v3, C.texto) : ["no es una receta v3 (no tiene «@…{}» ni «~{}»)"];
  return { texto: C.texto, avisos: C.avisos, difs: difs, porque: difs.length && Receta.esV3(v3) ? resumen(titulo, v3, C.texto, difs) : difs[0] || "" };
}

function main(argv) {
  let escribe = false, mal = 0, verbose = false, total = 0;
  const salida = [];
  const cuenta = (nombre, r) => {
    // una línea por receta: si cuadra, si no (y la primera razón) y los avisos del conversor juntos
    if (r.difs.length) { mal++; console.error(`✗ ${nombre}: ${r.porque}`); }
    else console.error(`✓ ${nombre}`);
    if (r.avisos.length) console.error(`  aviso ${nombre}: ${r.avisos[0]}` + (r.avisos.length > 1 ? ` (+${r.avisos.length - 1} más)` : ""));
    if (verbose) r.difs.forEach((a) => console.error(`   · ${a}`));
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--escribe") { escribe = true; continue; }
    if (argv[i] === "--detalle") { verbose = true; continue; }
    if (argv[i] === "--json") {
      const J = JSON.parse(readFileSync(argv[++i], "utf8")), L = Array.isArray(J) ? J : J.events || [];
      const out = L.map((x) => {
        const tit = x.summary || x.titulo || "", r = convierte(tit, x.description || x.texto || "");
        cuenta(tit, r); total++;
        return { ...x, description: r.texto };
      });
      salida.push(JSON.stringify(out, null, 2) + "\n");
      continue;
    }
    const txt = readFileSync(argv[i], "utf8").replace(/\r/g, ""), L = txt.split("\n"), tit = L[0];
    const r = convierte(tit.trim(), L.slice(1).join("\n").replace(/^\n+/, ""));
    cuenta(argv[i], r); total++;
    const nuevo = tit + "\n\n" + r.texto.replace(/\n*$/, "\n");
    if (escribe) { if (!r.difs.length) writeFileSync(argv[i], nuevo); else console.error(`${argv[i]}: no la escribo (no cuadra)`); }
    else salida.push(nuevo);
  }
  if (!argv.filter((a) => !a.startsWith("--")).length) { console.error("Uso: node scripts/v3-a-v4.mjs [--escribe] receta.txt … | --json eventos.json"); return 2; }
  if (salida.length) process.stdout.write(salida.join("\n"));
  if (total > 1) console.error(`${total - mal} de ${total} cuadran.`);
  return mal ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));
