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
