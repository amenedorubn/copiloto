// Prototipo del planificador de carriles (fase 1, no es código de la app).
// Tarea: {id, carril, txt, dur (s), manos (s de manos al empezar; = dur si es todo manos),
//         equipo ("fuego"|"micro"|"airfryer"|"horno"|null), tras:[ids], aguanta (s que el resultado
//         puede esperar a la siguiente; Infinity = se mantiene, p. ej. agua hirviendo o salsa a fuego mínimo)}
// 1) hacia delante: lo antes posible, con las manos de una en una y los límites del equipo;
// 2) hacia atrás: lo que no aguanta (la pasta) se retrasa hasta acabar justo cuando lo necesita la unión.
export const LIMITES = { fuego: 2, micro: 1, airfryer: 1, horno: 1 };

function choca(ocup, a, b) { return ocup.some(([x, y]) => a < y && x < b); }

export function planifica(tareas, limites = LIMITES) {
  const T = Object.fromEntries(tareas.map((t) => [t.id, { ...t, aguanta: t.aguanta ?? Infinity }]));
  const orden = [], visto = new Set();
  const visita = (id) => { if (visto.has(id)) return; visto.add(id); (T[id].tras || []).forEach(visita); orden.push(id); };
  tareas.forEach((t) => visita(t.id));
  // camino que queda (para dar prioridad a lo largo: el agua antes que picar)
  const sig = {}; tareas.forEach((t) => (t.tras || []).forEach((p) => (sig[p] = sig[p] || []).push(t.id)));
  const resto = {};
  [...orden].reverse().forEach((id) => { resto[id] = T[id].dur + Math.max(0, ...(sig[id] || []).map((s) => resto[s])); });
  let manos = [], equipo = {};
  const cabe = (t, ini) => !choca(manos, ini, ini + t.manos) &&
    (!t.equipo || (equipo[t.equipo] || []).filter(([x, y]) => ini < y && x < ini + t.dur).length < (limites[t.equipo] ?? 1));
  const pon = (t, ini) => { t.ini = ini; t.fin = ini + t.dur; if (t.manos) manos.push([ini, ini + t.manos]); if (t.equipo) (equipo[t.equipo] = equipo[t.equipo] || []).push([ini, t.fin]); };
  // 1) hacia delante, por prioridad de camino largo
  const hecho = new Set();
  while (hecho.size < tareas.length) {
    const listas = orden.filter((id) => !hecho.has(id) && (T[id].tras || []).every((p) => hecho.has(p)))
      .sort((a, b) => resto[b] - resto[a] || T[a].manos - T[b].manos);
    const t = T[listas[0]];
    let ini = Math.max(0, ...(t.tras || []).map((p) => T[p].fin));
    while (!cabe(t, ini)) ini += 15;
    pon(t, ini); hecho.add(t.id);
  }
  // 2) hacia atrás: lo que no aguanta se pega a quien lo usa
  for (const id of [...orden].reverse()) {
    const t = T[id];
    if (t.aguanta === Infinity || !sig[id]) continue;
    const limite = Math.min(...sig[id].map((s) => T[s].ini));
    if (limite - t.fin <= t.aguanta) continue;
    manos = manos.filter(([x]) => x !== t.ini || !t.manos); // suelta su hueco de manos
    if (t.equipo) equipo[t.equipo] = equipo[t.equipo].filter(([x]) => x !== t.ini);
    let ini = limite - t.dur;
    while (ini > t.ini && !cabe(t, ini)) ini -= 15;
    // lo que va antes en su carril y tampoco aguanta, también se mueve (cadena)
    pon(t, ini);
  }
  const fin = Math.max(...Object.values(T).map((t) => t.fin));
  return { tareas: orden.map((id) => T[id]), fin };
}

export const mmss = (s) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");

// --- caso 1: pasta con tomate y atún ---
export const PASTA = [
  { id: "a1", carril: "agua", txt: "Olla con agua y sal al fuego", dur: 8 * 60 + 30, manos: 30, equipo: "fuego" },
  { id: "a2", carril: "agua", txt: "Pasta al agua", dur: 9 * 60, manos: 15, equipo: "fuego", tras: ["a1"], aguanta: 30 },
  { id: "a3", carril: "agua", txt: "Escurre la pasta", dur: 60, manos: 60, tras: ["a2"], aguanta: 60 },
  { id: "s1", carril: "salsa", txt: "Pica cebolla y ajo", dur: 3 * 60, manos: 3 * 60 },
  { id: "s2", carril: "salsa", txt: "Sofríe cebolla y ajo", dur: 6 * 60, manos: 15, equipo: "fuego", tras: ["s1"] },
  { id: "s3", carril: "salsa", txt: "Tomate", dur: 8 * 60, manos: 15, equipo: "fuego", tras: ["s2"] },
  { id: "s4", carril: "salsa", txt: "Atún", dur: 60, manos: 15, equipo: "fuego", tras: ["s3"] },
  { id: "u", carril: "union", txt: "Mezcla y sirve", dur: 60, manos: 60, tras: ["a3", "s4"] },
];

if (process.argv[1] && process.argv[1].endsWith("planifica.mjs")) {
  const r = planifica(PASTA);
  for (const t of r.tareas.sort((a, b) => a.ini - b.ini)) console.log(mmss(t.ini).padStart(5), "→", mmss(t.fin).padStart(5), t.carril.padEnd(6), t.txt);
  console.log("acaba en", mmss(r.fin));
}

// --- caso 2: albóndigas con rigatoni (cocina/recetas/albondigas-rigatoni.json) ---
export const ALBONDIGAS = [
  { id: "a1", carril: "pasta", txt: "Pota con agua y sal, tapada", dur: 10 * 60, manos: 30, equipo: "fuego" },
  { id: "m1", carril: "albondigas", txt: "Mezcla y haz 21 bolas", dur: 8 * 60, manos: 8 * 60 },
  { id: "f1", carril: "albondigas", txt: "Tanda 1 (11) al Ninja, 200 °C", dur: 10 * 60, manos: 30, equipo: "airfryer", tras: ["m1"] },
  { id: "f2", carril: "albondigas", txt: "Tanda 2 (10) al Ninja", dur: 10 * 60, manos: 30, equipo: "airfryer", tras: ["f1"] },
  { id: "s1", carril: "salsa", txt: "Sartén: AOVE, cebolla y ajo", dur: 3 * 60, manos: 30, equipo: "fuego" },
  { id: "s2", carril: "salsa", txt: "Tomate, orégano y pimentón", dur: 15 * 60, manos: 30, equipo: "fuego", tras: ["s1"] },
  { id: "j1", carril: "salsa", txt: "Albóndigas a la salsa", dur: 12 * 60, manos: 30, equipo: "fuego", tras: ["f2", "s2"] },
  { id: "p1", carril: "pasta", txt: "Rigatoni a la pota", dur: 12 * 60, manos: 15, equipo: "fuego", tras: ["a1"], aguanta: 30 },
  { id: "p2", carril: "pasta", txt: "Escurre", dur: 60, manos: 60, tras: ["p1"], aguanta: 60 },
  { id: "r1", carril: "micro", txt: "Arroz al micro", dur: 3 * 60, manos: 15, equipo: "micro", aguanta: 120 },
  { id: "u", carril: "union", txt: "Reparto: plato y 2 tuppers", dur: 3 * 60, manos: 3 * 60, tras: ["j1", "p2", "r1"] },
];
if (process.argv[2] === "albondigas") {
  const r = planifica(ALBONDIGAS);
  for (const t of r.tareas.sort((a, b) => a.ini - b.ini)) console.log(mmss(t.ini).padStart(5), "→", mmss(t.fin).padStart(5), t.carril.padEnd(10), t.txt);
  console.log("acaba en", mmss(r.fin));
}
