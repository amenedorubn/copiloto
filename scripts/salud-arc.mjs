// De huawei.db (el ETL de Documents/Projects/HUAWEI) a un fichero pequeño que
// la app importa en Ajustes del Arc › Datos de Huawei Health. Solo lo que usa
// el Arc, por día: sueño (minutos, hora de acostarse y de levantarse),
// siestas, pasos y minutos de caminata. Sin GPS ni identificadores.
//
//   node scripts/salud-arc.mjs [ruta/huawei.db] [salida.json]
//
// La noche cuenta para el día en que te levantas ("Dormir 7 h o más se marca
// al levantarse y cuenta para ese día"). El fichero NO va al repo: son datos
// de salud; se pasa al móvil y se importa allí.
import { DatabaseSync } from "node:sqlite";
import { writeFileSync } from "node:fs";

const DB = process.argv[2] || "C:/Users/amene/Documents/Projects/HUAWEI/huawei.db";
const OUT = process.argv[3] || "copiloto-salud.json";
const DESDE = "2026-08-31";                     // la noche del 31/8 es la del 1/9

const db = new DatabaseSync(DB, { readOnly: true });
// "2026-09-03T01:17:00+02:00" -> dia y hora locales tal cual los da Huawei (Europe/Madrid)
const dia = (t) => t.slice(0, 10);
const hora = (t) => t.slice(11, 16);
const dias = {};
const de = (d) => (dias[d] ||= {});

for (const s of db.prepare("select start_time, end_time, duration_min, session_type from sleep where end_time >= ? order by start_time").all(DESDE)) {
  const d = de(dia(s.end_time));
  if (s.session_type === "nap") { d.siesta = (d.siesta || 0) + Math.round(s.duration_min); continue; }
  d.sueno = (d.sueno || 0) + Math.round(s.duration_min);
  // si hubo dos tramos esa noche, la hora de acostarse es la del primero
  if (!d.acuesta) d.acuesta = hora(s.start_time);
  d.levanta = hora(s.end_time);
}
for (const p of db.prepare("select date, steps from steps_daily where date >= ?").all(DESDE)) de(p.date).pasos = p.steps;
for (const a of db.prepare("select date, duration_sec from activities where date >= ? and sport_type in ('Walking','Indoor walking','Hiking','Walking machine')").all(DESDE))
  de(a.date).caminata = (de(a.date).caminata || 0) + Math.round(a.duration_sec / 60);

const fechas = Object.keys(dias).sort();
const out = { v: 1, fuente: "Huawei Health", desde: fechas[0], hasta: fechas[fechas.length - 1], dias: Object.fromEntries(fechas.map((f) => [f, dias[f]])) };
writeFileSync(OUT, JSON.stringify(out));
const noches = fechas.filter((f) => dias[f].sueno).length;
console.log(`${OUT}: ${fechas.length} días (${out.desde} → ${out.hasta}), ${noches} noches, ${JSON.stringify(out).length} bytes`);
