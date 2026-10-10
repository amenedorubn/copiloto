# Registro de cambios

Todos los cambios importantes de Copiloto se apuntan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y la numeración sigue [Versionado Semántico](https://semver.org/lang/es/):

- **parche** (2.0.1, 2.0.2…): arreglos y ajustes pequeños.
- **menor** (2.1.0): funciones nuevas.
- **mayor** (3.0.0): rediseños grandes o cambios incompatibles.

Las versiones antiguas vivían en carpetas `v4/` … `v20/`. Ahora cada una es
un tag de git: `v4` → `v0.4.0`, `v13` → `v1.3.0`, `v20` → `v2.0.0`.
Los resúmenes salen de los mensajes de commit de cada versión.

## [2.61.2] - 2026-10-10

### Corregido

- Ensayo a sub-1:36

## [2.61.1] - 2026-10-10

### Corregido

- Ensayo general del 11/10 sin gel: se quitan los avisos del km 6,8 y del km 7 (sin agua a mano no se toma)

## [2.61.0] - 2026-10-10

### Añadido

- Copiloto GPS · la línea azul de lo que corres se guarda en el móvil (IndexedDB) y vuelve entera si Android cierra la app a mitad. Empezar de cero la pisa y «Terminar y reiniciar» la borra
- Plan fijado del ENSAYO GENERAL (domingo 11/10, A Coruña): km 0-1 a 6'45" con la bajada frenada, km 1-7 crucero a 6'25"-6'35" (FC < 148), km 7-12 BLOQUE a 5'12" (el del test del 27-09, que salió verde; FC 160-172), km 12-16 suave a 6'40"-7'00". Gel en el km 7 con aviso 200 m antes. Resumen con el tiempo del bloque
- Plan fijado de la MEDIA MARATÓN DE ROMA (domingo 18/10): km 0-5 a 5'15", km 5-15 a 5'10", km 15 a meta a 5'10" (o lo que quede). Los tiempos de paso cuadran con la tabla de carteles: 26:15 · 52:05 · 1:17:55 · 1:43:45 · meta 1:49:25. Mismo ritmo en cuesta y en llano: la altimetría del GPX de Roma está inflada

### Corregido

- El ensayo salía con el km 1-7 en rojo (como si fuera el bloque) y el km 7-12 a 6'40"-7'00": la línea «km 7-12 ..... RITMO ROMA» del evento no lleva ritmo escrito y se saltaba

## [2.60.0] - 2026-10-10

### Añadido

- Copiloto GPS · los km son los que corres, no el punto de la ruta: un rodeo (semáforo, vuelta a una manzana) o volver unos metros atrás suman al volver a la ruta; un atajo o un rato sin GPS no restan. En la línea del GPS se ve cuánto llevas sobre la ruta («+120 m sobre la ruta»)
- Copiloto GPS · empezar antes de la salida (20 m detrás) o llegar por otro camino que sustituye al principio (por el paseo y entrar en el km 0,4) cuenta lo corrido desde Empezar; ir andando desde casa hasta la salida sigue sin contar, y arrancar a mitad de ruta sigue siendo «ese es mi km»
- Copiloto GPS · botón «Paso el km 7» debajo de la tarjeta, a la derecha: al pasar un cartel de km, tocarlo pone la distancia en ese km justo (el más cercano a lo que marca la app). Lo que viene después se mide desde ahí. Tocarlo otra vez en 6 s lo deshace
- Las cuestas, los avisos de terreno y el punto del plan en el mapa siguen el punto de la ruta, aunque lleves metros de más
- Copiloto GPS · en el mapa se dibuja lo que corres de verdad (línea azul): solo con GPS bueno y suavizado, así que sigue si vas por el otro lado de la calle pero no el baile del GPS. Es solo dibujo, los km no salen de ahí
- Copiloto GPS · vista satélite (botón del globo, debajo del zoom): imágenes de Esri debajo de la ruta, un poco oscurecidas. Se recuerda entre entrenos; sin red, el mapa de siempre

### Cambiado

- Copiloto GPS · la ruta ya no se cambia sola a otra de tus rutas: va siempre la que eliges

## [2.59.0] - 2026-10-05

### Añadido

- Cocina · el plan sale de la receta, no del orden del texto: cada paso espera solo a lo que usa (el pimiento se corta mientras se dora el pollo, no antes de poner el aceite); en un recipiente, en su orden; lo de PREPARAR, cuando hace falta. Las recetas v3 sin carriles escritos se planifican igual (un carril por recipiente)
- Cocina · lo que está al fuego no espera: acaba justo cuando lo necesita lo siguiente (el arroz del micro sale al servir, el aceite no humea esperando) y no empieza si a lo siguiente le falta algo por cortar
- Cocina · pantalla de cocinar nueva: Ahora en grande, En marcha (los relojes, compactos) y El plan entero con hora, recipiente, tiempo y estado; tocar un paso abre su ficha (ingredientes con cantidad, fuego, señal, qué va antes) con Ya lo he hecho, Saltar o Deshacer
- Nutrición · al terminar una comida en el paso a paso, «Apuntar 1 ración en Nutrición» (activado): sus kcal y proteína (POR RACIÓN o la tabla) y los nutrientes de la tabla van a Registrado de ese día, y esa comida deja de contar como Planificado

### Corregido

- Carriles: con lo hecho fuera de orden el plan podía bloquearse; avisos de Hecho en una línea

## [2.58.0] - 2026-10-05

### Añadido

- Cocina · formato v3 de las recetas del calendario (estilo Cooklang, docs/RECETAS-CALENDARIO.md): `@pollo{250 g}(en dados)`, `@&pollo{250 g}` (el mismo de antes), `@sal{=1 pizca}` (no escala), `~{5 min}`, `#sartén` y `→ señal`. La lista de ingredientes sale de los pasos; las recetas viejas se siguen leyendo igual
- Cocina · linter de recetas al leer cada evento y en `scripts/lint-recetas.mjs`: falla si un ingrediente no sale en ningún paso con su cantidad, si la lista y los pasos no suman lo mismo, si un paso no tiene tiempo, no empieza con un verbo o no dice con qué, si hay palabras o marcas que no se usan (paréntesis sueltos, «o …», un segundo tiempo, marcas de carril sin carriles, `@`/`~{}` mal escritos) o si faltan las raciones y las kcal y la proteína por ración. El script lo repite con 1-4 raciones y compara con la tabla
- Cocina · paso a paso: en grande y en orden, qué hacer, lo que usa ESE paso con su cantidad, el fuego, el reloj (empieza solo; lo de manos se quita al dar Hecho) y «Ya está cuando…»; al final, lo que viene después. Bloque «Preparar todo antes de empezar» con su tiempo
- Cocina · fuera de orden: cualquier paso se marca hecho (o se desmarca) sin ir a él; en los carriles, «Hacer otra cosa antes» marca o salta cualquier tarea y el plan se rehace sin adelantar lo que va detrás
- Cocina · raciones de 1 a 4 (cantidades de los pasos y de la lista, el linter vuelve a pasar) y cuánto toca por ración en Ingredientes
- Cocina de prueba: el curry en el formato nuevo

### Corregido

- Carriles: el texto de cada tarea ya no se corta en el primer «:» («Baja a fuego medio» perdía la cebolla y el ajo); PREPARAR / ANTES DE EMPEZAR y AL TERMINAR ya no se quedan fuera del plan sin avisar; «a la mesa» no cuenta lo de AL TERMINAR
- Carriles: una tarea de manos marcada antes de tiempo dejaba las manos ocupadas su tiempo entero y retrasaba lo demás; lo que solo pide un momento de manos y luego espera (poner el agua) va antes que una tarea larga de manos; al acabar el último reloj se termina solo
- Nutrición: «lentejas cocidas» contaban como lentejas secas (352 kcal/100 g en vez de 116); «proteína de cacahuete» contaba como cacahuetes; un tupper de otra receta («tupper de curry de pollo») contaba como el alimento que nombra. Pistachos y lentejas cocidas, de USDA SR Legacy. `scripts/usda-tabla.py` tenía un error de sintaxis
- Las comidas del 5 al 9 de octubre del calendario «Comidas», reescritas en el formato nuevo (también en docs/recetas/)

## [2.57.1] - 2026-10-05

### Corregido

- Cocina: las recetas con carriles se pueden empezar de 0 desde el plan y los carriles (con Deshacer); al abrir una dejada hace más de 10 min sale Seguir / Empezar de 0, y si la receta se ha editado empieza de cero sin arrastrar tareas ni relojes viejos

## [2.57.0] - 2026-10-05

### Añadido

- Cocina: lo de Comprar y Casa dice en qué comidas y días se usa; lo apuntado a mano va con la comida que lo pide (o con la que elijas, o sin día) sin duplicar la línea del plan; en el paso a paso cada ingrediente abre su ficha de casa (si basta para la receta) con «Añadir a la compra», y se vuelve al paso con los relojes y carriles como estaban

## [2.56.2] - 2026-10-05

### Corregido

- Gimnasio: los días cuyo evento no trae ejercicios enseñan en la tarjeta lo que hiciste en Hevy (ejercicios, reps y peso); sin sesión guardada dice «Sin registro»

## [2.56.1] - 2026-10-05

### Corregido

- Micros: la tarjeta gira de ida y de vuelta en cada toque, con animación. Gimnasio: vuelven los ejercicios a la tarjeta del día con el formato corto del calendario («1. EJERCICIO · 50 lbs · 3 × 10»)

## [2.56.0] - 2026-10-04

### Añadido

- Comprar: huecos de nutrientes, los prioritarios que se quedan cortos varios días de las 2 últimas semanas, con qué se arreglan (lo de casa, la lista o A la lista) y la curva de 7 días del que más se repite

## [2.55.0] - 2026-10-04

### Añadido

- Nutrición · Micros: cobertura media de 4 semanas de cada vitamina y mineral (% del mínimo, con lo de suplementos más claro, o solo comida); al tocar se da la vuelta al mapa de calor de 8 semanas

## [2.54.0] - 2026-10-04

### Añadido

- Nutrición · Entreno: carbohidratos por kg según el tipo de día (descanso, gimnasio, calidad, tirada larga), media de 4 semanas contra la banda de la fase, con lo que se queda corto

## [2.53.0] - 2026-10-04

### Añadido

- Nutrición · Fases: la fase de ahora con sus fechas y cómo va hoy (carbohidratos y proteína por kg, energía en % del mantenimiento); en Luego, la tira de las fases de los próximos 6 meses, y al tocar una, sus proporciones en g/kg y su porqué

## [2.52.0] - 2026-10-04

### Añadido

- Nutrición · Tendencias: una curva de 8 semanas con selector (carbohidratos y proteína por kg, fibra, vitamina C, folato) y la banda del objetivo de cada semana; debajo, el peso medio semanal contra lo esperado en cada fase

## [2.51.0] - 2026-10-04

### Añadido

- Nutrición · Semana: energía por día apilada por macros con el mínimo y la adherencia; debajo, carbohidratos por día con su banda y la media de la semana del resto de nutrientes, con lo de suplementos aparte; semanas anteriores

## [2.50.0] - 2026-10-04

### Añadido

- Nutrición · Hoy: la energía en grande (estimado si no hay basal) con los tres macros y, debajo, todos los nutrientes en tiras de rango, con lo que viene de suplementos marcado

## [2.49.0] - 2026-10-04

### Añadido

- Nutrición: subpestañas Hoy · Semana · Tendencias · Fases · Entreno · Micros, gráficas en SVG a mano (nutri-graficas.js) y los datos por día, semana, tendencia, fase, tipo de día, cobertura y huecos (nutricion.js); las vistas llegan una a una

## [2.48.0] - 2026-10-04

### Añadido

- Nutrición: suplementos y pastillas, con su ficha (la misma de Casa, por unidad), cuándo (momento u hora), qué días (todos, entreno, descanso) y dosis; lo que aportan suma a los micros del día en su columna Supl., con aviso discreto si se pasa del máximo tolerable de EFSA; también en Casa → Suplementos y en la Cocina de prueba

## [2.47.0] - 2026-10-04

### Añadido

- Casa: la ficha entera de cada alimento al tocarlo (toda la etiqueta por 100 g y por porción, sin dato en lo que falta, fuente e incompleta); sin ficha, escanear el código o rellenarla a mano con la foto de la etiqueta; Open Food Facts se guarda entero y el Worker guarda todos los campos

## [2.46.1] - 2026-10-04

### Corregido

- Casa: lo que añades ya no se junta con algo solo parecido (la «proteína de cookies» se sumaba a la «proteína whey de chocolate» y no salía), y sin nota ni recuento lo añadido ya cuenta como punto de partida (antes Casa no enseñaba nada)

## [2.46.0] - 2026-10-04

### Añadido

- Cocina: cuatro pestañas, Semana · Comprar · Casa · Nutrición (sin Recetas; las recetas de los eventos «Receta: …» siguen funcionando). Nutrición: la grasa y el basal son opcionales; sin ellos el basal sale de Mifflin-St Jeor y la energía se marca como estimado

## [2.45.1] - 2026-10-04

### Corregido

- Nutrición: las etiquetas de Tus datos, sin mayúsculas

## [2.45.0] - 2026-10-04

### Añadido

- Cocina: pestaña Nutrición. El día (planificado del calendario y registrado por ti, por separado) contra los objetivos de su semana: fase editable con su porqué, tu peso medio, Te falta X; cómete Y, tabla con planificado, registrado, objetivo y %, y registro rápido con favoritos (comer fuera, estimación). Tus datos solo en el móvil. También en la Cocina de prueba

## [2.44.0] - 2026-10-04

### Añadido

- Nutrición, la base: tabla de 75 alimentos de USDA FoodData Central (CC0), nutrientes por ración de cada comida (lo que no se sabe queda sin datos), objetivos por semana según la fase en g/kg y % sobre el mantenimiento con su porqué, carbohidratos según el tipo de día y Te falta X; cómete Y (sin pantalla todavía)

## [2.43.0] - 2026-10-04

### Añadido

- Ajustes: una sola Cocina de prueba con todo dentro (paso a paso con carriles desde Semana, Despensa y Comprar), datos de ejemplo, SIMULACIÓN · no cuenta y sin rastro

## [2.42.0] - 2026-10-04

### Añadido

- Comprar por pasillo del súper: cada alimento dice los días en que se usa (mañana · mié) y su prisa (Hace falta mañana / Puede esperar 3 días), ordenado por el primer día; próxima ida al súper opcional para Comprar ya / Puede esperar; Terminar compra pone cuánto compraste y pasa al Por confirmar de la Despensa; también en la Casa de prueba

## [2.41.0] - 2026-10-04

### Añadido

- Ajustes: Casa de prueba. La pestaña Cocina entera con datos de ejemplo (congelador lleno, comidas para confirmar, una compra y dudas), con SIMULACIÓN · no cuenta y Terminar; no toca tu despensa, ni el calendario, ni Comprar, ni el Worker

## [2.40.0] - 2026-10-04

### Añadido

- Despensa: Por confirmar (la comida que ya acabó: Así fue o Corregir; lo marcado en Comprar: Bien u Otra cantidad; las dudas: Sí, Cuánto o Se acabó), filas con la cantidad clara (240 g · 3 ud), deslizar a la izquierda para Se acabó, ¿Cuánto queda? en un toque (lleno, ¾, ½, ¼, nada), los tuppers del congelador (máx. 3) y sugerencias al añadir

## [2.39.0] - 2026-10-04

### Añadido

- Escáner: tu nombre manda. Un código conocido sale con tu nombre; uno nuevo pregunta cómo lo llamas (propone lo tuyo o lo de casa para no duplicar) y el nombre de Open Food Facts queda como alias con su código, formato, peso por unidad y nutrición con su fuente (alimentos.js). Worker: guarda tus alimentos y todos los tipos de cambio

## [2.38.0] - 2026-10-04

### Añadido

- Ajustes: Cocina de prueba. El paso a paso con carriles de verdad con tres recetas de ejemplo (pasta, albóndigas y una con errores), «SIMULACIÓN · no cuenta», reloj ×1/×10/×30, «Retrasarme 2 min» y Mi cocina para probar; no deja rastro ni apunta lo gastado

## [2.37.0] - 2026-10-04

### Añadido

- Cocina: Mi cocina, editable desde el plan del paso a paso con carriles (fuegos, sartenes, ollas, horno, micro, air fryer, picadora, batidora y tazas); el plan se rehace al cambiarlo

## [2.36.0] - 2026-10-04

### Añadido

- Cocina: paso a paso con carriles. Antes de empezar, el plan en mini-Gantt; luego Ahora (tus manos), Mientras (lo que espera, con su reloj) y Luego (con la hora); Hecho pone el reloj de la espera y el plan se rehace si vas tarde, con la pasta sin esperar

## [2.35.0] - 2026-10-04

### Añadido

- Cocina: recetas con carriles. receta.js lee CARRIL <NOMBRE> (recipiente) y AL JUNTAR con las marcas (manos), (espera), (no espera) y (tras X), y dice qué carril y paso no entiende; carriles.js planifica hacia atrás desde la unión con las manos de una en una y lo que hay en Mi cocina (4 fuegos, 1 sartén, 2 ollas, micro, air fryer, horno) y replanifica si vas tarde

## [2.34.0] - 2026-10-04

### Añadido

- Iconos: Ámsterdam ahora es un molino (como el de la referencia: torre cónica con costuras, cúpula con eje, cuatro aspas de rejilla y casita con puerta) y el Coliseo sale de la ilustración de referencia, simplificada a cuatro grises sin color

## [2.33.1] - 2026-10-04

### Corregido

- Iconos: un solo tulipán para Ámsterdam y Coliseo visto de lado, girado, con el corte en el centro

## [2.33.0] - 2026-10-04

### Añadido

- Iconos de destino corregidos: Eiffel sin mitades en gris, El Castillo como bloque opaco, Ámsterdam con tulipanes, Atomium de frente y Coliseo con la composición de la referencia (muro alto con pilastras y ático, corte inclinado, tramo bajo y muro interior) en tonos sin color; la bandera de México y la Torre de Hércules se quedan igual

## [2.32.0] - 2026-10-04

### Añadido

- Iconos de destino rehechos en vectorial detallado (sin 3D): Eiffel con celosía y barandillas, Atomium en perspectiva con sus nueve esferas, bandera de México con el escudo completo (águila con plumas, serpiente, nopal, lago y corona), El Castillo de Chichén Itzá de lado, casas de canal de Ámsterdam y Coliseo con el lado sur derrumbado; la Torre de Hércules sigue como estaba

## [2.31.0] - 2026-10-03

### Añadido

- Iconos de destino en 3D: renders con luz y sombra, en grises, de la Torre Eiffel, el Atomium, El Castillo de Chichén Itzá, el Coliseo (con el lado sur derrumbado), casas de canal de Ámsterdam y la bandera de México con su escudo; la Torre de Hércules sigue como estaba; marcas de la tira más grandes

## [2.30.1] - 2026-10-03

### Corregido

- Iconos de destino rehechos más simples y fieles: Torre de Hércules como la original, Eiffel reconocible, Atomium limpio, bandera de México sin color con el escudo (águila, serpiente, nopal, lago y corona), El Castillo de Chichén Itzá de lado, casas de canal de Ámsterdam y Coliseo con el lado sur derrumbado

## [2.30.0] - 2026-10-03

### Añadido

- Winter Arc: iconos de destino rehechos con mucho más detalle y más grandes: bandera de México con su escudo, Torre de Hércules con rampa y linterna, Torre Eiffel con celosías, Atomium, casas de canal de Ámsterdam, El Castillo de Chichén Itzá y Coliseo

## [2.29.0] - 2026-10-03

### Añadido

- Winter Arc: cada viaje con el icono de su destino (Torre de Hércules, Eiffel, Ángel de la Independencia, pirámide de Chichén Itzá, casa de canal de Ámsterdam, Atomium y Coliseo) en la tira de la fase, la próxima parada, las listas y el detalle del día

## [2.28.0] - 2026-10-03

### Añadido

- Winter Arc: el calendario de días (con puntos en los días de viaje y el viaje en el detalle del día) se abre en cualquier fase, no solo en la actual; viaje Ámsterdam → Bruselas el 25/11

## [2.27.1] - 2026-10-03

### Corregido

- Winter Arc: viaje a Europa (23–30/11): vuelos Coruña–Madrid–Ámsterdam, Eurostar Bruselas–París–Bruselas el 26/11 y vuelo Bruselas–Madrid el 30/11; subir a Coruña en tren el 19 o 20/11 como viaje posible; la Travesía llega hasta el 29/11 (5 semanas) y la Vuelta empieza el 30/11 (3 semanas); el miliario cuenta a Ámsterdam (24/11) y a la Vuelta (30/11)

## [2.27.0] - 2026-10-03

### Añadido

- Rutas: importar un GPX en el móvil (solo IndexedDB, nunca en el repo) con distancia, desnivel y perfil, y elegirla como ruta activa; Entrenos: paso «punto de decisión» (sin respuesta en 15 s se elige «No», nunca «Sí») que arranca 4 rectas de 20 s por cadencia con techo de ritmo; rodaje por sensación sin avisos por ir más lento; decisión guardada con valor y hora; domingo 04/10: 12 km con la decisión en el km 9,8; arreglo: arrancar con km −1 en rutas de ida y vuelta rompía el canto del km

## [2.26.1] - 2026-10-03

### Corregido

- Cocina: la coma decimal ya no parte los ingredientes (150,5 ml, 1,5 kg y 1,5 l son una cantidad; 1,5 cm es una medida de corte, no 5 unidades), tanto en las recetas del calendario como en la nota de la despensa (1,1 kg de rigatoni)

## [2.26.0] - 2026-10-03

### Añadido

- Cocina: Comprar enseña de qué recetas y líneas sale cada cantidad (tocar el nombre; la casilla compra) y suma bien unidades y gramos del mismo alimento (1 yogur = 125 g); lo que se compra por piezas sube al entero (aguacate 1, no ½) y los gramos no; «de casa» solo vale al principio de la nota (los huevos «de hoy» y el aguacate de la nota ya cuentan) y lo de casa que hace otra receta del plan, como los tarros de overnight oats, no se compra

## [2.25.1] - 2026-10-02

### Corregido

- Despensa: dos tuppers distintos ya no se juntan (albóndigas con pasta y con arroz son dos cosas; dos iguales sí se suman), y la comida que se lleva un tupper lo saca de casa

## [2.25.0] - 2026-10-02

### Añadido

- Despensa: mover cualquier cosa a otra zona (y ahí se queda), y Añadir con su cantidad: un campo Cuánto o todo junto («plátanos 4», «arroz 1 kg»); banana cuenta como plátano

## [2.24.0] - 2026-10-02

### Añadido

- Cocina: la pestaña Tengo pasa a llamarse Despensa, con seis zonas (Congelador, Nevera, Fruta y verdura, Despensa dulce, Despensa salada y Especias; lo seco de la nota se reparte solo); lo comprado lleva cantidad («Cuánto» en el carro) y el escáner la sabe (la del paquete por cuántos compras); en la despensa, tocar algo deja decir cuánto queda; la Claude que planea las comidas tiene en Obsidian cómo escribir las recetas para que Copiloto las entienda

## [2.23.0] - 2026-10-02

### Añadido

- Cocina: Comprar solo cuenta las comidas que aún no han empezado, junta cada alimento (el pan una vez) y pregunta «¿te queda?» cuando no se sabe (Me queda); Tengo descuenta solo lo que ya has comido, con Recuento para decir todo lo que hay y «Para Claude» para copiárselo; Semana con la tarjeta de lo que toca arriba y la semana debajo (lo pasado en gris, «No la hice»); recetas del calendario bien leídas (nada se pierde, consejos que no son pasos, tiempos como «5 min, agitar, 5 min más»); paso a paso nuevo: «Antes de empezar» con lo que hay que cortar, ir a cualquier paso, mirar otro sin salir, relojes que siguen al cambiar de paso, listas de pasos e ingredientes y cuánto queda; Recetas ya no sale cortado

## [2.22.0] - 2026-09-30

### Añadido

- Cocina: se pasa de una subpestaña a otra deslizando el dedo a los lados

### Cambiado

- Cocina: Ahora y Semana, juntas en Semana (lo que toca ya va en grande en HOY). Cada comida, por días, abre su paso a paso con un toque; fuera la lista de ingredientes de debajo de la tarjeta
- Comprar: solo el alimento y su cantidad (sumada si sale en dos comidas), sin agrupar por comida

### Corregido

- Comprar ya no enseña apartados de la receta como «ANTES DE EMPEZAR» ni consejos («El pimentón va solo en el adobo…»): un apartado desconocido en mayúsculas ya no es de ingredientes, «Antes de empezar» son pasos y una frase no es un alimento
- «2 lomos de salmón» ya no pierde el «de» («Lomos salmón»)

## [2.21.0] - 2026-09-30

### Añadido

- Cocina en 5 subpestañas fijas arriba (Ahora, Semana, Comprar, Tengo, Recetas): cada cosa en su sitio y sin scroll largo
- Tengo: lo que hay en casa por zonas (una fila por zona; al tocarla, lo que hay dentro). Tocar algo: «Se acabó» o «Se acabó · a la lista». Añadir y escanear entran solos: ya no hay que pasárselo a Claude
- Comprar: lo que falta para las comidas de los próximos 7 días, agrupado por comida, y lo que apuntes tú. Al marcarlo pasa a Tengo («En el carro», y se puede desmarcar)
- Lo apuntado en Cocina se guarda también en el Worker (/cocina): el móvil y Chrome ven lo mismo
- App Android: escanear con la cámara con el escáner de Google Play Services (sin pedir permiso de cámara)
- Al cocinar, lo gastado se resta de lo que tienes si va en lo mismo (300 g de 1 kg de arroz: quedan 700 g)

### Corregido

- La compra ya no enseña la lista de compra de la nota (ya hecha) ni «De tu nota»: lo de una compra con fecha pasada cuenta como que ya está en casa

## [2.20.0] - 2026-09-30

### Añadido

- Pestaña Cocina (lo que toca, paso a paso, la compra, Mis alimentos de tu nota de Obsidian y escanear lo comprado con sus calorías) y HOY pone en grande lo que toca por la hora: el entreno a la suya y luego cada comida
- Rutina con horas del calendario «Claude», paso a paso desde la línea del día
- Gimnasio: el peso que toca en cada ejercicio (el de la última vez en Hevy; si llegaste al tope de repeticiones en todas las series, sube 5 lb)
- App Android: el informe de cada salida apunta el ritmo actual cada 20 s

### Corregido

- App Android: si la voz falla antes de sonar se reintenta, y con la otra voz, en vez de pasar la salida entera al audio de la web, que le quitaba el sonido a Spotify (30/09)
- App Android: la pantalla se apaga en carrera aunque el GPS nativo aún esté arrancando al tocar Empezar (el 30/09 se quedó encendida los 44 min)

## [2.19.1] - 2026-09-29

### Corregido

- App Android: el informe de cada salida apunta también el móvil, la versión de Android y la del WebView (primera versión que llega sin cable)

## [2.19.0] - 2026-09-29

### Añadido

- App Android: GPS y voz con la pantalla apagada (notificación con km, tiempo, ritmo, Pausa y «¿Cómo voy?»), informe de cada salida que se guarda solo, el APK nuevo se instala sin cable desde Ajustes y el gesto atrás ya no saca de la app a mitad de entreno
- App Android: Ajustes → «Pantalla en carrera» (se apaga sola o siempre encendida) y «Compartir el último informe»

### Corregido

- Al reabrir la app en la pantalla del GPS sin haber empezado vuelve «Probar aviso con la música puesta»

## [2.18.1] - 2026-09-29

### Corregido

- App Android: fuera la opción de bajar la música (no se notaba); queda callarla y que siga sola, o no tocarla

## [2.18.0] - 2026-09-29

### Añadido

- App Android: vuelve la voz de tu móvil (Miro queda a elegir, sin internet) y, mientras habla, la música se calla y sigue sola (Android no deja bajarla de otra app por debajo del 20 %)

## [2.17.2] - 2026-09-29

### Corregido

- App Android: Ajustes → «Música mientras habla»: bajarla, pausarla y que siga sola, o no tocarla, con un botón para probar un aviso; entre avisos seguidos la música se queda baja

## [2.17.1] - 2026-09-29

### Corregido

- App Android: la voz Miro suena unos 22 dB más alta (salía 30 dB por debajo del pitido y con música no se oía)

## [2.17.0] - 2026-09-29

### Añadido

- App Android: con Spotify sonando, cada aviso baja la música (o la pausa, a elegir en Ajustes) y la devuelve sola al acabar: el pitido también es nativo

## [2.16.2] - 2026-09-29

### Corregido

- Ajustes → «Pasar la conexión a la app Android»: un toque en Chrome le pasa a la app la dirección del Worker y la clave

## [2.16.1] - 2026-09-29

### Corregido

- App Android: las actualizaciones se bajan con su SHA-256 (el que da GitHub en la release), que el actualizador exige

## [2.16.0] - 2026-09-29

### Añadido

- App Android (APK con Capacitor 8): la web va dentro y se actualiza sola desde las releases; voz Miro sin internet que baja la música y la devuelve; pantalla encendida nativa. En la web, los .js de la app van red primero en el service worker

## [2.15.0] - 2026-09-29

### Añadido

- Estadísticas de carrera y gimnasio (4 semanas, km por semana, carga, lo mejor, progresión por ejercicio con 1RM estimado); la ficha de gym compara cada ejercicio con la última vez; transiciones de ida y vuelta entre pantallas

## [2.14.0] - 2026-09-29

### Añadido

- Motion design: la tarjeta crece hasta la ficha y vuelve a su sitio, contenido en cascada (280 ms, ease-out, sin rebote); la Simulación entra y sale con transición; Arc queda fuera

## [2.13.0] - 2026-09-29

### Añadido

- Transicion suave (fundido y deslizamiento de 250 ms) al abrir y cerrar la ficha de actividad; sin animar con movimiento reducido, sin soporte o con GPS/cinta en marcha

## [2.12.2] - 2026-09-29

### Corregido

- La Torre de Hércules calcada de la foto: cuerpo esbelto con la rampa, cornisa, remate que se estrecha, linterna y aguja

## [2.12.1] - 2026-09-29

### Corregido

- La Torre de Hércules de verdad (bloque cuadrado con la rampa, cuerpo alto y cúpula) y fuera el viaje a A Coruña de noviembre

## [2.12.0] - 2026-09-29

### Añadido

- Winter Arc más limpio: fuera de Ajustes, sin Hoy ni revisión semanal, la línea de la hoja de ruta ya no pisa las fases, la fuerza no se hunde con reglas nuevas y el Faro es la Torre de Hércules

## [2.11.0] - 2026-09-29

### Añadido

- Winter Arc sin ajustes: diseño fijo en anillos; reglas, fases y viajes fijos (el estudio empieza en el Foro, el 3/11 a Ciudad de México); el sueño de Huawei se importa desde su sección

## [2.10.0] - 2026-09-29

### Añadido

- Winter Arc en HOY bajo la semana y encima del entreno, con su color; cinco fases de 4 semanas: Calzada, Foro (Roma), Travesía (México), Vuelta y Faro

## [2.9.0] - 2026-09-29

### Añadido

- Winter Arc desde el 1 de septiembre en cuatro etapas (Calzada, Tierra firme, Travesía, Faro) con cuenta atrás, sueño de Huawei y días sin datos que no cuentan; la cinta vuelve a enseñar los km
- Cinta: los km hechos y los que quedan vuelven a verse bajo el anillo (el rediseño del 24/09 los había ocultado), y el tiempo del siguiente bloque dice «dura 3:52»
- Winter Arc: empieza el 1/9 (122 días, 18 semanas); ya no hay prólogo
- Etapas «Hoja de ruta»: I Calzada (hasta la carrera de Roma), II Tierra firme, III Travesía (México y noviembre), IV Faro (Navidad en A Coruña), con miliario (días al siguiente destino), tira de días con los viajes, «Lo que pide la etapa» y acta al sellarla. Viajes editables en Ajustes del Arc
- Lo que no se sabe no es un fallo: días sin datos que no cuentan, caminata sin registro que no se exige, «hecho sin registrar» para lo automático, y nunca «fallo»: «a medias»
- Sueño de Huawei Health: se importa en Ajustes del Arc el fichero de scripts/salud-arc.mjs y «Dormir 7 h o más» se marca solo; media, hora de acostarse y de levantarse
- Arreglos de la revisión: la fuerza no se hunde con reglas sin datos, la migración respeta reglas y etapas cambiadas, el objetivo tardío se guarda entero

## [2.8.0] - 2026-09-28

### Añadido

- Winter Arc en etapas: Hacia Roma, De Roma a México, México y noviembre de viajes, y Diciembre; cada una con su fuerza, días y km, y editables en Ajustes del Arc

## [2.7.0] - 2026-09-28

### Añadido

- Winter Arc con sentido: fuerza de 0 a 100 % que sube cada día cumplido (como Loop Habit Tracker), tus km, horas y kg frente a septiembre, y anillos en la tarjeta del día

## [2.6.1] - 2026-09-28

### Corregido

- Winter Arc: la pantalla es solo tu temporada y lo que se configura va en Ajustes del Arc (engranaje), con el diseño lo primero

## [2.6.0] - 2026-09-28

### Añadido

- Arc rediseñado: cuatro diseños para elegir (A anillos, B línea del día, C temporada, D cuadrícula), reglas precargadas y tema claro
- Arc: se elige en Ajustes › Arc › Diseño; por defecto D (fila compacta en HOY y cuadrícula de 13 semanas × 7 días). Los cuatro comparten datos y lógica
- Arc: reglas precargadas: «Cumplir el plan de Entreno» (automática: sesión del calendario hecha en Strava/Hevy; sin sesión o con descanso, cuenta sola), «Dormir 7 h o más» y «20 min de estudio o lectura»
- Arc: un objetivo de texto (vacío hasta que lo escribas), días cumplidos que solo suman, aviso con 2 fallos seguidos y revisión el domingo; en caso de error, botón Reintentar
- Arc: acento ámbar (el turquesa era una huella típica de diseño hecho por IA); reglas de diseño y cómo se comprueban en docs/DISENO-ARC.md
- Ajustes › Tema: oscuro (por defecto), claro o como el móvil, solo para HOY, hojas, Arc y Simulación
- Capturas de las cuatro propuestas en docs/propuestas-arc/ y revisión automática (scripts/capturas-arc.mjs)

## [2.5.0] - 2026-09-28

### Añadido

- Winter Arc (temporada 1/10–31/12 con prólogo en septiembre) y la simulación en su propia pantalla
- Arc: de 3 a 5 reglas de sí/no, automáticas (Strava/Hevy) o manuales; se editan hasta el 30/09 y se bloquean el 1/10
- Arc: una línea en la agenda («Arc · Día 12/92 · Semana 2») con los checks del día y un aviso discreto con 2 fallos seguidos
- Arc: pantalla con la cuadrícula de 92 días, % por regla, revisión semanal (domingo) y el prólogo de septiembre en gris
- Ajustes: la simulación pasa a su pantalla («Simulación ›»); el diario de voz se queda en Ajustes
- Tests de días, semanas y prólogo (`node --test tests/*.test.mjs`)

## [2.4.2] - 2026-09-28

### Corregido

- Un solo ritmo por km: las cuestas solo cambian el ritmo (y se cantan) si son de verdad: 300 m y 15 s/km, o 200 m y 25 s/km

## [2.4.1] - 2026-09-28

### Corregido

- El ritmo actual sale de la velocidad del GPS (media de 20 s) y ya no baila; el simulador mete ruido de GPS como un móvil de verdad

## [2.4.0] - 2026-09-28

### Añadido

- Probar el copiloto desde casa (Ajustes → Probar el copiloto) y diario de voz de cada entreno; al empezar ya no se pisa la frase del tramo

## [2.3.8] - 2026-09-27

### Corregido

- Arreglo de la voz: la página ya no manda de qué web viene y el audio de voz de Google suena; vuelven los avisos de geles

## [2.3.7] - 2026-09-27

### Corregido

- La voz sale como audio (el mismo camino que los pitidos) si la del móvil no arranca; tocar la pantalla dice km y tiempo; barra de instalar arriba en el entreno

## [2.3.6] - 2026-09-27

### Corregido

- Vuelta al código de la 2.3.2 (antes de los geles), que funcionaba en carrera

## [2.3.5] - 2026-09-27

### Corregido

- Voz del GPS: habla al empezar y al retomar, un toque en la pantalla dice km y tiempo, y se ve en pantalla si la voz suena

## [2.3.4] - 2026-09-27

### Corregido

- Voz del GPS: si se queda muda reintenta y sale un botón para reactivarla; al reabrir a mitad de carrera, un toque y dice dónde vas y cuánto llevas

## [2.3.3] - 2026-09-26

### Corregido

- aviso de geles por voz

## [2.3.2] - 2026-09-24

### Cambiado

- Con el mes abierto, subir el contenido pliega el mes siguiendo el dedo hasta dejar la semana

## [2.3.1] - 2026-09-24

### Cambiado

- Deslizar para cambiar de día, y de semana en la tira de la semana; hacia abajo en la semana se abre el mes

## [2.3.0] - 2026-09-24

### Añadido

- Tamaño en Ajustes (grande, normal, pequeño y micro) para todo menos GPS y cinta; los días ya hechos dibujan en la tarjeta la ruta real de Strava

## [2.2.0] - 2026-09-24

### Añadido

- Agenda del día: comidas y rutina bajo el entreno, con sus horas; las notas (y las rectas) pasan a un botón en la tarjeta

## [2.1.1] - 2026-09-24

### Corregido

- Icono: cache-busting con ?v= y descarga manual del PNG para Nova Launcher

## [2.1.0] - 2026-09-24

### Añadido

- Icono nuevo: laurel + corredor, 3 fondos elegibles en Ajustes

## [2.0.3] - 2026-09-24

### Seguridad

- Ajustes ya no muestra la dirección del Worker ni la clave. Con la conexión
  guardada solo dice "Conectado", con los botones "Actualizar calendario" y
  "Cambiar conexión".
- Los campos salen vacíos solo si falta la clave o al pulsar "Cambiar
  conexión", junto a un recordatorio de dónde sacar la clave (QR o una nueva
  en Cloudflare). La dirección es opcional: vacía usa la de siempre.

## [2.0.2] - 2026-09-24

### Seguridad

- La clave (APP_KEY) ya no se puede ver en Ajustes: fuera el botón "Ver la
  clave" y el campo sale vacío. Si se deja vacío se sigue usando la guardada;
  escribir otra la sustituye.

### Añadido

- El tag y la GitHub Release de cada versión los crea solo un Action al
  llegar a `main`; ya no hay que subir tags a mano.

## [2.0.1] - 2026-09-24

### Cambiado

- "Instalar como app" sale de la pantalla del entreno y pasa a Ajustes. Si el
  navegador no ofrece instalarla, Ajustes explica cómo añadirla a la pantalla
  de inicio; si ya es la app instalada, lo dice.
- "Activar GPS y dar permiso" también está en Ajustes, con el estado del
  permiso y un botón para probar el GPS.
- En el entreno, el botón de GPS solo aparece si el GPS no tiene permiso o
  falla.
- El GPS del entreno libre se enciende solo al abrirlo.

## [2.0.0] - 2026-09-24

Corresponde a la carpeta `v20/`.

### Cambiado

- La raíz del repo pasa a ser la app (antes era una copia vieja de v12).
  Se instala desde https://amenedorubn.github.io/copiloto/ y se llama
  "Copiloto", sin número.
- Las carpetas `v4/` … `v19/` se borran: su código queda en los tags
  `v0.4.0` … `v1.9.0`.
- Los GPX sueltos de la raíz se borran: son los mismos que hay en `rutas/`.

### Añadido

- Versión única en `version.json`, `APP_VERSION` (index.html) y la caché de
  `sw.js` (`copiloto-2.0.0`); `scripts/bump.mjs` las sube a la vez y un
  Action comprueba que coinciden.
- En Ajustes: versión y fecha, botón "Comprobar actualización" y
  "Actualizar ahora" (desactivado con un entreno de GPS o cinta en marcha).
  Al abrir la app, comprobación silenciosa: si hay versión nueva sale un
  puntito en el icono de Ajustes, sin recargar nada.
- GPS con mapa a pantalla completa y pausa, series en oscuro con anillo y
  perfil de la sesión, gesto atrás en todas las pantallas, gym con todas las
  series de Hevy.
- El evento "Gym A" sin plan cuenta como gimnasio y se marca hecho con la
  sesión de Hevy; etiqueta Hevy en lo hecho.
- Calendario y lo hecho desde el 31/08 (inicio del plan de Roma), X en los
  días pasados sin hacer y "Después" solo del mismo día.
- Eventos sin plan (series, tirada, rodaje, cinta) se reconocen y se marcan
  hechos; lo hecho en un día sin nada apuntado sale arriba como tarjeta.
- Distancias de ruta redondeadas (11,99 → 12 km), m/km con coma y miniaturas
  de ruta del mismo tamaño.
- Rectas al acabar el rodaje: explicadas en la tarjeta, dónde hacerlas en cada
  ruta y guiadas por voz en el GPS (recta, vuelta andando, siguiente).
- Rutas 6K ZAPATOCA (vuelta cerrada) y 6.1K ZAPATOCA (RECTAS); los días con
  rectas eligen la 6.1K y la recta son sus últimos 100 m (bajar rápido, subir
  despacio).
- Rectas visibles y guiadas: tramo amarillo en el mapa, barra de progreso
  abajo, aviso 25 m antes y ritmos por tramo (suave, acelera, rápido) con
  ritmo instantáneo.

### Aviso

- `v20/` se queda intacta de momento porque es la app instalada en el móvil.
  **v20/ se eliminará tras el 18 de octubre; se convertirá en redirección a la
  raíz.**

## [1.9.0] - 2026-09-24

### Añadido

- Entrenos hechos desde Strava (tick, resumen y ficha con gráficas).

## [1.8.0] - 2026-09-24

### Cambiado

- Pantalla principal nueva (tarjeta viva), semana en tira, hojas y notas por
  apartados.

## [1.7.0] - 2026-09-24

### Cambiado

- El terreno a la vista (pendiente, metros, desnivel y ritmo de cada trozo).
- Menos que leer corriendo; reloj y distancia dentro del mapa.
- Fuera el ritmo del tramo; debajo solo ritmo actual y del km.
- Sin ritmo repetido en la línea del terreno; barra de trozos más grande.

## [1.6.0] - 2026-09-24

### Cambiado

- El TEST del 27/09 con su ruta, pantalla de ritmo + FC objetivo e icono
  nuevo.
- El bloque del km (km, ritmo y FC objetivo) arriba y en grande.
- Pantalla de carrera con aire y «respecto al plan» bajo el mapa.

## [1.5.0] - 2026-09-23

### Cambiado

- Metros en vez de minutos, mapa hacia donde vas, ruta que se elige sola.

## [1.4.0] - 2026-09-22

### Añadido

- Calendario de entrenos desde Google Calendar.
- La clave del Worker puede entrar por la URL, para meterla con un QR.
- Elegir la ruta del día entre las que ya has corrido; la ruta elegida ya se
  puede correr.
- Biblioteca de rutas: se bajan una vez y viven en el Worker.
- Calle: ritmos por terreno, sin cuelgues al acabar el plan y enganche fino.

### Corregido

- El copiloto lee los eventos tal y como están escritos.
- La posición deja de filtrar rutas y pasa a decir a cuánto queda cada salida.
- Las rutas de ida y vuelta dejan de descolocar el kilometraje.
- El entreno de calle sobrevive a que el móvil mate la pestaña.
- Traer las rutas de Strava se quedaba sin CPU a media faena.

## [1.3.0] - 2026-09-22

### Cambiado

- La cinta arranca a la vez que el reloj de la máquina.

## [1.2.0] - 2026-09-21

### Añadido

- Modo cinta sin GPS, por tiempo, con selector GPS / Cinta.
- Modo cinta: cuenta atrás de 10 s al pulsar Empezar.

## [1.1.0] - 2026-09-20

### Corregido

- El tramo de Roma vuelve a seguir la ruta en el mapa.

## [1.0.0] - 2026-09-20

### Cambiado

- Engancha también con señal regular y canta el bloque de Roma.

## [0.9.0] - 2026-09-20

### Cambiado

- El plan se ancla al kilómetro de la ruta, no al km 0.

## [0.8.0] - 2026-09-20

### Cambiado

- La distancia se calcula pegada a la ruta del plan.

## [0.7.0] - 2026-09-20

### Cambiado

- Más espacio para el mapa (oculta GPS/Probar cuando ya no hacen falta), FC
  en una línea, mapa más grande, ritmo medio del km actual.

## [0.6.0] - 2026-09-20

### Cambiado

- Plan por banda de ritmo, ajuste manual en carrera, FC más visible,
  vibración al terminar aviso.

## [0.5.0] - 2026-09-20

### Cambiado

- Spotify sin mediaSession, pantalla sin scroll, FC objetivo por km, aviso al
  empezar ritmo de Roma.

## [0.4.0] - 2026-09-19

### Añadido

- Primera versión guardada en su carpeta (`v4/`). Los commits no describen
  los cambios.

[2.61.2]: https://github.com/amenedorubn/copiloto/releases/tag/v2.61.2
[2.61.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.61.1
[2.61.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.61.0
[2.60.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.60.0
[2.59.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.59.0
[2.58.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.58.0
[2.57.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.57.1
[2.57.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.57.0
[2.56.2]: https://github.com/amenedorubn/copiloto/releases/tag/v2.56.2
[2.56.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.56.1
[2.56.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.56.0
[2.55.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.55.0
[2.54.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.54.0
[2.53.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.53.0
[2.52.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.52.0
[2.51.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.51.0
[2.50.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.50.0
[2.49.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.49.0
[2.48.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.48.0
[2.47.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.47.0
[2.46.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.46.1
[2.46.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.46.0
[2.45.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.45.1
[2.45.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.45.0
[2.44.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.44.0
[2.43.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.43.0
[2.42.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.42.0
[2.41.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.41.0
[2.40.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.40.0
[2.39.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.39.0
[2.38.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.38.0
[2.37.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.37.0
[2.36.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.36.0
[2.35.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.35.0
[2.34.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.34.0
[2.33.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.33.1
[2.33.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.33.0
[2.32.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.32.0
[2.31.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.31.0
[2.30.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.30.1
[2.30.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.30.0
[2.29.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.29.0
[2.28.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.28.0
[2.27.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.27.1
[2.27.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.27.0
[2.26.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.26.1
[2.26.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.26.0
[2.25.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.25.1
[2.25.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.25.0
[2.24.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.24.0
[2.23.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.23.0
[2.22.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.22.0
[2.21.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.21.0
[2.20.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.20.0
[2.19.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.19.1
[2.19.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.19.0
[2.18.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.18.1
[2.18.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.18.0
[2.17.2]: https://github.com/amenedorubn/copiloto/releases/tag/v2.17.2
[2.17.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.17.1
[2.17.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.17.0
[2.16.2]: https://github.com/amenedorubn/copiloto/releases/tag/v2.16.2
[2.16.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.16.1
[2.16.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.16.0
[2.15.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.15.0
[2.14.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.14.0
[2.13.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.13.0
[2.12.2]: https://github.com/amenedorubn/copiloto/releases/tag/v2.12.2
[2.12.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.12.1
[2.12.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.12.0
[2.11.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.11.0
[2.10.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.10.0
[2.9.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.9.0
[2.8.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.8.0
[2.7.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.7.0
[2.6.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.6.1
[2.6.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.6.0
[2.5.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.5.0
[2.4.2]: https://github.com/amenedorubn/copiloto/releases/tag/v2.4.2
[2.4.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.4.1
[2.4.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.4.0
[2.3.8]: https://github.com/amenedorubn/copiloto/releases/tag/v2.3.8
[2.3.7]: https://github.com/amenedorubn/copiloto/releases/tag/v2.3.7
[2.3.6]: https://github.com/amenedorubn/copiloto/releases/tag/v2.3.6
[2.3.5]: https://github.com/amenedorubn/copiloto/releases/tag/v2.3.5
[2.3.4]: https://github.com/amenedorubn/copiloto/releases/tag/v2.3.4
[2.3.3]: https://github.com/amenedorubn/copiloto/releases/tag/v2.3.3
[2.3.2]: https://github.com/amenedorubn/copiloto/releases/tag/v2.3.2
[2.3.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.3.1
[2.3.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.3.0
[2.2.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.2.0
[2.1.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.1.1
[2.1.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.1.0
[2.0.3]: https://github.com/amenedorubn/copiloto/releases/tag/v2.0.3
[2.0.2]: https://github.com/amenedorubn/copiloto/releases/tag/v2.0.2
[2.0.1]: https://github.com/amenedorubn/copiloto/releases/tag/v2.0.1
[2.0.0]: https://github.com/amenedorubn/copiloto/releases/tag/v2.0.0
[1.9.0]: https://github.com/amenedorubn/copiloto/releases/tag/v1.9.0
[1.8.0]: https://github.com/amenedorubn/copiloto/releases/tag/v1.8.0
[1.7.0]: https://github.com/amenedorubn/copiloto/releases/tag/v1.7.0
[1.6.0]: https://github.com/amenedorubn/copiloto/releases/tag/v1.6.0
[1.5.0]: https://github.com/amenedorubn/copiloto/releases/tag/v1.5.0
[1.4.0]: https://github.com/amenedorubn/copiloto/releases/tag/v1.4.0
[1.3.0]: https://github.com/amenedorubn/copiloto/releases/tag/v1.3.0
[1.2.0]: https://github.com/amenedorubn/copiloto/releases/tag/v1.2.0
[1.1.0]: https://github.com/amenedorubn/copiloto/releases/tag/v1.1.0
[1.0.0]: https://github.com/amenedorubn/copiloto/releases/tag/v1.0.0
[0.9.0]: https://github.com/amenedorubn/copiloto/releases/tag/v0.9.0
[0.8.0]: https://github.com/amenedorubn/copiloto/releases/tag/v0.8.0
[0.7.0]: https://github.com/amenedorubn/copiloto/releases/tag/v0.7.0
[0.6.0]: https://github.com/amenedorubn/copiloto/releases/tag/v0.6.0
[0.5.0]: https://github.com/amenedorubn/copiloto/releases/tag/v0.5.0
[0.4.0]: https://github.com/amenedorubn/copiloto/releases/tag/v0.4.0
