# Estado de Nutrición (para retomar)

Sin datos personales. Plan elegido (docs/propuestas-nutricion/): subpestañas Hoy · Semana · Tendencias · Fases ·
Entreno · Micros, con N1-C + todos los nutrientes, N2-A + lo de la D, N3-B + D, N4-D + tira de A, N5-A, N7-B que se da la
vuelta a la A y N6-A con la gráfica de la D (en Casa/Comprar). Los suplementos, aparte («Supl.»).

Orden: subpestañas → N1 → N2 → N3 → N4 → N5 → N7 → N6. Cada pantalla sube a main por separado.

| Paso | Estado | Versión |
|---|---|---|
| Subpestañas + gráficas (nutri-graficas.js) + datos por día/semana (nutricion.js) | hecho | 2.49.0 |
| N1 · Hoy | hecho: energía en grande + macros, y todos los nutrientes en tiras (con lo de suplementos) | 2.50.0 |
| N2 · Semana | hecho: energía por día apilada + adherencia; carbohidratos por día con banda y medias del resto (Supl. aparte); semana anterior/siguiente | 2.51.0 |
| N3 · Tendencias | hecho: curva de 8 semanas con selector y banda por semana + peso medio contra lo esperado (peso desde «Semana»; Medidas y Peso irá aparte) | 2.52.0 |
| N4 · Fases | hecho: la fase de ahora con fechas y cómo va hoy (g/kg, % del mantenimiento); «Luego» con la tira de 6 meses; tocar una fase enseña sus proporciones | 2.53.0 |
| N5 · Entreno | pendiente | |
| N7 · Micros | pendiente | |
| N6 · Huecos (Casa/Comprar) | pendiente | |

Siguiente paso: N5 (Entreno).

Cómo comprobar: `node --test tests/*.test.mjs` y `node scripts/capturas-nutricion.mjs <carpeta> [Subpestaña]`, con
`python -m http.server 8777` corriendo. Hace capturas de la Cocina de prueba en oscuro y en claro y falla si hay
errores de página o si deja rastro. Las vistas que aún no existen dicen «Esta vista llega en la siguiente versión».
