# Pasos de entreno y rutas importadas (v2.26)

Dos piezas nuevas, cada una en su archivo:

| Archivo | Qué hace |
|---|---|
| `pasos.js` | El tipo de paso **punto de decisión** y las **rectas** que arranca. No sabe nada de ningún día concreto. |
| `rutalocal.js` | Lee un GPX en el móvil, calcula distancia, desnivel y perfil, y lo guarda **solo en IndexedDB**. |

## Rutas importadas

- **Importar en este móvil** (hoja «Elegir ruta»). El GPX se lee con `DOMParser`, no se sube a ningún sitio y no entra en `localStorage` (la sesión que se retoma guarda solo el id; los puntos se leen de IndexedDB).
- El repo es público y la salida de una ruta suele estar cerca de casa: **no se commitea ningún GPX nuevo**. (Las tres de `rutas/` ya estaban.) Nada de `tests/` lleva rutas reales: los GPX de prueba se inventan.
- Distancia: haversine. Desnivel: suma de subidas y de bajadas con un umbral de 1 m (el ruido del GPS no cuenta). Perfil: altura cada 100 m y resumen por km.
- Sin inventar: si menos del 90 % de los puntos trae `ele`, se dice «sin altimetría» (sin perfil ni desnivel). Si no trae `time`, no pasa nada: solo cuenta el trazado.
- Estados: leyendo, vacío, error (GPX roto, sin trazado, sin dos puntos, IndexedDB bloqueada), completo, y los bordes de arriba. Si no se puede guardar, la ruta vale para hoy y se avisa de que se pierde.

## El modelo de pasos

Un plan fijo (`PLANES_FIJOS` en `index.html`) puede llevar `pasos`. Hoy hay dos tipos:

```js
{ tipo:"decision", id, en:10000, antes:200, espera_s:15, aviso:"En {m} metros: ...",
  opciones:[ { id:"si", etiqueta, voz, sigue:"rectas" },
             { id:"no", etiqueta, voz, voz_defecto, seguro:true } ] }

{ tipo:"intervalos", id:"rectas", desde:10000, n:4, trabajo_s:20, trote_s:60,
  objetivo:260, techo:245, cadencia:{ min:85, max:88 } }     // s/km y ciclos por pie
```

- **Nunca «Sí» por defecto.** Sin respuesta en `espera_s` se elige la opción `seguro`. Esa opción no puede llevar `sigue`: `Pasos.valida()` lo rechaza y el motor no arranca con un paso mal definido.
- `Pasos.plantillaRectas({...})` monta la pareja decisión + rectas. `objetivo` (4'20" = 260 s/km) y `techo` (4'05" = 245 s/km) son parámetros, no números del motor.
- Cada decisión se guarda con **valor, origen (toque / tiempo / GPS) y hora**: en el diario de la sesión (`DIARIO.decisiones`, y en Ajustes → Diario de voz como línea «decisión») y en `copiloto.decisiones.v1` (las últimas 60, solo entrenos de verdad, no simulaciones).
- Sin GPS en el punto: si el km salta más de 60 m de golpe y ya pasó el punto sin preguntar, se elige «No» y se avisa por voz. Si había elegido «Sí» y el GPS vuelve a más de 300 m del km 10, las rectas no empiezan.
- **Rectas.** Cuenta atrás por voz («tres, dos, uno, ya»), n repeticiones de `trabajo_s` con `trote_s` de trote entre ellas, y al acabar el plan sigue suave. Mientras duran, el motor calla el canto del km.
- **Guía por cadencia, no por ritmo.** En 20 s el ritmo GPS no se estabiliza. La guía es la cadencia (metrónomo a 173 pasos/min = 86,5 por pie, y el acelerómetro del móvil como medida orientativa) y el ritmo solo vale para el techo: si el ritmo de los últimos ~6 s pasa de 4'05" en dos comprobaciones seguidas, «Frena un poco» (una vez por recta). **No se usa la frecuencia cardíaca.**
- Cadencia: se habla de ciclos por pie (85–88 por pie = 170–176 pasos/min). A 4'20"/km, 85–88 pasos/min daría una zancada de 2,7 m, que no existe.

## Rodaje por sensación

Un tramo con `sensacion:true` nunca avisa por ir más lento que su banda («aprieta», «por detrás», «un poco lento»); ir demasiado rápido sí. Con `plano:true` en el plan fijo, el objetivo es el mismo en cuesta y en llano (modo `plano` del terreno), así que una subida al principio no cambia el objetivo.

## Probarlo

```
node --test tests/pasos.test.mjs tests/rutalocal.test.mjs
node scripts/prueba-decision.mjs "C:/ruta/a/tu.gpx" [carpeta]    # Chrome real, reloj virtual, sin sonido
```
