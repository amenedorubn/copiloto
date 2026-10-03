// Eventos del calendario «Comidas» del 4 al 9 de octubre de 2026 y la despensa del 03/10/2026,
// con el texto tal cual está en el calendario y en la nota de Obsidian (no se toca).
const e = (uid, fecha, hora, fin, titulo, texto) => ({ uid, fuente: "comida", fecha, hora, fin, titulo, texto });

export const DESPENSA_3_OCT = [
  "DESPENSA EN VIVO — última actualización: 03/10/2026, desde Copiloto (Tengo). REGLA: este bloque manda. Si un alimento no aparece aquí, NO está en casa.",
  "",
  "CONGELADOR: ajo troceado, cebolla troceada, jengibre troceado, hielo, mango, arándanos, melón congelado, 1 bolsa de arroz de microondas, 2 tuppers de albóndigas, un poco de melón congelado, 1 frite allumette.",
  "",
  "NEVERA: queso canario, 200 g de pavo, 2 lonchas de jamón serrano, leche semi abierta, espinacas, ½ mozzarella, 1 vasito de avena.",
  "",
  "FRUTA Y VERDURA: boniato, 1 tomate, 2 plátanos, 500 g de pimiento tricolor fresco.",
  "",
  "DESPENSA DULCE: gofio, miel, nueces, pistachos, avena, avena molida, mix sésamo/chía/lino, cacao puro, proteína de cacahuete, crema de cacahuete, pasas, 2 bricks de leche.",
  "",
  "DESPENSA SALADA: 2 huevos, 1,1 kg de rigatoni Alberto Poiatti, 300 g de hélices tricolor, 1 bote de lentejas cocidas, 1 bote de garbanzos cocidos, 5 latas de atún, 3 latas de maíz, 800 g de tomate triturado, pan rallado, sal, 8 panes rústicos Lidl, AOVE, 1 de palomitas, 3 dientes de ajo.",
  "",
  "ESPECIAS: orégano, albahaca, perejil, mostaza, canela de Ceilán, comino, anís, nuez moscada, curry, curry tostado, clavo, pimentón dulce, chile, cúrcuma, cilantro, pimienta negra, ajo en polvo."
].join("\n");

export const EVENTOS = [
  e("dom-pre", "2026-10-04", "08:20", "08:35", "🥛 Pre-carrera · Leche, plátano y dátiles",
`1 RACIÓN · 5 min · Nada nuevo antes de la tirada. Sin café.

INGREDIENTES
· 250 ml de leche semi
· 1 plátano
· 3 dátiles sin hueso

PROCESO
1. Bebe los 250 ml de leche semi despacio.
2. Come el plátano, pelado.
3. Come los 3 dátiles sin hueso.

NOTAS
· Sales a las 9:00: acabas 25 min antes.`),
  e("dom-post", "2026-10-04", "10:45", "11:00", "🥤 Post-carrera · Batido de recuperación",
`1 RACIÓN · 5 min · Dentro de los 30 min de terminar el rodaje. El estándar.

INGREDIENTES
· 300 ml de leche semi
· 30 g de avena
· 1 plátano, pelado
· 20 g de crema de cacahuete
· 1 scoop de proteína de cacahuete
· 1 cdta de canela de Ceilán
· 2 hielos

PROCESO
1. Echa en la batidora la leche semi al fondo, luego la avena, el plátano, la crema de cacahuete y la proteína de cacahuete.
2. Pulsos cortos, 20 s.
3. Añade la canela y los 2 hielos y bate 10 s.

NOTAS
· Si queda muy espeso, 50 ml más de leche.`),
  e("dom-com", "2026-10-04", "12:30", "12:55", "🍽️ COCINAS · Rigatoni al atún con pimiento y tomate",
`1 RACIÓN · 25 min · A las 12:30, antes de que cocinen tus compañeros. Hoy abres el bote de tomate triturado.

INGREDIENTES
· 100 g de rigatoni
· 1 cda de cebolla troceada (congelada)
· 1 cdta de ajo troceado (congelado)
· 150 g de pimiento tricolor fresco, en tiras finas
· 200 g de tomate triturado (del bote de 800 g que abres hoy)
· 1 cdta de orégano
· 1 cdta de pimentón dulce
· 2 latas de atún, escurridas
· Básicos: sal, pimienta, AOVE

ANTES DE EMPEZAR
· Pon agua con sal a hervir en la pota.
· Corta los 150 g de pimiento tricolor en tiras finas.
· Escurre las 2 latas de atún.

PROCESO
1. Echa los rigatoni al agua hirviendo, 11 min, hasta que estén al dente.
2. Mientras, sartén con AOVE a fuego medio: la cebolla y el ajo congelados, 3 min.
3. Añade el pimiento, 5 min, hasta que se ablande.
4. Añade el tomate triturado con el orégano y el pimentón, 8 min a fuego bajo.
5. Añade el atún, 2 min, sin deshacerlo del todo.
6. Escurre los rigatoni y mézclalos con la salsa 1 min. Sal y pimienta al gusto.

NOTAS
· El bote de tomate, con su tapa, a la nevera: quedan 600 g (lunes 400 g, martes 200 g).`),
  e("dom-mer", "2026-10-04", "18:00", "18:15", "🍎 Merienda · Dátiles, pistachos y mandarina",
`1 RACIÓN · 2 min · Sin preparación.

INGREDIENTES
· 3 dátiles sin hueso
· 20 g de pistachos
· 1 mandarina

PROCESO
1. Pela la mandarina y come todo junto: dátiles, pistachos y mandarina.`),
  e("dom-cena", "2026-10-04", "20:30", "21:00", "🌙 Crema de calabaza + tostadas de pavo, queso canario y tomate",
`1 RACIÓN · 8 min · Cena ligera. Se acaba el primer brick de crema.

INGREDIENTES
· 1 brick de crema de calabaza (350 ml)
· 2 rebanadas de pan rústico
· 4 lonchas de pavo (~60 g)
· 30 g de queso canario, en lonchas finas
· ½ tomate, en rodajas
· 1 pizca de nuez moscada
· Básicos: sal, pimienta, AOVE

ANTES DE EMPEZAR
· Corta el ½ tomate en rodajas.
· Corta los 30 g de queso canario en lonchas finas.

PROCESO
1. Calienta la crema de calabaza: cazo 4 min a fuego medio, o microondas 2-3 min tapada, removiendo a la mitad.
2. Tuesta las 2 rebanadas de pan rústico.
3. Monta sobre cada tostada: pavo, queso canario y rodajas de tomate.
4. Sirve la crema con un hilo de AOVE, pimienta y la nuez moscada.`),
  e("lun-des", "2026-10-05", "08:45", "09:15", "☀️ Desayuno de teletrabajo · huevos, tomate, mozzarella y jamón",
`1 RACIÓN · 10 min · Al volver del Gym A. Sin café: leche con proteína.

INGREDIENTES
· 2 huevos
· ½ tomate
· ~30 g de mozzarella (la mitad de la media bola que tienes)
· 2 lonchas de jamón serrano
· 1 rebanada de pan rústico
· 250 ml de leche semi
· 1 scoop de proteína de cookies
· 1 pizca de orégano
· Básicos: sal, AOVE

ANTES DE EMPEZAR
· Corta el ½ tomate en rodajas.
· Trocea los ~30 g de mozzarella.

PROCESO
1. Bate los 2 huevos con sal. Sartén con un poco de AOVE a fuego BAJO, removiendo sin parar.
2. Retíralos a los 3 min, aún algo líquidos. La mozzarella, fuera del fuego.
3. Tuesta la rebanada de pan rústico. Ponle el tomate en rodajas, el jamón serrano y el orégano.
4. Mezcla la leche semi con el scoop de proteína de cookies en un vaso, hasta que no queden grumos.`),
  e("lun-com", "2026-10-05", "13:00", "13:45", "🍽️ COCINAS · Curry de pollo y garbanzos con arroz (2 raciones)",
`2 RACIONES · 45 min · 1 la comes hoy y 1 va a la NEVERA para el jueves. Se acaban el bote de garbanzos y los 500 g de pollo.

INGREDIENTES
· 500 g de solomillos de pollo, en dados de 2 cm
· 2 cdas de cebolla troceada (congelada)
· 1 cdta de ajo troceado (congelado)
· 150 g de pimiento tricolor fresco, en tiras finas
· 1 cda de curry tostado
· 1 cdta de cúrcuma
· 1 cdta de comino
· 1 cdta de cilantro molido
· 400 g de tomate triturado (del bote abierto ayer)
· 1 bote de garbanzos cocidos (~400 g), escurridos y enjuagados
· 2 bolsas de arroz de microondas (una está en el congelador)
· 1 huevo
· Básicos: sal, pimienta, AOVE

ANTES DE EMPEZAR
· Corta los 500 g de pollo en dados de 2 cm y sálalos.
· Corta los 150 g de pimiento tricolor en tiras finas.
· Escurre y enjuaga los garbanzos.

EN PARALELO
· 1 huevo a cocer en un cazo con agua, 10 min. Enfría con agua fría, pélalo y a la nevera: es para la cena de esta noche.

PROCESO
1. Pota grande con AOVE a fuego fuerte: el pollo en dos tandas, 5 min cada una, en una sola capa, hasta que dore. Reserva en un plato.
2. Baja a fuego medio: la cebolla y el ajo congelados, 3 min.
3. Añade el pimiento, 4 min, hasta que se ablande.
4. APAGA el fuego 20 s: curry tostado, cúrcuma, comino y cilantro, removiendo.
5. Añade el tomate triturado y el pollo con su jugo. 8 min a fuego bajo, destapado.
6. Añade los garbanzos, 5 min más, hasta que espese. Sal y pimienta.
7. Primera bolsa de arroz, 3 min al microondas. Tu plato: arroz y la mitad del curry encima.
8. Segunda bolsa de arroz, 3 min al microondas. Mézclala con la otra mitad del curry en un tupper.

AL TERMINAR
· Enfría el tupper 20 min en la encimera y pásalo a la NEVERA, no al congelador. Se come el jueves.

NOTAS
· Con el fuego alto, el curry amarga: por eso se apaga el fuego en el paso 4.`),
  e("lun-mer", "2026-10-05", "17:30", "17:45", "🍎 Merienda · Yogur griego, plátano y nueces",
`1 RACIÓN · 3 min · Sin preparación.

INGREDIENTES
· 1 yogur griego (125 g)
· 1 plátano
· 15 g de nueces

PROCESO
1. Pela el plátano y córtalo en rodajas sobre el yogur griego.
2. Parte las nueces con la mano y échalas por encima.`),
  e("lun-cena", "2026-10-05", "21:00", "21:15", "🌙 Tostada de aguacate, huevo cocido y pavo",
`1 RACIÓN · 8 min · Cena ligera. Usas el huevo cocido del mediodía.

INGREDIENTES
· 1 aguacate maduro (usas la mitad hoy; la otra mitad es para mañana)
· 1 rebanada de pan rústico
· 1 huevo cocido (de casa: el del mediodía)
· 4 lonchas de pavo (~60 g)
· Un puñado de espinacas crudas, al lado (opcional)
· Básicos: sal, pimienta, AOVE

ANTES DE EMPEZAR
· Corta el aguacate por la mitad. La mitad que no usas, con hueso, va a un tupper y a la nevera para mañana.

PROCESO
1. Tuesta la rebanada de pan rústico.
2. Machaca la mitad del aguacate con sal, pimienta y un hilo de AOVE.
3. Corta el huevo cocido en rodajas.
4. Monta sobre el pan: el aguacate, el pavo y el huevo.
5. Las espinacas crudas, al lado del plato.`),
  e("lun-tarros", "2026-10-05", "21:30", "21:45", "🥣 Prepara 2 tarros de overnight oats (jue + vie)",
`2 TARROS · 8 min · Para el jueves y el viernes. A la NEVERA, nunca al congelador. El miércoles te toca el vasito que ya tienes.

INGREDIENTES
· 80 g de avena
· 10 g de mix de semillas (sésamo, chía, lino)
· 120 ml de leche semi
· 2 yogures griegos (125 g cada uno)
· 2 scoops de proteína (30 g cada uno, de cookies o de cacahuete)
· 30 g de crema de cacahuete
· 160 g de arándanos congelados
· 10 g de miel
· 1 pizca de canela de Ceilán

PROCESO
1. En cada tarro: 1 scoop de proteína con 60 ml de leche semi, removiendo hasta que no queden grumos.
2. En cada tarro: 1 yogur griego, 5 g de miel, 40 g de avena, 5 g de semillas y la canela. Remueve bien.
3. En cada tarro: 15 g de crema de cacahuete en el centro y 80 g de arándanos congelados encima. Tapar.

NOTAS
· Las nueces NO van dentro: se echan al abrirlo en la oficina.
· Los arándanos se descongelan solos en la nevera.`),
  e("mar-des", "2026-10-06", "08:45", "09:15", "☀️ Desayuno de teletrabajo · huevos, tomate, mozzarella y jamón",
`1 RACIÓN · 10 min · Al volver de la cinta. Sin café: leche con proteína. Se acaba la mozzarella.

INGREDIENTES
· 2 huevos
· ½ tomate
· ~30 g de mozzarella (lo que queda de la media bola)
· 2 lonchas de jamón serrano
· 1 rebanada de pan rústico
· 250 ml de leche semi
· 1 scoop de proteína de cookies
· 1 pizca de orégano
· Básicos: sal, AOVE

ANTES DE EMPEZAR
· Corta el ½ tomate en rodajas.
· Trocea los ~30 g de mozzarella.

PROCESO
1. Bate los 2 huevos con sal. Sartén con un poco de AOVE a fuego BAJO, removiendo sin parar.
2. Retíralos a los 3 min, aún algo líquidos. La mozzarella, fuera del fuego.
3. Tuesta la rebanada de pan rústico. Ponle el tomate en rodajas, el jamón serrano y el orégano.
4. Mezcla la leche semi con el scoop de proteína de cookies en un vaso, hasta que no queden grumos.`),
  e("mar-com", "2026-10-06", "13:00", "13:40", "🍽️ COCINAS · Lentejas con boniato y pimiento + 2 huevos (2 raciones)",
`2 RACIONES · 40 min · 1 la comes hoy con 2 huevos y 1 va al CONGELADOR para el viernes. Se acaban el bote de lentejas, el boniato, el pimiento y el tomate triturado.

INGREDIENTES
· 1 boniato (~300 g), pelado en cubos de 1,5 cm
· 100 g de pimiento tricolor fresco, en dados pequeños
· 2 cdas de cebolla troceada (congelada)
· 1 cdta de ajo troceado (congelado)
· 1 cdta de pimentón dulce
· 1 cdta de comino
· 200 g de tomate triturado (lo que queda del bote)
· 150 ml de agua
· 1 bote de lentejas cocidas (~400 g), escurridas y enjuagadas
· 2 huevos
· Básicos: sal, pimienta, AOVE

ANTES DE EMPEZAR
· Pela el boniato y córtalo en cubos de 1,5 cm.
· Corta los 100 g de pimiento tricolor en dados pequeños.
· Escurre y enjuaga las lentejas.

PROCESO
1. Pota con AOVE a fuego medio: la cebolla y el ajo congelados, 3 min.
2. Añade el pimiento, 3 min, hasta que se ablande.
3. APAGA el fuego 20 s: pimentón y comino, removiendo. Con fuego alto el pimentón amarga.
4. Añade el tomate triturado, el agua y el boniato. Tapa y cuece a fuego medio-bajo 15 min, hasta que el boniato se pinche sin resistencia.
5. Añade las lentejas, 5 min más destapado, hasta que espese. Sal y pimienta.
6. Pasa la mitad de las lentejas a un tupper.
7. Sartén con un poco de AOVE a fuego medio: los 2 huevos, 3 min, con la yema aún blanda. Ponlos sobre tu plato de lentejas.

AL TERMINAR
· Enfría el tupper 20 min en la encimera y pásalo al CONGELADOR. Se saca el jueves por la noche.`),
  e("mar-mer", "2026-10-06", "17:30", "17:45", "🍎 Merienda · Dátiles, pistachos y mandarina",
`1 RACIÓN · 2 min · Sin preparación.

INGREDIENTES
· 3 dátiles sin hueso
· 20 g de pistachos
· 1 mandarina

PROCESO
1. Pela la mandarina y come todo junto: dátiles, pistachos y mandarina.`),
  e("mar-cena", "2026-10-06", "21:00", "21:15", "🌙 Crema de calabaza + tostada de aguacate y jamón",
`1 RACIÓN · 8 min · Cena ligera. Se acaban el aguacate y el segundo brick de crema.

INGREDIENTES
· 1 brick de crema de calabaza (350 ml)
· 1 rebanada de pan rústico
· ½ aguacate (de casa: la otra mitad de ayer, de la nevera)
· 2 lonchas de jamón serrano
· 1 pizca de nuez moscada
· Básicos: sal, pimienta, AOVE

PROCESO
1. Calienta la crema de calabaza: cazo 4 min a fuego medio, o microondas 2-3 min tapada, removiendo a la mitad.
2. Tuesta la rebanada de pan rústico.
3. Machaca el ½ aguacate con sal, pimienta y un hilo de AOVE. Ponlo sobre el pan con el jamón serrano encima.
4. Sirve la crema con un hilo de AOVE, pimienta y la nuez moscada.

NOTAS
· Esta noche no hay tareas de cocina después de cenar: a las 21:30 solo sacas el tupper del congelador.`),
  e("mar-aviso", "2026-10-06", "21:30", "21:35", "❄️ Saca el tupper de albóndigas con pasta a la nevera",
`Pasa el tupper de ALBÓNDIGAS CON PASTA del CONGELADOR a la NEVERA. Si no lo haces ahora, mañana no tienes comida para la oficina.`),
  e("mie-des", "2026-10-07", "09:00", "09:20", "🥣 Desayuno de oficina · plátano + vasito de avena",
`1 RACIÓN · 2 min · Nada que preparar en casa.

INGREDIENTES
· 1 plátano, por el camino
· 1 vasito de overnight oats (de casa: el que ya tienes en la nevera)
· 15 g de nueces, al abrirlo

PROCESO
1. Mete el plátano y el vasito en la mochila.
2. En la oficina: abre el vasito y echa las nueces por encima.`),
  e("mie-com", "2026-10-07", "14:00", "14:30", "🍽️ Tupper · Albóndigas con pasta + mandarina",
`1 RACIÓN · 5 min · Es el tupper de albóndigas con pasta. Nada que preparar en casa.

INGREDIENTES
· 1 tupper de albóndigas con salsa y pasta (descongelado desde anoche)
· 1 mandarina, de postre

PROCESO
1. En la oficina: microondas 3-4 min con el tupper tapado, removiendo a la mitad. Nunca a máxima potencia de golpe.
2. Mandarina de postre.`),
  e("mie-mer", "2026-10-07", "17:30", "17:45", "🥤 Merienda · Mini batido de proteína",
`1 RACIÓN · 5 min · Para llegar al açai con la proteína ya cubierta.

INGREDIENTES
· 300 ml de leche semi
· 1 plátano
· 1 scoop de proteína de cacahuete
· 15 g de crema de cacahuete
· 2 hielos

PROCESO
1. Echa en la batidora la leche semi al fondo, luego el plátano, la proteína de cacahuete y la crema de cacahuete.
2. Pulsos cortos, 20 s.
3. Añade los 2 hielos y bate 10 s.

NOTAS
· Si queda muy espeso, 50 ml más de leche.`),
  e("mie-cena", "2026-10-07", "20:30", "21:30", "🍽️ Cena fuera · Bowl de açai con una amiga",
`Cenas fuera: bowl de açai con una amiga. Nada que preparar.`),
  e("jue-des", "2026-10-08", "09:00", "09:20", "🥣 Desayuno de oficina · plátano + overnight oats",
`1 RACIÓN · 2 min · Nada que preparar en casa.

INGREDIENTES
· 1 plátano, por el camino
· 1 tarro de overnight oats (de casa: el primero de los 2 que montaste el lunes)
· 15 g de nueces, al abrirlo

PROCESO
1. Mete el plátano y el tarro en la mochila.
2. En la oficina: abre el tarro y echa las nueces por encima.`),
  e("jue-com", "2026-10-08", "14:00", "14:30", "🍽️ Tupper · Curry de pollo y garbanzos con arroz + mandarina",
`1 RACIÓN · 5 min · Es el tupper del curry, hecho el lunes. Nada que preparar en casa.

INGREDIENTES
· 1 tupper de curry de pollo y garbanzos con arroz (de la nevera)
· 1 mandarina, de postre

PROCESO
1. En la oficina: microondas 3-4 min con el tupper tapado, removiendo a la mitad. Nunca a máxima potencia de golpe.
2. Mandarina de postre.`),
  e("jue-pre", "2026-10-08", "17:30", "17:45", "🍌 Pre-rodaje · Plátano y dátiles",
`1 RACIÓN · 2 min · 60 min antes del rodaje de las 18:30. Sin preparación.

INGREDIENTES
· 1 plátano
· 3 dátiles sin hueso

PROCESO
1. Pela el plátano y cómelo.
2. Come los 3 dátiles sin hueso, con un vaso de agua.`),
  e("jue-cena", "2026-10-08", "20:00", "20:15", "🌙 Revuelto de huevos con pimiento y pavo + tostada",
`1 RACIÓN · 12 min · Cena tras el rodaje. Se acaba el pavo y el pimiento.

INGREDIENTES
· 100 g de pimiento tricolor fresco, en tiras finas
· 4 lonchas de pavo (~60 g), en tiras
· 3 huevos
· 1 rebanada de pan rústico
· 1 pizca de pimentón dulce
· Básicos: sal, pimienta, AOVE

ANTES DE EMPEZAR
· Corta los 100 g de pimiento en tiras finas.
· Corta las 4 lonchas de pavo en tiras.
· Bate los 3 huevos con sal.

PROCESO
1. Sartén con un chorrito de AOVE a fuego medio: el pimiento con sal, 5 min, hasta que se ablande.
2. Añade el pavo, 1 min.
3. Baja a fuego BAJO. Añade los huevos batidos, removiendo sin parar 2-3 min. Retira aún cremoso.
4. Tuesta la rebanada de pan rústico.
5. Sirve el revuelto sobre la tostada con pimienta y el pimentón dulce.`),
  e("jue-aviso", "2026-10-08", "21:00", "21:05", "❄️ Saca las lentejas a la nevera",
`Pasa el tupper de LENTEJAS del CONGELADOR a la NEVERA. Si no lo haces ahora, mañana a las 15:00 no tienes comida.`),
  e("vie-des", "2026-10-09", "09:00", "09:20", "🥣 Desayuno de oficina · plátano + overnight oats",
`1 RACIÓN · 2 min · Nada que preparar en casa.

INGREDIENTES
· 1 plátano, por el camino
· 1 tarro de overnight oats (de casa: el segundo de los 2 que montaste el lunes)
· 15 g de nueces, al abrirlo

PROCESO
1. Mete el plátano y el tarro en la mochila.
2. En la oficina: abre el tarro y echa las nueces por encima.`),
  e("vie-tent", "2026-10-09", "12:00", "12:15", "🍎 Tentempié · Mandarinas y pistachos",
`1 RACIÓN · 2 min · Sin preparación. Para aguantar hasta la comida de las 15:00.

INGREDIENTES
· 2 mandarinas
· 20 g de pistachos

PROCESO
1. Pela las 2 mandarinas y come con los pistachos.`),
  e("vie-com", "2026-10-09", "15:00", "15:15", "🍽️ Lentejas con boniato y pimiento + 2 huevos a la plancha",
`1 RACIÓN · 12 min · Llegas a las 15:00. Se acaban las lentejas.

INGREDIENTES
· 1 tupper de lentejas con boniato y pimiento (descongelado desde anoche)
· 2 huevos
· Básicos: sal, pimienta, AOVE

PROCESO
1. Lentejas al microondas 3 min con el tupper tapado, removiendo a la mitad.
2. Sartén con un poco de AOVE a fuego medio: los 2 huevos con sal, 3 min, con la yema aún blanda.
3. Pasa las lentejas al plato y pon encima los 2 huevos con pimienta.`),
  e("vie-cena", "2026-10-09", "21:00", "21:15", "🌙 Sándwich caliente de queso canario, jamón y tomate + yogur con miel y nueces",
`1 RACIÓN · 15 min · Cena ligera, víspera de viaje. Se acaban el queso canario y el tomate.

INGREDIENTES
· 2 rebanadas de pan rústico
· 40 g de queso canario, en lonchas finas
· 2 lonchas de jamón serrano
· ½ tomate, en rodajas
· 1 yogur griego (125 g)
· 1 cdta de miel (~5 g)
· 10 g de nueces
· Básicos: sal, pimienta

ANTES DE EMPEZAR
· Corta el ½ tomate en rodajas.
· Corta los 40 g de queso canario en lonchas finas.

PROCESO
1. Monta el sándwich: una rebanada de pan rústico, el queso canario, el jamón serrano, el tomate con sal y pimienta, y la otra rebanada encima.
2. Ninja Crispi en AIR FRY, 6 min, con vuelta a los 3, hasta que el queso se funda y el pan quede crujiente.
3. Yogur griego en un cuenco con la miel y las nueces partidas por encima.

NOTAS
· Esta noche te acuestas a las 23:05: mañana el vuelo es a las 7:15.`)
];

// El mismo plan, con la cena del lunes sin la nota («· 1 aguacate maduro»)
const NOTA_AGUACATE = "· 1 aguacate maduro (usas la mitad hoy; la otra mitad es para mañana)";
export const EVENTOS_NUEVO = EVENTOS.map((x) => x.uid !== "lun-cena" ? x
  : { ...x, texto: x.texto.replace(NOTA_AGUACATE, "· 1 aguacate maduro") });

// Lo que debe salir en Comprar con esa despensa (nombre → cantidad)
export const COMPRAR_ESPERADO = {
  "Plátano": "6", "Dátiles": "12", "Mandarina": "6", "Crema de calabaza": "2 bricks", "Tomate": "1", "Huevos": "10",
  "Jamón serrano": "6 lonchas", "Solomillos de pollo": "500 g", "Arroz de microondas": "1 bolsa", "Yogur griego": "4", "Aguacate": "1"
};
