/* ===========================================================================
   VIAJE · guía del día en CDMX (v2.80.0)
   ---------------------------------------------------------------------------
   Viaje.pinta(c): pinta en la pantalla c el día del miércoles 4 de noviembre
   de 2026 en Ciudad de México: mapa esquemático del Centro arriba y debajo el
   horario. Cada parada lleva «Mapa» (abre Google Maps) y, si es un sitio,
   «Escuchar»: la guía en voz alta (historia, qué buscar y curiosidades).
   La parada que toca según la hora de CDMX se marca sola.
   Voz: speechSynthesis (en el APK es la voz nativa de nativo.js). Si en unos
   segundos no ha empezado, pasa al mp3 de Google por trozos, como habla().
   Va aparte del index.html y se carga async: si falla, la app arranca igual.
   =========================================================================== */
(function () {
"use strict";

var DIA = "2026-11-04";
var GM = "https://maps.google.com/?cid=";
var RUTA = function (d) { return "https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=" + encodeURIComponent(d); };

// s/e: hora de inicio y fin · pin: número en el mapa · mov: trayecto
var P = [
  { s:"8:30", e:"9:00", t:"🎒 Preparar la mochila", d:"Powerbank y cable, mapa offline, gorra, crema solar, pesos y tarjeta, monedas para baños.", $:"$0" },
  { s:"9:00", e:"9:10", t:"🛒 Soriana: agua para el día", d:"Botella de 1,5 L. Metro al lado: División del Norte (L3).", $:"$15–25 💳", map:GM+"2748762233231824542", pin:1 },
  { s:"9:10", e:"9:55", t:"🚇 Soriana → Zócalo", d:"División del Norte → Hidalgo, cambio → Zócalo/Tenochtitlan. Sales directo a la plaza.", l:["L3","L2"], $:"$5", map:RUTA("Zócalo, Ciudad de México"), mov:1 },
  { s:"9:55", e:"10:15", t:"📸 Zócalo + Palacio Nacional (fuera)", d:"El Palacio es el edificio largo del lado este. Baño: Sanborns de los Azulejos con un café.", $:"$0", map:GM+"17814017966680692477", pin:2, g:[
    "Estás en la Plaza de la Constitución, aunque todo el mundo la llama el Zócalo. La palabra significa pedestal: en el siglo diecinueve se puso aquí la base de un monumento a la Independencia que nunca se terminó, y la gente empezó a llamar a la plaza por ese pedestal vacío. El nombre acabó usándose para la plaza principal de casi cualquier ciudad mexicana.",
    "Debajo de tus pies estaba el corazón de Tenochtitlan, la capital mexica, una ciudad sobre un lago con más habitantes que cualquier ciudad europea de su tiempo.",
    "El edificio largo del lado este es el Palacio Nacional. Se levantó sobre las casas de Moctezuma, y Hernán Cortés vivió aquí después de la conquista. Hoy es la sede de la presidencia. Fíjate en el balcón central: encima cuelga la campana de Dolores, la que tocó Miguel Hidalgo en 1810 para empezar la Independencia. Cada 15 de septiembre por la noche, el presidente la toca desde ese balcón y da el Grito ante la plaza llena. Dentro están los murales de Diego Rivera sobre la historia de México, pero hoy solo lo ves por fuera.",
    "Si ves soldados en el centro de la plaza, puede ser el izado o arriado de la bandera gigante, que se hace cada día."] },
  { s:"10:15", e:"10:50", t:"⛪ Catedral Metropolitana", d:"Lado norte del Zócalo. Entra por la reja del atrio y luego por la puerta central. Gratis.", $:"$0", map:GM+"10470655760320782119", pin:3, g:[
    "Es la catedral más grande de América. Tardaron unos doscientos cincuenta años en terminarla, de 1573 a 1813, y por eso mezcla estilos: renacentista en la base, barroco en las portadas y neoclásico arriba. La cúpula y el remate final son obra de Manuel Tolsá, el mismo arquitecto del Palacio de Minería.",
    "Parte de su piedra salió del Templo Mayor, que está justo detrás. Los españoles levantaron la iglesia literalmente con los restos del templo mexica, como mensaje de quién mandaba ahora.",
    "Dentro, busca dos cosas. La primera es el Altar de los Reyes, al fondo, todo en pan de oro: es el gran ejemplo del barroco churrigueresco, con columnas que parecen pirámides invertidas. La segunda es un péndulo que cuelga en la nave central. Señala lo inclinado que está el edificio, porque se hunde en el suelo blando del antiguo lago. En los años noventa se inyectó el subsuelo para frenar el hundimiento y que no se partiera. Si miras el suelo y las columnas con atención, notarás que nada está del todo recto.",
    "Hay misas a lo largo del día: si hay una en curso, recorre los laterales en silencio y sin flash."] },
  { s:"11:00", e:"12:45", t:"🔺 Templo Mayor (zona + museo)", d:"Pegado al lado este de la Catedral. Taquilla en calle Seminario 8, junto a la maqueta de Tenochtitlan. Primero ruinas, luego museo.", $:"$210 💵/💳", map:GM+"10128805338444740272", pin:4, g:[
    "Esto era el Huey Teocalli, el gran templo de los mexicas y el centro de su mundo. Según su leyenda, aquí vieron un águila sobre un nopal devorando una serpiente, la señal para fundar Tenochtitlan en 1325. Es la imagen que hoy está en la bandera de México.",
    "Arriba había dos santuarios: uno a Huitzilopochtli, dios de la guerra y del sol, y otro a Tláloc, dios de la lluvia. Guerra y agua, las dos cosas de las que dependía la ciudad.",
    "Lo que vas a ver no es un templo, sino varios metidos uno dentro de otro, como una cebolla. Cada gobernante lo ampliaba cubriendo el anterior, y hubo siete etapas. Por eso en las ruinas ves escalinatas a distintas alturas.",
    "Tras la conquista quedó enterrado bajo la ciudad colonial. Se redescubrió por casualidad el 21 de febrero de 1978, cuando unos trabajadores de la compañía de luz toparon con un enorme disco de piedra: la Coyolxauhqui, la diosa de la luna desmembrada por su hermano Huitzilopochtli. Ese hallazgo hizo que se demolieran manzanas enteras para excavar.",
    "En el museo no te pierdas la Coyolxauhqui original y la Tlaltecuhtli, el monolito más grande que se conoce de los mexicas, encontrado en 2006, que aún conserva restos de pintura. Busca también el muro de cráneos de piedra, que recuerda al tzompantli, donde se exhibían las cabezas de los sacrificados.",
    "Último acceso hacia las cuatro y media, así que vas con tiempo. Sin flash."] },
  { s:"12:45", e:"13:30", t:"🌮 Comida (Centro)", d:"45 min. Tacos o comida corrida rápida, en efectivo.", $:"$150–250 💵", map:"https://www.google.com/maps/search/taquer%C3%ADa/@19.4335,-99.1355,17z", mapTxt:"Taquerías", g:[
    "Para comer rápido y bien en el Centro, lo más práctico son los tacos. Pide al pastor si los ves con el trompo girando: el pastor viene del shawarma que trajeron los inmigrantes libaneses a principios del siglo veinte, cambiando el cordero por cerdo adobado y añadiendo piña.",
    "Otra opción típica del Centro es el suadero, una carne de res muy suave que se cocina en un comal con forma de sombrero. Una taquería clásica de suadero es Los Cocuyos, en la calle Bolívar, a pocas calles del Zócalo.",
    "Si prefieres sentarte, busca un cartel de comida corrida: es un menú del día con sopa, plato fuerte y agua fresca, normalmente barato.",
    "Las salsas pueden picar bastante: prueba primero con la punta del taco. Y paga en efectivo, que en los puestos casi nunca aceptan tarjeta."] },
  { s:"13:30", e:"14:00", t:"🚶 Calle Madero + Casa de los Azulejos", d:"Recto por Madero desde el Zócalo (10 min). Entrada por Madero 4 (Sanborns); el patio es libre.", $:"$0", map:GM+"626430939730553911", pin:5, g:[
    "Madero es una de las calles más antiguas de la ciudad. En la época colonial se llamaba calle de Plateros por los orfebres que trabajaban aquí. Hoy lleva el nombre de Francisco I. Madero, el político que empezó la Revolución en 1910. Desde 2010 es peatonal y por ella pasan cientos de miles de personas al día.",
    "A mitad de camino está la Casa de los Azulejos, un palacio del siglo dieciocho forrado de azulejos de Talavera de Puebla. Cuenta la leyenda que un padre le dijo a su hijo, que era un vividor: tú nunca harás casa de azulejos, que en la época quería decir que nunca llegaría a nada. El hijo, cuando sentó la cabeza, cubrió la fachada entera de azulejos para callarle la boca.",
    "Desde 1919 es un Sanborns. Entra al patio cubierto y sube la vista a la escalera: hay un mural de José Clemente Orozco de 1925. Y un detalle histórico: en 1914 los soldados zapatistas, al entrar en la ciudad, desayunaron aquí, y la foto de los revolucionarios tomando café en la barra se hizo famosa.",
    "Si te sobra un minuto, el Palacio de Iturbide, en el número 17, suele tener exposiciones gratis en su patio."] },
  { s:"14:00", e:"14:25", t:"🏛️ Bellas Artes (fuera) + Alameda", d:"Al final de Madero, cruzando Eje Central. Fotos desde la explanada; la Alameda queda detrás.", $:"$0", map:GM+"1718141752200063183", pin:6, g:[
    "El Palacio de Bellas Artes lo encargó Porfirio Díaz para el centenario de la Independencia. Lo empezó en 1904 el arquitecto italiano Adamo Boari, pero la Revolución paró las obras y no se terminó hasta 1934, treinta años después. Por eso por fuera es art nouveau, con mármol blanco de Carrara, y por dentro es art déco.",
    "Como casi todo en el Centro, se ha hundido: el mármol es tan pesado que el edificio bajó varios metros en el suelo del antiguo lago. Fíjate en que la explanada queda por debajo del nivel de la calle.",
    "Dentro hay murales de Rivera, Siqueiros, Orozco y Tamayo, y un telón de cristal de Tiffany con los volcanes Popocatépetl e Iztaccíhuatl. Hoy no entras, pero ya sabes que está ahí.",
    "Detrás está la Alameda Central, el parque público más antiguo de América, creado en 1592. Lo que ves de mármol blanco con columnas en semicírculo es el Hemiciclo a Juárez, dedicado a Benito Juárez, el presidente indígena que defendió la república frente al imperio de Maximiliano."] },
  { s:"14:25", e:"15:00", t:"📸 Monumento a la Revolución + café", d:"12 min al oeste por la Alameda y Av. Juárez. Café para llevar. Baño inteligente $7 o gratis en el Metrobús.", $:"$60–80 💳", map:GM+"2377274831848344608", pin:7, g:[
    "Este monumento nació siendo otra cosa. Porfirio Díaz quiso construir aquí el Palacio Legislativo, un parlamento enorme con una cúpula más grande que la del Capitolio de Washington. Las obras empezaron en 1910, justo el año en que estalló la Revolución que lo echó del poder. El proyecto quedó abandonado y durante décadas solo quedó el esqueleto de hierro de la cúpula.",
    "En los años treinta, el arquitecto Carlos Obregón Santacilia propuso aprovechar esa estructura y convertirla en un monumento a la propia Revolución. Así, el edificio del dictador acabó honrando a quienes lo derribaron.",
    "En sus cuatro pilares están enterrados héroes revolucionarios: Francisco Madero, Venustiano Carranza, Pancho Villa, Plutarco Elías Calles y Lázaro Cárdenas.",
    "Mide unos sesenta y siete metros y es uno de los arcos monumentales más altos del mundo. Arriba hay un mirador con ascensor de cristal y abajo un museo, pero hoy toca solo foto y seguir."] },
  { s:"15:00", e:"15:35", t:"🚇 Revolución → La Villa-Basílica", d:"Metro Revolución (4 min al norte, en Puente de Alvarado) → Hidalgo, L3 dir. Indios Verdes → Deportivo 18 de Marzo, L6 dir. Martín Carrera → 1 parada.", l:["L2","L3","L6"], $:"$5", map:RUTA("Basílica de Guadalupe, Ciudad de México"), mov:1 },
  { s:"15:35", e:"16:30", t:"✝️ Basílica de Guadalupe", d:"Del metro, 5 min al norte por Calzada de Guadalupe hasta la gran plaza. Entra por las rejas del atrio. Sal a las 16:30.", $:"$0", map:GM+"2423194957463972528", pin:8, g:[
    "Este es uno de los santuarios católicos más visitados del mundo. Según la tradición, en diciembre de 1531 la Virgen se le apareció varias veces a un indígena llamado Juan Diego en el cerro del Tepeyac, el que tienes detrás. Le pidió que el obispo construyera aquí un templo. El obispo pidió una prueba, y Juan Diego volvió con rosas, que no florecen en diciembre, envueltas en su tilma, una capa de fibra de maguey. Al abrirla ante el obispo, apareció en la tela la imagen de la Virgen.",
    "Ese cerro ya era sagrado antes: los mexicas veneraban aquí a Tonantzin, nuestra madre venerable. Por eso muchos historiadores ven la Guadalupana como un puente entre las dos culturas, y por eso es un símbolo nacional tanto como religioso.",
    "La tilma original está en la Basílica nueva, el edificio redondo y moderno de 1976. Lo diseñó Pedro Ramírez Vázquez, el mismo arquitecto del Museo de Antropología, para que miles de personas pudieran ver la imagen desde cualquier punto. Para verla de cerca, baja detrás del altar: hay una cinta mecánica que te pasa por debajo sin pararte, así no se forman colas.",
    "Al lado está la Basílica antigua, de 1709, que se hundió y quedó visiblemente inclinada; fue la razón de construir la nueva. Si vas sobrado de tiempo, sube al cerro hasta la Capilla del Cerrito, donde según la tradición se recogieron las rosas, y tendrás vistas de toda la ciudad.",
    "Respeta las misas, que son casi cada hora, y lleva monedas para el baño."] },
  { s:"16:30", e:"17:10", t:"🚇 La Villa → Bellas Artes", d:"L6 → Deportivo 18 de Marzo, L3 → Hidalgo, L2 → Bellas Artes (1 parada). La Torre está enfrente.", l:["L6","L3","L2"], $:"$5", map:RUTA("Torre Latinoamericana, Ciudad de México"), mov:1 },
  { s:"17:15", e:"18:15", t:"🌇 Torre Latinoamericana (mirador)", d:"Entrada al mirador en planta baja, esquina Madero con Eje Central. Dos ascensores: al 37 y luego arriba. Atardecer ~17:50.", $:"$220 💳", map:GM+"7044633925614656099", pin:9, g:[
    "Esta torre de cuarenta y cuatro pisos se inauguró en 1956 y fue el edificio más alto de América Latina hasta 1972. Pero su fama no viene de la altura, sino de que sigue en pie.",
    "Está construida sobre el suelo más difícil imaginable: arcilla blanda y empapada del antiguo lago de Texcoco, en una de las zonas más sísmicas del mundo. El ingeniero Leonardo Zeevaert la apoyó sobre cientos de pilotes clavados hasta una capa firme, y diseñó una estructura de acero flexible que se mueve con el terremoto en lugar de resistirlo de frente.",
    "La prueba llegó pronto. En 1957, un año después de abrir, un terremoto fuerte sacudió la ciudad y la torre quedó intacta. En 1985 llegó el gran sismo que destruyó cientos de edificios alrededor, y ella volvió a resistir sin daños. Desde entonces es un caso de estudio en ingeniería sísmica en todo el mundo.",
    "Arriba, busca hacia el este el Zócalo y la Catedral donde has estado esta mañana, y justo abajo, la cúpula naranja de Bellas Artes. Hacia el oeste verás el Monumento a la Revolución. Con el atardecer, los volcanes a veces asoman al sureste si el aire está limpio.",
    "En el piso 38 hay un pequeño museo sobre la historia de la torre y de la ciudad."] },
  { s:"18:30", e:"19:15", t:"🚕 Vuelta a casa", d:"Uber ~30–45 min. El metro a esta hora va lleno: Bellas Artes → Hidalgo → Zapata.", l:["L2","L3"], $:"$150–250 💳", map:RUTA("Av. Universidad 687, Del Valle Sur, Ciudad de México"), mapTxt:"Ruta a casa", mov:1 }
];

var CSS = [
  ".vjW{display:flex;flex-direction:column;gap:14px;padding-bottom:24px}",
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
  ".vjC p{margin:4px 0 0;font-size:13.5px;font-weight:600;color:var(--mu);line-height:1.4}",
  ".vjPr{font-size:12.5px;font-weight:800;color:var(--fg);margin-top:6px;font-variant-numeric:tabular-nums}",
  ".vjAh{display:none;font-size:10.5px;font-weight:800;background:#e0457b;color:#fff;border-radius:6px;padding:1px 6px;margin-right:6px;vertical-align:2px}.vjP.on .vjAh{display:inline-block}",
  ".vjLn{display:flex;gap:4px;margin-top:6px}.vjLn span{font-size:10.5px;font-weight:800;color:#fff;border-radius:999px;padding:2px 8px}",
  ".vjL2{background:#2d82dc}.vjL3{background:#5c9c29}.vjL6{background:#e4463e}",
  ".vjAc{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}",
  ".vjB{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:19px;border:1px solid var(--ln);background:var(--sf);color:var(--fg);font:800 13.5px Manrope,sans-serif;text-decoration:none}",
  ".vjB.au{background:#e0457b;border-color:#e0457b;color:#fff}.vjB.au.va{background:var(--fg);border-color:var(--fg);color:var(--bg)}",
  ".vjG{margin-top:8px}.vjG summary{font-size:13px;font-weight:700;color:var(--mu)}",
  ".vjG div{margin-top:6px;font-size:14.5px;font-weight:500;line-height:1.55;color:var(--fg)}.vjG div p{margin:0 0 8px}"
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
'<text x="560" y="210" class="lbl" text-anchor="end">Palacio N.</text><text x="520" y="128" class="lbl">Templo M.</text>' +
'<text x="470" y="146" class="lbl" text-anchor="end">Catedral</text><text x="382" y="190" class="lbl">Azulejos</text>' +
'<text x="352" y="210" class="lbl">Torre Latino</text><line x1="340" y1="179" x2="347" y2="163" stroke="var(--mu)"/>' +
'<text x="70" y="116" class="lbl">Revolución</text><text x="585" y="30" class="lbl" text-anchor="end">N ↑</text>' +
'<line x1="20" y1="232" x2="125" y2="232" stroke="var(--fg)" stroke-width="2"/><text x="20" y="226" class="stl">500 m</text></svg>';
var XY = { 2:[550,187], 3:[512,152], 4:[540,140], 5:[368,172], 6:[334,133], 7:[38,111], 9:[340,190] };

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

/* ---- voz ---- */
var turno = 0, btnVa = null, audioV = null;
function trozos(txt) {
  var out = [], cur = "";
  String(txt).split(/(?<=[.,;:!?])\s+/).forEach(function (f) {
    if ((cur + " " + f).length > 180 && cur) { out.push(cur); cur = f; } else cur = cur ? cur + " " + f : f;
  });
  if (cur) out.push(cur);
  return out;
}
function para() {
  turno++;
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  try { if (audioV) audioV.pause(); } catch (e) {}
  if (btnVa) { btnVa.classList.remove("va"); btnVa.textContent = "🔊 Escuchar"; btnVa = null; }
}
function porAudio(fr, i, mio) {           // mp3 de Google, trozo a trozo (como vozAudio del index)
  if (mio !== turno) return;
  if (i >= fr.length) { para(); return; }
  if (!audioV) { audioV = new Audio(); audioV.preload = "auto"; }
  audioV.onended = audioV.onerror = function () { porAudio(fr, i + 1, mio); };
  audioV.src = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=es&q=" + encodeURIComponent(fr[i]);
  var p = audioV.play(); if (p && p.catch) p.catch(function () { para(); });
}
function habla(parrafos, btn) {
  para();
  var mio = ++turno, fr = [];
  parrafos.forEach(function (p) { fr = fr.concat(trozos(p)); });
  btnVa = btn; btn.classList.add("va"); btn.textContent = "⏹ Parar";
  var S = window.speechSynthesis;
  if (!S || typeof SpeechSynthesisUtterance === "undefined") { porAudio(fr, 0, mio); return; }
  var empezo = false;
  function una(i) {
    if (mio !== turno) return;
    if (i >= fr.length) { para(); return; }
    var u = new SpeechSynthesisUtterance(fr[i]); u.lang = "es-ES"; u.rate = 1;
    u.onstart = function () { empezo = true; };
    u.onend = function () { una(i + 1); };
    u.onerror = function (e) { var er = e && e.error; if (mio !== turno || er === "interrupted" || er === "canceled") return;
      if (!empezo) { try { S.cancel(); } catch (x) {} porAudio(fr, i, mio); } else una(i + 1); };
    S.speak(u);
  }
  try { S.cancel(); } catch (e) {}
  una(0);
  setTimeout(function () {                // el motor de voz en frío tarda: si sigue mudo, mp3
    if (mio === turno && !empezo) { try { S.cancel(); } catch (e) {} porAudio(fr, 0, mio); }
  }, (window.Nativo && Nativo.es) ? 6000 : 3000);
}

/* ---- pantalla ---- */
var reloj = null;
function pinta(c) {
  para();
  if (!document.getElementById("vjCss")) { var st = document.createElement("style"); st.id = "vjCss"; st.textContent = CSS; document.head.appendChild(st); }
  var pins = "";
  P.forEach(function (x, i) {
    if (x.pin && XY[x.pin]) pins += '<a href="' + esc(x.map) + '" target="_blank" rel="noopener"><g class="pin" data-i="' + i + '"><circle cx="' + XY[x.pin][0] + '" cy="' + XY[x.pin][1] + '" r="11"/><text x="' + XY[x.pin][0] + '" y="' + (XY[x.pin][1] + 5) + '">' + x.pin + '</text></g></a>';
  });
  var h = '<div class="vjW"><div class="vjMapa">' + MAPA.replace("{PINS}", pins) + '</div>' +
    '<div class="vjNota">El número en rosa es donde te toca estar. Tócalo para abrirlo en Google Maps. Fuera del mapa: 1 Soriana (al sur) y 8 Basílica (al norte).</div>' +
    '<div class="vjAhora"><span class="vjAhT">–</span><button type="button" class="vjIr">Ir a lo de ahora</button></div><div class="vjL">';
  P.forEach(function (x, i) {
    h += '<div class="vjP' + (x.mov ? " mov" : "") + '" data-i="' + i + '"><div class="vjH">' + x.s + '<small>' + x.e + '</small></div><div class="vjC">' +
      '<h3><span class="vjAh">AHORA</span>' + esc(x.t) + '</h3><p>' + esc(x.d) + '</p>' +
      (x.l ? '<div class="vjLn">' + x.l.map(function (l) { return '<span class="vj' + l + '">' + l + '</span>'; }).join("") + '</div>' : "") +
      '<div class="vjPr">' + esc(x.$) + '</div>';
    if (x.map || x.g) {
      h += '<div class="vjAc">' + (x.map ? '<a class="vjB" href="' + esc(x.map) + '" target="_blank" rel="noopener">📍 ' + esc(x.mapTxt || (x.mov ? "Ruta" : "Mapa")) + '</a>' : "") +
        (x.g ? '<button type="button" class="vjB au" data-i="' + i + '">🔊 Escuchar</button>' : "") + '</div>';
    }
    if (x.g) h += '<details class="vjG"><summary>Leer la guía</summary><div>' + x.g.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + '</div></details>';
    h += '</div></div>';
  });
  h += '</div><div class="vjNota">Efectivo: llevas $700. Templo Mayor $210 por si no cogen tarjeta, comida $150–200 y monedas para baños. Lo demás con tarjeta. Total del día ~$685–1.075 (35–54 €).</div></div>';
  c.innerHTML = h;

  var filas = [].slice.call(c.querySelectorAll(".vjP")), cur = null;
  function marca() {
    if (!c.isConnected) { clearInterval(reloj); para(); return; }
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
  c.querySelector(".vjIr").addEventListener("click", function () { if (cur) cur.scrollIntoView({ behavior:"smooth", block:"start" }); });
  [].forEach.call(c.querySelectorAll(".vjB.au"), function (b) {
    b.addEventListener("click", function () { if (btnVa === b) { para(); return; } habla(P[+b.dataset.i].g, b); });
  });
  setTimeout(function () { if (cur) cur.scrollIntoView({ block:"start" }); }, 350);
}

window.Viaje = { pinta:pinta, para:para, dia:DIA };
})();
