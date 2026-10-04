# Cocina

Pestaña de HOY (icono de la olla, junto a Estadísticas). Desde la v2.39 son siete archivos, cada uno
con sus tests (`node --test tests/<archivo>.test.mjs`):

| Archivo | Qué hace |
|---|---|
| `receta.js` | Entiende el texto de cada evento de «Comidas»: ingredientes (con cantidad, corte y si ya está en casa), pasos, tiempos y avisos, «Antes de empezar» |
| `despensa.js` | Lo que hay en casa (Despensa) y lo que comprar (Comprar) |
| `alimentos.js` | Tus alimentos con tu nombre: alias, códigos de barras, lo que pesa una unidad y la nutrición con su fuente |
| `carriles.js` | Las recetas con carriles: cuándo va cada paso (manos de una en una, fuegos, sartén, ollas, micro, air fryer) y el replan si vas tarde |
| `cocina-modo.js` | El paso a paso a pantalla completa |
| `cocina-prueba.js` | La Cocina de prueba de Ajustes: recetas de ejemplo con carriles y el reloj simulado |
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
- **Comprar** (v2.42, opción A de la propuesta). Sale lo que piden las comidas que **aún no han empezado**, hasta el
  final del plan (máximo 7 días), y que no está en casa.
  - **Por pasillo del súper** (`Despensa.porPasillo`):
    - Fruta y verdura · Carne y pescado · Lácteos y huevos · Panadería · Despensa · Congelados.
    - «**Otros** · sin pasillo conocido» si el nombre no basta. La zona de tus alimentos ayuda.
  - **Cada alimento dice los días en que se usa, no el plato:** «mañana · mié · jue».
    - Dentro del pasillo va ordenado por el primer día.
    - Su prisa: «**Hace falta hoy / mañana**» (en negrita) o «Puede esperar 3 días». Lo que apuntas tú dice
      «Lo apuntaste tú · Sin día».
  - **Próxima ida al súper** (opcional: Sin fecha, Hoy, Mañana y los 3 días siguientes; se guarda en el móvil):
    - lo que hace falta **antes** de ese día va en «**Comprar ya**»;
    - lo demás, en «**Puede esperar**» («Puede esperar a la compra del sáb»).
  - **Un toque en el nombre** dice de qué platos y líneas sale la cantidad y la cuenta
    («Suman 12 − en casa 2 = 10»).
  - Nunca entran: sal, aceite, especias, lo que el plan hace antes, lo marcado «de casa» ni lo que ya hay. Las
    unidades y los gramos se juntan con su equivalencia, y lo que se compra por piezas sube al entero (ver
    `docs/RECETAS-CALENDARIO.md`). «¿Te queda?» cuando no se sabe; «Me queda» quita la duda.
  - **La casilla** mete la cosa en el **carro**, que ya cuenta como en casa (con la cantidad de la receta). En el
    carro se saca tocándola.
  - **Terminar compra** pide cuánto has comprado de cada cosa del carro («Meter en casa») y eso pasa al
    **Por confirmar** de la Despensa: «Compraste: Calabacín · 1 kg · lo que pusiste al terminar la compra».
  - **Estados:**
    - Leyendo lo que tienes.
    - Error: no se puede leer, o sin conexión. Lo que apuntes sigue saliendo.
    - Vacío: «Lo de las comidas ya está en casa».
    - Lleno.
    - Extremos: «Otros», sin día, dudas.
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
- **Despensa desde la v2.40 (opción C de la propuesta):**
  - **Por confirmar**, arriba en «Todo». Es lo que la app cree que ha pasado (`Despensa.porConfirmar`) y se confirma
    con un toque:
    - **Una comida que ya acabó** (en los 3 últimos días) y de la que nadie apuntó qué gastó. Ya se resta sola.
      «Así fue» la deja apuntada; «Corregir» deja quitar lo que no usaste o decir «No la hice».
    - **Lo marcado en Comprar**, que entró con la cantidad de la receta. «Bien» u «Otra cantidad». Lo escaneado no
      sale, porque ya trae la suya.
    - **Las dudas**: «¿Te queda pan de molde?», con Sí, Cuánto o «No, se acabó».
  - **Los tuppers del congelador:** su fila dice «2 de 3 tuppers», y con 3 avisa de que el de la siguiente ración doble
    no cabe.
  - **Una zona:** una fila por cosa con su **cantidad clara**. Con la equivalencia de tus alimentos sale «240 g · 3 ud»
    o «2 latas · 160 g». **Desliza a la izquierda: Se acabó.** Toca: **¿Cuánto queda?** en un toque (lleno, ¾, ½,
    ¼ o nada, del paquete si se conoce), o escrito. También dice el nombre del paquete y la nutrición con su fuente.
  - **Añadir:** mientras escribes salen tus alimentos con tu nombre. Al tocar uno, la zona se elige sola y solo
    falta cuánto.
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

## Cocina de prueba (v2.38)

Ajustes → **Cocina de prueba · Ver el paso a paso con carriles**, junto a Simulación. Abre el paso a paso con
carriles **de verdad** (`receta.js`, `carriles.js` y `cocina-modo.js`) con una receta de ejemplo de
`cocina-prueba.js`:
- pasta con tomate y atún (la del formato);
- albóndigas con rigatoni (air fryer, fuego y micro a la vez);
- pollo con verduras escrito mal a propósito (sin sartén ni olla, un paso sin minutos y un `(tras VERDURAS)` que no existe).

- Arriba, «SIMULACIÓN · no cuenta» y **Terminar**, que vuelve a Ajustes.
- Reloj simulado **×1, ×10, ×30** y **Retrasarme 2 min**: el reloj salta 2 min y se ve cómo se rehace el plan.
- **Mi cocina** se puede cambiar (quitar fuegos u ollas) para ver el efecto, pero solo vale en la prueba.
- **Sin rastro.** No lee ni escribe el calendario, Comprar, la Despensa, lo gastado, Mi cocina ni el estado del paso a
  paso. No pone avisos en el móvil, y el final no ofrece «Apuntar lo gastado». Los relojes de una receta de verdad
  que ya estuviera en marcha siguen con la hora real.
- `scripts/capturas-cocina.mjs` lo recorre entero (`prueba-*`) y falla si el `localStorage` o el `/cocina` del Worker
  cambian.

## Casa de prueba (v2.41)

Ajustes → **Casa de prueba**, debajo de Cocina de prueba. Es la pestaña Cocina **entera y de verdad** (Semana,
Comprar, Despensa y Recetas) con los datos de ejemplo de `cocina-prueba.js` (`CocinaPrueba.casa`), con fechas
alrededor de hoy:
- una despensa con el congelador lleno (3 de 3 tuppers), huevos sin confirmar y atún con su equivalencia (240 g · 3 ud);
- dos comidas que ya pasaron, para «Así fue» o «Corregir»;
- una compra marcada en Comprar, para «Bien» u «Otra cantidad»;
- la pasta con carriles para la cena;
- y en Comprar: tahini (sin pasillo conocido), bolsas de basura (sin día) y cosas para varios días.

- «SIMULACIÓN · no cuenta» y **Terminar** vuelven a Ajustes, igual que «atrás».
- **Sin rastro.** Mientras está abierta, todo se lee y se guarda en una caja en memoria (`Cocina.pintaPrueba`):
  - no lee ni escribe tu despensa, el calendario, Comprar ni tus alimentos;
  - no sube nada al Worker ni lee tu nota;
  - el paso a paso que abras va en modo prueba.
  
  Al salir, la caja se tira. Escanear sí busca en Open Food Facts, pero lo que apuntes se queda en la caja.
- `scripts/capturas-cocina.mjs` la recorre (`casaprueba-*`) y falla si cambia el `localStorage` o se llama a `/cocina`.

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

Comprar o Despensa → «Escanear»: en Chrome, `BarcodeDetector`; en la app Android, el escáner de Google Play
Services (`Nativo.escanea`).

**Tu nombre manda (v2.39, `alimentos.js`).** Cada alimento tiene el nombre que usas tú y nunca cambia solo:
- **Un código que ya conoces** sale con tu nombre y no pregunta.
- **Uno nuevo** se busca en Open Food Facts y pregunta «¿Cómo lo llamas tú?». Propone primero lo tuyo que se
  parece y lo que ya está en casa (así se junta, no se duplica), y luego el nombre del paquete sin marca ni peso.
- El nombre del paquete queda como **alias**, junto al código, la marca, el formato («240 g (3 × 80 g)»), lo que
  pesa una unidad y la nutrición por 100 g con su **fuente** (OFF). La que escribes tú (fuente «tú») no la pisa
  ninguna otra.
- La cantidad es la del paquete por **cuántos** has comprado: 2 × 240 g = 480 g (6 × 80 g).
- Tus alimentos se guardan en el móvil (`copiloto.cocina.alimentos.v1`) y en el Worker (`/cocina`, `alimentos`).
  De cada uno gana la versión más nueva.

El Worker guarda desde la v2.39 todos los tipos de cambio (`hay`, `hecho`, `saltada`, `mueve`, `inventario`,
`confirma`). Antes solo guardaba `compra`, `gasto` y `acaba`, y los demás llegaban al otro móvil sin tipo.

## Capturas

`node scripts/capturas-cocina.mjs [carpeta]` (datos de ejemplo del propio script; `FIXTURE=datos.json` para
otros). Chrome va mudo: nada de voz ni pitidos. No subas capturas con datos de verdad: el repo es público.

## Activar la nota de la despensa (una vez)

1. GitHub → Settings → Developer settings → **Fine-grained token**: solo el repo `mivault`, **Contents: Read-only**.
2. Cloudflare → Workers → `copiloto-api` → Settings → Variables and Secrets → Secret **`VAULT_TOKEN`**.
3. `/salud` dice `VAULT_TOKEN: true`. Sin él, la Despensa funciona con el Recuento.
