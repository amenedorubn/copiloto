# Diseño del Arc: reglas y cómo se comprueban

Reglas concretas que sigue todo lo que pinta `arc.js` (la línea de HOY y la
pantalla Arc, en los cuatro diseños). Vienen de las reglas de la casa y de
estas guías, leídas antes de diseñar:

- [open-design / craft](https://github.com/nexu-io/open-design/tree/main/craft):
  `anti-ai-slop`, `color`, `typography`, `laws-of-ux`, `state-coverage`,
  `accessibility-baseline` y `animation-discipline`.
- [awesome-claude-design](https://github.com/rohitg00/awesome-claude-design),
  *Anti-Slop Kit* y su tabla de huellas por defecto.

La comprobación es automática: `scripts/capturas-arc.mjs` hace las capturas
de `docs/propuestas-arc/` y, en cada una, `scripts/audita-arc.js` mide lo que
se ve de verdad en Chrome (estilos calculados, no el CSS escrito). El
resultado queda en `docs/propuestas-arc/revision.json`. Lo que no se puede
medir se revisa a mano y está marcado como **(a mano)**.

## 1. Color

| Regla | Valor | Cómo se comprueba |
|---|---|---|
| Un solo acento | `--arc`: ámbar `#f0b429` en oscuro, `#8a5a00` en claro | Solo existe ese token en `arc.js`. |
| Qué significa el acento | Solo «hecho»: día cumplido, regla hecha. Nada más | **(a mano)** Revisado en las 54 capturas. |
| Máx. 2 usos visibles por pantalla | Un uso = un componente distinto pintado con el acento. En Winter Arc (v3): 1) la tira de la etapa en curso, 2) los anillos de Hoy. La rejilla, la Hoja de ruta, las actas, el miliario, las barras y la curva van en tinta (`--fg`/`--mu`) | La auditoría agrupa los elementos con el acento por componente (`acento` en `revision.json`) y falla si hay más de 2. |
| Sin turquesa | El Arc de la 2.5 usaba `#6cd3e0`. El Anti-Slop Kit marca el turquesa como la huella más típica de un diseño hecho por IA, así que se cambió | — |
| Sin índigo ni violeta | Ni el acento ni ningún color del Arc | **(a mano)** El ámbar no está en la lista de índigos prohibidos de `anti-ai-slop.md`. |
| Sin gradientes decorativos | El Arc no pinta ninguno | La auditoría cuenta los `background-image: *gradient` dentro del Arc (`gradientes` debe ser 0). Las tarjetas de entreno de HOY ya tenían su degradado de antes y no son del Arc. |
| Por qué ámbar | Una brasa en la temporada fría: se distingue de los colores de tipo que ya usa la app (calle azul, cinta roja, gimnasio morado) y se lee como «logro» | — |
| Barras y leyendas neutras | Las barras de % van en `--fg` y las leyendas son texto, para no gastar el acento | Lo cubre el recuento de usos. |

## 2. Tipografía

| Regla | Valor | Cómo se comprueba |
|---|---|---|
| Pocos tamaños | Cuatro: 12 px (etiquetas y apoyo), 15 px (texto y títulos), 28 px (nombres de etapa y números) y 40 px solo para el miliario, el único número que cambia cada día (la cuenta atrás al siguiente destino) | La auditoría recoge los tamaños calculados de todo texto del Arc (`tamanos` ≤ 4). |
| Máx. 3 pesos | 600, 700 y 800 | Auditoría (`pesos` ≤ 3). Encontró un 900 heredado (`<b>` → `bolder`) en las opciones de Diseño; se fijó a 800. |
| Mayúsculas con tracking | Etiquetas en mayúsculas a 12 px con `letter-spacing: .08em` (mínimo 0,06em) | La auditoría mide el tracking de cada texto en mayúsculas (`mayus` vacío). |
| Número grande | 28 px, 800, `letter-spacing: -.02em` | — |
| Fuente | Manrope, la de la app. No se añade ninguna | — |

## 3. Espacio y contenedores

| Regla | Valor | Cómo se comprueba |
|---|---|---|
| Dentro de un grupo | 8–12 px (`gap` 8, márgenes 8 y 12) | **(a mano)** Constantes en el CSS de `arc.js`. |
| Entre grupos | 40 px entre secciones de la pantalla Arc | La auditoría lee el `margin-top` real de cada sección (`seccion`, entre 32 y 48). |
| Máx. 2 niveles de contenedor | Pantalla → caja (`.arcCaja`, `.arcBloque`) → controles. Nunca caja dentro de caja dentro de caja | La auditoría cuenta los fondos opacos anidados dentro del Arc (`cajas` ≤ 2). |
| Sin borde de color a la izquierda | Ninguna tarjeta lleva la raya de color que marca `anti-ai-slop.md` | **(a mano)** |

## 4. Iconos y texto

| Regla | Valor | Cómo se comprueba |
|---|---|---|
| Solo Phosphor | Phosphor Regular, trazados copiados de `@phosphor-icons/core` (viewBox 256). Los únicos SVG propios son gráficos de datos: anillos, puntos, la curva de fuerza y la tira de la etapa | La auditoría lista cualquier `svg` con otro viewBox que no sea anillo ni punto (`iconos` vacío). |
| Sin emojis | Ninguno | La auditoría busca `\p{Extended_Pictographic}` en todo el texto (`emojis` vacío). |
| Sin «fallo» | Un día sin completar es «a medias» y uno sin datos, «sin datos» o «sin registro»: nunca «fallo», «no hecho», rojo ni aspa. El aviso de 2 días seguidos dice «Dos días seguidos a medias: hoy toca volver» | **(a mano)** `grep -n "fallo|no hecho" arc.js` solo da comentarios y nombres internos. |
| Nada inventado | Sin ejemplos de reglas, sin textos de relleno, sin cifras que no salgan de los datos. Las tres reglas y la ayuda de «Dormir» son literales del encargo; el objetivo sale vacío | **(a mano)** Se quitaron los ejemplos que traía la 2.5 («Entrenar», «Leer 20 min»…) y el `placeholder` con un ejemplo. Los datos del día 12 existen solo en el script de capturas. |

## 5. Estados

Cada vista cubre los cinco estados de `state-coverage.md`:

| Estado | Qué se ve |
|---|---|
| Vacío | Sin reglas: título, explicación y dónde añadirlas. En HOY, una fila que lleva a Arc. |
| Carga | «Trayendo el calendario, Strava y Hevy…». A los 15 s pasa a «tardan más de lo normal» (`state-coverage.md`: aviso a los 15 s). El prólogo pinta barras de esqueleto. |
| Error | Causa en claro y cómo seguir: «Sin conexión con Strava y Hevy. Lo automático sale con lo último guardado.» con **Reintentar**. Los datos que no se pueden leer se enseñan en solo lectura y no se borran. |
| Lleno | Día 12 con datos (capturas `*-dia12-*`). |
| Borde | 5 reglas (el formulario lo avisa), nombres largos (2 líneas y luego corte), la semana 13 de 4 días, el día 92, temporada cerrada, día futuro (no se marca) y sesiones dobles («1 de 2 sesiones»). |

## 6. Accesibilidad

| Regla | Valor | Cómo se comprueba |
|---|---|---|
| Contraste | 4,5:1 como mínimo para todo texto, en claro y en oscuro | La auditoría calcula el contraste de cada texto contra su fondo real. En las tarjetas degradadas (diseño A) mide contra los colores de la mitad de abajo, donde va el Arc (`minContraste` ≥ 4,5). Encontró el aviso gris sobre la tarjeta azul (2,1:1 y 1,05:1) y ahora hereda el blanco de la tarjeta. |
| Zonas táctiles | 44 × 44 px (el nivel AAA; el AA es 24) | La auditoría mide cada botón, radio y campo activo (`tactil` vacío). Los checks de la línea del día (B) miden 36 px a la vista y 46 px de zona táctil con `::after`, y la auditoría lo tiene en cuenta. |
| Las automáticas no son botones | Se ven pero no se tocan: `span` con `role="img"` y `aria-label`, no botones desactivados (que bajan el contraste) | La auditoría no encontró textos de automáticas por debajo de 4,5:1. |
| Etiquetas | Cada check lleva `aria-label` con nombre, estado y «toca para cambiar», y `aria-pressed`; los campos, `<label>` visible | **(a mano)** |
| Foco visible | `:focus-visible` con 2 px en `--fg` (no se gasta el acento) | **(a mano)** |
| Avisos | `role="status"` para fallos seguidos y conexión; `role="alert"` para errores de datos y del formulario | **(a mano)** |

## 7. Movimiento

- Solo confirmaciones de estado: 150 ms en color y borde de checks, chips y anillos.
- Sin animaciones de entrada, bucles ni puntos que parpadean.
- `prefers-reduced-motion: reduce` las quita todas.

## 8. Leyes de UX aplicadas

- **Hick:** cuatro diseños para elegir, cada uno con una línea que dice qué hace.
- **Fitts:** los checks van donde está el pulgar y miden 44 px como mínimo.
- **Von Restorff:** el acento se reserva para una sola cosa, «hecho».
- **Goal-gradient y peak-end:** el número de días cumplidos solo sube, y la revisión del domingo cierra cada semana.
- **Zeigarnik:** el día de hoy se ve abierto («pendiente») y no fallado hasta que termina.

## Cómo repetir la revisión

```bash
npm i --no-save playwright-core            # una vez; usa el Chrome instalado
python -m http.server 8777 --bind 127.0.0.1 &
node scripts/capturas-arc.mjs              # 48 capturas + docs/propuestas-arc/revision.json
node scripts/capturas-arc.mjs "" C-dia12   # solo las de un diseño y estado
```

El script termina diciendo cuántas pantallas incumplen alguna regla.
