/* ===========================================================================
   VIAJE · guía del día en CDMX (v2.82.0)
   ---------------------------------------------------------------------------
   Viaje.pinta(c): el miércoles 4 de noviembre de 2026 en Ciudad de México.
   Arriba el mapa esquemático del Centro, debajo el horario. Cada parada lleva
   «Mapa» (Google Maps) y, si es un sitio, su guía por secciones (lo esencial,
   historia, qué buscar, curiosidades, consejos).
   Reproductor abajo: pausa y sigue, frase anterior, sección anterior y
   siguiente, velocidad (se recuerda en copiloto.viaje.vel).
   Voz: speechSynthesis (en el APK, la nativa de nativo.js), frase a frase.
   Si en unos segundos no arranca, pasa al mp3 de Google, como habla().
   Batería: nada se mueve mientras no hables; sin wake lock (la pantalla se
   puede apagar); el reloj de «ahora» va cada minuto y solo con la app a la
   vista; al salir de la pantalla se para todo.
   =========================================================================== */
(function () {
"use strict";

var DIA = "2026-11-04";
var GM = "https://maps.google.com/?cid=";
var RUTA = function (d) { return "https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=" + encodeURIComponent(d); };

/* ---------------------------------------------------------------------------
   Paradas. s/e: hora · pin: número en el mapa · mov: trayecto
   g: secciones de la guía [[título, párrafo, párrafo…], …]
   --------------------------------------------------------------------------- */
var P = [
  { s:"8:30", e:"9:00", t:"🎒 Preparar la mochila", d:"Powerbank y cable, mapa offline, gorra, crema solar, pesos y tarjeta, monedas para baños.", $:"$0" },
  { s:"9:00", e:"9:10", t:"🛒 Soriana: agua para el día", d:"Botella de 1,5 L. Metro al lado: División del Norte (L3).", $:"$15–25 💳", map:GM+"2748762233231824542", pin:1 },
  { s:"9:10", e:"9:55", t:"🚇 Soriana → Zócalo", d:"División del Norte → Hidalgo, cambio → Zócalo/Tenochtitlan. Sales directo a la plaza.", l:["L3","L2"], $:"$5", map:RUTA("Zócalo, Ciudad de México"), mov:1 },

  { s:"9:55", e:"10:15", t:"📸 Zócalo + Palacio Nacional (fuera)", n:"Zócalo", q:["mexicas", "moctezuma", "cortes", "hidalgo"], d:"El Palacio es el edificio largo del lado este. Baño: Sanborns de los Azulejos con un café.", $:"$0", map:GM+"17814017966680692477", pin:2, g:[
    ["Lo esencial",
      "Estás en la Plaza de la Constitución, la plaza principal de México y una de las más grandes del mundo. Todo el mundo la llama el Zócalo.",
      "El nombre oficial viene de la Constitución de Cádiz de 1812, la que hicieron las Cortes españolas y que también se juró aquí, cuando México todavía era la Nueva España.",
      "Lo de Zócalo tiene una historia curiosa. En el siglo diecinueve se planeó levantar en el centro un gran monumento a la Independencia. Solo se llegó a construir la base, el zócalo, que en arquitectura es el pedestal. Durante años la plaza tuvo en medio un pedestal vacío, y la gente empezó a quedar en el zócalo. El nombre se quedó, y hoy casi cualquier ciudad mexicana llama zócalo a su plaza principal."],
    ["Tenochtitlan bajo tus pies",
      "Debajo de esta plaza estaba el corazón de Tenochtitlan, la capital de los mexicas, a los que solemos llamar aztecas. La fundaron en 1325 en un islote del lago de Texcoco. Cuando llegaron los españoles, en 1519, era una de las ciudades más grandes del mundo, probablemente con más habitantes que Sevilla o que cualquier ciudad de la península.",
      "La ciudad estaba unida a tierra firme por grandes calzadas que cruzaban el lago. Una iba hacia el norte, hasta el cerro del Tepeyac, donde esta tarde vas a ver la Basílica de Guadalupe. Otra salía hacia el oeste, por donde hoy pasa la calle Tacuba. Y otra iba al sur. La ciudad tenía canales, mercados enormes y un recinto sagrado con decenas de templos, justo al norte de donde estás, donde ahora se ven la Catedral y el Templo Mayor.",
      "Hernán Cortés entró en la ciudad en noviembre de 1519 y fue recibido por Moctezuma. Tras una guerra y un largo asedio, la ciudad cayó el 13 de agosto de 1521. Los españoles la arrasaron y construyeron encima la nueva capital del virreinato, con calles rectas en cuadrícula. Por eso hoy, si te fijas, el Centro es un tablero muy ordenado."],
    ["El Palacio Nacional",
      "El edificio larguísimo que ocupa todo el lado este de la plaza es el Palacio Nacional. Está construido sobre las llamadas casas nuevas de Moctezuma, su palacio. Después de la conquista, Hernán Cortés se quedó con el terreno, y más tarde fue la residencia de los virreyes de la Nueva España durante casi trescientos años. En 1692 un motín por la escasez de maíz acabó con el palacio en llamas, y se reconstruyó.",
      "Desde la Independencia es la sede del poder: hoy es la oficina y la residencia del presidente de la república.",
      "Fíjate en el balcón central, encima de la puerta principal. Allí cuelga la campana de Dolores, la que hizo sonar el cura Miguel Hidalgo la madrugada del 16 de septiembre de 1810 para llamar a la gente a levantarse contra el gobierno español. Es el inicio de la guerra de Independencia. Cada 15 de septiembre, a las once de la noche, el presidente sale a ese balcón, toca esa misma campana y grita vivas a México y a los héroes de la Independencia ante la plaza llena. Es el famoso Grito.",
      "Dentro, en la escalera principal y en los corredores del patio, están los murales de Diego Rivera sobre la historia de México, desde el mundo prehispánico hasta el siglo veinte. Hoy no entras, pero si algún día vuelves, la entrada es gratis y piden un documento de identidad."],
    ["Qué mirar alrededor",
      "Gírate despacio y recorre la plaza. Al norte, la Catedral Metropolitana, con sus dos torres, y pegado a ella, a la derecha, el Sagrario, con una fachada barroca muy recargada. Al este, el Palacio Nacional. Al sur, los edificios del gobierno de la ciudad, el antiguo ayuntamiento. Al oeste, los soportales del Portal de Mercaderes, que lleva siglos dedicado al comercio, y el edificio del Nacional Monte de Piedad, la casa de empeños más antigua del país, que según la tradición ocupa el solar del palacio de Axayácatl, donde se alojaron Cortés y sus hombres cuando llegaron a la ciudad.",
      "En el centro, la bandera monumental. Cada día hay una ceremonia con soldados para izarla por la mañana y bajarla por la tarde."],
    ["Curiosidades",
      "El Zócalo es el gran escenario del país. Aquí se celebran conciertos gratuitos con cientos de miles de personas, las grandes manifestaciones, el desfile militar del 16 de septiembre, y en invierno a veces se monta una pista de hielo. A principios de noviembre puede seguir montada parte de la gran ofrenda de Día de Muertos.",
      "Toda esta zona se hunde poco a poco. La ciudad está sobre el fondo blando del antiguo lago, y al sacar agua del subsuelo durante décadas, el terreno ha bajado varios metros en el último siglo. Lo vas a notar hoy en casi todos los edificios antiguos: puertas torcidas, suelos inclinados y columnas que no están del todo rectas."],
    ["Consejos",
      "Para hacer la foto de la Catedral entera, sitúate en la esquina sureste de la plaza, cerca del Palacio Nacional, y apunta en diagonal.",
      "Si necesitas baño antes de las once, el Sanborns de la Casa de los Azulejos abre a las siete: pides un café y lo usas. Después de las once también tienes los grandes almacenes de la calle 20 de Noviembre, a una calle de aquí.",
      "Ojo con la cartera y el móvil en las aglomeraciones, y no hace falta aceptar ofertas de guías espontáneos: ya me tienes a mí."] ] },

  { s:"10:15", e:"10:50", t:"⛪ Catedral Metropolitana", n:"Catedral", q:["tolsa", "cortes"], d:"Lado norte del Zócalo. Entra por la reja del atrio y luego por la puerta central. Gratis.", $:"$0", map:GM+"10470655760320782119", pin:3, g:[
    ["Lo esencial",
      "La Catedral Metropolitana de la Asunción de María es la catedral más grande de América y la sede del arzobispado de México. Mide más de cien metros de largo, tiene dieciséis capillas y unas torres de unos sesenta y cinco metros.",
      "Se tardó casi doscientos cincuenta años en construirla: se empezó en 1573 y se terminó en 1813, ya en vísperas de la Independencia. Por eso es como un libro de historia de la arquitectura: la base y el interior son renacentistas, las portadas son barrocas y la parte alta, con la cúpula y la torre del reloj, es neoclásica."],
    ["Historia",
      "Tras la conquista, aquí se levantó primero una iglesia pequeña, muy cerca del antiguo recinto sagrado mexica. La catedral actual se diseñó a la manera de las grandes catedrales españolas, como las de Jaén o Valladolid.",
      "Para construirla se reutilizaron piedras de los templos mexicas que había alrededor, incluido el Templo Mayor, que vas a ver dentro de un rato justo detrás. No era solo cuestión de ahorrar: levantar la iglesia con los restos de los templos antiguos era un mensaje claro de quién mandaba ahora.",
      "Las torres las terminó el arquitecto José Damián Ortiz de Castro a finales del siglo dieciocho, con remates en forma de campana. Y el último arquitecto fue Manuel Tolsá, un valenciano que llegó a México y diseñó la cúpula, la balaustrada de arriba y la torre del reloj, coronada por las estatuas de la Fe, la Esperanza y la Caridad."],
    ["Qué buscar dentro",
      "Nada más entrar, en el centro, está el Altar del Perdón. Detrás, el coro, con dos órganos enormes del siglo dieciocho, uno frente a otro: son de los más grandes de América. En 1967 un incendio dañó gravemente esta zona y hubo que restaurarla.",
      "Al fondo de todo, detrás del altar mayor, está la joya de la catedral: el Altar de los Reyes. Es un retablo gigantesco cubierto de pan de oro, obra del sevillano Jerónimo de Balbás, en el siglo dieciocho. Es el gran ejemplo del barroco churrigueresco en México. Fíjate en sus columnas: no son cilíndricas, sino estípites, unos soportes con forma de pirámide invertida, más anchos arriba que abajo. Se llama de los Reyes porque está dedicado a reyes santos y a la Virgen como reina.",
      "Recorre también las capillas laterales. En una de ellas está el Cristo del Veneno, un crucifijo negro. Según la leyenda, un hombre devoto tenía la costumbre de besar los pies de este Cristo y alguien los untó con veneno para matarlo. La imagen absorbió el veneno, se volvió negra y el hombre se salvó."],
    ["La catedral que se hunde",
      "Esta parte te va a interesar como ingeniero. La catedral pesa muchísimo y está apoyada sobre el fondo arcilloso del antiguo lago. El terreno no es uniforme: debajo hay restos de construcciones mexicas que son más duros, y alrededor arcilla blanda. Así que el edificio se fue hundiendo de forma desigual, más por unas zonas que por otras, y se agrietaba y se torcía.",
      "En los años noventa se hizo una obra muy famosa para salvarla, la subexcavación. En lugar de intentar levantar las partes que se hundían, hicieron lo contrario: excavaron pozos y sacaron poco a poco tierra de debajo de las zonas que estaban más altas, para que esas bajaran también y el edificio se nivelara. Además, se inyectó mortero en el subsuelo para endurecerlo.",
      "Busca el péndulo que cuelga del centro de la cúpula hacia el suelo. Es una plomada: marca la inclinación del edificio y permite ver cuánto se ha corregido. Y fíjate en el suelo y en la base de las columnas: casi nada está a nivel."],
    ["Curiosidades",
      "Las torres tienen más de veinte campanas. Hay visitas guiadas para subir a los campanarios, con vistas al Zócalo desde arriba, pero son de pago y llevan su tiempo, así que hoy mejor no.",
      "Bajo la catedral hay una cripta donde están enterrados arzobispos de México.",
      "Pegado a la catedral, a la derecha mirando la fachada, está el Sagrario Metropolitano, del siglo dieciocho. Es la parroquia, y su fachada churrigueresca, llena de relieves, es una de las más espectaculares del barroco mexicano. Merece una foto."],
    ["Consejos",
      "La entrada es gratis. Hay misas durante todo el día: si hay una en marcha, recorre los laterales sin hacer ruido y sin flash.",
      "A la salida, ve a la derecha, hacia la esquina noreste, para ir al Templo Mayor: la entrada está en la calle Seminario, justo al lado."] ] },

  { s:"11:40", e:"12:45", t:"🎨 Murales de Diego Rivera (SEP) + Santo Domingo", n:"SEP", q:["rivera", "zapata", "villa"], d:"Edificio de la SEP, República de Argentina 28: unos 7 min al norte desde la Catedral. Gratis. Después, Plaza Santo Domingo a 2 min.", $:"$0", map:"https://www.google.com/maps/search/?api=1&query=Secretar%C3%ADa+de+Educaci%C3%B3n+P%C3%BAblica+Rep%C3%BAblica+de+Argentina+28+CDMX", pin:10, g:[
    ["Lo esencial",
      "Estás en la sede histórica de la Secretaría de Educación Pública. Por fuera parece un edificio de oficinas más, pero dentro, en los pasillos que rodean sus dos patios, está uno de los conjuntos de murales más grandes de Diego Rivera.",
      "Rivera los pintó entre 1923 y 1928. Son más de doscientos paneles repartidos en tres pisos. Fue su primer gran encargo al volver de Europa, y aquí se nota cómo va encontrando su estilo."],
    ["Por qué están aquí",
      "Tras la Revolución, el gobierno quiso contar la historia del país a gente que en gran parte no sabía leer. José Vasconcelos, secretario de Educación, encargó a los pintores que llenaran las paredes de los edificios públicos. Así nació el muralismo mexicano.",
      "Los murales eran la forma de enseñar historia y política en la pared, a la vista de todos, gratis."],
    ["Qué buscar",
      "En la planta baja del primer patio, el del Trabajo, verás escenas de mineros, campesinos y tejedores: el trabajo de la gente corriente como protagonista.",
      "En el segundo patio, el de las Fiestas, están las celebraciones populares, incluido el Día de Muertos, que acabas de tener.",
      "Sube al último piso: ahí está el Corrido de la Revolución, una serie que se lee como una canción, con una cinta que recorre los paneles. En uno de ellos, el del arsenal, aparece Frida Kahlo repartiendo armas, años antes de casarse con Rivera."],
    ["Consejos",
      "Entra con calma y recorre los pasillos de cada piso en orden. Puede que en la puerta te pidan dejar algo a la vista o enseñar la mochila.",
      "Al salir, la Plaza Santo Domingo está a dos minutos: fíjate en los escribanos de los soportales, que todavía imprimen documentos para la gente."] ] },

  { s:"12:45", e:"13:30", t:"🌮 Comida (Centro)", n:"Comida", d:"45 min. Tacos o comida corrida rápida, en efectivo.", $:"$150–250 💵", map:"https://www.google.com/maps/search/taquer%C3%ADa/@19.4335,-99.1355,17z", mapTxt:"Taquerías", g:[
    ["Qué pedir",
      "Para comer rápido y bien en el Centro, lo más práctico son los tacos. Una buena orden para empezar es de tres a cinco tacos.",
      "Al pastor: carne de cerdo adobada con chiles y achiote, asada en un trompo vertical, con un trozo de piña arriba. El taquero corta la carne y lanza la piña al taco.",
      "Suadero: carne de res muy suave, cocinada en un comal con forma de sombrero, en su propia grasa. Es el taco típico del Centro. Una taquería clásica de suadero es Los Cocuyos, en la calle Bolívar, a pocas calles del Zócalo, abierta casi todo el día.",
      "Campechano: mezcla de dos carnes, normalmente suadero y longaniza. Y si te atreves, tripa o lengua."],
    ["La historia del pastor",
      "El taco al pastor viene de Oriente Medio. A principios del siglo veinte llegaron a México muchos inmigrantes libaneses, que trajeron el shawarma: carne de cordero en un asador vertical, servida en pan árabe.",
      "Con el tiempo, sus hijos y los taqueros mexicanos lo adaptaron: cambiaron el cordero por cerdo, lo adobaron con chiles, cambiaron el pan por tortilla de maíz y le añadieron la piña. En Puebla todavía existen los tacos árabes, más parecidos al original, y los vas a poder probar mañana."],
    ["Cómo se come",
      "En las taquerías se suele comer de pie o en la barra. Pides diciendo cuántos y de qué. Con todo significa con cebolla y cilantro.",
      "Las salsas están en la barra: la verde suele ser de tomatillo y la roja puede picar mucho más. Prueba primero con una gota. Las limas y los rábanos son para acompañar.",
      "Normalmente se paga al final: te preguntan cuántos te comiste, y te fían. En los puestos, casi siempre en efectivo."],
    ["Si prefieres sentarte",
      "Busca un cartel de comida corrida. Es el menú del día de los mexicanos: sopa o consomé, arroz, un plato fuerte y agua fresca, por un precio bajo.",
      "Las aguas frescas son bebidas de fruta o flor: horchata, de arroz con canela, o jamaica, de flor de hibisco. En sitios establecidos, el agua y el hielo son purificados; del grifo, nunca."],
    ["Un dulce para luego",
      "Apunta este para la tarde: la churrería El Moro, en el Eje Central, muy cerca de la Torre Latinoamericana. Lleva haciendo churros desde los años treinta y es un clásico de la ciudad. Pide churros con chocolate."] ] },

  { s:"13:30", e:"14:00", t:"🚶 Calle Madero + Casa de los Azulejos", n:"Madero", q:["madero", "villa", "zapata", "iturbide", "orozco"], d:"Recto por Madero desde el Zócalo (10 min). Entrada por Madero 4 (Sanborns); el patio es libre.", $:"$0", map:GM+"626430939730553911", pin:5, g:[
    ["Lo esencial",
      "La calle Madero une el Zócalo con Bellas Artes y es una de las calles más antiguas de la ciudad: se trazó justo después de la conquista, sobre una de las calzadas de Tenochtitlan.",
      "Desde 2010 es peatonal, y es de las calles más transitadas de México: por aquí pasan cientos de miles de personas al día."],
    ["Historia del nombre",
      "En la época colonial se llamaba calle de Plateros, porque aquí trabajaban los orfebres de plata, y después calle de San Francisco, por el convento que había al final.",
      "En diciembre de 1914, en plena Revolución, Pancho Villa entró en la ciudad con su ejército y él mismo subió a una escalera para colocar la placa con el nuevo nombre: avenida Francisco I. Madero. Lo hizo en homenaje a Madero, el presidente que había iniciado la Revolución y que había sido asesinado el año anterior."],
    ["La Casa de los Azulejos",
      "Es un palacio del siglo dieciocho que perteneció a los condes del Valle de Orizaba. Su fachada está forrada entera de azulejos azules y blancos de Talavera, la cerámica de Puebla, adonde vas mañana.",
      "Cuenta la leyenda que el hijo de los condes era un derrochador y un juerguista, y su padre le dijo: tú nunca harás casa de azulejos. En la época, eso quería decir que nunca llegaría a nada. Cuando el hijo sentó la cabeza, cubrió la casa de azulejos para demostrar que su padre se equivocaba.",
      "Desde 1919 la ocupa Sanborns, una cadena que empezó como farmacia y fuente de sodas. Entra en el patio cubierto, con su fuente y sus columnas, y mira hacia la escalera: hay un mural de José Clemente Orozco de 1925, llamado Omnisciencia, uno de los primeros grandes murales de México."],
    ["La foto de los zapatistas",
      "En diciembre de 1914, cuando los ejércitos de Villa y de Zapata ocuparon la capital, un grupo de soldados zapatistas, campesinos del sur, entró aquí a desayunar. Los fotografiaron sentados en la barra, con sus sombreros y cartucheras, tomando café en el local más elegante de la ciudad. La foto se hizo famosísima y es una de las imágenes más conocidas de la Revolución."],
    ["Por el camino",
      "En el número 17 está el Palacio de Iturbide, un palacio barroco donde vivió Agustín de Iturbide cuando fue proclamado emperador de México en 1822. Hoy tiene un patio enorme con exposiciones de arte que suelen ser gratis.",
      "Casi al final, a la izquierda, está lo que queda del Templo de San Francisco, del primer gran convento franciscano de América. Fíjate en que está por debajo del nivel de la calle: la ciudad ha ido subiendo y el templo se ha ido hundiendo.",
      "Y al fondo ya ves la Torre Latinoamericana, donde acabarás el día."] ] },

  { s:"14:00", e:"14:25", t:"🏛️ Bellas Artes (fuera) + Alameda", n:"Bellas Artes", q:["diaz", "rivera", "siqueiros", "orozco", "juarez", "maximiliano"], d:"Al final de Madero, cruzando Eje Central. Fotos desde la explanada; la Alameda queda detrás.", $:"$0", map:GM+"1718141752200063183", pin:6, g:[
    ["Lo esencial",
      "El Palacio de Bellas Artes es el gran teatro y museo de arte de México, y uno de sus edificios más bonitos. Por fuera es art nouveau, de mármol blanco; por dentro es art déco.",
      "Esa mezcla tiene una explicación: tardaron treinta años en terminarlo."],
    ["Historia",
      "Lo encargó Porfirio Díaz para celebrar el centenario de la Independencia, en 1910, como nuevo Teatro Nacional. El proyecto fue del arquitecto italiano Adamo Boari, que empezó la obra en 1904.",
      "Pero en 1910 estalló la Revolución, el dinero se acabó y Boari volvió a Italia. El edificio se quedó a medias durante años. No se terminó hasta 1934, con el arquitecto mexicano Federico Mariscal, que hizo el interior con el estilo de su época, el art déco, y con motivos mexicanos, como máscaras del dios Tláloc."],
    ["Fíjate en la fachada",
      "El mármol es de Carrara, en Italia, como el de las grandes esculturas del Renacimiento.",
      "La cúpula, de colores naranja y amarillo, está hecha de vidrio y metal, y en su remate hay un águila. Alrededor del edificio hay esculturas de figuras que representan la armonía, la música y la inspiración.",
      "Y en la explanada, unos Pegasos, caballos alados, del escultor valenciano Agustí Querol."],
    ["Un edificio que se hunde",
      "El mármol pesa tantísimo que el palacio empezó a hundirse incluso antes de terminarse. Desde entonces ha bajado varios metros en el suelo blando del antiguo lago.",
      "Mira la explanada: está claramente por debajo del nivel de la calle, y se baja por escalones. Cuando se construyó, estaba a la altura de la acera."],
    ["Lo que hay dentro",
      "Hoy no entras, pero que sepas lo que hay. En las plantas altas están los grandes murales: de Diego Rivera, El hombre controlador del universo, que es una copia del mural que pintó en el Rockefeller Center de Nueva York y que destruyeron porque Rivera había puesto en él a Lenin; y también obras de Siqueiros, Orozco y Tamayo.",
      "En la sala principal hay un telón de cristal de Tiffany, hecho con casi un millón de piezas de vidrio, que representa los volcanes Popocatépetl e Iztaccíhuatl.",
      "Y una curiosidad: hoy es miércoles, y los miércoles por la noche suele actuar aquí el Ballet Folklórico de México, el de Amalia Hernández, que es un espectáculo de bailes tradicionales de todo el país."],
    ["La Alameda Central",
      "Detrás está la Alameda Central, el parque público más antiguo de América. La mandó crear el virrey Luis de Velasco en 1592, y se llama así por los álamos que se plantaron.",
      "Durante la época colonial, cerca de su extremo oeste estaba el quemadero de la Inquisición, donde se ejecutaba a los condenados.",
      "El monumento de mármol blanco con columnas en semicírculo es el Hemiciclo a Juárez, de 1910, dedicado a Benito Juárez, el presidente de origen zapoteco que defendió la república frente a la invasión francesa y el emperador Maximiliano.",
      "Y si te sobran cinco minutos: al otro lado del Eje Central, frente a Bellas Artes, está el Palacio Postal, la oficina de correos, del mismo arquitecto Boari. Su interior, con escaleras de bronce, es precioso y la entrada es gratis."] ] },

  { s:"14:25", e:"15:00", t:"📸 Monumento a la Revolución + café", n:"Revolución", q:["diaz", "madero", "carranza", "villa", "zapata"], d:"12 min al oeste por la Alameda y Av. Juárez. Café para llevar. Baño inteligente $7 o gratis en el Metrobús.", $:"$60–80 💳", map:GM+"2377274831848344608", pin:7, g:[
    ["Lo esencial",
      "El Monumento a la Revolución es un gran arco con cúpula, de unos sesenta y siete metros de altura: uno de los arcos monumentales más altos del mundo. Pero no nació para ser un monumento."],
    ["El parlamento que nunca fue",
      "Porfirio Díaz, que gobernó México durante más de treinta años, quiso construir aquí el Palacio Legislativo Federal: un parlamento gigantesco, con una cúpula más alta que la del Capitolio de Washington. El proyecto lo ganó el arquitecto francés Émile Bénard.",
      "Díaz puso la primera piedra en 1910. Ese mismo año estalló la Revolución, que acabó echándolo del poder en 1911. Las obras se pararon, y durante más de veinte años en este lugar solo hubo un esqueleto de hierro, el armazón de la cúpula, oxidándose. Incluso se pensó en venderlo como chatarra."],
    ["La Revolución en un minuto",
      "En 1910, Francisco Madero llamó a levantarse contra la dictadura de Díaz. Díaz se exilió y Madero fue elegido presidente, pero en 1913 el general Victoriano Huerta dio un golpe y Madero fue asesinado.",
      "Contra Huerta se alzaron Venustiano Carranza, Álvaro Obregón, Pancho Villa en el norte y Emiliano Zapata en el sur, con su lema de tierra y libertad. Después de vencer a Huerta, se enfrentaron entre ellos. La guerra dejó cientos de miles de muertos y terminó, en lo esencial, con la Constitución de 1917, que todavía está en vigor."],
    ["De ruina a monumento",
      "En los años treinta, el arquitecto Carlos Obregón Santacilia propuso aprovechar el armazón abandonado de la cúpula y convertirlo en un monumento a la propia Revolución. Se terminó en 1938.",
      "Es una ironía de la historia: el edificio que iba a ser el símbolo del poder de Díaz acabó honrando a los que lo derribaron.",
      "Dentro de los cuatro pilares están enterrados líderes revolucionarios: Francisco Madero, Venustiano Carranza, Pancho Villa, Plutarco Elías Calles y Lázaro Cárdenas. Paradójicamente, varios de ellos fueron enemigos en vida. En las esquinas, las esculturas representan la Independencia, las Leyes de Reforma y las leyes agrarias y obreras."],
    ["Consejos",
      "Arriba hay un mirador al que se sube en un ascensor de cristal, y abajo está el Museo Nacional de la Revolución. Hoy toca solo foto y seguir.",
      "Para la mejor foto, ponte lejos, en el extremo de la plaza, para que te quepa el arco entero.",
      "El metro Revolución está a cuatro minutos andando hacia el norte, en la calle Puente de Alvarado. Desde aquí empieza tu viaje a la Basílica."] ] },

  { s:"15:00", e:"15:35", t:"🚇 Revolución → La Villa-Basílica", d:"Metro Revolución (4 min al norte, en Puente de Alvarado) → Hidalgo, L3 dir. Indios Verdes → Deportivo 18 de Marzo, L6 dir. Martín Carrera → 1 parada.", l:["L2","L3","L6"], $:"$5", map:RUTA("Basílica de Guadalupe, Ciudad de México"), mov:1 },

  { s:"15:35", e:"16:30", t:"✝️ Basílica de Guadalupe", n:"Basílica", q:["nahuatl", "hidalgo"], d:"Del metro, 5 min al norte por Calzada de Guadalupe hasta la gran plaza. Entra por las rejas del atrio. Sal a las 16:30.", $:"$0", map:GM+"2423194957463972528", pin:8, g:[
    ["Lo esencial",
      "Estás en uno de los santuarios católicos más visitados del mundo. Cada año vienen millones de peregrinos, y alrededor del 12 de diciembre, el día de la Virgen, llegan varios millones en pocos días, muchos caminando o en bicicleta desde muy lejos.",
      "La Virgen de Guadalupe, la Morenita, no es solo un símbolo religioso: es probablemente el símbolo más fuerte de la identidad mexicana. La vas a ver en casas, taxis, tatuajes y puestos de todo el país."],
    ["La historia de Juan Diego",
      "Según la tradición, en diciembre de 1531, apenas diez años después de la conquista, un indígena llamado Juan Diego Cuauhtlatoatzin pasaba por el cerro del Tepeyac, el que tienes detrás, cuando se le apareció una mujer que le habló en náhuatl. Le pidió que fuera a ver al obispo, el franciscano fray Juan de Zumárraga, y le dijera que construyera aquí un templo.",
      "El obispo no le creyó y le pidió una prueba. La Virgen le dijo a Juan Diego que subiera a la cima del cerro y cortara flores. En pleno diciembre, en un cerro seco y pedregoso, encontró rosas. Las envolvió en su tilma, una especie de capa, y las llevó al obispo. Al abrirla, las rosas cayeron y en la tela apareció pintada la imagen de la Virgen.",
      "Ese mismo día, según el relato, se curó un tío de Juan Diego que estaba moribundo. El relato más antiguo está escrito en náhuatl y se llama Nican Mopohua, que significa aquí se cuenta. Juan Diego fue canonizado en 2002 por el papa Juan Pablo II."],
    ["Tonantzin: el cerro sagrado",
      "El Tepeyac ya era un lugar sagrado antes de los españoles. Aquí había un santuario a Tonantzin, que en náhuatl significa nuestra madre venerable, una diosa madre a la que los mexicas venían en peregrinación.",
      "Recuerda que la ciudad estaba unida al Tepeyac por una de las grandes calzadas que salían de Tenochtitlan. Por eso muchos historiadores ven en la Guadalupana un puente entre las dos culturas: una Virgen de piel morena, que habla náhuatl, que se aparece a un indígena en un lugar que los indígenas ya veneraban."],
    ["La imagen",
      "La tilma está hecha de ayate, una fibra de maguey que en teoría dura pocas décadas, y ha resistido casi quinientos años.",
      "Fíjate en los detalles: la Virgen tiene la piel morena, está de pie sobre una luna negra y sostenida por un ángel, rodeada de rayos de sol, con un manto azul verdoso lleno de estrellas. Sobre su vientre hay una pequeña flor de cuatro pétalos, que para los pueblos nahuas era un símbolo del centro del universo. Muchos lo interpretan como una señal de que está embarazada.",
      "Y una historia real: en 1921, en plena época de enfrentamientos entre el gobierno y la Iglesia, un hombre dejó un ramo de flores con dinamita junto a la imagen. La explosión destrozó el altar y dobló un pesado crucifijo de bronce, pero la tilma quedó intacta. El crucifijo doblado se exhibe en la Basílica."],
    ["Las dos basílicas",
      "La Basílica antigua, la de piedra con cúpula y cuatro torres, se terminó en 1709. Como todo en esta ciudad, se hundió en el terreno blando, de forma tan desigual que se volvió peligrosa. Si la miras de frente, notarás que está inclinada.",
      "Por eso se construyó la Basílica nueva, la redonda y moderna, que se inauguró en 1976. La diseñó Pedro Ramírez Vázquez, el mismo arquitecto del Museo Nacional de Antropología y del Estadio Azteca. Su forma recuerda a una gran tienda o a un manto, y caben unas diez mil personas dentro. Está pensada para que desde cualquier punto se vea la imagen."],
    ["Qué hacer, paso a paso",
      "Primero, entra en la Basílica nueva. Para ver la tilma de cerca, baja por las escaleras de detrás del altar: hay una cinta mecánica que te pasa por debajo de la imagen sin pararte. Así nadie se queda delante y no se forman colas, aunque haya misa.",
      "Segundo, sal y mira la Basílica antigua y su inclinación.",
      "Tercero, si vas bien de tiempo, sube al cerro por las escaleras de la derecha. Pasarás por jardines con una gran escultura de Juan Diego y de indígenas ofreciendo regalos a la Virgen, y arriba está la Capilla del Cerrito, donde según la tradición Juan Diego cortó las rosas. Desde arriba hay muy buenas vistas de la ciudad, y podrás ver, al sur, la Torre Latinoamericana, donde vas a estar a la puesta de sol.",
      "Si no da tiempo para todo, sáltate el cerro. Lo importante es salir a las cuatro y media hacia el metro."],
    ["Consejos",
      "Hay misas casi cada hora. Respeta el silencio y no uses flash.",
      "Lleva monedas para el baño y cuidado con la cartera en las zonas con mucha gente, sobre todo en la calzada de los puestos de recuerdos.",
      "Si quieres comprar algo, en los puestos de la calzada hay rosarios, estampas y velas, normalmente en efectivo."] ] },

  { s:"16:30", e:"17:10", t:"🚇 La Villa → Bellas Artes", d:"L6 → Deportivo 18 de Marzo, L3 → Hidalgo, L2 → Bellas Artes (1 parada). La Torre está enfrente.", l:["L6","L3","L2"], $:"$5", map:RUTA("Torre Latinoamericana, Ciudad de México"), mov:1 },

  { s:"17:15", e:"18:15", t:"🌇 Torre Latinoamericana (mirador)", n:"Torre Latino", q:["moctezuma"], d:"Entrada al mirador en planta baja, esquina Madero con Eje Central. Dos ascensores: al 37 y luego arriba. Atardecer ~17:50.", $:"$220 💳", map:GM+"7044633925614656099", pin:9, g:[
    ["Lo esencial",
      "La Torre Latinoamericana tiene cuarenta y cuatro pisos y unos ciento ochenta metros de altura con la antena. Se inauguró en 1956 y fue el edificio más alto de América Latina hasta 1972.",
      "Pero su fama mundial no viene de la altura, sino de que sigue en pie. Es uno de los primeros rascacielos del mundo construidos en una zona sísmica tan peligrosa, y sobre un terreno tan malo."],
    ["Ingeniería: el problema",
      "Esta parte es para el ingeniero que llevas dentro. El suelo del Centro es arcilla del antiguo lago de Texcoco: blanda, con muchísima agua, y que se comprime con el peso. Además, este tipo de suelo amplifica las ondas de los terremotos: el terreno se mueve como una gelatina, y las sacudidas aquí son mucho más fuertes que en suelo firme.",
      "Construir un rascacielos de acero aquí, en los años cincuenta, era un reto enorme: si lo apoyabas sin más, se hundía o se inclinaba, y en un terremoto podía entrar en resonancia con el suelo."],
    ["Ingeniería: la solución",
      "El cálculo estructural lo hicieron los hermanos Leonardo y Adolfo Zeevaert, con el asesoramiento del ingeniero estadounidense Nathan Newmark, uno de los padres de la ingeniería sísmica moderna. El arquitecto fue Augusto H. Álvarez.",
      "Para la cimentación usaron una doble estrategia. Por un lado, cientos de pilotes de concreto clavados unos treinta metros, hasta una capa de arena firme. Por otro, una cimentación compensada: excavaron un gran cajón bajo el edificio, de forma que el peso de la tierra que sacaron es parecido al peso de la torre. Así el terreno, en la práctica, no nota la carga, y la torre casi flota.",
      "La estructura de acero se diseñó para ser flexible y aguantar las fuerzas del sismo, calculando cómo se movería el edificio con el suelo, algo muy avanzado para la época."],
    ["La prueba de los terremotos",
      "La prueba llegó pronto. En julio de 1957, un año después de inaugurarse, un fuerte terremoto sacudió la ciudad. Fue el que tiró la estatua del Ángel de la Independencia. La torre quedó intacta.",
      "En septiembre de 1985 llegó el gran terremoto de magnitud ocho, que destruyó cientos de edificios en el Centro y en las colonias cercanas y causó miles de muertos. La Torre Latinoamericana volvió a resistir sin daños, rodeada de ruinas.",
      "Desde entonces se estudia en todo el mundo como ejemplo de ingeniería sísmica, y en el museo de la torre se cuenta cómo se construyó."],
    ["Qué ver desde arriba",
      "Mira hacia el este y verás el Zócalo, con la bandera y la Catedral: el recorrido de esta mañana. Justo a tus pies, al otro lado del Eje Central, la cúpula naranja de Bellas Artes, y detrás, el verde de la Alameda.",
      "Hacia el oeste, en línea con la Alameda y la avenida Juárez, verás la cúpula del Monumento a la Revolución. Más allá, los rascacielos del Paseo de la Reforma y el bosque de Chapultepec.",
      "Hacia el norte, la sierra de Guadalupe: al pie de esos cerros está la Basílica, de donde vienes.",
      "Y hacia el sureste, si el aire está limpio, al atardecer pueden asomar los volcanes Popocatépetl e Iztaccíhuatl, a más de cinco mil metros de altura. El Popocatépetl está activo y a veces se ve echando humo. Con la puesta de sol, sobre las seis menos diez, la ciudad empieza a encenderse y no se acaba en ninguna dirección."],
    ["Curiosidades",
      "Según se cuenta, en este solar, en tiempos de Moctezuma, estaba la Casa de las Fieras, el zoológico real de los mexicas, con jaguares, águilas y serpientes. Después fue parte del gran convento de San Francisco.",
      "En las plantas de abajo del mirador hay un pequeño museo sobre la historia de la torre y de la ciudad, y un café. Si te apetece un dulce al bajar, la churrería El Moro está muy cerca, en el Eje Central."],
    ["Consejos",
      "Se sube en dos ascensores: el primero hasta el piso treinta y siete y otro más pequeño para seguir. Los últimos tramos son escaleras.",
      "A la hora de la puesta de sol se llena: colócate pronto junto al cristal que da al oeste.",
      "Al bajar, pide el Uber desde la esquina con Madero o vete al metro Bellas Artes. A esa hora el metro va muy lleno: mochila delante."] ] },

  { s:"18:30", e:"19:15", t:"🚕 Vuelta a casa", d:"Uber ~30–45 min. El metro a esta hora va lleno: Bellas Artes → Hidalgo → Zapata.", l:["L2","L3"], $:"$150–250 💳", map:RUTA("Av. Universidad 687, Del Valle Sur, Ciudad de México"), mapTxt:"Ruta a casa", mov:1 }
];

/* Paradas que ya no están en el plan fijo pero cuya guía se usa si vuelven al
   calendario (se emparejan por nombre). */
var EXTRA = [
  { s:"11:00", e:"12:45", t:"🔺 Templo Mayor (zona + museo)", n:"Templo Mayor", q:["mexicas", "tlaloc", "nahuatl", "moctezuma"], d:"Pegado al lado este de la Catedral. Taquilla en calle Seminario 8, junto a la maqueta de Tenochtitlan. Primero ruinas, luego museo.", $:"$210 💵/💳", map:GM+"10128805338444740272", pin:4, g:[
    ["Lo esencial",
      "Estás en lo que fue el centro del mundo para los mexicas: el Huey Teocalli, el gran templo de Tenochtitlan. Era una pirámide de unos cuarenta y cinco metros de altura, con dos escalinatas y dos santuarios en lo alto.",
      "Uno estaba dedicado a Huitzilopochtli, dios de la guerra y del sol, protector de los mexicas. El otro a Tláloc, dios de la lluvia y del agua. Guerra y agua: el tributo que conseguían los ejércitos y las cosechas que dependían de la lluvia. Las dos cosas que sostenían a la ciudad.",
      "Alrededor estaba el recinto sagrado, con decenas de templos, escuelas, juegos de pelota y el muro de cráneos. Era una plaza amurallada, y hoy está enterrada bajo las manzanas que tienes alrededor."],
    ["El mito de la fundación",
      "Según su historia, los mexicas venían del norte, de un lugar llamado Aztlán. Su dios Huitzilopochtli les había dicho que fundaran su ciudad donde vieran un águila posada sobre un nopal, devorando una serpiente. Tras más de un siglo vagando, la encontraron en un islote del lago, y ahí fundaron Tenochtitlan en 1325.",
      "Esa escena es el escudo que está en el centro de la bandera de México. Así que la bandera cuenta, literalmente, la fundación de este lugar."],
    ["El nacimiento de Huitzilopochtli",
      "Este es el mito que explica todo el templo. La diosa Coatlicue, la de la falda de serpientes, barría en el cerro de Coatepec cuando le cayó del cielo una bola de plumas. Se la guardó en el pecho y quedó embarazada.",
      "Su hija Coyolxauhqui, diosa de la luna, y sus cuatrocientos hermanos, las estrellas del sur, lo vieron como una deshonra y decidieron matar a su madre. Pero en el momento del ataque nació Huitzilopochtli, ya adulto y armado. Venció a sus hermanos y despedazó a Coyolxauhqui, cuyo cuerpo rodó cerro abajo.",
      "El Templo Mayor era una representación de ese cerro de Coatepec. Por eso, al pie de la escalinata de Huitzilopochtli, los mexicas pusieron una enorme piedra con la figura de Coyolxauhqui desmembrada, con la cabeza y los brazos separados del cuerpo. Los prisioneros sacrificados arriba eran arrojados escaleras abajo y acababan sobre ella, repitiendo el mito. Es el sol venciendo a la luna y a las estrellas cada mañana."],
    ["Un templo dentro de otro",
      "Lo que vas a ver en las ruinas no es un solo templo, sino varios, uno dentro de otro, como las capas de una cebolla. Cada gran gobernante ampliaba el templo cubriendo el anterior con uno más grande. Los arqueólogos identifican siete etapas principales.",
      "Por eso las pasarelas te llevan por escalinatas a distintas alturas: las más profundas son las más antiguas. En la etapa dos, la más antigua que se ve bien, todavía se conserva arriba la piedra de sacrificios del lado de Huitzilopochtli y una escultura de chac mool, una figura recostada con un recipiente en el vientre, del lado de Tláloc.",
      "Busca las cabezas de serpiente que salen de las bases de las escalinatas, los braseros, y en el lado de Tláloc, unas ranas de piedra: la rana es el animal de la lluvia."],
    ["Cómo se descubrió",
      "Tras la conquista, el templo fue destruido y enterrado bajo casas coloniales. Se sabía más o menos dónde estaba, pero no se había excavado.",
      "La madrugada del 21 de febrero de 1978, unos trabajadores de la compañía de luz que cavaban en la esquina de las calles Guatemala y Argentina toparon con una enorme piedra tallada. Era la Coyolxauhqui, un disco de más de tres metros de diámetro. El hallazgo fue tan importante que el gobierno decidió demoler varias manzanas de edificios para excavar el templo entero. Lo dirigió el arqueólogo Eduardo Matos Moctezuma, y en 1987 se abrió el museo.",
      "Las excavaciones no han parado. En 2006 apareció la Tlaltecuhtli, y en la última década se encontró el gran tzompantli, el muro de cráneos, con torres hechas con cráneos humanos unidos con argamasa."],
    ["El museo: qué no perderte",
      "El museo está organizado como el propio templo: una mitad, la sur, dedicada a Huitzilopochtli, con la guerra, el tributo y el sacrificio; y la otra mitad, la norte, dedicada a Tláloc, con el agua, la agricultura, la flora y la fauna.",
      "Primero, la Coyolxauhqui original, la del descubrimiento. Se ve desde arriba, desde una pasarela, igual que la veían los mexicas desde lo alto del templo.",
      "Segundo, la Tlaltecuhtli: es el monolito más grande que se conoce de los mexicas, de unos cuatro metros, y representa a la diosa de la tierra, que devora a los muertos y da a luz la vida. Conserva restos de pintura roja, ocre, azul y blanca, y te hace ver que todo esto estaba pintado de colores vivos.",
      "Tercero, los guerreros águila: dos figuras de barro de tamaño natural, de un hombre vestido de águila, encontradas en la Casa de las Águilas, junto al templo.",
      "Y cuarto, las ofrendas: los mexicas enterraban en el templo cajas de piedra con objetos traídos de todo su imperio, como conchas y corales del mar, pieles de jaguar, esqueletos de lobo, cuchillos de pedernal con caras pintadas y máscaras de pueblos más antiguos. Se han encontrado más de doscientas."],
    ["Consejos",
      "El recorrido empieza por las ruinas al aire libre y termina en el museo. Calcula una hora para cada parte.",
      "El último acceso es hacia las cuatro y media, así que vas con tiempo de sobra. No se puede usar flash.",
      "Si en la taquilla aceptan tarjeta, paga con ella y guarda el efectivo para la comida."] ] }
];

/* ---------------------------------------------------------------------------
   ¿Quién es? Personajes y palabras que salen en las guías. Cada parada lista
   los suyos en q; se escuchan en el mismo reproductor y al acabar vuelve a la
   guía donde estaba (en pausa).
   --------------------------------------------------------------------------- */
var Q = {
  hidalgo:["Miguel Hidalgo",
    "Miguel Hidalgo y Costilla, nacido en 1753, era un cura criollo, es decir, hijo de españoles nacido en América. Era un hombre culto: había sido rector de un colegio en Valladolid, la actual Morelia, leía a los ilustrados franceses, hablaba lenguas indígenas y en su parroquia de Dolores, en Guanajuato, enseñaba oficios a los vecinos.",
    "Participaba en una conspiración para independizarse de España. Cuando fue descubierta, decidió adelantarse: la madrugada del 16 de septiembre de 1810 hizo sonar la campana de su iglesia y llamó a la gente a levantarse. Es el Grito de Dolores, el inicio de la Independencia.",
    "Como bandera tomó un estandarte de la Virgen de Guadalupe, la que vas a ver esta tarde. Reunió un ejército enorme y desorganizado de campesinos e indígenas, tomó Guanajuato y llegó a las puertas de la capital, pero no se atrevió a entrar. Fue derrotado, capturado en el norte y fusilado en Chihuahua en julio de 1811. Su cabeza se colgó en una jaula en Guanajuato durante diez años, como escarmiento.",
    "La Independencia no llegó hasta 1821, diez años después de su muerte, pero a él se le llama el Padre de la Patria."],
  moctezuma:["Moctezuma",
    "Moctezuma Xocoyotzin, Moctezuma el Joven, fue el huey tlatoani, el gran gobernante de los mexicas, entre 1502 y 1520. Con él, el imperio mexica estaba en su máximo esplendor, cobrando tributo a pueblos desde el golfo de México hasta el Pacífico.",
    "En noviembre de 1519 recibió a Hernán Cortés en la ciudad y lo alojó en el palacio de su padre, Axayácatl, junto a este Zócalo. Poco después, los españoles lo tomaron como rehén.",
    "Murió en junio de 1520, en plena rebelión de su pueblo contra los españoles. Cómo murió sigue discutiéndose: las crónicas españolas dicen que por pedradas de su propia gente cuando intentaba calmarla; las fuentes indígenas dicen que lo mataron los españoles.",
    "Le siguieron Cuitláhuac, que murió de viruela, y Cuauhtémoc, el último tlatoani, que defendió la ciudad durante el asedio. A Cuauhtémoc hoy se le considera un héroe nacional."],
  cortes:["Hernán Cortés",
    "Hernán Cortés nació en Medellín, en Extremadura, en 1485. En 1519 salió de Cuba hacia la costa de México con unos quinientos hombres, desobedeciendo al gobernador.",
    "No conquistó solo. Fue clave su alianza con pueblos enemigos de los mexicas, sobre todo los tlaxcaltecas, que aportaron decenas de miles de guerreros, y la labor de Malinche, una mujer indígena que le sirvió de intérprete y consejera. También lo fue la viruela, que llegó con los europeos y mató a gran parte de la población.",
    "Tras una primera derrota, la Noche Triste de 1520, sitió la ciudad por tierra y por el lago con bergantines construidos para la ocasión. Tenochtitlan cayó el 13 de agosto de 1521.",
    "Fue nombrado marqués del Valle de Oaxaca, pero acabó perdiendo poder y murió en España en 1547. En México es una figura muy incómoda: casi no tiene monumentos."],
  mexicas:["Los mexicas",
    "Los mexicas son el pueblo que fundó Tenochtitlan. Solemos llamarlos aztecas, por Aztlán, su lugar de origen legendario, pero ellos se llamaban mexicas. De ahí viene el nombre de México.",
    "Llegaron al valle como un pueblo pobre y mal visto, y en unos doscientos años construyeron un imperio. En 1428 formaron la Triple Alianza con las ciudades de Texcoco y Tlacopan, y desde entonces dominaron buena parte del centro y del sur de México.",
    "Más que un imperio con territorios ocupados, era una red de pueblos que pagaban tributo: maíz, cacao, plumas, algodón, oro, jade. Por eso, cuando llegaron los españoles, muchos de esos pueblos se aliaron con ellos contra los mexicas."],
  tlaloc:["Tláloc",
    "Tláloc es el dios de la lluvia, uno de los más antiguos de Mesoamérica: ya lo adoraban en Teotihuacán siglos antes que los mexicas.",
    "Se le reconoce por unos círculos alrededor de los ojos, como gafas, y por una boca con colmillos. Vivía en las montañas, de donde bajaban las nubes y el agua, y le ayudaban unos pequeños seres, los tlaloques, que rompían cántaros en el cielo para hacer llover y tronar.",
    "Su santuario en lo alto del Templo Mayor estaba pintado de azul y blanco. Por eso en su lado del templo y del museo verás ranas, caracoles, conchas y todo lo relacionado con el agua."],
  nahuatl:["El náhuatl",
    "El náhuatl es la lengua de los mexicas y de muchos otros pueblos del centro de México. Hoy la siguen hablando más de un millón y medio de personas.",
    "Le debemos muchas palabras que usas a diario sin saberlo: chocolate, tomate, aguacate, chile, cacahuete, chicle y coyote vienen del náhuatl. También los nombres que vas a oír hoy: México, Tenochtitlan, Tepeyac o Popocatépetl, que significa montaña que humea.",
    "Fíjate en cuántas palabras acaban en tl, como Tláloc o Náhuatl: es uno de los sonidos más típicos de la lengua."],
  tolsa:["Manuel Tolsá",
    "Manuel Tolsá fue un escultor y arquitecto valenciano, nacido en Enguera en 1757. Llegó a la Nueva España para dirigir la escuela de escultura de la Academia de San Carlos.",
    "Terminó la Catedral, con su cúpula y su torre del reloj, y diseñó el Palacio de Minería, uno de los mejores edificios neoclásicos de América, a pocas calles de aquí.",
    "Su obra más famosa es una enorme estatua ecuestre del rey Carlos cuarto, que los mexicanos llaman el Caballito. Murió en México en 1816."],
  madero:["Francisco I. Madero",
    "Francisco Ignacio Madero nació en 1873 en una familia muy rica de Coahuila, en el norte. Había estudiado en Francia y en Estados Unidos y era un idealista.",
    "Escribió un libro pidiendo elecciones libres y se presentó contra Porfirio Díaz en 1910. Díaz lo encarceló y se proclamó ganador. Madero escapó a Estados Unidos y llamó a levantarse en armas el 20 de noviembre de 1910. Por eso el 20 de noviembre es en México el día de la Revolución.",
    "Ganó, y fue elegido presidente en 1911. Pero gobernó con poca mano: los revolucionarios le parecían radicales y los porfiristas seguían en el poder. En febrero de 1913, durante la Decena Trágica, su propio general, Victoriano Huerta, le traicionó. Madero fue asesinado. Su muerte desató la fase más violenta de la Revolución."],
  villa:["Pancho Villa",
    "Pancho Villa se llamaba en realidad José Doroteo Arango y nació en Durango en 1878. De joven fue bandolero y luego se unió a la Revolución, donde demostró ser un general excepcional.",
    "Mandaba la División del Norte, con una caballería legendaria y trenes con los que movía a sus tropas. Su gran victoria fue la toma de Zacatecas en 1914.",
    "En 1916 atacó el pueblo de Columbus, en Nuevo México: es la única vez que un ejército latinoamericano ha invadido Estados Unidos. Los estadounidenses enviaron una expedición para atraparlo y no lo consiguieron.",
    "Se retiró a una hacienda y fue asesinado en una emboscada en 1923. Sus restos están en el Monumento a la Revolución desde 1976, aunque se dice que la cabeza se la robaron de su tumba años antes."],
  zapata:["Emiliano Zapata",
    "Emiliano Zapata nació en 1879 en Morelos, al sur de la capital, en una familia de campesinos. Las haciendas de caña de azúcar se habían quedado con las tierras de los pueblos, y esa fue su causa.",
    "En 1911 lanzó el Plan de Ayala, que exigía devolver la tierra a los campesinos. Su lema era Tierra y libertad, y su ejército, el Ejército Libertador del Sur.",
    "No le importaba quién gobernara en la capital: luchó contra Díaz, contra Madero, contra Huerta y contra Carranza, porque ninguno hizo el reparto de tierras. En 1919 lo atrajeron a una trampa en la hacienda de Chinameca y lo mataron.",
    "Es probablemente el revolucionario más querido de México, y su imagen sigue presente en movimientos campesinos e indígenas."],
  carranza:["Venustiano Carranza",
    "Venustiano Carranza, nacido en 1859, era gobernador de Coahuila cuando asesinaron a Madero. No reconoció a Huerta y se puso al frente de los constitucionalistas, con el título de Primer Jefe.",
    "Tras vencer a Huerta, se enfrentó a Villa y a Zapata, y los derrotó con la ayuda de Álvaro Obregón. Como presidente, promulgó la Constitución de 1917, que sigue vigente.",
    "En 1920 intentó imponer a su sucesor, Obregón se levantó contra él, y Carranza murió asesinado mientras huía por la sierra de Puebla."],
  diaz:["Porfirio Díaz",
    "Porfirio Díaz nació en Oaxaca en 1830. Fue un militar destacado en la guerra contra la invasión francesa, y en 1876 llegó al poder con un golpe.",
    "Gobernó, casi sin interrupción, hasta 1911: a ese periodo se le llama el Porfiriato. Trajo paz, ferrocarriles, inversiones extranjeras y edificios a la francesa, como Bellas Artes o el Palacio Postal. Su lema era orden y progreso.",
    "Pero el precio fue una enorme desigualdad: las grandes haciendas se quedaron con las tierras de los pueblos, los obreros no tenían derechos y la oposición era reprimida.",
    "La Revolución lo echó en 1911. Murió en el exilio, en París, en 1915, y sigue enterrado en el cementerio de Montparnasse."],
  juarez:["Benito Juárez",
    "Benito Juárez nació en 1806 en Guelatao, un pueblo zapoteco de la sierra de Oaxaca. Quedó huérfano de niño, fue pastor y no aprendió español hasta los doce años. Llegó a ser abogado, gobernador y presidente de México.",
    "Impulsó las Leyes de Reforma, que separaron la Iglesia del Estado e hicieron laicos el matrimonio y los cementerios.",
    "Cuando Francia invadió México y puso como emperador a Maximiliano de Habsburgo, Juárez mantuvo un gobierno itinerante por el norte del país durante años, hasta que la república ganó en 1867.",
    "Es suya una frase que todo mexicano sabe de memoria: entre los individuos, como entre las naciones, el respeto al derecho ajeno es la paz."],
  maximiliano:["Maximiliano",
    "Maximiliano de Habsburgo era el hermano del emperador de Austria. En 1864, con el apoyo del ejército de Napoleón tercero y de los conservadores mexicanos, aceptó ser emperador de México.",
    "Vivió con su mujer, Carlota, en el Castillo de Chapultepec, que vas a ver la semana que viene, y mandó trazar un gran paseo desde el castillo hasta el centro: es el actual Paseo de la Reforma.",
    "Curiosamente era más liberal de lo que esperaban quienes lo trajeron. Cuando Francia retiró sus tropas, se quedó solo. Fue capturado y fusilado en Querétaro en 1867 por orden de Juárez."],
  iturbide:["Agustín de Iturbide",
    "Agustín de Iturbide era un militar criollo que durante años luchó contra los insurgentes de la Independencia.",
    "En 1821 cambió de bando: pactó con el líder insurgente Vicente Guerrero el Plan de Iguala, y juntos entraron en la capital con el Ejército Trigarante el 27 de septiembre de 1821. Así se consumó la Independencia.",
    "Al año siguiente se hizo proclamar emperador, con el nombre de Agustín primero. Su imperio duró menos de un año: tuvo que abdicar y exiliarse, y cuando volvió en 1824 lo fusilaron."],
  rivera:["Diego Rivera",
    "Diego Rivera, nacido en Guanajuato en 1886, es el pintor más famoso de México junto con Frida Kahlo, con la que estuvo casado dos veces.",
    "Tras pasar años en Europa, volvió a México después de la Revolución y se convirtió en el gran nombre del muralismo: pintar la historia del país en las paredes de edificios públicos, para que la viera todo el pueblo, aunque no supiera leer.",
    "Era comunista, y eso le trajo un escándalo famoso: en 1933 pintó un mural en el Rockefeller Center de Nueva York e incluyó un retrato de Lenin. Se negó a quitarlo y el mural fue destruido. Lo volvió a pintar en Bellas Artes."],
  orozco:["José Clemente Orozco",
    "José Clemente Orozco, nacido en Jalisco en 1883, es uno de los tres grandes del muralismo mexicano, con Rivera y Siqueiros.",
    "De adolescente perdió la mano izquierda en un accidente con pólvora, y aun así pintó murales gigantescos.",
    "Su estilo es mucho más oscuro y dramático que el de Rivera: le interesaba el sufrimiento humano, la violencia de la guerra y de la historia, más que celebrarla. Su obra maestra está en el Hospicio Cabañas de Guadalajara."],
  siqueiros:["David Alfaro Siqueiros",
    "David Alfaro Siqueiros, nacido en 1896, fue el más radical de los tres grandes muralistas. Luchó de joven en la Revolución y pasó parte de su vida en la cárcel por motivos políticos.",
    "Experimentaba con pinturas industriales, pistolas de aire y superficies curvas, para que sus murales tuvieran movimiento cuando el espectador camina.",
    "Y tiene una historia oscura: en 1940 encabezó un asalto armado contra la casa de León Trotsky en Coyoacán para matarlo. Trotsky sobrevivió a ese ataque, aunque fue asesinado meses después por otro agente."]
};

var CSS = [
  ".vjW{display:flex;flex-direction:column;gap:14px;padding-bottom:12px}",
  ".vjMapa{overflow-x:auto;background:var(--sf2);border-radius:18px}",
  ".vjMapa svg{display:block;width:100%;min-width:540px;height:auto}",
  ".vjMapa .st{stroke:var(--ln);stroke-width:6;stroke-linecap:round}",
  ".vjMapa .stl{font:600 11px Manrope,sans-serif;fill:var(--mu)}",
  ".vjMapa .lbl{font:700 13px Manrope,sans-serif;fill:var(--fg)}",
  ".vjMapa .area{font:700 13px Manrope,sans-serif;fill:var(--mu);text-anchor:middle}",
  ".vjMapa .park{fill:#5c9c29;opacity:.2}.vjMapa .plaza{fill:var(--mu);opacity:.15}",
  ".vjMapa .walk{stroke:#e0457b;stroke-width:2;stroke-dasharray:4 4;fill:none}",
  ".vjMapa .met rect{fill:#2d82dc}.vjMapa .met text{font:800 12px Manrope,sans-serif;fill:#fff;text-anchor:middle}",
  ".vjMapa .pin circle{fill:var(--fg)}.vjMapa .pin text{font:800 13px Manrope,sans-serif;fill:var(--bg);text-anchor:middle}",
  ".vjMapa .pin.on circle{fill:#e0457b}.vjMapa .pin.on text{fill:#fff}",
  ".vjNota{font-size:12.5px;font-weight:600;color:var(--mu);line-height:1.4;margin:-6px 4px 0}",
  ".vjAhora{background:#e0457b;color:#fff;border-radius:18px;padding:12px 14px;font-weight:700;font-size:14px;line-height:1.4;display:flex;flex-direction:column;gap:8px}",
  ".vjAhora button{align-self:flex-start;background:#fff;color:#c2185b;border:0;border-radius:999px;font:800 13px Manrope,sans-serif;padding:7px 14px}",
  ".vjL{display:flex;flex-direction:column;gap:8px}",
  ".vjP{display:grid;grid-template-columns:52px 1fr;gap:10px;padding:12px;border-radius:18px;background:var(--sf2);scroll-margin-top:12px}",
  ".vjP.on{box-shadow:inset 0 0 0 2px #e0457b}.vjP.pas{opacity:.5}",
  ".vjH{font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--fg);line-height:1.3}.vjH small{display:block;color:var(--mu);font-weight:600}",
  ".vjC{min-width:0}.vjC h3{margin:0;font-size:16px;font-weight:800;line-height:1.25;color:var(--fg)}",
  ".vjP.mov .vjC h3{font-size:14.5px;font-weight:700}",
  ".vjC>p{margin:4px 0 0;font-size:13.5px;font-weight:600;color:var(--mu);line-height:1.4}",
  ".vjPr{font-size:12.5px;font-weight:800;color:var(--fg);margin-top:6px;font-variant-numeric:tabular-nums}",
  ".vjAh{display:none;font-size:10.5px;font-weight:800;background:#e0457b;color:#fff;border-radius:6px;padding:1px 6px;margin-right:6px;vertical-align:2px}.vjP.on .vjAh{display:inline-block}",
  ".vjLn{display:flex;gap:4px;margin-top:6px}.vjLn span{font-size:10.5px;font-weight:800;color:#fff;border-radius:999px;padding:2px 8px}",
  ".vjL2{background:#2d82dc}.vjL3{background:#5c9c29}.vjL6{background:#e4463e}",
  ".vjAc{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}",
  ".vjB{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:19px;border:1px solid var(--ln);background:var(--sf);color:var(--fg);font:800 13.5px Manrope,sans-serif;text-decoration:none}",
  ".vjB.au{background:#e0457b;border-color:#e0457b;color:#fff}",
  ".vjDur{font-size:12px;font-weight:700;color:var(--mu);margin-top:6px}",
  ".vjSecs{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}",
  ".vjS{height:30px;padding:0 11px;border-radius:15px;border:1px solid var(--ln);background:transparent;color:var(--fg);font:700 12.5px Manrope,sans-serif}",
  ".vjS.va{background:#e0457b;border-color:#e0457b;color:#fff}",
  ".vjG{margin-top:8px}.vjG summary{font-size:13px;font-weight:700;color:var(--mu)}",
  ".vjG .tx{margin-top:6px;font-size:14.5px;font-weight:500;line-height:1.55;color:var(--fg)}.vjG .tx p{margin:0 0 8px}",
  ".vjG .tx h4{margin:12px 0 4px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#e0457b}",
  /* reproductor */
  ".vjRep{position:sticky;bottom:0;z-index:2;margin:0 -2px;padding:12px;border-radius:20px;background:var(--sf);box-shadow:0 -6px 24px rgba(0,0,0,.35);border:1px solid var(--ln);display:flex;flex-direction:column;gap:10px}",
  ".vjRep[hidden]{display:none}",
  ".vjRT{display:flex;align-items:flex-start;gap:8px}.vjRT div{flex:1;min-width:0}",
  ".vjRT b{display:block;font-size:14.5px;font-weight:800;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".vjRT small{display:block;font-size:12.5px;font-weight:700;color:var(--mu)}",
  ".vjRT button{width:34px;height:34px;border:0;border-radius:17px;background:var(--sf2);color:var(--fg);font:800 15px Manrope,sans-serif}",
  ".vjBarra{height:4px;border-radius:2px;background:var(--sf2);overflow:hidden}.vjBarra i{display:block;height:100%;width:0;background:#e0457b}",
  ".vjCtl{display:flex;align-items:center;justify-content:space-between;gap:6px}",
  ".vjCtl button{flex:1 1 0;height:48px;border:0;border-radius:24px;background:var(--sf2);color:var(--fg);font:800 17px Manrope,sans-serif}",
  ".vjCtl .pp{flex:1.4 1 0;background:#e0457b;color:#fff;font-size:20px}",
  ".vjVel{display:flex;align-items:center;justify-content:center;gap:10px;font-size:13px;font-weight:800;color:var(--mu)}",
  ".vjVel button{width:44px;height:34px;border:1px solid var(--ln);border-radius:17px;background:transparent;color:var(--fg);font:800 15px Manrope,sans-serif}",
  ".vjVel span{min-width:92px;text-align:center;color:var(--fg)}",
  ".vjW button:focus-visible,.vjRep button:focus-visible{outline:2px solid #e0457b;outline-offset:2px}"
].join("\n");

var MAPA =
'<svg viewBox="0 0 600 250" role="img" aria-label="Mapa del Centro Histórico con las paradas numeradas">' +
'<rect x="207" y="102" width="109" height="35" rx="4" class="park"/><text x="261" y="124" class="area">Alameda</text>' +
'<rect x="470" y="168" width="70" height="52" rx="3" class="plaza"/><text x="505" y="232" class="area">Zócalo</text>' +
'<rect x="20" y="96" width="40" height="32" rx="3" class="plaza"/>' +
'<line x1="338" y1="20" x2="338" y2="240" class="st"/><text x="332" y="34" class="stl" text-anchor="end">Eje Central</text>' +
'<line x1="350" y1="158" x2="470" y2="170" class="st"/><text x="410" y="152" class="stl" text-anchor="middle">Madero (peatonal)</text>' +
'<line x1="150" y1="137" x2="330" y2="137" class="st"/><text x="180" y="152" class="stl">Av. Juárez</text>' +
'<path d="M38 111 L150 137" class="walk"/><path d="M38 111 L47 45" class="walk"/><path d="M356 156 L334 133" class="walk"/>' +
'<g class="met"><rect x="38" y="36" width="18" height="18" rx="4"/><text x="47" y="49">M</text></g><text x="62" y="49" class="lbl">Metro Revolución → Basílica</text>' +
'<g class="met"><rect x="312" y="98" width="18" height="18" rx="4"/><text x="321" y="111">M</text></g><text x="302" y="92" class="lbl" text-anchor="end">Metro Bellas Artes ← vuelta</text>' +
'<g class="met"><rect x="486" y="200" width="18" height="18" rx="4"/><text x="495" y="213">M</text></g>' +
'{PINS}' +
'<text x="492" y="86" class="lbl" text-anchor="end">SEP</text><text x="560" y="210" class="lbl" text-anchor="end">Palacio N.</text><text x="520" y="128" class="lbl">Templo M.</text>' +
'<text x="470" y="146" class="lbl" text-anchor="end">Catedral</text><text x="382" y="190" class="lbl">Azulejos</text>' +
'<text x="352" y="210" class="lbl">Torre Latino</text><line x1="340" y1="179" x2="347" y2="163" stroke="var(--mu)"/>' +
'<text x="70" y="116" class="lbl">Revolución</text><text x="585" y="30" class="lbl" text-anchor="end">N ↑</text>' +
'<line x1="20" y1="232" x2="125" y2="232" stroke="var(--fg)" stroke-width="2"/><text x="20" y="226" class="stl">500 m</text></svg>';
var XY = { 10:[498,100], 2:[550,187], 3:[512,152], 4:[540,140], 5:[368,172], 6:[334,133], 7:[38,111], 9:[340,190] };

function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]; }); }
function min(h) { var a = h.split(":"); return (+a[0]) * 60 + (+a[1]); }
function ahora() {
  try {
    var o = {};
    new Intl.DateTimeFormat("es-MX", { timeZone:"America/Mexico_City", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false })
      .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    return { dia:o.year + "-" + o.month + "-" + o.day, m:(+o.hour % 24) * 60 + (+o.minute) };
  } catch (e) { return { dia:"", m:0 }; }
}
function palabras(sec) { var n = 0; sec.slice(1).forEach(function (p) { n += p.split(/\s+/).length; }); return n; }
function minutos(g) { var n = 0; g.forEach(function (s) { n += palabras(s); }); return Math.max(1, Math.round(n / 150)); }

/* ---------------------------------------------------------------------------
   Reproductor. Estado: sitio i, sección s, frase k. Frases ≤180 letras (el
   mp3 de Google corta ahí y la voz nativa responde mejor en trozos cortos).
   --------------------------------------------------------------------------- */
var VELS = [0.75, 0.85, 1, 1.15, 1.3, 1.5];
var R = { i:-1, s:0, k:0, fr:[], va:false, turno:0, vel:1, modo:null, empezo:false, prev:null };
try { var v0 = parseFloat(localStorage.getItem("copiloto.viaje.vel")); if (VELS.indexOf(v0) >= 0) R.vel = v0; } catch (e) {}
var UI = null, audioV = null;

function trozos(txt) {
  var out = [], cur = "";
  String(txt).split(/(?<=[.;:!?])\s+/).forEach(function (f) {
    if (f.length > 180) {                          // frase muy larga: por comas
      f.split(/(?<=,)\s+/).forEach(function (g) {
        if ((cur + " " + g).length > 180 && cur) { out.push(cur); cur = g; } else cur = cur ? cur + " " + g : g;
      });
      return;
    }
    if ((cur + " " + f).length > 180 && cur) { out.push(cur); cur = f; } else cur = cur ? cur + " " + f : f;
  });
  if (cur) out.push(cur);
  return out;
}
function src(i) { return typeof i === "string" ? { n:Q[i][0], g:[Q[i]], quien:1 } : P[i]; }
function frases(i, s) {
  var sec = src(i).g[s], out = [sec[0] + "."];       // dice el título de la sección
  sec.slice(1).forEach(function (p) { out = out.concat(trozos(p)); });
  return out;
}
function corta() {
  R.turno++;
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  try { if (audioV) { audioV.onended = audioV.onerror = null; audioV.pause(); } } catch (e) {}
}
function fin() {
  corta(); R.va = false;
  if (R.prev) { var pv = R.prev; R.prev = null; R.i = pv.i; R.s = pv.s; R.k = pv.k; R.fr = frases(R.i, R.s); pintaRep(); aviso("Pausa · sigue la guía donde la dejaste"); return; }
  R.i = -1; pintaRep();
}
function cierra() { R.prev = null; corta(); R.va = false; R.i = -1; pintaRep(); }
function pausa() { corta(); R.va = false; pintaRep(); }

function di() {                                     // dice la frase R.k de la sección actual
  var mio = ++R.turno;
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  if (R.k >= R.fr.length) {                         // fin de la sección: la siguiente, si hay
    if (R.s + 1 < src(R.i).g.length) { R.s++; R.k = 0; R.fr = frases(R.i, R.s); pintaRep(); di(); }
    else fin();
    return;
  }
  pintaRep();
  var txt = R.fr[R.k];
  var sig = function () { if (mio !== R.turno) return; R.k++; di(); };
  if (R.modo === "mp3") { porAudio(txt, sig, mio); return; }
  var S = window.speechSynthesis;
  if (!S || typeof SpeechSynthesisUtterance === "undefined") { R.modo = "mp3"; porAudio(txt, sig, mio); return; }
  var arr = false;
  var u = new SpeechSynthesisUtterance(txt); u.lang = "es-ES"; u.rate = R.vel; u.volume = 1;
  u.onstart = function () { arr = true; R.empezo = true; R.modo = "voz"; };
  u.onend = sig;
  u.onerror = function (e) { var er = e && e.error;
    if (mio !== R.turno || er === "interrupted" || er === "canceled") return;
    if (!arr && !R.empezo) { R.modo = "mp3"; porAudio(txt, sig, mio); } else sig(); };
  try { S.speak(u); } catch (e) { R.modo = "mp3"; porAudio(txt, sig, mio); return; }
  if (!R.empezo) setTimeout(function () {           // la voz en frío tarda; si sigue muda, mp3
    if (mio === R.turno && !arr && !R.empezo) { try { S.cancel(); } catch (e) {} R.modo = "mp3"; porAudio(txt, sig, mio); }
  }, (window.Nativo && Nativo.es) ? 6000 : 3500);
}
function porAudio(txt, sig, mio) {                  // mp3 de Google (necesita datos)
  if (mio !== R.turno) return;
  if (!audioV) { audioV = new Audio(); audioV.preload = "auto"; }
  audioV.onended = sig;
  audioV.onerror = function () { if (mio === R.turno) { pausa(); aviso("Sin voz: no hay datos y la voz del móvil no responde."); } };
  audioV.src = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=es&q=" + encodeURIComponent(txt);
  try { audioV.playbackRate = R.vel; audioV.defaultPlaybackRate = R.vel; } catch (e) {}
  var p = audioV.play(); if (p && p.catch) p.catch(function () { if (mio === R.turno) pausa(); });
}

function empieza(i, s) {
  corta();
  if (typeof i === "string") { if (R.i >= 0 && typeof R.i !== "string") R.prev = { i:R.i, s:R.s, k:R.k }; }
  else R.prev = null;
  R.i = i; R.s = s || 0; R.k = 0; R.fr = frases(R.i, R.s); R.va = true;
  di();
}
function sigue() { if (R.i < 0) return; R.va = true; di(); }
function sec(d) {
  if (R.i < 0) return;
  var n = R.s + d;
  if (d < 0 && R.k > 2) n = R.s;                    // como en la música: atrás primero reinicia la sección
  if (n < 0) n = 0;
  if (n >= src(R.i).g.length) { fin(); return; }
  corta(); R.s = n; R.k = 0; R.fr = frases(R.i, R.s);
  if (R.va) di(); else pintaRep();
}
function frAtras() {
  if (R.i < 0) return;
  corta(); R.k = Math.max(0, R.k - 1);
  if (R.va) di(); else pintaRep();
}
function vel(d) {
  var j = VELS.indexOf(R.vel); if (j < 0) j = 2;
  j = Math.min(VELS.length - 1, Math.max(0, j + d)); R.vel = VELS[j];
  try { localStorage.setItem("copiloto.viaje.vel", String(R.vel)); } catch (e) {}
  if (R.modo === "mp3" && audioV) { try { audioV.playbackRate = R.vel; } catch (e) {} pintaRep(); return; }
  if (R.va) di(); else pintaRep();                  // la voz nativa no cambia en marcha: repite la frase
}
function aviso(t) { if (UI) { UI.sub.textContent = t; } }

function pintaRep() {
  if (!UI || !UI.rep.isConnected) return;
  var c = UI.c;
  [].forEach.call(c.querySelectorAll(".vjS.va"), function (b) { b.classList.remove("va"); });
  if (R.i < 0) { UI.rep.hidden = true; return; }
  UI.rep.hidden = false;
  var x = src(R.i), g = x.g;
  UI.tit.textContent = (x.quien ? "👤 ¿Quién es? " : "🔊 ") + (x.n || x.t);
  UI.sub.textContent = x.quien ? (R.prev ? "Al acabar vuelves a la guía" : "Personaje") : "Sección " + (R.s + 1) + " de " + g.length + " · " + g[R.s][0];
  UI.pp.textContent = R.va ? "⏸" : "▶";
  UI.pp.setAttribute("aria-label", R.va ? "Pausa" : "Seguir");
  UI.vel.textContent = "Velocidad " + String(R.vel).replace(".", ",") + "×";
  UI.barra.style.width = (R.fr.length ? Math.round(100 * Math.min(R.k, R.fr.length) / R.fr.length) : 0) + "%";
  var b = typeof R.i === "string" ? c.querySelector('.vjQ[data-q="' + R.i + '"]') : c.querySelector('.vjS[data-i="' + R.i + '"][data-s="' + R.s + '"]'); if (b) b.classList.add("va");
}

/* ---- pantalla ---- */
var reloj = null;

/* ---------------------------------------------------------------------------
   v2.82: el horario sale del calendario de Google (ruta /viaje del Worker,
   secreto ICAL_VIAJE). Cada evento se empareja por nombre con una parada de
   la guía (P o EXTRA) para conservar mapa, pin y audio; lo que no empareja
   sale tal cual, con la descripción del calendario. Sin conexión o sin el
   secreto, se queda el último horario bueno guardado o el plan fijo.
   --------------------------------------------------------------------------- */
var FIJO = P.slice(), SYNC = { estado:"", hora:"" }, K_SYNC = "copiloto.viaje.cal." + DIA;
function nrm(t) {
  return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
}
var MOVIL = /^(🚇|🚕|🚌|🚶‍♂️|🚆)/;
function empareja(ev, usados) {
  var tt = " " + nrm(ev.titulo) + " ", cat = FIJO.concat(EXTRA), mejor = null;
  if (MOVIL.test(ev.titulo)) return null;           // trayectos: tal cual el calendario
  cat.forEach(function (x) {
    if (mejor || usados.indexOf(x) >= 0 || x.mov) return;
    if (nrm(x.t) === nrm(ev.titulo)) { mejor = x; return; }
    var n = nrm(x.n || ""); if (n && tt.indexOf(" " + n) >= 0) mejor = x;
  });
  return mejor;
}
function desdeCal(evs) {
  var usados = [], out = [];
  evs.forEach(function (ev) {
    if (!ev.hora) return;
    var x = empareja(ev, usados), y;
    if (x) { usados.push(x); y = Object.assign({}, x); }
    else {
      var txt = String(ev.texto || "").replace(/\s+/g, " ").trim();
      y = { d: txt.length > 260 ? txt.slice(0, 257) + "…" : txt, $:"" };
      if (MOVIL.test(ev.titulo)) {
        y.mov = 1; var ls = (ev.texto || "").match(/\bL\d{1,2}\b/g);
        if (ls) y.l = ls.filter(function (l, i) { return ls.indexOf(l) === i && /^L[1-9]$|^L1[0-2]$/.test(l); });
        if (ev.lugar) y.map = RUTA(ev.lugar);
      } else if (ev.lugar) y.map = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(ev.lugar);
    }
    y.s = ev.hora.replace(/^0/, ""); y.e = (ev.fin || ev.hora).replace(/^0/, ""); y.t = ev.titulo;
    out.push(y);
  });
  out.sort(function (a, b) { return min(a.s) - min(b.s); });
  return out;
}
function aplica(evs, estado, hora) {
  var q = desdeCal(evs);
  if (!q.length) return false;
  P = q; SYNC = { estado:estado, hora:hora }; return true;
}
function guardado() {
  try { var g = JSON.parse(localStorage.getItem(K_SYNC) || "null"); if (g && g.eventos) aplica(g.eventos, "guardado", g.hora); } catch (e) {}
}
function sincroniza(c) {
  var cf = window.conf || {};
  if (!cf.url || !cf.key) { SYNC.estado = SYNC.estado || "sinclave"; return; }
  fetch(cf.url.replace(/\/+$/, "") + "/viaje?dia=" + DIA, { headers:{ "X-Copiloto-Key":cf.key }, cache:"no-store" })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (j && j.error === "sin_viaje") { if (!SYNC.estado) SYNC.estado = "sinsecreto"; if (c.isConnected) pinta(c, 1); return; }
      if (!j || j.error || !j.eventos) throw 0;
      var h = ahora(), hh = Math.floor(h.m / 60) + ":" + ("0" + h.m % 60).slice(-2);
      if (aplica(j.eventos, "ok", hh)) {
        try { localStorage.setItem(K_SYNC, JSON.stringify({ hora:hh, eventos:j.eventos })); } catch (e) {}
      }
      if (c.isConnected && !R.va) pinta(c, 1);
    })
    .catch(function () { if (!SYNC.estado) SYNC.estado = "sinred"; if (c.isConnected && !R.va) pinta(c, 1); });
}
function notaSync() {
  var t = { ok:"📅 Horario del calendario (actualizado a las " + SYNC.hora + ").",
            guardado:"📅 Horario del calendario guardado a las " + SYNC.hora + " (sin conexión ahora).",
            sinsecreto:"📅 Falta conectar el calendario (secreto ICAL_VIAJE en Cloudflare): se ve el plan fijo.",
            sinred:"📅 No se ha podido leer el calendario: se ve el plan fijo.",
            sinclave:"📅 Sin conexión con el Worker: se ve el plan fijo." }[SYNC.estado];
  return t ? '<div class="vjNota">' + esc(t) + '</div>' : "";
}
guardado();

function pinta(c, sinPedir) {
  cierra();
  if (!document.getElementById("vjCss")) { var st = document.createElement("style"); st.id = "vjCss"; st.textContent = CSS; document.head.appendChild(st); }
  var pins = "";
  P.forEach(function (x, i) {
    if (x.pin && XY[x.pin]) pins += '<a href="' + esc(x.map) + '" target="_blank" rel="noopener"><g class="pin" data-i="' + i + '"><circle cx="' + XY[x.pin][0] + '" cy="' + XY[x.pin][1] + '" r="11"/><text x="' + XY[x.pin][0] + '" y="' + (XY[x.pin][1] + 5) + '">' + x.pin + '</text></g></a>';
  });
  var h = '<div class="vjW"><div class="vjMapa">' + MAPA.replace("{PINS}", pins) + '</div>' +
    '<div class="vjNota">El número en rosa es donde te toca estar. Tócalo para abrirlo en Google Maps. Fuera del mapa: 1 Soriana (al sur) y 8 Basílica (al norte).</div>' +
    notaSync() + '<div class="vjAhora"><span class="vjAhT">–</span><button type="button" class="vjIr">Ir a lo de ahora</button></div><div class="vjL">';
  P.forEach(function (x, i) {
    h += '<div class="vjP' + (x.mov ? " mov" : "") + '" data-i="' + i + '"><div class="vjH">' + x.s + '<small>' + x.e + '</small></div><div class="vjC">' +
      '<h3><span class="vjAh">AHORA</span>' + esc(x.t) + '</h3><p>' + esc(x.d) + '</p>' +
      (x.l ? '<div class="vjLn">' + x.l.map(function (l) { return '<span class="vj' + l + '">' + l + '</span>'; }).join("") + '</div>' : "") +
      '<div class="vjPr">' + esc(x.$) + '</div>';
    if (x.map || x.g) {
      h += '<div class="vjAc">' + (x.map ? '<a class="vjB" href="' + esc(x.map) + '" target="_blank" rel="noopener">📍 ' + esc(x.mapTxt || (x.mov ? "Ruta" : "Mapa")) + '</a>' : "") +
        (x.g ? '<button type="button" class="vjB au" data-i="' + i + '">🔊 Escuchar guía</button>' : "") + '</div>';
    }
    if (x.g) {
      h += '<div class="vjDur">Guía de unos ' + minutos(x.g) + ' min · empieza por la sección que quieras:</div><div class="vjSecs">' +
        x.g.map(function (sg, s) { return '<button type="button" class="vjS" data-i="' + i + '" data-s="' + s + '">' + (s + 1) + '. ' + esc(sg[0]) + '</button>'; }).join("") + '</div>' +
        (x.q ? '<div class="vjDur">¿Quién es? Personajes y palabras que salen:</div><div class="vjSecs">' + x.q.map(function (k) { return '<button type="button" class="vjS vjQ" data-q="' + k + '">👤 ' + esc(Q[k][0]) + '</button>'; }).join("") + '</div>' : "") +
        '<details class="vjG"><summary>Leer la guía</summary><div class="tx">' +
        x.g.map(function (sg) { return "<h4>" + esc(sg[0]) + "</h4>" + sg.slice(1).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join(""); }).join("") + '</div></details>';
    }
    h += '</div></div>';
  });
  h += '</div><div class="vjNota">Efectivo: llevas $700. Comida $150–250 y monedas para baños; lo demás con tarjeta.</div>' +
    '<div class="vjNota">Batería: la guía no usa el GPS ni deja la pantalla encendida. Puedes bloquear el móvil mientras escuchas; si al bloquearlo se corta entre frases, dale a ▶ al volver.</div></div>' +
    '<div class="vjRep" hidden><div class="vjRT"><div><b class="vjRTi">–</b><small class="vjRSu">–</small></div><button type="button" class="vjX" aria-label="Cerrar la guía">✕</button></div>' +
    '<div class="vjBarra"><i></i></div>' +
    '<div class="vjCtl"><button type="button" class="vjAnt" aria-label="Sección anterior">⏮</button><button type="button" class="vjFr" aria-label="Frase anterior">↺</button>' +
    '<button type="button" class="pp" aria-label="Pausa">⏸</button><button type="button" class="vjSig" aria-label="Sección siguiente">⏭</button></div>' +
    '<div class="vjVel"><button type="button" class="vjMenos" aria-label="Más lento">−</button><span class="vjVt">Velocidad 1×</span><button type="button" class="vjMas" aria-label="Más rápido">+</button></div></div>';
  c.innerHTML = h;

  UI = { c:c, rep:c.querySelector(".vjRep"), tit:c.querySelector(".vjRTi"), sub:c.querySelector(".vjRSu"), pp:c.querySelector(".vjRep .pp"),
         vel:c.querySelector(".vjVt"), barra:c.querySelector(".vjBarra i") };
  UI.pp.addEventListener("click", function () { if (R.va) pausa(); else sigue(); });
  c.querySelector(".vjAnt").addEventListener("click", function () { sec(-1); });
  c.querySelector(".vjSig").addEventListener("click", function () { sec(1); });
  c.querySelector(".vjFr").addEventListener("click", frAtras);
  c.querySelector(".vjMenos").addEventListener("click", function () { vel(-1); });
  c.querySelector(".vjMas").addEventListener("click", function () { vel(1); });
  c.querySelector(".vjX").addEventListener("click", cierra);
  [].forEach.call(c.querySelectorAll(".vjQ"), function (b) { b.addEventListener("click", function () { empieza(b.dataset.q, 0); }); });
  [].forEach.call(c.querySelectorAll(".vjB.au"), function (b) { b.addEventListener("click", function () { empieza(+b.dataset.i, 0); }); });
  [].forEach.call(c.querySelectorAll(".vjS:not(.vjQ)"), function (b) { b.addEventListener("click", function () { empieza(+b.dataset.i, +b.dataset.s); }); });

  var filas = [].slice.call(c.querySelectorAll(".vjP")), cur = null;
  function marca() {
    if (!c.isConnected) { clearInterval(reloj); cierra(); return; }
    if (document.hidden) return;                    // con la app en segundo plano no gasta nada
    var n = ahora(), hoy = n.dia === DIA, sig = null; cur = null;
    filas.forEach(function (f) {
      var x = P[+f.dataset.i]; f.classList.remove("on", "pas");
      if (!hoy) return;
      if (n.m >= min(x.e)) f.classList.add("pas");
      else if (n.m >= min(x.s) && !cur) cur = f;
      else if (n.m < min(x.s) && !sig) sig = f;
    });
    if (hoy && !cur) cur = sig;
    if (cur) cur.classList.add("on");
    c.querySelectorAll(".pin").forEach(function (p) { p.classList.toggle("on", !!cur && p.dataset.i === cur.dataset.i); });
    var t = c.querySelector(".vjAhT");
    if (!hoy) { t.textContent = "Plan del miércoles 4 de noviembre."; return; }
    if (!cur) { t.textContent = "Día terminado."; return; }
    var x = P[+cur.dataset.i], nx = P[+cur.dataset.i + 1];
    t.innerHTML = "<b>Ahora (" + x.s + "–" + x.e + "):</b> " + esc(x.t) + (nx ? "<br>Después, a las " + nx.s + ": " + esc(nx.t) : "");
  }
  marca(); clearInterval(reloj); reloj = setInterval(marca, 60000);
  c.querySelector(".vjIr").addEventListener("click", function () { marca(); if (cur) cur.scrollIntoView({ behavior:"smooth", block:"start" }); });
  setTimeout(function () { if (cur) cur.scrollIntoView({ block:"start" }); }, 350);
  if (!sinPedir) sincroniza(c);
}

window.Viaje = { pinta:pinta, para:cierra, _Q:Q, dia:DIA, _P:P, _lista:function () { return P; }, _frases:frases };
})();
