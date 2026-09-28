# Arc · cuatro propuestas

Se cambian en el móvil en **Ajustes del Arc › Diseño** (A, B, C o D). Esa
pantalla se abre con el engranaje de la pantalla Winter Arc o desde
Ajustes › Winter Arc. Las cuatro propuestas usan los mismos datos y la misma
lógica (`arc.js`); solo cambia la vista. La elección se guarda en
`copiloto.arc.diseno`.

Desde la 2.6.1, la pantalla **Winter Arc** es solo la temporada (objetivo,
días cumplidos, cuadrícula, revisión). Todo lo que se configura (diseño,
objetivo, reglas y horas) está en **Ajustes del Arc**, con el diseño lo
primero. Capturas: `ajustes-ESTADO-TEMA.png`.

- **A · Anillos:** optimiza marcar sin salir de la tarjeta viva del entreno (3 anillos, un toque). Sacrifica: alarga la tarjeta, pone checks junto a *Empezar* y no enseña la semana.
- **B · Línea del día:** optimiza el contexto (cada regla a su hora, entre comidas y rutinas, con su check). Sacrifica: queda por debajo del pliegue, del Arc solo se ve «Día 12/92» y hay que ajustar las horas.
- **C · Temporada:** optimiza que se note el método (días cumplidos que solo suman, la semana en 7 puntos, la revisión del domingo como tarjeta). Sacrifica: la cabecera empuja la tarjeta del entreno unos 250 px hacia abajo.
- **D · Cuadrícula:** optimiza no estorbar HOY (una fila compacta con los 3 checks) y ver la temporada entera en la pantalla Arc (13 semanas × 7 días, hoy marcado, % por regla). Sacrifica: en HOY los checks son solo iconos y no se ve la semana.

**Recomendación: D**, que es la que viene por defecto. Hasta Roma (18/10), HOY tiene que dejar la tarjeta y *Empezar* arriba, y D solo añade una fila debajo. Tras la carrera merece la pena probar C, que es la que mejor transmite el método.

## Cambios frente al encargo

- **D:** «13×7» se hace con las semanas en filas y los días en columnas (la semana 1 ocupa dos filas, del jueves 1 al domingo 11). Probé primero semanas en columnas: 14 columnas no caben en 358 px con zonas táctiles de 44 px. En filas, cada día mide 44 px.
- **Prólogo:** en HOY es la misma fila en los cuatro diseños. En septiembre no se puede marcar nada, así que no hay nada que diseñar distinto.
- **Tema claro:** es nuevo, para poder hacer estas capturas. Por defecto la app sigue en oscuro (Ajustes › Tema: Oscuro, Claro o Como el móvil). Solo cambia HOY, las hojas y las pantallas Arc y Simulación; el GPS, la cinta y la ficha de lo hecho siguen en oscuro.

## Capturas (390 × 844)

Nombre: `DISEÑO-ESTADO-TEMA-PANTALLA.png`. Estados:
- `prologo`: 28/09, sin reglas.
- `dia12`: 12/10 con datos de prueba, que solo existen en el script de capturas.
- `error`: 12/10 sin conexión, con la copia del calendario pero sin Strava ni Hevy.

Las capturas son de página entera, para que se vea también lo que queda por debajo del pliegue.

| | HOY oscuro | HOY claro | Arc oscuro | Arc claro |
|---|---|---|---|---|
| **A** prólogo | [A](A-prologo-oscuro-hoy.png) | [A](A-prologo-claro-hoy.png) | [A](A-prologo-oscuro-arc.png) | [A](A-prologo-claro-arc.png) |
| **A** día 12 | [A](A-dia12-oscuro-hoy.png) | [A](A-dia12-claro-hoy.png) | [A](A-dia12-oscuro-arc.png) | [A](A-dia12-claro-arc.png) |
| **A** error | [A](A-error-oscuro-hoy.png) | [A](A-error-claro-hoy.png) | [A](A-error-oscuro-arc.png) | [A](A-error-claro-arc.png) |
| **B** prólogo | [B](B-prologo-oscuro-hoy.png) | [B](B-prologo-claro-hoy.png) | [B](B-prologo-oscuro-arc.png) | [B](B-prologo-claro-arc.png) |
| **B** día 12 | [B](B-dia12-oscuro-hoy.png) | [B](B-dia12-claro-hoy.png) | [B](B-dia12-oscuro-arc.png) | [B](B-dia12-claro-arc.png) |
| **B** error | [B](B-error-oscuro-hoy.png) | [B](B-error-claro-hoy.png) | [B](B-error-oscuro-arc.png) | [B](B-error-claro-arc.png) |
| **C** prólogo | [C](C-prologo-oscuro-hoy.png) | [C](C-prologo-claro-hoy.png) | [C](C-prologo-oscuro-arc.png) | [C](C-prologo-claro-arc.png) |
| **C** día 12 | [C](C-dia12-oscuro-hoy.png) | [C](C-dia12-claro-hoy.png) | [C](C-dia12-oscuro-arc.png) | [C](C-dia12-claro-arc.png) |
| **C** error | [C](C-error-oscuro-hoy.png) | [C](C-error-claro-hoy.png) | [C](C-error-oscuro-arc.png) | [C](C-error-claro-arc.png) |
| **D** prólogo | [D](D-prologo-oscuro-hoy.png) | [D](D-prologo-claro-hoy.png) | [D](D-prologo-oscuro-arc.png) | [D](D-prologo-claro-arc.png) |
| **D** día 12 | [D](D-dia12-oscuro-hoy.png) | [D](D-dia12-claro-hoy.png) | [D](D-dia12-oscuro-arc.png) | [D](D-dia12-claro-arc.png) |
| **D** error | [D](D-error-oscuro-hoy.png) | [D](D-error-claro-hoy.png) | [D](D-error-oscuro-arc.png) | [D](D-error-claro-arc.png) |

## Revisión (checklist de `../DISENO-ARC.md`)

Resultado de la auditoría en las 48 pantallas: `revision.json`, con **0 pantallas con fallos**. Lo que encontró y se corrigió antes de publicar:

1. **C y D, acento:** la leyenda «cumplido» era un 3.er uso del acento. Ahora la leyenda es solo texto.
2. **Diseño, pesos:** la letra de cada opción heredaba peso 900 (4 pesos en pantalla). Ahora es 800.
3. **A, contraste:** el aviso de fallos seguidos, en gris sobre la tarjeta azul, quedaba en 2,1:1 (oscuro) y 1,05:1 (claro). Ahora usa el color del texto de la tarjeta: 6,6:1.
4. **C, contraste:** las automáticas eran botones desactivados, al 55 % de opacidad. Ahora son indicadores, no botones, con contraste completo.
5. **D, tamaño:** la cuadrícula de 14 columnas se salía de la pantalla y bajaba de 44 px. Ahora son 13 semanas en filas × 7 días, con celdas de 44 px.
