# Copiloto como app Android

La web (la de GitHub Pages) va **dentro** del APK con Capacitor 8: la app arranca y funciona sin internet desde el primer día.

## Cómo se actualiza sola

- Cada vez que `main` sube de versión, el Action **Publicar versión** crea la release y le sube `copiloto-web.zip` (la web de esa versión).
- La app, al abrirse, mira la última release (API de GitHub). Si hay una más nueva con zip, la baja en segundo plano y la pone **la siguiente vez que se abre** (o al tocar «Actualizar ahora» en Ajustes).
- Nunca con un entreno en marcha. Si una versión nueva no llega a arrancar (15 s sin `Nativo.listo()`), el actualizador vuelve solo a la anterior y esa versión no se vuelve a intentar.
- Lo nativo (voz, permisos, plugins) solo cambia con un APK nuevo, que se instala encima.

## Lo nativo (app/android)

- `CopilotoPlugin.java`: voz, pantalla encendida, GPS, informe y APK nuevo.
  - Voz: la del móvil (por defecto) o **Miro** (Piper es-ES con sherpa-onnx, dentro del APK, sin internet).
  - Mientras habla pide el foco de audio transitorio (uso «guía de navegación»): Spotify se calla y sigue solo.
  - `FLAG_KEEP_SCREEN_ON` para `navigator.wakeLock`.
- `CarreraService.java`: **el GPS con la pantalla apagada** (como OpenTracks o Strava).
  - Servicio en primer plano (tipo `location`) con su notificación: km, tiempo y ritmo, con **Pausa** y **¿Cómo voy?**.
  - Las posiciones salen de `LocationManager` (GPS, y la de red hasta que haya GPS) y llegan a la web por el `watchPosition` de siempre (`nativo.js`).
  - Cerrojo parcial (la CPU no se duerme). Si la web deja de mandar su latido 45 s, el servicio lo dice en voz alta.
  - Se enciende al abrir la pantalla del GPS y se apaga al salir sin correr.
- `WebViewVivo.java`: con un entreno en marcha la web sigue «a la vista» aunque la pantalla se apague. Probado en el OnePlus: sin esto el WebView congela la página al minuto y no hay avisos.
- `Informe.java`: el **informe de cada salida**, que se guarda solo: GPS, pantalla, voz, batería, el ritmo actual cada 20 s y el Diario de voz.
- Voz que no se rinde: si la del móvil falla (30/09, primera frase de la salida), esa frase la dice Miro y el motor se reinicia; `nativo.js` además reintenta antes de que la web se pase al audio, que corta Spotify.
- `AvisoReceiver.java` / `ArranqueReceiver.java`: los avisos de Cocina (el tupper la noche antes, la avena al salir) como notificación con AlarmManager; vuelven tras reiniciar. Ver docs/COCINA.md.
- `MainActivity.java`: el gesto de atrás lo decide la web (`window.atrasApp`): con un entreno en marcha no sale nunca.
- `nativo.js` (raíz del repo): conecta todo esto con la web. En el navegador no hace nada.

## Pantalla en carrera

Ajustes → App → «Pantalla en carrera»: **se apaga sola** (por defecto; el GPS y la voz siguen) o siempre encendida.
Con la carrera en marcha, el botón de encendido enseña la app sin desbloquear.
La primera vez Android pregunta por las notificaciones y por la batería («Permitir»).

## El informe de la salida

Se guarda solo en `Android/data/io.github.amenedorubn.copiloto/files/informes/` (uno por salida, los 20 últimos):
un `.txt` con lo que pasa minuto a minuto y el `_diario.json` con el Diario de voz.

- Por USB: `adb pull /sdcard/Android/data/io.github.amenedorubn.copiloto/files/informes`
- Sin PC: Ajustes → App → «Compartir el último informe».

## Probar el GPS desde casa por USB

El servicio acepta posiciones de prueba (solo desde `adb`, piden el permiso `DUMP`): recorre una ruta de la web a un ritmo.

```
adb shell am broadcast -a io.github.amenedorubn.copiloto.PRUEBA_GPS --es gpx rutas/6K_ZAPATOCA.gpx --es ritmo 240
adb shell input keyevent 26          # pantalla apagada: los avisos tienen que seguir
adb shell am broadcast -a io.github.amenedorubn.copiloto.PRUEBA_GPS --es parar 1
```

## APK nuevo sin cable

Cuando cambia lo nativo, la release lleva también `copiloto.apk`. La app lo ve en Ajustes → Versión
(«App Android nueva») y con un toque lo baja, comprueba su SHA-256 y Android pregunta «¿Actualizar?».
La primera vez hay que activar «Permitir de esta fuente» para Copiloto.

```
cd app && npm run apk        # compila el APK de la versión de version.json
git push                     # el Action crea la release
bash scripts/sube-apk.sh     # espera a la release y le sube copiloto.apk
```

## Compilar el APK

Una vez por PC:

```
node app/descarga-voz.mjs      # la librería de voz y el modelo (≈130 MB, no van al repo)
cd app && npm install
```

Cada APK (JDK 21: el de Android Studio):

```
cd app && npm run sync
cd android && gradlew assembleRelease
```

Sale en `app/android/app/build/outputs/apk/release/app-release.apk`.

## La firma: guardar una copia

El APK se firma con `~/.copiloto/copiloto.jks` (contraseña en `~/.copiloto/firma.properties`, fuera del repo).
**Si se pierde, el siguiente APK no se puede instalar encima**: habría que desinstalar la app y se perderían sus datos. Guarda una copia de esa carpeta en el gestor de contraseñas o en la nube.

## Licencias

La voz Miro es CC BY-NC-SA 4.0 (uso no comercial). Ver `CREDITOS.md`.
