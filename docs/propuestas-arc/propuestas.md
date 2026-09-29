# Winter Arc · cuatro propuestas (v3, «Hoja de ruta»)

El diseño se cambia en el móvil en **Ajustes del Arc › Diseño** (A, B, C o D).
Esa pantalla se abre con el engranaje de Winter Arc o desde Ajustes › Winter
Arc. Las cuatro propuestas usan los mismos datos y la misma lógica (`arc.js`);
solo cambia lo que se ve en HOY. La pantalla Winter Arc es la misma en las
cuatro. La elección se guarda en `copiloto.arc.diseno`, y por defecto es
**A**, la que eligió el usuario.

## Qué es el Arc desde la v3

- **Empieza el 1 de septiembre y dura 122 días.** Ya no hay prólogo:
  septiembre cuenta con lo que se sabe.
- **Cuatro etapas con numeral romano, del 1/9 al 31/12:** I **Calzada** (hasta
  la carrera de Roma), II **Tierra firme**, III **Travesía** (México y el
  noviembre de viajes) y IV **Faro** (Navidad en A Coruña, la Torre). El
  camino empieza en una obra romana y acaba en otra que es casa. Salió de un
  panel de 3 diseños con juez, en el que ganó el enfoque «viaje».
- **Arriba de todo, la etapa en curso:**
  - el **miliario**, un mojón con la cuenta atrás al siguiente destino real
    («20 días a Roma»);
  - la **tira de la etapa**, una marca por día, con los viajes y las
    estancias fuera de casa;
  - la **próxima parada**;
  - **«Lo que pide la etapa»**: su consigna con números reales de Strava,
    Hevy y Huawei.
- **La Hoja de ruta:** las etapas con una espina que se rellena al sellarlas.
  La etapa en curso se abre con su rejilla de días, donde se marca «hecho sin
  registrar». La que acaba deja un **acta** con días cumplidos, fuerza, km,
  horas, kg y sueño medio.
- **Lo que no se sabe no es un fallo:** un día sin datos no suma ni resta,
  una caminata sin registro no se exige y nunca se escribe «fallo»: se dice
  «a medias» o «sin registro».
- **El sueño sale de Huawei Health:** un fichero que genera
  `scripts/salud-arc.mjs` y se importa en Ajustes del Arc. Con él, «Dormir 7 h
  o más» se marca solo.

## Las cuatro propuestas en HOY

- **A · Anillos** (por defecto): los 3 anillos van en la tarjeta del día, bajo la línea «I CALZADA · 20 DÍAS A ROMA». Optimiza marcar sin salir de la tarjeta. Sacrifica: alarga la tarjeta del entreno.
- **B · Línea del día:** cada regla es una fila de la línea del día, a su hora (se ajusta en Ajustes del Arc). Optimiza el contexto. Sacrifica: queda por debajo del pliegue.
- **C · Temporada:** una cabecera con la semana en 7 puntos y la revisión del domingo como tarjeta. Optimiza que se vea la semana. Sacrifica: empuja la tarjeta del entreno hacia abajo.
- **D · Cuadrícula:** una fila compacta con los 3 checks. Optimiza no estorbar. Sacrifica: los checks son solo iconos.

## Capturas (390 × 844, página entera)

Nombre: `DISEÑO-ESTADO-TEMA-PANTALLA.png`. Los ajustes, en `ajustes-ESTADO-TEMA.png`.

| Estado | Qué es |
|---|---|
| `vacio` | 28/09, sin reglas |
| `lleno` | 12/10, con datos de prueba (sueño incluido). Solo existen en `scripts/capturas-arc.mjs`; los datos reales de salud no salen del móvil ni van al repo |
| `error` | 12/10 sin conexión: con la copia del calendario y sin Strava ni Hevy |

| | HOY oscuro | HOY claro | Winter Arc oscuro | Winter Arc claro |
|---|---|---|---|---|
| **A** vacío | [A](A-vacio-oscuro-hoy.png) | [A](A-vacio-claro-hoy.png) | [A](A-vacio-oscuro-arc.png) | [A](A-vacio-claro-arc.png) |
| **A** lleno | [A](A-lleno-oscuro-hoy.png) | [A](A-lleno-claro-hoy.png) | [A](A-lleno-oscuro-arc.png) | [A](A-lleno-claro-arc.png) |
| **A** error | [A](A-error-oscuro-hoy.png) | [A](A-error-claro-hoy.png) | [A](A-error-oscuro-arc.png) | [A](A-error-claro-arc.png) |
| **B** vacío | [B](B-vacio-oscuro-hoy.png) | [B](B-vacio-claro-hoy.png) | [B](B-vacio-oscuro-arc.png) | [B](B-vacio-claro-arc.png) |
| **B** lleno | [B](B-lleno-oscuro-hoy.png) | [B](B-lleno-claro-hoy.png) | [B](B-lleno-oscuro-arc.png) | [B](B-lleno-claro-arc.png) |
| **B** error | [B](B-error-oscuro-hoy.png) | [B](B-error-claro-hoy.png) | [B](B-error-oscuro-arc.png) | [B](B-error-claro-arc.png) |
| **C** vacío | [C](C-vacio-oscuro-hoy.png) | [C](C-vacio-claro-hoy.png) | [C](C-vacio-oscuro-arc.png) | [C](C-vacio-claro-arc.png) |
| **C** lleno | [C](C-lleno-oscuro-hoy.png) | [C](C-lleno-claro-hoy.png) | [C](C-lleno-oscuro-arc.png) | [C](C-lleno-claro-arc.png) |
| **C** error | [C](C-error-oscuro-hoy.png) | [C](C-error-claro-hoy.png) | [C](C-error-oscuro-arc.png) | [C](C-error-claro-arc.png) |
| **D** vacío | [D](D-vacio-oscuro-hoy.png) | [D](D-vacio-claro-hoy.png) | [D](D-vacio-oscuro-arc.png) | [D](D-vacio-claro-arc.png) |
| **D** lleno | [D](D-lleno-oscuro-hoy.png) | [D](D-lleno-claro-hoy.png) | [D](D-lleno-oscuro-arc.png) | [D](D-lleno-claro-arc.png) |
| **D** error | [D](D-error-oscuro-hoy.png) | [D](D-error-claro-hoy.png) | [D](D-error-oscuro-arc.png) | [D](D-error-claro-arc.png) |
| Ajustes | [vacío oscuro](ajustes-vacio-oscuro.png) · [vacío claro](ajustes-vacio-claro.png) | [lleno oscuro](ajustes-lleno-oscuro.png) · [lleno claro](ajustes-lleno-claro.png) | [error oscuro](ajustes-error-oscuro.png) · [error claro](ajustes-error-claro.png) | |

## Revisión (checklist de `../DISENO-ARC.md`)

`revision.json`: **54 pantallas, 0 con fallos.** Lo que encontró la auditoría
y se corrigió antes de publicar:

| Versión | Hallazgo | Arreglo |
|---|---|---|
| v3 | Las celdas de la rejilla de la etapa medían 41 px de ancho | Ahora ocupan todo el ancho: 47 px |
| v3 | El número de los días cumplidos salía gris sobre blanco (2,9:1), porque una regla de `span` le caía al número | La regla pasa a aplicarse solo a las celdas |
| 2.6 | Leyendas con el acento (un 3.er uso) | Van en texto |
| 2.6 | Un peso 900 heredado | Fijado a 800 |
| 2.6 | Aviso gris sobre la tarjeta azul (1,05:1) | Hereda el color de la tarjeta |
| 2.6 | Automáticas como botones desactivados | Van como indicadores |
| 2.6 | Cuadrícula que se salía de la pantalla | Corregida |
