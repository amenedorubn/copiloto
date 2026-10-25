# Cómo escribir una comida en el calendario «Comidas»

Para la Claude que planea las comidas. Copiloto lee cada evento y lo convierte en lista de la compra,
despensa y paso a paso. **Desde la v2.58 cada paso se basta solo**: lo que hay que hacer, con qué, cuánto,
a qué fuego, cuánto tarda y cómo se sabe que ya está, todo en el mismo paso. **Desde la v2.72 se escribe como
una receta normal** (formato v4): se lee bien en Google Calendar y Copiloto entiende lo mismo que con las marcas.

## Instrucciones para la Claude del calendario

Para copiar tal cual en las instrucciones de la Claude que escribe los eventos:

```
RECETAS DEL CALENDARIO «COMIDAS» · formato v4 (legible)
Escribe cada comida como una receta normal: sin @, ~, # ni llaves. Copiloto saca de
ella ingredientes, cantidades, tiempos, recipientes, fuego, carriles y nutrición.

· Título: «Plato» o «ETIQUETA · Plato».
· Línea 1: «2 RACIONES · 45 min · lo que quieras contar».
· Línea 2: «POR RACIÓN · 610 kcal · 52 g proteína» (lo calcula el linter, no se inventa).
· Apartados en MAYÚSCULAS, solos en su línea: PREPARAR, CARRIL NOMBRE (sartén / olla /
  micro / air fryer / horno), AL JUNTAR, AL TERMINAR, NOTAS. Sin carriles: PROCESO.
· Cada paso, numerado, en este orden: verbo + ingredientes con cantidad + recipiente y
  fuego + « · tiempo» + «→ cómo se ve cuando ya está»:
  2. Echa 300 g de boniato y 400 g de tomate triturado a la olla, tapado, a fuego medio-bajo · 15 min → el boniato se pincha sin resistencia
· Una acción por paso. Todos con tiempo tras « · », aunque sea «· 20 s». Lo que espera
  (cuece, dora, hornea) lleva su señal tras «→».
· Cantidad delante del nombre: «300 g de boniato», «2 huevos», «½ pimiento rojo»,
  «1 cda de AOVE», «1 pizca de sal», «pimienta al gusto», «unas gotas de limón»,
  «unos 30 g de mozzarella». Detrás, si hace falta, el corte («en tiras finas»), lo que
  pesa «(unos 400 g)» o una nota «(congelada)», «(de casa: el del domingo)».
· Nombres como en la tabla de la app o en recetas anteriores («pimiento tricolor»,
  «garbanzos cocidos», «AOVE»). Si el linter dice «no sé qué ingrediente es “X”»,
  cambia el nombre: no adivina.
· Lo que ya salió se nombra con artículo y no se vuelve a comprar: «el boniato», «las
  lentejas». Con cantidad, si es la tanda de ese paso: «Echa 250 g de pollo» otra vez.
  Si de verdad es más: «otra pizca de sal», «otros 2 huevos».
· Lo de cada uno, antes de los dos puntos: «Echa en cada tarro 1 yogur: 2 yogures
  griegos en total» (solo cuenta lo de después).
· Fuego: «a fuego bajo / medio / medio-alto / fuerte», «Baja a fuego medio», «Apaga el fuego».
· Marcas de carril detrás del tiempo: «· 3 min (manos)», «(no espera)», «(tras PREPARAR)».
· Consejos y segundas formas («o 2 min al micro»), en NOTAS. Nada de paréntesis sueltos.
Antes de guardar: node scripts/lint-recetas.mjs receta.txt (tiene que salir ✓).
Para pasar una receta v3 a este formato: node scripts/v3-a-v4.mjs --escribe receta.txt
```

## Formato v4 (el que hay que usar)

Desde la v2.72 la receta se escribe **como se lee**: sin `@`, `{}`, `~` ni `#`. Así se entiende en Google Calendar
antes de abrir la app, y Copiloto saca de ella **lo mismo que de una v3**: ingredientes, cantidades, tiempos,
recipientes, fuego, señal de «ya está», carriles, raciones y nutrición. La lista de ingredientes sigue sin hacer
falta: sale de los pasos.

| Se escribe | Qué es | En v3 era |
|---|---|---|
| `300 g de boniato`, `1 cda de AOVE`, `2 lonchas de pavo` | ingrediente con la cantidad de **este** paso | `@boniato{300 g}` |
| `2 huevos`, `½ pimiento rojo`, `1 plátano` | unidades | `@huevo{2}` |
| `150 g de pimiento tricolor en tiras finas` | con su corte («en dados…», «en tiras…», «en rodajas…») | `@pimiento tricolor{150 g}(en tiras finas)` |
| `1 bote de garbanzos cocidos (unos 400 g)` | lo que pesa (para la nutrición y la compra) | `@garbanzos cocidos{1 bote}(~400 g)` |
| `2 cdas de cebolla troceada (congelada)`, `½ aguacate (de casa: …)` | una nota del ingrediente, entre paréntesis y pegada a él | `@cebolla troceada{2 cdas}(congelada)` |
| `unos 30 g de mozzarella` | aproximado | `@mozzarella{~30 g}` |
| `el boniato`, `las lentejas` | **lo mismo de antes**, sin cantidad: enlaza, no suma | `@&boniato{}` |
| `250 g de pollo` (otra vez) | **lo mismo de antes**, con la cantidad de esta tanda: no suma | `@&pollo{250 g}` |
| `otra pizca de sal`, `otros 2 huevos` | ya salió, pero **es más**: suma | `@sal{=1 pizca}` repetido |
| `1 pizca de sal`, `pimienta al gusto`, `unas gotas de limón` | no cambian al escalar | `@sal{=1 pizca}` |
| `Echa en cada tarro 1 yogur: 2 yogures griegos en total` | lo de antes de los dos puntos es lo de cada uno: no suma | |
| `… · 5 min`, `… · 20 s`, `… · 5 min, vuelta a los 2` | el tiempo del paso, **al final** tras « · » | `~{5 min}` |
| `en la sartén`, `al micro`, `en la Ninja`, `a un tupper` | el recipiente: se reconoce solo | `#sartén` |
| `→ dorado por fuera` | al final: cómo se ve cuando ya está | igual |

### Cómo reconoce los ingredientes

Detrás de cada cantidad Copiloto busca el nombre **más largo** de su diccionario: la tabla de nutrición de la app,
lo que entiende la despensa, los básicos y sus alias (AOVE, aceite de oliva…), todos los nombres que ya han salido
en las recetas v3 (`docs/recetas/`) y, en la app, **tus alimentos** (con sus alias) y lo que hay en tu despensa.
«400 g de tomate triturado» es tomate triturado, no tomate; «2 yogures griegos» es «yogur griego».

Si un nombre no está, **no lo adivina**: el linter dice «no sé qué ingrediente es “X”» (código `no-se-entiende`).
Se arregla escribiéndolo como en la tabla o en una receta anterior, o añadiéndolo a tus alimentos.

Detrás del nombre se leen solos los colores y estados («rojo», «maduro», «congelado», «cocido»…), el corte que
empieza por «en dados / tiras / rodajas / cubos / lonchas…» y lo que va **pegado** entre paréntesis: lo que pesa
(`(125 g)`, `(unos 400 g)`) o una nota (`(congelada)`, `(de casa: la otra mitad de ayer)`). «De casa» funciona igual
que siempre (ver «Cómo sale la lista de la compra»).

Lo que **ya salió** en un paso anterior (en el orden del texto) es la misma cosa: «el boniato», «las lentejas»,
«del curry» lo enlazan sin cantidad, y «Echa 250 g de pollo» por segunda vez es la tanda de ese paso, como el `@&`
de la v3: sale en el paso con su cantidad y no se vuelve a comprar. «solomillos de pollo» y luego «pollo» son lo mismo.

### Las reglas

1. **Título**: `Plato` o `Etiqueta · Plato` («COCINAS · Curry de pollo»). Compras: empiezan por «Compra» o 🛒.
   Recordatorios: empiezan por «Saca…» o «Descongela…», sin ingredientes.
2. **Primera línea**: `2 RACIONES · 45 min · lo que quieras contar`. El tiempo es el real, cortar incluido.
3. **Segunda línea**: `POR RACIÓN · 610 kcal · 52 g proteína`. Con la tabla de la app: lo calcula
   `node scripts/lint-recetas.mjs receta.txt` (no se inventa: si un alimento no tiene datos, lo dice).
4. **Cada paso**, numerado, en este orden: **verbo** + **ingredientes con cantidad** + **recipiente y fuego** +
   ` · ` **tiempo** + `→` **señal**:
   `6. Baja a fuego medio y echa 2 cdas de cebolla troceada (congelada) y 1 cdta de ajo troceado (congelado) · 3 min removiendo → la cebolla, transparente`
   - Empieza por un **verbo** en imperativo: Corta, Echa, Pasa, Calienta, Baja, Sirve… («Córtalo» vale).
   - **Todo** paso lleva su tiempo tras ` · `, aunque sea `· 20 s`. Lo que va detrás del tiempo («, vuelta a los 2»,
     «removiendo», las marcas de carril) es del tiempo: ahí no se buscan ingredientes.
   - Lo que **espera** (cocer, dorar, hornear) dice cómo se ve cuando ya está: `→ hasta que dore`.
   - El **fuego**: «a fuego bajo / medio / medio-alto / fuerte», «Baja a fuego medio», «Apaga el fuego».
     En un carril, si no lo dice, sigue como en el paso de antes.
   - Una acción por paso. Si se hace en tandas, **una tanda por paso** con su cantidad («Echa 250 g de pollo»).
5. Un ingrediente se **cuenta una vez**: su primera aparición con cantidad, normalmente al cortarlo en `PREPARAR`.
6. **`PREPARAR`**: los cortes, pelados y mezclas, cada uno con su tiempo (`Corta 150 g de pimiento tricolor en tiras · 2 min`).
7. Apartados, en MAYÚSCULAS y solos en su línea: `PREPARAR`, `PROCESO` (o carriles), `AL JUNTAR`,
   `AL TERMINAR`, `NOTAS`, `PLAN B`. La lista `INGREDIENTES` no hace falta; si se pone, tiene que cuadrar con los pasos.
8. **Nada de paréntesis sueltos** en los pasos: solo los pegados a un ingrediente y las marcas de carril.
   Las segundas formas («, o lo que ponga el envase», «o 2-3 min al micro») van en `NOTAS` o en `PLAN B`.
9. Los consejos, en `NOTAS`, nunca detrás de un paso.

Copiloto sabe que una receta es v4 cuando no tiene `@` ni `~{}` y sus pasos llevan el tiempo tras ` · `. Las v3 y
las de antes se siguen leyendo igual.

### Cómo planifica Copiloto (v2.59)

El orden **no lo pone el texto**: lo ponen los ingredientes. Copiloto lee qué usa cada paso y deduce lo que
tiene que ir antes:

- un paso espera solo al último paso anterior que tocó **el mismo ingrediente** (cortar el pimiento va antes de
  echarlo, no antes de poner el pollo al fuego); la sal, el aceite y el agua no cuentan;
- en un mismo recipiente (sartén, olla, cazo, micro, air fryer, horno) los pasos van en el orden escrito;
- lo de `PREPARAR` se hace **cuando hace falta**, y si se puede mientras algo se cuece;
- lo que está **al fuego no espera**: se pone para acabar justo cuando lo necesita el paso siguiente (el aceite no
  humea esperando, el arroz del micro sale caliente al servir) y no empieza si lo siguiente no tiene listo lo suyo;
- `AL JUNTAR` y los pasos de servir esperan a todo; `AL TERMINAR` va detrás.

Sin apartados `CARRIL`, una receta v4 (o v3) se planifica igual: un carril por recipiente, `PREPARAR` y «Montar»
(lo de manos). `(tras PREPARAR)` ya no hace falta.

En el paso a paso se ve **todo el plan** con sus horas; tocar un paso lo abre entero y permite hacerlo antes,
saltarlo o deshacerlo. Al terminar, **1 ración se apunta en Nutrición** de ese día (con `POR RACIÓN` o la tabla) y
esa comida deja de contar como planificada para no sumarla dos veces.

### Carriles (varias cosas a la vez)

Igual que antes (ver «Recetas con carriles» más abajo): `CARRIL NOMBRE (sartén)`, pasos numerados y marcas
`(manos)`, `(espera)`, `(no espera)`, `(tras NOMBRE)`. Desde la v2.58:

- `PREPARAR` es un carril más: se ve en el plan con su tiempo y vale `(tras PREPARAR)`.
- `AL TERMINAR` va detrás de `AL JUNTAR` (enfriar el tupper, guardarlo): antes se quedaba fuera del plan sin avisar.
- Las marcas solo valen con carriles; en una receta con `PROCESO` el linter avisa de que no sirven.

### El linter

Copiloto lo pasa **al leer cada evento** y lo enseña en el paso a paso («3 cosas que la receta no dice bien»);
la receta se puede seguir igual con lo que entiende. Para revisar antes de guardar:

```
node scripts/lint-recetas.mjs docs/recetas-v4/*.txt   # un .txt por evento: título, línea en blanco, descripción
```

Falla, con el paso y la frase, si:

| Código | Qué falla |
|---|---|
| `sin-cantidad` | un ingrediente no aparece en ningún paso con su cantidad |
| `suma` | la lista `INGREDIENTES` dice una cantidad y los pasos suman otra |
| `sin-tiempo` | un paso no tiene tiempo (aunque sea «20 s») |
| `sin-verbo` | un paso no empieza diciendo qué hacer |
| `sin-ing` | un paso no dice con qué ingrediente ni en qué recipiente |
| `no-se-entiende` | lo que el parser no usa: un ingrediente que no conoce («no sé qué ingrediente es “X”»), `@`, `#` o llaves en una v4 (o mal escritos en una v3), paréntesis sueltos, «o …» (otra forma), un segundo tiempo, marcas de carril sin carriles, `→` vacío |
| `carril` | `(tras X)` que no es ningún carril, un carril al fuego sin sartén ni olla… |
| `raciones` / `por-racion` | faltan las raciones o las kcal y la proteína por ración |

Y avisa (sin fallar) de un paso al fuego sin nivel de fuego y de uno que espera sin señal de «ya está».
El script, además, vuelve a pasar el linter con 1, 2, 3 y 4 raciones y compara `POR RACIÓN` con la tabla (±10 %).
Los códigos y los mensajes son los mismos en v3 y v4; la pista de cómo arreglarlo se escribe en el formato de la receta.

### Raciones

En el paso a paso (al empezar y en Ingredientes) se elige **1, 2, 3 o 4 raciones**: todas las cantidades de los
pasos y de la lista se multiplican (y el texto del paso cambia con ellas: «300 g de boniato» → «600 g de boniato»);
«pizca», «al gusto» y «unas gotas» no, y los tiempos tampoco. Ingredientes enseña también **cuánto toca por
ración**. Las recetas de antes de la v3 no se escalan: sus cantidades van en el texto.

### Ejemplo (el curry del 5 de octubre)

```
🍽️ COCINAS · Curry de solomillos y garbanzos con arroz (2 raciones)

2 RACIONES · 45 min · 1 la comes hoy y 1 va a la NEVERA para el jueves. Se acaban el bote de garbanzos y los 500 g de pollo.
POR RACIÓN · 847 kcal · 80 g proteína

PREPARAR
1. Corta 500 g de solomillos de pollo en dados de 2 cm y quita el tendón blanco · 5 min (manos) → dados iguales, sin tendón
2. Seca 500 g de pollo con papel de cocina y salpiméntalo con 1 pizca de sal y 1 pizca de pimienta · 1 min (manos)
3. Corta 150 g de pimiento tricolor en tiras finas · 2 min (manos)
4. Escurre y enjuaga 1 bote de garbanzos cocidos (unos 400 g) · 1 min (manos) → ya no hacen espuma
5. Mezcla en un bol 1 cda de curry tostado, 1 cdta de cúrcuma, 1 cdta de comino y 1 cdta de cilantro molido · 1 min (manos)

CARRIL POLLO (sartén)
1. Calienta 1 cda de AOVE en la sartén a fuego fuerte · 2 min (tras PREPARAR) → humea un poco
2. Echa la primera mitad, 250 g de pollo, en una sola capa · 5 min, vuelta a los 2 → dorado por fuera
3. Pasa 250 g de pollo dorado a un plato · 20 s (manos)
…
```

Entero en [docs/recetas-v4/2026-10-05-1300-curry.txt](recetas-v4/2026-10-05-1300-curry.txt). Las comidas de la semana
del 5 al 11 de octubre están en v4 en [docs/recetas-v4/](recetas-v4/) y, como se escribieron, en v3 en
[docs/recetas/](recetas/): el test `tests/receta-v4.test.mjs` pasa cada v3 a v4 y comprueba que Copiloto saca lo mismo
(ingredientes, cantidades, tiempos, pasos, carriles y nutrición, con 1 a 4 raciones). Hoy cuadran las 20.

### Pasar las recetas v3 a v4

```
node scripts/v3-a-v4.mjs receta.txt                 # la v4 por la salida
node scripts/v3-a-v4.mjs --escribe docs/recetas/*.txt  # encima de cada .txt (solo si cuadra)
node scripts/v3-a-v4.mjs --json eventos.json        # [{id, summary, description}] -> lo mismo con la descripción en v4
```

Cada receta se comprueba al pasarla (lo mismo que el test). Si algo no se puede decir igual en v4 (un `@&` antes de
que el ingrediente salga, una cantidad fija que no es una pizca, un ingrediente detrás del tiempo…) lo dice por
stderr, y si Copiloto leería otra cosa, «NO CUADRA» con qué, y sale con código 1.

## Formato v3 (se sigue leyendo)

El de la v2.58 a la v2.71, inspirado en [Cooklang](https://cooklang.org/docs/spec/): el ingrediente y el reloj van
**dentro del paso** con marcas. Copiloto lo sigue leyendo igual (y lo escala); para eventos nuevos, la v4.

Se inspira en [Cooklang](https://cooklang.org/docs/spec/): el ingrediente y el reloj van **dentro del paso**,
con su cantidad. Copiloto los enlaza solo y saca de ahí la lista de ingredientes (no hace falta escribirla
aparte, y así nunca se desincroniza).

| Se escribe | Qué es | Se lee |
|---|---|---|
| `@pollo{250 g}` | ingrediente con la cantidad de **este** paso | 250 g de pollo |
| `@tomate triturado{400 g}` | varias palabras: el nombre llega hasta la llave | 400 g de tomate triturado |
| `@huevo{2}` | unidades | 2 huevos |
| `@pimiento{150 g}(en tiras finas)` | con su corte | 150 g de pimiento en tiras finas |
| `@garbanzos cocidos{1 bote}(~400 g)` | lo que pesa (para la nutrición y la compra) | 1 bote de garbanzos cocidos, ~400 g |
| `@&pollo{250 g}` | **el mismo de antes**: sale en el paso con su cantidad, pero no se vuelve a sumar | 250 g de pollo |
| `@sal{=1 pizca}` | cantidad fija: no cambia al escalar | 1 pizca de sal |
| `@pimienta{al gusto}` | sin número | pimienta al gusto |
| `250%g`, `20%s` | también vale el `%` de Cooklang | 250 g, 20 s |
| `~{5 min}`, `~huevo{10 min}` | el reloj del paso (con nombre, opcional) | 5 min |
| `#sartén`, `#olla{}` | el recipiente o aparato (una palabra, o con `{}`) | sartén |
| `→ dorado por fuera` | al final: cómo se ve cuando ya está | (sale aparte: «Listo si…») |

Sus reglas son las de la v4 con las marcas: `~{tiempo}` en todo paso, `@&nombre{cantidad}` para lo que ya salió,
`@ingrediente(corte)` como único paréntesis permitido y `#recipiente`.

### De dónde sale la v3 (mirado el 5/10/2026)

- **Cooklang** ([spec](https://cooklang.org/docs/spec/); `cooklang/cooklang-rs`, último commit 3/10/2026): `@ingrediente{cant%ud}`,
  `~{tiempo}`, `#utensilio`, referencias `@&` y cantidades fijas `=`. **Lo imito**: el ingrediente y el reloj van dentro
  del paso, así el enlace ingrediente → paso es automático y la lista sale de los pasos.
- **Mealie** (`mealie-recipes/mealie`, commit 5/10/2026): cada paso guarda `ingredient_references` hacia la lista. El vínculo
  sí; la lista aparte no (es lo que se desincroniza).
- **Tandoor** (`TandoorRecipes/recipes`, commit 3/10/2026): cada `Step` tiene sus `ingredients` y su `time`, y escala raciones.
  **Lo imito**: tiempo y cantidades por paso; raciones que escalan los pasos.
- **KitchenOwl** (`TomBursch/kitchenowl`, commit 26/9/2026): tiempo y raciones solo de la receta; pasos en texto libre. Es lo
  que falló el lunes: no se imita.
- **schema.org/HowToStep**: `text`, `supply`/`tool`, `timeRequired` y `HowToTip` aparte. **Lo imito**: cada paso con su tiempo
  y los consejos fuera de los pasos (en `NOTAS`).
- NYT Cooking, Kitchen Stories y Paprika: apps cerradas; no he podido comprobar cómo modelan su modo cocina, así que no los
  uso como fuente.

## Formato anterior (se sigue leyendo)

Los eventos viejos se leen como siempre: nada se rompe. El linter dice lo que les falta para el formato nuevo.

1. **Título**: `Plato` o `Etiqueta · Plato` («Tupper · Guiso de carne»). Compras: empiezan por «Compra» o 🛒.
   Recordatorios: empiezan por «Saca…» o «Descongela…», sin ingredientes.
2. **Primera línea**: `1 RACIÓN · 40 min · Se acaba X`. El tiempo es el real, cortar incluido.
3. **Cabeceras**, en MAYÚSCULAS y solas en su línea: `INGREDIENTES` (o una por parte: `SALSA`, `ADOBO`),
   `ANTES DE EMPEZAR`, `EN PARALELO`, `PROCESO`, `AL TERMINAR`, `PLAN B`, `NOTAS`.
4. **Un ingrediente por línea**: `· cantidad unidad alimento, preparación (nota)`.
   Ej.: `· 1 boniato (~250 g), pelado en cubos de 2 cm`. Nada de «A + B» en la misma línea.
5. Los **básicos** juntos: `· Básicos: sal, pimienta, AOVE`.
6. Rangos con guion (`3-4 lonchas`), aproximado con `~`. Lo que ya está en casa: `(de casa: el del domingo)`.
   Lo que se termina: `(se acaba)`. Ver «De casa» abajo: solo vale si la nota **empieza** así.
7. Multiplicadores explícitos: `POR TARRO (×2)`. Sin `(×N)`, «POR TARRO» usa los tarros de la primera línea
   (`3 TARROS` → ×3). El multiplicador vale para toda la cantidad de la línea, también para la que va entre paréntesis.
8. Ingredientes **en el orden en que se usan**. Lo de `EN PARALELO` (huevos a cocer) también va en la lista.
9. `ANTES DE EMPEZAR`: todo lo que se pela, corta, pica, sala, descongela o se abre, una cosa por línea.
   Primero lo que espera (la berenjena en sal).
10. `PROCESO`: pasos numerados, **una acción por paso**, y cada paso nombra sus ingredientes.
11. Cada espera con número y unidad: `10 min`, `20 s`. Agitar o dar la vuelta: `10 min, agita a los 5`.
12. Además del tiempo, cómo se ve cuando está: «hasta que dore», «yema aún blanda».
13. Los **consejos** van en `NOTAS`, nunca sueltos detrás de los pasos.
14. Antes de guardar, comprueba: cada ingrediente sale en algún paso, cada alimento de un paso está en la lista
    y los tiempos suman lo que dice la primera línea.

## Recetas con carriles (varias cosas a la vez)

Cuando una receta tiene cosas que van **a la vez** (la pasta cociendo mientras se hace la salsa), en lugar
de `PROCESO` se escribe **un apartado por carril**. Copiloto calcula el orden y las horas: empiezas por lo
que más tarda, haces con las manos lo que toca mientras lo demás espera, y lo que no puede esperar (la pasta)
acaba justo cuando se junta todo. Las recetas sin carriles siguen con `PROCESO`, como siempre.

1. **Un apartado por carril**, en MAYÚSCULAS y solo en su línea: `CARRIL <NOMBRE> (<recipiente>)`.
   El nombre es corto y sin repetir (`AGUA`, `SALSA`, `BOLAS`, `ARROZ`). El recipiente, entre paréntesis:
   `(sartén)`, `(olla)`, `(air fryer)`, `(micro)` o `(horno)`. **Todo carril que va al fuego dice si va en la
   sartén o en una olla**.
2. Dentro de cada carril, **pasos numerados desde 1**, en su orden, uno por acción, con sus minutos:
   `1. Olla con agua y sal al fuego, 8 min hasta que hierva`.
3. Todo lo que **espera** (hervir, cocer, sofreír, hornear, micro, air fryer, reposar) lleva su tiempo con
   número y unidad. Lo que es solo de manos y dura poco (escurrir, servir) puede ir sin tiempo: cuenta 1 min.
4. **Marcas** al final del paso, entre paréntesis, cuando el verbo no lo deja claro:
   - `(manos)`: ocupa las manos todo el rato (`Pica la cebolla y el ajo, 3 min (manos)`);
   - `(espera)`: solo las manos al empezar y luego se espera;
   - `(no espera)`: lo que sale no puede esperar, tiene que acabar justo cuando se junta
     (`La pasta, 9 min (no espera)`). Lo que va detrás en su carril (escurrirla) tampoco espera;
   - `(tras BOLAS)`: este paso empieza cuando acaba el carril BOLAS (`Las albóndigas a la salsa, 12 min (tras BOLAS)`).
5. **`AL JUNTAR`**: lo que se hace cuando acaban todos los carriles (mezclar, servir, repartir en tuppers).
6. Los ingredientes, `ANTES DE EMPEZAR` y `NOTAS`, como siempre. **No se mezcla `PROCESO` con carriles**.
7. La primera línea dice el tiempo **real** con los carriles a la vez (`1 RACIÓN · 20 min`), no la suma.
8. Lo que tiene la cocina lo sabe Copiloto («Mi cocina»: 4 fuegos, 1 sartén, 2 ollas, horno, micro, air fryer):
   no hace falta decir en qué fuego va cada cosa.

Si algo no se entiende, Copiloto lo dice antes de empezar con el carril y el paso (y el linter lo cuenta):
«CARRIL POLLO, paso 1 («Dora el pollo hasta que esté hecho»): no dice cuántos minutos. Uso 5 min.»,
«CARRIL SALSA: no dice si va en la sartén o en una olla», «CARRIL POLLO, paso 2: «(tras VERDURAS)» no es ningún carril».

### Ejemplo con carriles

```
Pasta con tomate y atún
1 RACIÓN · 20 min

INGREDIENTES
· 100 g de pasta
· 1 lata de atún
· 200 g de tomate triturado
· ½ cebolla
· 1 diente de ajo
· Básicos: sal, AOVE

CARRIL AGUA (olla)
1. Olla con agua y sal al fuego, 8 min hasta que hierva
2. La pasta, 9 min (no espera)
3. Escúrrela

CARRIL SALSA (sartén)
1. Pica la cebolla y el ajo, 3 min (manos)
2. Sofríelos con AOVE, 6 min
3. El tomate, 8 min
4. El atún, 1 min

AL JUNTAR
1. Mezcla la pasta con la salsa y sirve
```

Copiloto lo cocina así: agua al fuego (0:00), picar mientras se calienta (0:30), sofreír (3:30), la pasta al
agua a las 9:00 para escurrirla a las 18:00, el atún a las 17:30 y a la mesa a los 20 min. En una sola línea
serían 37 min y la pasta se enfriaría esperando a la salsa.

## Cómo sale la lista de la compra (pestaña Comprar)

Copiloto suma cada ingrediente de las comidas que aún no han empezado, resta lo que hay en la despensa y
enseña lo que falta. Estas reglas no cambian el texto de los eventos: son cómo se lee.

**De casa.** Una nota entre paréntesis solo dice «de casa» si **empieza** por eso: `(de casa: …)`, `(de la nevera)`,
`(del domingo …)`, `(descongelado desde anoche)`, `(lo que queda del bote)`. Palabras sueltas a mitad de una nota
(«de hoy», «la otra», «la otra mitad») no lo activan:

| Línea | Se compra |
|---|---|
| `· 1 huevo (el que cuecen en paralelo, de hoy)` | sí: 1 huevo |
| `· 1 aguacate maduro (usas la mitad hoy; la otra mitad es para mañana)` | sí: 1 aguacate entero |
| `· ½ aguacate (de casa: la otra mitad de ayer, de la nevera)` | no: es de casa |

Lo marcado «de casa» **no se compra nunca**, tampoco si lo hace otra receta del plan (el tarro de overnight oats
del lunes, el huevo cocido del mediodía). En la lista de Comprar no aparece; Copiloto apunta de qué comida sale.

**Unidades y gramos.** Si una línea trae las dos medidas, Copiloto aprende la equivalencia y suma todo en la unidad
contable: `· 1 yogur griego (125 g)` y `· 125 g de yogur griego` son 2 yogures. `(125 g)` es el total de la línea;
`(125 g cada uno)` es por unidad (`2 yogures griegos (125 g cada uno)` = 250 g). Lo que hay en casa en gramos
se resta con la misma equivalencia. Sin equivalencia no se pierde nada: sale `1 + 125 g`. Conviene escribir
la equivalencia en la primera aparición del alimento.

**Redondeo.** Se suma todo, de todas las comidas, y solo al final se redondea **hacia arriba** lo que se compra por
piezas: `ud`, rebanadas, lonchas, rodajas, latas, botes, bolsas, bricks, tarros, paquetes… (3 × ½ tomate = 1,5 → 2;
con 1 en casa → 1). Los gramos y los mililitros no se redondean nunca.

**Origen.** En Comprar, tocar el nombre despliega de qué comidas y líneas sale la cantidad
(`lun 05/10 · Curry … — «1 huevo» → 1`) y la cuenta (`Suman 12 − en casa 2 = 10`). La casilla de la izquierda es
la que marca «comprado».

## Ejemplo

```
Pollo al curry con arroz
1 RACIÓN · 30 min

INGREDIENTES
· 200 g de contramuslos de pollo, en dados de 2 cm
· 1 bolsa de arroz de microondas
· 1 cda de cebolla congelada
· 1 cdta de curry
· Básicos: sal, AOVE

ANTES DE EMPEZAR
· Corta el pollo en dados de 2 cm y sálalo.

PROCESO
1. Sartén con AOVE a fuego medio-alto: el pollo, 6 min, dale la vuelta a los 3.
2. Añade la cebolla y el curry, 2 min, removiendo.
3. El arroz, 3 min al microondas. Todo al plato.

NOTAS
· El curry, con el fuego medio: a fuego fuerte amarga.
```
