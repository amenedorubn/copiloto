# Cómo escribir una comida en el calendario «Comidas»

Para la Claude que planea las comidas. Copiloto lee cada evento y lo convierte en lista de la compra,
despensa y paso a paso. Si el texto sigue estas reglas, no se pierde nada (como el boniato sin cortar).

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

Si algo no se entiende, Copiloto lo dice antes de empezar con el carril y el paso:
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
