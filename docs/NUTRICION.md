# Nutrición

Planificado contra objetivos, por semana. Lógica en `nutricion.js` (tests: `tests/nutricion.test.mjs`).

## De dónde salen los números

- **Alimentos:** `nutri-tabla.js`, 75 alimentos de **USDA FoodData Central (SR Legacy, CC0)** por 100 g: energía,
  macros, fibra, vitamina C, folato (DFE), hierro, magnesio, potasio, B12, vitamina D, calcio y sodio. Se rehace con
  `python scripts/usda-tabla.py <carpeta del CSV>`. Lo que pesa una unidad (`ud`: 1 plátano = 120 g) es estimación propia.
- **Tus alimentos** (escaneados): sus macros de Open Food Facts (o los tuyos) mandan; los micros siguen de USDA.
- **Lo que no se encuentra o no se puede pesar queda «sin datos»**: nunca se inventa un 0.

## Planificado y registrado

- **Planificado:** las comidas del calendario «Comidas», por ración (`2 RACIONES` → la mitad).
- **Registrado:** lo que apuntas tú y no está en el calendario: favoritos de un toque (batido de proteína, dátiles,
  yogur griego con proteína, plátano) o texto («200 g de yogur griego»).
- **Comer fuera** es una **estimación** de energía y macros (ligera ~600, normal ~900, copiosa ~1300 kcal), sin micros.
- La app nunca dice que eso es lo que has comido: el calendario no lo recoge todo.

## Objetivos por semana

Cada semana tiene una **fase**. La fase rellena los rangos en g/kg (con el peso medio de esa semana, si lo pones) y la
energía como % sobre el mantenimiento. Cada número lleva su «por qué».

| Fase | Energía | Proteína | Carbohidratos | Grasa | Fibra |
|---|---|---|---|---|---|
| Descarga | −10…−5 % | 1,6–1,8 g/kg | 5–6 g/kg | 0,8–1,0 | 25–30 g |
| Carga de hidratos | +10…+15 % | 1,2–1,6 | 7–8 | 0,5–0,8 | 10–20 g |
| Recuperación | = | 1,8–2,0 | 4–6 | 0,9–1,1 | 30–40 g |
| Mantenimiento | = | 1,6–1,8 | 4–6 | 0,9–1,1 | 30–40 g |
| Volumen | +8…+11 % (~+250–300 kcal) | 1,6–2,0 | 5–6 | 0,9–1,1 | 30–40 g |
| Definición | −15…−10 % (~−300…−400, ≤0,5 %/sem) | 2,0–2,2 | 3–5 | 0,8–1,0 | 30–40 g |

- **Carbohidratos según el día** (del calendario de entrenos): descanso −1 g/kg, gimnasio =, calidad +1, tirada larga
  o carrera +2. En carga, el día no suma.
- **Mantenimiento:** el que pongas tú. Si no, el basal que pongas (o Mifflin-St Jeor con peso, altura y edad) × 1,6, y entonces la energía sale como **«estimado»** en la tabla y en Tus datos. La grasa corporal y el basal son opcionales: sin grasa, todo va por kg de peso (el medio de la semana si lo pones), nunca por masa magra. Contrástalo con el peso
  medio semanal.
- **Micros (EFSA, hombre adulto):** vitamina C 110 mg, folato 330 µg, fibra ≥ 25 g, hierro 11 mg, magnesio 350 mg,
  potasio 3500 mg, B12 4 µg, vitamina D 15 µg (máximo 100), calcio 950 mg.
- **Fuentes:** ACSM/AND/DC 2016, consenso del IOC 2018, ISSN 2017 (proteína), Aragon 2017 (ISSN) y EFSA DRV.
- **Plan inicial** (editable en la app):
  - descarga del 12 al 18/10, con carga el 16 y el 17;
  - recuperación del 19/10 al 2/11;
  - mantenimiento en noviembre;
  - definición de diciembre a marzo.

**Tus datos** (peso, altura, edad, % grasa, mantenimiento) viven solo en el móvil (`copiloto.nutri.perfil.v1`):
nunca en el repo, en los tests ni en las capturas.

## Te falta X; cómete Y

Mira lo que falta de los prioritarios (carbohidratos, fibra, vitamina C y folato) hasta el mínimo y propone qué comer:
1. Primero, lo que ya hay en casa.
2. Luego, lo que está en la lista.
3. Si no, qué comprar.

Es algo que se **añade** (un tentempié o un acompañamiento): no cambia ninguna comida del plan.

## La pestaña (v2.45)

Cocina → **Nutrición**, la cuarta pestaña (Semana · Comprar · Casa · Nutrición):
- **El día:** Ayer, Hoy, Mañana y los 2 siguientes. Arriba, la fase de su semana y el tipo de día (del calendario de
  entrenos: descanso, gimnasio, calidad o tirada larga).
- **Tus datos:** peso, altura y edad, y si quieres el % de grasa, el basal y el mantenimiento. Solo en este móvil.
  Sin ellos no hay objetivos y la tabla solo suma: lo dice.
- **Semana:**
  - su fase (6 botones) y su «por qué»;
  - tu peso medio de esa semana;
  - energía, proteína, carbohidratos y grasa propios («150-160»);
  - «Lo de la fase» lo deshace.
- **Te falta X; cómete Y:** con lo de casa, la lista o «a la lista».
- **La tabla:** nutriente · planificado · registrado · objetivo (rango) · % del mínimo. Primero carbohidratos, fibra,
  vitamina C y folato, luego energía, proteína y grasa. «Más nutrientes» añade hierro, magnesio, potasio, B12,
  vitamina D y calcio. Tocar una fila dice su «por qué». Abajo, lo que no tiene datos y no cuenta. «s/d» es sin datos.
- **Registrar lo que no está en el calendario:** los favoritos de un toque o texto libre. Se quitan con la ×.
- **Dónde se guarda:** tus datos, tus semanas y tu registro, en el móvil (`copiloto.nutri.*`). No se suben al Worker.
- **En la Cocina de prueba,** con un perfil de EJEMPLO (70 kg, 175 cm, 30 años) y un batido registrado.

## Suplementos (v2.48)

En **Nutrición → Suplementos**, debajo del registro. También en **Casa → Suplementos**, que abre su ficha.
- **Cada suplemento es uno de tus alimentos.** Tiene la misma ficha que lo de Casa (escanear, rellenar a mano, foto de
  la etiqueta), pero su etiqueta va **por unidad**: cápsula, comprimido o cacito. Si es por 100 g, la dosis va en g o ml.
  En su ficha solo sale lo que trae; el resto de la etiqueta se resume en una línea, «sin dato».
- **Cuándo y cuánto:**
  - Cuándo: desayuno, comida, cena, antes de dormir, antes o después de entrenar, o a una hora. Se pueden elegir varios
    y cada uno es una toma.
  - Qué días: todos, solo los de entreno o solo los de descanso, según el tipo de día del calendario.
  - Dosis por toma.
- **Lo que aportan suma a los micros del día** en su propia columna **«Supl.»**, aparte de lo planificado y lo
  registrado. Las filas de lo que traen salen siempre a la vista. En las vistas de semana y de micros (N2 y N7) irá
  igual, marcado «suplemento».
- **Máximos tolerables de EFSA** (adulto). Si se pasan, hay una línea discreta debajo de la tabla. Los límites son:
  vitamina D 100 µg, A 3000 µg, E 300 mg, B6 12 mg, zinc 25 mg, calcio 2500 mg y yodo 600 µg. Para el folato
  (1000 µg) y el magnesio (250 mg) solo cuenta lo que viene de suplementos.
- **Estados:**
  - Vacío: sin suplementos, con la explicación y «Añadir suplemento».
  - Sin etiqueta: «sin etiqueta: no suma nada».
  - Etiqueta sin vitaminas ni minerales: lo dice.
  - Hoy no toca.
  - Suma hoy.
  
  Se guardan solo en este móvil (`copiloto.nutri.suplementos.v1`). Su ficha es parte de tus alimentos.
- **En la Cocina de prueba:** vitamina D3, omega-3 (2 tomas, solo los días de entreno) y magnesio sin etiqueta, todos
  de EJEMPLO.

## Estadísticas (v2.49–v2.56)

Nutrición tiene subpestañas **Hoy · Semana · Tendencias · Fases · Entreno · Micros**; los huecos van en **Comprar**.
Las gráficas son SVG a mano (`nutri-graficas.js`, con el lenguaje del Arc) y los datos salen de
`Nutricion.resumenDia/semana/semanas/porTipo/cobertura/huecos`. Un día sin comidas ni registro es «s/d», nunca 0.
- **Hoy (N1):** energía en grande («estimado» si toca) con los macros; debajo, todos los nutrientes en tiras de rango
  (lo de suplementos, marcado). Luego, «Te falta», la tabla planificado/registrado/Supl., el registro y los suplementos.
- **Semana (N2):** energía por día apilada (proteína, carbohidratos, grasa) con el mínimo y la adherencia (energía ±10 %,
  proteína y carbohidratos ≥ mínimo); carbohidratos por día con su banda y la media del resto (Supl. aparte).
- **Tendencias (N3):** 8 semanas, una curva con selector (carbohidratos y proteína por kg, fibra, vitamina C, folato) y
  la banda de cada semana; el peso medio semanal (de «Semana») contra lo esperado de cada fase.
- **Fases (N4):** la fase de ahora con sus fechas y cómo va hoy; «Luego», la tira de 6 meses; tocar una fase da sus g/kg.
- **Entreno (N5):** carbohidratos por kg según el tipo de día (4 semanas) contra la banda de la fase.
- **Micros (N7):** cobertura de 4 semanas (% del mínimo, Supl. más claro, o «Solo comida»); al tocar se da la vuelta al
  mapa de calor de 8 semanas.
- **Huecos (N6, en Comprar):** lo que se queda corto ≥ 2 días de 2 semanas, con qué se arregla y su curva de 7 días.
- Capturas rápidas: `node scripts/capturas-nutricion.mjs <carpeta> [Subpestaña|Huecos]` (Cocina de prueba, sin rastro).
