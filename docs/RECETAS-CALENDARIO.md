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
   Lo que se termina: `(se acaba)`.
7. Multiplicadores explícitos: `POR TARRO (×2)`.
8. Ingredientes **en el orden en que se usan**. Lo de `EN PARALELO` (huevos a cocer) también va en la lista.
9. `ANTES DE EMPEZAR`: todo lo que se pela, corta, pica, sala, descongela o se abre, una cosa por línea.
   Primero lo que espera (la berenjena en sal).
10. `PROCESO`: pasos numerados, **una acción por paso**, y cada paso nombra sus ingredientes.
11. Cada espera con número y unidad: `10 min`, `20 s`. Agitar o dar la vuelta: `10 min, agita a los 5`.
12. Además del tiempo, cómo se ve cuando está: «hasta que dore», «yema aún blanda».
13. Los **consejos** van en `NOTAS`, nunca sueltos detrás de los pasos.
14. Antes de guardar, comprueba: cada ingrediente sale en algún paso, cada alimento de un paso está en la lista
    y los tiempos suman lo que dice la primera línea.

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
