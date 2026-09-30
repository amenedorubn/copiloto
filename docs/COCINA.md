# Cocina

Pestaña de HOY (icono de la olla, junto a Estadísticas). La pinta `cocina.js`; la lógica
(sin DOM) se prueba con `node --test tests/cocina.test.mjs`.

## De dónde sale cada cosa

| Qué | Fuente | Cómo llega |
|---|---|---|
| Lo que toca y la semana | Calendario de Google «Comidas» (lo rellena Claude) | `/agenda` del Worker, en `dia` con `fuente: "comida"` |
| Recetas paso a paso | Copiloto Cocina (`amenedorubn/cocina`, repo público) | `raw.githubusercontent.com/.../recetas/*.json`, con copia en el móvil para sin red |
| Mis alimentos y la compra | Nota de Obsidian «Despensa habitual», bloque «Estado actual» (repo privado `mivault`) | `/despensa` del Worker, solo lectura |
| Lo gastado y lo comprado | La app | `localStorage` (`copiloto.cocina.cambios.v1`), como cambios desde la fecha de la nota |

La app **no escribe** en la nota: «Pasarle los cambios a Claude» copia un texto para que Claude la
actualice (la nota solo se toca con `upsert_knowledge` desde la app de Claude). Los cambios anteriores
a la fecha de la nota dejan de contar solos.

## Un evento de «Comidas»

Título `Etiqueta · Plato` (p. ej. `Tupper · Albóndigas`). Descripción con apartados en MAYÚSCULAS:

```
3 raciones
Receta: albondigas-rigatoni          (opcional: el id de Copiloto Cocina)
INGREDIENTES:
· 500 g carne picada mixta
CÓMO SE HACE:
1. ...
TUPPER: destapados hasta que enfríen...
```

Sin `Receta:`, se busca la receta por el título (todas las palabras del más corto en el otro). Un
`Tupper`/sobras no abre la receta entera: se recalienta con sus pasos o con los de `reparto.recalentar`.
Se limpian el HTML que mete Google y los emojis.

## Modo paso a paso

- Receta de Copiloto Cocina: su tiempo por paso, avisos por voz, checklist y «mientras tanto».
- Comida del calendario: un paso por pantalla; si dice «10 min», su reloj (empieza al tocar Empezar).
- Rutina del calendario «Claude» con horas (`22:10 · Ducha (10 min)`): desde la línea del día, «Paso a paso».
- Pantalla encendida (`navigator.wakeLock`) y voz (`speechSynthesis`; en el APK, la nativa).
- Al terminar una receta: «Apuntar lo gastado» (lo repetido se suma, lo «al gusto» no cuenta).

## Escanear lo comprado

«La compra» → «Escanear lo que has comprado»: cámara de atrás con `BarcodeDetector` (Chrome en
Android) y el número a mano si no hay cámara. El código se busca en Open Food Facts (gratis, sin
cuenta); si no lo conoce, se escribe qué es. Entra en Mis alimentos como comprado, con su zona.
En el APK hace falta un APK nuevo (permiso de cámara o el escáner de Google Play Services, que no
lo pide): hasta entonces, el número a mano.

## En HOY, lo que toca por la hora

Hoy, la tarjeta grande es lo que toca (`Cocina.queGrande`): el entreno a su hora y, cuando pasa
(hecho, o 30 min después de su fin), cada comida a la suya hasta su fin (o 1 h después). Tocar un
entreno en la línea del día manda sobre la hora. La comida en grande es la tarjeta del diseño C.

## Avisos del tupper y de la avena (app Android)

`Cocina.avisosComida` saca de «Comidas» los de 48 h: un tupper que sale del congelador, la noche
antes a las 21:30 (salvo que el calendario ya traiga su «Descongelar…»); un desayuno de avena en
tarro, 45 min antes; y los eventos que ya son un aviso, a su hora. El APK los pone como
notificación con AlarmManager (`AvisoReceiver`), con «Hecho» y «En 30 min», y los vuelve a poner
al reiniciar el móvil. Necesita el APK 2.20 o posterior.

## Diseño

Tres diseños de «Ahora toca» (`localStorage` `copiloto.cocina.diseno`): **A** todo a la vista,
**B** el paso que toca, **C** como las tarjetas de HOY (el elegido el 30/09, por defecto). Acento `--coc` (mandarina, como el calendario)
con dos usos por pantalla; en el modo paso a paso, el color de la receta (`tema` de Copiloto Cocina).

Capturas a 390 px: `node scripts/capturas-cocina.mjs [carpeta]` (datos de ejemplo del propio script;
`FIXTURE=datos.json` para otros). No subas capturas con datos de verdad: el repo es público.

## Activar Mis alimentos (una vez)

1. GitHub → Settings → Developer settings → **Fine-grained token**: solo el repo `mivault`,
   permiso **Contents: Read-only**.
2. Cloudflare → Workers → `copiloto-api` → Settings → Variables and Secrets → Secret
   **`VAULT_TOKEN`** con ese token.
3. `/salud` dice `VAULT_TOKEN: true`. Sin él, Cocina funciona igual y Mis alimentos explica qué falta.
