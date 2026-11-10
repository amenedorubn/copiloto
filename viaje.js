/* ===========================================================================
   VIAJE · guía del día (miércoles 11: Polanco, Cablebús, Chapultepec, Reforma, Roma-Condesa y Bellas Artes)
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

var DIA = "2026-11-11";
/* Textos del día (cambian con cada guía). */
var TXT = {
  mapa:"El norte queda arriba. El mapa es esquemático: cada número abre el sitio en Google Maps. Las horas son orientativas: toca la parada en la que estés.",
  pie:"Bellas Artes vende boletos hasta las 17:30 y cierra a las 18:00; el Castillo cierra a las 17:00. Lleva la tarjeta MI cargada y algo de efectivo para el mercado.",
  otro:"Plan del miércoles 11 de noviembre."
};
var GM = "https://maps.google.com/?cid=";
var RUTA = function (d) { return "https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=" + encodeURIComponent(d); };

/* ---------------------------------------------------------------------------
   Paradas. s/e: hora · pin: número en el mapa · mov: trayecto
   g: secciones de la guía [[título, párrafo, párrafo…], …]
   --------------------------------------------------------------------------- */
var P = [
  { s:"9:00", e:"9:50", t:"🚇 Casa → Polanco (Plaza Carso)", d:"Zapata → Mixcoac (L12), Mixcoac → San Joaquín (L7) y unos 10 min andando hasta Plaza Carso.", l:["L12","L7"], $:"$5", map:RUTA("Museo Soumaya, Plaza Carso, Ciudad de México"), mov:1 },

  { s:"9:50", e:"10:10", t:"🪞 Museo Soumaya y Museo Jumex (por fuera)", n:"Soumaya", d:"Solo por fuera: fotos del edificio plateado y del blanco de dientes de sierra, que están uno frente al otro.", $:"$0", map:"https://www.google.com/maps/search/?api=1&query=Museo+Soumaya+Plaza+Carso", pin:1, g:[
    ["Lo esencial",
      "Estás en Plaza Carso, en lo que se conoce como Nuevo Polanco. Hace unas décadas esto era una zona de fábricas y almacenes. Hoy es un barrio de torres de oficinas, centros comerciales y dos museos que son, sobre todo, dos edificios para fotografiar.",
      "El plateado y retorcido es el Museo Soumaya. El blanco y anguloso, justo enfrente, es el Museo Jumex. Son casi opuestos: uno es todo curvas y brillo, el otro es todo líneas rectas y sobriedad. Mirarlos juntos es la gracia del sitio.",
      "Tienes veinte minutos: rodea el Soumaya por fuera, haz la foto desde la explanada entre los dos, y sigue hacia el metro."],
    ["El Museo Soumaya",
      "El Soumaya lo mandó construir Carlos Slim, uno de los hombres más ricos del mundo, y lleva el nombre de su mujer, Soumaya Domit, que murió en 1999. Se inauguró en 2011.",
      "El arquitecto fue Fernando Romero, yerno de Slim. El edificio mide unos cuarenta y seis metros de alto, tiene seis plantas y no tiene ni una sola ventana hacia fuera. Está forrado con unas dieciséis mil piezas hexagonales de aluminio, que le dan ese brillo de escamas.",
      "La forma se ha comparado con muchas cosas: un reloj de arena retorcido, una escultura de Rodin, un yunque, una nube. Rodéalo despacio y verás que cambia de silueta según desde dónde lo mires: por un lado parece estrecho y por otro se abre como una falda.",
      "Por dentro guarda decenas de miles de obras, sobre todo arte europeo y mexicano, y en la última planta, bajo el techo, una de las mayores colecciones de esculturas de Rodin fuera de Francia. La entrada es gratis todos los días, pero hoy no entras: la foto de fuera es lo que buscabas."],
    ["El Museo Jumex",
      "El edificio blanco de enfrente es el Museo Jumex, abierto en 2013. Lo diseñó el arquitecto británico David Chipperfield.",
      "Fíjate en el tejado: son dientes de sierra, como los de las naves industriales antiguas. Sirven para que entre luz natural del norte en las salas de arriba. Es un guiño al pasado fabril del barrio.",
      "Jumex es una marca mexicana de zumos, y el museo pertenece a la fundación de la familia propietaria. Su colección de arte contemporáneo es una de las más importantes de América Latina. Dentro hay exposiciones que cambian, pero hoy también es solo para fuera.",
      "Y una curiosidad: el edificio está levantado sobre pilares, con la planta baja casi transparente, para que la explanada siga por debajo como si fuera una plaza."],
    ["Consejos",
      "La mejor foto de los dos juntos es desde el centro de la explanada, un poco apartado hacia la avenida, con el Soumaya a un lado y el Jumex al otro.",
      "Para volver al metro, desanda el camino hasta San Joaquín, en la Línea 7, la naranja. Vas en dirección Barranca del Muerto, tres paradas, y te bajas en Constituyentes."] ] },

  { s:"10:10", e:"10:25", t:"🚇 San Joaquín → Constituyentes", d:"L7 dirección Barranca del Muerto, 3 paradas. La estación del Cablebús, Los Pinos/Constituyentes, está pegada a la salida.", l:["L7"], $:"$5", map:RUTA("Cablebús Los Pinos Constituyentes, Ciudad de México"), mov:1 },

  { s:"10:25", e:"11:30", t:"🚡 Cablebús Línea 3 (teleférico de Chapultepec)", n:"Cablebus", q:["mexicas", "moctezuma", "rivera", "orozco", "siqueiros", "cardenas"], d:"Ida y vuelta desde Los Pinos/Constituyentes hasta Vasco de Quiroga (unos 25 min por trayecto). Si vas justo, baja en Cineteca y vuelve. Paga con la tarjeta MI.", $:"$7 + $7", map:"https://www.google.com/maps/search/?api=1&query=Cableb%C3%BAs+L%C3%ADnea+3+Los+Pinos+Constituyentes", pin:2, g:[
    ["Lo esencial",
      "Estás en la Línea 3 del Cablebús, el teleférico urbano de Ciudad de México. Se inauguró en septiembre de 2024 y une la entrada de Los Pinos, junto al metro Constituyentes, con el pueblo de Santa Fe, al oeste.",
      "Son unos cinco kilómetros y medio y seis estaciones: Los Pinos y Constituyentes, Panteón de Dolores, Charrería, Parque de Cultura Urbana y Colegio de Arquitectos, Cineteca Nacional y Bodega de Arte, y Vasco de Quiroga. De punta a punta se tarda poco más de veinte minutos.",
      "Lo que lo hace especial es que va casi todo el rato por encima del Bosque de Chapultepec, cruzando sus cuatro secciones. Es transporte público, cuesta siete pesos, y es la mejor vista aérea barata que vas a tener del poniente de la ciudad.",
      "El plan: subes en Los Pinos, vas hasta el final y vuelves sin bajarte. Si se te hace tarde, bájate en Cineteca, cambia de andén y regresa."],
    ["Qué es Chapultepec",
      "Chapultepec es una palabra náhuatl: chapulín es saltamontes, y tépetl es cerro. El cerro del chapulín. El símbolo antiguo del lugar es un saltamontes sobre un monte, y lo verás dibujado en las estaciones del metro.",
      "El cerro tenía manantiales de agua dulce, y eso era oro para Tenochtitlan, que estaba en medio de un lago de agua salobre. Los mexicas construyeron un acueducto desde aquí hasta la ciudad. Por eso este bosque es sagrado desde hace siglos: los gobernantes mexicas venían a descansar aquí, y en las rocas del cerro se tallaron sus retratos.",
      "Hoy el Bosque de Chapultepec es uno de los parques urbanos más grandes del continente, de unas setecientas hectáreas, más o menos el doble que Central Park. Tiene museos, un zoológico, lagos, el castillo y el antiguo palacio presidencial."],
    ["Los Pinos, la estación de salida",
      "La estación de salida se llama Los Pinos por la antigua residencia oficial de los presidentes de México. Desde los años treinta, con el presidente Lázaro Cárdenas, los presidentes vivieron allí en vez de en el castillo, que les parecía demasiado imperial.",
      "En diciembre de 2018, el presidente López Obrador se negó a vivir en Los Pinos y lo abrió al público como centro cultural. Ahora cualquiera puede pasear por los jardines y ver los despachos y las habitaciones de los antiguos presidentes. La entrada es gratis."],
    ["Lo que vas a ver desde la cabina",
      "Nada más salir, a tu izquierda y a tu derecha, la segunda sección del bosque, con sus lagos y el parque de diversiones. Después vas a pasar por encima de un mar de tumbas: es el Panteón de Dolores, el cementerio más grande de la ciudad.",
      "Dentro del panteón está la Rotonda de las Personas Ilustres, donde están enterrados muchos de los grandes nombres de México: entre ellos los muralistas Diego Rivera, José Clemente Orozco y David Alfaro Siqueiros, cuyas obras vas a ver esta tarde en Bellas Artes.",
      "La siguiente estación es Charrería, por el lienzo charro de la zona. La charrería es el deporte nacional de México, una especie de rodeo con caballos, lazos y trajes de charro, y es patrimonio cultural inmaterial de la humanidad.",
      "Luego viene el Parque de Cultura Urbana, con pistas para patines, bicis y monopatín, y después la Cineteca Nacional de Chapultepec, una sede nueva de la filmoteca de México, construida sobre antiguos terrenos militares. Esa es la parte más nueva del bosque, la cuarta sección, que se abrió en 2024.",
      "Al final, la estación Vasco de Quiroga, en el pueblo de Santa Fe. Mira hacia el oeste: los rascacielos de cristal que se ven son el distrito de negocios de Santa Fe, levantado sobre antiguos tiraderos de basura y minas de arena."],
    ["Mirando la ciudad",
      "A la vuelta, ya mirando hacia el este, tienes la mejor panorámica. Busca las torres de Reforma, la avenida que vas a recorrer andando después del castillo. Y en un día claro, al fondo, los volcanes: el Popocatépetl, que suele echar humo, y el Iztaccíhuatl, la mujer dormida, con su silueta alargada y blanca.",
      "Fíjate también en el relieve. Ciudad de México está en un valle cerrado rodeado de montañas, a más de dos mil doscientos metros. El poniente, donde estás, es la parte alta y con barrancas; el centro es el fondo plano del antiguo lago.",
      "Una curiosidad del Cablebús: es el único transporte de la ciudad donde puedes subir con la bici a cualquier hora."],
    ["Consejos",
      "Ten a mano la tarjeta MI: se paga al entrar en la estación, siete pesos por viaje. Como vuelves desde la otra punta, pagas dos veces.",
      "Al volver a Los Pinos, sal hacia el bosque. El Castillo de Chapultepec queda a unos veinte minutos andando, hacia el este, por la primera sección. La subida al cerro se hace por una rampa: también hay un trenecito, pero andando se tarda casi lo mismo."] ] },

  { s:"11:30", e:"11:50", t:"🚶‍♂️ Los Pinos → Castillo de Chapultepec", d:"Andando por la primera sección del bosque, unos 20 min, y la rampa de subida al cerro.", $:"$0", map:"https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=Castillo+de+Chapultepec", mov:1 },

  { s:"11:50", e:"13:20", t:"🏰 Castillo de Chapultepec (Museo Nacional de Historia)", n:"Castillo", q:["maximiliano", "carlota", "ninos", "juarez", "diaz", "siqueiros", "orozco", "hidalgo", "cardenas"], d:"Entrada unos $100. Primero el museo de abajo (historia), luego el Alcázar de arriba (salones de Maximiliano y Carlota) y la terraza con las vistas de Reforma.", $:"~$100 💳", map:"https://www.google.com/maps/search/?api=1&query=Castillo+de+Chapultepec", pin:3, g:[
    ["Lo esencial",
      "Estás en el único castillo de América del Norte que fue residencia real de verdad. Así lo suelen presentar los mexicanos, y tiene su parte de razón: aquí vivieron un emperador y una emperatriz.",
      "En este cerro se resume la historia de México: fue lugar sagrado de los mexicas, casa de verano de un virrey, academia militar, campo de batalla contra Estados Unidos, palacio de Maximiliano, residencia de los presidentes y, desde los años cuarenta, Museo Nacional de Historia.",
      "El edificio tiene dos partes. Abajo, el museo, con salas que van de la conquista a la Revolución. Arriba, en lo alto del cerro, el Alcázar: las habitaciones de Maximiliano y Carlota y, después, de Porfirio Díaz, con un jardín y una terraza desde donde se ve todo el Paseo de la Reforma.",
      "Tienes hora y media. Mi consejo: una hora para el museo y la media hora final para el Alcázar y la terraza, que es lo más bonito."],
    ["El cerro antes del castillo",
      "Mucho antes del castillo, este cerro fue uno de los primeros hogares de los mexicas. Cuando llegaron al valle, hacia finales del siglo trece, eran un pueblo pobre y mal visto, y se instalaron aquí, en Chapultepec, por el agua de los manantiales.",
      "Sus vecinos no los querían. Hacia el año 1300 una coalición de pueblos del valle los atacó y los expulsó del cerro, y su jefe fue capturado y sacrificado. Los mexicas tuvieron que huir y vagar por los pantanos del lago hasta que, unos años después, fundaron Tenochtitlan en un islote. Por eso, cuando ya eran poderosos, volvieron aquí con orgullo.",
      "Los gobernantes mexicas convirtieron el cerro en lugar sagrado y de descanso. Construyeron albercas, plantaron árboles y tallaron sus retratos en la roca del cerro. El de Moctezuma segundo todavía se intuye, muy dañado, en la ladera.",
      "Fíjate en los árboles enormes del bosque, de tronco ancho y retorcido: son ahuehuetes, el árbol nacional de México. Algunos de los de Chapultepec tienen varios siglos, y la tradición dice que los gobernantes mexicas ya paseaban entre ellos."],
    ["Del virrey a la academia militar",
      "El castillo lo empezó a construir en 1785 el virrey Bernardo de Gálvez, un militar malagueño famoso por haber ayudado a los estadounidenses en su guerra de independencia. Lo quería como casa de recreo, pero murió al año siguiente y la obra se quedó a medias.",
      "La Corona se desentendió, el edificio pasó por varias manos y, ya con México independiente, en 1841 se instaló aquí el Colegio Militar, la academia donde se formaban los cadetes del ejército. Ese detalle es clave para lo que pasó seis años después."],
    ["La batalla de Chapultepec y los Niños Héroes",
      "En 1846 estalló la guerra entre México y Estados Unidos. Los estadounidenses querían los territorios del norte de México, y su ejército llegó hasta la capital.",
      "El 13 de septiembre de 1847 atacaron el castillo, que era la última gran defensa antes de entrar en la ciudad. Lo defendían unos pocos cientos de soldados y los cadetes del Colegio Militar, algunos de ellos adolescentes.",
      "La tradición recuerda a seis cadetes que murieron aquel día: Juan de la Barrera, Juan Escutia, Francisco Márquez, Agustín Melgar, Fernando Montes de Oca y Vicente Suárez. Son los Niños Héroes. Según la leyenda, Juan Escutia, al ver que todo estaba perdido, se envolvió en la bandera mexicana y se lanzó al vacío desde lo alto del cerro para que el enemigo no se la llevara.",
      "Los historiadores discuten si lo de la bandera pasó así, pero la historia es sagrada en México. Busca en el techo de la escalera principal un mural con un cadete cayendo envuelto en la bandera: es esa escena. Y al pie del cerro, a la entrada del bosque desde Reforma, está el gran monumento de mármol a los Niños Héroes, con seis columnas.",
      "La guerra la ganó Estados Unidos. Con el tratado de Guadalupe Hidalgo de 1848, México perdió más o menos la mitad de su territorio: lo que hoy es California, Nevada, Utah, Nuevo México, buena parte de Arizona y más. Todavía hoy el himno de los marines estadounidenses empieza mencionando los salones de Moctezuma, por esta batalla."],
    ["Maximiliano y Carlota",
      "Diecisiete años después llega la historia más novelesca del castillo. México estaba arruinado y en guerra civil entre liberales y conservadores. Los conservadores, con el apoyo militar de Napoleón tercero de Francia, ofrecieron una corona a un príncipe europeo.",
      "El elegido fue Maximiliano de Habsburgo, hermano del emperador de Austria, Francisco José. Llegó en 1864 con su mujer, Carlota, hija del rey de los belgas. Él tenía treinta y un años y ella veinticuatro.",
      "Eligieron este castillo como residencia y lo reformaron a su gusto, con jardines en la azotea, muebles traídos de Europa y vistas al valle. Maximiliano quería ir cómodo de aquí al centro, así que mandó trazar una gran avenida recta en diagonal hasta la ciudad: se llamó Paseo de la Emperatriz. Hoy es el Paseo de la Reforma, el que vas a recorrer después.",
      "Maximiliano resultó más liberal de lo que esperaban quienes lo trajeron, y se quedó sin amigos en ambos bandos. Cuando Francia retiró sus tropas, el imperio se vino abajo. Carlota viajó a Europa a pedir ayuda a Napoleón y al Papa, no la consiguió y allí perdió la razón. Nunca volvió. Vivió encerrada en Bélgica hasta 1927, sesenta años más que su marido.",
      "Maximiliano fue capturado por los liberales de Benito Juárez y fusilado en el Cerro de las Campanas, en Querétaro, el 19 de junio de 1867. Juárez no le perdonó la vida pese a las peticiones de media Europa: quería dejar claro que nadie de fuera iba a volver a gobernar México."],
    ["Porfirio Díaz y el museo",
      "Tras el imperio, el castillo fue observatorio y otra vez colegio militar, y a partir de los años ochenta del siglo diecinueve, residencia de los presidentes. El que más lo disfrutó fue Porfirio Díaz, que gobernó más de treinta años. Muchas de las habitaciones de arriba están decoradas como en su época, con el gusto francés del momento.",
      "El presidente Lázaro Cárdenas decidió que un castillo no era sitio para un presidente de la Revolución. En 1934 se fue a vivir a Los Pinos, la casa por la que has pasado esta mañana, y en 1939 convirtió el castillo en el Museo Nacional de Historia, que abrió en 1944."],
    ["El museo: qué no perderte",
      "En las salas de abajo, la historia va en orden, de la conquista a la Revolución. No intentes leerlo todo: busca cuatro cosas.",
      "Primero, los dos carruajes. Uno es la carroza de Maximiliano, dorada, enorme, de cuento de hadas. Cerca está el carruaje de Benito Juárez, negro y sencillo, en el que recorrió el país huyendo del imperio. Ponerlos juntos es la lección del museo: el lujo de un emperador extranjero contra la austeridad del presidente indígena que lo venció.",
      "Segundo, el retablo de la Independencia, de Juan O'Gorman: un mural enorme lleno de personajes, con Miguel Hidalgo en el centro con un estandarte de la Virgen de Guadalupe. Se lee de izquierda a derecha, desde los abusos de la colonia hasta el levantamiento.",
      "Tercero, la sala de la Revolución, con el mural de David Alfaro Siqueiros, Del porfirismo a la Revolución. A un lado, Porfirio Díaz rodeado de señores de levita y bailarinas; al otro, los obreros en huelga, los campesinos, Zapata, Villa, Madero. Fíjate en cómo Siqueiros pinta en las esquinas y el techo para que la escena te rodee.",
      "Y cuarto, el mural de José Clemente Orozco sobre Juárez y la caída del imperio, con la cabeza enorme de Juárez flotando sobre la escena. Orozco es el más trágico y oscuro de los tres grandes muralistas. Esta tarde vas a ver a los tres en Bellas Artes."],
    ["El Alcázar: los salones de arriba",
      "Para subir al Alcázar sigues la rampa hasta lo alto del cerro. Arriba están las habitaciones privadas. Fíjate en tres cosas.",
      "Los salones de Maximiliano y Carlota: el comedor, el salón de recepciones, el gabinete de trabajo y la habitación de Carlota, con muebles, porcelanas, vajillas con el escudo imperial y retratos de los dos. Todo muy de corte europea del siglo diecinueve.",
      "La galería de vitrales: un corredor abierto al jardín con grandes vidrieras de colores con figuras de diosas griegas y romanas. Las encargó Porfirio Díaz en París hacia 1900. Con el sol de mediodía brillan muchísimo.",
      "Y el jardín de la azotea, con una pequeña torre en el centro, el Caballero Alto, que fue observatorio. Desde el borde de la terraza tienes la foto del día: el Paseo de la Reforma saliendo recto en diagonal hacia el centro, entre rascacielos, con el Ángel de la Independencia al fondo. Esa diagonal la trazó Maximiliano para ir de su casa al centro. Ahora vas a recorrerla tú."],
    ["Consejos",
      "La taquilla está abajo, al llegar a lo alto de la rampa. Pagas con tarjeta si la aceptan y guardas el efectivo.",
      "Las mochilas grandes a veces hay que dejarlas en consigna. Hay baños dentro, con la entrada.",
      "Para bajar, vuelves por la misma rampa. Al salir del bosque por la Puerta de los Leones, en Reforma, tienes delante la Estela de Luz: la siguiente parada."] ] },

  { s:"13:30", e:"14:30", t:"🗽 Paseo de la Reforma: Estela de Luz, Diana y el Ángel", n:"Reforma", q:["maximiliano", "juarez", "diaz", "hidalgo"], d:"Andando unos 30 min por el camellón. Si te cansas, Metrobús L7 por Reforma hasta la parada El Ángel.", $:"$0", map:"https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=%C3%81ngel+de+la+Independencia", pin:4, g:[
    ["Lo esencial",
      "Estás en el Paseo de la Reforma, la gran avenida de Ciudad de México. Ya sabes de dónde viene: la trazó Maximiliano para ir del castillo al centro, y la llamó Paseo de la Emperatriz en honor a Carlota.",
      "Cuando cayó el imperio, los liberales le cambiaron el nombre por el de Reforma, en honor a las leyes de Reforma de Benito Juárez, que separaron la Iglesia del Estado. El emperador hizo la avenida y su enemigo le puso nombre.",
      "La idea era imitar los grandes bulevares de París y de Viena. Durante el porfiriato se llenó de palacetes, y en el siglo veinte esos palacetes fueron sustituidos por rascacielos. Hoy es el centro financiero del país y la calle de las grandes manifestaciones y celebraciones.",
      "Vas a hacer tres paradas: la Estela de Luz, la Diana Cazadora y el Ángel de la Independencia. Son unos treinta minutos andando por el lado del camellón, que tiene árboles y esculturas."],
    ["La Estela de Luz",
      "La torre fina y alta, revestida de paneles de cuarzo blanquecino, es la Estela de Luz. Se hizo para celebrar el bicentenario de la Independencia, en 2010, pero se inauguró con más de un año de retraso, a principios de 2012, y costando varias veces lo presupuestado. Hubo investigaciones por corrupción.",
      "Mide unos ciento cuatro metros. De noche se ilumina por dentro. Los mexicanos, que tienen apodo para todo, la llaman la suavicrema, por un barquillo de galleta que se parece mucho.",
      "Aquí cerca también está la entrada principal al bosque, la Puerta de los Leones, con sus dos leones de bronce, y detrás el monumento de los Niños Héroes, el de las seis columnas blancas."],
    ["La Diana Cazadora",
      "La siguiente glorieta, la de la fuente con la mujer desnuda tensando un arco hacia el cielo, es la Diana Cazadora. Su nombre oficial es más poético: la Flechadora de las Estrellas del Norte. Es de 1942, obra del escultor Juan Fernando Olaguíbel.",
      "Cuando se inauguró hubo escándalo. Una liga de la decencia protestó porque la diosa estaba desnuda en plena avenida, y el escultor tuvo que ponerle un taparrabos de bronce. Se lo quitaron muchos años después, a finales de los sesenta, cuando la ciudad se preparaba para los Juegos Olímpicos de 1968.",
      "La modelo fue una joven secretaria de Petróleos Mexicanos, Helvia Martínez, que durante décadas guardó el secreto de que el cuerpo de la estatua era el suyo. Lo contó ya mayor."],
    ["El Ángel de la Independencia",
      "Y al fondo, el símbolo de la ciudad: el Ángel de la Independencia. Es una columna de más de cuarenta y cinco metros contando el pedestal, coronada por una victoria alada de bronce dorado, que sostiene en una mano una corona de laurel y en la otra una cadena rota.",
      "Lo inauguró Porfirio Díaz en 1910, para el centenario de la Independencia, pocas semanas antes de que estallara la Revolución que lo echaría del poder. Lo diseñó el arquitecto Antonio Rivas Mercado.",
      "En el terremoto de 1957 la estatua dorada se cayó y se hizo pedazos. La que ves es una reconstrucción. La cabeza original se conserva aparte.",
      "Lo más importante está en la base: es un mausoleo. Dentro reposan los restos de los héroes de la Independencia, entre ellos Miguel Hidalgo, Ignacio Allende y José María Morelos. A sus pies hay estatuas de mármol de varios de ellos, con Hidalgo en el lugar principal.",
      "Y el Ángel es donde la gente sale a celebrar: cuando gana la selección de fútbol, en la noche del 15 de septiembre, y también donde empiezan muchas protestas. Si alguna vez ves a una multitud con banderas por la tele en Ciudad de México, casi seguro que es aquí."],
    ["Consejos",
      "Ve por el camellón central o por la acera ancha; cruza solo en los semáforos, que la avenida es rapidísima.",
      "Si se te hace largo, el Metrobús de la Línea 7 va por la misma avenida: te subes en cualquier parada y te bajas en la del Ángel.",
      "Desde el Ángel, la Condesa está a unos veinte minutos al sur, cruzando la avenida Chapultepec. Tira por la calle Sevilla o por Ámsterdam."] ] },

  { s:"14:30", e:"15:15", t:"🌳 Condesa: Parque México y avenida Ámsterdam", n:"Condesa", d:"Andando unos 20 min desde el Ángel. Da la vuelta al óvalo de Ámsterdam y cruza el Parque México.", $:"$0", map:"https://www.google.com/maps/search/?api=1&query=Parque+M%C3%A9xico+Condesa", pin:5, g:[
    ["Lo esencial",
      "Estás en la colonia Condesa, uno de los barrios más bonitos y paseables de Ciudad de México: calles con árboles enormes en el centro, edificios art déco, cafés y gente con perros.",
      "El nombre viene de la condesa de Miravalle, una aristócrata de la época colonial que tenía aquí una gran hacienda. A principios del siglo veinte la hacienda se dividió en parcelas y se construyó el barrio."],
    ["Un hipódromo convertido en barrio",
      "Lo más curioso de la Condesa es su forma. Aquí hubo un hipódromo, una pista de carreras de caballos. Cuando se urbanizó en los años veinte, la pista se convirtió en calle.",
      "Es la avenida Ámsterdam: si la recorres entera, das una vuelta completa y vuelves al punto de partida, porque es un óvalo. Y tiene un camellón central, ancho y lleno de árboles, por donde la gente pasea y corre. Antes por ahí corrían caballos.",
      "Lo que quedaba dentro del óvalo, el centro del hipódromo, se convirtió en el Parque México, que abrió en 1927. Por eso el parque está justo en el centro de la vuelta de Ámsterdam."],
    ["El Parque México y el art déco",
      "El Parque México es de los parques más queridos de la ciudad. Busca el reloj de la entrada, el foro Lindbergh, una especie de teatro al aire libre con columnas, y el estanque. Todo tiene el estilo de los años veinte y treinta: art déco, líneas geométricas y escalonadas.",
      "Ese estilo se ve también en los edificios de alrededor. Fíjate en las fachadas con esquinas redondeadas, ventanas en franja y letras geométricas en los nombres de los edificios. El más famoso es el edificio Basurto, en la calle Mazatlán, con una escalera en espiral que se ve desde la calle.",
      "Si tienes un minuto, fíjate en la cantidad de paseadores de perros con diez o doce perros a la vez. Es casi una tradición del barrio."],
    ["Consejos",
      "Para seguir hacia la Roma, sal del parque por la calle Michoacán hacia el este y cruza la avenida Insurgentes. El Mercado de Medellín está a unos quince minutos andando."] ] },

  { s:"15:15", e:"16:15", t:"🍽️ Roma: comida en el Mercado de Medellín y Álvaro Obregón", n:"Medellin", d:"Comida en el mercado (fondas dentro y alrededor). Después, paseo corto por la avenida Álvaro Obregón hacia el metro Insurgentes.", $:"$100–200 💵", map:"https://www.google.com/maps/search/?api=1&query=Mercado+de+Medell%C3%ADn+Roma+Sur", pin:6, g:[
    ["Lo esencial",
      "Estás en la colonia Roma, la vecina de la Condesa. Es algo más antigua: se trazó a principios del siglo veinte, en la época de Porfirio Díaz, para familias acomodadas que dejaban el centro.",
      "Por eso aquí hay más casonas de estilo francés, con mansardas, rejas de hierro y fachadas de cantera, mezcladas con edificios modernos. Muchas se dañaron o cayeron en el terremoto de 1985, que golpeó muy fuerte esta zona. En los últimos veinte años el barrio se ha llenado de restaurantes, galerías y cafés."],
    ["El Mercado de Medellín",
      "El Mercado de Medellín es un mercado de barrio de toda la vida, pero con una particularidad: tiene muchísimos productos de otros países de América Latina. Colombianos, venezolanos, peruanos, cubanos o argentinos vienen aquí a comprar lo de su tierra.",
      "Dentro hay fondas para comer barato: comida corrida, que es el menú del día mexicano, con sopa, arroz, un guisado y agua de sabor. También hay puestos de mariscos y de comida colombiana o venezolana, como arepas.",
      "Si quieres algo muy local, busca un agua fresca de sabores que no conozcas, como jamaica, tamarindo u horchata. Y paga en efectivo: en el mercado casi nadie acepta tarjeta."],
    ["La Roma de la película",
      "Si has visto la película Roma, de Alfonso Cuarón, que ganó tres Oscar en 2019, está ambientada justo aquí, a principios de los años setenta. Cuarón creció en este barrio, y la casa de la película está en la calle Tepeji, en la Roma Sur, muy cerca del mercado.",
      "La película cuenta la vida de una empleada doméstica indígena que trabaja para una familia de clase media, y retrata un momento duro: la matanza del Jueves de Corpus de 1971, cuando un grupo paramilitar atacó una manifestación de estudiantes."],
    ["La avenida Álvaro Obregón",
      "Después de comer, sube hacia el norte hasta la avenida Álvaro Obregón, la más bonita de la Roma: un bulevar con un camellón ancho, bancos, esculturas y fuentes, y casonas a los lados.",
      "Álvaro Obregón fue uno de los generales que ganaron la Revolución y fue presidente de México. En 1928, recién reelegido, lo asesinó a tiros un joven católico, durante un banquete en un restaurante del sur de la ciudad. Fue en plena guerra cristera, el conflicto entre el gobierno y la Iglesia.",
      "Muy cerca está la Plaza Villa de Madrid, con una copia de la fuente de Cibeles. Fue un regalo de la ciudad de Madrid en 1980. Si te pilla de camino, es la foto de casa."],
    ["Consejos",
      "Desde Álvaro Obregón, el metro Insurgentes, de la Línea 1, está a unos diez minutos. La glorieta de Insurgentes es redonda y hundida: entra por cualquiera de los accesos.",
      "No te entretengas demasiado: en Bellas Artes venden boletos hasta las cinco y media y cierran a las seis."] ] },

  { s:"16:15", e:"16:30", t:"🚇 Insurgentes → Bellas Artes", d:"L1 dirección Pantitlán hasta Salto del Agua (3 paradas); cambio a L8 dirección Garibaldi, 2 paradas, hasta Bellas Artes.", l:["L1","L8"], $:"$5", map:RUTA("Palacio de Bellas Artes, Ciudad de México"), mov:1 },

  { s:"16:30", e:"17:30", t:"🎭 Bellas Artes por dentro: los murales", n:"Bellas Artes", q:["rivera", "orozco", "siqueiros", "diaz"], d:"Entrada unos $95 (boletos hasta las 17:30; cierra a las 18:00). Sube directo a los pisos de los murales: Rivera, Orozco, Siqueiros y Tamayo.", $:"~$95 💳", map:GM+"1718141752200063183", pin:7, g:[
    ["Lo esencial",
      "Estás dentro del Palacio de Bellas Artes, el gran teatro y museo de México. Lo viste por fuera el primer día. Ahora lo importante está dentro: los murales de los grandes pintores mexicanos del siglo veinte, todos en un mismo edificio.",
      "El palacio lo empezó en 1904 el arquitecto italiano Adamo Boari, por encargo de Porfirio Díaz. Por fuera es art nouveau, de mármol blanco. Pero la Revolución paró las obras, el edificio se hundía en el suelo blando del antiguo lago, y no se terminó hasta 1934, treinta años después. Por eso por dentro el estilo es otro: art déco, con mármoles de colores, bronces y lámparas geométricas.",
      "Te doy un orden: sube directamente al segundo piso, mira los murales de Rivera, Orozco y Siqueiros, y después los de Tamayo, en el piso de arriba. Al final, si te sobra tiempo, el vestíbulo y la cúpula."],
    ["Un edificio que se hunde",
      "Bellas Artes es enorme y está hecho de mármol de Carrara, y está construido sobre el fondo blando del antiguo lago de Texcoco. El resultado es que se hunde. Ya durante las obras se hundió tanto que hubo que reforzar los cimientos varias veces, y a lo largo del siglo veinte siguió bajando varios metros.",
      "Por eso la explanada que lo rodea está más baja que la calle: el edificio no se ha movido de sitio, pero sí hacia abajo. Fíjate también en las juntas y en algunos suelos del interior: no todo está perfectamente nivelado.",
      "Boari lo había diseñado con una gran cúpula de hierro y cristal como la que ves, revestida por fuera con tejas de cerámica dorada y naranja, y un águila de bronce coronándola. Lo que no pudo prever fue cuánto pesaría todo eso sobre el barro."],
    ["El muralismo, en dos minutos",
      "Tras la Revolución, el gobierno mexicano quiso contar la historia del país al pueblo, que en buena parte no sabía leer. La idea fue pintarla en las paredes de los edificios públicos, donde todo el mundo pudiera verla. Así nació el muralismo mexicano, en los años veinte.",
      "Los tres grandes fueron Diego Rivera, José Clemente Orozco y David Alfaro Siqueiros. Rivera es el narrador: escenas llenas de gente, colores claros, historia contada como un cómic. Orozco es el trágico: figuras deformadas, fuego, violencia, mucho pesimismo. Siqueiros es el experimental: perspectivas que se te echan encima, pinturas industriales, figuras que parecen salir de la pared.",
      "Bellas Artes es el único sitio donde los tienes a los tres a pocos pasos."],
    ["Diego Rivera: El hombre controlador del universo",
      "Este mural tiene la mejor historia del edificio. En 1933, la familia Rockefeller encargó a Diego Rivera un mural para el vestíbulo del Rockefeller Center de Nueva York. Rivera, que era comunista, incluyó en él un retrato de Lenin.",
      "Nelson Rockefeller le pidió que lo quitara. Rivera se negó. Le pagaron, lo despidieron, taparon el mural y en 1934 lo destruyeron a martillazos.",
      "Rivera, furioso, volvió a pintarlo aquí, en Bellas Artes, ese mismo año, con un poco de venganza añadida. En el centro, un obrero maneja una gran máquina, en el cruce de dos elipses: una con el telescopio, el cosmos y los astros, y otra con el microscopio, las células y los microbios. A un lado, el mundo capitalista: soldados con máscaras de gas, señores ricos jugando a las cartas. Al otro, el mundo socialista: obreros unidos, Lenin, Trotsky y Marx.",
      "Busca a la izquierda, en la escena de los ricos, a John D. Rockefeller hijo, el padre de quien le había censurado. Rivera lo pintó en una fiesta, bebiendo, justo al lado de unos microbios que, según la tradición, representan enfermedades venéreas. Esa fue su respuesta."],
    ["Orozco: La Katharsis",
      "Enfrente, o muy cerca, está La Katharsis, de José Clemente Orozco, también de 1934. Es el mural más violento del edificio.",
      "Abajo, una mujer desnuda tumbada, riéndose a carcajadas, que muchos interpretan como la corrupción o la prostitución. Alrededor, hombres que se pelean con cuchillos y fusiles, máquinas y engranajes. Y arriba, todo arde: un gran incendio que lo destruye todo.",
      "Para Orozco, la civilización moderna, la técnica y la guerra llevaban a la destrucción, y solo el fuego podía purificarla. Eso es la catarsis: la purificación. Orozco había perdido la mano izquierda de joven en un accidente con pólvora, y pintaba con una sola mano."],
    ["Siqueiros: Nueva democracia",
      "De Siqueiros busca Nueva democracia, de 1944. Es una mujer gigante, con el gorro frigio de la libertad, que sale de un volcán con los brazos en alto, rompiendo las cadenas. En una mano lleva una antorcha y en la otra una flor.",
      "Lo pintó al final de la Segunda Guerra Mundial, como la victoria contra el fascismo. A sus lados están Víctimas de la guerra y Víctimas del fascismo. Fíjate en los puños y en las cadenas: parecen salir hacia ti. Siqueiros pintaba con pistolas de aire y pinturas de coche para conseguir esos volúmenes.",
      "Por la misma galería están también sus dos murales sobre Cuauhtémoc, el último emperador mexica: uno con su tortura por los españoles, a los que pinta con armaduras como robots, y otro con su resurrección."],
    ["Tamayo y el resto",
      "En el piso de arriba están los dos murales de Rufino Tamayo, de los años cincuenta. Tamayo era de Oaxaca y no le gustaba nada el muralismo político de los otros tres. Él pintaba con colores muy intensos, sobre todo rojos, rosas y morados, y formas casi abstractas.",
      "Sus murales son Nacimiento de nuestra nacionalidad, con el choque entre un caballo español y una figura indígena de la que nace el mestizo, y México de hoy. Es interesante verlo después de Rivera: la misma historia, pero contada sin discurso."],
    ["El teatro, la cúpula y la cortina de cristal",
      "El corazón del edificio es la sala de teatro, donde actúan la Compañía Nacional de Danza, la ópera y el Ballet Folklórico. Normalmente no se puede entrar sin función.",
      "Dentro tiene dos maravillas. La primera, la cortina del escenario: no es de tela, sino de casi un millón de piezas de cristal, hecha en Nueva York por la casa Tiffany. Representa el valle de México con sus dos volcanes, el Popocatépetl y el Iztaccíhuatl, y se ilumina para que pase del amanecer al anochecer.",
      "La segunda, el techo de la sala, una gran lámpara de cristal con Apolo y las musas, del artista húngaro Géza Maróti, que también decoró la cúpula.",
      "Si no se puede pasar, mira desde el vestíbulo hacia arriba: la cúpula por dentro, con sus vidrios, es preciosa."],
    ["Consejos",
      "La entrada se compra en la taquilla, en la planta baja. A veces hay que dejar la mochila grande en consigna.",
      "No se pueden usar trípodes; el móvil sí, sin flash.",
      "Al salir, la Alameda está justo detrás, al oeste, y la Plaza Tolsá a cinco minutos andando por la calle Tacuba, hacia el este."] ] },

  { s:"17:30", e:"18:15", t:"🐎 Alameda y Plaza Tolsá: El Caballito, Minería y MUNAL", n:"Tolsa", q:["tolsa", "juarez"], d:"La Alameda detrás de Bellas Artes y, por la calle Tacuba, la Plaza Tolsá: El Caballito, el Palacio de Minería y el MUNAL por fuera.", $:"$0", map:"https://www.google.com/maps/search/?api=1&query=Plaza+Tols%C3%A1+Ciudad+de+M%C3%A9xico", pin:8, g:[
    ["Lo esencial",
      "Terminas el día en el corazón del Centro, entre dos lugares muy distintos: la Alameda, el parque más antiguo de la ciudad, y la Plaza Tolsá, una de las plazas más elegantes de México, dedicada a un valenciano."],
    ["La Alameda Central",
      "La Alameda se creó en 1592, por orden del virrey Luis de Velasco. Es el parque público más antiguo de América. Se llama así por los álamos que se plantaron al principio, aunque hoy casi todo son fresnos y otros árboles.",
      "Durante la época colonial, en el extremo oeste del parque estaba el quemadero de la Inquisición, donde se ejecutaba a los condenados. Durante siglos solo la podían usar las clases altas; hoy es el parque más popular del centro.",
      "En el lado de la avenida Juárez verás el Hemiciclo a Juárez, un semicírculo de columnas de mármol blanco con la estatua de Benito Juárez en el centro, sentado, coronado por la patria. También es de 1910, de las fiestas del centenario de Porfirio Díaz.",
      "Diego Rivera pintó un mural famoso sobre este parque, Sueño de una tarde dominical en la Alameda Central, con la Catrina del brazo de un Diego niño y de Frida Kahlo. Está en un pequeño museo en el lado oeste, el Museo Mural Diego Rivera."],
    ["El Caballito de Tolsá",
      "La estatua ecuestre del centro de la plaza es la de Carlos cuarto de España, aunque todo el mundo la llama El Caballito. La hizo Manuel Tolsá, un escultor y arquitecto valenciano, de Enguera, y se fundió en bronce en 1803. Es una de las estatuas ecuestres más grandes del mundo de su época.",
      "Lo curioso es el nombre. Después de la Independencia, a nadie le apetecía rendir homenaje a un rey español, pero la estatua era demasiado buena para fundirla. Así que la gente empezó a decir que lo que se admiraba era el caballo, no el rey. Y se quedó con El Caballito.",
      "La estatua ha cambiado de sitio varias veces: estuvo en el Zócalo, en un patio de la universidad y en la esquina de Reforma, y desde 1979 está aquí. En 2013 una restauración mal hecha, con ácido, le dañó buena parte de la superficie, y hubo que tratarla durante años.",
      "No la confundas con el otro Caballito, una gran escultura abstracta amarilla del escultor Sebastián, que está en Reforma justo donde estaba antes esta."],
    ["El Palacio de Minería",
      "El edificio neoclásico de enfrente, con columnas y una fachada larguísima, es el Palacio de Minería, también obra de Manuel Tolsá. Se construyó entre 1797 y 1813 para el Real Seminario de Minería, la escuela de ingenieros de minas de la Nueva España, cuando las minas de plata de México eran la gran riqueza del imperio español.",
      "Muchos lo consideran la obra neoclásica más importante de América. Como casi todo en el centro, se ha hundido de forma desigual: dentro, el patio y las escaleras tienen inclinaciones que se notan a simple vista. Hoy pertenece a la Universidad Nacional, y cada año acoge una gran feria del libro."],
    ["El MUNAL",
      "El otro gran edificio de la plaza, con cúpula y escalinata, es el Museo Nacional de Arte, el MUNAL. Fue construido a principios del siglo veinte como Palacio de Comunicaciones, la sede del ministerio de correos y telégrafos, por el arquitecto italiano Silvio Contri.",
      "Por dentro tiene una escalera imperial de mármol y bronce espectacular. Guarda arte mexicano desde la época colonial hasta mediados del siglo veinte, con muchos paisajes del pintor José María Velasco, que pintó este mismo valle de México visto desde arriba, como lo has visto tú hoy desde el teleférico."],
    ["Para cerrar el día",
      "Si lo piensas, hoy has recorrido la historia del país al revés y al derecho. Los mexicas, en el cerro del saltamontes. La Nueva España, en el virrey Gálvez, en la Alameda y en Tolsá. La guerra con Estados Unidos y los Niños Héroes. El imperio de Maximiliano y su avenida. El porfiriato, en el Ángel y en Bellas Artes. Y la Revolución, contada en las paredes por Rivera, Orozco y Siqueiros.",
      "El metro Bellas Artes está en la esquina, junto al Palacio Postal. Línea 2 hasta Hidalgo, Línea 3 hasta Zapata. A esta hora va lleno: mochila delante."] ] },

  { s:"18:15", e:"19:00", t:"🚇 Vuelta a casa", d:"Bellas Artes → Hidalgo (L2), Hidalgo → Zapata (L3). Unos 35 min. Va lleno: mochila delante.", l:["L2","L3"], $:"$5", map:RUTA("Av. Universidad 687, Del Valle Sur, Ciudad de México"), mapTxt:"Ruta a casa", mov:1 }
];

/* Lunes 9: Teotihuacan (se conserva por si vuelve al calendario). */
var TEO = [
  { s:"15:45", e:"16:00", t:"🧭 Entender Teotihuacan (ponlo mientras caminas)", q:["mexicas", "nahuatl", "tlaloc", "talud", "obsidiana"], d:"La historia completa de la ciudad: quiénes eran, cómo vivían, quién mandaba y por qué cayó. Escúchalo andando por la Calzada, entre parada y parada.", $:"", pin:1, map:"https://www.google.com/maps/search/?api=1&query=Zona+Arqueol%C3%B3gica+de+Teotihuacan", g:[
    ["Lo esencial",
      "Estás en Teotihuacan, la ciudad más grande que hubo en América antes de la llegada de los europeos durante casi mil años. Ojo con una cosa: esto no es azteca. Cuando los mexicas llegaron a este valle, esta ciudad llevaba más de setecientos años en ruinas. Para ellos era tan antigua y misteriosa como para nosotros la Roma imperial.",
      "La ciudad nació hacia el año 100 antes de Cristo, tuvo su mejor momento entre los años 350 y 550 de nuestra era, y fue abandonada poco después. En su apogeo vivían aquí más de cien mil personas, en unos veinte kilómetros cuadrados. En ese momento era una de las cinco o seis ciudades más grandes del planeta, a la altura de Constantinopla.",
      "Lo que pisas hoy es solo el centro ceremonial, más o menos una décima parte de la ciudad. Debajo de los campos, los pueblos y las carreteras que ves alrededor siguen enterrados miles de edificios.",
      "Estás a unos dos mil trescientos metros de altitud, algo más alto que Ciudad de México. Si te cansas más de lo normal, es por eso."],
    ["El nombre y el mito del Quinto Sol",
      "No sabemos cómo llamaban ellos a su ciudad, ni siquiera qué idioma hablaban. Teotihuacan es una palabra náhuatl que le pusieron los mexicas siglos después. Suele traducirse como el lugar donde los hombres se convierten en dioses, o el lugar donde fueron hechos los dioses.",
      "También los nombres de los edificios son mexicas: Pirámide del Sol, Pirámide de la Luna, Calzada de los Muertos. Los pusieron ellos, mirando las ruinas e imaginando qué habían sido. Así que no te los tomes al pie de la letra.",
      "Los mexicas creían que aquí había nacido el mundo actual. Su mito cuenta que, tras la destrucción del cuarto sol, todo estaba a oscuras, y los dioses se reunieron en Teotihuacan alrededor de una gran hoguera. Uno de ellos tenía que arrojarse al fuego para convertirse en el nuevo sol.",
      "Se ofrecieron dos. Tecuciztécatl, rico y orgulloso, que ofrecía plumas preciosas y oro. Y Nanahuatzin, pobre, enfermo y cubierto de llagas, que solo podía ofrecer cañas y espinas con su propia sangre. Tecuciztécatl se acercó al fuego cuatro veces y las cuatro se echó atrás. Nanahuatzin cerró los ojos y saltó a la primera. Se convirtió en el sol.",
      "Avergonzado, Tecuciztécatl saltó detrás y se convirtió en un segundo sol, igual de brillante. Los dioses, para castigarlo, le lanzaron un conejo a la cara y apagaron su brillo: así nació la luna. Por eso en México, cuando miran la luna llena, no ven una cara: ven un conejo.",
      "Pero el sol no se movía. Entonces todos los demás dioses se sacrificaron para darle fuerza, y el viento sopló hasta ponerlo en marcha. Ese es el quinto sol, el de la Piedra del Sol que viste el sábado en el museo. Para los mexicas, la deuda de los humanos con los dioses empezó exactamente donde tienes los pies."],
    ["Cómo estaba hecha la ciudad",
      "Teotihuacan no creció a lo loco: fue planificada. Todo está alineado con una misma orientación, desviada unos quince grados y medio al este del norte. La Calzada, las pirámides, las casas e incluso el río San Juan, que desviaron y canalizaron para que cruzara la avenida en ángulo recto.",
      "Esa orientación no es casual. Con ella, la Pirámide del Sol mira hacia el punto del horizonte por donde se pone el sol dos días al año, el 29 de abril y el 13 de agosto. Entre una fecha y otra hay ciento cinco días, y el resto del año suma doscientos sesenta: justo la duración del calendario ritual de toda Mesoamérica.",
      "Casi todos los edificios usan el mismo módulo, que es la firma de la ciudad: el talud-tablero. Un muro inclinado, el talud, y encima un panel rectangular con marco, el tablero. Uno sobre otro, como escalones gigantes. Cuando ese diseño aparece en una ciudad maya o en Oaxaca, los arqueólogos saben que Teotihuacan anduvo por allí.",
      "Y todo estaba pintado. Las pirámides iban recubiertas de estuco de cal y pintadas, sobre todo de rojo. Las piedras pequeñas que ves sobresalir de las paredes eran el agarre de ese estuco. Imagina la ciudad entera de color rojo y blanco, brillando al sol."],
    ["Cómo vivía la gente",
      "Esto es lo más moderno de Teotihuacan. La mayoría de la población no vivía en chozas, sino en unos dos mil conjuntos de apartamentos: grandes manzanas de piedra, de una sola planta, con muros altos hacia la calle y, dentro, patios, habitaciones, cocinas, altares y desagües.",
      "En cada conjunto vivían varias familias emparentadas, de sesenta a cien personas, que solían dedicarse al mismo oficio: alfareros, talladores de obsidiana, pintores, albañiles. A sus muertos los enterraban bajo el suelo de casa.",
      "Era además una ciudad de inmigrantes. Había un barrio de gente de Oaxaca, que durante siglos siguió haciendo cerámica zapoteca y enterrando a sus muertos a su manera. Había un barrio de comerciantes de la costa del Golfo y de la zona maya, con casas redondas. Y gente del occidente. Los análisis de los huesos confirman que muchos habitantes habían nacido muy lejos de aquí.",
      "La riqueza venía en buena parte de la obsidiana, un vidrio volcánico negro o verde que era el acero de aquel mundo: de ella salían cuchillos, puntas de flecha y navajas. Teotihuacan controlaba las minas cercanas, sobre todo las de obsidiana verde de Pachuca, y exportaba a toda Mesoamérica. Los vendedores que te ofrecen figuras de obsidiana siguen, sin saberlo, con el negocio original."],
    ["Quién mandaba: el gran misterio",
      "Aquí viene lo más raro. En Egipto, en Roma o entre los mayas, los reyes se retratan por todas partes y graban su nombre en piedra. En Teotihuacan, no. No hay ni un solo retrato seguro de un gobernante, ni una tumba real identificada, ni una inscripción con el nombre de un rey.",
      "Tenían signos de escritura, pero pocos y sin descifrar. Y su arte es impersonal: procesiones de sacerdotes todos iguales, animales, dioses, símbolos. Nunca un individuo presumiendo de sus hazañas.",
      "Por eso muchos investigadores creen que la ciudad, al menos en su época madura, la gobernaba un consejo: representantes de los grandes barrios o linajes, y no un rey todopoderoso. Otros piensan que al principio sí hubo gobernantes fuertes, los que levantaron las pirámides, y que después hubo una reacción contra ese poder personal. En la Ciudadela te cuento la pista que apunta a eso.",
      "Tampoco se ha encontrado en el centro un gran juego de pelota de piedra, que es algo que tienen casi todas las ciudades de Mesoamérica. Teotihuacan iba por libre."],
    ["Los dioses",
      "Vas a ver sobre todo a cuatro. El primero, el dios de las tormentas, con anteojeras redondas y colmillos: es el antepasado directo del Tláloc mexica que conociste en el Templo Mayor.",
      "El segundo, la Serpiente Emplumada, que los mexicas llamarían Quetzalcóatl: una serpiente de cascabel cubierta de plumas de quetzal, que une la tierra y el cielo. Aquí está uno de sus retratos más antiguos.",
      "El tercero, el dios viejo del fuego: un anciano encorvado y arrugado que carga un brasero sobre la cabeza. Es de los dioses más antiguos del centro de México, porque este es un valle de volcanes.",
      "Y el cuarto, una gran figura femenina ligada al agua, a las cuevas y a la fertilidad. Muchos la llaman la Gran Diosa. El monolito enorme que viste el sábado en la sala Teotihuacan del museo, esa mujer cuadrada de más de veinte toneladas, apareció aquí, junto a la Pirámide de la Luna."],
    ["Teotihuacan y los mayas",
      "La influencia de esta ciudad llegó a más de mil kilómetros. El episodio más famoso está escrito en piedra en Tikal, en la selva de Guatemala. En enero del año 378 llegó allí un personaje llamado Sihyaj K'ahk', Nace el Fuego, vestido a la manera de Teotihuacan. Ese mismo día murió el rey de Tikal.",
      "Poco después se sentó en el trono de Tikal un niño, hijo de un misterioso señor al que los textos mayas llaman Búho Lanzadardos, que muchos creen que era un gobernante de Teotihuacan. Durante generaciones, los reyes mayas se retrataron con armas, anteojeras y símbolos teotihuacanos, como quien presume de un título extranjero.",
      "Y la relación era de ida y vuelta: aquí mismo, junto a la Calzada, en la Plaza de las Columnas, se han encontrado murales de estilo maya y restos de un banquete con cerámica maya. Vivían aquí mayas de alto rango. En algún momento, esos murales fueron destrozados a propósito."],
    ["La caída",
      "Hacia el año 550 o 600, el centro de la ciudad ardió. Pero no ardió toda la ciudad: los incendios se concentran en los templos y los palacios de la Calzada. Rompieron esculturas, destrozaron ídolos y prendieron fuego a los edificios del poder. Las casas de la gente corriente quedaron casi intactas.",
      "Por eso la explicación más aceptada no es una invasión, sino una revuelta interna: la población contra su propia élite. Detrás pudo haber sequías, malas cosechas y una desigualdad creciente: los huesos de los últimos siglos muestran más desnutrición entre los pobres.",
      "La ciudad no se vació de golpe. Siguió viviendo gente durante generaciones, pero ya como un pueblo entre ruinas. El poder pasó a otras ciudades, como Xochicalco, Cholula y, después, Tula.",
      "Cuando llegaron los mexicas, ochocientos años más tarde, hicieron de esto un lugar de peregrinación. Se dice que Moctezuma venía a hacer ofrendas. Excavaron en las ruinas y se llevaron piezas a Tenochtitlan: en las ofrendas del Templo Mayor aparecieron máscaras teotihuacanas, guardadas como reliquias de mil años de antigüedad."] ] },

  { s:"16:00", e:"16:15", t:"🐍 La Ciudadela y el Templo de la Serpiente Emplumada", q:["tlaloc", "talud"], d:"Extremo sur, junto a la Puerta 1. Cruza la gran plaza hasta el fondo, sube a la plataforma que tapa el templo y baja por detrás: la fachada con las cabezas está escondida ahí.", $:"", pin:2, map:"https://www.google.com/maps/search/?api=1&query=Templo+de+Quetzalc%C3%B3atl+Teotihuac%C3%A1n", g:[
    ["La plaza",
      "Estás en la Ciudadela. El nombre es un error de los españoles, que al ver este recinto cuadrado y cerrado pensaron en un fuerte militar. No lo era. Es una plaza hundida de unos cuatrocientos metros de lado, rodeada por plataformas con quince templos pequeños.",
      "Aquí cabían unas cien mil personas: prácticamente toda la ciudad. Era el gran escenario de las ceremonias públicas. Algunos investigadores creen incluso que la plaza se inundaba a propósito en ciertos rituales, para convertirla en un espejo de agua que representaba el mar del origen del mundo.",
      "A los lados del templo del fondo hay dos grandes conjuntos de habitaciones. Durante mucho tiempo se pensó que eran los palacios de los gobernantes. Sería lo más parecido a un palacio real que hay en la ciudad."],
    ["La fachada de las serpientes",
      "Lo que ves primero al fondo no es el templo, sino una plataforma más sencilla que construyeron delante, pegada a él. Súbela y asómate por detrás: entre las dos queda un pasillo, y ahí está lo bueno.",
      "Es el Templo de la Serpiente Emplumada, construido hacia el año 200. Tenía siete cuerpos de talud y tablero, cubiertos de esculturas por los cuatro lados. Se calcula que había más de doscientas sesenta cabezas de piedra. Solo se salvaron las de este lado, precisamente porque la plataforma las tapó.",
      "Fíjate en dos tipos de cabeza que se alternan. La primera es la serpiente emplumada: sale de un collar de plumas, como de una flor, con las fauces abiertas y los colmillos fuera. Su cuerpo ondula a lo largo del tablero y acaba en un cascabel.",
      "La segunda es más cuadrada, con dos aros en la frente y aspecto de mosaico. Durante décadas se dijo que era Tláloc. Hoy se piensa que no es una cara sino un tocado: el tocado de una serpiente de guerra o de un cocodrilo primordial, que la serpiente emplumada lleva sobre el lomo.",
      "Entre los cuerpos de las serpientes hay conchas y caracoles de mar, a doscientos kilómetros de la costa. Las serpientes nadan en el océano del principio del tiempo. Y todo estaba pintado: quedan restos de rojo, verde y blanco, y las cabezas tenían ojos de obsidiana que brillaban. En el museo viste el sábado la reconstrucción a todo color: esta es la de verdad."],
    ["Los sacrificados",
      "En los años ochenta, los arqueólogos excavaron bajo el templo y alrededor, y encontraron algo que cambió la imagen pacífica que se tenía de Teotihuacan. Había más de ciento treinta personas enterradas, y se calcula que en total fueron más de doscientas.",
      "Estaban colocadas en grupos simétricos, de cuatro, de ocho, de dieciocho, de veinte: números del calendario. Tenían las manos atadas a la espalda. Muchos eran hombres jóvenes vestidos de guerreros, con puntas de obsidiana y espejos a la cintura.",
      "Llevaban collares hechos con mandíbulas humanas. Algunas eran reales y otras, imitaciones talladas en concha. Y los análisis de los huesos dicen que muchos no eran de aquí: venían de regiones lejanas. Fueron sacrificados todos a la vez, cuando se inauguró el templo."],
    ["El templo que mandaron tapar",
      "Ahora la pista política que te prometí. Este templo, el más decorado de la ciudad, duró poco a la vista. Unos ciento cincuenta o doscientos años después de construirlo, alguien arrancó parte de las esculturas, quemó el santuario y levantó delante la plataforma lisa que lo oculta.",
      "Muchos lo leen como un golpe de timón: el templo sería el monumento de un gobernante poderoso, quizá enterrado aquí mismo, y taparlo fue la forma de decir que eso se había acabado. A partir de entonces, el arte de la ciudad se vuelve todavía más anónimo y colectivo."],
    ["El túnel secreto",
      "Y lo último, que es de película. En 2003, después de unas lluvias muy fuertes, se abrió un agujero en el suelo justo delante de la plataforma. El arqueólogo Sergio Gómez bajó con una cuerda y encontró un túnel hecho por los teotihuacanos y sellado por ellos mismos hace unos mil ochocientos años.",
      "El túnel está a unos quince metros de profundidad, mide algo más de cien metros y termina justo debajo del centro del templo. Tardaron años en vaciarlo, y usaron pequeños robots para explorar el final.",
      "Dentro había más de cien mil objetos: esculturas de jade, colmillos y huesos de jaguar, pelotas de hule, conchas enormes talladas, semillas, e incluso restos de piel. Las paredes y el techo estaban espolvoreados con polvo de pirita, un mineral metálico que brilla: con una antorcha, el túnel parecía un cielo estrellado.",
      "Y al fondo encontraron mercurio líquido, algo rarísimo y muy difícil de producir, que quizá representaba un río o un lago del inframundo. El túnel era una reproducción del mundo de los muertos. No apareció ninguna tumba real, pero es lo más cerca que se ha estado de encontrar una.",
      "No se puede bajar, pero cuando cruces la plaza de vuelta, piensa que lo tienes bajo los pies."],
    ["➡️ Siguiente",
      "Sal de la Ciudadela a la Calzada de los Muertos y gira a la derecha, hacia el norte. Al fondo verás la Pirámide de la Luna, y a la derecha, la del Sol. Hasta la del Sol hay algo más de un kilómetro: es buen momento para poner la guía de la Calzada."] ] },

  { s:"16:15", e:"16:25", t:"🛣️ Calzada de los Muertos", q:["mexicas", "talud"], d:"La avenida central, de sur a norte. Ve por el centro; entre el Sol y la Luna, busca a la derecha el techo que protege el Mural del Puma.", $:"", pin:3, map:"https://www.google.com/maps/search/?api=1&query=Calzada+de+los+Muertos+Teotihuac%C3%A1n", g:[
    ["Lo esencial",
      "Caminas por el eje de la ciudad. Los mexicas la llamaron Miccaotli, calzada de los muertos, porque creyeron que los montículos de los lados eran tumbas de reyes convertidos en dioses. No lo eran: son plataformas de templos y de palacios.",
      "Mide unos cuarenta metros de ancho, más que muchas avenidas actuales. El tramo que recorres, de la Ciudadela a la Luna, tiene unos dos kilómetros, pero la avenida seguía hacia el sur otros tantos, hoy bajo los campos.",
      "No es llana: sube poco a poco hacia la Luna, unos treinta metros en total. Y está dividida por escalinatas y muros que hay que subir y bajar, formando plazas hundidas. No se pensó para ir rápido, sino para una procesión: el camino te obliga a ir despacio y te va tapando y enseñando la pirámide del fondo."],
    ["La perspectiva",
      "Mira hacia el norte. La Pirámide de la Luna cierra la avenida, y justo detrás tienes una montaña: el Cerro Gordo, un volcán apagado. La pirámide está colocada para repetir la silueta del cerro. No es una coincidencia: para ellos una pirámide era una montaña artificial, y las montañas eran depósitos de agua y de vida.",
      "El cerro tenía manantiales, y su nombre antiguo, Tenan, significa madre de piedra. Toda la avenida apunta hacia él."],
    ["Qué buscar por el camino",
      "A tu izquierda y derecha, entre el río y el Sol, hay conjuntos de habitaciones y templos que suelen saltarse. Uno se llama Edificios Superpuestos: puedes bajar y ver cómo construían un edificio encima del anterior, con restos de pintura en los muros de abajo.",
      "Entre el Sol y la Luna, en el lado derecho, busca un techo moderno pegado a un muro. Protege el Mural del Puma: un felino grande, pintado en tonos ocre sobre franjas de color, con las garras bien marcadas. Es de los pocos murales que siguen en su sitio a pie de calzada, y te da una idea de cómo estaba decorada toda la avenida.",
      "Y prueba una cosa: delante de una escalinata, da una palmada fuerte. El eco vuelve convertido en un chirrido agudo. Los vendedores lo saben, y por eso oirás todo el rato sus silbatos, que imitan el rugido del jaguar."],
    ["➡️ Siguiente",
      "La mole que tienes a la derecha es la Pirámide del Sol. Entra a su plaza por la escalinata y colócate en el centro, de frente."] ] },

  { s:"16:25", e:"16:40", t:"☀️ Pirámide del Sol", q:["batres", "tlaloc", "mexicas"], d:"A media Calzada, a la derecha. Colócate en el centro de la plaza, de frente, y luego rodéala por un lado para ver su tamaño. No se puede subir.", $:"", pin:4, map:"https://www.google.com/maps/search/?api=1&query=Pir%C3%A1mide+del+Sol+Teotihuac%C3%A1n", g:[
    ["Lo esencial",
      "Tienes delante el edificio más grande de Teotihuacan y uno de los más grandes del mundo antiguo. Mide unos doscientos veinticinco metros por lado y unos sesenta y cinco de alto, como un edificio de veinte plantas.",
      "Una comparación para que te sitúes: su base es casi igual que la de la Gran Pirámide de Guiza, en Egipto, pero tiene menos de la mitad de altura. En volumen es la tercera pirámide más grande del planeta, detrás de la de Cholula, que tienes junto a Puebla, y de la de Keops.",
      "Pero la idea es distinta. Una pirámide egipcia es una tumba cerrada que acaba en punta. Esta es una montaña con escaleras: una base enorme para subir un templo hasta el cielo. Arriba había un santuario de madera y adobe, donde se hacían las ceremonias a la vista de la plaza.",
      "Hoy no se puede subir. Está prohibido desde 2020 para protegerla."],
    ["Cómo se construyó",
      "Se levantó hacia el año 200, y casi toda de una vez, cosa rara en Mesoamérica, donde las pirámides suelen crecer por capas. Dentro no hay cámaras: es un relleno macizo de tierra, adobes y piedra volcánica, más de un millón de metros cúbicos.",
      "Todo eso se movió sin ruedas, sin animales de carga y sin herramientas de metal. A espaldas de personas, en cestos. Se calcula que trabajaron miles de personas durante décadas.",
      "Por fuera iba forrada de piedra, recubierta de estuco y pintada de rojo. Las piedras que sobresalen de la superficie como pinchos servían para sujetar esa capa de estuco, que tenía un grosor considerable."],
    ["Lo que ves no es del todo original",
      "Aquí hay una historia poco conocida. La pirámide que tienes delante la reconstruyó entre 1905 y 1910 Leopoldo Batres, por encargo del presidente Porfirio Díaz, que quería presumir de pasado glorioso en el centenario de la Independencia.",
      "Batres tenía prisa y pocos escrúpulos. Usó dinamita en algún punto, arrancó la capa exterior, de varios metros de grosor, y con ella se perdieron la fachada original y sus esculturas. La pirámide era más grande de lo que ves.",
      "Además interpretó mal la forma. Originalmente tenía cuatro cuerpos, y él la dejó con cinco: ese escalón estrecho que ves hacia arriba, entre el tercer cuerpo y el último, es un invento suyo. Aun así, sin él quizá hoy sería un cerro cubierto de matorral."],
    ["La cueva de debajo",
      "En 1971, por casualidad, se descubrió al pie de la escalinata la entrada de un túnel. Corre unos cien metros bajo la pirámide, a seis metros de profundidad, y termina cerca del centro, en una cámara con forma de trébol de cuatro hojas.",
      "Durante años se pensó que era una cueva natural, y que la pirámide se había construido aquí por ella: en Mesoamérica las cuevas son el lugar del que salieron los primeros humanos y la puerta al inframundo. Hoy se sabe que la excavaron los propios teotihuacanos. Fue saqueada en la antigüedad, así que no sabemos qué guardaba. Es hermana del túnel de la Ciudadela."],
    ["A quién estaba dedicada",
      "Lo del sol es cosa de los mexicas. No sabemos a quién la dedicaron sus constructores, pero hay pistas. Batres encontró esqueletos de niños enterrados en las esquinas de cada cuerpo. En el mundo mexica, los niños se sacrificaban al dios de la lluvia. Y alrededor de la pirámide había un canal ancho, como un foso: una montaña rodeada de agua.",
      "En los últimos años se excavó un túnel hasta el centro y apareció la ofrenda de fundación: una máscara de piedra verde, vasijas con la cara del dios de las tormentas, obsidiana, conchas, y animales sacrificados, entre ellos un águila.",
      "Y en lo alto, en 2012 y 2013, apareció una escultura grande del dios viejo del fuego. Así que quizá arriba se rendía culto al fuego. Agua abajo y fuego arriba: los dos extremos del mundo en un solo edificio.",
      "Recuerda además la orientación: la fachada mira al oeste, hacia donde se pone el sol el 29 de abril y el 13 de agosto, las fechas que dividen el año en ciento cinco y doscientos sesenta días. La pirámide funcionaba como un calendario gigante."],
    ["Qué buscar y fotos",
      "Uno: desde el centro de la plaza, la escalinata. Se divide en dos y vuelve a unirse; arriba del todo hay una sola.",
      "Dos: la plataforma baja que tiene pegada delante, añadida más tarde, igual que en la Ciudadela.",
      "Tres: rodéala hasta una esquina y mira la arista hacia arriba. Es donde mejor se entiende el tamaño.",
      "Cuatro: la mejor foto de la pirámide entera no se hace desde aquí, sino desde la Calzada o desde la Pirámide de la Luna, con ella de perfil y los cerros detrás."],
    ["➡️ Siguiente",
      "Si te da tiempo, el museo de sitio está detrás de la pirámide, hacia el sur. Si no, vuelve a la Calzada y sigue a la derecha hasta el final: la Plaza de la Luna."] ] },

  { s:"16:40", e:"16:45", t:"🏛️ Museo de sitio (opcional)", d:"Al sur de la Pirámide del Sol, entre jardines. Entra con el mismo boleto. Si vas justo de tiempo, sáltatelo: lo importante ya lo viste en Antropología.", $:"", pin:5, map:"https://www.google.com/maps/search/?api=1&query=Museo+de+la+Cultura+Teotihuacana", g:[
    ["Qué ver en diez minutos",
      "El museo es pequeño. Ve directo a tres cosas.",
      "Primero, la sala de la maqueta: una maqueta enorme de la ciudad bajo un suelo de cristal, con un ventanal al fondo por el que se ve la Pirámide del Sol de verdad. Es la mejor forma de entender el tamaño real de la ciudad y dónde estás.",
      "Segundo, los entierros de la Serpiente Emplumada: esqueletos de los guerreros sacrificados, colocados como se encontraron, con sus collares de mandíbulas.",
      "Y tercero, las vitrinas de obsidiana y de cerámica: busca los incensarios tipo teatro, unos braseros de barro con una carita en el centro rodeada de adornos, y las figuritas articuladas, con brazos y piernas que se mueven.",
      "Fuera hay un jardín con esculturas y otro con plantas de la zona. Es de las pocas sombras de todo el sitio."] ] },

  { s:"16:45", e:"16:55", t:"🌙 Plaza y Pirámide de la Luna", q:["talud", "mexicas"], d:"Al final de la Calzada, al norte. Párate en el altar del centro de la plaza. Si hoy dejan subir, es solo hasta la primera plataforma: pregunta al personal.", $:"", pin:6, map:"https://www.google.com/maps/search/?api=1&query=Pir%C3%A1mide+de+la+Luna+Teotihuac%C3%A1n", g:[
    ["Lo esencial",
      "Has llegado al final de la Calzada. Para muchos arqueólogos, esta plaza es el conjunto mejor compuesto de la ciudad. La Pirámide de la Luna al fondo, y alrededor, doce plataformas de templos casi iguales, todas de talud y tablero, colocadas con una simetría perfecta.",
      "La pirámide mide unos cuarenta y cinco metros de alto y unos ciento cincuenta de base. Es bastante más pequeña que la del Sol, pero como el terreno sube, las dos cimas quedan casi a la misma altura.",
      "Mírala con el Cerro Gordo detrás: la pirámide copia la forma de la montaña. Aquí se entiende mejor que en ningún otro sitio que la ciudad está diseñada mirando al paisaje.",
      "Sobre subir: desde 2025 se permitía subir solo hasta la primera plataforma, y este año ha estado cerrada por temporadas. Lo que valga hoy te lo dice el personal que está al pie. Si se puede, sube: desde ahí se ve toda la Calzada en línea recta con el Sol a la izquierda. Es la foto del día."],
    ["Siete pirámides en una",
      "A diferencia de la del Sol, esta sí creció por capas. Dentro hay siete pirámides, una dentro de otra. La primera, de hacia el año 100, era pequeña y ni siquiera tenía la orientación del resto de la ciudad: es de lo más antiguo de Teotihuacan. La última es de hacia el año 400.",
      "La estructura que sobresale por delante, con cuatro cuerpos y la escalinata, es un añadido posterior, igual que las plataformas del Sol y de la Ciudadela."],
    ["Lo que había dentro",
      "Entre 1998 y 2004, los arqueólogos Saburo Sugiyama y Rubén Cabrera abrieron túneles en el interior y encontraron varias tumbas de ofrenda, una por cada ampliación.",
      "En una había un hombre con las manos atadas a la espalda, rodeado de animales: pumas, un lobo, águilas, halcones, un búho y serpientes de cascabel. Algunos estaban enjaulados y fueron enterrados vivos. Son los animales de la guerra, los que luego llevarían los guerreros mexicas en sus trajes.",
      "En otra había diecisiete cabezas humanas cortadas. Y en la más tardía, tres hombres sentados con las piernas cruzadas, sin ataduras, con adornos de jade al estilo de los reyes mayas. Eran personajes importantes, quizá mayas o relacionados con ellos. Encaja con lo que te conté de Tikal.",
      "Junto a ellos había cuchillos de obsidiana, espejos de pirita y dos figuritas de piedra verde. Teotihuacan no era la ciudad pacífica de sacerdotes que se imaginaba hace cien años: era también una potencia militar."],
    ["La plaza",
      "En el centro tienes un altar cuadrado con cuatro escalinatas, una por cada rumbo del mundo. Aquí se hacían las ceremonias a la vista de todos.",
      "En esta plaza apareció el gran monolito de la diosa del agua que viste en el Museo de Antropología. Imagínalo aquí de pie, pintado, delante de la pirámide.",
      "Y un detalle: la plaza es bastante más pequeña que la Ciudadela. Aquí no cabía toda la ciudad. Probablemente era un espacio más restringido."],
    ["➡️ Siguiente",
      "Mirando a la pirámide, en la esquina izquierda de la plaza, al suroeste, hay una escalinata con una cabeza de serpiente. Sube por ahí: es la entrada al Palacio de Quetzalpapálotl, lo más bonito por dentro."] ] },

  { s:"16:55", e:"17:00", t:"🦋 Palacio de Quetzalpapálotl, Jaguares y Caracoles", d:"Esquina suroeste de la Plaza de la Luna (a la izquierda mirando la pirámide). Tres partes seguidas: el patio de los pilares, el patio de los Jaguares y, bajando, el templo enterrado.", $:"", pin:7, map:"https://www.google.com/maps/search/?api=1&query=Palacio+de+Quetzalpap%C3%A1lotl", obj:1, g:[
    ["🧭 Qué es este sitio",
      "Estás en la única zona del centro donde puedes hacerte una idea de cómo era por dentro un edificio de la élite: con techos, patios, pilares tallados y pintura en las paredes. Probablemente vivían o se reunían aquí los sacerdotes de la Pirámide de la Luna.",
      "Lo excavó y reconstruyó en los años sesenta el arqueólogo Jorge Acosta. Los techos y parte de los muros son reconstrucción, pero los pilares, los relieves y las pinturas son originales."],
    ["📍 Patio de los Pilares",
      "Busca un patio cuadrado rodeado de pilares de piedra tallados.",
      "Cada pilar tiene grabado un animal mítico: el quetzalpapálotl, mezcla de quetzal y mariposa, que da nombre al palacio. En los pilares de un lado lo ves de perfil, y en otros de frente, con las alas abiertas; algunos creen que estos últimos son búhos. Fíjate en los ojos: son discos de obsidiana incrustados, y alguno sigue en su sitio.",
      "Alrededor hay símbolos de agua y de fuego. Y arriba, en el borde del techo, unas almenas de piedra con el signo del año. Los pilares estaban pintados; quedan restos de rojo y de verde. Mira también los muros del pasillo, con dibujos geométricos en rojo."],
    ["📍 Patio de los Jaguares",
      "Sal por detrás y baja a un patio más hundido, con habitaciones alrededor y pinturas en la parte baja de los muros.",
      "Busca los felinos. Son jaguares o pumas de perfil, con un tocado de plumas y conchas en el lomo, que soplan una caracola con plumas como si fuera una trompeta. De la caracola salen la vírgula del sonido y gotas de agua. Están llamando a la lluvia. Por encima, en la franja superior, se alternan caras del dios de las tormentas."],
    ["📍 Templo de los Caracoles Emplumados",
      "Desde el patio de los Jaguares, busca un pasadizo que baja. Estás entrando debajo del palacio.",
      "Es un templo más antiguo, de hacia el año 200 o 300, que quedó enterrado cuando construyeron encima. Por eso conserva los colores mejor que nada de lo que has visto.",
      "En la fachada hay relieves de grandes caracolas con plumas y con boquilla: son instrumentos musicales. Y abajo, en la plataforma, una fila de pájaros verdes, seguramente loros o quetzales, que echan un chorro de agua azul por el pico sobre flores amarillas. Es de lo más delicado de todo Teotihuacan."],
    ["➡️ Salida",
      "Con esto has visto lo principal. La Puerta 3 está aquí al lado, detrás del palacio. Si tu autobús sale de la Puerta 1 o de la 2, tienes que volver por la Calzada: hasta la Puerta 2 son unos diez minutos, y hasta la 1, media hora andando. El sitio cierra a las cinco."] ] },

  { s:"17:00", e:"17:10", t:"🎨 Si sobra tiempo: los murales de Tepantitla", d:"Fuera del recinto, detrás de la Pirámide del Sol (salida por la Puerta 4, unos 500 m). Entra con el mismo boleto. Solo si vas sobrado de tiempo y antes del cierre.", $:"", pin:8, map:"https://www.google.com/maps/search/?api=1&query=Tepantitla+Teotihuac%C3%A1n", g:[
    ["Qué es y qué ver",
      "Tepantitla es uno de aquellos conjuntos de apartamentos donde vivía la gente, en este caso gente rica. Conserva el mural más famoso de la ciudad, conocido como el Tlalocan, el paraíso del dios de la lluvia.",
      "En la parte de arriba hay una gran figura de frente, con un árbol que le sale de la cabeza, lleno de arañas y mariposas, y agua que le brota de las manos. Es la Gran Diosa de la que te hablé.",
      "Debajo está lo mejor: decenas de figuritas humanas diminutas que nadan, cantan, juegan a la pelota, cazan mariposas y bailan al pie de una montaña de la que salen ríos. De sus bocas salen vírgulas, que son palabras o canciones. Es la única escena alegre y cotidiana del arte de Teotihuacan.",
      "Hay otros dos conjuntos con murales al oeste del sitio, Tetitla y Atetelco, pero quedan lejos a pie. Las mejores piezas pintadas las viste el sábado en Antropología."],
    ["🧠 Resumen para recordarlo",
      "Si te quedas con cinco ideas, que sean estas.",
      "Una: no es azteca. Es mil años anterior, y los mexicas ya la encontraron en ruinas.",
      "Dos: fue una ciudad planificada, de cien mil habitantes, con gente de toda Mesoamérica viviendo en apartamentos.",
      "Tres: no conocemos a ninguno de sus reyes. Quizá gobernaba un consejo.",
      "Cuatro: las pirámides son montañas sagradas, con cuevas y túneles debajo que reproducen el inframundo.",
      "Y cinco: no la destruyó un enemigo de fuera. Lo más probable es que su propia gente quemara los templos del poder."] ] }
];

/* Sábado 7: Museo Nacional de Antropología (se conserva por si vuelve al calendario). */
var MUSEO = [
  { s:"16:30", e:"16:32", t:"🏛️ Entrada y el Paraguas", n:"Paraguas", q:["mexicas"], d:"Cruza el patio recto hasta el fondo: la Sala Mexica (2 en el mapa).", $:"", pin:1, map:"https://www.google.com/maps/search/?api=1&query=Museo+Nacional+de+Antropolog%C3%ADa+CDMX", g:[
    ["Lo esencial",
      "Estás en el Museo Nacional de Antropología, inaugurado en 1964 y diseñado por el arquitecto Pedro Ramírez Vázquez. Es el museo más visitado de México y guarda la mayor colección de arte prehispánico del mundo.",
      "La planta baja es arqueología: cada sala es una cultura antigua. La planta alta es etnografía, los pueblos indígenas de hoy. Con hora y media, quédate abajo.",
      "La estructura del patio es el Paraguas: una cubierta enorme apoyada en una sola columna de bronce, de la que cae una cortina de agua. Los relieves de la columna son de José Chávez Morado y cuentan la historia de México."],
    ["Por dónde ir",
      "Cruza el patio en línea recta hasta el fondo: la gran sala central es la Mexica, con la Piedra del Sol. Después sigues por la fila de arriba del mapa: Oaxaca, Golfo, Maya, Norte y Occidente. Al acabar cruzas el patio y haces la fila de abajo: Introducción, Preclásico, Teotihuacan y Toltecas, que te deja otra vez cerca de la salida.",
      "Al salir de cada sala, la siguiente está justo al lado.",
      "Una curiosidad de fuera: el Tláloc gigante de la entrada, en Reforma, pesa más de ciento sesenta toneladas. Lo trajeron en 1964 desde Coatlinchán, y cuentan que cuando llegó a la ciudad cayó un aguacero fuera de temporada."] ] },

  { s:"16:32", e:"16:42", t:"☀️ Piedra del Sol (Sala Mexica)", n:"Piedra del Sol", q:["mexicas", "moctezuma", "nahuatl"], d:"En la pared del fondo de la Sala Mexica, en el centro. Colócate de frente y luego acércate al anillo de los días.", $:"", pin:2, g:[
    ["Lo esencial",
      "Delante tienes la pieza más famosa de México: la Piedra del Sol. Es un disco de basalto de unos tres metros y medio de diámetro y casi veinticinco toneladas, tallado por los mexicas a finales del siglo quince o principios del dieciséis, pocos años antes de la llegada de los españoles.",
      "Se la llama calendario azteca, pero no es un calendario para consultar fechas. Es un monumento religioso: una imagen del cosmos mexica, de cómo nació este mundo y de cómo va a terminar.",
      "Originalmente estaba pintada de colores: rojo, amarillo, azul y blanco. Hoy se ve gris, pero en Tenochtitlan brillaba."],
    ["El rostro del centro",
      "Empieza por el centro. Ese rostro suele identificarse con Tonatiuh, el sol. Algunos investigadores creen que es Tlaltecuhtli, el señor de la tierra, o el sol nocturno que viaja por el inframundo. El debate sigue abierto.",
      "Fíjate en la lengua: es un cuchillo de pedernal, el cuchillo del sacrificio. Y a los lados, las garras sujetan corazones humanos. Para los mexicas, el sol necesitaba sangre para seguir moviéndose, y los sacrificios lo alimentaban."],
    ["Los cinco soles",
      "Alrededor del rostro hay cuatro recuadros. Son los cuatro soles, las cuatro eras anteriores del mundo, cada una destruida de una forma.",
      "Arriba a la derecha, el jaguar: el primer sol, que acabó cuando los jaguares devoraron a los gigantes. Arriba a la izquierda, el viento: el segundo, barrido por huracanes. Abajo a la izquierda, la lluvia de fuego. Y abajo a la derecha, el agua: el cuarto sol, que acabó en un diluvio.",
      "Los cuatro juntos, con el centro, forman el signo Nahui Ollin, cuatro movimiento. Es el quinto sol, el nuestro. Según el mito, este mundo terminará con terremotos."],
    ["El anillo de los días",
      "El primer anillo que rodea todo eso tiene veinte casillas. Son los veinte signos de los días del calendario ritual mexica: cocodrilo, viento, casa, lagartija, serpiente, muerte, venado, conejo, agua, perro, mono, hierba, caña, jaguar, águila, zopilote, movimiento, pedernal, lluvia y flor.",
      "Combinados con los números del uno al trece daban un ciclo de doscientos sesenta días, que se usaba para los rituales y para poner nombre a las personas según el día en que nacían."],
    ["Las serpientes de fuego",
      "Ahora mira el borde exterior. Lo rodean dos xiuhcóatl, serpientes de fuego, con el cuerpo dividido en segmentos. Sus colas empiezan arriba y sus cabezas se encuentran abajo, en el centro, frente a frente. De sus fauces salen dos rostros humanos.",
      "Justo arriba, entre las colas, hay un recuadro con una fecha: trece caña. Es el año en que, según el mito, nació el quinto sol. Esas serpientes cargan al sol en su recorrido por el cielo."],
    ["Su historia",
      "Después de la conquista, la piedra se enterró boca abajo en la plaza mayor, quizá para borrar los antiguos dioses. Pasó más de dos siglos bajo el suelo.",
      "Apareció el 17 de diciembre de 1790, durante unas obras para empedrar el Zócalo, pocos meses después de que saliera la Coatlicue, que tienes en esta misma sala. El astrónomo Antonio de León y Gama la estudió y publicó el primer libro sobre ella.",
      "Durante casi cien años estuvo empotrada en el muro de la torre oeste de la Catedral, la que viste el otro día, a la vista de todos. En 1885 la llevaron al museo de la calle Moneda, y en 1964 la trajeron aquí."],
    ["Qué buscar",
      "Ponte primero lejos, de frente, para ver el conjunto. Después acércate y busca, en este orden: la lengua de cuchillo, las garras con corazones, el jaguar de arriba a la derecha, la fecha trece caña arriba del todo y las dos cabezas de serpiente abajo.",
      "Mira también el borde lateral: hay zonas sin terminar o dañadas. Y fíjate en las marcas del lado derecho: se cree que en algún momento se intentó romper o reutilizar la piedra."] ] },

  { s:"16:42", e:"16:55", t:"🐍 Resto de la Sala Mexica", n:"Sala Mexica", q:["mexicas", "moctezuma", "tlaloc"], d:"Coatlicue, Piedra de Tízoc, ocelocuauhxicalli, maqueta de Tenochtitlan y réplica del penacho.", $:"", pin:3, obj:1, g:[
    ["📍 Coatlicue",
      "Busca la gran escultura vertical, de unos tres metros y medio, con una falda de serpientes entrelazadas.",
      "Es Coatlicue, la de la falda de serpientes, madre de Huitzilopochtli, el dios de la guerra y del sol. Salió del Zócalo en agosto de 1790, cuatro meses antes que la Piedra del Sol.",
      "No tiene cabeza: en su lugar brotan dos serpientes que se miran de frente, y que representan dos chorros de sangre. Lleva un collar de manos y corazones con una calavera en el centro, y en vez de pies tiene garras.",
      "Causó tanta impresión que la volvieron a enterrar en el patio de la universidad, para que nadie la adorara ni se asustara. La desenterraron y enterraron varias veces hasta que se quedó en el museo."],
    ["📍 Piedra de Tízoc",
      "Busca un gran cilindro de piedra, más ancho que alto, con figuras talladas alrededor.",
      "Muestra al gobernante Tízoc, que reinó antes de Moctezuma, capturando a guerreros de los pueblos vencidos: cada pareja es una conquista, con el glifo del pueblo al lado.",
      "Arriba tiene un hueco en el centro y un canal que llega al borde. Se cree que se usaba en sacrificios."],
    ["📍 El jaguar de los corazones",
      "Busca un jaguar de piedra tumbado con un hueco redondo en el lomo.",
      "Es un ocelocuauhxicalli, el recipiente del águila jaguar. En ese hueco se depositaban los corazones de los sacrificados como ofrenda al sol. Apareció enterrado junto al Templo Mayor."],
    ["📍 Xochipilli",
      "Busca una figura sentada con las piernas cruzadas, con máscara y el cuerpo cubierto de flores talladas.",
      "Es Xochipilli, el príncipe de las flores, dios del arte, la música, la danza y el placer.",
      "Las flores de su cuerpo se han identificado con plantas que alteran la conciencia, como hongos y tabaco. Por eso se piensa que representa un estado de éxtasis."],
    ["📍 Maqueta de Tenochtitlan",
      "Busca la maqueta o el gran mural de una ciudad sobre un lago.",
      "Así era Tenochtitlan en 1519: una ciudad sobre islotes en el lago de Texcoco, unida a tierra por calzadas, con canales y unas doscientas mil personas.",
      "En el centro, el recinto sagrado con el Templo Mayor y sus dos santuarios. Es justo lo que viste el miércoles desde fuera, junto a la Catedral."],
    ["📍 Penacho de Moctezuma",
      "Busca un gran tocado verde de plumas de quetzal, en una vitrina.",
      "Es una réplica del llamado penacho de Moctezuma, hecho con plumas de quetzal y oro. El original está en Viena desde el siglo dieciséis, y México lleva años pidiendo que vuelva.",
      "No se sabe si de verdad fue de Moctezuma. Probablemente era el tocado de un sacerdote."],
    ["➡️ Siguiente sala",
      "Sal de la Sala Mexica por el lado de Oaxaca, la fila de arriba del mapa, número cuatro. Si miras hacia la entrada, queda a tu derecha."] ] },

  { s:"16:55", e:"17:01", t:"🦇 Oaxaca", n:"Oaxaca", d:"Zapotecos y mixtecos. Si vas justo, esta es la que se recorta.", $:"", pin:4, obj:1, g:[
    ["🧭 El territorio",
      "Oaxaca es un estado de montañas. Tres cordilleras se cruzan y forman valles, cañadas y sierras, con climas que van de la costa tropical a los bosques fríos. Esa geografía tan rota explica casi todo: los pueblos quedaron separados y desarrollaron lenguas y costumbres propias. Hoy Oaxaca es el estado con más diversidad indígena de México: se hablan dieciséis lenguas distintas, con cientos de variantes.",
      "Las dos grandes culturas antiguas de esta sala son los zapotecos, de los valles centrales, y los mixtecos, de las montañas del oeste."],
    ["🧭 Los zapotecos y Monte Albán",
      "Los zapotecos se llamaban a sí mismos bené zaa, el pueblo de las nubes. Hacia el año quinientos antes de Cristo hicieron algo extraordinario: aplanaron la cima de un cerro, a cuatrocientos metros sobre el valle, y construyeron allí Monte Albán, una ciudad sagrada que dominaría la región durante más de mil años.",
      "Fue una de las primeras ciudades de Mesoamérica, anterior a Teotihuacan. Tenía una gran plaza rodeada de templos, palacios, un juego de pelota y un edificio con forma de punta de flecha, que probablemente servía de observatorio.",
      "Los zapotecos fueron de los primeros en Mesoamérica en usar escritura y el calendario. En las losas de los Danzantes, de los más antiguos monumentos de Monte Albán, ya aparecen glifos con fechas y nombres."],
    ["🧭 La obsesión por los antepasados",
      "Para los zapotecos, los antepasados eran fundamentales. Los muertos importantes se enterraban en tumbas construidas bajo el suelo de las casas, con pinturas en las paredes, de modo que los vivos seguían viviendo literalmente encima de sus abuelos. Los antepasados eran intermediarios con los dioses, sobre todo con Cocijo, el dios de la lluvia y el rayo.",
      "En las tumbas se colocaban las urnas, esas vasijas de barro con figuras de dioses o de antepasados divinizados, con tocados enormes. Son lo más característico del arte zapoteco.",
      "Monte Albán se fue despoblando hacia el año ochocientos, y el poder zapoteco se dispersó en señoríos más pequeños. Uno de ellos, Mitla, cuyo nombre significa lugar de los muertos, tiene unos palacios decorados con grecas de piedra, mosaicos geométricos encajados sin argamasa. Esas grecas son una seña de identidad de Oaxaca que verás en muchos sitios."],
    ["🧭 Los mixtecos, artistas y genealogistas",
      "Los mixtecos se llamaban ñuu savi, el pueblo de la lluvia. No formaron un imperio, sino decenas de pequeños reinos en las montañas, que se aliaban y se enfrentaban mediante bodas, herencias y guerras, como las casas nobles de la Europa medieval.",
      "Por eso les obsesionaba la genealogía. Pintaron códices en piel de venado, doblados en forma de biombo, con la historia de sus familias reales: quién nació de quién, quién se casó con quién, qué guerras ganaron. El héroe más famoso de esos códices es el señor Ocho Venado Garra de Jaguar, un rey guerrero del siglo once que unificó buena parte de la región.",
      "Eran también los mejores artesanos de Mesoamérica: oro fundido a la cera perdida, mosaicos de turquesa, hueso tallado, cristal de roca. Muchos de los objetos más finos que los españoles encontraron en Tenochtitlan probablemente eran obra mixteca, y los mexicas se llevaban a sus orfebres a la capital. El tesoro más famoso es el de la Tumba Siete de Monte Albán, donde los mixtecos reutilizaron una tumba zapoteca antigua y la llenaron de joyas."],
    ["🧭 Conquista y presente",
      "Los mexicas conquistaron gran parte de Oaxaca a finales del siglo quince y le impusieron tributo, aunque algunos pueblos, como los zapotecos del istmo de Tehuantepec, resistieron. Después llegaron los españoles.",
      "Pero las culturas siguen aquí. Los zapotecos y los mixtecos son hoy cientos de miles de personas que conservan su lengua, sus fiestas como la Guelaguetza y una cocina famosísima: el mole, las tlayudas, el mezcal. Benito Juárez, el presidente más famoso de la historia de México, era zapoteco."],
    ["🧭 En qué se diferencian",
      "Comparados con los mexicas, aquí no hay un gran imperio, sino ciudades y señoríos de montaña muy ligados a la familia y los antepasados. Comparados con los mayas, son igual de antiguos y también escribían, pero su escritura está mucho menos descifrada."],
    ["📍 Máscara del dios murciélago",
      "Busca una máscara verde hecha de muchas piezas pequeñas de jade, con forma de murciélago.",
      "Se encontró en Monte Albán. El murciélago estaba ligado a la noche, la muerte y la fertilidad. Los ojos y los dientes son de concha."],
    ["📍 Urnas zapotecas",
      "Busca figuras de barro de dioses sentados, con grandes tocados.",
      "Son urnas funerarias que se colocaban en las tumbas. Muchas representan a Cocijo, el dios de la lluvia de los zapotecos."],
    ["📍 Danzantes",
      "Busca losas de piedra con figuras de hombres en posturas retorcidas.",
      "Se las llamó danzantes, pero hoy se cree que son prisioneros de guerra sacrificados o mutilados. Hay cientos en Monte Albán."],
    ["📍 Oro mixteco",
      "Busca la vitrina de joyas de oro.",
      "Los mixtecos trabajaban el oro con la técnica de la cera perdida, con un detalle finísimo. Muchas piezas del tesoro de Moctezuma eran obra suya."],
    ["➡️ Siguiente sala",
      "Sigue a la sala de al lado: Golfo de México, el número cinco."] ] },

  { s:"17:01", e:"17:08", t:"🗿 Golfo de México (olmecas)", n:"Golfo", d:"La cabeza colosal olmeca y el Luchador.", $:"", pin:5, obj:1, g:[
    ["🧭 El territorio",
      "La costa del golfo de México es una franja larga junto al mar, desde Tamaulipas en el norte hasta Tabasco en el sur, pasando por todo Veracruz. Es tierra caliente: selva, ríos anchísimos que bajan de las montañas, pantanos, lagunas y lluvias casi todo el año. Muy distinto del altiplano seco y frío de Ciudad de México.",
      "Era una tierra rica. Allí se daban el cacao, el algodón, el hule, la vainilla y las plumas de aves tropicales, cosas muy valoradas en todo Mesoamérica. Por eso fue siempre zona de comercio y, más tarde, de conquista por parte de los mexicas. Y por esta misma costa entraron los españoles en 1519: Cortés fundó Veracruz y desde aquí subió hacia Tenochtitlan.",
      "En esta sala conviven tres culturas de épocas muy distintas: los olmecas, los más antiguos, en el sur; las culturas del centro de Veracruz, con los totonacas y la ciudad de El Tajín; y los huastecos, en el norte."],
    ["🧭 Los olmecas, la cultura madre",
      "Los olmecas vivieron en el sur de Veracruz y en Tabasco entre unos mil doscientos y cuatrocientos años antes de Cristo. Es decir, florecieron hace más de tres mil años, cuando en Europa estaba la Grecia de Homero.",
      "El nombre olmeca no es suyo: se lo pusieron los arqueólogos en el siglo veinte, por una palabra náhuatl que significa la gente del país del hule. No sabemos cómo se llamaban a sí mismos ni qué lengua hablaban, aunque se cree que podría ser antecesora de las lenguas mixe y zoque que aún se hablan en la región.",
      "Sus grandes centros fueron San Lorenzo, que es el más antiguo, y La Venta, después. No eran ciudades de piedra como las mayas: construían con tierra y arcilla, plataformas y montículos, porque en esa zona de pantanos no hay piedra. Por eso son tan asombrosas las cabezas colosales: el basalto lo traían desde la sierra de los Tuxtlas, a más de cincuenta kilómetros, arrastrando bloques de muchas toneladas y probablemente moviéndolos en balsas por los ríos.",
      "Se los llama cultura madre porque muchas cosas que luego son típicas de toda Mesoamérica aparecen primero con ellos: las pirámides, el juego de pelota con pelotas de hule, el culto al jaguar, el valor sagrado del jade, los gobernantes que se presentan como intermediarios con lo divino, y probablemente los primeros calendarios y signos de escritura. Su estilo se copió en lugares tan lejanos como Oaxaca, el valle de México o Guerrero, y por eso verás rasgos olmecas en la sala del Preclásico.",
      "Fíjate en un rostro que se repite: labios gruesos con las comisuras hacia abajo, como un bebé que llora, a veces con colmillos o rasgos de jaguar. Es el llamado hombre jaguar, una mezcla de humano y felino ligada probablemente a la lluvia, la tierra y el poder de los jefes. Y fíjate en las hachas de jade pulido, que enterraban en ofrendas: para ellos el jade verde era el color del agua y del maíz, la vida misma."],
    ["🧭 El centro de Veracruz y El Tajín",
      "Siglos después de los olmecas, en el centro de Veracruz florecieron otras culturas. La más famosa es la de El Tajín, una gran ciudad que alcanzó su apogeo entre los años seiscientos y mil doscientos después de Cristo. Su edificio más conocido es la Pirámide de los Nichos, con trescientos sesenta y cinco huecos, uno por cada día del año según la tradición.",
      "El Tajín estaba obsesionado con el juego de pelota: tiene al menos diecisiete canchas. De esta cultura son los yugos de piedra, con forma de herradura, que imitan los cinturones protectores que llevaban los jugadores, y las palmas y hachas que se ponían encima. Eran versiones ceremoniales en piedra, demasiado pesadas para jugar con ellas.",
      "También de esta zona son las caritas sonrientes: figuras de barro que se ríen abiertamente, con la cabeza ladeada y los brazos abiertos. En el arte prehispánico casi nadie sonríe, así que son una rareza. Se cree que tenían que ver con fiestas, música y quizá con estados de trance.",
      "Cuando llegaron los españoles, esta zona la habitaban los totonacas, cuya capital era Cempoala. Estaban sometidos a los mexicas y hartos de pagarles tributo, así que fueron los primeros aliados de Cortés. Hoy los totonacas siguen ahí, y son famosos por la danza de los voladores de Papantla, que giran colgados de un palo altísimo."],
    ["🧭 Los huastecos",
      "En el norte, en la Huasteca, entre Veracruz, San Luis Potosí y Tamaulipas, vivían los huastecos. Lo curioso es que su lengua es maya, aunque viven a más de mil kilómetros de las tierras mayas: se separaron de los demás pueblos mayas hace unos tres mil años.",
      "Los mexicas los veían con una mezcla de desprecio y fascinación: decían que eran gente desinhibida, que iban con poca ropa, pintados y tatuados, y que bebían mucho pulque. Los conquistaron a finales del siglo quince.",
      "El Adolescente huasteco, la escultura del joven con el cuerpo cubierto de dibujos, es su gran obra. Y su dios más importante era Quetzalcóatl en su forma de viento, Ehécatl; de hecho, muchas de las ideas sobre Quetzalcóatl podrían venir de esta zona."],
    ["🧭 En qué se diferencian",
      "Si comparas esta sala con la mexica, verás que aquí no hay un imperio ni una sola cultura, sino una costa rica por la que pasaron pueblos distintos durante dos mil quinientos años.",
      "Los olmecas pusieron las bases de todo lo que vino después. Las culturas del centro de Veracruz aportaron el juego de pelota como gran ceremonia y un arte más alegre. Y los huastecos son un pueblo de lengua maya en tierra lejana.",
      "Mientras paseas, busca esos tres estilos: el olmeca, macizo y serio, con caras de bebé y jaguar; el veracruzano, con yugos y caritas sonrientes; y el huasteco, con figuras delgadas y tatuadas."],
    ["📍 Cabeza colosal",
      "Busca una cabeza enorme de piedra, de más de dos metros, con una especie de casco.",
      "Es el retrato de un gobernante olmeca. Se tallaba en un solo bloque de basalto de varias toneladas que traían desde montañas a decenas de kilómetros, sin ruedas ni animales de carga. Se conocen diecisiete."],
    ["📍 El Luchador",
      "Busca una figura pequeña de un hombre sentado, con barba y los brazos en movimiento.",
      "Es el Luchador olmeca. Es de las esculturas más naturales y modernas de todo el museo: parece que se está moviendo."],
    ["📍 Adolescente huasteco",
      "Busca la figura de un joven desnudo y delgado, con el cuerpo cubierto de dibujos tallados.",
      "Es el Adolescente huasteco. Los dibujos son tatuajes o pintura corporal. Probablemente representa a Quetzalcóatl joven."],
    ["➡️ Siguiente sala",
      "Sigue a la sala de al lado: Maya, el número seis."] ] },

  { s:"17:08", e:"17:22", t:"🌿 Maya: tumba de Pakal", n:"Maya", d:"Baja a la réplica de la tumba de Pakal. Después, sal al jardín a ver Bonampak.", $:"", pin:6, obj:1, g:[
    ["🧭 Quiénes eran y dónde vivían",
      "Los mayas vivieron en el sureste de México, en los actuales Yucatán, Campeche, Quintana Roo, Chiapas y Tabasco, y también en Guatemala, Belice y parte de Honduras y El Salvador. Es un territorio enorme y muy variado: al sur, tierras altas de montañas y volcanes; en el centro, la selva tropical húmeda de El Petén; y al norte, la península de Yucatán, una losa de roca caliza plana y seca, sin ríos en la superficie.",
      "En Yucatán el agua está bajo tierra. Por eso son tan importantes los cenotes, pozos naturales donde el techo de una cueva se hundió y deja ver el agua subterránea. Para los mayas eran entradas al inframundo, y en algunos se arrojaban ofrendas, e incluso personas.",
      "La historia maya es larguísima. Las primeras aldeas aparecen hacia el dos mil antes de Cristo, y en el Preclásico ya hay ciudades enormes como El Mirador, en Guatemala, con pirámides más grandes que muchas posteriores. La gran época, el Clásico, va más o menos del año doscientos cincuenta al novecientos. Y el Posclásico llega hasta la llegada de los españoles. Es decir, más de tres mil años de historia: cuando nació Tenochtitlan, los mayas ya llevaban dos mil años construyendo ciudades."],
    ["🧭 Ciudades estado y reyes sagrados",
      "Lo más importante para entender a los mayas es que nunca fueron un imperio ni un país. Eran decenas de ciudades estado independientes, cada una con su rey, su dinastía y su dios patrón. Se parecían más a las ciudades de la antigua Grecia o a los reinos de la Italia del Renacimiento que al imperio mexica.",
      "Algunas ciudades eran superpotencias. En el Clásico, las dos grandes eran Tikal, en Guatemala, y Calakmul, en Campeche. Durante siglos se disputaron el dominio de la región con alianzas, bodas entre familias reales y guerras, como una guerra fría de la selva. Las ciudades pequeñas se ponían bajo la protección de una o de otra.",
      "El rey se llamaba k'uhul ajaw, señor sagrado. No era solo un jefe político: era el intermediario entre los hombres y los dioses. En ceremonias se sacaba sangre de la lengua o de otras partes del cuerpo y la dejaba caer sobre papel, que luego se quemaba. En el humo se aparecían los antepasados y los dioses.",
      "Las ciudades tenían un centro ceremonial con templos piramidales, palacios, plazas y juegos de pelota, y alrededor, barrios y campos de cultivo repartidos por la selva. Calzadas blancas de piedra, llamadas sacbé, unían edificios y ciudades."],
    ["🧭 Escritura, números y calendario",
      "Los mayas tenían la escritura más completa de la América antigua. No eran solo dibujos: era un sistema con cientos de signos, que mezclaba signos de palabras completas con signos de sílabas, como el japonés. Podían escribir cualquier cosa que pudieran decir.",
      "Escribían en estelas de piedra, en dinteles, en vasijas pintadas y en libros de papel de corteza doblados en acordeón, los códices. Casi todos los códices fueron quemados por los frailes españoles. Solo sobreviven cuatro, y ninguno está en México salvo uno.",
      "Durante mucho tiempo nadie sabía leerla. El gran avance llegó en los años cincuenta y sesenta del siglo veinte, con investigadores como el ruso Yuri Knórosov y la estadounidense Tatiana Proskouriakoff, que demostró que las estelas contaban la vida de reyes reales: nacimientos, subidas al trono, guerras y muertes. Hoy se puede leer la mayor parte de lo que escribieron.",
      "Contaban en base veinte, con un punto para el uno, una barra para el cinco y una concha para el cero. Fueron de las primeras culturas del mundo en usar el cero. Con esto llevaban varios calendarios a la vez: el ritual de doscientos sesenta días, el solar de trescientos sesenta y cinco, y la Cuenta Larga, que contaba los días desde una fecha de creación del mundo, en el año tres mil ciento catorce antes de Cristo. Lo del supuesto fin del mundo en 2012 venía de ahí: solo era el final de un gran ciclo, como cuando un cuentakilómetros pasa a cero."],
    ["🧭 Religión, maíz y juego de pelota",
      "Para los mayas, el ser humano estaba hecho de maíz. Lo cuenta el Popol Vuh, el libro sagrado de los mayas quichés de Guatemala: los dioses intentaron crear a los hombres de barro y de madera, y fracasaron, hasta que los hicieron de masa de maíz.",
      "El mundo tenía tres niveles: el cielo, la tierra y el inframundo, llamado Xibalbá, el lugar del miedo. En el centro, un gran árbol, la ceiba, unía los tres niveles. Es el árbol que verás en la losa de la tumba de Pakal.",
      "El Popol Vuh cuenta también la historia de los Héroes Gemelos, Hunahpú e Ixbalanqué, que bajan a Xibalbá y vencen a los señores de la muerte jugando a la pelota. Por eso el juego de pelota era mucho más que un deporte: era la representación del movimiento del sol y de la lucha entre la vida y la muerte. Se jugaba con una pelota de hule macizo, golpeándola con la cadera, y a veces terminaba con sacrificios.",
      "El dios de la lluvia era Chaac, el equivalente del Tláloc mexica, con la nariz larga y curvada. Lo verás en muchas fachadas."],
    ["🧭 El colapso y los mayas de hoy",
      "Hacia el siglo nueve, una ciudad tras otra del sur dejó de levantar monumentos, y la gente se fue. Tikal, Calakmul, Palenque o Copán quedaron vacías y se las comió la selva. Es el famoso colapso maya.",
      "No hubo una sola causa. Se combinaron sequías muy fuertes, que hoy se detectan en sedimentos de lagos, el exceso de población, la deforestación y las guerras constantes entre ciudades. Los reyes sagrados no podían traer la lluvia, y perdieron su autoridad.",
      "Pero los mayas no desaparecieron. La vida siguió en el norte de Yucatán, con ciudades como Chichén Itzá, Uxmal y, después, Mayapán. Cuando llegaron los españoles, la región estaba dividida en pequeños señoríos, y por eso la conquista fue lenta: el último reino maya independiente, Tayasal, en Guatemala, cayó en 1697, casi doscientos años después que Tenochtitlan.",
      "Hoy más de seis millones de personas hablan alguna de las treinta lenguas mayas, como el yucateco, el tzotzil, el tzeltal o el quiché."],
    ["🧭 En qué se diferencian de los mexicas",
      "Los mexicas fueron un imperio joven, de apenas doscientos años, con una capital única que cobraba tributo a todos. Los mayas fueron una civilización de más de tres mil años, repartida en muchas ciudades rivales, sin capital común.",
      "Su arte también es distinto. El arte mexica es monumental, rígido y simbólico, pensado para impresionar. El maya es más naturalista y narrativo: retratos de reyes con rasgos personales, escenas de corte, textos largos que cuentan historias concretas. Y los mayas escribían de verdad, mientras que los mexicas usaban sobre todo pictogramas.",
      "Mientras recorres la sala, fíjate en eso: aquí las caras parecen personas concretas."],
    ["📍 Tumba de Pakal",
      "Busca dentro de la sala unas escaleras que bajan. Abajo está la reproducción de la tumba.",
      "Pakal fue el gran rey de Palenque. Subió al trono con doce años y gobernó sesenta y ocho, hasta su muerte en el año 683.",
      "El arqueólogo Alberto Ruz descubrió la tumba en 1952 dentro del Templo de las Inscripciones. Tardó cuatro años en vaciar la escalera, rellena de escombros a propósito.",
      "Fíjate en la losa del sarcófago: el rey cayendo al inframundo, o renaciendo, bajo un árbol sagrado."],
    ["📍 Máscara de jade de Pakal",
      "Busca una máscara verde hecha de piezas de jade, con ojos de concha y obsidiana.",
      "Es la máscara funeraria original de Pakal. Fue robada en la Navidad de 1985 junto con otras piezas del museo y se recuperó en 1989."],
    ["📍 Bonampak",
      "Sal de la sala al jardín de detrás: busca un pequeño templo con murales de colores dentro.",
      "Es la reproducción de los murales de Bonampak, en Chiapas, de finales del siglo ocho. Muestran una batalla, el juicio a los prisioneros y una fiesta en la corte. Son de las pinturas mejor conservadas de la América antigua."],
    ["➡️ Siguiente sala",
      "Sigue a la sala de al lado: Norte y Occidente, el número siete."] ] },

  { s:"17:22", e:"17:28", t:"🐕 Norte + Occidente", n:"Occidente", d:"Cerámica de Paquimé y perritos de Colima. Después cruza el patio a la fila de abajo (8).", $:"", pin:7, obj:1, g:[
    ["🧭 Dos mundos en los márgenes",
      "Esta sala reúne dos regiones que quedaban en los márgenes del mundo mesoamericano: el occidente, junto al Pacífico, y el gran norte, el desierto. Las dos son muy distintas de todo lo que has visto en Mexica, Oaxaca o Maya, y sirven para entender que Mesoamérica tenía límites, y que más allá había otras formas de vivir.",
      "Mesoamérica es el nombre que se da a la gran área cultural que va del centro de México hasta Centroamérica, con cosas en común: el maíz como base, las pirámides, el juego de pelota, el calendario de doscientos sesenta días, los mercados y los sacrificios. Cuanto más al norte o al oeste vas, más se diluyen esos rasgos."],
    ["🧭 El occidente y las tumbas de tiro",
      "El occidente son los actuales Colima, Jalisco y Nayarit, en la costa del Pacífico y en las montañas detrás. Durante siglos, más o menos entre el trescientos antes de Cristo y el seiscientos después, aquí no se construyeron grandes pirámides de piedra ni templos con dioses monumentales. La vida giraba en torno a los linajes familiares y a los muertos.",
      "Su gran invento son las tumbas de tiro. Excavaban un pozo vertical en la roca, a veces de más de diez metros, y al fondo abrían una o varias cámaras donde enterraban a los muertos de la familia, generación tras generación. Junto a ellos colocaban figuras de barro.",
      "Esas figuras son lo que hace única esta sala. No son dioses, sino gente: parejas abrazadas, madres con niños, músicos, guerreros con armadura, jugadores de pelota, enfermos, jorobados, casas con gente dentro y escenas de aldeas enteras. Es como un álbum de fotos de la vida diaria de hace dos mil años. Por desgracia, muchas tumbas se saquearon, y por eso de muchas figuras no sabemos exactamente de dónde salieron.",
      "Y los perros. En Colima abundan los perritos de barro, gorditos y brillantes, a veces con máscara. Son xoloitzcuintles, perros sin pelo. Tenían doble función: se los criaba para comer, y se creía que acompañaban al alma del muerto en su viaje al inframundo, ayudándole a cruzar un río.",
      "En el occidente también se desarrolló pronto la metalurgia. Las técnicas para trabajar el cobre llegaron probablemente por mar desde Sudamérica, desde Ecuador y Perú, lo que muestra que había contactos por la costa del Pacífico."],
    ["🧭 Los purépechas, el reino que venció a los mexicas",
      "Más tarde, en Michoacán, surgió el reino purépecha, al que los españoles llamaron tarasco. Su capital era Tzintzuntzan, junto al lago de Pátzcuaro, con unas plataformas de piedra curiosas, en forma de ojo de cerradura, llamadas yácatas.",
      "Hablaban una lengua aislada, sin parientes conocidos, y su cultura era bastante distinta de la del centro. Eran muy buenos metalúrgicos: hacían herramientas y armas de cobre, y joyas de oro y plata.",
      "Lo más llamativo es que fueron los grandes rivales de los mexicas. Hacia 1478 el ejército mexica los atacó y sufrió una derrota tremenda. Desde entonces, la frontera entre los dos reinos fue una línea de fortalezas que nunca se cruzó. Cuando llegó Cortés, los purépechas no quisieron aliarse con los mexicas, y después acabaron sometidos por los españoles."],
    ["🧭 El norte, la tierra de los chichimecas",
      "Al norte, el paisaje cambia por completo: desiertos, estepas, sierras y barrancas. Allí la agricultura era difícil, y muchos pueblos vivían como cazadores y recolectores, moviéndose según las estaciones, comiendo tunas, mezquite, agave, venados y conejos.",
      "Los mexicas llamaban a todos esos pueblos chichimecas, que venía a significar bárbaros o gente salvaje. Pero, curiosamente, ellos mismos presumían de tener origen chichimeca: decían que sus antepasados habían venido del norte, de Aztlán, como cazadores nómadas, antes de civilizarse en el valle. Era una mezcla de desprecio y orgullo.",
      "Los españoles tardaron siglos en controlar el norte. La llamada guerra chichimeca duró casi cuarenta años en el siglo dieciséis."],
    ["🧭 Paquimé y los pueblos de hoy",
      "Había excepciones. La más importante es Paquimé, en Chihuahua, que floreció entre los siglos trece y quince. Era una ciudad de adobe con edificios de varios pisos, puertas en forma de T, canales de agua y depósitos, más parecida a los pueblos del suroeste de Estados Unidos, como los de Nuevo México o Arizona, que a Teotihuacan.",
      "Paquimé era un gran centro comercial: criaba guacamayas en corrales para vender sus plumas rojas, y comerciaba con conchas del Pacífico y turquesa. Era un puente entre Mesoamérica y el suroeste norteamericano. Su cerámica, con dibujos geométricos en rojo y negro sobre fondo claro, es la que verás aquí.",
      "Muchos pueblos del norte siguen vivos: los rarámuris o tarahumaras, famosos por correr distancias enormes en la sierra de Chihuahua; los yaquis y mayos en Sonora; los huicholes o wixárikas en Nayarit y Jalisco, con sus tablas de estambre de colores y su peregrinación al desierto de Wirikuta."],
    ["🧭 En qué se diferencian",
      "Comparado con el centro, aquí no hay grandes imperios ni dioses monumentales. En el occidente lo importante era la familia y los muertos, y su arte es cercano y cotidiano. En el norte, la mayoría de los pueblos eran nómadas, y la vida se adaptaba al desierto.",
      "Mientras recorres la sala, fíjate en lo humano de las figuras del occidente y en lo geométrico de la cerámica del norte: es otro México."],
    ["📍 Cerámica de Paquimé",
      "En la parte del norte, busca vasijas pintadas con dibujos geométricos en rojo y negro.",
      "Son de Paquimé, en Chihuahua, una ciudad de adobe que comerciaba con el suroeste de lo que hoy es Estados Unidos, y criaba guacamayas para sus plumas."],
    ["📍 Perritos de Colima",
      "En la parte de occidente, busca figuras de barro de perros gorditos y brillantes.",
      "Son xoloitzcuintles, los perros sin pelo que según la tradición guiaban a las almas al inframundo. Se ponían en las tumbas de tiro: un pozo vertical con cámaras al fondo para los muertos."],
    ["➡️ Siguiente sala",
      "Ahora cruza el patio, pasando junto al Paraguas, hasta el ala de enfrente. Empieza por la sala de Introducción, la más cercana a la entrada, el número ocho del mapa."] ] },

  { s:"17:28", e:"17:32", t:"🦣 Introducción + Poblamiento de América", n:"Poblamiento", d:"De paso: foto rápida y sigue a la sala de al lado.", $:"", pin:8, obj:1, g:[
    ["🧭 Cómo llegaron los humanos a América",
      "América fue el último gran continente al que llegaron los seres humanos. Nuestra especie salió de África hace unos sesenta mil años y se extendió por Asia y Europa, pero a América llegó mucho después.",
      "Durante la última glaciación, gran parte del agua del planeta estaba congelada en los casquetes de hielo, y el nivel del mar bajó más de cien metros. Entre Siberia y Alaska apareció un puente de tierra, una llanura enorme llamada Beringia. Por allí pasaron grupos de cazadores siguiendo a los animales.",
      "Durante mucho tiempo se pensó que el poblamiento había sido hace unos trece mil años, con una cultura llamada Clovis, conocida por sus puntas de lanza acanaladas. Hoy se sabe que es más antiguo: hay huellas humanas en Nuevo México de hace unos veintiún mil años, y probablemente parte de la gente llegó en barcas, bordeando la costa del Pacífico. En México, la cueva del Chiquihuite, en Zacatecas, ha dado herramientas que algunos investigadores fechan en más de veinticinco mil años, aunque es un tema muy discutido."],
    ["🧭 La vida de los cazadores",
      "Aquellos primeros pobladores eran grupos pequeños, de unas decenas de personas, nómadas. Cazaban grandes animales que hoy ya no existen en América: mamuts, mastodontes, caballos, camellos, bisontes antiguos y perezosos gigantes. También pescaban, recogían plantas, semillas y frutos.",
      "En el valle de México, en lugares como Santa Isabel Iztapan o Tocuila, se han encontrado restos de mamuts con herramientas de piedra al lado, y en Tultepec se hallaron trampas: fosas excavadas a propósito donde caían los mamuts. Es la primera evidencia de cacería organizada de mamuts de ese tipo.",
      "Cuando terminó la glaciación, hace unos diez mil años, el clima cambió, los grandes animales se extinguieron, probablemente por una mezcla del cambio climático y la caza, y la gente tuvo que adaptarse a animales más pequeños y a más plantas."],
    ["🧭 La gran revolución: el maíz",
      "Entonces empezó en México uno de los grandes inventos de la humanidad: la agricultura.",
      "El maíz no existe en estado silvestre. Viene del teocintle, una hierba que crece en el valle del río Balsas, en Guerrero y Michoacán, con unas espigas pequeñas de apenas unos granos duros. Durante miles de años, la gente fue seleccionando las mejores plantas, y poco a poco las mazorcas crecieron. Las mazorcas más antiguas que se conocen, de una cueva de Oaxaca, tienen unos seis mil años y son del tamaño de un dedo.",
      "En México se domesticaron también el frijol, la calabaza, el chile, el tomate, el aguacate, el cacao y el algodón. Cuando hoy comes tacos con salsa, guacamole y chocolate, estás comiendo inventos de esta época."],
    ["🧭 De nómadas a aldeas",
      "Con la agricultura, la gente dejó de moverse y se quedó a vivir junto a sus campos. Aparecieron las primeras aldeas, la cerámica para cocinar y guardar, el tejido, y con todo eso, las ideas religiosas ligadas a la tierra, la lluvia y la fertilidad.",
      "Esta sala es el principio de la historia que vas a recorrer: de aquí, a las aldeas del Preclásico, luego a Teotihuacan, a Tula y finalmente a los mexicas. Si la miras con eso en la cabeza, cada sala siguiente es un paso más."],
    ["📍 Cazadores de mamut",
      "Busca la escena de cazadores con un mamut.",
      "Hace más de quince mil años, en plena glaciación, grupos de cazadores cruzaron desde Asia por el estrecho de Bering, que entonces era tierra firme. Bajaron por el continente cazando mamuts, bisontes y caballos, que luego se extinguieron.",
      "Y aquí se domesticó el maíz, hace unos nueve mil años, a partir de una hierba silvestre llamada teocintle, con mazorcas del tamaño de un dedo."],
    ["➡️ Siguiente sala",
      "Sigue a la sala de al lado: Preclásico, el número nueve."] ] },

  { s:"17:32", e:"17:37", t:"🤸 Preclásico (Tlatilco)", n:"Preclásico", d:"Figurillas de Tlatilco y el Acróbata.", $:"", pin:9, obj:1, g:[
    ["🧭 Las primeras aldeas",
      "El Preclásico es la época en que nació la vida sedentaria en Mesoamérica, aproximadamente entre el dos mil quinientos antes de Cristo y el año doscientos después. Es la época de los primeros agricultores que se quedaron a vivir en un sitio.",
      "Imagina el valle de México entonces: no había ciudad, sino una gran cuenca rodeada de montañas y volcanes, con un sistema de lagos enormes, unos de agua dulce y otros salada. Alrededor, bosques y pastizales. La gente vivía en aldeas junto a las orillas, en casas de bajareque, es decir, de palos y barro con techo de paja.",
      "Cultivaban maíz, frijol, calabaza y chile. Pescaban, cazaban patos y otras aves acuáticas, recogían plantas del lago y criaban perros y guajolotes, los pavos. La milpa, el campo donde se siembran juntos maíz, frijol y calabaza, que se ayudan entre sí, nació en esta época y sigue existiendo."],
    ["🧭 Tlatilco y sus entierros",
      "Tlatilco era una de esas aldeas, al noroeste de la actual ciudad. Se descubrió en los años cuarenta, cuando unos ladrilleros que excavaban barro empezaron a encontrar entierros, cientos de ellos.",
      "En las tumbas aparecieron figurillas de barro, sobre todo de mujeres: pequeñas, con caderas anchas, cintura estrecha, peinados complicados y a veces pintura en el cuerpo. Se las llama mujeres bonitas. Se cree que tienen que ver con la fertilidad, de las mujeres y de la tierra. También hay figuras con dos cabezas o con dos caras en una, que quizá representan la dualidad, la idea de opuestos complementarios que será básica en toda Mesoamérica.",
      "Y aparecen músicos, jugadores de pelota, enanos, acróbatas y gente disfrazada con máscaras de animales: la primera imagen de rituales y fiestas."],
    ["🧭 La influencia olmeca",
      "En algunas tumbas de Tlatilco aparecen piezas con rasgos olmecas: vasijas con el rostro del hombre jaguar, motivos de garras y de cejas en llamas. Algunas personas de Tlatilco, enterradas con más riqueza, se asociaban a esos símbolos.",
      "Esto muestra que, hace unos tres mil años, el estilo olmeca de la costa del golfo ya se había extendido hasta aquí, por comercio o por imitación de las élites. Los jefes locales usaban esos símbolos para mostrar su poder, como hoy alguien llevaría una marca de lujo extranjera.",
      "Y es aquí, en las aldeas, donde aparecen las primeras diferencias sociales: unas tumbas con muchas ofrendas y otras casi sin nada."],
    ["🧭 Cuicuilco, la ciudad que enterró un volcán",
      "Al final del Preclásico surgieron los primeros centros grandes. El más importante del valle fue Cuicuilco, en el sur de la actual ciudad, cerca de la Ciudad Universitaria. Tiene una pirámide circular, distinta de todas las que vendrán después, y fue el gran centro del valle durante unos siglos.",
      "Pero hacia el siglo primero o segundo después de Cristo, el volcán Xitle entró en erupción y cubrió la zona con un manto de lava. Esa lava es el pedregal sobre el que hoy está la Ciudad Universitaria. Mucha gente abandonó el sur del valle y se marchó al norte, donde estaba creciendo otra ciudad: Teotihuacan, que es la siguiente sala."],
    ["🧭 Por qué importa",
      "El Preclásico es la base de todo lo que vas a ver: el maíz, las aldeas, los primeros ritos funerarios, los primeros jefes y la influencia olmeca. Las grandes civilizaciones que vienen después, Teotihuacan, los toltecas y los mexicas, se construyen sobre estas aldeas.",
      "Mientras recorres la sala, fíjate en lo pequeñas y personales que son las piezas: aquí todavía no hay monumentos para impresionar, sino objetos de la vida y la muerte de familias campesinas."],
    ["📍 Mujeres de Tlatilco",
      "Busca figurillas de barro pequeñas de mujeres con caderas anchas y peinados elaborados.",
      "Son de Tlatilco, un lugar al noroeste de la ciudad lleno de entierros de hace unos tres mil años. Se las llama mujeres bonitas y se asocian a la fertilidad."],
    ["📍 El Acróbata",
      "Busca una figura doblada hacia atrás, con los pies apoyados sobre la cabeza.",
      "Es el Acróbata, o contorsionista, de Tlatilco. Quizá un chamán en pleno ritual. Es una de las piezas más famosas del museo."],
    ["➡️ Siguiente sala",
      "Sigue a la sala de al lado: Teotihuacan, el número diez."] ] },

  { s:"17:37", e:"17:49", t:"🔺 Teotihuacan", n:"Teotihuacan", q:["tlaloc", "nahuatl"], d:"Fachada de Quetzalcóatl a tamaño real, Chalchiuhtlicue, máscaras y maqueta.", $:"", pin:10, obj:1, g:[
    ["🧭 La ciudad de los dioses",
      "Teotihuacan está a unos cincuenta kilómetros al noreste de aquí. Fue la primera gran ciudad del altiplano y una de las mayores del mundo en su tiempo. Floreció entre el siglo primero y el sexto después de Cristo, en la misma época que el Imperio romano tardío, y llegó a tener unos cien mil habitantes, quizá más.",
      "Lo primero que hay que saber es que no sabemos cómo se llamaban ellos ni cómo llamaban a su ciudad. Teotihuacan es un nombre náhuatl que le pusieron los mexicas unos setecientos años después de su caída, cuando la encontraron en ruinas. Significa el lugar donde se hacen los dioses, o donde los hombres se convierten en dioses.",
      "Los mexicas contaban que allí, en la oscuridad, los dioses se reunieron para crear el quinto sol. Dos dioses se arrojaron a una hoguera: uno se convirtió en el sol y el otro en la luna. Por eso las grandes pirámides se llaman del Sol y de la Luna, aunque esos nombres también son mexicas."],
    ["🧭 Una ciudad planificada",
      "Teotihuacan no creció de cualquier manera: se planificó como una cuadrícula, con un gran eje, la Calzada de los Muertos, de más de dos kilómetros, y todo orientado unos quince grados al este del norte, una orientación ligada a la posición del sol en ciertas fechas.",
      "La Pirámide del Sol es una de las mayores del mundo antiguo. Debajo tiene una cueva artificial, que probablemente era el lugar sagrado original de la ciudad, el sitio de origen. La Pirámide de la Luna cierra la calzada por el norte. Y en el centro está la Ciudadela, con el Templo de Quetzalcóatl, cuya fachada tienes en esta sala.",
      "Bajo ese templo se encontraron más de cien personas sacrificadas, muchas jóvenes guerreros con las manos atadas a la espalda, enterrados al construirlo. Y en 2003 se descubrió un túnel bajo el templo, sellado, lleno de ofrendas, con paredes cubiertas de polvo de pirita que brillaría como un cielo estrellado a la luz de las antorchas."],
    ["🧭 Cómo vivía la gente",
      "La mayoría de la gente vivía en conjuntos de apartamentos: grandes edificios de una planta, de piedra y estuco, con un patio central y habitaciones alrededor, donde vivían varias familias emparentadas o que compartían oficio. Había más de dos mil. Muchos tenían las paredes pintadas con murales de colores: dioses, jaguares, sacerdotes, flores y agua.",
      "La ciudad era cosmopolita. Había un barrio oaxaqueño, donde vivía gente zapoteca que seguía enterrando a sus muertos a su manera, y un barrio de comerciantes del golfo y de la zona maya. Gente de toda Mesoamérica vivía allí.",
      "Su riqueza venía sobre todo de la obsidiana, el vidrio volcánico negro o verde con el que se hacían cuchillos, navajas y puntas de flecha, la herramienta más importante de la época. Cerca había yacimientos de obsidiana verde de gran calidad, y se exportaba a cientos de kilómetros. También producían cerámica, como las vasijas trípode con tapadera, que verás en esta sala."],
    ["🧭 Gobierno y poder",
      "Aquí está el gran misterio. En las ciudades mayas los reyes se retratan a sí mismos, escriben su nombre y sus hazañas. En Teotihuacan no hay ni un solo retrato claro de un rey, ni un nombre, ni una tumba real indiscutible.",
      "Por eso muchos investigadores creen que la ciudad la gobernaba un consejo de linajes o un grupo de sacerdotes, y no un solo rey, o que el poder se presentaba de forma colectiva. Su arte es impersonal: figuras repetidas, máscaras sin rasgos individuales.",
      "Su influencia llegó muy lejos. En la ciudad maya de Tikal hay una inscripción que cuenta que en el año trescientos setenta y ocho llegó un personaje desde el oeste, probablemente de Teotihuacan, y al poco tiempo subió al trono un nuevo rey vinculado a él. Es decir, Teotihuacan intervino en la política maya a más de mil kilómetros."],
    ["🧭 La caída y su legado",
      "Hacia el año quinientos cincuenta, el centro de la ciudad ardió: templos y palacios fueron quemados y las estatuas destrozadas. No se sabe si fue un ataque de fuera o una revuelta interna contra la élite. Después la ciudad decayó, aunque siguió habitada en parte.",
      "Su legado fue enorme. Dioses como Tláloc, el de la lluvia, y la Serpiente Emplumada, Quetzalcóatl, ya estaban aquí, y pasaron después a toltecas y mexicas."],
    ["🧭 En qué se diferencian",
      "Comparado con los mayas, Teotihuacan era una sola gran capital, no muchas ciudades rivales, y no tenía una escritura desarrollada como la maya. Comparado con los mexicas, es mil años anterior, y su arte es más geométrico y menos sangriento. Los mexicas la veneraban como un lugar sagrado y se llevaban objetos teotihuacanos para enterrarlos en ofrendas del Templo Mayor."],
    ["📍 Fachada de Quetzalcóatl",
      "Busca una pared enorme de colores con cabezas de serpiente que salen de ella.",
      "Es la reproducción a tamaño real de una parte del Templo de Quetzalcóatl, con su color original: cabezas de serpiente emplumada alternadas con otras de aspecto geométrico, que se suelen identificar como la serpiente de fuego o el tocado de Tláloc.",
      "Bajo el templo original se encontraron más de cien sacrificados, muchos con las manos atadas a la espalda."],
    ["📍 Chalchiuhtlicue",
      "Busca una escultura de piedra enorme, cuadrada y rígida, de una mujer de pie.",
      "Es Chalchiuhtlicue, la diosa del agua, la de la falda de jade. Pesa más de veinte toneladas y estaba cerca de la Pirámide de la Luna."],
    ["📍 Máscaras de piedra",
      "Busca la vitrina de máscaras de piedra verde, con ojos incrustados.",
      "No eran para la cara de nadie vivo: no tienen agujeros para ver. Probablemente se ponían sobre bultos funerarios o estatuas. Los ojos son de concha y obsidiana."],
    ["📍 Maqueta de la ciudad",
      "Busca la maqueta de la ciudad.",
      "Verás la Calzada de los Muertos y las pirámides del Sol y la Luna. La del Sol es la tercera más grande del mundo.",
      "La ciudad acabó hacia el año 550 con un gran incendio del centro. No se sabe si fue una revuelta interna o un ataque."],
    ["➡️ Siguiente sala",
      "Sigue a la sala de al lado: Toltecas, el número once."] ] },

  { s:"17:49", e:"17:55", t:"🗿 Toltecas", n:"Tolteca", d:"Atlante de Tula, Chac Mool y la cabeza de coyote de nácar.", $:"", pin:11, obj:1, g:[
    ["🧭 Después de Teotihuacan",
      "Cuando Teotihuacan cayó, hacia el año seiscientos, el centro de México se quedó sin una gran potencia. Durante unos siglos convivieron ciudades más pequeñas que competían entre sí, como Xochicalco en Morelos o Cacaxtla en Tlaxcala. Es una época de muros, fortificaciones y ciudades en lo alto de cerros, es decir, una época de inseguridad y guerra.",
      "De ese mundo surgió Tula, en el actual estado de Hidalgo, a unos ochenta kilómetros al norte de aquí. Fue la capital de los toltecas, y vivió su apogeo entre los años novecientos y mil ciento cincuenta."],
    ["🧭 Una sociedad de guerreros",
      "Lo primero que llama la atención en Tula es lo militar. Los Atlantes de la Pirámide de Tlahuizcalpantecuhtli, el dios de la estrella de la mañana, son guerreros enormes con lanzadardos, cuchillos y un pectoral de mariposa. Los frisos muestran jaguares y coyotes en procesión y águilas comiendo corazones. Hay un muro de serpientes que devoran esqueletos y un tzompantli, una plataforma para exhibir cráneos.",
      "Es un arte más duro que el de Teotihuacan. Aquí aparecen con fuerza las órdenes militares de águilas y jaguares, los guerreros de élite que luego heredarán los mexicas.",
      "El Chac Mool, la figura recostada con un recipiente en el vientre, también es típico de esta época. Probablemente servía para recibir ofrendas, quizá corazones de sacrificados."],
    ["🧭 Quetzalcóatl, el rey que se fue",
      "La historia de Tula está envuelta en leyendas, porque la conocemos sobre todo por lo que contaron los mexicas siglos después.",
      "Según esas leyendas, Tula la gobernó un rey sacerdote llamado Ce Ácatl Topiltzin Quetzalcóatl. Era sabio, piadoso, enseñaba las artes y rechazaba los sacrificios humanos, y solo ofrecía flores, mariposas y serpientes. Su rival era Tezcatlipoca, el dios del espejo humeante, astuto y oscuro, que lo engañó: lo emborrachó con pulque y le hizo cometer faltas. Avergonzado, Quetzalcóatl abandonó Tula y marchó hacia el oriente, hacia el mar, prometiendo volver algún día.",
      "Esta leyenda se ha relacionado con la llegada de Cortés, que también vino del oriente. Durante mucho tiempo se dijo que Moctezuma creyó que Cortés era Quetzalcóatl que regresaba. Hoy muchos historiadores piensan que esa idea se construyó o se exageró después de la conquista."],
    ["🧭 Tula y Chichén Itzá",
      "Uno de los grandes enigmas de la arqueología mexicana es la relación entre Tula y Chichén Itzá, en Yucatán, a más de mil kilómetros. En las dos ciudades hay columnas con serpientes emplumadas, Chac Mool, Atlantes, frisos de águilas y jaguares, y salas con columnatas casi idénticas.",
      "Durante años se pensó que los toltecas conquistaron Chichén Itzá. Hoy se cree más bien que hubo intercambio entre las dos, y que compartían una misma moda religiosa y política en torno a la Serpiente Emplumada, que se extendió por Mesoamérica. Todavía se discute quién influyó a quién."],
    ["🧭 El final y el mito tolteca",
      "Tula cayó hacia el año mil ciento cincuenta: el centro fue incendiado y saqueado. Siglos después, los mexicas excavaban en Tula y se llevaban piezas para sus templos.",
      "Para los mexicas, los toltecas eran el modelo perfecto de civilización. Decían que habían inventado todas las artes, la escritura, el calendario y la medicina, y la palabra tolteca pasó a significar artista o sabio. Los reyes mexicas buscaban casarse con familias que decían descender de Tula para legitimarse."],
    ["🧭 En qué se diferencian",
      "Si Teotihuacan era una gran capital ordenada y algo misteriosa, Tula fue una ciudad de guerreros en una época más violenta. Y si los mexicas fueron un imperio, los toltecas fueron su referencia, una especie de edad de oro idealizada, como los romanos mirando a los griegos.",
      "Mientras recorres la sala, fíjate en el pecho de los Atlantes, en las águilas y en los Chac Mool: todo eso lo vas a reconocer luego en el arte mexica."],
    ["📍 Atlante de Tula",
      "Busca un guerrero gigante de piedra, de pie, rígido.",
      "Es uno de los Atlantes que sostenían el techo de un templo en Tula, la capital tolteca, en Hidalgo. Fíjate en el pectoral de mariposa, el lanzadardos y el tocado de plumas.",
      "Los toltecas dominaron el centro de México entre los siglos diez y doce. Los mexicas los admiraban tanto que tolteca llegó a significar artista o sabio."],
    ["📍 Chac Mool",
      "Busca una figura recostada boca arriba, con la cabeza girada y un recipiente sobre el vientre.",
      "Es un Chac Mool. En el recipiente se ponían ofrendas, quizá corazones. El nombre se lo inventó un explorador en el siglo diecinueve: no sabemos cómo lo llamaban ellos."],
    ["📍 Cabeza de coyote de nácar",
      "Busca una pieza pequeña: una cabeza de coyote cubierta de piezas brillantes de concha, con una cara humana dentro de la boca.",
      "Es un guerrero vestido de coyote, cubierto de nácar. Es muy fácil pasarla por alto."],
    ["➡️ Salida",
      "Con esto has visto toda la planta baja. Sal al patio y vuelve hacia la entrada."] ] },

  { s:"17:45", e:"18:00", t:"🧠 Resumen: todo lo que has visto", n:"Resumen", d:"Las culturas en orden y en qué se diferencian. Suena todo seguido.", $:"", g:[
    ["🧠 La idea clave",
      "Has visto más de tres mil años de historia en una tarde, así que vamos a ordenarlo todo en la cabeza con una sola idea: todo lo que has visto es una misma gran civilización, Mesoamérica, que fue creciendo por etapas y en lugares distintos. Todos compartían el maíz, las pirámides, el juego de pelota, el calendario de doscientos sesenta días y los sacrificios. Lo que cambia es la época, el lugar y la forma de organizarse.",
      "Piénsalo como Europa: griegos, romanos, medievales y españoles son distintos, pero cada uno hereda del anterior. Aquí pasa igual."],
    ["🧠 La línea del tiempo",
      "Primero, los cazadores. Hace más de quince mil años llegaron desde Asia, cazando mamuts. Es la sala del poblamiento.",
      "Después, el maíz. Hace unos nueve mil años se domesticó aquí, y con él aparecieron las aldeas. Es el Preclásico, con las figuritas de Tlatilco y el Acróbata.",
      "Al mismo tiempo, en la costa del golfo, los olmecas, hace unos tres mil años. Son los primeros con pirámides, jade, jaguares y cabezas colosales. Por eso se les llama la cultura madre: inventaron cosas que todos copiaron después.",
      "Luego, las grandes ciudades. En Oaxaca, los zapotecos levantan Monte Albán hacia el quinientos antes de Cristo. En el valle de México, Teotihuacan, del siglo uno al seis después de Cristo, la gran metrópoli de cien mil habitantes. Y en la selva, los mayas viven su época de oro entre el doscientos cincuenta y el novecientos.",
      "Después, una época de guerra: cae Teotihuacan, se hunden las ciudades mayas del sur, y surge Tula, la ciudad de los toltecas, con sus Atlantes guerreros, entre el novecientos y el mil ciento cincuenta.",
      "Y al final, los mexicas, los aztecas. Fundan Tenochtitlan en 1325 y en menos de doscientos años construyen un imperio. En 1521 llegan los españoles y todo cambia.",
      "Resumen en una frase: olmecas, los abuelos; Teotihuacan y mayas, la edad de oro; toltecas, los guerreros; mexicas, el imperio final."],
    ["🧠 Las diferencias, cultura por cultura",
      "Los olmecas: los más antiguos, en la costa húmeda del golfo. Pocas ciudades, de tierra y no de piedra, y arte macizo y serio, con caras de bebé y jaguar. Son el origen.",
      "Los zapotecos y mixtecos de Oaxaca: gente de montaña. No hicieron un imperio, sino ciudades y pequeños reinos muy centrados en la familia y en los antepasados. Los zapotecos, las urnas y Monte Albán. Los mixtecos, los mejores orfebres, con oro y turquesa, y libros pintados con genealogías de reyes.",
      "Teotihuacan: una sola ciudad gigantesca y planificada, con calles en cuadrícula y apartamentos para el pueblo. Su gran misterio es que no conocemos a ningún rey: quizá la gobernaba un consejo. Su arte es geométrico e impersonal. Los mexicas la encontraron en ruinas y creyeron que la habían hecho los dioses.",
      "Los mayas: muchas ciudades rivales en la selva, nunca un imperio, cada una con su rey sagrado. Son los grandes intelectuales: escritura completa, cero, astronomía. Su arte es el más humano y narrativo, con retratos de personas concretas. Y siguen vivos: millones hablan lenguas mayas hoy.",
      "Los toltecas: la ciudad de Tula, en una época violenta. Arte de guerreros, águilas, jaguares y calaveras. Los mexicas los admiraban como el modelo perfecto, igual que los romanos admiraban a los griegos.",
      "Los mexicas: los últimos y los más poderosos. Un imperio joven y militar, con capital en una isla del lago, que cobraba tributo a medio México. Su arte es monumental y está pensado para impresionar: la Piedra del Sol, la Coatlicue. Su religión giraba en torno a mantener vivo el sol con sacrificios.",
      "Y en los márgenes: en el occidente, culturas centradas en la familia y las tumbas, con figuritas de la vida diaria y perros; y en el norte, pueblos nómadas del desierto, que los mexicas llamaban chichimecas."],
    ["🧠 Lo que comparten todos",
      "Si te quedas con tres cosas en común, que sean estas.",
      "Uno: el maíz. Todos vivían de él, y muchos creían que los humanos estaban hechos de maíz.",
      "Dos: el tiempo. Todos usaban el mismo calendario ritual de doscientos sesenta días y creían que el mundo se destruye y se renueva en ciclos, como los cinco soles de la Piedra del Sol.",
      "Tres: el intercambio con los dioses. La lluvia, el sol y las cosechas había que pagarlos con ofrendas, con sangre y, a veces, con vidas humanas. Tláloc para los mexicas, Chaac para los mayas y Cocijo para los zapotecos son en el fondo el mismo dios de la lluvia con distinto nombre."],
    ["🧠 Para recordarlo",
      "Los olmecas empezaron. Teotihuacan y los mayas brillaron. Los toltecas guerrearon. Los mexicas dominaron. Y Oaxaca, el occidente y el norte fueron mundos propios alrededor.",
      "Y nada de esto desapareció del todo: los pueblos de la planta de arriba son sus descendientes, y en México se siguen hablando más de sesenta lenguas indígenas."] ] },

  { s:"17:55", e:"18:00", t:"🚪 Salida", d:"Cruza el patio hasta el vestíbulo y sal por la entrada principal. Recoge lo del guardarropa.", $:"", pin:12 }
];

var VIEJO = [
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
var EXTRA = VIEJO.concat(MUSEO, TEO, [
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
]);

/* ---------------------------------------------------------------------------
   ¿Quién es? Personajes y palabras que salen en las guías. Cada parada lista
   los suyos en q; se escuchan en el mismo reproductor y al acabar vuelve a la
   guía donde estaba (en pausa).
   --------------------------------------------------------------------------- */
var Q = {
  carlota:["Carlota de México",
    "Carlota era princesa de Bélgica, hija del rey Leopoldo primero. Nació en 1840 y en 1857 se casó con Maximiliano de Habsburgo.",
    "En 1864 llegó a México con él como emperatriz. Era inteligente y ambiciosa, y cuando Maximiliano viajaba, ella gobernaba en su nombre.",
    "En 1866, con el imperio hundiéndose, viajó a Europa para pedir ayuda a Napoleón tercero y al Papa. Nadie la ayudó, y en Roma empezó a mostrar signos de una grave crisis mental: creía que querían envenenarla.",
    "No volvió a México. Vivió recluida en castillos de Bélgica hasta su muerte, en 1927, sesenta años después del fusilamiento de su marido."],
  ninos:["Los Niños Héroes",
    "Son seis cadetes del Colegio Militar que murieron defendiendo el Castillo de Chapultepec el 13 de septiembre de 1847, durante la invasión estadounidense: Juan de la Barrera, Juan Escutia, Francisco Márquez, Agustín Melgar, Fernando Montes de Oca y Vicente Suárez.",
    "Tenían entre trece y veinte años. La leyenda más famosa dice que Juan Escutia se envolvió en la bandera y saltó desde lo alto del cerro para que no cayera en manos enemigas.",
    "Cada 13 de septiembre se les rinde homenaje en el monumento de las seis columnas, a la entrada del bosque, y sus nombres aparecen en calles y estaciones de metro de todo el país."],
  cardenas:["Lázaro Cárdenas",
    "Lázaro Cárdenas fue presidente de México de 1934 a 1940, y es uno de los más queridos por los mexicanos.",
    "Hizo un gran reparto de tierras a los campesinos y, en 1938, expropió el petróleo a las compañías extranjeras: así nació Pemex. También acogió a miles de exiliados de la guerra civil española.",
    "Fue el primer presidente que vivió en Los Pinos en vez de en el Castillo de Chapultepec, al que convirtió en museo."],
  batres:["Leopoldo Batres",
    "Leopoldo Batres, nacido en 1852, fue el arqueólogo oficial del gobierno de Porfirio Díaz, con el cargo de inspector de monumentos. Era militar de formación y había estudiado algo de antropología en París.",
    "Excavó y reconstruyó a toda prisa la Pirámide del Sol entre 1905 y 1910, para el centenario de la Independencia. También trabajó en Monte Albán, Mitla y Xochicalco, y dirigió las primeras excavaciones en la zona del Templo Mayor.",
    "Hoy se le critica mucho: destruyó la capa exterior de la pirámide, le añadió un cuerpo que no existía y apenas dejó registros de lo que encontraba. Pero también fue quien puso Teotihuacan en el mapa y quien consiguió que el Estado protegiera el sitio. Cayó en desgracia con la Revolución y murió en 1926."],
  talud:["Talud-tablero",
    "Es el sistema de construcción típico de Teotihuacan. Cada cuerpo de un edificio tiene dos partes: abajo, un muro inclinado, el talud; y encima, un panel vertical rectangular rodeado por un marco que sobresale, el tablero.",
    "El tablero se apoya en losas de piedra que vuelan sobre el talud, y servía de marco para pinturas o esculturas. Repetido en varios pisos, da ese aspecto de franjas horizontales que ves en todas las plataformas de la Calzada.",
    "Se convirtió en la marca de la ciudad. Cuando aparece en Tikal, en Kaminaljuyú o en Monte Albán, indica contacto con Teotihuacan, igual que una columna griega fuera de Grecia."],
  obsidiana:["Obsidiana",
    "La obsidiana es un vidrio natural que se forma cuando la lava se enfría muy rápido. Al golpearla se rompe en lascas con un filo más fino que el de un bisturí de acero.",
    "En un mundo sin metales para herramientas, era el material más valioso para cortar: de ella se hacían navajas, cuchillos, puntas de lanza y de flecha, y también espejos y joyas.",
    "Teotihuacan tenía cerca dos fuentes: la obsidiana gris de Otumba, a pocos kilómetros, y la verde dorada de la Sierra de las Navajas, cerca de Pachuca, que es única en Mesoamérica. Controlar esas minas y los talleres fue una de las bases de su riqueza."],
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
  ".vjL1{background:#e4007c}.vjL2{background:#2d82dc}.vjL3{background:#5c9c29}.vjL6{background:#e4463e}.vjL7{background:#f28c1e}.vjL8{background:#0a8a4a}.vjL12{background:#b39b5d}",
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
'<svg viewBox="0 0 600 250" role="img" aria-label="Plano esquemático del poniente y el centro de Ciudad de México con las paradas numeradas; el norte queda arriba">' +
'<path class="park" d="M20,110 Q40,95 120,100 L215,118 Q225,160 190,190 L60,200 Q15,190 20,110 Z"/><text x="110" y="185" class="area">Bosque de Chapultepec</text>' +
'<path class="walk" d="M75,150 L5,215"/><text x="10" y="240" class="stl">→ Santa Fe (Cablebús)</text>' +
'<path class="st" d="M200,120 L330,82 L470,62 L520,50" fill="none"/><text x="300" y="70" class="stl">Paseo de la Reforma</text>' +
'<rect x="45" y="20" width="70" height="30" rx="4" class="plaza"/><text x="80" y="65" class="stl" text-anchor="middle">Polanco</text>' +
'<rect x="255" y="160" width="80" height="45" rx="20" class="park"/><text x="295" y="222" class="stl" text-anchor="middle">Condesa</text>' +
'<rect x="355" y="150" width="90" height="55" rx="4" class="plaza"/><text x="400" y="222" class="stl" text-anchor="middle">Roma</text>' +
'<rect x="480" y="72" width="55" height="26" rx="3" class="park"/><text x="508" y="115" class="stl" text-anchor="middle">Alameda</text>' +
'<g class="met"><rect x="88" y="4" width="22" height="16" rx="3"/><text x="99" y="16">M</text></g><text x="114" y="16" class="stl">San Joaquín</text>' +
'<g class="met"><rect x="36" y="130" width="22" height="16" rx="3"/><text x="47" y="142">M</text></g><text x="20" y="126" class="stl">Constituyentes</text>' +
'<g class="met"><rect x="340" y="128" width="22" height="16" rx="3"/><text x="351" y="140">M</text></g><text x="366" y="140" class="stl">Insurgentes</text>' +
'<g class="met"><rect x="548" y="96" width="22" height="16" rx="3"/><text x="559" y="108">M</text></g><text x="545" y="124" class="stl">Bellas Artes</text>' +
'<text x="590" y="245" class="stl" text-anchor="end">↑ Norte</text>' +
'{PINS}</svg>';
var XY = { 1:[80,35], 2:[75,150], 3:[200,130], 4:[330,90], 5:[295,182], 6:[400,177], 7:[555,80], 8:[565,45] };

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
var VELS = [0.75, 0.85, 1, 1.15, 1.3, 1.5, 1.75, 2];
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
    if (R.prev && typeof R.i !== "string" && /^📍/.test(src(R.i).g[R.s][0])) { fin(); return; }   // objeto suelto: vuelve a la cultura
    if (R.s + 1 < src(R.i).g.length) {
      var cult = /^🧭/.test(src(R.i).g[R.s][0]) && /^🧭/.test(src(R.i).g[R.s + 1][0]);
      R.s++; R.k = 0; R.fr = frases(R.i, R.s);
      if (src(R.i).obj && !cult) { R.va = false; pintaRep(); aviso("Busca: " + src(R.i).g[R.s][0].replace(/^\S+\s/, "") + " · dale a ▶ cuando lo tengas delante"); return; }
      pintaRep(); di(); }
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
  pintaRep();                                       // la voz del móvil no cambia en marcha: la nueva velocidad entra en la frase siguiente, sin repetir
  if (R.va) aviso("Velocidad ×" + String(R.vel).replace(".", ",") + " desde la siguiente frase");
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
   v2.86 · Guía del martes 10 (Coyoacán). Cada día lleva lo suyo: si hoy (hora
   de CDMX) es el 10, la pantalla Viaje y el aviso de Hoy enseñan Coyoacán;
   el resto de días, la guía de arriba (miércoles 11). window.viajeDia fuerza
   un día (para pruebas).
   --------------------------------------------------------------------------- */
var TIT = "Miércoles 11 · Chapultepec y Reforma", SUB = "Cablebús, Castillo, Reforma, Roma-Condesa y Bellas Artes";
var ANDA = function (d) { return "https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=" + encodeURIComponent(d); };
var MARTES = {
  dia:"2026-11-10", tit:"Martes 10 · Coyoacán", sub:"Viveros, Francisco Sosa, el centro, el mercado, la Casa Azul y Walmart",
  txt:{
    mapa:"El norte queda arriba. Mapa esquemático: la línea verde es la Línea 3 del metro por Av. Universidad. Cada parada tiene «Mapa» con la ruta andando desde donde estés.",
    pie:"Los Viveros cierran a las 18:00 y no dejan entrar comida. El Walmart abre hasta las 22:00. Todo el día en metro (Línea 3) y andando.",
    otro:"Plan del martes 10 de noviembre."
  },
  P:[
    { s:"15:00", e:"15:10", t:"🚇 Universidad → Viveros/Derechos Humanos", d:"Línea 3 dirección Indios Verdes, 3 paradas: Copilco, Miguel Ángel de Quevedo y Viveros/Derechos Humanos. La entrada del parque NO está pegada al metro: sal a Av. Universidad, anda hacia el sur (el parque a tu izquierda) unos 300 m hasta Av. Progreso y gira a la izquierda: Puerta 1.", l:["L3"], $:"$5", map:ANDA("Gate 1 Viveros, Av. Progreso 3, Coyoacán"), mapTxt:"Ir a la Puerta 1", mov:1 },

    { s:"15:10", e:"15:50", t:"🌳 Viveros de Coyoacán", n:"Viveros", d:"Entra por la Puerta 1 (Av. Progreso), cruza el parque hacia el este por el camino ancho y sal por la Puerta 4, hacia Francisco Sosa. Gratis. Cierra a las 18:00.", $:"$0", map:ANDA("Gate 1 Viveros, Av. Progreso 3, Coyoacán"), mapTxt:"Ir a la Puerta 1", pin:1, g:[
      ["Lo esencial",
        "Estás en los Viveros de Coyoacán, uno de los pulmones verdes del sur de la ciudad. Son unas treinta y nueve hectáreas de árboles, con un circuito de tierra de unos tres kilómetros por donde corre medio barrio.",
        "No es un parque cualquiera: nació como vivero, es decir, como una fábrica de árboles. Aquí se criaban los arbolitos con los que se reforestaba la Ciudad de México y sus alrededores.",
        "Tienes unos cuarenta minutos. El plan es sencillo: entra por la Puerta 1, cruza hacia el este por el camino principal, mira las ardillas y los ahuehuetes, y sal por la Puerta 4, que te deja cerca de la avenida Francisco Sosa."],
      ["El apóstol del árbol",
        "El parque se lo debe la ciudad a Miguel Ángel de Quevedo, un ingeniero mexicano nacido en Guadalajara en 1862. Había estudiado en Francia y volvió obsesionado con una idea: que sin bosques no hay agua, y que el valle de México se estaba quedando pelado.",
        "A principios del siglo veinte cedió terrenos suyos aquí, en Coyoacán, para montar un vivero. De aquí salieron millones de árboles para plantar en avenidas, parques y laderas. Por eso le llamaban el apóstol del árbol.",
        "La gran avenida que cruzaste en metro, Miguel Ángel de Quevedo, lleva su nombre. Y en 1938, durante el gobierno de Lázaro Cárdenas, los Viveros se declararon parque nacional."],
      ["Qué mirar",
        "Las ardillas: son las reinas del parque y se acercan mucho. Verás gente con cacahuates, aunque dentro se pide no darles de comer.",
        "Los árboles en hileras: fíjate en que muchas zonas están plantadas en filas rectas, como un cultivo. Es la huella del vivero original.",
        "Y la gente corriendo: es uno de los sitios favoritos de los corredores de la ciudad. Piensa que estás a más de dos mil doscientos metros: aquí entrenar cuesta más que en Madrid."],
      ["Consejos",
        "Sal por la Puerta 4, en el lado este. Desde ahí, baja hacia el sur hasta la avenida Francisco Sosa y gira a la izquierda, hacia el este. Si te lías, toca «Mapa» en la siguiente parada.",
        "Hay baños en las entradas. No se puede entrar con comida, y a veces los vigilantes ponen pegas con las cámaras grandes."] ] },

    { s:"15:50", e:"16:15", t:"🚶 Av. Francisco Sosa y Capilla de Santa Catarina", n:"Francisco Sosa", d:"Andando hacia el este por Francisco Sosa: casas coloniales, la plaza y la capilla amarilla de Santa Catarina. Solo paseo y fotos.", $:"$0", map:ANDA("Capilla de Santa Catarina, Coyoacán"), pin:2, g:[
      ["Lo esencial",
        "Estás en la avenida Francisco Sosa, la calle más bonita de Coyoacán. Es una calle empedrada, de casi dos kilómetros, que une los Viveros con el centro del barrio, y se suele decir que es de las más antiguas del continente: el camino ya existía en tiempos de la conquista.",
        "Lleva el nombre de Francisco Sosa, un escritor y periodista del siglo diecinueve, nacido en Yucatán, que vivió en Coyoacán.",
        "A los lados verás casonas de los siglos dieciocho y diecinueve, con portones grandes, patios y buganvillas. Muchas eran casas de campo de familias ricas, cuando Coyoacán todavía era un pueblo a las afueras de la ciudad."],
      ["La plaza de Santa Catarina",
        "A mitad de camino llegas a una placita con una capilla pintada de amarillo y blanco: la capilla de Santa Catarina. Su origen se remonta al siglo dieciséis, aunque lo que ves es sobre todo de reconstrucciones posteriores.",
        "La plaza es de las más tranquilas del barrio: suele haber gente leyendo en los bancos y, algunos fines de semana, música o cuentacuentos. Enfrente está la Casa de Cultura Jesús Reyes Heroles, una casona con un jardín precioso.",
        "Haz aquí la foto de la capilla con la plaza delante, y sigue recto hacia el este."],
      ["Qué buscar por el camino",
        "Más adelante, a la derecha, la Casa de Alvarado, una casona roja que la tradición relaciona con Pedro de Alvarado, uno de los capitanes de Hernán Cortés, aunque el edificio es muy posterior. Hoy es la Fototeca Nacional.",
        "Fíjate también en los nombres de las calles y en los portones: muchos llevan placas con la historia de la casa. Y al final de la calle verás el arco de entrada al Jardín Centenario: ese es tu siguiente punto."] ] },

    { s:"16:15", e:"16:40", t:"⛲ Jardín Centenario, Plaza Hidalgo y San Juan Bautista", n:"Jardin Centenario", q:["cortes", "mexicas", "nahuatl"], d:"El corazón de Coyoacán: la fuente de los coyotes, el kiosco, la parroquia de San Juan Bautista y la Casa de Cortés (la alcaldía).", $:"$0", map:ANDA("Jardín Centenario, Coyoacán"), pin:3, g:[
      ["Lo esencial",
        "Estás en el centro de Coyoacán. Son dos plazas pegadas: el Jardín Centenario, con la fuente de los coyotes, y la Plaza Hidalgo, con el kiosco. Entre las dos, la parroquia de San Juan Bautista.",
        "Coyoacán es una palabra náhuatl que se suele traducir como lugar de coyotes. Por eso la fuente de los dos coyotes es el símbolo del barrio y la foto que todo el mundo se hace.",
        "Tienes veinticinco minutos: foto de la fuente, entra un momento en la parroquia, cruza a la Plaza Hidalgo por el kiosco y mira la Casa de Cortés."],
      ["Coyoacán y Hernán Cortés",
        "Antes de la conquista, Coyoacán era un pueblo de la orilla del lago, aliado y a la vez sometido a Tenochtitlan.",
        "En 1521, después de tomar Tenochtitlan, Hernán Cortés se instaló aquí, en Coyoacán, mientras la gran ciudad mexica seguía en ruinas. Durante un tiempo, Coyoacán fue el centro desde donde se gobernó la Nueva España. Aquí se reunió uno de los primeros ayuntamientos.",
        "La tradición también cuenta que aquí Cortés hizo torturar a Cuauhtémoc, el último gobernante mexica, quemándole los pies para que dijera dónde estaba el oro, y que aquí vivió con Malinche, su intérprete. Son historias que mezclan hechos y leyenda, pero el barrio las tiene muy presentes."],
      ["La parroquia de San Juan Bautista",
        "La parroquia la levantaron los frailes dominicos en el siglo dieciséis, poco después de la conquista. Por fuera es sobria; por dentro, fíjate en los techos pintados y en los retablos dorados.",
        "Los arcos que ves en el Jardín Centenario, junto a la fuente, eran la entrada del antiguo atrio del convento. Es decir, toda esta plaza era el patio de la iglesia."],
      ["La Plaza Hidalgo y la Casa de Cortés",
        "En la Plaza Hidalgo está el kiosco, coronado con un águila, y alrededor siempre hay ambiente: músicos, globos, puestos de dulces y de esquites.",
        "En el lado norte, el edificio rojizo con arcos es la Casa de Cortés. Hoy es la sede de la alcaldía de Coyoacán. El nombre viene de la tradición, porque el edificio actual es del siglo dieciocho, pero se levantó donde, según se dice, estuvieron las casas de Cortés.",
        "Si la puerta está abierta, asómate: dentro hay murales sobre la historia del barrio."],
      ["Consejos",
        "Para el mercado, sal de la Plaza Hidalgo hacia el norte por la calle Ignacio Allende. Son unas cuatro calles."] ] },

    { s:"16:40", e:"17:15", t:"🌮 Mercado de Coyoacán", n:"Mercado", d:"Calle Ignacio Allende, 4 calles al norte. Famoso por las tostadas (pata, tinga, pollo, ceviche). Solo efectivo en muchos puestos.", $:"$60–120 💵", map:ANDA("Mercado de Coyoacán"), pin:4, g:[
      ["Lo esencial",
        "Estás en el mercado de Coyoacán, el mercado de barrio de toda la vida. Fruta, flores, carne, piñatas, artesanía y, sobre todo, comida.",
        "Es famoso por las tostadas: una tortilla frita y crujiente con frijoles encima y lo que elijas: tinga de pollo, pata, ceviche, camarón o pulpo. Se pide una o dos, se le pone salsa y crema, y se come de pie o en la barra.",
        "Como ya has comido, aquí el plan es picar algo, pasear por los pasillos y hacer fotos de los puestos de fruta y de las piñatas."],
      ["Qué probar",
        "Una tostada de tinga o de pata, en los puestos de tostadas del interior, que son los más conocidos.",
        "Un agua fresca: de horchata, de jamaica o de tamarindo. O un elote o unos esquites en la calle.",
        "Y si te queda hueco, algo dulce: una nieve o un churro en el centro de Coyoacán, que está lleno de puestos."],
      ["Consejos",
        "En muchos puestos solo aceptan efectivo. Mira el precio antes de pedir.",
        "Para la Casa Azul, sal por el lado norte y sigue por Ignacio Allende hasta la calle Londres. Está a unas tres calles."] ] },

    { s:"17:15", e:"17:35", t:"💙 Casa Azul (Museo Frida Kahlo), por fuera", n:"Casa Azul", q:["rivera"], d:"Londres 247, esquina con Allende. Solo la foto de la fachada azul; no entras.", $:"$0", map:ANDA("Museo Frida Kahlo, Londres 247, Coyoacán"), pin:5, g:[
      ["Lo esencial",
        "Estás frente a la Casa Azul, la casa de Frida Kahlo. Aquí nació en 1907, aquí vivió buena parte de su vida y aquí murió en 1954.",
        "Hoy es el Museo Frida Kahlo, uno de los más visitados de México, con su ropa, sus pinceles, su cama con el espejo en el techo y su silla de ruedas. Hoy no entras: la fachada azul cobalto es la foto.",
        "Ese azul tan fuerte no es casual: Frida y Diego Rivera la pintaron así, con colores de la arquitectura popular mexicana, como una declaración de identidad."],
      ["Frida y Diego",
        "Frida tuvo un accidente de autobús con dieciocho años que le destrozó la columna y la pelvis. Empezó a pintar en la cama, con un espejo encima, y por eso tantos de sus cuadros son autorretratos.",
        "Se casó con Diego Rivera, el muralista, veintiún años mayor que ella. Se divorciaron y se volvieron a casar. Ella decía que en su vida había tenido dos accidentes: el autobús y Diego.",
        "Cuando Frida murió, Diego donó la casa para que se convirtiera en museo, y se abrió en 1958."],
      ["Trotsky, el vecino",
        "En esta casa vivió también, entre 1937 y 1939, León Trotsky, el revolucionario ruso exiliado por Stalin. Diego Rivera consiguió que México le diera asilo y le prestó la casa.",
        "Después Trotsky se mudó a otra casa a pocas calles, en la avenida Río Churubusco. Allí, en 1940, lo asesinó con un piolet un agente de Stalin. Esa casa también es museo hoy.",
        "Es curioso pensar que en unas pocas manzanas de este barrio tranquilo se cruzaron Frida, Diego, Trotsky y media historia del siglo veinte."],
      ["Consejos",
        "La mejor foto es desde la acera de enfrente, en la esquina de Londres con Allende, para que salga la fachada entera.",
        "Desde aquí, al metro Coyoacán son unos quince minutos andando hacia el noroeste. Toca «Mapa» en la siguiente parada."] ] },

    { s:"17:35", e:"17:55", t:"🚶 Casa Azul → Metro Coyoacán", d:"Unos 15 min andando hacia el noroeste hasta Av. Universidad.", $:"$0", map:ANDA("Metro Coyoacán, Ciudad de México"), mapTxt:"Ir al metro", mov:1 },
    { s:"17:55", e:"18:05", t:"🚇 Coyoacán → Zapata", d:"Línea 3 dirección Indios Verdes, 1 parada. Sal por el lado de Av. Universidad y baja unos 200 m hacia el sur.", l:["L3"], $:"$5", map:ANDA("Walmart Av. Universidad 936, Santa Cruz Atoyac, Ciudad de México"), mapTxt:"Ir al Walmart", mov:1 },

    { s:"18:05", e:"18:50", t:"🛒 Walmart Av. Universidad", n:"Walmart", d:"Av. Universidad 936 (Santa Cruz Atoyac), a 200 m de Zapata. Supercenter grande: comida, ropa, electrónica. Abre hasta las 22:00.", $:"💳", map:ANDA("Walmart Av. Universidad 936, Santa Cruz Atoyac, Ciudad de México"), pin:6 },

    { s:"18:50", e:"19:05", t:"🚶 Walmart → casa", d:"Andando por Av. Universidad hasta casa de Sergio.", $:"$0", map:ANDA("Av. Universidad 687, Del Valle Sur, Ciudad de México"), mapTxt:"Ruta a casa", mov:1 }
  ],
  MAPA:
'<svg viewBox="0 0 600 250" role="img" aria-label="Plano esquemático de Coyoacán con la Línea 3 del metro y las paradas numeradas; el norte queda arriba">' +
'<rect x="75" y="147" width="210" height="47" rx="8" class="park"/><text x="180" y="142" class="area" text-anchor="middle">Viveros</text>' +
'<path class="st" d="M60,212 L262,222 L441,209" fill="none"/><text x="160" y="240" class="stl">Av. Francisco Sosa</text>' +
'<path class="st" d="M67,168 L203,100 L383,16" fill="none"/><text x="250" y="60" class="stl">Av. Universidad · Línea 3</text>' +
'<path class="walk" d="M285,180 L262,222 M441,209 L470,183 L448,152 L203,100"/>' +
'<rect x="420" y="190" width="45" height="30" rx="4" class="plaza"/><text x="520" y="225" class="stl" text-anchor="middle">Centro</text>' +
'<g class="met"><rect x="40" y="160" width="22" height="16" rx="3"/><text x="51" y="172">M</text></g><text x="8" y="195" class="stl">Viveros</text>' +
'<g class="met"><rect x="176" y="92" width="22" height="16" rx="3"/><text x="187" y="104">M</text></g><text x="120" y="88" class="stl">Coyoacán</text>' +
'<g class="met"><rect x="356" y="8" width="22" height="16" rx="3"/><text x="367" y="20">M</text></g><text x="300" y="20" class="stl">Zapata</text>' +
'<text x="590" y="245" class="stl" text-anchor="end">↑ Norte</text>' +
'{PINS}</svg>',
  XY:{ 1:[180,172], 2:[262,222], 3:[441,206], 4:[480,180], 5:[448,150], 6:[405,34] }
};
var DIAS = {};
DIAS[DIA] = { dia:DIA, tit:TIT, sub:SUB, txt:TXT, P:P, MAPA:MAPA, XY:XY };
DIAS[MARTES.dia] = MARTES;
/* v2.86.2 · Las guías de los días anteriores del viaje, cada una en su día y con su plano. */
DIAS["2026-11-04"] = { dia:"2026-11-04", tit:"Miércoles 4 · CDMX", sub:"Centro Histórico + Guadalupe", P:VIEJO,
  txt:{ mapa:"El norte queda arriba. Toca un número para abrirlo en Google Maps. Fuera del mapa: 1 Soriana (al sur) y 8 Basílica (al norte).", pie:"Guía del miércoles 4: Zócalo, Catedral, murales de la SEP, Madero, Bellas Artes, Revolución, Basílica y Torre Latinoamericana.", otro:"Plan del miércoles 4 de noviembre." },
  XY:{ 10:[498,100], 2:[550,187], 3:[512,152], 4:[540,140], 5:[368,172], 6:[334,133], 7:[38,111], 9:[340,190] },
  MAPA:"<svg viewBox=\"0 0 600 250\" role=\"img\" aria-label=\"Mapa del Centro Histórico con las paradas numeradas\"><rect x=\"207\" y=\"102\" width=\"109\" height=\"35\" rx=\"4\" class=\"park\"/><text x=\"261\" y=\"124\" class=\"area\">Alameda</text><rect x=\"470\" y=\"168\" width=\"70\" height=\"52\" rx=\"3\" class=\"plaza\"/><text x=\"505\" y=\"232\" class=\"area\">Zócalo</text><rect x=\"20\" y=\"96\" width=\"40\" height=\"32\" rx=\"3\" class=\"plaza\"/><line x1=\"338\" y1=\"20\" x2=\"338\" y2=\"240\" class=\"st\"/><text x=\"332\" y=\"34\" class=\"stl\" text-anchor=\"end\">Eje Central</text><line x1=\"350\" y1=\"158\" x2=\"470\" y2=\"170\" class=\"st\"/><text x=\"410\" y=\"152\" class=\"stl\" text-anchor=\"middle\">Madero (peatonal)</text><line x1=\"150\" y1=\"137\" x2=\"330\" y2=\"137\" class=\"st\"/><text x=\"180\" y=\"152\" class=\"stl\">Av. Juárez</text><path d=\"M38 111 L150 137\" class=\"walk\"/><path d=\"M38 111 L47 45\" class=\"walk\"/><path d=\"M356 156 L334 133\" class=\"walk\"/><g class=\"met\"><rect x=\"38\" y=\"36\" width=\"18\" height=\"18\" rx=\"4\"/><text x=\"47\" y=\"49\">M</text></g><text x=\"62\" y=\"49\" class=\"lbl\">Metro Revolución → Basílica</text><g class=\"met\"><rect x=\"312\" y=\"98\" width=\"18\" height=\"18\" rx=\"4\"/><text x=\"321\" y=\"111\">M</text></g><text x=\"302\" y=\"92\" class=\"lbl\" text-anchor=\"end\">Metro Bellas Artes ← vuelta</text><g class=\"met\"><rect x=\"486\" y=\"200\" width=\"18\" height=\"18\" rx=\"4\"/><text x=\"495\" y=\"213\">M</text></g>{PINS}<text x=\"492\" y=\"86\" class=\"lbl\" text-anchor=\"end\">SEP</text><text x=\"560\" y=\"210\" class=\"lbl\" text-anchor=\"end\">Palacio N.</text><text x=\"520\" y=\"128\" class=\"lbl\">Templo M.</text><text x=\"470\" y=\"146\" class=\"lbl\" text-anchor=\"end\">Catedral</text><text x=\"382\" y=\"190\" class=\"lbl\">Azulejos</text><text x=\"352\" y=\"210\" class=\"lbl\">Torre Latino</text><line x1=\"340\" y1=\"179\" x2=\"347\" y2=\"163\" stroke=\"var(--mu)\"/><text x=\"70\" y=\"116\" class=\"lbl\">Revolución</text><text x=\"585\" y=\"30\" class=\"lbl\" text-anchor=\"end\">N ↑</text><line x1=\"20\" y1=\"232\" x2=\"125\" y2=\"232\" stroke=\"var(--fg)\" stroke-width=\"2\"/><text x=\"20\" y=\"226\" class=\"stl\">500 m</text></svg>" };
DIAS["2026-11-07"] = { dia:"2026-11-07", tit:"Sábado 7 · CDMX", sub:"Museo Nacional de Antropología", P:MUSEO,
  txt:{ mapa:"Plano de la planta baja del museo. Empieza por la Piedra del Sol (Sala Mexica) y sigue los números.", pie:"El museo cierra a las 18:00. Guardarropa en la entrada.", otro:"Plan del sábado 7 de noviembre." },
  XY:{ 1:[165,118], 2:[532,90], 3:[532,150], 4:[427,40], 5:[342,40], 6:[257,40], 7:[172,40], 8:[172,198], 9:[257,198], 10:[342,198], 11:[427,198], 12:[40,118] },
  MAPA:"<svg viewBox=\"0 0 600 250\" role=\"img\" aria-label=\"Plano de la planta baja del museo con las salas numeradas en orden de visita\"><rect x=\"10\" y=\"80\" width=\"110\" height=\"90\" rx=\"4\" class=\"plaza\"/><text x=\"65\" y=\"165\" class=\"stl\" text-anchor=\"middle\">Entrada</text><rect x=\"130\" y=\"80\" width=\"340\" height=\"90\" rx=\"4\" class=\"park\"/><text x=\"300\" y=\"150\" class=\"area\">Patio</text><rect x=\"475\" y=\"15\" width=\"115\" height=\"220\" rx=\"4\" class=\"plaza\"/><text x=\"532\" y=\"225\" class=\"stl\" text-anchor=\"middle\">MEXICA</text><rect x=\"385\" y=\"15\" width=\"85\" height=\"60\" rx=\"4\" class=\"plaza\"/><text x=\"427\" y=\"68\" class=\"stl\" text-anchor=\"middle\">Oaxaca</text><rect x=\"300\" y=\"15\" width=\"85\" height=\"60\" rx=\"4\" class=\"plaza\"/><text x=\"342\" y=\"68\" class=\"stl\" text-anchor=\"middle\">Golfo</text><rect x=\"215\" y=\"15\" width=\"85\" height=\"60\" rx=\"4\" class=\"plaza\"/><text x=\"257\" y=\"68\" class=\"stl\" text-anchor=\"middle\">Maya</text><rect x=\"130\" y=\"15\" width=\"85\" height=\"60\" rx=\"4\" class=\"plaza\"/><text x=\"172\" y=\"68\" class=\"stl\" text-anchor=\"middle\">Norte · Occ.</text><rect x=\"130\" y=\"175\" width=\"85\" height=\"60\" rx=\"4\" class=\"plaza\"/><text x=\"172\" y=\"228\" class=\"stl\" text-anchor=\"middle\">Introducción</text><rect x=\"215\" y=\"175\" width=\"85\" height=\"60\" rx=\"4\" class=\"plaza\"/><text x=\"257\" y=\"228\" class=\"stl\" text-anchor=\"middle\">Preclásico</text><rect x=\"300\" y=\"175\" width=\"85\" height=\"60\" rx=\"4\" class=\"plaza\"/><text x=\"342\" y=\"228\" class=\"stl\" text-anchor=\"middle\">Teotihuacan</text><rect x=\"385\" y=\"175\" width=\"85\" height=\"60\" rx=\"4\" class=\"plaza\"/><text x=\"427\" y=\"228\" class=\"stl\" text-anchor=\"middle\">Toltecas</text><path class=\"walk\" d=\"M65,118 H520 M505,60 H180 M180,90 V200 M180,200 H430 M430,160 H65\"/>{PINS}</svg>" };
DIAS["2026-11-09"] = { dia:"2026-11-09", tit:"Lunes 9 · Teotihuacan", sub:"Pirámides del Sol y de la Luna", P:TEO,
  txt:{ mapa:"El norte queda arriba. Toca un número para abrirlo en Google Maps.", pie:"Lleva agua, gorra y crema solar: en Teotihuacan casi no hay sombra.", otro:"Plan del lunes 9 de noviembre." },
  XY:{ 1:[45,120], 2:[117,170], 3:[260,120], 4:[375,170], 5:[280,200], 6:[555,115], 7:[484,58], 8:[470,208] },
  MAPA:"<svg viewBox=\"0 0 600 250\" role=\"img\" aria-label=\"Plano de Teotihuacan con las paradas numeradas; el norte queda a la derecha\"><rect x=\"30\" y=\"110\" width=\"490\" height=\"20\" rx=\"3\" class=\"park\"/><text x=\"215\" y=\"103\" class=\"area\">Calzada de los Muertos</text><rect x=\"60\" y=\"140\" width=\"115\" height=\"95\" rx=\"4\" class=\"plaza\"/><text x=\"117\" y=\"228\" class=\"stl\" text-anchor=\"middle\">Ciudadela</text><rect x=\"135\" y=\"170\" width=\"30\" height=\"30\" rx=\"2\" class=\"park\"/><path class=\"walk\" d=\"M190,20 V240\"/><text x=\"194\" y=\"30\" class=\"stl\">río San Juan</text><rect x=\"330\" y=\"138\" width=\"90\" height=\"85\" rx=\"4\" class=\"plaza\"/><text x=\"375\" y=\"216\" class=\"stl\" text-anchor=\"middle\">SOL</text><rect x=\"248\" y=\"182\" width=\"64\" height=\"45\" rx=\"4\" class=\"plaza\"/><text x=\"280\" y=\"240\" class=\"stl\" text-anchor=\"middle\">Museo</text><rect x=\"470\" y=\"88\" width=\"50\" height=\"64\" rx=\"4\" class=\"plaza\"/><rect x=\"522\" y=\"85\" width=\"66\" height=\"70\" rx=\"4\" class=\"plaza\"/><text x=\"555\" y=\"170\" class=\"stl\" text-anchor=\"middle\">LUNA</text><rect x=\"452\" y=\"38\" width=\"64\" height=\"42\" rx=\"4\" class=\"plaza\"/><text x=\"484\" y=\"30\" class=\"stl\" text-anchor=\"middle\">Quetzalpapálotl</text><rect x=\"440\" y=\"192\" width=\"60\" height=\"38\" rx=\"4\" class=\"plaza\"/><text x=\"470\" y=\"244\" class=\"stl\" text-anchor=\"middle\">Tepantitla</text><text x=\"75\" y=\"95\" class=\"stl\">Puerta 1</text><text x=\"350\" y=\"95\" class=\"stl\">Puerta 2</text><text x=\"535\" y=\"40\" class=\"stl\">Puerta 3</text><text x=\"575\" y=\"235\" class=\"stl\" text-anchor=\"end\">Norte →</text>{PINS}</svg>" };
function ponDia(d) { var x = DIAS[d]; if (!x) return false;
  DIA = x.dia; TXT = x.txt; P = x.P; MAPA = x.MAPA; XY = x.XY; TIT = x.tit; SUB = x.sub; return true; }
/* Al cargar: la guía de hoy si la hay; si no, la del miércoles 11. */
ponDia((typeof window !== "undefined" && window.viajeDia) || ahora().dia);

/* ---------------------------------------------------------------------------
   v2.82: el horario sale del calendario de Google (ruta /viaje del Worker,
   secreto ICAL_VIAJE). Cada evento se empareja por nombre con una parada de
   la guía (P o EXTRA) para conservar mapa, pin y audio; lo que no empareja
   sale tal cual, con la descripción del calendario. Sin conexión o sin el
   secreto, se queda el último horario bueno guardado o el plan fijo.
   --------------------------------------------------------------------------- */
var FIJO = P.slice(), SYNC = { estado:"", hora:"" }, K_SYNC = "copiloto.viaje.cal." + DIA;
function cambia(d) {                                 // pasa la pantalla a la guía del día d
  if (d === DIA || !DIAS[d]) return;
  ponDia(d); FIJO = P.slice(); SYNC = { estado:"", hora:"" }; K_SYNC = "copiloto.viaje.cal." + DIA; guardado();
}
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
  out.casan = usados.filter(function (x) { return FIJO.indexOf(x) >= 0; }).length;
  return out;
}
function aplica(evs, estado, hora) {
  var q = desdeCal(evs);
  // El calendario no trae este plan, o lo trae en un único evento-resumen del día
  // (p. ej. «Polanco, Cablebús, Chapultepec…»): se queda el fijo, con todas sus guías.
  var conGuia = FIJO.filter(function (x) { return x.g; }).length;
  if (!q.length || q.casan < Math.min(2, conGuia)) return false;
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
    if (x.pin && XY[x.pin]) { var gp = '<g class="pin" data-i="' + i + '"><circle cx="' + XY[x.pin][0] + '" cy="' + XY[x.pin][1] + '" r="11"/><text x="' + XY[x.pin][0] + '" y="' + (XY[x.pin][1] + 5) + '">' + x.pin + '</text></g>';
      pins += x.map ? '<a href="' + esc(x.map) + '" target="_blank" rel="noopener">' + gp + '</a>' : gp; }
  });
  var h = '<div class="vjW"><div class="vjMapa">' + MAPA.replace("{PINS}", pins) + '</div>' +
    '<div class="vjNota">' + esc(TXT.mapa) + '</div>' +
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
  h += '</div><div class="vjNota">' + esc(TXT.pie) + '</div>' +
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
  [].forEach.call(c.querySelectorAll(".vjS:not(.vjQ)"), function (b) { b.addEventListener("click", function () {
    var i = +b.dataset.i, s = +b.dataset.s, x = src(i);
    var vuelve = x.obj && /^📍/.test(x.g[s][0]) && R.i === i && /^🧭/.test(x.g[R.s][0]) ? { i:R.i, s:R.s, k:R.k } : null;
    empieza(i, s); if (vuelve) R.prev = vuelve;            // al acabar el objeto, vuelve a la cultura donde iba
  }); });

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
    if (!hoy) { t.textContent = TXT.otro; return; }
    if (!cur) { t.textContent = "Día terminado."; return; }
    var x = P[+cur.dataset.i], nx = P[+cur.dataset.i + 1];
    t.innerHTML = "<b>Ahora (" + x.s + "–" + x.e + "):</b> " + esc(x.t) + (nx ? "<br>Después, a las " + nx.s + ": " + esc(nx.t) : "");
  }
  marca(); clearInterval(reloj); reloj = setInterval(marca, 60000);
  c.querySelector(".vjIr").addEventListener("click", function () { marca(); if (cur) cur.scrollIntoView({ behavior:"smooth", block:"start" }); });
  setTimeout(function () { if (cur) cur.scrollIntoView({ block:"start" }); }, 350);
  if (!sinPedir) sincroniza(c);
}

/* v2.86 · Para la pantalla Hoy: ¿hay guía ese día?, su título y qué toca ahora. */
function info(d) {
  var x = DIAS[d]; if (!x) return null;
  var n = ahora(), lst = d === DIA ? P : x.P, cur = null, nx = null, r = { tit:x.tit, sub:x.sub, ahora:"" };
  if (n.dia === d) {
    lst.forEach(function (y, i) { if (!cur && n.m < min(y.e)) { cur = y; nx = lst[i + 1]; } });
    r.ahora = cur ? (n.m >= min(cur.s) ? "Ahora: " : "A las " + cur.s + ": ") + cur.t + (nx ? " · Después: " + nx.t : "") : "Día terminado.";
  }
  return r;
}
window.Viaje = { pinta:function (c, sinPedir, d) { if (d) cambia(d); pinta(c, sinPedir); }, para:cierra, info:info,
  get dia() { return DIA; }, get tit() { return TIT; }, get sub() { return SUB; },
  _Q:Q, _P:P, _lista:function () { return P; }, _frases:frases };
if (typeof document !== "undefined" && document.dispatchEvent) try { document.dispatchEvent(new Event("viaje-listo")); } catch (e) {}
})();
