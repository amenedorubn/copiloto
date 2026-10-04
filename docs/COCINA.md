# Cocina

Pestaña de HOY (icono de la olla, junto a Estadísticas). Desde la v2.35 son cinco archivos, cada uno
con sus tests (`node --test tests/<archivo>.test.mjs`):

| Archivo | Qué hace |
|---|---|
| `receta.js` | Entiende el texto de cada evento de «Comidas»: ingredientes (con cantidad, corte y si ya está en casa), pasos, tiempos y avisos, «Antes de empezar» |
| `despensa.js` | Lo que hay en casa (Despensa) y lo que comprar (Comprar) |
| `carriles.js` | Las recetas con carriles: cuándo va cada paso (manos de una en una, fuegos, sartén, ollas, micro, air fryer) y el replan si vas tarde |
| `cocina-modo.js` | El paso a paso a pantalla completa |
| `cocina.js` | Las pantallas, HOY, los avisos del tupper y la avena, el escáner y la sincronización |

## De dónde sale cada cosa

| Qué | Fuente | Cómo llega |
|---|---|---|
| Lo que toca y la semana | Calendario de Google «Comidas» (lo rellena Claude) | `/agenda` del Worker, en `dia` con `fuente: "comida"` |
| Recetas con temporizador | Copiloto Cocina (`amenedorubn/cocina`, repo público) | `raw.githubusercontent.com/.../recetas/*.json`, con copia en el móvil |
| El punto de partida de la Despensa | Nota de Obsidian «Despensa habitual», bloque «Estado actual», o el último **Recuento** de la app | `/despensa` del Worker (solo lectura) |
| Lo comprado, gastado, lo que se acaba, la lista | La app | `localStorage` y el Worker (`/cocina`, en KV) |

## Las subpestañas

Arriba, fijas: **Semana**, **Comprar**, **Despensa** y **Recetas**; se cambian tocándolas o deslizando a los lados.

- **Semana**: arriba, en grande, lo que toca ahora (o lo siguiente), la misma tarjeta que en HOY; si estás
  cocinándolo, «Cocinando · paso 3 de 9» y «Seguir». Debajo, la semana por días: lo hecho y lo pasado en gris,
  los avisos con campana y las compras con carro. Tocar una comida abre su paso a paso; una que ya pasó deja
  verlo o decir «No la hice» (entonces no gasta nada).
- **Comprar**: lo que piden las comidas que aún **no han empezado**, hasta el final del plan (máx. 7 días),
  que no está en casa. Un alimento por fila, sumado si sale en varias comidas, con «Para: Shakshuka · jue».
  Nunca: sal, aceite, especias, lo que el plan hace antes (los huevos cocidos de anoche, el tarro de avena) ni
  lo que la receta dice que ya está en casa. «¿Te queda?» cuando no se sabe: «Me queda» quita la duda.
  Tocar el nombre enseña de qué comidas y líneas sale la cantidad (y la cuenta con lo que hay en casa); la casilla
  de la izquierda lo marca. Las cantidades se suman con la equivalencia unidad/gramos que den las recetas
  (`1 yogur (125 g)`) y lo que se compra por piezas sube al entero; gramos y ml no (ver
  `docs/RECETAS-CALENDARIO.md`).
  Al marcarlo pasa a «En el carro», donde «Cuánto» apunta lo que has comprado («1 kg», «6», «2 paquetes»).
- **Despensa** (antes Tengo), en seis zonas: Congelador, Nevera, Fruta y verdura, Despensa dulce, Despensa
  salada y Especias (la «Despensa seca» de la nota se reparte sola entre dulce y salada; «Fresco» es fruta y
  verdura). Es la nota (o el recuento) y, por orden de tiempo, lo que ha pasado después: la compra de la nota,
  lo apuntado en la app y **cada comida que ya empezó, que gasta lo suyo sola** (una vez: si al acabar el paso a
  paso apuntas lo gastado, cuenta eso). Lo que tiene cantidad se resta; lo que se gasta por piezas sin saber
  cuántas había (pan, jamón) pasa a «?»; «que quedan», «todas las» lo acaban. Tocar algo deja decir **cuánto
  queda** («3 rebanadas»): lo que dices es lo que hay. Y **moverlo** a otra zona: se queda ahí también cuando se acaba y
  vuelves a comprarlo.
  - **Añadir**: qué y cuánto (o todo junto: «plátanos 4», «4 plátanos», «arroz 1 kg»), y su zona.
  - **Recuento**: dicta o pega todo lo que hay («Nevera: leche, 6 huevos… Congelador: …») y pasa a ser el
    punto de partida. Lo de antes deja de contar.
  - **Para Claude**: copia lo que hay con el formato del bloque «Estado actual», para pegárselo a la Claude que
    planea las comidas.
- **Recetas**: las de Copiloto Cocina, con «Tienes todo» o «Falta …».

## El paso a paso con carriles (v2.36)

Las comidas escritas con `CARRIL …` y `AL JUNTAR` ([formato](RECETAS-CALENDARIO.md#recetas-con-carriles-varias-cosas-a-la-vez))
no van en fila, sino por carriles:

- **Antes de empezar**: el plan entero en un mini-Gantt (manos en blanco, espera en gris, la unión en puntos),
  por dónde empiezas, a qué hora entra lo que no espera («La pasta entra a las 13:59 para acabar justo cuando se
  junta todo»), cuánto sería en una sola línea, lo que el evento no deja claro (carril y paso) y Saca / Corta.
  «Empezar · a la mesa 14:10».
- **Ahora · tus manos**: lo único que haces ahora, con sus ingredientes y, si es solo de manos (picar), lo que
  queda. Si aún no toca: «A las 14:00 · en 5:03» y «Hasta entonces, tus manos están libres». **Hecho** acaba sus
  manos y, si luego espera (hervir, sofreír), pone su reloj; «Hacerlo ya» lo adelanta. Deshacer, 5 s.
- **Mientras**: los carriles que esperan, con su reloj, o «listo, a fuego bajo hasta que toque».
- **Luego**: lo siguiente, con su hora y si no espera.
- El plan se rehace cada segundo con lo que ya ha pasado: si picas 2 min más, la pasta entra 2 min más tarde
  («Plan rehecho: a la mesa a las 14:11 (antes 14:10)»). Al acabar su espera, un carril pita una vez y dice
  «Agua: listo»; cuando toca la siguiente acción, pita y la dice.
- Cuenta con **Mi cocina** (botón en el plan; `Carriles.COCINA` por defecto, se guarda en `copiloto.cocina.micocina.v1`): 4 fuegos,
  1 sartén, 2 ollas, horno, micro, air fryer, picadora y batidora. Un carril tiene su fuego y su recipiente desde su
  primer paso con ellos hasta el último.
- Las recetas JSON de Copiloto Cocina y las comidas sin carriles siguen con el paso a paso de siempre.

Capturas: `node scripts/capturas-cocina.mjs` saca `carril-plan`, `carril-agua`, `carril-manos`, `carril-tarde`,
`carril-espera`, `carril-pasta`, `carril-fin`, `carril-error` y `carril-micocina` con la pasta de ejemplo.

## El paso a paso

- Paso 0 **Antes de empezar**: qué sacar, qué cortar y cómo («1 boniato · pélalo, en cubos de 2 cm») y qué
  tener a mano. Sale solo de los ingredientes: ninguna receta se queda sin decir que hay que cortar algo.
- Arriba: paso X de N, %, lo que queda y «acabas 21:50»; la barra se toca para mirar un paso.
- **Pasos** (todos, con su estado, para ir a cualquiera o mirarlo) e **Ingredientes** (todos, para marcar).
- **Mirar otro paso** sin salir del tuyo: banner azul, sin voz ni relojes; «Volver» o «Seguir desde aquí».
- Relojes que no se paran al cambiar de paso, varios a la vez, siempre a la vista. Empiezan con «Empezar»;
  «5 min, agitar, 5 min más» es un reloj de 10 min que avisa a los 5.
- Retoma donde lo dejaste (menos de 6 h) o «Empezar de 0». Pantalla encendida y voz.
- Al acabar: lo gastado, para marcar, y «Apuntar lo gastado» o salir sin apuntar.

## Un evento de «Comidas»

Cómo escribirlo para que salga bien: [RECETAS-CALENDARIO.md](RECETAS-CALENDARIO.md). Está también en la nota de
Obsidian «Formato de recetas del calendario», y «Planning de comidas» y «Despensa habitual» piden leerla antes de
escribir cualquier comida: así la Claude que planea las escribe bien.
Título `Etiqueta · Plato` o solo el plato. Un evento con 🛒 o que empieza por «Compra» es una compra; uno que
empieza por «Saca…» o «Descongela…» es un aviso; «Comida fuera» y «Nada que preparar», fuera de casa.

## En HOY

La tarjeta grande es lo que toca por la hora (`Cocina.queGrande`): el entreno a su hora y, cuando pasa, cada
comida a la suya. Es la misma tarjeta que arriba en Semana.

## Avisos del tupper y de la avena (app Android)

`Cocina.avisosComida` saca de «Comidas» los de 48 h: un tupper que sale del congelador, la noche antes a las
21:30 (salvo que el calendario ya traiga su «Descongelar…»); un desayuno de avena en tarro, 45 min antes; y los
eventos que ya son un aviso, a su hora. El APK los pone como notificación (`AvisoReceiver`).

## Escanear lo comprado

Comprar o Tengo → «Escanear»: en Chrome, `BarcodeDetector`; en la app Android, el escáner de Google Play
Services (`Nativo.escanea`). El código se busca en Open Food Facts y entra en la Despensa con su zona, su
etiqueta y la cantidad: la del paquete por **cuántos** has comprado (2 × 500 g = 1 kg).

## Capturas

`node scripts/capturas-cocina.mjs [carpeta]` (datos de ejemplo del propio script; `FIXTURE=datos.json` para
otros). Chrome va mudo: nada de voz ni pitidos. No subas capturas con datos de verdad: el repo es público.

## Activar la nota de la despensa (una vez)

1. GitHub → Settings → Developer settings → **Fine-grained token**: solo el repo `mivault`, **Contents: Read-only**.
2. Cloudflare → Workers → `copiloto-api` → Settings → Variables and Secrets → Secret **`VAULT_TOKEN`**.
3. `/salud` dice `VAULT_TOKEN: true`. Sin él, la Despensa funciona con el Recuento.
