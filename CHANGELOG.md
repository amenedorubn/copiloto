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
